-- ═══════════════════════════════════════════════════════════════════════════
-- FutureBox — wat is reeds gedoen, en wat kort nog?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase → SQL Editor → plak alles → Run. Dit verander NIKS. Dit lees net.
--
-- ── Waarom hierdie lêer bestaan ────────────────────────────────────────────
--
-- Carli, 15 September 2026: *"Dit lyk of ek 2 sql's moet hardloop."*
--
-- Sy kon nie weet nie, en daar was geen manier om uit te vind nie. Die groot
-- plak (ALMAL.sql) is veilig om weer te loop, maar "veilig om weer te loop"
-- is nie dieselfde as "ek weet of ek dit al geloop het" nie — en iemand wat
-- nie weet nie, loop dit óf onnodig óf glad nie.
--
-- Hierdie vraag antwoord dit in een tabel: elke stuk van die groot plak, en
-- of dit reeds op hierdie projek is. Dit kyk na die ding wat elke lêer
-- werklik maak — 'n tabel, 'n kolom, 'n funksie — en nie na 'n lys wat
-- iemand moet onthou om by te werk nie.
--
-- Wat "NEE" sê, loop nog nie. Loop dan ALMAL.sql: dit slaan oor wat reeds
-- daar is.

select  naam,
        case when daar then 'ja  — reeds gedoen' else 'NEE — moet nog loop' end as status
from (values
  ('charts.sql    (Spotlight se Top 10)',        exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                                    where n.nspname = 'public' and p.proname = 'charts_top')),
  ('addons.sql    (bemarkings-byvoegsel)',       to_regclass('public.addons') is not null),
  ('posting.sql   (die plaas-tou)',              to_regclass('public.scheduled_posts') is not null),
  ('dubs.sql      (oorklanking)',                to_regclass('public.dubs') is not null),
  ('invites.sql   (saamwerk-uitnodigings)',      to_regclass('public.collab_invites') is not null),
  ('listens.sql   (luisterbeurte)',              exists (select 1 from information_schema.columns
                                                    where table_schema = 'public' and table_name = 'events' and column_name = 'times')),
  ('kits.sql      (Kits-minuutteller)',          to_regclass('public.kits_minutes') is not null),
  ('eleven.sql    (ElevenLabs se koste)',        to_regclass('public.eleven_costs') is not null),
  ('hearts.sql    (harte op ''n plasing)',       to_regclass('public.live_hearts') is not null),
  ('buildon.sql   (mag ander voortbou)',         exists (select 1 from information_schema.columns
                                                    where table_schema = 'public' and table_name = 'live_posts' and column_name = 'build_on')),
  ('elevenrem.sql (die rem op ElevenLabs)',      exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                                    where n.nspname = 'public' and p.proname = 'eleven_credits_this_month')),
  ('roomwords.sql (woorde in die speelkamer)',   exists (select 1 from information_schema.columns
                                                    where table_schema = 'public' and table_name = 'live_posts' and column_name = 'words'))
) as t(naam, daar)
order by daar, naam;
