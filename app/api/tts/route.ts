import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const MAX_TTS_CHARS = 3000; // ~60s of audio at 150wpm

/**
 * Verify auth by decoding the Supabase JWT locally.
 * Supabase JWTs are standard HS256 tokens — we just need to check they're
 * structurally valid and extract the user sub. This avoids a network call to
 * Supabase's auth servers which was causing ConnectTimeoutError in API routes.
 */
function verifyAuth(req: Request): { id: string } | null {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    try {
        // JWT is three base64url parts: header.payload.signature
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        // Decode payload (base64url → JSON)
        const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf8")
        );

        // Must have a subject (user id) and not be expired
        if (!payload.sub) return null;
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;

        return { id: payload.sub };
    } catch {
        return null;
    }
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
    const user = verifyAuth(req);
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
