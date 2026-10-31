-- One table for the newer games (noughts-and-crosses, times-tables, spelling).
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run.
create table if not exists public.arcade_scores (
  id         bigint generated always as identity primary key,
  game       text        not null check (game in ('noughts','times-tables','spelling')),
  name       text        not null check (char_length(btrim(name)) between 1 and 16),
  points     integer     not null check (points between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists arcade_scores_game_created on public.arcade_scores (game, created_at desc);

alter table public.arcade_scores enable row level security;
drop policy if exists "anyone can read scores" on public.arcade_scores;
drop policy if exists "anyone can add a score" on public.arcade_scores;
create policy "anyone can read scores" on public.arcade_scores for select to anon using (true);
create policy "anyone can add a score" on public.arcade_scores for insert to anon with check (true);
grant select, insert on public.arcade_scores to anon;
