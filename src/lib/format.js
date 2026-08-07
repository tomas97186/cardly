export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function cardDisplayName(name, cardNumber) {
  return cardNumber ? `${name} - ${cardNumber}` : name;
}

// Set once by LanguageContext whenever the UI language changes, so euro()/fmtDate()
// format numbers and dates in the right locale without every one of their dozens of
// call sites (components, csv.js) having to pass a locale through.
let currentLocale = "it-IT";
export function setFormatLocale(locale) { currentLocale = locale; }

export function euro(n) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat(currentLocale, { style: "currency", currency: "EUR" }).format(v);
}
export function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(currentLocale, { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) { return d; }
}
export function todayISO() { return new Date().toISOString().slice(0, 10); }
