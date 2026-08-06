import { cardDisplayName } from "./format";

// Flattens every sold item (single cards and lot cards) into sellable "units" for
// reporting: items sold individually stay as-is, while items sold together via
// "vendita multipla" — regardless of whether they're single cards or from different
// lots — collapse into one unit per group. Its price is the group total; its cost is
// only counted if every member's cost is known, never invented by splitting the total.
export function buildAllSaleUnits(singolaItems, lotItems) {
  const groups = {};
  const singleUnits = [];
  const lotUnits = [];

  for (const it of singolaItems) {
    if (it.status !== "sold" || !it.sale) continue;
    if (it.sale.groupId) {
      const gid = it.sale.groupId;
      if (!groups[gid]) groups[gid] = { sale: it.sale, members: [] };
      groups[gid].members.push({ id: it.id, kind: "singola", name: cardDisplayName(it.name, it.cardNumber), cost: it.unitCost, photoKey: it.photoKeys?.[0], game: it.game, sourceLabel: "Carta singola" });
    } else {
      singleUnits.push({ id: it.id, kind: "singola", name: cardDisplayName(it.name, it.cardNumber), game: it.game, photoKey: it.photoKeys?.[0], sale: it.sale, cost: it.unitCost });
    }
  }
  for (const lot of lotItems) {
    for (const c of lot.cards) {
      if (c.status !== "sold" || !c.sale) continue;
      if (c.sale.groupId) {
        const gid = c.sale.groupId;
        if (!groups[gid]) groups[gid] = { sale: c.sale, members: [] };
        groups[gid].members.push({ id: c.id, kind: "lotto", lotId: lot.id, name: cardDisplayName(c.name || "Carta", c.cardNumber), cost: c.assignedCost, photoKey: c.photoKeys?.[0] || lot.photoKeys?.[0], game: c.game || lot.game, sourceLabel: `Lotto: ${lot.lotName}` });
      } else {
        lotUnits.push({
          id: c.id, kind: "lotto", lotId: lot.id, lotName: lot.lotName,
          name: cardDisplayName(c.name || "Carta", c.cardNumber), game: c.game || lot.game,
          photoKey: c.photoKeys?.[0] || lot.photoKeys?.[0], sale: c.sale, cost: c.assignedCost,
        });
      }
    }
  }
  const groupUnits = Object.entries(groups).map(([gid, g]) => {
    const allKnown = g.members.every((m) => m.cost != null);
    const label = g.members.length <= 3 ? g.members.map((m) => m.name || "Carta").join(", ") : `${g.members.length} carte`;
    return {
      id: gid, kind: "group", name: `Vendita multipla · ${label}`,
      game: g.members[0]?.game, photoKey: g.members[0]?.photoKey,
      sale: { price: g.sale.groupTotal, date: g.sale.date, buyer: g.sale.buyer, carrier: g.sale.carrier, tracking: g.sale.tracking, notes: g.sale.notes, groupSize: g.members.length },
      cost: allKnown ? g.members.reduce((s, m) => s + m.cost, 0) : null,
      members: g.members,
    };
  });
  return [...singleUnits, ...lotUnits, ...groupUnits];
}
