# Briefing vir Antigravity (of enige ander agent) — die look van FutureBox

**Paste hierdie hele lêer, of net die skakel daarna, as die eerste boodskap.**

Die eienaar, 11 Oktober 2026: *"Ek is mal oor wat ons al hierop gedoen het, maar jy
is net nie so goed met estetiese soos google nie."* Sy is reg. Hierdie lêer
bestaan sodat 'n agent wat beter is met die voorkoms kan inkom en help sonder
om stil-stil iets anders te breek.

---

## 1. Wat jy mag doen, en wat nie

**Doen:** die voorkoms. Spasiëring, tipografie, uitleg, kleur-keuses binne die
temastelsel, animasie, die gevoel van 'n kamer.

**Moenie:** pryse, krediete, wat 'n knoppie kos, hoeveel iets hef, veiligheid,
die kinderkamer se reëls, of enigiets wat 'n verskaffer bereik. Daardie
nommers is besluite wat die eienaar geneem het met die enjin se koste voor
haar — sien `private/KREDIETE.md`.

**Moenie na `main` stoot nie.** `main` is direk aan Vercel gekoppel: wat daar
land, is binne twee minute by betalende kliënte. Werk op die tak wat in
afdeling 1a staan.

---

## 1a. Waarheen jy stoot, en hoe die werk terugkom

Daar is twee agente aan hierdie projek en net een `main`. Daarom:

**Stoot alles na `antigravity/look`.** Net daardie tak. Nie `main` nie, en nie
`claude/*` nie.

```
git checkout -b antigravity/look origin/main
# … werk …
git push -u origin antigravity/look
```

Dit is nie 'n hoflikheid nie, dit is wat die terugbring moontlik maak. Met
alles op een genoemde tak is die hele estetiese werk 'n enkele ding wat
ingetrek, gebou, deur die 294 kontroles gestuur, en dan ontplooi kan word. Op
`main` ontplooi dit vóór die kontroles — en 'n `bg-white` wat 'n kamer swart
verf is dan al by die kliënte.

**Begin van `origin/main`, nie van 'n ou klone nie.** Hierdie projek kry
daagliks stote. Trek eers:

```
git fetch origin main && git rebase origin/main
```

**Stoot gereeld, nie een keer aan die einde nie.** Tien klein stote op
`antigravity/look` is tien keer makliker om in te trek as een groot een, en
as twee van ons dieselfde lêer aangeraak het, wys 'n klein stoot dit terwyl
dit nog 'n paar reëls is.

**Moenie `git push --force` gebruik nie** behalve op `antigravity/look` self,
en dan net as niemand anders dit uitgecheck het nie. Nooit op `main` of
`claude/*` nie.

---

## 2. Die een ding wat die meeste mense hier verkeerd kry

**`bg-white` is NIE wit nie.**

Die `@theme`-blok in `app/globals.css` wys `white` na `--fb-ink`, en `zinc-*` en `emerald-*` na
`--fb-surface-*` en `--fb-primary-*`. Op 'n ligte tema verf `bg-white` dus
**byna swart**. Dieselfde geld vir `bg-white/70`, `bg-white/5`, en elke ander
deursigtigheid daarvan.

**Die verstek-tema is sedert 12 Oktober 2026 donker: "Emerald Studio"**
(`surface: 'forest'`, smarag as aksent, siaan as tweede). Dit is die kamer
waarvoor jou "Dark Luxury Cyber-Emerald" geteken is, en dit is die rede
hoekom jou donker klasse nou donker lyk. Maar die reël hierbo staan steeds:
"Clean" (byna wit) is een druk weg in die Styl-ateljee, en elke klas wat jy
skryf word ook dáár geverf. Skryf dus steeds in tokens, nooit in hekse nie —
`check:theme` keer `bg-[#06140d]` en sy maats.

Dit is nie teorie nie: presies hierdie fout is vier keer gemaak, een keer drie
dae ná dit die eerste keer neergeskryf is.

**Die reël:** elke kleur gaan deur die familie — `zinc-*`, `emerald-*`,
`text-onAccent`, `scrim` — of deur `rgb(var(--fb-…))`. `check:theme` laat 'n
stoot misluk op 'n letterlike kleur in 'n `.tsx`, en die uitsonderingslys is
kort en elke inskrywing dra sy rede.

'n Kamer wat sy eie palet wil hê, skryf 'n blok in `app/globals.css` — kyk hoe
`[data-cubed]`, `[data-booth]`, `[data-cutroom]` en `[data-kidsroom]` dit doen
— en moet ook `body:has([data-…])` dek, want die werf se voetstuk is 'n
*sibling* van die bladsy en bly andersins wit onderaan 'n donker kamer.

