import { X } from "lucide-react";
import { C } from "../../lib/theme";

export function Modal({ title, onClose, children, wide, eyebrow }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(6,7,12,0.72)", backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "18px 18px 0 0", maxHeight: "92vh", overflowY: "auto", width: "100%", maxWidth: wide ? "560px" : "460px" }}
        className="sm:rounded-2xl p-5 pb-8"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {eyebrow && <div className="text-[11px] uppercase tracking-widest mb-0.5" style={{ color: C.gold }}>{eyebrow}</div>}
            <h2 style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }} className="text-lg font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} style={{ color: C.textDim }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
