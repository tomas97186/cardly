import { Edit2, RotateCcw, Megaphone, ShoppingBag, Tag, ExternalLink, ChevronRight, Search } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { euro, fmtDate } from "../../lib/format";
import { ebaySearchUrl, cardmarketSearchUrl } from "../../lib/marketSearch";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { PhotoThumb, PhotoGallery } from "../ui/Photo";
import { GhostButton, GhostLinkButton, PrimaryButton } from "../ui/Buttons";

// ---------- Detail modal for a single top-level card ----------
export function ItemDetail({ item, onClose, onEdit, onSell, onCancelSale, onList, onEditListing, onUnlist, onOpenGroup }) {
  const { GAME_META } = useCatalog();
  const meta = GAME_META[item.game] || GAME_META.altro;
  const costKnown = item.unitCost != null;
  const isGroupSale = !!(item.sale && item.sale.groupId);
  const margin = item.sale && costKnown && item.sale.price != null ? item.sale.price - item.unitCost : null;
  const statusLabel = item.status === "sold" ? "Venduta" : item.status === "listed" ? "In vendita" : "In magazzino";
  const statusColor = item.status === "sold" ? C.teal : item.status === "listed" ? C.info : C.gold;
  const photoNamePrefix = item.cardNumber ? `${item.name} - ${item.cardNumber}` : item.name;
  return (
    <Modal title="Dettaglio" onClose={onClose}>
      <div className="flex gap-4 mb-4">
        <PhotoThumb photoKey={item.photoKeys?.[0]} photoKeys={item.photoKeys} fileNamePrefix={photoNamePrefix} size={92} rounded="12px" iconSize={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
            {item.gradingCompany && <Badge color={C.info} bg="rgba(108,142,239,0.14)">{item.gradingCompany}{item.grade ? ` ${item.grade}` : ""}</Badge>}
          </div>
          <h3 className="text-base font-semibold mt-1.5 leading-snug">{item.name}</h3>
          <div className="text-[12.5px] mt-1" style={{ color: C.textDim }}>{item.setName && <>{item.setName} · </>}{item.condition}{item.language && <> · {item.language}</>}</div>
        </div>
      </div>
      <PhotoGallery photoKeys={item.photoKeys} fileNamePrefix={photoNamePrefix} />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>Costo</div>
          <div className="text-base font-bold mt-0.5" style={{ color: costKnown ? C.text : C.amber }}>{costKnown ? euro(item.unitCost) : "Non specificato"}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>Stato</div>
          <div className="text-base font-bold mt-0.5" style={{ color: statusColor }}>{statusLabel}</div>
        </div>
      </div>
      <div className="space-y-1.5 mb-4 text-[13.5px]" style={{ color: C.textDim }}>
        <div className="flex justify-between"><span>Categoria</span><span style={{ color: C.text }}>{item.category}</span></div>
        {item.cardNumber && <div className="flex justify-between"><span>Numero carta</span><span style={{ color: C.text }}>{item.cardNumber}</span></div>}
        <div className="flex justify-between"><span>Data acquisto</span><span style={{ color: C.text }}>{fmtDate(item.purchaseDate)}</span></div>
        {item.source && <div className="flex justify-between"><span>Fonte</span><span style={{ color: C.text }}>{item.source}</span></div>}
        {item.purchaseNotes && <div className="pt-1" style={{ color: C.text }}>{item.purchaseNotes}</div>}
      </div>

      <div className="flex gap-3 mb-4">
        <GhostLinkButton full href={cardmarketSearchUrl(item.name, item.cardNumber, item.game)}><Search size={14} /> Cardmarket</GhostLinkButton>
        <GhostLinkButton full href={ebaySearchUrl(item.name, item.cardNumber)}><Search size={14} /> eBay</GhostLinkButton>
      </div>

      {item.status === "listed" && item.listing && (
        <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(108,142,239,0.1)", border: `1px solid ${C.infoDim}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: C.info }}>In vendita</span>
            <button onClick={onEditListing} style={{ color: C.info }}><Edit2 size={13} /></button>
          </div>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Prezzo richiesto</span><span className="font-semibold">{euro(item.listing.price)}</span></div>
          {item.listing.platform && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Piattaforma</span><span>{item.listing.platform}</span></div>}
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Messa in vendita il</span><span>{fmtDate(item.listing.listedDate)}</span></div>
          {item.listing.link && (
            <a href={item.listing.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] mt-1.5" style={{ color: C.info }}>
              <ExternalLink size={13} /> Apri annuncio
            </a>
          )}
        </div>
      )}

      {item.status === "sold" && item.sale && isGroupSale && (
        <button onClick={onOpenGroup} className="w-full text-left p-3 rounded-xl mb-4" style={{ background: "rgba(63,179,155,0.1)", border: `1px solid ${C.tealDim}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: C.teal }}>Venduta in blocco</span>
            <ChevronRight size={14} color={C.teal} />
          </div>
          <div className="text-[13.5px]" style={{ color: C.text }}>
            Insieme ad altre {item.sale.groupSize - 1} {item.sale.groupSize - 1 === 1 ? "carta" : "carte"} per un totale di {euro(item.sale.groupTotal)}, il {fmtDate(item.sale.date)}.
          </div>
          <div className="text-[12px] mt-1" style={{ color: C.textDim }}>Tocca per vedere il dettaglio della vendita di gruppo.</div>
        </button>
      )}

      {item.status === "sold" && item.sale && !isGroupSale && (
        <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(63,179,155,0.1)", border: `1px solid ${C.tealDim}` }}>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Venduta il</span><span>{fmtDate(item.sale.date)}</span></div>
          <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Prezzo</span><span>{euro(item.sale.price)}</span></div>
          {item.sale.buyer && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>Acquirente</span><span>{item.sale.buyer}</span></div>}
          {(item.sale.carrier || item.sale.tracking) && (
            <div className="flex justify-between text-[13.5px] mb-1">
              <span style={{ color: C.textDim }}>Spedizione</span>
              <span className="text-right">{item.sale.carrier}{item.sale.carrier && item.sale.tracking && " · "}{item.sale.tracking}</span>
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

      {item.status === "sold" ? (
        <div className="flex gap-3">
          <GhostButton full onClick={onEdit}><Edit2 size={14} /> Modifica</GhostButton>
          <GhostButton full onClick={onCancelSale} style={{ color: C.crimson, borderColor: C.crimsonDim }}><RotateCcw size={14} /> {isGroupSale ? "Annulla vendita di gruppo" : "Annulla vendita"}</GhostButton>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-3">
            <GhostButton full onClick={onEdit}><Edit2 size={14} /> Modifica</GhostButton>
            {item.status === "listed" ? (
              <GhostButton full onClick={onUnlist} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Tag size={14} /> Rimuovi da vendita</GhostButton>
            ) : (
              <GhostButton full onClick={onList}><Megaphone size={14} /> Metti in vendita</GhostButton>
            )}
          </div>
          <PrimaryButton full onClick={onSell}><ShoppingBag size={16} /> {item.status === "listed" ? "Segna come venduta" : "Vendi"}</PrimaryButton>
        </>
      )}
    </Modal>
  );
}
