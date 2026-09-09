# Koste en wins — net ElevenLabs

> Gereken deur `scripts/costs-eleven.mts` uit `app/lib/plans.ts` en
> `app/lib/credits.ts`. Moenie hierdie lêer met die hand regmaak nie —
> verander die prys in daardie lêers en loop die skrip weer, anders sê die
> pryskaart en hierdie som twee verskillende dinge.

Geskryf 2026-09-09. Kling is uit die som uit.

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

Vaste koste sonder ElevenLabs: R7 543,74 (werkswinkels ingesluit).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R196,21 | 41 | 4 | nee |
| Pro | R196,91 | 48 | 20 | nee |
| Scale | R196,31 | 67 | 60 | nee |
| Business | R196,91 | 131 | 203 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Realisties

Betalende lede gebruik 60% van hul toelae, die helfte van die gratis gebruikers maak ooit iets. Dít is die syfer om planne op te maak.

Vaste koste sonder ElevenLabs: R7 543,74 (werkswinkels ingesluit).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R232,34 | 35 | 7 | nee |
| Pro | R232,76 | 41 | 33 | nee |
| Scale | R232,40 | 57 | 101 | **ja** |
| Business | R232,76 | 111 | 338 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Voorsigtig, sonder werkswinkels

Die slegste geval weer, met die werkswinkels af. Dit wys of die slegste geval hoegenaamd veilig gemaak kan word.

Vaste koste sonder ElevenLabs: R3 543,74 (sonder werkswinkels).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R196,21 | 21 | 4 | nee |
| Pro | R196,91 | 28 | 20 | nee |
| Scale | R196,31 | 47 | 60 | **ja** |
| Business | R196,91 | 111 | 203 | **ja** |

*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se
ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,
so die wins per lid verander nie daar nie. Wat verander is kontantvloei:
bo daardie punt betaal jy namaands eerder as vooruit.*

*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,
is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op
Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*

## Realisties, sonder werkswinkels

Dieselfde as bo, met die werkswinkels af. Dit is die enigste hefboom wat oorbly noudat die gratis laag se musiek weg is.

Vaste koste sonder ElevenLabs: R3 543,74 (sonder werkswinkels).

| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |
|---|---|---|---|---|
| Creator | R232,34 | 17 | 7 | nee |
| Pro | R232,76 | 24 | 33 | **ja** |
| Scale | R232,40 | 39 | 101 | **ja** |
| Business | R232,76 | 94 | 338 | **ja** |

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
| Pro | 0 | — | Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein. |
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
| Studio | R399,00 | −R15,97 | −R121,16 | **R261,87** |
| Label | R899,00 | −R33,47 | −R242,33 | **R623,21** |

### Op ElevenLabs Pro

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R49,18 | **R92,60** |
| Studio | R399,00 | −R15,97 | −R120,23 | **R262,81** |
| Label | R899,00 | −R33,47 | −R240,45 | **R625,08** |

### Op ElevenLabs Scale

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R49,51 | **R92,27** |
| Studio | R399,00 | −R15,97 | −R121,04 | **R262,00** |
| Label | R899,00 | −R33,47 | −R242,07 | **R623,46** |

### Op ElevenLabs Business

| Laag | Prys | Poortfooi | Musiek | Bly oor |
|---|---|---|---|---|
| Maker | R149,00 | −R7,22 | −R49,18 | **R92,60** |
| Studio | R399,00 | −R15,97 | −R120,23 | **R262,81** |
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

**2. Gelykbreek hang aan die vaste koste, nie aan die dak nie.** In die slegste geval — elke lid brand elke krediet — is gelykbreek op Business **111 lede**, en die plan se krediete hou **203** voor bykoop begin. Met die werkswinkels terug word dit **131** teen **203**.

Realisties — 60% verbruik — is gelykbreek **94 lede** sonder werkswinkels en **111** met; bykoop begin by **338** lede. Die werkswinkels is nie 'n uitgawe nie, dit is 'n besluit: hulle kos 17 ekstra lede.


