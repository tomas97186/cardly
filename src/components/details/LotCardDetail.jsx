import { Edit2, RotateCcw, Megaphone, ShoppingBag, Tag, ExternalLink, ChevronRight, Search } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { useEbayMarket } from "../../context/EbayMarketContext";
import { money, fmtDate } from "../../lib/format";
import { ebaySearchUrl, cardmarketSearchUrl } from "../../lib/marketSearch";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { PhotoThumb, PhotoGallery } from "../ui/Photo";
import { BoxLocationRow } from "../ui/BoxLocationRow";
import { GhostButton, GhostLinkButton, PrimaryButton } from "../ui/Buttons";

// ---------- Detail modal for a card that lives inside a lot ----------
export function LotCardDetail({ lot, card, onClose, onEdit, onSell, onCancelSale, onList, onEditListing, onUnlist, onOpenGroup, onCancelGroupSale }) {
  const { GAME_META } = useCatalog();
  const { t, lang } = useLanguage();
  const { ebayMarket } = useEbayMarket();
  const meta = GAME_META[card.game || lot.game] || GAME_META.altro;
  const costKnown = card.assignedCost != null;
  const isGroupSale = !!(card.sale && card.sale.groupId);
  const margin = card.sale && costKnown && card.sale.price != null ? card.sale.price - card.assignedCost : null;
  const statusLabel = card.status === "sold" ? t("common.status.soldOne") : card.status === "listed" ? t("common.status.listed") : t("common.status.inStock");
  const statusColor = card.status === "sold" ? C.teal : card.status === "listed" ? C.info : C.gold;
  const photoKeys = card.photoKeys && card.photoKeys.length ? card.photoKeys : lot.photoKeys;
  const cardLabel = card.name || t("common.unnamedCard");
  const photoNamePrefix = card.cardNumber ? `${cardLabel} - ${card.cardNumber}` : cardLabel;
  return (
    <Modal title={card.name || t("common.unnamedCard")} onClose={onClose} eyebrow={t("search.inLot", { lotName: lot.lotName })}>
      <div className="flex gap-4 mb-4">
        <PhotoThumb photoKey={photoKeys?.[0]} photoKeys={photoKeys} fileNamePrefix={photoNamePrefix} size={92} rounded="12px" iconSize={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
            {card.gradingCompany && <Badge color={C.info} bg={`${C.info}24`}>{card.gradingCompany}{card.grade ? ` ${card.grade}` : ""}</Badge>}
          </div>
          <div className="text-[12.5px] mt-1.5" style={{ color: C.textDim }}>{card.setName && <>{card.setName} · </>}{card.condition}{card.language && <> · {card.language}</>}</div>
        </div>
      </div>
      <PhotoGallery photoKeys={photoKeys} fileNamePrefix={photoNamePrefix} />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>{t("details.assignedCost")}</div>
          <div className="text-base font-bold mt-0.5" style={{ color: costKnown ? C.text : C.amber }}>{costKnown ? money(card.assignedCost) : t("common.notSpecified")}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>{t("details.status")}</div>
          <div className="text-base font-bold mt-0.5" style={{ color: statusColor }}>{statusLabel}</div>
        </div>
      </div>

      {card.boxId && (
        <div className="space-y-1.5 mb-4 text-[13.5px]" style={{ color: C.textDim }}>
          <BoxLocationRow boxId={card.boxId} />
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <GhostLinkButton full href={cardmarketSearchUrl(card.name, card.cardNumber, card.game || lot.game, lang)}><Search size={14} /> Cardmarket</GhostLinkButton>
        <GhostLinkButton full href={ebaySearchUrl(card.name, card.cardNumber, ebayMarket)}><Search size={14} /> eBay</GhostLinkButton>
      </div>

      {card.status === "listed" && card.listing && (
        <div className="p-3 rounded-xl mb-4" style={{ background: `${C.info}1A`, border: `1px solid ${C.infoDim}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: C.info }}>{t("details.listedEyebrow")}</span>
            <button onClick={onEditListing} style={{ color: C.info }}><Edit2 size={13} /></button>
          </div>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.askingPrice")}</span><span className="font-semibold">{money(card.listing.price)}</span></div>
          {card.listing.platform && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.platform")}</span><span>{card.listing.platform}</span></div>}
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.listedOn")}</span><span>{fmtDate(card.listing.listedDate)}</span></div>
          {card.listing.link && (
            <a href={card.listing.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] mt-1.5" style={{ color: C.info }}>
              <ExternalLink size={13} /> {t("details.openListing")}
            </a>
          )}
        </div>
      )}

      {card.status === "sold" && card.sale && isGroupSale && (
        <button onClick={onOpenGroup} className="w-full text-left p-3 rounded-xl mb-4" style={{ background: `${C.teal}1A`, border: `1px solid ${C.tealDim}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: C.teal }}>{t("details.soldInBulk")}</span>
            <ChevronRight size={14} color={C.teal} />
          </div>
          <div className="text-[13.5px]" style={{ color: C.text }}>
            {t(card.sale.groupSize - 1 === 1 ? "details.groupedWithOne" : "details.groupedWithMany", { count: card.sale.groupSize - 1, total: money(card.sale.groupTotal), date: fmtDate(card.sale.date) })}
          </div>
          <div className="text-[12px] mt-1" style={{ color: C.textDim }}>{t("details.tapForGroupDetail")}</div>
        </button>
      )}

      {card.status === "sold" && card.sale && !isGroupSale && (
        <div className="p-3 rounded-xl mb-4" style={{ background: `${C.teal}1A`, border: `1px solid ${C.tealDim}` }}>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.soldOn")}</span><span>{fmtDate(card.sale.date)}</span></div>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.price")}</span><span>{money(card.sale.price)}</span></div>
          {card.sale.buyer && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.buyer")}</span><span>{card.sale.buyer}</span></div>}
          {(card.sale.carrier || card.sale.tracking) && (
            <div className="flex justify-between text-[13.5px] mb-1">
              <span style={{ color: C.textDim }}>{t("details.shipping")}</span>
              <span className="text-right">{card.sale.carrier}{card.sale.carrier && card.sale.tracking && " · "}{card.sale.tracking}</span>
            </div>
          )}
          <div className="flex justify-between text-[13.5px] font-bold pt-1 mt-1" style={{ borderTop: `1px solid ${C.tealDim}` }}>
            <span>{t("details.margin")}</span>
            <span style={{ color: margin === null ? C.amber : margin >= 0 ? C.teal : C.crimson }}>
              {margin === null ? t("details.costUnknown") : `${margin >= 0 ? "+" : ""}${money(margin)}`}
            </span>
          </div>
        </div>
      )}

      {card.status === "sold" ? (
        <div className="flex gap-3">
          <GhostButton full onClick={onEdit}><Edit2 size={14} /> {t("common.edit")}</GhostButton>
          <GhostButton full onClick={isGroupSale ? onCancelGroupSale : onCancelSale} style={{ color: C.crimson, borderColor: C.crimsonDim }}><RotateCcw size={14} /> {isGroupSale ? t("details.cancelGroupSale") : t("details.cancelSale")}</GhostButton>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-3">
            <GhostButton full onClick={onEdit}><Edit2 size={14} /> {t("common.edit")}</GhostButton>
            {card.status === "listed" ? (
              <GhostButton full onClick={onUnlist} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Tag size={14} /> {t("details.removeFromSale")}</GhostButton>
            ) : (
              <GhostButton full onClick={onList}><Megaphone size={14} /> {t("details.putUpForSale")}</GhostButton>
            )}
          </div>
          <PrimaryButton full onClick={onSell}><ShoppingBag size={16} /> {card.status === "listed" ? t("details.markAsSold") : t("details.sell")}</PrimaryButton>
        </>
      )}
    </Modal>
  );
}
