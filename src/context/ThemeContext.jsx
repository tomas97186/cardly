import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { C, applyThemeMode } from "../lib/theme";
import { loadThemePref, saveThemePref } from "../lib/storage";

const STORAGE_KEY = "cardly-theme-mode";
const ThemeContext = createContext(null);

function getCachedMode() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached === "light" || cached === "dark" ? cached : "dark";
  } catch (e) { return "dark"; }
}

// Same "synchronous default, then async override" pattern as LanguageProvider: starts
// from the local cache (instant, no flash of the wrong palette), then swaps in the
// account-level preference once it loads. applyThemeMode() runs inside the useState
// initializer, so C already holds the right values before any child component renders.
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const initial = getCachedMode();
    applyThemeMode(initial);
    return initial;
  });

  useEffect(() => {
    (async () => {
      const saved = await loadThemePref();
      if (saved && (saved === "light" || saved === "dark")) {
        applyThemeMode(saved);
        setModeState(saved);
      }
    })();
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = C.bg;
    document.documentElement.setAttribute("data-theme-mode", mode);
  }, [mode]);

  const setMode = useCallback((next) => {
    applyThemeMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    setModeState(next);
    saveThemePref(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
