-- Cardly — colonna per l'integrazione Google Play Billing (abbonamento Premium
-- via Digital Goods API/PaymentRequest nella TWA + RTDN). Esegui dopo
-- entitlements.sql. Idempotente: rieseguibile in sicurezza.
--
-- google_play_purchase_token: valorizzato subito dopo un acquisto riuscito
-- lato client (vedi supabase/functions/verify-play-purchase), è il modo in
-- cui le notifiche RTDN successive (rinnovi, disdette — vedi
-- supabase/functions/play-rtdn-webhook, che porta solo il token, non un ID
-- utente) risalgono a quale utente aggiornare. Stesso ruolo di
-- stripe_customer_id in stripe.sql. Nessuna delle due colonne è mai letta dal
-- client — solo le Edge Function (service role) le leggono/scrivono.
-- premium_source accetta già 'google_play' (vedi entitlements.sql), nessuna
-- modifica lì.

alter table public.profiles
  add column if not exists google_play_purchase_token text;

create unique index if not exists profiles_google_play_purchase_token_idx
  on public.profiles(google_play_purchase_token) where google_play_purchase_token is not null;
