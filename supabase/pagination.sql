-- Cardly — indici + query mirate per paginazione/filtri/ricerca lato server.
-- Idempotente (if not exists / or replace): sicuro da rieseguire nell'SQL Editor del
-- progetto Supabase esistente, dopo aver già applicato schema.sql una volta.

create extension if not exists pg_trgm;

-- ---------- Indici per i filtri/ordinamenti usati da search_inventory / v_listed_units ----

create index if not exists items_status_idx on public.items(user_id, status);
create index if not exists items_game_idx on public.items(user_id, game);
create index if not exists items_purchase_date_idx on public.items(user_id, purchase_date);
create index if not exists items_created_at_idx on public.items(user_id, created_at);
create index if not exists items_name_trgm_idx on public.items using gin (name gin_trgm_ops);
create index if not exists items_set_name_trgm_idx on public.items using gin (set_name gin_trgm_ops);
create index if not exists items_card_number_trgm_idx on public.items using gin (card_number gin_trgm_ops);

create index if not exists lots_game_idx on public.lots(user_id, game);
create index if not exists lots_purchase_date_idx on public.lots(user_id, purchase_date);
create index if not exists lots_created_at_idx on public.lots(user_id, created_at);
create index if not exists lots_lot_name_trgm_idx on public.lots using gin (lot_name gin_trgm_ops);

create index if not exists lot_cards_status_idx on public.lot_cards(user_id, status);
create index if not exists lot_cards_name_trgm_idx on public.lot_cards using gin (name gin_trgm_ops);
create index if not exists lot_cards_set_name_trgm_idx on public.lot_cards using gin (set_name gin_trgm_ops);
create index if not exists lot_cards_card_number_trgm_idx on public.lot_cards using gin (card_number gin_trgm_ops);

create index if not exists sales_sale_date_idx on public.sales(user_id, sale_date);

