-- ──────────────────────────────────────────────────────────── what you like ──
--
-- What somebody keeps coming back to, on the account rather than on a device.
--
-- ── What this fixes ──────────────────────────────────────────────────────
--
-- The welcome screen asks "another dubstep song today?" and it was reading
-- that out of `localStorage` — the songs in this browser and the things made
-- in this browser. On the phone, or on a second laptop, or after clearing
-- site data, the app knew nothing about the person in front of it and fell
-- back to "another song today?", which is a greeting addressed to nobody.
--
-- The copilot had it worse: it never read any of it. Thirteen rooms of
-- suggestions, none of them shaped by what this person actually does.
--
-- ── A rollup, deliberately not a log ─────────────────────────────────────
--
-- The obvious shape is one row per event — every song, every room opened,
-- timestamped. That would answer more questions and it is the wrong thing to
-- keep. A minute-by-minute record of when somebody works is a behavioural
-- profile; what the app actually needs is "dubstep, eleven times, last on
-- Tuesday", which is one row that gets updated.
--
-- So: a count and a last-seen per label. The app cannot reconstruct a
-- timeline from it because the timeline was never written down, and the
-- privacy notice can say that plainly rather than hedging.
--
-- ── Written by the server only ───────────────────────────────────────────
--
-- Same rule as `generations`: read your own, never write from the browser.
-- A count the browser can set is a count that means nothing, and this one
-- feeds what the app tells somebody about themselves.

create table if not exists public.taste (
  owner       uuid not null references auth.users (id) on delete cascade,
  -- 'genre' is what they make; 'room' is where they make it. Two kinds rather
  -- than two tables, because every question asked of one is asked of the other
  -- and a third kind should not need a migration.
  kind        text not null check (kind in ('genre', 'room')),
  -- Lower-cased on the way in so "Dubstep" and "dubstep" are one thing. The
  -- spelling shown back to somebody comes from their own library, not here.
  label       text not null check (label <> '' and length(label) <= 60),
  times       integer not null default 0 check (times >= 0),
  last_at     timestamptz not null default now(),
  primary key (owner, kind, label)
);

-- The only query this table is asked: everything for one person, commonest
-- first. Small enough that the primary key would do, and named so it is
-- obvious which query it is for.
create index if not exists taste_owner_times_idx
  on public.taste (owner, kind, times desc);

alter table public.taste enable row level security;

-- Read your own. There is no policy for insert, update or delete on purpose:
-- the server writes with the service role, which bypasses RLS by design, and
-- the browser gets no way in at all.
drop policy if exists "read own taste" on public.taste;
create policy "read own taste" on public.taste
  for select using (auth.uid() = owner);

-- ─────────────────────────────────────────────────────────────── the write ──
--
-- One statement, so a count can never be read, incremented and written back
-- with somebody else's write in between. `on conflict` is what makes this a
-- rollup rather than a log.

create or replace function public.note_taste(
  p_owner uuid,
  p_kind text,
  p_label text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.taste (owner, kind, label, times, last_at)
  values (p_owner, p_kind, lower(trim(p_label)), 1, now())
  on conflict (owner, kind, label)
  do update set times = public.taste.times + 1, last_at = now();
$$;

-- ────────────────────────────────────────────────────────────── forgetting ──
--
-- Somebody has to be able to make the app stop knowing this, and the account
-- screen offers it. Deleting the account already takes it — the foreign key
-- cascades — but wanting the suggestions to stop is not the same as wanting
-- the account gone, and only offering the second is not offering a choice.

create or replace function public.forget_taste(p_owner uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.taste where owner = p_owner;
$$;

revoke all on function public.note_taste(uuid, text, text) from public, anon, authenticated;
revoke all on function public.forget_taste(uuid) from public, anon, authenticated;
