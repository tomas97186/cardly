import { useState, useEffect } from "react";
import { Trash2, Check } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { loadPhotoValues } from "../../lib/storage";
import { Field } from "../ui/Field";
import { TextInput, TextArea } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Edit lot (container) form ----------
export function EditLotForm({ lot, onCancel, onSubmit, onDelete }) {
  const { GAME_META } = useCatalog();
  const [lotName, setLotName] = useState(lot.lotName);
  const [game, setGame] = useState(lot.game);
  const [totalCost, setTotalCost] = useState(String(lot.totalCost));
  const [quantity, setQuantity] = useState(String(lot.quantity));
  const [purchaseDate, setPurchaseDate] = useState(lot.purchaseDate);
  const [source, setSource] = useState(lot.source || "");
  const [notes, setNotes] = useState(lot.purchaseNotes || "");
  const [photos, setPhotos] = useState([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
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
      await onSubmit({ lotName, game, totalCost: parseFloat(totalCost), quantity: parseInt(quantity), purchaseDate, source, purchaseNotes: notes, photos });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Field label="Nome lotto *"><TextInput value={lotName} onChange={(e) => setLotName(e.target.value)} /></Field>
      <Field label="Gioco (prevalente)">
        <div className="flex gap-2">
          {Object.entries(GAME_META).map(([key, meta]) => (
            <button key={key} onClick={() => setGame(key)} className="flex-1 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: game === key ? meta.color : C.border, background: game === key ? meta.bg : "transparent", color: game === key ? meta.color : C.textDim }}>
              {meta.label}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prezzo totale (€) *"><TextInput type="number" step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} /></Field>
        <Field label="Numero carte nel lotto *"><TextInput type="number" min={lot.cards.length || 1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
      </div>
      <Field label="Data acquisto"><TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
      <Field label="Venditore / Fonte"><TextInput value={source} onChange={(e) => setSource(e.target.value)} /></Field>
      <Field label="Note"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label="Foto del lotto">
        {photosLoaded ? <PhotoPicker value={photos} onChange={setPhotos} /> : <span className="text-[12px]" style={{ color: C.textFaint }}>Caricamento foto...</span>}
      </Field>
      <div className="flex gap-3 mt-2">
        <GhostButton onClick={onDelete} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Trash2 size={14} /> Elimina lotto</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? "Salvataggio..." : <><Check size={16} /> Salva</>}</PrimaryButton>
      </div>
      <button onClick={onCancel} className="w-full text-center text-[13px] mt-3" style={{ color: C.textDim }}>Annulla</button>
    </div>
  );
}
