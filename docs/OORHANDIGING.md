# Oorhandiging — wat om na te kyk, en wat ons reeds weet

Geskryf 24 September 2026, vir wie ook al hierdie app gaan toets en gradeer.

**Die punt van hierdie bladsy is om jou tyd te spaar.** 'n Resensie is meer
werd wanneer dit gerig is, en die maklikste manier om 'n week te mors, is om
dinge te "ontdek" wat reeds op 'n lys staan met 'n rede daarby.

So: wat die app is, waar om te begin, wat reeds masjien-gehou word, wat ons
weet oop is, en — die deel waaroor ons regtig 'n mening wil hê — wat ons nie
self kan beoordeel nie.

---

## Wat dit is, in drie reëls

'n Ateljee. Jy skryf 'n lied met KI-hulp, sing self daarop, kloon jou stem vir
'n podsending, en sit 'n video daarby. Dit loop op ander mense se enjins —
ElevenLabs vir musiek en stemme, Anthropic vir die kopiloot — en verkoop
krediete in plaas van tyd.

Afrikaans en Engels, van die voordeur af, en die Afrikaans is nie 'n
terugvalvertaling nie: 'n reël wat nie vertaal is nie, breek die bou.

---

## Waar om te begin

| Begin hier | Hoekom |
|---|---|
| `docs/OPEN-QUESTIONS.md`, net die voordeur-blok | Die eerste ~40 reëls. Alles wat oop is, met waarop dit vassit. |
| `npm run checks` | 162 bron-checks. As dit groen is, is die claims in hierdie bladsy waar op vandag se kode. |
| `app/lib/credits.ts` | Die hele geldmodel, met die afleiding van elke prys daarby. |
| `docs/REGS-OUDIT.md` | Die regsoudit van 24 September, insluitend wat dit **nie** kon verifieer nie. |
| `docs/KOSTE-EN-WINS.md` | Gegenereer. Wat elke knoppie kos, gelykbreek, en die kapasiteitsdak. |

---

## Wat reeds masjien-gehou word

264 checks loop in CI. Dit is nie 'n gerusstelling nie — dit is 'n **kaart van
waar om nié te soek nie**, want elkeen is gebou ná 'n egte fout en elkeen is
eers op daardie fout laat faal voordat dit geglo is.

Die klasse wat gedek is:

- **Geld.** Elke prys dek sy eie stroomop-rekening (`check:kredietkoste`); die
  knoppie en die heffing stem ooreen (`check:prys`); alles wat geprys is, staan
  op 'n kaart of het 'n geskrewe rede (`check:sold`); die maandelikse rekening
  staan op een plek en elke dokument wat 'n totaal noem, noem 'n huidige een
  (`check:koste`).
- **Databasis-skrywes.** Geen `update` of `delete` sonder 'n filter
  (`check:unfiltered`) — veertien het bestaan.
- **Keuses.** Geen kieser val terug na die eerste ry (`check:whofirst`); geen
  reël lees "nie daar nie" as "eerste" (`check:ordering`).
- **Privaatheid.** Elke verskaffer wat persoonlike inligting kry, is op die
  privaatheidsbladsy benoem, en elke tabel wat rye aan 'n persoon koppel, is
  beskryf (`check:verwerkers`).
- **Taal.** Geen Engelse reël wat as Afrikaans deurgaan (`check:afrikaans`).
- **Skerm.** Kontras, duimgroottes, 390px, 14 regte toestelle, geen afgesnyde
  opskrifte — alles in 'n blaaier gemeet, nie in die kode nie.

'n Check wat niemand hardloop nie, is 'n aanspraak eerder dan 'n vangnet, so
`check:everycheck` faal as een nie in CI staan nie.

---

## Wat ons weet oop is

Moenie hierdie rapporteer nie — hulle staan almal in `OPEN-QUESTIONS.md` met
'n rede.

| Wat | Stand |
|---|---|
| Die agtergrondverwyderaar en item-verwyderaar in die redigeerder | Geprys, op die kaarte, **nie aangeskakel nie**. Hulle wag op 'n verwerkersantwoord — video van 'n persoon mag nie na 'n maatskappy gaan sonder 'n POPIA 72-basis nie. |
| 'n Verwerkersooreenkoms met Kits.AI | 'n Lid se stem gaan daarheen en daar is geen DPA op lêer nie. Die privaatheidsbladsy sê dit hardop. |
| Die pratende aanbieder | Gebou en donker. Wag op een vlag en een toetssnit. |
| TONE3000 se katalogus | Geblokkeer van ons masjien af. |
| Die kopieregtoets op oplaaie | 'n Besluit wat nog nie geneem is nie. |
| Die wetteks self | Die netwerk blokkeer gov.za en elke kopie van die ECT-Wet. Alles oor ECTA 43 rus op wat die repo aanteken. 'n Prokureur moet die s43(1)-lys bevestig. |

---

## Waaroor ons regtig 'n mening wil hê

Hierdie is die dinge wat 'n check nie kan sê nie, en waar 'n resensent se oog
meer werd is as nog 'n reël.

1. **Voel die tydlyne onder 'n duim reg?** Die Pro Booth s'n en die video-
   redigeerder s'n. Die somme is bewys en die gebare is in 'n blaaier bewys.
   Of dit *lekker* is, weet ons nie.

2. **Is die krediet-model verstaanbaar?** 'n Lied is 10, 'n bemarkingsplan 40,
   'n agtergrond uit 8 per vyf sekondes. Iemand wat dit die eerste keer sien —
   weet hulle wat hulle koop?

3. **Waar sê die app iets wat nie waar is nie?** Dít is die klas fout wat
   hierdie projek die meeste gekos het: 'n kommentaar of 'n kaart wat 'n reël
   beskryf wat nêrens geskryf is nie. Ons vang dit nou met checks waar ons dit
   kon vind. Waar 'n skerm iets belowe wat die kode nie doen nie, is dit die
   nuttigste ding wat jy vir ons kan wys.

4. **Die eerste uur.** 'n Nuwe mens, geen konteks. Waar gee hulle op? Daar is
   'n `check:firsthour` wat één pad loop en dit is nie dieselfde ding nie.

---

## Wat ons nie wegsteek nie

Hierdie app is deur een persoon gebou met 'n KI as haar enigste kollega, oor
ongeveer drie weke, en dit wys op plekke. Wat ons wel gedoen het, is om elke
keer as 'n fout gevind is, 'n reël te skryf wat keer dat dieselfde vorm
terugkom — en om die reël eers op die egte fout te laat faal voordat ons dit
geglo het.

As jy iets kry wat 'n check moes gevang het, is dit die beste terugvoer wat
daar is. Dit beteken die check meet iets **langsaan** die regte ding, en dit is
presies die soort fout wat maande lank groen bly.
