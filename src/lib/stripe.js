import { supabase } from "./supabaseClient";

// Chiama la Edge Function, ottiene l'URL Stripe ospitato e ci naviga —
// l'attivazione vera e propria di Premium arriva poi in modo asincrono dal
// webhook (supabase/functions/stripe-webhook), che EntitlementContext capta via
// realtime senza bisogno di ricaricare.
export async function startCheckout() {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { origin: window.location.origin },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Nessun URL di checkout ricevuto");
  window.location.href = data.url;
}

export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {
    body: { origin: window.location.origin },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Nessun URL del portale ricevuto");
  window.location.href = data.url;
}
