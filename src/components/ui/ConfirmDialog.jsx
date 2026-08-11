import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { Modal } from "./Modal";
import { GhostButton, PrimaryButton } from "./Buttons";

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  const { t } = useLanguage();
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-[13.5px] mb-5 leading-relaxed" style={{ color: C.textDim }}>{message}</p>
      <div className="flex gap-3">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full onClick={onConfirm} style={{ background: C.crimson, color: "#fff" }}>{confirmLabel}</PrimaryButton>
      </div>
    </Modal>
  );
}
