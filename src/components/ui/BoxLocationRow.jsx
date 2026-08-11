import { useState, useEffect } from "react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { loadBoxById } from "../../lib/storage";

// Sola lettura: mostra dove si trova fisicamente la carta se una scatola è
// assegnata, anche per un utente tornato Free (i dati passati restano
// consultabili, solo la creazione/assegnazione di nuove scatole è bloccata —
// vedi supabase/boxes.sql).
export function BoxLocationRow({ boxId }) {
  const { t } = useLanguage();
  const [box, setBox] = useState(null);

  useEffect(() => {
    setBox(null);
    if (boxId) loadBoxById(boxId).then(setBox);
  }, [boxId]);

  if (!boxId || !box) return null;

  return (
    <div className="flex justify-between">
      <span>{t("boxes.fieldLabel")}</span>
      <span style={{ color: C.text }}>{box.label ? `${box.label} (${box.code})` : box.code}</span>
    </div>
  );
}
