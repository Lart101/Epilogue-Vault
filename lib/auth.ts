
import { supabase } from "./supabase";
import { type User } from "@supabase/supabase-js";

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/`,
        },
    });

    if (error) throw error;
    return data;
}

export async function signOutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export function onAuthChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
}
