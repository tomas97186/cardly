import { Edit2, Layers, Plus, ChevronRight } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { money, fmtDate } from "../../lib/format";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { PhotoThumb, PhotoGallery } from "../ui/Photo";
import { BoxLocationRow } from "../ui/BoxLocationRow";

// ---------- Lot detail (container view) ----------
export function LotDetail({ lot, onClose, onEditLot, onAddCard, onOpenCard }) {
  const { GAME_META } = useCatalog();
  const { t } = useLanguage();
  const meta = GAME_META[lot.game] || GAME_META.altro;
  const assigned = lot.cards.reduce((s, c) => s + (c.assignedCost || 0), 0);
  const unallocated = lot.totalCost - assigned;
  const soldCount = lot.cards.filter((c) => c.status === "sold").length;
  const listedCount = lot.cards.filter((c) => c.status === "listed").length;
  const remaining = Math.max(0, lot.quantity - lot.cards.length);

  return (
    <Modal title={lot.lotName} onClose={onClose} eyebrow={t("details.lotEyebrow")} wide>
      <div className="flex gap-4 mb-4">
        <PhotoThumb photoKey={lot.photoKeys?.[0]} photoKeys={lot.photoKeys} fileNamePrefix={lot.lotName} size={80} rounded="12px" iconSize={22} />
        <div className="flex-1 min-w-0">
          <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
          <div className="text-[12.5px] mt-1.5" style={{ color: C.textDim }}>
            {fmtDate(lot.purchaseDate)}{lot.source && <> · {lot.source}</>}
          </div>
        </div>
        <button onClick={onEditLot} className="self-start p-2 rounded-lg" style={{ color: C.textDim }}><Edit2 size={16} /></button>
      </div>
      <PhotoGallery photoKeys={lot.photoKeys} fileNamePrefix={lot.lotName} />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2.5 rounded-xl text-center" style={{ background: C.surfaceAlt }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: C.textFaint }}>{t("details.lotTotal")}</div>
          <div className="text-sm font-bold mt-0.5">{money(lot.totalCost)}</div>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background: C.surfaceAlt }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: C.textFaint }}>{t("details.lotCataloged")}</div>
          <div className="text-sm font-bold mt-0.5">{lot.cards.length} / {lot.quantity}</div>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background: C.surfaceAlt }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: C.textFaint }}>{t("details.lotUnallocated")}</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: unallocated !== 0 ? C.amber : C.text }}>{money(unallocated)}</div>
        </div>
      </div>

      {lot.boxId && (
        <div className="space-y-1.5 mb-4 text-[13.5px]" style={{ color: C.textDim }}>
          <BoxLocationRow boxId={lot.boxId} />
        </div>
      )}
      {lot.purchaseNotes && <p className="text-[13px] mb-4" style={{ color: C.textDim }}>{lot.purchaseNotes}</p>}

      <h4 className="text-[12px] uppercase tracking-widest mb-2" style={{ color: C.textFaint }}>
        {t("details.cardsInLot")} {soldCount > 0 && <span style={{ color: C.teal }}>· {t("details.soldCount", { count: soldCount })}</span>} {listedCount > 0 && <span style={{ color: C.info }}>· {t("details.listedCount", { count: listedCount })}</span>}
      </h4>

      {lot.cards.length === 0 ? (
        <div className="text-center py-8 rounded-xl mb-2" style={{ background: C.surfaceAlt, color: C.textFaint }}>
          <Layers size={20} className="mx-auto mb-1.5" />
          <div className="text-[13px]">{t("details.noCardsCataloged")}</div>
        </div>
      ) : (
        <div className="space-y-2 mb-2">
          {lot.cards.map((card) => {
            const cardMeta = GAME_META[card.game || lot.game] || GAME_META.altro;
            const costKnown = card.assignedCost != null;
            const margin = card.sale && costKnown && card.sale.price != null ? card.sale.price - card.assignedCost : null;
            return (
              <button key={card.id} onClick={() => onOpenCard(card)} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left" style={{ background: C.surfaceAlt }}>
                <PhotoThumb photoKey={card.photoKeys?.[0] || lot.photoKeys?.[0]} size={40} rounded="8px" iconSize={14} preferThumb />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{card.name || t("common.unnamedCard")}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge color={cardMeta.color} bg={cardMeta.bg}>{cardMeta.label}</Badge>
                    {card.gradingCompany && <Badge color={C.info} bg={`${C.info}24`}>{card.gradingCompany}{card.grade ? ` ${card.grade}` : ""}</Badge>}
                    <span className="text-[11px]" style={{ color: costKnown ? C.textFaint : C.amber }}>
                      {costKnown ? money(card.assignedCost) : t("details.costNa")}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: card.status === "sold" ? C.teal : card.status === "listed" ? C.info : C.textDim }}>
                    {card.status === "sold" ? (card.sale && card.sale.groupId ? t("details.statusSoldGroupShort") : t("details.statusSoldShort")) : card.status === "listed" ? t("details.statusListedShort") : t("details.statusInStockShort")}
                  </span>
                  {card.status === "sold" && margin !== null && (
                    <span className="text-[11px]" style={{ color: margin >= 0 ? C.teal : C.crimson }}>{margin >= 0 ? "+" : ""}{money(margin)}</span>
                  )}
                  {card.status === "listed" && card.listing && (
                    <span className="text-[11px]" style={{ color: C.info }}>{money(card.listing.price)}</span>
                  )}
                </div>
                <ChevronRight size={15} color={C.textFaint} />
              </button>
            );
          })}
        </div>
      )}

      {remaining > 0 && (
        <button onClick={onAddCard} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold" style={{ border: `1.5px dashed ${C.gold}`, color: C.gold, background: "rgba(217,174,76,0.08)" }}>
          <Plus size={15} /> {t("details.remainingToCatalog", { count: remaining })}
        </button>
      )}
    </Modal>
  );
}
