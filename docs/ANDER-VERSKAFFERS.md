# Ander verskaffers as ElevenLabs

*Nagegaan 29 September 2026, nadat Carli gevra het: "Kan jy my ook help om te
kyk na ander verskaffers as elevenlabs? Hulle vat te lank om my te antwoord.
Dalk seedance, Veo, ByteData, nano banana?"*

Elke dollarprys hieronder is op 29 September 2026 by die verskaffer se eie
bladsy of by 'n prysvergelyking gelees, en elkeen dra sy datum. Pryse in
hierdie mark verander maandeliks. **Niks hieronder is 'n faktuur nie** — waar
'n getal uit 'n faktuur kom, sê dit so.

Rand teen R16 per dollar, dieselfde koers as `scripts/fixedcosts.mts`.

---

## 1. Drie van die vier is reeds joune

Dit is die eerste ding om reg te kry, want dit verander die hele vraag.

| Wat jy genoem het | Waar dit al in die app is |
|---|---|
| **Seedance** | `app/lib/server/video/eleven.ts` — uitgevoer as `seedance` |
| **Veo** | Dieselfde lêer — uitgevoer as `veo`, en dit is die hele videorak |
| **ByteData** | ByteDance, die maker van Seedance |
| **nano banana** | `app/lib/server/cover.ts` — `gemini-3.1-flash-lite-image` |

Al vier loop deur **een ElevenLabs-sleutel**. `POST /v1/flows/video` en
`POST /v1/flows/image` is makelaars: ElevenLabs verkoop jou Google en ByteDance
se modelle deur hulle eie rekening.

So die vraag is nie *"watter ander verskaffers"* nie. Dit is **"moet ek van die
tussenganger ontslae raak"** — en dit is 'n heeltemal ander vraag met 'n beter
antwoord.

---

## 2. Die ding wat ek eintlik gekry het

Terwyl ek dit nagegaan het, het die syfers 'n vraag beantwoord wat al in drie
dokumente oop staan — en die antwoord is duurder as wat die app glo.

### Die oop vraag

`docs/PRYSVOORSTEL.md` reël 154, `docs/DIENSTE-EN-KOSTE.md` reël 275 en
`docs/KOSTE-EN-WINS.md` reël 141 sê almal dieselfde ding: 'n videogreep kos
óf **R2,62** (die syfer in die kode) óf **R0,06** (dieselfde greep, gereken
teen die musiekkant se R0,00307 per ElevenLabs-krediet). Die twee is 43 keer
uit mekaar, en die dokumente sê almal: wag vir 'n egte faktuur.

### Die antwoord, sonder om te wag

Google publiseer Veo se prys per sekonde en faktureer net vir sekondes wat
geslaag het. Veo 3.1 **Fast** — presies die model in
`ELEVEN_VEO_MODEL` — kos $0,10/s teen 720p en $0,12/s teen 1080p.

Die app vra Veo teen 1080p, en `can.seconds` is `[4, 6, 8]`:

| | Per greep |
|---|---|
| 6 sekondes, 1080p, direk by Google | 6 × $0,12 = $0,72 = **R11,52** |
| Wat die kode se kommentaar sê | **R10,72** |
| Wat die krediettelling sê (60 krediete × R0,00307) | **R0,18** |

**R10,72 is reg. R0,06 is verkeerd.** Die kode se randsyfer stem tot binne 8%
met Google se eie gepubliseerde prys ooreen; die kredietsyfer is 59 keer te
laag. Videovloeie word nie teen die musiekkrediettarief gefaktureer nie.

### Waarom dit saak maak

`app/lib/server/video/eleven.ts` stel 'n bestedingsplafon:

```
ceiling: () => allowance(process.env.ELEVEN_VIDEO_CREDITS, 13_000)
```

13 000 krediete. Teen 60 krediete 'n greep is dit 216 grepe.

* Wat die app glo daardie plafon werd is: 13 000 × R0,00307 = **R39,91**
* Wat 216 Veo-grepe regtig kos: 216 × R10,72 = **R2 323**

