-- Cardly — schema Supabase (Postgres + Auth + Storage)
-- Esegui questo intero file una sola volta nel SQL Editor del tuo progetto Supabase
-- (supabase.com/dashboard/project/_/sql/new).

create extension if not exists pgcrypto;

-- ---------- profiles: hook per funzioni a pagamento future, non usato oggi ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- sales: una riga per evento di vendita; condivisa da piu' items/lot_cards
-- nelle vendite multiple ----------
-- Nota: id/lot_id/sale_id sono `text`, non `uuid` — l'app genera i propri id lato
-- client (uid() in src/lib/format.js, es. "mshmh5vh0zdxym"), non UUID veri.
create table public.sales (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  price numeric(10,2),
  group_total numeric(10,2),
  group_size int,
  sale_date date not null,
  buyer text, carrier text, tracking text, notes text,
  created_at timestamptz not null default now()
);
create index sales_user_id_idx on public.sales(user_id);
alter table public.sales enable row level security;
create policy "sales_all_own" on public.sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.lots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lot_name text not null,
  game text not null,
  total_cost numeric(10,2) not null default 0,
  quantity int not null default 1,
  purchase_date date, source text, purchase_notes text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index lots_user_id_idx on public.lots(user_id);
alter table public.lots enable row level security;
create policy "lots_all_own" on public.lots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game text not null, name text not null, set_name text, card_number text,
  condition text, category text, language text, grading_company text, grade text,
  unit_cost numeric(10,2), purchase_date date, source text, purchase_notes text,
  photo_paths text[] not null default '{}',
  status text not null default 'in_stock' check (status in ('in_stock', 'listed', 'sold')),
  sale_id text references public.sales(id) on delete set null,
  listing_price numeric(10,2), listing_platform text, listing_link text,
  listing_date date, listing_notes text,
  created_at timestamptz not null default now()
);
create index items_user_id_idx on public.items(user_id);
create index items_sale_id_idx on public.items(sale_id);
alter table public.items enable row level security;
create policy "items_all_own" on public.items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.lot_cards (
  id text primary key,
  lot_id text not null references public.lots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text, game text, set_name text, card_number text, condition text, category text,
  language text, grading_company text, grade text, assigned_cost numeric(10,2),
  photo_paths text[] not null default '{}',
  status text not null default 'in_stock' check (status in ('in_stock', 'listed', 'sold')),
  sale_id text references public.sales(id) on delete set null,
  listing_price numeric(10,2), listing_platform text, listing_link text,
  listing_date date, listing_notes text,
  created_at timestamptz not null default now()
);
create index lot_cards_lot_id_idx on public.lot_cards(lot_id);
create index lot_cards_user_id_idx on public.lot_cards(user_id);
create index lot_cards_sale_id_idx on public.lot_cards(sale_id);
alter table public.lot_cards enable row level security;
create policy "lot_cards_all_own" on public.lot_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.catalog_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  key text not null, label text not null, color text not null, sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
alter table public.catalog_games enable row level security;
create policy "catalog_games_all_own" on public.catalog_games for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.catalog_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.catalog_platforms enable row level security;
create policy "catalog_platforms_all_own" on public.catalog_platforms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.catalog_grading_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.catalog_grading_companies enable row level security;
create policy "catalog_grading_companies_all_own" on public.catalog_grading_companies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Storage bucket privato per le foto, RLS per cartella = user id ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos_select_own" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_insert_own" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_update_own" on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos_delete_own" on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Dopo questo file: esegui anche pagination.sql ----------
-- Aggiunge gli indici e le query (search_inventory, search_global, v_listed_units)
-- che l'app usa per paginare/filtrare/cercare senza caricare l'intero inventario ad
-- ogni avvio. Tenuto in un file separato (invece che duplicato qui) per avere
-- un'unica fonte di verità; è idempotente, quindi rieseguibile in sicurezza.
