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
