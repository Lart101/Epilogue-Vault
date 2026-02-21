/**
 * Routes any external URL through our server-side proxy to avoid CORS.
 * Supabase storage URLs and local blobs are passed through unchanged.
 */
function proxyUrl(url: string): string {
    // Already a relative or blob URL — no proxy needed
    if (url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:")) return url;
    // Already pointing at our own server
    if (typeof window !== "undefined" && url.startsWith(window.location.origin)) return url;
    // Proxy everything else
    return `/api/proxy-file?url=${encodeURIComponent(url)}`;
}

/**
 * Wraps a promise with a timeout. Rejects with a timeout error after `ms` ms.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operation"): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
        ),
    ]);
}

/**
 * Extracts text from a PDF file URL
 */
export async function extractPdfText(url: string, maxPages: number = 50): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const doc = await withTimeout(pdfjsLib.getDocument(proxyUrl(url)).promise, 30_000, "PDF load");
    let fullText = "";

    const totalPages = doc.numPages;
    const step = Math.max(1, Math.floor(totalPages / maxPages));

    for (let i = 1; i <= totalPages; i += step) {
        if (fullText.length > 50_000) break;
        const page = await withTimeout(doc.getPage(i), 10_000, `PDF page ${i}`);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `[Page ${i}]\n${pageText}\n\n`;
    }

    return fullText;
}

/**
 * Extracts text from an EPUB file URL.
 * Uses a per-chapter timeout so one bad chapter doesn't hang the whole operation.
 */
export async function extractEpubText(url: string): Promise<string> {
    const ePub = (await import("epubjs")).default;
    const book = ePub(proxyUrl(url));

    await withTimeout(book.ready, 20_000, "EPUB open");

    let fullText = "";
    const spine = book.spine as any;
    const items = spine.spineItems || [];

    const maxItems = 12;
    const step = Math.max(1, Math.floor(items.length / maxItems));

    for (let i = 0; i < items.length; i += step) {
        if (fullText.length > 50_000) break;
        const item = items[i];
        try {
            const doc = await withTimeout(
                item.load(book.load.bind(book)),
                8_000,
                `EPUB chapter ${i + 1}`
            );
            if (doc instanceof Document) {
                fullText += `[Chapter ${i + 1}]\n${doc.body.innerText || ""}\n\n`;
            }
        } catch {
            // Skip timed-out chapters silently and keep going
            console.warn(`Skipped chapter ${i + 1} (timeout or error)`);
        }
    }

    return fullText || "[Could not extract text — generating from metadata only]";
}
