
import { supabase } from "./supabase";
import { createClient, type User } from "@supabase/supabase-js";

// Keep admin client strictly server-side only
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
) : null;

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ReadingProgress {
    cfi: string;
    location?: string;
    currentPage: number;
    percentage: number;
    lastReadAt: string | null; // ISO string
}

export interface UserBook {
    id: string;
    user_id: string; // Internal use, mapped from user_id
    title: string;
    author: string;
    coverUrl: string; // Mapped from cover_url
    fileUrl: string;  // Mapped from file_url
    fileType: "epub" | "pdf"; // Mapped from file_type
    fileSize: number; // Mapped from file_size
    source: "upload" | "store";
    storeBookId?: string; // Mapped from store_book_id
    readingProgress: ReadingProgress; // Mapped from reading_progress
    addedAt: string; // ISO, mapped from added_at
    lastReadAt: string | null; // ISO, mapped from last_read_at
    deletedAt?: string | null;
}

export interface Collection {
    id: string;
    user_id: string;
    name: string;
    emoji: string;
    color: string;
    bookIds: string[]; // Mapped from book_ids
    createdAt: string; // ISO, mapped from created_at
}

export interface StoreBook {
    id: string;
    title: string;
    author: string;
    description: string;
    coverUrl: string; // mapped from cover_url
    fileUrl: string; // mapped from file_url
    category: string;
    featured: boolean;
    gutenbergId?: number;
    addedAt: string; // mapped from added_at
}

export interface AiArtifact {
    id: string;
    user_id: string;
    book_id: string | null;
    type: string;
    title: string;
    content: any;
    createdAt: string;
    deletedAt?: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapUserBook(row: any): UserBook {
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        author: row.author,
        coverUrl: row.cover_url || "",
        fileUrl: row.file_url || "",
        fileType: row.file_type || "epub",
        fileSize: row.file_size || 0,
        source: row.source || "upload",
        storeBookId: row.store_book_id,
        readingProgress: row.reading_progress || { cfi: "", percentage: 0, currentPage: 0, lastReadAt: null },
        addedAt: row.added_at,
        lastReadAt: row.last_read_at,
        deletedAt: row.deleted_at,
    };
}

function mapCollection(row: any): Collection {
    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        emoji: row.emoji,
        color: row.color,
        bookIds: row.book_ids || [],
        createdAt: row.created_at,
    };
}

function mapStoreBook(row: any): StoreBook {
    return {
        id: row.id,
        title: row.title,
        author: row.author,
        description: row.description || "",
        coverUrl: row.cover_url || "",
        fileUrl: row.file_url || "",
        category: row.category || "",
        featured: row.featured || false,
        addedAt: row.added_at,
    };
}

function mapAiArtifact(row: any): AiArtifact {
    return {
        id: row.id,
        user_id: row.user_id,
        book_id: row.book_id,
        type: row.type,
        title: row.title,
        content: row.content,
        createdAt: row.created_at,
        deletedAt: row.deleted_at,
    };
}

// ─── User Library — CRUD ───────────────────────────────────────────────────

export async function getUserBooks(uid: string): Promise<UserBook[]> {
    const { data, error } = await supabase
        .from("user_books")
        .select("*")
        .eq("user_id", uid)
        .is("deleted_at", null)
        .order("last_read_at", { ascending: false, nullsFirst: false })
        .order("added_at", { ascending: false });

    if (error) {
        console.error("Error fetching user books for uid:", uid, JSON.stringify(error, null, 2));
        return [];
    }
    return (data || []).map(mapUserBook);
}

export async function getUserBook(uid: string, bookId: string): Promise<UserBook | null> {
    const { data, error } = await supabase
        .from("user_books")
        .select("*")
        .eq("id", bookId)
        .eq("user_id", uid)  // Security: ensure callers can only read their own books
        .single();

    if (error) return null;
    return mapUserBook(data);
}

export async function addBookToLibrary(
    uid: string,
    bookData: Omit<UserBook, "id" | "user_id" | "addedAt" | "lastReadAt" | "readingProgress">
): Promise<string> {
    const row = {
        user_id: uid,
        title: bookData.title,
        author: bookData.author,
        cover_url: bookData.coverUrl,
        file_url: bookData.fileUrl,
        file_type: bookData.fileType,
        file_size: bookData.fileSize,
        source: bookData.source,
        store_book_id: bookData.storeBookId,
        reading_progress: { cfi: "", percentage: 0, currentPage: 0, lastReadAt: null },
        // added_at and last_read_at handled by default/null
    };

    const { data, error } = await supabase
        .from("user_books")
        .insert(row)
        .select("id")
        .single();

    if (error) throw error;
    return data.id;
}

