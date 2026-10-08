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
