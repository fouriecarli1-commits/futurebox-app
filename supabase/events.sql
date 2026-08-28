-- FutureBox — what happened, and how many.
--
-- Run this after schema.sql and usage.sql, in the same project. Safe to run
-- again.
--
-- Why this exists: the app could say how many songs a person had made today,
-- because it had to before it would spend a credit. It could not say how many
-- people had ever visited, watched a masterclass or read an article, because
-- nothing anywhere wrote that down. A counter on the page needs a fact behind
-- it, and inventing one would be worse than showing nothing.
--
-- What is counted here is *reach*: visits, videos rendered, masterclasses
-- opened, articles and episodes opened. Songs and money are not, because they
-- already have their own tables — `generations` and `purchases` — and a number
-- with two sources eventually has two answers.
--
-- One rule shapes the whole table: **one person, one thing, one day, one row.**
-- Anyone can call the endpoint that writes these, so a count of raw calls is a
-- count of how determined somebody was. The unique index below is what makes
-- "1 284 masterclasses watched" mean 1 284 rather than one bored afternoon.

-- ───────────────────────────────────────────────────────────────── events ───

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  -- The five things worth counting that nothing else records.
  kind        text not null check (kind in ('visit', 'video', 'masterclass', 'article', 'podcast')),
  -- Which part of the app: a masterclass track, a feed category. Null when the
  -- kind has no category of its own, which is only ever a visit.
  category    text,
  -- Which particular one. Null for a visit; the item's id otherwise.
  ref         text,
  -- Set when the person was signed in. Null is normal and not a problem: most
  -- of the reach this table measures is anonymous by nature.
  owner       uuid references auth.users (id) on delete set null,
  -- An opaque id the browser keeps, so two visits from one person are one
  -- person. It is random and carries nothing about them — not their email, not
  -- their address, nothing that could identify them if this table leaked.
  visitor     text not null,
  created_at  timestamptz not null default now(),
  -- Stored rather than derived at read time, because it is what the uniqueness
  -- rule is written against and an index cannot be built on a moving `now()`.
  day         date not null default (now() at time zone 'utc')::date
);

-- The rule, enforced where it cannot be argued with. Coalesce because a null
-- ref would make every visit distinct from every other one.
create unique index if not exists events_once_per_day_idx
  on public.events (kind, visitor, coalesce(ref, ''), day);

create index if not exists events_kind_category_idx
  on public.events (kind, category);

alter table public.events enable row level security;

-- No policy grants anything, which is deliberate: the browser neither writes
-- these nor reads them. The server writes them with the service role, and the
-- only thing that ever comes back out is the totals below.

-- ────────────────────────────────────────────────────────────── the board ───

-- Every number the counters show, computed in one place.
--
-- Defined here rather than in the app so that "how many payers" has exactly one
-- answer. Two call sites counting the same thing slightly differently is how a
-- dashboard stops being believed.
create or replace function public.stats_board()
returns json
language sql
stable
as $$
  select json_build_object(
    -- The earliest thing anybody recorded, so the page can say what period
    -- these numbers cover instead of implying they are all of history.
    'since', (
      select min(t) from (
        select min(created_at) t from public.events
        union all select min(created_at) from public.generations
        union all select min(created_at) from public.purchases
      ) f
    ),
    'totals', json_build_object(
      'visitors', (select count(distinct visitor) from public.events where kind = 'visit'),
      -- Songs come from the generation record, which is written only after the
      -- music service has actually answered. A song that failed is not a song.
      'songs', (select count(*) from public.generations),
      'videos', (select count(*) from public.events where kind = 'video'),
      'masterclasses', (select count(*) from public.events where kind = 'masterclass'),
      'articles', (select count(*) from public.events where kind = 'article'),
      'podcasts', (select count(*) from public.events where kind = 'podcast'),
      -- Anyone who has paid for anything: a single song, or a plan they are on.
      -- Counted per person, so buying nine songs is one payer.
      'payers', (
        select count(*) from (
          select owner from public.purchases
          union
          select owner from public.memberships where tier <> 'free'
        ) p
      )
    ),
    -- Per item, so a card can show how many people opened that one thing.
    -- Capped: a runaway list would be sent to every visitor on every load, and
    -- nothing on a page can show more of these than fits on it anyway.
    'byRef', (
      select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
        select kind, ref, count(*)::bigint as count
        from public.events
        where ref is not null
        group by kind, ref
        order by count(*) desc
        limit 500
      ) r
    ),
    -- The same events split by category, for the page each category lives on.
    'byCategory', (
      select coalesce(json_agg(row_to_json(c)), '[]'::json) from (
        select kind, coalesce(category, '') as category, count(*)::bigint as count
        from public.events
        where category is not null
        group by kind, category
        order by count(*) desc
      ) c
    )
  );
$$;

-- Only the server calls this, with the service role, which is the same role
-- that writes the rows. The default grant would let a signed-in browser call it
-- too; it would come back empty, because row-level security still applies to
-- the reads inside — but a function nobody should call is better left
-- uncallable than left returning zeros for a confusing reason.
revoke all on function public.stats_board() from public, anon, authenticated;
grant execute on function public.stats_board() to service_role;
