// ---------- Design tokens ----------
// Two palettes, "light" (Slab) and "dark" (Mono Steel). C is a single mutable
// object — every component reads C.xxx at render time, so applyThemeMode() can
// swap the active palette in place (see ThemeContext) without threading a
// context/prop through every file that imports { C }.
const LIGHT_THEME = {
  bg: "#EEF1F5",
  surface: "#FFFFFF",
  surfaceAlt: "#E4E8EE",
  border: "#D6DBE3",
  text: "#1A2233",
  textDim: "#57607A",
  textFaint: "#8791A6",
  gold: "#C8102E",
  goldText: "#FFFFFF",
  teal: "#157A54",
  tealDim: "#D8EFE4",
  tealText: "#FFFFFF",
  crimson: "#B3261E",
  crimsonDim: "#F6DAD8",
  slate: "#5B6478",
  amber: "#B8720C",
  amberText: "#181305",
  info: "#2B5FA5",
  infoDim: "#DCE8F7",
  infoText: "#FFFFFF",
};

const DARK_THEME = {
  bg: "#15171B",
  surface: "#1D2025",
  surfaceAlt: "#24272D",
  border: "#2F333A",
  text: "#E9EAED",
  textDim: "#888D97",
  textFaint: "#585D66",
  gold: "#E4A33B",
  goldText: "#191307",
  teal: "#6BAF92",
  tealDim: "#1E332A",
  tealText: "#122019",
  crimson: "#B2665C",
  crimsonDim: "#3A2220",
  slate: "#6D7280",
  amber: "#C79352",
  amberText: "#1F1204",
  info: "#7796B4",
  infoDim: "#202B36",
  infoText: "#10171F",
};

export const THEME_MODES = { light: LIGHT_THEME, dark: DARK_THEME };

export const C = { ...DARK_THEME };

export function applyThemeMode(mode) {
  Object.assign(C, THEME_MODES[mode] || DARK_THEME);
}

export const CONDITION_OPTIONS = [
  "Sigillata", "NM — Near Mint", "LP — Lightly Played", "MP — Moderately Played",
  "HP — Heavily Played", "DMG — Danneggiata", "Da valutare",
];
export const CATEGORY_OPTIONS = [
  "Carta Singola", "Box / Display Sigillato", "Busta / Bustina", "Mazzo (Deck)", "Altro",
];
export const LANGUAGE_OPTIONS = [
  "Italiano", "Inglese", "Giapponese", "Coreano", "Cinese", "Altra lingua",
];

// I giochi gestiti e le piattaforme di vendita non sono più fissi: vivono in
// lib/catalog.js come default e sono personalizzabili dall'utente (vedi CatalogContext).
