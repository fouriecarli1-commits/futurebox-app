-- ─────────────────────────────────────────────────────────── the posting queue ──
--
-- What goes out, where, and when.
--
-- ── What this is, and what it is honestly not ────────────────────────────
--
-- It is the half of automatic posting that needs nobody's permission: a row
-- that says "this, on Tuesday at six", and a clock that notices when Tuesday
-- at six has arrived.
--
-- It is not, yet, a thing that posts to TikTok. Every platform needs its own
-- developer account, its own client id and secret, and this app's address on
-- somebody else's redirect list — none of which the app can arrange for
-- itself, and Apple, Meta and TikTok all take days to weeks to approve one.
-- So the queue is built first and the connectors arrive one at a time behind
-- a single interface, without any of this changing.
--
-- Until a platform is connected the queue does the one thing it can do
-- honestly: it sends the person a reminder with what they planned to post, at
-- the time they planned to post it. That is a real feature rather than a
-- placeholder — a plan that reminds you on Tuesday at six is the difference
-- between a plan and a document about a plan — and it is why `handler` has a
-- 'remind' value rather than the table waiting empty for an integration.
--
-- ── Why the state is a column and not a pair of booleans ─────────────────
--
-- 'due' → 'sending' → 'sent', or → 'failed', or → 'cancelled'. A queue built
-- from `is_sent` and `is_failed` has states that mean nothing (both true) and
-- states it cannot express (in flight), and the second one is what produces
-- the same post going out twice when two workers overlap.

create table if not exists public.scheduled_posts (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,

  -- Where it is meant to go. Free text rather than an enum: the list of
  -- platforms is a product decision that moves, and a migration to add
  -- Threads is a migration nobody will run.
  platform    text not null check (platform <> '' and length(platform) <= 40),

  -- Who actually does the sending. 'remind' emails the owner; a platform name
  -- here means a connector exists for it. See `app/lib/server/posting`.
  handler     text not null default 'remind' check (handler in ('remind')),

  -- What to post. The words, and where the file is if there is one.
  caption     text not null default '' check (length(caption) <= 5000),
  -- A path in one of this project's buckets, or empty. Not a URL: a signed URL
  -- expires long before a post scheduled for next week goes out.
  media_path  text not null default '' check (length(media_path) <= 400),

  -- The moment it should go. Stored as an instant, not a local time: the
  -- person's timezone is theirs, and a queue that stores "18:00" has to guess
  -- whose six o'clock it means.
  due_at      timestamptz not null,

  state       text not null default 'due'
                check (state in ('due', 'sending', 'sent', 'failed', 'cancelled')),

  -- How many times the worker has picked it up, so a row that fails forever
  -- stops being picked up rather than being retried until the end of time.
  attempts    integer not null default 0 check (attempts >= 0),
  -- What went wrong, in words, for the screen to show.
  note        text not null default '' check (length(note) <= 500),

  created_at  timestamptz not null default now(),
  -- When a worker last took it. Distinct from `created_at`, and the release
  -- below depends on the difference: a row created two days ago and claimed a
  -- minute ago is not stuck, and comparing against `created_at` would have
  -- freed it immediately and sent it twice.
  claimed_at  timestamptz,
  sent_at     timestamptz
);

-- The worker's only query: what is due, oldest first.
create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (state, due_at)
  where state = 'due';

-- And the screen's: everything of mine, soonest first.
create index if not exists scheduled_posts_owner_idx
  on public.scheduled_posts (owner, due_at);

alter table public.scheduled_posts enable row level security;

-- Read your own. Everything else is the server's, with the service role.
drop policy if exists "read own scheduled posts" on public.scheduled_posts;
create policy "read own scheduled posts" on public.scheduled_posts
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── claiming work ──
--
-- The one piece of this that is not obvious.
--
-- A worker that reads the due rows and then updates them has a gap between the
-- read and the write, and two workers that overlap in that gap both send the
-- same post. Vercel will happily run a cron twice — a retry after a timeout is
-- an ordinary event — so this is not a theoretical race, it is the normal one.
--
-- `for update skip locked` is the standard answer: each worker takes rows
-- nobody else has taken, in one statement, and the ones already claimed are
-- skipped rather than waited for. The state moves to 'sending' inside the same
-- statement, so a row is claimed and marked in one go.

create or replace function public.claim_due_posts(p_limit integer default 20)
returns setof public.scheduled_posts
language sql
security definer
set search_path = public
as $$
  update public.scheduled_posts
     set state = 'sending', attempts = attempts + 1, claimed_at = now()
   where id in (
     select id
       from public.scheduled_posts
      where state = 'due'
        and due_at <= now()
        -- Given up on after this many tries. A row that has failed five times
        -- is not going to succeed on the sixth, and a queue that retries
        -- forever is a queue that sends an apology every hour.
        and attempts < 5
      order by due_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
   )
  returning *;
$$;

revoke all on function public.claim_due_posts(integer) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────── stuck in 'sending' ──
--
-- A worker that dies mid-send leaves a row claimed and never finished. Without
-- this it sits in 'sending' forever and is never picked up again — the quiet
-- failure that queues are famous for.
--
-- Anything claimed more than an hour ago and still in flight goes back to
-- 'due'. The attempt count is not reset, so a row that keeps dying still runs
-- out of attempts rather than looping.

create or replace function public.release_stuck_posts()
returns integer
language sql
security definer
set search_path = public
as $$
  with freed as (
    update public.scheduled_posts
       set state = 'due'
     where state = 'sending'
       and claimed_at is not null
       and claimed_at < now() - interval '1 hour'
       and attempts < 5
    returning 1
  )
  select count(*)::integer from freed;
$$;

revoke all on function public.release_stuck_posts() from public, anon, authenticated;
