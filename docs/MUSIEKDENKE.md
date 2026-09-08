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

### 3.2 Elke syfer kry sy betekenis, nie net sy waarde nie

`lib/listen.ts` sê nou "112 BPM, A mineur, helder, besig". Voeg een bysin by —
*wat dit beteken*:

- 112 BPM — looppas; waar die meeste pop sit
- A mineur — die relatiewe mineur van C majeur, en dít is hoekom dit C se
  akkoorde kan leen
- swaar onderkant — die kick en die bas deel dieselfde ruimte

Teorie, gelewer as 'n feit oor hulle eie liedjie. Nie as 'n les nie.

### 3.3 Die greepvinder moet sê *wat* aangekom het

Hy sê reeds "hier kom iets aan". Noem dit: die dromme kom in, die digtheid
verdubbel, die onderkant maak oop. Dit is arrangement, geleer op die oomblik
dat iemand 'n greep sny.

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

### 3.6 Die Pro Booth se rooster tel mate

Merk die rooster `1.1, 1.2, 1.3, 1.4, 2.1 …` in plaas van sekondes. Mate tel
word outomaties vir enigiemand wat 'n paar keer in die kamer gewerk het.

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
