import { SORT_OPTIONS } from "../../lib/sort";
import { useLanguage } from "../../context/LanguageContext";
import { Select } from "./Inputs";

export function SortSelect({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="relative">
      <Select value={value} onChange={(e) => onChange(e.target.value)} style={{ paddingRight: 30, fontSize: "13px" }}>
        {SORT_OPTIONS.map(([v, labelKey]) => <option key={v} value={v}>{t(labelKey)}</option>)}
      </Select>
    </div>
  );
}
