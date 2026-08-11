import { useState } from "react";
import { Plus } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { Field } from "../ui/Field";
import { TextInput } from "../ui/Inputs";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Creazione rapida di una scatola dal FAB, quando si è sul tab
// Scatole di Inventario. ----------
export function NewBoxForm({ onCancel, onSubmit }) {
  const { t } = useLanguage();
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    setError("");
    const result = await onSubmit(label.trim());
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div>
      <Field label={t("boxes.fieldLabel")} hint={t("boxes.newBoxHint")}>
        <TextInput autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("boxes.newBoxPlaceholder")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
      </Field>
      {error && <p className="text-[12px] mb-3" style={{ color: C.crimson }}>{error}</p>}
      <div className="flex gap-3 mt-2">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full onClick={handleSubmit} disabled={saving}>
          {saving ? t("common.saving") : <><Plus size={16} /> {t("common.add")}</>}
        </PrimaryButton>
      </div>
    </div>
  );
}
