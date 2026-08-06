// Rebuilds the single-file Claude Artifact version from the modular src/ tree.
//
// The Claude Artifact runtime transpiles JSX itself and provides `react` and
// `lucide-react` as globals/imports, so this only needs to *merge* the local
// modules (lib/, components/, App.jsx) into one file — JSX stays untouched
// (jsx: "preserve") and react/lucide-react stay as external imports instead
// of being bundled in.
//
// Usage: npm run build:artifact  ->  writes artifact/gestione-carte.jsx
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "artifact");
const outFile = path.join(outDir, "gestione-carte.jsx");

await mkdir(outDir, { recursive: true });

const result = await build({
  entryPoints: [path.join(root, "src/App.jsx")],
  bundle: true,
  write: false,
  format: "esm",
  jsx: "preserve",
  external: ["react", "react-dom", "react-dom/*", "lucide-react"],
  // The artifact runtime provides its own storage, not Supabase, and has no way to
  // resolve this bare specifier — redirect it to a no-op stub so the static import
  // in supabaseClient.js still resolves, without bundling the whole SDK in either.
  alias: {
    "@supabase/supabase-js": path.join(root, "scripts/supabase-js-stub.js"),
  },
  logLevel: "info",
});

const banner =
  "// Generato automaticamente da `npm run build:artifact` a partire da src/App.jsx e dai suoi\n" +
  "// moduli — non modificare a mano: le modifiche vanno fatte nei file sorgente in src/.\n" +
  "// Incolla il contenuto di questo file come Artifact React su claude.ai.\n\n";

const code = result.outputFiles[0].text;
await writeFile(outFile, banner + code, "utf8");

console.log(`Artifact scritto in ${path.relative(root, outFile)} (${(code.length / 1024).toFixed(1)} KB)`);
