-- FutureBox — wie se stem is wie s'n.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Kits kan nie 'n stem oor die API skep nie — gemeet op 9 September 2026,
-- `POST /voice-models` gee 404. Stemkloning gebeur op húlle werf, met die
-- hand, op één rekening. Elke stem wat daar getrein word, staan dus op die
-- rekening wat hierdie hele toep gebruik.
--
-- Dit beteken iets wat maklik is om mis te kyk: sonder hierdie tabel sien
-- **elke lid elke stem**. `SingVoices` trek `listModels(myModels=true)` en
-- wys dit vir almal. Lid A kan dus in lid B se gekloonde stem sing. Niemand
-- het dit so gekies nie; dit is net wat gebeur as 'n gedeelde rekening se
-- katalogus reguit op 'n skerm beland.
--
-- Hierdie tabel is die eienaarskap wat die API nie het nie.
--
-- ── Waarom die verskaffer deel van die sleutel is ─────────────────────────
--
-- Sedert 8 Oktober 2026 staan daar 'n naat voor stemomskakeling
-- (`lib/server/singer.ts`), want Kits se §1.3 laat hulle enige stem enige tyd
-- wegvat. Die dag daar 'n tweede verskaffer is, is "stem 1234" dalk 'n ander
-- stem by hulle as by Kits. 'n Ry wat net die nommer hou, sou dan die
-- verkeerde stem aan die verkeerde lid koppel — stil, en presies by die een
-- ding wat hierdie tabel moet keer.
--
-- ── Wat 'n ry se afwesigheid beteken ──────────────────────────────────────
--
-- Geen ry nie = niemand s'n nie = almal mag dit gebruik. Dit is Kits se eie
-- katalogus van honderd-plus stemme, en 'n katalogusstem wat agter slot raak
-- omdat iemand hom eerste "geëis" het, sou 'n fout wees wat niemand kan
-- terugdraai nie. Daarom eis `/api/voice/claim` net stemme wat op hierdie
-- rekening getrein is, en net die eienaar van die plek mag eis.

create table if not exists public.voice_owners (
  -- Watter verskaffer se nommer dit is: 'kits' vandag. Sien die naat.
  supplier  text not null default 'kits',
  -- Hulle eie id, as teks. Kits s'n is syfers; iemand anders s'n dalk nie.
  voice_id  text not null,
  -- Wie se stem dit is. `set null` eerder as `cascade`: 'n lid wat weggaan
  -- laat 'n stem agter wat op die rekening bly staan, en 'n ry wat sê "hierdie
  -- stem was iemand s'n" is meer werd as geen ry nie wanneer iemand later
  -- moet uitwerk wat om op kits.ai uit te vee.
  owner     uuid references auth.users (id) on delete set null,
  -- Die naam soos dit geëis is, sodat 'n lys gelees kan word sonder om Kits
  -- te vra. Nie die waarheid nie — Kits s'n is — maar genoeg vir 'n bladsy.
  title     text,
  at        timestamptz not null default now(),
  primary key (supplier, voice_id)
);

-- Die vraag wat elke keer gevra word is "watter stemme is hierdie lid s'n",
-- vir die dak per plan. Daarom die indeks op die eienaar.
create index if not exists voice_owners_owner_idx on public.voice_owners (owner);

alter table public.voice_owners enable row level security;

-- 'n Lid mag sy eie rye sien. Verder niks: die roetes werk deur die
-- diens-sleutel, en 'n lid wat ander se rye kan lees, kan uitwerk wie se stem
-- watter nommer is — wat presies die ding is wat hier weggesteek word.
drop policy if exists voice_owners_own_read on public.voice_owners;
create policy voice_owners_own_read on public.voice_owners
  for select using (auth.uid() = owner);
