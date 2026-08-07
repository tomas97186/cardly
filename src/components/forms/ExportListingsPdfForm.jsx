import { useState } from "react";
import { Check, FileDown } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { GhostButton, PrimaryButton } from "../ui/Buttons";

// ---------- Picks which game(s) to include before generating the PDF price list ----------
export function ExportListingsPdfForm({ gamesAvailable, onCancel, onSubmit }) {
  const { t } = useLanguage();
  const [gameKey, setGameKey] = useState("all");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    try { await onSubmit(gameKey); }
    finally { setGenerating(false); }
  }

  const options = [{ key: "all", label: t("pdfExport.allGames"), color: C.gold }, ...gamesAvailable];

  return (
    <div>
      <p className="text-[12.5px] mb-4" style={{ color: C.textDim }}>{t("pdfExport.description")}</p>
      <div className="flex flex-col gap-2 mb-5">
        {options.map((g) => (
          <button
            key={g.key} onClick={() => setGameKey(g.key)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium"
            style={{ background: gameKey === g.key ? C.surfaceAlt : "transparent", border: `1px solid ${gameKey === g.key ? g.color : C.border}`, color: gameKey === g.key ? g.color : C.text }}
          >
            {g.label}
            {gameKey === g.key && <Check size={15} color={g.color} />}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full disabled={generating} onClick={handleGenerate}>
          {generating ? t("pdfExport.generating") : <><FileDown size={16} /> {t("pdfExport.generateButton")}</>}
        </PrimaryButton>
      </div>
    </div>
  );
}
