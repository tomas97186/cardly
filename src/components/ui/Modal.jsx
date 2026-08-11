import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { C } from "../../lib/theme";

// Portal diretto su <body>: l'overlay usa backdropFilter, che (come transform)
// crea un containing block per i discendenti position:fixed — un Modal aperto
// da dentro un altro Modal (es. il picker "Posizione" nei form di
// carta/lotto) resterebbe "intrappolato" dentro il primo invece di coprire
// davvero tutto lo schermo. Stesso motivo per cui Lightbox in Photo.jsx usa un
// portale.
export function Modal({ title, onClose, children, wide, eyebrow }) {
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(6,7,12,0.72)", backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, maxWidth: wide ? "560px" : "460px", overflowY: "auto", overflowX: "hidden", width: "100%" }}
        className="modal-sheet anim-slide-up rounded-t-[18px] sm:rounded-[18px] p-5 pb-8"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="text-[11px] uppercase tracking-widest mb-0.5 break-words" style={{ color: C.gold }}>{eyebrow}</div>}
            <h2 style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }} className="text-lg font-semibold break-words">{title}</h2>
          </div>
          <button onClick={onClose} style={{ color: C.textDim, flexShrink: 0 }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
