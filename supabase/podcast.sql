-- FutureBox — podcast shows, episodes, and the voices that read them.
--
-- Run this after schema.sql, usage.sql and events.sql, in the same project.
-- Safe to run again.
--
-- What this is for: somebody brings a show to FutureBox and gets a real one —
-- a channel with a name and a picture, episodes people can play, a feed that
-- Apple Podcasts and Spotify will accept, and links out to wherever their
-- audience already is. Not a demo of a podcast page.
--
-- One decision worth stating, because it cannot be undone quietly later: the
-- episode audio bucket is **public**. Podcast apps fetch the file from an
-- ordinary URL, on their own schedule, for years — a signed link that expires
-- in an hour is a show that stops working by lunchtime. Anything published
-- here is published, and the app says so before the button is pressed.

-- ─────────────────────────────────────────────────────────────── voices ────

-- A cloned voice belongs to one person and is usable by nobody else.
--
-- The ElevenLabs account behind the app is a single account, so without this
-- table every clone anybody made would be visible and usable by everybody
-- else. That is the whole reason it exists: the ownership is ours to enforce,
-- because their API has no notion of our users.
create table if not exists public.voices (
  -- ElevenLabs' own voice id.
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  -- Recorded, and confirmed by the person that it is their own voice. Stored
  -- because consent that cannot be produced later is not consent.
  consented_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists voices_owner_idx on public.voices (owner);

alter table public.voices enable row level security;

drop policy if exists "read own voices" on public.voices;
create policy "read own voices" on public.voices
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────────── shows ────

create table if not exists public.shows (
  -- The slug in the feed's address, so it has to be stable and readable.
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  about       text not null default '',
  author      text not null default '',
  image_url   text,
  -- Two letters. Apple rejects a feed whose language it cannot read.
  language    text not null default 'en',
  -- Where the audience already is: {"x": "...", "instagram": "...", ...}.
  links       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists shows_owner_idx on public.shows (owner);

alter table public.shows enable row level security;

-- A published show is public by nature — the feed is meant to be fetched by
-- anybody's podcast app. Writing is still the owner's alone.
drop policy if exists "read shows" on public.shows;
create policy "read shows" on public.shows for select using (true);

-- ───────────────────────────────────────────────────────────── episodes ────

create table if not exists public.episodes (
  id           text primary key,
  show_id      text not null references public.shows (id) on delete cascade,
  owner        uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  notes        text not null default '',
  -- Path inside the public `episodes` bucket.
  audio_path   text not null,
  seconds      integer not null default 0,
  bytes        bigint not null default 0,
  -- How it was made, and it is printed on the episode.
  --   recorded — a person at a microphone
  --   cleaned  — that recording, with the room taken out of it
  --   spoken   — read aloud by a cloned voice from a script
  -- The provenance rule this app already applies to lectures applies here: a
  -- listener must never have to work out unaided that a voice was synthesised.
  made         text not null default 'recorded' check (made in ('recorded', 'cleaned', 'spoken')),
  published_at timestamptz not null default now()
);

create index if not exists episodes_show_idx on public.episodes (show_id, published_at desc);

alter table public.episodes enable row level security;

drop policy if exists "read episodes" on public.episodes;
create policy "read episodes" on public.episodes for select using (true);

-- ─────────────────────────────────────────────────────────────── bucket ────

insert into storage.buckets (id, name, public)
values ('episodes', 'episodes', true)
on conflict (id) do update set public = true;

-- Anyone may read a published episode; only its owner may put one there. The
-- first path segment is the owner's id, which is what ties a file to a person.
drop policy if exists "read episodes audio" on storage.objects;
create policy "read episodes audio" on storage.objects
  for select using (bucket_id = 'episodes');

drop policy if exists "write own episodes audio" on storage.objects;
create policy "write own episodes audio" on storage.objects
  for insert with check (
    bucket_id = 'episodes' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "replace own episodes audio" on storage.objects;
create policy "replace own episodes audio" on storage.objects
  for update using (
    bucket_id = 'episodes' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "delete own episodes audio" on storage.objects;
create policy "delete own episodes audio" on storage.objects
  for delete using (
    bucket_id = 'episodes' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ────────────────────────────────────────────────────────── the day's use ──

-- One row per script read aloud, so the day's use is a fact rather than
-- something the browser reports about itself. Same reasoning as `generations`:
-- a limit the client enforces is not a limit.
create table if not exists public.speech_runs (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  characters  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists speech_runs_owner_day_idx
  on public.speech_runs (owner, created_at desc);

alter table public.speech_runs enable row level security;

drop policy if exists "read own speech" on public.speech_runs;
create policy "read own speech" on public.speech_runs
  for select using (auth.uid() = owner);

-- How many times today, defined here so two callers cannot disagree about
-- where the day starts.
create or replace function public.speech_today(p_owner uuid)
returns bigint
language sql
stable
as $$
  select count(*)
  from public.speech_runs
  where owner = p_owner
    and created_at >= date_trunc('day', now());
$$;
