/**
 * ──────────────────────────────────────────────────────────────
 *  AI GENERATION CONFIG
 *  Single source of truth for all AI generation settings.
 *  Edit here to change models, limits, or generation behaviour.
 * ──────────────────────────────────────────────────────────────
 */

// ── Groq Model Waterfall ──────────────────────────────────────
// Models are tried in ORDER. If one fails (rate-limit / error),
// the next one is used automatically.
// | Model                 | Best For                  | TPM    |
// |-----------------------|---------------------------|--------|
// | llama-3.1-8b-instant  | Primary — lowest cost     | 6,000  |
// | llama-4-scout-instruct| High throughput fallback  | 30,000 |
// | gpt-oss-20b           | Fastest response          | 8,000  |
// | llama-3.3-70b-versatile| Highest quality          | 12,000 |
// | qwen3-32b             | Balanced / multilingual   | 6,000  |
export const GROQ_FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "llama-4-scout-instruct",
    "gpt-oss-20b",
    "llama-3.3-70b-versatile",
] as const;

// ── Generation Parameters ─────────────────────────────────────
export const GENERATION_CONFIG = {
    /** LLM sampling temperature (0 = deterministic, 1 = creative) */
    temperature: 0.7,

    /** Episodes to generate in parallel (higher = faster, but more rate-limit risk) */
    episodeBatchSize: 3,

    /** Max words sent to the LLM for the SERIES OUTLINE step */
    outlineMaxWords: 6_000,

    /** Max words sent per EPISODE SCRIPT generation call */
    episodeMaxWords: 2_500,

    /** Min words required for an episode content slice to be considered useful */
    episodeMinWords: 500,
} as const;

// ── EPUB / PDF Extraction ─────────────────────────────────────
export const EXTRACTION_CONFIG = {
    /** Timeout in milliseconds for EPUB/PDF extraction */
    timeoutMs: 45_000, // 45s — increased from previous 20s default
} as const;
