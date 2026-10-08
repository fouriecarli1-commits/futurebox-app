# MiniMax en OpenArt se pryse, teen ons eie

*Carli het hierdie pryse op **8 Oktober 2026** gestuur: MiniMax se eie
betaal-soos-jy-gaan tabelle, en OpenArt se vier planne met die kredietkoste
van elke model daarop.*

## Waar hierdie syfers vandaan kom

**Ek kon nie een van die twee bladsye self lees nie.** Die uitgaande netwerk
blokkeer albei, soos dit render.com en fal.ai blokkeer. Elke prys hieronder is
hare, met die datum daaraan; die rekenkunde bo-op is myne.

Daardie onderskeid maak saak. As 'n prys skuif, skuif die gevolgtrekking saam,
en `check:minimax` is die plek wat dit hardop sê eerder as 'n paragraaf wat
niemand weer naloop nie. Die toets lees `CREDITS.video` en `RAND_PER_USD` uit
die kode, nie uit hierdie bladsy nie.

## Die een syfer waarteen alles gemeet word

'n Krediet is vir ons tussen **R0,23 en R0,48** werd, afhangend van die plan
waarop dit gekoop is — `credits.ts` werk dit uit en sê die twee is 'n faktor
van twee uitmekaar. Ek prys teen die **R0,23**, want dit is die plan waar die
marge die dunste is, en 'n prys wat op die ruim plan werk en op die karige een
verloor, verloor.

By `CREDITS.video` = 15 krediete per vyf sekondes:

> **Vyf sekondes video bring R3,45 in.**

## Wat dieselfde vyf sekondes sou kos

| Waar en watter model | Dollar | Rand | Marge |
|---|---|---|---|
| MiniMax direk, H3 2K | $0,650 | R10,40 | **−R6,95** |
| MiniMax direk, H3 768P | $0,400 | R6,40 | **−R2,95** |
| MiniMax direk, H3-Max 768P | $0,400 | R6,40 | **−R2,95** |
| MiniMax direk, H3-Max 480P | $0,250 | R4,00 | **−R0,55** |
| OpenArt Wonder, Seedance 2.5 | $1,073 | R17,17 | **−R13,72** |
| OpenArt Pro, H3-Max | $0,367 | R5,87 | **−R2,42** |
| OpenArt Wonder, H3-Max | $0,330 | R5,28 | **−R1,83** |
| OpenArt Pro, H3-Max Turbo | $0,183 | R2,93 | **+R0,52** |
| **OpenArt Wonder, H3-Max Turbo** | **$0,165** | **R2,64** | **+R0,81** |

Ter vergelyking: die Kling-prys wat `credits.ts` se som op gebou is, is sowat
R3,44 vir vyf sekondes. Teen R3,45 in is dit **een sent marge** op die dunste
plan. Dit is nie 'n MiniMax-probleem nie — dit is waar ons video-prys nou al
staan.

**Een opsie in die hele tabel maak geld**, en dit is nie een van die
voor-die-hand-liggende nie.

## Die ding wat niemand verwag nie

**Om MiniMax deur OpenArt te koop is goedkoper as om dit by MiniMax self te
koop.** Dieselfde model, dieselfde resolusie, dieselfde vyf sekondes:

- MiniMax direk, H3-Max 768P: **$0,400**
- OpenArt Wonder, H3-Max: **$0,330**
- OpenArt Wonder, H3-Max **Turbo**: **$0,165**

Hulle planne dra volume-afslag wat ons teen ons grootte nie sou kry nie. Dit
is die teenoorgestelde van wat jy van 'n herverkoper verwag, en dit is die
hele bevinding.

## Die vangplek wat die hele vergelyking kan omkeer

**OpenArt se planne is per sitplek.** Die prys staan letterlik as
`$175 /Seat/mo`. Dit is 'n intekening vir 'n **mens wat hulle produk
gebruik** — hulle skerm wys Short Film, Product Ads, Music Video, Character
Builder, Image Upscale, 'n hele ateljee met 'n eie koppelvlak.