---

## 3. Hoe jy weet jy het niks gebreek nie

```sh
npm install
npm run build      # ALTYD eerste
npm run checks     # 294 bron-toetse
```

Albei moet skoon wees. Die volgorde maak saak: van die toetse lees die gebou
bundel, en 'n ou bundel laat 'n toets slaag wat moes misluk het.

Daar is ook blaaier-toetse wat die regte app in Chromium oopmaak en goed druk.
Hulle loop in CI; plaaslik het hulle 'n bediener nodig:

```sh
npm install --no-save playwright
npm run build && npm start      # in een terminaal
npm run check:notcut            # in 'n ander
```

### Toetse wat spesifiek oor die VOORKOMS gaan

| Toets | Wat dit hou |
|---|---|
| `check:theme` | elke kleur volg die tema; geen letterlike kleur sonder 'n rede |
| `check:notcut` | geen naam of opskrif word afgesny — op 'n 390px foon **en** 'n 1512px skerm, in albei tale; geen paneel skuif sywaarts nie |
| `check:contrast` | elke stukkie teks teen wat werklik agter dit geverf is — elke kamer, elke oortjie, én die elf bladsye buite die ateljee (Cubed, die gids, hulp, die kinderkamer, storiemodus, die blog, regs, privaatheid, terme, die uitspraakhokkie); `check:contrastdark` is dieselfde loop op die donker tema |
| `check:wide` en `check:widetablet` | niks loop van die glas af nie — elke kamer en elke bladsy op 390px en op 1024px met 'n muis |
| `check:taalbladsye` | die bladsye buite die ateljee praat die taal wat gekies is, en net daardie een |
| `check:kappies` | hoofletters en opskrifte |
| `check:cardtone` | kaarte se toon bly dieselfde |
| `check:sideborder` | die rand langs die rol |
| `check:solidroom` | 'n kamer se vloer is solied, geen gradiënt |
| `check:reachable` | elke kontrole is bereikbaar |

Vinnig terwyl jy werk: `ONLY=pages node audit/contrast.mjs` en
`ONLY=pages node audit/wide.mjs 3091 390` loop net die bladsye buite die ateljee
(´n minuut in plaas van vier), en `SHOW=20` laat die kontrasloop meer as die
ergste vier etikette per skerm druk. Die volle loop is wat CI doen.

Daar is ook twee blaaier-toetse wat nie 'n `check:` naam het nie en met die
hand geloop word — `node audit/touch.mjs` (niks te klein om met 'n duim te
druk nie, op 'n iPhone-profiel) en `node audit/a11y.mjs` (elke kontrole het
'n naam wat 'n skermleser kan sê). Albei het 'n lopende bediener nodig.

As jy die voorkoms verander en een van hierdie word rooi, is dit nie 'n
irriterende toets nie — dit is die een wat keer dat die verandering iemand
anders se skerm breek.

---

## 4. Waar die redes staan

Byna elke lêer begin met 'n kop wat sê **hoekom** dit so is, dikwels met
Die eienaar se eie woorde en die datum. Lees dit voor jy iets verander wat vreemd
lyk; dit is gewoonlik vreemd omdat iets anders al een keer verkeerd geloop
het.

- `private/KREDIETE.md` — die hele prys lys, gegenereer uit die kode
- `docs/SAFETY-REVIEW.md` — wat die app oor homself beweer, met die tellings
- `app/lib/theme.ts` — hoe 'n tema gebou word, en die kontras-rekenkunde
- `app/globals.css` — die kamers wat hul eie palet dra
- `app/lib/surfaces.ts` — elke kamer en waarvoor dit is

---

## 5. Vier dinge wat al verkeerd geloop het, sodat dit nie weer hoef nie

1. **Haar eie kunswerk is nie joune om oor te teken nie.** Vier logo's is
   geteken en weggegooi voordat haar eie lêer ingegaan het. 'n *Trace* van
   haar lyne is 'n ander tekening wat soos hare lyk. Sny en 'n agtergrond
   afhaal is goed; herteken is nie.

2. **'n Kamer wat 20px wyer as sy paneel is, laat die paneel sywaarts rol** en
   eet die eerste letter van elke reël. Dit lyk presies soos die navigasie wat
   die teks bedek, en is dit nie. Gemeet, nie geraai nie.

3. **'n Opskrif in 'n *flex* ry sonder `flex-shrink-0`** word tot die breedte
   van sy langste woord gedruk en breek middel-in. Op 'n foon wys dit nie; op
   'n skerm wel.

