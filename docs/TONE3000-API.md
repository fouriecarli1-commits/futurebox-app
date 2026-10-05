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

Vir ons beteken dit: die geheim gaan in **Vercel**, en dit gaan deur die
seam — `app/lib/server/suppliers.ts` is reeds die enigste plek wat 'n host en
'n sleutel-header skryf. 'n TONE3000-inskrywing daar lyk soos:

```
keyFrom: 'TONE3000_SECRET_KEY',
key: () => `Bearer ${process.env.TONE3000_SECRET_KEY ?? ''}`,
keyHeader: 'Authorization',
```

Die `client_id` is 'n ander ding en mag wel in die browser wees.

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

## Wat ons doelbewus nie aanteken nie

Hul bladsy gaan voort met `Makes`, `Tags` en die res — katalogus-hulpmiddels
om 'n **eie bladerder** mee te bou. Ons bou nie een nie, en hulle beveel self
aan om dit nie te doen nie. Hulle staan op hul bladsy as ons ooit van plan
verander.

Dit is met opset en nie uit luiheid nie: 'n repo vol parameters vir
endpoints wat niemand roep nie, lees oor 'n jaar soos 'n plan wat iemand
gehad het.

## Wat nog ontbreek voor ek kan bou

Die geplakte helfte eindig by die authorize-parameters. Nog nodig:

1. ~~Die token exchange~~ — **gekry.**
2. ~~Die callback~~ — **gekry.** Die `tone_id` kom in die adres terug.
3b. **Die aflaai, en die antwoord is `model_url`.** Daar is 'n
   `Download Tone` wat 'n zip van al die modelle gee, maar dit is **net vir
   goedgekeurde vennote** — ander kliënte kry 'n `403`. Hulle sê self dit is
   nie wat ons wil hê nie: *"For nearly all integrations, download individual
   models via the `model_url` field from List Models instead: it gives you
   per-model control and works for every API client."*

   Een ding uit die zip se dokumentasie is wél vir ons van belang, al
   gebruik ons dit nie: *"For tones with format nam, the archive contains
   **A2 files only**."* Saam met die `architecture`-verstek wat A2
   **uitsluit**, sê dit dat A1 en A2 twee werklik verskillende lêers is en
   dat 'n mens moet weet watter een jou runtime kan laai. Dit is die eerste
   vraag wat ek aan `lib/nam.ts` moet stel voor ek 'n reël skryf.

   Per-model beheer is presies wat ontwerpvereiste 6 vra — die model-kieser
   binne 'n tone pack. Een zip sou dit nie gee nie.

3c. **En die lêer self verg die token.** `GET /models/{id}` gee 'n `Model`,
   en hulle sê uitdruklik: *"The `model_url` field is a pre-built download
   URL. Pass your access token as a Bearer token when fetching it."*

   Dit is nie 'n detail nie, dit besleg die argitektuur. Die zip se adres was
   tydelik en sonder outentisering; hierdie een is nie. Die browser hou geen
   token nie — dit is die hele punt van die besluit hierbo — dus kan die
   browser nie self die `.nam` gaan haal nie. Ons bediener haal dit en stuur
   dit deur.

   Dit is presies die vorm wat `lib/nam.ts` klaar wil hê: dit neem 'n
   lêer-inhoud, nie 'n adres nie. En dit beteken die seam se `call()` moet 'n
   token per persoon kan dra, nie net een uit die omgewing nie — die
   uitbreiding wat ek vroeër genoem het, nou bevestig deur twee verskillende
   endpoints.

3. ~~Die `List Models`-endpoint~~ — **gekry.**
   `GET /models?tone_id={id}`, met `page`, `page_size` (verstek 10, maks
   **300**) en `architecture`. Gee `PaginatedResponse<Model[]>`, in dieselfde
   volgorde as die toon se bladsy — die eienaar se posisie, dan nuutste eerste
   — en elke `Model` dra sy `model_url`.

   Daardie volgorde is nie toevallig nie: dit is die volgorde waarin die
   model-kieser van ontwerpvereiste 6 hulle moet wys.

3d. ~~Die ander toon-endpoints~~ — 'n toon se besonderhede lees, en die **model-lêer
   self aflaai** sodat `lib/nam.ts` dit kan laat loop. Dit is die een sonder
   wat niks werk nie.
4. ~~Die CRUD API agter Favorites, Created en Downloaded~~ — **gekry**, en
   dit is wel 'n CRUD: daar is 'n skryf-endpoint. Ek het 'n paragraaf
   gelede geskryf dat dit net lees is; dit was verkeerd.
4b. ~~Session Management~~ — **gekry.**
5. **Die example app repository** wat hulle noem — die skakel daarna.
6. Die **API Terms of Service**, woordeliks.
