# Elke diens wat FutureBox nog nodig het

Een lys. Vir elke diens: **waarvoor dit is**, **wat ek van jou af nodig het**,
**wat dood is totdat dit daar is**, en **wat dit kos**.

Geskryf 6 September 2026. Kling is uit, soos gevra — die twee video-enjins wat
oorbly is albei ElevenLabs s'n.

Die geldkant staan in `docs/KOSTE-EN-WINS.md`, wat uit die kode self gereken
word. Die stap-vir-stap opstelling staan in `docs/SWITCH-ON.md`. Hierdie lêer
is die oorsig: wat is daar, wat kom nog, en wat hang waaraan.

---

## Die vier wat die toep vandag laat loop

Sonder een van hierdie vier is daar nie 'n toep nie.

### 1. ElevenLabs — die enigste enjin wat regtig geld kos

**Waarvoor:** musiek, stemme, voorlesings, oorklanking, die kamer uit 'n
opname haal, hoor wat gesing is, én — noudat Kling uit is — albei die
video-enjins (Seedance en Veo) en die pratende aanbieder (Aurora).

**Wat ek van jou nodig het:**

| Ding | Waar | Waarom |
|---|---|---|
| `ELEVENLABS_API_KEY` | Vercel → Environment Variables | Alles. |
| Bevestig die plan dra 'n **kommersiële lisensie** | ElevenLabs → Billing | Sonder dit mag lede nie verkoop wat hulle maak nie, en die toep belowe dit. |
| `ELEVEN_SEEDANCE_READY=1` | Vercel | Enige videogreep langer as tien sekondes. Sit dit, maak een greep, haal dit af as die versoek geweier word. |
| `ELEVEN_AURORA_READY=1` | Vercel | Die pratende aanbieder. Dieselfde toets. |
| **Die e-pos oor 'n pasgemaakte plan** | sien onder | Dit is die grootste enkele hefboom op wins. |

**Wat dit kos:** dit is die hele som in `docs/KOSTE-EN-WINS.md`. Kortweg:
Creator $22, Pro $99, Scale $330, Business $990 per maand — en van dié vier is
**Business die enigste een wat ooit wins kan maak**, want die kleiner planne se
kredietdak lê laer as die getal lede wat jy nodig het om gelyk te breek.

**Wat ek nie kon nagaan nie:** hierdie masjien kom nie by elevenlabs.io uit nie
— die proksie laat nie daar uit nie. Elke prys hierbo is wat die kode tot
dusver aangeneem het. Dit is presies wat die e-pos moet bevestig.

### 2. Supabase — rekeninge, liedjies, die kanaal

**Waarvoor:** wie is wie, watter liedjie is wie s'n, waar die klanklêers lê,
die lewendige kamer, die saamwerk-kamers, die krediete.

**Wat ek van jou nodig het:** vyf SQL-lêers wat nog nooit geloop het nie.
Supabase → SQL Editor → plak → Run. Veilig om weer te loop.

| Lêer | Wat dood is daarsonder |
|---|---|
| `supabase/charts.sql` | Spotlight se Top 10 bly vir altyd leeg |
| `supabase/addons.sql` | Die bemarkings-byvoegsel kan nie gekoop word nie |
| `supabase/posting.sql` | Die plaas-tou antwoord "nie opgestel nie" |
| `supabase/dubs.sql` | Oorklanking antwoord "nie opgestel nie" |
| `supabase/invites.sql` | Die uitnodigingsskakel in 'n saamwerk-e-pos werk nie |

Elkeen van daardie kamers sê "nie opgestel nie" in gewone woorde eerder as om
te breek — daardie sin *is* die toets.

**Wat dit kos:** Pro-plan ongeveer R400 per maand. Die gratis plan werk vir die
handjievol toetsers, maar slaap ná 'n week se stilte.

### 3. Vercel — waar dit loop

**Wat ek van jou nodig het:** `NEXT_PUBLIC_SITE_HOST = futurebox.studio`, en
die vier domein-aanstuurders (met en sonder `www`, en die ou naam). Elke keer
as jy 'n veranderlike stel: **herontplooi**. 'n Veranderlike wat gestoor is
sonder 'n herontplooiing verander niks nie, en dit sê ook niks.

**Wat dit kos:** Pro-plan ongeveer R320 per maand.

### 4. Anthropic — die kopiloot

**Waarvoor:** die towerstaf, die liedjie-uit-'n-foto, die praat-kaarte, die
skryfhulp in elke kamer.

**Wat ek van jou nodig het:** `ANTHROPIC_API_KEY`.

**Wat dit kos:** klein per boodskap, opgetel by volume. Die som reken op
R1 500 per maand, wat 'n skatting is en nie 'n rekening nie — dit is die
tweede getal om teen 'n regte faktuur na te gaan.

---

