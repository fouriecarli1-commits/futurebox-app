# Google tot die maksimum — kamer vir kamer

*Carli, 9 Oktober 2026:*

> "Dink regtig mooi hoe ons google se produkte tot die maksimum kan benut tot die fynste
> bruikbare funksies binne die verskillende plekke in creative studio. Daardie elemente wat die
> app anders en uniek sal maak."

Hierdie dokument is die antwoord, en dit begin met die ongemaklike deel.

---

## Die ding om eers te sê: Google is nie die onderskeid nie

Elke mededinger kan môre by Lyria, Veo en Nano Banana kom. Dieselfde sleutel, dieselfde pryse,
dieselfde modelle. 'n App wat "ons gebruik Google se KI" sê, sê niks wat nie oor ses maande deur
twintig ander apps gesê word nie.

**Wat niemand anders het nie, is Afrikaans.** Google se modelle is Engels-eerste, net soos
ElevenLabs se modelle. Wat hierdie app anders maak, is alles wat ons *bo-op* hulle gebou het om
hulle na Afrikaans toe te buig:

- `singit.ts` — lirieke herspel sodat 'n Engelse model hulle reg sing.
- `sayit.ts` — haar eie `tjie → kie`, gehoor en bevestig.
- `check:afrikaansrule` — al tien Afrikaanse prompts waarsku die model **weg van Nederlands af**.
- `app/data/genres.ts` — boeremusiek, konsertina, plaaslike style wat in geen katalogus staan nie.
- En volgende: die uitspraak-opnames (`docs/SANGER-UITSPRAAK.md`).

**Dus is die strategie nie "gebruik meer Google" nie. Dit is: voer Google plaaslike kennis wat
niemand anders het, en komBINEER sy modelle eerder as om elkeen 'n knoppie te gee.** Een knoppie
per model is wat elke ander app gaan doen. Die kombinasies is waar die werk lê en waar die
onderskeid lê.

---

## 1. Die grootste een, en dit is gratis: Lyria sê vir ons wat dit gesing het

**Bevestig**, van haar eie Model Garden-kaart af: Lyria 3 Pro antwoord met `outputs[]` wat rye van
drie soorte dra — `audio`, en **`text` rye getiket LYRICS en DESCRIPTION**.

`app/lib/server/lyria.ts` het al 'n `wordsIn()` wat daardie rye uitlees. **Niks in die app roep dit
nie.** Ons betaal vir die liedjie, Google stuur die woorde saam, en ons gooi hulle weg.

Wat dit ontsluit, en dit kos **niks ekstra** want dit is in dieselfde oproep:

| Kamer | Wat dit word |
|---|---|
| **make** | Die kamer kan die woorde **wys** wat werklik gesing is. Vandag weet die app nie wat 'n gegenereerde liedjie sê nie — 'n lid kan nie 'n reël regmaak nie, dit nie uitdruk nie, dit nie saam met die vrystelling publiseer nie. |
| **videoedit** | **'n Outomatiese liriek-video.** Die woorde kom van Lyria, die tydstempels kom van `/api/align`, en die snykamer sit al woorde op 'n prent. Druk een knoppie en die woorde land op die maat. Niemand tik 'n enkele reël nie. |
| **channels / podcast** | Die DESCRIPTION-ry is 'n klaar-geskrewe vrystellingsnota en 'n stel etikette vir die kanaal en die voer. |

Dit is die eerste ding om te bou. Dit is bevestig, dit is gratis, dit raak drie kamers, en 'n
liriek-video wat uit niks ontstaan is die soort ding wat iemand vir 'n vriend wys.

---

## 2. Nano Banana as Veo se **beginraampie** — die goedkoop, beheerbare video-pad

`app/lib/server/video/types.ts` sê dit self al, oor `StartRequest.image`:

> *"Teks alleen is die duur manier om 'n spesifieke voorkoms te kry: jy beskryf die ding, die
> enjin teken iets naasliggend, jy beskryf dit weer, en elke poging word gehef. 'n Beginraampie
> vestig die onderwerp, die palet en die raam in een slag, sodat die prompt net hoef te sê wat
> **beweeg**."*

En `startFrame: true` staan op albei Veo-sporte. Die stukke is dus klaar daar; wat kort, is die
ketting:

**Nano Banana maak die raampie (R0,96) → die lid verander dit met woorde tot dit reg is (R0,96 elk)
→ Veo Lite laat dit beweeg (R4,00).**

Teenoor teks-na-video, waar elke poging R4 tot R22 kos en die voorkoms 'n lotery is. 'n Lid kan vyf
keer aan die raampie torring vir die prys van een clip, en dan **een keer** vir die beweging
betaal.

