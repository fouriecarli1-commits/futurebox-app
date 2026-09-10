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
