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

  async function handleGoogleSignIn() {
    if (submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      // Redirects the whole page to Google; on success the browser never returns
      // here — it comes back on auth.status flipping to "signed-in" after the
      // Supabase callback redirect.
      await auth.signInWithGoogle();
    } catch {
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

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: C.border }} />
          <span className="text-[11.5px]" style={{ color: C.textFaint }}>{t("auth.orDivider")}</span>
          <div className="flex-1 h-px" style={{ background: C.border }} />
        </div>

        <GhostButton full disabled={submitting} onClick={handleGoogleSignIn}>
          <GoogleIcon size={16} /> {t("auth.continueWithGoogle")}
        </GhostButton>

        {/* <GhostButton full style={{ marginTop: 10 }} disabled={!email.trim() || submitting} onClick={handleMagicLink}>
          <Mail size={14} /> {t("auth.magicLink")}
        </GhostButton> */}

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

function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18A13.96 13.96 0 0 1 10.9 24c0-1.45.25-2.86.79-4.18v-5.7H4.34A21.97 21.97 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}
