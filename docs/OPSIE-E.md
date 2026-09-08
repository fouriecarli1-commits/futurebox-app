# Opsie E — alles daaroor

Carli, 8 September 2026: *"gaan asb voort met opsie E."*

Dit is gedoen. Hierdie bladsy is die volledige rekord: wat verander het, hoekom,
wat dit aan die syfers doen, en wat sy self by Paystack en Vercel moet doen.

Alles hier is die kreatiewe ateljee alleen. Vaste koste sonder ElevenLabs
R3 543,74, geen werkswinkels, geen masterclass-inkomste.

---

## 1. Wat verander het

| | Prys was | Prys nou | Krediete was | Krediete nou | Liedjies | Videos |
|---|---|---|---|---|---|---|
| Gratis | R0 | R0 | 0 | 0 | — | — |
| **Maker** | R149 | **R149** | 120 | **90** | 9 | 3 |
| **Studio** | R349 | **R399** | 350 | **220** | 22 | 7 |
| **Label** | R749 | **R899** | 800 | **440** | 44 | 14 |

**Maker se prys beweeg nie.** Die instapprys is die een wat 'n mens verloor as
dit te hoog raak, en dit bly waar dit was.

Verander in `app/lib/plans.ts` (pryse, liedjies, videos, die kaartteks),
`app/lib/credits.ts` (`TIER_CREDITS`) en `app/lib/i18n.tsx` (albei tale).

---

## 2. Hoekom, en dit was Carli se eie punt

Sy het gesê: *"mense koop altyd die duurder produkte want hoe meer jy betaal hoe
goedkoper word dit."* Dit is waar, en dit is hoekom die vorige raamwerk verkeerd
was — die dalende marge is nie vanself 'n fout nie.

Volume-afslag werk wanneer volume **jóú** goedkoper maak. By gewone sagteware kos
nog 'n gebruiker die verskaffer nul, so 'n afslag kos niks. Hier kos elke krediet
dieselfde ongeag die vlak, **en ElevenLabs stel 'n dak op hoeveel daar in totaal
is.**

Onder daardie dak draai die som om:

| As almal een vlak was | Bydrae elk | Plan voed | Totaal by die dak |
|---|---|---|---|
| Net Maker | R103,94 | 458 | **R47 602** |
| Net Studio | R221,96 | 157 | R34 848 |
| Net Label | R461,32 | 68 | R31 370 |

'n Label-lid is 4,4× meer werd — maar die plan voed 6,7× meer Makers.

Die rede sit in die leer self. Voorheen:

* Maker → Studio: prys ×2,34, krediete ×**2,92**
* Studio → Label: prys ×2,15, krediete ×**2,29**

Elke tree het krediete vinniger weggegee as wat dit prys gevat het. Nou:

* Maker → Studio: prys ×**2,68**, krediete ×2,44
* Studio → Label: prys ×**2,25**, krediete ×2,00

Die prys klim nou vinniger as die krediete, en die marge klim saam:

| | Marge was | Marge nou |
|---|---|---|
| Maker | 70% | **76%** |
| Studio | 64% | **79%** |
| Label | 62% | **81%** |

**Dit is die enigste vorm waar opkoop vir albei kante beter is.** Wat 'n hoër
vlak in plaas van meer krediete kry, is die goed wat ons **niks kos nie**: Pro
Booth se diepte, kommersiële regte, voorrang in die tou, meer stemme, meer
saamwerk-plekke. Daardie kant van die kaart moet nog geskryf word — sien §7.

---

## 3. Wat dit aan die syfers doen

Op ElevenLabs Business, realisties (60% verbruik), sonder werkswinkels:

| | Vandag | Opsie E |
|---|---|---|
| Bydrae per lid | R175,08 | **R235,01** |
| Omset per lid | R269,00 | R299,00 |
| Winsmarge | 65% | **79%** |
| Gelykbreek | 125 lede | **94 lede** |
| Dak | 214 lede | **335 lede** |
| Plafonwins per maand | R15 708 | **R56 969** |
| Plafonwins per jaar | R188 490 | **R683 632** |

Wins by regte getalle, per maand:

| Lede | Vandag | Opsie E |
|---|---|---|
| 100 | −R4 252 | **R1 741** |
| 150 | R4 502 | **R13 492** |
| 200 | R13 256 | **R25 243** |
| 250 | bo die dak | **R36 993** |
| 300 | bo die dak | **R48 744** |
| 335 | bo die dak | **R56 969** |

---

## 4. Die vonds wat die meeste beteken

**Opsie E maak die besigheid werkbaar op die plan waarop sy reeds is.**

Vantevore het net Business ooit gewerk, en dit het 127 lede gevat. Nou,
realisties en sonder werkswinkels:

