// Chiamata dal client (TWA Android) subito dopo un acquisto Play Billing
// riuscito — equivalente del "checkout.session.completed" di Stripe, ma
// iniziata dal client invece che da un webhook: l'RTDN di Google porta solo
// il purchaseToken, mai un ID utente, quindi il primo collegamento
// utente<->token deve avvenire qui, mentre abbiamo ancora il JWT dell'utente
// sottomano. Autenticata normalmente (non --no-verify-jwt), stesso schema di
// create-checkout-session/index.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAndApplySubscription } from "../_shared/googlePlay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { purchaseToken } = await req.json();
    if (!purchaseToken) return new Response("Missing purchaseToken", { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await verifyAndApplySubscription(purchaseToken, user.id, admin);

    if (!result.ok) {
      return new Response(JSON.stringify(result), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-play-purchase error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
