// Prezzi live del piano Premium (mensile + annuale) per la pagina di upgrade —
// letti direttamente da Stripe invece di essere duplicati come numeri hardcoded
// lato client, così restano sempre corretti anche se cambiano in Stripe. Stessa
// autenticazione delle altre funzioni Stripe, anche se qui i dati restituiti non
// sono specifici dell'utente (solo per coerenza con create-checkout-session /
// create-portal-session).
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// STRIPE_PRICE_ID_ANNUAL può non esistere ancora (Price annuale non creato in
// Stripe) — in quel caso restituiamo null per quella cadenza invece di far
// fallire l'intera risposta, così la UI può comunque mostrare il mensile.
async function safePrice(id: string | undefined) {
  if (!id) return null;
  try {
    const p = await stripe.prices.retrieve(id);
    return { amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval ?? null };
  } catch (e) {
    console.error("get-plan-prices: impossibile leggere il price", id, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Missing Authorization header", { status: 401, headers: corsHeaders });

    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const [monthly, annual] = await Promise.all([
      safePrice(Deno.env.get("STRIPE_PRICE_ID")),
      safePrice(Deno.env.get("STRIPE_PRICE_ID_ANNUAL")),
    ]);

    return new Response(JSON.stringify({ monthly, annual }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-plan-prices error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
