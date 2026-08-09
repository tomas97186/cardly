import { useState } from "react";
import { AlertCircle, Tag, ShoppingBag } from "lucide-react";
import { C } from "../../lib/theme";
import { money, todayISO, currentCurrencySymbol } from "../../lib/format";
import { useLanguage } from "../../context/LanguageContext";
import { Field } from "../ui/Field";
import { TextInput, TextArea } from "../ui/Inputs";
import { PhotoThumb } from "../ui/Photo";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Sale form (works for both single items and lot cards; cost may be unknown) ----------
export function SaleForm({ item, onCancel, onSubmit }) {
  const { t } = useLanguage();
  const [salePrice, setSalePrice] = useState(item.listing ? String(item.listing.price) : "");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [buyer, setBuyer] = useState(item.listing ? item.listing.platform || "" : "");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const costKnown = item.unitCost != null;
  const margin = costKnown && salePrice !== "" && !isNaN(parseFloat(salePrice)) ? parseFloat(salePrice) - item.unitCost : null;
  const valid = salePrice !== "" && !isNaN(parseFloat(salePrice));

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({ price: parseFloat(salePrice), date: saleDate, buyer, carrier, tracking, notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
        <PhotoThumb photoKey={item.photoKey ?? item.photoKeys?.[0]} size={44} rounded="8px" iconSize={16} />
        <div>
          <div className="text-sm font-medium">{item.name}</div>
          <div className="text-[12px]" style={{ color: costKnown ? C.textDim : C.amber }}>
            {costKnown ? t("forms.costLabel", { cost: money(item.unitCost) }) : t("forms.costUnspecified")}
          </div>
        </div>
      </div>

      {item.listing && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg mb-4" style={{ background: `${C.info}1F` }}>
          <Tag size={14} color={C.info} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: C.info }}>
            {t("forms.wasListedNotice", { platform: item.listing.platform || t("forms.aPlatform"), price: money(item.listing.price) })}
          </span>
        </div>
      )}

      {!costKnown && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg mb-4" style={{ background: `${C.amber}1F` }}>
          <AlertCircle size={15} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: C.amber }}>
            {t("forms.noCostNotice")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.salePrice", { symbol: currentCurrencySymbol() })}><TextInput type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" /></Field>
        <Field label={t("forms.saleDate")}><TextInput type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></Field>
      </div>
      <Field label={t("forms.buyerPlatform")}><TextInput value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder={t("forms.buyerPlatformPlaceholder")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.carrier")}>
          <TextInput value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={t("forms.carrierPlaceholder")} list="carrier-options" />
          <datalist id="carrier-options">
            <option value="Poste Italiane" /><option value="BRT" /><option value="GLS" /><option value="DHL" /><option value="UPS" /><option value="SDA" /><option value="InPost" />
          </datalist>
        </Field>
        <Field label={t("forms.trackingNumber")}><TextInput value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder={t("forms.trackingPlaceholder")} /></Field>
      </div>
      <Field label={t("common.notes")}><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("forms.shippingNotesPlaceholder")} /></Field>

      {margin !== null && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-4" style={{ background: margin >= 0 ? `${C.teal}1F` : `${C.crimson}1F` }}>
          <span className="text-[13px]" style={{ color: C.textDim }}>{t("forms.marginOnSale")}</span>
          <span className="text-sm font-bold" style={{ color: margin >= 0 ? C.teal : C.crimson }}>{margin >= 0 ? "+" : ""}{money(margin)}</span>
        </div>
      )}

      <div className="flex gap-3">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? t("common.saving") : <><ShoppingBag size={16} /> {t("forms.registerSale")}</>}</PrimaryButton>
      </div>
    </div>
  );
}
