-- FutureBox — accounts and channels.
--
-- Run this once in your Supabase project's SQL editor. It is safe to run again;
-- every statement checks first.
--
-- What it sets up:
--   * a `tracks` table, one row per song, owned by the person who made it
--   * a `tracks` storage bucket for the audio files
--   * row-level policies so a signed-in person reaches their own channel and
--     nobody else's — this is what makes the public anon key safe in a browser
--
-- Auth itself needs no SQL: Supabase provides email and password sign-in out of
-- the box. Under Authentication → Providers you decide whether new accounts
-- must confirm their email address first. Leaving that on is the safer default;
-- the app handles both, and says which one happened.

create table if not exists public.tracks (
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  genre       text not null default '',
  bpm         integer not null default 120,
  song_key    text not null default 'C',
  lyrics      text not null default '',
  style       text not null default '',
  models      text[] not null default '{}',
  source      text not null default 'sketch',
  seconds     integer not null default 0,
  created_at  timestamptz not null default now(),
  remix_of    text,
  seed        bigint not null default 0
);

create index if not exists tracks_owner_created_idx
  on public.tracks (owner, created_at desc);

alter table public.tracks enable row level security;

-- Four policies, one per verb. Each says the same thing: the row's owner must
-- be the person asking. `with check` covers rows being written, `using` covers
-- rows being read or matched.
drop policy if exists "read own tracks" on public.tracks;
create policy "read own tracks" on public.tracks
  for select using (auth.uid() = owner);

drop policy if exists "insert own tracks" on public.tracks;
create policy "insert own tracks" on public.tracks
  for insert with check (auth.uid() = owner);

drop policy if exists "update own tracks" on public.tracks;
create policy "update own tracks" on public.tracks
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own tracks" on public.tracks;
create policy "delete own tracks" on public.tracks
  for delete using (auth.uid() = owner);

-- The audio itself. Private, not public: files come out through a signed
-- request from the account that owns them.
insert into storage.buckets (id, name, public)
values ('tracks', 'tracks', false)
on conflict (id) do nothing;

-- The app stores each file at `<user-id>/<track-id>.wav`, so the first path
-- segment is the owner. That is what these policies check.
drop policy if exists "read own audio" on storage.objects;
create policy "read own audio" on storage.objects
  for select using (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "write own audio" on storage.objects;
create policy "write own audio" on storage.objects
  for insert with check (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "replace own audio" on storage.objects;
create policy "replace own audio" on storage.objects
  for update using (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete own audio" on storage.objects;
create policy "delete own audio" on storage.objects
  for delete using (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );
