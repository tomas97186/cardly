import { RotateCcw } from "lucide-react";
import { C } from "../../lib/theme";
import { money, fmtDate } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import { Modal } from "../ui/Modal";
import { PhotoThumb } from "../ui/Photo";
import { GhostButton } from "../ui/Buttons";

// ---------- Detail modal for a group sale (several lot cards sold together for one total) ----------
export function GroupSaleDetail({ groupId, sale, members, onClose, onCancelGroupSale }) {
  const { t } = useLanguage();
  const allKnown = members.every((m) => m.cost != null);
  const totalCost = allKnown ? members.reduce((s, m) => s + m.cost, 0) : null;
  const margin = allKnown ? sale.groupTotal - totalCost : null;
  return (
    <Modal title={t("details.groupSaleModalTitle")} onClose={onClose} eyebrow={t("details.groupSaleEyebrow")} wide>
      <div className="p-3 rounded-xl mb-4" style={{ background: `${C.teal}1A`, border: `1px solid ${C.tealDim}` }}>
        <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.soldOn")}</span><span>{fmtDate(sale.date)}</span></div>
        <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.totalPrice")}</span><span className="font-semibold">{money(sale.groupTotal)}</span></div>
        {sale.buyer && <div className="flex justify-between text-[13.5px] mb-1"><span style={{ color: C.textDim }}>{t("details.buyer")}</span><span>{sale.buyer}</span></div>}
        {(sale.carrier || sale.tracking) && (
          <div className="flex justify-between text-[13.5px] mb-1">
            <span style={{ color: C.textDim }}>{t("details.shipping")}</span>
            <span className="text-right">{sale.carrier}{sale.carrier && sale.tracking && " · "}{sale.tracking}</span>
          </div>
        )}
        {sale.notes && <div className="text-[13px] pt-1" style={{ color: C.text }}>{sale.notes}</div>}
        <div className="flex justify-between text-[13.5px] font-bold pt-1 mt-1" style={{ borderTop: `1px solid ${C.tealDim}` }}>
          <span>{t("details.totalMargin")}</span>
          <span style={{ color: margin === null ? C.amber : margin >= 0 ? C.teal : C.crimson }}>
            {margin === null ? t("details.costUnknownForAll") : `${margin >= 0 ? "+" : ""}${money(margin)}`}
          </span>
        </div>
      </div>

      <h4 className="text-[12px] uppercase tracking-widest mb-2" style={{ color: C.textFaint }}>{t("details.cardsIncluded", { count: members.length })}</h4>
      <div className="space-y-2 mb-4">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: C.surfaceAlt }}>
            <PhotoThumb photoKey={m.photoKey} size={40} rounded="8px" iconSize={14} preferThumb />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{m.name || t("common.unnamedCard")}</div>
              <div className="text-[11px] truncate" style={{ color: C.textFaint }}>{m.sourceLabel}</div>
            </div>
            <span className="text-[12px] flex-shrink-0" style={{ color: m.cost != null ? C.textDim : C.amber }}>{m.cost != null ? t("details.costPrefixed", { cost: money(m.cost) }) : t("common.costNa")}</span>
          </div>
        ))}
      </div>

      <GhostButton full onClick={onCancelGroupSale} style={{ color: C.crimson, borderColor: C.crimsonDim }}><RotateCcw size={14} /> {t("details.cancelGroupSale")}</GhostButton>
    </Modal>
  );
}
