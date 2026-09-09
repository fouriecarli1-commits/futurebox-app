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

**Daardie teller staan nou.** `supabase/kits.sql` hou die tabel,
`app/lib/server/kitsminutes.ts` die somme en die rem, en `/api/voice/sing` vra
of daar plek is **voordat** dit krediete vat — 'n lid wat teen 'n dak vasloop
wat hy nie kan sien nie, moet nie ook daarvoor betaal het nie. Die dak self is
`KITS_MONTHLY_MINUTES`, wat onstel 400 beteken. Loop `supabase/kits.sql` in
Supabase, anders is daar niks om in te tel nie en die rem staan oop.

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

## 4. Wat die egte rekening geantwoord het

Carli het `/api/kits/setup` op 8 September 2026 teen die lewendige rekening
oopgemaak. Dít is nie meer afgelei nie — dit is gemeet.

**Die sleutel werk, en die plan is reg.** `ready: true`, `needsPlan: false`.
Die vorige keer het elke adres geantwoord *"Free tier users are not allowed to
use the api"*. Dit is verby; die betaalde plan is aan.

**Al vyf gedokumenteerde adresse is eg** — `voice-conversions`, `voice-models`,
`vocal-separations`, `stem-splits`, `voice-blender`, elkeen 'n 200. Geen
raaiskoot bly oor oor watter adres bestaan nie.

**Daar is géén rekening-API nie.** `user`, `me`, `account` en `usage` het al
vier 200 geantwoord met **5925 grepe HTML** — hulle webwerf se eie bladsy,
dieselfde lyf vir al vier. Nie 'n 404 nie, wat die strik is: 'n toets wat net
na die status kyk sou vier werkende adresse gerapporteer het.

> **Wat daaruit volg:** Kits sal ons nooit vertel hoeveel van die 400 minute op
> is nie. Ons eie telling in `kitsminutes.ts` is nie 'n lapmiddel tot 'n regte
> adres opdaag nie — dit is die enigste rem wat daar ooit gaan wees. Iemand wat
> direk op kits.ai omskakel, spandeer minute wat ons nie kan sien nie, dus
> dryf die twee getalle met opset uitmekaar: húlle paneelbord is die
> gesaghebbende, ons s'n is die rem.

**Die stem-splitter se velde is bevestig** teen een egte klaar werk:

```
id, createdAt, type, status, jobStartTime, jobEndTime,
backingAudioFileUrl, vocalAudioFileUrl, lossyVocalAudioFileUrl,
stemFileUrls, lossyStemFileUrls
```

Elke veld wat `stemsIn`, `stateIn` en `idIn` soek is daar, presies so gespel.
Drie raaiskote, al drie reg.

**Die stemmodel se velde is bevestig:** `id, title, isUsable, tags,
twitterLink, instagramLink, tiktokLink, spotifyLink, youtubeLink, imageUrl,
demoUrl`. Ons lees vier van hulle. `imageUrl` is eg en ongebruik — die kieser
wys name waar dit gesigte kon wys.

**Jy het nul afgerigte stemme.** `myModels=true` kom leeg terug. Dus is Kits se
eie katalogus vandag die **enigste** ding waarin enigiemand kan sing, joune
ingesluit. Dit maak `catalogue()` draend, nie 'n ekstra nie.

**Die minuut-teller antwoord** — `dak 400, gebruik 0, oor 400`. `kits.sql` het
geland.

### Wat nog nie gemeet is nie

`voice-conversions`, `vocal-separations` en `voice-blender` was almal **leeg**
op die rekening, dus het hulle géén veldname teruggegee nie. Daardie drie
adresse is bewys om te bestaan en die sleutel te aanvaar; hulle rekord-vorms is
steeds dokumentasie, nie waarneming nie. Die eerste egte werk deur elkeen is
wat dit vasmaak.

---

## 5. Wat nog nodig is

**BEANTWOORD, 9 September 2026: nee. `POST /voice-models` gee 404.**

Carli het die verslag teen die lewendige rekening laat loop. Daar is geen skep
oor die API nie — stemmodelle is lees-alleen. Dit maak die vraag toe, en dit
maak dit teen die kamer toe: stem-opleiding kán nie in The Booth inkom nie.
Nie omdat dit nie gebou is nie, maar omdat Kits dit glad nie oor die API
aanbied nie.

Dit is belangrik om die rede reg te stel, want dit is twee keer verkeerd
gestel. Kits doen wél stemkloning vir sang — dit is die produk, en dit is
waarvoor die intekening betaal. Dit gebeur net op **hulle werf**. Hulle API
lys stemme en sing daarin; dit maak nie een nie. Die uitgaande skakel na
kits.ai is dus nie 'n gat in hierdie toep nie — dit is die enigste deur wat
bestaan, en `HowToTrain` sê dit nou so, met die datum van die meting.

**Die Voice Blender se velde — nou vraagbaar.** Dit was 'n vraag vir Carli:
hulle dokumentasie noem die adres en nie die lyf nie, en 'n kamer gebou teen 'n
raaiskoot is presies die knoppie waarteen §2 waarsku.

`/api/kits/setup` vra dit nou self, met 'n leë lyf wat nie 'n vermenging kan
word nie — dieselfde truuk as `kanStemmeSkep`. Wat terugkom is húlle eie klagte,
en 'n geldigheidsklagte noem gewoonlik sy velde.

