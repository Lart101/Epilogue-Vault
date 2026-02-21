import Groq from "groq-sdk";

// Ordered array of Groq models to maximize throughput and minimize rate-limit errors (429s).
// Sorted generally from highest TPM to lowest to ensure the primary generator doesn't easily hit a wall.
const FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
];

export interface Episode {
    id: string;
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

    const currentSeason = series.seasons.find(s => s.episodes.some(e => e.id === episode.id)) || series.seasons[0];
    const episodeInSeason = currentSeason.episodes.findIndex(e => e.id === episode.id) + 1;
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
        // Strip markdown formatting if present
        let clean = text.trim();
        if (clean.startsWith('```json')) {
            clean = clean.replace(/^```json/, '');
        } else if (clean.startsWith('```')) {
            clean = clean.replace(/^```/, '');
        }
        if (clean.endsWith('```')) {
            clean = clean.replace(/```$/, '');
        }

        clean = clean.trim();

        // Fallback: extract just the object or array if extra text surrounds it
        const jsonMatch = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

        let jsonString = jsonMatch ? jsonMatch[0] : clean;

        // Common LLM fixes: Remove trailing commas before closing braces/brackets
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

        try {
            return JSON.parse(jsonString);
        } catch (parseErr: any) {
            // Secondary attempt: escape unescaped literal newlines in string properties
            // (Gemini sometimes accidentally outputs literal newlines instead of \n)
            const sanitizedString = jsonString.replace(/[\u0000-\u001F]+/g, (match) => {
                // If it's pure whitespace structural spacing, it's fine, but 
                // inside quotes it breaks JSON.parse. A blanket remove of dangerous controls can help.
                if (match === '\n' || match === '\r' || match === '\t') return match;
                return ''; // strip other control chars
            });

            try {
                return JSON.parse(sanitizedString);
            } catch (secondErr: any) {
                console.error("[Groq JSON Parse Error]:", parseErr.message);
                throw parseErr;
            }
        }
    } catch (e: any) {
        console.error("[Groq Parser Root Error]:", e.message);
        console.error("Raw Text segment:", text.substring(0, 500) + "...");
        throw new Error("Failed to extract valid JSON from the AI response.");
    }
}

/**
 * Cascading executor that iterates through our FALLBACK_MODELS on Groq.
 * For each model, it will attempt up to 'maxRetries' times if it hits a 429 or 503.
 */
async function executeWithFallback(prompt: string, maxRetriesPerModel = 2): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("Aether credentials (API Key) not found in environment.");
    }
    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    let lastError: any = null;

    for (const modelName of FALLBACK_MODELS) {
        console.log(`[Groq] Attempting generation with model: ${modelName}`);
        let retries = 0;

        while (retries <= maxRetriesPerModel) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: modelName,
                    response_format: { type: "json_object" },
                    temperature: 0.7,
                });
                return completion.choices[0]?.message?.content || "";
            } catch (error: any) {
                lastError = error;
                const isRateLimit = error.status === 429;
                const isOverloaded = error.status === 503;

                if (!isRateLimit && !isOverloaded) {
                    console.error(`[Groq] Fatal error on ${modelName}, aborting model.`, error.message);
                    break;
                }

                retries++;

                if (isRateLimit) {
                    console.warn(`[Groq API] ${modelName} hit 429 Rate Limit. Instantly falling back to next model...`);
                    break;
                }

                if (retries <= maxRetriesPerModel) {
                    const baseDelay = 5000;
                    const waitTime = baseDelay * retries;
                    console.warn(`[Groq API] ${modelName} hit 503 Overloaded. Retrying in ${waitTime / 1000}s... (Attempt ${retries}/${maxRetriesPerModel})`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                } else {
                    console.warn(`[Groq API] ${modelName} exhausted limits. Falling back to next model...`);
                }
            }
        }
    }

    console.error("[Groq API] ALL fallback models exhausted.", lastError);
    throw new Error(lastError?.message || "Complete API failure across all fallback models.");
}
