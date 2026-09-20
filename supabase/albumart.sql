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

-- ── The bucket the pictures live in ─────────────────────────────────────
--
-- Private, and it has to be. A piece for sale is shown to everybody through
-- a short-lived signed address handed out by `/api/artmarket`; a commissioned
-- piece is shown to exactly one buyer and to nobody else. Her words:
-- *"'n upload button kry wat net aan daardie persoon geupload kan word."*
-- A public bucket makes both of those a guessable URL.
--
-- No storage policies at all, for the same reason the tables have none: the
-- route holds the service key and decides who may see which file. There is
-- no browser path to this bucket, so there is nothing for a policy to allow.
insert into storage.buckets (id, name, public)
values ('art', 'art', false)
on conflict (id) do update set public = false;

-- ── Wat aan elke kunstenaar uitbetaal moet word ─────────────────────────
--
-- Carli, 20 September 2026: *"Ek dink nie paystack doen sulke ekstra
-- uitbetalings nie. Dit sal in my rekening uitbetaal word en ek betaal dit
-- uit aan die kunstenaar."*
--
-- Sy is reg, en dit verander wat die app moet doen. As die geld in haar
-- rekening land en sy dit met die hand aanstuur, dan is die een ding wat sy
-- nodig het 'n staat: per kunstenaar, wat verkoop is, wat hulle kry, en wat
-- reeds betaal is. Sonder dit beteken "ek betaal dit self uit" dat sy dit
-- elke maand uit Paystack-uitvoere moet uitwerk.
--
-- Hierdie kolom is die hele meganisme. Null = nog nie betaal nie. 'n Datum
-- = betaal, en die aansig hieronder laat dit uit.
alter table public.art_works
  add column if not exists paid_out timestamptz;

-- Waarmee dit betaal is — 'n EFT-verwysing, 'n datum, wat ook al sy in haar
-- bankstaat sien. Vrye teks, want dit is haar eie nota aan haarself.
alter table public.art_works
  add column if not exists paid_note text not null default '';

-- ── Die staat ───────────────────────────────────────────────────────────
--
-- Een ry per kunstenaar met iets uitstaande. Die rand-bedrae word NIE hier
-- bereken nie: `split()` in `app/data/artmarket.ts` is die enigste plek waar
-- die 70/30 en die kaartfooi woon, en 'n tweede kopie daarvan in SQL is hoe
-- twee antwoorde vir een som ontstaan. Hierdie aansig gee die pryse; die
-- roete doen die som.
create or replace view public.art_owing as
  select a.id                                as artist,
         a.name                              as artist_name,
         count(w.id)                         as pieces,
         array_agg(w.rand order by w.sold_at) as rands,
         min(w.sold_at)                      as oldest_sale
    from public.art_works w
    join public.art_artists a on a.id = w.artist
   where w.sold_to is not null
     and w.paid_out is null
   group by a.id, a.name
   order by min(w.sold_at);

-- ── 'n Kunstenaar wat nog nie 'n rekening het nie ───────────────────────
--
-- Carli, 20 September 2026: *"Ek het nou reeds 'n kunstenaar wat ek wil in
-- sit."*
--
-- Daardie persoon is 'n regte skilder, nie 'n app-lid nie. Die tabel het
-- `owner` as not-null gehad, wat beteken 'n kunstenaar moes eers self
-- aanmeld, self aansoek doen en self oplaai voordat een kunswerk kon hang.
-- Vir die eerste kunstenaars — en vir enigeen wat nie 'n app wil gebruik om
-- 'n skildery te verkoop nie — is dit 'n deur wat niemand deurgaan nie.
--
-- So `owner` mag nou null wees. 'n Ry met null is 'n **huiskunstenaar**: die
-- eienaar laai hulle werk namens hulle op en betaal hulle met die hand,
-- presies soos sy in elk geval doen. As daardie persoon later 'n rekening
-- maak, word `owner` op hulle gestel en die profiel is reeds daar, met hulle
-- werk en hulle woorde in.
--
-- Die `unique (owner)` bly staan en doen steeds sy werk: Postgres tel nulls
-- nie as duplikate nie, so baie huiskunstenaars is reg en twee rye vir een
-- rekening bly onmoontlik.
alter table public.art_artists alter column owner drop not null;

-- ── Die voorskou, en waarom die skoon lêer apart lê ─────────────────────
--
-- Carli, 20 September 2026: *"Screenshots gaan die kunswerke skade doen."*
--
-- Sy is reg, en die eerlike posisie is dat nóg 'n screenshot nóg 'n foon se
-- kamera wat na die skerm wys, gekeer kan word deur enigiets wat 'n
-- webblad kan doen. Wat wél gedoen kan word, is om die kopie waardeloos te
-- maak: wys vir almal 'n gemerkte, klein voorskou, en gee die skoon lêer
-- net vir die een wat daarvoor betaal het.
--
-- `path` bly die skoon 3000px meester. `preview` is die gemerkte 1000px een
-- wat op die muur hang. Die roete gee `preview` vir almal en `path` vir
-- niemand behalwe die koper nie.
--
-- Leeg op elke werk wat opgelaai is voordat hierdie kolom bestaan het. Die
-- roete val dan terug op die meester, want 'n kamer wat niks wys nie is
-- erger as een wat te veel wys — en dit is 'n handjievol werke wat met die
-- hand vervang kan word.
alter table public.art_works
  add column if not exists preview text not null default '';

