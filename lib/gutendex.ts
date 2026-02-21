
// ─── Gutendex API Client ────────────────────────────────────────────────────
// Free public API for Project Gutenberg — no auth required
// Docs: https://gutendex.com/

export interface GutendexBook {
    id: number;
    title: string;
    authors: { name: string; birth_year: number | null; death_year: number | null }[];
    translators: { name: string; birth_year: number | null; death_year: number | null }[];
    subjects: string[];
    bookshelves: string[];
    languages: string[];
    copyright: boolean | null;
    media_type: string;
    formats: Record<string, string>; // Mime-type -> URL
    download_count: number;
    summaries?: string[]; // Optional, not all books have one
}

export interface GutendexResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: GutendexBook[];
}

// ─── Simplified Interface for UI ─────────────────────────────────────────────
// This replaces OpenLibraryBook with a more generic structure suitable for our store
export interface StoreBook {
    key: string;           // "gutendex-{id}" to ensure uniqueness if we ever mix sources
    id: number;            // original ID
    title: string;
    author: string;
    coverUrl: string;
    subjects: string[];
    downloadCount: number;
    formats: Record<string, string>;
    summary?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapGutendexBook(book: GutendexBook): StoreBook {
    const authorName = book.authors.length > 0
        ? book.authors.map(a => a.name.replace(/, /g, " ").split(" ").reverse().join(" ")).join(", ") // "Austen, Jane" -> "Jane Austen"
        : "Unknown Author";

    return {
        key: `gutendex-${book.id}`,
        id: book.id,
        title: book.title,
        author: authorName,
        coverUrl: book.formats["image/jpeg"] || "",
        subjects: book.subjects,
        downloadCount: book.download_count,
        formats: book.formats,
        summary: book.summaries && book.summaries.length > 0 ? book.summaries[0] : undefined,
    };
}

// ─── API Functions ──────────────────────────────────────────────────────────

const BASE_URL = "https://gutendex.com/books";

async function fetchGutendex(url: string): Promise<GutendexResponse> {
    try {
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        // Handle 404 gracefully as empty results (Project Gutenberg often 404s on invalid IDs or empty searches)
        if (res.status === 404) {
            return { count: 0, next: null, previous: null, results: [] };
        }

        if (!res.ok) throw new Error(`Gutendex API error: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("Gutendex fetch failed:", error);
        return { count: 0, next: null, previous: null, results: [] };
    }
}

/**
 * Search for books by title or author.
 */
export async function searchBooks(query: string, page = 1): Promise<StoreBook[]> {
    if (!query.trim()) return [];

    // Gutendex search param searches both title and author
    const url = `${BASE_URL}?search=${encodeURIComponent(query)}&page=${page}`;
    const data = await fetchGutendex(url);
    return data.results.map(mapGutendexBook);
}

/**
 * Get popular/trending books.
 * Gutendex returns popular books by default if no params are provided.
 * We can also filter by topic if needed.
 */
export async function getTrendingBooks(topic?: string, page = 1): Promise<StoreBook[]> {
    let url = `${BASE_URL}?page=${page}`;
    if (topic) {
        // Gutendex uses 'topic' for bookshelves/subjects
        url += `&topic=${encodeURIComponent(topic)}`;
    }
    // By default, Gutendex sorts by popularity (download_count)

    const data = await fetchGutendex(url);
    return data.results.map(mapGutendexBook);
}

/**
 * Get a single book by ID
 */
export async function getBookById(id: number): Promise<StoreBook | null> {
    const url = `${BASE_URL}?ids=${id}`;
    const data = await fetchGutendex(url);
    if (data.results.length > 0) {
        return mapGutendexBook(data.results[0]);
    }
    return null;
}

// ─── Topic Categories (Mapped to Gutendex terminology) ──────────────────────
// Gutendex categories are a bit different, often based on Library of Congress or bookshelves
export const DISCOVER_TOPICS = [
    { key: "best_books", label: "Popular", emoji: "🔥" }, // No topic filter = popular
    { key: "fiction", label: "Fiction", emoji: "📖" },
    { key: "mystery", label: "Mystery", emoji: "🕵️" },
    { key: "fantasy", label: "Fantasy", emoji: "🐉" },
    { key: "science_fiction", label: "Sci-Fi", emoji: "🚀" },
    { key: "romance", label: "Romance", emoji: "💘" },
    { key: "history", label: "History", emoji: "📜" },
    { key: "biography", label: "Biography", emoji: "✍️" },
    { key: "children", label: "Children", emoji: "🧸" },
] as const;

export type TopicKey = (typeof DISCOVER_TOPICS)[number]["key"];
