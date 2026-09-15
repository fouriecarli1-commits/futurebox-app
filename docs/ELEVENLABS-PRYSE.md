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

| Plan | Minute musiek ingesluit | Waar dit vandaan kom |
|---|---|---|
| Free | 3 | afgelei |
| Starter | 40 | afgelei |
| Creator | 147 | afgelei |
| Pro | 667 | ElevenLabs, 9 Sep 2026 |
| Scale | 2 000 | ElevenLabs, 9 Sep 2026 |
| Business | 6 667 | ElevenLabs, 9 Sep 2026 |

Die laaste drie ry se getalle is nie meer afgelei nie. ElevenLabs se
ondersteuning het op 9 September 2026 die krediete self gegee — 600 000,
1 800 000 en 6 000 000 — en 900 krediete is een minuut musiek. Die ou
afgeleide getalle was 660, 1 993 en 6 600; hulle het tot binne 1% gestem,
en hulle s'n is die gesaghebbende een.

Vermenigvuldig elkeen met $0,15:

    147 × 0,15 = $22       667 × 0,15 = $100      6 667 × 0,15 = $1 000

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

### Per eenheid — en waar hierdie lys op 15 September reggemaak is

*Carli het op 15 September 2026 ElevenLabs se **volledige diens-vir-diens
tabelle** gestuur — een blad per produk, met die ingeslote hoeveelheid en die
ekstra-eenheid-prys op elke plan. Dit is die eerste keer dat hierdie getalle
van hulle eie bladsy af kom eerder as afgelei word, en **vier reëls hieronder
was verkeerd.***

**Wat verkeerd was, en hoekom.** Die ou lys het elke prys afgelei deur die
plan se prys deur 'n aanvaarde toelaag te deel. Dit werk net as die toelaag
reg is, en vir vier produkte was dit nie. Die regte anker is **krediete**:
Business is 6 000 000 krediete vir $990, oftewel $0,000165 elk, en elke
produk het 'n vaste krediet-prys per eenheid.

Dít is nagegaan teen **twee** plan-kolomme onafhanklik — Pro (600 000
krediete) en Business (6 000 000) — en elke produk gee dieselfde ronde
krediet-getal in albei. Dit is hoe 'n mens weet die model is reg en nie net
'n som wat een keer uitgekom het nie.

| Produk | Krediete per eenheid | Wat dit kos | In rand |
|---|---|---|---|
| **Musiek** | 900 / minuut | $0,1485 per minuut | R2,38 |
| Teks na spraak — v3 / Multilingual | 1 / karakter | $0,165 per 1 000 karakters | R2,64 |
| Teks na spraak — Flash / Turbo | 0,5 / karakter | $0,0825 per 1 000 karakters | R1,32 |
| Stem-verwisselaar (spraak na spraak) | 1 000 / minuut | **$0,165** per minuut | R2,64 |
| Stem-afsonderaar (haal die kamer uit) | 1 000 / minuut | **$0,165** per minuut | R2,64 |
| Klankeffekte | 200 / stuk | **$0,033** per stuk | R0,53 |
| Spraak na teks (Scribe) | 330 / minuut | $3,27 per uur — **sien die waarskuwing hieronder** | R52,32 |
| Oorklanking v1 — met watermerk | 2 000 / minuut | $0,33 per minuut | R5,28 |
| Oorklanking v1 — sonder watermerk | 3 000 / minuut | $0,495 per minuut | R7,92 |
| Oorklanking v2 | 13 500 / minuut | $2,23 per minuut | R35,68 |
| Oorklankingstudio — met watermerk | 5 000 / minuut | $0,825 per minuut | R13,20 |
| Oorklankingstudio — sonder watermerk | 10 000 / minuut | $1,65 per minuut | R26,40 |
| Prente | ~182 / prent | $0,030 per prent | R0,48 |
| Video | ~170 / sekonde | $0,028 per sekonde | R0,45 |

**Wat verander het teenoor die ou lys:**

| Produk | Ou lys | Regte getal | Verskil |
|---|---|---|---|
| Stem-verwisselaar | $0,12/min | **$0,165/min** | 38% duurder |
| Stem-afsonderaar | $0,12/min | **$0,165/min** | 38% duurder |
| Klankeffekte | $0,12/stuk | **$0,033/stuk** | 73% goedkoper |
| TTS v3 | $0,10/1 000 | **$0,165/1 000** | 65% duurder |

### ⚠️ Transkripsie: die een getal wat nie klop nie

ElevenLabs se eie Speech-to-Text-tabel gee **albei** hierdie dinge op dieselfde
blad:

- **"Extra hour, API: $0,22"** — op elke plan, Free tot Business.
- **"Transcription per month: 303 h 2 m"** op Business.

Maar 303 uur uit 'n begroting van $990 is **$3,27 per uur**. Dit is 'n
**vyftienvoudige** gaping, en dit is nie 'n afrondingsfout nie.

Die waarskynlikste verklaring is dat spraak-na-teks **oor die API** teen 'n
aparte, goedkoper koers gefaktureer word en nie die krediet-poel op dieselfde
manier eet nie — die ry sê immers uitdruklik *"API"*. Ons `/api/transcribe`
loop oor die API, so as dit waar is, is $0,22 die koers wat vir ons geld.

**Ek kan dit nie van hierdie masjien af nagaan nie.** Dit is nou 'n vraag in
`docs/ELEVENLABS-SALES.md`. Tot dit beantwoord is, behandel transkripsie as
die duur weergawe wanneer 'n som moet hou, en die goedkoop een wanneer 'n som
moet oortuig — met ander woorde: moenie 'n besluit op hierdie getal bou nie.