### En wat SARS daarvan vat

Carli, 8 September 2026: *"ek dink sars tot en met 30% van my inkomste
neem van hierdie produk, dus wil ek nie 'n verlies ly nie."*

**Die belangrikste ding eerste: maatskappybelasting is op WINS, nie op
omset nie.** Geen wins, geen belasting. Gelykbreek skuif dus glad nie —
dit bly 94 lede sonder werkswinkels en 111 met. Belasting
vat net 'n stuk van wat bo gelykbreek oorbly.

Dit is die hele antwoord op "moet ons die pryse herbesin?". Nie oor SARS
nie.

| By vol kapasiteit | Sonder werkswinkels | Met werkswinkels |
|---|---|---|
| Lede | 338 | 338 |
| Omset | R101 062,00 | R101 062,00 |
| Wins voor belasting | R56 913,60 | R52 913,60 |
| Ná 27% | R41 546,93 | R38 626,93 |
| Ná 30% | R39 839,52 | R37 039,52 |
| Ná 30%, per jaar | R478 074,26 | R444 474,26 |

**Ja, dit maak wins. Maar kyk na wat daardie tabel eintlik sê.**

Dit is nie wins by die huidige skaal nie — dit is die **meeste wat hierdie
plan ooit kan verdien**, hoe goed dit ook al verkoop word. Die dak is nie
die mark nie, dit is ElevenLabs se krediete: by 338 lede is die plan se
krediete op, en lid 215 kan nie bedien word nie.

**Dít is die ding om te herbesin, en dit is nie belasting nie.**

Drie hefbome, in volgorde van hoeveel hulle beweeg:

1. **Prys.** Elke rand op die maandprys gaan reguit deur na bydrae — daar
   is geen ekstra ElevenLabs-koste aan 'n hoër prys nie. Tien persent op
   die prys is ongeveer R10 106,20 per maand by vol kapasiteit,
   en dit skuif gelykbreek af sowel as die dak op.
2. **Die dak self.** Meer lede as die plan kan voed, beteken 'n groter
   plan of minder krediete per lid. Albei is prysbesluite.
3. **Die werkswinkels.** Hulle kos
   17 ekstra lede en R4 000,00 per maand.

### Twee dinge vir haar rekenmeester, en albei kan die 30% laat val

**1. Klein Sake Korporasie (SBC).** 'n (Pty) Ltd wat kwalifiseer betaal
nie 27% op alles nie: die eerste R95 750 belasbare inkomste is teen **0%**,
en die snit tot R365 000 teen **7%**. Die maksimum jaarwins hierbo is
R682 963,23 — heeltemal binne daardie tweede snit.
   Die effektiewe koers sou dan naby **3%** wees, nie 30% nie. Kwalifikasie
   het voorwaardes (alle aandeelhouers natuurlike persone, omset onder
   R20m, nie 'n persoonlike diensverskaffer nie) en dit is 'n vraag vir
   'n rekenmeester, nie vir hierdie lêer nie.

**2. BTW-registrasie.** Die 15% wat sy nou aan ElevenLabs en Zoho betaal is
   'n dooie koste **solank sy nie geregistreer is nie**. Geregistreer kan sy
   dit terugeis — maar dan moet sy 15% op lidmaatskappe hef of dit self dra.
   Verpligte registrasie is by R1 miljoen omset oor 12 maande; by vol
   kapasiteit is die omset R1 212 744,00 per jaar, dus
   **bereik sy dit nooit op hierdie plan nie**. Vrywillige registrasie is
   moontlik bo R50 000 omset, en dan word die BTW terugeisbaar.

   Wat dit werd is: die BTW op ElevenLabs alleen is R2 376,00 per maand,
   oftewel R28 512,00 per jaar. Teen 'n maksimum jaarwins van
   R682 963,23 is dit nie klein nie.

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

