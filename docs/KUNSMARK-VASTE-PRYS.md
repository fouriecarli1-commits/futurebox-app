# Van veiling na vaste prys — die plan, en die klousules klaar geskryf

Carli, 6 Oktober 2026:

> *"Dit is prohibited in Suid-Afrika om te bet op die album art in ons app.
> Dit is baie sad, maar dit beteken ons sal daardie funksie moet verander. Ek
> dink ons moet 'n vaste rate van R280 vra vir 'n kunswerk. Die kunstenaar kry
> dan R200 van die bedrag. Ons moet dan ook die legal agreement met die
> kunstenaar so verander. Dit moet steeds so werk dat daardie kunswerk net een
> keer verkoop mag word en die kliente in die app moet dit weet en dit moet
> iewers staan."*

En daarby:

> *"Die agreement met die kunstenaar moet weet wat die vereiste is van grootte
> van kunswerk. Asook as iemand 'n kunswerk request, die lengte van tyd wat
> hulle het om dit te voltooi. En dus as hulle nie deliver nie, dat die bedrag
> van geld aan die klient gerefund sal word."*

---

## Een ding om eers na te gaan, en dan los ek dit

**'n Veiling is gewoonlik nie "bet" in Suid-Afrikaanse reg nie.** Die National
Gambling Act gaan oor **kansspele**. 'n Kunswerk aan die hoogste bieër verkoop
is 'n **verkoop**, en veilings word gereguleer onder **artikel 45 van die
Consumer Protection Act** — gedragsreëls (geen vals bod deur die verkoper nie,
die reëls moet beskikbaar wees, ens.) eerder as 'n verbod.

As jy regsadvies gekry het wat anders sê, volg die advies — ek is nie 'n
prokureur nie en jou adviseur het jou besonderhede. Maar as die premis 'n
aanname was, verloor jy dalk 'n funksie vir niks.

**Dit verander nie die plan nie.** 'n Vaste prys is eenvoudiger, dit is
vriendeliker vir die kunstenaar, en dit pas by jou eie reël oor te veel
aankooppunte. Dit staan hier sodat die rede oor ses maande nie verkeerd
onthou word nie.

---

## Waarom hierdie dokument bestaan en nie die ooreenkoms self verander is nie

Die ooreenkoms beskryf wat die app **doen**. Die app loop vanaand nog 'n
veiling: `app/components/ArtMarket.tsx` is 2 478 reëls en
`app/api/artmarket/route.ts` is 1 329, met **118 verwysings na bodde** tussen
hulle, plus die `art_bids`- en `art_bidders`-tabelle.

As ek net die ooreenkoms verander, sê die geteken­de papier iets wat die app
nie doen nie. Dit is erger as om niks te verander nie, en dit is presies wat
`check:ooreenkoms` bestaan om te keer.

So die klousules staan hier, klaar geskryf, en hulle gaan **saam met die kode**
in — nie voor nie.

---

## Wat reeds gedoen is

`app/data/artmarket.ts` dra nou die nuwe getalle, uitgevoer en nie net
neergeskryf nie:

```
ART_RAND    = 280      die prys van 'n werk op die muur
ARTIST_RAND = 200      wat die kunstenaar kry, skoon
wallSplit()            die som, wat presies opdeel
```

| Prys | Kaartfooi | Kunstenaar kry | Studio hou |
|---|---|---|---|
| **R280** | R11,80 | **R200,00** | **R68,20** |

Die kaartfooi is 3,5% + R2, en hy kom van **die Studio se kant** af. Dit is
die gewone lees van *"die kunstenaar kry R200 van die bedrag"*: tweehonderd
rand, punt. Die verskil tussen R200 en R188,20 is die soort ding wat 'n
kunstenaar op 'n bankstaat kry en nooit vergeet nie.

Niks roep `wallSplit()` nog nie. Dit breek dus niks, en dit is nie 'n halwe
verandering aan die betaalpad nie.

---

## Die een vraag wat ek nie kan beantwoord nie

**Geld die R280 ook vir 'n bestelling?**

Vandag is 'n bestelling R500 as riglyn, met die kunstenaar wat die prys noem
en 70/30 van die wins. Jy het gesê *"'n vaste rate van R280 vir 'n kunswerk"*,
en 'n bestelling is ook 'n kunswerk — maar dit is ook 'n ander ding: een koper
vra een kunstenaar vir iets wat nog nie bestaan nie.

Ek het dit **nie** verander nie, want 'n prys met 44% laat sak op 'n aanname is
nie my besluit om te neem nie.

- **"Ja, R280 oral"** → ek haal `UNIQUE_RAND` uit en die kunstenaar kry ook
  daar R200.
- **"Nee, bestellings bly R500"** → dan het die ooreenkoms twee tabelle, een
  per manier van verkoop, wat reeds hieronder so geskryf is.

---

## Die klousules, klaar geskryf

### Klousule 5 — Pryse (vervang die veilingsgedeelte)

> **Van die muur af is dit een vaste prys.** 'n Werk op die muur kos **R280**,
> en die Kunstenaar word daaruit **R200** betaal. Daar is nie 'n bod nie, nie
> 'n klok nie, en nie 'n prys wat eers bekend word wanneer iets sluit nie: die
> koper sien een getal en betaal dit.
>
> Die R200 is **skoon**. Die kaartfooi word van FutureBox se kant afgetrek en
> nie van die Kunstenaar s'n nie. Op R280 is daardie fooi R11,80, wat FutureBox
> R68,20 laat.
>
> Dit was voorheen 'n veiling met 'n vloer van R200. Dit het op 6 Oktober 2026
> verander. 'n Kunstenaar wat die ou ooreenkoms geteken het, word onder hierdie
> een betaal.

