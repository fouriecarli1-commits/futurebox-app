# Koste en wins — net ElevenLabs

> Gereken deur `scripts/costs-eleven.mts` uit `app/lib/plans.ts` en
> `app/lib/credits.ts`. Moenie hierdie lêer met die hand regmaak nie —
> verander die prys in daardie lêers en loop die skrip weer, anders sê die
> pryskaart en hierdie som twee verskillende dinge.

Geskryf 2026-09-24. Kling is uit die som uit.

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
| Creator | $22 + BTW = R404,80 | 132 300 | R0,00306 | R5,51 |
| Pro | $99 + BTW = R1 821,60 | 600 000 | R0,00304 | R5,46 |
| Scale | $299 + BTW = R5 501,60 | 1 800 000 | R0,00306 | R5,50 |
| Business | $990 + BTW = R18 216,00 | 6 000 000 | R0,00304 | R5,46 |

## Voorsigtig

Elke lid brand elke krediet op, elke gratis gebruiker ook, en die werkswinkels loop. Dit gebeur nie — maar as die som hier werk, werk hy altyd.

Vaste koste sonder ElevenLabs: R7 687,74 (werkswinkels ingesluit).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R272,06 | 30 | 4 | nee |
| Pro | R272,06 | 35 | 21 | nee |
| Scale | R272,06 | 49 | 64 | **ja** |
| Business | R272,06 | 96 | 215 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Realisties

Betalende lede gebruik 60% van hul toelae, die helfte van die gratis gebruikers maak ooit iets. Dít is die syfer om planne op te maak.

Vaste koste sonder ElevenLabs: R7 687,74 (werkswinkels ingesluit).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R272,06 | 30 | 7 | nee |
| Pro | R272,06 | 35 | 35 | **ja** |
| Scale | R272,06 | 49 | 107 | **ja** |
| Business | R272,06 | 96 | 358 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Voorsigtig, sonder werkswinkels

Die slegste geval weer, met die werkswinkels af. Dit wys of die slegste geval hoegenaamd veilig gemaak kan word.

Vaste koste sonder ElevenLabs: R3 687,74 (sonder werkswinkels).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R272,06 | 16 | 4 | nee |
| Pro | R272,06 | 21 | 21 | **ja** |
| Scale | R272,06 | 34 | 64 | **ja** |
| Business | R272,06 | 81 | 215 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Realisties, sonder werkswinkels

Dieselfde as bo, met die werkswinkels af. Dit is die enigste hefboom wat oorbly noudat die gratis laag se musiek weg is.

Vaste koste sonder ElevenLabs: R3 687,74 (sonder werkswinkels).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R272,06 | 16 | 7 | nee |
| Pro | R272,06 | 21 | 35 | **ja** |
| Scale | R272,06 | 34 | 107 | **ja** |
| Business | R272,06 | 81 | 358 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Wat dit sou regmaak

Vir elke ElevenLabs-plan: die grootste gratis toelae waarby selfs die
slegste geval — almal brand alles op — nog steeds wins maak. Die
werkswinkels is hier af, want dit is die goedkoopste ding om eerste te
sny.

| Plan | Gratis toelae vandag | Grootste wat nog werk | Wat dit beteken |
|---|---|---|---|
| Creator | 0 | — | Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein. |
| Pro | 0 | 0 | Niks hoef te verander nie. |
| Scale | 0 | 0 | Niks hoef te verander nie. |
| Business | 0 | 0 | Niks hoef te verander nie. |

## Video — waarom dit hier ontbreek

Video is nie in die somme hierbo nie, en dit is nie 'n leemte nie.

Die kode dra twee getalle vir dieselfde greep. `server/video/eleven.ts` sê
Seedance kos 20 ElevenLabs-eenhede per vyf sekondes, en dieselfde lêer sê
'n greep kos ongeveer R2,62. By die koers wat die musiekkant gebruik —
R0,00304 per krediet op Business — is 20 krediete
R0,06, nie R2,62 nie. Die twee is 43 keer uit mekaar.

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
| Maker | R149,00 | −R7,22 | −R49,57 | **R92,22** |
| Studio | R349,00 | −R14,22 | −R104,64 | **R230,14** |
| Label | R899,00 | −R33,47 | −R242,33 | **R623,21** |

