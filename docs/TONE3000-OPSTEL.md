# TONE3000 opstel — stap vir stap

Hierdie een is vir Carli, voor haar rekenaar, met niks oop nie.

Dit is in drie dele: **by TONE3000 gaan haal**, **in Vercel insit**, en
**toets dat dit werklik werk**. Doen hulle in daardie orde. Deel drie is nie
opsioneel nie — dit is die enigste deel wat vir jou sê die eerste twee was
reg.

> **Een ding wat ek nie vir jou kan nagaan nie.** Die uitgaande proxie hier
> blokkeer `tone3000.com`, so ek kan nie hul bladsy oopmaak en vir jou sê
> *"klik op die derde knoppie van links"* nie. Waar ek 'n knoppie se naam
> raai, sê ek so. Alles wat ek as seker gee, kom uit die dokumentasie wat jy
> self vir my gestuur het. As 'n naam op die skerm anders is as wat hier
> staan, **is die skerm reg en ek verkeerd** — stuur my 'n skermskoot en ek
> stel dit hier reg.

---

## Deel 1 — By TONE3000

### 1.1 Teken in op die rekening waarmee jy met hulle gepraat het

Dieselfde rekening as die e-pos oor die fooie wat afgeskaf is. As die
sleutels aan 'n ander rekening hang, hang hulle aan 'n rekening sonder
daardie ooreenkoms.

### 1.2 Soek die **settings**-bladsy

Hul dokumentasie sê die twee sleutels kom *"uit hul settings-bladsy"*. Dit is
die woord wat hulle self gebruik, so soek na **Settings** — waarskynlik onder
jou profiel- of avatar-knoppie regs bo. Daar is dikwels 'n **API**- of
**Developer**-afdeling binne-in.

As jy dit nie vind nie: **hou op soek en vra hulle**. Jy is reeds in gesprek
met `support@tone3000.com` oor die fooie, en *"where do I find my client ID
and secret key?"* is een reël by daardie draad. Dit is vinniger as om 'n
halfuur deur menu's te krap, en dit is 'n vraag wat hulle elke week kry.

### 1.3 Daar is drie sleutels op daardie bladsy. Een gaan in Vercel.

| Wat | Wat dit is | Waarheen |
|---|---|---|
| **publishable key** | dit **is** die `client_id` — dieselfde ding, twee name. Hulle noem hom publishable key op die skerm; OAuth en ons kode noem hom `client_id`. Die blywende identifiseerder van die toepassing, veilig in 'n browser | **Vercel**, as `NEXT_PUBLIC_TONE3000_CLIENT_ID` |
| **secret key** (`t3k_cs_…`) | *"Treat it like a database password"* — hul eie woorde; slegs bediener-kant | **nog nêrens nie** — sien hieronder |
| **legacy API key** | 'n enkele lang-lewende sleutel uit 'n ouer stelsel, van voor OAuth | **nêrens nie** |

> **Hierdie afdeling het 'n draai gevat en albei foute is myne.**
>
> Eers het hy vir die geheim gevra asof die vloei hom nodig het. Dit is
> verkeerd: ons vloei is OAuth met **PKCE**, wat juis bestaan sodat 'n kliënt
> wat **nie** 'n geheim kan bewaar nie, hierdie vloei veilig kan doen. Die
> ruil stuur `grant_type`, `code`, `code_verifier`, `redirect_uri` en
> `client_id`, en niks anders nie.
>
> Toe Carli niks kon vind nie, het ek gesê die geheim bestaan nie vir hierdie
> vloei nie en hulle gee hom nie uit nie. Ook verkeerd — **hy is op die
> bladsy**. Wat waar bly is dat ons hom vandag nie gebruik nie; wat ek as
> feit geskryf het en net aangeneem het, is dat hulle hom nie gee nie.

