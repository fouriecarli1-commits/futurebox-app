-- ─────────────────────────────────────────────────────────────────────────
-- Two people in one room, and who is holding the pen
--
-- the owner, 24 September 2026: *"Ek wil hê jy moet elke kamer dupliseer waarin
-- create word … in daai moment moet die duplicated room oop maak waar in net
-- hierdie twee mense is en beide kry functionality om binne die kamer te
-- werk."*
--
-- It is not nine copies of nine rooms. It is the same rooms, opened in a
-- pair mode: a row here says which two people, which room, and which of them
-- is working right now. Asked which way round, she chose turn-taking —
-- *"om die beurt, een hou die pen"* — because two people dragging the same
-- lane at the same moment means one of them loses work and neither is told.
--
-- Run this after collab.sql, which is where `collabs` lives. Safe to run
-- again.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.pairs (
  id          uuid primary key default gen_random_uuid(),
  -- The agreement this room came out of. A pair cannot exist without one,
  -- which is the whole of the rule that nobody can pull you into a room:
  -- `collabs` only reaches 'accepted' when the other person said yes.
  collab      uuid not null references public.collabs (id) on delete cascade,
  -- Both, plainly, rather than read back through the collab every time. The
  -- check keeps them in the same order as the collab's own unique index, so
  -- "is this my room" is one comparison wherever it is asked.
  a           uuid not null references auth.users (id) on delete cascade,
  b           uuid not null references auth.users (id) on delete cascade,
  -- Which room the two of them are working in: 'make', 'booth', 'canvas' …
  -- One of `SURFACE_IDS`, and `check:pairs` holds this list against that one.
  surface     text not null,
  -- Who is holding the pen. Always one of `a` or `b`, never null: a room
  -- where nobody may act is a room where the first press does nothing and
  -- nothing says why.
  pen         uuid not null references auth.users (id) on delete cascade,
  -- When the pen last changed hands. What makes "asked for the pen four
  -- minutes ago" answerable.
  pen_at      timestamptz not null default now(),
  -- Set when the other one has asked for it and not yet been given it.
  pen_wanted  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint pairs_two_people_check check (a <> b),
  constraint pairs_ordered_check check (a < b),
  constraint pairs_pen_is_one_of_them_check check (pen = a or pen = b),
  constraint pairs_wanted_is_one_of_them_check
    check (pen_wanted is null or pen_wanted = a or pen_wanted = b)
);

-- One room per pair per surface. The two of them working in the booth and in
-- the video desk are two rooms; asking twice for the booth is one.
create unique index if not exists pairs_pair_surface_idx
  on public.pairs (a, b, surface);

create index if not exists pairs_a_idx on public.pairs (a);
create index if not exists pairs_b_idx on public.pairs (b);

-- ───────────────────────────────────────── how the two of them talk ────
--
-- Not in here. *"Ek dink nie ek wil 'n chat plek in sit nie. Dalk net die
-- opsie om 'n social link te kan share."* So each side may leave one address
-- or one handle, the other side can see it, and the conversation happens
-- somewhere that already has moderation, blocking and a way to leave.
--
-- One row per person per pair, held by the primary key rather than by a
-- check in code.

