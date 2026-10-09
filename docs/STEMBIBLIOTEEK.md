# Hoe om die stembiblioteek op te neem

*Carli, 9 Oktober 2026:*

> "Ek wonder of dit nie baie vinniger en makliker gaan wees om 'n RVC stem opname van
> verskillende tale in Suid-Afrika op te neem en vir jou te gee nie. Om foneties te tik is baie
> uitdagend en ure se werk. Opnames is baie vinniger."

Sy is reg, en hierdie dokument is die antwoord op *hoe*. Twee dinge eers, sodat die res sin maak:

**Jy hoef niks foneties te tik nie.** Die fonetiese herspelling is outomaties — `singit.ts` doen
dit op die bediener, die lid tik gewone Afrikaans, en niemand sien dit nie. Dit is nie ure se
werk nie; dit is nul werk. Wat ure se werk is, is *my* lys langer maak, en dit kos een reël per
woord.

**Maar opnames is steeds die beter antwoord, net om 'n ander rede as wat dit lyk.** RVC
verander *wie* se stem dit is, nie *hoe* die woorde gesê word nie. Die uitspraak kom van die
bronopname af. 'n Engelse gidsstem omgeskakel na 'n Afrikaanse sanger se stem gee jou die regte
stem wat "baie" verkeerd sê. Waar opnames heeltemal wen, is as die **bronopname self** 'n mens
is wat Afrikaans sing: dan is uitspraak by die bron opgelos en RVC hoef net die stem te verander.
Dit klop enigiets wat ek kan herspel.

En dan is daar die ding wat niemand anders in hierdie mark het: **'n biblioteek van regte
Afrikaanse, Zoeloe- en Xhosa-stemme.** Dit is nie 'n funksie nie, dit is 'n bate.

---

## 1. Waar die opleiding werklik gebeur — en dit is nie in die app nie

Dit is die eerste ding om te weet, want dit verander die hele plan.

**Kits se API het geen `POST /voice-models` nie.** Jy het dit self op 9 September 2026 gehardloop
en dit antwoord **404**. Die API *lys* stemme en *sing* in hulle; dit lei nie een op nie. Opleiding
gebeur op kits.ai se eie webwerf, met die hand, en jou intekening betaal daarvoor.

Wat dit beteken vir die plan:

- Die opnames gaan **by kits.ai op**, nie by FutureBox nie.
- Jy bring **die model se nommer** terug en sit dit in die app in.
- Die 400 minute op jou plan meter **omskakeling**, nie opleiding nie. Oplei kos nie van daardie
  minute nie.

`app/components/HowToTrain.tsx` sê dit al vir 'n lid in die Pro Booth, met die skakel. Hierdie
dokument is vir jou as die besigheid, nie vir 'n lid nie.

---

## 2. Die een ding om nie oor te slaan nie: die papierwerk, by die sessie

**'n Stem is spesiale persoonlike inligting onder POPIA.** Nie 'n naam of 'n e-posadres nie — 'n
hoër kategorie, met 'n strenger plig. En as hierdie stemme aan lede aangebied gaan word, dan
lisensieer die sanger sy stem vir kommersiële gebruik deur vreemdelinge. Dit is nie 'n klein
klousule nie.

Kry dit **geteken op die dag, voor die eerste opname**. Agterna 'n sanger jaag is hoe 'n bate
onbruikbaar word: jy sit met die lêers, jy mag hulle nie gebruik nie, en die opname-dag is weg.

Die vier dinge wat die vorm moet sê, in gewone taal:

1. **Wat opgeneem word** en dat 'n KI-model daaruit gemaak word.
2. **Wat met die model gebeur** — dat lede liedjies in daardie stem kan maak, en of dit kommersieel
   vrygestel mag word.
3. **Wat die sanger kry** — 'n eenmalige fooi, 'n deel, of niks, maar dit staan daar.
4. **Hoe hy kan terugtrek**, en wat dan gebeur met liedjies wat al gemaak is. Hierdie een is die
   moeilikste en die belangrikste: 'n stem wat onttrek kan word nadat tweehonderd mense liedjies
   daarmee gemaak het, is 'n probleem wat jy nou moet beslis en nie later nie.

