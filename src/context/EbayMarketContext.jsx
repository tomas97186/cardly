import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { EBAY_MARKET_OPTIONS } from "../lib/marketSearch";
import { loadEbayMarketPref, saveEbayMarketPref } from "../lib/storage";

const STORAGE_KEY = "cardly-ebay-market";
const EbayMarketContext = createContext(null);
const VALID_CODES = EBAY_MARKET_OPTIONS.map((m) => m.code);

function getCachedMarket() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return VALID_CODES.includes(cached) ? cached : "it";
  } catch (e) { return "it"; }
}

// Same "synchronous default, then async override" pattern as CurrencyProvider —
// starts from the local cache (instant), then swaps in the account-level
// preference once it loads.
export function EbayMarketProvider({ children }) {
  const [ebayMarket, setEbayMarketState] = useState(getCachedMarket);

  useEffect(() => {
    (async () => {
      const saved = await loadEbayMarketPref();
      if (saved && VALID_CODES.includes(saved)) setEbayMarketState(saved);
    })();
  }, []);

  const setEbayMarket = useCallback((next) => {
    if (!VALID_CODES.includes(next)) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    setEbayMarketState(next);
    saveEbayMarketPref(next);
  }, []);

  const value = useMemo(() => ({ ebayMarket, setEbayMarket }), [ebayMarket, setEbayMarket]);
  return <EbayMarketContext.Provider value={value}>{children}</EbayMarketContext.Provider>;
}

export function useEbayMarket() {
  const ctx = useContext(EbayMarketContext);
  if (!ctx) throw new Error("useEbayMarket must be used within an EbayMarketProvider");
  return ctx;
}