-- ── Dit is 'n veiling, nie 'n prys nie ─────────────────────────────────
--
-- Carli, 20 September 2026: *"Die R200 is die begin vir 'n bee rate, mense
-- moet op die bee, en die hoogste bee wen die art binne 36 hours."*
--
-- Dit verander die hele model. R200 is nie meer wat 'n werk kos nie — dit
-- is waar die bod oopmaak. `art_works.rand` bly staan en beteken nou die
-- **openingsbod**; wat betaal word, is die hoogste bod wanneer die klok
-- opraak.
--
-- ── Wanneer die klok begin en waarom dit hier lê ───────────────────────
--
-- 36 uur vanaf die oomblik wat die werk opgehang word. Op die ry en nie
-- bereken uit `created_at` nie, want 'n veiling se einde is 'n feit oor
-- daardie veiling: as 'n reël ooit verander, mag dit nie die werke wat
-- reeds loop terugdateer nie.
alter table public.art_works
  add column if not exists ends_at timestamptz;

-- Wie gewen het toe die klok opgeraak het, en wanneer. Dit is NIE verkoop
-- nie: `sold_to` word eers geskryf wanneer daar betaal is. Die twee apart
-- te hou is wat 'n wenner wat nie betaal nie, van 'n verkoop skei.
alter table public.art_works
  add column if not exists won_by uuid references auth.users (id) on delete set null;
alter table public.art_works
  add column if not exists won_at timestamptz;

-- ── Die bodde ───────────────────────────────────────────────────────────
--
-- Een ry per bod, en niks word ooit oorgeskryf nie. 'n Veiling waarvan die
-- geskiedenis weggegooi word, is 'n veiling wat niemand kan nagaan as daar
-- 'n argument is nie — en met regte geld en regte kunstenaars kom daardie
-- argument.
create table if not exists public.art_bids (
  id          bigint generated always as identity primary key,
  work        uuid not null references public.art_works (id) on delete cascade,
  bidder      uuid not null references auth.users (id) on delete cascade,
  -- Rand. Die roete dwing die minimum af; die databasis dwing af dat dit
  -- ten minste die vloer is, want 'n bod onder R200 is nooit geldig nie.
  rand        integer not null check (rand >= 200),
  at          timestamptz not null default now()
);

create index if not exists art_bids_work_idx on public.art_bids (work, rand desc);

alter table public.art_bids enable row level security;
-- Geen policy nie: alles gaan deur /api/artmarket, soos die res van hierdie
-- kamer. 'n Blaaier wat self 'n bod kan skryf, is 'n veiling sonder reëls.
drop policy if exists "bids are server only" on public.art_bids;

-- ── Die huidige stand van elke veiling ─────────────────────────────────
--
-- Die hoogste bod en hoeveel daar was. As 'n aansig eerder as in die roete
-- bereken, sodat "wie lei" een antwoord het en nie een per skerm nie.
create or replace view public.art_top_bids as
  select work,
         max(rand)   as top,
         count(*)    as bids
    from public.art_bids
   group by work;

-- ── Die klok begin by die eerste bod ───────────────────────────────────
--
-- Carli, 20 September 2026: *"Die beeing begin wanneer iemand begin bee."*
--
-- Dit was 36 uur vandat die werk opgehang is, wat beteken 'n werk wat op 'n
-- Dinsdagoggend opgaan en wat niemand Woensdag sien nie, se veiling is
-- verby voordat dit begin het. Nou bly `ends_at` **null** totdat die eerste
-- bod inkom, en word dan op 36 uur van daardie oomblik af gestel. 'n Werk
-- sonder bodde wag, vir so lank as wat dit moet.
--
-- Niks om te verander nie — die kolom was reeds nullable. Die reël woon in
-- die roete, en hierdie nota is hier sodat iemand wat na die tabel kyk nie
-- dink 'n null is 'n ontbrekende waarde nie. Dit is 'n veiling wat nog nie
-- begin het nie.