Dit is nie 'n groothandelsprys vir 'n API wat 'n ander app se lede bedien
nie, en ek moet dit sê voordat die tabel hierbo soos 'n plan lyk:

- "Commercial use rights" op die Wonder-plan beteken dat **jy** die werk wat
  **jy** maak kommersieel mag gebruik. Dit is nie toestemming om
  genereringskapasiteit aan derde partye te verkoop nie.
- Om FutureBox se lede deur een sitplek te bedien, is herverkoop. Of hulle
  terme dit toelaat, staan in hulle terme — en ek kan openart.ai nie bereik
  nie, so ek het dit nie gelees nie.
- Hulle **OpenArt MCP** ("Generate Images & Video Inside Your Agent") dui op
  'n programmatiese pad, maar 'n MCP vir jou eie agent is steeds jou eie
  sitplek.

**Dus:** die syfers hierbo is reg as rekenkunde en onbruikbaar as 'n plan
totdat iemand hulle terme lees. Die een vraag aan hulle verkoopspan is: *mag
'n app wat betalende lede het, generering deur julle koop en aan daardie lede
deurgee, en teen watter prys?* Dit is dieselfde vraag wat 'n mens aan enige
verskaffer vra, en dit is die enigste ding wat die tabel in 'n besluit
verander.

Vir **MiniMax direk** is daardie vraag nie nodig nie: dit is 'n
betaal-soos-jy-gaan API met standaard-sleutels, wat is wat ons al met Kling en
ElevenLabs doen. Dit is net duurder.

## Maar dit draai om vir prente

| | Per prent |
|---|---|
| MiniMax direk, `image-01` | **$0,0035** |
| OpenArt Wonder, GPT Image 2.5 | $0,0083 |
| OpenArt Wonder, Nano Banana 2 | $0,0330 |

Direk is hier byna **twee en 'n half keer goedkoper**. 'n Besluit wat net op
die video-syfers gemaak is, sou prente teen drie keer die prys gekoop het.
Ons voorblad kos 2 krediete (R0,46) en 'n prent kos R0,056 om te maak, so
daardie een dra homself ruim.

## En stem is twee besluite, nie een nie

| | MiniMax | ElevenLabs (wat ons nou betaal) |
|---|---|---|
| Teks hardop lees | **$0,060** / 1 000 karakters (turbo) | $0,100 / 1 000 |
| Transkripsie | $0,38 / uur | **$0,22 / uur** |
| Stem kloon | $1,50 eenmalig per stem | (sien `ELEVENLABS-PRYSE.md`) |
| Oorklanking | nie gelys nie | $2,20 / minuut |

MiniMax lees **40% goedkoper** voor en transkribeer **73% duurder**. Om alles
na een verskaffer te skuif omdat die opskrif goedkoper gelyk het, is hoe 'n
rekening opgaan terwyl die sigblad sê dit het afgegaan.

## Die vangplek in elke plan

**Ongebruikte krediete verval maandeliks en rol nie oor nie.** Jou balans gaan
na nul wanneer die pakket verstryk. Wonder is $175 'n maand (jaarliks
gefaktureer; $240 maandeliks) vir 106 000 krediete — dit is 1 060
Turbo-clips 'n maand. Teen 'n handjievol lede is dit kapasiteit wat verval
voor iemand dit gebruik, en dan is die "goedkoop" prys per clip die duurste
in die tabel.

Die Pro-plan op $44 gee 24 000 krediete = 240 Turbo-clips 'n maand, teen
+R0,52 marge elk. Dit is die een wat by 'n sagte bekendstelling pas.

OpenArt se **Enterprise** het "evergreen credits that never expire", wat
presies hierdie probleem oplos — en het geen gepubliseerde prys nie. Dit is 'n
gesprek met hulle, nie 'n syfer wat ek kan insit nie.

## Wat dit vir die twee geblokkeerde funksies beteken

`docs/EDITING-TOOLS.md` hou vier betaalde gereedskapstukke wat op 'n prys
gewag het. Twee van hulle is nou pryseerbaar:

