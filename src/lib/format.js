export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function cardDisplayName(name, cardNumber) {
  return cardNumber ? `${name} - ${cardNumber}` : name;
}

// Set once by LanguageContext/CurrencyContext whenever the UI language or chosen
// currency changes, so money()/fmtDate() format in the right locale/currency without
// every one of their dozens of call sites (components, csv.js, pdfExport.js) having
// to pass them through.
let currentLocale = "it-IT";
let currentCurrency = "EUR";
export function setFormatLocale(locale) { currentLocale = locale; }
export function setFormatCurrency(currency) { currentCurrency = currency; }

// Curated list, not the full ISO 4217 set — the currencies collectible-card sellers
// actually deal with. `symbol` is used in plain-text labels (form field hints) where
// running the value through Intl.NumberFormat would be overkill.
export const CURRENCY_OPTIONS = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "CHF", symbol: "CHF" },
  { code: "JPY", symbol: "¥" },
];
export function currentCurrencySymbol() {
  return CURRENCY_OPTIONS.find((c) => c.code === currentCurrency)?.symbol || currentCurrency;
}
export function currentCurrencyCode() { return currentCurrency; }

export function money(n) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat(currentLocale, { style: "currency", currency: currentCurrency }).format(v);
}
export function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(currentLocale, { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) { return d; }
}
export function todayISO() { return new Date().toISOString().slice(0, 10); }
