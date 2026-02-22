/**
 * auth-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All Supabase authentication helpers used by the application.
 * Covers: email/password sign-in & registration, Google OAuth, sign-out,
 * session observation, and current-user retrieval.
 */

import { supabase } from "./supabase";
import { type User } from "@supabase/supabase-js";

// ── Email / Password ──────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
    });
    if (error) throw error;

    // Supabase returns an empty identities array for already-registered emails.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("This email is already registered. Please sign in instead.");
    }

    return data;
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    return data;
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/** Returns the currently authenticated user, or null if signed out. */
export async function getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 */
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
}