Die plafon werk perfek. Dit vuur op die regte oomblik. Dit is net in die
**verkeerde geldeenheid** — en dit is presies die soort fout wat 'n mens nie
kan sien nie, want alles is groen.

> Dit is 'n besluit vir jou, nie vir my nie. Die regmaak is om die videoplafon
> in rand te stel eerder as in ElevenLabs-krediete. Ek het dit nie gedoen nie
> omdat dit die kredietmodel raak en jy het daardie pryse self gaan sit.

### En die Seedance-syfer hou nie

R2,62 vir 'n 5-sekonde greep is $0,0328/s. Die goedkoopste Seedance wat ek
vandag kan kry is $0,1028/s (480p, BytePlus direk). Die kodesyfer lê 3 tot 14
keer onder elke prys in die mark.

Dit kan wees dat die *mini* baie goedkoper is as Seedance 2.0 — ek kon nie 'n
prys vir die mini alleen kry nie. Maar dit beteken die graadtabel se aanname
dat "die goedkoopste en duurste dertien keer verskil" nagegaan moet word.

---

## 3. Wat dit kos om direk te gaan

### Video

| Roete | 720p | 1080p | 5s-greep, 720p |
|---|---|---|---|
| **Veo 3.1 Fast**, Google direk | $0,10/s | $0,12/s | R8,00 |
| **Veo 3.1 Standard**, Google direk | $0,40/s | $0,40/s | R32,00 |
| **Seedance**, BytePlus ModelArk direk | $0,2312/s | — | R18,50 |
| **Seedance**, Replicate | $0,2312/s | — | R18,50 |
| **Seedance**, fal.ai | $0,4730/s | — | R37,84 |

Twee dinge spring uit:

1. **Seedance is nie meer die goedkoop sport nie.** Veo Fast teen 1080p is
   goedkoper as Seedance teen 720p op elke platform. Die hele rede vir die
   "standard"-graad het verdwyn.
2. **fal.ai vra twee keer wat BytePlus vra vir dieselfde model.** As jy ooit
   Seedance wil hê, gaan direk of deur Replicate — nie fal nie.

ElevenLabs het op 10 September skriftelik gesê Seedance is net vir Enterprise,
nie vir Pro nie. Dit is aangeteken in `eleven.ts`. Direk gaan is die **enigste**
manier om Seedance te kry — en dit is nie meer die moeite werd nie.

### Prente

Nano Banana Pro (Gemini 3 Pro Image) direk: **$0,134** per 1K/2K prent,
$0,24 teen 4K. Die Batch API is ongeveer die helfte — maar met 'n 24-uur SLA,
wat vir omslagkuns nutteloos is, want dit moet dadelik terugkom.

Jy gebruik reeds die *lite*-model, wat goedkoper is. Lae prioriteit.

### Spraak, per miljoen karakters

| | Per miljoen karakters |
|---|---|
| ElevenLabs v3 / Multilingual v2 | $100 |
| ElevenLabs Flash v2.5 / v3 Conversational | $50 |
| Hume Octave | $50–$100 |
| Rime (≈ $0,030/min) | ≈ $39 |
| Cartesia | $38 |
| Deepgram Aura-2 | $30 |
| Speechify Simba 3.2 | $10 |

### Musiek

Google Lyria 3.5: ongeveer **$0,04 per minuut** — omtrent $0,08 vir 'n lied van
twee minute. Dit is die grootste enkele besparing op hierdie hele bladsy, **as**
die kwaliteit hou. Ek het dit nie gehoor nie.

Suno en Udio bly af. `app/lib/engines.ts` sê al hoekom: geen openbare API nie,
en die wrappers wat mense rondstuur skraap 'n private eindpunt.

---

## 4. Maar die 70% is nie video nie

Dit is die eerlike deel, en dit werk teen alles hierbo.

`docs/MAANDELIKSE-KOSTE.md` reël 212: **ElevenLabs Business is R18 216 van
R25 903,74 — 70,3%.** Daardie R18 216 is die **plan**, nie roepe nie. Jy kan
elke videogreep en elke omslag van ElevenLabs afhaal en daardie reël beweeg
nie een sent nie.

En die plan se vorm is die hele besigheid:

