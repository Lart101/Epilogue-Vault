/**
 * Content Optimizer — Smart text truncation and per-episode content slicing.
 *
 * Dramatically reduces LLM token usage by:
 * 1. Truncating full book text to a configurable word limit before sending to outline generation.
 * 2. For each episode, extracting only the most relevant slice of text based on the episode's
 *    `contentFocus` field (keyword & semantic proximity matching).
 * 3. Ensuring we never send the same large content again when not needed.
 */

import { GENERATION_CONFIG } from "./ai-config";

const OUTLINE_MAX_WORDS = GENERATION_CONFIG.outlineMaxWords;
const EPISODE_MAX_WORDS = GENERATION_CONFIG.episodeMaxWords;
const EPISODE_MIN_WORDS = GENERATION_CONFIG.episodeMinWords;

/**
 * Truncate text to a max word count, keeping the most informative portions:
 * - First 40% of the budget (intro & context)
 * - Last 10% of the budget (conclusion)
 * - Middle 50% sampled from the middle portion
 */
export function optimizeForOutline(text: string): string {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= OUTLINE_MAX_WORDS) return text;

    const firstChunk = Math.floor(OUTLINE_MAX_WORDS * 0.4);
    const lastChunk = Math.floor(OUTLINE_MAX_WORDS * 0.1);
    const middleChunk = OUTLINE_MAX_WORDS - firstChunk - lastChunk;

    const start = words.slice(0, firstChunk);

    // Sample evenly from the middle third
    const middleStart = Math.floor(words.length * 0.3);
    const middleEnd = Math.floor(words.length * 0.7);
    const middleWords = words.slice(middleStart, middleEnd);
    const step = Math.max(1, Math.floor(middleWords.length / middleChunk));
    const middle: string[] = [];
    for (let i = 0; i < middleWords.length && middle.length < middleChunk; i += step) {
        middle.push(middleWords[i]);
    }

    const end = words.slice(words.length - lastChunk);

    return [...start, "...", ...middle, "...", ...end].join(" ");
}

/**
 * For a specific episode, extract the most relevant content slice from the book text.
 * Uses the episode's `contentFocus` string to find paragraphs that contain matching keywords,
 * then returns a focused excerpt around those paragraphs.
 *
 * Falls back to a positional slice if no keyword matches are found.
 */
export function optimizeForEpisode(
    fullText: string,
    episodeContentFocus: string,
    episodeNumber: number,
    totalEpisodes: number
): string {
    const words = fullText.split(/\s+/).filter(Boolean);

    if (words.length <= EPISODE_MAX_WORDS) return fullText;

    // Extract keywords from the contentFocus field
    const focusKeywords = extractKeywords(episodeContentFocus);

    if (focusKeywords.length > 0) {
        // Split text into paragraphs for semantic proximity search
        const paragraphs = fullText.split(/\n{2,}|\r\n{2,}/).filter(p => p.trim().length > 50);

        // Score each paragraph by keyword match density
        const scored = paragraphs.map((para, idx) => {
            const paraLower = para.toLowerCase();
            const score = focusKeywords.reduce((acc, kw) => {
                const matches = (paraLower.match(new RegExp(kw, "g")) || []).length;
                return acc + matches;
            }, 0);
            return { idx, para, score };
        });

        // Sort by score descending, take top paragraphs up to budget
        scored.sort((a, b) => b.score - a.score);
        const topParagraphs: string[] = [];
        let wordCount = 0;

        for (const s of scored) {
            if (wordCount >= EPISODE_MAX_WORDS) break;
            const paraWords = s.para.split(/\s+/).length;
            topParagraphs.push(s.para);
            wordCount += paraWords;
        }

        if (wordCount >= EPISODE_MIN_WORDS) {
            // Re-sort by original index to maintain reading order
            const orderedParagraphs = topParagraphs.sort((a, b) => {
                return paragraphs.indexOf(a) - paragraphs.indexOf(b);
            });
            return orderedParagraphs.join("\n\n");
        }
    }

    // Fallback: positional slice based on episode index
    const ratio = episodeNumber / Math.max(totalEpisodes, 1);
    const startIndex = Math.floor(words.length * Math.max(0, ratio - 0.15));
    const endIndex = Math.min(words.length, startIndex + EPISODE_MAX_WORDS);
    return words.slice(startIndex, endIndex).join(" ");
}

/**
 * Extract meaningful keywords from an episode contentFocus string.
 * Removes stop words and short tokens.
 */
function extractKeywords(text: string): string[] {
    const stopWords = new Set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "this", "that", "is", "are", "was", "were",
        "be", "been", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "it", "its", "as", "so", "if",
        "about", "which", "when", "where", "who", "how", "all", "their", "there",
        "they", "them", "then", "than", "into", "also", "what", "his", "her",
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w))
        .slice(0, 15); // Max 15 keywords to avoid over-filtering
}
