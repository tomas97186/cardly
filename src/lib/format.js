export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function cardDisplayName(name, cardNumber) {
  return cardNumber ? `${name} - ${cardNumber}` : name;
}
export function euro(n) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
}
export function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) { return d; }
}
export function todayISO() { return new Date().toISOString().slice(0, 10); }
