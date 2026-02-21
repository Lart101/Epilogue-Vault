import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route to fetch external book files server-side, avoiding CORS.
 * Usage: GET /api/proxy-file?url=https://...
 */
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    }

    // Only allow http/https URLs
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return NextResponse.json({ error: "Invalid URL scheme" }, { status: 400 });
    }

    try {
        const res = await fetch(url, {
            headers: {
                // Some servers require a user-agent
                "User-Agent": "Mozilla/5.0 (compatible; EpilogueVault/1.0)",
            },
            // Server-side fetch has no CORS restriction
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status });
        }

        const blob = await res.blob();
        const contentType = res.headers.get("content-type") || "application/octet-stream";

        return new NextResponse(blob, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Proxy failed" }, { status: 500 });
    }
}
