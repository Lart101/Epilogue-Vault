import { supabase } from "./supabase";
import { GROQ_FALLBACK_MODELS } from "./ai-config";

export interface Episode {
    id?: string;  // AI-generated outlines never include this — always use episode.number
    number: number;
    title: string;
    description: string;
    contentFocus: string; // What specific part of the book this covers
    script?: PodcastScript;
    status: "planned" | "ready";
}

export interface Season {
    number: number;
    title: string;
    description: string;
    episodes: Episode[];
}

export interface PodcastSeries {
    id: string;
    bookId: string;
    title: string;
    tone: string;
    totalSeasons: number;
    seasons: Season[];
    createdAt: string;
    // Legacy support for single-season series
    episodes?: Episode[];
}

export interface PodcastScript {
    title: string;
    episodeNumber?: number;
    tone?: string;
    // Legacy support for single-generation echoes
    host1?: string;
    host2?: string;
    dialogue: {
        speaker: string;
        text: string;
    }[];
}

export const PODCAST_TONES = [
    { id: "philosophical", label: "Deep & Philosophical", description: "Exploring the existential and spiritual depths." },
    { id: "suspense", label: "True Crime Suspense", description: "Dramatic, tense, and investigative." },
    { id: "witty", label: "Humorous & Witty", description: "Lighthearted, clever, and engaging banter." },
    { id: "analytical", label: "Academic & Analytical", description: "Data-driven and deeply researched." },
    { id: "casual", label: "Casual Banter", description: "Like two friends discussing a great book over coffee." },
];

/**
 * Step 1: Generate a series outline based on the book content
 */
export async function generateSeriesOutline(
    bookTitle: string,
    bookAuthor: string,
    extractedContent: string,
    tone: string
): Promise<Omit<PodcastSeries, "id" | "bookId" | "createdAt">> {
    // We instantiate Groq inside the fallback executor now.

    const prompt = `
    You are an award-winning podcast producer. 
    Analyze the following contents from the book "${bookTitle}" by ${bookAuthor}.
    Architect a grand, multi-season podcast epic if the content is substantial. For complex, long books, create 2-4 seasons with 4-6 episodes each. For shorter works, a single season is sufficient.
    Create a professional podcast series outline using a "${tone}" tone.
    
    Content:
    ${extractedContent}

    Format the output as a JSON object:
    {
      "title": "Series Title",
      "tone": "${tone}",
      "totalSeasons": number,
      "seasons": [
        {
          "number": 1,
          "title": "Season Title (e.g., The Awakening)",
          "description": "Thematic focus of this season",
          "episodes": [
            {
              "number": 1,
              "title": "Episode Title",
              "description": "Brief catchy description",
              "contentFocus": "Summary of what specific parts/themes of the provided text this episode will cover"
            }
          ]
        }
      ]
    }

    - CRITICAL JSON RULE: Do NOT use unescaped double quotes inside string values (especially for "title" or "description"). If you need to quote something, use 'single quotes' or escape them like \\\"this\\\". Unescaped double quotes will corrupt the JSON.
    `;

    const text = await executeWithFallback(prompt);
    return parseGroqJson(text);
}

/**
 * Step 2: Generate a professional script for a specific episode
 */
export async function generateEpisodeScript(
    series: PodcastSeries,
    episode: Episode,
    extractedContent: string,
    previousEpisodeSummary?: string,
    nextEpisodeTease?: string
): Promise<PodcastScript> {
    // We instantiate Groq inside the fallback executor now.

    // Match by episode.number — episode.id is an empty string in AI-generated outlines
    const currentSeason = series.seasons?.find(s => s.episodes.some(e => e.number === episode.number))
        || series.seasons?.[0]
        || { number: 1, title: (series as any).title, description: "", episodes: (series as any).episodes || [] };
    const episodeInSeason = currentSeason.episodes.findIndex(e => e.number === episode.number) + 1;
    const totalInSeason = currentSeason.episodes.length;

    const prompt = `
You are an award-winning podcast producer and master scriptwriter. Your task is to write a highly engaging, professional podcast script based on specific extracted content from a book. 

This is Episode ${episodeInSeason} of ${totalInSeason} in Season ${currentSeason.number} ("${currentSeason.title}"). This is part of the larger series "${series.title}" which spans ${series.totalSeasons} seasons.

The script must NOT read like an audiobook or a dry summary. It must be a dynamic, thought-provoking conversation or narration that brings the book's concepts, characters, or themes to life.

Here is the context for this episode:
- Series Title: ${series.title}
- Season ${currentSeason.number}: ${currentSeason.title}
- Episode Title: ${episode.title}
- User's Chosen Tone: ${series.tone}. YOU MUST STRICTLY ADHERE TO THIS TONE.
- Core Content to Cover in this Episode: ${episode.contentFocus}
- Full Context: ${extractedContent}
- Previous Episode Recap (if any): ${previousEpisodeSummary || "This is the start of this exploration."}
- Next Episode Teaser (if any): ${nextEpisodeTease || "To be continued..."}

**SCRIPT REQUIREMENTS & FORMATTING:**

1. **Host Setup:** Format the script for 2 hosts. Invent TWO COMPLETELY RANDOM FIRST NAMES for the hosts (e.g., "Sarah" and "Marcus", or "Liam" and "Chloe"). Ensure they have natural chemistry, interruptions, and banter.
2. **Strictly Spoken Word Only:** Write ONLY the exact spoken dialogue. Do NOT include any stage directions, audio cues, or sound effects (e.g., absolutely no [SFX], [MUSIC], or *laughs*). The text goes directly to a strict Text-to-Speech engine that will literally read "bracket SFX bracket" out loud.
3. **Pacing:** Vary the pacing. Use short, punchy sentences for tension, and longer, reflective dialogue for deep analysis.
4. **Structure:**
   - **The Hook (First 1-2 minutes):** Start with a provocative question, a shocking quote from the text, or a captivating scenario related to the content.
   - **Intro & Continuity:** Welcome the listener. Briefly acknowledge the tone vibe. Seamlessly weave in a 2-sentence reference to the season's thematic journey.
   - **Main Exploration:** Dive deep into the content. Do not just summarize; analyze, debate, and relate the text to broader human experiences or real-world examples. 
   - **The "Echo" Segment:** Include a dedicated segment where the host(s) pause to deeply analyze one specific, profound quote or moment from the provided text.
   - **Outro & Hook for Next Time:** Wrap up the core theme. If there is a next episode teaser, tease it directly to compel the user to click the next episode. 

**RULES:**
- Avoid robotic transitions like "Moving on to the next point."
- Make the dialogue sound spoken, not read. Use colloquialisms appropriate to the tone.
- Ensure the script runtime is approximately 5-8 minutes of spoken audio.
- CRITICAL JSON RULE: Do NOT use unescaped double quotes inside string values (especially for the "text" field). If you need to quote a phrase or show emphasis, use 'single quotes' or escape them like \\\"this\\\". Unescaped double quotes will corrupt the JSON.

Format the output as a JSON object:
{
  "title": "${episode.title}",
  "episodeNumber": ${episode.number},
  "tone": "${series.tone}",
  "dialogue": [
    { "speaker": "[Random Host 1]", "text": "..." },
    { "speaker": "[Random Host 2]", "text": "..." }
  ]
}
`;

    const text = await executeWithFallback(prompt);
    return parseGroqJson(text);
}


