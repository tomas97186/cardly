import { buildAllSaleUnits } from "./saleUnits";
import { todayISO } from "./format";

// Builds and downloads the full inventory CSV export (single cards, lot cards,
// unallocated lot quotas, and one summary row per group sale). `gameMeta` is the
// user's current games lookup (label per game key), from CatalogContext. `t` is the
// translation function from LanguageContext, so headers/status text follow the UI language.
export function exportInventoryCSV(items, gameMeta, t) {
  const headers = t("csv.headers");
  const rows = [];
  const singolaForExport = items.filter((it) => it.kind === "singola");
  const lotsForExport = items.filter((it) => it.kind === "lotto");

  for (const it of singolaForExport) {
    const isGroup = !!(it.sale && it.sale.groupId);
    rows.push([isGroup ? t("csv.singleCardGroup") : t("csv.singleCard"), "", it.name, gameMeta[it.game]?.label || it.game, it.setName, it.condition, it.language || "",
      it.unitCost != null ? it.unitCost.toFixed(2) : t("common.notSpecified"), it.purchaseDate, it.source, it.status === "sold" ? t("common.status.soldOne") : t("common.status.inStock"),
      it.sale && it.sale.price != null ? it.sale.price.toFixed(2) : "", it.sale ? it.sale.date : "", it.sale ? it.sale.buyer : "",
      it.sale ? it.sale.carrier || "" : "", it.sale ? it.sale.tracking || "" : "",
      it.sale && it.sale.price != null && it.unitCost != null ? (it.sale.price - it.unitCost).toFixed(2) : ""]);
  }
  for (const it of lotsForExport) {
    if (it.cards.length === 0) {
      rows.push([t("csv.lotNoCards"), it.lotName, "", gameMeta[it.game]?.label || it.game, "", "", "",
        it.totalCost.toFixed(2), it.purchaseDate, it.source, t("common.status.inStock"), "", "", "", "", "", ""]);
      continue;
    }
    for (const c of it.cards) {
      const isGroup = !!(c.sale && c.sale.groupId);
      rows.push([isGroup ? t("csv.lotCardGroup") : t("csv.lotCard"), it.lotName, c.name, gameMeta[c.game || it.game]?.label, c.setName, c.condition, c.language || "",
        c.assignedCost != null ? c.assignedCost.toFixed(2) : t("common.notSpecified"), it.purchaseDate, it.source,
        c.status === "sold" ? t("common.status.soldOne") : t("common.status.inStock"),
        c.sale && c.sale.price != null ? c.sale.price.toFixed(2) : "",
        c.sale ? c.sale.date : "", c.sale ? c.sale.buyer : "",
        c.sale ? c.sale.carrier || "" : "", c.sale ? c.sale.tracking || "" : "",
        c.sale && c.sale.price != null && c.assignedCost != null ? (c.sale.price - c.assignedCost).toFixed(2) : ""]);
    }
    const assigned = it.cards.reduce((s, c) => s + (c.assignedCost || 0), 0);
    const unalloc = it.totalCost - assigned;
    if (Math.abs(unalloc) > 0.009) {
      rows.push([t("csv.lotUnallocated"), it.lotName, "", "", "", "", "", unalloc.toFixed(2), it.purchaseDate, it.source, "", "", "", "", "", "", ""]);
    }
  }

  // One summary row per group sale, wherever its members come from (single cards
  // and/or cards from different lots) — never invents a per-card price.
  const groupUnits = buildAllSaleUnits(singolaForExport, lotsForExport).filter((u) => u.kind === "group");
  for (const g of groupUnits) {
    rows.push([t("csv.groupSaleSummary"), "", `${t("csv.groupMembersLabel", { count: g.members.length })}: ${g.members.map((m) => m.name || t("common.unnamedCard")).join(", ")}`,
      "", "", "", "", g.cost != null ? g.cost.toFixed(2) : "", "", "", t("common.status.soldOne"),
      g.sale.price.toFixed(2), g.sale.date, g.sale.buyer || "", g.sale.carrier || "", g.sale.tracking || "",
      g.cost != null ? (g.sale.price - g.cost).toFixed(2) : ""]);
  }
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${t("csv.filenamePrefix")}_${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
