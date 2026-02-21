import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3-flash-preview"; // Latest model in preview state

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
    apiKey: string,
    bookTitle: string,
    bookAuthor: string,
    extractedContent: string,
    tone: string
): Promise<Omit<PodcastSeries, "id" | "bookId" | "createdAt">> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseGeminiJson(text);
}

/**
 * Step 2: Generate a professional script for a specific episode
 */
export async function generateEpisodeScript(
    apiKey: string,
    series: PodcastSeries,
    episode: Episode,
    extractedContent: string,
    previousEpisodeSummary?: string,
    nextEpisodeTease?: string
): Promise<PodcastScript> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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

1. **Host Setup:** Format the script for 2 hosts (Host A and Host B, ensuring natural chemistry, interruptions, and banter).
2. **Audio Cues:** Include professional audio production cues in brackets and italics (e.g., *[SFX: Pages turning quickly]*, *[MUSIC: Mysterious ambient synth fades in]*).
3. **Pacing:** Vary the pacing. Use short, punchy sentences for tension, and longer, reflective dialogue for deep analysis.
4. **Structure:**
   - **The Hook (0:00 - 1:30):** Start with a provocative question, a shocking quote from the text, or a captivating scenario related to the content before the intro music hits.
   - **Intro & Continuity:** Welcome the listener. Briefly acknowledge the tone vibe. Seamlessly weave in a 2-sentence reference to the season's thematic journey.
   - **Main Exploration:** Dive deep into the content. Do not just summarize; analyze, debate, and relate the text to broader human experiences or real-world examples. 
   - **The "Echo" Segment:** Include a dedicated segment where the host(s) pause to deeply analyze one specific, profound quote or moment from the provided text.
   - **Outro & Hook for Next Time:** Wrap up the core theme. If there is a next episode teaser, tease it directly to compel the user to click the next episode. 

**RULES:**
- Avoid robotic transitions like "Moving on to the next point."
- Make the dialogue sound spoken, not read. Use colloquialisms appropriate to the tone.
- Ensure the script runtime is approximately 5-8 minutes of spoken audio.

Format the output as a JSON object:
{
  "title": "${episode.title}",
  "episodeNumber": ${episode.number},
  "tone": "${series.tone}",
  "dialogue": [
    { "speaker": "Host A", "text": "..." },
    { "speaker": "Host B", "text": "..." }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseGeminiJson(text);
}


function parseGeminiJson(text: string) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("No JSON found in response");
    } catch (e) {
        console.error("Failed to parse Gemini response:", text);
        throw new Error("Failed to generate a valid AI response.");
    }
}
