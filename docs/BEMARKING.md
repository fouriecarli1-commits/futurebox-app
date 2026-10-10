# Bemarkingsmateriaal

Jou lys, 7 Oktober 2026: *"Bemarkingsmateriaal"* en *"Soft launch aan Anré se
mense"*.

Alles hieronder is in Afrikaans, want die mense vir wie die sagte
bekendstelling is, is Afrikaanse mense. Die Engels is onder elke blok, vir
wanneer dit nodig is.

## Reël vir hierdie lêer

**Niks hierin mag iets belowe wat die app nie doen nie.** Dit is nie
netheid nie. ’n Advertensie is die een plek waar ’n oorbelofte ’n klag word,
en dit is al een keer in hierdie repo gebeur: die Label-kaart het *"Five seats
on one account"* gedra en niks in die kode voeg ’n tweede mens by ’n rekening
nie. Dit is uitgehaal eerder as haastig gebou, en die kommentaar waar dit
gestaan het, sê hoekom.

Daarom staan **"waar dit bewys word"** by elke blok, en `check:bemarking` hou
elke prys in hierdie lêer teen `app/lib/plans.ts`. ’n Prys in ’n
bemarkingstuk is presies wat oud word en presies wat verkeerd gehef word.

---

## 1. Die een sin

> **’n Hele ateljee in jou foon — en die helfte daarvan kos niks.**

*Engels:* A whole studio in your phone — and half of it costs nothing.

**Waar dit bewys word:** die gratis plan se eie reël in `plans.ts` is
*"Everything your own phone can make, without limit and without paying"*, en
`check:kidsafe` wys watter kamers glad nie ’n krediet bestee nie: die
kunsmark, die saamwerk-kamer en die hook-voer. Die prent-editor bestee op
presies een ding — om die prent van die toestel af te neem.

---

## 2. Die kort paragraaf

> FutureBox is ’n ateljee wat in jou foon pas. Maak ’n liedjie, sing self
> daarop, sny ’n video, skryf woorde op ’n foto, maak ’n potgooi. Die
> redigering — die snitte, die voorkomste, die woorde, die prent-editor se
> hele gereedskapskis — loop op jou eie toestel en kos niks en is onbeperk,
> op elke plan. Wat kos, is die enjins: ’n gegenereerde liedjie, ’n video, ’n
> stem. Elke knoppie wat geld bestee, sê die prys voordat dit dit doen.
>
> Alles is in Afrikaans en in Engels, deur die hele app, nie net op die
> voorblad nie.

*Engels:* FutureBox is a studio that fits in your phone. Make a song, sing on
it yourself, cut a video, put words on a photo, make a podcast. The editing —
the cuts, the looks, the words, the whole photo editor — runs on your own
device, costs nothing, and is unlimited on every plan. What costs money is the
engines: a generated song, a video, a voice. Every button that spends says the
price before it spends.

**Waar dit bewys word:** `check:paidwalk` en `check:postpaid` hou vas dat ’n
betaalde knoppie sy prys sê voor dit hef. `check:afrikaans` hou vas dat elke
sleutel wat die kode vra, albei tale het — 3 255 sleutels op 8 Oktober 2026.

---

## 3. Vir die sagte bekendstelling, aan jou mense

Een boodskap, vir WhatsApp. Hou dit kort en hou die vra klein: jy vra vir ’n
halfuur se speel en een eerlike sin terug, nie vir ’n intekening nie.

> Hallo! Ek het die afgelope maande aan ’n ding gebou en ek wil graag hê jy
> moet dit eerste sien.
>
> Dit heet FutureBox. Dit is ’n ateljee in jou foon — jy kan ’n liedjie maak,
> self daarop sing, ’n video sny, woorde op ’n foto sit. Die redigering kos
> niks; net die enjins kos, en dit sê altyd die prys voor dit vra.
>
> Dit is nog nie oop vir die publiek nie. Ek vra net ’n halfuur: maak iets,
> enigiets, en sê vir my die een ding wat jou laat ophou. Nie ’n lys nie — die
> een ding.
>
> Hier is die skakel: futurebox.studio

**Hoekom "die een ding wat jou laat ophou"** en nie "wat dink jy?" nie: ’n
oop vraag kry "mooi, baie geluk", wat niks is om op te werk. Die een ding wat
iemand laat ophou, is die volgende commit.

---

## 4. Drie plasings vir sosiale media

Elkeen staan alleen. Nie een van hulle maak ’n aanspraak wat jy nie kan wys
nie.

**Een — die gereedskap.**

> Die snitte, die voorkomste, die woorde op die skerm, die prent-editor se
> hele gereedskapskis: alles loop op jou foon. Onbeperk. Op elke plan, ook
> die gratis een.
>
> Wat kos, is die enjins. En elke knoppie sê die prys voor dit vra.