-- ---------- search_inventory: paginazione + filtri + ordinamento per la scheda Inventario ----
-- Unisce items (kind='singola') e lots (kind='lotto'); un lotto matcha i filtri
-- graded/category/search anche se solo una delle sue lot_cards li soddisfa (stessa
-- semantica "any card in the lot" del filtro client-side che sostituisce, vedi
-- App.jsx). Ogni lotto porta con sé sold_count/listed_count/cards_count già
-- aggregati: l'Inventario in griglia non ha più bisogno delle carte intere, solo di
-- questi conteggi — le carte si caricano a parte, solo quando il lotto si apre.
create or replace function public.search_inventory(
  p_search text default null,
  p_game text default null,
  p_kind text default null,
  p_status text default null,
  p_graded text default null,
  p_category text default null,
  p_sort text default 'recent',
  p_limit int default 60,
  p_offset int default 0
)
returns table (
  id text,
  kind text,
  game text,
  name text,
  set_name text,
  card_number text,
  condition text,
  category text,
  grading_company text,
  grade text,
  unit_cost numeric,
  total_cost numeric,
  quantity int,
  purchase_date date,
  source text,
  purchase_notes text,
  photo_paths text[],
  status text,
  sale_id text,
  sale_price numeric,
  sale_group_total numeric,
  sale_group_size int,
  sale_date date,
  listing_price numeric,
  listing_platform text,
  listing_link text,
  listing_date date,
  listing_notes text,
  created_at timestamptz,
  sold_count int,
  listed_count int,
  cards_count int,
  total_count bigint
)
language sql stable security invoker as $$
  with base as (
    select
      i.id, 'singola'::text as kind, i.game, i.name, i.set_name, i.card_number, i.condition,
      i.category, i.grading_company, i.grade, i.unit_cost, null::numeric as total_cost,
      null::int as quantity, i.purchase_date, i.source, i.purchase_notes, i.photo_paths,
      i.status, i.sale_id, s.price as sale_price, s.group_total as sale_group_total,
      s.group_size as sale_group_size, s.sale_date, i.listing_price, i.listing_platform,
      i.listing_link, i.listing_date, i.listing_notes, i.created_at,
      null::int as sold_count, null::int as listed_count, null::int as cards_count
    from public.items i
    left join public.sales s on s.id = i.sale_id
    where i.user_id = auth.uid()
      and (p_kind is null or p_kind = 'all' or p_kind = 'singola')
      and (p_game is null or p_game = 'all' or i.game = p_game)
      and (p_status is null or p_status = 'all' or i.status = p_status)
      and (
        p_graded is null or p_graded = 'all'
        or (p_graded = 'graded' and i.grading_company is not null)
        or (p_graded = 'notGraded' and i.grading_company is null)
      )
      and (p_category is null or p_category = 'all' or i.category = p_category)
      and (
        p_search is null or p_search = ''
        or i.name ilike '%'||p_search||'%'
        or i.set_name ilike '%'||p_search||'%'
      )

    union all

    select
      l.id, 'lotto'::text as kind, l.game, l.lot_name as name, null::text as set_name,
      null::text as card_number, null::text as condition, null::text as category,
      null::text as grading_company, null::text as grade, null::numeric as unit_cost,
      l.total_cost, l.quantity, l.purchase_date, l.source, l.purchase_notes, l.photo_paths,
      null::text as status,
      null::text as sale_id, null::numeric as sale_price, null::numeric as sale_group_total,
      null::int as sale_group_size, null::date as sale_date,
      null::numeric as listing_price, null::text as listing_platform, null::text as listing_link,
      null::date as listing_date, null::text as listing_notes, l.created_at,
      coalesce(agg.sold_count, 0)::int as sold_count,
      coalesce(agg.listed_count, 0)::int as listed_count,
      coalesce(agg.cards_count, 0)::int as cards_count
    from public.lots l
    left join lateral (
      select
        count(*) as cards_count,
        count(*) filter (where lc.status = 'sold') as sold_count,
        count(*) filter (where lc.status = 'listed') as listed_count
      from public.lot_cards lc where lc.lot_id = l.id
    ) agg on true
    where l.user_id = auth.uid()
      and (p_kind is null or p_kind = 'all' or p_kind = 'lotto')
      and (p_game is null or p_game = 'all' or l.game = p_game)
      and (
        p_status is null or p_status = 'all'
        or (p_status = 'sold' and exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.status = 'sold'))
        or (p_status = 'listed' and exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.status = 'listed'))
        or (p_status = 'in_stock' and (
              coalesce(agg.cards_count, 0) < l.quantity
              or exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.status = 'in_stock')
            ))
      )
      and (
        p_graded is null or p_graded = 'all'
        or (p_graded = 'graded' and exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.grading_company is not null))
        or (p_graded = 'notGraded' and not exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.grading_company is not null))
      )
      and (
        p_category is null or p_category = 'all'
        or exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.category = p_category)
      )
      and (
        p_search is null or p_search = ''
        or l.lot_name ilike '%'||p_search||'%'
        or exists (select 1 from public.lot_cards lc where lc.lot_id = l.id and lc.name ilike '%'||p_search||'%')
      )
  )
  select b.*, count(*) over ()::bigint as total_count
  from base b
  order by
    case when p_sort = 'oldest' then b.created_at end asc,
    case when p_sort = 'name_asc' then b.name end asc,
    case when p_sort = 'name_z' then b.name end desc,
    case when p_sort = 'price_desc' then coalesce(b.unit_cost, b.total_cost) end desc nulls last,
    case when p_sort = 'price_asc' then coalesce(b.unit_cost, b.total_cost) end asc nulls last,
    b.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_inventory to authenticated;

-- ---------- search_global: ricerca rapida per la lente in alto (nome/set/numero) ----
-- Stessa forma a 3 esiti della ricerca globale attuale: carta singola, lotto (per
-- nome), o singola carta dentro un lotto (indipendentemente dal fatto che il nome
-- del lotto stesso abbia fatto match) — non paginata, solo un tetto (p_limit).
create or replace function public.search_global(p_search text, p_limit int default 20)
returns table (
  id text, type text, name text, card_number text, sub_name text, lot_id text,
  game text, status text, unit_cost numeric, assigned_cost numeric, total_cost numeric,
  sale_price numeric, listing_price numeric, photo_paths text[],
  quantity int, cataloged_count int
)
language sql stable security invoker as $$
  with q as (select nullif(trim(coalesce(p_search, '')), '') as term)
  select i.id, 'item'::text as type, i.name, i.card_number, i.set_name as sub_name, null::text as lot_id,
         i.game, i.status, i.unit_cost, null::numeric, null::numeric,
         s.price, i.listing_price, i.photo_paths, null::int, null::int
  from public.items i
  left join public.sales s on s.id = i.sale_id
  cross join q
  where i.user_id = auth.uid() and q.term is not null
    and (i.name ilike '%'||q.term||'%' or i.set_name ilike '%'||q.term||'%' or i.card_number ilike '%'||q.term||'%')

  union all

  select l.id, 'lot'::text as type, l.lot_name, null::text, null::text, null::text,
         l.game, null::text, null::numeric, null::numeric, l.total_cost,
         null::numeric, null::numeric, l.photo_paths,
         l.quantity, (select count(*)::int from public.lot_cards lc where lc.lot_id = l.id)
  from public.lots l
  cross join q
  where l.user_id = auth.uid() and q.term is not null and l.lot_name ilike '%'||q.term||'%'

  union all

  select lc.id, 'lotCard'::text as type, lc.name, lc.card_number, l2.lot_name, lc.lot_id,
         lc.game, lc.status, null::numeric, lc.assigned_cost, null::numeric,
         s.price, lc.listing_price, lc.photo_paths, null::int, null::int
  from public.lot_cards lc
  join public.lots l2 on l2.id = lc.lot_id
  left join public.sales s on s.id = lc.sale_id
  cross join q
  where lc.user_id = auth.uid() and q.term is not null
    and (lc.name ilike '%'||q.term||'%' or lc.set_name ilike '%'||q.term||'%' or lc.card_number ilike '%'||q.term||'%')

  limit p_limit;
