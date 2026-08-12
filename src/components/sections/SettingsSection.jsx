import { useState, useEffect } from "react";
import {
  LogOut, KeyRound, ShieldCheck, ShieldAlert, Package, Clock, Gamepad2, Tag, Plus, X, FileText,
  ChevronRight, ChevronLeft, Award, Info, AlertTriangle, Scale, FileCheck, Code2, Mail, Languages, Check,
  SunMedium, Moon, Coins, Crown, Cog, Search, Layers, Images, Sparkles, Box as BoxIcon,
} from "lucide-react";
import { C } from "../../lib/theme";
import { fmtDate, formatAmount, CURRENCY_OPTIONS } from "../../lib/format";
import { SUPPORT_EMAIL, FREE_TIER_ITEM_LIMIT, FREE_TIER_PHOTO_LIMIT, PREMIUM_PHOTO_LIMIT, FREE_PHOTO_RESIZE, PREMIUM_PHOTO_RESIZE, PHOTO_DOWNGRADE_GRACE_DAYS } from "../../lib/appConfig";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useEntitlement } from "../../context/EntitlementContext";
import { useEbayMarket } from "../../context/EbayMarketContext";
import { loadInventoryCount, loadCataloguedCardCount } from "../../lib/storage";
import { startCheckout, openBillingPortal, loadPlanPrices } from "../../lib/stripe";
import { EBAY_MARKET_OPTIONS } from "../../lib/marketSearch";
import { Modal } from "../ui/Modal";
import { GhostButton, PrimaryButton } from "../ui/Buttons";
import { Field } from "../ui/Field";
import { TextInput } from "../ui/Inputs";
import { Badge } from "../ui/Badge";
import { Switch } from "../ui/Switch";

const APP_VERSION = "1.0.0";

// ---------- Home of this tab is the Account itself (profile, plan, logout) —
// everything else (catalog, language, theme, export, about) lives one tap away
// behind a single "Impostazioni" entry, since it's set-and-forget stuff people
// reach far less often than their own account. ----------
export function SettingsSection({ auth, catalog, onExportCSV }) {
  const { t, lang } = useLanguage();
  const { currency } = useCurrency();
  const { isPremium } = useEntitlement();
  const [panel, setPanel] = useState(null); // null (account, home) | "more" | "catalog" | "data" | "language" | "about" | "plan"

  if (panel === "plan") {
    return (
      <SettingsPanel title={t("settings.planTitle")} backLabel={t("settings.account")} onBack={() => setPanel(null)}>
        <PlanUsageAndCompare />
      </SettingsPanel>
    );
  }
  if (panel === "more") {
    return (
      <SettingsPanel title={t("settings.title")} backLabel={t("settings.account")} onBack={() => setPanel(null)}>
        <div className="space-y-2">
          <SettingsMenuItem icon={Gamepad2} title={t("settings.catalog")} subtitle={t("settings.catalogSubtitle", { games: catalog.games.length, platforms: catalog.platforms.length, grading: catalog.gradingCompanies.length })} onClick={() => setPanel("catalog")} />
          <SettingsMenuItem icon={Languages} title={t("settings.languageAndCurrency")} subtitle={`${lang === "en" ? t("settings.langEnglish") : t("settings.langItalian")} · ${currency}`} onClick={() => setPanel("language")} />
          <ThemeMenuItem />
          <SettingsMenuItem icon={FileText} title={t("settings.csvExport")} subtitle={t("settings.csvExportSubtitle")} onClick={() => setPanel("data")} />
          <SettingsMenuItem icon={Info} title={t("settings.about")} subtitle={t("settings.aboutSubtitle")} onClick={() => setPanel("about")} />
        </div>
      </SettingsPanel>
    );
  }
  if (panel === "catalog") {
    return (
      <SettingsPanel title={t("settings.catalog")} onBack={() => setPanel("more")}>
        <GamesEditor catalog={catalog} />
        <PlatformsEditor catalog={catalog} />
        <GradingCompaniesEditor catalog={catalog} />
      </SettingsPanel>
    );
  }
  if (panel === "data") {
    return (
      <SettingsPanel title={t("settings.csvExport")} onBack={() => setPanel("more")}>
        <CSVPanel onExportCSV={onExportCSV} />
      </SettingsPanel>
    );
  }
  if (panel === "language") {
    return (
      <SettingsPanel title={t("settings.languageAndCurrency")} onBack={() => setPanel("more")}>
        <LanguagePanel />
        <CurrencyPanel />
        <EbayMarketPanel />
      </SettingsPanel>
    );
  }
  if (panel === "about") {
    return (
      <SettingsPanel title={t("settings.about")} onBack={() => setPanel("more")}>
        <AboutPanel />
      </SettingsPanel>
    );
  }

  return (
    <div className="space-y-3">
      <AccountPanel auth={auth} onOpenSettings={() => setPanel("more")} onOpenPlan={() => setPanel("plan")} />
    </div>
  );
}

