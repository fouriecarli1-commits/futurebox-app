# Koste en wins — net ElevenLabs

> Gereken deur `scripts/costs-eleven.mts` uit `app/lib/plans.ts` en
> `app/lib/credits.ts`. Moenie hierdie lêer met die hand regmaak nie —
> verander die prys in daardie lêers en loop die skrip weer, anders sê die
> pryskaart en hierdie som twee verskillende dinge.

Geskryf 2026-09-08. Kling is uit die som uit.

## Waarop dit rus

| Ding | Waarde | Waarvandaan |
|---|---|---|
| Rand per dollar | R16 | aanname, dieselfde as `plans.ts` |
| ElevenLabs-krediete per minuut musiek | 900 | `plans.ts` |
| 'n Vol liedjie | 2 min = 1800 ElevenLabs-krediete | `plans.ts` |
| Wat ons daarvoor vra | 10 FutureBox-krediete | `credits.ts` |
| Gratis lede per betalende een | 19 | 5% omskakeling |
| Mengsel van betalende lede | 60% Maker, 30% Studio, 10% Label | `plans.ts` |

**Nagegaan op 8 September 2026** teen ElevenLabs se eie prysbladsy.
Musiek kos $0.15 per minuut op elke plan, en die minute wat
elke plan insluit is presies die plan se prys gedeel deur daardie koers —
'n plan is 'n dollar-begroting. Sien `docs/ELEVENLABS-PRYSE.md`.

| Plan | Per maand | Krediete | Rand per krediet | Wat een liedjie ons kos |
|---|---|---|---|---|
| Creator | $22 = R352,00 | 132 300 | R0,00266 | R4,79 |
| Pro | $99 = R1 584,00 | 594 000 | R0,00267 | R4,80 |
| Scale | $330 = R5 280,00 | 1 793 700 | R0,00294 | R5,30 |
| Business | $990 = R15 840,00 | 5 940 000 | R0,00267 | R4,80 |

## Voorsigtig

Elke lid brand elke krediet op, elke gratis gebruiker ook, en die werkswinkels loop. Dit gebeur nie — maar as die som hier werk, werk hy altyd.

Vaste koste sonder ElevenLabs: R6 924,00 (werkswinkels ingesluit).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede wat die plan se krediete hou | Werk dit? |
|---|---|---|---|---|
| Creator | R43,51 | 168 | 1 | nee |
| Pro | R43,02 | 198 | 7 | nee |
| Scale | R20,74 | 589 | 22 | nee |
| Business | R43,02 | 530 | 73 | nee |

*"Werk dit" beteken: die getal lede wat jy nodig het om gelyk te breek,
pas binne die getal lede wat die plan se krediete kan bedien. As gelykbreek
meer lede vra as wat die plan kan voed, kan daardie plan nooit wins maak nie —
hoeveel mense ook al inteken.*

## Realisties

Betalende lede gebruik 60% van hul toelae, die helfte van die gratis gebruikers maak ooit iets. Dít is die syfer om planne op te maak.

Vaste koste sonder ElevenLabs: R6 924,00 (werkswinkels ingesluit).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede wat die plan se krediete hou | Werk dit? |
|---|---|---|---|---|
| Creator | R138,24 | 53 | 2 | nee |
| Pro | R137,97 | 62 | 13 | nee |
| Scale | R125,55 | 98 | 39 | nee |
| Business | R137,97 | 165 | 132 | nee |

*"Werk dit" beteken: die getal lede wat jy nodig het om gelyk te breek,
pas binne die getal lede wat die plan se krediete kan bedien. As gelykbreek
meer lede vra as wat die plan kan voed, kan daardie plan nooit wins maak nie —
hoeveel mense ook al inteken.*

## Voorsigtig, gratis laag sonder musiek

Die slegste geval weer, maar met die gratis laag se musiek af en die werkswinkels af. Dit wys of die slegste geval hoegenaamd veilig gemaak kan word.

Vaste koste sonder ElevenLabs: R2 924,00 (sonder werkswinkels).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede wat die plan se krediete hou | Werk dit? |
|---|---|---|---|---|
| Creator | R134,50 | 25 | 2 | nee |
| Pro | R134,22 | 34 | 12 | nee |
| Scale | R121,41 | 68 | 38 | nee |
| Business | R134,22 | 140 | 128 | nee |

*"Werk dit" beteken: die getal lede wat jy nodig het om gelyk te breek,
pas binne die getal lede wat die plan se krediete kan bedien. As gelykbreek
meer lede vra as wat die plan kan voed, kan daardie plan nooit wins maak nie —
hoeveel mense ook al inteken.*

## Realisties, gratis laag sonder musiek

Dieselfde as bo, maar die gratis laag kry blaaierskesse in plaas van musiekkrediete, en die werkswinkels is af. Die twee hefbome wat die meeste beweeg.

Vaste koste sonder ElevenLabs: R2 924,00 (sonder werkswinkels).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede wat die plan se krediete hou | Werk dit? |
|---|---|---|---|---|
| Creator | R183,74 | 18 | 4 | nee |
| Pro | R183,57 | 25 | 21 | nee |
| Scale | R175,88 | 47 | 64 | **ja** |
| Business | R183,57 | 103 | 214 | **ja** |

*"Werk dit" beteken: die getal lede wat jy nodig het om gelyk te breek,
pas binne die getal lede wat die plan se krediete kan bedien. As gelykbreek
meer lede vra as wat die plan kan voed, kan daardie plan nooit wins maak nie —
hoeveel mense ook al inteken.*

## Wat dit sou regmaak

