// App-wide config read from Vite env vars, same optional-chaining pattern as
// supabaseClient.js: import.meta.env doesn't exist at all under esbuild (the Claude
// Artifact build), so this must stay a safe `undefined`/"" there instead of crashing.
export const SUPPORT_EMAIL = import.meta.env?.VITE_SUPPORT_EMAIL || "";
