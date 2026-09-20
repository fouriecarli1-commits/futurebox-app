-- ─────────────────────────────────────────────────────────────────────────
-- Album art by real artists.
--
-- Carli, 20 September 2026: a room under SELL IT where real artists sell
-- album art. R200 a piece off the wall, R500 for a commissioned one-off.
-- Every piece unique and sold exactly once. An artist has a profile that
-- pops out, and a button — not a text box — that asks them for a one-off.
--
-- ── Why the messages are buttons and nothing else ───────────────────────
--
-- Her words: *"Ek as eienaar van die app moet bewus wees van dit, sodat
-- kunstenaar nie agter my rug kan kunswerk verkoop nie. Daarom net daai
-- buttons."*
--
-- A free-text message between a buyer and an artist is a place to swap a
-- phone number and do the deal off the platform, and the platform then
-- carries the cost of finding them each other and earns nothing. So there
-- is no message body in this schema at ALL. Not a nullable column, not an
-- empty string — there is nowhere to put one. A column that exists is a
-- column somebody wires a box to.
--
-- What a buyer can say is: "I want unique art", and which of their own
-- songs it is for. That is the whole vocabulary, and it is enough, because
-- the artist answers with a price and a date rather than with prose.
--
-- ── Run this in Supabase ────────────────────────────────────────────────
-- Paste the whole file into the SQL editor and run it. It is safe to run
-- twice; every statement is `if not exists`.
-- ─────────────────────────────────────────────────────────────────────────

-- ── The artists ─────────────────────────────────────────────────────────
-- Not every member. An artist is somebody the owner has let in, which is
-- why `approved` defaults to false: a marketplace anybody can list on is a
-- marketplace nobody trusts, and this one has the studio's name on it.
create table if not exists public.art_artists (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  -- What the pop-out says about them. Their words, written once.
  about       text not null default '',
  -- Where they are, because a buyer asking for something local cares.
  place       text not null default '',
  avatar      text,
  approved    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (owner)
);

-- ── The works ───────────────────────────────────────────────────────────
create table if not exists public.art_works (
  id          uuid primary key default gen_random_uuid(),
  artist      uuid not null references public.art_artists (id) on delete cascade,
  title       text not null,
  -- The stored file. 3000x3000, made by the browser, in the art bucket.
  path        text not null,
  -- Rand. The floor is R200 and an artist may ask more for a piece off the
  -- wall; a commission is settled per request in `art_offers` instead.
  rand        integer not null default 200 check (rand >= 200),
  -- ── Sold once, and the database is what says so ──────────────────────
  -- Her rule: *"elke kunswerk wat te koop is uniek is en net een keer
  -- verkoop."* A screen that hides a sold piece is a screen; two people
  -- pressing buy in the same second is a race, and a race is settled here
  -- or it is not settled. `sold_to` is the constraint: once it is set, the
  -- partial unique index below refuses a second sale of the same work.
  sold_to     uuid references auth.users (id) on delete set null,
  sold_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- One sale per work, enforced rather than promised. Without this the rule
-- lives in whichever code path happens to check first.
create unique index if not exists art_works_sold_once
  on public.art_works (id)
  where sold_to is not null;

create index if not exists art_works_forsale_idx
  on public.art_works (created_at desc)
  where sold_to is null;

-- ── Asking an artist for a one-off ──────────────────────────────────────
-- Two buttons' worth of information and no more: who asked, whose art they
-- asked for, and which of their own songs it is for.
create table if not exists public.art_requests (
  id          uuid primary key default gen_random_uuid(),
  buyer       uuid not null references auth.users (id) on delete cascade,
  artist      uuid not null references public.art_artists (id) on delete cascade,
  -- The song they shared from their own channel. A title and an id, so the
  -- artist can hear it; nothing the buyer typed.
  song_id     text not null,
  song_title  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists art_requests_artist_idx
  on public.art_requests (artist, created_at desc);

-- ── The artist's answer: a price and a date ─────────────────────────────
create table if not exists public.art_offers (
  id          uuid primary key default gen_random_uuid(),
  request     uuid not null references public.art_requests (id) on delete cascade,
  rand        integer not null default 500 check (rand > 0),
  -- Her four windows. Held here as well as in the app, because a database
  -- that accepts 37 days is a database that will one day contain 37 days.
  days        integer not null check (days in (2, 4, 6, 14)),
  -- paid → the buyer has been charged. accepted → the buyer pressed accept.
  -- delivered → the artist has uploaded, and only to that person.
  state       text not null default 'offered'
              check (state in ('offered', 'paid', 'accepted', 'delivered', 'declined')),
  -- The delivered file, readable by the buyer and nobody else.
  path        text,
  due_at      timestamptz,
  created_at  timestamptz not null default now(),
  unique (request)
);

-- ── Row-level security: shut, and shut on purpose ───────────────────────
--
-- All four tables are switched on and given no policy at all, which in
-- Postgres means the anon key reaches nothing. That is the intent, not an
-- oversight: every read and every write in this room goes through
-- `/api/artmarket`, which holds the service key and checks who is asking.
--
-- It has to work that way. The rules here are not "your own rows": a work is
-- visible to everybody until it sells and then to nobody but its buyer; an
-- offer is readable by exactly two people who are not each other; and the
-- sold-once race is settled by a conditional update that a browser must not
-- be able to phrase itself. Each of those is a sentence, and a policy that
-- is a sentence is a policy somebody will get subtly wrong. One route, one
-- place to read, one place to be wrong.
--
-- See `app/api/artmarket/route.ts`. If you ever add a policy here, the room
-- gains a second way in and this comment stops being true.
alter table public.art_artists enable row level security;
alter table public.art_works enable row level security;
alter table public.art_requests enable row level security;
alter table public.art_offers enable row level security;

-- ── The credit that travels with the song ───────────────────────────────
--
-- Carli: *"Binne live moet die liedjie naam, artist naam, style en dan die
-- kunstenaar se naam en art naam appear."*
--
-- Written onto the post rather than looked up. A live post is read by
-- strangers who cannot see the buyer's library, and a join to find out who
-- painted a cover is a join that returns nothing the day the artist leaves.
-- The credit is part of what was posted, like the genre beside it.
alter table public.live_posts
  add column if not exists art_title text not null default '';
alter table public.live_posts
  add column if not exists art_by text not null default '';

-- ── And the same credit on the song itself ──────────────────────────────
--
-- The live post carries a copy so strangers can read it, but the copy has
-- to be made from somewhere. This is the somewhere: when a buyer puts a
-- bought piece on one of their songs, the piece's title and the artist's
-- name are written here, and every room that shows the song — the channel,
-- the full-screen player, the post sheet — reads them from the one row.
--
-- Empty on every generated cover, which is most of them. Both or neither:
-- `creditLine` in `app/lib/artcredit.ts` prints nothing unless both halves
-- are filled, so a half-written credit says nothing rather than half a name.
alter table public.tracks
  add column if not exists art_title text not null default '';
alter table public.tracks
  add column if not exists art_by text not null default '';

-- Which work it was, so a piece cannot quietly end up on two songs and so
-- the buyer's collection can be listed back to them. Null for a generated
-- cover.
alter table public.tracks
  add column if not exists art_work uuid references public.art_works (id) on delete set null;
