# Kits.AI se hele produk, en waar elke stuk in FutureBox land

Carli het op 8 September 2026 die Professional Plan gekoop en skerms van elke
skerm gestuur. Hierdie dokument is die kaart: elke ding wat Kits doen, waar dit
by ons hoort, en wat dit **vervang** — want die plan is 'n vaste maandelikse
bedrag, en alles wat ons daarheen skuif is 'n rekening wat ophou per gebruik
loop — binne die dak hieronder.

Kits se prys is R640 per maand, vas — **maar met 'n dak van 400 aflaaiminute.**

Dít is die getal wat saak maak, en dit is maklik om mis te lees. Kits se FAQ sê
"unlimited conversion time"; die minute loop wanneer klank **afgelaai** word,
en ons toep laai elke resultaat af — dit is hoe die klank hier kom. So elke
minuut klank wat 'n lid terugkry, brand een van die 400.

* 400 minute ÷ R640 = **R1.60 per minuut klank**.
* 'n Liedjie van drie minute wat omgeskakel word = 3 minute = **R4.80**.
* Dit is ongeveer **133 omskakelings per maand oor al die lede saam**.

Ongebruikte minute rol oor na die volgende maand. "Unlimited" is onderhewig aan
billike gebruik.

Wat dit beteken vir die uitleg hieronder: die vier gereedskapstukke wat ons van
Music.ai af kan skuif, skuif nie na 'n gratis plek toe nie — hulle skuif na 'n
plek met 'n maandelikse dak. Die spaarplan bly reg (R1.60/min is goedkoper as
Music.ai per gebruik), maar daar moet 'n teller wees wat weet hoeveel van die
400 op is, en 'n rem wat stop voordat die dak breek. Dieselfde rem as
`SPEND_CEILING`, net op minute in plaas van rande.

---

## 1. Wat Kits het

### Convert
| Hulle skerm | Wat dit doen |
|---|---|
| **Voice changer** | Laai 'n akapella óf 'n hele liedjie op, kies 'n stem, kry dit terug in daardie stem. Blaai deur 100+ stemme. |
| **Classic Convert** | Dieselfde, ouer vloei. Tot 5 lêers gelyk. Audio-inset of liedjie-inset. |
| **Harmonies** | Een skoon stem in, 'n harmonie-stapel of 'n stemlaag uit. Kies watter stemme. |
| **History** | Elke job wat die rekening al geloop het. |

### Generate
| Hulle skerm | Wat dit doen |
|---|---|
| **Lead Vocals** (BETA) | Woorde in, 'n begeleiding op (10s–2min, WAV/MP3/FLAC), 'n styl in woorde ("Male, pop, high-pitch"), 'n lengte — en 'n **gesingde** hoofstem uit. 400 min per maand. |

### Clone Voices
| Hulle skerm | Wat dit doen |
|---|---|
| **Instant Voice Cloning** | 30 sekondes klank, dadelik 'n stem. Minder presies. |
| **Professional Voice Cloning** | 10–30 minute opgelaai, of hulle begeleide opname (5 min). Klink presies soos die datastel. |
| **Voice Blender** | Twee stemmodelle, 'n mengverhouding, een nuwe stem uit. |
| **Voice Designer** | **Geen datastel nie.** Geslag, styl (Pop, Rock, R&B, Rap, Traditional, Latin), 'n willekeurigheidskuif, en 'n asem/krag/warmte-driehoek. |

### Tools
| Hulle skerm | Wat dit doen |
|---|---|
| **Vocal Isolator** | Stem uit die musiek. Kan ook agtergrondstemme, weerklank en ruis uithaal. Tot 5 lêers. |
| **AI Vocal Repair** | Swak opgeneemde sang regmaak. Akapella of met instrumente terug. |
| **AI Mastering** | Presets: Analog Warmth, Light & Bright, Lush, Punch & Air, Tape Glue, Bass Heavy — óf 'n verwysingsnit. Max 200 MB / 12 min. |
| **Stem Splitter** | Vier bane: sang, tromme, bas, res. Gee ook toonaard en tempo. |
| **Key and BPM Finder** | Tot 10 lêers, toonaard en tempo van elk. |

---

## 2. Wat oor die API bereikbaar is, en wat nie

Carli het op 8 September Kits se API-dokumentasie gestuur. Die inhoudsblad lys
**vyf** API's en niks meer nie:

