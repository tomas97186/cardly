// Acquisto Premium via Google Play Billing quando l'app gira dentro la TWA
// Android (com.cardlycollector.twa) — su web normale getDigitalGoodsService
// non esiste affatto, isPlayBillingAvailable() torna semplicemente false e
// tutto il resto dell'app continua a usare Stripe (vedi lib/stripe.js).
import { supabase } from "./supabaseClient";
import { GOOGLE_PLAY_PRODUCT_ID, GOOGLE_PLAY_BASE_PLAN_MONTHLY, GOOGLE_PLAY_BASE_PLAN_YEARLY } from "./appConfig";

function skuFor(basePlanId) {
  // Formato sku per un abbonamento con base plan: "productId:basePlanId" —
  // convenzione Google Play, non parte dello standard Digital Goods API.
  // Se un giorno risultasse sbagliato (getDetails non trova questi sku),
  // primo tentativo alternativo: il solo basePlanId senza prefisso.
  return `${GOOGLE_PLAY_PRODUCT_ID}:${basePlanId}`;
}

let servicePromise = null;
function getService() {
  if (!servicePromise) {
    servicePromise = "getDigitalGoodsService" in window
      ? window.getDigitalGoodsService("https://play.google.com/billing").catch((e) => {
          console.error("[playBilling] getDigitalGoodsService failed", e);
          return null;
        })
      : Promise.resolve(null);
  }
  return servicePromise;
}

export async function isPlayBillingAvailable() {
  return (await getService()) !== null;
}

function toMinorUnits(item) {
  return { amount: Math.round(parseFloat(item.price.value) * 100), currency: item.price.currency };
}

// Stesso shape { monthly: {amount, currency}, annual: {amount, currency} } già
// prodotto da loadPlanPrices() in lib/stripe.js, così il resto della pagina
// "Piano e abbonamento" non deve distinguere la fonte dei prezzi.
export async function loadPlayBillingPrices() {
  const service = await getService();
  if (!service) return { monthly: null, annual: null };

  const monthlySku = skuFor(GOOGLE_PLAY_BASE_PLAN_MONTHLY);
  const yearlySku = skuFor(GOOGLE_PLAY_BASE_PLAN_YEARLY);
  const details = await service.getDetails([monthlySku, yearlySku]);
  // eslint-disable-next-line no-console
  console.log("[playBilling] richiesti:", [monthlySku, yearlySku], "ricevuti:", details);

  const monthly = details.find((d) => d.itemId === monthlySku);
  const yearly = details.find((d) => d.itemId === yearlySku);
  return {
    monthly: monthly ? toMinorUnits(monthly) : null,
    annual: yearly ? toMinorUnits(yearly) : null,
  };
}

// Avvia l'acquisto nativo Play Billing e, se riuscito, lo fa verificare/
// applicare lato server (verify-play-purchase) prima di confermarlo — mai
// segnare Premium attivo solo perché il PaymentRequest è tornato senza
// errori, l'unica fonte di verità è la risposta della nostra Edge Function.
export async function purchasePlayBilling(basePlanId) {
  const { data: { user } } = await supabase.auth.getUser();
  const paymentMethods = [{
    supportedMethods: "https://play.google.com/billing",
    data: { sku: skuFor(basePlanId), obfuscatedAccountId: user?.id },
  }];
  // Il totale qui non viene mostrato all'utente (Play Billing usa il proprio
  // foglio nativo con il prezzo reale) — richiesto solo perché PaymentRequest
  // lo impone come campo obbligatorio.
  const paymentDetails = { total: { label: "Cardly Premium", amount: { currency: "EUR", value: "0" } } };

  const request = new PaymentRequest(paymentMethods, paymentDetails);
  const paymentResponse = await request.show();
  const { purchaseToken } = paymentResponse.details;

  const { data, error } = await supabase.functions.invoke("verify-play-purchase", { body: { purchaseToken } });
  if (error || !data?.ok) {
    await paymentResponse.complete("fail");
    throw error || new Error("Verifica acquisto non riuscita");
  }
  await paymentResponse.complete("success");
  return data;
}
