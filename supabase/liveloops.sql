-- ─────────────────────────────────────────────────────────────────────────
-- Loops in the live jam room
--
-- The owner, 18 October 2026: a looper in the jam room, and when somebody in
-- the room is looping, a small plus pulses on everybody else's screen for as
-- long as the loop plays. Pressing it puts that loop into your own.
--
-- ── One row per person, and it is the loop that is playing now ──────────
--
-- `seen_at` is a heartbeat: the looper writes it every few seconds while it
-- plays and deletes the row when it stops. A row that has not been seen for
-- fifteen seconds is a loop that is no longer playing — a closed tab does not
-- say goodbye — and the room's read leaves it out. That is what makes the
-- plus go away.
--
-- `started_at` changes when a NEW loop starts (the looper says so), so a
-- screen that has already added somebody's loop knows the next one is new
-- and shows the plus again.
--
-- ── What is in `loop` ────────────────────────────────────────────────────
--
-- `lib/looper.ts`, cleaned by `cleanLoop` on the way in: a tempo and up to
-- eight layers — pad patterns, and recordings capped at about 90 KB each.
-- The room's list reads only who and when; the loop itself is read when
-- somebody presses the plus.
--
-- ── Who may read it ──────────────────────────────────────────────────────
--
-- Row level security on, no policy: every read and write goes through
-- `/api/live/loops`, which is signed-in only, like posting to the room.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.live_loops (
  owner       uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  bpm         integer not null,
  layers      integer not null default 0,
  loop        jsonb not null,
  started_at  timestamptz not null default now(),
  seen_at     timestamptz not null default now()
);

create index if not exists live_loops_seen_idx on public.live_loops (seen_at desc);

alter table public.live_loops enable row level security;

grant select, insert, update, delete on public.live_loops to service_role;
