-- ============================================================
-- MyTVTime - Migração Fase 2: Listas Personalizadas
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

create table if not exists public.custom_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.custom_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('tv', 'movie')),
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  added_at timestamptz not null default now(),
  unique (list_id, media_type, tmdb_id)
);

create index if not exists idx_custom_lists_user on public.custom_lists(user_id, updated_at desc);
create index if not exists idx_custom_list_items_list on public.custom_list_items(list_id, added_at desc);

alter table public.custom_lists enable row level security;
alter table public.custom_list_items enable row level security;

drop policy if exists "Users manage own custom lists" on public.custom_lists;
create policy "Users manage own custom lists"
  on public.custom_lists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own custom list items" on public.custom_list_items;
create policy "Users manage own custom list items"
  on public.custom_list_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
