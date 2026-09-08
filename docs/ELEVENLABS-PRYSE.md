# ElevenLabs se pryse — die egte lys

Carli het op **8 September 2026** hulle prysbladsy gestuur. Tot daardie dag
was hierdie die grootste onbekende in die hele besigheid: `costs-eleven.mts`
het bo-aan gestaan met **"ONGEVERIFIEER … dit is wat die kode tot dusver
aangeneem het"**, en `docs/DIENSTE-EN-KOSTE.md` het die e-pos aan ElevenLabs
"die belangrikste ding op enige lys" genoem.

Die aanname was met omtrent **85% te ruim**.

---

## Die een som wat alles verander

Musiek kos **$0,15 per minuut**, op elke plan. Elke plan sluit 'n aantal
minute in:

| Plan | Minute musiek ingesluit |
|---|---|
| Free | 3 |
| Starter | 40 |
| Creator | 147 |
| Pro | 660 |
| Scale | 1 993 |
| Business | 6 600 |

Vermenigvuldig elkeen met $0,15:

    147 × 0,15 = $22       660 × 0,15 = $99       6 600 × 0,15 = $990

Dit is die planne se eie pryse terug. En dieselfde som werk vir elke ander
produk op die bladsy:

    8 250 minute stem-skeiding × $0,12  = $990
    4 500 uur transkripsie      × $0,22  = $990
    9,9 miljoen karakters       × $0,10/1 000 = $990
    450 minute oorklanking v2   × $2,20  = $990

**'n Plan is dus 'n dollar-begroting, nie 'n stel aparte toelaes nie.** Die
"ingesluit"-getalle is verskillende maniere om dieselfde geld te spandeer. Jy
kan nie 6 600 minute musiek *en* 4 500 uur transkripsie kry nie — jy kry $990
se gebruik, waarvan jy self besluit hoe dit lyk.

Dit maak die hele som eenvoudiger en eerliker as die krediet-model wat die
kode voorheen gehad het:

> **Een liedjie van twee minute kos ons $0,30 = R4,80. Op elke plan.**

Voorheen het die kode R2,59 gesê.

---

## Die volledige lys

Randkoers **R16 = $1**, dieselfde aanname as `app/lib/plans.ts`.

### Per eenheid — dieselfde op elke plan

| Produk | Prys | In rand |
|---|---|---|
| **Musiek** | $0,15 per minuut | R2,40 |
| Stem-verwisselaar (spraak na spraak) | $0,12 per minuut | R1,92 |
| Stem-afsonderaar (haal die kamer uit) | $0,12 per minuut | R1,92 |
| Klankeffekte | $0,12 per stuk | R1,92 |
| Spraak-enjin (agente) | $0,08 per minuut | R1,28 |
| Teks na spraak — v3 | $0,10 per 1 000 karakters | R1,60 |
| Teks na spraak — v3 Conversational | $0,05 per 1 000 karakters | R0,80 |
| Teks na spraak — v2 Multilingual | $0,10 per 1 000 karakters | R1,60 |
| Teks na spraak — Flash / Turbo | $0,05 per 1 000 karakters | R0,80 |
| Spraak na teks — Scribe v1/v2 | $0,22 per uur | R3,52 |
| Spraak na teks — Scribe v2 Realtime | $0,39 per uur | R6,24 |
| Oorklanking v1 — met watermerk | $0,33 per minuut | R5,28 |
| Oorklanking v1 — sonder watermerk | $0,50 per minuut | R8,00 |
| Oorklanking v2 | $2,20 per minuut | R35,20 |

### Ingesluit per plan

| Wat | Free | Starter | Creator | Pro | Scale | Business |
|---|---|---|---|---|---|---|
| Musiek (minute) | 3 | 40 | 147 | 660 | 1 993 | 6 600 |
| Stem-verwisselaar (minute) | 8,3 | 50 | 183 | 825 | 2 492 | 8 250 |
| Stem-afsonderaar (minute) | 8,3 | 50 | 183 | 825 | 2 492 | 8 250 |
| Klankeffekte (stuks) | 8 | 50 | 183 | 825 | 2 492 | 8 250 |
| Spraak-enjin (minute) | 15 | 75 | 275 | 1 238 | 3 738 | 12 375 |
| Scribe (uur) | 4,5 | 27 | 100 | 450 | 1 359 | 4 500 |
| Scribe Realtime (uur) | 2,5 | 15 | 56 | 254 | 767 | 2 538 |
| TTS v3 (karakters) | 10 000 | 60 000 | 220 000 | 990 000 | 2 990 000 | 9 900 000 |
| TTS Flash/Turbo (karakters) | 20 000 | 120 000 | 440 000 | 1 980 000 | 5 980 000 | 19 800 000 |
| Oorklanking v1, watermerk (min) | 2,53 | 18 | 67 | 300 | 906 | 3 000 |
| Oorklanking v1, skoon (min) | — | 12 | 44 | 198 | 598 | 1 980 |
| Oorklanking v2 (min) | 0,4 | 3 | 10 | 45 | 136 | 450 |

