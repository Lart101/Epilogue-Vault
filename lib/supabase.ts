/**
 * supabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton Supabase browser client.
 * Import `supabase` from here everywhere in client-side code.
 * The admin client (service-role) is only used in server-only API routes via `db.ts`.
 */

import { createClient } from "@supabase/supabase-js";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing!", {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey
    });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
