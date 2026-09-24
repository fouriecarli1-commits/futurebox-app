-- ═══════════════════════════════════════════════════════════════════════════
-- FutureBox — die hele skema, al 39 lêers, in een plak.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase → SQL Editor → plak alles → Run. Veilig om weer te loop: elke stuk
-- hieronder is geskryf om twee keer te kan loop sonder om iets te breek.
--
-- Wat dit aanskakel:
--
--   schema.sql    Die fondament: jou profiel, jou liedjies, en waar hulle
--                 gestoor word. Alles hieronder staan hierop.
--   addons.sql    Die bemarkings-byvoegsel kan gekoop of toegeken word.
--   afrikaans.sql Wanneer Afrikaans verkeerd uitkom, gese deur die mense wat
--                 dit hoor. Sonder dit is die knoppie daar en die verslag
--                 gaan nooit îrens heen nie.
--   aikoste.sql   Wat elke model-oproep gekos het, en wat die kas werklik
--                 gespaar het. Sonder dit bly die besparing ’n skatting — en
--                 ’n kas wat nooit tref nie lyk presies soos een wat altyd
--                 tref, behalwe op die rekening.
--   arena.sql     Kompetisies, inskrywings en wenners. Sonder dit is daar
--                 niks om in te skryf nie.
--   cast.sql      Die cast — gesigte wat jy een keer oplaai en in elke video
--                 weer gebruik. Sonder dit lyk die knoppie reg en die oplaai
--                 misluk elke keer.
--   collab.sql    Saamwerk-kamers en die boodskappe daarin.
--   credits.sql   Krediete: wat jy het, wat jy gebruik het, en die slot wat
--                 keer dat twee oortjies dieselfde laaste krediet spandeer.
--   dubs.sql      Oorklanking. Dieselfde antwoord sonder dit.
--   eleven.sql    Wat ElevenLabs per oproep gehef het, langs wat ons gevat
--                 het. Sonder dit is die eerste plek waar ’n verkeerde prys
--                 wys die faktuur.
--   elevenrem.sql Die rem op die ElevenLabs-toelae. Sonder dit is daar ’n
--                 waarskuwing per e-pos en niks wat keer nie.
--   finetunes.sql Stemme wat opgelei word, en hoe ver hulle is.
--   invites.sql   Die uitnodigingsskakel in ’n saamwerk-e-pos.
--   kits.sql      Die Kits.AI minuut-teller. Sonder dit weet die rem nie
--                 hoeveel van die 400 aflaaiminute oor is nie, en dan is
--                 daar geen rem nie.
--   kitsmine.sql  Jou eie Kits.AI minute, los van die huis s’n. Sonder dit
--                 trek elke aflaai aan dieselfde teller.
--   usage.sql     Elke generasie wat geloop het, wat dit gekos het, en teen
--                 watter model.
--   events.sql    Wat in die app gebeur, wat Spotlight se Top 10 voer.
--   listens.sql   Hoeveel kere ’n liedjie geluister is, per liedjie, vir die
--                 maker. Moet ná charts.sql loop.
--   live.sql      Die speelkamer self — wie daar is, wat geplaas is, en wat
--                 gese word.
--   mail.sql      Watter e-pos ons al gestuur het. Sonder dit kan niks keer
--                 dat dieselfde brief twee keer uitgaan nie.
--   moderation.sql Wat die veiligheidshek gekeer het, sodat dit nagegaan kan
--                  word.
--   podcast.sql   Potgooie: programme, episodes, stemme en wat ElevenLabs
--                 gehef het.
--   posting.sql   Die plaas-tou. Sonder dit antwoord dit "nie opgestel nie".
--   presence.sql  Wie nou aanlyn is.
--   radar.sql     Die radar wat die paar mense hier vir mekaar voorstel.
--   roomwords.sql Die woorde van ’n liedjie, saam met die plasing. Sonder
--                 dit speel die kamer die liedjie en wys niks om by saam te
--                 lees nie.
--   subscriptions.sql Lidmaatskappe en aankope. Sonder dit weet niks wie wat
--                     gekoop het nie.
--   taste.sql     Waarheen jy die meeste gaan en wat jy die meeste maak,
--                 sodat ’n voorstel joune is eerder as generies.
--   video.sql     Video’s wat gemaak is.
--   video2.sql    Die tweede helfte daarvan — onderskrifte, tale en wat by
--                 ’n snit hoort.
--   abuse.sql     Die twee kolomme wat keer dat een mens honderd rekeninge
--                 maak: ’n e-possleutel en ’n IP-vingerafdruk op elke
--                 generasie.
--   albumart.sql  Album art by regte kunstenaars: wie hulle is, wat te koop
--                 is, en die krediet wat saam met ’n liedjie na die
--                 speelkamer reis. Sonder dit is die kamer leeg en wys Live
--                 geen kunstenaar se naam nie.
--   avatars.sql   Jou eie foto op jou profiel. Sonder dit is daar net ’n
--                 letter in ’n sirkel, en die oplaai antwoord dat dit nie
--                 opgestel is nie.
--   buildon.sql   Mag iemand anders op hierdie liedjie voortbou — ’n greep
--                 daaruit sny, of by sy styl begin. Bring ook die styl self
--                 saam met die plasing.
--   charts.sql    Spotlight se Top 10 — sonder dit bly daardie bars vir
--                 altyd leeg, want niks skryf ooit neer dat iemand ’n
--                 liedjie gespeel het nie.
--   hearts.sql    Harte op ’n plasing in die kamer, een per mens per
--                 liedjie.
--   livevideo.sql Video’s in die speelkamer, en ’n opname wat jy self gefilm
--                 het wat in jou kanaal bly. Sonder dit is daar geen knoppie
--                 om ’n video te plaas nie.
--   liveflags.sql Wie in die speelkamer sê ’n TikTok-lewendige skakel is
--                 sleg. Die boks vat nou net daardie skakels, en niks hier
--                 kan sien wat op die ander kant loop nie — dus is die mense
--                 in die kamer die sif. Sonder hierdie tabel kan niemand ’n
--                 skakel rapporteer nie en bly ’n slegte een staan.
--   pairs.sql     Twee mense in een maak-kamer, en wie die pen hou. Sonder
--                 dit kan ’n paar wat ooreengekom het nie ’n kamer oopmaak
--                 nie, en is die knoppie stil.
--
-- ── Niks hoef vooraf te bestaan nie ───────────────────────────────────────
--
-- Hierdie lêer is die HELE skema, nie net die nuwe stukke nie. Dit maak alles
-- wat dit nodig het, in 'n volgorde wat getoets is, en elke stuk is geskryf
-- om twee keer te kan loop. Jy kan dit dus loop op 'n splinternuwe projek of
-- op joune soos hy nou is, en in albei gevalle is die antwoord dieselfde.
--
-- Dit was voorheen net die nuwe lêers, met 'n lys van wat jy glo al geloop
-- het. Daardie lys was drie keer verkeerd — cast.sql, arena.sql en abuse.sql
-- — en elke keer het dit soos 'n kode-fout gelyk. Nou is daar niks om te glo
-- nie.
--
-- ── Moenie hierdie lêer regmaak nie ────────────────────────────────────────
--
-- Dit word geskryf deur `npm run sql:bundle` uit die 39 lêers self.
-- Verander hulle en loop die skrip weer; `npm run check:sqlbundle` keer dat
-- die kopie stilweg van sy oorsprong af wegdryf.



-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — accounts and channels.
--
-- Run this once in your Supabase project's SQL editor. It is safe to run again;
-- every statement checks first.
--
-- What it sets up:
--   * a `tracks` table, one row per song, owned by the person who made it
--   * a `tracks` storage bucket for the audio files
--   * row-level policies so a signed-in person reaches their own channel and
--     nobody else's — this is what makes the public anon key safe in a browser
--
-- Auth itself needs no SQL: Supabase provides email and password sign-in out of
-- the box. Under Authentication → Providers you decide whether new accounts
-- must confirm their email address first. Leaving that on is the safer default;
-- the app handles both, and says which one happened.

create table if not exists public.tracks (
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  genre       text not null default '',
  bpm         integer not null default 120,
  song_key    text not null default 'C',
  lyrics      text not null default '',
  style       text not null default '',
  models      text[] not null default '{}',
  source      text not null default 'sketch',
  seconds     integer not null default 0,
  created_at  timestamptz not null default now(),
  remix_of    text,
  seed        bigint not null default 0
);

create index if not exists tracks_owner_created_idx
  on public.tracks (owner, created_at desc);

alter table public.tracks enable row level security;

-- Four policies, one per verb. Each says the same thing: the row's owner must
-- be the person asking. `with check` covers rows being written, `using` covers
-- rows being read or matched.
drop policy if exists "read own tracks" on public.tracks;
create policy "read own tracks" on public.tracks
  for select using (auth.uid() = owner);

drop policy if exists "insert own tracks" on public.tracks;
create policy "insert own tracks" on public.tracks
  for insert with check (auth.uid() = owner);

drop policy if exists "update own tracks" on public.tracks;
create policy "update own tracks" on public.tracks
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete own tracks" on public.tracks;
create policy "delete own tracks" on public.tracks
  for delete using (auth.uid() = owner);

-- The audio itself. Private, not public: files come out through a signed
-- request from the account that owns them.
insert into storage.buckets (id, name, public)
values ('tracks', 'tracks', false)
on conflict (id) do nothing;

