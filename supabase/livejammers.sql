-- ─────────────────────────────────────────────────────────────────────────
-- Who is on the jam room's stage, and as which character
--
-- The owner, 22 October 2026: in the live jam room somebody hides completely
-- behind an animated character. Nobody's face or camera is ever shown; the
-- room sees each person as the character and colour they picked, with their
-- name from their own creator row.
--
-- ── One row per person, kept alive by a heartbeat ───────────────────────
--
-- The jam room writes `seen_at` every few seconds while it is open and
-- deletes the row when it closes. A row not seen for fifteen seconds is
-- somebody who has left — a closed tab does not say goodbye — and the room's
-- read leaves it out.
--
-- ── What is in it ────────────────────────────────────────────────────────
--
--   character, colour   two words from fixed lists (`lib/jamcharacters.ts`),
--                       checked by the route before they are written and
--                       again by every screen before they are drawn
--   name                read by the server from `creators`, never sent by
--                       the browser
--   tag                 sixteen random hex characters made up per visit:
--                       which tile a live loudness pulse belongs to. It names
--                       nobody.
--   looping, bpm        whether their looper is playing and at what tempo,
--                       so their character moves on their beat
--
-- No picture, no recording, no free text.
--
-- ── Who may read it ──────────────────────────────────────────────────────
--
-- Row level security on, no policy: every read and write goes through
-- `/api/live/jammers`, which is signed-in only, like the looper's room.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.live_jammers (
  owner       uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  character   text not null,
  colour      text not null,
  tag         text not null default '',
  looping     boolean not null default false,
  bpm         integer,
  seen_at     timestamptz not null default now()
);

create index if not exists live_jammers_seen_idx on public.live_jammers (seen_at desc);

alter table public.live_jammers enable row level security;

grant select, insert, update, delete on public.live_jammers to service_role;