- **Prent-na-video / motion op 'n stilfoto.** Dit is beeld-na-video, en
  MiniMax se invoerprys vir 'n prent is **gratis** vir die eerste twee
  (H3-Max) of vyf (H3). Dus is dit presies die video-prys hierbo: deur die
  Turbo-model is vyf sekondes R2,64 teen R3,45 in. **Dit pas binne die
  bestaande 15 krediete per vyf sekondes.** Dit is die antwoord waarop ek
  gewag het.
- **AI-opgradeerder** (super-resolution). MiniMax se regenerasie 768P→2K is
  $0,05/sekonde vir video. Vir stilfoto's is dit nie gelys nie, so daardie een
  wag nog.

**Magic grab wag nog.** Dit is generatiewe inpainting met 'n masker, en
MiniMax lys dit nie. `image-01` is teks-na-prent, wat 'n ander ding is. Daar
is dus nog geen prys nie, en ek sit nie een in nie.

## Wat ek sou doen

1. **Vra OpenArt die een vraag** hierbo — mag 'n app met betalende lede deur
   julle koop, en teen watter prys — voordat enigiets van hulle tabel 'n plan
   word. Dit is 'n e-pos, en ek kan dit nie stuur nie.
2. **Moenie MiniMax direk vir video koop nie.** Elke resolusie verloor teen
   ons huidige prys.
3. **Prente direk by MiniMax**, want daar is direk die goedkoop kant.
4. **Los transkripsie waar dit is.** ElevenLabs is daar goedkoper.
5. **Kyk na ons video-prys self.** Die een sent marge op Kling is die regte
   probleem in hierdie tabel, en dit het niks met MiniMax te doen nie.

Niks hiervan is gebou nie. Dit is die rekenkunde, en punt 5 is 'n besluit oor
jou pryse wat joune is om te neem.


---

## Wat OpenArt se produkkieslys nog wys

Jy het hulle produkskerm gestuur. Twee dinge daarop raak die lys in
`docs/EDITING-TOOLS.md` direk:

- **Image Upscale** — *"Enhance resolution and detail with AI"*. Dit is die
  derde van die vier betaalde gereedskapstukke wat op 'n prys gewag het. Hulle
  lys geen kredietkoste daarvoor in wat jy gestuur het nie, so ek het geen
  syfer nie.
- **Motion Control** — *"Apply precise motion from reference videos"*, en die
  Video Generator maak video *"from text or images"*. Dit is prent-na-video,
  en dit is pryseerbaar deur die modeltabel hierbo.

Hulle dra ook **Kling 3.0**, wat die enjin is wat ons nou al gebruik, en Sora
2, Seedance 2.5, WAN 2.7, LTX-2.3, Pixverse en Gemini Omni Flash. Een rekening
teen sewe verskaffers is 'n regte voordeel — en dit is presies die voordeel wat
die sitplek-vraag hierbo eers moet beantwoord.

**Magic grab is steeds nie op hulle lys nie.** Daar is 'n Image Editing Suite
genoem op die Wonder-plan, maar niks wat sê dit doen generatiewe inpainting met
'n masker nie. Geen prys, geen belofte.


---

# Mureka, en die grootste syfer in die hele app

*Carli het hulle hele pryslys op **8 Oktober 2026** gestuur, ingeteken op
hulle werf. Weer eens: ek kon die bladsy nie self oopmaak nie. Die pryse is
hare; die rekenkunde is myne, en `check:minimax` hou dit teen `credits.ts`.*

'n Liedjie is die **grootste enkele koste in hierdie app** en die een waarom
die hele kredietskaal gebou is. Hierdie een vergelyking is meer werd as die
ander twee saam.

## Wat 'n liedjie nou doen

| | Dollar | Rand |
|---|---|---|
| Wat 'n liedjie inbring (10 krediete @ R0,23) | | **R2,30** |
| Wat een ons nou kos (ElevenLabs, $0,15/minuut × 2) | $0,300 | **R4,80** |

> **Elke liedjie op die dunste plan verloor R2,50.**

Dit is nie nuus wat met Mureka kom nie — dit is waar sedert 8 September, toe
jy ElevenLabs se bladsy gestuur het. Dit is net die eerste keer dat daar 'n
alternatief langsaan staan.

## Wat Mureka vra

