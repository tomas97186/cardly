import { useState } from "react";
import { AlertCircle, Tag, ShoppingBag } from "lucide-react";
import { C } from "../../lib/theme";
import { euro, todayISO } from "../../lib/format";
import { Field } from "../ui/Field";
import { TextInput, TextArea } from "../ui/Inputs";
import { PhotoThumb } from "../ui/Photo";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Sale form (works for both single items and lot cards; cost may be unknown) ----------
export function SaleForm({ item, onCancel, onSubmit }) {
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
            {costKnown ? `Costo: ${euro(item.unitCost)}` : "Costo non specificato"}
          </div>
        </div>
      </div>

      {item.listing && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg mb-4" style={{ background: "rgba(108,142,239,0.12)" }}>
          <Tag size={14} color={C.info} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: C.info }}>
            Era in vendita su {item.listing.platform || "una piattaforma"} a {euro(item.listing.price)}. Prezzo e piattaforma sono già precompilati, modificali se la vendita è avvenuta a condizioni diverse.
          </span>
        </div>
      )}

      {!costKnown && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg mb-4" style={{ background: "rgba(201,138,58,0.12)" }}>
          <AlertCircle size={15} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: C.amber }}>
            A questa carta non hai assegnato un costo. Potrai registrare comunque la vendita, ma il margine non
            verrà calcolato automaticamente.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prezzo di vendita (€) *"><TextInput type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" /></Field>
        <Field label="Data vendita"><TextInput type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></Field>
      </div>
      <Field label="Acquirente / Piattaforma"><TextInput value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Es. Vinted, eBay, fiera, nome cliente..." /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Corriere">
          <TextInput value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Es. Poste, BRT, GLS..." list="carrier-options" />
          <datalist id="carrier-options">
            <option value="Poste Italiane" /><option value="BRT" /><option value="GLS" /><option value="DHL" /><option value="UPS" /><option value="SDA" /><option value="InPost" />
          </datalist>
        </Field>
        <Field label="Numero di tracciamento"><TextInput value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Es. 1Z999AA1..." /></Field>
      </div>
      <Field label="Note"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Spese di spedizione, commissioni..." /></Field>

      {margin !== null && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-4" style={{ background: margin >= 0 ? "rgba(63,179,155,0.12)" : "rgba(204,91,76,0.12)" }}>
          <span className="text-[13px]" style={{ color: C.textDim }}>Margine su questa vendita</span>
          <span className="text-sm font-bold" style={{ color: margin >= 0 ? C.teal : C.crimson }}>{margin >= 0 ? "+" : ""}{euro(margin)}</span>
        </div>
      )}

      <div className="flex gap-3">
        <GhostButton full onClick={onCancel}>Annulla</GhostButton>
        <PrimaryButton full disabled={!valid || saving} onClick={handleSubmit}>{saving ? "Salvataggio..." : <><ShoppingBag size={16} /> Registra vendita</>}</PrimaryButton>
      </div>
    </div>
  );
}
