# Waar krediete hoort, en waar nie

*30 September 2026. Carli: "Ons moet krediete aan ons eie video editing heg,
asook probooth … wees asb billik met die prys uitleg en voorstelle, asook
adverts (gaan kyk na elke kamer in creative studio en kyk waar ons gratis
sinvolle funksies bied waar ons krediete aan dit kan heg)."*

Gemeet eerder as geraai: elke roete in `app/api` wat 'n verskaffer bereik, en
of dit `charge()` roep.

---

## 1. Eers die reël wat al bestaan, want dit is reg

Die toep het een model en dit werk:

> **'n Kamer binnegaan is by die plan in. Iets laat máák kos krediete.**

Daarom kos die Pro Booth en die video-editor niks per gebruik nie: **hulle kos
ons niks om te bedryf nie.** `stitch.ts` verf rame op 'n canvas in haar
blaaier; die Booth meng en master op die foon self. Daar is geen faktuur agter
'n knoppie wat 'n fade trek nie.

En dis presies hoekom ek versigtig is met wat jy vra.

---

## 2. Die een keer wat ek terugpraat

Jy het op 24 September gesê: **"Te veel aankoop punte gaan mense afsit."** Dit
was oor die advert-byvoegings, en ons het toe `ADDONS` heeltemal uitgevee.

Krediete hef om die editor te **gebruik** is dieselfde fout in 'n ander pak:

* Die plan-kaarte sê die editor kom by elke betaalde plan in.
* Iemand wat R149 betaal het en dan krediete moet betaal om 'n stuk te sny,
  het twee keer vir een ding betaal.
* En ons kry niks terug nie, want daardie sny kos ons niks.

'n Meter op werk wat niks kos nie is nie inkomste nie — dit is **wrywing**. Dit
leer mense om minder te gebruik aan die een ding wat hulle aan die plan gebonde
hou.

> **My aanbeveling was: moenie krediete aan die editor of die Booth se
> blaaierwerk heg nie.** Nie omdat dit nie kan nie, maar omdat dit die enigste
> ding wegvat wat hulle onweerstaanbaar maak: onbeperkte oefening teen geen
> koste.

---

## 2a. En haar besluit, wat die bostaande oorheers

Carli, 1 Oktober 2026: *"Onthou dat hierdie ook 'n betaalde produk is wat
krediete werd is."*

Sy het die beswaar gehoor en dit twee keer gestel. **Die snykamer hef nou.**

Wat die beswaar wél gekoop het, is die **vorm** — en dit maak die verskil
tussen 'n meter en 'n prys:

| | |
|---|---|
| **Gratis, onbeperk** | Knip, split, herorden, fades, looks, woorde, lettertipes, die logo, die klankbaan, zoom — hoe lank jy ook al sit |
| **Kos krediete** | **Een druk:** die film saamsit. **3 krediete per minuut**, afgerond na 'n volle minuut |

* 'n 8-sekonde advertensie = **3 krediete** (R4,97)
* 'n 3-minuut musiekvideo = **9 krediete** (R14,90)
* Maker se 90 koop **dertig** een-minuut films 'n maand

Drie, en nie meer nie, om twee redes. Jy het self gesê *"Dit moenie te duur
wees nie"*. En dit is die **enigste prys in die hele lêer sonder 'n verskaffer
agter dit** — elke ander getal daar is 'n opslag op iets wat iemand ons
faktureer; hierdie een is suiwer wat die werk werd is, en 'n getal wat niemand
teen 'n koste kan nagaan nie, moet die beskeie een wees.

Die dertig per maand is die syfer wat saak maak: 'n editor is daarvoor om
**weer te probeer**, en 'n prys wat iemand twee keer laat dink oor 'n tweede
poging, het die kamer gebreek wat dit hef.

### Drie dinge wat die vorm eerlik hou

1. **Die prys staan op die knoppie**, uit `CREDITS` gereken, voor die druk.
   `check:saysprice` hou dit vas — 'n heffing wat jy agterna ontmoet, is die
   ding wat mense laat ophou 'n kamer vertrou.
