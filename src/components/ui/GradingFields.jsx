import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { C } from "../../lib/theme";
import { Field } from "./Field";
import { TextInput, Select } from "./Inputs";

// Shared "is this card graded" toggle + grading company/grade fields, used by every
// form that catalogs a single card (top-level or inside a lot).
export function GradingFields({ graded, setGraded, gradingCompany, setGradingCompany, grade, setGrade }) {
  const { gradingCompanies } = useCatalog();
  const { t } = useLanguage();
  return (
    <div className="mb-4">
      <label className="flex items-center gap-2" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={graded} onChange={(e) => setGraded(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.gold }} />
        <span className="text-[13px]" style={{ color: C.text }}>{t("gradingFields.graded")}</span>
      </label>
      {graded && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label={t("gradingFields.company")}>
            <Select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)}>
              {gradingCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t("gradingFields.grade")}><TextInput value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={t("gradingFields.gradePlaceholder")} /></Field>
        </div>
      )}
    </div>
  );
}