| ElevenLabs-plan | Gelykbreek | Plan voed | Werk dit? |
|---|---|---|---|
| Creator | 17 | 7 | nee |
| **Pro — wat sy vandag betaal** | **24** | **33** | **ja** |
| Scale | 43 | 101 | ja |
| Business | 94 | 335 | ja |

By **vier-en-twintig betalende lede** breek sy gelyk op die plan wat sy reeds
het. Vantevore was die bar honderd-vyf-en-twintig lede én 'n sprong na 'n plan
van R18 216 per maand.

**Maar Pro se speling is dun:** gelykbreek 24, dak 33. Dit werk, en dit hou nie
lank nie. Die eerlike leer is Pro om te begin, Scale wanneer sy verby dertig lede
kom (gelykbreek 43, dak 101), en Business as die groei daar is.

---

## 5. Wat sy by Paystack moet doen

**Maker het nie 'n nuwe plan nodig nie** — R149 het nie verander nie.

Paystack se planne dra hul eie bedrag, en 'n bestaande plan se bedrag kan nie
verander word nie. Vir Studio en Label moet daar dus **nuwe planne** wees:

1. Paystack → **Plans** → **Create Plan**
   * Naam: `FutureBox Studio` · Bedrag **R399** · Interval **Monthly**
2. Nog een:
   * Naam: `FutureBox Label` · Bedrag **R899** · Interval **Monthly**
3. Kopieer elke nuwe plan se **plan code** (dit lyk soos `PLN_xxxxxxxxxxxx`).

**Moenie die ou Studio- en Label-planne dadelik uitvee nie.** Bestaande
intekenare hang aan daardie kodes; sien §6.

---

## 6. Wat sy by Vercel moet doen

Vercel → die FutureBox-projek → **Settings** → **Environment Variables**:

| Veranderlike | Wat om te doen |
|---|---|
| `PAYSTACK_PLAN_MAKER` | **niks** — R149 het nie verander nie |
| `PAYSTACK_PLAN_STUDIO` | vervang met die nuwe R399-plan se kode |
| `PAYSTACK_PLAN_LABEL` | vervang met die nuwe R899-plan se kode |

Dan **Deployments → jongste → Redeploy**, anders bly die ou kodes loop.

Niks anders by Vercel verander nie. Die pryse self kom uit `plans.ts` en is
reeds in die kode; die enigste ding wat in die omgewing lê, is watter Paystack-
plan by watter vlak hoort.

### Bestaande intekenare

`tierOfPlan` in `app/lib/server/paystack.ts` lees 'n hernuwing terug deur die
plan-kode teen `PAYSTACK_PLAN_*` te pas. Sodra die veranderlike na die nuwe kode
wys, **pas 'n ou intekenaar se hernuwing nie meer nie** en hulle val terug na
gratis.

Daar is twee eerlike paaie, en dit is haar keuse:

* **Niemand betaal nog nie** → verander die kodes en klaar. Die maklikste, en
  waarskynlik waar sy nou is.
* **Iemand betaal wel** → los hulle op die ou plan tot hulle self opgradeer, en
  laat `tierOfPlan` albei kodes ken. Dit is 'n klein kodeverandering en dit moet
  gebeur **voordat** die veranderlike verander.

Sy moet sê watter een geld. Tot dan is die kodes nie verander nie.

---

## 7. Wat nog nie gedoen is nie

* **Die kaarte moet die nuwe waarde verkoop.** Studio en Label kos meer en kry
  minder krediete. Dit werk net as die kaart sê waarvoor die ekstra R50 en R150
  betaal: Pro Booth ten volle, kommersiële regte, voorrang, meer stemme. Daardie
  reëls staan nog nie op die kaarte nie, en die getalle alleen lees soos 'n
  prysverhoging.
* **Die kredietskaal is nog nie herkalibreer nie.** 'n Krediet kos ons R0,03 op
  transkripsie en R0,55 op musiek. Opsie E se somme gebruik die duurste geval
  (musiek), dus is die werklike koste altyd gelyk aan of laer as wat hier staan.
  Sien `docs/PRYSVOORSTEL.md` §3.
* **Video bly gevries.** `video/eleven.ts` dra twee getalle vir dieselfde greep
  wat 43 keer uitmekaar is. Een egte faktuur besleg dit.
* **Bypakkette.** Met 'n kleiner toelaag is 'n bypakket die ding wat 'n swaar
  lid keer om te vertrek. Dit moet op wees voordat iemand teen die muur loop.

---

*Elke syfer kom uit `docs/KOSTE-EN-WINS.md`, wat `scripts/costs-eleven.mts`
genereer uit `plans.ts` en `credits.ts` self — verander 'n prys daar en hierdie
somme verander saam. `check:koste` en `check:kredietkoste` hou dit vas.*