## Die drie wat geld inbring of geld bespaar

### 5. Paystack — hoe mense betaal

**Wat ek van jou nodig het:** `PAYSTACK_SECRET_KEY`, en dan vier plankodes wat
jy in hulle paneel skep: `PAYSTACK_PLAN_MAKER`, `PAYSTACK_PLAN_STUDIO`,
`PAYSTACK_PLAN_LABEL`, `PAYSTACK_PLAN_MARKETING`.

**Wat dood is daarsonder:** niemand kan betaal nie. Die pryskaart wys, die
knoppie werk nie.

**Wat dit kos:** ongeveer 3,5% plus R2 per transaksie. Die R2 is die deel wat
seermaak op klein bedrae — dit is 1,3% van R149 maar sou 14% van 'n R14-koop
gewees het, en dit is een van die redes waarom die eenmalige koop uit is.

### 6. Resend — die e-posse

**Waarvoor:** die welkom-brief, die saamwerk-uitnodiging, die
toelae-waarskuwings wat vir jóú sê wanneer 'n enjin opraak.

**Wat ek van jou nodig het:** `MAIL_API_KEY`, `MAIL_API_URL`, `MAIL_FROM`,
`MAIL_REPLY_TO`. **`MAIL_FROM` mag nooit 'n gmail-adres wees nie** — DMARC
laat sulke pos stilweg verdwyn; dit moet 'n adres op jou eie domein wees.
`MAIL_REPLY_TO` mag enigiets wees.

**Wat dit kos:** gratis tot 3 000 briewe per maand, daarna ongeveer $20.

### 7. Spotify — die derde bar op Spotlight

**Waarvoor:** "Wat Suid-Afrika op Spotify luister", langs ons eie Top 10.

**Wat ek van jou nodig het:** `SPOTIFY_CLIENT_ID` en `SPOTIFY_CLIENT_SECRET`
van developer.spotify.com. Skep 'n toep, kopieer die twee waardes. Geen
terugroep-URL nodig nie — dit lees net openbare goed en raak aan niemand se
rekening nie, joune ingesluit.

**Wat dit kos:** niks.

**Wat ek nie kon toets nie:** die uitgaande oproep na Spotify is geblokkeer
waar hierdie kode gebou is, so daardie pad het nog nooit teen die regte API
geloop nie. As die bar nie opdaag met die sleutels gestel nie, is dít die
eerste plek om te kyk.

---

## Die twee wat kamers oopmaak wat nou donker is

### 8. Music.ai — akkoorde, toonaard, tempo, en benoemde stukke

**Waarvoor:** die studio se "lees die liedjie"-knoppie, en om 'n liedjie in
benoemde stukke te sny eerder as net stem-en-begeleiding.

**Wat ek van jou nodig het:** `MUSIC_AI_API_KEY`, plus twee werkvloei-kodes
wat jy in hulle paneel skep: `MUSIC_AI_WORKFLOW_READ` en
`MUSIC_AI_WORKFLOW_STEMS`. Die toep kan dié nie raai nie.

**Hoe om te sien of dit werk:** maak
`https://futurebox.studio/api/analyse/setup?key=<POST_SECRET>` oop. Dit lys
die werkvloeie wat werklik op die rekening is en sê watter kodes gestel is.

**Wat dit kos:** per minuut klank per werkvloei-loop. Die presiese koers kon
nie hiervandaan nagegaan word nie — music.ai is ook geblokkeer — so
`CREDITS.read = 6` en `CREDITS.parts = 8` is met opset hoog gestel. Dit is die
eerste twee getalle om teen 'n regte faktuur te toets.

### 9. Sangstem-omskakeling — die een gat wat oorbly

**Waarvoor:** 'n gemaakte liedjie wat in **jou** stem sing. Dit is die enigste
ding wat die toep belowe en nie kan lewer nie.

**Wat ek van jou nodig het:** 'n besluit tussen twee paaie, en ek kan nie
hiervandaan uitvind watter een moontlik is nie:

1. **Music.ai**, as hulle rekening 'n stem-omskakeling-werkvloei aanbied. Die
   `/api/analyse/setup`-bladsy hierbo sal dit sê sodra die sleutel gestel is.
2. **Kits.AI** of 'n soortgelyke RVC-diens, as Music.ai dit nie het nie. Dit is
   'n nuwe rekening en 'n nuwe faktuur.

**Wat dit kos:** onbekend totdat een van die twee geantwoord het.

---

## Wat ek doelbewus **nie** voorstel nie

