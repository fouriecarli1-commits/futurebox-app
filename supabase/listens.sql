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
