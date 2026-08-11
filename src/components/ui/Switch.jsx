import { C } from "../../lib/theme";

export function Switch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 999, padding: 3,
        background: checked ? C.gold : C.surfaceAlt,
        border: `1px solid ${checked ? C.gold : C.border}`,
        display: "flex", alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0, cursor: "pointer", transition: "background 0.15s ease",
      }}
    >
      <span
        style={{
          width: 18, height: 18, borderRadius: 999,
          background: checked ? C.goldText : C.textFaint,
          display: "block",
        }}
      />
    </button>
  );
}
