-- ── Die TONE3000-handdruk, bediener-kant ───────────────────────────────────
--
-- Twee tabelle, en albei bestaan om dieselfde rede: die blaaier mag niks
-- hiervan sien nie.
--
-- ── Hoekom daar hoegenaamd 'n tabel is ─────────────────────────────────────
--
-- 'n OAuth-callback is 'n blaaier-herleiding. TONE3000 stuur haar terug na
-- ons adres, en daardie versoek dra **geen** `Authorization`-header nie. Die
-- hele app ken net een manier om te weet wie vra — `callerFrom(request)`, wat
-- slegs 'n Bearer-token lees — en daar is nêrens 'n koekie-sessie nie.
--
-- Die callback kan dus nie weet wie sy is deur te vra nie. Die enigste ding
-- wat die terugkoms aan die vertrek verbind, is die `state`. Daarom is die
-- `state` hier twee dinge tegelyk: die CSRF-toets, én die draad wat sê aan
-- wie hierdie handdruk behoort. Dit is nie 'n slim hergebruik nie, dit is wat
-- oorbly as 'n mens nie 'n koekie het nie, en dit is die rede dat die
-- `state`-toets in `cameBack()` eerste gebeur en nie laaste nie.
--
-- ── Hoekom geen leesbeleid nie ─────────────────────────────────────────────
--
-- Elders in hierdie skema kry 'n lid 'n "read own"-beleid op sy eie rye, en
-- dit is reg. Hier is dit **verkeerd**, en dit is die een plek waar dit
-- gevaarlik is om die patroon te volg.
--
-- 'n Refresh token is nie 'n uur se toegang tot óns app nie. Dit is blywende
-- toegang tot iemand anders se TONE3000-rekening. TONE3000 se eie voorbeelde
-- hou hom in `sessionStorage`, wat reg is vir 'n blaaier-voorbeeld en vir ons
-- nie: enige XSS lees `sessionStorage`. As ons daardie besluit neem en dan 'n
-- leesbeleid byvoeg wat dieselfde token aan dieselfde blaaier gee, het ons
-- niks bereik nie — ons het die token net 'n ander pad gegee om by dieselfde
-- plek uit te kom.
--
-- Albei tabelle is dus `service_role` alleen. RLS is aan met **geen** beleid,
-- wat in Postgres beteken: niemand kom in nie, behalfwe die rol wat RLS
-- omseil. Dit lyk soos 'n vergete beleid en dit is 'n keuse.

-- ── Handdrukke wat nog loop ────────────────────────────────────────────────
--
-- Een ry van die oomblik dat sy op "Browse TONE3000" druk tot sy terugkom.
-- Kortlewend, eenmalig, en dit word geskrap sodra dit gebruik is.

create table if not exists public.tone3000_pending (
  -- Die `state` wat ons gestuur het. Primêre sleutel omdat dit presies een
  -- keer bestaan: twee rye met dieselfde state is 'n botsing wat ons nie
  -- stilweg wil oplos nie.
  state      text primary key,
  owner      uuid not null references auth.users (id) on delete cascade,
  -- Die PKCE-verifier. Terwyl hierdie ry leef, is hy so geheim soos 'n
  -- wagwoord: wie hom en die `code` het, kan die tokens gaan haal.
  verifier   text not null,
  /**
   * Which room she was standing in when she pressed the button.
   *
   * TONE3000 hand back `state`, `code` and `tone_id` and nothing else, so a
   * callback that does not remember this cannot put her back where she was —
   * she returns to the studio instead of to the booth, with the tone she
   * chose and no sign of the track she chose it for.
   *
   * Paystack's return carries its room in the address because we build that
   * address ourselves. This one is built by somebody else, so the room has to
   * wait here instead. Nullable: a handshake started from somewhere with no
   * room is not an error, it just lands her at the front.
   */
  room       text,
  created_at timestamptz not null default now()
);

-- Om die ou rye te kan opruim sonder 'n volledige skandering.
create index if not exists tone3000_pending_created_idx
  on public.tone3000_pending (created_at);

alter table public.tone3000_pending enable row level security;

-- ── Tokens, een stel per lid ───────────────────────────────────────────────

create table if not exists public.tone3000_tokens (
  owner      uuid primary key references auth.users (id) on delete cascade,
  access     text not null,
  -- Hulle roteer die refresh token by elke hernuwing: wat terugkom moet die
  -- ou een vervang. 'n Hernuwing wat die ou een hou, werk een keer en faal
  -- daarna vir altyd, en die fout lyk soos 'n verlore aanmelding.
  refresh    text not null,
  dies_at    timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.tone3000_tokens enable row level security;

-- ── Ruim op ────────────────────────────────────────────────────────────────
--
-- 'n Handdruk wat nie binne 'n kwartier terugkom nie, kom nie terug nie. Sy
-- het die oortjie toegemaak, of iets het misgeloop. Die ry wat agterbly dra
-- 'n verifier, en 'n verifier wat vir ewig lê is 'n geheim wat vir ewig lê.
--
-- Vyftien minute is ruim: hul eie skerm is 'n aanmelding en 'n keuse, nie 'n
-- vorm wat ingevul word nie.

create or replace function public.tone3000_sweep()
returns integer
language sql
volatile
security definer
set search_path = public
as $$
  with gone as (
    delete from public.tone3000_pending
    where created_at < now() - interval '15 minutes'
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.tone3000_sweep() from public, anon, authenticated;
grant execute on function public.tone3000_sweep() to service_role;