### Klousule 5A — Hoe groot 'n werk moet wees *(nuut)*

> **3000 × 3000 pixels, presies vierkantig, tot 8 MB.**
>
> Dit is nie 'n voorkeur nie, dit is wat die app aanvaar. 3000 × 3000 is die
> vierkant wat elke verspreider vra — Spotify, Apple Music en DistroKid neem
> dit almal, en Apple weier enigiets onder 1400 — sodat 'n werk wat hier gekoop
> word net so op 'n regte vrystelling kan uitgaan.
>
> **Vierkantig, nie ongeveer vierkantig nie.** Elke winkel sny 'n omslag tot 'n
> vierkant, en 'n snit wat iemand anders kies, is 'n snit met die Kunstenaar se
> handtekening af.
>
> Die 8 MB is 'n **plafon, nie 'n teiken nie**. Die blaaier skryf die lêer na
> WebP om, wat 'n 3000 × 3000 skildery op ongeveer 1 tot 3 MB laat land.

Hierdie getalle staan reeds in die kode (`ART_SIDE`, `ART_MAX_BYTES`,
`ART_SIZE_SAID`) en word reeds vir die kunstenaar gewys. Wat ontbreek het, is
dat hulle in die **ooreenkoms** staan, wat is wat jy gevra het.

### Klousule 5B — Die venster, en wat gebeur as dit verbygaan *(nuut)*

> **As die Kunstenaar nie binne die gekose venster lewer nie, word die koper se
> geld ten volle terugbetaal.** Die venster is nie 'n riglyn nie; dit is die
> belofte waarop die koper betaal het. Die Kunstenaar kies self watter van die
> vier (2 dae, 4 dae, 6 dae, 2 weke) hy of sy kan nakom — wat beteken 'n
> gemiste datum is nie 'n misverstand nie.
>
> Wat gebeur wanneer die tyd verstryk:
>
> - Die koper kry **die volle bedrag** terug, nie die bedrag min 'n fooi nie.
>   Die kaartfooi is FutureBox se verlies, nie die koper se straf nie.
> - Die Kunstenaar word **niks** betaal vir daardie bestelling nie.
> - Die bestelling verval. 'n Werk wat later aankom, is 'n nuwe aanbod.
>
> Dit sny albei kante toe: 'n koper wag nie onbepaald nie, en 'n Kunstenaar
> word nie gestraf vir iets buiten die venster wat hy of sy self gekies het
> nie.

Die vier vensters bestaan reeds in die kode (`WINDOWS`) en die horlosie begin
reeds wanneer die koper *aanvaar* druk. Wat nuut is, is die **terugbetaling** —
dit is nie gebou nie en die ooreenkoms mag dit nie belowe voordat dit is nie.

### Klousule 6 — Winsverdeling (vervang die enkele tabel)

> Daar is **twee maniere om te verkoop en hulle reken verskillend**.
>
> **6.1 Van die muur af — een vaste prys**
>
> | Prys | Kaartfooi | Kunstenaar kry | Studio hou |
> |---|---|---|---|
> | **R280** | R11,80 | **R200,00** | R68,20 |
>
> Daar is hier **geen persentasie nie**. Die Kunstenaar se bedrag is dieselfde
> getal op elke werk, elke maand, en kan teen 'n bankstaat getel word sonder om
> 'n som te doen.
>
> **6.2 'n Bestelling — die Kunstenaar noem die prys**
>
> Hier bly dit 'n deling: die kaartfooi eers af, en die wins 70/30.

Die **R50 buy-in val weg** saam met die bodde. Hy het bestaan om te keer dat
iemand wat nie ernstig is nie 'n prys opstoot — met geen prys om op te stoot
nie, is daar niks om te keer nie.

---

## Wat die koper moet sien, en waar

Jy het gesê die kliënte moet weet 'n werk word net een keer verkoop, en dit
moet iewers staan.

Dit **staan reeds** — `art.one` sê *"Elkeen een keer verkoop"*, en die lang
sin op die kunsmuur sê *"every piece is sold once and never again"*. Daardie
lang sin praat egter ook van bodde en van R200, en moet saam met die res
herskryf word na:

> **Engels:** Created by hand, not generated. One price, R280, and every piece
> is sold once and never again.
>
> **Afrikaans:** Met die hand gemaak, nie gegenereer nie. Een prys, R280, en
> elke werk word een keer verkoop en nooit weer nie.

---

## Die werk wat oorbly, in volgorde

1. **Die muur se UI** — bod-knoppies, die klok, die buy-in, die bod-lys uit;
   een prys en een koop-knoppie in.
2. **Die roete** — `/api/artmarket` se bod-eindpunte uit, een koop-pad in.
3. **Die databasis** — `art_bids` en `art_bidders` hou op nuwe rye kry. Die
   ou rye bly: dit is 'n rekord van wat gebeur het en dit word nie uitgevee
   nie.
4. **Die terugbetaling** — nuut, en die enigste stuk wat nie 'n herskryf is
   nie. Dit het 'n Paystack-terugbetaling nodig en 'n horlosie wat 'n
   verstreke venster raaksien.
5. **Die ooreenkomste** — albei tale, met die klousules hierbo.
6. **Die checks** — `check:ooreenkoms` moet die vaste getalle hou in plaas van
   die vloer en die buy-in; `check:artmarket` moet `wallSplit()` toets.

Punt 4 is die enigste een wat regtig nuut is. Die res is wegvat.
