# Wat FutureBox elke maand kos

Carli, 7 September 2026: *"ek wil net hê ons moet konstant in ag neem wat ek
alles maandelliks betaal want dit help nie ek maak nie 'n wins nie."*

Hierdie bladsy bestaan omdat die getal voorheen nêrens uitgewerk was nie.
`docs/KOSTE-EN-WINS.md` gebruik **R6 284** vier keer as die vaste koste, en
niks het ooit gesê waaruit dit bestaan nie. 'n Getal sonder 'n afleiding is
presies die soort wat wegdryf.

`check:koste` hou dit vas: elke gasheer wat die bediener-kode bel moet hier in
die tabel staan, die tabel se totaal moet ooreenstem met die getal wat die
winssomme gebruik, en elke diens met 'n sleutel moet daardie sleutel in
`docs/SWITCH-ON.md` hê.

---

## Die tabel

Randkoers **R16 = $1**, dieselfde aanname as `app/lib/plans.ts`.

**BTW.** Carli se egte ElevenLabs-faktuur is $113,85 waar die plakkerprys $99
is — en $99 × 1,15 = $113,85, tot die sent. Dit is 15% Suid-Afrikaanse BTW, en
tot 8 September 2026 was dit **nêrens** op hierdie bladsy of in
`docs/KOSTE-EN-WINS.md` nie. Elke dollarbedrag hier was 'n plakkerprys.

Dit is nou by **ElevenLabs** ingereken, en Zoho word reeds BTW-in ingevoer,
want dít is wat sy op haar staat gesien het. Die ander dollarrekeninge —
Anthropic, Vercel, Supabase, Resend, Kits.AI — hef dit **dalk** ook, maar
niemand het gekyk nie. Hulle bly plakkerpryse tot die staat anders sê, want om
15% aan te neem waar niemand gekyk het nie is dieselfde fout as die een wat pas
reggemaak is, net in die ander rigting.

| # | Diens | Waarvoor | Per maand | Soort | Nagegaan? |
|---|---|---|---|---|---|
| 1 | **ElevenLabs** | musiek, stemme, stem-skeiding, video | R18 216 (Business, BTW in) | vas | **BTW ja** — teen haar eie faktuur, 8 Sept. Die $990 self kom van hulle prysbladsy |
| 2 | **Anthropic** | die kopiloot, die liedjieskrywer, die advertensies | R1 500 | vas, skatting | **nee** — 'n skatting, nie 'n faktuur nie |
| 3 | **Vercel** | waar dit loop | R400 (Pro) | vas | nee |
| 4 | **Supabase** | rekeninge, liedjies, die kanaal | R320 (Pro) | vas | nee |
| 5 | **Resend** | uitnodigings, wagwoorde, kennisgewings | R64 ($4) | vas | nee |
| 6 | **Werkswinkels** | die masterclass-inhoud | R4 000 | vas, opsioneel | ja |
| 7 | **Music.ai** | akkoorde, toonaard, tempo, benoemde stukke | per minuut klank | per gebruik | **nee** — music.ai is ook geblokkeer |
| 8 | **Paystack** | hoe mense betaal | 2,9% + R1 per transaksie | per gebruik | ja |
| 9 | **Spotify** | die derde bar op Spotlight | niks | gratis | ja |
| 10 | **Kits.AI** | sangstem-omskakeling — die stem wat sing | R640 ($40) | vas | **ja** — sleutel gestel 7 Sept |
| 11 | **Kling** | video, duurder pad | nie in gebruik nie | — | jou besluit, 6 Sept |
| 12 | **Zoho** | die posbus agter die domein | R241,50 (BTW in) | vas | **ja** — van haar staat af, 8 Sept |
| 13 | **Domeine** | die name self | R168 | vas | **ja** — van haar staat af, 8 Sept |
| 14 | **Spaceship** | domeinregistrateur | $13,14 = R210,24 | vas | **ja** — van haar staat af, 8 Sept |

