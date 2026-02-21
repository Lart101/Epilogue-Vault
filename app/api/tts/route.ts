import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

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
    let lastErr: any = null;
    let retries = 0;
    const maxRetries = 3;

    try {
        const { text, voice } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        while (retries < maxRetries) {
            try {
                const tts = new MsEdgeTTS();
                await tts.setMetadata(voice || 'en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

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
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
