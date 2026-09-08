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
