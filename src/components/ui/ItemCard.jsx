import { Layers } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { euro, cardDisplayName } from "../../lib/format";
import { Badge } from "./Badge";
import { PhotoThumb } from "./Photo";

export function ItemCard({ item, onClick }) {
  const { GAME_META } = useCatalog();
  if (item.kind === "lotto") {
    const meta = GAME_META[item.game] || GAME_META.altro;
    const soldCount = item.cards.filter((c) => c.status === "sold").length;
    const listedCount = item.cards.filter((c) => c.status === "listed").length;
    return (
      <button onClick={onClick} className="text-left rounded-2xl overflow-hidden flex flex-col" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
        <div className="p-3 flex gap-3">
          <PhotoCover photoKeys={item.photoKeys} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <Layers size={11} color={C.textFaint} />
              <span className="text-[10.5px] uppercase tracking-wider" style={{ color: C.textFaint }}>Lotto</span>
            </div>
            <div className="text-[13.5px] font-medium leading-snug truncate">{item.lotName}</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: C.textDim }}>{item.cards.length} / {item.quantity} catalogate</div>
            <div className="flex items-center justify-between mt-1.5">
              <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
              <span className="text-[13px] font-bold">{euro(item.totalCost)}</span>
            </div>
          </div>
        </div>
        {(soldCount > 0 || listedCount > 0) && (
          <div className="px-3 pb-2 -mt-1 flex gap-2">
            {soldCount > 0 && <span className="text-[11px] font-semibold" style={{ color: C.teal }}>✓ {soldCount} vendute</span>}
            {listedCount > 0 && <span className="text-[11px] font-semibold" style={{ color: C.info }}>{listedCount} in vendita</span>}
          </div>
        )}
      </button>
    );
  }
  const meta = GAME_META[item.game] || GAME_META.altro;
  return (
    <button onClick={onClick} className="text-left rounded-2xl overflow-hidden flex flex-col" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
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
            <span className="text-[13px] font-bold flex-shrink-0" style={{ color: item.unitCost != null ? C.text : C.amber }}>{item.unitCost != null ? euro(item.unitCost) : "costo n.d."}</span>
          </div>
        </div>
      </div>
      {item.status === "sold" && (
        <div className="px-3 pb-2 -mt-1">
          <span className="text-[11px] font-semibold" style={{ color: C.teal }}>
            ✓ Venduta {item.sale && item.sale.groupId ? "in blocco" : item.sale && item.unitCost != null ? `· ${euro(item.sale.price - item.unitCost)} margine` : item.sale ? "· costo n.d." : ""}
          </span>
        </div>
      )}
      {item.status === "listed" && item.listing && (
        <div className="px-3 pb-2 -mt-1">
          <span className="text-[11px] font-semibold" style={{ color: C.info }}>In vendita · {euro(item.listing.price)}</span>
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
      <PhotoThumb photoKey={photoKeys?.[0]} size={58} rounded="10px" iconSize={16} />
      {photoKeys && photoKeys.length > 1 && (
        <span style={{ position: "absolute", right: 2, bottom: 2, background: "rgba(6,7,12,0.72)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 999 }}>
          {photoKeys.length}
        </span>
      )}
    </div>
  );
}