export async function updateBook(
    uid: string,
    bookId: string,
    data: Partial<Pick<UserBook, "title" | "author" | "coverUrl">>
): Promise<void> {
    const update: any = {};
    if (data.title) update.title = data.title;
    if (data.author) update.author = data.author;
    if (data.coverUrl) update.cover_url = data.coverUrl;

    const { error } = await supabase
        .from("user_books")
        .update(update)
        .eq("id", bookId);

    if (error) throw error;
}

export async function deleteBook(uid: string, bookId: string): Promise<void> {
    const { error } = await supabase.from("user_books").delete().eq("id", bookId).eq("user_id", uid);
    if (error) throw error;

    // Cleanup collections
    const { data: cols } = await supabase
        .from("collections")
        .select("id, book_ids")
        .contains("book_ids", [bookId]);

    if (cols) {
        for (const col of cols) {
            await supabase
                .from("collections")
                .update({
                    book_ids: col.book_ids.filter((id: string) => id !== bookId)
                })
                .eq("id", col.id);
        }
    }
}

export async function updateReadingProgress(
    uid: string,
    bookId: string,
    progress: ReadingProgress
): Promise<void> {
    const { error } = await supabase
        .from("user_books")
        .update({
            reading_progress: progress,
            last_read_at: new Date().toISOString(),
        })
        .eq("id", bookId);

    if (error) throw error;
}

// ─── Collections ───────────────────────────────────────────────────────────

export async function getUserCollections(uid: string): Promise<Collection[]> {
    const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: true });

    if (error) {
        console.warn("Could not load collections:", error);
        return [];
    }
    return (data || []).map(mapCollection);
}

export async function createCollection(
    uid: string,
    data: { name: string; emoji: string; color: string }
): Promise<string> {
    const { data: res, error } = await supabase
        .from("collections")
        .insert({
            user_id: uid,
            name: data.name,
            emoji: data.emoji,
            color: data.color,
            book_ids: [],
        })
        .select("id")
        .single();

    if (error) throw error;
    return res.id;
}

export async function updateCollection(
    uid: string,
    collectionId: string,
    data: Partial<Pick<Collection, "name" | "emoji" | "color">>
): Promise<void> {
    const { error } = await supabase
        .from("collections")
        .update(data)
        .eq("id", collectionId);

    if (error) throw error;
}

export async function deleteCollection(uid: string, collectionId: string): Promise<void> {
    const { error } = await supabase.from("collections").delete().eq("id", collectionId);
    if (error) throw error;
}

export async function addBookToCollection(
    uid: string,
    collectionId: string,
    bookId: string
): Promise<void> {
    const { data: col } = await supabase.from("collections").select("book_ids").eq("id", collectionId).single();
    if (!col) return;

    const newIds = [...(col.book_ids || [])];
    if (!newIds.includes(bookId)) {
        newIds.push(bookId);
        await supabase.from("collections").update({ book_ids: newIds }).eq("id", collectionId);
    }
}

export async function removeBookFromCollection(
    uid: string,
    collectionId: string,
    bookId: string
): Promise<void> {
    const { data: col } = await supabase.from("collections").select("book_ids").eq("id", collectionId).single();
    if (!col) return;

    const newIds = (col.book_ids || []).filter((id: string) => id !== bookId);
    await supabase.from("collections").update({ book_ids: newIds }).eq("id", collectionId);
}

// ─── Store ─────────────────────────────────────────────────────────────────

export async function getStoreBooks(): Promise<StoreBook[]> {
    const { data, error } = await supabase
        .from("store_books")
        .select("*")
        .order("title", { ascending: true });

    if (error) {
        console.warn("Could not load store books:", error);
        return [];
    }
    return (data || []).map(mapStoreBook);
}

export async function getFeaturedStoreBooks(): Promise<StoreBook[]> {
    const { data, error } = await supabase
        .from("store_books")
        .select("*")
        .eq("featured", true);

    if (error) {
        console.warn("Could not load featured books:", error);
        return [];
    }
    return (data || []).map(mapStoreBook);
}

export async function getStoreBook(bookId: string): Promise<StoreBook | null> {
    const { data, error } = await supabase
        .from("store_books")
        .select("*")
        .eq("id", bookId)
        .single();

    if (error) return null;
    return mapStoreBook(data);
}

export async function addStoreBookToLibrary(
    uid: string,
    storeBook: StoreBook
): Promise<string> {
    return addBookToLibrary(uid, {
        title: storeBook.title,
        author: storeBook.author,
        coverUrl: storeBook.coverUrl,
        fileUrl: storeBook.fileUrl,
        fileType: "epub",
        fileSize: 0,
        source: "store",
        storeBookId: storeBook.id,
    });
}

