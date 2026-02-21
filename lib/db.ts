
import { supabase } from "./supabase";
import { type User } from "@supabase/supabase-js";

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

// ─── User Library — CRUD ───────────────────────────────────────────────────

export async function getUserBooks(uid: string): Promise<UserBook[]> {
    const { data, error } = await supabase
        .from("user_books")
        .select("*")
        .eq("user_id", uid)
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
    const { error } = await supabase.from("user_books").delete().eq("id", bookId);
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
