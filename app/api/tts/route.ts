import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { supabase } from '@/lib/supabase';

const MAX_TTS_CHARS = 3000; // ~60s of audio at 150wpm

async function verifyAuth(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) return null;
    return data.user;
}

function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function POST(req: Request) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { text?: string; voice?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { text, voice } = body;

    if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > MAX_TTS_CHARS) {
        return NextResponse.json(
            { error: `Text exceeds maximum length of ${MAX_TTS_CHARS} characters` },
            { status: 400 }
        );
    }

    // Sanitize voice — only allow known Azure neural voices
    const ALLOWED_VOICES = new Set([
        'en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural',
        'en-US-DavisNeural', 'en-GB-SoniaNeural', 'en-GB-RyanNeural',
    ]);
    const safeVoice = (voice && ALLOWED_VOICES.has(voice)) ? voice : 'en-US-AriaNeural';

    let lastErr: any = null;
    let retries = 0;
    const maxRetries = 3;

    try {
        while (retries < maxRetries) {
            try {
                const tts = new MsEdgeTTS();
                await tts.setMetadata(safeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

                const safeText = escapeXml(text);
                const { audioStream } = tts.toStream(safeText);

                const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
                    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
                    audioStream.on('error', reject);
                });

                return new Response(audioBuffer as any, {
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Content-Length': audioBuffer.length.toString(),
                    },
                });
            } catch (error: any) {
                lastErr = error;
                retries++;
                console.warn(`TTS attempt ${retries} failed:`, error.message || error);
                if (retries < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * retries));
                }
            }
        }

        throw lastErr;
    } catch (error: any) {
        console.error("TTS Final Error:", error);
        // Never leak raw error internals to client
        return NextResponse.json({ error: "TTS generation failed. Please try again." }, { status: 500 });
    }
}