| Model | Dollar | Rand | Marge |
|---|---|---|---|
| V7.6, lirieke → liedjie | $0,030 | R0,48 | **+R1,82** |
| **V8 / V9, lirieke → liedjie** | **$0,045** | **R0,72** | **+R1,58** |
| 9.5, lirieke → liedjie | $0,150 | R2,40 | −R0,10 |
| V8 / V9, prompt → liedjie | $0,300 | R4,80 | −R2,50 |
| 9.5, prompt → liedjie | $0,500 | R8,00 | −R5,70 |

**Die werkmodel kos 'n sewende van wat ons nou betaal.** Dit draai 'n verlies
van R2,50 per liedjie in 'n marge van R1,58 — en hulle liedjies loop tot
5m30s, teenoor die twee minute waarop ons som gebou is.

**Maar let op die laaste twee rye.** Die goedkoop prys is **lirieke →
liedjie**. Prompt-na-liedjie, waar die model self die woorde skryf, kos
dieselfde of meer as wat ons nou betaal. Dit maak nie saak nie, en dis die
mooi deel: hierdie app skryf die lirieke klaar eerste, en Mureka se eie
lirieke kos $0,009. Lirieke plus liedjie is $0,054 — steeds 'n vyfde van wat
ons nou betaal.

## Die res van hulle lys, teen wat ons nou doen

| Wat | Mureka | Wat ons nou betaal |
|---|---|---|
| Stem kloon | $5 per stem, eenmalig | ElevenLabs, sien `ELEVENLABS-PRYSE.md` |
| Stem-skeiding (2 stems) | $0,20 | $0,12 / minuut |
| Stem-skeiding (5 stems) | **$0,06** | — |
| Stem-skeiding (12 stems) | $0,70 | — |
| Teks hardop lees | $4,90 / uur | $0,10 / 1 000 karakters |
| Transkripsie (bladmusiek) | $0,20 / liedjie | nie dieselfde ding nie |
| Liedjie verleng | $0,036 (V7.6) / $0,10 (V8) | nie beskikbaar nie |
| Remix | $0,20 | nie beskikbaar nie |
| Streek-redigering (10–30 s) | $0,10 | **nie beskikbaar nie** |
| Prent of video → musiek | $0,10 | nie beskikbaar nie |
| Lirieke-video | $0,10 | nie beskikbaar nie |

Drie van daardie reëls is dinge wat die app glad nie kan doen nie en wat
mense vra: **'n liedjie verleng**, **'n stuk van 'n liedjie oorskryf sonder
om die hele ding oor te maak**, en **musiek uit 'n foto of 'n video**.

## Hulle planne, en wat die vangplek dié keer is

| | Prys | Gelyktydige versoeke |
|---|---|---|
| Proef | $10 eenmalig | 1 |
| Basic | $1 000 | 5 |
| Standard | $3 000 | 15 |
| Business | $5 000 | 25 |
| Enterprise | $30 000 | 150 |

Alles 12 maande geldig, volle model- en API-toegang op elke vlak.

**Dit is nie 'n intekening nie — dit is 'n hergelaaide saldo.** Daar is geen
sitplek-probleem soos by OpenArt nie: dit is 'n API met sleutels, soos Kling
en ElevenLabs. Dit is die eerlike kant.

Die vangplek is **gelyktydigheid, en dit tel per aankoop en nie opgetel nie**
— hulle eie nota sê dit: vyf keer $1 000 gee jou 5 gelyktydige versoeke, nie
25 nie. By 2 000 lede wat Vrydagaand almal tegelyk 'n liedjie maak, is 5 'n
tou. Dit is die een syfer om oor te onderhandel, en dit is nie die prys nie.

## Wat ek sou doen

1. **Vra Mureka.** Die e-pos staan in `docs/EPOS-MUREKA.md`. Die drie vrae
   wat saak maak is tantieme, hulle plafon, en of gelyktydigheid losgemaak
   kan word van die saldo.
2. **Moet nie die 9.5-model vir alles gebruik nie.** Dit kos vyf keer die
   werkmodel en bring ons by breek-gelyk terug.