-- ── Wie mag bie ────────────────────────────────────────────────────────
--
-- *"Elke persoon sal 'n R50 by in moet hê om te mag bee, want anders kan
-- enige random mens die prys opstoot."*
--
-- Sy is reg en dit is die ouderdomsoue rede waarom 'n vendusie registrasie
-- vra: 'n bod is 'n belofte om te betaal, en 'n belofte wat niks kos nie,
-- is niks werd nie. Een keer R50, en daarna mag jy bie — op enige werk, vir
-- altyd. Nie per werk nie: 'n fooi per stuk maak van elke veiling 'n
-- tolhek, en dit is nie wat sy gevra het nie.
--
-- Een ry per persoon. `reference` is Paystack se eie verwysing, sodat 'n
-- betaling wat twee keer deurkom nie twee rye maak nie.
create table if not exists public.art_bidders (
  owner       uuid primary key references auth.users (id) on delete cascade,
  reference   text not null default '',
  paid_at     timestamptz not null default now()
);

alter table public.art_bidders enable row level security;
-- Geen policy nie: die roete sê wie mag bie, nie die blaaier nie.
drop policy if exists "bidders are server only" on public.art_bidders;

-- ── Wat werklik betaal is ───────────────────────────────────────────────
--
-- `rand` is die **openingsbod**. Sedert die kamer 'n veiling geword het, is
-- dit nie meer wat iemand betaal het nie — en die uitbetalingstaat het dit
-- steeds as die prys gelees. 'n Werk wat op R900 gesluit het, sou die
-- kunstenaar op R200 betaal het: R133,70 in plaas van R606,55.
--
-- Dieselfde fout in die ander rigting vir 'n bestelling: die ry wat by
-- lewering geskep word het `rand` op die vloer van R200 gehad, terwyl die
-- kunstenaar 'n prys van R500 genoem het.
--
-- So: een kolom wat sê wat werklik oorbetaal is. Die webhook skryf dit uit
-- die bedrag wat die betaaldiens gehef het — nie uit 'n bod wat intussen
-- kon verander nie — en `deliver` skryf die bestelling se eie prys.
--
-- Null op elke ry wat voor hierdie kolom verkoop is; die staat val dan
-- terug op `rand`, wat vir daardie rye korrek was.
alter table public.art_works
  add column if not exists paid_rand integer check (paid_rand is null or paid_rand >= 0);

-- Die staat lees nou daardie kolom. Dit word hier oorgeskryf en nie boontoe
-- by die eerste `create view` verander nie: op 'n skoon databasis bestaan
-- `paid_rand` eers 'n paar reëls hierbo, en 'n aansig kan nie na 'n kolom
-- verwys wat nog nie daar is nie.
--
-- Carli, 20 September 2026: *"Die kunstenaar kry nie geld vir die by in nie,
-- net vir die wen prys."* Die R50 inkoop staan in `art_bidders` en daardie
-- tabel word hier nêrens gejoin nie — dit is wat daardie reël in die
-- databasis waar hou. Die staat tel net verkoopte werke.
create or replace view public.art_owing as
  select a.id                                as artist,
         a.name                              as artist_name,
         count(w.id)                         as pieces,
         array_agg(coalesce(w.paid_rand, w.rand) order by w.sold_at) as rands,
         min(w.sold_at)                      as oldest_sale
    from public.art_works w
    join public.art_artists a on a.id = w.artist
   where w.sold_to is not null
     and w.paid_out is null
   group by a.id, a.name
   order by min(w.sold_at);

-- ── Die buy-in is PER WERK ──────────────────────────────────────────────
--
-- Carli, 20 September 2026: *"Jy het dit ook verkeerd R50 buy in is per
-- piece. Dit is nie vir elke bidding nie."*
--
-- Ek het dit as een keer vir altyd gebou. Dit is 'n ander ding: 'n eenmalige
-- R50 laat iemand vir die res van hulle lewe op elke werk bie, en die reël
-- waarvoor sy die fooi gevra het — *"anders kan enige random mens die prys
-- opstoot"* — geld dan net vir die eerste werk. Per werk is dit wat sy
-- bedoel het: op elke stuk sit jy jou eie R50 in voordat jy op DAARDIE stuk
-- mag bie.
--
-- Die sleutel word dus die persoon én die werk. `art_bidders` het `owner`
-- as die primêre sleutel gehad, so daardie beperking moet val en 'n
-- saamgestelde een kom in die plek.
alter table public.art_bidders
  add column if not exists work uuid references public.art_works (id) on delete cascade;

-- Rye wat voor hierdie verandering betaal is, is vir geen werk nie. Hulle
-- kan nie 'n saamgestelde sleutel deel nie en hulle is nie meer geldig nie:
-- daardie mense het vir 'n reël betaal wat nie meer bestaan nie. Daar is
-- nog niemand nie — die kamer het nog nooit 'n bod gehad nie — so dit is
-- veilig. As daar ooit wel was, sou dit 'n terugbetaling wees en nie 'n
-- delete nie.
delete from public.art_bidders where work is null;

alter table public.art_bidders
  alter column work set not null;

-- Die ou sleutel af, die nuwe een op. Per naam gedroplaat sodat dit twee
-- keer kan loop.
alter table public.art_bidders
  drop constraint if exists art_bidders_pkey;
alter table public.art_bidders
  add constraint art_bidders_pkey primary key (owner, work);
