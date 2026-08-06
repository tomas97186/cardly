import { SORT_OPTIONS } from "../../lib/sort";
import { Select } from "./Inputs";

export function SortSelect({ value, onChange }) {
  return (
    <div className="relative">
      <Select value={value} onChange={(e) => onChange(e.target.value)} style={{ paddingRight: 30, fontSize: "13px" }}>
        {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </div>
  );
}