2. **Gehef ná die film bestaan.** Eers hef en dan terugbetaal klink reg en is
   dit nie: 'n terugbetaling het 'n bedrag nodig, en die enigste plek waar 'n
   latere versoek een kan kry, is die blaaier. Hierdie volgorde kan nooit vir
   'n film hef wat nooit gekom het nie.
3. **Op elke plan-kaart**, in dieselfde sin as die kamer. `check:sold` laat die
   build misluk as dit nie daar is nie: 'n kamer wat hef en een wat nie hef
   nie, is twee verskillende produkte.

---

## 3. Maar daar **is** 'n gat, en dit is groter as die editor

Die meting het dit uitgewys. Hierdie roetes bereik 'n verskaffer en hef
**niks**, en het geen plafon nie:

| Roete | Verskaffer | Gemeter? |
|---|---|---|
| **`/api/copilot`** | Anthropic | **geen `charge`, geen `allowanceFor`, geen `check()`** |
| `/api/help` | Anthropic | nee |
| `/api/adformats` | Anthropic | nee |
| `/api/mixdesk` | Anthropic | nee |
| `/api/photosong` | Anthropic | nee |
| `/api/songfrom` | Anthropic | nee |
| `/api/translate` | Anthropic | nee |
| `/api/recommend` | Anthropic | nee |
| `/api/voice/preview` | ElevenLabs | nee — en dít is spraak, per roep |

**Die kopiloot is die grootste gratis oppervlak in die hele toep.** Dit sit in
elke kamer, dit is die eerste ding wat iemand aanraak, dit loop op Anthropic —
R1 500 'n maand in `fixedcosts.mts` — en niks tel dit nie. Een persoon kan dit
heeldag gebruik en niks in die stelsel weet daarvan nie.

Dít is waar jou vraag heen wys, nie na die editor nie.

### Wat ek daarmee sou doen

**Nie krediete nie.** 'n Meter op die assistent leer mense om op te hou vra, en
vra is hoe hulle die toep leer gebruik. 'n **Plafon per dag**, met die
boodskap wat sê wanneer dit terugkom:

| | Kopiloot-boodskappe per dag |
|---|---|
| Gratis | 10 |
| Maker | 100 |
| Studio / Label | onbeperk |

Tien is genoeg om te sien hoekom dit goed is. Honderd is meer as wat 'n mens
op 'n werksdag haal. Dit kos niks vir die mense wat betaal nie en sit 'n dak
op die een reël wat nou onbeperk is.

`/api/voice/preview` is 'n ander saak: dit is ElevenLabs-spraak per roep, en
dit behoort 1 krediet te kos of teen 'n paar per dag geplafon te word.

---

## 4. Waar die editor **wel** krediete moet hef

Alles wat jy pas gevra het, sorteer skoon in twee hope.

### Gratis, en moet gratis bly — dit loop in die blaaier

Tydlyne · sny · zoom op die prent · die logo rondskuif · teks skuif, groter
maak, fonts · meer filters · in- en uitfade vir video, klank én skrif ·
trek-handvatsels op die tydlyn · export.

**Nie een van hulle raak 'n verskaffer nie.** Hulle is CSS, canvas en
`MediaRecorder`. Hulle kos R0,00 hoeveel keer sy dit ook al doen.

### Krediete, want daar is 'n faktuur agter

| Funksie | Voorstel | Waarvandaan |
|---|---|---|
| Agtergrond uit | **8** per 5 sek | `CREDITS.cutout` — bestaan reeds |
| Item uit die skoot | **11** per 5 sek | `CREDITS.erase` — bestaan reeds |
| 'n Stuk genereer wat jy nie het nie | **15** per 5 sek | `CREDITS.video` — bestaan reeds |
| Outo-onderskrifte uit die klank | **2** per minuut | `CREDITS.transcribe` |
| Stem oor die video, uit teks | **6** | `CREDITS.read` |
| Musiekbed genereer | **5** (half) / **10** (vol) | `CREDITS.halfSong` / `song` |

