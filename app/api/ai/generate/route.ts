import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
    getPodcastGenerationsToday,
    recordPodcastGeneration,
    DAILY_PODCAST_LIMIT,
} from "@/lib/db";
import Groq from "groq-sdk";
import { GROQ_FALLBACK_MODELS, GENERATION_CONFIG } from "@/lib/ai-config";

async function verifyAuth(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) return null;
    return data.user;
}

/** Returns a UTC midnight ISO string for the *next* day (limit reset time). */
function tomorrowUtcMidnight(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
}

export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { prompt, type, bookId, toneId } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // ── Daily limit gate (only for new podcast series, not episodes) ──────
        const isPodcastSeries = type === "podcast-series";
        if (isPodcastSeries) {
            const usedToday = await getPodcastGenerationsToday(user.id);
            if (usedToday >= DAILY_PODCAST_LIMIT) {
                return NextResponse.json(
                    {
                        error: "DAILY_LIMIT_REACHED",
                        message: `You've used your ${DAILY_PODCAST_LIMIT} daily podcast generation. Come back tomorrow!`,
                        resetAt: tomorrowUtcMidnight(),
                        usedToday,
                        limit: DAILY_PODCAST_LIMIT,
                    },
                    { status: 429 }
                );
            }
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY not found on server");
        }

        const groq = new Groq({ apiKey });
        let lastError: any = null;

        for (const modelName of GROQ_FALLBACK_MODELS) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: modelName,
                    response_format: { type: "json_object" },
                    temperature: GENERATION_CONFIG.temperature,
                });

                // ── Record the generation AFTER a successful series outline ──
                if (isPodcastSeries && bookId && toneId) {
                    await recordPodcastGeneration(user.id, bookId, toneId);
                }

                return NextResponse.json({ text: completion.choices[0]?.message?.content || "" });
            } catch (error: any) {
                lastError = error;
                console.warn(`[Groq API] ${modelName} failed, falling back...`, error.message);
                continue;
            }
        }

        throw lastError || new Error("All models failed");

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
