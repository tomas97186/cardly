import { useState, useEffect } from "react";
import { Trash2, Check } from "lucide-react";
import { C, CONDITION_OPTIONS, CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { loadPhotoValues } from "../../lib/storage";
import { Field } from "../ui/Field";
import { TextInput, Select } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { GradingFields } from "../ui/GradingFields";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Add / Edit a single card inside a lot (cost optional) ----------
export function LotCardForm({ lot, initial, onCancel, onSubmit, onDelete }) {
  const { GAME_META, gradingCompanies } = useCatalog();
  const isEdit = !!initial;
  const [name, setName] = useState(initial ? initial.name : "");
  const [game, setGame] = useState(initial ? initial.game || lot.game : lot.game);
  const [setName_, setSetName] = useState(initial ? initial.setName || "" : "");
  const [cardNumber, setCardNumber] = useState(initial ? initial.cardNumber || "" : "");
  const [condition, setCondition] = useState(initial ? initial.condition || "Da valutare" : "Da valutare");
  const [category, setCategory] = useState(initial ? initial.category || "Carta Singola" : "Carta Singola");
  const [language, setLanguage] = useState(initial ? initial.language || LANGUAGE_OPTIONS[0] : LANGUAGE_OPTIONS[0]);
  const [graded, setGraded] = useState(!!(initial && initial.gradingCompany));
  const [gradingCompany, setGradingCompany] = useState((initial && initial.gradingCompany) || gradingCompanies[0] || "");
  const [grade, setGrade] = useState((initial && initial.grade) || "");
  const [assignedCost, setAssignedCost] = useState(initial && initial.assignedCost != null ? String(initial.assignedCost) : "");
  const [photos, setPhotos] = useState([]);
  const [photosLoaded, setPhotosLoaded] = useState(!isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (isEdit && initial.photoKeys && initial.photoKeys.length) loadPhotoValues(initial.photoKeys).then((v) => { if (active) { setPhotos(v); setPhotosLoaded(true); } });
    else setPhotosLoaded(true);
    return () => { active = false; };
  }, []);

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(), game, setName: setName_, cardNumber, condition, category, language,
        gradingCompany: graded ? gradingCompany : null, grade: graded ? grade.trim() : null,
        assignedCost: assignedCost.trim() === "" ? null : parseFloat(assignedCost), photos,
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
      <Field label="Nome carta" hint="Lascia vuoto se non l'hai ancora identificata.">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Nami OP01-004" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Set / Espansione"><TextInput value={setName_} onChange={(e) => setSetName(e.target.value)} /></Field>
        <Field label="Numero carta"><TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Condizione"><Select value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label="Categoria"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <Field label="Lingua"><Select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
      <GradingFields graded={graded} setGraded={setGraded} gradingCompany={gradingCompany} setGradingCompany={setGradingCompany} grade={grade} setGrade={setGrade} />
      <Field label="Prezzo attribuito (€)" hint="Facoltativo. Lascialo vuoto se non conosci ancora il valore di questa carta dentro il lotto.">
        <TextInput type="number" step="0.01" min="0" value={assignedCost} onChange={(e) => setAssignedCost(e.target.value)} placeholder="Non specificato" />
      </Field>
      <Field label="Foto">
        {photosLoaded ? <PhotoPicker value={photos} onChange={setPhotos} /> : <span className="text-[12px]" style={{ color: C.textFaint }}>Caricamento foto...</span>}
      </Field>
      <div className="flex gap-3 mt-2">
        {isEdit && <GhostButton onClick={onDelete} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Trash2 size={14} /> Elimina</GhostButton>}
        <PrimaryButton full disabled={saving} onClick={handleSubmit}>{saving ? "Salvataggio..." : <><Check size={16} /> {isEdit ? "Salva" : "Aggiungi carta"}</>}</PrimaryButton>
      </div>
      <button onClick={onCancel} className="w-full text-center text-[13px] mt-3" style={{ color: C.textDim }}>Annulla</button>
    </div>
  );
}
