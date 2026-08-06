import { createClient } from "@supabase/supabase-js";

// import.meta.env is a real, statically-replaced object under Vite (the PWA build),
// but doesn't exist at all under esbuild (the Claude Artifact build) — optional
// chaining keeps this a safe `undefined` there instead of a crash.
const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
