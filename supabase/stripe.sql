-- Cardly — colonne per l'integrazione Stripe (abbonamento Premium via Checkout +
-- webhook). Esegui dopo entitlements.sql. Idempotente: rieseguibile in sicurezza.
--
-- stripe_customer_id: creato al primo checkout (vedi funzione
-- create-checkout-session), riusato per i checkout successivi e per aprire il
-- Billing Portal. stripe_subscription_id: l'abbonamento attivo più recente,
-- utile per debug/supporto. Nessuna delle due colonne è mai letta dal client —
-- solo le Edge Function (service role) le leggono/scrivono.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles(stripe_customer_id) where stripe_customer_id is not null;