3. **Hou lirieke waar hulle is.** Ons skryf hulle klaar, en dit is presies
   wat die goedkoop prys moontlik maak.
4. **Punt 5 uit die MiniMax-afdeling bly staan:** ons video-prys het een sent
   marge. Dit is 'n aparte probleem en dit gaan nie weg nie.


---

# Google se Lyria — en die een ding wat niemand genoem het nie

*Carli, 8 Oktober 2026: "Ek is baie beïndruk met google se lyria. Die
Afrikaans is baie mooi."*

## Jou sin is die waardevolste reël in hierdie hele lêer

Elke ander syfer hierin is rekenkunde op 'n gepubliseerde prys. **Gehalte in
Afrikaans is 'n ding wat 'n mens met 'n oor moet beoordeel** — in 'n taal
waarop die meeste van hierdie modelle skaars geoefen is — en niemand anders
op hierdie projek kan dit beoordeel nie. Ek kan nie luister nie en die netwerk
blokkeer hulle in elk geval.

Dit is ook presies die vraag wat in die Mureka-brief staan. Jy het dit nou vir
een verskaffer beantwoord.

## Die prys, en hoekom dit anders gemerk is

Die skermskoot is 'n KI-antwoord wat OpenRouter, RightsDocket en Pixazo
aanhaal — **nie Google nie**. Dus is `$0,08 per snit` derdehands, en dit staan
hier so gemerk eerder as in 'n tabel waar dit soos die ander lyk.

Wat vertroue gee, is 'n onafhanklike pad daarnatoe: **OpenArt verkoop Lyria 3
Pro teen 50 krediete**, wat op die Wonder-plan **$0,0825** is. Twee roetes wat
binne 'n halwe sent van mekaar land, is meer werd as enige een alleen — en dit
is steeds nie Google se eie bladsy nie.

| | Dollar | Rand | Marge teen R2,30 in |
|---|---|---|---|
| Wat ons nou betaal (ElevenLabs) | $0,300 | R4,80 | **−R2,50** |
| Lyria 3 Clip (30 s) | $0,040 | R0,64 | +R1,66 |
| **Lyria 3 Pro (tot 184 s)** | **$0,080** | **R1,28** | **+R1,02** |
| Lyria-002 (30 s, erfenis) | $0,060 | R0,96 | +R1,34 |
| Lyria 3 Pro deur OpenArt Wonder | $0,0825 | R1,32 | +R0,98 |
| Mureka V8/V9, lirieke → liedjie | $0,045 | R0,72 | +R1,58 |

**Lyria sit tussenin.** Dit kos 'n kwart van wat ons nou betaal en byna twee
keer wat Mureka vra. Daardie verskil — sowat 56 sent 'n liedjie — is die
verskil wat jou oor moet regverdig. As Lyria se Afrikaans wesenlik beter is as
Mureka s'n, is 56 sent niks. Dit is 'n vergelyking wat net jy kan maak, en die
eerlike toets is dieselfde liriek deur albei.

## Die goeie nuus oor hóé mens dit koop

Vertex AI en die Gemini API is **gewone betaal-soos-jy-gaan API's met
sleutels** — presies die vorm waarin ons Kling en ElevenLabs al gebruik. Geen
sitplek-probleem soos by OpenArt nie, en geen saldo wat verval soos daar nie.
Van die drie verskaffers in hierdie lêer is dit die een wat die minste nuwe
vrae oopmaak oor hóé 'n mens betaal.

En `app/lib/engines.ts` se `Engines`-koppelvlak is al 'n deur met twee gate in
— `generateAudio` en `generateVideo`. 'n Tweede klank-enjin is 'n
implementering van een funksie, nie 'n herbou nie.

## Die ding wat niemand genoem het nie: SynthID

Albei helftes van jou skermskoot sê dit tussen hakies: **elke snit uit die
amptelike Lyria-API dra 'n onhoorbare SynthID-watermerk** vir herkoms en
verifikasie.

**Niks in hierdie app ken daardie woord nie.** Ek het gekyk.