**HALF BEANTWOORD, 9 September 2026.** Die antwoord is **422** met presies dit,
en niks meer nie:

```json
{"error":"E_VALIDATION_FAILURE: Validation Exception","code":"E_VALIDATION_FAILURE"}
```

Wat dít vasmaak: die adres is eg, dit vat 'n POST, en dit het hierdie lyf op sy
**inhoud** geweier. Die menger kán dus gebou word. Wat dit nié doen nie, is sê
wat hy wil hê — daar is geen veldlys in daardie lyf nie, in geen van die drie
vorms wat `fieldsIn` lees nie. (Die parser het korrek *geen* teruggegee eerder
as om een uit te dink.)

Die volgende stap is dus eliminasie eerder as een vraag: stuur 'n klein
geordende stel waarskynlike lywe en kyk of die fout verander. 'n 422 skep
niks, so die soektog is gratis en veilig. Waarskynlike name om te probeer, in
hierdie volgorde:

| Probeer | Waarom |
|---|---|
| `{"voiceModelIds":[1,2]}` | Hulle eie kamelnotasie, soos `voiceModelId` in die omskakeling |
| `{"voiceModels":[1,2]}` | Dieselfde, sonder die `Id`-agtervoegsel |
| `{"models":[1,2]}` | Die kortste vorm |
| `{"voiceModelId1":1,"voiceModelId2":2}` | Twee genoemde velde eerder as 'n lys |
| `{"name":"toets","voiceModelIds":[1,2]}` | Dalk kla dit oor 'n naam eerder as oor die stemme |

Die oomblik as die fout van `E_VALIDATION_FAILURE` af verander — na 'n ander
kode, of na iets wat 'n veld noem — is die vorm gevind.

**Die veldname van drie werke.** `voice-conversions`, `vocal-separations` en
`voice-blender` was leeg, dus is hulle vorms nog dokumentasie. Die eerste egte
werk deur elkeen maak dit vas, en dit gebeur vanself sodra iemand die kamers
gebruik — niks om te beplan nie, net om te onthou om weer te kyk.

**~~`imageUrl` in die kieser.~~ Gedoen.** Elke ry in die sangstem-kieser het nou
'n teël: Kits se prent waar daar een is, en die eerste letter waar nie. Dieselfde
vorm vir elke ry, want 'n lys waar party rye 'n prent het en party nie, is 'n
rafelrige lys.

Die adres self kom nooit in die bladsy nie. Kits se stoorgasheer is nié in
hierdie app se `img-src` nie — en behoort nie te wees nie — so die prent kom
deur `/api/kits/face` terug, dieselfde ruil as `/api/voice/preview` vir
ElevenLabs se monsters. Dit is ook die veiliger keuse: die gasheer is nog nooit
waargeneem nie, net gedokumenteer, so om die beleid te verbreed sou beteken om
'n gasheernaam te ráái — en 'n verkeerde raaiskoot misluk stilweg as 'n
geblokkeerde prent.

**~~`jobStartTime` / `jobEndTime` na die minuut-teller.~~ Moet dit nie doen
nie — hierdie punt was verkeerd.**

Dit het gesê die teller *skat* en dat Kits die egte getal teruggee. Albei
helftes is verkeerd:

* Die teller skat nie. `lib/server/audiolen.ts` lees die WAV se kop en kry die
  presiese lengte; die "skatting" is net die terugval vir 'n lêer waarvan die
  kop nie gelees kan word nie.
* `jobStartTime` en `jobEndTime` is hoe lank die **werk geloop het**, nie
  hoeveel klank teruggekom het nie. 'n Liedjie van drie minute kan in twintig
  sekondes verwerk word. Om dit te volg sou 'n presiese getal met een vervang
  het wat vier keer te klein is.

Wat *wel* verkeerd was, en nou reg is: die teller het die lêer getel wat
**gestuur** is. Die minute brand op **aflaai**, en `/api/stems` laai twee
lêers af — die stem én die begeleiding, elk die hele liedjie lank — en het een
liedjie se lengte neergeskryf. Die helfte van wat dit gebrand het. Sien
`downloadSeconds` in `lib/server/kitsminutes.ts` en `check:kitsminutes`.

'n Dokument wat die volgende persoon sê om die ding te breek, is erger as een
wat niks sê nie — daarom staan die ou punt hier deurgehaal eerder as uitgevee.

### Die verslag self

`/api/kits/setup?key=<POST_SECRET>` vra nege adresse: die vyf gedokumenteerde,
plus die vier wat nou bewys is om nie te bestaan nie. Daardie vier bly in die
lys — een oproep elk, en as Kits ooit 'n rekening-adres byvoeg, is dít waar dit
gaan wys.

Wat die verslag terugstuur:

* `realPaths` — die adresse wat werklik bestaan (403 tel: dit beteken dit is
  daar en dit is bewaak).
* `voices` — haar afgerigte stemme se name, wat presies is wat die kieser wys.
* `found` — vir elke adres: die status, hoeveel dinge daar is, en wat die velde
  van een van hulle heet. Nooit iemand se klank of rekeningbesonderhede nie.

Die inhoudstipe-toets in `probe()` is wat die vier HTML-antwoorde leesbaar
gemaak het. Sonder dit sou die verslag vier werkende adresse aangemeld het.
Moenie dit uithaal nie.
