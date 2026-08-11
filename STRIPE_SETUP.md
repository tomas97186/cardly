# Cardly — configurazione abbonamento Premium (Stripe)

Guida da riseguire ogni volta che colleghi l'integrazione Stripe a un **nuovo
progetto Supabase** (es. quando passerai dal progetto di test a quello
dell'esercizio vero e proprio). I passaggi sono identici indipendentemente dal
progetto — cambiano solo i valori (chiavi, project-ref, eventualmente il
Price ID se crei un nuovo prodotto anche su Stripe).

Prerequisito: `supabase/schema.sql`, `supabase/entitlements.sql` e
`supabase/plan_history.sql` già eseguiti sul progetto Supabase che stai
configurando (vedi [COME_INSTALLARE.md](COME_INSTALLARE.md) per la parte base).

---

## 1. Account Stripe

Se non esiste già, crealo su stripe.com. Resta in **test mode** (interruttore
in alto a destra nella Dashboard) finché non sei pronto a lanciare davvero —
i pagamenti in test mode non muovono soldi reali e usano carte di prova.

## 2. Prodotto e prezzo

Dashboard Stripe → **Product catalog** → crea un prodotto (es. "Cardly
Premium") con un **Price ricorrente** (mensile o annuale, importo a tua
scelta — non è hardcodato da nessuna parte nel codice). Copia il **Price ID**
(`price_...`).

## 3. Chiavi API

Dashboard Stripe → **Developers → API keys**, copia la **Secret key**
(`sk_test_...` in test mode, `sk_live_...` in produzione).

## 4. Supabase CLI

Se non l'hai già installata:
```
npm install -g supabase
supabase login
```
Poi collega il progetto Supabase che stai configurando (il project-ref si
trova nell'URL del progetto, dashboard.supabase.com/project/<project-ref>):
```
supabase link --project-ref <project-ref>
```

## 5. Deploy delle Edge Function

Dalla cartella del progetto (contiene `supabase/functions/`):
```
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```
L'ultima **deve** avere `--no-verify-jwt`: Stripe la chiama da fuori senza un
token Supabase, l'autenticazione è la firma HMAC verificata nel codice
([supabase/functions/stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts)), non un JWT.

## 6. Segreti delle Edge Function

Mai nel `.env.local`/`.env.esercizio` del frontend — quelli sono letti da
Vite in fase di build e finiscono nel bundle pubblico. Questi restano lato
server, impostati sul progetto Supabase collegato al punto 4:
```
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PRICE_ID=price_...
```

## 7. Webhook endpoint

Dashboard Stripe → **Developers → Webhooks → Add endpoint**:
- URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- Eventi da ascoltare: `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

Copia il **Signing secret** (`whsec_...`) e impostalo:
```
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## 8. Migrazione database

Esegui [`supabase/stripe.sql`](supabase/stripe.sql) nel SQL Editor del
progetto Supabase che stai configurando (dopo `entitlements.sql`).

---

## Verifica end-to-end

1. Da SQL Editor, controlla che la tua riga in `profiles` abbia
   `subscription_tier = 'free'`.
2. Nell'app (build puntata al progetto giusto), Impostazioni → Account →
   "Passa a Premium" → completa un pagamento di test (carta `4242 4242 4242
   4242`, qualunque data futura/CVC).
3. Dopo il redirect, ricontrolla `profiles` (o aspetta il badge nell'app, si
   aggiorna da solo via realtime) → `subscription_tier` deve essere
   `'premium'`, `premium_source = 'stripe'`, `stripe_customer_id` e
   `stripe_subscription_id` valorizzati.
4. `select * from public.plan_history order by changed_at desc limit 1;` →
   deve comparire la riga `free → premium`.
5. "Gestisci abbonamento" nell'app deve aprire il Billing Portal Stripe;
   disdicendo da lì, entro pochi secondi `profiles` deve tornare a
   `subscription_tier = 'free'`.

## Passaggio da test a produzione (quando l'esercizio è pronto per pagamenti reali)

Ripeti i punti 2-3 e 6-7 con le chiavi **live** di Stripe (non basta
riattivare l'interruttore test/live nella Dashboard — le chiavi API, il
Price ID e il webhook endpoint sono separati tra test e live, vanno
ricreati/ricopiati). I punti 4, 5 e 8 restano invariati se il progetto
Supabase è lo stesso.
