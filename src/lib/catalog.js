import { C } from "./theme";

// Colors auto-assigned (in order) to games as they're added, so the user never has to
// pick a color by hand.
export const COLOR_PALETTE = [
  C.gold, C.crimson, C.teal, C.info, C.slate, C.amber,
  "#8E7CC3", "#E0779E", "#4FB0C6", "#B08968",
];

export const DEFAULT_GAMES = [
  { key: "pokemon", label: "Pokémon", color: C.gold },
  { key: "onepiece", label: "One Piece", color: C.crimson },
  { key: "altro", label: "Altro", color: C.slate },
];

export const DEFAULT_PLATFORMS = [
  "Vinted", "eBay", "Cardmarket", "TCGplayer", "Subito.it", "Facebook Marketplace", "Instagram", "Fiera", "Altro",
];

export const DEFAULT_GRADING_COMPANIES = ["PSA", "BGS", "CGC", "SGC"];

export function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Builds the {label,color,bg}-per-key lookup the rest of the app renders from —
// same shape the old static GAME_META had, just built from the user's game list.
export function buildGameMeta(games) {
  const meta = {};
  for (const g of games) meta[g.key] = { label: g.label, color: g.color, bg: hexToRgba(g.color, 0.14) };
  if (!meta.altro) meta.altro = { label: "Altro", color: C.slate, bg: hexToRgba(C.slate, 0.14) };
  return meta;
}

// "Altro" is the catch-all fallback game, so it always shows up last wherever the
// list is rendered — regardless of when it was added relative to the others.
export function sortAltroLast(games) {
  return [...games].sort((a, b) => (a.key === "altro") - (b.key === "altro"));
}

// Turns a free-typed label into a stable, unique storage key for a new game.
export function slugifyKey(label, existingKeys) {
  const base = label
    .trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "gioco";
  let key = base, i = 2;
  while (existingKeys.includes(key)) { key = `${base}-${i}`; i++; }
  return key;
}
