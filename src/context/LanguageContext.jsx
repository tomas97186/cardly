import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DICTS, resolve } from "../lib/i18n";
import { setFormatLocale } from "../lib/format";
import { loadLanguagePref, saveLanguagePref } from "../lib/storage";

const LOCALE_MAP = { it: "it-IT", en: "en-US" };

function detectDefaultLang() {
  const nav = (typeof navigator !== "undefined" && navigator.language ? navigator.language : "it").toLowerCase();
  return nav.startsWith("en") ? "en" : "it";
}

const LanguageContext = createContext(null);

// Same "synchronous default, then async override" pattern as CatalogProvider: starts
// from the detected browser language so there's no flash of an unstyled/wrong dict,
// then swaps in the user's explicitly saved preference (if any) once it loads.
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectDefaultLang);

  useEffect(() => {
    (async () => {
      const saved = await loadLanguagePref();
      if (saved && DICTS[saved]) setLangState(saved);
    })();
  }, []);

  useEffect(() => {
    setFormatLocale(LOCALE_MAP[lang] || LOCALE_MAP.it);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return;
    setLangState(next);
    saveLanguagePref(next);
  }, []);

  const t = useCallback((key, vars) => {
    const dict = DICTS[lang] || DICTS.it;
    let str = resolve(dict, key);
    if (str === undefined) str = resolve(DICTS.it, key);
    if (str === undefined) return key;
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v);
    return str;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