function SettingsMenuItem({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={C.gold} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{subtitle}</div>
      </div>
      <ChevronRight size={16} color={C.textFaint} />
    </button>
  );
}

function SettingsPanel({ title, onBack, backLabel, children }) {
  const { t } = useLanguage();
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 mb-3 text-[12.5px]" style={{ color: C.textDim }}>
        <ChevronLeft size={15} /> {backLabel || t("settings.title")}
      </button>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LanguagePanel() {
  const { t, lang, setLang } = useLanguage();
  const options = [["it", t("settings.langItalian")], ["en", t("settings.langEnglish")]];
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Languages size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.language")}</span>
      </div>
      <div className="space-y-2">
        {options.map(([val, label]) => (
          <button
            key={val} onClick={() => setLang(val)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px]"
            style={{ background: lang === val ? C.surfaceAlt : "transparent", border: `1px solid ${lang === val ? C.gold : C.border}`, color: lang === val ? C.gold : C.text }}
          >
            {label}
            {lang === val && <Check size={15} color={C.gold} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemeMenuItem() {
  const { t } = useLanguage();
  const { mode, setMode } = useTheme();
  const isDark = mode === "dark";
  return (
    <div className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isDark ? <Moon size={17} color={C.gold} /> : <SunMedium size={17} color={C.gold} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium">{t("settings.theme")}</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{isDark ? t("settings.themeDark") : t("settings.themeLight")}</div>
      </div>
      <Switch checked={isDark} onChange={(next) => setMode(next ? "dark" : "light")} ariaLabel={t("settings.theme")} />
    </div>
  );
}

function CurrencyPanel() {
  const { t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Coins size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.currency")}</span>
      </div>
      <div className="space-y-2">
        {CURRENCY_OPTIONS.map((c) => (
          <button
            key={c.code} onClick={() => setCurrency(c.code)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px]"
            style={{ background: currency === c.code ? C.surfaceAlt : "transparent", border: `1px solid ${currency === c.code ? C.gold : C.border}`, color: currency === c.code ? C.gold : C.text }}
          >
            <span className="flex-1 text-left">{c.code} · {c.symbol}</span>
            {currency === c.code && <Check size={15} color={C.gold} />}
          </button>
        ))}
      </div>
    </div>
  );
}

const EBAY_MARKET_LABEL_KEYS = { it: "settings.ebayMarketIt", com: "settings.ebayMarketCom", de: "settings.ebayMarketDe", "co.uk": "settings.ebayMarketCoUk", fr: "settings.ebayMarketFr", es: "settings.ebayMarketEs" };

function EbayMarketPanel() {
  const { t } = useLanguage();
  const { ebayMarket, setEbayMarket } = useEbayMarket();
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Search size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.ebayMarket")}</span>
      </div>
      <div className="space-y-2">
        {EBAY_MARKET_OPTIONS.map((m) => (
          <button
            key={m.code} onClick={() => setEbayMarket(m.code)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px]"
            style={{ background: ebayMarket === m.code ? C.surfaceAlt : "transparent", border: `1px solid ${ebayMarket === m.code ? C.gold : C.border}`, color: ebayMarket === m.code ? C.gold : C.text }}
          >
            <span className="flex-1 text-left">{t(EBAY_MARKET_LABEL_KEYS[m.code])} · {m.domain}</span>
            {ebayMarket === m.code && <Check size={15} color={C.gold} />}
          </button>
        ))}
      </div>
    </div>
  );
}


function PlanUsageAndCompare() {
  const { t } = useLanguage();
  const { isPremium, premiumSource } = useEntitlement();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [billingInterval, setBillingInterval] = useState("monthly"); // "monthly" | "annual"
  const [prices, setPrices] = useState(null); // { monthly, annual } | null finché in caricamento

  useEffect(() => { if (!isPremium) loadPlanPrices().then(setPrices); }, [isPremium]);

  const monthly = prices?.monthly;
  const annual = prices?.annual;
  const monthlyDisplay = monthly ? formatAmount(monthly.amount / 100, monthly.currency.toUpperCase()) : null;
  const annualDisplay = annual ? formatAmount(annual.amount / 100, annual.currency.toUpperCase()) : null;
  // Quanto costerebbe l'annuale se pagato a rate mensili equivalenti, confrontato
  // col prezzo mensile reale — mostrato solo se è un vero risparmio.
  const savingsPct = monthly && annual && monthly.amount > 0
    ? Math.round((1 - (annual.amount / 12) / monthly.amount) * 100)
    : null;

  async function handleUpgrade() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await startCheckout(billingInterval);
    } catch (e) {
      setError(t("settings.upgradeError"));
      setBusy(false);
    }
  }

  async function handleManageSubscription() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await openBillingPortal();
    } catch (e) {
      setError(t("settings.upgradeError"));
      setBusy(false);
    }
  }

  return (
    <>
      {isPremium && (
        <div className="p-4 rounded-2xl text-center" style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}55` }}>
          <div className="mx-auto mb-2 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 999, background: `${C.gold}24` }}>
            <Crown size={20} color={C.gold} />
          </div>
          <div className="text-sm font-semibold">{t("settings.planPremiumActiveTitle")}</div>
          <p className="text-[12.5px] mt-1" style={{ color: C.textDim }}>{t("settings.planPremiumActiveBody")}</p>
        </div>
      )}

      <PremiumPerksGrid />

      {!isPremium && (
        <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-sm font-semibold mb-3">{t("settings.planPricingTitle")}</div>
          <div className="grid grid-cols-2 gap-2">
            <PriceOption
              label={t("settings.planPricingMonthly")}
              price={monthlyDisplay}
              suffix={t("settings.planPricingPerMonth")}
              selected={billingInterval === "monthly"}
              onClick={() => setBillingInterval("monthly")}
            />
            <PriceOption
              label={t("settings.planPricingAnnual")}
              price={annualDisplay}
              suffix={t("settings.planPricingPerYear")}
              selected={billingInterval === "annual"}
              onClick={() => setBillingInterval("annual")}
              badge={savingsPct > 0 ? t("settings.planSavingsBadge", { pct: savingsPct }) : null}
            />
          </div>

          <div className="flex items-start gap-2 mt-3 p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
            <Tag size={14} color={C.textFaint} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div className="text-[12.5px] font-medium">{t("settings.planDiscountTitle")}</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{t("settings.planDiscountBody")}</div>
            </div>
          </div>

          <PrimaryButton
            full style={{ marginTop: 16 }}
            disabled={busy || (billingInterval === "monthly" ? !monthly : !annual)}
            onClick={handleUpgrade}
          >
            <Crown size={14} /> {busy ? t("settings.redirecting") : t("settings.confirmPlanButton")}
          </PrimaryButton>

          <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: C.textFaint }}>
            {t("settings.planAutoRenewNotice")}
          </p>
        </div>
      )}

      {isPremium && premiumSource === "stripe" && (
        <>
          <GhostButton full disabled={busy} onClick={handleManageSubscription}>
            {busy ? t("settings.redirecting") : t("settings.cancelOrModifyPlanButton")}
          </GhostButton>
          <p className="text-[11px] text-center leading-relaxed" style={{ color: C.textFaint }}>
            {t("settings.manageSubscriptionHint")}
          </p>
        </>
      )}

      {error && (
        <div className="text-[13px] px-3 py-2 rounded-lg" style={{ background: C.crimsonDim, color: C.text }}>
          {error}
        </div>
      )}
    </>
  );
}

function PremiumPerksGrid() {
  const { t } = useLanguage();
  const perks = [
    { icon: Layers, title: t("settings.planPerkItemsTitle"), body: t("settings.planPerkItemsBody") },
    { icon: Images, title: t("settings.planPerkPhotosTitle"), body: t("settings.planPerkPhotosBody", { limit: PREMIUM_PHOTO_LIMIT }) },
    { icon: Sparkles, title: t("settings.planPerkQualityTitle"), body: t("settings.planPerkQualityBody", { maxDim: PREMIUM_PHOTO_RESIZE.maxDim }) },
    { icon: BoxIcon, title: t("settings.planPerkBoxesTitle"), body: t("settings.planPerkBoxesBody") },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {perks.map(({ icon: Icon, title, body }) => (
        <div key={title} className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.gold}1F` }} className="flex items-center justify-center mb-2.5">
            <Icon size={16} color={C.gold} />
          </div>
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="text-[11.5px] mt-1 leading-relaxed" style={{ color: C.textFaint }}>{body}</div>
        </div>
      ))}
    </div>
  );
}