// ─── AI Artifacts ───────────────────────────────────────────────────────────

export async function copySharedAiArtifacts(
    targetUid: string,
    targetBookId: string,
    tone: string,
    options: { storeBookId?: string; bookTitle?: string; bookAuthor?: string } = {}
): Promise<boolean> {
    if (!supabaseAdmin) {
        console.warn("Missing service role key, cannot search global resonance.");
        return false;
    }

    const { storeBookId, bookTitle, bookAuthor } = options;
    let bookIds: string[] = [];

    if (storeBookId) {
        // Path A: Gutenberg / store book — match via store_book_id
        const { data: relatedBooks } = await supabaseAdmin
            .from("user_books")
            .select("id")
            .eq("store_book_id", storeBookId);

        bookIds = (relatedBooks ?? []).map(b => b.id);
    } else if (bookTitle) {
        // Use LIKE wildcards for fuzzy matching — handles "The Book" vs "Book" differences
        let query = supabaseAdmin
            .from("user_books")
            .select("id, title")
            .ilike("title", `%${bookTitle.slice(0, 60)}%`)
            .neq("id", targetBookId);

        if (bookAuthor) {
            // Match on the last/most unique word of the author name for robustness
            const authorKeyword = bookAuthor.trim().split(/\s+/).filter(w => w.length > 3).pop() ?? bookAuthor;
            query = query.ilike("author", `%${authorKeyword}%`);
        }

        const { data: relatedBooks } = await query;
        bookIds = (relatedBooks ?? []).map(b => b.id);
    }

    if (bookIds.length === 0) return false;

    // ── Step 2: Find source series — _toneId first, tone label fallback ─────
    let { data: seriesList, error: seriesErr } = await supabaseAdmin
        .from("ai_artifacts")
        .select("id, book_id, title, content")
        .eq("type", "podcast-series")
        .is("deleted_at", null)
        .in("book_id", bookIds)
        .filter("content->>_toneId", "eq", tone)
        .limit(1);

    if (seriesErr) console.error("[GlobalResonance] series lookup error:", seriesErr);

    // Fallback: legacy artifacts without _toneId — match by tone label
    if (!seriesList || seriesList.length === 0) {
        const TONE_LABELS: Record<string, string> = {
            // Keys must match the PODCAST_TONES id values in gemini.ts
            philosophical: "Deep & Philosophical",
            suspense: "True Crime Suspense",
            witty: "Humorous & Witty",
            analytical: "Academic & Analytical",
            casual: "Casual Banter",
        };
        const label = TONE_LABELS[tone];
        console.log(`[GlobalResonance] _toneId not found — trying tone label fallback: "${label}"`);
        if (label) {
            const { data: fb } = await supabaseAdmin
                .from("ai_artifacts")
                .select("id, book_id, title, content")
                .eq("type", "podcast-series")
                .is("deleted_at", null)
                .in("book_id", bookIds)
                .filter("content->>tone", "eq", label)
                .limit(1);
            seriesList = fb;
        }
    }

    const sourceSeries = seriesList?.[0];
    if (!sourceSeries) {
        console.log(`[GlobalResonance] No source series found for tone="${tone}" — will generate fresh.`);
        return false;
    }
    console.log(`[GlobalResonance] Found source series: "${sourceSeries.title}" (book_id=${sourceSeries.book_id})`);

    const toneLabel: string = sourceSeries.content?.tone ?? tone;

    // ── Step 3: Find source episodes — _toneId first, title LIKE fallback ──────
    let { data: sourceEpisodes } = await supabaseAdmin
        .from("ai_artifacts")
        .select("id, type, title, content")
        .eq("type", "podcast")
        .is("deleted_at", null)
        .eq("book_id", sourceSeries.book_id)
        .filter("content->>_toneId", "eq", tone);

    if (!sourceEpisodes || sourceEpisodes.length === 0) {
        console.log("[GlobalResonance] Episodes by _toneId not found — trying title LIKE fallback");
        const { data: fb } = await supabaseAdmin
            .from("ai_artifacts")
            .select("id, type, title, content")
            .eq("type", "podcast")
            .is("deleted_at", null)
            .eq("book_id", sourceSeries.book_id)
            .ilike("title", `%(${toneLabel})%`);
        sourceEpisodes = fb;
    }

    if (!sourceEpisodes || sourceEpisodes.length === 0) {
        console.log(`[GlobalResonance] No episodes found — will generate fresh.`);
        return false;
    }
    console.log(`[GlobalResonance] Found ${sourceEpisodes.length} episodes to copy.`);

    // ── Step 4: Insert series + episodes using admin client (bypasses RLS) ──────
    const now = new Date().toISOString();

    const { error: seriesInsertErr } = await supabaseAdmin
        .from("ai_artifacts")
        .insert({
            user_id: targetUid,
            book_id: targetBookId,
            type: "podcast-series",
            title: sourceSeries.title,
            content: sourceSeries.content,
            created_at: now,
        });

    if (seriesInsertErr) {
        console.error("[GlobalResonance] Failed to insert series:", seriesInsertErr);
        return false;
    }

    const { error: epInsertErr } = await supabaseAdmin
        .from("ai_artifacts")
        .insert(
            sourceEpisodes.map(ep => ({
                user_id: targetUid,
                book_id: targetBookId,
                type: "podcast",
                title: ep.title,
                content: ep.content,
                created_at: now,
            }))
        );

    if (epInsertErr) {
        console.error("[GlobalResonance] Failed to insert episodes:", epInsertErr);
        return false;
    }


    return true;
}