**Hoekom die geheim nog nie in Vercel gaan nie.** Niks lees hom. 'n Geheim
hoort op presies soveel plekke as wat hom nodig het, en dit is nou nul. Hy
word nodig op die dag dat ons **trending tone wys voordat iemand ingeteken
het** — ontwerpvereiste 4 se *"query and render trending and latest tones"*
op die amp-kieser se eerste skerm. Op daardie oomblik is daar nog geen
persoon se token nie, en dan is 'n bediener-kant-sleutel die regte
gereedskap. Dit is een plak op daardie dag.

**Hoekom die legacy key nêrens gaan nie.** Met 'n rekening-sleutel lyk elke
lid se oproep soos **een** rekening. TONE3000 se hele model is per persoon —
haar favourites, haar privaat tone, haar avatar en gebruikersnaam op die
skerm, wat ontwerpvereiste 4 letterlik vra. Met een sleutel is daar geen
ingetekende persoon nie. Dit raak ook die gesprek met hulle: hul kommersiële
terme sê kommersiële integrasies word nagegaan en goedgekeur, en een rekening
se sleutel wat die werk van honderde kliënte doen, is die vorm wat sleg lees
in daardie gesprek. En "legacy" is hul eie woord vir *ons gaan hiervan
ontslae raak*.

Die `client_id` is nie 'n geheim nie. Hul dokumentasie noem hom die
**publishable key** en sê hy is veilig in kliëntkode, 'n mobiele app en 'n
browser. Dit beteken nie hy hoort op 'n skermskoot op Twitter nie — maar as
hy uitlek is dit nie 'n noodgeval nie, en jy hoef nie bang te wees om hom te
hanteer nie.

### 1.4 Registreer 'n `redirect_uri`

Dit is die adres waarheen TONE3000 haar terugstuur ná sy 'n toon gekies het.
Hul dokumentasie sê: as daar een geregistreer is, word **slegs** daardie een
aanvaar. Dit is 'n goeie reël en dit beteken 'n tikfout hier lyk later soos
'n gebreekte aanmelding.

Registreer presies hierdie, een per reël as hulle meer as een toelaat:

```
https://futurebox.studio/api/tone3000/callback
```

En as hulle 'n tweede toelaat, ook hierdie een, want dit is waar die app
loop tot die domein aangeheg is:

```
https://futurebox-app.vercel.app/api/tone3000/callback
```

Drie dinge wat hier stil verkeerd gaan:

- **`https`, nie `http`** nie.
- **Geen skuinsstreep aan die einde** nie. `…/callback/` en `…/callback` is
  vir 'n OAuth-bediener twee verskillende dinge.
- **Nie `www.`** voor `futurebox.studio` nie, tensy dit is waarheen jou
  domein werklik wys.

Daardie roete bestaan nog nie in die app nie — ek bou hom sodra die
`client_id` daar is. Die registrasie kan egter nou gebeur; 'n geregistreerde
adres wat nog niks ontvang nie, breek niks.

### 1.5 Vra die drie vrae saam

Terwyl jy in elk geval met hulle praat, is daar drie dinge wat ek nie uit die
dokumentasie kan aflei nie. Hulle staan uitgeskryf in `docs/TONE3000-API.md`
en dit is:

1. **Die lisensie-vraag.** Party tone is CC-gelisensieer. Ons produk is
   betaald. Dit is 'n vraag wat 'n mens **voor** die integrasie stel, nie
   wanneer iemand se liedjie reeds verkoop is nie.
2. **Die `architecture`-vraag.** Geen enkele waarde gee A1 **en** A2 **en**
   custom, terwyl ons enjin al drie kan laai. Weglaat verloor die A2-only
   tone.
3. **Waar `model_url` leef** — op `www.tone3000.com` of op hul berging. Dit
   klink soos 'n klein ding en dit is nie: die een adres wil ons geloofsbrief
   hê en die ander een mag hom **nooit** sien nie, en niks in die string sê
   watter is watter.

---

## Deel 2 — In Vercel

Jy sit **een** ding in Vercel: die geheim. Die `client_id` is nie 'n geheim
nie, maar hy gaan dieselfde pad, want dan staan albei op een plek en nie een
in 'n lêer en een in 'n paneel nie.

### 2.1 Kom by die regte skerm

