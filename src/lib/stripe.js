import { supabase } from "./supabaseClient";

// Chiama la Edge Function, ottiene l'URL Stripe ospitato e ci naviga —
// l'attivazione vera e propria di Premium arriva poi in modo asincrono dal
// webhook (supabase/functions/stripe-webhook), che EntitlementContext capta via
// realtime senza bisogno di ricaricare.
export async function startCheckout(interval = "monthly") {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { origin: window.location.origin, interval },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Nessun URL di checkout ricevuto");
  window.location.href = data.url;
}

// Prezzi live da Stripe per la pagina di upgrade, mai hardcodati lato client
// (vedi supabase/functions/get-plan-prices) — `annual` può essere `null` finché
// in Stripe non esiste ancora un secondo Price ricorrente annuale
// (STRIPE_PRICE_ID_ANNUAL non configurato), la UI mostra in quel caso solo il
// mensile.
export async function loadPlanPrices() {
  const { data, error } = await supabase.functions.invoke("get-plan-prices");
  if (error) { console.error("Errore caricamento prezzi piano", error); return { monthly: null, annual: null }; }
  return data;
}

export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {
    body: { origin: window.location.origin },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Nessun URL del portale ricevuto");
  window.location.href = data.url;
}
