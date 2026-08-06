// ---------- Period filter helpers ----------
export const PERIOD_OPTIONS = [
  ["all", "Da sempre"],
  ["month", "Questo mese"],
  ["lastmonth", "Mese scorso"],
  ["30d", "Ultimi 30 giorni"],
  ["year", "Quest'anno"],
  ["custom", "Personalizzato"],
];
export function getPeriodRange(period, customFrom, customTo) {
  const now = new Date();
  if (period === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
  }
  if (period === "lastmonth") {
    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
  }
  if (period === "30d") {
    const from = new Date(now); from.setDate(from.getDate() - 30);
    return { from, to: now };
  }
  if (period === "year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
  }
  if (period === "custom") {
    if (!customFrom || !customTo) return null;
    return { from: new Date(customFrom), to: new Date(customTo + "T23:59:59") };
  }
  return null; // "all"
}
export function makeInRange(range) {
  return (dateStr) => {
    if (!range || !dateStr) return true;
    const d = new Date(dateStr);
    return d >= range.from && d <= range.to;
  };
}
