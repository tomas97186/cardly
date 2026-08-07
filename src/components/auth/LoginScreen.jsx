import { useState } from "react";
import { Mail, Layers } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { Field } from "../ui/Field";
import { TextInput } from "../ui/Inputs";
import { PrimaryButton, GhostButton } from "../ui/Buttons";

// Full-screen gate rendered whenever there's no Supabase session — nothing behind it
// (CatalogProvider, AppInner) ever mounts until auth.status === "signed-in".
export function LoginScreen({ auth }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const passwordsMismatch = mode === "signup" && confirmPassword !== "" && password !== confirmPassword;
  const valid = email.trim() && password.length >= 6 && (mode === "signin" || password === confirmPassword);

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setNotice("");
    setConfirmPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      if (mode === "signin") await auth.signInWithPassword(email.trim(), password);
      else {
        await auth.signUpWithPassword(email.trim(), password);
        setNotice(t("auth.accountCreatedNotice"));
      }
    } catch {
      // auth.errorMsg is already set by the hook, shown below.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      await auth.signInWithOtp(email.trim());
      setNotice(t("auth.magicLinkSentNotice"));
    } catch {
      // auth.errorMsg is already set by the hook, shown below.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{ width: 60, height: 60, borderRadius: 999, background: C.surfaceAlt, border: `1.5px solid ${C.gold}`, boxShadow: `0 0 24px ${C.gold}33` }}
          >
            <Layers size={26} color={C.gold} />
          </div>
          <h1 style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }} className="text-3xl font-bold" >
            <span style={{ color: C.text }}>Card</span><span style={{ color: C.gold }}>ly</span>
          </h1>
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: C.textDim }}>
            {t("auth.tagline1")}
            <br className="hidden sm:block" /> {t("auth.tagline2")}
          </p>
          <p className="text-[12.5px] mt-3" style={{ color: C.textFaint }}>
            {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label={t("auth.email")}>
            <TextInput type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@esempio.it" />
          </Field>
          <Field label={t("auth.password")} hint={mode === "signup" ? t("auth.passwordHint") : undefined}>
            <TextInput type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {mode === "signup" && (
            <Field label={t("auth.repeatPassword")} hint={passwordsMismatch ? t("auth.passwordMismatch") : undefined}>
              <TextInput type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </Field>
          )}

          {auth.errorMsg && (
            <div className="text-[13px] mb-4 px-3 py-2 rounded-lg" style={{ background: C.crimsonDim, color: C.text }}>
              {auth.errorMsg}
            </div>
          )}
          {notice && (
            <div className="text-[13px] mb-4 px-3 py-2 rounded-lg" style={{ background: C.tealDim, color: C.text }}>
              {notice}
            </div>
          )}

          <PrimaryButton type="submit" full disabled={!valid || submitting}>
            {submitting ? t("auth.waiting") : mode === "signin" ? t("auth.signInButton") : t("auth.createAccount")}
          </PrimaryButton>
        </form>

        <GhostButton full style={{ marginTop: 10 }} disabled={!email.trim() || submitting} onClick={handleMagicLink}>
          <Mail size={14} /> {t("auth.magicLink")}
        </GhostButton>

        <button
          className="w-full text-center text-[13px] mt-5"
          style={{ color: C.textDim }}
          onClick={switchMode}
        >
          {mode === "signin" ? t("auth.noAccount") : t("auth.hasAccount")}
        </button>
      </div>
    </div>
  );
}
