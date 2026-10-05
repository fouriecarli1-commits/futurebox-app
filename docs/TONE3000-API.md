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

Daardie laaste reël stem ooreen met wat Load Tone se stap 2 sê, en dit is
'n ding om te onthou as 'n amp môre nie laai nie: die toon het nie
verdwyn nie, die **favourite** is dalk weg.

Al drie tone-lyste neem dieselfde navrae: `page`, `page_size` (verstek 10,
maks **100** — tien keer meer as die gebruikerslys), `gear` (een waarde, bv.
`amp-cab`; weglaat gee alle tipes), en `query`, 'n hoofletter-onafhanklike
substring op die **titel**, wat met `gear` kombineer.

`GET /user` is wat ontwerpvereiste 4 se *"the signed-in user's avatar and
username"* voed, en `GET /tones/created` is die **Created**-oortjie.

---

## Wat nog ontbreek voor ek kan bou

Die geplakte helfte eindig by die authorize-parameters. Nog nodig:

1. ~~Die token exchange~~ — **gekry.**
2. ~~Die callback~~ — **gekry.** Die `tone_id` kom in die adres terug.
3. **Die toon-endpoints** — 'n toon se besonderhede lees, en die **model-lêer
   self aflaai** sodat `lib/nam.ts` dit kan laat loop. Dit is die een sonder
   wat niks werk nie.
4. ~~Die CRUD API agter Favorites, Created en Downloaded~~ — **gekry.**
   Dit is drie lees-endpoints, nie 'n CRUD nie, wat ook beteken ons kan nie
   van ons kant af favourite nie. Of daar 'n skryf-endpoint is, is nog oop.
4b. ~~Session Management~~ — **gekry.**
5. **Die example app repository** wat hulle noem — die skakel daarna.
6. Die **API Terms of Service**, woordeliks.