| Plan | Per maand | Gelykbreek | Plek vir |
|---|---|---|---|
| Pro | R1 822 | 35 lede | 35 lede |
| Business | R18 216 | 96 lede | 358 lede |

Op Pro sit die kredietdak *op* die gelykbreekpunt. Meer lede laat inteken maak
dit erger, nie beter nie. Dit is hoekom `MAANDELIKSE-KOSTE.md` sê Business is
die enigste plan wat ooit wins kan maak.

**Dít is waar 'n ander verskaffer werklik tel** — en nie soos jy sou dink nie.
Die punt is nie om per greep te bespaar nie. Dit is om **werk van die
kredietmeter af te haal**, sodat die dak self hoër lê. Elke omslag, elke
videogreep en elke lied wat deur ElevenLabs loop, eet uit dieselfde poel as die
spraak — en dit is daardie poel wat bepaal hoeveel lede jy kan dra.

Video en prente na Google toe skuif is dus nie 'n besparing van R1 per greep
nie. Dit is kapasiteit wat teruggegee word aan die ding wat regtig vashaak.

---

## 5. Wat ek sou doen, in hierdie volgorde

1. **Herstel die videoplafon** (afdeling 2). Dit is 'n oop gat van ongeveer
   59× in die begroting en dit het niks met 'n verskaffer te doen nie. Vinnig,
   en dit moet eerste omdat elke syfer hieronder daarvan afhang.
2. **Bou Veo direk by Google.** Nie om geld te bespaar nie — dit is binne 10%
   van wat ElevenLabs vra. Om te **weet wat dit kos**. Google publiseer die
   prys per sekonde en faktureer net geslaagde sekondes. Dit maak 'n
   43×-onsekerheid 'n getal. Die `Provider`-koppelvlak bestaan reeds, so dit is
   een lêer langs `eleven.ts`.
3. **Vergeet Seedance.** ElevenLabs verkoop dit nie op Pro nie, en direk is dit
   nie meer goedkoper as Veo nie.
4. **Luister na Lyria** voor jy iets aan musiek doen. Dit is die enigste reël
   met werklike geld daaraan.
5. **Moet nie die spraak opbreek nie** — nog nie. Sien hieronder.

---

## 6. Wat dit kos om op te breek, wat nie op 'n prysbladsy staan nie

ElevenLabs doen op **een sleutel**: spraak, stemkloning, oorklanking,
spraak-na-teks, geforseerde belyning, stemskeiding, musiek, video en prente.

Dit deur vyf verskaffers vervang beteken vyf rekeninge, vyf dinge wat stil kan
verval, en vyf verwerkersooreenkomste.

Daardie laaste een is nie 'n opinie nie — dit is 'n check:

> `scripts/check-verwerkers.mts` laat die build **misluk** die dag 'n
> verskaffer persoonlike data ontvang sonder dat hy op die privaatheidsbladsy
> genoem is. fal.ai staan reeds daarin geregistreer en wag, juis hiervoor.

En die regsoudit van 24 September het bevind dat 'n verskaffer wat video van 'n
**persoon** ontvang 'n antwoord oor POPIA artikel 72 nodig het voor 'n enkele
raampie gestuur word. Dit geld vir Google net soos vir fal.ai.

Dit maak nie enigiets hierbo verkeerd nie. Dit beteken net elke skuif is 'n
regsstap sowel as 'n kodestap, en die goedkoopste prys per karakter is nie die
hele prys nie.

---

## 7. En die stadige antwoorde

Jou eintlike klagte was dat ElevenLabs te lank vat om te antwoord. Dit is nie
'n klein ding nie: die R2,62-teenoor-R0,06-vraag staan al weke oop omdat 'n
faktuur met video daarop nodig is, en `MAANDELIKSE-KOSTE.md` noem daardie
e-pos "die belangrikste ding op enige lys".

Afdeling 2 hierbo beantwoord daardie vraag sonder hulle.

Dit is die sterkste argument op hierdie bladsy om weg te beweeg — nie prys nie,
en nie kwaliteit nie, maar dat 'n verskaffer wat sy prys publiseer jou nie laat
wag om jou eie begroting te ken nie.
