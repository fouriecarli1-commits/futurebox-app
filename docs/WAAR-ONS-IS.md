# Waar ons is — 5 Oktober 2026, saans

Geskryf sodat jy môre niks hoef te onthou nie.

---

## Jou volgende stap. Net een.

**Sit die Music.ai API-sleutel in Vercel.**

1. Music.ai → soek **API key** (onder Settings, of Developers, of API)
2. Kopieer hom
3. `vercel.com` → **futurebox-app** → **Settings** → **Environment Variables**
4. Naam: `MUSIC_AI_API_KEY` · Waarde: die sleutel
5. Merk **Production** en **Preview** → **Save**
6. **Deployments** → boonste een → drie kolletjies → **Redeploy**

Dis al. Moenie aan die ander twee Music.ai-reëls dink nie — ek het hulle te
vroeg genoem en dit het die ding onnodig groot laat lyk.

Wanneer dit gedoen is, sê net vir my.

---

## Hoekom net dit, en wat daarna kom

Sodra die sleutel in is, kan die app **self** by Music.ai gaan vra wat jou
workflows heet. Jy hoef dan nie van 'n skerm af te probeer aflees nie en jy
hoef nie te weet wat 'n "slug" is nie — die bladsy gee vir jou die presiese
woorde om te kopieer.

Daardie bladsy het vanaand `no` gesê. Dit is 'n **aparte dingetjie**, nie 'n
fout van jou nie: die wagwoord in die adres het nie gepas by `POST_SECRET`
in Vercel nie. Ons maak dit in dertig sekondes reg wanneer ons daar kom, deur
die regte waarde in Vercel te gaan kyk in plaas van hom oor te tik.

---

## Wat jy vandag klaargekry het

- ✅ TONE3000 se `client_id` is in Vercel
- ✅ TONE3000 se **Allowed Redirect URIs** is ingevul
- ✅ 'n Music.ai-rekening bestaan
- ✅ Die **Chords and Beat Mapping**-workflow is getoets en dit werk —
  `Eb major`, `bpm 76`, in 7,44 sekondes

En een ding wat jy nie gesoek het nie en wat waardevol is: daardie skerm het
**$0.07 per minuut** gewys. Dit is die prys wat jy maande lank by ElevenLabs
gevra het en nooit gekry het nie. 'n Liedjie van drie minute kos sowat
**$0.21** om te lees.

---

## Een ding om later te doen, nie dringend nie

Die `POST_SECRET`-waarde was in 'n skermskoot in ons gesprek en is in jou
blaaier se geskiedenis. Hy maak net opstel-bladsye oop, nie jou rekening nie,
so dit is nie 'n noodgeval nie. Maar wanneer die Music.ai-opstelling klaar is:

Vercel → `POST_SECRET` → Edit → nuwe ewekansige waarde → Save → Redeploy.

Niks breek nie; net jy gebruik hom.

---

## Een ding wat later bykom, en wat ek nou al neerskryf

Die TONE3000-aanmelding het twee nuwe tabelle in die databasis nodig. Hulle
bestaan as 'n lêer in die repo, maar 'n lêer in die repo is nie 'n tabel in
Supabase nie — iemand moet hom een keer laat loop.

Wanneer ons daar kom:

1. Supabase → jou projek → **SQL Editor**
2. Plak die hele inhoud van `supabase/ALMAL.sql` in
3. **Run**

`ALMAL.sql` is die een plak wat **al** die skema-lêers in die regte volgorde
bevat, en ek het die nuwes vanaand daarby gesit. Jy hoef dus nie die
TONE3000-lêer apart te soek nie.

Dis veilig om twee keer te doen — alles daarin is `if not exists` of
`create or replace`, so dit laat staan wat reeds daar is.

Daar is ook 'n lys wat vir jou sê wat **nog kort** in die lewende databasis:
`supabase/WATKORT.sql`. Dieselfde plek, dieselfde knoppie; dit verander niks
en vertel net wat ontbreek. Ek het hom vanaand bygewerk, so hy ken die twee
nuwe tabelle.

## Die cover art-fout — ek kon dit nie reproduseer nie

Jy het gesê: *"Die oomblik wanneer ek op 'n liedjie se cover art druk, dan
gooi dit die skerm wyd uit."*

Ek het 'n probe geskryf wat presies dit doen — die liedjielys oopmaak, Cover
art druk, en dan **meet** of iets by die rand verbyloop. By 390, 360 én 320
pixels, in Make en in Channel, met een liedjie en met sewentien, en in albei
helftes van die paneel (een met 'n omslag, een sonder): **niks loop oor nie.**

Ek stuur dus nie 'n CSS-raaiskoot aan 'n kamer wat ek nie kan sien nie. Vier
vraaggies sou dit vir my oplos, en elkeen is 'n ja of 'n nee:

1. **Skuif die bladsy regtig** as jy jou duim sywaarts trek, of lyk dit net
   afgesny en beweeg niks?
2. Gebeur dit by **elke** liedjie, of net by sommige? (As net by sommige, is
   dit waarskynlik 'n lang titel.)
3. Gaan dit weg as jy Cover art **weer** druk om toe te maak?
4. Die balk bo in jou skermskoot het 'n **X en drie kolletjies** — dit is nie
   gewone Chrome nie, dit is 'n blaaier *binne-in* 'n ander app. Uit watter
   app het jy die skakel oopgemaak? Daardie blaaiers meet die skermwydte soms
   anders, en as dit die oorsaak is, soek ek op die verkeerde plek.

'n Skermopname van twee sekondes — druk, en trek dan jou duim sywaarts — sou
al vier tegelyk antwoord.

**Een ding het die probe wel gevind**, terwyl hy joune gesoek het: op 'n
**320-pixel** foon (ouer Androids, 'n iPhone SE) pas die onderste balk nie —
die "You"-oortjie hang 4px oor die rand en kan nie gedruk word nie. Dit is
reggemaak, en by 360 en wyer verander niks.

## Wat ek intussen doen

Die TONE3000-aanmelding is klaar gebou: twee tabelle, twee roetes, en 'n
check wat die callback met 'n regte versoek **oopmaak** eerder as lees. Vyf
reëls is gebreek om te sien of hy byt; al vyf faal soos hulle moet.

Jou woordfout is ook reg — *"Kept — it is in your channel now"*, in Engels en
in Afrikaans.

Twee dinge het die sweep gevang wat ek nie gesoek het nie:

'n `delete` wat sy antwoord weggegooi het. Die supabase-kliënt gooi nie 'n
fout nie, hy gee een terug, en **daardie** stilte sou beteken 'n handdruk wat
hergebruik kan word.

En 'n fout in `check:security` self. Dit lees tabelname sonder syfers, so 'n
tabel soos `foo2` sonder RLS kon as `foo` gelees word, 'n treffer kry en
**stilweg slaag**. Dit is die een check tussen die publieke sleutel en almal
se rye. Dit was al die hele tyd so — net nog nooit raakgeloop nie, want geen
tabel het 'n syfer in sy naam gehad nie.

Niks daarvan het iets van jou nodig nie.
