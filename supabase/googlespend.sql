-- FutureBox — wat Google ons gekos het, per gebruik.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Carli het op 8 Oktober 2026 'n uitgawe-dak van $100 per maand op Vertex AI
-- gesit, en gesê: "Ek sal my budget in google verhoog soos wat ons wins maak."
-- Albei is reg. Maar Google se dak hang aan één DIENS, en Lyria, Nano Banana
-- en Veo is almal daardie een diens.
--
-- Dit beteken iets wat niemand gekies het nie: die maand wat Veo warm loop,
-- **stop die musiek en die prente saam met dit**. Nie omdat iets fout is nie,
-- maar omdat hulle 'n plafon deel met die duurste een.
--
-- Hierdie tabel is ons eie plafon ónder Google s'n: een per enjin, sodat een
-- enjin nie die ander twee kan doodmaak nie. Google se dak is die laaste lyn,
-- nie die begroting nie.
--
-- ── Waarom mikro-dollar en nie sent nie ───────────────────────────────────
--
-- Google se pryse is kleiner as 'n sent. 'n Prentjie is ongeveer $0,039 en 'n
-- sekonde Veo Lite is $0,03. In sent afgerond is dit 4 en 3 — 'n fout van tien
-- persent op elke ry, in die rigting wat te veel tel of te min, en altyd
-- dieselfde rigting. Oor tienduisend oproepe is dit nie 'n afronding nie, dit
-- is 'n verkeerde getal.
--
-- Mikro-dollar is 'n miljoenste van 'n dollar, as 'n heelgetal. $0,039 is
-- 39000. Niks gaan verlore nie en niks dryf nie.
--
-- ── Waarom dollar en nie rand nie ─────────────────────────────────────────
--
-- Google stuur die rekening in dollar. Die randkoers beweeg; as ons rand stoor,
-- verander die geskiedenis elke keer as die koers verander en dan weet niemand
-- meer wat werklik betaal is nie. Die koers hoort by die skerm, nie by die ry.

create table if not exists public.google_spend (
  id      bigint generated always as identity primary key,
  owner   uuid references auth.users (id) on delete set null,
  -- Watter enjin: 'music' is Lyria, 'video' is Veo, 'image' is Nano Banana.
  -- Elkeen het sy eie dak, want elkeen kos iets heeltemal anders.
  kind    text not null check (kind in ('music', 'video', 'image')),
  -- Miljoenstes van 'n dollar. Sien hierbo.
  micros  bigint not null default 0 check (micros >= 0),
  -- Watter model werklik geloop het, want 'lyria-002' en 'lyria-3-pro-preview'
  -- kos nie dieselfde nie en die ry moet kan sê watter een dit was.
  model   text,
  at      timestamptz not null default now()
);

create index if not exists google_spend_at_idx on public.google_spend (at desc);
create index if not exists google_spend_owner_idx on public.google_spend (owner, at desc);

alter table public.google_spend enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf met die
-- diens-sleutel en die somme loop deur die funksies hieronder.
drop policy if exists "google spend is server only" on public.google_spend;

-- ── Wat hierdie maand per enjin gespandeer is ─────────────────────────────
--
-- Kalendermaand in UTC, want dit is hoe Google se dak self reset.

create or replace function public.google_micros_this_month(p_kind text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(micros), 0)::bigint
  from public.google_spend
  where kind = p_kind
    and at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.google_micros_this_month(text) from public, anon, authenticated;
grant execute on function public.google_micros_this_month(text) to service_role;

-- ── En wat één lid daarvan gebruik het ────────────────────────────────────
--
-- Dieselfde rede as by Kits: 'n dak wat een lid alleen kan opgebruik, laat die
-- res met 'n weiering in 'n kamer wat gister gewerk het.

create or replace function public.google_micros_this_month_for(p_kind text, p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(micros), 0)::bigint
  from public.google_spend
  where kind = p_kind
    and owner = p_owner
    and at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.google_micros_this_month_for(text, uuid) from public, anon, authenticated;
grant execute on function public.google_micros_this_month_for(text, uuid) to service_role;
