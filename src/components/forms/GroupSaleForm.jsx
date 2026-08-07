import { useState } from "react";
import { AlertCircle, ShoppingBag } from "lucide-react";
import { C } from "../../lib/theme";
import { euro, todayISO } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import { Field } from "../ui/Field";
import { TextInput, TextArea } from "../ui/Inputs";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Group sale form: sell several cards from the same lot together for one total price ----------
export function GroupSaleForm({ cards, onCancel, onSubmit, onBack }) {
  const { t } = useLanguage();
  const [totalPrice, setTotalPrice] = useState("");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [buyer, setBuyer] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const allCostsKnown = cards.every((c) => c.cost != null);
  const totalCost = allCostsKnown ? cards.reduce((s, c) => s + c.cost, 0) : null;
  const margin = allCostsKnown && totalPrice !== "" && !isNaN(parseFloat(totalPrice)) ? parseFloat(totalPrice) - totalCost : null;
  const valid = totalPrice !== "" && !isNaN(parseFloat(totalPrice)) && cards.length > 0;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({ price: parseFloat(totalPrice), date: saleDate, buyer, carrier, tracking, notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
        <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: C.textFaint }}>{t("forms.cardsSelected", { count: cards.length })}</div>
        <div className="space-y-1.5">
          {cards.map((c) => (
            <div key={c.key || c.id} className="flex items-center justify-between text-[13px] gap-2">
              <span className="truncate">{c.name || t("common.unnamedCard")}</span>
              {c.sub && <span className="truncate text-[11px] flex-shrink-0" style={{ color: C.textFaint }}>{c.sub}</span>}
              <span className="flex-shrink-0" style={{ color: c.cost != null ? C.textDim : C.amber }}>{c.cost != null ? euro(c.cost) : t("common.costNa")}</span>
            </div>
          ))}
        </div>
      </div>

      {!allCostsKnown && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg mb-4" style={{ background: "rgba(201,138,58,0.12)" }}>
          <AlertCircle size={15} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: C.amber }}>
            {t("forms.someCostsMissingNotice")}
          </span>
        </div>
      )}

      <Field label={t("forms.totalSalePrice")} hint={t("forms.totalSalePriceHint")}>
        <TextInput type="number" step="0.01" min="0" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="0.00" />
      </Field>
      <Field label={t("forms.saleDate")}><TextInput type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></Field>
      <Field label={t("forms.buyerPlatform")}><TextInput value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder={t("forms.buyerPlatformPlaceholder")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.carrier")}>
          <TextInput value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={t("forms.carrierPlaceholder")} list="carrier-options-group" />
          <datalist id="carrier-options-group">
            <option value="Poste Italiane" /><option value="BRT" /><option value="GLS" /><option value="DHL" /><option value="UPS" /><option value="SDA" /><option value="InPost" />
          </datalist>
        </Field>
        <Field label={t("forms.trackingNumber")}><TextInput value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder={t("forms.trackingPlaceholder")} /></Field>
      </div>
      <Field label={t("common.notes")}><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("forms.shippingNotesPlaceholder")} /></Field>

      {margin !== null && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-4" style={{ background: margin >= 0 ? "rgba(63,179,155,0.12)" : "rgba(204,91,76,0.12)" }}>
          <span className="text-[13px]" style={{ color: C.textDim }}>{t("forms.totalMarginOnSale")}</span>
          <span className="text-sm font-bold" style={{ color: margin >= 0 ? C.teal : C.crimson }}>{margin >= 0 ? "+" : ""}{euro(margin)}</span>
        </div>
      )}

      <div className="flex gap-3">
        <GhostButton full onClick={onBack || onCancel}>{onBack ? t("common.back") : t("common.cancel")}</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? t("common.saving") : <><ShoppingBag size={16} /> {t("forms.registerSale")}</>}</PrimaryButton>
      </div>
    </div>
  );
}
