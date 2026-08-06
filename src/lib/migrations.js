import { uid } from "./format";

// Migrates data from an older schema (flat auto-split lots) if present.
export function migrateItems(raw) {
  if (!Array.isArray(raw)) return [];
  const lotsMap = {};
  const result = [];
  for (const it of raw) {
    if (it.kind === "lotto" || it.kind === "singola") { result.push(it); continue; }
    if (it.purchaseType === "singola") {
      result.push({ ...it, kind: "singola" });
    } else if (it.purchaseType === "lotto") {
      const lotId = it.lotId || uid();
      if (!lotsMap[lotId]) {
        lotsMap[lotId] = {
          id: lotId, kind: "lotto", lotName: it.lotName || "Lotto", game: it.game,
          totalCost: 0, quantity: 0, purchaseDate: it.purchaseDate, source: it.source,
          purchaseNotes: it.purchaseNotes, photoKey: it.photoKey, createdAt: it.createdAt || Date.now(),
          cards: [],
        };
        result.push(lotsMap[lotId]);
      }
      const lot = lotsMap[lotId];
      lot.totalCost += it.unitCost || 0;
      lot.quantity += 1;
      lot.cards.push({
        id: it.id, name: (it.name || "Carta").split("—").pop().trim(), game: it.game,
        setName: it.setName, cardNumber: it.cardNumber, condition: it.condition,
        category: it.category, assignedCost: it.unitCost, photoKey: it.photoKey,
        status: it.status, sale: it.sale, createdAt: it.createdAt || Date.now(),
      });
    } else {
      result.push({ ...it, kind: "singola" });
    }
  }
  return result.map(normalizePhotoKeys);
}

// Cards used to carry a single `photoKey`; normalizes everything to a `photoKeys`
// array so an item can hold several photos without a second migration pass later.
function normalizePhotoKeys(entry) {
  const { photoKey, photoKeys, ...rest } = entry;
  const normalized = { ...rest, photoKeys: photoKeys || (photoKey ? [photoKey] : []) };
  if (entry.kind === "lotto") {
    normalized.cards = (entry.cards || []).map(normalizePhotoKeys);
  }
  return normalized;
}
