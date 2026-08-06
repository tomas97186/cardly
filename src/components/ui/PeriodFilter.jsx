import { C } from "../../lib/theme";
import { PERIOD_OPTIONS } from "../../lib/period";
import { Field } from "./Field";
import { TextInput } from "./Inputs";

export function PeriodFilter({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }) {
  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriod(val)}
            className="px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap flex items-center gap-1.5"
            style={{ background: period === val ? C.gold : C.surfaceAlt, color: period === val ? "#181305" : C.textDim }}
          >
            {label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Dal"><TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field>
          <Field label="Al"><TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field>
        </div>
      )}
    </div>
  );
}
