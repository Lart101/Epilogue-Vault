
import { supabase } from "./supabase";

export interface UploadProgress {
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
}

export function uploadBookFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
): { promise: Promise<string>; cancel: () => void } {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    // Safe filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${timestamp}_${safeName}.${fileExtension}`;

    let cancelled = false;

    const promise = (async () => {
        if (onProgress) onProgress({ bytesTransferred: 0, totalBytes: file.size, percentage: 0 });

        const { data, error } = await supabase.storage
            .from("books")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (error) throw error;
        if (cancelled) throw new Error("Upload cancelled");

        if (onProgress) onProgress({ bytesTransferred: file.size, totalBytes: file.size, percentage: 100 });

        const { data: { publicUrl } } = supabase.storage
            .from("books")
            .getPublicUrl(filePath);

        return publicUrl;
    })();

    return {
        promise,
        cancel: () => { cancelled = true; }
    };
}

export async function uploadCoverImage(file: File, userId: string): Promise<string> {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filePath = `${userId}/${timestamp}-cover.${fileExtension}`;

    const { data, error } = await supabase.storage
        .from("covers")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from("covers")
        .getPublicUrl(filePath);

    return publicUrl;
}

export async function getBookFileUrl(pathOrUrl: string): Promise<string> {
    // If it's already a full URL, return it
    if (pathOrUrl.startsWith("http")) return pathOrUrl;

    // Otherwise assume it's a path
    const { data } = supabase.storage
        .from("books")
        .getPublicUrl(pathOrUrl);
    return data.publicUrl;
}

export async function deleteBookFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
        // Extract path from URL. 
        // Supabase URL format: https://[project].supabase.co/storage/v1/object/public/books/[path]
        const url = new URL(fileUrl);
        // Path checks
        if (url.pathname.includes("/storage/v1/object/public/books/")) {
            const path = url.pathname.split("/books/")[1];
            if (path) {
                const decodedPath = decodeURIComponent(path);
                await supabase.storage.from("books").remove([decodedPath]);
            }
        }
    } catch (error) {
        console.warn("Error deleting file:", error);
    }
}
