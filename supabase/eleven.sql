-- FutureBox — wat ElevenLabs werklik gehef het, langs wat ons gevra het.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Elke antwoord van ElevenLabs dra 'n `character-cost` kop: presies hoeveel
-- karakters daardie oproep van die maand se toelae gevat het. Ons het dit tot
-- nou toe net in die log geskryf, waar niemand dit weer sien nie.
--
-- Die vraag wat dit moet beantwoord is een vraag: **hef ons genoeg?** Die toep
-- vra krediete per minuut. ElevenLabs hef per karakter. Daardie twee is nie
-- dieselfde ding nie, en 'n verkeerde omskakeling tussen hulle is geld wat
-- stilweg elke maand weg is. Sonder hierdie tabel is die eerste plek waar dit
-- wys die faktuur.
--
-- Een ry per oproep. Geen teks, geen klank, geen naam — net wat gedoen is,
-- hoeveel karakters dit gekos het, hoeveel krediete ons gevat het, en hulle
-- versoek-id sodat 'n ry teen hulle eie dashboard nageslaan kan word.

create table if not exists public.eleven_costs (
  id          bigint generated always as identity primary key,
  -- 'speak', 'voice-change', 'clone', 'dub', 'isolate', 'music', 'stems'.
  -- Vrye teks eerder as 'n check, want hierdie tabel moet 'n nuwe soort werk
  -- kan opneem sonder 'n migrasie; 'n naam wat verkeerd gespel is wys in die
  -- aansig as sy eie ry, wat sigbaar genoeg is.
  what        text not null,
  -- Wat hulle gehef het. Null beteken die kop was nie daar nie (nie elke
  -- eindpunt hef per karakter nie) — nie "nul karakters" nie.
  characters  integer check (characters is null or characters >= 0),
  -- Wat ons gevat het. Null beteken die roete het nie geweet nie, en so 'n ry
  -- tel nie in die vergelyking nie.
  credits     integer check (credits is null or credits >= 0),
  -- Hulle `request-id`, sodat een ry teen hulle eie rekord opgesoek kan word.
  request_id  text,
  at          timestamptz not null default now()
);

create index if not exists eleven_costs_at_idx on public.eleven_costs (at desc);

alter table public.eleven_costs enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf met die
-- diens-sleutel; die aansig hieronder is die enigste pad wat 'n getal teruggee.
drop policy if exists "eleven costs are server only" on public.eleven_costs;

-- ── Die vergelyking ───────────────────────────────────────────────────────
--
-- Per soort werk, oor die laaste 90 dae: hoeveel keer, hoeveel karakters hulle
-- gehef het, hoeveel krediete ons gevat het, en hoeveel karakters ons per
-- krediet gegee het. Daardie laaste kolom is die antwoord: as dit oor tyd
-- opstoot, gee ons meer weg as wat ons vra.
--
-- Rye sonder albei syfers word gelaat waar hulle is — 'n gemiddelde wat 'n
-- ontbrekende getal as nul lees, lieg in die duurste rigting.

create or replace view public.eleven_price_check as
  select what,
         count(*) as calls,
         sum(characters) as characters,
         sum(credits) as credits,
         round(sum(characters)::numeric / nullif(sum(credits), 0), 2) as chars_per_credit,
         min(at) as since
    from public.eleven_costs
   where at >= now() - interval '90 days'
     and characters is not null
     and credits is not null
   group by what;

revoke all on public.eleven_price_check from public, anon, authenticated;
grant select on public.eleven_price_check to service_role;
