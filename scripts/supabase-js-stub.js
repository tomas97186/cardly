// Stub used only by the Claude Artifact build (see build-artifact.mjs's esbuild
// `alias`). The artifact runtime has no way to resolve the real npm package, and
// never needs to: supabaseClient.js only calls createClient() when Vite env vars
// are present, which they never are under esbuild.
export function createClient() {
  return null;
}