4. **'n Toets wat net 'n foon meet, is groen terwyl die skerm stukkend is.**
   Dit het 'n week lank gebeur. Meet albei.

---

## 5a. Een ding wat op 11 Oktober geleer is

Die **Simple / Everything**-knoppie bo in *Make a song* en op die videolessenaar
staan bo-aan die kamer, buite elke kaart, omdat die eienaar so gevra het. Moenie dit
terug in 'n kaart skuif nie, en moenie die kamers se "Simple" verander om weer
kaarte te wys nie: Simple is die copilot, een knoppie en 'n vier-reël opsomming.

Die rede dit hier staan: ses-en-twintig blaaier-probes was agt commits lank rooi
omdat hulle vir die ou uitleg geskryf is en niemand hulle vertel het die kamer
het geskuif nie. As jy 'n kamer se vorm verander, sê dit in die commit-boodskap
— dan weet die volgende een wat die probes regmaak waar om te kyk.

---

## 5b. Ses dinge wat op 12 Oktober geleer is, uit die eerste saamvoeging

Die eerste tak van Antigravity is op 12 Oktober ingetrek. Die sjablone, die
doekgroottes en die uitvoer-vlakke is ingeneem en werk; die res is
uitgelaat, en dít is hoekom:

1. **Geen fasades nie.** Twee skerms het die ProBooth vervang — 'n
   "studio console" en 'n DAW, 2 600 reëls, uit verwysingskermskote gebou.
   Nie een het iets geroep nie: "Generate Stem" en "Convert Voice" was
   knoppies wat niks doen nie, terwyl die regte stems en stemomskakeling
   agter 'n terugknoppie weggesteek was. 'n Knoppie wat niks doen nie is
   erger as geen knoppie nie. As iets nie 'n roete het nie, bou dit nie.
2. **Moenie die probes om die werk lei nie.** Dieselfde tak het
   `window.location.pathname.includes('proboothprobe')` gebruik sodat die
   probe die ou kamer sien en lede die nuwe een kry. Dit is presies die
   fout wat die hele toetsstel bestaan om te vang: 'n groen kontrole wat
   iets anders meet as wat die lid sien. Nooit.
3. **'n Lêer wat nêrens gemonteer is nie, is nie 'n funksie nie.** Agt nuwe
   komponente is deur niks oopgemaak nie. `check:deadexports` vang dit in
   `app/lib`; vir komponente lees ons die invoere. Monteer dit, of los dit.
4. **Niks persoonliks in die bewaarplek nie.** Geen `C:\Users\…`-paaie in
   kontroles nie, geen eie naam as 'n vorm se verstekwaarde nie, geen
   oorhandigingsdokument met lêerskakels na jou skootrekenaar nie. Skryf die
   oorhandiging in die commit-boodskap; dit reis saam met die kode.
5. **Hou `package-lock.json` by `package.json`.** Die slotlêer het 'n
   afhanklikheid geskuif terwyl `package.json` dieselfde gebly het, en
   `npm ci` op die bediener sou geweier het. Loop `npm install` en stoot
   albei, of nie een nie.
6. **Geen Afrikaans in die opmaak nie — net in die woordeboek.** Die
   Cubed-kamer het "Winsverdeling", "Klasfooi", "Katalogus van
   Masterclasses" en "Ooreenkoms vir Gassprekers" reguit in die JSX gehad,
   en die Engelse leser het dit so gekry. Elke woord wat 'n leser sien gaan
   deur `t('sleutel', 'English fallback')` met 'n `af`-ry in
   `app/lib/i18n.tsx`; `lang === 'af' ? … : …` in die opmaak is ook nie die
   manier nie. `check:taalvas` lees elke kamer daarvoor.

En wat wél reg was, sodat dit herhaal word: die twee modale het hul eie
`t()`-sleutels met Afrikaans gehad, die prysverandering het die kontrole
wat dit meet saam geskuif, en die Windows-regstellings aan die probe-bediener
kos niks op Linux nie. Dit is hoe 'n tak lyk wat ingetrek kan word.

---

## 6. Wat om te doen as jy dink 'n reël is verkeerd

Sê dit, met die nommer. Elke reël hier is 'n keuse wat iemand gemaak het en
neergeskryf het, en 'n paar van hulle is al verander toe iemand 'n beter rede
gehad het. Wat nie werk nie, is om die reël stil te omseil — want die toets
vang dit, en dan lyk dit of jou verandering gebreek is terwyl dit eintlik net
botsend is.
