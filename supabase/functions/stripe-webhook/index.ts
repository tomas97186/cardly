// Webhook Stripe: l'unico punto che scrive davvero subscription_tier/
// premium_source/premium_until su `profiles` (vedi supabase/entitlements.sql —
// il client non può scriverla). Pubblica per forza (Stripe la chiama da fuori,
// senza JWT Supabase) — l'autenticazione è la firma HMAC verificata sotto,
// non un token. Va deployata con `--no-verify-jwt` (vedi istruzioni di deploy).
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    console.error("Firma webhook non valida", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      // Primo pagamento andato a buon fine: la subscription esiste già a questo
      // punto, la recuperiamo per leggerne lo stato/la scadenza reali invece di
      // assumerli dal solo evento di checkout.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await applySubscriptionState(userId, subscription);
        }
        break;
      }
      // Rinnovi, upgrade/downgrade, pagamento fallito (status passa a
      // past_due/unpaid) — ricalcoliamo sempre lo stato da qui, non solo dal
      // checkout iniziale.
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(subscription);
        if (userId) await applySubscriptionState(userId, subscription);
        break;
      }
      // Disdetta effettiva (fine periodo, o cancellazione immediata) — torna a
      // Free. Le foto/elementi in eccesso restano finché non gireremo il job di
      // pulizia (vedi PHOTO_DOWNGRADE_GRACE_DAYS in src/lib/appConfig.js).
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(subscription);
        if (userId) {
          await admin.from("profiles").update({
            subscription_tier: "free",
            premium_source: null,
            premium_until: null,
          }).eq("id", userId);
        }
        break;
      }
    }
  } catch (e) {
    console.error("Errore gestione evento Stripe", e);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});

async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", subscription.customer as string)
    .maybeSingle();
  return data?.id ?? null;
}

// Nelle API version più recenti di Stripe, current_period_end non è più sulla
// Subscription stessa ma su ogni riga (subscription.items.data[].
// current_period_end) — supporto prezzi con cicli di fatturazione diversi sullo
// stesso abbonamento. Proviamo prima il campo legacy, poi la prima riga.
function resolvePeriodEnd(subscription: Stripe.Subscription): number | null {
  if (subscription.current_period_end) return subscription.current_period_end;
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  return item?.current_period_end ?? null;
}

async function applySubscriptionState(userId: string, subscription: Stripe.Subscription) {
  const active = subscription.status === "active" || subscription.status === "trialing";
  const periodEnd = resolvePeriodEnd(subscription);
  await admin.from("profiles").update({
    subscription_tier: active ? "premium" : "free",
    premium_source: active ? "stripe" : null,
    premium_until: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    stripe_subscription_id: subscription.id,
  }).eq("id", userId);
}
