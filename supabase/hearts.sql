-- FutureBox — 'n hart op 'n liedjie in die lewendige kamer.
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat dit is ───────────────────────────────────────────────────────────
--
-- Die enigste manier om vir iemand in die kamer te sê "ek het dit gehoor en
-- ek hou daarvan", sonder om te tik. 'n Kamer waar net skryf tel, is 'n kamer
-- waar die meeste mense niks doen nie: die meeste mense lees en luister, en
-- 'n hart is die kleinste ding wat 'n mens kan doen wat nog steeds by die
-- ander persoon aankom.
--
-- ── Waarom die sleutel (post, owner) is ──────────────────────────────────
--
-- Dit is die hele reël, in die tabel eerder as in kode: **een hart per mens
-- per plasing.** Nie 'n telling wat 'n mens kan opdruk nie, en nie 'n ry per
-- druk nie. Aan- en afskakel is 'n invoeging en 'n skrapping, en die tabel
-- self keer die tweede hart — nie 'n toets in 'n roete wat iemand kan mis nie.
--
-- Geen aparte teller-kolom op `live_posts` nie. 'n Telling wat langs sy eie
-- rye gestoor word, is 'n telling wat op 'n dag daarvan gaan verskil, en dan
-- weet niemand watter een reg is nie. Veertig plasings se harte tel is een
-- oproep en dit is nie 'n som wat groot word nie.
--
-- ── Wat weggaan wanneer iets weggaan ─────────────────────────────────────
--
-- Albei kante kaskadeer. 'n Geskrapte plasing vat sy harte saam, want 'n hart
-- op niks is niks. 'n Geskrapte rekening vat syne saam: 'n hart is iemand wat
-- praat, en iemand wat weggegaan het, moet ophou praat. Dieselfde reël as
-- live.sql se plasings en boodskappe.

create table if not exists public.live_hearts (
  post        uuid not null references public.live_posts (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post, owner)
);

-- Om een plasing se harte te tel, en om die kamer se veertig plasings in een
-- oproep te tel. Die primêre sleutel dek al (post, owner); hierdie een dek die
-- vraag andersom — "wat het hierdie mens gehart" — vir die kieser wat wys
-- watter harte reeds joune is.
create index if not exists live_hearts_owner_idx on public.live_hearts (owner);

-- ───────────────────────────────────────────────────── wie mag wat sien ────
--
-- Aan, met geen beleid nie, soos live.sql se drie tabelle: elke lees en skryf
-- gaan deur die bediener. 'n Blaaier wat self by hierdie tabel kon kom, kon
-- iemand anders se hart skrap deur net die twee sleutels te ken.

alter table public.live_hearts enable row level security;

grant select, insert, delete on public.live_hearts to service_role;
