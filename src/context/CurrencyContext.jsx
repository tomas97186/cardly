import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { CURRENCY_OPTIONS, setFormatCurrency } from "../lib/format";
import { loadCurrencyPref, saveCurrencyPref } from "../lib/storage";

const STORAGE_KEY = "cardly-currency";
const CurrencyContext = createContext(null);
const VALID_CODES = CURRENCY_OPTIONS.map((c) => c.code);

function getCachedCurrency() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return VALID_CODES.includes(cached) ? cached : "EUR";
  } catch (e) { return "EUR"; }
}

// Same "synchronous default, then async override" pattern as ThemeProvider —
// setFormatCurrency() runs inside the useState initializer, so money() already
// formats correctly before any child component renders.
export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    const initial = getCachedCurrency();
    setFormatCurrency(initial);
    return initial;
  });

  useEffect(() => {
    (async () => {
      const saved = await loadCurrencyPref();
      if (saved && VALID_CODES.includes(saved)) {
        setFormatCurrency(saved);
        setCurrencyState(saved);
      }
    })();
  }, []);

  const setCurrency = useCallback((next) => {
    if (!VALID_CODES.includes(next)) return;
    setFormatCurrency(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    setCurrencyState(next);
    saveCurrencyPref(next);
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
