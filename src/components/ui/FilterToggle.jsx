import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";

// Collapsible filter toggle: keeps filter/sort controls out of sight until requested,
// with a badge showing how many are currently active.
export function FilterToggle({ open, onToggle, activeCount, label }) {
  const { t } = useLanguage();
  const resolvedLabel = label ?? t("common.filters");
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium flex-shrink-0"
      style={{ background: activeCount > 0 ? C.gold : C.surfaceAlt, color: activeCount > 0 ? C.goldText : C.textDim }}
    >
      <SlidersHorizontal size={13} />
      {resolvedLabel}
      {activeCount > 0 && (
        <span style={{ background: C.goldText, color: C.gold, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "1px 6px", lineHeight: "14px" }}>{activeCount}</span>
      )}
      <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
    </button>
  );
}
