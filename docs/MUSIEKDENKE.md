# Om stilweg te leer soos 'n musikant dink

> "ek het nodig dat hierdie program ook mense silently leer hoe om musiek te
>  verstaan. Hoe om musiek te lees, wat belangrik is vir professionele
>  musikante en om soos hulle te dink.
>
>  baie musiek plekke sal sê Ai musiek gee mense wat nie professionele is die
>  kans om deel te hê aan musiek. Ons almal hou van musiek en dink dit is cool.
>  Maar wat is Ai musiek en so program werd as niemand werklik leer om soos 'n
>  musikant te dink nie."

Dit is die skerpste ding wat nog oor hierdie produk gesê is, en dit is ook die
antwoord op die bedryf se enigste ernstige beswaar teen KI-musiek. Hierdie
dokument is die plan.

---

## 1. Wat "stilweg" beteken, en waarom dit die hele ding is

Geen `Leer`-oortjie nie. Geen lesse, geen vasvrae, geen kentekens nie. Mense
kom hier om 'n liedjie te maak; enigiets wat tussen hulle en daardie liedjie
inskuif, word weggeklik en die les word nooit gelees nie.

Die reël is dus:

> **Die app noem wat dit reeds doen, in die musikant se eie woorde, op die
> oomblik dat dit dit doen — aan hulle eie liedjie.**

Iemand wat twintig liedjies hier maak, moet ná ses maande die woordeskat en
die redenasie hê sonder om ooit 'n les oopgemaak te het. Nie omdat ons hulle
geleer het nie, maar omdat elke syfer wat ons reeds bereken het, langs hulle
eie werk 'n naam en 'n gevolg gekry het.

---

## 2. Ons bereken dit alles reeds, en gooi dit weg

Dit is die belangrikste feit in hierdie dokument. Die masjinerie bestaan:

| Wat ons reeds meet | Waar | Wat ons daarmee doen |
|---|---|---|
| BPM, toonaard (Krumhansl–Kessler), helderheid, gewig, digtheid, punch | `lib/listen.ts` | word 'n stylsin, dan weggegooi |
| Waar iets *aankom* in 'n liedjie | `lib/hooks.ts` | knip 'n greep, dan weggegooi |
| Die volledige komposisieplan — watter woorde in watter deel, hoe lank elke deel | `Track.parts` | laat die woorde saamloop |
| Toonhoogte oor tyd van 'n opname | `lib/pitch.ts`, `lib/melody.ts` | stemomskakeling |
| Mate en slae | `lib/onbeat.ts`, `lib/tempo.ts` | sny video op die slag |
| Stemme apart van die begeleiding | stems | Pro Booth |

Niks hieronder vra vir 'n nuwe enjin, 'n nuwe API of 'n sent nie. Dit vra dat
ons ophou om die antwoorde weg te gooi.

---

## 3. Die ses stukke, in die volgorde waarin hulle die meeste werd is

### 3.1 Vorm — die een ding wat 'n musikant van 'n luisteraar skei

'n Musikant hoor nie "'n liedjie" nie, hulle hoor **vers, koor, vers, koor,
brug, koor**. Dit is die enkele grootste sprong in hoe iemand oor musiek dink,
en ons het die data reeds: `Track.parts` dra elke deel se naam en lengte.

Wys dit as 'n balk van blokke onder die liedjie, met die name en die mate, en
noem die vorm by sy naam (`AABA`, `vers–koor 8/8/16`). Iemand wat twintig
liedjies gemaak het, sien vanself dat die koor op 0:45 land en begin vra
hoekom.

**Dit is waar ons begin.** Die data is daar, dit kan nie verkeerd wees nie, en
dit is die hoogste opbrengs per reël kode in die hele lys.

### 3.2 Elke syfer kry sy betekenis, nie net sy waarde nie — **gebou**

`lib/listen.ts` sê nou "112 BPM, A mineur, helder, besig". Voeg een bysin by —
*wat dit beteken*:

- 112 BPM — looppas; waar die meeste pop sit
- A mineur — die relatiewe mineur van C majeur, en dít is hoekom dit C se
  akkoorde kan leen
- swaar onderkant — die kick en die bas deel dieselfde ruimte

Teorie, gelewer as 'n feit oor hulle eie liedjie. Nie as 'n les nie.

**Gedoen.** `lib/musictalk.ts` en `WhatWeHeard.tsx`, waar 'n mens die app na
'n liedjie laat luister. Ses metings, elk met een sin wat sê wat dit beteken.
Die voorbeelde is naslaanbare feite en nie menings nie — house *is* 124–128,
amapiano *is* omtrent 112, drum & bass *word* op die helfte van 174 getel — want
'n versinde voorbeeld sou beteken die app leer iets onwaar.

Twee dinge wat dit reg moes kry: 'n meting wat nie geneem is nie kry géén
lesing nie (`keyOf` gee '' as niks duidelik was nie, en "C majeur" vir stilte
uit te dink is die een ding wat hierdie hele idee nie kan bekostig nie), en
die relatiewe toonaard moet die regte kant om wees.

En die blaaier het een gevind wat geen enkeltoets kon sien nie: `keyOf` praat
Engels — "E♭ major" — en dít het bo 'n Afrikaanse sin gestaan. Die toonaard
word nou in die leser se taal gesê: "E♭ majeur".

### 3.3 Die greepvinder moet sê *wat* aangekom het — **gebou**

Hy sê reeds "hier kom iets aan". Noem dit: die dromme kom in, die digtheid
verdubbel, die onderkant maak oop. Dit is arrangement, geleer op die oomblik
dat iemand 'n greep sny.

