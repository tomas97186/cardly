import { useState, useEffect } from "react";
import { Plus, ScanLine, ChevronRight } from "lucide-react";
import { C } from "../../lib/theme";
import { useEntitlement } from "../../context/EntitlementContext";
import { useLanguage } from "../../context/LanguageContext";
import { loadBoxes, upsertBox, loadBoxByCode } from "../../lib/storage";
import { generateBoxCode, parseBoxQrPayload } from "../../lib/boxQr";
import { uid } from "../../lib/format";
import { Field } from "./Field";
import { TextInput, inputStyle } from "./Inputs";
import { GhostButton } from "./Buttons";
import { Modal } from "./Modal";
import { QrScannerModal } from "./QrScannerModal";

function boxDisplayName(b) {
  return b.label ? `${b.label} (${b.code})` : b.code;
}

// Nasconde se stesso per il piano Free — stesso pattern di PhotoPicker con
// useEntitlement() interno, invece di far controllare isPremium ad ognuno dei
// form che lo usano. A differenza di una <Select> semplice, tocca il campo per
// aprire un picker che cerca, crea al volo, o scansiona il QR di una scatola.
export function BoxPicker({ value, onChange }) {
  const { isPremium } = useEntitlement();
  const { t } = useLanguage();
  const [boxes, setBoxes] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { if (isPremium) loadBoxes().then(setBoxes); }, [isPremium]);

  if (!isPremium) return null;

  const selected = (boxes || []).find((b) => b.id === value);

  return (
    <>
      <Field label={t("boxes.fieldLabel")}>
        <button
          type="button" onClick={() => setOpen(true)}
          style={{ ...inputStyle, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ color: selected ? C.text : C.textFaint }}>{selected ? boxDisplayName(selected) : t("boxes.none")}</span>
          <ChevronRight size={14} color={C.textFaint} />
        </button>
      </Field>
      {open && (
        <BoxPickerModal
          boxes={boxes}
          onSelect={(box) => { onChange(box ? box.id : null); setOpen(false); }}
          onBoxCreated={(box) => setBoxes((prev) => [...(prev || []), box])}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function BoxPickerModal({ boxes, onSelect, onBoxCreated, onClose }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = (boxes || []).filter((b) => !q || (b.label || "").toLowerCase().includes(q) || b.code.toLowerCase().includes(q));
  const hasExactMatch = (boxes || []).some((b) => (b.label || "").toLowerCase() === q || b.code.toLowerCase() === q);

  async function handleCreate() {
    if (creating || !query.trim() || hasExactMatch) return;
    setCreating(true);
    setError("");
    const box = { id: uid(), code: generateBoxCode(), label: query.trim() };
    const { error } = await upsertBox(box);
    setCreating(false);
    if (error) { setError(t("boxes.createError")); return; }
    onBoxCreated(box);
    onSelect(box);
  }

  async function handleScanned(text) {
    setScanning(false);
    const code = parseBoxQrPayload(text);
    const box = code ? (boxes || []).find((b) => b.code === code) || (await loadBoxByCode(code)) : null;
    if (!box) { setError(t("boxes.scanNotFound")); return; }
    setError("");
    onSelect(box);
  }

  return (
    <Modal title={t("boxes.fieldLabel")} onClose={onClose}>
      <div className="flex gap-2 mb-3">
        <TextInput
          autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("boxes.searchOrCreatePlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <GhostButton onClick={() => setScanning(true)} style={{ padding: "10px 14px" }}><ScanLine size={16} /></GhostButton>
      </div>

      {error && (
        <div className="text-[13px] mb-3 px-3 py-2 rounded-lg" style={{ background: C.crimsonDim, color: C.text }}>{error}</div>
      )}

      <div className="space-y-2 max-h-[45vh] overflow-y-auto">
        <button onClick={() => onSelect(null)} className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px]" style={{ background: C.surfaceAlt, color: C.textDim }}>
          {t("boxes.none")}
        </button>
        {filtered.map((b) => (
          <button key={b.id} onClick={() => onSelect(b)} className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium truncate" style={{ background: C.surfaceAlt }}>
            {boxDisplayName(b)}
          </button>
        ))}
      </div>

      {query.trim() && !hasExactMatch && (
        <GhostButton full onClick={handleCreate} disabled={creating} style={{ marginTop: 12 }}>
          <Plus size={14} /> {creating ? t("common.saving") : t("boxes.createWithName", { name: query.trim() })}
        </GhostButton>
      )}

      {scanning && <QrScannerModal onScan={handleScanned} onClose={() => setScanning(false)} />}
    </Modal>
  );
}