### Die vaste totaal, uitgewerk

| | Rand |
|---|---|
| Anthropic | 1 500 |
| Vercel | 400 |
| Supabase | 320 |
| Resend | 64 |
| Kits.AI | 640 |
| Zoho | 241,50 |
| Domeine | 168 |
| Spaceship | 210,24 |
| **Sonder ElevenLabs, sonder werkswinkels** | **3 543,74** |
| Werkswinkels | 4 000 |
| **Sonder ElevenLabs, met werkswinkels** | **7 543,74** |
| ElevenLabs Business | 18 216 |
| **Alles saam** | **25 759,74** |

Dít is waar `R3 543,74` en `R7 543,74` in `docs/KOSTE-EN-WINS.md` vandaan kom,
en `R25 759,74` is die getal waarteen gelykbreek uitgewerk word.

### Een vraag oor hierdie twee reëls, en dit raak geld

**Is die R168 se domeine dieselfde domeine wat by Spaceship staan?**

Spaceship is self 'n domeinregistrateur. Hulle staan hier as twee reëls omdat
Carli hulle met 'n "en" tussenin genoem het, wat hulle apart maak. As dit
eintlik een ding is, tel ons dit twee keer en die rekening is **R210,24 te
hoog**.

Een woord maak dit reg. Dit staan hier eerder as in 'n kommentaar in die kode,
want 'n aanname oor geld hoort waar die geld staan.

**Twee dinge het op 8 September verander en albei was groot.** Die ElevenLabs-
reël het BTW gekry, en Zoho het bygekom — 'n reël wat op **geen** kostelys was
nie. Dit was nie 'n som wat verkeerd was nie; dit was 'n koste wat glad nie
bestaan het op papier nie, en presies die soort wat 'n mens eers sien wanneer
die bank dit trek.

**Een reël hier is nog nie seker nie.** Die R64 staan hier as Resend en die
generator (`scripts/costs-eleven.mts`) noem dieselfde R64 GitHub, en Vercel en
Supabase se twee getalle is tussen die twee bladsye omgeruil. Die totaal is
dieselfde, so niks se som is verkeerd nie — maar een van die twee bladsye noem
'n diens op die verkeerde naam. Wanneer die eerste regte faktuur kom, is dit
die maklikste een om reg te maak.

---

## Die gat in hierdie bladsy, en hoekom dit 'n gat is

Op 8 September 2026 het **drie** verskaffers in een gesprek by hierdie tabel
gekom: Zoho, die domeine, en Spaceship. Saam R619,74 per maand — omtrent 'n
kwart van alles behalwe ElevenLabs en die werkswinkels.

Nie een van hulle was 'n som wat verkeerd was nie. Al drie was reëls wat **glad
nie bestaan het nie**, en al drie het dieselfde rede.

`check:koste` se eerste reël soek elke gasheer wat die **bediener-kode bel** —
dit lees `app/api/` en `app/lib/server/` en soek `https://`-adresse. Dit is 'n
goeie reël en dit werk: geen API waarvoor sy betaal kan van hierdie tabel af
wegraak nie.

Maar 'n domein, 'n posbus en 'n registrateur word **nooit deur kode gebel nie**.
Hulle is struktureel onsigbaar vir daardie reël, en dus vir hierdie bladsy, tot
iemand hulle met die hand byvoeg. Dieselfde geld vir enigiets anders van
daardie soort: rekeningkundige sagteware, 'n ontwerpgereedskap, 'n
skyfbergingsplan, 'n telefoonrekening.

**Dus: hierdie tabel kan nie homself volledig maak nie.** Die enigste ding wat
'n koste van hierdie soort kan vind, is 'n mens wat na 'n bankstaat kyk. Die
regte gewoonte is nie 'n beter kontrole nie — dit is om een keer per maand die
staat langs hierdie tabel te hou en te vra wat op die een is en nie op die
ander nie.

---

## Wat Kits.AI aan die rekening gedoen het

