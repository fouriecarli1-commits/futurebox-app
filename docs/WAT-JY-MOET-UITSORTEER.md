# Wat jy moet uitsorteer — die generate-funksies en POPIA

Carli, 3 Oktober 2026: *"Maak dan asb 'n nota vir my van die generate en popia
ding wat ek moet uitsorteer. Ek is nie by 'n rekenaar om hierdie goed te doen
nie."*

Geskryf om op 'n foon gelees te word. Elke item sê **wat**, **hoekom**, **hoe
lank dit vat**, en **wat gebeur die oomblik dit klaar is**.

Niks hier is kode nie. Alles hier is iets wat net jy kan doen.

---

## Die kort weergawe

| # | Wat | Hoe lank | Wie |
|---|---|---|---|
| 1 | Stuur die fal.ai-brief | 10 min | jy |
| 2 | Stuur die Kits.AI-brief | 10 min | jy |
| 3 | Registreer die Inligtingsbeampte | 30 min | jy |
| 4 | Vra Music.ai, Resend en Kling vir hul DPA | 15 min | jy |
| 5 | Sit `FUTUREBOX_LEGAL_EMAIL` in Vercel | 2 min | jy |
| 6 | Laat 'n prokureur die lys teen die Staatskoerant hou | — | iemand anders |

Items 1 en 2 is die twee wat regtig iets oopmaak. Die res is netheid wat 'n
ouditeur gaan vra.

---

## 1. Die generate-funksies — fal.ai

**Wat is af:** drie knoppies in die snykamer. Agtergrond uithaal, 'n item uit 'n
skoot haal, en 'n stuk genereer wat jy nie het nie. Hulle is geprys, hulle staan
op elke planskaart, en die skerm sê hoekom hulle af is.

**Hoekom:** om video van 'n mens se gesig na fal.ai te stuur, het drie antwoorde
nodig wat ons nie het nie —

1. 'n **verwerkersooreenkoms** (hulle verwerk namens ons, nie vir hulleself nie),
2. 'n **POPIA artikel 72-grond** vir die oordrag oor die grens, en
3. **of hulle daarop oplei.**

Dit is nie 'n tegniese blokkasie nie. `check:verwerkers` laat die bou **rooi**
word die dag iemand daardie oproep skryf sonder hulle. Dit is met opset so
gebou, lank voor vandag.

**Wat om te doen:** die brief is klaar geskryf. `docs/EPOS-FAL.md`. Vier vrae,
die regte POPIA-artikels aangehaal, en 'n tabel onderaan wat sê wat ek doen by
elke moontlike antwoord — insluitend "dan stel ek 'n ander verskaffer voor".

Vul drie plekhouers in: jou naam en rol onderaan, en die kontak-e-pos. Die
maatskappy se adres staan nie in die brief nie en moet nie.

**Wat gebeur as hulle antwoord:** een reël op die privaatheidsbladsy, een
`fetch`, en al drie knoppies gaan aan. Ek het die werk reeds gedoen; dit wag
net.

---

## 2. Kits.AI — die skerpste een op die hele lys

Dit is nie 'n "generate"-ding nie, en dit is erger as nommer 1, so dit staan
hier.

**Wat:** Kits.AI kry 'n opname van iemand se **stem**. 'n Stem is **spesiale
persoonlike inligting** onder POPIA — 'n hoër kategorie as 'n naam of 'n
e-posadres.

**Wat ons van hulle het:**

| | ElevenLabs | Kits.AI |
|---|---|---|
| Kry 'n stemopname | ja | ja |
| Getekende DPA | **ja** | **nee** |
| Bewaartermyn gestel | ja, drie jaar | **nee** |
| POPIA 72-grond vir die oordrag | ja, SCC's | **nee** |

Drie uit drie ontbreek, op die een verskaffer wat die sensitiefste data kry.

**Wat reeds gedoen is:** die bladsy sê dit nou **hardop, by die naam, voor die
knoppie waarop dit van toepassing is** — watter enjin 'n ooreenkoms het en
watter nie, en dat iemand wat hulle stem net na die een wil stuur, die
sangomskakeling moet los. Dit is 'n eerlike bekendmaking, nie 'n oplossing nie.

