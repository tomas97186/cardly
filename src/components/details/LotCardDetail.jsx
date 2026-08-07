import { Edit2, RotateCcw, Megaphone, ShoppingBag, Tag, ExternalLink, ChevronRight, Search } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { euro, fmtDate } from "../../lib/format";
import { ebaySearchUrl, cardmarketSearchUrl } from "../../lib/marketSearch";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { PhotoThumb, PhotoGallery } from "../ui/Photo";
import { GhostButton, GhostLinkButton, PrimaryButton } from "../ui/Buttons";

// ---------- Detail modal for a card that lives inside a lot ----------
export function LotCardDetail({ lot, card, onClose, onEdit, onSell, onCancelSale, onList, onEditListing, onUnlist, onOpenGroup, onCancelGroupSale }) {
  const { GAME_META } = useCatalog();
  const meta = GAME_META[card.game || lot.game] || GAME_META.altro;
  const costKnown = card.assignedCost != null;
  const isGroupSale = !!(card.sale && card.sale.groupId);
  const margin = card.sale && costKnown && card.sale.price != null ? card.sale.price - card.assignedCost : null;
  const statusLabel = card.status === "sold" ? "Venduta" : card.status === "listed" ? "In vendita" : "In magazzino";
  const statusColor = card.status === "sold" ? C.teal : card.status === "listed" ? C.info : C.gold;
  const photoKeys = card.photoKeys && card.photoKeys.length ? card.photoKeys : lot.photoKeys;
  const cardLabel = card.name || "Carta senza nome";
  const photoNamePrefix = card.cardNumber ? `${cardLabel} - ${card.cardNumber}` : cardLabel;
  return (
    <Modal title={card.name || "Carta senza nome"} onClose={onClose} eyebrow={`Nel lotto · ${lot.lotName}`}>
      <div className="flex gap-4 mb-4">
        <PhotoThumb photoKey={photoKeys?.[0]} photoKeys={photoKeys} fileNamePrefix={photoNamePrefix} size={92} rounded="12px" iconSize={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
            {card.gradingCompany && <Badge color={C.info} bg="rgba(108,142,239,0.14)">{card.gradingCompany}{card.grade ? ` ${card.grade}` : ""}</Badge>}
          </div>
          <div className="text-[12.5px] mt-1.5" style={{ color: C.textDim }}>{card.setName && <>{card.setName} · </>}{card.condition}{card.language && <> · {card.language}</>}</div>
        </div>
      </div>
      <PhotoGallery photoKeys={photoKeys} fileNamePrefix={photoNamePrefix} />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>Costo attribuito</div>
          <div className="text-base font-bold mt-0.5" style={{ color: costKnown ? C.text : C.amber }}>{costKnown ? euro(card.assignedCost) : "Non specificato"}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>Stato</div>
          <div className="text-base font-bold mt-0.5" style={{ color: statusColor }}>{statusLabel}</div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <GhostLinkButton full href={cardmarketSearchUrl(card.name, card.cardNumber, card.game || lot.game)}><Search size={14} /> Cardmarket</GhostLinkButton>
        <GhostLinkButton full href={ebaySearchUrl(card.name, card.cardNumber)}><Search size={14} /> eBay</GhostLinkButton>
      </div>

      {card.status === "listed" && card.listing && (
        <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(108,142,239,0.1)", border: `1px solid ${C.infoDim}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: C.info }}>In vendita</span>
            <button onClick={onEditListing} style={{ color: C.info }}><Edit2 size={13} /></button>
          </div>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Prezzo richiesto</span><span className="font-semibold">{euro(card.listing.price)}</span></div>
          {card.listing.platform && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Piattaforma</span><span>{card.listing.platform}</span></div>}
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Messa in vendita il</span><span>{fmtDate(card.listing.listedDate)}</span></div>
          {card.listing.link && (
            <a href={card.listing.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] mt-1.5" style={{ color: C.info }}>
              <ExternalLink size={13} /> Apri annuncio
            </a>
          )}
        </div>
      )}

      {card.status === "sold" && card.sale && isGroupSale && (
        <button onClick={onOpenGroup} className="w-full text-left p-3 rounded-xl mb-4" style={{ background: "rgba(63,179,155,0.1)", border: `1px solid ${C.tealDim}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: C.teal }}>Venduta in blocco</span>
            <ChevronRight size={14} color={C.teal} />
          </div>
          <div className="text-[13.5px]" style={{ color: C.text }}>
            Insieme ad altre {card.sale.groupSize - 1} {card.sale.groupSize - 1 === 1 ? "carta" : "carte"} per un totale di {euro(card.sale.groupTotal)}, il {fmtDate(card.sale.date)}.
          </div>
          <div className="text-[12px] mt-1" style={{ color: C.textDim }}>Tocca per vedere il dettaglio della vendita di gruppo.</div>
        </button>
      )}

      {card.status === "sold" && card.sale && !isGroupSale && (
        <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(63,179,155,0.1)", border: `1px solid ${C.tealDim}` }}>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Venduta il</span><span>{fmtDate(card.sale.date)}</span></div>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Prezzo</span><span>{euro(card.sale.price)}</span></div>
          {card.sale.buyer && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Acquirente</span><span>{card.sale.buyer}</span></div>}
          {(card.sale.carrier || card.sale.tracking) && (
            <div className="flex justify-between text-[13.5px] mb-1">
              <span style={{ color: C.textDim }}>Spedizione</span>
              <span className="text-right">{card.sale.carrier}{card.sale.carrier && card.sale.tracking && " · "}{card.sale.tracking}</span>
            </div>
          )}
          <div className="flex justify-between text-[13.5px] font-bold pt-1 mt-1" style={{ borderTop: `1px solid ${C.tealDim}` }}>
            <span>Margine</span>
            <span style={{ color: margin === null ? C.amber : margin >= 0 ? C.teal : C.crimson }}>
              {margin === null ? "Costo non noto" : `${margin >= 0 ? "+" : ""}${euro(margin)}`}
            </span>
          </div>
        </div>
      )}

      {card.status === "sold" ? (
        <div className="flex gap-3">
          <GhostButton full onClick={onEdit}><Edit2 size={14} /> Modifica</GhostButton>
          <GhostButton full onClick={isGroupSale ? onCancelGroupSale : onCancelSale} style={{ color: C.crimson, borderColor: C.crimsonDim }}><RotateCcw size={14} /> {isGroupSale ? "Annulla vendita di gruppo" : "Annulla vendita"}</GhostButton>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-3">
            <GhostButton full onClick={onEdit}><Edit2 size={14} /> Modifica</GhostButton>
            {card.status === "listed" ? (
              <GhostButton full onClick={onUnlist} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Tag size={14} /> Rimuovi da vendita</GhostButton>
            ) : (
              <GhostButton full onClick={onList}><Megaphone size={14} /> Metti in vendita</GhostButton>
            )}
          </div>
          <PrimaryButton full onClick={onSell}><ShoppingBag size={16} /> {card.status === "listed" ? "Segna come venduta" : "Vendi"}</PrimaryButton>
        </>
      )}
    </Modal>
  );
}
