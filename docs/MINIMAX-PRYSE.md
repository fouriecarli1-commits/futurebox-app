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
