import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { loadEntitlement } from "../lib/storage";

const EntitlementContext = createContext(null);
const DEFAULT = { tier: "free", premiumUntil: null, premiumSource: null };

// Piano free/premium dell'utente — letto da `profiles`, mai scritto dal client
// (solo un webhook lato server, dopo Stripe/Play Billing, può farlo). Vedi
// supabase/entitlements.sql per schema e policy.
export function EntitlementProvider({ children }) {
  const [entitlement, setEntitlement] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await loadEntitlement();
    setEntitlement(data || DEFAULT);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel;

    (async () => {
      await refresh();
      if (cancelled) return;

      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) return;

      // Il webhook di pagamento scrive questa riga in modo asincrono (l'utente
      // completa il checkout Stripe in un'altra scheda, o torna dal browser di
      // sistema dopo Play Billing) — niente reload manuale per accorgersene.
      channel = supabase
        .channel(`profiles-${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
          (payload) => {
            setEntitlement({
              tier: payload.new.subscription_tier,
              premiumUntil: payload.new.premium_until,
              premiumSource: payload.new.premium_source,
            });
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  const isPremium =
    entitlement.tier === "premium" &&
    (!entitlement.premiumUntil || new Date(entitlement.premiumUntil) > new Date());

  const value = useMemo(
    () => ({ ...entitlement, isPremium, loading, refresh }),
    [entitlement, isPremium, loading, refresh]
  );
  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error("useEntitlement must be used within an EntitlementProvider");
  return ctx;
}