function PriceOption({ label, price, suffix, selected, onClick, badge }) {
  const available = !!price;
  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      className="p-3 rounded-xl text-left"
      style={{
        background: selected && available ? `${C.gold}14` : C.surfaceAlt,
        border: `1.5px solid ${selected && available ? C.gold : C.border}`,
        opacity: available ? 1 : 0.6, cursor: available ? "pointer" : "default",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: selected && available ? C.gold : C.textDim }}>{label}</span>
        {selected && available && <Check size={14} color={C.gold} />}
      </div>
      {available ? (
        <div className="text-lg font-bold mt-1">{price}<span className="text-[11px] font-normal" style={{ color: C.textFaint }}> {suffix}</span></div>
      ) : (
        <div className="text-[12px] mt-1" style={{ color: C.textFaint }}>…</div>
      )}
      {badge && available && (
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: `${C.teal}24`, color: C.teal }}>{badge}</span>
      )}
    </button>
  );
}

function PlanFeatureRow({ label, free, premium }) {
  return (
    <div className="grid items-center py-2.5 text-[12.5px]" style={{ gridTemplateColumns: "1fr 64px 74px", borderTop: `1px solid ${C.border}` }}>
      <span style={{ color: C.textDim }}>{label}</span>
      <span className="text-center" style={{ color: C.textFaint }}>{free}</span>
      <span className="text-center font-semibold" style={{ color: C.gold }}>{premium}</span>
    </div>
  );
}

