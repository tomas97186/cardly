// Verifica/applica lo stato di un abbonamento Google Play — condiviso tra
// verify-play-purchase (chiamata dal client subito dopo un acquisto) e
// play-rtdn-webhook (rinnovi/disdette successivi). Stesso principio di
// applySubscriptionState in stripe-webhook/index.ts: non ci si fida mai del
// contenuto grezzo di una notifica/richiesta, si ricontrolla sempre lo stato
// canonico presso Google prima di scrivere su profiles.
import { JWT } from "npm:google-auth-library@9";

const PACKAGE_NAME = "com.cardlycollector.twa";
const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

let cachedClient: JWT | null = null;
function getClient(): JWT {
  if (!cachedClient) {
    const credentials = JSON.parse(Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")!);
    cachedClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [ANDROID_PUBLISHER_SCOPE],
    });
  }
  return cachedClient;
}

async function getAccessToken(): Promise<string> {
  const { token } = await getClient().getAccessToken();
  if (!token) throw new Error("Impossibile ottenere un access token Google");
  return token;
}

// Stati che contano come Premium attivo — IN_GRACE_PERIOD è "pagamento
// fallito ma l'utente ha ancora accesso mentre Google ritenta l'addebito",
// stesso trattamento che diamo a active/trialing lato Stripe.
const ACTIVE_STATES = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"];

export async function verifyAndApplySubscription(
  purchaseToken: string,
  userId: string,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<{ ok: true; active: boolean } | { ok: false; error: string }> {
  const accessToken = await getAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    console.error("Verifica acquisto Google Play fallita", res.status, await res.text());
    return { ok: false, error: "verification_failed" };
  }
  const data = await res.json();

  const active = ACTIVE_STATES.includes(data.subscriptionState);
  const expiryTime = data.lineItems?.[0]?.expiryTime ?? null;

  await admin.from("profiles").update({
    subscription_tier: active ? "premium" : "free",
    premium_source: active ? "google_play" : null,
    premium_until: expiryTime,
    google_play_purchase_token: purchaseToken,
  }).eq("id", userId);

  // Un acquisto non confermato entro 3 giorni viene rimborsato automaticamente
  // da Google — confermiamo subito invece di aspettare un job separato.
  if (data.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
    await acknowledgePurchase(purchaseToken, accessToken);
  }

  return { ok: true, active };
}

// Il path ":acknowledge" sulla v2 non è documentato con un esempio verbatim
// ufficiale al momento in cui è stato scritto questo codice (solo dedotto per
// coerenza REST con l'endpoint GET sopra) — se dovesse rispondere 404,
// ripiega sull'endpoint v3 legacy, documentato in modo esplicito da Google.
// Verificare al primo acquisto reale (vedi il piano di verifica) ed
// eventualmente rimuovere il ramo che non serve.
async function acknowledgePurchase(purchaseToken: string, accessToken: string) {
  const v2Url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}:acknowledge`;
  const v2Res = await fetch(v2Url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  if (v2Res.ok) return;

  console.warn("Acknowledge v2 fallito, provo l'endpoint legacy v3", v2Res.status);
  const legacyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/premium/tokens/${purchaseToken}:acknowledge`;
  const legacyRes = await fetch(legacyUrl, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  if (!legacyRes.ok) {
    console.error("Acknowledge fallito su entrambi gli endpoint — verrà ritentato al prossimo RTDN", legacyRes.status, await legacyRes.text());
  }
}

export async function findUserIdByPurchaseToken(
  purchaseToken: string,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("google_play_purchase_token", purchaseToken)
    .maybeSingle();
  return data?.id ?? null;
}
