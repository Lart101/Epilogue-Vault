"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { updateReadingProgress } from "@/lib/db";

interface UseReadingSyncOptions {
    bookId: string;
    getLocation: () => {
        cfi: string;
        location?: string;
        percentage: number;
        currentPage: number
    } | null;
    intervalMs?: number;
}

export function useReadingSync({
    bookId,
    getLocation,
    intervalMs = 30000,
}: UseReadingSyncOptions) {
    const { user } = useAuth();
    const lastSavedRef = useRef<string>("");

    const saveProgress = useCallback(async () => {
        if (!user?.id || !bookId) return;

        const loc = getLocation();
        if (!loc) return;

        // Change detector: only save if progress moved
        const changeKey = `${loc.cfi}-${loc.percentage}-${loc.currentPage}`;
        if (changeKey === lastSavedRef.current) return;

        try {
            await updateReadingProgress(user.id, bookId, {
                cfi: loc.cfi,
                location: loc.location,
                currentPage: loc.currentPage,
                percentage: loc.percentage,
                lastReadAt: null, // db helper sets this
            });
            lastSavedRef.current = changeKey;
        } catch (error) {
            console.error("Failed to save reading progress:", error);
        }
    }, [user, bookId, getLocation]);

    // Auto-save on interval
    useEffect(() => {
        const interval = setInterval(saveProgress, intervalMs);
        return () => clearInterval(interval);
    }, [saveProgress, intervalMs]);

    // Immediate save trigger when location changes significantly
    // (using a throttled effect or simple trigger from parent is better, 
    // but here we rely on the interval and unmount for simplicity unless explicitly called)

    useEffect(() => {
        const handleBeforeUnload = () => {
            saveProgress();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            saveProgress();
        };
    }, [saveProgress]);

    return { saveProgress };
}
