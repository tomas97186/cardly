import { buildAllSaleUnits } from "./saleUnits";

// ---------- Report aggregations ----------
// Pure data functions (no i18n, no formatting) — ReportSection.jsx turns the
// numbers into chart-ready shapes and picks locale labels.

// Last `months` calendar months (oldest first, current month included).
// Invested comes from purchaseDate; revenue/margin from buildAllSaleUnits, which
// already collapses group sales into one unit each (shared lump price, cost only
// counted when every member's cost is known) — same rule Dashboard already uses.
export function buildMonthlyTrend(singolaItems, lotItems, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), invested: 0, revenue: 0, margin: 0 });
  }
  function bucketFor(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth()) || null;
  }
  for (const it of singolaItems) {
    const b = bucketFor(it.purchaseDate);
    if (b) b.invested += it.unitCost || 0;
  }
  for (const lot of lotItems) {
    const b = bucketFor(lot.purchaseDate);
    if (b) b.invested += lot.totalCost || 0;
  }
  for (const u of buildAllSaleUnits(singolaItems, lotItems)) {
    const b = bucketFor(u.sale.date);
    if (!b) continue;
    b.revenue += u.sale.price || 0;
    if (u.cost != null) b.margin += u.sale.price - u.cost;
  }
  return buckets;
}

// Invested/revenue/margin per game, restricted to `inRange` (the period filter
// shared with Dashboard/Vendite). Games with zero activity in the period are
// dropped so the chart doesn't fill up with empty bars.
export function buildGameBreakdown(singolaItems, lotItems, games, inRange) {
  const byGame = {};
  function ensure(key, label) {
    if (!byGame[key]) byGame[key] = { key, label: label || key, invested: 0, revenue: 0, margin: 0 };
    return byGame[key];
  }
  for (const g of games) ensure(g.key, g.label);
  for (const it of singolaItems) {
    if (inRange(it.purchaseDate)) ensure(it.game).invested += it.unitCost || 0;
  }
  for (const lot of lotItems) {
    if (inRange(lot.purchaseDate)) ensure(lot.game).invested += lot.totalCost || 0;
  }
  for (const u of buildAllSaleUnits(singolaItems, lotItems)) {
    if (!inRange(u.sale.date)) continue;
    const g = ensure(u.game);
    g.revenue += u.sale.price || 0;
    if (u.cost != null) g.margin += u.sale.price - u.cost;
  }
  return games.map((g) => byGame[g.key]).filter((g) => g.invested || g.revenue || g.margin);
}

// Margin per selling platform, restricted to `inRange`. Only individual sales with
// a known cost count (same "known cost" rule as the rest of the app); group sales
// are excluded — a single lump price isn't attributable to one platform. `listing`
// isn't cleared when an item is marked sold (see handleRegisterSale/handleSellLotCard
// in App.jsx), so the platform it was last listed on is still there for anything
// that went through "Metti in vendita" before selling; anything sold directly falls
// into `unknownLabel`. Sorted by margin, descending.
export function buildPlatformBreakdown(singolaItems, lotItems, inRange, unknownLabel) {
  const byPlatform = {};
  function add(platform, margin) {
    const key = platform || unknownLabel;
    if (!byPlatform[key]) byPlatform[key] = { platform: key, margin: 0 };
    byPlatform[key].margin += margin;
  }
  for (const it of singolaItems) {
    if (it.status !== "sold" || !it.sale || it.sale.groupId) continue;
    if (!inRange(it.sale.date) || it.unitCost == null) continue;
    add(it.listing?.platform, it.sale.price - it.unitCost);
  }
  for (const lot of lotItems) {
    for (const c of lot.cards) {
      if (c.status !== "sold" || !c.sale || c.sale.groupId) continue;
      if (!inRange(c.sale.date) || c.assignedCost == null) continue;
      add(c.listing?.platform, c.sale.price - c.assignedCost);
    }
  }
  return Object.values(byPlatform).sort((a, b) => b.margin - a.margin);
}