export async function saveAiArtifact(
    uid: string,
    artifact: Omit<AiArtifact, "id" | "user_id" | "createdAt">
): Promise<string> {
    const { data, error } = await supabase
        .from("ai_artifacts")
        .insert({
            user_id: uid,
            book_id: artifact.book_id,
            type: artifact.type,
            title: artifact.title,
            content: artifact.content,
        })
        .select("id")
        .single();

    if (error) throw error;
    return data.id;
}

export async function getUserAiArtifacts(uid: string, type?: string): Promise<AiArtifact[]> {
    let query = supabase.from("ai_artifacts").select("*").eq("user_id", uid).is("deleted_at", null);

    if (type) {
        query = query.eq("type", type);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching AI artifacts:", error);
        return [];
    }
    return (data || []).map(mapAiArtifact);
}

export async function deleteAiArtifact(uid: string, artifactId: string): Promise<void> {
    // Soft-delete to match trashAiArtifact — prevents accidental data loss
    const { error } = await supabase
        .from("ai_artifacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", artifactId)
        .eq("user_id", uid);

    if (error) throw error;
}

// ─── Trash & Recovery ──────────────────────────────────────────────────────

export async function trashBook(uid: string, bookId: string): Promise<void> {
    const { error } = await supabase
        .from("user_books")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", bookId)
        .eq("user_id", uid);
    if (error) throw error;
}

export async function restoreBook(uid: string, bookId: string): Promise<void> {
    const { error } = await supabase
        .from("user_books")
        .update({ deleted_at: null })
        .eq("id", bookId)
        .eq("user_id", uid);
    if (error) throw error;
}

export async function trashAiArtifact(uid: string, artifactId: string): Promise<void> {
    const { error } = await supabase
        .from("ai_artifacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", artifactId)
        .eq("user_id", uid);
    if (error) throw error;
}

export async function restoreAiArtifact(uid: string, artifactId: string): Promise<void> {
    const { error } = await supabase
        .from("ai_artifacts")
        .update({ deleted_at: null })
        .eq("id", artifactId)
        .eq("user_id", uid);
    if (error) throw error;
}

export async function getTrashedBooks(uid: string): Promise<UserBook[]> {
    const { data, error } = await supabase
        .from("user_books")
        .select("*")
        .eq("user_id", uid)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

    if (error) return [];
    return (data || []).map(mapUserBook);
}

export async function getTrashedAiArtifacts(uid: string): Promise<AiArtifact[]> {
    const { data, error } = await supabase
        .from("ai_artifacts")
        .select("*")
        .eq("user_id", uid)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

    if (error) return [];
    return (data || []).map(mapAiArtifact);
}

// ─── Podcast Daily Generation Limit ────────────────────────────────────────

export const DAILY_PODCAST_LIMIT = 1;

/**
 * Returns how many new podcast series this user has generated today (UTC).
 * Counts rows in `podcast_generation_log` for today's UTC date.
 */
export async function getPodcastGenerationsToday(uid: string): Promise<number> {
    const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const { count, error } = await supabase
        .from("podcast_generation_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("generation_date", todayUtc);

    if (error) {
        console.warn("[PodcastLimit] Failed to check daily count:", error);
        return 0; // fail open — don't block if the check itself errors
    }
    return count ?? 0;
}

/**
 * Logs a successful new podcast series generation for the current user.
 * Call this ONCE per series generation (not per episode).
 */
export async function recordPodcastGeneration(
    uid: string,
    bookId: string,
    toneId: string
): Promise<void> {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
        .from("podcast_generation_log")
        .insert({ user_id: uid, book_id: bookId, tone_id: toneId, generation_date: todayUtc });

    if (error) {
        console.error("[PodcastLimit] Failed to record generation:", error);
        // Don't throw — logging failure shouldn't break the UX
    }
}
