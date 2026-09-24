# Regsoudit — 24 September 2026

Gevra voor die oorhandiging aan Vibefy Code. Dit is die eerste keer dat die
regskant in sy geheel nagegaan is eerder as stuk vir stuk.

**Wat hierdie bladsy is:** wat gevind is, wat reggemaak is, en — die
belangrikste deel — **wat net jy of 'n prokureur kan doen.** Kode kan nie 'n
ooreenkoms teken nie.

---

## Die vorm van wat gevind is

Nie een van die gate was 'n slordige stuk werk nie. Elkeen was 'n eerlike
funksie wat gebou is ná die regsbladsye geskryf is, en niemand het gedink om
dit teen 'n privaatheidsbeleid te hou nie.

Dit is die punt, en dit is hoekom drie nuwe reëls in `check:verwerkers` staan:
**die gat is nooit geskryf nie, dit het opgehoop.** Dis nie iets wat 'n mens
met deurlees vang nie; dis iets wat 'n lys vang.

---

## 1. Vier verwerkers wat niemand benoem het

Die privaatheidsbeleid het 'n lys onder "Who else sees it" met ses name.
Die bediener stuur persoonlike inligting na **tien**.

| Ontbreek het | Wat dit kry |
|---|---|
| **Kits.AI** | 'n opname van die lid wat **sing** |
| **Music.ai** | hulle klank, om akkoorde en toonaard uit te lees |
| **Resend** | hulle e-posadres, en die brief self |
| **Kling** | wat hulle getik het om 'n snit te beskryf |

'n Stem is **spesiale persoonlike inligting** onder POPIA — die bladsy sê dit
self, twee afdelings bo die lys waaruit dit ontbreek het.

**Reggemaak.** Al vier staan nou op die bladsy, met wat elkeen kry.

## 2. Tien soorte rekord wat nêrens beskryf was nie

Die databasis hou **39 tabelle wat rye aan 'n persoon koppel**. Die beleid het
omtrent twaalf soorte beskryf.

Die skerpste: **`cast_members` — foto's van mense se gesigte.** Opgelaai deur 'n
lid, gehou in 'n emmer, en na ElevenLabs gestuur om geanimeer te word. Die
woord "photograph" het nie op die bladsy verskyn nie. Nòg "face".

Die ander nege: wie met wie saamwerk en die sosiale skakels wat hulle deel,
wie wie se live-skakel gerapporteer het, wat in die live-kamer gepos en gelike
is, bodgeskiedenis op album-kuns, die pos-tou, uitspraakverslae, en
kompetisie-inskrywings.

**Reggemaak.** Almal staan nou daar, in die bladsy se eie stem.

## 3. Die een wat nie met kode reggemaak kan word nie

> **'n Lid se stem gaan na 'n tweede buitelandse verwerker, en daar is geen
> ooreenkoms op lêer nie.**

Die afdeling "What happens to a recording once it leaves here" is heeltemal
oor ElevenLabs geskryf, toe ElevenLabs die enigste plek was waarheen 'n
stemopname gegaan het. Dit is nie meer so nie.

| | ElevenLabs | Kits.AI |
|---|---|---|
| Kry 'n opname van die stem | ja | ja |
| Getekende DPA | **ja** | **nee** |
| Bewaartermyn gestel | ja, drie jaar | **nee** |
| POPIA 72-basis vir die oordrag | ja, SCC's | **nee** |

`docs/KITS-TERME.md` teken nie een van die drie aan nie, want daar is nie een
nie.

**Wat gedoen is:** die bladsy sê dit nou **hardop**, by die naam, voor die
knoppie waarop dit van toepassing is — watter enjin 'n ooreenkoms het en
watter nie, en dat iemand wat hulle stem net na die een wil stuur, die
sangomskakeling moet los. Om die paragrawe stilweg te verbreed na "die
stem-enjins" sou geïmpliseer het dat dieselfde ooreenkoms albei dek. Dit doen
nie.

**Wat oorbly — joune of 'n prokureur s'n:**