### Ingesluit per plan — nagegaan 15 September 2026

*Elke ry is die plan se hele krediet-poel op daardie een produk spandeer. Dit
is nie ses aparte toelaes nie; dit is ses maniere om dieselfde geld uit te gee.*

| Wat | Free | Starter | Creator | Pro | Scale | Business |
|---|---|---|---|---|---|---|
| Krediete | 10 000 | 30 000 | 121 000 | 600 000 | 1 800 000 | 6 000 000 |
| Musiek (minute) | 11 | 33 | 134 | 667 | 2 000 | 6 667 |
| Teks na spraak (minute) | ~10 | ~30 | ~121 | ~600 | ~1 800 | ~6 000 |
| Stem-verwisselaar (minute) | 8,3 | 30 | 121 | **600** | 1 800 | **6 000** |
| Stem-afsonderaar (minute) | 8,3 | 30 | 121 | **600** | 1 800 | **6 000** |
| Klankeffekte (stuks) | 8 | 150 | 605 | **3 000** | 9 000 | **30 000** |
| Scribe | 12 min | 1 u 31 | 6 u 7 | **30 u 18** | 90 u 55 | **303 u 2** |
| Prente | 40 | 198 | 660 | 3 300 | 11 000 | 44 000 |
| Video (sekondes) | — | 211 | 705 | 3 525 | 11 752 | 47 008 |
| Oorklanking v1, watermerk (min) | 2,53 | 15 | 61 | 300 | 900 | 3 000 |
| Oorklanking v1, skoon (min) | — | — | 40 | 200 | 600 | **2 000** |
| Oorklanking v2 (min) | 0,4 | 2 | 9 | 44 | 133 | **444** |
| Oorklankingstudio, watermerk (min) | — | 6 | 24 | 120 | 360 | 1 200 |
| Oorklankingstudio, skoon (min) | — | — | 12 | 60 | 180 | 600 |
| Stem-gleuwe | 3 | 10 | 30 | 160 | 660 | **2 200** |
| Professionele stem-gleuwe | 0 | 0 | 1 | 1 | 3 | **10** |
| Sitplekke | 1 | 1 | 1 | 1 | 3 | **10** |
| Gelyktydige versoeke | 2 | 3 | 5 | 10 | 15 | **15** |
| Gelyktydige transkripsies | 8 | 12 | 20 | 40 | 60 | **60** |

### Perke wat geen plan oplig nie

| Diens | Die perk |
|---|---|
| Stem-verwisselaar | **5 minute** per omskakeling — op elke vlak, Free tot Business |
| Stem-afsonderaar | 1 uur, 500 MB, 9 videoformate, **geen groepverwerking op enige vlak** |
| Spraak na teks | 3 GB per lêer, 99 tale, 32 spreker-etikette |
| Klankeffekte | 30 sekondes per stuk, en *"rights survive cancellation"* |
| Musiek | tot 6 stamme, verliesvrye WAV, **"Release to Spotify and Apple"** aangemerk |

### Wat die winssomme hiervan hoor

**Niks.** Dit is die goeie nuus en dit is die moeite werd om uitdruklik te sê.

`scripts/costs-eleven.mts` reken die hele bedryfsmodel in **krediete** uit —
`TIER_CREDITS` en `CREDITS`, uit die app se eie lêers — en die enigste
dollar-prys per eenheid wat dit gebruik, is musiek se $0,15, wat reg is. Die
vier verkeerde reëls hierbo het net in hierdie dokument en in een verduidelikende
opmerking in daardie skrip gestaan. `docs/KOSTE-EN-WINS.md` is nie geraak nie
en hoef nie oorgemaak te word nie.

Dit is presies hoekom die model in krediete geskryf is eerder as in dollars.

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

## Wat vroeër hier as onbekend gestaan het

Hierdie afdeling het gevra wat elke plan maandeliks kos, want dit was nie op
die skerms wat gestuur is nie. Die kode het Creator $22, Pro $99, **Scale
$330** en Business $990 aangeneem, en het aangeteken dat Scale die
uitsondering is: 1 993 × $0,15 = $299, nie $330 nie.

**ElevenLabs se ondersteuning het dit op 9 September 2026 beslis.** Scale kos
$299. Die duurder lesing was verkeerd, en dit is reggemaak in
`scripts/costs-eleven.mts`. Wat hulle gegee het:

| Plan | Prys | Krediete | Per krediet |
|---|---|---|---|
| Pro | $99 | 600 000 | $0,000165 |
| Scale | $299 | 1 800 000 | $0,000166 |
| Business | $990 | 6 000 000 | $0,000165 |
| Top-up | — | teen $0,000165 elk, min. $5, verval na 12 maande | $0,000165 |

**Daar is geen volume-afslag nie.** $99 ÷ 600 000 en $990 ÷ 6 000 000 is
presies dieselfde getal, en dit is ook presies wat 'n top-up kos. Business is
tien keer die prys vir tien keer die krediete en niks anders nie. Scale is die
enigste een wat effens uit pas val — 0,7% duurder per krediet as die ander
twee.

Dit trek 'n streep deur die ou gevolgtrekking dat "Business die enigste plan
is wat ooit wins kan maak". Daardie som het op 'n dak gestaan wat nie bestaan
nie: die plan is 'n vooruitbetaling, nie 'n limiet nie, en die marge per lid
is op elke plan dieselfde.

**Die presiese koers is $0,1485 per minuut**, nie $0,15 nie — 900 krediete maal
$0,000165. Die $0,15 op hierdie bladsy is die afronding daarvan, en dit is
hoekom die somme hierbo op Business $10 verby die planprys land. Die fout is
1%, en sy groei saam met die plan.
