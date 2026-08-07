import { useState } from "react";
import { Search, X } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { euro, cardDisplayName } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { PhotoThumb } from "../ui/Photo";

// ---------- Global search (across every card, lot and status) ----------
export function GlobalSearchModal({ items, onClose, onOpenItem, onOpenLotCard, onOpenLot }) {
  const { GAME_META } = useCatalog();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = [];
  if (q) {
    for (const it of items) {
      if (it.kind === "singola") {
        if ((it.name || "").toLowerCase().includes(q) || (it.setName || "").toLowerCase().includes(q) || (it.cardNumber || "").toLowerCase().includes(q)) {
          results.push({ type: "singola", id: it.id, name: cardDisplayName(it.name, it.cardNumber), sub: it.setName, game: it.game, photoKey: it.photoKeys?.[0], status: it.status, price: it.status === "sold" ? it.sale?.price : it.status === "listed" ? it.listing?.price : it.unitCost });
        }
      } else {
        if ((it.lotName || "").toLowerCase().includes(q)) {
          results.push({ type: "lot", id: it.id, name: it.lotName, sub: t("search.lotSub", { cataloged: it.cards.length, total: it.quantity }), game: it.game, photoKey: it.photoKeys?.[0], status: null, price: it.totalCost });
        }
        for (const c of it.cards) {
          if ((c.name || "").toLowerCase().includes(q) || (c.setName || "").toLowerCase().includes(q) || (c.cardNumber || "").toLowerCase().includes(q)) {
            results.push({ type: "lotCard", id: c.id, lotId: it.id, name: cardDisplayName(c.name || t("common.unnamedCard"), c.cardNumber), sub: t("search.inLot", { lotName: it.lotName }), game: c.game || it.game, photoKey: c.photoKeys?.[0] || it.photoKeys?.[0], status: c.status, price: c.status === "sold" ? c.sale?.price : c.status === "listed" ? c.listing?.price : c.assignedCost });
          }
        }
      }
    }
  }

  const statusLabel = (s) => (s === "sold" ? t("common.status.soldOne") : s === "listed" ? t("common.status.listed") : s === null ? t("search.lotLabel") : t("common.status.inStock"));
  const statusColor = (s) => (s === "sold" ? C.teal : s === "listed" ? C.info : s === null ? C.slate : C.gold);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: "rgba(6,7,12,0.85)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, width: "100%", maxWidth: 460, maxHeight: "92vh" }} className="mt-0 sm:mt-16 sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
          <Search size={16} color={C.textFaint} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: "14.5px", width: "100%" }}
          />
          <button onClick={onClose} style={{ color: C.textDim }}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!q ? (
            <div className="text-center py-14 text-[13px]" style={{ color: C.textFaint }}>{t("search.emptyPrompt")}</div>
          ) : results.length === 0 ? (
            <div className="text-center py-14 text-[13px]" style={{ color: C.textFaint }}>{t("search.noResults", { query })}</div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => {
                const meta = GAME_META[r.game] || GAME_META.altro;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      onClose();
                      if (r.type === "singola") onOpenItem(r.id);
                      else if (r.type === "lot") onOpenLot(r.id);
                      else onOpenLotCard(r.lotId, r.id);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left"
                    style={{ background: C.surfaceAlt }}
                  >
                    <PhotoThumb photoKey={r.photoKey} size={42} rounded="8px" iconSize={14} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                        <span className="text-[11px] truncate" style={{ color: C.textFaint }}>{r.sub}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-0.5">
                      {r.price != null && <span className="text-[12px] font-semibold">{euro(r.price)}</span>}
                      <span className="text-[10.5px] font-semibold" style={{ color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
