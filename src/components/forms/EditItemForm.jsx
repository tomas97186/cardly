import { useState, useEffect } from "react";
import { Trash2, Check } from "lucide-react";
import { C, CONDITION_OPTIONS, CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { loadPhotoValues } from "../../lib/storage";
import { Field } from "../ui/Field";
import { TextInput, Select, TextArea } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { GradingFields } from "../ui/GradingFields";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Edit single-card item form ----------
export function EditItemForm({ item, onCancel, onSubmit, onDelete }) {
  const { games, gradingCompanies } = useCatalog();
  const { t } = useLanguage();
  const [game, setGame] = useState(item.game);
  const [name, setName] = useState(item.name);
  const [setName_, setSetName] = useState(item.setName || "");
  const [cardNumber, setCardNumber] = useState(item.cardNumber || "");
  const [condition, setCondition] = useState(item.condition);
  const [category, setCategory] = useState(item.category);
  const [language, setLanguage] = useState(item.language || LANGUAGE_OPTIONS[0]);
  const [graded, setGraded] = useState(!!item.gradingCompany);
  const [gradingCompany, setGradingCompany] = useState(item.gradingCompany || gradingCompanies[0] || "");
  const [grade, setGrade] = useState(item.grade || "");
  const [unitCost, setUnitCost] = useState(item.unitCost != null ? String(item.unitCost) : "");
  const [purchaseDate, setPurchaseDate] = useState(item.purchaseDate);
  const [source, setSource] = useState(item.source || "");
  const [notes, setNotes] = useState(item.purchaseNotes || "");
  const [photos, setPhotos] = useState([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    // Intentionally load once on mount only: this seeds the local draft from the
    // saved photos, but afterwards the draft is the source of truth until submit —
    // re-running this if `item` happens to get a new reference from a background
    // reload would silently overwrite unsaved additions/removals mid-edit.
    if (item.photoKeys && item.photoKeys.length) loadPhotoValues(item.photoKeys).then((v) => { if (active) { setPhotos(v); setPhotosLoaded(true); } });
    else setPhotosLoaded(true);
    return () => { active = false; };
  }, []);

  const valid = name.trim() && (unitCost.trim() === "" || !isNaN(parseFloat(unitCost)));

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        game, name, setName: setName_, cardNumber, condition, category, language,
        gradingCompany: graded ? gradingCompany : null, grade: graded ? grade.trim() : null,
        unitCost: unitCost.trim() === "" ? null : parseFloat(unitCost), purchaseDate, source, purchaseNotes: notes, photos,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Field label={t("common.game")}>
        <Select value={game} onChange={(e) => setGame(e.target.value)}>
          {games.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
        </Select>
      </Field>
      <Field label={t("forms.cardName")}><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.setName")}><TextInput value={setName_} onChange={(e) => setSetName(e.target.value)} /></Field>
        <Field label={t("forms.cardNumber")}><TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.condition")}><Select value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label={t("forms.category")}><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <Field label={t("forms.cardLanguage")}><Select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
      <GradingFields graded={graded} setGraded={setGraded} gradingCompany={gradingCompany} setGradingCompany={setGradingCompany} grade={grade} setGrade={setGrade} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.cost")} hint={t("forms.costHint")}><TextInput type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder={t("common.notSpecified")} /></Field>
        <Field label={t("common.purchaseDate")}><TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
      </div>
      <Field label={t("common.source")}><TextInput value={source} onChange={(e) => setSource(e.target.value)} /></Field>
      <Field label={t("common.notes")}><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label={t("common.photos")}>
        {photosLoaded ? <PhotoPicker value={photos} onChange={setPhotos} /> : <span className="text-[12px]" style={{ color: C.textFaint }}>{t("common.loadingPhotos")}</span>}
      </Field>
      <div className="flex gap-3 mt-2">
        <GhostButton onClick={onDelete} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Trash2 size={14} /> {t("common.delete")}</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? t("common.saving") : <><Check size={16} /> {t("common.save")}</>}</PrimaryButton>
      </div>
      <button onClick={onCancel} className="w-full text-center text-[13px] mt-3" style={{ color: C.textDim }}>{t("common.cancel")}</button>
    </div>
  );
}
