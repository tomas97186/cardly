// Crea una sessione Stripe Checkout per l'abbonamento Premium. Chiamata dal
// client autenticato (src/lib/stripe.js -> supabase.functions.invoke), non
// pubblica: legge chi sta chiamando dal JWT Supabase, poi usa la service role
// per leggere/scrivere `profiles` (mai scrivibile dal client con la anon key,
// vedi supabase/entitlements.sql).
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Missing Authorization header", { status: 401, headers: corsHeaders });

    // Client "per conto dell'utente": serve solo a verificare chi sta chiamando.
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { origin, interval } = await req.json();
    if (!origin) return new Response("Missing origin", { status: 400, headers: corsHeaders });

    const priceId = interval === "annual"
      ? Deno.env.get("STRIPE_PRICE_ID_ANNUAL")
      : Deno.env.get("STRIPE_PRICE_ID");
    if (!priceId) return new Response("Price not configured for this interval", { status: 400, headers: corsHeaders });

    // Client "service role": l'unico autorizzato a leggere/scrivere profiles.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Campo "codice promozionale" nativo della pagina ospitata da Stripe — non
      // serve costruire (e validare) un input custom lato nostro per qualcosa che
      // Stripe gestisce già correttamente.
      allow_promotion_codes: true,
      // ?checkout=success fa comparire il modale di benvenuto lato client (vedi
      // App.jsx / PremiumWelcomeModal) — cancel_url resta pulito, un checkout
      // annullato non ha nulla da festeggiare.
      success_url: `${origin}?checkout=success`,
      cancel_url: origin,
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout-session error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
