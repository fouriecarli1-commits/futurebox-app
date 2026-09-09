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
