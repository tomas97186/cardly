// ---------- Design tokens ----------
export const C = {
  bg: "#12141C",
  surface: "#1B1E2A",
  surfaceAlt: "#232840",
  border: "#2A2E42",
  text: "#EDEEF2",
  textDim: "#8B90A3",
  textFaint: "#5C6178",
  gold: "#D9AE4C",
  teal: "#3FB39B",
  tealDim: "#245A4E",
  crimson: "#CC5B4C",
  crimsonDim: "#5C2C26",
  slate: "#6C7A9C",
  amber: "#C98A3A",
  info: "#6C8EEF",
  infoDim: "#2C3A66",
};

export const CONDITION_OPTIONS = [
  "Sigillata", "NM — Near Mint", "LP — Lightly Played", "MP — Moderately Played",
  "HP — Heavily Played", "DMG — Danneggiata", "Da valutare",
];
export const CATEGORY_OPTIONS = [
  "Carta Singola", "Box / Display Sigillato", "Busta / Bustina", "Mazzo (Deck)", "Altro",
];

// I giochi gestiti e le piattaforme di vendita non sono più fissi: vivono in
// lib/catalog.js come default e sono personalizzabili dall'utente (vedi CatalogContext).
