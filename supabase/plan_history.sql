-- Cardly — cronologia dei cambi di piano (subscription_tier / premium_source),
-- puramente per consultazione interna dello sviluppatore via Table Editor/SQL
-- Editor di Supabase. Nessuna UI, nessuna lettura dal client: vedi entitlements.sql
-- per l'entitlement vero e proprio, quello letto da EntitlementContext.
-- Esegui una sola volta nel SQL Editor, dopo schema.sql ed entitlements.sql.
-- Idempotente: rieseguibile in sicurezza.

create table if not exists public.plan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_at timestamptz not null default now(),
  old_tier text,
  new_tier text,
  old_premium_source text,
  new_premium_source text,
  old_premium_until timestamptz,
  new_premium_until timestamptz
);

create index if not exists plan_history_user_id_idx on public.plan_history(user_id, changed_at desc);
create index if not exists plan_history_changed_at_idx on public.plan_history(changed_at desc);

alter table public.plan_history enable row level security;
-- Nessuna policy, di proposito: né anon né authenticated devono poter leggere né
-- scrivere qui, nemmeno le proprie righe — è un registro interno per lo
-- sviluppatore, non una feature utente. Il Table Editor/SQL Editor di Supabase
-- girano con la service role e bypassano comunque RLS, quindi non serve nessuna
-- policy per consultarlo da lì. Meno superficie = niente storico piani
-- esponibile per errore in una futura query lato client.

-- ---------- Trigger: logga un cambio di piano solo quando cambia davvero
-- qualcosa di rilevante (subscription_tier e/o premium_source), non ad ogni
-- UPDATE di profiles — altrimenti un rinnovo che sposta solo premium_until
-- (stesso tier, stesso provider) genererebbe una riga ad ogni ciclo di
-- fatturazione. premium_until viene comunque salvato come contesto della riga
-- (utile per sapere "fino a quando" valeva il piano al momento del cambio), ma
-- da solo non fa scattare il trigger. Gira solo su UPDATE (non INSERT): la
-- prima riga 'free' creata da handle_new_user() in schema.sql non è un
-- "cambio" — non ha un old_tier reale con cui confrontarsi — quindi non
-- produce una riga qui, di proposito.
-- Niente security definer: a differenza di handle_new_user() (che deve poter
-- scrivere in profiles durante il signup, prima che esista qualunque grant per
-- quell'utente), chi esegue l'UPDATE su profiles qui è sempre già la service
-- role (il futuro webhook Stripe/Play, o lo sviluppatore da SQL Editor) — lo
-- stesso ruolo bypassa RLS anche su plan_history, quindi SECURITY DEFINER non
-- aggiungerebbe nessun privilegio che non ci sia già. Stessa scelta stilistica
-- di enforce_free_tier_item_limit/enforce_photo_limit in entitlements.sql.
create or replace function public.log_plan_change()
returns trigger language plpgsql as $$
begin
  if new.subscription_tier is distinct from old.subscription_tier
     or new.premium_source is distinct from old.premium_source then
    insert into public.plan_history (
      user_id, old_tier, new_tier, old_premium_source, new_premium_source,
      old_premium_until, new_premium_until
    ) values (
      new.id, old.subscription_tier, new.subscription_tier,
      old.premium_source, new.premium_source,
      old.premium_until, new.premium_until
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_log_plan_change on public.profiles;
create trigger profiles_log_plan_change
  after update on public.profiles for each row execute function public.log_plan_change();
