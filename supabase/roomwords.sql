-- FutureBox — die woorde van 'n liedjie, saam met die plasing in die kamer.
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat dit regmaak ──────────────────────────────────────────────────────
--
-- Carli, 14 September 2026: *"Die play room moet die liedjie se woorde
-- speel."*
--
-- Die speelkamer het die woorde nie gehad nie, en dit was nie 'n skerm wat
-- vergeet het om hulle te wys nie — hulle was nooit daar nie. 'n Plasing dra
-- die klank, die omslag, die titel en die genre, en die woorde het by die
-- maker se eie liedjie agtergebly. Iemand wat 'n liedjie in die kamer oopmaak
-- kon hom hoor en nie saamlees nie.
--
-- ── Waarom jsonb en nie teks nie ─────────────────────────────────────────
--
-- Omdat die kamer die woorde *speel* en nie net wys nie. 'n Reël wat oplig
-- wanneer sy beurt kom het 'n tyd nodig, nie net 'n string nie, en dit is
-- presies die vorm waarin die opname se woorde reeds hier rondgaan: 'n lys
-- van reëls, elk met sy eie begin. Teks sou beteken die tydsberekening word
-- elke keer weer geraai, en 'n geraaide tydsberekening is presies wat 'n
-- mens sien wanneer die woorde agter die sang aansleep.
--
-- Leeg toegelaat, want elke plasing wat reeds in die kamer is, is geplaas
-- voordat hierdie kolom bestaan het. Sonder woorde wys die kamer die
-- liedjie soos hy was; met woorde lees hy saam.

alter table public.live_posts
  add column if not exists words jsonb;