$$;

grant execute on function public.search_global to authenticated;

-- ---------- v_listed_units: tutto ciò che è "in vendita", items + lot_cards -----------
-- Niente logica di vendita di gruppo qui (le inserzioni non hanno quel concetto),
-- quindi una semplice union normalizzata basta — la scheda "In Vendita" interroga
-- questa vista con normali filtri/ordinamento/range() di PostgREST.
create or replace view public.v_listed_units
with (security_invoker = true) as
  select
    i.id, 'singola'::text as kind, i.game, i.name, null::text as lot_name, null::text as lot_id, i.photo_paths,
    i.listing_price, i.listing_platform, i.listing_link, i.listing_date, i.listing_notes,
    i.user_id
  from public.items i
  where i.status = 'listed'
  union all
  select
    lc.id, 'lotCard'::text as kind, lc.game, lc.name, l.lot_name, lc.lot_id, lc.photo_paths,
    lc.listing_price, lc.listing_platform, lc.listing_link, lc.listing_date, lc.listing_notes,
    lc.user_id
  from public.lot_cards lc
  join public.lots l on l.id = lc.lot_id
  where lc.status = 'listed';

grant select on public.v_listed_units to authenticated;

-- ---------- search_listed_units: paginazione + ricerca + filtri per "In Vendita" ----
-- Stessa unione di v_listed_units, ma come funzione (non vista) così la ricerca può
-- passare il termine come parametro SQL vero invece che dentro la sintassi filtro di
-- PostgREST (.or()), che si romperebbe su nomi contenenti virgole o parentesi.
create or replace function public.search_listed_units(
  p_search text default null,
  p_platform text default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_sort text default 'recent',
  p_limit int default 60,
  p_offset int default 0
)
returns table (
  id text, kind text, game text, name text, lot_name text, lot_id text, photo_paths text[],
  listing_price numeric, listing_platform text, listing_link text, listing_date date, listing_notes text,
  total_count bigint
)
language sql stable security invoker as $$
  with base as (
    select
      i.id, 'singola'::text as kind, i.game, i.name, null::text as lot_name, null::text as lot_id, i.photo_paths,
      i.listing_price, i.listing_platform, i.listing_link, i.listing_date, i.listing_notes
    from public.items i
    where i.user_id = auth.uid() and i.status = 'listed'
      and (p_platform is null or p_platform = 'all' or i.listing_platform = p_platform)
      and (p_price_min is null or i.listing_price >= p_price_min)
      and (p_price_max is null or i.listing_price <= p_price_max)
      and (p_search is null or p_search = '' or i.name ilike '%'||p_search||'%')

    union all

    select
      lc.id, 'lotCard'::text as kind, lc.game, lc.name, l.lot_name, lc.lot_id, lc.photo_paths,
      lc.listing_price, lc.listing_platform, lc.listing_link, lc.listing_date, lc.listing_notes
    from public.lot_cards lc
    join public.lots l on l.id = lc.lot_id
    where lc.user_id = auth.uid() and lc.status = 'listed'
      and (p_platform is null or p_platform = 'all' or lc.listing_platform = p_platform)
      and (p_price_min is null or lc.listing_price >= p_price_min)
      and (p_price_max is null or lc.listing_price <= p_price_max)
      and (p_search is null or p_search = '' or lc.name ilike '%'||p_search||'%' or l.lot_name ilike '%'||p_search||'%')
  )
  select b.*, count(*) over ()::bigint as total_count
  from base b
  order by
    case when p_sort = 'oldest' then b.listing_date end asc,
    case when p_sort = 'name_asc' then b.name end asc,
    case when p_sort = 'name_z' then b.name end desc,
    case when p_sort = 'price_desc' then b.listing_price end desc nulls last,
    case when p_sort = 'price_asc' then b.listing_price end asc nulls last,
    b.listing_date desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_listed_units to authenticated;
