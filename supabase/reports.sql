-- FutureBox — reports of offensive content, and members blocking members.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Google Play asks two things of an app that makes things with AI and shows
-- members each other's work: that somebody who meets something offensive can
-- report it without leaving the app, and that they can block the member who
-- posted it. `app/lib/reports.ts` has the rest of the why.
--
-- Nothing here is readable by members except their own blocked list. Reports
-- are written by the server with the service role after the request is
-- checked, and read only by the owner, through `/api/report`.

-- ─────────────────────────────────────────────────────────────── reports ────

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  -- Who reported it. Null for somebody signed out: a report should not need
  -- an account to be sent.
  reporter    uuid references auth.users (id) on delete set null,
  kind        text not null check (kind in ('ai', 'post', 'user')),
  reason      text not null,
  -- What it is: a track or post id, or the room for something the AI made.
  ref         text not null default '',
  -- Whose it is, when it is a member's. Kept when they leave, as text, so a
  -- report about a deleted account still says which one it was.
  about       text,
  seen_in     text not null default '',
  note        text not null default '',
  -- Set by the owner once it has been looked at.
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists reports_open_idx
  on public.reports (created_at desc) where handled_at is null;

alter table public.reports enable row level security;
-- No policies: no member reads or writes this table directly. The server's
-- service role is not subject to row level security.

-- ──────────────────────────────────────────────────────────────── blocks ────

create table if not exists public.blocks (
  blocker     uuid not null references auth.users (id) on delete cascade,
  blocked     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

alter table public.blocks enable row level security;

-- Your own list, to read. Writing goes through the server.
drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks
  for select using (auth.uid() = blocker);
