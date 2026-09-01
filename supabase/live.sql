-- FutureBox — the live channel.
--
-- Run this after schema.sql, podcast.sql and presence.sql, in the same
-- project. Safe to run again.
--
-- ── What this is ─────────────────────────────────────────────────────────
--
-- One room, shared by everybody: people put a song in it, other people listen
-- to each other's, and you can see who is in there with you. That is the whole
-- idea and it is deliberately one room rather than a room each — a channel
-- with four people in it is a place, and forty rooms with one person in each
-- is nobody.
--
-- It also holds the other kind of live, which is somebody going live somewhere
-- this app cannot broadcast to. FutureBox has no media server: it cannot carry
-- a microphone or a camera to an audience, and a "Go live" button that quietly
-- did nothing would be the worst thing on the site. What it can do honestly is
-- say *when* and *where* — a time, a platform and a link — so the room counts
-- down to it and everybody in the room can follow.
--
-- Both are the same object, because they are the same act: telling the people
-- who are here that there is something to listen to now.
--
-- ── What is not here ─────────────────────────────────────────────────────
--
-- No audio. A song posted here stays in the private `tracks` bucket where it
-- already lives, and the server hands out a short-lived signed link for the
-- ones that have actually been posted. Copying every posted song into a public
-- bucket would be a second copy of somebody's master sitting at a guessable
-- address forever, and posting to a room is not the same as publishing a file.
--
-- `owner` cascades: a deleted account takes its posts and its messages with
-- it. Unlike a refusal, which is evidence, a post is somebody speaking, and
-- somebody who has left should stop speaking.

-- ────────────────────────────────────────────────────────────── posts ────

create table if not exists public.live_posts (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  -- 'track' is a song in this app; 'episode' is a published podcast episode,
  -- which is public already; 'elsewhere' is somebody going live on a platform
  -- this app cannot broadcast to.
  kind        text not null check (kind in ('track', 'episode', 'elsewhere')),
  -- The track id or the episode id. Empty for 'elsewhere', which has no file.
  source_id   text not null default '',
  title       text not null,
  note        text not null default '',
  seconds     integer not null default 0,
  -- Only for 'elsewhere'.
  platform    text not null default '',
  link        text not null default '',
  starts_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists live_posts_recent_idx on public.live_posts (created_at desc);
create index if not exists live_posts_owner_idx  on public.live_posts (owner, created_at desc);

-- ─────────────────────────────────────────────────────────── the room ────

create table if not exists public.live_says (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists live_says_recent_idx on public.live_says (created_at desc);

-- Who is in the room this minute. `presence` answers "how many are on the
-- site", which is a different question: somebody reading the terms page is on
-- the site and is not in the room.
create table if not exists public.live_here (
  visitor     text primary key,
  -- Null for somebody who has not signed in. They can listen; they cannot post.
  owner       uuid references auth.users (id) on delete cascade,
  name        text not null default '',
  seen_at     timestamptz not null default now()
);

create index if not exists live_here_seen_idx on public.live_here (seen_at desc);

-- ───────────────────────────────────────────────────── who may see what ────
--
-- On, with no policy, on all three: every read and write goes through the
-- server. That is not caution for its own sake — the server is the only place
-- that can decide whether a signed link to somebody's private song should be
-- handed out, and a browser reading `live_posts` straight from the database
-- would get the ids without that decision ever being made.

alter table public.live_posts enable row level security;
alter table public.live_says  enable row level security;
alter table public.live_here  enable row level security;

grant select, insert, update, delete on public.live_posts to service_role;
grant select, insert, delete        on public.live_says  to service_role;
grant select, insert, update, delete on public.live_here to service_role;

-- ──────────────────────────────────────────────────────── housekeeping ────

-- Who is in the room, now. Two minutes, like `presence`: long enough that an
-- open tab never blinks out between hellos, short enough that closing one
-- drops you out while somebody is still looking at the number.
create or replace function public.live_room_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.live_here
   where seen_at > now() - interval '2 minutes';
$$;

revoke all on function public.live_room_count() from public;
grant execute on function public.live_room_count() to service_role;

-- Say hello, and sweep up after whoever left. Doing the sweep here rather than
-- on a schedule means the table cannot grow without bound in a project with no
-- cron — every hello pays for a little of the cleaning.
create or replace function public.live_hello(p_visitor text, p_owner uuid, p_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_here (visitor, owner, name, seen_at)
  values (p_visitor, p_owner, coalesce(p_name, ''), now())
  on conflict (visitor)
  do update set owner = excluded.owner, name = excluded.name, seen_at = now();

  delete from public.live_here where seen_at < now() - interval '1 hour';

  return public.live_room_count();
end;
$$;

revoke all on function public.live_hello(text, uuid, text) from public;
grant execute on function public.live_hello(text, uuid, text) to service_role;
