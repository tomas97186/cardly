import { useState, useEffect } from "react";
import { Trash2, Check } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { loadPhotoValues } from "../../lib/storage";
import { currentCurrencySymbol } from "../../lib/format";
import { Field } from "../ui/Field";
import { TextInput, Select, TextArea } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { BoxPicker } from "../ui/BoxPicker";
import { GhostButton, PrimaryButton } from "../ui/Buttons";
import { ConfirmDialog } from "../ui/ConfirmDialog";

// ---------- Edit lot (container) form ----------
export function EditLotForm({ lot, onCancel, onSubmit, onDelete }) {
  const { games } = useCatalog();
  const { t } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lotName, setLotName] = useState(lot.lotName);
  const [game, setGame] = useState(lot.game);
  const [totalCost, setTotalCost] = useState(String(lot.totalCost));
  const [quantity, setQuantity] = useState(String(lot.quantity));
  const [purchaseDate, setPurchaseDate] = useState(lot.purchaseDate);
  const [source, setSource] = useState(lot.source || "");
  const [notes, setNotes] = useState(lot.purchaseNotes || "");
  const [photos, setPhotos] = useState([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [boxId, setBoxId] = useState(lot.boxId || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    // Load once on mount only — see EditItemForm for why re-running this on every
    // `lot` reference change would clobber unsaved edits mid-session.
    if (lot.photoKeys && lot.photoKeys.length) loadPhotoValues(lot.photoKeys).then((v) => { if (active) { setPhotos(v); setPhotosLoaded(true); } });
    else setPhotosLoaded(true);
    return () => { active = false; };
  }, []);

  const valid = lotName.trim() && totalCost !== "" && !isNaN(parseFloat(totalCost)) && parseInt(quantity) > 0;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({ lotName, game, totalCost: parseFloat(totalCost), quantity: parseInt(quantity), purchaseDate, source, purchaseNotes: notes, photos, boxId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Field label={t("forms.lotName")}><TextInput value={lotName} onChange={(e) => setLotName(e.target.value)} /></Field>
      <Field label={t("common.gamePrevalent")}>
        <Select value={game} onChange={(e) => setGame(e.target.value)}>
          {games.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.lotTotalPrice2", { symbol: currentCurrencySymbol() })}><TextInput type="number" step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} /></Field>
        <Field label={t("forms.lotQuantity")}><TextInput type="number" min={lot.cards.length || 1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
      </div>
      <Field label={t("common.purchaseDate")}><TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
      <Field label={t("common.source")}><TextInput value={source} onChange={(e) => setSource(e.target.value)} /></Field>
      <Field label={t("common.notes")}><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label={t("forms.photosLot")}>
        {photosLoaded ? <PhotoPicker value={photos} onChange={setPhotos} /> : <span className="text-[12px]" style={{ color: C.textFaint }}>{t("common.loadingPhotos")}</span>}
      </Field>
      <BoxPicker value={boxId} onChange={setBoxId} />
      <div className="flex gap-3 mt-2">
        <GhostButton onClick={() => setConfirmDelete(true)} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Trash2 size={14} /> {t("forms.deleteLot")}</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? t("common.saving") : <><Check size={16} /> {t("common.save")}</>}</PrimaryButton>
      </div>
      <button onClick={onCancel} className="w-full text-center text-[13px] mt-3" style={{ color: C.textDim }}>{t("common.cancel")}</button>

      {confirmDelete && (
        <ConfirmDialog
          title={t("common.deleteConfirmTitle")}
          message={t("forms.deleteLotConfirmMessage")}
          confirmLabel={t("forms.deleteLot")}
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
