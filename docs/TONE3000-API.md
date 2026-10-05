# TONE3000 — die API, soos hulle dit dokumenteer

Afgeskryf op 5 Oktober 2026 van `tone3000.com/api`, wat van die bou-omgewing
af nie bereikbaar is nie (die proxy weier dit met 'n 403). Die
ontwerpvereistes staan apart in `TONE3000-ONTWERPVEREISTES.md`.

**Die hele OAuth-ketting is hier** — authorize, callback, token exchange.
Wat nog ontbreek is die toon-endpoints self, en dit staan onderaan.

---

## Die besluit wat alles anders maak: Select

Hulle bied drie integrasies, en al drie gee dieselfde access token:

| | wat dit is | wie dit bou |
|---|---|---|
| **Select** | die persoon blaai en kies 'n toon **binne TONE3000 se eie koppelvlak** | hulle |
| **Load Tone** | ons gee 'n `tone_id`; hulle verifieer toegang en bied 'n plaasvervanger as dit weg is | hulle |
| **Full API Access** | ons bou alles self — eie bladerder, biblioteek-sinkronisasie, model-bestuur | ons |

Hul eie woorde oor Select: *"Zero auth UI or tone browser to build."*

**Dit is ons keuse, en dit sny die werk in die helfte.** Die ontwerpvereistes
2, 3 en 4 — die partnership splash, die sesyfer-kode-aanmelding, en die
tone list views met al ses velde per toon — is **hul skerms** in die Select
flow. Ons bou hulle nie en ons kan hulle nie verkeerd kry nie.

Wat ons kant toe oorbly is skraal:

- **vereiste 1**, die ingang: 'n "Browse TONE3000"-knoppie waar iemand 'n amp
  op 'n baan kies, met die T3K-merk daarop
- **vereiste 5**, die gelaaide toon in die signal block: die prentjie, die
  merk, en waar daar plek is die titel, gear type, formaat en maker
- **vereiste 6**, die besonderhede-bladsy met die model-kieser — as ons dit
  self wys eerder as om terug na hulle te stuur
- **vereiste 7**, die logo-volgorde: die volle logo voor die kort merk

## Authentikasie

OAuth 2.0 met **PKCE**. Twee sleutels, uit hul settings-bladsy:

**`client_id`** — die publishable key. Veilig in kliëntkode, mobiele apps en
'n browser. Dit is die blywende identifiseerder van die toepassing en oorleef
die herroeping van die geheim.

**`t3k_cs_…`** — die secret key. Hul eie woorde: *"Treat it like a database
password."* Slegs bediener-kant, as `Authorization: Bearer t3k_cs_…`. Nooit
in 'n mobiele binary of enigiets wat 'n toestel bereik nie.

### Maar ons kry nooit een nie, en dit is belangrik

Carli het op haar settings-bladsy gaan soek en niks gevind. Sy het reg
gesoek — daar is niks om te vind nie, en my eerste opstel-gids het verkeerdelik
vir een gevra.

Die secret key hoort aan **Full API Access**: bediener-tot-bediener, ons eie
bladerder, niemand teken in nie. Ons het **Select** gekies. Daardie vloei is
OAuth met PKCE, en PKCE bestaan juis sodat 'n kliënt wat **nie** 'n geheim kan
bewaar nie, die vloei veilig kan doen. Die afdeling oor die ruil hieronder sê
dit al: net die publishable key, geen geheim nie.

Dit het 'n gevolg wat verder gaan as een ontbrekende veranderlike.

**TONE3000 het geen rekening-sleutel nie.** Elke oproep dra 'n **persoon** se
token, wat uit háár aanmelding kom. Die seam se vorm neem tot nou aan dat elke
verskaffer een sleutel in die omgewing het — `key()` lewer hom en `ready(what)`
is `Boolean(serves(what).key())`. Vir TONE3000 is daar niks vir `key()` om te
lewer nie, wat beteken `ready('…')` sou **vir altyd vals** wees terwyl die
verskaffer heeltemal werk. Dit is 'n kamer wat stil van die lug af bly, wat
presies die soort stilte is waarvoor die checks hier bestaan.

Dus is die TONE3000-inskrywing **nie** net 'n ry in `SUPPLIERS` nie. Hy het 'n
manier nodig om te sê *"my geloofsbriewe kom per persoon"*, en `ready()` moet
daardie geval beantwoord met iets anders as 'n leë sleutel. Dit word geskryf
saam met die inskrywing, met 'n check wat dit uitvoer — nie nou geraai nie.

Wat wel vasstaan: hul header is `Authorization` en die skema is `Bearer `, en
daardie skema hoort in `keyPrefix` en **nie** binne-in `key()` nie. Dit was
eers binne-in geskryf, wat korter lyk. Dit is verkeerd omdat 'n per-persoon-token
nie deur `key()` loop nie — hy kom as 'n argument in. Ons eie sleutel sou
`Bearer ` dra en elke lid se token nie, op die een pad wat 'n mens nie kan
toets voordat daar 'n lid is nie. `check:seam` weier nou 'n verskaffer wat
`Authorization` gebruik sonder sy eie `keyPrefix`.

Die `client_id` is 'n ander ding: 'n publishable key, veilig in 'n browser, en
die enigste ding wat sy in Vercel hoef te sit.

## Die authorize-oproep

`GET https://www.tone3000.com/api/v1/oauth/authorize`

Dit antwoord met 'n redirect, nie 'n body nie.

**Verpligtend:** `client_id`, `redirect_uri` (slegs geregistreerde een as daar
geregistreer is), `response_type=code`, `code_challenge` (SHA-256 van die
`code_verifier`, base64url), `code_challenge_method=S256`, en `state` — 'n
ewekansige waarde wat terugkom sodat ons weet die antwoord is eg.

**`prompt`** bepaal watter flow loop: weggelaat is gewone authorisasie,
`select_tone` is Select, `load_tone` verg ook 'n `tone_id`.

**Opsioneel, en drie daarvan wil ons hê:**

- `menubar=true` — 'n navigasiebalk met terug, vorentoe, herlaai en toemaak.
  Hulle beveel dit aan vir in-app browsers en popups, wat presies is wat ons
  gebruik.
- `preview=true` — spelers sodat iemand 'n toon kan **hoor** voor hy kies.
  Demo-klank, geen lewendige inset, werk in enige enjin met AudioWorklet.
  Vir 'n app waar die hele punt is hoe iets klink, is dit nie opsioneel nie.
- `locale` — die taal van hul skerms. Let op: *"Browser Accept-Language is
  ignored — you must pass this explicitly."* Ons weet watter taal sy gekies
  het; ons moet dit deurgee of hulle wys Engels.

Die res filter die katalogus: `gears`, `format`, `architecture`
(1, 2 of custom — en weglaat sluit A2 **uit**, 'n erfenis-verstek), en
`calibrated=true`.

## Die plafon, wat hulle uit hul eie opper

**100 versoeke per minuut.** Vir produksie: `support@tone3000.com`.

Dit is die moeite werd om op te let. Dit is presies die vraag wat ElevenLabs
al drie briewe lank nie beantwoord nie, en TONE3000 het dit in hul
inleidingsbladsy gesit sonder dat iemand hoef te vra.

## Kontak

`support@tone3000.com` — vir vrae, foute, en vir 'n hoër plafon.

## Die ketting, van begin tot token

**1. Stuur haar daarheen.** 'n `code_verifier` word gemaak, die
`code_challenge` is die SHA-256 daarvan in base64url (met `+` → `-`,
`/` → `_`, en die `=` afgehaal), plus 'n ewekansige `state`. Albei word
gestoor, en dan `window.location.href` na die authorize-adres.

**2. Die callback.** Hulle stuur terug na ons `redirect_uri` met:

| | |
|---|---|
| `code` | kortlewend, word vir tokens geruil |
| `state` | moet pas by wat ons gestuur het — **verifieer dit voor enigiets anders** |
| `tone_id` | **teenwoordig by sukses** vir `select_tone` en `load_tone` |
| `error` | by mislukking, bv. `access_denied` |

Daardie `tone_id` is die antwoord op die vraag wat ek gevra het: ná Select
kom die gekose toon se id in die adres terug. Ons hoef nie daarna te soek
nie.

Die `state`-toets is nie seremonie nie — dit is wat 'n CSRF-aanval keer, en
hul voorbeeld gooi daarop eerder as om aan te gaan. Ons ook.

**3. Die ruil.** `POST https://www.tone3000.com/api/v1/oauth/token`,
`application/x-www-form-urlencoded`, met `grant_type=authorization_code`,
die `code`, die `code_verifier`, dieselfde `redirect_uri`, en die
`client_id`. Terug kom `access_token`, `refresh_token` en `expires_in`.

Let op: die ruil gebruik **net die publishable key**. Geen geheim nie. Dit
is 'n publieke-kliënt PKCE-vloei soos dit bedoel is.

Wat die ruil teruggee: `access_token`, `refresh_token`, `token_type`
(altyd `bearer`), `expires_in` in sekondes, en `scope`.

## Die Device-vloei, wat ons nie gebruik nie

Hulle dra ook die standaard OAuth Device Authorization Grant (RFC 8628) —
'n kort kode op 'n skerm, die persoon tik dit by `tone3000.com/activate` in,
en die toestel poll vir tokens.

**Dit is nie vir ons nie**, en dit is die moeite werd om op te teken sodat
niemand later daarna gryp nie. Dit is vir ingebedde hardeware, koplose Linux
en plugin-gashere wat **nie 'n browser kan oopmaak nie**. FutureBox is 'n
webtoepassing; ons het altyd 'n browser.

En die beslissende punt: die Device-vloei is **net aanmelding**. Hulle sê dit
uitdruklik — dit aanvaar nie `prompt` nie, so daar is **geen Select** nie.
Die hele rede ons hierdie vloei kies is dat hulle die bladerder bou. Device
sou daardie werk terug op ons sit.

## Die een ding in hul voorbeeld wat ons nie naboots nie

Hul voorbeeldkode hou die `code_verifier` in `sessionStorage` en doen die
token-ruil **in die browser**, wat beteken die `access_token` én die
`refresh_token` beland daar. Hul Session Management-afdeling doen dit weer:
`sessionStorage.setItem('t3k_refresh_token', …)`.

En let op wat die prosa langs daardie voorbeeld sê: *"Store the access token,
refresh token, and expiration time **securely**."* Die woorde en die
voorbeeld stem nie ooreen nie. Ons volg die woorde.

Vir 'n suiwer kliënt-kant app is dit die regte voorbeeld. Vir ons is dit
nie, en nie uit netheid nie: enige XSS lees `sessionStorage`, en 'n
`refresh_token` is nie 'n sessie wat oor 'n uur verval nie — dit is
blywende toegang tot iemand anders se TONE3000-rekening.

Ons het bedienerroetes. Die ruil hoort daar:

- die `code_verifier` en die `state` word bediener-kant gehou, teen haar
  rekening, nie in die browser nie
- die `redirect_uri` wys na 'n roete van ons, wat die `code` ontvang
- die `access_token` en `refresh_token` word bediener-kant gestoor, soos
  elke ander verskaffer se sleutel in hierdie app
- die browser kry 'n `tone_id` en 'n lêer, nooit 'n token nie

Dit is dieselfde reël wat `callerFrom` en `suppliers.ts` al dra: niks wat 'n
toestel bereik, hou 'n sleutel nie. Dit kos ons een ekstra roete en dit haal
'n hele klas fout weg.

## Select, stap vir stap

**1.** Die authorize-adres met `prompt=select_tone`. Die katalogus kan beperk
word met `gears`, `format` en `architecture`, en die filter word dan
**gesluit** op ons keuse — die persoon sien net wat ons app kan laai. Vir
ons: NAM-modelle wat `lib/nam.ts` kan laat loop.

Let op `architecture`: weglaat gee die **erfenis**-stel, A1 plus Custom, en
sluit **A2 uit**. Dit is met opset — API-gebruikers van voor A2 kry nie
modelle wat hulle nie kan laai nie. Ons moet dus uitvind wat ons NAM-weergawe
kan laai en dit uitdruklik vra, eerder as om die verstek te vat en te wonder
hoekom helfte van die katalogus ontbreek.

**2.** Hulle hanteer aanmelding, blaai en keuse. Die persoon sien die hele
publieke katalogus **plus sy eie private tone**.

**3.** Die callback dra `code`, `state` en `tone_id`.

**En die geval wat 'n mens misloop:** as `menubar` aan is en die persoon druk
toemaak, kom `canceled=true` terug **in plaas van** 'n `tone_id`. Daar is dan
twee subgevalle:

- hy het al ingeteken → daar **is** 'n `code`, en dit kan steeds vir tokens
  geruil word
- hy het toegemaak voor aanmelding → **geen** `code`

Dit is drie uitkomste waar 'n mens twee sou kode: gekies, gekanselleer-maar-
ingeteken, en weggeloop. Die middelste een is die een wat stilweg verkeerd
loop — 'n app wat `canceled` sien en net terugkeer, gooi 'n geldige token weg
en vra die persoon môre weer om in te teken.

**4.** Ruil die `code` vir 'n token, en gebruik dan die `tone_id` om die
toon se besonderhede en **die model se aflaai-adresse** te kry.

## Load Tone

Vir wanneer ons reeds weet watter toon ons wil hê. Ons gee 'n `tone_id` met
`prompt=load_tone`; hulle verifieer toegang. As die toon privaat of
uitgevee is, kan die persoon 'n plaasvervanger kies, en ons kry die uitslag
so of so.

Wie deurkom sonder om te blaai: **publieke** tone, tone wat die persoon
**besit**, en tone wat hy **gefavourite** het. Dit is die moeite werd om te
weet — 'n toon wat sy nie gefavourite het nie, kan môre 'n blaai-skerm wees
eerder as 'n laai.

**En die val:** as sy 'n plaasvervanger kies, kom daardie een se `tone_id`
in die callback terug — **nie die een wat ons gevra het nie.** Hul eie
woorde: *"The tone_id in the callback will be the newly selected tone, not
the one you originally requested."*

'n App wat aanneem die antwoord is die vraag, stoor die verkeerde amp op die
baan. Die reël is dus: **lees altyd die `tone_id` uit die callback**, nooit
die een wat ons gestuur het nie. Dit is 'n reël wat 'n `check:` werd is
sodra dit gebou is, want dit breek stil — die baan kry 'n amp wat werk, net
nie die een wat sy gekies het nie.

**En een ding wat Load Tone nie het nie:** `preview`. Select neem dit;
Load Tone nie. Dit maak sin vir die gewone pad — daar is niks om te oudisie
as ons reeds weet watter toon ons wil hê nie — maar dit geld ook vir die
**plaasvervanger-blaai**. As haar amp weg is en sy moet 'n ander kies, kan
sy dit nie hoor nie, terwyl sy dit in Select wel kan.

Dit is 'n klein gat op die slegste oomblik: sy het 'n amp verloor en moet
blind kies. Die moeite werd om vir hulle te noem, want dit lyk soos 'n
oorsig eerder as 'n besluit.

**Dit is die een wat ons tweede nodig gaan hê**, en nie dadelik nie: dit is
hoe 'n amp wat sy gister op 'n baan gesit het môre weer laai. `lib/amps.ts`
hou die capture, maar 'n toon wat die maker intussen privaat gemaak het, is
'n lêer wat nie meer laai nie — en hierdie vloei is hul antwoord daarop.

## Verfris

Dieselfde token-endpoint, met `grant_type=refresh_token`, die
`refresh_token`, en die `client_id`. Terug kom 'n nuwe `access_token` **en 'n
nuwe `refresh_token`** — dus 'n roterende verfris-token: die ou een word
vervang en moet oorgeskryf word, nie langs die nuwe een gehou nie.

Dit is nog 'n rede waarom dit bediener-kant hoort. 'n Roterende token wat in
twee blaaie tegelyk verfris word, verloor 'n wedloop; een plek wat dit hou,
nie.

'n `400` met `error: invalid_grant` op die verfris beteken die
`refresh_token` het verval. Dan word die gestoorde tokens uitgevee en die
hele authorisasie begin oor. Hulle sê self: *"handle this gracefully so
users aren't left in a broken state."* Vir ons is dit 'n bekende vorm — dit
is `loadFilm`'s `broke` weer: 'n leesfout wat as "niks hier nie" gelees word,
is die fout wat vanoggend 'n film gekos het. 'n Verlopte token is nie 'n
persoon sonder 'n TONE3000-rekening nie, en die kamer moet dit anders sê.

## Hoe 'n gewone oproep lyk

`Authorization: Bearer <access_token>` op elke versoek, en die vervaltyd
word **voor** elke oproep nagegaan en proaktief verfris.

Die eerste endpoint wat hulle noem is `GET https://www.tone3000.com/api/v1/user`.

Dit pas presies in die seam: `suppliers.ts` sit die auth-header op en is die
enigste plek wat dit doen. Die verskil met ElevenLabs is dat die token hier
**per persoon** is eerder as een rekeningsleutel — die seam sal 'n token per
oproep moet kan aanvaar eerder as een uit die omgewing te lees. Dit is 'n
klein uitbreiding van `call()` en dit is die eerste egte toets of daardie
laag reg ontwerp is.

## Die endpoints, soos hulle kom

Almal met `Authorization: Bearer <access_token>` en
`Content-Type: application/json`, teen `https://www.tone3000.com/api/v1`.

| endpoint | wat dit gee |
|---|---|
| `GET /user` | die ingetekende persoon. Tipe: `User` |
| `GET /users` | mense met publieke inhoud. `PaginatedResponse<PublicUser[]>`. Sorteer met `sort` (verstek `tones`), met `page`, `page_size` (maks **10**) en `query` oor die gebruikersnaam |
| `GET /tones/created` | tone wat die persoon **gemaak** het. `PaginatedResponse<Tones[]>` |
| `GET /tones/favorited` | tone wat hy **gefavourite** het. Dieselfde vorm |
| `GET /tones/downloaded` | tone wat hy **afgelaai** het. Duplikate word saamgevou, so elke toon verskyn een keer |

| `GET /tones/{id}` | **een** toon. Publieke tone vir enige ingetekende persoon; privates net vir die eienaar of iemand wat dit gefavourite het |

| `PUT /tones/{id}/favorite` | favourite namens die persoon. **Idempotent** — 200 of dit nou geskep is of al bestaan het. Net publieke tone, of tone wat hy besit |

Daardie `PUT` maak iets moontlik wat ek 'n uur gelede gesê het ons nie kan
doen nie: ons kán van ons kant af favourite. En dit is meer werd as dit
lyk — 'n **privaat** toon is net leesbaar vir die eienaar of iemand wat dit
gefavourite het, so 'n favourite is nie 'n sentiment nie, dit is hoe toegang
behou word. Wanneer sy 'n amp op 'n baan sit, is dit die oomblik om dit te
favourite, anders is dit môre dalk weg.

Idempotent beteken ons hoef nie eers te vra of dit al gedoen is nie. En
`DELETE` op dieselfde adres haal dit af — ook idempotent, 204 of dit daar
was of nie.

## Die endpoint wat ons NIE moet gebruik nie

Daar is 'n `Search Tones`. Hul eie woorde daaroor:

> *"This endpoint is heavily rate-limited by default... We highly recommend
> using the Select OAuth flow for tone browsing and search rather than this
> endpoint."*

Dit maak die Select-keuse meer as gerieflik — dit is wat hulle wil hê, en 'n
eie bladerder sou teen 'n plafon loop wat hulle met opset laag gestel het.

Dit los ook ontwerpvereiste 4 netjies op. Die drie oortjies — Created,
Favorited, Downloaded — is gewone endpoints teen die gewone 100 per minuut,
so dít wys ons self. Vir enigiets anders stuur ons haar deur Select, wat
presies is wat die vereiste vra: *"Always provide a clear, persistent path
to browse the full TONE3000 catalog via the Select flow. Suggested and
recent tones are a starting point, not a substitute."*

Met ander woorde: die vereiste en die plafon sê dieselfde ding.

Vir die rekord dra `GET /tones/search` wel 'n ryk stel filters — `query`,
`sort`, `gears`, `sizes`, `tags`, `makes`, `creators`, `format`,
`architecture`, `calibrated`, `verified`, en `page_size` tot **25**. Ek skryf
hulle nie hier uit nie, want ons gaan dit nie gebruik nie, en 'n lys
parameters vir 'n endpoint wat ons vermy is ruis wat eendag soos 'n plan sal
lees. As dit ooit nodig word, staan dit op hul bladsy.

## Trending

`GET /tones/trending` — die top **10**, dieselfde voer as die trending-bane
op hul tuisblad. **Nie gepagineer nie**, hoogstens tien, met 'n opsionele
gear-filter.

Dit is goedkoop en dit is presies wat ontwerpvereiste 4 se *"query and render
trending and latest tones from the API to help users discover new tones"*
vra. Tien tone op die amp-kieser se eerste skerm, met die blywende "Browse
TONE3000"-knoppie daaronder, is die hele vereiste nagekom sonder om naby die
soek-endpoint te kom.

Daardie laaste reël stem ooreen met wat Load Tone se stap 2 sê, en dit is
'n ding om te onthou as 'n amp môre nie laai nie: die toon het nie
verdwyn nie, die **favourite** is dalk weg.

Al drie tone-lyste neem dieselfde navrae: `page`, `page_size` (verstek 10,
maks **100** — tien keer meer as die gebruikerslys), `gear` (een waarde, bv.
`amp-cab`; weglaat gee alle tipes), en `query`, 'n hoofletter-onafhanklike
substring op die **titel**, wat met `gear` kombineer.

`GET /user` is wat ontwerpvereiste 4 se *"the signed-in user's avatar and
username"* voed, en `GET /tones/created` is die **Created**-oortjie.

## Die hele ketting, end tot end

Niks blokkeer meer nie:

1. **Select** — sy word na TONE3000 gestuur met `prompt=select_tone`,
   `menubar=true`, `preview=true` en haar taal in `locale`. Hulle hanteer
   aanmelding, blaai en keuse.
2. **Die callback** kom by 'n roete van ons uit met `code`, `state` en
   `tone_id`. Die `state` word eerste getoets; `canceled=true` is 'n derde
   uitkoms wat steeds 'n `code` kan dra.
3. **Die ruil** gebeur bediener-kant. Die tokens bly daar.
4. **`GET /tones/{id}`** gee die titel, gear type, formaat, prentjie en die
   maker — die ses velde wat vereiste 5 op die baan wil hê.
5. **`GET /models?tone_id={id}`** gee die modelle in die regte volgorde, elk
   met sy `model_url`.
6. **Ons bediener haal die `model_url`** met die Bearer-token en stuur die
   lêer deur. `lib/nam.ts` laat dit loop.
7. **`PUT /tones/{id}/favorite`** op die oomblik dat sy die amp op 'n baan
   sit, want 'n favourite is hoe toegang tot 'n privaat toon behou word.

---

## Die Select-oproep soos ons dit gaan stuur

```
client_id, redirect_uri, response_type=code,
code_challenge, code_challenge_method=S256, state,
prompt=select_tone,
format=nam,          ← lib/nam.ts laat NAM-captures loop
menubar=true,        ← hulle beveel dit aan vir in-app browsers
preview=true,        ← sy moet kan hóór voor sy kies
locale=<haar taal>   ← hulle ignoreer Accept-Language
```

`gears=amp_amp-cab_pedal` — en dit is uit die kode beantwoord, nie geraai
nie.

ProBooth se amp-afdeling sê self waarvoor dit is: *"most of what a guitar
recorded on a phone needs, which is something to stop it sounding like a
phone."* Dit is 'n kitaar-funksie. Die drie gears wat dit bedien is die kop,
die kop-met-kas, en die pedale wat voor hulle staan.

**`cab` en `space` word uitgelaat, en nie uit keuse nie.** Daardie twee is
IR-vormig, en ons kan vandag geen IR laai nie. Maar dit is nader as wat dit
lyk: `lib/fx.ts` se reverb is *"a convolver over a generated impulse"* — die
`ConvolverNode` staan dus reeds daar en word met 'n **gemaakte** impuls
gevoed. Om 'n egte kas-IR te laai is daardie selfde node met 'n gedekodeerde
lêer in plaas van 'n gegenereerde een.

Dus: nie 'n nuwe enjin nie, 'n ander invoer. Wanneer dit gedoen is, kom
`format=ir` by en saam met dit `cab` en `space` — en dan het 'n kitaar op 'n
foon 'n egte kas eerder as 'n benadering.

**`outboard`** is kompressors en EQ, wat eerder by 'n **stem**-baan hoort as
by 'n kitaar s'n. Die moeite werd wanneer die booth se stem-kant daardie
soort verwerking kry; nie nou nie.

**`experimental`** laat ons uit tot iemand vra.

## Die twee oproepe, met hul presiese vorms

```
GET /tones/{toneId}                              → die toon self, nie toegedraai nie
GET /models?tone_id={toneId}&page=&page_size=    → { data: [ … ] }
```

Die een is kaal en die ander is 'n
`PaginatedResponse<T>` — `{ data, page, page_size, total, total_pages }`. Dit is 'n klein
verskil en presies die soort wat 'n uur kos: `models.map(...)` op die
tweede gee `undefined is not a function`, en die foutboodskap wys na ons
kode eerder as na die vorm.

Albei dra `Authorization: Bearer <access_token>`, en die token kom uit die
ruil wat bediener-kant gebeur.

En `/models` is **gepagineer**, wat die tweede stil een is. 'n Toon met meer
modelle as een bladsy gee net die eerste bladsy; niks faal nie, die lys is
net kort, en ontwerpvereiste 6 se model-kieser wys dan 'n toon met party van
sy modelle weg. Ons loop die bladsye tot `total_pages`.

Daardie `Bearer` is een woord en dit het die seam verander. Ons `call()` het
die sleutel **kaal** in die header geskryf, wat reg is vir ElevenLabs se
`xi-api-key: <key>` en stilweg verkeerd vir hierdie een. 'n Kaal token in
`Authorization` gee 'n 401 waarvan die boodskap oor die **token** praat, so
die uur gaan op die token — wat heeltemal in orde was — in plaas van op die
een ontbrekende woord voor hom. Elke verskaffer sê nou sy eie skema
(`keyPrefix`), en `check:seam` weier 'n verskaffer wat `Authorization`
gebruik sonder om te sê watter een. Daardie reël staan daar **voor** die
TONE3000-inskrywing, wat die enigste orde is waarin hy iets werd is.

## Aflaai — die endpoint wat die lêer self gee

```
GET /tones/{toneId}/download?filenames=name        → { url, expires_at, filename }
GET /tones/{toneId}/download?filenames=id
```

Dit is nie `GET /models?tone_id=` nie. Daardie een gee die **beskrywings**
van 'n toon se modelle; hierdie een gee 'n **pad na die grepe**. Ons het
albei nodig en hulle doen nie dieselfde ding nie.

Vier dinge hieraan, en al vier kan 'n uur kos.

**1. Die `url` mag ons sleutel nooit sien nie.** Dit is 'n tydelike,
voorafgetekende skakel na berging, en hulle sê dit self langs die kode: *"url
is a temporary link to the zip archive, no auth header needed"*. Ons seam se
`call()` **voeg altyd 'n header by**. 'n Hele adres wat daardeur gaan, stuur
'n lid se TONE3000-token na 'n host wat nie TONE3000 is nie, en niks
stroom-af sou kla nie. Daarom weier die deur nou 'n absolute URL hardop, en
die tweede oproep is 'n **kaal `fetch`** en moet dit bly.

**2. Dit is 'n zip, nie 'n `.nam` nie.** `lib/nam.ts` laai een vaslegging;
'n toon kan meer as een model dra, en daarom is dit 'n argief. Iets moet dit
oopmaak, en dit is nog nie geskryf nie.

**3. `filenames=id` is die veiliger een.** Die verstek is `name`, en 'n naam
kom van die mens wat die toon opgelaai het. Name binne 'n argief kan
dupliseer, en 'n naam wat `../` dra is **zip-slip** — 'n inskrywing wat
buite die vouer uitpak waar ons hom uitpak. Ons vra `id`, en ons vertrou in
elk geval nie 'n inskrywing se pad nie.

**4. `expires_at` beteken ons mag die `url` nie stoor nie.** 'n Projek wat
die skakel bêre, bêre 'n skakel wat môre dood is, en die fout lyk soos 'n
toon wat verdwyn het eerder as soos 'n skakel wat verval het. Ons stoor die
**toon se id** en vra weer.

## Die ses velde wat op die skerm moet wees, en waar hulle sit

Ontwerpvereistes 4, 5 en 6 vra ses dinge per toon. Hier is hulle op `Tone`:

| vereiste | veld |
|---|---|
| tone image | `images: str[] \| null` |
| gear title | `title` |
| gear type | `gear` — die `Gear`-enum |
| format (NAM of IR) | `format` |
| creator (username en avatar) | `user: EmbeddedUser` |
| die maker se beskrywing | `description: str \| null` |

Verder dra dit `license`, `url`, die tellings, en **`is_favorite`** — of die
ingetekende persoon dit al gefavourite het. Daardie een is nuttig: ons hoef
nie te raai of die `PUT` nodig is nie, en ons kan die toestand wys.

Die per-argitektuur-tellings — `a1_models_count`, `a2_models_count`,
`custom_models_count` — kom **altyd** terug, so ons kan self uitwerk wat
sigbaar sou wees sonder 'n tweede oproep.

### Drie valle in hierdie tipe

**`images` is 'n ARRAY en kan null wees.** Die vereiste sê "tone image",
enkelvoud. Ons neem `images?.[0]`, en daar moet iets wees om te teken as dit
leeg is — dieselfde probleem as die maker se avatar, en dieselfde antwoord
nodig.

**`is_public` is `boolean | null`** — drie toestande, nie twee nie. `!is_public`
is **waar** vir `null`, so die gewone toets behandel "onbekend" as
"privaat". Of dit reg is hang af van wat null beteken, en dit weet ons nie.
Dit is die vorm van fout wat `loadFilm` se `null` was: een waarde vir twee
verskillende dinge.

**`description` kan null wees**, en vereiste 6 sê wys dit *"where space
allows"*. Twee redes om niks te teken nie, en hulle lyk op die skerm
dieselfde — die kamer moet nie 'n leë blok los waar 'n beskrywing sou wees
nie.

## Die model, wat die lêer is

```
Model { id, model_url, name, size, tone_id,
        architecture_version: Architecture | null }
```

`architecture_version` is **null vir nie-NAM** (bv. 'n IR). Ons stuur
`format=nam` aan Select, dus behoort elke model wat ons sien een te hê — en
'n null daar sou beteken ons het iets gekry wat ons nie gevra het nie, wat
die moeite werd is om te merk eerder as te ignoreer.

`name` is wat die model-kieser van vereiste 6 wys. `size` is die
CPU-waarskuwing wat ons eers hier sien.

## Hul voorbeeld-kliënt

Daar is 'n `src/tone3000-client.ts` — nul afhanklikhede, dek PKCE, al die
OAuth-vloeie, outomatiese verfris en geoutentiseerde versoeke. Drie demo-apps
daarby, een per vloei; "Acme Inc" is die Select-een.

Dit is **inspirasie en nie 'n sjabloon nie**, om die rede wat hierbo staan:
dit is 'n kliënt-kant helper wat die tokens in die browser hou. Die PKCE-
berekening en die vorm van die oproepe is die moeite werd om te lees; die
plek waar dit die tokens bêre, is presies wat ons anders doen.

## Die maker, en sy twee nulle

```
EmbeddedUser {
  id, username, display_name | null, is_verified,
  avatar_url | null, url
}
```

Dit is die tipe wat ontwerpvereistes 4, 5 en 6 se *"Creator (username and
avatar)"* voed, en albei velde wat ons wil wys kan **null** wees.

**`display_name` is net gestel vir 'n geverifieerde maker.** Hul eie nota sê
val terug op `username` wanneer dit null is. Maklik om te mis, en die gevolg
is 'n leë naam onder 'n toon.

**`avatar_url` kan ook null wees** — en die vereiste sê uitdruklik "username
**and** avatar". Daar moet dus iets wees om te teken wanneer daar geen prent
is nie: 'n voorletter, of 'n merk. 'n Gebreekte-prent-ikoontjie is nie 'n
avatar nie, en dit is wat 'n mens kry as niemand hieraan dink nie.

`url` is die maker se bladsy op TONE3000 — die "traffic" wat die
oorspronklike brief aan hulle belowe het dat hulle sou behou.

## Die lisensie, wat 'n besigheidsvraag is en nie 'n tegniese een nie

Elke toon dra 'n `License`, en die stel is:

`t3k` · `cco` · `cc-by` · `cc-by-sa` · `cc-by-nc` · `cc-by-nc-sa` ·
`cc-by-nd` · `cc-by-nc-nd`

**Drie daarvan is NonCommercial** (`-nc`) en **twee is NoDerivatives**
(`-nd`).

FutureBox is 'n betaalde produk. 'n Lid neem 'n opname op deur 'n amp-capture
wat `cc-by-nc` is, en verkoop daardie liedjie — of ons vra krediete vir die
render. Of dit toegelaat is, is 'n vraag wat iemand moet beantwoord voordat
dit gebeur, nie daarna nie.

Dieselfde vraag het al een keer in hierdie repo skeefgeloop. `check:musiclicence`
bestaan presies hierom, en sy eie geskiedenis sê dit het 'n **bewering**
afgedwing eerder as 'n beperking en dit toe met 'n rooi build verdedig.

Drie dinge volg hieruit, en nie een is opsioneel nie:

1. **Die lisensie moet gelees en gestoor word**, saam met die capture op die
   baan. `lib/amps.ts` hou vandag 'n naam. Dit moet die maker **en** die
   lisensie hou, want dit is wat later bepaal of 'n liedjie verkoop mag word.
2. **Die lisensie moet op die skerm wees** waar sy kies. Die
   ontwerpvereistes lys dit nie onder die ses velde nie — dit is hul reël,
   nie ons s'n nie, en ons het 'n eie verpligting.
3. **Ons moet hulle vra.** Nie of die lisensies beteken wat hulle sê nie,
   maar wat hulle verwag van 'n betaalde app: filter ons die NonCommercial
   tone uit, of wys ons hulle met 'n waarskuwing, of hanteer hul API Terms
   dit reeds?

Konsep vir daardie vraag:

> FutureBox is a paid product — members buy credits and some sell what they
> make. Tones carry CC licences including `-nc` and `-nd` variants. What do
> you expect an integration like ours to do: filter non-commercial tones out
> of the Select catalogue, surface the licence to the user and let them
> decide, or does something in your API Terms already cover downstream
> commercial use? We would rather ask than assume.

Dit is 'n vraag wat 'n mens **voor** die integrasie stel, nie wanneer iemand
se liedjie reeds verkoop is nie.

## Een vraag vir hulle, uit ons eie kode

`architecture` neem **een** waarde: `1`, `2` of `custom`. Weglaat gee die
erfenis-stel — A1 plus Custom — en sluit **A2-only** tone uit. `2` gee net
A2.

Ons enjin is `@opendaw/nam-wasm`, wat **hulle eie WASM-poort** van
NeuralAmpModelerCore is, en `lib/nam.ts` se eie kommentaar sê dit lees
*"both the original A1 files and the newer A2 ones"*.

Daar is dus **geen waarde wat alles gee** nie, terwyl ons alles kan laai.
Weglaat verloor die A2-only tone; `2` verloor die A1-only tone. Die
erfenis-verstek bestaan om API-gebruikers te beskerm wat **nie** A2 kan laai
nie — en ons is nie een van hulle nie.

Dit is 'n goeie vraag om saam met die compliance-antwoord te stuur:

> Our engine is your own nam-wasm port, so we read A1, A2 and Custom. The
> `architecture` parameter takes a single value and omitting it excludes
> A2-only tones. Is there a way to request all three, or should we run two
> flows? We'd rather not hide half your catalogue from users who can load it.

## Die enums, wat ons wél nodig het

Nie om 'n bladerder mee te bou nie — om **Select te beperk**. Ons gee
`gears` en `format` saam met `prompt=select_tone` en dan sien sy net wat
`lib/nam.ts` kan laai.

Twee waardes is verouderd en dit is maklik om hulle verkeerd te stuur:

- **`full-rig`** is 'n alias vir `amp-cab` en word by stoor genormaliseer.
- **`ir` as 'n Gear** word uit `gears` gestroop, en `format=ir` word afgelei
  as geen formaat gegee is nie ('n uitdruklike `format` wen). Ons moet dus
  nooit `ir` in `gears` stuur nie — dit hoort in `format`.

**Gear:** `amp`, `amp-cab`, `pedal`, `outboard`, `cab`, `space`,
`experimental` — plus die twee verouderdes, `full-rig` (alias vir `amp-cab`)
en `ir` (gestroop; gebruik `format=ir`).

**Format:** `nam`, `ir`, `aida-x`, `aa-snapshot`, `proteus`.

**Size:** `standard`, `lite`, `feather`, `nano`, `custom`. Ons kan **nie**
hierop by Select filter nie — die parameter bestaan net op die soek-endpoint
— maar dit raak ons: dit is die verskil tussen 'n amp wat in 'n browser op 'n
foon loop en een wat hakkel. Ons sien dit eers op die `Model` ná die keuse,
wat beteken die kamer moet dit kan hanteer eerder as voorkom.

**Architecture:** hul eie voorbeeldkode sê `1 | 2 | 'custom'` — **getalle**
vir die twee weergawes en 'n string vir custom.

Ek het hier eers geskryf dis alles stringe, en gewaarsku dat 'n `2` in plaas
van `'2'` stil deurgaan en die verkeerde stel modelle gee. Dit was
**verkeerd**, en dit was in elk geval 'n waarskuwing oor niks: dit is 'n
query-parameter, dus is `?architecture=2` en `?architecture=${'2'}` dieselfde
grepe op die draad. Dit is 'n reël wat 'n uur kos om na te jaag en niks
beskerm nie, en daarom staan hy nie meer hier nie.

Waar die verskil wél kan byt is die **ander kant**. `Model` se
`architecture_version` kom as `Architecture` terug. As die navraag `2` vat en
die antwoord `'2'` gee, dan is `model.architecture_version === 2` vals
terwyl dit soos waar lyk, en die kamer kies die verkeerde pad op 'n toon wat
niks verkeerd het nie. Dit is 'n vergelyking in **ons** kode, nie 'n
parameter aan hulle nie, en dit is 'n derde vraag werd.

Die skeiers verskil per parameter, en dit is 'n strik:

- `gears`, `tags`, `makes` → **onderstreep** (`amp_amp-cab_pedal`)
- `sizes` → **koppelteken** (`standard-lite-feather`)
- `creators` → **komma**, omdat gebruikersname self `_` en `-` kan bevat

Komma-geskei is elders verouderd. Drie skeiers in een API, met waardes wat
self koppeltekens dra.

## Hulle sê vir ons wanneer ons dit verkeerd doen

Op 'n verouderde vorm antwoord hulle met headers eerder as net 'n stil
normalisering:

- `Deprecation: true` (RFC 8594)
- `Link: …; rel="deprecation"`
- `X-Tone3000-Deprecations:` die spesifieke soorte, bv.
  `legacy_platform_key,legacy_ir_gear_value`

Dit is 'n geskenk, en dit hoort in 'n `check:`. 'n Verouderde parameter werk
vandag en hou stilweg op werk eendag; 'n header wat dit **nou** sê, is iets
'n build kan lees. Wanneer die integrasie staan: enige antwoord met
`Deprecation: true` laat die probe val, met die `X-Tone3000-Deprecations`-lys
in die boodskap.

Die verouderdes self: `?platform=` → `?format=`, `?gear=` → `?gears=`,
`gears=ir` → `format=ir`, en `gears=full-rig` → `gears=amp-cab`.

## Wat ons doelbewus nie aanteken nie

Hul bladsy gaan voort met `Makes`, `Tags` en die res — katalogus-hulpmiddels
om 'n **eie bladerder** mee te bou. Ons bou nie een nie, en hulle beveel self
aan om dit nie te doen nie. Hulle staan op hul bladsy as ons ooit van plan
verander.

Dit is met opset en nie uit luiheid nie: 'n repo vol parameters vir
endpoints wat niemand roep nie, lees oor 'n jaar soos 'n plan wat iemand
gehad het.

## Die kommersiële terme — lees hierdie een eerste

Dit is die belangrikste afdeling op hul hele bladsy, en dit is nie tegnies
nie.

**Gratis vlak:** net vir 'n **nie-kommersiële** produk. Hul definisie is
streng — *"free and open software or hardware with no paid product, or
upsell"*. Oopbron-projekte, DIY-pedale, navorsing. **FutureBox is nie een
van hulle nie.** Daardie vlak mag ook net die prompt-vloeie en die begrensde
lyste gebruik.

**Kommersieel:** *"If you charge for your product, or your product promotes
or accompanies a paid product, a commercial agreement is required."*
FutureBox verkoop krediete. Ons is kommersieel, sonder twyfel, en 'n
ooreenkoms is nodig.

En dan die reël wat die plan verander:

> *"Commercial integrations must be reviewed and signed off by TONE3000
> before they are publicly published or announced."*

**Ons mag dit nie uitstuur of aankondig voor hulle dit nagegaan het nie.**
Nie 'n versoek nie, 'n voorwaarde. Dit beteken:

- bou kan aangaan, en moet, want hulle vra 'n skermopname van 'n werkende
  integrasie voor hulle kan teken
- maar die **vrystelling** van hierdie funksie hang van hulle af, en die
  tydsduur is hulle s'n, nie ons s'n nie
- en dit moet in enige tydlyn staan wat iemand anders lees, want 'n funksie
  wat klaar is en nie uit mag nie, lyk van buite af soos 'n funksie wat nie
  klaar is nie

Hul eerste e-pos het dit half gesê — *"we're happy to waive them in exchange
for promotional support"* — en dié bladsy sê wat dit formeel beteken. Die
waiver **is** die kommersiële ooreenkoms wat hulle aanbied; die sign-off is
bykomend en nie opsioneel nie.

## Wat nog ontbreek

Niks tegnies nie. Die dokumentasie is volledig afgeskryf: die drie
integrasies, die hele OAuth-ketting, session management, elke endpoint wat
ons gaan roep, die enums en die tipes.

Oor:

- die **API Terms of Service**, woordeliks — nie om te bou nie, om te
  **bevestig**, wat hulle in hul e-pos gevra het
- die skakel na die **example app repository**
- twee vrae aan hulle: die `architecture`-een hierbo, en die lisensie-een
- **die kommersiële ooreenkoms self**, en hoe hul sign-off-proses werk
