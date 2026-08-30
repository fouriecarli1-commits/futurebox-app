-- FutureBox — how many people are here right now.
--
-- Run this after schema.sql and events.sql, in the same project. Safe to run
-- again.
--
-- `events` already counts visits, but a visit is a thing that happened today;
-- it cannot answer "who is on the site at this moment", which is a different
-- question and needs a different shape. This is that shape: one row per
-- browser, overwritten every time it says hello, and a count of the ones that
-- said hello recently.
--
-- It holds nothing about anybody. The visitor id is the same random string
-- `events` uses — thirty-two hex characters the browser made up and keeps —
-- and rows are thrown away within the hour, so this table is a number and a
-- clock rather than a record of who was where.

create table if not exists public.presence (
  visitor text primary key,
  seen_at timestamptz not null default now()
);

create index if not exists presence_seen_idx on public.presence (seen_at desc);

alter table public.presence enable row level security;

-- No policy grants anything. The browser neither reads nor writes this: the
-- server does both with the service role, and the only thing that comes back
-- out is a count.

-- ────────────────────────────────────────────────────────────── the count ───

-- Here now: seen within the last two minutes.
--
-- Two minutes because a browser says hello every thirty seconds, so a tab that
-- is genuinely open cannot fall out of the window through one slow request,
-- and a tab that was closed drops out of it quickly enough that the number
-- means "now" rather than "recently".
create or replace function public.here_now()
returns integer
language sql
stable
as $$
  select count(*)::int from public.presence where seen_at > now() - interval '2 minutes';
$$;

-- Old rows are not history, they are litter.
create or replace function public.presence_sweep()
returns void
language sql
volatile
as $$
  delete from public.presence where seen_at < now() - interval '1 hour';
$$;