**Twee — die taal.**

> Die hele app is Afrikaans. Nie net die voorblad nie — elke knoppie, elke
> verduideliking, elke foutboodskap. 3 255 sinne, albei tale, en ’n toets wat
> keer dat die een agter die ander bly.

**Drie — die prent-editor.** (Met ’n video van ’n foto wat verander.)

> Sny dit kleiner. Draai dit. Verwyder die agtergrond. Teken ’n sirkel, ’n
> vierkant of met die potlood om enigiets en hou wat binne is. Sit woorde
> daarop en skuif hulle met jou vinger waar jy hulle wil hê, met
> reëlspasie en letterspasie.
>
> Alles daarvan verniet, op jou eie foon. Jy betaal eers wanneer jy die prent
> aflaai.

**Waar dit bewys word:** `check:postwalk` loop deur daardie hele kamer in ’n
regte blaaier — die snit, die draai, die agtergrond uit, die vier vorms om mee
te sny, die woorde wat geskuif word, die twee spasie-stawe — en `check:postpaid`
hou vas dat net die aflaai hef.

---

## 5. Wat ons NIE mag sê nie

| Moenie sê nie | Hoekom |
|---|---|
| "Vyf plekke op een rekening" | Niks in die kode voeg ’n tweede mens by ’n rekening nie. Dit was op die Label-kaart en is uitgehaal. |
| "Onbeperkte liedjies" | Krediete is maandeliks en begrens. Die getalle staan in `plans.ts`. |
| "Gratis video's" | Die gratis plan het **geen** video-enjin nie. Wat verniet is, is die blaaier-sketch wat op die toestel geteken word. |
| "Jou liedjie is jou kopiereg" | Niemand vat dit van jou nie en jy mag dit verkoop — maar of 'n suiwer gegenereerde snit **eksklusiewe** kopiereg dra, is onseker in die meeste lande. Die terme-bladsy sê dit nou. Wat jy wél mag sê: *jy besit wat jy maak en niemand anders neem dit nie.* |
| "Ons kontroleer kopiereg" | Die app kan dit nie en beweer dit nie — `app/lib/filmrights.ts` sê hoekom. Dit weet wél watter dele van ’n film uit homself gekom het. |
| "Top 10 KI-musiek in Suid-Afrika" as ’n landwye lys | Dit is die lys van wat op FutureBox gespeel word, eerlik getel. Vandag is dit ’n kort lys. |
| Enigiets oor ’n app-winkel voordat dit daar is | `docs/PLAY-STORE.md` sê wat nog oop is. |

---

## 6. Wat van jou af moet kom

Niks hierin is geskryf nie omdat ek dit nie kon skryf nie — dit is geskryf
omdat net jy dit kan sê:

- **’n Foto of ’n video van jou, in die ateljee.** Die sterkste stuk
  bemarkingsmateriaal wat hierdie app het, is jy wat iets maak terwyl iemand
  kyk. Ek kan nie ’n video maak nie en ’n voorraadfoto van ’n vreemdeling by
  ’n mengbank is die teenoorgestelde van wat hierdie ding is.
- **Een liedjie en een video wat ÉG uit die app uit kom**, om by die plasings
  te sit. Enigiets anders is ’n prentjie van ’n ding eerder as die ding.
- **Die name** van die mense in die sagte bekendstelling, en of hulle
  krediete kry om mee te speel.

---

## 7. Die openbare bekendstelling, 1 November

*Afdelings 1 tot 6 is vir die sagte bekendstelling aan jou mense. Hierdie een
is vir vreemdelinge, en 'n vreemdeling weet niks van jou af nie. Dieselfde
reël geld: niks hierin belowe iets wat die app nie doen nie.*

### Die plasing vir dag een

> Dit is FutureBox.
>
> Maak 'n liedjie. Sing self daarop. Sny 'n video. Sit woorde op 'n foto.
> Maak 'n potgooi.
>
> Die redigering kos niks en is onbeperk — op elke plan, ook die gratis een.
> Wat kos, is die enjins, en elke knoppie sê sy prys voordat dit dit doen.
>
> Alles in Afrikaans. Nie net die voorblad nie: elke knoppie, elke
> verduideliking, elke foutboodskap.
>
> futurebox.studio

*Engels:* This is FutureBox. Make a song. Sing on it yourself. Cut a video.
Put words on a photo. Make a podcast. The editing costs nothing and is
unlimited on every plan, including the free one. What costs money is the
engines, and every button says its price before it spends. All of it in
Afrikaans as well as English — not just the front page.