| API | Wat dit gee |
|---|---|
| **Voice Conversion API** | Lys omskakelings, haal een op sy nommer, begin 'n nuwe |
| **Voice Model API** | Stemmodelle |
| **Vocal Separations API** | Die Vocal Isolator |
| **Stem Splitter API** | Sang / tromme / bas / res |
| **Voice Blender API** | Twee stemme, een nuwe |

Dít is die hele oppervlak. **Harmonies, Lead Vocals, AI Mastering, AI Vocal
Repair, Key and BPM Finder en die Voice Designer is op hulle webwerf en nié in
hulle API nie.** Ons kan dit nie in ons toep inbou nie — nie omdat ons nie wil
nie, maar omdat daar geen adres is om te bel nie.

Dit is 'n goeie ding om vroeg te weet. Dit is presies die soort knoppie wat
gebou word, mooi lyk, en dan breek teen 'n diens wat reeds gelaai het.

Die dokumentasie bevestig ook drie dinge wat ons moes aflei:

* `GET /voice-conversions/{id}` bestaan — ons manier om te vra hoe 'n werk
  gevorder het was reg.
* Antwoorde kom as `{ "data": [ … ], "meta": { … } }`, en `id` is 'n **getal**.
* Lyste is **gepaginaseer op 10 per bladsy**. Sonder `perPage` wys 'n kieser
  stilweg net die eerste tien stemme — reggemaak.

---

## 3. Waar elke bereikbare stuk by ons land

Ons bou nie Kits se uitleg oor nie. Ons vat die funksie en sit dit waar 'n mens
in **ons** app reeds staan wanneer hulle dit nodig kry.

| Kits se ding | Waar dit by ons hoort | Wat dit vervang of oopmaak |
|---|---|---|
| Voice conversion | **Klaar gebou** — "Sing dit in my stem" op 'n klaar liedjie, en die sangmodel in Pro Booth. | Die enigste ding wat die app belowe het en nie kon lewer nie. |
| Voice Model API — lys | **Klaar gebou.** Jou stemme op naam, in albei kamers. | Die nommer wat 'n mens in 'n adresbalk moes gaan soek. |
| Voice Model API — skep | **The Booth**, as dit skep toelaat. Dít is die vraag wat die Voice Model-bladsy beantwoord. | Die uitgaande skakel na kits.ai. Kloning sonder om die app te verlaat. |
| Voice Blender | **Sound trainer.** Twee stemme, een nuwe. | 'n Ding wat niemand anders in SA aanbied nie. |
| Vocal Separations | Pro Booth en die Video-tafel. | **Music.ai per gebruik → Kits binne die dak.** |
| Stem Splitter | Pro Booth (bestaan reeds oor Music.ai). | **Music.ai per gebruik → Kits binne die dak.** |

En wat op hulle webwerf bly, met 'n eerlike sin daarby eerder as 'n knoppie wat
breek: Harmonies, Lead Vocals, Mastering, Vocal Repair, Key and BPM, Voice
Designer.

---

## 3b. Wat dit aan die rekening doen

Stem-isolasie en stemme skei loop vandag oor **Music.ai, per gebruik**. Kits
doen albei binne die R640 se dak van 400 minute. Toonaard en tempo bly by
Music.ai, want Kits se Key and BPM Finder is nie oor die API beskikbaar nie.

---

## 4. Wat nog nodig is

**Een bladsy uit hulle dokumentasie: die Voice Model API.** Dit beantwoord die
een vraag wat die meeste werd is — of 'n stem oor die API **geskep** kan word,
of net gelys. As dit geskep kan word, kom kloning in The Booth in en die
uitgaande skakel na kits.ai verdwyn. As dit nie kan nie, bly die skakel en die
tutorial die eerlike antwoord.

Die ander drie bladsye (Vocal Separations, Stem Splitter, Voice Blender) sê
watter velde elke werk vat.

**En `/api/kits/setup?key=<POST_SECRET>`**, wat nou nege adresse vra in plaas
van een-en-dertig — die vyf gedokumenteerde plus vier plekke waar 'n
minuut-telling kan wees.

Wat die verslag terugstuur:

* `realPaths` — die adresse wat werklik bestaan (403 tel: dit beteken dit is
  daar en dit is bewaak).
* `voices` — haar afgerigte stemme se name, wat presies is wat die kieser wys.
* `found` — vir elke adres: die status, hoeveel dinge daar is, en wat die velde
  van een van hulle heet. Nooit iemand se klank of rekeningbesonderhede nie.