| Diens | Hoekom nie |
|---|---|
| **Kling** | Jou besluit, en die syfers stem saam: Seedance kos ons ongeveer R2,62 vir 'n greep waar Kling R33,48 vra. Die "premium"-graad verdwyn net uit die keuselys; niks breek nie. |
| **OAuth by TikTok, YouTube, Instagram** | Elkeen vereis 'n goedgekeurde ontwikkelaar-toep, 'n hersiening, en in verskeie gevalle 'n geregistreerde besigheid — 'n tou aansoeke, nie 'n knoppie nie. Die profiel se koppel-knoppies hou vandag jou handvatsels, bou die regte profielskakels, en maak elke platform se eie plaas-bladsy oop met die byskrif reeds gekopieer. Dit is die eerlike weergawe, en dit sê so op die skerm. |
| **'n Aparte beeld-diens** | ElevenLabs se `flows/image` maak die omslae. Nog 'n rekening vir dieselfde werk is nog 'n faktuur. |
| **'n Aparte video-diens** | Dieselfde. Seedance en Veo loop albei deur die ElevenLabs-sleutel wat jy reeds het. |

---

# Nota: skryf 'n e-pos aan ElevenLabs

**Dit is die belangrikste ding op hierdie lys.** Nie omdat dit dringend is nie,
maar omdat dit die enigste ding is wat die vorm van die besigheid kan verander.

## Hoekom

Die som in `docs/KOSTE-EN-WINS.md` sê dit reguit: op ElevenLabs se gewone lys
is daar **geen pad wat by Creator, Pro of Scale bly en wins maak nie**. Nie
omdat die winsgrens per liedjie te dun is nie — dit is gesond op elke plan —
maar omdat elke plan 'n kredietdak het, en by die drie kleineres lê daardie dak
laer as die getal lede wat jy nodig het om gelyk te breek. Meer mense laat
inteken maak dit erger.

Die volgende trap is Business teen $990 'n maand. Die gaping tussen $330 en
$990 is presies waar hierdie besigheid vir die eerste jaar gaan sit.

## Wat om te vra

Nie "gee my afslag" nie. Vier spesifieke vrae, want 'n spesifieke vraag kry 'n
spesifieke antwoord:

1. **Is daar iets tussen Scale en Business?** 'n Trap teen ongeveer $500 met
   ongeveer 5 miljoen krediete sou die gaping toemaak.
2. **Kan musiek teen 'n ander koers as spraak geprys word?** Die toep brand
   900 krediete per minuut musiek en byna niks op spraak nie. 'n Musiek-koers
   help ons meer as 'n algemene afslag, en kos hulle minder.
3. **Bestaan daar 'n platform- of ontwikkelaarskoers?** FutureBox is nie 'n
   eindgebruiker nie — dit is 'n toep wat ElevenLabs aan honderde
   Suid-Afrikaanse makers verkoop. Dit is verspreiding, en verspreiding is
   gewoonlik iets werd.
4. **Dra die plan 'n kommersiële lisensie, en tot waar?** Lede mag wat hulle
   maak verkoop en versprei. Kry dit skriftelik, met die planvlak by, want dit
   is die belofte waarop die toep se voorwaardes staan.

## Wat om by te sit

- Wat FutureBox is: 'n Suid-Afrikaanse musiek- en stemateljee, Afrikaans en
  Engels, vir makers wat nie 'n studio het nie.
- Waar dit staan: die toep is gebou en loop; die eerste toetsers is in.
- Wat die verbruik gaan wees: ongeveer 1 800 krediete per vol liedjie, en die
  som verwag 60–250 betalende lede in die eerste jaar.
- Die maatskappy: **futureboxstudio**, CIPC 2026/714071/07.

## Praktiese punte

- Stuur dit van jou domein-adres af, nie van gmail nie. 'n Besigheidsversoek
  van 'n gratis posbus af land in die verkeerde tou.
- `enterprise@elevenlabs.io` of die "Contact sales"-vorm op hulle prysbladsy.
  Ek kon nie van hier af bevestig watter een die regte adres is nie — die
  proksie laat nie by elevenlabs.io uit nie — so kyk op die bladsy self voor jy
  stuur.
- Vra vir 'n gesprek eerder as 'n kwotasie. Verkope-spanne gee beter pryse in
  'n oproep as in 'n vorm.

---

## Die volgorde as jy môre wil begin

1. Die ses SQL-lêers by Supabase. Gratis, tien minute, en dit maak vier kamers
   wakker wat vandag "nie opgestel nie" antwoord.
2. `SPOTIFY_CLIENT_ID` en `SPOTIFY_CLIENT_SECRET`. Gratis, en dit voltooi
   Spotlight.
3. Die e-pos aan ElevenLabs. Kos niks, en die antwoord bepaal alles daarna.
4. Resend se vier veranderlikes, sodat die toelae-waarskuwings jou bereik
   voordat 'n enjin opraak eerder as daarna.
5. Paystack, wanneer jy gereed is om die eerste vreemdeling te laat betaal.
6. Music.ai, wanneer jy die donker kamers wil oopmaak.