function parseGroqJson(text: string) {
    try {
        // ── Step 1: Strip markdown fences ────────────────────────────────────
        let clean = text.trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();

        // ── Step 2: Detect truncated responses early ──────────────────────────
        // If the response ends without a closing } or ], the model was cut off
        const lastSignificantChar = clean.replace(/[\s,]+$/, '').slice(-1);
        if (lastSignificantChar && lastSignificantChar !== '}' && lastSignificantChar !== ']') {
            // Allow trailing } that may close a nested object — just attempt parse
            console.warn('[Groq Parser] Response may be truncated, last char:', JSON.stringify(lastSignificantChar));
        }

        // ── Step 3: Extract the outermost object/array ────────────────────────
        const jsonMatch = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        let jsonString = jsonMatch ? jsonMatch[0] : clean;

        // ── Step 4: Common LLM fixes ──────────────────────────────────────────
        // Remove trailing commas before } or ]
        jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');

        // ── Step 5: Try parsing as-is ─────────────────────────────────────────
        try {
            return JSON.parse(jsonString);
        } catch (firstErr: any) {
            console.warn('[Groq Parser] First parse attempt failed:', firstErr.message);

            // ── Step 6: Repair unescaped double quotes inside string values ──────
            // e.g. "text": "He said "hello" to her" → "text": "He said 'hello' to her"
            // Strategy: find all string values and replace inner unescaped quotes with '
            let repaired = jsonString.replace(
                /:[ \t]*"((?:[^"\\]|\\[\s\S])*)"/g,
                (_match: string, inner: string) => {
                    // Re-escape any genuinely unescaped double-quotes inside string values
                    const fixed = inner.replace(/(?<!\\)"/g, "'");
                    return `: "${fixed}"`;
                }
            );

            // ── Step 7: Replace literal control characters inside strings ────────
            // LLMs sometimes output literal newlines inside JSON string values
            repaired = repaired.replace(
                /:[ \t]*"((?:[^"\\]|\\[\s\S])*)"/g,
                (_match: string, inner: string) => {
                    const fixed = inner
                        .replace(/\r\n/g, ' ')  // CRLF → space
                        .replace(/\r|\n/g, ' ') // lone LF/CR → space
                        .replace(/\t/g, ' ')    // tab → space
                        .replace(/[\x00-\x1F\x7F]/g, ''); // strip remaining ASCII controls
                    return `: "${fixed}"`;
                }
            );

            try {
                return JSON.parse(repaired);
            } catch (secondErr: any) {
                console.error('[Groq Parser] Repair attempt failed:', secondErr.message);
                console.error('Raw text segment (first 500 chars):', text.substring(0, 500));
                throw new Error(`Failed to extract valid JSON from AI response: ${firstErr.message}`);
            }
        }
    } catch (e: any) {
        if (e.message.startsWith('Failed to extract')) throw e;
        console.error('[Groq Parser Root Error]:', e.message);
        console.error('Raw Text segment:', text.substring(0, 500) + '...');
        throw new Error(`Failed to extract valid JSON from the AI response: ${e.message}`);
    }
}

/**
 * Cascading executor that iterates through our FALLBACK_MODELS on Groq.
 * For each model, it will attempt up to 'maxRetries' times if it hits a 429 or 503.
 */
async function executeWithFallback(prompt: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        throw new Error("Authentication required for generation.");
    }

    const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `AI API failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.text || "";
}