### Op ElevenLabs Pro

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R49,18 | **R92,60** |
| Studio | R349,00 | −R14,22 | −R103,83 | **R230,95** |
| Label | R899,00 | −R33,47 | −R240,45 | **R625,08** |

### Op ElevenLabs Scale

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R49,51 | **R92,27** |
| Studio | R349,00 | −R14,22 | −R104,53 | **R230,25** |
| Label | R899,00 | −R33,47 | −R242,07 | **R623,46** |

### Op ElevenLabs Business

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R49,18 | **R92,60** |
| Studio | R349,00 | −R14,22 | −R103,83 | **R230,95** |
| Label | R899,00 | −R33,47 | −R240,45 | **R625,08** |

## Die antwoord

**1. Daar is geen volume-afslag by ElevenLabs nie, en dit verander alles
wat hierdie lêer voorheen gesê het.**

Hulle ondersteuning, 9 September 2026: bykoop kos $0,000165 per krediet.
Pro se eie koers is $0.000165000. Business s'n is $0.000165000.
Scale s'n is $0.000166111 — 0,7% duurder as albei.

**Dieselfde koers, tot op die tiende desimaal.** Om na Business op te gradeer koop $891 se krediete vir $891, plus nege werkplek-sitplekke.

Hierdie lêer het voorheen gesê Business is die enigste plan wat ooit wins
kan maak, omdat elke kleiner plan 'n dak het wat laer is as gelykbreek.
**Daardie dak bestaan nie.** Bo die plan loop dit teen presies dieselfde
koers aan, so die marge per lid verander nie by die dak nie — net die
kontantvloei doen. Die getal hieronder bly dus die moeite werd om te weet
(dit is waar bykoop begin), maar dit is nie meer 'n muur nie.

**Wat volg: bly op Pro.** Die goedkoopste plan wat haar sitplekke dek, is
altyd reg, want die krediete daarbo kos dieselfde. Business is $891 per
maand vir nege sitplekke wat sy nie het nie.

**2. Gelykbreek hang aan die vaste koste, nie aan die dak nie.** In die slegste geval — elke lid brand elke krediet — is gelykbreek op Business **81 lede**, en die plan se krediete hou **215** voor bykoop begin. Met die werkswinkels terug word dit **96** teen **215**.

Realisties — 60% verbruik — is gelykbreek **81 lede** sonder werkswinkels en **96** met; bykoop begin by **358** lede. Die werkswinkels is nie 'n uitgawe nie, dit is 'n besluit: hulle kos 15 ekstra lede.


### En wat SARS daarvan vat

Carli, 8 September 2026: *"ek dink sars tot en met 30% van my inkomste
neem van hierdie produk, dus wil ek nie 'n verlies ly nie."*

**Die belangrikste ding eerste: maatskappybelasting is op WINS, nie op
omset nie.** Geen wins, geen belasting. Gelykbreek skuif dus glad nie —
dit bly 81 lede sonder werkswinkels en 96 met. Belasting
vat net 'n stuk van wat bo gelykbreek oorbly.

Dit is die hele antwoord op "moet ons die pryse herbesin?". Nie oor SARS
nie.

| By vol kapasiteit | Sonder werkswinkels | Met werkswinkels |
|---|---|---|
| Lede | 358 | 358 |
| Omset | R101 672,00 | R101 672,00 |
| Wins voor belasting | R75 493,74 | R71 493,74 |
| Ná 27% | R55 110,43 | R52 190,43 |
| Ná 30% | R52 845,62 | R50 045,62 |
| Ná 30%, per jaar | R634 147,42 | R600 547,42 |

