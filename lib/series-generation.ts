/**
 * Background series generation service.
 * Generates the series outline + ALL episodes sequentially.
 * Updates generationStore for the floating pill.
 * Pushes notifications to notificationStore per episode.
 * This is pure async logic, usable from any component without React context.
 */

import { extractEpubText, extractPdfText } from "@/lib/extractors";
import { generateEpisodeScript, generateSeriesOutline, PODCAST_TONES, PodcastSeries } from "@/lib/gemini";
import { saveAiArtifact, UserBook } from "@/lib/db";
import { generationStore } from "@/lib/generation-store";
import { notificationStore } from "@/lib/notification-store";

export type OnSeriesDone = (series: Omit<PodcastSeries, "id" | "bookId" | "createdAt">) => void;
export type OnEpisodeDone = (episodeNumber: number, episodeTitle: string) => void;
export type OnEpisodeFailed = (episodeNumber: number, episodeTitle: string) => void;

export async function runFullSeriesGeneration(
    apiKey: string,
    book: UserBook,
    tone: typeof PODCAST_TONES[0],
    onSeriesOutlineDone?: OnSeriesDone,
    onEpisodeDone?: OnEpisodeDone,
    onEpisodeFailed?: OnEpisodeFailed
) {
    const jobId = `${book.id}-${tone.id}-${Date.now()}`;

    generationStore.add({
        id: jobId,
        bookTitle: book.title,
        bookCover: book.coverUrl,
        tone: tone.label,
        status: "extracting",
        label: "Extracting text...",
    });

    try {
        // ── 1. Extract text ───────────────────────────────────────────────────
        let text = "";
        try {
            text = book.fileType === "epub"
                ? await extractEpubText(book.fileUrl)
                : await extractPdfText(book.fileUrl);
        } catch (e) {
            console.warn("Extraction failed, using metadata only:", e);
            text = `Title: ${book.title}\nAuthor: ${book.author}`;
        }

        // ── 2. Generate series outline ────────────────────────────────────────
        generationStore.update(jobId, { status: "planning", label: "Architecting series..." });

        const outline = await generateSeriesOutline(apiKey, book.title, book.author, text, tone.label);
        const outlineWithTone = { ...outline, tone: tone.label, _toneId: tone.id };

        await saveAiArtifact(book.user_id, {
            book_id: book.id,
            type: "podcast-series",
            title: `Series (${tone.label}): ${book.title}`,
            content: outlineWithTone,
        });

        notificationStore.push({
            type: "series",
            title: `"${book.title}" — Series Ready`,
            body: `${tone.label} series outline "${outline.title}" has been created. Generating episodes now...`,
            bookCover: book.coverUrl,
            bookTitle: book.title,
        });

        // Notify components the outline is ready so they can show episode list
        onSeriesOutlineDone?.(outlineWithTone);

        // ── 3. Generate every episode in every season ─────────────────────────
        const seasons = outline.seasons || [
            { number: 1, title: "Archive Echoes", description: "", episodes: outline.episodes || [] },
        ];

        const allEpisodes = seasons.flatMap(s => s.episodes.map(ep => ({ season: s, episode: ep })));
        const total = allEpisodes.length;

        const normalizedSeries: PodcastSeries = {
            ...outline,
            id: "",
            bookId: book.id,
            createdAt: "",
            seasons,
        };

        for (let i = 0; i < allEpisodes.length; i++) {
            const { season, episode } = allEpisodes[i];
            generationStore.update(jobId, {
                status: "generating",
                label: `Episode ${episode.number}/${total}: "${episode.title}"`,
            });

            try {
                const scriptResult = await generateEpisodeScript(apiKey, normalizedSeries, episode, text);

                await saveAiArtifact(book.user_id, {
                    book_id: book.id,
                    type: "podcast",
                    title: `${outline.title} (${tone.label}) - Ep ${episode.number}: ${episode.title}`,
                    content: scriptResult,
                });

                notificationStore.push({
                    type: "episode",
                    title: `Episode Ready`,
                    body: `Ep ${episode.number}: "${episode.title}" from ${book.title} is now playable.`,
                    bookCover: book.coverUrl,
                    bookTitle: book.title,
                });

                onEpisodeDone?.(episode.number, episode.title);
            } catch (epErr: any) {
                console.error(`Failed to generate episode ${episode.number}:`, epErr);
                notificationStore.push({
                    type: "error",
                    title: `Episode ${episode.number} Failed`,
                    body: `"${episode.title}" could not be recorded. ${epErr.message || "Try regenerating it manually."}`,
                    bookCover: book.coverUrl,
                    bookTitle: book.title,
                });
                onEpisodeFailed?.(episode.number, episode.title);
            }
        }

        // ── 4. All done ───────────────────────────────────────────────────────
        generationStore.update(jobId, { status: "done", label: `All ${total} episodes ready!` });
        notificationStore.push({
            type: "success",
            title: `"${book.title}" Complete`,
            body: `All ${total} episodes in the ${tone.label} series are now playable.`,
            bookCover: book.coverUrl,
            bookTitle: book.title,
        });
    } catch (err: any) {
        let msg = err.message || "Generation failed.";
        if (msg.includes("503") || msg.toLowerCase().includes("overwhelmed")) msg = "Service busy — try again shortly.";
        if (msg.includes("429") || msg.toLowerCase().includes("quota")) msg = "Rate limit reached — wait and retry.";

        generationStore.update(jobId, { status: "error", label: msg });
        notificationStore.push({
            type: "error",
            title: `Series Generation Failed`,
            body: `${book.title} (${tone.label}): ${msg}`,
            bookCover: book.coverUrl,
            bookTitle: book.title,
        });
    }
}