1. **Kry 'n verwerkersooreenkoms by Kits.AI**, of hou op om stemme daarheen te
   stuur. Dit is die enigste item op hierdie bladsy wat spesiale persoonlike
   inligting raak.
2. Dieselfde vraag vir **Music.ai, Resend en Kling**. Minder skerp — 'n
   e-posadres is nie 'n stem nie — maar POPIA 72 vra 'n basis vir elkeen.
3. **Registreer die Inligtingsbeampte** by die Inligtingsreguleerder. POPIA
   vra dit; `FUTUREBOX_LEGAL_INFORMATION_OFFICER` wag reeds in Vercel.

---

## Wat reeds reg was, en beter as verwag

Dit hoort ook hier, want 'n oudit wat net gate lys, lieg deur weglating.

- **ECTA 43** is deurdag gedoen. `app/lib/server/entity.ts` en `/legal` dra die
  besonderhede, die waardes leef in Vercel eerder as in die repo, en waar een
  ontbreek sê die bladsy dit eerlik in plaas van 'n plekhouer te wys.
- **Die adres bly leeg met opset**, en die bladsy sê hoe om dit te kry. 'n
  Onvolledige-en-eerlike bekendmaking en 'n volledig-lykende-en-valse een is
  nie dieselfde mislukking nie.
- **ElevenLabs se OEM-terme** is nagegaan teen veertien dokumente, en die drie
  goed wat hulle van ons eis staan op die termebladsy.
- **18+ vir stemfunksies**, sonder ouertoestemming-uitsondering, want hulle
  reël het nie een nie.
- **Weiering-aantekening** is beperk tot die reël, die plek, die tyd en 200
  karakters, en dit is verklaar.

---

## Wat hierdie oudit **nie** kon doen nie

**Die wetteks self is nie geverifieer nie.** Die sessie se netwerk blokkeer
gov.za, die ITU se kopie van die Wet, en elke prokureursfirma se opsomming
daarvan. Alles hierbo oor ECTA 43 en POPIA 72 kom uit wat die repo self
aanteken — en die repo se aantekeninge is deeglik — maar **niemand het die
genommerde lys teen die Staatskoerant gehou nie.**

Dit is nie 'n klein voorbehoud nie. Voor 'n regte bekendstelling moet 'n
prokureur bevestig dat die vyf rye op `/legal` die volle s43(1)-lys is en nie
vyf van sewe nie.

Twee verdere dinge wat 'n prokureur moet sien, en wat kode nie kan besleg nie:

- **Die kommersiële lisensie.** Die termebladsy sê dat ons glo die
  ElevenLabs-lisensie strek deur na die lid, en dat ons dit nie plat sal stel
  voor dit skriftelik is nie. Dit is die regte posisie en dit is nog steeds 'n
  wedstryd op iemand anders se kontrak.
- **Die CPA se afkoelreg.** Niks op enige bladsy noem dit nie, en dit is die
  soort ding wat 'n oudit vind deur te vra en nie deur te grep nie.

---

## Wat die checks nou hou

`check:verwerkers`, elke reël eers op die egte fout laat faal:

1. Elke verskaffer wat persoonlike inligting kry, is op die bladsy benoem.
2. Een wat 'n **stem of 'n gesig** kry sonder 'n ooreenkoms, word by die naam
   as sodanig genoem — nie net in die lys gelys nie.
3. Elke soort rekord wat gehou word, is beskryf.
4. En geen tabel koppel rye aan 'n persoon sonder dat iemand daaroor besluit
   het nie. Voeg een by `supabase/` en nie by die kaart nie, en dit word rooi.

**fal.ai is vooraf geregistreer.** Die video-redigeerder se filters is geprys
en op elke planskaart genoem, en fal.ai is die enjin daaragter. Niks bel dit
nog nie. Die dag wanneer iemand daardie `fetch` skryf, word hierdie check rooi
totdat die privaatheidsbladsy 'n reël daarvoor het — want video van 'n persoon
se gesig is so persoonlik as wat dit kom.
