# Epos aan Mureka — tantieme, hul plafon, en 'n prys vir 2 000 tot 8 000 lede

Carli, 8 Oktober 2026: *"Kan jy my help om vir mureka 'n custom sales epos te
skryf, wie ons is, die vrae oor ryalties, asook, wat hulle dak is? Ek wil
groei, maar wil begin met 2000-moontlik 8000 subscribers."*

**Stuur dit aan:** `bd@mureka.ai` — die adres op hulle eie Custom
Price-kaart. Daar is ook 'n "Talk to Sales"-knoppie op dieselfde bladsy; die
e-pos laat 'n spoor en die knoppie nie.

**Vul drie plekhouers in:** jou naam, jou rol, en die datum. Die sperdatum
hieronder staan as **22 Oktober 2026** — twee weke — en jy kan dit skuif
solank daar **een** is.

## Hoekom hierdie drie vrae, en nie meer nie

Dit is 'n eerste brief aan 'n verskaffer wat jou nie ken nie. Drie vrae word
beantwoord; agt word 'n vorm wat iemand later sal invul.

**Tantieme** is eerste omdat dit die een is wat jou kan laat ophou. As hulle
'n aandeel in inkomste eis op liedjies wat deur hulle model gemaak is, is
elke syfer in `docs/MINIMAX-PRYSE.md` verkeerd en die hele vergelyking val
om. 'n Prys per liedjie wat later 'n persentasie van omset word, is nie 'n
prys nie.

**Hulle plafon** is tweede omdat dit die ding is waaroor jy by ElevenLabs
gewag het. Jy wil weet waar die muur is voordat jy teen hom hardloop.

**Gelyktydigheid** is derde omdat dit, volgens hulle eie syfers, jou werklike
beperking is en nie die prys nie. Hulle nota sê gelyktydigheid tel **per
aankoop en nie opgetel nie**: vyf keer $1 000 gee jou 5 gelyktydige versoeke,
nie 25 nie. By 2 000 lede wat Vrydagaand tegelyk 'n liedjie maak, is 5 'n tou.

## Wat nie in die brief staan nie, en hoekom

**Geen van ons kosteberekeninge nie.** Hulle gepubliseerde prys is $0,045 'n
liedjie op V8/V9 en jy vra vir beter. 'n Brief wat ons marge noem, vertel die
ander kant presies hoeveel ruimte jy het — en dié syfer staan in
`docs/MINIMAX-PRYSE.md`, waar dit hoort, en nie in 'n brief aan 'n verskaffer
nie. `check:minimax` hou dat dit nie hierheen insluip nie.

**Geen belofte oor volume wat jy nie het nie.** Jy begin by 2 000 en hoop op
8 000. Dit staan presies so in die brief. 'n Opgeblaasde getal word 'n
kwotasie wat vir 'n besigheid geskryf is wat nie bestaan nie, en dan moet jy
dit later terugvat.

---

## Die brief

> **Onderwerp:** API pricing enquiry — AI music studio, South Africa (2 000–8 000 users)
>
> Hello
>
> I run FutureBox Studio, a creative studio app built in South Africa. We
> give independent musicians, actors and theatre makers a studio that fits
> in a phone: they write a song, sing on it themselves, cut a video, make a
> podcast, and publish it. The whole app is bilingual — Afrikaans and
> English, every button and every explanation — which as far as we know
> makes it the only app of its kind for this market.
>
> We are a registered South African company (FUTUREBOXSTUDIO (Pty) Ltd) and
> we are preparing to open to the public. We expect to start at around
> **2 000 subscribers and to grow towards 8 000** over the first year. I
> would rather pick a supplier who can carry that growth than move halfway
> through it.
>
> We currently generate music through another provider and are evaluating
> moving to Mureka. Your published per-song pricing is attractive and your
> API documentation is clear. Before we commit, there are three things I
> need to understand.
>
> **1. Royalties and rights.**
> Our members own what they make and some of them will release it
> commercially and earn from it. Could you confirm:
>
> - Does Mureka claim any ongoing royalty, revenue share or ownership
>   interest in music generated through the API?
> - Is the per-call price the complete cost, or is there any
>   downstream claim if a track earns money?
> - What rights do our members hold in the output, and is there anything we
>   must put in our own terms to pass those rights through correctly?
> - Do you offer any indemnity in respect of the training data, and under
>   what conditions?
>
> **2. Your ceiling.**
> I want to know where the limits are before we reach them, not after:
>
> - What is the largest volume you currently serve through the API, and is
>   there a point at which you would need notice from us?
> - Are there daily or monthly caps beyond the concurrency limits on the
>   pricing page?
> - What are your uptime commitments, and is there an SLA at the Enterprise
>   level?
> - How much notice do you give of model deprecations? We would be building
>   a product around a specific model, and a model that disappears is a
>   product that stops working.
>
> **3. Concurrency, which I think is our real constraint.**
> Your purchase notes say concurrency is counted per purchase rather than
> cumulatively — five purchases of $1 000 give five concurrent requests
> rather than twenty-five. Our usage is spiky: a Friday evening when
> several hundred members are making something at once looks very different
> from a Tuesday morning.
>
> - Can concurrency be negotiated separately from balance, so that we can
>   buy headroom for peaks without buying a year of generation up front?
> - What would you recommend for a user base of 2 000 growing to 8 000,
>   where most generation happens in evenings and over weekends?
> - Does queuing degrade gracefully at the limit, or do requests fail?
>
> **What we would need to get started.**
> A quote for the first twelve months at roughly 2 000 users, and an
> indication of how the price moves at 8 000. We would also like to take up
> the free trial you mention on the Custom Price card, so that we can test
> output quality in Afrikaans specifically — our members sing in a language
> most models have not been trained much on, and that is a real question for
> us rather than a formality.
>
> I would appreciate a reply by **22 October 2026** so that we can make this
> decision as part of our launch planning.
>
> Thank you — I am happy to get on a call if that is easier.
>
> Kind regards
> [JOU NAAM]
> [JOU ROL], FutureBoxStudio (Pty) Ltd
> futurebox.studio

