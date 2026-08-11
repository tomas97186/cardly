-- Cardly — "scatole" fisiche (dove tieni davvero le carte), funzione Premium.
-- Esegui dopo entitlements.sql. Idempotente: rieseguibile in sicurezza.
--
-- Una scatola ha un `id` interno (generato da uid() lato client, come items/lots)
-- usato per i riferimenti da items/lots/lot_cards, e un `code` breve e leggibile
-- (es. "A1B2C3") pensato per essere scritto a mano o digitato come alternativa
-- alla scansione — è quello codificato nel QR, NON l'id interno. Il `code` resta
-- stabile anche se l'utente rinomina la scatola (`label`), così l'adesivo QR
-- stampato non va mai rifatto.

create table public.boxes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  code text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);
create index boxes_user_id_idx on public.boxes(user_id);
alter table public.boxes enable row level security;
create policy "boxes_all_own" on public.boxes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Un item/lotto/carta-di-lotto sta in AL PIÙ una scatola alla volta (è un oggetto
-- fisico, non può essere in due posti). on delete set null: eliminare la scatola
-- non elimina le carte, le lascia semplicemente senza posizione nota.
alter table public.items add column if not exists box_id text references public.boxes(id) on delete set null;
alter table public.lots add column if not exists box_id text references public.boxes(id) on delete set null;
alter table public.lot_cards add column if not exists box_id text references public.boxes(id) on delete set null;
create index if not exists items_box_id_idx on public.items(box_id);
create index if not exists lots_box_id_idx on public.lots(box_id);
create index if not exists lot_cards_box_id_idx on public.lot_cards(box_id);

-- ---------- Funzione Premium: creare una scatola, o assegnarne una (nuova o
-- diversa) a un item/lotto/carta, richiede il piano Premium. Le assegnazioni
-- già esistenti restano leggibili e modificabili (rimuovibili) anche per un
-- utente tornato Free — stesso principio "non toccare i dati passati" già usato
-- per il limite foto in entitlements.sql. ----------
create or replace function public.enforce_boxes_premium_only()
returns trigger language plpgsql as $$
declare
  already_exists boolean;
  tier text;
begin
  select exists(select 1 from public.boxes where id = new.id) into already_exists;
  if already_exists then
    return new; -- upsert usato per rinominare una scatola già esistente: non è una creazione
  end if;

  select subscription_tier into tier from public.profiles where id = new.user_id;
  if tier is distinct from 'free' then
    return new;
  end if;

  raise exception 'BOX_FEATURE_PREMIUM_ONLY' using errcode = 'P0001';
end;
$$;

drop trigger if exists boxes_enforce_premium on public.boxes;
create trigger boxes_enforce_premium
  before insert on public.boxes for each row execute function public.enforce_boxes_premium_only();

-- Stessa cautela di enforce_photo_limit in entitlements.sql: il "valore
-- precedente" va letto con una query diretta sulla riga già su disco, non da
-- OLD — l'app fa sempre upsert(), e Postgres esegue il trigger BEFORE INSERT
-- anche per le righe che finiranno per essere un UPDATE per conflitto (TG_OP
-- vale 'INSERT' e OLD è NULL in quel momento, prima ancora che scatti il
-- corrispondente BEFORE UPDATE) — fidarsi di TG_OP='UPDATE' per capire se è una
-- modifica bloccherebbe qualunque salvataggio su una riga già assegnata a una
-- scatola per un utente Free.
create or replace function public.enforce_box_assignment_premium_only()
returns trigger language plpgsql as $$Bu
declare
  tier text;
  old_box_id text;
begin
  if new.box_id is null then
    return new; -- rimuovere/non impostare una scatola è sempre permesso
  end if;

  execute format('select box_id from public.%I where id = $1', tg_table_name)
    into old_box_id using new.id;
  if new.box_id is not distinct from old_box_id then
    return new; -- modifica di un altro campo, l'assegnazione non cambia
  end if;

  select subscription_tier into tier from public.profiles where id = new.user_id;
  if tier is distinct from 'free' then
    return new;
  end if;

  raise exception 'BOX_FEATURE_PREMIUM_ONLY' using errcode = 'P0001';
end;
$$;

drop trigger if exists items_enforce_box_premium on public.items;
create trigger items_enforce_box_premium
  before insert or update on public.items for each row execute function public.enforce_box_assignment_premium_only();

drop trigger if exists lots_enforce_box_premium on public.lots;
create trigger lots_enforce_box_premium
  before insert or update on public.lots for each row execute function public.enforce_box_assignment_premium_only();

drop trigger if exists lot_cards_enforce_box_premium on public.lot_cards;
create trigger lot_cards_enforce_box_premium
  before insert or update on public.lot_cards for each row execute function public.enforce_box_assignment_premium_only();

-- ---------- search_global (pagination.sql) esteso con box_id, per il flusso
-- "aggiungi una carta che ho già" nel dettaglio di una scatola: la UI cerca tra
-- items/lot_cards e filtra lato client quelli con box_id nullo. `create or
-- replace` non basta perché cambia l'elenco di colonne restituite — va droppata
-- e ricreata.
drop function if exists public.search_global(text, int);

create function public.search_global(p_search text, p_limit int default 20)
returns table (
  id text, type text, name text, card_number text, sub_name text, lot_id text,
  game text, status text, unit_cost numeric, assigned_cost numeric, total_cost numeric,
  sale_price numeric, listing_price numeric, photo_paths text[],
  quantity int, cataloged_count int, box_id text
)
language sql stable security invoker as $$
  with q as (select nullif(trim(coalesce(p_search, '')), '') as term)
  select i.id, 'item'::text as type, i.name, i.card_number, i.set_name as sub_name, null::text as lot_id,
         i.game, i.status, i.unit_cost, null::numeric, null::numeric,
         s.price, i.listing_price, i.photo_paths, null::int, null::int, i.box_id
  from public.items i
  left join public.sales s on s.id = i.sale_id
  cross join q
  where i.user_id = auth.uid() and q.term is not null
    and (i.name ilike '%'||q.term||'%' or i.set_name ilike '%'||q.term||'%' or i.card_number ilike '%'||q.term||'%')

  union all

  select l.id, 'lot'::text as type, l.lot_name, null::text, null::text, null::text,
         l.game, null::text, null::numeric, null::numeric, l.total_cost,
         null::numeric, null::numeric, l.photo_paths,
         l.quantity, (select count(*)::int from public.lot_cards lc where lc.lot_id = l.id), l.box_id
  from public.lots l
  cross join q
  where l.user_id = auth.uid() and q.term is not null and l.lot_name ilike '%'||q.term||'%'

  union all

  select lc.id, 'lotCard'::text as type, lc.name, lc.card_number, l2.lot_name, lc.lot_id,
         lc.game, lc.status, null::numeric, lc.assigned_cost, null::numeric,
         s.price, lc.listing_price, lc.photo_paths, null::int, null::int, lc.box_id
  from public.lot_cards lc
  join public.lots l2 on l2.id = lc.lot_id
  left join public.sales s on s.id = lc.sale_id
  cross join q
  where lc.user_id = auth.uid() and q.term is not null
    and (lc.name ilike '%'||q.term||'%' or lc.set_name ilike '%'||q.term||'%' or lc.card_number ilike '%'||q.term||'%')

  limit p_limit;
$$;

grant execute on function public.search_global to authenticated;