$40 per maand = **R640**. Die sleutel is op 7 September gestel en die kode bel
dit nou regtig — sien `app/lib/server/kits.ts` en `/api/voice/sing`.

| | Voorheen | Nou |
|---|---|---|
| Vaste koste, alles saam | R22 124 | R22 764 |
| Lede om gelyk te breek — **voorsigtig** | 157 | **161** |
| Lede om gelyk te breek — **realisties** | 115 | **118** |

*Hierdie tabel meet die Kits-besluit alleen, teen die rekening soos dit op 7
September gelyk het. Die getalle is met opset nie hierbo bygewerk nie: dit
vergelyk twee weergawes van dieselfde oomblik, en om die "nou"-kolom na
R25 381,50 te skuif sou die Kits-reël se koste laat lyk soos iets wat BTW en
Zoho ingesluit het. Vir wat die rekening vandag is, kyk na die tabel hierbo.*

Dit is **drie tot vier betalende lede meer**, vir die enigste ding wat die toep
belowe het en nie kon lewer nie. Dit is 3% van die rekening en die enigste reël
op hierdie bladsy wat 'n gat toemaak.

Twee dinge om na te gaan sodra jy die volledige pakket koop:

1. ~~**Of die $40-plan API-toegang insluit.**~~ **Geantwoord, 8 September.**
   Ja — en meer as dit: die API werk **glad nie** op die gratis laag nie. Elke
   egte adres antwoord `403 {"error":"Free tier users are not allowed to use
   the api"}`. Die sleutel is goed en hulle herken dit; die rekening betaal net
   nie. Niks in die toep kan werk voordat die plan gekoop is nie.
2. **Of daar 'n limiet op omskakelings per maand is.** As daar een is, moet
   `CREDITS.sing` daarteen gemeet word; dit staan nou op 4 krediete per minuut,
   dieselfde as die spraakmodel.

---

## Wat regtig die vorm van die besigheid bepaal

Kyk na die tabel. **ElevenLabs Business is R18 216 van R25 759,74 — 71%.**

Elke ander besluit op hierdie bladsy is klein daarnaas. Kits.AI is 3% van die
rekening. Vercel en Supabase saam is 3%. Die werkswinkels is 18% en is die
enigste ander lyn wat sin maak om te bevraagteken.

En die harde deel: van ElevenLabs se vier planne is **Business die enigste een
wat ooit wins kan maak**, want by die ander drie lê die kredietdak láér as die
getal lede wat jy nodig het om gelyk te breek. Meer mense laat inteken maak
dit erger, nie beter nie.

Daarom is die e-pos aan ElevenLabs die belangrikste ding op enige lys — nie
omdat dit dringend is nie, maar omdat dit die enigste ding is wat hierdie
tabel se grootste reël kan verander. Die vyf vrae staan in
`docs/DIENSTE-EN-KOSTE.md`.

---

## Wat om na te gaan wanneer 'n regte faktuur kom

Drie getalle hier is skattings en nie fakture nie. Wanneer die eerste maand se
rekening kom, gaan hierdie drie na en werk die tabel by:

1. **Anthropic R1 500** — die grootste skatting op die bladsy en die maklikste
   om verkeerd te hê. Die kopiloot loop op elke skerm.
2. ~~**ElevenLabs se planne**~~ — **klaar, 8 September 2026.** Carli het hulle
   prysbladsy gestuur. Musiek kos $0,15 per minuut en 'n plan is 'n
   dollar-begroting; die volledige lys en wat dit aan die winssomme doen staan
   in `docs/ELEVENLABS-PRYSE.md`. Kortweg: 'n liedjie kos ons R4,80 en nie
   R2,59 nie, en die realistiese geval werk nou net met die gratis laag se
   musiek af.
3. **Music.ai se koers per minuut** — `CREDITS.read = 6` en `CREDITS.parts = 8`
   is met opset hoog gestel omdat die egte koers nie hiervandaan gelees kon
   word nie.
