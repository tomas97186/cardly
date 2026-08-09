-- Cardly — fix: il campo "lingua" raccolto dai form (Carta singola / Carta del
-- lotto) non è mai stato salvato, perché non esisteva la colonna su nessuna delle
-- due tabelle — veniva scartato silenziosamente ad ogni salvataggio. Esegui questo
-- file una volta nell'SQL Editor del progetto Supabase esistente (idempotente,
-- sicuro da rieseguire). Già incluso in schema.sql per le installazioni nuove.

alter table public.items add column if not exists language text;
alter table public.lot_cards add column if not exists language text;
