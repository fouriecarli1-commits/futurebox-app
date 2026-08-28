-- FutureBox — metering and purchases.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Why this exists: the free tier's caps used to live in localStorage, in the
-- visitor's own browser. Anyone could clear site data and start over, which was
-- a design note while generating cost nothing and is an open tap on the owner's
-- ElevenLabs account now that it does. A limit the client enforces is not a
-- limit. These tables move the count somewhere the client cannot reach.
--
-- Two tables:
--   * `generations` — one row per song made, so the day's count is a fact
--   * `purchases`   — one row per song opened or bought, so the download gate
--                     has something to check
--
-- Both are written by the server with the caller's own identity, and the
-- policies below let a person read their own rows and nothing else. Nobody can
-- insert a purchase from the browser: that is the whole point of the gate.

-- ────────────────────────────────────────────────────────── generations ────

create table if not exists public.generations (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- 'preview' is the short watermarked one; 'full' is the whole song.
  kind        text not null check (kind in ('preview', 'full')),
  seconds     integer not null default 0,
  -- Which track this produced, when it produced one.
  track_id    text,
  -- What it cost us, in credits, so spend can be read without guessing.
  credits     integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists generations_owner_day_idx
  on public.generations (owner, created_at desc);

alter table public.generations enable row level security;

-- Read your own; never write from the browser. The server writes these with
-- the service role, which bypasses RLS by design.
drop policy if exists "read own generations" on public.generations;
create policy "read own generations" on public.generations
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── purchases ────

create table if not exists public.purchases (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  track_id    text not null,
  -- 'opened' unlocked the full length; 'owned' removed the watermark and
  -- allows the download. 'owned' implies 'opened'.
  level       text not null check (level in ('opened', 'owned')),
  -- In cents, so no float ever touches money.
  amount_cents integer not null default 0,
  currency    text not null default 'ZAR',
  -- The payment provider's own reference, for reconciliation.
  reference   text,
  created_at  timestamptz not null default now(),
  unique (owner, track_id, level)
);

create index if not exists purchases_owner_track_idx
  on public.purchases (owner, track_id);

alter table public.purchases enable row level security;

drop policy if exists "read own purchases" on public.purchases;
create policy "read own purchases" on public.purchases
  for select using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────────── profiles ───

-- Which tier someone is on. Written by the server when a subscription starts
-- or lapses; never by the browser, or the tiers would be a suggestion.
create table if not exists public.memberships (
  owner       uuid primary key references auth.users (id) on delete cascade,
  tier        text not null default 'free' check (tier in ('free','maker','studio','label')),
  -- When the current period ends. Null means it does not.
  renews_at   timestamptz,
  reference   text,
  updated_at  timestamptz not null default now()
);

alter table public.memberships enable row level security;

drop policy if exists "read own membership" on public.memberships;
create policy "read own membership" on public.memberships
  for select using (auth.uid() = owner);

-- ───────────────────────────────────────────────────────────── counting ────

-- Today's generations for one person, by kind. Used by the server before it
-- spends anything. Defined here rather than in the app so the definition of
-- "today" cannot differ between two callers.
create or replace function public.generations_today(p_owner uuid)
returns table (kind text, used bigint)
language sql
stable
as $$
  select g.kind, count(*)
  from public.generations g
  where g.owner = p_owner
    and g.created_at >= date_trunc('day', now())
  group by g.kind;
$$;