**Gedoen.** `lib/arrival.ts`. Die twee sekondes voor die oomblik word teen die
twee daarna gemeet, in drie bande: onder 150 Hz, bo 3 kHz, en hoe dikwels iets
nuuts begin.

Die stuk wat dit reg moes kry: 'n koor is in *elke* band harder as 'n vers. 'n
Styging in die onderkant beteken dus net "die bas het ingekom" as dit gróter is
as die styging in alles saam — anders lees elke koor wat bestaan as 'n bas wat
inkom. Alles is daarom 'n verhouding van 'n verhouding.

En stilte na iets is 'n ander vraag: elke verhouding loop teen sy plafon vas,
so daar word gevra waarvan die klank *gemaak* is eerder as wat verander het.
`check:arrival` bou elke sein self — 'n 60 Hz sinus wat halfpad begin, 'n 9 kHz
een, klikke wat verdriedubbel, en dieselfde musiek twee keer so hard — sodat
die regte antwoord bekend is en nie aanvaar word nie.

### 3.4 Musiek *lees*, letterlik — **gebou**

Sy het "hoe om musiek te lees" gesê, en dit hoef nie 'n metafoor te wees nie.
Wanneer iemand in die Booth 'n opname maak, weet ons die toonhoogte oor tyd.
Teken dit op 'n notebalk — die werklike note wat hulle gesing het.

Niemand hoef dit te kan lees om die app te gebruik nie. Maar dit sit notasie
voor hulle, vasgemaak aan hulle eie stem, en dít is presies wat "stilweg leer"
beteken.

**Gedoen.** `lib/notation.ts` en `Staff.tsx`, onder die woorde in die Booth.
Drie dinge wat dit reg moes kry, want 'n verkeerde notebalk leer iets onwaar:

- **Spelling volgens die toonaard.** MIDI 61 is C♯ in D majeur en D♭ in A♭
  majeur — een klank, twee name, en net een van hulle lees.
- **Die toonaardtekens één keer voor.** 'n Balk met 'n kruis op elke F is wat
  iemand maak wat nog nooit gegraveer het nie. Die moeiliker helfte is die
  ander rigting: 'n F **herstel** in G majeur móét 'n ♮ dra, anders lees dit
  as F♯.
- **Notewaardes volgens verhouding**, want duur word vermenigvuldigend gehoor.

Dit graveer **net 'n opname** — een stem, ná die tyd, wat presies die sein is
wat `lib/melody.ts` op 91% lees. Niks graveer 'n volle mengsel nie, en
`readable()` besluit steeds of 'n lesing hoegenaamd gewys mag word. Die ou
paragraaf in `lib/pitch.ts` wat téén bladmusiek argumenteer, is reggestel
eerder as weerspreek: dit was nooit oor hierdie geval nie.

### 3.5 Een woordeskat, elke term één keer verduidelik

Elke term kry die `?` wat die app reeds oral gebruik (sien #32). Nooit 'n les
nie — 'n verduideliking op die plek waar die woord staan, vir die een keer wat
iemand dit wil weet.

### 3.6 Die Pro Booth se rooster tel mate — **gebou**

Merk die rooster `1.1, 1.2, 1.3, 1.4, 2.1 …` in plaas van sekondes. Mate tel
word outomaties vir enigiemand wat 'n paar keer in die kamer gewerk het.

**Gedoen.** `placeAt` in `lib/tempo.ts`, en die maatlyne in elke baan.

Die kamer se hele onderwerp is 'n metronoom, 'n tydmaatteken en 'n
maat-rooster, en dit het nooit een keer die woord "maat" met 'n nommer daarby
gesê nie. Die vervoerbalk lees nou `0:24 / 3:02 · maat 33.2`.

Twee dinge wat 'n mens hier verkeerd kan hê, en albei leer 'n konvensie wat
niemand anders gebruik nie: **tel van nul af** (elke bladmusiek wat ooit
gedruk is, begin by maat 1 slag 1) en **die tydmaatteken ignoreer** (maat 2 kom
ná vier slae in 4/4 en ná drie in 'n wals).

En een ding wat net kyk kon uitwys: die eerste weergawe was 'n liniaal bo-oor
die kamer, terwyl elke baan se golfvorm ná die naamkolom begin en voor die
knoppies ophou. Maat 2 op die liniaal was nêrens naby maat 2 in die klank nie.
Die lyne word nou binne-in die baan se eie doek geteken, waar sekondes reeds na
pixels vertaal is — dus in lyn deur konstruksie, en dit kan nie wegdryf nie.

---

## 4. Waarom dit ook 'n saketrek is

Twee dinge wat reeds op die lys staan, word hierdeur opgelos:

1. **Studio en Label se prys.** Hulle karte moet die hoër prys verkoop met
   dinge wat ons niks kos nie. Alles hierbo kos niks — dit is berekening wat
   reeds in die blaaier gebeur.
2. **Die bedryf se beswaar.** "KI-musiek laat mense wat niks weet nie
   deelneem" is die beswaar. 'n App waar mense wél leer om soos 'n musikant te
   dink, is die enigste eerlike antwoord daarop — en dit is 'n antwoord wat
   niemand anders gee nie.

---

## 5. Wat ons *nie* gaan doen nie

- 'n `Leer`-oortjie, lesse, vasvrae, kentekens, vlakke
- Enige skerm wat tussen die knoppie en die liedjie inskuif
- Beweer dat die app musiek onderrig. Dit doen nie. Dit noem wat dit doen, en
  dit is genoeg.
