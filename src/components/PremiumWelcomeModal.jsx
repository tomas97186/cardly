import { PartyPopper, Loader2, Check } from "lucide-react";
import { C } from "../lib/theme";
import { useEntitlement } from "../context/EntitlementContext";
import { useLanguage } from "../context/LanguageContext";
import { Modal } from "./ui/Modal";
import { PrimaryButton } from "./ui/Buttons";

// Mostrata al ritorno da Stripe Checkout (vedi App.jsx, che intercetta
// ?checkout=success nell'URL). isPremium arriva da EntitlementContext, che lo
// aggiorna via realtime non appena il webhook scrive su profiles — il webhook
// gira in parallelo al redirect, quindi qui c'è quasi sempre un breve stato di
// attesa prima che isPremium diventi true.
export function PremiumWelcomeModal({ onClose }) {
  const { t } = useLanguage();
  const { isPremium } = useEntitlement();

  return (
    <Modal title={isPremium ? t("premiumWelcome.title") : t("premiumWelcome.pendingTitle")} onClose={onClose}>
      {isPremium ? (
        <>
          <div className="flex justify-center mb-4">
            <div style={{ width: 64, height: 64, borderRadius: 999, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PartyPopper size={30} color={C.gold} />
            </div>
          </div>
          <p className="text-[13.5px] text-center mb-4" style={{ color: C.textDim }}>{t("premiumWelcome.body")}</p>
          <ul className="space-y-2 mb-5">
            {[t("premiumWelcome.perkItems"), t("premiumWelcome.perkPhotos"), t("premiumWelcome.perkQuality"), t("premiumWelcome.perkBoxes")].map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-[13px]" style={{ color: C.text }}>
                <Check size={15} color={C.teal} /> {perk}
              </li>
            ))}
          </ul>
          <PrimaryButton full onClick={onClose}>{t("premiumWelcome.closeButton")}</PrimaryButton>
        </>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <Loader2 size={30} color={C.gold} className="animate-spin" />
          </div>
          <p className="text-[13.5px] text-center" style={{ color: C.textDim }}>{t("premiumWelcome.pendingBody")}</p>
        </>
      )}
    </Modal>
  );
}
