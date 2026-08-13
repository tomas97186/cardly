// Riceve le Real-time Developer Notifications di Google Play (rinnovi,
// disdette, pause, ecc.) via una subscription push su Cloud Pub/Sub — vanno
// configurate su un topic già creato manualmente in Play Console. Pubblica
// per forza (Google la chiama da fuori, senza JWT Supabase): va deployata con
// `--no-verify-jwt`, come stripe-webhook. Qui però non c'è una firma HMAC
// come in Stripe — l'autenticazione è un token OIDC firmato da Google nella
// subscription push, verificato sotto contro le chiavi pubbliche di Google.
//
// Il payload non porta mai un ID utente, solo un purchaseToken — la funzione
// non fa altro che dire "qualcosa è cambiato per questo token, ricontrolla lo
// stato vero presso Google" (verifyAndApplySubscription, condivisa con
// verify-play-purchase), mai fidarsi del notificationType da solo.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";
import { verifyAndApplySubscription, findUserIdByPurchaseToken } from "../_shared/googlePlay.ts";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function isAuthenticPubSubRequest(req: Request): Promise<boolean> {
  const expectedAudience = Deno.env.get("GOOGLE_PLAY_RTDN_AUDIENCE");
  const expectedInvokerEmail = Deno.env.get("GOOGLE_PLAY_RTDN_INVOKER_EMAIL");
  if (!expectedAudience || !expectedInvokerEmail) {
    console.error("GOOGLE_PLAY_RTDN_AUDIENCE / GOOGLE_PLAY_RTDN_INVOKER_EMAIL non configurati — rifiuto per sicurezza");
    return false;
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, { audience: expectedAudience });
    return payload.email === expectedInvokerEmail && payload.email_verified === true;
  } catch (e) {
    console.error("Token OIDC Pub/Sub non valido", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (!(await isAuthenticPubSubRequest(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const dataB64 = body?.message?.data;
    if (!dataB64) return new Response("ok"); // busta malformata, non ritentabile: si conferma comunque per evitare loop di retry

    const notification = JSON.parse(atob(dataB64));
    if (notification.testNotification) {
      return new Response("ok");
    }

    const sub = notification.subscriptionNotification;
    if (sub?.purchaseToken) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const userId = await findUserIdByPurchaseToken(sub.purchaseToken, admin);
      if (userId) {
        await verifyAndApplySubscription(sub.purchaseToken, userId, admin);
      } else {
        // Probabile primissima notifica arrivata prima che verify-play-purchase
        // avesse ancora collegato il token — quella chiamata se ne occupa già.
        console.warn("Nessun utente collegato a questo purchaseToken, ignoro", sub.purchaseToken);
      }
    }

    return new Response("ok");
  } catch (e) {
    console.error("play-rtdn-webhook error", e);
    // 500 fa ritentare Pub/Sub più tardi — corretto per un errore transitorio
    // (es. Google Play API momentaneamente irraggiungibile).
    return new Response("Internal error", { status: 500 });
  }
});
