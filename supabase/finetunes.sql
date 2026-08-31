-- FutureBox — a sound of your own, trained on your own songs.
--
-- Run this after schema.sql in the same project. Safe to run again.
--
-- ElevenLabs will train a music model on a handful of tracks and then generate
-- in that sound. The interesting part is not the API call; it is who is allowed
-- to press it. Training a model on somebody else's records is exactly the thing
-- that gets a music app taken down, and ElevenLabs will block it on their side
-- too — `failure_reason` has a `copyright_violation` in it for that reason.
--
-- So FutureBox trains from the channel: songs this app generated, for this
-- person, which we can see were generated here. The confirmation is recorded
-- with the finetune, in words, because a claim of ownership that cannot be
-- produced afterwards is not a claim of anything.
--
-- The same ownership problem as cloned voices, for the same reason: there is
-- one ElevenLabs account behind the whole app, so without this table every
-- finetune anybody trained would be listed and usable by everybody. Their API
-- has no notion of our users, so the ownership is ours to keep.

create table if not exists public.finetunes (
  -- ElevenLabs' own finetune id.
  id            text primary key,
  owner         uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  -- What it was trained to sound like, as the person described it.
  genre         text not null default '',
  -- 'channel' means every training file was a song FutureBox made in this
  -- account; 'brought' means the person uploaded their own recordings and said
  -- in words that the music is theirs. The distinction matters when a takedown
  -- arrives, so it is stored rather than inferred.
  origin        text not null default 'channel'
                check (origin in ('channel', 'brought')),
  -- How many tracks it learned from, kept for the screen and for support.
  tracks        integer not null default 0,
  -- Where training got to, mirrored from ElevenLabs on each look.
  --
  -- Mirrored rather than asked every time: once a finetune is finished it
  -- stays finished, so a screen that polls does not need to call them once per
  -- row per refresh forever. Only the unfinished ones are asked about again.
  status        text not null default 'pending'
                check (status in ('pending', 'in_progress', 'completed', 'failed', 'blocked')),
  -- Their reason when it failed or was blocked. `copyright_violation` is the
  -- one worth showing in plain words rather than swallowing.
  why           text,
  -- Recorded, and confirmed by the person that the music is theirs to train on.
  confirmed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists finetunes_owner_idx on public.finetunes (owner);

alter table public.finetunes enable row level security;

-- Reading your own is all a browser ever needs; every write goes through the
-- server, which holds the ElevenLabs key anyway.
drop policy if exists "read own finetunes" on public.finetunes;
create policy "read own finetunes" on public.finetunes
  for select using (auth.uid() = owner);