-- The app stores each file at `<user-id>/<track-id>.wav`, so the first path
-- segment is the owner. That is what these policies check.
drop policy if exists "read own audio" on storage.objects;
create policy "read own audio" on storage.objects
  for select using (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "write own audio" on storage.objects;
create policy "write own audio" on storage.objects
  for insert with check (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "replace own audio" on storage.objects;
create policy "replace own audio" on storage.objects
  for update using (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete own audio" on storage.objects;
create policy "delete own audio" on storage.objects
  for delete using (
    bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/addons.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────── add-ons ──
--
-- What somebody has bought that is not a plan and is not credits.
--
-- ── Why a table and not a column on `memberships` ────────────────────────
--
-- A tier is one value: you are on Maker or you are not. An add-on is a set,
-- and it grows. Putting the first one in a boolean column means the second one
-- is a migration, and the fourth one is four booleans that can disagree with
-- each other. A row per thing owned costs nothing and never has that problem.
--
-- ── What `until` means, and why it is not a boolean ──────────────────────
--
-- A month that was paid for. The row stays after it lapses rather than being
-- deleted, because "they had this and it ran out" and "they never bought it"
-- are different situations and the second one is not a reason to show somebody
-- the sales page again as though they were new.

create table if not exists public.addons (
  owner      uuid not null references auth.users (id) on delete cascade,
  addon      text not null check (addon <> '' and length(addon) <= 40),
  -- When it runs out. Extended, never replaced — see `grant_addon`.
  until      timestamptz not null,
  -- The charge that last extended it, for reading a row backwards.
  reference  text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner, addon)
);

alter table public.addons enable row level security;

-- Reading your own is all a browser needs. Every write is the webhook's, and
-- the webhook holds the service key.
drop policy if exists "read own addons" on public.addons;
create policy "read own addons" on public.addons
  for select using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────── the money ledger ──
--
-- One row per charge that has been turned into time.
--
-- Paystack retries a webhook it did not get a 200 for, and a retry carries the
-- same reference. Without this, a retry two minutes later would hand out a
-- second month for one payment — which is the failure nobody notices, because
-- it only ever errs in the customer's favour until the month somebody adds up
-- the numbers.

create table if not exists public.addon_grants (
  reference text primary key,
  owner     uuid not null references auth.users (id) on delete cascade,
  addon     text not null,
  days      integer not null,
  at        timestamptz not null default now()
);

alter table public.addon_grants enable row level security;
-- Nobody reads this from a browser. No policy: with RLS on and no policy, the
-- service key still writes and everybody else sees nothing.

-- ───────────────────────────────────────────── who the renewal belongs to ──
--
-- A first charge carries our metadata and says who it is for. A renewal, a
-- month later, is raised by Paystack from the subscription and carries none —
-- so the customer code is written down here on the first charge, and every
-- renewal after that is matched on it.
--
-- `subscriptions` does the same job for memberships, but it is keyed by owner
-- and holds one tier, so it cannot also hold this. Separate table, same idea.

create table if not exists public.addon_customers (
  customer_code text primary key,
  owner         uuid not null references auth.users (id) on delete cascade,
  at            timestamptz not null default now()
);

alter table public.addon_customers enable row level security;

-- ───────────────────────────────────────────────────────── granting time ──
--
-- Extends from the later of "now" and "when it currently runs out", so buying
-- a second month early adds to the first rather than throwing it away, and
-- buying again after a lapse starts from today rather than back-dating from a
-- date that has passed.
--
-- Returns the new end. Returns the existing end, unchanged, for a reference
-- that has already been counted.

create or replace function public.grant_addon(
  p_owner uuid,
  p_addon text,
  p_days integer,
  p_reference text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ends timestamptz;
begin
  if p_days <= 0 or p_days > 400 then
    raise exception 'grant_addon: % days is not a month', p_days;
  end if;

  if coalesce(p_reference, '') <> '' then
    insert into public.addon_grants (reference, owner, addon, days)
    values (p_reference, p_owner, p_addon, p_days)
    on conflict (reference) do nothing;

    -- Already counted. Say what it currently is and change nothing.
    if not found then
      select until into ends from public.addons
       where owner = p_owner and addon = p_addon;
      return ends;
    end if;
  end if;

  insert into public.addons (owner, addon, until, reference)
  values (p_owner, p_addon, now() + make_interval(days => p_days), p_reference)
  on conflict (owner, addon) do update
     set until = greatest(public.addons.until, now()) + make_interval(days => p_days),
         reference = excluded.reference,
         updated_at = now()
  returning until into ends;

  return ends;
end;
$$;

revoke all on function public.grant_addon(uuid, text, integer, text) from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/afrikaans.sql
-- ═══════════════════════════════════════════════════════════════════════════

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
--
-- ── Waarom die tydsone hier uitgeskryf staan ────────────────────────────
--
-- Dit was `(created_at::date)`, en Postgres weier dit botweg:
--
--   ERROR: functions in index expression must be marked IMMUTABLE
--
-- 'n `timestamptz` na 'n `date` hang af van die sessie se TimeZone, so die
-- uitdrukking kan môre 'n ander antwoord gee as vandag — en 'n indeks moet
-- vandag en môre dieselfde antwoord kry. Met die sone uitgeskryf, is dit
-- immutable en word dit aanvaar.
--
-- Dit is nie 'n truuk om die fout stil te maak nie; dit maak die reël ook
-- reg. "Een per dag" moet die lid se dag beteken, en ons lede is hier.
-- Suid-Afrika het geen somertyd nie, so die dag begin om middernag en bly
-- daar.
create unique index if not exists afrikaans_reports_one_a_day
  on public.afrikaans_reports (
    owner,
    lower(btrim(word)),
    ((created_at at time zone 'Africa/Johannesburg')::date)
  );

-- ─────────────────────────────────────── wat dit werklik geklink het ────
--
-- Carli, 14 September 2026: "Daar moet ook 'n pop out wees wat verduidelik
-- waarvoor hierdie feedback bar is en vra: hoe klink dit? Hoe moet dit
-- foneties klink?"
--
-- Twee vrae, en die eerste een het ontbreek. Die vorm het die WOORD gevra en
-- hoe dit MOET klink — en die stuk tussenin, wat die enjin werklik gesê het,
-- is die nuttigste van die drie. "voëltjie" plus "voëlkie" sê vir jou wat die
-- regte antwoord is; "voëltjie", "foeltsjie", "voëlkie" sê vir jou ook wat
-- verkeerd loop, en dít is wat 'n uitspraakreël moet vang.
--
-- Mag leeg wees, soos `should`. Iemand wat hoor dis verkeerd maar dit nie kan
-- oorskryf nie, is steeds die nuttigste ding wat ons kon gehoor het.
alter table public.afrikaans_reports
  add column if not exists heard text not null default '' check (length(heard) <= 120);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/aikoste.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — wat die model werklik gekos het, en wat die kas werklik gespaar het.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Prompt caching is op 19 September 2026 aangeskakel, en `docs/MAANDELIKSE-
-- KOSTE.md` het met opset GEEN besparing aangeteken nie:
--
--   "'n Kas wat nooit tref nie lyk presies soos een wat altyd tref, behalwe
--    op die rekening."
--
-- Daardie sin is die hele rede vir hierdie tabel. 'n Kas wat misluk gee geen
-- fout nie: die merker word aanvaar en doen eenvoudig niks. En die tarief is
-- 'n kwart *duurder* vir 'n druk wat alleen staan. So die besparing mag nie
-- bereken word uit 'n aanname oor hoe dikwels dit tref nie — dit moet gelees
-- word uit oproepe wat werklik gebeur het.
--
-- Die app het dit tot nou toe net na die log geskryf, waar dit verouder en
-- niemand dit optel nie. Dieselfde fout as `eleven_costs` voor dit bestaan
-- het, en dieselfde oplossing.
--
-- Een ry per oproep. Geen prompt, geen antwoord, geen naam — net watter
-- roete, hoeveel tokens in elke van die vier emmers, en watter model.

create table if not exists public.ai_costs (
  id            bigint generated always as identity primary key,
  -- 'help', 'copilot', 'songfrom', … — die roete se eie naam vir homself.
  -- Vrye teks eerder as 'n check, sodat 'n nuwe roete nie 'n migrasie nodig
  -- het nie; 'n naam wat verkeerd gespel is wys in die aansig as sy eie ry.
  what          text not null,
  model         text not null default '',
  -- Die vier emmers, presies soos die model dit self gerapporteer het.
  -- Nie-negatief, want 'n negatiewe telling is 'n leesfout en nie 'n oproep.
  input_tokens  integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cache_read    integer not null default 0 check (cache_read >= 0),
  cache_write   integer not null default 0 check (cache_write >= 0),
  at            timestamptz not null default now()
);

create index if not exists ai_costs_at_idx on public.ai_costs (at desc);
create index if not exists ai_costs_what_idx on public.ai_costs (what, at desc);

alter table public.ai_costs enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf met die
-- diens-sleutel; `/api/aikoste` is die enigste pad wat 'n getal teruggee, en
-- dit weier sonder POST_SECRET. Presies soos `eleven_costs`.
drop policy if exists "ai costs are server only" on public.ai_costs;

-- ── Wat die kas gedoen het ────────────────────────────────────────────────
--
-- Per roete, oor die laaste 30 dae. Die kolomme wat saak maak:
--
--   hits      hoeveel oproepe werklik uit die kas gelees het
--   nothings  hoeveel niks gekas het nie — nie gelees én nie geskryf nie.
--             Dít is die stil mislukking. As hierdie kolom hoog bly terwyl
--             die merker aan is, is die prompt onder die 512-token vloer of
--             sy voorvoegsel verander tussen oproepe.
--
-- Die rand-bedrae word NIE hier bereken nie. Die tariewe en die wisselkoers
-- woon in `app/data/aiprices.ts`, en 'n tweede kopie daarvan in SQL is hoe
-- twee pryse vir een ding ontstaan. Hierdie aansig gee die tokens; die roete
-- doen die som.

create or replace view public.ai_cache_check as
  select what,
         count(*)                                             as calls,
         count(*) filter (where cache_read > 0)               as hits,
         count(*) filter (where cache_read = 0
                            and cache_write = 0)              as nothings,
         sum(input_tokens)                                    as input_tokens,
         sum(output_tokens)                                   as output_tokens,
         sum(cache_read)                                      as cache_read,
         sum(cache_write)                                     as cache_write,
         min(at)                                              as first_at,
         max(at)                                              as last_at
    from public.ai_costs
   where at > now() - interval '30 days'
   group by what
   order by sum(cache_read) + sum(input_tokens) desc;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/arena.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/cast.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────── the cast ──
--
-- The people, places and products a set of clips is supposed to be about.
--
-- ── What this fixes ──────────────────────────────────────────────────────
--
-- A start frame is the only way to get the same face into two clips that are
-- meant to cut together — two prompts, however carefully written, give two
-- strangers. That already worked. What did not is that the picture lived in
-- one browser: `app/lib/assets.ts` keeps a shelf of twenty in IndexedDB, on
-- the device that uploaded them. Open the studio on a phone and the presenter
-- your last three adverts were built around is not there.
--
-- So a cast member is a row and a file on the account. Named, because "the
-- picture I used last Tuesday" is not how anybody thinks about a presenter,
-- and because a name is what makes it choosable in one press in any room.
--
-- ── Private, unlike avatars ──────────────────────────────────────────────
--
-- The avatars bucket is public: a profile picture is shown to people who are
-- not signed in, so it has to be. This one is the opposite. A cast member is
-- an *input* — somebody's face, an unreleased product, a location — and
-- nothing here ever publishes it. It is read by its owner, sent to the engine
-- with a generation, and that is the whole of its life.
--
-- That means the browser downloads it with the owner's own session rather than
-- building a URL, and the policies below are what make that safe.
--
-- ── Order ────────────────────────────────────────────────────────────────
--
-- Needs schema.sql only, for auth.users. Safe to run again.

do $$
begin
  if to_regclass('auth.users') is null then
    raise exception 'auth.users does not exist — this is not a Supabase project, or schema.sql has not been run.';
  end if;
end
$$;

create table if not exists public.cast_members (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  -- What they are called on the desk: "Sarel, the presenter", "the blue tin".
  name        text not null default '',
  -- Anything the picture cannot say: "always shot from his left", "the label
  -- must face camera". Written into the prompt by whoever is making the clip,
  -- not automatically — a note that silently edits a prompt is a note nobody
  -- can debug.
  note        text not null default '',
  -- Where the picture sits in the private `cast` bucket: <owner>/<stamp>.webp.
  -- Stamped rather than fixed, for the same reason as an avatar: a replaced
  -- picture behind a cached URL is the "I changed it and nothing happened"
  -- bug, and here it would be worse — the wrong face in a paid-for clip.
  path        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cast_members_owner_idx
  on public.cast_members (owner, created_at desc);

alter table public.cast_members enable row level security;

-- Yours alone, in every direction. Nothing about a cast member is public, and
-- there is no shared or discoverable case to carve out — unlike `creators`,
-- which exists to be found.
drop policy if exists "read own cast" on public.cast_members;
create policy "read own cast" on public.cast_members
  for select using (auth.uid() = owner);

drop policy if exists "write own cast" on public.cast_members;
create policy "write own cast" on public.cast_members
  for insert with check (auth.uid() = owner);

drop policy if exists "change own cast" on public.cast_members;
create policy "change own cast" on public.cast_members
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "remove own cast" on public.cast_members;
create policy "remove own cast" on public.cast_members
  for delete using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────────────── bucket ──

-- Private. `public => false` is the difference between a reference picture and
-- a published one, and it is the whole reason this is a separate bucket rather
-- than a folder in `avatars`.
insert into storage.buckets (id, name, public)
values ('cast', 'cast', false)
on conflict (id) do update set public = false;

-- Wrapped, because on some projects the SQL editor does not own
-- `storage.objects` and every one of these comes back as `42501: must be owner
-- of table objects`. Failing the whole script there would leave the table made
-- and the bucket unusable with no explanation.
do $$
begin
  execute 'drop policy if exists "read own cast picture" on storage.objects';
  execute $p$create policy "read own cast picture" on storage.objects
    for select using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "write own cast picture" on storage.objects';
  execute $p$create policy "write own cast picture" on storage.objects
    for insert with check (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "replace own cast picture" on storage.objects';
  execute $p$create policy "replace own cast picture" on storage.objects
    for update using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "delete own cast picture" on storage.objects';
  execute $p$create policy "delete own cast picture" on storage.objects
    for delete using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The cast bucket was made, but its policies were refused: %. Add them by hand under Storage → cast → Policies: select, insert, update and delete, each where (storage.foldername(name))[1] = auth.uid()::text. Do NOT add a public read policy — this bucket is deliberately private.', sqlerrm;
end
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/collab.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — working together: asking, agreeing, and a room to talk in.
--
-- Run this after schema.sql and radar.sql, in the same project. Safe to run
-- again.
--
-- The radar could tell you who sounded like you and then left you to copy an
-- Instagram link. This is the rest of it: ask somebody, have them say yes, and
-- get a room where the two of you can talk and pass songs back and forth.
--
-- Two rules the shape of this enforces rather than promises:
--
--   · **Nobody can message you until you have said yes.** The room does not
--     exist before that. An unanswered request carries one line of context and
--     nothing else, so a request cannot be used to send somebody a message
--     they did not agree to receive.
--   · **One live thread per pair.** Asking twice does not make two rooms, and
--     somebody who was declined cannot ask again by asking harder — the unique
--     index is on the pair, whichever way round it was asked.
--
-- Reading is by row-level security. Writing is done by the server with the
-- service role after it has checked the token, which is how the rest of this
-- app works: the browser never holds a key that can write somebody else's row.

-- ─────────────────────────────────────────────────────────── the request ────

create table if not exists public.collabs (
  id          uuid primary key default gen_random_uuid(),
  asked_by    uuid not null references auth.users (id) on delete cascade,
  asked_of    uuid not null references auth.users (id) on delete cascade,
  -- asked → accepted, or asked → declined. Nothing else is a state.
  state       text not null default 'asked',
  -- Why the two were put together: the tempo, the key, the shared style words.
  -- Kept because a request with a reason on it is answerable and one without
  -- is a cold call.
  because     text not null default '',
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  constraint collabs_state_check check (state in ('asked', 'accepted', 'declined')),
  -- Asking yourself is not a collaboration.
  constraint collabs_two_people_check check (asked_by <> asked_of)
);

-- One thread per pair, whichever way round it was asked.
create unique index if not exists collabs_pair_idx
  on public.collabs (least(asked_by, asked_of), greatest(asked_by, asked_of));

create index if not exists collabs_asked_of_idx
  on public.collabs (asked_of, state, created_at desc);

create index if not exists collabs_asked_by_idx
  on public.collabs (asked_by, state, created_at desc);

alter table public.collabs enable row level security;

-- Both sides can see it. Nobody else can see that it exists at all.
drop policy if exists "read own collabs" on public.collabs;
create policy "read own collabs" on public.collabs
  for select using (auth.uid() = asked_by or auth.uid() = asked_of);

-- ────────────────────────────────────────────────────────────── the room ────

create table if not exists public.collab_messages (
  id         bigserial primary key,
  collab     uuid not null references public.collabs (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade,
  body       text not null default '',
  -- A song dropped into the room. The id of a track, so the other person can
  -- see what it is; the audio itself still only travels if its owner shared it.
  track_id   text,
  created_at timestamptz not null default now(),
  constraint collab_messages_something_check check (body <> '' or track_id is not null)
);

create index if not exists collab_messages_thread_idx
  on public.collab_messages (collab, created_at);

alter table public.collab_messages enable row level security;

-- Readable by the two people in an **accepted** thread, and by nobody else.
-- The accepted test is the important half: it is what makes "you cannot
-- message somebody who has not agreed" a property of the database rather than
-- a promise made by a page.
drop policy if exists "read collab messages" on public.collab_messages;
create policy "read collab messages" on public.collab_messages
  for select using (
    exists (
      select 1 from public.collabs c
      where c.id = collab_messages.collab
        and c.state = 'accepted'
        and (auth.uid() = c.asked_by or auth.uid() = c.asked_of)
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/credits.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — credits, and the ledger they live in.
--
-- Run this after schema.sql and usage.sql, in the same project. Safe to run
-- again.
--
-- One currency across songs, videos, readings and training, priced off what
-- each of those actually costs. The scale itself lives in app/lib/credits.ts;
-- this file only holds the balance and makes the arithmetic safe.
--
-- ── Why a ledger and not a balance column ────────────────────────────────
--
-- A single `balance` integer is one lost update away from free credits. Two
-- requests read 40, both spend 30, both write 10, and somebody generated sixty
-- credits of music for thirty. A ledger of grants and spends has no such
-- moment: every row is an insert, the balance is their sum, and the history is
-- there when somebody asks why they were charged.
--
-- ── Why the functions and not application code ───────────────────────────
--
-- Checking a balance and then spending it are one decision, and split across
-- two round trips they are two — with room in between for the same person's
-- second tab. `spend_credits` takes a lock on the owner for the length of the
-- transaction, so two simultaneous spends of the same last credit cannot both
-- succeed. It is the only correct place for that check to live.
--
-- Nothing here is writable from a browser. The policies allow reading your own
-- history and nothing else; every write goes through the server, which holds
-- the service key.

create table if not exists public.credit_entries (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- Positive for a grant, negative for a spend. Never zero: an entry that
  -- changes nothing is a row that explains nothing.
  amount      integer not null check (amount <> 0),
  -- What happened, in a word the support desk can read: 'song', 'video',
  -- 'monthly', 'weekly', 'topup', 'refund'.
  reason      text not null,
  -- The track it made, or the payment reference behind a top-up.
  ref         text,
  -- Set on grants that may only happen once in a window: 'maker-2026-08',
  -- 'free-2026-08', 'weekly-2026-W35'. The unique index below is what makes a
  -- repeated grant a no-op rather than a second month's credits.
  period      text,
  created_at  timestamptz not null default now()
);

create index if not exists credit_entries_owner_idx
  on public.credit_entries (owner, created_at desc);

-- One grant per owner per window. Spends carry no period, and several spends a
-- second are ordinary, so the constraint has to skip them.
create unique index if not exists credit_entries_period_idx
  on public.credit_entries (owner, period)
  where period is not null;

alter table public.credit_entries enable row level security;

drop policy if exists "read own credits" on public.credit_entries;
create policy "read own credits" on public.credit_entries
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── balance ────

create or replace function public.credit_balance(p_owner uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_entries
  where owner = p_owner;
$$;

-- ────────────────────────────────────────────────────────────── spend ────

-- Spend, or refuse. True means the credits are gone and the caller may
-- proceed; false means the balance was short and nothing was written.
--
-- The advisory lock is per owner and lasts the transaction. It is what stops
-- two tabs from spending the same last credit. It costs nothing when there is
-- no contention, which is almost always.
create or replace function public.spend_credits(
  p_owner  uuid,
  p_amount integer,
  p_reason text,
  p_ref    text default null
)
returns boolean
language plpgsql
as $$
declare
  balance integer;
begin
  if p_amount <= 0 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  select coalesce(sum(amount), 0) into balance
  from public.credit_entries
  where owner = p_owner;

  if balance < p_amount then
    return false;
  end if;

  insert into public.credit_entries (owner, amount, reason, ref)
  values (p_owner, -p_amount, p_reason, p_ref);

  return true;
end;
$$;

-- ────────────────────────────────────────────────────────────── grant ────

-- Give credits, up to a ceiling, once per window, within a month's budget.
--
-- Returns how many were actually given, which is not always what was asked
-- for. Three things trim it:
--
--   * the period. Called twice for the same window it writes nothing the
--     second time, so a page that refreshes does not hand out a second month.
--   * the balance cap. Somebody sitting on nearly a full balance is topped up
--     to the ceiling and no further. Credits that pile up unspent are a bill
--     that arrives all at once, and the video engine's hard monthly ceiling is
--     exactly what cannot serve all at once.
--   * the month's budget, which is the important one and was missing.
--
-- Why the budget exists. A cap on the *balance* is not a cap on the month. A
-- free account given 25 with a weekly top-up of 10 spends down to nothing each
-- week, is refilled every Monday because its balance is under the ceiling, and
-- ends the month having been given 65 — two and a half times the number on the
-- pricing card, and the free tier's whole cost model with it. The budget
-- counts what has actually been handed over since the first of the month, so
-- the number on the card is the number that is given.
create or replace function public.grant_credits(
  p_owner  uuid,
  p_amount integer,
  p_reason text,
  p_period text,
  p_cap    integer,
  -- The most that may be granted in this calendar month, across every grant.
  -- Null means no monthly budget, which is right for a one-off.
  p_budget integer default null
)
returns integer
language plpgsql
as $$
declare
  balance integer;
  given   integer;
  room    integer;
  give    integer;
begin
  if p_amount <= 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  -- Already given for this window.
  if p_period is not null and exists (
    select 1 from public.credit_entries
    where owner = p_owner and period = p_period
  ) then
    return 0;
  end if;

  select coalesce(sum(amount), 0) into balance
  from public.credit_entries
  where owner = p_owner;

  room := greatest(0, p_cap - balance);

  -- What this account has already been *given* this month, as opposed to what
  -- it happens to be holding. Purchases and refunds are not grants and do not
  -- count against the allowance somebody is entitled to.
  if p_budget is not null then
    select coalesce(sum(amount), 0) into given
    from public.credit_entries
    where owner = p_owner
      and amount > 0
      and reason in ('monthly', 'weekly')
      and created_at >= date_trunc('month', now());
    room := least(room, greatest(0, p_budget - given));
  end if;

  give := least(p_amount, room);
  if give <= 0 then
    return 0;
  end if;

  insert into public.credit_entries (owner, amount, reason, ref, period)
  values (p_owner, give, p_reason, null, p_period);

  return give;
end;
$$;

-- ───────────────────────────────────────────────────────────── top-up ────

-- A purchase. No cap and no period: somebody who has paid gets what they paid
-- for, and the ceiling above is about what is given away, not what is bought.
-- Written only by the payment webhook, and only once per reference.
create or replace function public.add_credits(
  p_owner  uuid,
  p_amount integer,
  p_ref    text
)
returns integer
language plpgsql
as $$
begin
  if p_amount <= 0 or p_ref is null then
    return 0;
  end if;

  -- The same charge can arrive twice; Paystack retries. The reference is the
  -- one thing that is stable across those retries.
  if exists (
    select 1 from public.credit_entries
    where owner = p_owner and reason = 'topup' and ref = p_ref
  ) then
    return 0;
  end if;

  insert into public.credit_entries (owner, amount, reason, ref)
  values (p_owner, p_amount, 'topup', p_ref);

  return p_amount;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/dubs.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — an episode being dubbed into another language.
--
-- Run this after schema.sql and credits.sql, in the same project. Safe to run
-- again.
--
-- ── Why a table, when nothing else that costs credits has one ────────────
--
-- Everything else this app buys is a request that answers. You ask, you wait a
-- few seconds, and either audio comes back or a refusal does — and the refusal
-- refunds on the spot, in the same handler that took the money.
--
-- A dub is not that. It takes minutes, it is polled, and the answer arrives
-- long after the request that started it has gone. So the two questions the
-- other routes answer in one breath have to be answered across two:
--
--   **Who does this dub belong to?** Without a row, the id ElevenLabs hands
--   back is a bearer token — anybody who has it can poll it and download the
--   audio, and ids that come back from an upstream are exactly the sort of
--   thing that ends up in a log or a screenshot. The owner is written down
--   here, and every read is checked against it.
--
--   **Has it already been refunded?** A dub that fails should give the credits
--   back, and it can only be discovered failed by a poll — which happens as
--   many times as the screen asks. Refunding on each poll refunds forever;
--   refunding on none of them charges for nothing. `refunded_at` is the mark
--   that makes it happen exactly once.
--
-- ── What is not kept ─────────────────────────────────────────────────────
--
-- Not the audio. The episode is already in storage and the dub is fetched from
-- ElevenLabs when it is asked for, so nothing here is a second copy of
-- somebody's show. Not a transcript either: a dub is translated speech, and
-- the translation is a copy of what was said.
--
-- `owner` cascades on delete rather than being set to null. There is nothing
-- to keep — unlike a refusal, which is evidence, an in-flight dub belonging to
-- a deleted account is just a job nobody will collect.

create table if not exists public.dubs (
  -- ElevenLabs' own `dubbing_id`, not one of ours. There is no second
  -- identifier to keep in step, and a poll needs theirs anyway.
  id           text primary key,
  owner        uuid not null references auth.users (id) on delete cascade,
  -- iso639-1, as sent. Empty source means they were asked to work it out.
  source_lang  text not null default '',
  target_lang  text not null,
  -- What the episode was, so a failure can say which one without the audio.
  title        text,
  seconds      integer not null default 0,
  -- What was taken when it started. The number to give back, not recomputed:
  -- prices change, and a refund must return what was actually charged.
  charged      integer not null default 0,
  -- Theirs, verbatim: 'dubbing', 'dubbed', 'failed'. Not narrowed by a check
  -- constraint — a status we have not seen before must not fail an insert.
  status       text not null default 'dubbing',
  -- Their message when it failed, kept because it is the only sentence that
  -- says what to change.
  error        text,
  refunded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dubs_owner_idx on public.dubs (owner, created_at desc);

-- On, with no policy: every read and write goes through the server, which
-- checks the owner itself. A browser holding an anon key gets nothing.
alter table public.dubs enable row level security;

grant select, insert, update on public.dubs to service_role;

-- ── Refund exactly once ──────────────────────────────────────────────────
--
-- Two polls can arrive at the same moment, and both can see a dub that has
-- just failed. Doing the check in the route and the refund after it is the
-- shape that pays twice.
--
-- So the claim is the update, and the update is the check: it only matches a
-- row that has not been refunded, and it returns what it took. A second caller
-- matches nothing and gets nothing back, which is how it should read.
create or replace function public.claim_dub_refund(p_dub text, p_owner uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.dubs
     set refunded_at = now(),
         updated_at  = now()
   where id = p_dub
     and owner = p_owner
     and refunded_at is null
     and status = 'failed'
  returning charged;
$$;

revoke all on function public.claim_dub_refund(text, uuid) from public;
grant execute on function public.claim_dub_refund(text, uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/eleven.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/elevenrem.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — 'n rem op wat ElevenLabs hierdie maand kos.
--
-- Loop dit ná eleven.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit nou nodig is ──────────────────────────────────────────────
--
-- ElevenLabs se ondersteuning, 9 September 2026: bykoop kos $0,000165 per
-- krediet, en Auto Top Up kan aangeskakel word. Carli, dieselfde dag: "Ek gaan
-- eers net krediete top up totdat ek 'n beter begrip het hoeveel mense ons
-- produk gebruik."
--
-- Dít is presies die opstelling waarin 'n rem saak maak. Sonder Auto Top Up
-- gaan die diens dood wanneer die krediete op is — sleg, maar sigbaar. Mét
-- Auto Top Up gaan dit **nooit** dood nie: dit hou aan koop, teen R3,08 per
-- duisend krediete, totdat iemand die rekening sien. 'n Waarskuwings-e-pos by
-- 75% is nie 'n rem nie; dit is 'n kennisgewing dat dit reeds gebeur.
--
-- ── Wat hierdie funksie tel ──────────────────────────────────────────────
--
-- `eleven_costs.characters` is wat ElevenLabs self vir elke oproep gehef het,
-- van hulle `character-cost`-kop af. Dit is húlle getal, nie ons skatting nie.
--
-- Kalendermaand in UTC, want dit is hoe die plan self tel. Rye waar die kop
-- ontbreek het, is null en tel as niks — wat in die bestedingsrigting verkeerd
-- is eerder as in die weierrigting, en dít is die verkeerde kant om op te dwaal.
-- Daarom is die verstek-plafon in die toepassing die plan se eie 600 000 en
-- nie meer nie: 'n telling wat kán onderskat, moet 'n plafon hê wat nie oorskat
-- nie.

create or replace function public.eleven_credits_this_month()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(characters), 0)::bigint
  from public.eleven_costs
  where at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.eleven_credits_this_month() from public, anon, authenticated;
grant execute on function public.eleven_credits_this_month() to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/finetunes.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — a sound of your own, trained on your own songs.
--
-- Run this after schema.sql in the same project. Safe to run again.
--
-- ElevenLabs will train a music model on a handful of tracks and then generate
-- in that sound. The interesting part is not the API call; it is who is allowed
-- to press it. Training a model on somebody else's records is exactly the thing
-- that gets a music app taken down, and ElevenLabs will block it on their side
-- too — `failure_reason` has a `copyright_violation` in it for that reason.
--
-- So FutureBox trains from the channel: songs this app generated, for this
-- person, which we can see were generated here. The confirmation is recorded
-- with the finetune, in words, because a claim of ownership that cannot be
-- produced afterwards is not a claim of anything.
--
-- The same ownership problem as cloned voices, for the same reason: there is
-- one ElevenLabs account behind the whole app, so without this table every
-- finetune anybody trained would be listed and usable by everybody. Their API
-- has no notion of our users, so the ownership is ours to keep.

create table if not exists public.finetunes (
  -- ElevenLabs' own finetune id.
  id            text primary key,
  owner         uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  -- What it was trained to sound like, as the person described it.
  genre         text not null default '',
  -- 'channel' means every training file was a song FutureBox made in this
  -- account; 'brought' means the person uploaded their own recordings and said
  -- in words that the music is theirs. The distinction matters when a takedown
  -- arrives, so it is stored rather than inferred.
  origin        text not null default 'channel'
                check (origin in ('channel', 'brought')),
  -- How many tracks it learned from, kept for the screen and for support.
  tracks        integer not null default 0,
  -- Where training got to, mirrored from ElevenLabs on each look.
  --
  -- Mirrored rather than asked every time: once a finetune is finished it
  -- stays finished, so a screen that polls does not need to call them once per
  -- row per refresh forever. Only the unfinished ones are asked about again.
  status        text not null default 'pending'
                check (status in ('pending', 'in_progress', 'completed', 'failed', 'blocked')),
  -- Their reason when it failed or was blocked. `copyright_violation` is the
  -- one worth showing in plain words rather than swallowing.
  why           text,
  -- Recorded, and confirmed by the person that the music is theirs to train on.
  confirmed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists finetunes_owner_idx on public.finetunes (owner);

alter table public.finetunes enable row level security;

-- Reading your own is all a browser ever needs; every write goes through the
-- server, which holds the ElevenLabs key anyway.
drop policy if exists "read own finetunes" on public.finetunes;
create policy "read own finetunes" on public.finetunes
  for select using (auth.uid() = owner);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/invites.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — inviting somebody who is not here yet.
--
-- Run this after collab.sql, in the same project. Safe to run again.
--
-- ── What this is for ────────────────────────────────────────────────────────
--
-- The radar can draft an email to a podcast host or another maker, and that
-- email had nowhere to send them. The collab room only exists once two
-- FutureBox accounts have accepted each other, so a stranger reading the
-- email had to find the app, sign up, work out the handle, and ask — four
-- steps between "yes, interesting" and a conversation.
--
-- A link is one step. It lands on the app, survives signing up, and turns
-- into a request from the person who sent it.
--
-- ── What the token is, and what it is not ───────────────────────────────────
--
-- It is a bearer for exactly one thing: **being asked to collaborate by the
-- person who made it**. It cannot read anything, cannot write anything else,
-- and names nobody until it is redeemed. The worst somebody can do with a
-- stolen link is end up with a collaboration request they can decline.
--
-- It expires, and it has a use limit. Both because an invite pasted into an
-- email lives forever otherwise, and a link in an old email that still opens
-- a door is a door nobody is watching.
--
-- Redemption goes through the server with the service role, which is why
-- there is no select policy for anybody but the owner: the person redeeming
-- must not be able to read the table, only to hand a token to a route that
-- can.

create table if not exists public.collab_invites (
  -- Long, random, and generated in the route rather than here: a database
  -- default would be the same generator for every row and this is the only
  -- secret in the table.
  token       text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- What the invite is about, carried into the request so it arrives with a
  -- reason on it rather than as a cold call.
  note        text not null default '',
  uses        integer not null default 0,
  -- Small on purpose. One email is one person; a handful covers somebody
  -- pasting the same link into a few, and stops a link becoming a public door.
  max_uses    integer not null default 5,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  constraint collab_invites_uses_check check (uses >= 0 and max_uses > 0)
);

create index if not exists collab_invites_owner_idx
  on public.collab_invites (owner, created_at desc);

alter table public.collab_invites enable row level security;

-- Only the person who made it can see their own. Nobody can see anybody
-- else's, and nobody can look a token up from the browser at all — redeeming
-- is a route, not a read.
drop policy if exists "read own invites" on public.collab_invites;
create policy "read own invites" on public.collab_invites
  for select using (auth.uid() = owner);

-- Writing is the server's, with the service role, after it has checked the
-- token — the same rule as every other table in this app.

-- ── Redeeming, as one statement ────────────────────────────────────────────
--
-- Two things have to happen together: the use is counted and the request is
-- made. Apart, a redemption that failed halfway either burns a use with no
-- request behind it, or makes a request that the count never knew about — and
-- two people redeeming the last use at the same moment would both get one.
--
-- `for update` takes the row's lock, so the second caller waits and then sees
-- the count the first one wrote.
create or replace function public.redeem_collab_invite(p_token text, p_who uuid)
returns table (collab uuid, owner uuid, note text, problem text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.collab_invites%rowtype;
  v_existing uuid;
  v_made uuid;
begin
  select * into v_invite
    from public.collab_invites
   where token = p_token
     for update;

  if not found then
    return query select null::uuid, null::uuid, null::text, 'unknown'::text;
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select null::uuid, null::uuid, null::text, 'expired'::text;
    return;
  end if;
  if v_invite.uses >= v_invite.max_uses then
    return query select null::uuid, null::uuid, null::text, 'used_up'::text;
    return;
  end if;
  if v_invite.owner = p_who then
    -- Following your own link is not a collaboration. Said rather than
    -- silently ignored: somebody testing their own link should be told why
    -- nothing happened.
    return query select null::uuid, v_invite.owner, v_invite.note, 'yourself'::text;
    return;
  end if;

  -- Already a thread, either way round. Handing back the existing one is the
  -- useful answer, and it does not burn a use: the link did its job the first
  -- time.
  select id into v_existing
    from public.collabs
   where (asked_by = v_invite.owner and asked_of = p_who)
      or (asked_by = p_who and asked_of = v_invite.owner)
   limit 1;
  if v_existing is not null then
    return query select v_existing, v_invite.owner, v_invite.note, 'already'::text;
    return;
  end if;

  insert into public.collabs (asked_by, asked_of, because)
  values (v_invite.owner, p_who, v_invite.note)
  returning id into v_made;

  update public.collab_invites
     set uses = uses + 1
   where token = p_token;

  return query select v_made, v_invite.owner, v_invite.note, ''::text;
end;
$$;

revoke all on function public.redeem_collab_invite(text, uuid) from public;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/kits.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — die Kits.AI minuut-teller.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Kits se Professional Plan is R640 per maand met 'n dak van **400
-- aflaaiminute**. Omskakelingstyd is onbeperk; die minute loop wanneer klank
-- afgelaai word, en hierdie toep laai elke resultaat af — dit is hoe die klank
-- hier kom. So elke minuut wat 'n lid terugkry, brand een van die 400.
--
-- R640 ÷ 400 = R1.60 per minuut. 'n Snit van drie minute kos R4.80. Dit is
-- ongeveer 133 omskakelings per maand oor al die lede saam.
--
-- Sonder 'n teller weet niemand hoeveel oor is nie, en die eerste ding wat
-- wys dat die dak gebreek is, is 'n mislukking waarvoor die lid reeds betaal
-- het. Hierdie tabel is die teller, en `lib/server/kitsminutes.ts` is die rem
-- wat stop voordat dit breek.
--
-- Een ry per omskakeling, met die sekondes wat werklik afgelaai is. Die
-- eienaar staan daarby sodat 'n mens later kan sien wie die maand se minute
-- gebruik het — nie om iemand te straf nie, maar omdat 'n plafon wat een lid
-- alleen opgebruik 'n ander soort probleem is as een wat honderd lede deel.

create table if not exists public.kits_minutes (
  id       bigint generated always as identity primary key,
  owner    uuid references auth.users (id) on delete set null,
  -- Wat gedoen is: 'sing' is stem-omskakeling, 'split' is bane skei,
  -- 'isolate' is die stem uit die musiek haal. Almal brand dieselfde minute.
  kind     text not null default 'sing' check (kind in ('sing', 'split', 'isolate')),
  -- Sekondes eerder as minute, want 'n snit is nie 'n heelgetal minute nie en
  -- afrond by elke ry maak die maand se som stelselmatig te groot.
  seconds  integer not null default 0 check (seconds >= 0),
  at       timestamptz not null default now()
);

-- Die vraag wat elke keer gevra word is "hoeveel hierdie maand", so die indeks
-- is op die tyd.
create index if not exists kits_minutes_at_idx on public.kits_minutes (at desc);

alter table public.kits_minutes enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf dit met die
-- diens-sleutel en die opsomming loop deur die funksie hieronder, wat die enige
-- pad is wat 'n getal teruggee.
drop policy if exists "kits minutes are server only" on public.kits_minutes;

-- ── Hoeveel van die maand oor is ──────────────────────────────────────────
--
-- Kalendermaand, in UTC, want dit is hoe Kits self tel. Ongebruikte minute rol
-- oor by hulle, en hierdie funksie weet niks daarvan nie: dit tel net wat
-- hierdie maand gebruik is. Die oorrol maak die werklike ruimte grôter as wat
-- hierdie getal sê, wat die veilige rigting is om verkeerd te wees.

create or replace function public.kits_seconds_this_month()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0)::bigint
  from public.kits_minutes
  where at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.kits_seconds_this_month() from public, anon, authenticated;
grant execute on function public.kits_seconds_this_month() to service_role;

-- ── Wat één lid hierdie maand van Kits gebruik het ──────────────────────────
--
-- Carli, 9 September 2026: "Ek dink ons gaan baie streng cap op elke user moet
-- sit vir kits se stemkloning. Dus iets soos 5min per persoon. Dan stop ons die
-- funksie wanneer dit opgebruik word deur 'n maand."
--
-- `kits_seconds_this_month()` hierbo tel die hele werkskerm. Dit is die dak wat
-- Kits self stel, en dit keer dat die rekening opraak — maar dit sê niks oor
-- wié dit opgebruik het nie. Een lid wat vyftig minute omskakel, laat die ander
-- nege-en-sewentig met niks, en die eerste wat hulle daarvan weet is 'n
-- weiering.
--
-- Hierdie een tel dieselfde ding vir één eienaar. Dieselfde kalendermaand in
-- UTC, dieselfde tabel, dieselfde rede — dit is die per-lid helfte van 'n
-- antwoord waarvan die werkskerm-helfte reeds bestaan.
--
-- Let op: die per-lid dop voeg geen kapasiteit by nie. 400 minute gedeel deur
-- 5 is 80 lede, en dit bly 80. Wat dit verander is wié die 400 kry: eerlik
-- verdeel eerder as eerste-kom.
--
-- ── Hoekom dit hier staan en nie net in ALMAL.sql nie ───────────────────────
--
-- Dit is op 9 September met die hand in `ALMAL.sql` ingeskryf en nooit hier
-- nie. `ALMAL.sql` word gegenereer: die volgende `npm run sql:bundle` het dit
-- doodeenvoudig uitgevee, want die bron het dit nooit gehad nie.
-- `check:sqlbundle` het die hele tyd rooi gestaan en dít was hoekom.
-- Wat gegenereer word, word nie geredigeer nie.

create or replace function public.kits_seconds_this_month_for(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0)::bigint
  from public.kits_minutes
  where owner = p_owner
    and at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.kits_seconds_this_month_for(uuid) from public, anon, authenticated;
grant execute on function public.kits_seconds_this_month_for(uuid) to service_role;

-- Een indeks vir albei funksies. Sonder die eienaar in die sleutel doen die
-- per-lid vraag 'n volledige skandering van 'n tabel wat by elke omskakeling
-- groei.
create index if not exists kits_minutes_owner_month_idx
  on public.kits_minutes (owner, at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/kitsmine.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Wat één lid hierdie maand van Kits gebruik het ──────────────────────────
--
-- Carli, 9 September 2026: "Ek dink ons gaan baie streng cap op elke user moet
-- sit vir kits se stemkloning. Dus iets soos 5min per persoon. Dan stop ons die
-- funksie wanneer dit opgebruik word deur 'n maand."
--
-- `kits_seconds_this_month()` in kits.sql tel die hele werkskerm. Dit is die
-- dak wat Kits self stel, en dit keer dat die rekening opraak — maar dit sê
-- niks oor wié dit opgebruik het nie. Een lid wat vyftig minute omskakel, laat
-- die ander nege-en-sewentig met niks, en die eerste wat hulle daarvan weet is
-- 'n weiering.
--
-- Hierdie een tel dieselfde ding vir één eienaar. Dieselfde kalendermaand in
-- UTC, dieselfde tabel, dieselfde rede — dit is die per-lid helfte van 'n
-- antwoord waarvan die werkskerm-helfte reeds bestaan.
--
-- Let op: die per-lid dop voeg geen kapasiteit by nie. 400 minute gedeel deur
-- 5 is 80 lede, en dit bly 80. Wat dit verander is wié die 400 kry: eerlik
-- verdeel eerder as eerste-kom.

create or replace function public.kits_seconds_this_month_for(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0)::bigint
  from public.kits_minutes
  where owner = p_owner
    and at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.kits_seconds_this_month_for(uuid) from public, anon, authenticated;
grant execute on function public.kits_seconds_this_month_for(uuid) to service_role;

-- Een indeks vir albei funksies. Sonder die eienaar in die sleutel doen die
-- per-lid vraag 'n volledige skandering van 'n tabel wat by elke omskakeling
-- groei.
create index if not exists kits_minutes_owner_month_idx
  on public.kits_minutes (owner, at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/usage.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — metering and purchases.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Why this exists: the free tier's caps used to live in localStorage, in the
-- visitor's own browser. Anyone could clear site data and start over, which was
-- a design note while generating cost nothing and is an open tap on the owner's
-- ElevenLabs account now that it does. A limit the client enforces is not a
-- limit. These tables move the count somewhere the client cannot reach.
--
-- Two tables:
--   * `generations` — one row per song made, so the day's count is a fact
--   * `purchases`   — one row per song opened or bought, so the download gate
--                     has something to check
--
-- Both are written by the server with the caller's own identity, and the
-- policies below let a person read their own rows and nothing else. Nobody can
-- insert a purchase from the browser: that is the whole point of the gate.

-- ────────────────────────────────────────────────────────── generations ────

create table if not exists public.generations (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- 'preview' is the short watermarked one; 'full' is the whole song.
  kind        text not null check (kind in ('preview', 'full')),
  seconds     integer not null default 0,
  -- Which track this produced, when it produced one.
  track_id    text,
  -- What it cost us, in credits, so spend can be read without guessing.
  credits     integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists generations_owner_day_idx
  on public.generations (owner, created_at desc);

alter table public.generations enable row level security;

-- Read your own; never write from the browser. The server writes these with
-- the service role, which bypasses RLS by design.
drop policy if exists "read own generations" on public.generations;
create policy "read own generations" on public.generations
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── purchases ────

create table if not exists public.purchases (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  track_id    text not null,
  -- 'opened' unlocked the full length; 'owned' removed the watermark and
  -- allows the download. 'owned' implies 'opened'.
  level       text not null check (level in ('opened', 'owned')),
  -- In cents, so no float ever touches money.
  amount_cents integer not null default 0,
  currency    text not null default 'ZAR',
  -- The payment provider's own reference, for reconciliation.
  reference   text,
  created_at  timestamptz not null default now(),
  unique (owner, track_id, level)
);

create index if not exists purchases_owner_track_idx
  on public.purchases (owner, track_id);

alter table public.purchases enable row level security;

drop policy if exists "read own purchases" on public.purchases;
create policy "read own purchases" on public.purchases
  for select using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────────── profiles ───

-- Which tier someone is on. Written by the server when a subscription starts
-- or lapses; never by the browser, or the tiers would be a suggestion.
create table if not exists public.memberships (
  owner       uuid primary key references auth.users (id) on delete cascade,
  tier        text not null default 'free' check (tier in ('free','maker','studio','label')),
  -- When the current period ends. Null means it does not.
  renews_at   timestamptz,
  reference   text,
  updated_at  timestamptz not null default now()
);

alter table public.memberships enable row level security;

drop policy if exists "read own membership" on public.memberships;
create policy "read own membership" on public.memberships
  for select using (auth.uid() = owner);

-- ───────────────────────────────────────────────────────────── counting ────

-- Today's generations for one person, by kind. Used by the server before it
-- spends anything. Defined here rather than in the app so the definition of
-- "today" cannot differ between two callers.
create or replace function public.generations_today(p_owner uuid)
returns table (kind text, used bigint)
language sql
stable
as $$
  select g.kind, count(*)
  from public.generations g
  where g.owner = p_owner
    and g.created_at >= date_trunc('day', now())
  group by g.kind;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/events.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/listens.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — hoeveel keer 'n liedjie geluister is.
--
-- Loop dit ná events.sql en charts.sql, in dieselfde projek. Veilig om weer te
-- loop.
--
-- ── Wat Carli gevra het ────────────────────────────────────────────────────
--
--   "As ons top liedjies uitwys uit ons eie engine, track dit dan die
--    hoeveelheid listens per liedjie?"
--
-- Dit het nie. `events` dra 'n unieke indeks oor (soort, luisteraar, ding,
-- dag), en daardie indeks is die hele rede waarom die toplys eerlik is: dit
-- keer dat iemand homself boontoe druk. Maar dit gooi ook die herhalings weg
-- voordat hulle geskryf word, so die syfer 'n maker eintlik wil sien — my
-- liedjie is 47 keer geluister — het nêrens bestaan nie.
--
-- ── Hoekom 'n teller en nie 'n nuwe tabel nie ─────────────────────────────
--
-- 'n Tweede tabel met een ry per luisterbeurt sou werk en sou die duurste
-- moontlike antwoord wees: 'n nuwe skryfpad, 'n nuwe indeks, en 'n tabel wat
-- groei met elke keer wat iemand 'n liedjie oorspeel.
--
-- Die ry bestaan reeds. Sit 'n teller daarop, en:
--
--   · die toplys tel steeds *rye*, dus steeds luisteraars, dus onveranderd
--   · die rou syfer is die som van daardie tellers
--   · niks groei wat nie reeds gegroei het nie
--
-- Twee getalle uit een ry, en die een kan nie die ander bederf nie.

-- Bestaande rye tel as een luisterbeurt, wat hulle was.
alter table public.events add column if not exists times integer not null default 1;

-- ── Skryf, of tel op ───────────────────────────────────────────────────────
--
-- Die insetsel was 'n gewone `insert` wat op die unieke indeks misluk het en
-- stilweg geïgnoreer is — 'n herhaling is nie 'n fout nie, dit beteken die
-- persoon het teruggekom. Nou is die terugkoms die punt, so dit word getel.
--
-- In die databasis eerder as in die toep, om dieselfde rede as altyd: enigiemand
-- kan die roete bo-op dit roep, en 'n reël wat in die roeper se hande afgedwing
-- word, is nie afgedwing nie.
create or replace function public.note_event(
  want_kind text,
  want_category text,
  want_ref text,
  want_owner uuid,
  want_visitor text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.events (kind, category, ref, owner, visitor)
  values (want_kind, want_category, want_ref, want_owner, want_visitor)
  on conflict (kind, visitor, coalesce(ref, ''), day)
  do update set times = public.events.times + 1;
$$;

revoke all on function public.note_event(text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.note_event(text, text, text, uuid, text) to service_role;

-- ── Wat 'n maker van sy eie liedjies mag sien ─────────────────────────────
--
-- Sy eie, en niks anders nie. Dit neem die eienaar as 'n argument eerder as om
-- `auth.uid()` te lees, want dit word deur die bediener geroep met die rol wat
-- die rye skryf — dieselfde houding as `charts_top`. Die roete daarbo weet wie
-- die roeper is; hierdie funksie weet net wie se liedjies gevra is.
--
-- `listeners` en `listens` is twee verskillende vrae en albei word geantwoord:
-- hoeveel mense, en hoeveel kere. Om net die tweede te wys sou 'n liedjie wat
-- een mens veertig keer gespeel het laat lyk soos een wat veertig mense gehoor
-- het, en dit is die presiese leuen wat die toplys se indeks voorkom.
create or replace function public.listens_for(want_owner uuid, days integer default 3650)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
    select
      e.ref                                as ref,
      sum(e.times)::bigint                 as listens,
      count(*)::bigint                     as listeners,
      max(e.day)                           as last_day
    from public.events e
    join public.tracks t on t.id = e.ref
    where e.kind = 'play'
      and e.ref is not null
      and t.owner = want_owner
      and e.day >= (now() at time zone 'utc')::date - greatest(days, 1)
    group by e.ref
    order by sum(e.times) desc, max(e.day) desc
  ) r;
$$;

revoke all on function public.listens_for(uuid, integer) from public, anon, authenticated;
grant execute on function public.listens_for(uuid, integer) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/live.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — the live channel.
--
-- Run this after schema.sql, podcast.sql and presence.sql, in the same
-- project. Safe to run again.
--
-- ── What this is ─────────────────────────────────────────────────────────
--
-- One room, shared by everybody: people put a song in it, other people listen
-- to each other's, and you can see who is in there with you. That is the whole
-- idea and it is deliberately one room rather than a room each — a channel
-- with four people in it is a place, and forty rooms with one person in each
-- is nobody.
--
-- It also holds the other kind of live, which is somebody going live somewhere
-- this app cannot broadcast to. FutureBox has no media server: it cannot carry
-- a microphone or a camera to an audience, and a "Go live" button that quietly
-- did nothing would be the worst thing on the site. What it can do honestly is
-- say *when* and *where* — a time, a platform and a link — so the room counts
-- down to it and everybody in the room can follow.
--
-- Both are the same object, because they are the same act: telling the people
-- who are here that there is something to listen to now.
--
-- ── What is not here ─────────────────────────────────────────────────────
--
-- No audio. A song posted here stays in the private `tracks` bucket where it
-- already lives, and the server hands out a short-lived signed link for the
-- ones that have actually been posted. Copying every posted song into a public
-- bucket would be a second copy of somebody's master sitting at a guessable
-- address forever, and posting to a room is not the same as publishing a file.
--
-- `owner` cascades: a deleted account takes its posts and its messages with
-- it. Unlike a refusal, which is evidence, a post is somebody speaking, and
-- somebody who has left should stop speaking.

-- ────────────────────────────────────────────────────────────── posts ────

create table if not exists public.live_posts (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  -- 'track' is a song in this app; 'episode' is a published podcast episode,
  -- which is public already; 'elsewhere' is somebody going live on a platform
  -- this app cannot broadcast to.
  kind        text not null check (kind in ('track', 'episode', 'elsewhere')),
  -- The track id or the episode id. Empty for 'elsewhere', which has no file.
  source_id   text not null default '',
  title       text not null,
  note        text not null default '',
  seconds     integer not null default 0,
  -- Only for 'elsewhere'.
  platform    text not null default '',
  link        text not null default '',
  starts_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists live_posts_recent_idx on public.live_posts (created_at desc);
create index if not exists live_posts_owner_idx  on public.live_posts (owner, created_at desc);

-- ─────────────────────────────────────────────────────────── the room ────

create table if not exists public.live_says (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists live_says_recent_idx on public.live_says (created_at desc);

-- Who is in the room this minute. `presence` answers "how many are on the
-- site", which is a different question: somebody reading the terms page is on
-- the site and is not in the room.
create table if not exists public.live_here (
  visitor     text primary key,
  -- Null for somebody who has not signed in. They can listen; they cannot post.
  owner       uuid references auth.users (id) on delete cascade,
  name        text not null default '',
  seen_at     timestamptz not null default now()
);

create index if not exists live_here_seen_idx on public.live_here (seen_at desc);

-- ───────────────────────────────────────────────────── who may see what ────
--
-- On, with no policy, on all three: every read and write goes through the
-- server. That is not caution for its own sake — the server is the only place
-- that can decide whether a signed link to somebody's private song should be
-- handed out, and a browser reading `live_posts` straight from the database
-- would get the ids without that decision ever being made.

alter table public.live_posts enable row level security;
alter table public.live_says  enable row level security;
alter table public.live_here  enable row level security;

grant select, insert, update, delete on public.live_posts to service_role;
grant select, insert, delete        on public.live_says  to service_role;
grant select, insert, update, delete on public.live_here to service_role;

-- ──────────────────────────────────────────────────────── housekeeping ────

-- Who is in the room, now. Two minutes, like `presence`: long enough that an
-- open tab never blinks out between hellos, short enough that closing one
-- drops you out while somebody is still looking at the number.
create or replace function public.live_room_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.live_here
   where seen_at > now() - interval '2 minutes';
$$;

revoke all on function public.live_room_count() from public;
grant execute on function public.live_room_count() to service_role;

-- Say hello, and sweep up after whoever left. Doing the sweep here rather than
-- on a schedule means the table cannot grow without bound in a project with no
-- cron — every hello pays for a little of the cleaning.
create or replace function public.live_hello(p_visitor text, p_owner uuid, p_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_here (visitor, owner, name, seen_at)
  values (p_visitor, p_owner, coalesce(p_name, ''), now())
  on conflict (visitor)
  do update set owner = excluded.owner, name = excluded.name, seen_at = now();

  delete from public.live_here where seen_at < now() - interval '1 hour';

  return public.live_room_count();
end;
$$;

revoke all on function public.live_hello(text, uuid, text) from public;
grant execute on function public.live_hello(text, uuid, text) to service_role;

-- ────────────────────────────────────────── wat 'n liedjie se soort is ────
--
-- Carli, 14 September 2026: "in die live room en in channel wys die liedjie
-- se naam op die liedjie window, die artist name, en die genre van die
-- liedjie. Dit gaan dit makliker maak vir ander users om by mekaar te leer en
-- te hoor watter genre regtig werk en mooi klink."
--
-- Die naam en die maker se naam was al op 'n plasing. Die genre nie — en dit
-- is die een van die drie wat nie afgelei kan word nie: 'n liedjie se soort
-- staan op die MAKER se eie ry op sy eie toestel, waar niemand anders daarby
-- kan kom nie. Sonder hierdie kolom kan die kamer dit eenvoudig nie wys nie.
--
-- Die generasie-styl kom NIE hierheen nie. Dit word saam met die liedjie
-- gestoor waar dit hoort, op die maker se eie ry. Iemand se aanwysing in 'n
-- openbare tabel sit is 'n ander besluit as om dit te stoor, en dit is nie
-- gevra nie.
--
-- `if not exists`, want hierdie tabel bestaan reeds en hierdie lêer moet twee
-- keer kan loop.
alter table public.live_posts
  add column if not exists genre text not null default '';

-- ── Die woorde van die liedjie, sodat die play room hulle kan wys ─────────
--
-- Carli, 14 September 2026: *"Die play room moet die liedjie se woorde
-- speel."*
--
-- Niemand in die kamer kan hulle gaan haal nie. 'n Liedjie se woorde lê op sy
-- maker se eie ry en op sy eie toestel; almal wat die kamer lees is iemand
-- anders. Dieselfde rede as die genre.
--
-- Gestoor as die plan (die [Afdeling]-blokke met hulle reëls en sekondes),
-- nie as afgewerkte tydstempels nie. Die kamer versprei dit self oor die
-- lengte, so 'n liedjie wat 'n sekonde langer speel as wat die ry sê bly in
-- pas — en die ry bly klein, want 'n plan is 'n paar kilogrepe en 'n volle
-- stel tydstempels is baie meer.
--
-- Leeg waar daar niks is nie: 'n episode, 'n skakel, of 'n liedjie sonder
-- woorde. Die skerm wys dan die kamer soos hy altyd was.
--
-- `if not exists`, want hierdie lêer moet twee keer kan loop.
--
-- ── Dieselfde kolom staan ook in supabase/roomwords.sql ─────────────
--
-- Dit is EEN verandering, nie twee nie, en dit is met opset op twee plekke:
--
--   · Hier, want hierdie lêer bou die tabel. Iemand wat 'n nuwe projek
--     opstel loop hierdie lêer en kry 'n volledige live_posts.
--   · In roomwords.sql, want hierdie lêer is reeds geloop op die projek wat
--     loop. 'n Kolom wat by 'n reeds-gelope lêer bygevoeg word, is onsigbaar
--     vir enigiemand wat net die groot plak (ALMAL.sql) loop — en ALMAL.sql
--     is per definisie die lêers wat nog nooit geloop het nie.
--
-- Albei is `if not exists`, so albei loop is veilig. Loop net een.
alter table public.live_posts
  add column if not exists words jsonb;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/mail.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────── mail log ────
--
-- What was sent, and — more to the point — what must not be sent twice.
--
-- Paystack retries a webhook on any non-2xx answer, and the webhook is where
-- receipts come from. Without a claim, a provider hiccup that made us answer
-- 500 would send a second receipt for the same payment on the retry. The
-- purchase itself is already guarded by its reference; this guards the letter.
--
-- The claim is a unique constraint rather than a check-then-insert, because
-- check-then-insert is a race between two webhook deliveries arriving at two
-- instances at once, and that is exactly the case it needs to survive.
--
-- It doubles as a record: which letters went, which failed, and why. When
-- somebody says they never got a receipt, this is the answer.

create table if not exists public.mail_log (
  id          uuid primary key default gen_random_uuid(),
  -- The claim. `receipt:<paystack reference>`, `welcome:<owner>`, and so on.
  dedupe_key  text not null unique,
  kind        text not null,
  to_email    text not null,
  -- Null until the send has been attempted. A row with `ok` still null is one
  -- that was claimed and never finished — a crash mid-flight, and worth
  -- looking at if somebody is missing a letter.
  ok          boolean,
  detail      text,
  claimed_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists mail_log_kind_idx on public.mail_log (kind, claimed_at desc);

-- ────────────────────────────────────────────────────── who may see what ────
--
-- On, with no policy: every read and write goes through the server. This table
-- holds the email address of every paying member, which is the last thing that
-- should be reachable with the anon key.

alter table public.mail_log enable row level security;

grant select, insert, update on public.mail_log to service_role;

-- ───────────────────────────────────────────────────────── housekeeping ────
--
-- The claim only has to outlive the retries — Paystack gives up long before a
-- day. A year is kept anyway, because "did my receipt go out in March" is a
-- question somebody asks, and the rows are three short strings.

create or replace function public.mail_log_sweep()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.mail_log where claimed_at < now() - interval '1 year';
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/moderation.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — the record of what was refused.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Two reasons this table exists, and neither is punishment.
--
-- The first is that a refusal nobody can see is a refusal nobody can check.
-- If this platform is ever asked — by a rights holder, by a regulator, by
-- somebody whose voice was misused — whether it enforces its own rules, the
-- only useful answer is a list of the times it did. A policy document is a
-- claim; this is evidence.
--
-- The second is repetition. One refused prompt is somebody finding out where
-- the line is. Twenty is somebody looking for a way around it, and the account
-- needs to stop before the twenty-first.
--
-- ── What is kept, and what is not ────────────────────────────────────────
--
-- The excerpt is the first 200 characters of what was typed, because a
-- moderation log that does not say what was moderated cannot be reviewed by a
-- person, and every one of these will eventually need to be. It is the refused
-- text only: nothing that passed is written here.
--
-- `owner` is set to null when the account is deleted rather than the row going
-- with it. Deleting an account has to be real — and it is, everywhere else —
-- but a platform that forgets its refusals the moment somebody signs up again
-- has no memory at all. What is left behind is the rule, the surface, the time
-- and a salted hash of the address. Not a name, not an email, not an account.
-- The privacy policy says this in those words.

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete set null,
  -- Where it was typed: song, video, speech, name, finetune.
  surface text not null,
  -- Which rule refused it.
  rule text not null,
  -- Whether this one counts towards a suspension. A style prompt that strays
  -- near a famous name is a mistake; the rest are not.
  counts boolean not null default true,
  -- 'rules' for the fixed list, 'classifier' for the model that reads the
  -- sentence. Worth keeping apart: if one of them is wrong, it matters which.
  decided_by text not null default 'rules',
  excerpt text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_events_owner_idx
  on public.moderation_events (owner, created_at desc);

create index if not exists moderation_events_ip_idx
  on public.moderation_events (ip_hash, created_at desc);

-- Nobody reads this from a browser. No policy is granted on purpose: with row
-- level security on and no policy, the anon and authenticated roles can do
-- nothing at all, and the service role — which is server-only — bypasses it.
-- Somebody must not be able to read back the list of what they were refused
-- for, because that list is a map of where the line is.
alter table public.moderation_events enable row level security;

-- How many refusals count against this account in the window.
--
-- Counted by account *and* by address, so a suspension is not undone by
-- signing up again from the same machine. Nulls count nothing rather than
-- everything, which is the safe direction when a signal is simply missing.
create or replace function public.moderation_strikes(
  p_owner uuid,
  p_ip_hash text default null,
  p_days integer default 30
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*), 0)::integer
  from public.moderation_events e
  where e.counts
    and e.created_at >= now() - make_interval(days => greatest(1, p_days))
    and (
      (p_owner is not null and e.owner = p_owner)
      or (p_ip_hash is not null and p_ip_hash <> '' and e.ip_hash = p_ip_hash)
    );
$$;

revoke all on function public.moderation_strikes(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.moderation_strikes(uuid, text, integer) to service_role;

-- The consent record that goes with a cloned voice lives in podcast.sql,
-- beside the table it describes. It was here, and this file then failed on any
-- project where the podcast migration had not been run yet — a migration that
-- reaches into another one's table is a migration with an order nobody was
-- told about.


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/podcast.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — podcast shows, episodes, and the voices that read them.
--
-- Run this after schema.sql, usage.sql and events.sql, in the same project.
-- Safe to run again.
--
-- What this is for: somebody brings a show to FutureBox and gets a real one —
-- a channel with a name and a picture, episodes people can play, a feed that
-- Apple Podcasts and Spotify will accept, and links out to wherever their
-- audience already is. Not a demo of a podcast page.
--
-- One decision worth stating, because it cannot be undone quietly later: the
-- episode audio bucket is **public**. Podcast apps fetch the file from an
-- ordinary URL, on their own schedule, for years — a signed link that expires
-- in an hour is a show that stops working by lunchtime. Anything published
-- here is published, and the app says so before the button is pressed.

-- ─────────────────────────────────────────────────────────────── voices ────

-- A cloned voice belongs to one person and is usable by nobody else.
--
-- The ElevenLabs account behind the app is a single account, so without this
-- table every clone anybody made would be visible and usable by everybody
-- else. That is the whole reason it exists: the ownership is ours to enforce,
-- because their API has no notion of our users.
create table if not exists public.voices (
  -- ElevenLabs' own voice id.
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  -- Recorded, and confirmed by the person that it is their own voice. Stored
  -- because consent that cannot be produced later is not consent.
  consented_at timestamptz not null default now(),
  -- The proof, rather than the assertion. A checkbox that leaves no trace is
  -- worth nothing the moment somebody says "I never agreed to that", so what
  -- is kept is the exact sentence that was on the screen and a salted hash of
  -- the address it was accepted from. Not an argument — a record.
  --
  -- `consent_text` is the English wording from app/lib/consent.ts even where
  -- the screen showed Afrikaans: a record needs one wording rather than one
  -- per language, and the terms say the English version governs.
  consent_ip_hash text,
  consent_text text,
  created_at  timestamptz not null default now()
);

-- For projects where `voices` was created before those two columns existed.
-- Voices cloned then keep a null `consent_text`, which is the truthful value:
-- the confirmation was required and given, it was simply not written down, and
-- backfilling one would be inventing evidence.
alter table public.voices
  add column if not exists consent_ip_hash text,
  add column if not exists consent_text text;

create index if not exists voices_owner_idx on public.voices (owner);

alter table public.voices enable row level security;

drop policy if exists "read own voices" on public.voices;
create policy "read own voices" on public.voices
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────────── shows ────

create table if not exists public.shows (
  -- The slug in the feed's address, so it has to be stable and readable.
  id          text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  about       text not null default '',
  author      text not null default '',
  image_url   text,
  -- Two letters. Apple rejects a feed whose language it cannot read.
  language    text not null default 'en',
  -- Where the audience already is: {"x": "...", "instagram": "...", ...}.
  links       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists shows_owner_idx on public.shows (owner);

alter table public.shows enable row level security;

-- A published show is public by nature — the feed is meant to be fetched by
-- anybody's podcast app. Writing is still the owner's alone.
drop policy if exists "read shows" on public.shows;
create policy "read shows" on public.shows for select using (true);

-- ───────────────────────────────────────────────────────────── episodes ────

create table if not exists public.episodes (
  id           text primary key,
  show_id      text not null references public.shows (id) on delete cascade,
  owner        uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  notes        text not null default '',
  -- Path inside the public `episodes` bucket.
  audio_path   text not null,
  seconds      integer not null default 0,
  bytes        bigint not null default 0,
  -- How it was made, and it is printed on the episode.
  --   recorded — a person at a microphone
  --   cleaned  — that recording, with the room taken out of it
  --   spoken   — read aloud by a cloned voice from a script
  -- The provenance rule this app already applies to lectures applies here: a
  -- listener must never have to work out unaided that a voice was synthesised.
  made         text not null default 'recorded' check (made in ('recorded', 'cleaned', 'spoken')),
  published_at timestamptz not null default now()
);

create index if not exists episodes_show_idx on public.episodes (show_id, published_at desc);

alter table public.episodes enable row level security;

drop policy if exists "read episodes" on public.episodes;
create policy "read episodes" on public.episodes for select using (true);

-- ─────────────────────────────────────────────────────────────── bucket ────

insert into storage.buckets (id, name, public)
values ('episodes', 'episodes', true)
on conflict (id) do update set public = true;

-- Anyone may read a published episode; only its owner may put one there. The
-- first path segment is the owner's id, which is what ties a file to a person.
drop policy if exists "read episodes audio" on storage.objects;
create policy "read episodes audio" on storage.objects
  for select using (bucket_id = 'episodes');

drop policy if exists "write own episodes audio" on storage.objects;
create policy "write own episodes audio" on storage.objects
  for insert with check (
    bucket_id = 'episodes' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "replace own episodes audio" on storage.objects;
create policy "replace own episodes audio" on storage.objects
  for update using (
    bucket_id = 'episodes' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "delete own episodes audio" on storage.objects;
create policy "delete own episodes audio" on storage.objects
  for delete using (
    bucket_id = 'episodes' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ────────────────────────────────────────────────────────── the day's use ──

-- One row per script read aloud, so the day's use is a fact rather than
-- something the browser reports about itself. Same reasoning as `generations`:
-- a limit the client enforces is not a limit.
create table if not exists public.speech_runs (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  characters  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists speech_runs_owner_day_idx
  on public.speech_runs (owner, created_at desc);

alter table public.speech_runs enable row level security;

drop policy if exists "read own speech" on public.speech_runs;
create policy "read own speech" on public.speech_runs
  for select using (auth.uid() = owner);

-- How many times today, defined here so two callers cannot disagree about
-- where the day starts.
create or replace function public.speech_today(p_owner uuid)
returns bigint
language sql
stable
as $$
  select count(*)
  from public.speech_runs
  where owner = p_owner
    and created_at >= date_trunc('day', now());
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/posting.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────── the posting queue ──
--
-- What goes out, where, and when.
--
-- ── What this is, and what it is honestly not ────────────────────────────
--
-- It is the half of automatic posting that needs nobody's permission: a row
-- that says "this, on Tuesday at six", and a clock that notices when Tuesday
-- at six has arrived.
--
-- It is not, yet, a thing that posts to TikTok. Every platform needs its own
-- developer account, its own client id and secret, and this app's address on
-- somebody else's redirect list — none of which the app can arrange for
-- itself, and Apple, Meta and TikTok all take days to weeks to approve one.
-- So the queue is built first and the connectors arrive one at a time behind
-- a single interface, without any of this changing.
--
-- Until a platform is connected the queue does the one thing it can do
-- honestly: it sends the person a reminder with what they planned to post, at
-- the time they planned to post it. That is a real feature rather than a
-- placeholder — a plan that reminds you on Tuesday at six is the difference
-- between a plan and a document about a plan — and it is why `handler` has a
-- 'remind' value rather than the table waiting empty for an integration.
--
-- ── Why the state is a column and not a pair of booleans ─────────────────
--
-- 'due' → 'sending' → 'sent', or → 'failed', or → 'cancelled'. A queue built
-- from `is_sent` and `is_failed` has states that mean nothing (both true) and
-- states it cannot express (in flight), and the second one is what produces
-- the same post going out twice when two workers overlap.

create table if not exists public.scheduled_posts (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,

  -- Where it is meant to go. Free text rather than an enum: the list of
  -- platforms is a product decision that moves, and a migration to add
  -- Threads is a migration nobody will run.
  platform    text not null check (platform <> '' and length(platform) <= 40),

  -- Who actually does the sending. 'remind' emails the owner; a platform name
  -- here means a connector exists for it. See `app/lib/server/posting`.
  handler     text not null default 'remind' check (handler in ('remind')),

  -- What to post. The words, and where the file is if there is one.
  caption     text not null default '' check (length(caption) <= 5000),
  -- A path in one of this project's buckets, or empty. Not a URL: a signed URL
  -- expires long before a post scheduled for next week goes out.
  media_path  text not null default '' check (length(media_path) <= 400),

  -- The moment it should go. Stored as an instant, not a local time: the
  -- person's timezone is theirs, and a queue that stores "18:00" has to guess
  -- whose six o'clock it means.
  due_at      timestamptz not null,

  state       text not null default 'due'
                check (state in ('due', 'sending', 'sent', 'failed', 'cancelled')),

  -- How many times the worker has picked it up, so a row that fails forever
  -- stops being picked up rather than being retried until the end of time.
  attempts    integer not null default 0 check (attempts >= 0),
  -- What went wrong, in words, for the screen to show.
  note        text not null default '' check (length(note) <= 500),

  created_at  timestamptz not null default now(),
  -- When a worker last took it. Distinct from `created_at`, and the release
  -- below depends on the difference: a row created two days ago and claimed a
  -- minute ago is not stuck, and comparing against `created_at` would have
  -- freed it immediately and sent it twice.
  claimed_at  timestamptz,
  sent_at     timestamptz
);

-- The worker's only query: what is due, oldest first.
create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (state, due_at)
  where state = 'due';

-- And the screen's: everything of mine, soonest first.
create index if not exists scheduled_posts_owner_idx
  on public.scheduled_posts (owner, due_at);

alter table public.scheduled_posts enable row level security;

-- Read your own. Everything else is the server's, with the service role.
drop policy if exists "read own scheduled posts" on public.scheduled_posts;
create policy "read own scheduled posts" on public.scheduled_posts
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── claiming work ──
--
-- The one piece of this that is not obvious.
--
-- A worker that reads the due rows and then updates them has a gap between the
-- read and the write, and two workers that overlap in that gap both send the
-- same post. Vercel will happily run a cron twice — a retry after a timeout is
-- an ordinary event — so this is not a theoretical race, it is the normal one.
--
-- `for update skip locked` is the standard answer: each worker takes rows
-- nobody else has taken, in one statement, and the ones already claimed are
-- skipped rather than waited for. The state moves to 'sending' inside the same
-- statement, so a row is claimed and marked in one go.

create or replace function public.claim_due_posts(p_limit integer default 20)
returns setof public.scheduled_posts
language sql
security definer
set search_path = public
as $$
  update public.scheduled_posts
     set state = 'sending', attempts = attempts + 1, claimed_at = now()
   where id in (
     select id
       from public.scheduled_posts
      where state = 'due'
        and due_at <= now()
        -- Given up on after this many tries. A row that has failed five times
        -- is not going to succeed on the sixth, and a queue that retries
        -- forever is a queue that sends an apology every hour.
        and attempts < 5
      order by due_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
   )
  returning *;
$$;

revoke all on function public.claim_due_posts(integer) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────── stuck in 'sending' ──
--
-- A worker that dies mid-send leaves a row claimed and never finished. Without
-- this it sits in 'sending' forever and is never picked up again — the quiet
-- failure that queues are famous for.
--
-- Anything claimed more than an hour ago and still in flight goes back to
-- 'due'. The attempt count is not reset, so a row that keeps dying still runs
-- out of attempts rather than looping.

create or replace function public.release_stuck_posts()
returns integer
language sql
security definer
set search_path = public
as $$
  with freed as (
    update public.scheduled_posts
       set state = 'due'
     where state = 'sending'
       and claimed_at is not null
       and claimed_at < now() - interval '1 hour'
       and attempts < 5
    returning 1
  )
  select count(*)::integer from freed;
$$;

revoke all on function public.release_stuck_posts() from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/presence.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — how many people are here right now.
--
-- Run this after schema.sql and events.sql, in the same project. Safe to run
-- again.
--
-- `events` already counts visits, but a visit is a thing that happened today;
-- it cannot answer "who is on the site at this moment", which is a different
-- question and needs a different shape. This is that shape: one row per
-- browser, overwritten every time it says hello, and a count of the ones that
-- said hello recently.
--
-- It holds nothing about anybody. The visitor id is the same random string
-- `events` uses — thirty-two hex characters the browser made up and keeps —
-- and rows are thrown away within the hour, so this table is a number and a
-- clock rather than a record of who was where.

create table if not exists public.presence (
  visitor text primary key,
  seen_at timestamptz not null default now()
);

create index if not exists presence_seen_idx on public.presence (seen_at desc);

alter table public.presence enable row level security;

-- No policy grants anything. The browser neither reads nor writes this: the
-- server does both with the service role, and the only thing that comes back
-- out is a count.

-- ────────────────────────────────────────────────────────────── the count ───

-- Here now: seen within the last two minutes.
--
-- Two minutes because a browser says hello every thirty seconds, so a tab that
-- is genuinely open cannot fall out of the window through one slow request,
-- and a tab that was closed drops out of it quickly enough that the number
-- means "now" rather than "recently".
create or replace function public.here_now()
returns integer
language sql
stable
as $$
  select count(*)::int from public.presence where seen_at > now() - interval '2 minutes';
$$;

-- Old rows are not history, they are litter.
create or replace function public.presence_sweep()
returns void
language sql
volatile
as $$
  delete from public.presence where seen_at < now() - interval '1 hour';
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/radar.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — the collab radar: who else is making something near your sound.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- The radar matched demo tracks against demo tracks, which made it a
-- demonstration of matching rather than a way to find anybody. Matching real
-- people needs two things that did not exist: songs their makers have chosen
-- to show, and a name to put on a match.
--
-- **Sharing is opt-in and per song.** A track is private until its owner turns
-- it on, one at a time. Nothing here makes anything public by default, and the
-- audio is not shared at all — only what a match is computed from: tempo, key,
-- the style words, the title. Somebody looking for a collaborator does not need
-- the file, and handing it over would be a licence question nobody agreed to.

-- ─────────────────────────────────────────────────────── shared tracks ────

alter table public.tracks
  add column if not exists shared boolean not null default false;

create index if not exists tracks_shared_idx
  on public.tracks (shared, created_at desc) where shared;

-- The existing policy lets you read your own. This adds the shared ones, which
-- is additive: policies for the same command are ORed together, so nobody
-- loses access to their own rows.
drop policy if exists "read shared tracks" on public.tracks;
create policy "read shared tracks" on public.tracks
  for select using (shared = true);

-- ────────────────────────────────────────────────────────────── creators ────

-- A name and a way to be reached, for people who put a song on the radar.
--
-- Separate from `shows` on purpose: somebody can be looking for a collaborator
-- without running a podcast, and tying the two together would mean making a
-- show to be findable.
create table if not exists public.creators (
  owner       uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  -- What appears as @handle. Unique, because it is how one creator is told
  -- from another in a list.
  handle      text unique,
  about       text not null default '',
  -- {"x": "https://…", "instagram": "https://…", …}. Only ever https links.
  links       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.creators enable row level security;

-- Public to read: the whole point is being found. Writing is your own alone,
-- and the server does that with the service role after checking the token.
drop policy if exists "read creators" on public.creators;
create policy "read creators" on public.creators for select using (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/roomwords.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — die woorde van 'n liedjie, saam met die plasing in die kamer.
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat dit regmaak ──────────────────────────────────────────────────────
--
-- Carli, 14 September 2026: *"Die play room moet die liedjie se woorde
-- speel."*
--
-- Die speelkamer het die woorde nie gehad nie, en dit was nie 'n skerm wat
-- vergeet het om hulle te wys nie — hulle was nooit daar nie. 'n Plasing dra
-- die klank, die omslag, die titel en die genre, en die woorde het by die
-- maker se eie liedjie agtergebly. Iemand wat 'n liedjie in die kamer oopmaak
-- kon hom hoor en nie saamlees nie.
--
-- ── Waarom jsonb en nie teks nie ─────────────────────────────────────────
--
-- Omdat die kamer die woorde *speel* en nie net wys nie. 'n Reël wat oplig
-- wanneer sy beurt kom het 'n tyd nodig, nie net 'n string nie, en dit is
-- presies die vorm waarin die opname se woorde reeds hier rondgaan: 'n lys
-- van reëls, elk met sy eie begin. Teks sou beteken die tydsberekening word
-- elke keer weer geraai, en 'n geraaide tydsberekening is presies wat 'n
-- mens sien wanneer die woorde agter die sang aansleep.
--
-- Leeg toegelaat, want elke plasing wat reeds in die kamer is, is geplaas
-- voordat hierdie kolom bestaan het. Sonder woorde wys die kamer die
-- liedjie soos hy was; met woorde lees hy saam.

-- ── Dieselfde kolom staan ook in supabase/live.sql ─────────────────
--
-- Carli, 15 September: *"Dit lyk of ek 2 sql's moet hardloop."*
--
-- Dit is EEN verandering. live.sql bou die tabel, so die kolom hoort daar
-- vir 'n nuwe projek; hierdie lêer bestaan omdat live.sql reeds geloop het
-- op die projek wat loop, en 'n kolom wat by 'n reeds-gelope lêer bygevoeg
-- word, bereik niemand wat net die groot plak loop nie.
--
-- Albei is `if not exists`. Loop net een; albei is ook veilig.

alter table public.live_posts
  add column if not exists words jsonb;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/subscriptions.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — recurring memberships, as Paystack knows them.
--
-- Run this after schema.sql and usage.sql, in the same project. Safe to run
-- again.
--
-- `memberships` already says which tier somebody is on and when the current
-- period ends; that stays the one thing the app reads when it decides what
-- anybody may do. This table is the other half: the payment provider's own
-- handles for the same arrangement, so a renewal can be recognised and a
-- cancellation can actually be sent.
--
-- Why it is needed at all. A first charge carries our metadata, so it says who
-- it belongs to. A renewal, months later, does not — Paystack raises it from
-- the subscription, not from the checkout we started. Without somewhere to
-- have written down that this customer is this person, every renewal after the
-- first would arrive with nowhere to go and the membership would lapse while
-- the money kept coming. So the customer code is written down on the first
-- charge and every renewal is matched on it.
--
-- The email token is Paystack's, and it is what their disable endpoint asks
-- for alongside the subscription code. It is not a credential for anything
-- else and it is never sent to a browser.

create table if not exists public.subscriptions (
  owner             uuid primary key references auth.users (id) on delete cascade,
  -- Paystack's handle for the person paying, e.g. CUS_xxxx. The join key for
  -- every renewal after the first.
  customer_code     text not null,
  -- Paystack's handle for the arrangement itself, e.g. SUB_xxxx. Null until
  -- their side has actually created it.
  subscription_code text,
  -- Required, with the code, to cancel. Paystack's word, not ours.
  email_token       text,
  -- Which of our Paystack plans this is, e.g. PLN_xxxx.
  plan_code         text,
  tier              text not null check (tier in ('maker', 'studio', 'label')),
  -- Paystack's own word for it: active, non-renewing, attention, cancelled,
  -- completed. Stored as they say it rather than mapped, so a status we have
  -- not seen before is still readable in the row.
  status            text not null default 'active',
  next_payment_at   timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (customer_code);

alter table public.subscriptions enable row level security;

-- Reading your own is all a browser needs, and it is how the account screen
-- shows what is being charged and when. Every write is the webhook's or the
-- cancel route's, both of which hold the service key.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = owner);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/taste.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/video.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — hosted video, and the ceiling that keeps it affordable.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Kling answers a generation request with a task id and makes the video
-- afterwards, over minutes. So a video is a row before it is a file: started
-- here, collected later, and refunded if the engine gives up. Without the row
-- there is nothing to come back to when the browser has been closed, and a
-- member who closed a tab would have paid for a video nobody ever collects.
--
-- ── The ceiling, and why it is counted in Kling's credits ────────────────
--
-- The video plan is bought by the month and does not stretch. When it runs
-- out, every generation fails — and the failure a member would see is a
-- meaningless engine error at the end of a two-minute wait, after paying.
--
-- So the spend is counted here, before the request goes, in Kling's own
-- credits rather than in videos: a ten-second clip costs twice a five-second
-- one, and a ceiling counted in videos would be overspent by half without
-- anything looking wrong. Over the ceiling, the answer is immediate, honest,
-- and free: the allowance is used up, it comes back on the first.
--
-- Failed rows are not counted. Kling does not charge for what it did not make,
-- and neither does this.

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  -- Kling's id for the job. Null only if the engine never accepted it.
  task_id text,
  prompt text not null,
  aspect text not null default '16:9',
  seconds integer not null default 5,
  -- What the member paid, in FutureBox credits, so a refund knows the amount.
  credits integer not null default 0,
  -- What it costs the platform, in Kling's credits. The ceiling counts these.
  kling_credits integer not null default 0,
  model text,
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  -- Set once the file has been fetched from Kling and put in our own bucket.
  -- Their URLs expire; a video a member cannot open next week is not a video.
  path text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists videos_owner_idx on public.videos (owner, created_at desc);
create index if not exists videos_task_idx on public.videos (task_id);
create index if not exists videos_month_idx on public.videos (created_at desc) where status <> 'failed';

alter table public.videos enable row level security;

drop policy if exists "read own videos" on public.videos;
create policy "read own videos" on public.videos
  for select using (auth.uid() = owner);

-- No insert, update or delete policy on purpose. Every write happens on the
-- server after the token has been checked: a browser that could insert its own
-- row could grant itself a video, and one that could update a row could mark a
-- failure as done and keep the credits.

-- What the platform has spent with Kling this calendar month.
create or replace function public.kling_spend_this_month()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(kling_credits), 0)::integer
  from public.videos
  where status <> 'failed'
    and created_at >= date_trunc('month', now());
$$;

revoke all on function public.kling_spend_this_month() from public, anon, authenticated;
grant execute on function public.kling_spend_this_month() to service_role;

-- ─────────────────────────────────────────────────────────────── bucket ────
--
-- Private, unlike the podcast bucket. An episode is published; a video is the
-- member's until they decide otherwise, so it is read through a signed link
-- the server hands out rather than by anybody who guesses the path.

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do update set public = false;

drop policy if exists "read own videos file" on storage.objects;
create policy "read own videos file" on storage.objects
  for select using (
    bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "delete own videos file" on storage.objects;
create policy "delete own videos file" on storage.objects
  for delete using (
    bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Nothing writes here from a browser. The file arrives from Kling, through the
-- server, which is the only party that has ever seen it.


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/video2.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — more than one video engine, and the measurement that decides.
--
-- Run this after video.sql, in the same project. Safe to run again.
--
-- ── Why these columns exist ──────────────────────────────────────────────
--
-- Every price in this project that came off a vendor's pricing page has been
-- wrong. A figure that was per *year* read as a total. An image row read as
-- video. An "up to 650 videos" marketing maximum read as a rate. The one
-- number that survived was the one observed on a real account after a real
-- generation.
--
-- So the app stops believing pricing pages. It records, per generation, which
-- engine served it and what that engine's own units say it cost, and after a
-- few hundred rows the true cost per engine per length is a query rather than
-- an argument. Until then the estimates in the code keep the ceiling roughly
-- honest, and they are labelled as estimates where they live.
--
-- `grade` is what the member paid for — standard, better, premium — kept apart
-- from `provider`, which is what actually served it. They differ whenever an
-- engine inside a grade was full or refused, and being able to see how often
-- that happens is the point of storing both.

alter table public.videos
  add column if not exists provider text,
  add column if not exists provider_units integer,
  add column if not exists grade text,
  -- Whether the member downloaded it. The only honest signal of whether an
  -- engine was any good, and it costs one column to keep.
  add column if not exists kept boolean not null default false;

-- The old single-engine rows were all Kling, and saying so is truer than
-- leaving them null: null would read as "unknown engine" when it is known.
update public.videos
   set provider = 'kling',
       provider_units = kling_credits,
       grade = 'premium'
 where provider is null;

create index if not exists videos_provider_month_idx
  on public.videos (provider, created_at desc)
  where status <> 'failed';

-- What each engine has spent this calendar month, in its own units.
--
-- Per provider rather than one total, because each has its own package and one
-- running out says nothing about the others. Failed rows are excluded: none of
-- these engines charge for what they did not make.
create or replace function public.video_spend_this_month(p_provider text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(provider_units, kling_credits)), 0)::integer
  from public.videos
  where status <> 'failed'
    and provider is not distinct from p_provider
    and created_at >= date_trunc('month', now());
$$;

revoke all on function public.video_spend_this_month(text) from public, anon, authenticated;
grant execute on function public.video_spend_this_month(text) to service_role;

-- What a video actually costs, per engine, per length. The whole reason the
-- columns above exist. Empty until real generations have run — which is the
-- correct state for it to be in, and better than a number nobody measured.
--
-- Ninety days, not all of history. These vendors change their rates, and a
-- rate from last year is not evidence about this month's bill — it is an
-- average with a lie in it. Ninety days is long enough to gather a few hundred
-- rows and short enough that a price change works its way out within a
-- quarter. `since` says how far back the window actually reached, so a thin
-- answer can be recognised as thin rather than trusted as an average.
create or replace view public.video_costs as
  select provider,
         seconds,
         count(*) as made,
         round(avg(provider_units)) as avg_units,
         min(provider_units) as min_units,
         max(provider_units) as max_units,
         count(*) filter (where kept) as kept,
         min(created_at) as since
    from public.videos
   where status = 'done'
     and provider is not null
     and provider_units is not null
     and created_at >= now() - interval '90 days'
   group by provider, seconds;

revoke all on public.video_costs from public, anon, authenticated;
grant select on public.video_costs to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/abuse.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — making the free tier cost what it is supposed to cost.
--
-- Run this after usage.sql, in the same project. Safe to run again.
--
-- The problem, stated plainly: the free tier gives two previews a day per
-- account, and an account is an email address. Somebody with a hundred
-- addresses has two hundred previews a day, and every one of them spends real
-- credits on the owner's ElevenLabs account. A limit that is trivially
-- multiplied is not a limit.
--
-- Three columns close the three easy ways to multiply it, and all three are
-- counted on the *free* tier only. Somebody paying has already been through a
-- card and is not the problem this solves.
--
--   * `email_key` — the address with the tricks taken out. Gmail ignores dots
--     and everything after a plus, so a.n.r.e+one@gmail.com and anre@gmail.com
--     are one inbox and are now one allowance.
--   * `ip_hash` — a salted hash of the address the request came from, so a
--     hundred fresh accounts from one machine share one ceiling. Hashed rather
--     than stored: equality is all this needs, and an IP is personal data.
--   * The disposable-domain check lives in the app, not here, because the list
--     changes and a migration is a bad place to keep a list that changes.
--
-- What this deliberately does not do: block anybody from signing up, or from
-- paying. It caps what can be spent for free.

alter table public.generations
  add column if not exists email_key text,
  add column if not exists ip_hash text;

create index if not exists generations_email_key_day_idx
  on public.generations (email_key, created_at desc);

create index if not exists generations_ip_day_idx
  on public.generations (ip_hash, created_at desc);

-- Today's free use, counted three ways at once.
--
-- One round trip rather than three, because this runs before every generation
-- and a gate that costs three queries is a gate that gets removed. Nulls are
-- treated as "not known", which counts nothing rather than counting everything.
create or replace function public.free_usage_today(
  p_owner uuid,
  p_email_key text,
  p_ip_hash text
)
returns table (by_owner bigint, by_email bigint, by_ip bigint)
language sql
stable
as $$
  select
    count(*) filter (where g.owner = p_owner),
    count(*) filter (where p_email_key is not null and g.email_key = p_email_key),
    count(*) filter (where p_ip_hash is not null and g.ip_hash = p_ip_hash)
  from public.generations g
  where g.kind = 'preview'
    and g.created_at >= date_trunc('day', now());
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/albumart.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/avatars.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────── a face on a channel ──
--
-- A picture for a creator, and the bucket it lives in.
--
-- ── Why a column and not a convention ────────────────────────────────────
--
-- The path could have been derived — "avatars/<owner>/photo.webp" — and then
-- nothing would need storing. That falls down twice. A derived path cannot be
-- cache-busted, so replacing a photo leaves the old one on screen until the
-- browser feels like asking again; and there is no way to tell "no photo yet"
-- from "photo that failed to load", which is the difference between showing
-- initials and showing a broken image.
--
-- So the row holds the path, the path carries a stamp, and an empty column
-- means exactly one thing.
--
-- ── Public, and what that costs ──────────────────────────────────────────
--
-- The bucket is public, like `episodes` and unlike `tracks`. A profile picture
-- is shown to whoever is looking at the channel, including people not signed
-- in, and a signed URL that expires would mean every avatar in a list needing
-- a round trip and then breaking an hour later.
--
-- What that means honestly: anybody who knows the path can fetch the file, and
-- deleting the row does not delete the object. So replacing a photo overwrites
-- the same name rather than accumulating, and removing one deletes the object
-- as well as clearing the column — see `app/lib/avatar.ts`, which does both.

-- ─────────────────────────────────────────────────────────── what comes first ──
--
-- This adds a column to a table another file makes. Run out of order, Postgres
-- says `relation "public.creators" does not exist`, which is accurate and
-- tells you nothing about which file to run. So it is said in words instead.
--
-- Order: schema.sql → radar.sql → this one.
do $$
begin
  if to_regclass('public.creators') is null then
    raise exception
      'public.creators does not exist. Run supabase/radar.sql first (and supabase/schema.sql before that, if you have not).';
  end if;
end
$$;

alter table public.creators
  add column if not exists avatar_path text;

-- ────────────────────────────────────────────────────────────────── bucket ──

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Anyone may look; only the owner may put, replace or remove. The first path
-- segment is the owner's id, which is what ties a file to a person — the same
-- shape the episodes bucket uses.
--
-- Wrapped, because on some projects the SQL editor does not own
-- `storage.objects` and every one of these comes back as `42501: must be owner
-- of table objects`. That is a real thing to hit and it is not a mistake in
-- this file, so it says what to do instead of failing the whole script and
-- leaving the column half-added.
do $$
begin
  execute 'drop policy if exists "read avatars" on storage.objects';
  execute $p$create policy "read avatars" on storage.objects
    for select using (bucket_id = 'avatars')$p$;

  execute 'drop policy if exists "write own avatar" on storage.objects';
  execute $p$create policy "write own avatar" on storage.objects
    for insert with check (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "replace own avatar" on storage.objects';
  execute $p$create policy "replace own avatar" on storage.objects
    for update using (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "delete own avatar" on storage.objects';
  execute $p$create policy "delete own avatar" on storage.objects
    for delete using (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The avatars bucket was made, but its policies were refused: %. Add them by hand under Storage → avatars → Policies: read for everyone; insert, update and delete where (storage.foldername(name))[1] = auth.uid()::text.', sqlerrm;
end
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/buildon.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — mag ander op hierdie liedjie voortbou?
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat die toestemming werklik toelaat ──────────────────────────────────
--
-- Twee dinge, en dit is die moeite werd om hulle presies te stel, want die
-- app kan nie die derde ding doen wat 'n mens sou aanvaar nie:
--
--   1. Iemand anders mag 'n greep uit hierdie liedjie sny — die vertikale
--      stukkie wat die Hooks-kamer maak. Dit is regte klank, en dit is die
--      helfte waarvoor die toestemming werklik nodig is.
--
--   2. Iemand anders mag 'n nuwe liedjie begin by hierdie een se styl en
--      titel, met die maker se naam daaraan vas.
--
-- Wat dit NIE toelaat nie, omdat dit nie kan nie: die klank word nooit in 'n
-- model gevoer nie. ElevenLabs se musiek-oproep vat teks — stylwoorde,
-- koeplette, 'n aanwysing — en géén verwysingsklank nie. 'n Nuwe liedjie begin
-- dus by die wóórde, nie by die opname nie. Dieselfde muur as die liedjie-
-- skakelbalk wat uitgehaal is omdat die app nie kan luister nie.
--
-- ── Waarom die verstek vals is ───────────────────────────────────────────
--
-- Toestemming vir iemand anders se musiek word gevra, nie aanvaar nie. 'n
-- Verstek van waar sou beteken dat elke plasing wat reeds in die kamer is —
-- geplaas voordat hierdie vraag bestaan het — skielik oop is vir iets waarvoor
-- niemand ooit gevra is nie. `default false` laat hulle toe soos hulle was.

alter table public.live_posts
  add column if not exists build_on boolean not null default false;

-- Die Hooks-kamer vra net vir die oop plasings, en dit is 'n klein deel van
-- die kamer. 'n Gedeeltelike indeks dek presies daardie vraag en groei net
-- soveel soos wat daar oop plasings is.
create index if not exists live_posts_buildon_idx
  on public.live_posts (created_at desc)
  where build_on;

-- ── Die styl, want 'n titel alleen is te dun ─────────────────────────────
--
-- Punt 2 hierbo beloof dat iemand 'n nuwe liedjie by hierdie een se styl kan
-- begin. Die styl is die substansie van daardie belofte: dit is die enkele
-- string wat die musiekenjin werklik lees. Sonder hierdie kolom dra die
-- oorhandiging na Maak 'n liedjie net 'n titel oor, en 'n titel is nie 'n
-- styl nie.
--
-- Leeg by verstek, want elke plasing wat reeds in die kamer is, is geplaas
-- voordat hierdie kolom bestaan het. 'n Oop plasing sonder styl gee die
-- volgende maker steeds die titel en die krediet; dit gee net minder.
alter table public.live_posts
  add column if not exists style text not null default '';


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/charts.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/hearts.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — 'n hart op 'n liedjie in die lewendige kamer.
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat dit is ───────────────────────────────────────────────────────────
--
-- Die enigste manier om vir iemand in die kamer te sê "ek het dit gehoor en
-- ek hou daarvan", sonder om te tik. 'n Kamer waar net skryf tel, is 'n kamer
-- waar die meeste mense niks doen nie: die meeste mense lees en luister, en
-- 'n hart is die kleinste ding wat 'n mens kan doen wat nog steeds by die
-- ander persoon aankom.
--
-- ── Waarom die sleutel (post, owner) is ──────────────────────────────────
--
-- Dit is die hele reël, in die tabel eerder as in kode: **een hart per mens
-- per plasing.** Nie 'n telling wat 'n mens kan opdruk nie, en nie 'n ry per
-- druk nie. Aan- en afskakel is 'n invoeging en 'n skrapping, en die tabel
-- self keer die tweede hart — nie 'n toets in 'n roete wat iemand kan mis nie.
--
-- Geen aparte teller-kolom op `live_posts` nie. 'n Telling wat langs sy eie
-- rye gestoor word, is 'n telling wat op 'n dag daarvan gaan verskil, en dan
-- weet niemand watter een reg is nie. Veertig plasings se harte tel is een
-- oproep en dit is nie 'n som wat groot word nie.
--
-- ── Wat weggaan wanneer iets weggaan ─────────────────────────────────────
--
-- Albei kante kaskadeer. 'n Geskrapte plasing vat sy harte saam, want 'n hart
-- op niks is niks. 'n Geskrapte rekening vat syne saam: 'n hart is iemand wat
-- praat, en iemand wat weggegaan het, moet ophou praat. Dieselfde reël as
-- live.sql se plasings en boodskappe.

create table if not exists public.live_hearts (
  post        uuid not null references public.live_posts (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post, owner)
);

-- Om een plasing se harte te tel, en om die kamer se veertig plasings in een
-- oproep te tel. Die primêre sleutel dek al (post, owner); hierdie een dek die
-- vraag andersom — "wat het hierdie mens gehart" — vir die kieser wat wys
-- watter harte reeds joune is.
create index if not exists live_hearts_owner_idx on public.live_hearts (owner);

-- ───────────────────────────────────────────────────── wie mag wat sien ────
--
-- Aan, met geen beleid nie, soos live.sql se drie tabelle: elke lees en skryf
-- gaan deur die bediener. 'n Blaaier wat self by hierdie tabel kon kom, kon
-- iemand anders se hart skrap deur net die twee sleutels te ken.

alter table public.live_hearts enable row level security;

grant select, insert, delete on public.live_hearts to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/livevideo.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — a filmed take is kept, and a video can go in the live room.
--
-- Run this after video.sql and live.sql, in the same project. Safe to run again.
--
-- ── What this is for ─────────────────────────────────────────────────────
--
-- Carli: *"Music videos en music shorts moet ook na live toe kan post. Ek sien
-- huidiglik dat my videos nie 'n opsie het om na live toe te kan post nie."*
--
-- She was right and the reason was in the schema rather than in the screen:
-- `live_posts.kind` is checked against three values and none of them is a
-- video, so there was no button to add. A room that cannot hold the thing is
-- not a room missing a button.
--
-- And *"die video nie in die channel save nie, sodat dit later in die live
-- channel gedeel kan word nie."* A take filmed in the words screen was
-- downloaded and forgotten. It has to be kept before it can be posted, which
-- is why both halves are in one file: neither is any use without the other.

-- ─────────────────────────────────────────────── a video in the room ────

-- The constraint is dropped and rebuilt rather than altered, because a check
-- constraint has no ALTER. Named explicitly: Postgres names an inline check
-- `<table>_<column>_check`, and a rebuild that guessed wrong would silently
-- leave the old three-value one in place beside a new one.
alter table public.live_posts drop constraint if exists live_posts_kind_check;
alter table public.live_posts
  add constraint live_posts_kind_check
  check (kind in ('track', 'episode', 'elsewhere', 'video'));

-- ──────────────────────────────────────────── a video worth posting ────
--
-- `videos` was written for Kling: a prompt, an aspect, a grade and what the
-- engine charged. A take somebody filmed on their own phone has none of
-- those and needs two things the table never held — a name a person chose,
-- and whether it was generated or filmed.
--
-- `source` is not decoration. It is what separates a row that cost credits
-- from one that cost nothing, which is the whole of the argument for letting
-- a browser cause a row to exist at all (see the policy below).
alter table public.videos
  add column if not exists title text not null default '',
  add column if not exists source text not null default 'engine',
  -- How long it runs, in seconds. `seconds` already exists and is what was
  -- *asked* for; a filmed take's length is what was actually recorded, and
  -- for a generated one the two are the same.
  add column if not exists seconds_real integer not null default 0;

-- Older rows are all generated, and saying so is truer than leaving them
-- empty: empty would read as "unknown" when it is known.
update public.videos set source = 'engine' where source = '' or source is null;

create index if not exists videos_owner_source_idx
  on public.videos (owner, source, created_at desc);

-- ───────────────────────────────────────────────────── the bucket ────
--
-- `video.sql` says "Nothing writes here from a browser. The file arrives from
-- Kling, through the server, which is the only party that has ever seen it."
-- That was true and it is no longer the whole story: a take filmed in this
-- app never touches a server until it is kept, and posting it through a
-- route would put a video file through the platform's four-and-a-half
-- megabyte body wall — which a minute of 1080p is over several times.
--
-- So the browser writes the FILE and the server still writes the ROW. The
-- rule that note was protecting is the row: "a browser that could insert its
-- own row could grant itself a video". That rule is untouched.
--
-- And the write is pinned to a `filmed/` folder inside the member's own
-- folder. Without that second clause this policy would also let a browser
-- overwrite `<owner>/<video id>.mp4` — a paid Kling render, replaced by
-- whatever it liked, in the account that paid for it. One clause, and the
-- two kinds of file cannot reach each other.
drop policy if exists "put own filmed video" on storage.objects;
create policy "put own filmed video" on storage.objects
  for insert with check (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'filmed'
  );

-- Updating is NOT granted. An insert that lands on an existing key fails,
-- which is what we want: every take gets a name of its own, and a policy that
-- allowed replacement would be the overwrite the folder split just closed.


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/liveflags.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- The room says which links are bad
--
-- Carli, 24 September 2026, about the live room's message box: *"Dit moet
-- gescreen word om general bad videos teen te werk."*
--
-- The box now takes only a TikTok live address, and the handle is screened
-- as words before anybody reads it. What nothing in this app can do is watch
-- the stream on the far end. So the people in the room are the screen, and
-- this is where they say so: two reports and the link stops being read out.
--
-- One row per person per link. The primary key is what makes that true —
-- a second report cannot be inserted whatever the route does, which is a
-- better place for the rule than a check in code that could later move.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.live_flags (
  said        uuid not null references public.live_says (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (said, owner)
);

create index if not exists live_flags_said_idx on public.live_flags (said);

-- Read and written only by the route, which knows who is calling. Nothing in
-- the browser ever touches this table, so no policy grants anon or
-- authenticated anything: row level security on with no policy is a closed
-- door, and that is the intent rather than an omission.
alter table public.live_flags enable row level security;

revoke all on public.live_flags from public, anon, authenticated;
grant select, insert, delete on public.live_flags to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/pairs.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- Two people in one room, and who is holding the pen
--
-- Carli, 24 September 2026: *"Ek wil hê jy moet elke kamer dupliseer waarin
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
