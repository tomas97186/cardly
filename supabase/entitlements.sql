-- Cardly — infrastruttura comune per funzioni a pagamento (provider-agnostica)
-- Esegui una sola volta nel SQL Editor del progetto Supabase, dopo schema.sql.
-- Idempotente: rieseguibile in sicurezza.

-- `profiles.subscription_tier` esisteva già come hook inutilizzato (vedi schema.sql).
-- Qui: (1) aggiungiamo i due campi che servono per tracciare scadenza/provenienza
-- indipendentemente dal metodo di pagamento (Stripe sul web, Play Billing sulla TWA),
-- (2) chiudiamo un buco di sicurezza — la policy di update permetteva a qualunque
-- utente autenticato di scriversi da solo `subscription_tier = 'premium'` dal client.
-- Da qui in poi questa riga si scrive SOLO lato server (service role key nelle
-- funzioni che validano i webhook di Stripe/Play), mai dal client con la anon key.

alter table public.profiles
  add column if not exists premium_until timestamptz,
  add column if not exists premium_source text check (premium_source in ('stripe', 'google_play', 'manual'));

drop policy if exists "profiles_update_own" on public.profiles;

-- Backfill: utenti creati prima che esistesse il trigger on_auth_user_created non
-- hanno ancora una riga in profiles.
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Realtime: la riga profiles viene aggiornata in modo asincrono da un webhook
-- (l'utente paga in un'altra scheda/torna dal browser di sistema dopo Play
-- Billing) — la UI deve accorgersene senza bisogno di un reload manuale.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- ---------- Limite piano Free: 300 elementi catalogati (carte singole + carte
-- dentro i lotti — un lotto senza carte catalogate non conta nulla, coerente con
-- "non inventare mai numeri che non si conoscono"). Applicato qui, non solo lato
-- client, perché altrimenti basterebbe aprire la console e chiamare l'API Supabase
-- direttamente per aggirarlo. ----------
-- L'app usa sempre upsert() (INSERT ... ON CONFLICT ... DO UPDATE) sia per creare
-- che per modificare — un BEFORE INSERT trigger scatta comunque per le righe che
-- finiranno per essere un UPDATE, quindi va esclusa esplicitamente la modifica di
-- una riga già esistente (altrimenti un utente al limite non potrebbe più
-- modificare le carte che ha già).
create or replace function public.enforce_free_tier_item_limit()
returns trigger language plpgsql as $$
declare
  already_exists boolean;
  tier text;
  total int;
begin
  execute format('select exists(select 1 from public.%I where id = $1)', tg_table_name)
    into already_exists using new.id;
  if already_exists then
    return new;
  end if;

  select subscription_tier into tier from public.profiles where id = new.user_id;
  if tier is distinct from 'free' then
    return new;
  end if;

  select (select count(*) from public.items where user_id = new.user_id)
       + (select count(*) from public.lot_cards where user_id = new.user_id)
    into total;

  if total >= 300 then
    raise exception 'FREE_TIER_ITEM_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists items_enforce_free_limit on public.items;
create trigger items_enforce_free_limit
  before insert on public.items for each row execute function public.enforce_free_tier_item_limit();

drop trigger if exists lot_cards_enforce_free_limit on public.lot_cards;
create trigger lot_cards_enforce_free_limit
  before insert on public.lot_cards for each row execute function public.enforce_free_tier_item_limit();

-- ---------- Limite foto per carta/lotto: 1 per il piano Free, 5 per Premium
-- (items, lots e lot_cards hanno tutti una colonna photo_paths). A differenza del
-- trigger sopra, questo deve girare anche su UPDATE (le foto si aggiungono anche
-- modificando una carta già esistente, non solo creandola) — ma solo quando il
-- numero di foto SALE rispetto a prima: altrimenti un utente che aveva 5 foto da
-- premium e poi torna free resterebbe bloccato nel modificare qualunque altro
-- campo di quella carta, anche senza toccare le foto.
--
-- Il numero "precedente" va letto con una query diretta sulla riga già su disco,
-- non da OLD: l'app usa sempre upsert() (INSERT ... ON CONFLICT ... DO UPDATE), e
-- Postgres esegue comunque il trigger BEFORE INSERT anche per le righe che
-- finiranno per essere un UPDATE per conflitto (la verifica del conflitto avviene
-- dopo i trigger BEFORE INSERT, non prima) — a quel punto TG_OP è 'INSERT' e OLD
-- è NULL, quindi fidarsi di OLD/TG_OP farebbe risultare old_count sempre 0 e
-- bloccherebbe qualunque modifica a una riga già sopra il limite.
create or replace function public.enforce_photo_limit()
returns trigger language plpgsql as $$
declare
  tier text;
  photo_limit int;
  new_count int := coalesce(array_length(new.photo_paths, 1), 0);
  old_count int;
begin
  execute format('select coalesce(array_length(photo_paths, 1), 0) from public.%I where id = $1', tg_table_name)
    into old_count using new.id;
  old_count := coalesce(old_count, 0);

  if new_count <= old_count then
    return new;
  end if;

  select subscription_tier into tier from public.profiles where id = new.user_id;
  photo_limit := case when tier = 'free' then 1 else 5 end;

  if new_count > photo_limit then
    raise exception 'PHOTO_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists items_enforce_photo_limit on public.items;
create trigger items_enforce_photo_limit
  before insert or update on public.items for each row execute function public.enforce_photo_limit();

drop trigger if exists lots_enforce_photo_limit on public.lots;
create trigger lots_enforce_photo_limit
  before insert or update on public.lots for each row execute function public.enforce_photo_limit();

drop trigger if exists lot_cards_enforce_photo_limit on public.lot_cards;
create trigger lot_cards_enforce_photo_limit
  before insert or update on public.lot_cards for each row execute function public.enforce_photo_limit();
