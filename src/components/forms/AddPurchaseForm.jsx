import { useState } from "react";
import { Plus } from "lucide-react";
import { C, CONDITION_OPTIONS, CATEGORY_OPTIONS } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { todayISO } from "../../lib/format";
import { Field } from "../ui/Field";
import { TextInput, Select, TextArea } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { GradingFields } from "../ui/GradingFields";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Add Purchase Form (top-level: single card OR lot container) ----------
export function AddPurchaseForm({ onCancel, onSubmit }) {
  const { games, GAME_META, gradingCompanies } = useCatalog();
  const [purchaseType, setPurchaseType] = useState("singola");
  const [game, setGame] = useState(games[0]?.key || "altro");
  const [name, setName] = useState("");
  const [setName_, setSetName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [condition, setCondition] = useState("NM — Near Mint");
  const [category, setCategory] = useState("Carta Singola");
  const [graded, setGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState(gradingCompanies[0] || "");
  const [grade, setGrade] = useState("");
  const [lotName, setLotName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  const valid = purchaseType === "singola"
    ? name.trim() && price !== "" && !isNaN(parseFloat(price))
    : lotName.trim() && price !== "" && !isNaN(parseFloat(price)) && parseInt(quantity) > 0;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        purchaseType, game, name, setName: setName_, cardNumber, condition, category,
        gradingCompany: graded ? gradingCompany : null, grade: graded ? grade.trim() : null,
        lotName, quantity, price, purchaseDate, source, notes, photos,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: C.surfaceAlt }}>
        {[["singola", "Carta singola"], ["lotto", "Lotto"]].map(([val, label]) => (
          <button key={val} onClick={() => setPurchaseType(val)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: purchaseType === val ? C.gold : "transparent", color: purchaseType === val ? "#181305" : C.textDim }}>
            {label}
          </button>
        ))}
      </div>

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

      {purchaseType === "singola" ? (
        <>
          <Field label="Nome carta *">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Charizard ex 199/197" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Set / Espansione"><TextInput value={setName_} onChange={(e) => setSetName(e.target.value)} placeholder="Es. Obsidian Flames" /></Field>
            <Field label="Numero carta"><TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Es. 125/165" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Condizione">
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </Field>
            <Field label="Categoria">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </Field>
          </div>
          <GradingFields graded={graded} setGraded={setGraded} gradingCompany={gradingCompany} setGradingCompany={setGradingCompany} grade={grade} setGrade={setGrade} />
        </>
      ) : (
        <>
          <Field label="Nome lotto *">
            <TextInput value={lotName} onChange={(e) => setLotName(e.target.value)} placeholder="Es. Lotto 5 carte rare eBay" />
          </Field>
          <Field label="Numero di carte nel lotto *" hint="Serve a tenere traccia di quante ne mancano da catalogare.">
            <TextInput type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={purchaseType === "singola" ? "Prezzo pagato (€) *" : "Prezzo totale lotto (€) *"}>
          <TextInput type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Data acquisto"><TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
      </div>

      <Field label="Venditore / Fonte"><TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="Es. Vinted, fiera, eBay, privato..." /></Field>
      <Field label="Note"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dettagli utili sull'acquisto..." /></Field>
      <Field label={purchaseType === "singola" ? "Foto" : "Foto del lotto"}><PhotoPicker value={photos} onChange={setPhotos} /></Field>

      <div className="flex gap-3 mt-2">
        <GhostButton full onClick={onCancel}>Annulla</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? "Salvataggio..." : <><Plus size={16} /> Aggiungi</>}</PrimaryButton>
      </div>
    </div>
  );
}
