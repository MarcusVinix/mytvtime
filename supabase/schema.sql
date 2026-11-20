-- ============================================================
-- MyTVTime - Schema SQL para Supabase (PostgreSQL + RLS)
-- Cole e execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Tabela de Séries acompanhadas pelo usuário
create table if not exists public.user_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  backdrop_path text,
  status text not null default 'watching' check (status in ('watching', 'completed', 'plan_to_watch', 'stopped')),
  total_episodes integer not null default 0,
  number_of_seasons integer not null default 1,
  first_air_date date,
  next_episode_date date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

-- 2. Tabela de Episódios assistidos
create table if not exists public.watched_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  runtime_minutes integer not null default 45,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  watched_at timestamptz not null default now(),
  unique (user_id, tmdb_show_id, season_number, episode_number)
);

-- 3. Tabela de Filmes (Watchlist e Assistidos)
create table if not exists public.user_movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  backdrop_path text,
  release_date date,
  status text not null default 'watchlist' check (status in ('watchlist', 'watched')),
  runtime_minutes integer not null default 110,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  watched_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

-- Índices para performance
create index if not exists idx_user_shows_user on public.user_shows(user_id, updated_at desc);
create index if not exists idx_watched_episodes_user_show on public.watched_episodes(user_id, tmdb_show_id);
create index if not exists idx_user_movies_user on public.user_movies(user_id, updated_at desc);

-- Habilitar Row Level Security (RLS)
alter table public.user_shows enable row level security;
alter table public.watched_episodes enable row level security;
alter table public.user_movies enable row level security;

-- Políticas de segurança: cada usuário só acessa os próprios dados
drop policy if exists "Users manage own shows" on public.user_shows;
create policy "Users manage own shows"
  on public.user_shows
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own watched episodes" on public.watched_episodes;
create policy "Users manage own watched episodes"
  on public.watched_episodes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own movies" on public.user_movies;
create policy "Users manage own movies"
  on public.user_movies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