/**
 * Retries only the failed episodes from an existing series outline.
 * Already-generated episode numbers (readySet) are skipped.
 */
export async function retryFailedEpisodes(
    apiKey: string,
    book: UserBook,
    series: Omit<PodcastSeries, "id" | "bookId" | "createdAt">,
    failedEpisodeNumbers: Set<number>,
    tone: typeof PODCAST_TONES[0],
    onEpisodeDone?: OnEpisodeDone,
    onEpisodeFailed?: OnEpisodeFailed
) {
    if (failedEpisodeNumbers.size === 0) return;

    const jobId = `retry-${book.id}-${tone.id}-${Date.now()}`;
    const total = failedEpisodeNumbers.size;

    generationStore.add({
        id: jobId,
        bookTitle: book.title,
        bookCover: book.coverUrl,
        tone: tone.label,
        status: "generating",
        label: `Retrying ${total} failed episode${total === 1 ? "" : "s"}...`,
    });

    const seasons = series.seasons || [
        { number: 1, title: "Archive Echoes", description: "", episodes: (series as any).episodes || [] },
    ];

    const allEpisodes = seasons.flatMap(s =>
        s.episodes
            .filter(ep => failedEpisodeNumbers.has(ep.number))
            .map(ep => ({ season: s, episode: ep }))
    );

    const normalizedSeries: PodcastSeries = {
        ...series, id: "", bookId: book.id, createdAt: "", seasons,
    };

    let doneCount = 0;
    let stillFailed = 0;

    for (const { episode } of allEpisodes) {
        generationStore.update(jobId, {
            label: `Retrying Ep ${episode.number}: "${episode.title}"`,
        });

        try {
            const scriptResult = await generateEpisodeScript(apiKey, normalizedSeries, episode, "");

            await saveAiArtifact(book.user_id, {
                book_id: book.id,
                type: "podcast",
                title: `${series.title} (${tone.label}) - Ep ${episode.number}: ${episode.title}`,
                content: scriptResult,
            });

            notificationStore.push({
                type: "episode",
                title: `Episode Recovered`,
                body: `Ep ${episode.number}: "${episode.title}" from ${book.title} is now playable.`,
                bookCover: book.coverUrl,
                bookTitle: book.title,
            });

            onEpisodeDone?.(episode.number, episode.title);
            doneCount++;
        } catch (err: any) {
            let msg = err.message || "Unknown error";
            if (msg.includes("503") || msg.toLowerCase().includes("overwhelmed")) msg = "Service busy.";
            if (msg.includes("429") || msg.toLowerCase().includes("quota")) msg = "Rate limit reached.";

            notificationStore.push({
                type: "error",
                title: `Retry Failed — Ep ${episode.number}`,
                body: `"${episode.title}": ${msg}`,
                bookCover: book.coverUrl,
                bookTitle: book.title,
            });

            onEpisodeFailed?.(episode.number, episode.title);
            stillFailed++;
        }
    }

    if (stillFailed === 0) {
        generationStore.update(jobId, { status: "done", label: `All ${doneCount} episodes recovered!` });
        notificationStore.push({
            type: "success",
            title: `"${book.title}" — Recovery Complete`,
            body: `All previously failed episodes are now playable.`,
            bookCover: book.coverUrl,
            bookTitle: book.title,
        });
    } else {
        generationStore.update(jobId, { status: "error", label: `${stillFailed} episode${stillFailed === 1 ? "" : "s"} still failing` });
    }
}