Dit is die gevolg van die prent-redigeerder wat vanaand gebou is, en dit is die enkele sterkste
kombinasie in hierdie dokument: twee bevestigde modelle wat mekaar goedkoper en beter maak.

| Kamer | Wat dit word |
|---|---|
| **canvas** (die video-lessenaar, toneel vir toneel) | Elke toneel begin by 'n prent wat sy gekies het. En omdat Nano Banana *gespreksmatig* redigeer, kan toneel 2 tot 6 **uit toneel 1 se prent** kom — dieselfde persoon, dieselfde lig, dieselfde palet. Dít is hoekom 'n veldtog "ontwerp" lyk eerder as "gegenereer". |
| **campaign** (die advertensie-lessenaar) | Dieselfde, maar met die lyn in die prent — sien punt 3. |

---

## 3. Nano Banana **Pro** vir Afrikaanse woorde binne 'n prent

Beeldmodelle is bekend sleg met teks, en erger met teks wat nie Engels is nie. Pro ($0,15, die
"thinking"-model) is die een wat dit wél kan.

Wat dit beteken: **'n Afrikaanse plakkaat waar die woorde reg gespel is.** Op 'n winkelvenster,
langs 'n muur, op 'n T-hemp, op 'n padteken. 'n Generiese gereedskapstuk kry "UITVERKOPING" verkeerd;
dit is presies die soort fout wat 'n plakkaat onbruikbaar maak.

Die eerlike grens: vir 'n **opskrif bo-op** is die foto-kamer se eie font skerper as enige model, en
dit is gratis en kan daarna geskuif word. Pro se waarde is woorde **binne die toneel**, nie 'n
onderskrif nie. Die twee is verskillende werk en die app behoort albei te hê — wat sy self gesê het.

Kamers: **campaign** eerste (die lyn in die prent), dan **photo**.

---

## 4. Lyria 3 **Clip** — die fyn een, en dit raak 'n kamer wat nou niks het nie

Clip maak 'n *stuk* eerder as 'n liedjie, en dit is goedkoper. Twee gebruike:

| Kamer | Wat dit word |
|---|---|
| **studio** (een wat 'n bestaande liedjie wysig) | **Hergenereer één seksie.** Vandag is die keuse: leef met die refrein of maak die hele liedjie oor teen volle prys. "Doen die refrein weer" teen clip-prys is die fynste nuttige funksie in hierdie hele dokument, en dit is die een wat 'n lid die meeste gaan druk. *(Moet nagegaan word: of Clip op die res van die liedjie gekondisioneer kan word, of dit net 'n los stuk maak. Haar Model Garden-kaart sê dit nie.)* |
| **canvas / campaign** | 'n Bed onder 'n 15- of 30-sekonde clip. `lyria-002` doen dit nou teen 30 sekondes instrumentaal; Clip is dalk die beter een en staan al in `MODELS`. |

---

## 5. Waar die antwoord **nee** is, en dit is 'n ontwerpsbesluit

**albumart — die kunsmark.** Dit is 'n muur van werke deur regte kunstenaars, elkeen een keer
verkoop, teen R200 en op. Nano Banana sou dit môre kon namaak teen R0,96.

Dit is juis die rede om dit nie te doen nie. Daardie kamer se hele punt is dat 'n mens betaal word,
en die foto-kamer sê dit al uitdruklik: *"Dit kan nie album-kuns maak nie: 'n omslag word op die
plek gegenereer of by 'n kunstenaar gekoop."* 'n App wat "KI vir alles" sê, is 'n app sonder 'n
kunsmark. Die mark is die onderskeid; die KI is die kommoditeit.

**collab en live** — mense, nie modelle nie. Hier is niks vir Google om te doen nie en dit is reg
so.

---

## 6. Die orde om dit te bou

1. **Lyria se LYRICS en DESCRIPTION gebruik** (punt 1). Gratis, bevestig, raak drie kamers.
2. **Die outomatiese liriek-video** (punt 1 se tweede ry). Bou bo-op (1), gebruik `/api/align` wat
   al werk, en dit is die ding wat 'n lid vir iemand anders gaan wys.
3. **Nano Banana → Veo-ketting** (punt 2) in die video-lessenaar.
4. **Pro vir die advertensie-plakkaat** (punt 3).
5. **Clip om een seksie oor te doen** (punt 4) — eers nadat die vraag oor kondisionering beantwoord
   is.

En deurgaans, die ding wat dit alles anders maak: **die uitspraak-werk.** Elke een van hierdie
funksies praat Afrikaans beter as sy mededinger s'n, of nie een van hulle is die moeite werd nie.