**`docs/SANGER-OOREENKOMS.md` is daardie vorm**, en dit is nou geskryf — Afrikaans, met
`docs/SINGER-AGREEMENT.md` as die Engelse weergawe. Dit dek al vier die punte hierbo, plus die
een wat die meeste behoort gelees te word: wat die Studio **nie** met die model mag doen nie
(geen gesproke woorde in die sanger se mond nie, nooit 'n model van 'n kind nie).

*Hierdie paragraaf het eers gesê om die klousule by `docs/KUNSTENAAR-OOREENKOMS.md` te voeg. Dit
was verkeerd en dit was geskryf sonder om daardie lêer oop te maak: daardie ooreenkoms se hele
spil is klousule 4, “uniek, en een keer verkoop”, wat die teenoorgestelde is van 'n stemmodel —
en 'n illustreerder hoef nie klousules oor biometriese data te onderteken nie. Dit is dus 'n
aparte dokument, met 'n verwysing in albei rigtings.*

---

## 3. Wat 'n goeie opname is

Dit staan al in die app en dit is reg, so dit word hier herhaal eerder as anders gesê:

- **Stil plek.** Geen musiek agter jou nie, geen verkeer, geen waaier. 'n Model leer alles wat in
  die lêer is, en 'n gesis wat dit geleer het, is 'n gesis in elke liedjie daarna.
- **Die beste mikrofoon wat jy kan kry, naby.** 'n Goedkoop een naby klop 'n goeie een oorkant die
  kamer. 'n Foon 'n handbreedte weg, binne, is al klaar ordentlik.
- **Vier tot ses snitte, nie een lang een nie.** Verskillende reëls, verskillende gevoelens — hard
  en sag, hoog en laag, vinnig en stadig.
- **Die klanke wat werklik gesing word.** As die sanger Afrikaans sing, neem Afrikaans op. 'n Model
  wat net Engels gehoor het, het nooit 'n rollende r of 'n "g" gehoor nie en sal daaraan raai.

Twee dinge om by te voeg wat vir 'n *biblioteek* geld en nie vir een lid se eie stem nie:

- **Een sanger per model.** RVC leer een stem. Twee sangers in een datastel gee 'n model wat soos
  nie een van hulle klink nie.
- **Dieselfde kamer, dieselfde mikrofoon, dieselfde afstand vir al die snitte van een sanger.** Die
  model leer die kamer saam met die stem. Verander die kamer halfpad en dit leer twee kamers.

---

## 4a. Die uitspraak-sessie — en dít is die een om eerste te doen

*Carli, 9 Oktober 2026: "ek wil die sangers gebruik vir uitspraak, nie dat hulle stemme deur ander
gebruik word nie."*

Dan is dit **nie 'n sang-sessie nie, dit is 'n woordelys.** Heeltemal anders as §4 hieronder, en
baie korter: een uur, een mikrofoon, en 'n lys op 'n skerm.

Die vorm: `docs/SANGER-UITSPRAAK.md`. Geen model word gemaak nie, niemand anders hoor die opname
nie, en dit is 'n baie makliker ding om vir iemand te vra.

**Wat om te laat lees, in hierdie orde:**

1. **Die woorde wat die app self sê.** Nie 'n woordeboek nie — die app se eie woorde. `SING_RULES`
   in `app/lib/server/singit.ts` het nou 79, waarvan 73 my raaiskote is wat nog nooit gehoor is
   nie. Laat hom elkeen **sing** soos hy dit sou sing, een per reël, met 'n stilte tussen.
   Daardie een uur maak 73 raaiskote in 73 feite.
2. **Die klanke wat Engels nie het nie, in woorde en nie los nie** — die "g" (dag, gee, lig), die
   rollende r (rooi, hart, vir), "ui" (huis, uit), "eu" (seun, deur), "oe" (boek, moet), "ê" en
   "ô" (sê, môre). 'n Los klank is nie 'n woord nie; die model sien altyd 'n woord.
3. **Tien woorde waar hy dink KI dit sal opneuk.** Sy eie keuse, nie myne nie. Hierdie tien is
   gewoonlik die nuttigste op die hele lys.
4. **Dieselfde lys, gepráát eerder as gesing.** Die spraakstem (`sayit.ts`) en die sangstem
   (`singit.ts`) is twee verskillende lyste in die app, en 'n woord kan in die een reg wees en in
   die ander verkeerd.

Daarna, by die masjien: luister, skryf die herspelling neer, en **maak een liedjie met en een
sonder** om te hoor of die reël werklik 'n verbetering is. Dit is die stap wat van "ek dink dit
help" na "dit help" beweeg, en dit is die enigste stap wat nie geraai kan word nie.

