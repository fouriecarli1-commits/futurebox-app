# TONE3000 — hul ontwerpvereistes, soos hulle dit gestel het

Vasgelê op 5 Oktober 2026 uit `tone3000.com/api#design-requirements`, wat van
die bou-omgewing af nie bereikbaar is nie (die proxy weier dit met 'n 403), so
dit is hier eerder as in 'n gesprek wat weggaan.

Hul eie inleiding: *"They keep the experience consistent for users, protect
creator attribution, and make integration sign-off fast. The wireframes are
illustrative, so match them to your product's own design language."*

Dus: die **vorm** is ons s'n, die **inhoud** is hul vereiste. Elke punt hier
onder is 'n ding wat op die skerm moet wees, nie 'n uitleg wat nageboots moet
word nie.

---

## 1. Entry point

Die ingang is waar iemand 'n toon by 'n signal block **byvoeg of verander** —
nie 'n item in 'n menu êrens anders nie.

Vir ons is dit ProBooth se amp-kieser op 'n baan. Die lys wys eers ons eie
("host tones" — wat sy al gebring het, uit `lib/amps.ts`), en onderaan 'n
knoppie met hul logo: **Browse tones**.

## 2. Partnership splash

As die persoon nog nie by TONE3000 ingeteken is nie, wys eers 'n bladsy wat
die vennootskap bekendstel — vóór die sign-in begin. Hul aanbevole woorde:

> "[Your brand] has partnered with TONE3000 to give you access to a massive
> library of Neural Amp Modeler (NAM) captures and IRs of real analog gear,
> created by a global community of musicians."

Ons logo × hul logo, die sin, en een **Continue**.

## 3. Authentication

Deur hul **Select flow**: die persoon tik sy e-pos in en kry 'n sesyfer-kode.
Dit is hul skerm en hul logo, nie ons s'n nie.

## 4. Tone list views

Die eerste ding ná sign-in. **Elke** toon in enige lys of rooster moet dra:

- die toon se prentjie
- die gear title
- die gear type (Amp, Amp + Cab, Pedal, Cabinet, Experimental)
- die formaat — **NAM** of **IR**
- die maker: **username én avatar**
- TONE3000-handelsmerk op die view self

Die view wys ook die ingetekende persoon se eie avatar en username, sodat dit
duidelik is hy is ingeteken. Oortjies vir **Favorites**, **Created** en
**Downloaded** (almal deur die CRUD API), en **trending** en **latest** kan
gevra word om nuwe tone te ontdek.

Twee reëls wat maklik is om te mis:

- Waar ons 'n **gedeeltelike** lys wys (voorgestelde of onlangse tone), moet
  daar 'n kaart of skakel by wees wat uitnooi om meer op TONE3000 te ontdek.
- Daar moet **altyd** 'n duidelike, blywende pad wees na die volle katalogus
  deur die Select flow — die "Browse TONE3000"-knoppie. Voorgestelde en
  onlangse tone is 'n beginpunt, nie 'n plaasvervanger nie.

## 5. Loaded tones in the signal chain

'n Toon wat uit TONE3000 gelaai is, wys **binne sy signal block** die toon se
prentjie en die **T3K**-merk. Waar daar plek is, ook die tone pack title, gear
type, formaat en maker.

Vir ons: 'n baan in ProBooth met 'n TONE3000-amp op dra die merk en die
prentjie — nie net 'n naam nie.

## 6. Tone details

'n Toon aantik, uit 'n lys of uit 'n signal block, maak 'n besonderhede-bladsy
oop met:

- die tone pack se prentjie
- die tone pack title
- gear type
- formaat (NAM of IR)
- maker: username én avatar
- **model selector**

Hulle stel dit uitdruklik: iemand moet maklik tussen die **modelle binne een
tone pack** kan wissel vanaf hierdie bladsy. Waar daar plek is, ook die maker
se eie beskrywing.

Dit is die een wat ons datamodel raak: 'n tone pack is nie een lêer nie, dit
is 'n **stel modelle**. `lib/amps.ts` hou vandag een capture met een naam, en
dit sal 'n pack met sy variante moet kan hou.

## 7. Logo usage — die reël wat die maklikste gebreek word

- 'n Mens moet die **volle TONE3000-logo** sien **voordat** hy die korter
  **T3K**-merk sien, sodat hy weet wat T3K beteken. Dit is 'n volgorde-reël,
  nie 'n plasing-reël nie, en dit is die een wat 'n mens per ongeluk breek.
- Die **volle logo** by ingange en eerste blootstelling: die partnership
  splash en die kop van lys-bladsye.
- Die **T3K-merk** op klein plekke: die knoppie wat die Select flow oopmaak,
  en as merker op 'n signal block sodat die oorsprong van daardie toon
  duidelik is.
- Die amptelike logo-lêers word van hul bladsy af afgelaai — moenie een
  naboots of hertrek nie.

---

## Wat dit vir ons beteken wat nog nie bestaan nie

Die amp-enjin werk klaar: `lib/nam.ts` laat egte captures in die browser loop
en `check:nam` hou dit aan 12 000 veranderde samples en block-size
onafhanklikheid. Wat nie bestaan nie is **enigiets om te laai** — vandag moet
iemand sy eie `.nam` lêer gaan haal.

Nuut nodig:

1. 'n TONE3000-sessie per persoon (hul Select flow, nie ons accounts nie)
2. die splash, een keer, voor die eerste sign-in
3. 'n bladerder oor hul katalogus met al ses velde per toon
4. Favorites / Created / Downloaded oortjies
5. 'n blywende "Browse TONE3000" uit ProBooth se amp-kieser
6. die maker se naam en avatar **saam met die capture gestoor**, sodat die
   attribution bly wanneer die amp op 'n baan is — nie net in die bladerder nie
7. 'n tone pack as 'n **stel modelle** eerder as een lêer, met 'n kieser om
   tussen die variante te wissel
8. die T3K-merk en die toon se prentjie op die baan self
9. die volgorde-reël afgedwing: die volle logo eers, die merk daarna

Punt 6 en 7 is dié wat later duur word as hulle nou gemis word. `lib/amps.ts`
hou vandag een capture met een naam. Die maker se krediet moet langs die klank
bly — dit is wat hulle vra en dit is ook net reg — en 'n pack met drie
variante pas nie in 'n veld wat een lêer hou nie.

Punt 9 is 'n goeie kandidaat vir 'n `check:tone3000`: dit is 'n reël oor
VOLGORDE, dit breek stilweg wanneer iemand 'n T3K-merk op 'n nuwe plek sit, en
niks op die skerm lyk verkeerd wanneer dit gebreek is nie.

## Wat nog oop is voor dit gebou kan word

- die API-dokumentasie self (endpoints, die Select flow, die CRUD API)
- die API Terms of Service, woordeliks
- die amptelike logo-lêers, van hul aflaai-skakel af
- credentials, wat in Vercel hoort en nêrens anders nie

Die sewe ontwerpvereistes is volledig — 1 tot 7, met albei wireframes elk.
