import { useState } from "react";
import { Tag } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { todayISO, currentCurrencySymbol } from "../../lib/format";
import { Field } from "../ui/Field";
import { TextInput, TextArea } from "../ui/Inputs";
import { PhotoThumb } from "../ui/Photo";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Listing form (mark an item as "for sale" with asking price / platform / link) ----------
export function ListingForm({ item, initial, onCancel, onSubmit }) {
  const { platforms } = useCatalog();
  const { t } = useLanguage();
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [platform, setPlatform] = useState(initial ? initial.platform || "" : "");
  const [link, setLink] = useState(initial ? initial.link || "" : "");
  const [listedDate, setListedDate] = useState(initial ? initial.listedDate : todayISO());
  const [notes, setNotes] = useState(initial ? initial.notes || "" : "");
  const [saving, setSaving] = useState(false);

  const valid = price !== "" && !isNaN(parseFloat(price));

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({ price: parseFloat(price), platform, link: link.trim(), listedDate, notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
        <PhotoThumb photoKey={item.photoKey ?? item.photoKeys?.[0]} size={44} rounded="8px" iconSize={16} />
        <div className="text-sm font-medium">{item.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.askingPrice", { symbol: currentCurrencySymbol() })}><TextInput type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></Field>
        <Field label={t("forms.listedDate")}><TextInput type="date" value={listedDate} onChange={(e) => setListedDate(e.target.value)} /></Field>
      </div>
      <Field label={t("forms.platform")}>
        <TextInput value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder={t("forms.platformPlaceholder")} list="platform-options" />
        <datalist id="platform-options">{platforms.map((p) => <option key={p} value={p} />)}</datalist>
      </Field>
      <Field label={t("forms.listingLink")} hint={t("forms.listingLinkHint")}>
        <TextInput type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
      </Field>
      <Field label={t("common.notes")}><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("forms.listingNotesPlaceholder")} /></Field>
      <div className="flex gap-3 mt-2">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? t("common.saving") : <><Tag size={16} /> {initial ? t("forms.saveListing") : t("forms.putUpForSale")}</>}</PrimaryButton>
      </div>
    </div>
  );
}
