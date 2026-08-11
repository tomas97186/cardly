import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { searchGlobal, assignItemsToBox } from "../../lib/storage";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/Inputs";
import { PhotoThumb } from "../ui/Photo";
import { PrimaryButton } from "../ui/Buttons";

// ---------- "Aggiungi carta esistente" da dentro una scatola: cerca solo tra le
// carte non ancora assegnate a nessuna scatola (searchGlobal + filtro client su
// boxId), selezione multipla, poi assignItemsToBox in blocco. ----------
export function AssignExistingCardModal({ box, onClose, onAssigned }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const rows = await searchGlobal(query.trim(), 30);
      if (!cancelled) setResults(rows.filter((r) => r.type !== "lot" && !r.boxId));
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query]);

  const selectedKeys = new Set(selected.map((s) => `${s.type}-${s.id}`));

  function toggle(r) {
    const key = `${r.type}-${r.id}`;
    setSelected((prev) => (selectedKeys.has(key) ? prev.filter((s) => `${s.type}-${s.id}` !== key) : [...prev, { type: r.type, id: r.id, name: r.name }]));
  }

  async function handleConfirm() {
    if (!selected.length || saving) return;
    setSaving(true);
    setError("");
    const err = await assignItemsToBox(box.id, selected);
    setSaving(false);
    if (err) { setError(t("boxes.assignError")); return; }
    onAssigned();
  }

  return (
    <Modal title={t("boxes.addExisting")} eyebrow={box.label || box.code} onClose={onClose}>
      <TextInput autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("app.searchEverywhere")} />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {selected.map((s) => (
            <span key={`${s.type}-${s.id}`} className="text-[11.5px] px-2.5 py-1 rounded-full" style={{ background: C.surfaceAlt, color: C.gold }}>{s.name}</span>
          ))}
        </div>
      )}

      <div className="space-y-2 mt-3 max-h-[45vh] overflow-y-auto">
        {results.length === 0 && query.trim() && (
          <p className="text-[12.5px] text-center py-4" style={{ color: C.textFaint }}>{t("boxes.assignNoResults")}</p>
        )}
        {results.map((r) => {
          const key = `${r.type}-${r.id}`;
          const isSelected = selectedKeys.has(key);
          return (
            <button
              key={key} onClick={() => toggle(r)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
              style={{ background: C.surfaceAlt, border: `1px solid ${isSelected ? C.gold : "transparent"}` }}
            >
              <PhotoThumb photoKey={r.photoKeys?.[0]} size={36} rounded="8px" iconSize={13} preferThumb />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{r.name}</div>
                {r.subName && <div className="text-[11px] truncate" style={{ color: C.textFaint }}>{r.subName}</div>}
              </div>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${isSelected ? C.gold : C.border}`, background: isSelected ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {isSelected && <Check size={13} color={C.goldText} />}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="text-[13px] mt-3 px-3 py-2 rounded-lg" style={{ background: C.crimsonDim, color: C.text }}>{error}</div>
      )}

      <PrimaryButton full disabled={!selected.length || saving} onClick={handleConfirm} style={{ marginTop: 16 }}>
        {saving ? t("common.saving") : t("boxes.assignConfirm", { count: selected.length })}
      </PrimaryButton>
    </Modal>
  );
}
