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
import { supabase } from "@/lib/supabase";
import { generationStore } from "@/lib/generation-store";
import { notificationStore } from "@/lib/notification-store";
import { optimizeForOutline, optimizeForEpisode } from "@/lib/content-optimizer";
import { GENERATION_CONFIG } from "@/lib/ai-config";

export type OnSeriesDone = (series: Omit<PodcastSeries, "id" | "bookId" | "createdAt">) => void;
export type OnEpisodeDone = (episodeNumber: number, episodeTitle: string) => void;
export type OnEpisodeFailed = (episodeNumber: number, episodeTitle: string) => void;

export async function runFullSeriesGeneration(
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
        status: "extracting", // Initial status
        label: "Checking archives...",
    });

    try {
        // ── 0a. LOCAL DUPLICATE CHECK ────────────────────────────────────────
        // Before touching any AI model, check if THIS user already has a series
        // for this exact book × tone. This is the cheapest possible guard.
        {
            const { data: existingSeries } = await supabase
                .from("ai_artifacts")
                .select("id")
                .eq("type", "podcast-series")
                .is("deleted_at", null)
                .eq("book_id", book.id)
                .filter("content->>_toneId", "eq", tone.id)
                .limit(1);

            if (existingSeries && existingSeries.length > 0) {
                console.log(`[LocalDupe] User already has ${tone.label} series for "${book.title}", skipping generation.`);
                generationStore.update(jobId, { status: "done", label: "Already in your Archive!" });
                notificationStore.push({
                    type: "success",
                    title: `Already Generated`,
                    body: `Your ${tone.label} series for "${book.title}" already exists.`,
                    bookCover: book.coverUrl,
                    bookTitle: book.title,
                });
                onSeriesOutlineDone?.({} as any);
                return;
            }
        }

        // ── 0b. Global Resonance (Sharing) ───────────────────────────────────
        // Check if ANY other user has already generated this book × tone.
        // Works for both Gutenberg books (via storeBookId) and user-uploaded
        // books (via title + author matching).
        {
            generationStore.update(jobId, { status: "extracting", label: "Searching global resonance..." });

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (token) {
                try {
                    const shareRes = await fetch("/api/ai/share", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            targetBookId: book.id,
                            toneId: tone.id,
                            // Gutenberg book: match by storeBookId
                            ...(book.storeBookId ? { storeBookId: book.storeBookId } : {}),
                            // User-uploaded book: match by title + author
                            ...(!book.storeBookId ? { bookTitle: book.title, bookAuthor: book.author } : {}),
                        })
                    });

                    if (shareRes.ok) {
                        const { success } = await shareRes.json();
                        if (success) {
                            console.log("Global Resonance success! Copied artifacts.");
                            generationStore.update(jobId, { status: "done", label: "Recovered from Archive!" });
                            notificationStore.push({
                                type: "success",
                                title: `"${book.title}" Recovered`,
                                body: `Found a shared ${tone.label} series! Available immediately.`,
                                bookCover: book.coverUrl,
                                bookTitle: book.title,
                            });
                            onSeriesOutlineDone?.({} as any);
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Global Resonance check failed, falling back to generation:", e);
                }
            }
        }

        // ── 1. Extract text ───────────────────────────────────────────────────
        generationStore.update(jobId, { status: "extracting", label: "Extracting text..." });
        let text = "";
        try {
            text = book.fileType === "epub"

                ? await extractEpubText(book.fileUrl)
                : await extractPdfText(book.fileUrl);
        } catch (e) {
            console.warn("Extraction failed, using metadata only:", e);
            text = `Title: ${book.title}\nAuthor: ${book.author}`;
        }

        // ── 2. Generate series outline (with smart truncation) ──────────────────
        generationStore.update(jobId, { status: "planning", label: "Architecting series..." });
        const optimizedText = optimizeForOutline(text);
        const outline = await generateSeriesOutline(book.title, book.author, optimizedText, tone.label);
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

        // ── 3. Generate episodes in parallel batches of 3 ───────────────────────
        const seasons = outline.seasons || [
            { number: 1, title: "Archive Echoes", description: "", episodes: (outline as any).episodes || [] },
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

        const BATCH_SIZE = GENERATION_CONFIG.episodeBatchSize;
        let completedCount = 0;

        for (let batchStart = 0; batchStart < allEpisodes.length; batchStart += BATCH_SIZE) {
            const batch = allEpisodes.slice(batchStart, batchStart + BATCH_SIZE);

            generationStore.update(jobId, {
                status: "generating",
                label: `Episodes ${batchStart + 1}–${Math.min(batchStart + BATCH_SIZE, total)}/${total}...`,
            });

            await Promise.allSettled(
                batch.map(async ({ season: _season, episode }) => {
                    try {
                        // Smart content slice: only send relevant portion per episode
                        const episodeContent = optimizeForEpisode(
                            text,
                            episode.contentFocus || episode.description || "",
                            episode.number,
                            total
                        );

                        const scriptResult = await generateEpisodeScript(normalizedSeries, episode, episodeContent);

                        await saveAiArtifact(book.user_id, {
                            book_id: book.id,
                            type: "podcast",
                            title: `${outline.title} (${tone.label}) - Ep ${episode.number}: ${episode.title}`,
                            content: { ...scriptResult, _toneId: tone.id, _toneLabel: tone.label },
                        });

                        completedCount++;
                        generationStore.update(jobId, {
                            label: `${completedCount}/${total} episodes ready...`,
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
                })
            );
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
            const scriptResult = await generateEpisodeScript(normalizedSeries, episode, "");

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
