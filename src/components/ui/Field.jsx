import { C } from "../../lib/theme";

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-[11px] uppercase tracking-widest mb-1.5" style={{ color: C.textDim }}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] mt-1" style={{ color: C.textFaint }}>{hint}</span>}
    </label>
  );
}