---

## 4. 'n Stemmodel-sessie, as dit ooit daarby kom

*Hierdie afdeling is vir die ander ding — 'n stemmodel wat lede kan gebruik, met
`docs/SANGER-OOREENKOMS.md` daaragter. Dit is nie wat sy nou wil doen nie, en dit staan hier omdat
die dag dalk kom en die plan dan klaar is.*

Een sanger, een uur, en jy het genoeg. Die bruikbare getal is **10 tot 30 minute skoon sang** —
dit is wat haar eie nota gesê het en dit stem met wat RVC vra.

Wat om hom te laat sing, in hierdie orde:

1. **Vyf minute gewone sang** — enigiets wat hy goed ken, in sy eie taal. Dit is om die kamer en die
   vlakke reg te kry en om hom te laat ontspan. Hierdie een gooi jy dalk weg.
2. **Tien minute oor sy hele omvang** — laag, middel, hoog. Nie oefeninge nie; regte reëls, want
   RVC leer hoe 'n mens *sing* en nie hoe hy toonlere doen nie.
3. **Vyf minute sag en vyf minute hard.** Die meeste modelle klink sleg sag, want niemand neem sag
   op nie.
4. **Vyf minute van die klanke wat Engels nie het nie** — die "g", die rollende r, "ui", "eu",
   "oe". Laat hom reëls sing wat hulle dra. Dit is die deel wat hierdie biblioteek anders maak as
   enigiets wat jy kan koop.

En dan, as hy nog daar is: **vra hom om twee of drie van jou liedjies se woorde te sing.** Dit is
nie vir die model nie — dit is 'n gidsstem met regte uitspraak, wat volgens punt 2 hierbo die
beste bronopname is wat daar bestaan.

---

## 5. Watter tale, en in watter orde

Die app se eie taal is Afrikaans, so **Afrikaans eerste** en nie as 'n demonstrasie nie: dit is die
een wat môre gebruik gaan word.

Daarna is dit 'n markvraag en nie 'n tegniese een nie. Zoeloe en Xhosa is die grootste huistale in
die land; Sotho, Tswana en Tsonga daarna. Die tegniek is identies vir almal — RVC gee nie om watter
taal dit hoor nie, dit leer 'n stem.

**Twee sangers per taal, nie een nie.** 'n Man en 'n vrou, of twee verskillende klanke. Een stem per
taal is 'n demonstrasie; twee is 'n keuse, en 'n keuse is wat iemand 'n plan laat koop.

---

## 6. Wat dit kos, en wat dit werd is

| Wat | Koste |
|---|---|
| Opname (jou eie kamer, jou eie mikrofoon) | R0 |
| Sanger se fooi | joune om te beslis — sit dit in die ooreenkoms |
| Opleiding by kits.ai | in jou R640/maand, nie per model nie |
| Omskakeling daarna | R1.60 die minuut uit die 400 op die plan |

Die opleiding is die deel wat nie meer kos nie, en dit is juis hoekom `docs/EIE-STEM.md` sê
**sny die omskakeling uit en hou die kloning**: Kits hef niks ekstra vir 'n model nie en R1.60 'n
minuut vir elke omskakeling, terwyl 'n eie GPU ongeveer R0.12 'n minuut omskakel en R28–R70 **per
model** vra om op te lei.

Dus: elke model wat jy nou by Kits oplei, is gratis en bly joune om later elders te gebruik — maar
net as die ooreenkoms in punt 2 dit toelaat. Dít is die regte rede om die papierwerk reg te kry
voordat die eerste sanger sing.

---

## 7. Wat om terug te bring

Vir elke model, drie dinge:

1. **Die model se nommer** by kits.ai. Dit gaan in die app in.
2. **Die sanger se naam en taal**, soos dit vir 'n lid gewys moet word.
3. **Die geteken­de ooreenkoms**, gestoor waar dit oor drie jaar gevind kan word.

Die lêers self hou jy ook — die rou opnames, nie net die model nie. Die dag wanneer die
omskakeling na 'n eie GPU skuif (sien `docs/EIE-STEM.md`), is daardie opnames wat jy nodig het om
die model weer op te lei. 'n Model by Kits is 'n model by Kits; die opnames is die bate.