### Hoe hulle tel

Uit hulle eie vrae-en-antwoorde:

> Text to Speech is billed per character. Speech to Text is billed per audio
> minute. Music and Sound Effects are billed per generation. Dubbing is billed
> per source audio minute.

---

## Wat dit aan die winssomme doen

`docs/KOSTE-EN-WINS.md` is met die egte getalle oorgemaak. Die verskil is nie
klein nie.

| | Voorheen (aangeneem) | Nou (nagegaan) |
|---|---|---|
| Wat 'n liedjie ons kos, Business | R2,59 | **R4,80** |
| Minute musiek op Business | 12 222 | **6 600** |
| Realisties: gelykbreek | 118 lede | **165 lede** |
| Realisties: wat die plan kan voed | 245 lede | **132 lede** |
| Werk die realistiese geval? | ja | **nee** |

Lees daardie laaste reël stadig. **Met die egte pryse werk die realistiese
geval nie meer nie** — nie omdat die winsgrens te dun is nie, maar omdat die
plan te min minute het vir die getal lede wat jy nodig het.

## Die hefboom — en dis nou getrek

Negentien gratis gebruikers staan agter elke betalende een. Elk met tien
krediete is dit **meer ElevenLabs-minute as wat die betalende lid self
gebruik**. Dit was altyd die grootste hefboom; met die egte pryse was dit nie
meer 'n hefboom nie, dit was die enigste pad.

**Carli het dit op 8 September 2026 getrek: die gratis laag kry nie meer
musiek nie.** `TIER_CREDITS.free` is nul.

| | Voorheen | Nou |
|---|---|---|
| Realisties: gelykbreek | 165 lede | **125** |
| Realisties: wat die plan kan voed | 132 | **214** |
| Werk dit? | nee | **ja** |
| Sonder werkswinkels: gelykbreek | — | **103** teen 214 |

Wat die gratis laag in die plek daarvan het, is nie niks nie, en die
pryskaartjie sê dit so:

- Onbeperkte sketse in die blaaier — **regte** klank en **regte** video, op die
  toestel self gemaak
- Die opnamekamer, sonder enige perk: sing, neem op, meng, masteer
- Hooks, die tydlyn, die klankafrigter en die radar
- Styl-voorsmakies, sodat jy 'n klank kan hoor voor jy enigiets koop

Nie een van daardie kos ons 'n sent nie, en dít is die deel wat mense oortuig.
Die twee half-liedjies was die duur deel en die deel waarvoor niemand gebly
het nie.

En op die skerm waar iemand met nul krediete beland, staan dit nou ook: 'n
gegenereerde liedjie loop op 'n enjin wat per minuut vra, en dit is hoekom dit
die een ding is wat nie gratis is nie.

**Wat nou nog oop is, is die werkswinkels.** Dit is die enigste hefboom wat
oorbly: R4 000 'n maand, en gelykbreek skuif van 125 na 103.

---

## Wat nog nie hier staan nie

Die **maandelikse prys van elke plan** is nie op die skerms wat gestuur is
nie. Die kode neem Creator $22, Pro $99, Scale $330 en Business $990 aan, en
drie van daardie vier word deur die som hierbo bevestig — die ingeslote minute
maal $0,15 gee presies daardie bedrae terug.

**Scale is die uitsondering:** 1 993 × $0,15 = $299, nie $330 nie. Óf Scale
kos $299, óf dit kos $330 en gee minder gebruik terug as wat jy betaal. Die
kode neem die duurder lesing aan, wat die veilige een is, en dit wys as 'n
hoër koers per liedjie op daardie plan.
