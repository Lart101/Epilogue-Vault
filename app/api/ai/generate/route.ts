import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { prompt, type } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
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
