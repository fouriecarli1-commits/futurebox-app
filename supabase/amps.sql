-- ──────────────────────────────────────────────────────── die versterkers ──
--
-- Die katalogus van versterker-vasvangs wat lede in die booth kan soek.
--
-- ── Waarvandaan ──────────────────────────────────────────────────────────
--
-- the owner, 11 Oktober 2026: *"Ek wil die amps manually oplaai, dan word dit 'n
-- katelogus waarna mense in ons app kan soek. Dit moet alles in ons sisteem
-- en databasis wees. Ons kan nie deur hulle website werk nie, want dit werk
-- nie."*
--
-- Sy laai 'n `.nam`-vasvang van TONE3000 af, en laai dit hier op deur die
-- eienaarsdeur, met die maker se naam en die lisensie waaronder dit gedeel
-- is. 'n Lid soek in die booth, druk een, en dit land op sy rak met die
-- maker en die lisensie reeds daarop — die lisensievraag wat die rak
-- andersins vra, is hier reeds beantwoord.
--
-- ── Die lisensie is 'n hek, nie 'n etiket nie ───────────────────────────
--
-- Net vier van TONE3000 se agt lisensies laat ons toe om 'n vasvang aan te
-- stuur: cc0, cc-by, cc-by-sa en cc-by-nd. Die drie NonCommercial-lisensies
-- nie — FutureBox is 'n betaalde produk en sommige lede verkoop wat hulle
-- maak. Die `check` hieronder weier die ander by die deur, sodat 'n ry wat
-- bestaan 'n ry is wat gedeel MAG word. Die app se eie `mayBeShared` sê
-- dieselfde lys; `check:ampcatalogue` hou die twee gelyk.
--
-- ── Die lêer self lê in die tabel ────────────────────────────────────────
--
-- 'n Vasvang is JSON, gewoonlik onder 'n megagreep, nooit oor vier nie. 'n
-- Stoor-emmer sou 'n tweede plek wees om beleid op te hou vir 'n lêer wat
-- een keer gelees word en as 'n string na die enjin gaan. Die lys-roete lees
-- nooit die `nam`-kolom nie; net die een-roete doen, vir een ry op 'n slag.
--
-- ── Service role alleen ──────────────────────────────────────────────────
--
-- RLS aan, geen beleid. Lees gaan deur `/api/amps` met 'n aangemelde lid,
-- skryf deur `/api/amps` agter die eienaarsdeur. Die blaaier praat nooit
-- direk met hierdie tabel nie.

create table if not exists public.amp_catalogue (
  id          uuid primary key default gen_random_uuid(),
  -- Wat die vasvang homself noem, uit die lêer gelees en deur haar reggemaak.
  name        text not null check (name <> '' and length(name) <= 80),
  -- Die persoon wat die versterker vasgevang het. Die erkenning noem hom.
  maker       text not null check (maker <> '' and length(maker) <= 80),
  licence     text not null check (licence in ('cc0', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'mine')),
  -- Waar dit vandaan kom — die TONE3000-bladsy — sodat die erkenning êrens
  -- heen kan wys en 'n vraag oor 'n vasvang 'n antwoord het.
  source      text not null default '' check (length(source) <= 300),
  -- 'amp', 'pedal', 'amp-cab' — TONE3000 se eie woorde, vir die soektog.
  gear        text not null default '' check (length(gear) <= 30),
  -- 'clean', 'crunch', 'high-gain' — vir dieselfde rede.
  tone        text not null default '' check (length(tone) <= 30),
  bytes       integer not null check (bytes > 0 and bytes <= 4194304),
  -- Die vasvang self.
  nam         text not null,
  added_by    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Die soektog is 'n `ilike` oor naam, maker, gear en toon, en die katalogus
-- is honderde rye, nie miljoene nie. Een indeks op die volgorde waarin dit
-- gewys word is al wat die lys vra.
create index if not exists amp_catalogue_created_idx
  on public.amp_catalogue (created_at desc);

alter table public.amp_catalogue enable row level security;

-- ── Who may reach these tables through the API ────────────────────────────
--
-- Written out rather than left to Supabase. From 30 October 2026 a table
-- created in "public" is no longer opened to the API roles by itself: without
-- these lines every read and write answers "permission denied", on a new
-- project, a preview branch or a fresh run of this file. (Their e-mail to the
-- owner, 20 October 2026.) Row level security still decides WHICH rows each
-- role sees: these lines only let the role ask. A table no member is given
-- rows of is the server's alone, and only the server is named for it.
grant select, insert, update, delete on public.amp_catalogue to service_role;