1. `vercel.com` → teken in.
2. Kies die **futurebox-app**-projek.
3. Bo: **Settings**.
4. Links: **Environment Variables**.

### 2.2 Sit die een in

Naam links, waarde regs, dan **Save**.

| Naam | Waarde | Watter environments |
|---|---|---|
| `NEXT_PUBLIC_TONE3000_CLIENT_ID` | die `client_id` | **Production** en **Preview** |

**Die `NEXT_PUBLIC_`-voorvoegsel is nie versiering nie.** In Next.js beteken
dit *"hierdie een mag in die browser beland"*. Dit hoort hier omdat die
`client_id` juis 'n publishable key is. Dieselfde voorvoegsel voor 'n egte
geheim sou hom in die JavaScript inbak wat elke besoeker aflaai — dan is hy
publiek en niks sê vir jou so nie. Ons het hier nie een om verkeerd te
hanteer nie, maar die reël is die moeite werd om te ken vir die volgende
verskaffer.

**Development mag jy uitlaat.** Dit is die environment vir 'n plaaslike
`vercel dev`, en jy werk nie so nie.

### 2.3 Plak versigtig

- Geen spasie voor of agter nie. 'n Spasie aan die einde van 'n sleutel gee
  'n 401 waarvan die boodskap oor die **sleutel** praat, en dan soek jy 'n
  uur na die verkeerde ding.
- Geen aanhalingstekens om die waarde nie. Vercel is nie 'n shell nie.
- Geen `TONE3000_SECRET_KEY=` voor die waarde nie — die naam is die blokkie
  links.

### 2.4 Herontplooi

'n Nuwe veranderlike bereik **nie** 'n reeds-ontplooide build nie. Dit is die
een wat die meeste mense 'n halfuur kos.

**Deployments** → die boonste een → die drie kolletjies → **Redeploy**.

---

## Deel 3 — Toets dat dit werklik werk

Hierdie deel is die hele punt. 'n Veranderlike wat verkeerd gestel is, lyk
presies soos een wat nie gestel is nie, en albei lyk soos 'n kenmerk wat stil
die af-pad neem.

### 3.1 Wat jy kan toets sodra die veranderlikes in is

Gaan na die app en kyk of die build hom sien. Die app het reeds 'n plek wat
sê watter sleutels teenwoordig is sonder om hul waardes te wys —
`docs/SWITCH-ON.md` loop daardeur. Teenwoordig/afwesig is al wat jy wil weet;
**as 'n skerm ooit die waarde self wys, is dit 'n fout en moet jy my sê.**

### 3.2 Wat eers kan werk as ek die roete gebou het

Die regte toets is sy wat op 'n amp druk, by TONE3000 uitkom, 'n toon kies,
en terugkom met daardie toon op die baan. Dit het die callback-roete nodig,
en daardie roete het die `client_id` nodig. Dus:

**Sodra die `client_id` en 'n geregistreerde `redirect_uri` daar is, sê vir
my, en ek bou die roete.** Die handdruk self is reeds gebou en staan onder 'n
check wat hom **uitvoer** eerder as lees — die PKCE-paar, die `state`-toets,
en al vier maniere om uit hul venster terug te kom.

---

## Die kort lysie, as jy net dit wil hê

- [ ] Teken in op TONE3000 met die rekening uit die fooi-gesprek
- [ ] Settings → kopieer die **publishable key**. Die secret key en die
      legacy API key bly waar hulle is.
- [ ] Registreer `https://futurebox.studio/api/tone3000/callback` (en die
      `vercel.app`-een as hulle 'n tweede toelaat)
- [ ] Vra die drie vrae in dieselfde e-pos
- [ ] Vercel → Settings → Environment Variables →
      `NEXT_PUBLIC_TONE3000_CLIENT_ID`
- [ ] Deployments → Redeploy
- [ ] Sê vir my, en ek bou die callback-roete

**Die secret key bly op hul bladsy tot iets hom lees, en die legacy API key
gaan nêrens nie.** Net die publishable key gaan in Vercel.
