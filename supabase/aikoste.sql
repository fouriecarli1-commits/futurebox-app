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