// Tabella di confronto Free/Premium riga per riga — sostituita nella pagina
// "Piano e abbonamento" da PremiumPerksGrid (più immediata), ma tenuta qui
// inutilizzata invece che rimossa: potrebbe tornare utile come widget altrove.
function PlanComparisonTable() {
  const { t } = useLanguage();
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="text-sm font-semibold mb-3">{t("settings.planCompareTitle")}</div>
      <div className="grid items-center pb-2" style={{ gridTemplateColumns: "1fr 64px 74px" }}>
        <span />
        <span className="text-center text-[10.5px] uppercase tracking-wide" style={{ color: C.textFaint }}>{t("settings.planFree")}</span>
        <span className="text-center text-[10.5px] uppercase tracking-wide" style={{ color: C.gold }}>{t("settings.planPremium")}</span>
      </div>
      <PlanFeatureRow
        label={t("settings.planFeatureItemLimit")}
        free={t("settings.planFeatureItemLimitFree", { limit: FREE_TIER_ITEM_LIMIT })}
        premium={t("settings.planFeatureItemLimitPremium")}
      />
      <PlanFeatureRow
        label={t("settings.planFeaturePhotos") + ' *'}
        free={t("settings.planFeaturePhotosFree", { limit: FREE_TIER_PHOTO_LIMIT })}
        premium={t("settings.planFeaturePhotosPremium", { limit: PREMIUM_PHOTO_LIMIT })}
      />
      <PlanFeatureRow
        label={t("settings.planFeaturePhotoQuality")}
        free={t("settings.planFeaturePhotoQualityFree", { maxDim: FREE_PHOTO_RESIZE.maxDim })}
        premium={t("settings.planFeaturePhotoQualityPremium", { maxDim: PREMIUM_PHOTO_RESIZE.maxDim })}
      />
      <PlanFeatureRow
        label={t("boxes.planFeature")}
        free={t("boxes.planFeatureFree")}
        premium={t("boxes.planFeaturePremium")}
      />
      <p className="text-[11.5px] mt-3 leading-relaxed" style={{ color: C.textFaint }}>
        * {t("settings.planPhotoGraceNote", { days: PHOTO_DOWNGRADE_GRACE_DAYS, limit: FREE_TIER_PHOTO_LIMIT })}
      </p>
    </div>
  );
}