---

## Afrikaanse weergawe, as jy dit so verkies

Hulle span werk in Engels, so ek sou die Engelse een stuur. Hierdie een is
hier sodat jy kan lees wat jy stuur.

> Ek bestuur FutureBox Studio, 'n kreatiewe ateljee-app wat in Suid-Afrika
> gebou is. Ons gee onafhanklike musikante, akteurs en teatermakers 'n
> ateljee wat in 'n foon pas: hulle skryf 'n liedjie, sing self daarop, sny
> 'n video, maak 'n potgooi, en publiseer dit. Die hele app is tweetalig —
> Afrikaans en Engels, elke knoppie en elke verduideliking — wat dit sover
> ons weet die enigste app van sy soort vir hierdie mark maak.
>
> Ons is 'n geregistreerde Suid-Afrikaanse maatskappy en maak gereed om oop
> te maak. Ons verwag om by ongeveer **2 000 intekenaars te begin en na
> 8 000 te groei** oor die eerste jaar.
>
> Ons genereer tans musiek deur 'n ander verskaffer en oorweeg dit om na
> Mureka te skuif. Drie dinge moet ek eers verstaan: **tantieme** (eis
> Mureka enige deurlopende aandeel in musiek wat deur die API gemaak is, en
> wat besit ons lede?), **julle plafon** (waar is die limiete, en hoeveel
> kennisgewing gee julle as 'n model afgeskaf word?), en **gelyktydigheid**
> (julle nota sê dit tel per aankoop en nie opgetel nie — kan dit apart van
> die saldo onderhandel word?).
>
> Ons sou graag 'n kwotasie wil hê vir die eerste twaalf maande teen ongeveer
> 2 000 gebruikers, en 'n aanduiding van hoe die prys by 8 000 lyk. Ons wil
> ook graag die gratis proeftydperk gebruik om uitvoergehalte **spesifiek in
> Afrikaans** te toets — ons lede sing in 'n taal waarop die meeste modelle
> min geoefen is, en dit is vir ons 'n regte vraag.

---

## As daar teen 22 Oktober niks is nie

Dieselfde reël as by ElevenLabs: 'n sperdatum sonder 'n gevolg is 'n versoek
wat twee keer gevra is.

Die gevolg hier is nie om weg te loop nie — hulle gepubliseerde prys is
steeds 'n sewende van wat ons nou betaal, en jy kan dit vandag koop sonder om
met iemand te praat. Die gevolg is om **op die gepubliseerde prys te begin,
op die $1 000-vlak**, en die gesprek oor tantieme en gelyktydigheid te voer
nadat daar regte gebruik is om oor te praat. Verskaffers antwoord vinniger
vir 'n kliënt as vir 'n vraag.

Wat jy **nie** moet doen voor die tantieme-vraag beantwoord is nie, is om die
app se hele musiekpad na hulle te skuif. Die prys is goed genoeg om te begin
en nie goed genoeg om 'n onbeantwoorde regsvraag mee te koop nie.