create table if not exists public.pair_links (
  pair        uuid not null references public.pairs (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- The platform's own name, as the reader returned it — never the label the
  -- sender chose. A label somebody picks is a label that can say "Instagram"
  -- over an address that goes somewhere else, and it is printed beside it.
  platform    text not null,
  -- The address, or empty when a handle was given on its own. A handle is
  -- deliberately not turned into a URL: the option exists so that there is
  -- nothing to press.
  url         text not null default '',
  -- What the other person reads: the handle, or the address without its host.
  shown       text not null,
  created_at  timestamptz not null default now(),
  primary key (pair, owner)
);

-- ────────────────────────────────────────────────────── who may read ────
--
-- Reading is by policy so the browser can see its own rooms without the
-- server in the middle. Writing is the server's, with the service role,
-- after it has checked the token — the same shape as the rest of this app.

alter table public.pairs enable row level security;
alter table public.pair_links enable row level security;

drop policy if exists pairs_mine on public.pairs;
create policy pairs_mine on public.pairs
  for select using (auth.uid() = a or auth.uid() = b);

-- The other person's link is readable only inside a room you are in. Written
-- as a lookup against `pairs` rather than as a column copied onto this table,
-- because a copied answer is a second place for it to be wrong.
drop policy if exists pair_links_mine on public.pair_links;
create policy pair_links_mine on public.pair_links
  for select using (
    exists (
      select 1 from public.pairs p
      where p.id = pair_links.pair and (auth.uid() = p.a or auth.uid() = p.b)
    )
  );

revoke all on public.pairs from anon;
revoke all on public.pair_links from anon;
grant select on public.pairs to authenticated;
grant select on public.pair_links to authenticated;
grant select, insert, update, delete on public.pairs to service_role;
grant select, insert, update, delete on public.pair_links to service_role;

-- ───────────────────────────────── both say yes before a song is made ────
--
-- the owner, 21 October 2026: *"Dit sal goed wees as die colab nie dadelik die
-- make a song button beskikbaar het nie. Beide moet kan goedkeuring gee om
-- uiteindelik die liedjie te generate."*
--
-- One tick each. The person holding the pen can only press Make once both
-- are set; handing the pen over, or making the song, clears them — a yes is
-- a yes to what was on the screen when it was given. Written by the server
-- (`/api/pairs` 'approve'), read by both through the policy above.

alter table public.pairs
  add column if not exists ok_a boolean not null default false,
  add column if not exists ok_b boolean not null default false;

-- ── Who pays for the song ───────────────────────────────────────────────
--
-- the owner, 21 October 2026: *"Ja, verdeel dit half-half, en gee die opsie
-- van 1 persoon wat alles dra."* 'half' — each pays half; 'a' or 'b' — that
-- person pays it all, which only that person can choose (`/api/pairs`
-- 'pays'). Changing it clears both ticks: a yes is a yes to the price too.
-- Charged by `/api/music` through `chargeTogether` in `credits.ts`.

alter table public.pairs
  add column if not exists pays text not null default 'half';
do $$ begin
  alter table public.pairs add constraint pairs_pays_known check (pays in ('half', 'a', 'b'));
exception when duplicate_object then null; end $$;

-- ── The song so far travels with the turn ───────────────────────────────
--
-- the owner, 21 October 2026, testing a collab: *"Ek het klaar geskryf en
-- die ander persoon kans gegee, maar daar wys niks aan hulle kant nie."*
-- The pen moved and the words stayed on her phone. The room's work in
-- progress — for Make a song: the title, the words, the style, the feeling —
-- is kept here, written only by whoever holds the pen (`/api/pairs` 'draft'
-- and 'pen_give'), so the other person watches it arrive and picks it up
-- where it was left.

alter table public.pairs
  add column if not exists draft jsonb,
  add column if not exists draft_at timestamptz;

-- ── A collab song in the live room is credited to both ──────────────────
--
-- the owner, 22 October 2026: *"Met die collab liedjies moet by artist staan,
-- Collab en die twee mense se handle name."* A song made in a pair room is
-- posted with the pair's id; the live room reads the two people from this
-- table and prints "Collab · @een & @twee" (`lib/collabcredit.ts`). Only when
-- the poster is really one of the two — the server checks before it writes.
--
-- Here and not only in live.sql, because live.sql has already been run on the
-- project and this is the file being re-run for `pays` above. Skipped quietly
-- on a project that has no live room yet; live.sql adds it there.

do $$ begin
  if to_regclass('public.live_posts') is not null then
    alter table public.live_posts add column if not exists pair uuid;
  end if;
end $$;
