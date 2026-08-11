import { useState } from "react";
import { Plus } from "lucide-react";
import { C, CONDITION_OPTIONS, CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { todayISO, currentCurrencySymbol } from "../../lib/format";
import { Field } from "../ui/Field";
import { TextInput, Select, TextArea } from "../ui/Inputs";
import { PhotoPicker } from "../ui/Photo";
import { GradingFields } from "../ui/GradingFields";
import { BoxPicker } from "../ui/BoxPicker";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Add Purchase Form (top-level: single card OR lot container) ----------
export function AddPurchaseForm({ onCancel, onSubmit }) {
  const { games, gradingCompanies } = useCatalog();
  const { t } = useLanguage();
  const [purchaseType, setPurchaseType] = useState("singola");
  const [game, setGame] = useState(games[0]?.key || "altro");
  const [name, setName] = useState("");
  const [setName_, setSetName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [condition, setCondition] = useState("NM — Near Mint");
  const [category, setCategory] = useState("Carta Singola");
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0]);
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
  const [boxId, setBoxId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = purchaseType === "singola"
    ? name.trim() && price !== "" && !isNaN(parseFloat(price))
    : lotName.trim() && price !== "" && !isNaN(parseFloat(price)) && parseInt(quantity) > 0;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await onSubmit({
        purchaseType, game, name, setName: setName_, cardNumber, condition, category, language,
        gradingCompany: graded ? gradingCompany : null, grade: graded ? grade.trim() : null,
        lotName, quantity, price, purchaseDate, source, notes, photos, boxId,
      });
      if (result?.error) setError(result.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: C.surfaceAlt }}>
        {[["singola", t("forms.singleCard")], ["lotto", t("forms.lot")]].map(([val, label]) => (
          <button key={val} onClick={() => setPurchaseType(val)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: purchaseType === val ? C.gold : "transparent", color: purchaseType === val ? C.goldText : C.textDim }}>
            {label}
          </button>
        ))}
      </div>

      <Field label={t("common.gamePrevalent")}>
        <Select value={game} onChange={(e) => setGame(e.target.value)}>
          {games.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
        </Select>
      </Field>

      {purchaseType === "singola" ? (
        <>
          <Field label={t("forms.cardName")}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t("forms.cardNamePlaceholder")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("forms.setName")}><TextInput value={setName_} onChange={(e) => setSetName(e.target.value)} placeholder={t("forms.setNamePlaceholder")} /></Field>
            <Field label={t("forms.cardNumber")}><TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder={t("forms.cardNumberPlaceholder")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("forms.condition")}>
              <Select value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </Field>
            <Field label={t("forms.category")}>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </Field>
          </div>
          <Field label={t("forms.cardLanguage")}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}</Select>
          </Field>
          <GradingFields graded={graded} setGraded={setGraded} gradingCompany={gradingCompany} setGradingCompany={setGradingCompany} grade={grade} setGrade={setGrade} />
        </>
      ) : (
        <>
          <Field label={t("forms.lotName")}>
            <TextInput value={lotName} onChange={(e) => setLotName(e.target.value)} placeholder={t("forms.lotNamePlaceholder")} />
          </Field>
          <Field label={t("forms.lotQuantity")} hint={t("forms.lotQuantityHint")}>
            <TextInput type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={purchaseType === "singola" ? t("forms.pricePaid", { symbol: currentCurrencySymbol() }) : t("forms.lotTotalPrice", { symbol: currentCurrencySymbol() })}>
          <TextInput type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label={t("common.purchaseDate")}><TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
      </div>

      <Field label={t("common.source")}><TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("forms.sourcePlaceholder")} /></Field>
      <Field label={t("common.notes")}><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("forms.purchaseNotesPlaceholder")} /></Field>
      <Field label={purchaseType === "singola" ? t("common.photos") : t("forms.photosLot")}><PhotoPicker value={photos} onChange={setPhotos} /></Field>
      <BoxPicker value={boxId} onChange={setBoxId} />

      {error && (
        <div className="text-[13px] mb-4 px-3 py-2 rounded-lg" style={{ background: C.crimsonDim, color: C.text }}>
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? t("common.saving") : <><Plus size={16} /> {t("forms.addButton")}</>}</PrimaryButton>
      </div>
    </div>
  );
}
