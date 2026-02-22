import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function verifyAuth(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) return null;
    return data.user;
}

/**
 * Proxy route to fetch external book files server-side, avoiding CORS.
 * Usage: GET /api/proxy-file?url=https://...
 */
export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    }

    // Only allow http/https URLs
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return NextResponse.json({ error: "Invalid URL scheme" }, { status: 400 });
    }

    const WHITELISTED_DOMAINS = [
        "archive.org",
        "gutenberg.org",
        "supabase.co",
        "google.com",
    ];

    const isWhitelisted = WHITELISTED_DOMAINS.some(domain => url.includes(domain));
    if (!isWhitelisted) {
        return NextResponse.json({ error: "Domain not whitelisted" }, { status: 403 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*",
            },
        });

        if (!response.ok) {
            console.error(`Upstream error in proxy-file for ${url}: ${response.status} ${response.statusText}`);
            return NextResponse.json({
                error: `Upstream error: ${response.statusText}`,
                status: response.status
            }, { status: response.status });
        }

        const contentType = response.headers.get("Content-Type") || "application/octet-stream";
        const contentLength = response.headers.get("Content-Length");

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        if (contentLength) headers.set("Content-Length", contentLength);
        headers.set("Cache-Control", "public, max-age=3600");

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (err: any) {
        console.error("Critical Proxy-File Error:", err);
        return NextResponse.json({
            error: err.message || "Proxy failed",
            details: String(err)
        }, { status: 500 });
    }
}
