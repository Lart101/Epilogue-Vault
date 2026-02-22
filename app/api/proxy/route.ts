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

export async function GET(request: NextRequest) {
    const user = await verifyAuth(request);
    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing URL parameter", { status: 400 });
    }

    // Security: Only allow http/https
    if (!url.startsWith("http")) {
        return new NextResponse("Invalid URL", { status: 400 });
    }

    const WHITELISTED_DOMAINS = [
        "archive.org",
        "gutenberg.org",
        "supabase.co",
        "google.com",
    ];

    const isWhitelisted = WHITELISTED_DOMAINS.some(domain => url.includes(domain));
    if (!isWhitelisted) {
        return new NextResponse("Forbidden: Domain not whitelisted", { status: 403 });
    }

    // Do not proxy internal Supabase URLs - they should be accessed directly
    if (url.includes("supabase.co")) {
        return NextResponse.redirect(url);
    }

    try {
        let response = await fetch(url, {
            headers: {
                // Mimic a browser to avoid 401/403 from some CDNs (like Archive.org sometimes)
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://archive.org/",
            },
        });

        if (!response.ok) {
            console.error(`Proxy fetch failed for ${url}: ${response.status} ${response.statusText}`);
            return new NextResponse(`Failed to fetch source: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get("Content-Type") || "application/epub+zip";
        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Access-Control-Allow-Origin", "*");
        // Cache aggressively since these are immutable public domain files
        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