**Wat om te doen:** vra Kits.AI vir hul DPA. Dieselfde vier vrae as die
fal.ai-brief werk woordeliks — DPA, sub-verwerkers en oorgrens, opleiding,
bewaring. Sê ek moet 'n Kits-brief skryf en dit is oor tien minute klaar.

**As hulle nee sê:** dan hou ons op om stemme daarheen te stuur. Daardie
besluit is joune, en dit is 'n regte een — die sangomskakeling hang daaraan.

---

## 3. Registreer die Inligtingsbeampte

**Wat:** POPIA vra dat elke verantwoordelike party 'n Inligtingsbeampte by die
Inligtingsreguleerder registreer. By 'n klein maatskappy is dit per verstek die
openbare beampte — jy.

**Waar:** die Inligtingsreguleerder se eie registrasieportaal. Dit is gratis.

**Hoe lank:** ongeveer 'n halfuur, en dit is 'n vorm, nie 'n aansoek nie.

**Daarna:** sit die naam in `FUTUREBOX_LEGAL_INFORMATION_OFFICER` in Vercel.
Die veranderlike wag reeds; die regsbladsy wys dit die oomblik dit gestel is.

---

## 4. Die drie kleiner verskaffers

**Music.ai, Resend en Kling.** Minder skerp as Kits — 'n e-posadres is nie 'n
stem nie — maar POPIA 72 vra 'n grond vir **elkeen** wat data oor die grens
kry.

Een e-pos elk: *"Do you have a standard DPA, and does it bind your
sub-processors on onward transfer?"* Sê die woord en ek skryf al drie.

---

## 5. Twee dinge in Vercel

| Veranderlike | Wat | Dringend? |
|---|---|---|
| `FUTUREBOX_LEGAL_EMAIL` | 'n Adres op die domein, nie 'n persoonlike een nie | **ja** — ECTA 43 vra dit |
| `NEXT_PUBLIC_SITE_HOST` | `futurebox.studio` | **ja**, as die domein al by Vercel gevoeg is |

Die tweede een is nie regs nie, maar dit is verkeerd op 'n manier wat niemand
kan sien nie: sonder dit wys elke canonical-skakel, elke sitemap-inskrywing en
elke WhatsApp-voorskou na `futurebox-app.vercel.app`. Die app druk nou uit wat
hy glo, onderaan die **You**-skerm, sodat jy dit met een kyk kan nagaan.

`FUTUREBOX_LEGAL_ADDRESS` bly **leeg** totdat die CIPC-rekord 'n besigheidsadres
dra. Dit is met opset en bly so.

---

## 6. Wat hierdie oudit nie kon doen nie

Dit hoort op die lys, want 'n nota wat net take lys, lieg deur weglating.

**Die wetteks self is nooit geverifieer nie.** Die sessie se netwerk blokkeer
gov.za, die ITU se kopie van die Wet, en elke prokureursfirma se opsomming
daarvan. Alles hierbo oor ECTA 43 en POPIA 72 kom uit wat die repo self
aanteken — en daardie aantekeninge is deeglik — maar **niemand het die
genommerde lys teen die Staatskoerant gehou nie.**

As een ding op hierdie bladsy 'n prokureur se oog werd is, is dit daardie
paragraaf.

---

## Wat NIE op hierdie lys is nie, en hoekom

Dinge wat reeds reg is, sodat jy nie daarvoor gaan soek nie:

- **ECTA 43** is deurdag gedoen. Die besonderhede leef in Vercel eerder as in
  die repo, en waar een ontbreek sê die bladsy dit eerlik in plaas van 'n
  plekhouer te wys.
- **ElevenLabs** het 'n getekende DPA, 'n bewaartermyn van drie jaar, en SCC's
  vir die oordrag.
- **18+ vir stemfunksies**, sonder ouertoestemming-uitsondering, want hulle
  reël het nie een nie.
- **Elke verwerker** staan op die privaatheidsbladsy, en `check:verwerkers`
  laat die bou val as 'n nuwe een bygevoeg word sonder 'n reël daar.

---

*Hierdie bladsy word met die hand opgedateer. Die lewende weergawes is
`docs/REGS-OUDIT.md` (die oudit self) en `docs/SWITCH-ON.md` §15 (die
veranderlikes).*
