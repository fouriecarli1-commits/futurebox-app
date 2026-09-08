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
