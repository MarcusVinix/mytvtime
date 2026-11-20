-- ============================================================
-- MyTVTime - Migração Fase 3:
-- Avaliações, Reações, Notas, Favoritos, Rewatch, Gêneros e Web Push
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Novas colunas em user_shows
alter table public.user_shows
  add column if not exists rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  add column if not exists reaction text,
  add column if not exists notes text,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists rewatch_count integer not null default 0,
  add column if not exists genres text[] not null default '{}';

-- 2. Novas colunas em watched_episodes
alter table public.watched_episodes
  add column if not exists reaction text,
  add column if not exists notes text;

-- 3. Novas colunas em user_movies
alter table public.user_movies
  add column if not exists reaction text,
  add column if not exists notes text,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists rewatch_count integer not null default 0,
  add column if not exists genres text[] not null default '{}';

-- 4. Tabela de assinaturas Web Push (Notificações em segundo plano)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