Dit is nie 'n rede om Lyria nie te gebruik nie. Dit pas eintlik goed by die
reël in `docs/BEMARKING.md` oor openlik gemerkte KI. Maar:

- 'n Lid wat haar liedjie kommersieel vrystel, dra 'n Google-herkomsmerk in
  daardie opname. Sy moet dit **van ons** hoor en nie van iemand anders nie.
- `app/lib/filmrights.ts` bestaan presies omdat hierdie repo nie 'n aanspraak
  oor iemand se regte ongesê laat nie. Dieselfde reël geld hier.
- Dit is 'n vraag vir die prokureur saam met die ander: wat beteken 'n
  verskaffer se watermerk vir 'n lid se eienaarskap en vir verspreiders wat
  daarvoor skandeer?

Dit is een sin op die skerm en een reël in die terme. Dit is nie werk nie —
dit is net iets wat nie vergeet moet word nie, en daarom staan dit hier.

## Lyria se tantieme-antwoord, en die groter ding wat daaruit kom

Jy het hulle terme-opsomming gestuur. Die antwoord op die vraag wat in die
Mureka-brief eerste staan, is vir Google:

- **Geen tantieme nie.** Geen agterkant-fooie, geen deurlopende lisensiekoste.
  Jy betaal net vir die genereringsversoeke.
- **Google eis geen eienaarskap** oor wat jou prompts maak nie.
- **Kommersiële gebruik is toegelaat** op die betaalde API-vlakke: speletjies,
  YouTube, potgooie, advertensies, apps, video.
- Hulle filters blokkeer prompts wat 'n handelsmerk-kunstenaar se stem of
  woordelikse kopieregtelike lirieke vra.
- **SynthID help eintlik:** dit laat platforms soos YouTube herkoms verifieer
  en **verkeerde kopiereg-aanspraakstakings voorkom**. Ek het dit in die
  vorige afdeling as 'n risiko aangeteken; dit is net so veel 'n beskerming.

### En die een reël wat die hele app raak

Daardie opsomming sê ook iets wat **niks met Google te doen het nie**:

> *Suiwer KI-gegenereerde musiek hou nie tradisionele eksklusiewe kopiereg in
> die meeste jurisdiksies nie. Jy hou kommersiële gebruiksregte, maar jy kan
> nie ander keer om soortgelyke materiaal te gebruik nie — tensy menslike
> kreatiewe wysiging of verwerking bygevoeg is.*

Dit geld vir **elke gegenereerde liedjie in hierdie app**, vandag, met
ElevenLabs. Nie net vir Lyria nie.

Die terme-bladsy het die een rigting gehad — *"Generated music is not
guaranteed to be unique"*, wat oor die risiko gaan dat jy op iemand anders
trap. Die ander rigting het nog nooit daar gestaan nie: **of jy iemand anders
kan keer.** Dit is nou bygevoeg.

En die app het al 'n antwoord daarop, wat ek nie besef het nie: **die Pro
Booth.** Om self daarop te sing is presies die menslike bydrae waarvan
daardie reël praat. Dieselfde geld vir self speel, die verwerking oorskryf, of
dit in jou eie film sny. Die kamer waarin iemand self sing, is die ding wat 'n
gegenereerde snit in iets verander waarop sy dalk regte het.

**Ek stel dit as onseker en nie as die reg nie.** Die bron is weer 'n
KI-opsomming, die posisie verskil per land, en Suid-Afrika se antwoord is 'n
vraag vir die prokureur. Dit staan op daardie lys.

## Wat ek sou doen

1. **Doen die toets wat net jy kan doen:** dieselfde liriek, deur Lyria en
   deur Mureka, en luister. Dit is die een vergelyking wat nie in hierdie lêer
   staan nie en wat die besluit maak.
2. **Moenie die prys as vas aanvaar nie.** $0,08 is derdehands. Google Cloud
   se eie prysbladsy is een kyk vir jou en onbereikbaar vir my.
3. **Vra na SynthID** saam met die ander regsvrae, nie apart nie.
4. Niks hiervan is gebou nie, en ek sou dit nie bou voordat punt 1 geantwoord
   is nie. Twee klank-enjins half ingedra is erger as een wat werk.
