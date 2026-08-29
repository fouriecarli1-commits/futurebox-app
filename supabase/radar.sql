-- FutureBox — the collab radar: who else is making something near your sound.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- The radar matched demo tracks against demo tracks, which made it a
-- demonstration of matching rather than a way to find anybody. Matching real
-- people needs two things that did not exist: songs their makers have chosen
-- to show, and a name to put on a match.
--
-- **Sharing is opt-in and per song.** A track is private until its owner turns
-- it on, one at a time. Nothing here makes anything public by default, and the
-- audio is not shared at all — only what a match is computed from: tempo, key,
-- the style words, the title. Somebody looking for a collaborator does not need
-- the file, and handing it over would be a licence question nobody agreed to.

-- ─────────────────────────────────────────────────────── shared tracks ────

alter table public.tracks
  add column if not exists shared boolean not null default false;

create index if not exists tracks_shared_idx
  on public.tracks (shared, created_at desc) where shared;

-- The existing policy lets you read your own. This adds the shared ones, which
-- is additive: policies for the same command are ORed together, so nobody
-- loses access to their own rows.
drop policy if exists "read shared tracks" on public.tracks;
create policy "read shared tracks" on public.tracks
  for select using (shared = true);

-- ────────────────────────────────────────────────────────────── creators ────

-- A name and a way to be reached, for people who put a song on the radar.
--
-- Separate from `shows` on purpose: somebody can be looking for a collaborator
-- without running a podcast, and tying the two together would mean making a
-- show to be findable.
create table if not exists public.creators (
  owner       uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  -- What appears as @handle. Unique, because it is how one creator is told
  -- from another in a list.
  handle      text unique,
  about       text not null default '',
  -- {"x": "https://…", "instagram": "https://…", …}. Only ever https links.
  links       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.creators enable row level security;

-- Public to read: the whole point is being found. Writing is your own alone,
-- and the server does that with the service role after checking the token.
drop policy if exists "read creators" on public.creators;
create policy "read creators" on public.creators for select using (true);
