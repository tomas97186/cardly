import { useState, useEffect } from "react";
import { Trash2, Check } from "lucide-react";
import { C, CONDITION_OPTIONS, CATEGORY_OPTIONS } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { loadPhotoValues } from "../../lib/storage";
import { Field } from "../ui/Field";
import { TextInput, Select, TextArea } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { GradingFields } from "../ui/GradingFields";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Edit single-card item form ----------
export function EditItemForm({ item, onCancel, onSubmit, onDelete }) {
  const { GAME_META, gradingCompanies } = useCatalog();
  const [game, setGame] = useState(item.game);
  const [name, setName] = useState(item.name);
  const [setName_, setSetName] = useState(item.setName || "");
  const [cardNumber, setCardNumber] = useState(item.cardNumber || "");
  const [condition, setCondition] = useState(item.condition);
  const [category, setCategory] = useState(item.category);
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
        game, name, setName: setName_, cardNumber, condition, category,
        gradingCompany: graded ? gradingCompany : null, grade: graded ? grade.trim() : null,
        unitCost: unitCost.trim() === "" ? null : parseFloat(unitCost), purchaseDate, source, purchaseNotes: notes, photos,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Field label="Gioco">
        <div className="flex gap-2">
          {Object.entries(GAME_META).map(([key, meta]) => (
            <button key={key} onClick={() => setGame(key)} className="flex-1 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: game === key ? meta.color : C.border, background: game === key ? meta.bg : "transparent", color: game === key ? meta.color : C.textDim }}>
              {meta.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Nome carta *"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Set / Espansione"><TextInput value={setName_} onChange={(e) => setSetName(e.target.value)} /></Field>
        <Field label="Numero carta"><TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Condizione"><Select value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label="Categoria"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <GradingFields graded={graded} setGraded={setGraded} gradingCompany={gradingCompany} setGradingCompany={setGradingCompany} grade={grade} setGrade={setGrade} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Costo (€)" hint="Facoltativo, lascialo vuoto se non lo conosci."><TextInput type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Non specificato" /></Field>
        <Field label="Data acquisto"><TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
      </div>
      <Field label="Venditore / Fonte"><TextInput value={source} onChange={(e) => setSource(e.target.value)} /></Field>
      <Field label="Note"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label="Foto">
        {photosLoaded ? <PhotoPicker value={photos} onChange={setPhotos} /> : <span className="text-[12px]" style={{ color: C.textFaint }}>Caricamento foto...</span>}
      </Field>
      <div className="flex gap-3 mt-2">
        <GhostButton onClick={onDelete} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Trash2 size={14} /> Elimina</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? "Salvataggio..." : <><Check size={16} /> Salva</>}</PrimaryButton>
      </div>
      <button onClick={onCancel} className="w-full text-center text-[13px] mt-3" style={{ color: C.textDim }}>Annulla</button>
    </div>
  );
}
