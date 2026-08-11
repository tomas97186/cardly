import { useState, useEffect } from "react";
import { Search, Box as BoxIcon } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { loadBoxes } from "../../lib/storage";
import { TextInput } from "../ui/Inputs";
import { BoxDetailPage } from "../details/BoxDetailPage";

// ---------- Secondo tab di Inventario (solo Premium) — griglia di scatole;
// aprirne una sostituisce la griglia con BoxDetailPage (drill-down, non un
// modale sopra). ----------
export function BoxesSection({ dataVersion, onOpenItem, onOpenLot, onOpenLotCard }) {
  const { t } = useLanguage();
  const [boxes, setBoxes] = useState(null);
  const [search, setSearch] = useState("");
  const [openBox, setOpenBox] = useState(null);

  useEffect(() => { loadBoxes().then(setBoxes); }, [dataVersion]);

  function handleRenamed(updated) {
    setOpenBox(updated);
    setBoxes((prev) => (prev || []).map((b) => (b.id === updated.id ? updated : b)));
  }
  function handleDeleted(id) {
    setOpenBox(null);
    setBoxes((prev) => (prev || []).filter((b) => b.id !== id));
  }

  if (openBox) {
    return (
      <BoxDetailPage
        box={openBox}
        onBack={() => setOpenBox(null)}
        onRenamed={handleRenamed}
        onDeleted={() => handleDeleted(openBox.id)}
        onOpenItem={onOpenItem}
        onOpenLot={onOpenLot}
        onOpenLotCard={onOpenLotCard}
      />
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = (boxes || []).filter((b) => !q || (b.label || "").toLowerCase().includes(q) || b.code.toLowerCase().includes(q));

  return (
    <div>
      <div className="sticky top-0 z-10 pb-3" style={{ background: C.bg }}>
        <div className="relative">
          <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("boxes.searchPlaceholder")} style={{ paddingLeft: 36 }} />
        </div>
      </div>

      {boxes === null ? (
        <div className="text-center py-16 text-sm" style={{ color: C.textFaint }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: C.textFaint }}>
          {boxes.length === 0 ? t("boxes.emptyNone") : t("boxes.emptyNoResults")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <button key={b.id} onClick={() => setOpenBox(b)} className="p-4 rounded-2xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <BoxIcon size={20} color={C.gold} />
              <div className="text-[13.5px] font-medium mt-2 truncate">{b.label || b.code}</div>
              <div className="text-[11px] mt-0.5" style={{ color: C.textFaint }}>{b.code}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