function AccountPanel({ auth, onOpenSettings, onOpenPlan }) {
  const { t } = useLanguage();
  const { isPremium, premiumSource } = useEntitlement();
  const [busy, setBusy] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [itemCount, setItemCount] = useState(null);
  const [cataloguedCount, setCataloguedCount] = useState(null);
  useEffect(() => { loadInventoryCount().then(setItemCount); }, []);
  useEffect(() => { if (!isPremium) loadCataloguedCardCount().then(setCataloguedCount); }, [isPremium]);

  async function handleSignOut() {
    setBusy(true);
    try { await auth.signOut(); } finally { setBusy(false); }
  }

  const email = auth.user?.email || "";
  const initial = email.charAt(0).toUpperCase() || "?";
  const emailVerified = !!auth.user?.email_confirmed_at;
  const memberSince = auth.user?.created_at ? fmtDate(auth.user.created_at) : null;
  const lastSignIn = auth.user?.last_sign_in_at ? fmtDate(auth.user.last_sign_in_at) : null;
  const usagePct = cataloguedCount == null ? 0 : Math.min(100, (cataloguedCount / FREE_TIER_ITEM_LIMIT) * 100);
  const usageBarColor = usagePct >= 100 ? C.crimson : usagePct >= 80 ? C.amber : C.teal;

  return (
    <>
      <div className="p-5 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3 mb-1">
          <div style={{ width: 50, height: 50, borderRadius: 999, background: C.surfaceAlt, border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="text-lg font-bold" style={{ color: C.gold }}>{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{email}</div>
            {memberSince && <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{t("settings.memberSince", { date: memberSince })}</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {emailVerified ? (
            <Badge color={C.teal} bg={`${C.teal}24`}><ShieldCheck size={11} style={{ marginRight: 3, marginTop: -1 }} />{t("settings.emailVerified")}</Badge>
          ) : (
            <Badge color={C.amber} bg={`${C.amber}24`}><ShieldAlert size={11} style={{ marginRight: 3, marginTop: -1 }} />{t("settings.emailUnverified")}</Badge>
          )}
          {isPremium ? (
            <Badge color={C.gold} bg={`${C.gold}24`}><Crown size={11} style={{ marginRight: 3, marginTop: -1 }} />{t("settings.planPremium")}</Badge>
          ) : (
            <Badge color={C.textDim} bg={C.surfaceAlt}>{t("settings.planFree")}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase" style={{ color: C.textFaint }}><Package size={11} /> {t("settings.inInventory")}</div>
            <div className="text-base font-bold mt-1" style={{ color: C.gold }}>{itemCount ?? "—"}</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase" style={{ color: C.textFaint }}><Clock size={11} /> {t("settings.lastSignIn")}</div>
            <div className="text-[12.5px] font-semibold mt-1.5">{lastSignIn || "—"}</div>
          </div>
        </div>
      </div>

      {!isPremium && (
        <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between text-[12px] mb-1.5" style={{ color: C.textDim }}>
            <span>{t("settings.planUsageLabel")}</span>
            <span style={{ color: usageBarColor, fontWeight: 600 }}>
              {cataloguedCount == null ? "…" : t("settings.planUsageCount", { count: cataloguedCount, limit: FREE_TIER_ITEM_LIMIT })}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: C.surfaceAlt, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${usagePct}%`, background: usageBarColor, borderRadius: 999, transition: "width 0.2s ease" }} />
          </div>
          {usagePct >= 100 && (
            <p className="text-[12px] mt-2" style={{ color: C.crimson }}>{t("settings.planUsageFull")}</p>
          )}
        </div>
      )}

      {!isPremium && (
        <PrimaryButton full onClick={onOpenPlan}>
          <Crown size={14} /> {t("settings.upgradeButton")}
        </PrimaryButton>
      )}
      {isPremium && premiumSource === "stripe" && (
        <PrimaryButton full onClick={onOpenPlan}>
          <Crown size={14} /> {t("settings.managePremiumPlanButton")}
        </PrimaryButton>
      )}

      <GhostButton full onClick={onOpenSettings}>
        <Cog size={14} /> {t("settings.title")}
      </GhostButton>

      <GhostButton full onClick={() => setShowChangePassword(true)}>
        <KeyRound size={14} /> {t("settings.changePassword")}
      </GhostButton>

      <GhostButton full onClick={handleSignOut} disabled={busy} style={{ color: C.crimson, borderColor: C.crimsonDim }}>
        <LogOut size={14} /> {busy ? t("settings.loggingOut") : t("settings.logout")}
      </GhostButton>

      {showChangePassword && (
        <Modal title={t("settings.changePassword")} onClose={() => setShowChangePassword(false)}>
          <ChangePasswordForm auth={auth} onClose={() => setShowChangePassword(false)} />
        </Modal>
      )}
    </>
  );
}

function ChangePasswordForm({ auth, onClose }) {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, isError }

  const mismatch = confirmPassword !== "" && newPassword !== confirmPassword;
  const valid = newPassword.length >= 6 && newPassword === confirmPassword;

  async function handleSubmit() {
    if (!valid || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await auth.updatePassword(newPassword);
      setMessage({ text: t("settings.passwordUpdated"), isError: false });
      setNewPassword(""); setConfirmPassword("");
    } catch (e) {
      setMessage({ text: e.message || t("settings.passwordUpdateError"), isError: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Field label={t("settings.newPassword")} hint={t("settings.newPasswordHint")}>
        <TextInput type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
      </Field>
      <Field label={t("settings.confirmNewPassword")} hint={mismatch ? t("settings.passwordMismatch") : undefined}>
        <TextInput type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
      </Field>
      {message && (
        <p className="text-[12px] mb-3" style={{ color: message.isError ? C.crimson : C.teal }}>{message.text}</p>
      )}
      <div className="flex gap-3">
        <GhostButton full onClick={onClose}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full onClick={handleSubmit} disabled={!valid || busy}>
          {busy ? t("settings.updating") : t("settings.updatePassword")}
        </PrimaryButton>
      </div>
    </div>
  );
}

function GamesEditor({ catalog }) {
  const { t } = useLanguage();
  const { games, addGame, renameGame, removeGame } = catalog;
  const [newLabel, setNewLabel] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");

  function commitAdd() {
    if (!newLabel.trim()) return;
    addGame(newLabel);
    setNewLabel("");
  }
  function startEdit(g) { setEditingKey(g.key); setEditingLabel(g.label); }
  function commitEdit() {
    if (editingLabel.trim()) renameGame(editingKey, editingLabel);
    setEditingKey(null);
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Gamepad2 size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.gamesManaged")}</span>
      </div>
      <div className="space-y-2 mb-3">
        {games.map((g) => (
          <div key={g.key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: C.surfaceAlt }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: g.color, flexShrink: 0 }} />
            {editingKey === g.key ? (
              <input
                autoFocus value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)}
                onBlur={commitEdit} onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: "13.5px", flex: 1 }}
              />
            ) : (
              <button onClick={() => startEdit(g)} className="flex-1 text-left text-[13.5px]">{g.label}</button>
            )}
            {g.key !== "altro" && (
              <button onClick={() => removeGame(g.key)} style={{ color: C.textFaint }}><X size={15} /></button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t("settings.newGamePlaceholder")} onKeyDown={(e) => e.key === "Enter" && commitAdd()} />
        <GhostButton onClick={commitAdd} style={{ padding: "10px 14px" }}><Plus size={16} /></GhostButton>
      </div>
    </div>
  );
}

function PlatformsEditor({ catalog }) {
  const { t } = useLanguage();
  const { platforms, addPlatform, removePlatform } = catalog;
  const [newName, setNewName] = useState("");

  function commitAdd() {
    if (!newName.trim()) return;
    addPlatform(newName);
    setNewName("");
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.sellingPlatforms")}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {platforms.map((p) => (
          <span key={p} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[12.5px]" style={{ background: C.surfaceAlt, color: C.textDim }}>
            {p}
            <button onClick={() => removePlatform(p)} style={{ color: C.textFaint }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("settings.newPlatformPlaceholder")} onKeyDown={(e) => e.key === "Enter" && commitAdd()} />
        <GhostButton onClick={commitAdd} style={{ padding: "10px 14px" }}><Plus size={16} /></GhostButton>
      </div>
    </div>
  );
}

function GradingCompaniesEditor({ catalog }) {
  const { t } = useLanguage();
  const { gradingCompanies, addGradingCompany, removeGradingCompany } = catalog;
  const [newName, setNewName] = useState("");

  function commitAdd() {
    if (!newName.trim()) return;
    addGradingCompany(newName);
    setNewName("");
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Award size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.gradingCompanies")}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {gradingCompanies.map((g) => (
          <span key={g} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[12.5px]" style={{ background: C.surfaceAlt, color: C.textDim }}>
            {g}
            <button onClick={() => removeGradingCompany(g)} style={{ color: C.textFaint }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("settings.newGradingPlaceholder")} onKeyDown={(e) => e.key === "Enter" && commitAdd()} />
        <GhostButton onClick={commitAdd} style={{ padding: "10px 14px" }}><Plus size={16} /></GhostButton>
      </div>
    </div>
  );
}

function AboutPanel() {
  const { t } = useLanguage();
  const emailNode = SUPPORT_EMAIL
    ? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.info }}>{SUPPORT_EMAIL}</a>
    : t("settings.emailToBeAdded");

  return (
    <>
      <div className="p-4 rounded-2xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div
          className="mx-auto mb-2 flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 999, background: C.surfaceAlt, border: `1.5px solid ${C.gold}` }}
        >
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15 }}>
            <span style={{ color: C.text }}>C</span><span style={{ color: C.gold }}>ly</span>
          </span>
        </div>
        <div className="text-sm font-semibold">Cardly</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{t("settings.version", { version: APP_VERSION })}</div>
        <p className="text-[12.5px] mt-2" style={{ color: C.textDim }}>
          {t("settings.aboutDescription")}
        </p>
      </div>

      {/* <div className="flex gap-2 items-start p-3 rounded-xl" style={{ background: `${C.amber}1F` }}>
        <AlertTriangle size={14} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
        <span className="text-[12px]" style={{ color: C.amber }}>
          {t("settings.aboutDisclaimer")}
        </span>
      </div> */}

      <AboutSection icon={Scale} title={t("settings.privacyTitle")}>
        <AboutP><b>{t("settings.privacyControllerLabel")}</b> {SUPPORT_EMAIL ? <>{t("settings.privacyControllerBodyPre")}{emailNode}{t("settings.privacyControllerBodyPost")}</> : t("settings.privacyControllerBodyNoEmail")}.</AboutP>
        <AboutP><b>{t("settings.privacyDataLabel")}</b> {t("settings.privacyDataBody")}</AboutP>
        <AboutP><b>{t("settings.privacyWhereLabel")}</b> {t("settings.privacyWhereBody")}</AboutP>
        <AboutP><b>{t("settings.privacyPurposeLabel")}</b> {t("settings.privacyPurposeBody")}</AboutP>
        <AboutP><b>{t("settings.privacyRetentionLabel")}</b> {t("settings.privacyRetentionBody")}</AboutP>
        <AboutP><b>{t("settings.privacyRightsLabel")}</b> {t("settings.privacyRightsBodyPre")}{emailNode}.</AboutP>
        <AboutP><b>{t("settings.privacyVendorsLabel")}</b> {t("settings.privacyVendorsBody")}</AboutP>
      </AboutSection>

      <AboutSection icon={FileCheck} title={t("settings.termsTitle")}>
        <AboutP>{t("settings.terms1")}</AboutP>
        <AboutP>{t("settings.terms2")}</AboutP>
        <AboutP>{t("settings.terms3")}</AboutP>
        <AboutP>{t("settings.terms4")}</AboutP>
      </AboutSection>

      <AboutSection icon={Code2} title={t("settings.licensesTitle")}>
        <AboutP>{t("settings.licensesText")}</AboutP>
      </AboutSection>

      <AboutSection icon={Mail} title={t("settings.contactsTitle")}>
        <AboutP>{t("settings.contactsPre")}{emailNode}.</AboutP>
      </AboutSection>
    </>
  );
}

function AboutSection({ icon: Icon, title, children }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} color={C.gold} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AboutP({ children }) {
  return <p className="text-[12.5px] leading-relaxed" style={{ color: C.textDim }}>{children}</p>;
}

function CSVPanel({ onExportCSV }) {
  const { t } = useLanguage();
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <FileText size={16} color={C.gold} />
        <span className="text-sm font-semibold">{t("settings.csvExport")}</span>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: C.textDim }}>
        {t("settings.csvExportDescription")}
      </p>
      <GhostButton full onClick={onExportCSV}>
        <FileText size={14} /> {t("settings.exportCsvButton")}
      </GhostButton>
    </div>
  );
}