### Sewe dae, een ding per dag

'n Plasing per dag, elkeen oor **een** ding. Nie een van hulle is 'n lys van
kenmerke nie, want niemand lees 'n lys nie.

1. **Die prent-editor.** Die video van 'n foto wat verander — sny, draai,
   agtergrond uit, woorde op. Alles verniet op jou eie foon.
2. **Sing self daarop.** Die woorde beweeg in tyd en 'n aftelling bring jou
   in. Een reël weer sing is 'n sleep oor daardie reël.
3. **Die kinderkamer.** 'n Toelae wat 'n grootmens stel, skermtyd wat
   regtig uitskop, en niks om in te tik nie.
4. **Die video-sjablone.** Twaalf begin-punte: 'n advertensie, 'n liedjie
   wat uit is, 'n stuk van 'n potgooi, hoe iets gedoen word, 'n aftelling,
   wat mense gesê het.
5. **Die taal.** Die hele app, albei tale, met 'n toets wat keer dat die een
   agter die ander bly.
6. **Cubed.** Drie klasse maak 'n meesterklas, en 60% van wat 'n reeks
   verdien, gaan aan die gas.
7. **Die prys.** Wat verniet is, wat kos, en hoekom dit so verdeel is.

### Drie kort advertensies, vir betaalde plasings

Kort, want 'n betaalde plasing word in twee sekondes verby geswiep.

**Een.** Jou foon is 'n ateljee. Maak 'n liedjie, sing self daarop, sny die
video. Die redigering kos niks.

**Twee.** Alles in Afrikaans. Elke knoppie, elke foutboodskap — nie net die
voorblad nie.

**Drie.** Elke knoppie wat geld bestee, sê die prys voordat dit dit doen. Jy
kry nooit 'n rekening wat jy nie gesien het kom nie.

**Waar dit bewys word:** `check:paidwalk` hou vas dat 'n betaalde knoppie sy
prys sê voor dit hef; `check:afrikaans` dat elke sleutel albei tale het;
`check:kinderkleur` dat daar niks in die kinderkamer is om in te tik nie;
`check:filmstart` dat al twaalf sjablone se woorde binne die veilige strook
val; `check:cubed` dat die 60/40 wat op die bladsy staan, die een is wat die
kode gebruik.

---

## 8. Wat hulle gaan vra, en die eerlike antwoord

*Nie een van hierdie antwoorde maak die app beter as wat dit is nie. 'n
Oorbelofte by 'n beswaar is die duurste plek om een te maak.*

**"Is dit nie net nog 'n KI-ding nie?"**
Die KI is die enjin, nie die app nie. Die helfte van wat hierin is — die
redigering, die snitte, die woorde op die skerm, die hele prent-editor —
loop op jou eie toestel, kos niks, en sou werk al was daar geen enjin nie.

**"Besit ek wat ek maak?"**
Jy besit wat jy maak en niemand vat dit van jou nie, en jy mag dit verkoop.
Of 'n suiwer gegenereerde snit **eksklusiewe** kopiereg dra, is onseker in
die meeste lande — die terme-bladsy sê dit, eerder as om dit stil te hou.

**"Wat kos dit regtig?"**
Die redigering: niks, onbeperk, op elke plan. Die enjins: elke knoppie wys
sy prys voordat dit dit doen. Die pryse staan op die prysbladsy en in
`app/lib/plans.ts`, en 'n toets hou hierdie lêer daarteen.

**"Is dit veilig vir my kind?"**
Die kinderkamer het niks om in te tik nie — elke keuse is 'n knoppie wat
iemand gekies het. 'n Grootmens stel die toelae en die skermtyd, en wanneer
die tyd op is, gaan die kamer weg. Daar is geen pad uit daardie kamer na die
res van die app nie.

**"Werk dit op my foon?"**
Dit is vir 'n foon gebou, nie vir 'n rekenaar wat ook 'n foon het nie.

---

## 9. Wat nog van jou af moet kom, vir 1 November

Dit staan apart van afdeling 6, want daardie lys was vir die sagte
bekendstelling. Hierdie is wat die openbare een nodig het:

- **Een liedjie, een video en een prent wat ÉG uit die app uit kom**, om by
  elke plasing te sit. Ek kan nie een maak nie.
- **Jou gesig.** Die sterkste stuk bemarking wat hierdie app het, is jy wat
  iets maak terwyl iemand kyk.
- **Die D-U-N-S-nommer**, as Google Play ooit deel van die storie is. Dit
  vat tot 30 dae en niks begin voordat dit bestaan nie.
- **Die besluit oor betaalde plasings**: hoeveel, waar, en wat jy bereid is
  om te verloor om die eerste honderd mense te kry.
