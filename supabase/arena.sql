-- FutureBox — the Arena: real competitions, with dates and a winner.
--
-- Run this after schema.sql and usage.sql, in the same project. Safe to run
-- again.
--
-- The Arena had the right rules and no competitions. Everything it said about
-- how entry works was true and none of it applied to anything, because there
-- was nothing to enter. These tables are what make a competition a thing that
-- opens, closes, is judged and pays somebody.
--
-- Two rules are enforced in the shape of the data, not only in the copy:
--
--   * **Judging is on skill, against a published rubric.** A paid entry into a
--     draw is a lottery in most markets this reaches — South Africa's Lotteries
--     Act among them — and needs a licence. Judged on merit it is an ordinary
--     promotional competition. So `rubric` is not nullable in practice and the
--     UI refuses to open a competition without one.
--   * **There is always a free route.** South Africa's Consumer Protection Act
--     s36 requires that entry not depend on paying more than the cost of
--     transmitting it. `entries.route` records which way somebody came in, and
--     'free' is always available whatever `entry_rand` says.
--
-- None of this is legal advice and the operator still has to have the real
-- rules reviewed before money moves. What the schema can do is refuse to hold
-- a shape that is obviously unlawful.

-- ─────────────────────────────────────────────────────── competitions ────

create table if not exists public.competitions (
  id            text primary key,
  title         text not null,
  category      text not null check (category in ('music', 'video', 'app', 'idea')),
  brief         text not null default '',
  -- The one hard constraint. Entries that ignore it are out before judging.
  constraint_note text not null default '',
  -- What it is judged on: [{"name": "...", "weight": 30, "what": "..."}]
  rubric        jsonb not null default '[]'::jsonb,
  -- In rand. Zero means the only route in is the free one.
  entry_rand    integer not null default 0 check (entry_rand >= 0),
  prize_rand    integer not null default 0 check (prize_rand >= 0),
  opens_at      timestamptz not null default now(),
  closes_at     timestamptz not null,
  -- Published before anyone enters, because "when do I find out" is the first
  -- question and a competition that cannot answer it is not trusted twice.
  announce_at   timestamptz not null,
  status        text not null default 'draft'
                check (status in ('draft', 'open', 'judging', 'announced')),
  created_at    timestamptz not null default now()
);

create index if not exists competitions_status_idx
  on public.competitions (status, closes_at desc);

alter table public.competitions enable row level security;

-- A competition is public the moment it opens: the rules have to be readable
-- before anybody enters, which is the point of publishing them.
drop policy if exists "read competitions" on public.competitions;
create policy "read competitions" on public.competitions
  for select using (status <> 'draft');

-- ───────────────────────────────────────────────────────────── entries ────

create table if not exists public.entries (
  id             text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  owner          uuid not null references auth.users (id) on delete cascade,
  -- The song, where the entry is one. Kept as an id: the Arena does not need a
  -- second copy of the audio.
  track_id       text,
  title          text not null default '',
  note           text not null default '',
  link           text,
  -- How they came in. A paid entry is only ever written by the webhook, after
  -- money actually arrived; nothing in the browser can claim it.
  route          text not null default 'free' check (route in ('free', 'paid')),
  paid_reference text,
  created_at     timestamptz not null default now(),
  -- One entry per person per competition, whichever route.
  unique (competition_id, owner)
);

create index if not exists entries_competition_idx
  on public.entries (competition_id, created_at desc);

alter table public.entries enable row level security;

drop policy if exists "read own entries" on public.entries;
create policy "read own entries" on public.entries
  for select using (auth.uid() = owner);

-- ───────────────────────────────────────────────────────────── winners ────

create table if not exists public.winners (
  competition_id text not null references public.competitions (id) on delete cascade,
  place          integer not null check (place >= 1),
  entry_id       text not null references public.entries (id) on delete cascade,
  owner          uuid not null references auth.users (id) on delete cascade,
  prize_rand     integer not null default 0,
  -- The winner asks for their money. Until then there is nothing to send.
  claimed_at     timestamptz,
  -- Paystack's own code for where to send it. **Never** an account number:
  -- the bank details go to Paystack and this holds only the reference they
  -- give back, so a leak of this table cannot empty anybody's account.
  recipient_code text,
  paid_at        timestamptz,
  announced_at   timestamptz not null default now(),
  primary key (competition_id, place)
);

alter table public.winners enable row level security;

-- Winners are announced in public — that is what an announcement is.
drop policy if exists "read winners" on public.winners;
create policy "read winners" on public.winners for select using (true);

-- ──────────────────────────────────────────────────────────── counting ────

-- How many have entered, for the page. Counted here so the number cannot come
-- from a browser that has every reason to inflate it.
create or replace function public.entry_counts()
returns table (competition_id text, entries bigint)
language sql
stable
as $$
  select e.competition_id, count(*)
  from public.entries e
  group by e.competition_id;
$$;
