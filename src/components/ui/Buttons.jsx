import { C } from "../../lib/theme";

export function PrimaryButton({ children, onClick, type = "button", full, style, disabled }) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? C.textFaint : C.gold, color: C.goldText, fontWeight: 700,
        border: "none", borderRadius: "10px", padding: "11px 18px", width: full ? "100%" : "auto",
        opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style,
      }}
      className="flex items-center justify-center gap-2 text-sm transition-transform active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
export function GhostButton({ children, onClick, style, full, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{ background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "11px 18px", width: full ? "100%" : "auto", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style }}
      className="flex items-center justify-center gap-2 text-sm transition-transform active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
export function GhostLinkButton({ children, href, style, full }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{ background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "11px 18px", width: full ? "100%" : "auto", textDecoration: "none", ...style }}
      className="flex items-center justify-center gap-2 text-sm transition-transform active:scale-[0.98]"
    >
      {children}
    </a>
  );
}
