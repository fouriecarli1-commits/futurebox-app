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

| # | Diens | Waarvoor | Per maand | Soort | Nagegaan? |
|---|---|---|---|---|---|
| 1 | **ElevenLabs** | musiek, stemme, stem-skeiding, video | R15 840 (Business) | vas | **nee** — hierdie masjien kom nie by elevenlabs.io uit nie |
| 2 | **Anthropic** | die kopiloot, die liedjieskrywer, die advertensies | R1 500 | vas, skatting | **nee** — 'n skatting, nie 'n faktuur nie |
| 3 | **Vercel** | waar dit loop | R400 (Pro) | vas | nee |
| 4 | **Supabase** | rekeninge, liedjies, die kanaal | R320 (Pro) | vas | nee |
| 5 | **Resend** | uitnodigings, wagwoorde, kennisgewings | R64 ($4) | vas | nee |
| 6 | **Werkswinkels** | die masterclass-inhoud | R4 000 | vas, opsioneel | ja |
| 7 | **Music.ai** | akkoorde, toonaard, tempo, benoemde stukke | per minuut klank | per gebruik | **nee** — music.ai is ook geblokkeer |
| 8 | **Paystack** | hoe mense betaal | 2,9% + R1 per transaksie | per gebruik | ja |
| 9 | **Spotify** | die derde bar op Spotlight | niks | gratis | ja |
| 10 | **Kling** | video, duurder pad | nie in gebruik nie | — | jou besluit, 6 Sept |

### Die vaste totaal, uitgewerk

| | Rand |
|---|---|
| Anthropic | 1 500 |
| Vercel | 400 |
| Supabase | 320 |
| Resend | 64 |
| **Sonder ElevenLabs, sonder werkswinkels** | **2 284** |
| Werkswinkels | 4 000 |
| **Sonder ElevenLabs, met werkswinkels** | **6 284** |
| ElevenLabs Business | 15 840 |
| **Alles saam** | **22 124** |

Dít is waar `R2 284` en `R6 284` in `docs/KOSTE-EN-WINS.md` vandaan kom, en
`R22 124` is die getal waarteen gelykbreek uitgewerk word.

---

## Wat Kits.AI daaraan doen

$40 per maand = **R640**.

| | Sonder Kits.AI | Met Kits.AI |
|---|---|---|
| Vaste koste, alles saam | R22 124 | R22 764 |
| Lede om gelyk te breek — **voorsigtig** | 157 | **161** |
| Lede om gelyk te breek — **realisties** | 115 | **118** |

Dit is **drie tot vier betalende lede meer**, vir die enigste ding wat die
toep belowe en nie kan lewer nie. Dit is die goedkoopste reël op hierdie
bladsy en die enigste een wat 'n gat toemaak.

Dit hang aan een ding wat nog nie nagegaan is nie: of die $40-plan **API-**
toegang insluit. Party "unlimited"-planne is net vir hulle eie webwerf. Gaan
dit na voordat jy betaal — dis die verskil tussen R640 wat werk en R640 wat
niks doen nie.

---

## Wat regtig die vorm van die besigheid bepaal

Kyk na die tabel. **ElevenLabs Business is R15 840 van R22 124 — 72%.**

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
2. **ElevenLabs se planne** — die krediete per plan is wat die kode tot dusver
   aangeneem het, nie wat hulle prysbladsy sê nie.
3. **Music.ai se koers per minuut** — `CREDITS.read = 6` en `CREDITS.parts = 8`
   is met opset hoog gestel omdat die egte koers nie hiervandaan gelees kon
   word nie.
