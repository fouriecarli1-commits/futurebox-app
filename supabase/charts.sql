-- FutureBox — the charts on Spotlight.
--
-- Run this after events.sql, in the same project. Safe to run again.
--
-- ── What Carli asked for ───────────────────────────────────────────────────
--
--   "top 10 AI musiek in Suid afrika … Ek dink daar moet ook top 10 podcasts
--    wees, net 'n bar waarop mens kliek en dan oop maak en opsies gee wat op
--    gekliek kan word."
--
-- A chart needs a fact behind it, and until now nothing anywhere wrote down
-- that somebody played a song. `events` counted visits, videos rendered,
-- masterclasses and articles and episodes opened — everything except the one
-- thing this app is actually for.
--
-- So: one new kind, `play`, and one function that returns the top of a kind
-- over a window. Nothing else changes; the board keeps working exactly as it
-- did, because `play` rows simply are not any of the kinds it counts.
--
-- ── Why a play may be written from the browser and a song may not ──────────
--
-- events.sql is deliberate about this: songs and money are recorded by the
-- server at the moment it spends a credit or a webhook confirms payment,
-- because letting a page claim "a song was made" would make the one number
-- with a cost behind it the easiest to fake.
--
-- A play has no cost behind it and nothing to gain by faking beyond a place on
-- a list — and the unique index below is what makes even that not work. One
-- person, one song, one day, one row: playing your own song five hundred times
-- is one, and it is the same rule that already makes "1 284 masterclasses
-- watched" mean 1 284 rather than one bored afternoon.

-- ─────────────────────────────────────────────────────── the new kind ───

-- Rewritten rather than added to, because a check constraint cannot be
-- extended in place. Dropped by name first so this is safe to run again.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('visit', 'video', 'masterclass', 'article', 'podcast', 'play'));

-- The window queries below read by kind and date. Without this they read the
-- whole table, which is fine today and is not fine on the day it matters.
create index if not exists events_kind_day_idx
  on public.events (kind, day desc);

-- ──────────────────────────────────────────────────────── the charts ───

-- The top `want` refs of one kind over the last `days` days.
--
-- A window rather than all time, because an all-time chart stops moving: the
-- song that was first is first for ever, and a chart nobody can enter is a
-- chart nobody checks. Thirty days is long enough to be stable with the
-- handful of people currently on the app and short enough to change.
create or replace function public.charts_top(
  want_kind text,
  days integer default 30,
  want integer default 10
)
returns json
language sql
stable
as $$
  select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
    select
      ref,
      count(*)::bigint as count,
      -- How many of those were in the last seven days, so a card can say
      -- whether something is climbing or is coasting on an old week.
      count(*) filter (where day >= (now() at time zone 'utc')::date - 7)::bigint as recent
    from public.events
    where kind = want_kind
      and ref is not null
      and day >= (now() at time zone 'utc')::date - greatest(days, 1)
    group by ref
    order by count(*) desc, max(created_at) desc
    limit least(greatest(want, 1), 50)
  ) r;
$$;

-- Same reasoning as stats_board: only the server calls this, with the service
-- role that writes the rows. A function nobody should call is better left
-- uncallable than left returning zeros for a confusing reason.
revoke all on function public.charts_top(text, integer, integer) from public, anon, authenticated;
grant execute on function public.charts_top(text, integer, integer) to service_role;
