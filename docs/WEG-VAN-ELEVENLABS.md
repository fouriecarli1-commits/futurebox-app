# Weg van ElevenLabs — wat dit werklik sou verg

Carli, 5 Oktober 2026: *"Hulle antwoord my nie, en ek sal nie so kan besigheid
doen nie."*

'n Billike besluit, en dit is 'n besigheidsbesluit eerder as 'n tegniese een.
Hierdie dokument is die tegniese helfte daarvan: wat ons werklik by hulle
koop, waar daar regte plaasvervangers is, en waar daar nie is nie.

---

## Eers: dit is dertien dinge, nie een nie

`app/lib/server/eleven.ts` word deur **twintig roetes** ingevoer en dek
**dertien** verskillende vermoëns:

| # | vermoë | roete | plaasvervanger bestaan? |
|---|---|---|---|
| 1 | text-to-speech (+ timestamps) | `voice/speak` | **ja**, baie |
| 2 | text-to-dialogue (meer sprekers) | `dialogue` | gedeeltelik |
| 3 | speech-to-speech | `voice/change` | ja |
| 4 | voice cloning | `voice/clone` | ja |
| 5 | stock-stemkatalogus | `voice`, `voice/preview` | ja |
| 6 | speech-to-text | `transcribe` | **ja** |
| 7 | forced alignment (woordtye) | `align` | **ja — Music.ai** |
| 8 | music generation | `music` | ja, met voorbehoud |
| 9 | stem separation | `stems` | **ja — Music.ai** |
| 10 | dubbing (hele pyplyn + SRT) | `dub`, `dub/hook` | ja |
| 11 | pronunciation dictionary | `eleven/pronounce` | **nee**, verskafferspesifiek |
| 12 | account/usage vir die koste-plafon | `account`, `allowance`, `watch` | n.v.t. — per verskaffer |
| 13 | music finetune (Sound trainer) | `finetunes` | **nee, nie wat ek kon vind nie** |

Die punt van die tabel is nie die lys nie, dit is die vorm: **geen enkele
verskaffer vervang dit nie.** Enigiemand wat sê "gebruik X in plaas van
ElevenLabs" het na een van die dertien gekyk.

## Die een stuk geluk

Al twintig roetes gaan deur **een lêer**. Dit beteken die werk is 'n *seam*
eerder as 'n herskryf: `eleven.ts` word 'n koppelvlak met 'n benoemde
verskaffer **per vermoë**, en dan skuif een vermoë op 'n slag. Niks hoef op
een dag te beweeg nie, en elke skuif kan gemeet word voor die volgende.

Dit is ook die enigste verantwoordelike volgorde. 'n Verskaffer wat op papier
beter lyk en in Afrikaans slegter klink, is iets wat jy net uitvind deur te
luister.

---

## Waar daar regte plaasvervangers is

Pryse hieronder is wat die verskaffers self publiseer, in Oktober 2026,
gevind deur te soek. **Hulle moet bevestig word voor enigiets daarop rus** —
en die een ding wat geen prys of blog kan antwoord nie, is hoe dit in
Afrikaans klink.

### Stems, alignment en transkripsie → Music.ai

Die skoonste wen, en dit is reeds half gedoen: `docs/EPOS-MUSICAI.md` is 'n
geskrewe brief wat net gestuur moet word.

- stem separation vanaf $0.05/min (instrumentaal) tot $0.15/min (drom-stems)
- **lyrics and speech alignment met woordtye**, sillabe-belyning $0.09/min
- transkripsie, vertaling, en meer as 50 ander audio-modules

Dit dek vermoëns **7, 9 en gedeeltelik 6** — en dit is juis die drie wat die
meeste met musiek te doen het, wat hierdie app se hart is.

### Afrikaanse stem → CAMB.AI, PlayHT, Soniox

Al drie adverteer Afrikaans uitdruklik. CAMB.AI is die interessantste omdat
hulle **ook dubbing** doen, dus dek hulle vermoëns 1 en 10 saam. PlayHT is 'n
aggregator oor Google, Amazon, IBM en Microsoft se stemme deur een koppelvlak,
wat beteken een integrasie gee toegang tot vier verskaffers se Afrikaans.

Vir speech-to-text noem AssemblyAI Afrikaans spesifiek.

### Musiek → Stable Audio, Google Lyria, Mubert

- **Stable Audio** (Stability): API teen $0.20/generasie, en — die punt wat
  vir ons saak maak — hul oefendata is **100% gelisensieer van regtehouers**.
  `check:musiclicence` bestaan in hierdie repo omdat daardie vraag al een keer
  skeefgeloop het. Open weights, dus self-hosting is moontlik.
- **Google Lyria 3.5** deur die Gemini API: $0.08/liedjie, die goedkoopste.
- **Mubert**: Business-plan $199/maand, en belangrik — dit laat
  **sublisensiëring en in-app gebruik** toe, wat die meeste nie doen nie.

Suno en Udio is **nie** opsies nie: geen publieke API. MiniMax het hul
musiek-API op 20 Augustus 2026 vir nuwe klante gesluit.

### Dubbing → CAMB.AI, Rask AI, HeyGen, Resemble AI

Almal met regte API's, voice cloning en SRT-uitvoer.

---

## Waar daar nie een is nie

**Die Sound trainer (vermoë 13).** ElevenLabs se music finetune — 'n
musiekmodel wat op 'n handvol van haar eie klaar liedjies geoefen word — is
die een waarvoor ek geen plaasvervanger kon vind nie. Dit is ook die een
waarvan die kamer se hele bestaansrede afhang. As hierdie skuif gebeur, is
die eerlike uitkoms dalk dat daardie kamer toemaak of iets anders word.

**Die pronunciation dictionary (vermoë 11).** Elke verskaffer doen dit anders
en die meeste glad nie. Die woorde self is ons s'n en gaan nie verlore nie,
maar die meganisme sal herbou moet word.

---

## Wat ek sou doen, in hierdie volgorde

1. **Stuur die Music.ai-brief.** Dit lê klaar geskryf, dit dek drie vermoëns,
   en dit is die enigste stap wat niks kos nie.
2. **Sit die seam in** `eleven.ts` — 'n verskaffer per vermoë — sonder om nog
   iets te verander. Daarna is elke skuif klein.
3. **Toets Afrikaans, met jou eie ore**, op dieselfde sin oor CAMB.AI, PlayHT
   en Soniox. Ek kan 'n klein vergelykingsharnas bou sodra daar proefsleutels
   is; die keuse is joune en nie myne nie.
4. **Skuif stems en alignment eerste.** Hulle het geen stemkwaliteit-vraag nie
   — 'n woordtyd is reg of verkeerd — so dit is die een plek waar 'n skuif
   objektief gemeet kan word.
5. **Musiek laaste**, want dit is die duurste om verkeerd te kry.

## En die ding wat nie tegnies is nie

As wat jy by ElevenLabs afwag die **DPA** is, is dit nie 'n ongerief nie, dit
is 'n wetlike blokkasie. POPIA artikels 20–21 vereis 'n geskrewe ooreenkoms
met elke operateur wat persoonlike data namens jou verwerk. 'n Verskaffer wat
nie daarop antwoord nie, laat jou sonder iets wat jy moet hê — en dan is die
skuif nie 'n voorkeur nie, dit is 'n sperdatum.