Vir elke ElevenLabs-plan: die grootste gratis toelae waarby selfs die
slegste geval — almal brand alles op — nog steeds wins maak. Die
werkswinkels is hier af, want dit is die goedkoopste ding om eerste te
sny.

| Plan | Gratis toelae vandag | Grootste wat nog werk | Wat dit beteken |
|---|---|---|---|
| Creator | 10 | — | Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein. |
| Pro | 10 | — | Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein. |
| Scale | 10 | — | Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein. |
| Business | 10 | — | Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein. |

## Video — waarom dit hier ontbreek

Video is nie in die somme hierbo nie, en dit is nie 'n leemte nie.

Die kode dra twee getalle vir dieselfde greep. `server/video/eleven.ts` sê
Seedance kos 20 ElevenLabs-eenhede per vyf sekondes, en dieselfde lêer sê
'n greep kos ongeveer R2,62. By die koers wat die musiekkant gebruik —
R0,00267 per krediet op Business — is 20 krediete
R0,05, nie R2,62 nie. Die twee is 49 keer uit mekaar.

Een van drie dinge is waar: video word teen 'n ander koers as musiek
gereken, of die R2,62 kom van 'n ander plan af, of een van die twee is
eenvoudig verkeerd. Van hier af kan dit nie uitgemaak word nie — die enigste
ding wat dit oplos is 'n regte faktuur.

**Wat dit beteken vir jou:** die musiek-somme hierbo staan onafhanklik, want
musiek se koers is nagegaan. Moenie video by hulle optel voordat een faktuur
gesien is nie. En sit dit as vraag vyf by die e-pos aan ElevenLabs.

Wat wel seker is: sonder Kling loop albei die video-enjins op die
ElevenLabs-sleutel wat jy reeds het, so video maak nie 'n nuwe rekening of
'n nuwe vaste koste nie — wat dit ook al per greep is.

## Wat elke laag op sy eie los, by volle gebruik

### Op ElevenLabs Creator

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R57,47 | **R84,32** |
| Studio | R349,00 | −R14,22 | −R167,62 | **R167,17** |
| Label | R749,00 | −R28,22 | −R383,13 | **R337,66** |

### Op ElevenLabs Pro

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R57,60 | **R84,19** |
| Studio | R349,00 | −R14,22 | −R168,00 | **R166,79** |
| Label | R749,00 | −R28,22 | −R384,00 | **R336,78** |

### Op ElevenLabs Scale

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R63,58 | **R78,20** |
| Studio | R349,00 | −R14,22 | −R185,45 | **R149,34** |
| Label | R749,00 | −R28,22 | −R423,88 | **R296,90** |

### Op ElevenLabs Business

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R57,60 | **R84,19** |
| Studio | R349,00 | −R14,22 | −R168,00 | **R166,79** |
| Label | R749,00 | −R28,22 | −R384,00 | **R336,78** |

## Die antwoord

**1. Op ElevenLabs se gewone lys is Business die enigste plan wat ooit
wins kan maak.** Nie omdat die kleiner planne te duur is nie — hulle is
goedkoper per maand — maar omdat hulle te min krediete het. Elke plan het
'n dak, en die getal lede wat jy nodig het om gelyk te breek is by Creator,
Pro en Scale hoër as die getal lede wat die plan se krediete kan voed. Meer
mense laat inteken maak dit erger, nie beter nie.

**2. Op Business werk dit — solank die werkswinkels nie loop nie.** Met alles op sy ergste: gelykbreek by **437 lede**, en die plan hou **73**. Sit die R4 000,00 werkswinkels terug en gelykbreek skuif na **530**, wat méér is as wat die plan kan voed. Die werkswinkels is dus nie 'n uitgawe nie, dit is 'n besluit: hulle mag eers terugkom wanneer die lede daar is.

**3. Die gratis laag is die duurste ding in die toep.** Negentien gratis
gebruikers agter elke betalende een, elk met 10 krediete, is meer
ElevenLabs-krediete as wat die betalende lid self gebruik. Dit is die een
hefboom wat die meeste beweeg, en dit kos niks om te trek nie: die gratis
laag se blaaierskesse — regte klank en video, op die foon self gemaak — kos
ons nul, en dit is die deel wat mense oortuig. Die twee half liedjies is die
duur deel.

**4. Moenie op Business begin nie.** Die syfers hierbo is nie 'n opdrag om
vandag R15 840,00 'n maand te betaal nie. Met 'n handjievol toetsers is
Creator reg, en die verlies daarop is klein genoeg om te dra. Wat die syfers
sê, is dat daar geen pad is wat by Creator of Pro of Scale bly en wins maak
nie — so die groei moet die skuif na Business betaal, en dit moet gebeur
vóórdat die krediete opraak, nie daarna nie.

**5. Daarom die e-pos aan ElevenLabs.** Die gat tussen Scale ($330) en
Business ($990) is presies waar hierdie besigheid gaan sit. 'n Pasgemaakte
plan wat daardie gat vul — of 'n laer koers vir musiek spesifiek — is die
enkele grootste ding wat aan hierdie somme kan verander. Sien
`docs/DIENSTE-EN-KOSTE.md` vir wat om te vra.

**6. Wat hier nié in is nie.** Kling is uit, soos gevra. Ook uit: Music.ai
(die kamers wat dit gebruik is af), advertensie-inkomste, borge, en die
bemarkings-byvoegsel. Elkeen van dié maak die prentjie beter, nie slegter
nie — hulle is net nog nie waar nie, en 'n som wat op onverdiende geld
staan is nie 'n som nie.

