import { Layers } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { money, cardDisplayName } from "../../lib/format";
import { Badge } from "./Badge";
import { PhotoThumb } from "./Photo";

export function ItemCard({ item, onClick }) {
  const { GAME_META } = useCatalog();
  const { t } = useLanguage();
  if (item.kind === "lotto") {
    const meta = GAME_META[item.game] || GAME_META.altro;
    // Precomputed by search_inventory (see supabase/pagination.sql) — the grid never
    // loads a lot's full card list, only these aggregate counts.
    const soldCount = item.soldCount || 0;
    const listedCount = item.listedCount || 0;
    return (
      <button onClick={onClick} className="anim-fade-in text-left rounded-2xl overflow-hidden flex flex-col transition-transform active:scale-[0.98]" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
        <div className="p-3 flex gap-3">
          <PhotoCover photoKeys={item.photoKeys} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <Layers size={11} color={C.textFaint} />
              <span className="text-[10.5px] uppercase tracking-wider" style={{ color: C.textFaint }}>{t("itemCard.lot")}</span>
            </div>
            <div className="text-[13.5px] font-medium leading-snug truncate">{item.lotName}</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: C.textDim }}>{t("itemCard.catalogedCount", { done: item.cardsCount || 0, total: item.quantity })}</div>
            <div className="flex items-center justify-between mt-1.5">
              <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
              <span className="text-[13px] font-bold">{money(item.totalCost)}</span>
            </div>
          </div>
        </div>
        {(soldCount > 0 || listedCount > 0) && (
          <div className="px-3 pb-2 -mt-1 flex gap-2">
            {soldCount > 0 && <span className="text-[11px] font-semibold" style={{ color: C.teal }}>{t("itemCard.soldCount", { count: soldCount })}</span>}
            {listedCount > 0 && <span className="text-[11px] font-semibold" style={{ color: C.info }}>{t("itemCard.listedCount", { count: listedCount })}</span>}
          </div>
        )}
      </button>
    );
  }
  const meta = GAME_META[item.game] || GAME_META.altro;
  return (
    <button onClick={onClick} className="anim-fade-in text-left rounded-2xl overflow-hidden flex flex-col transition-transform active:scale-[0.98]" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
      <div className="p-3 flex gap-3">
        <PhotoCover photoKeys={item.photoKeys} />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium leading-snug truncate">{cardDisplayName(item.name, item.cardNumber)}</div>
          <div className="text-[11.5px] mt-0.5 truncate" style={{ color: C.textDim }}>{item.setName || item.condition}</div>
          <div className="flex items-center justify-between gap-1.5 mt-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
              {/* {item.gradingCompany && <Badge color={C.info} bg="rgba(108,142,239,0.14)">{item.gradingCompany}{item.grade ? ` ${item.grade}` : ""}</Badge>} */}
            </div>
            <span className="text-[13px] font-bold flex-shrink-0" style={{ color: item.unitCost != null ? C.text : C.amber }}>{item.unitCost != null ? money(item.unitCost) : t("common.costNa")}</span>
          </div>
        </div>
      </div>
      {item.status === "sold" && (
        <div className="px-3 pb-2 -mt-1">
          <span className="text-[11px] font-semibold" style={{ color: C.teal }}>
            {item.sale && item.sale.groupId ? t("itemCard.soldBulk") : item.sale && item.unitCost != null ? t("itemCard.soldWithMargin", { margin: money(item.sale.price - item.unitCost) }) : item.sale ? t("itemCard.soldCostNa") : t("itemCard.soldPlain")}
          </span>
        </div>
      )}
      {item.status === "listed" && item.listing && (
        <div className="px-3 pb-2 -mt-1">
          <span className="text-[11px] font-semibold" style={{ color: C.info }}>{t("itemCard.listedWithPrice", { price: money(item.listing.price) })}</span>
        </div>
      )}
    </button>
  );
}

// Cover thumbnail with a small badge showing how many photos are attached, when
// there's more than one.
function PhotoCover({ photoKeys }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <PhotoThumb photoKey={photoKeys?.[0]} size={58} rounded="10px" iconSize={16} preferThumb />
      {photoKeys && photoKeys.length > 1 && (
        <span style={{ position: "absolute", right: 2, bottom: 2, background: "rgba(6,7,12,0.72)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 999 }}>
          {photoKeys.length}
        </span>
      )}
    </div>
  );
}
