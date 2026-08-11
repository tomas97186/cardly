import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, QrCode, Printer, Trash2, Edit2, Plus, Search } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { loadBoxContents, deleteBoxRecord, upsertBox } from "../../lib/storage";
import { Modal } from "../ui/Modal";
import { GhostButton } from "../ui/Buttons";
import { TextInput } from "../ui/Inputs";
import { PhotoThumb } from "../ui/Photo";
import { ItemCard } from "../ui/ItemCard";
import { BoxQrImage } from "../ui/BoxQrImage";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { AssignExistingCardModal } from "../forms/AssignExistingCardModal";

const QR_SIZES = { small: 140, medium: 220, large: 320 };

// ---------- Pagina di drill-down (non un modale) per il contenuto di una
// scatola — stesso pattern di navigazione dei sotto-pannelli di Impostazioni:
// bottone indietro + contenuto a piena pagina. Rinomina/elimina, QR/stampa,
// ricerca al suo interno, e "aggiungi carta esistente" restano popup mirati
// (quelli sì transitori, non vere pagine). ----------
export function BoxDetailPage({ box, onBack, onRenamed, onDeleted, onOpenItem, onOpenLot, onOpenLotCard }) {
  const { t } = useLanguage();
  const [contents, setContents] = useState(null);
  const [search, setSearch] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [qrSize, setQrSize] = useState("medium");
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState(box.label || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const refresh = () => loadBoxContents(box.id).then(setContents);
  useEffect(() => { refresh(); }, [box.id]);

  // Carte singole e lotti nella stessa griglia con ItemCard, identica a quella
  // di Inventario (siamo un tab a fianco) — le carte dentro un lotto invece
  // usano la riga compatta della lista carte di un lotto (LotDetail), dato che
  // ItemCard non rappresenta quel caso.
  const q = search.trim().toLowerCase();
  const itemsAndLots = contents
    ? [...contents.items, ...contents.lots].filter((it) => {
        const name = it.kind === "lotto" ? it.lotName : it.name;
        return !q || name.toLowerCase().includes(q) || (it.setName || "").toLowerCase().includes(q);
      })
    : [];
  const lotCards = contents
    ? contents.lotCards.filter((c) => !q || (c.name || "").toLowerCase().includes(q) || (c.lotName || "").toLowerCase().includes(q))
    : [];
  const isEmpty = itemsAndLots.length === 0 && lotCards.length === 0;

  async function handleRename() {
    const label = labelDraft.trim();
    await upsertBox({ id: box.id, code: box.code, label });
    setRenaming(false);
    onRenamed({ ...box, label });
  }

  async function handleDelete() {
    await deleteBoxRecord(box.id);
    onDeleted();
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 mb-3 text-[12.5px]" style={{ color: C.textDim }}>
        <ChevronLeft size={15} /> {t("boxes.boxesTab")}
      </button>

      {renaming ? (
        <div className="flex gap-2 mb-1">
          <TextInput autoFocus value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()} />
          <GhostButton onClick={handleRename}>{t("common.save")}</GhostButton>
        </div>
      ) : (
        <button onClick={() => setRenaming(true)} className="flex items-center gap-2 mb-1 text-left">
          <h3 style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }} className="text-lg font-semibold">{box.label || box.code}</h3>
          <Edit2 size={14} color={C.textFaint} />
        </button>
      )}
      <div className="text-[12px] mb-4" style={{ color: C.textFaint }}>{t("boxes.codeLabel")}: {box.code}</div>

      <div className="flex gap-3 mb-4">
        <GhostButton full onClick={() => setShowQr(true)}><QrCode size={14} /> {t("boxes.showQr")}</GhostButton>
        <GhostButton full onClick={() => setConfirmDelete(true)} style={{ color: C.crimson, borderColor: C.crimsonDim }}><Trash2 size={14} /> {t("common.delete")}</GhostButton>
      </div>

      <GhostButton full onClick={() => setShowAssign(true)} style={{ marginBottom: 16 }}>
        <Plus size={14} /> {t("boxes.addExisting")}
      </GhostButton>

      <div className="relative mb-3">
        <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("boxes.searchInBoxPlaceholder")} style={{ paddingLeft: 36 }} />
      </div>

      {contents === null ? (
        <p className="text-[12.5px]" style={{ color: C.textFaint }}>{t("common.loading")}</p>
      ) : isEmpty ? (
        <p className="text-[12.5px]" style={{ color: C.textFaint }}>{t("boxes.contentsEmpty")}</p>
      ) : (
        <>
          {itemsAndLots.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
              {itemsAndLots.map((it) => (
                <ItemCard key={it.id} item={it} onClick={() => (it.kind === "lotto" ? onOpenLot(it.id) : onOpenItem(it.id))} />
              ))}
            </div>
          )}
          {lotCards.length > 0 && (
            <div className="space-y-2">
              {lotCards.map((c) => (
                <button key={c.id} onClick={() => onOpenLotCard(c.lotId, c.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left" style={{ background: C.surfaceAlt }}>
                  <PhotoThumb photoKey={c.photoKeys?.[0]} size={40} rounded="8px" iconSize={14} preferThumb />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{c.name || t("common.unnamedCard")}</div>
                    <div className="text-[11px] truncate" style={{ color: C.textFaint }}>{c.lotName}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showQr && (
        <>
          <Modal title={box.label || box.code} onClose={() => setShowQr(false)}>
            <div className="flex flex-col items-center">
              <BoxQrImage code={box.code} size={QR_SIZES[qrSize]} />
              <div className="text-sm font-semibold mt-3">{box.label || box.code}</div>
              <div className="text-[12px] mt-0.5" style={{ color: C.textFaint }}>{t("boxes.codeLabel")}: {box.code}</div>
            </div>
            <div className="mt-4">
              <div className="text-[12px] mb-1.5" style={{ color: C.textFaint }}>{t("boxes.qrSizeLabel")}</div>
              <div className="flex gap-2">
                {Object.keys(QR_SIZES).map((s) => (
                  <button key={s} onClick={() => setQrSize(s)} className="flex-1 px-3 py-1.5 rounded-full text-[12.5px] font-medium"
                    style={{ background: qrSize === s ? C.gold : C.surfaceAlt, color: qrSize === s ? C.goldText : C.textDim }}>
                    {t(`boxes.qrSize${s[0].toUpperCase()}${s.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
            <GhostButton full onClick={() => window.print()} style={{ marginTop: 16 }}>
              <Printer size={14} /> {t("boxes.print")}
            </GhostButton>
          </Modal>
          {/* Portale indipendente, non annidato nel Modal: quel contenuto ha un
              transform residuo dall'animazione di apertura, che intrappolerebbe
              il position:fixed usato dal CSS di stampa (vedi @media print in
              App.jsx) tagliando il QR ai limiti del modale invece che alla
              pagina. */}
          {createPortal(
            <div id="box-qr-print" className="hidden print:flex flex-col items-center">
              <BoxQrImage code={box.code} size={QR_SIZES[qrSize]} />
              <div className="text-sm font-semibold mt-3">{box.label || box.code}</div>
              <div className="text-[12px] mt-0.5" style={{ color: C.textFaint }}>{t("boxes.codeLabel")}: {box.code}</div>
            </div>,
            document.body
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("common.deleteConfirmTitle")}
          message={t("boxes.deleteConfirmMessage")}
          confirmLabel={t("common.delete")}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {showAssign && (
        <AssignExistingCardModal
          box={box}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); refresh(); }}
        />
      )}
    </div>
  );
}