**Vyf van die ses bestaan al.** Daar is niks nuuts om te prys nie — net om te
bedraad. Dis die goedkoopste moontlike antwoord op "heg krediete aan die
editor", en dit hef presies waar ons betaal.

---

## 5. Adverts

Carli, dieselfde aand: *"Die advert krediete moet wel duurder wees. Daai is 'n
premium funksie wat baie smart is en mense behoort heelwat duurder en met meer
krediete vir daardie funksie te betaal."*

Gedoen. `CREDITS.marketPlan` gaan van 40 na **75** en `CREDITS.adLines` van 20
na **40**:

| | Krediete | In rand | Teen die koste |
|---|---|---|---|
| 'n Maand se bemarkingsplan | **75** | R124,20 | 25× (was 13,4×) |
| Agt advertensielyne | **40** | R66,24 | 20× (was 10,1×) |

25× is die hoogste veelvoud in die hele lêer ná oorklanking, en dit is die
punt: dit is die een ding wat teen 'n **besigheidsuitkoms** geprys word eerder
as teen 'n ambag. 'n Lied is werd wat 'n lied werd is. 'n Maand se bemarking
wat werk is werd wat 'n bemarkingsmens kos — en R124 is ver onder enige van
hulle. R199 'n maand is wat iemand reeds ingestem het om hiervoor te betaal
toe dit nog 'n intekening was.

75 is ook 'n **vorm**, en 'n beter een as 40: Maker se 90 koop nou **een plan
per maand**, Studio se 190 twee, Label se 440 vyf. 'n Maandelikse plan behoort
soos 'n maandelikse ding te lees. Teen 40 het 'n Maker-lid twee per maand
gekry, wat dit soos iets laat lyk het wat 'n mens druk.

Advertensielyne bly presies die helfte van die plan, en die helfte maak meer
saak as albei getalle: iemand wat net lyne wil hê, moet nooit die plan koop
wat hulle nie gebruik nie.

`/api/campaign` en `/api/plan` hef albei reeds, so daar is niks te bedraad nie.
`check:sold` hou die getalle teen die plan-kaarte vas — ek het dit op 999 gesit
om seker te maak dit kyk regtig.

Die **een** gat is `/api/adformats` — dit skryf advertensieformate op
Anthropic en hef niks. Dit hoort onder dieselfde daglimiet as die kopiloot.

---

## 6. Is dit billik?

Die anker is Maker: R149 vir 90 krediete = **R1,656 per krediet**.

| Wat sy koop | Krediete | In rand |
|---|---|---|
| Onderskrifte op 'n 1-minuut advert | 2 | R3,31 |
| Stem oor die video | 6 | R9,94 |
| Agtergrond uit, 5 sek | 8 | R13,25 |
| Musiekbed, half | 5 | R8,28 |

'n Advert van een minuut met onderskrifte, 'n stem en 'n musiekbed kos **13
krediete — R21,53**. Op Maker se 90 is dat sewe sulke adverts 'n maand, en die
knip, die fades, die teks en die export daaromheen kos niks.

Dit is die vorm wat ek sou verkoop: **die vakmanskap is gratis en onbeperk, en
die enjin kos.**

---

## 7. Wat ek nie sou doen nie

* **Krediete per export.** Dit kos ons niks en dit is die een oomblik waar
  iemand klaar is en gelukkig is. 'n Rekening daar is die onthoubaarste slegte
  oomblik in die produk.
* **'n Watermerk op gratis exports.** Ons verkoop planne, nie 'n proeflopie
  nie, en die gratis laag maak reeds net blaaierskesse.
* **Krediete om die Booth of die editor oop te maak.** Die kaarte sê dit kom by
  die plan in. 'n Deur wat betaal wil word ná die plan is 'n kaart wat lieg.
