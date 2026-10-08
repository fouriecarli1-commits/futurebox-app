-- FutureBox — a cover that was made, and whether it was ever kept.
--
-- Run this after schema.sql and credits.sql, in the same project. Safe to run
-- again.
--
-- ── The fault this exists for ────────────────────────────────────────────
--
-- Carli, 8 October 2026: *"Wanneer 'n liedjie se album art gegenerate word dan
-- moet daar 'n opsie wees 'keep'. Ek sien ek het een gegenerate en nou is dit
-- weg."*
--
-- She had asked for a keep button once before, on 14 September, and the answer
-- then was that there was nothing to keep — the cover was saved the moment it
-- was drawn, and what was missing was a sentence saying so. That answer was
-- wrong, in one specific way, and this is the way:
--
-- **the copy into our storage was done by her browser.**
--
-- `GET /api/cover?id=…` fetched the picture from the engine and uploaded it.
-- That handler only runs because the open panel is polling it every two
-- seconds. So the cover was kept if, and only if, the panel was still mounted
-- and the tab still awake at the moment the engine finished. Close it, scroll
-- away, let a song stop playing so the panel unmounts, let a phone sleep, or
-- take longer than the two-minute deadline — and the engine had made the
-- picture, she had paid for it, and nothing ever copied it. The engine's own
-- link expires within the hour.
--
-- And nothing wrote down the job id, so the picture could not even be fetched
-- afterwards. It was not lost in the sense of misplaced. There was no longer
-- anything anywhere that knew it existed.
--
-- ── So the id is written down before the credits are spent ───────────────
--
-- With a row here, an uncollected cover is a fact the app can find: the next
-- time that song's panel opens, `pending` turns it up and it is collected.
-- Nothing is permanently lost by closing a tab.
--
-- This is the same argument `dubs.sql` makes, in the same words, for the same
-- reason — "the answer arrives long after the request that started it has
-- gone". A cover is a shorter job than a dub, which is exactly why it was
-- never treated as one: seconds feels like a request that answers. It is not.
-- Seconds is long enough to close a panel in.
--
-- ── And the refund that never happened ───────────────────────────────────
--
-- A cover the engine FAILS to make was charged for and never given back. The
-- failure is only ever discovered by a poll, so the refund has the same
-- shape as the dub one: it must happen exactly once, no matter how many polls
-- see it, and the claim has to be the update itself. `claim_cover_refund`
-- below is `claim_dub_refund` with the nouns changed.
--
-- ── What is not kept ─────────────────────────────────────────────────────
--
-- Not the picture. That goes to storage at `<owner>/<track>.cover.png`, where
-- it already went, and the path is derived rather than stored — so there is
-- still no row anywhere saying a song HAS a cover. This table is about a job,
-- not about a sleeve, and it stops mattering the moment `kept_at` is set.
--
-- Not the prompt either. The style words are a person's and they are already
-- recorded where generations are recorded.
--
-- `owner` cascades on delete: an uncollected cover belonging to a deleted
-- account is a job nobody will collect.

create table if not exists public.cover_jobs (
  -- The image engine's own job id, not one of ours. A poll needs theirs, and
  -- a second identifier to keep in step would be a second thing to get wrong.
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- Which song. A local id from her device, which is why it is text and why
  -- nothing here joins on it — see `storageId` in the route for what is
  -- allowed through, since this value ends up inside a storage path.
  track_id    text not null,
  -- What was taken when it started. The number to give back, not recomputed:
  -- prices change, and a refund must return what was actually charged.
  charged     integer not null default 0,
  -- Set the moment the picture is in OUR storage. Until then the cover exists
  -- only at the engine, on a link that expires. This column is the whole
  -- point of the table: it is the difference between kept and seen.
  kept_at     timestamptz,
  -- Set when the engine says it could not make it.
  failed_at   timestamptz,
  -- Their sentence, kept because it is the only one that says what to change.
  error       text,
  refunded_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The question this table is asked: "is there a cover for this song that was
-- never collected?" Owner and track together, newest first.
create index if not exists cover_jobs_pending_idx
  on public.cover_jobs (owner, track_id, created_at desc);

-- On, with no policy: every read and write goes through the server, which
-- checks the owner itself. A browser holding an anon key gets nothing.
alter table public.cover_jobs enable row level security;

grant select, insert, update on public.cover_jobs to service_role;

-- ── Refund exactly once ──────────────────────────────────────────────────
--
-- Two polls can arrive at the same moment and both can see a cover that has
-- just failed. Checking in the route and refunding after it is the shape that
-- pays twice; the claim is therefore the update, and the update is the check.
-- A second caller matches no row and gets nothing back.
create or replace function public.claim_cover_refund(p_cover text, p_owner uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.cover_jobs
     set refunded_at = now(),
         updated_at  = now()
   where id = p_cover
     and owner = p_owner
     and refunded_at is null
     and failed_at is not null
  returning charged;
$$;

revoke all on function public.claim_cover_refund(text, uuid) from public;
grant execute on function public.claim_cover_refund(text, uuid) to service_role;