**Ja, dit maak wins. Maar kyk na wat daardie tabel eintlik sê.**

Dit is nie wins by die huidige skaal nie — dit is die **meeste wat hierdie
plan ooit kan verdien**, hoe goed dit ook al verkoop word. Die dak is nie
die mark nie, dit is ElevenLabs se krediete: by 358 lede is die plan se
krediete op, en lid 215 kan nie bedien word nie.

**Dít is die ding om te herbesin, en dit is nie belasting nie.**

Drie hefbome, in volgorde van hoeveel hulle beweeg:

1. **Prys.** Elke rand op die maandprys gaan reguit deur na bydrae — daar
   is geen ekstra ElevenLabs-koste aan 'n hoër prys nie. Tien persent op
   die prys is ongeveer R10 167,20 per maand by vol kapasiteit,
   en dit skuif gelykbreek af sowel as die dak op.
2. **Die dak self.** Meer lede as die plan kan voed, beteken 'n groter
   plan of minder krediete per lid. Albei is prysbesluite.
3. **Die werkswinkels.** Hulle kos
   15 ekstra lede en R4 000,00 per maand.

### Twee dinge vir haar rekenmeester, en albei kan die 30% laat val

**1. Klein Sake Korporasie (SBC).** 'n (Pty) Ltd wat kwalifiseer betaal
nie 27% op alles nie: die eerste R95 750 belasbare inkomste is teen **0%**,
en die snit tot R365 000 teen **7%**. Die maksimum jaarwins hierbo is
R905 924,88 — heeltemal binne daardie tweede snit.
   Die effektiewe koers sou dan naby **3%** wees, nie 30% nie. Kwalifikasie
   het voorwaardes (alle aandeelhouers natuurlike persone, omset onder
   R20m, nie 'n persoonlike diensverskaffer nie) en dit is 'n vraag vir
   'n rekenmeester, nie vir hierdie lêer nie.

**2. BTW-registrasie.** Die 15% wat sy nou aan ElevenLabs en Zoho betaal is
   'n dooie koste **solank sy nie geregistreer is nie**. Geregistreer kan sy
   dit terugeis — maar dan moet sy 15% op lidmaatskappe hef of dit self dra.
   Verpligte registrasie is by R1 miljoen omset oor 12 maande; by vol
   kapasiteit is die omset R1 220 064,00 per jaar, dus
   **bereik sy dit nooit op hierdie plan nie**. Vrywillige registrasie is
   moontlik bo R50 000 omset, en dan word die BTW terugeisbaar.

   Wat dit werd is: die BTW op ElevenLabs alleen is R2 376,00 per maand,
   oftewel R28 512,00 per jaar. Teen 'n maksimum jaarwins van
   R905 924,88 is dit nie klein nie.

*Geen van hierdie twee is belastingadvies nie. Albei is gedokumenteerde
SARS-reëls wat groot genoeg is om te vra, met die somme reeds gedoen sodat
die gesprek met 'n rekenmeester een vraag is en nie 'n navorsingstaak nie.*

**3. Die gratis laag is die duurste ding in die toep.** Negentien gratis
gebruikers agter elke betalende een, elk met 0 krediete, is meer
ElevenLabs-krediete as wat die betalende lid self gebruik. Dit is die een
hefboom wat die meeste beweeg, en dit kos niks om te trek nie: die gratis
laag se blaaierskesse — regte klank en video, op die foon self gemaak — kos
ons nul, en dit is die deel wat mense oortuig. Die twee half liedjies is die
duur deel.

**4. Moenie op Business begin nie.** Die syfers hierbo is nie 'n opdrag om
vandag R18 216,00 'n maand te betaal nie. Met 'n handjievol toetsers is
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

## Wat ons per krediet maak

Gevra op 16 September 2026. Die antwoord is nie een getal nie, en dit is
die hele punt: die prys per krediet staan vas, maar hoeveel vaste koste
elke krediet moet dra, hang aan die ledetal.

'n Betalende lid koop gemiddeld **155 krediete** vir **R284,00**, dus
**R1,83 per krediet verkoop**. Dit verander nooit.

| Betalende lede | Krediete verkoop | Volle koste per krediet | Wins per krediet | Marge |
|---|---|---|---|---|
| **80** — gelykbreek | 12 400 | R1,77 | R0,07 | 4% |
| 100 | 15 500 | R1,41 | R0,42 | 23% |
| 150 | 23 250 | R0,94 | R0,89 | 49% |
| 200 | 31 000 | R0,71 | R1,13 | 61% |
| 250 | 38 750 | R0,57 | R1,27 | 69% |
| 300 | 46 500 | R0,47 | R1,36 | 74% |
| **358** — die plan se dak | 55 490 | R0,39 | R1,44 | 78% |

*Volle koste is alles: die ElevenLabs-plan van R18 216,00 plus elke ander
vaste reël, R3 687,74 saam — Anthropic, Vercel, Supabase, Resend,
Kits.AI, Zoho, die domeine en Spaceship. Werkswinkels is uit, want dit is
'n besluit eerder as 'n rekening.*

### Wat 'n krediet kos sodra die plan op is

Binne die plan kos 'n ekstra krediet **niks** — die 6 000 000 is
reeds gekoop. Bo die dak kos dit ElevenLabs se bykoopkoers:

| Een FutureBox-krediet | 180 ElevenLabs-krediete |
|---|---|
| Wat dit ons kos | R0,55 |
| Wat ons daarvoor kry | R1,83 |
| Wat oorbly | R1,29 |

*Duurste rigting: alles as musiek gereken. Enige ander mengsel is goedkoper.*

### Die een getal om vir ElevenLabs te wys

**ElevenLabs is 83% van die hele koste-basis** — R18 216,00 van
R21 903,74. Dít is die syfer wat die koersvraag regverdig, en dit is
veilig om te stuur: dit sê hoe belangrik hulle is sonder om te sê wat ons
verdien.

### Twee reëls wat nog nie 'n prys het nie

Albei is deur Carli genoem en nie een kan hier geraai word:

| Wat | Stand | Wat elke R1 000 per maand kos |
|---|---|---|
| Kopieregtoets op oplaaie | nog nie gekies nie — haar besluit | 3,5 ekstra lede om gelyk te breek |
| TONE3000 vir die Pro Booth | geblokkeer, prys onbekend | 3,5 ekstra lede |

Elke R1 000 per maand aan nuwe vaste koste skuif gelykbreek met 3,5 lede.
Dit is lineêr, so die oomblik as daar 'n regte prys is, is die som een deling.

## Wat elke knoppie kos

Gevra op 24 September 2026: *"Werk al die somme uit asb. Dit is uiters
belangrik vir begroting en uitgawes."* Alles hierbo antwoord of die
besigheid kan werk. Hierdie tabel antwoord wat elke aksie kos.

Die laaste kolom is die een wat saak maak. Dit is die enigste manier om
'n dub met 'n bemarkingsplan te vergelyk, want rand per FutureBox-krediet
is waarin ons verkoop. Hoog beteken die toelaag brand geld; laag beteken
die aksie is byna gratis om te bedien.

| Aksie | Verskaffer | Ons hef | Dit kos ons | Rand per krediet |
|---|---|---|---|---|
| Stemme skei, per minuut | ElevenLabs | 4 kr | R2,21 | **R0,5520** |
| 'n Opname skoonmaak, per minuut | ElevenLabs | 4 kr | R2,21 | **R0,5520** |
| 'n Stem verander, per minuut | ElevenLabs | 4 kr | R2,21 | **R0,5520** |
| 'n Vol liedjie (2 min) | ElevenLabs | 10 kr | R5,52 | **R0,5520** |
| 'n Half liedjie (1 min) | ElevenLabs | 5 kr | R2,76 | **R0,5520** |
| Sing dit, per minuut | Kits.AI | 4 kr | R1,60 | **R0,4000** |
| Voorlees, per 150 karakters | ElevenLabs | 1 kr | R0,28 | **R0,2760** |
| Dub, per minuut | ElevenLabs | 162 kr | R40,48 | **R0,2499** |
| Agtergrond uit, per 5 sek | fal.ai | 8 kr | R1,80 | **R0,2250** |
| Agt advertensielyne | Anthropic | 20 kr | R3,29 | **R0,1644** |
| Item uit, per 5 sek *(skatting)* | fal.ai | 11 kr | R1,80 | **R0,1636** |
| 'n Bemarkingsplan | Anthropic | 40 kr | R4,96 | **R0,1240** |
| 'n Omslag *(skatting)* | beeldmodel | 2 kr | R0,15 | **R0,0750** |
| Oorskryf, per minuut | ElevenLabs | 2 kr | R0,07 | **R0,0337** |
| Video, 10 sek, standaard *(skatting)* | ElevenLabs | 30 kr | R0,12 | **R0,0040** |
| 'n Stem kloon *(skatting)* | ElevenLabs | 20 kr | R0,00 | **R0,0000** |
| 'n Klank oplei *(skatting)* | ElevenLabs | 300 kr | R0,00 | **R0,0000** |

*Bronne, reël vir reël:*

- **'n Vol liedjie (2 min)** — $0,15 per minuut, hul eie prysblad
- **'n Half liedjie (1 min)** — dieselfde koers
- **Stemme skei, per minuut** — 8 250 minute op $990
- **'n Opname skoonmaak, per minuut** — dieselfde emmer
- **'n Stem verander, per minuut** — dieselfde emmer
- **Oorskryf, per minuut** — 4 500 uur op $990
- **Voorlees, per 150 karakters** — 9,9 miljoen karakters op $990
- **Dub, per minuut** — 450 minute op $990 — die duurste reël hier
- **Sing dit, per minuut** — R640 plat teen 400 minute
- **Video, 10 sek, standaard** — Seedance, 20 krediete per 5 sek
- **'n Bemarkingsplan** — max_tokens-dak deur aiprices.ts
- **Agt advertensielyne** — max_tokens-dak deur aiprices.ts
- **Agtergrond uit, per 5 sek** — $0,0225 per 30 rame, duurste graad
- **Item uit, per 5 sek** — teen dieselfde koers gestel
- **'n Omslag** — 'n breukdeel van 'n sent
- **'n Stem kloon** — in die plan ingesluit, geen los koers
- **'n Klank oplei** — in die plan ingesluit, geen los koers

### Die aanname wat die kapasiteit dra, nagegaan

Elke som hierbo reken **alles as musiek**, want musiek was die duurste
ding per krediet. Dit is die aanname waarop elke gelykbreek- en
kapasiteitsgetal op hierdie bladsy rus, so dit is nagegaan eerder as
geglo.

Dit hou. 'n Liedjie bly die duurste gemete aksie per krediet, teen
R0,5520, so elke ander mengsel is goedkoper as die somme hierbo.

### Wat die tabel omkeer

Twee dinge lees anders as wat hulle voel.

**Dub lyk soos die duurste ding in die toep** — 162 krediete vir een
minuut, meer as 'n hele plan se maandtoelaag op Maker. Per krediet is dit
**R0,2499**, wat 55%
GOEDKOPER is as 'n liedjie. Die groot getal is nie 'n groot marge nie — dit
is net hoe duur een minuut dubbing werklik is. Wie dub, koop reg; wie dub
teen 15 krediete verkoop het, het R21,88 per minuut uit haar eie sak betaal,
wat presies is wat op 8 September gebeur het.

**Video lees andersom.** 30 krediete vir 'n tien-sekonde-snit
teen 'n geskatte R0,12 — **R0,0040** per krediet,
136 keer goedkoper as musiek.

Dit is óf die winsgewendste ding wat hierdie toep verkoop, óf die
kosteskatting is verkeerd. `app/lib/server/video/eleven.ts` dra self twee
syfers vir dieselfde snit wat 43 keer uitmekaar is, en `check:kredietkoste`
weier om enigiets oor video te beweer totdat 'n regte faktuur dit besleg.

**Dit is die belangrikste oop getal op hierdie bladsy.** As video regtig so
goedkoop is, is die video-enjin die enjin om die toep op te bou. As dit
veertig keer duurder is as wat hier staan, is dit steeds winsgewend maar
nie buitengewoon nie. Een regte ElevenLabs-faktuur met video daarop besleg
dit, en niks anders sal nie.

## Die prys van 'n lied, uitgewerk

Gevra op 24 September 2026, nadat die tabel hierbo gewys het dat 'n lied
op 3,0x sit terwyl elke ander produk op ses tot sewe is.

**Die vanselfsprekende antwoord is verkeerd, en dit is die moeite werd om
te weet hoekom.**

### Wat 'n duurder lied WEL doen, en wat nie

Die plan is vooruitbetaalde kapasiteit. R18 216 koop 6 000 000 krediete,
en 'n lid wat hulle opbrand kos niks verder totdat die plan opraak nie —
dít is die hele rede waarom `check:koste` 'n reël het dat wins per lid die
intekening min die betaalpoort is, **en niks anders nie**.

So 'n duurder lied voeg **nie een sent** by die wins per lid nie. Wat dit
doen, is dat elke lid minder van die emmer opvreet — dus hou die plan meer
lede voor bykoop begin.

| 'n Lied kos | Marge | Maker kry | Studio kry | Label kry | Plek vir |
|---|---|---|---|---|---|
| 10 kr **(nou)** — 3,0x | R272,06 | 9 liedjies | 19 | 44 | 358 lede |
| 15 kr — 4,5x | R272,06 | 6 liedjies | 12 | 29 | 537 lede |
| 20 kr — 6,0x | R272,06 | 4 liedjies | 9 | 22 | 716 lede |
| 23 kr — 6,9x | R272,06 | 3 liedjies | 8 | 19 | 824 lede |

*Marge is by elke een dieselfde, want dit is die intekening min die poort.*

### Wat dit kos om dit te doen

Gelykbreek bly **81 lede**, by elke prys in daardie tabel, want gelykbreek
is vaste koste gedeel deur wins per lid en nie een van die twee beweeg nie.

Wat wel beweeg is die aanbod. By twintig krediete kry 'n Maker-lid
**4 liedjies vir R149** in plaas van
9 — R37 'n lied.

En dit is 'n prysverhoging op wat elke bestaande lid reeds gekoop het.
`credits.ts` het sedert 8 September 'n nota gedra wat presies dit sê.

### Verloor ons geld teen tien?

Nee, en dit is die syfer wat die saak besleg. Bo die plan se dak koop sy
by teen ElevenLabs se eie koers van R0,002640 per krediet, wat 'n lied
op **R4,75** te staan bring — teen die **R16,56** wat tien
krediete op Maker verkoop. 3,5x, selfs daar.

'n Lied teen tien krediete maak geld op elke pad: binne die plan gratis om
te bedien, en bo die dak steeds drie keer sy koste. Dit is nie 'n lek nie.

### Die aanbeveling

**Laat dit op tien.** Die 3,0x wat in die tabel hierbo staan is nie 'n fout
soos die advertensiedesk s'n was nie. Die desk het 'n R199-produk vervang en
koste-plus het regte waarde vernietig. 'n Lied is die ding waarin die plan
se krediete GEDENOMINEER is — die tien is nie 'n prys wat teen koste gestel
is nie, dit is die eenheid waarteen die toelae self gemeet is.

Die een geval waar dit saak maak: bo **358 betalende lede**,
wat vier keer gelykbreek is. As daardie dag kom, is twintig krediete die
regte skuif en hierdie tabel is die som. Tot dan koop dit niks en kos dit
die helfte van die aanbod.

