-- ──────────────────────────────────────── woorde wat verkeerd uitgekom het ──
--
-- Loop dit in Supabase → SQL Editor. Veilig om weer te loop.
--
-- ── Wat dit is, en hoekom dit bestaan ────────────────────────────────────
--
-- `app/lib/server/sayit.ts` sê dit self: 'n uitspraakwoordeboek is maklik om
-- te bou en onmoontlik om góéd te bou, want wat daarin hoort, moet uit
-- LUISTER kom. 'n Lys wat by 'n lessenaar uitgedink is, is 'n lys van woorde
-- wat die model waarskynlik reg sê.
--
-- Een mens se oor het `-tjie` gevind. Elke lid se oor vind die res.
--
-- Carli, 11 September 2026: "Kan ons dalk vir Afrikaanse generators vra om
-- vir ons terugvoer te gee as afrikaanse woorde nie reg uit kom nie?"
--
-- ── 'n Verslag is 'n KANDIDAAT, nooit 'n reël nie ────────────────────────
--
-- Niks hier raak ooit vanself aan wat mense hoor nie. Die reëls woon in
-- `sayit.ts`, as bronkode, en kom daar in deur 'n commit wat iemand gelees
-- het. Dit is die hele punt: skare-invoer wat regstreeks in 'n
-- uitspraakwoordeboek beland, is hoe iemand se grap in almal se Afrikaans
-- kom. Hierdie tabel is 'n lys om te lees, nie 'n bediener wat luister nie.
--
-- ── Waarom die skerm nie vra watter soort fout dit is nie ────────────────
--
-- 'n Lid wat hoor dat iets verkeerd klink, weet nie — en hoef nie te weet —
-- of die skrywer die woord verkeerd geskryf het of die stem dit verkeerd
-- gelees het. Dit is twee verskillende lêers en een oor. Die skerm vra dus
-- die woord en hoe dit moet klink; die `surface` en `spoken` kolomme word
-- deur die kode ingevul, en wie ook al die lys lees, besluit watter van die
-- twee dit is.

create table if not exists public.afrikaans_reports (
  id          uuid primary key default gen_random_uuid(),
  -- Wie dit aangemeld het. Kaskadeer: 'n verslag is iemand wat praat, en
  -- iemand wat weggegaan het, moet ophou praat — dieselfde reël as harte.
  owner       uuid not null references auth.users (id) on delete cascade,
  -- Die woord soos dit was. Kort gehou: dit is 'n woord, nie 'n paragraaf.
  word        text not null check (length(btrim(word)) between 1 and 80),
  -- Hoe dit behoort te klink, in gewone letters. Mag leeg wees — "dit klink
  -- verkeerd" is op sigself bruikbaar en veel beter as stilte.
  should      text not null default '' check (length(should) <= 120),
  -- Watter kamer, sodat 'n patroon sigbaar is.
  surface     text not null default '' check (length(surface) <= 40),
  -- Was dit gepraat of geskryf? Deur die kode ingevul, nie deur die lid nie.
  spoken      boolean not null default true,
  -- Waarnatoe gekyk is, as daar iets was — die teks wat gelees is, afgekap.
  said        text not null default '' check (length(said) <= 400),
  created_at  timestamptz not null default now()
);

-- Om die lys te lees soos dit inkom.
create index if not exists afrikaans_reports_at_idx
  on public.afrikaans_reports (created_at desc);

-- Om te sien watter woord die meeste mense pla, wat die een is om eerste
-- reg te maak.
create index if not exists afrikaans_reports_word_idx
  on public.afrikaans_reports (lower(btrim(word)));

alter table public.afrikaans_reports enable row level security;

-- Skryf jou eie, lees jou eie.
--
-- Nie "lees almal s'n" nie: 'n lid wat ander se verslae kan lees, kan sien
-- watter woorde ander mense laat maak het, wat niks met hulle te doen het
-- nie. Die volle lys word met die diens-sleutel gelees — sien
-- `/api/afrikaans` se GET, wat POST_SECRET vra.
drop policy if exists "add your own report" on public.afrikaans_reports;
create policy "add your own report" on public.afrikaans_reports
  for insert with check (auth.uid() = owner);

drop policy if exists "read your own reports" on public.afrikaans_reports;
create policy "read your own reports" on public.afrikaans_reports
  for select using (auth.uid() = owner);

-- ── 'n Rem, in die tabel eerder as in 'n roete ──────────────────────────
--
-- Dieselfde gedagte as `live_hearts` se saamgestelde sleutel: 'n reël wat in
-- die tabel staan, kan nie deur 'n roete gemis word nie. Een verslag per
-- mens per woord per dag. Iemand wat dieselfde woord tien keer aanmeld, is
-- nie tien stemme nie, en 'n lys waarin een woord tien keer staan, laat 'n
-- egte patroon soos ruis lyk.
create unique index if not exists afrikaans_reports_one_a_day
  on public.afrikaans_reports (owner, lower(btrim(word)), (created_at::date));
