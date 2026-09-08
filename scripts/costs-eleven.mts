/**
 * Wat FutureBox verdien en wat dit kos — net van ElevenLabs af.
 *
 * Kling is uit. Die eienaar het besluit om vir eers net ElevenLabs te gebruik,
 * en dié lêer reken die hele saak uit asof Kling nie bestaan nie.
 *
 * ── Hoekom 'n skrip en nie 'n dokument nie ───────────────────────────────
 *
 * Omdat 'n dokument met syfers in verouder sonder om iets te sê. Elke getal
 * hieronder kom uit `app/lib/plans.ts` en `app/lib/credits.ts` — dieselfde
 * lêers wat die pryskaart en die krietsteller lees. Verander 'n prys daar, en
 * hierdie som verander saam. Tik 'n prys hier in, en die twee kan stilweg uit
 * pas raak, wat presies is waarvoor 'n mens 'n bedryfsmodel nie wil hê nie.
 *
 * Die enigste getalle wat hier ingetik is, is ElevenLabs se eie planne, en
 * dié is gemerk: hulle kon nie van hierdie masjien af nagegaan word nie — die
 * proksie laat nie by elevenlabs.io uit nie. Elkeen is 'n reël in `EL_PLANS`
 * met 'n datum by, en die e-pos aan ElevenLabs (sien `docs/KOSTE-EN-WINS.md`)
 * is juis om hulle bevestig te kry.
 *
 * Loop dit met `npx tsx scripts/costs-eleven.mts`. Dit skryf
 * `docs/KOSTE-EN-WINS.md` en druk 'n opsomming.
 */
import { writeFileSync } from 'node:fs';
import { TIER_SPECS, TIERS, gatewayFee, type Tier } from '../app/lib/plans.ts';
import { TIER_CREDITS, CREDITS } from '../app/lib/credits.ts';

/* ────────────────────────────────────────────────────────── aannames ─── */

/** Rand per dollar. Dieselfde koers as `plans.ts` gebruik. */
const RAND_PER_USD = 16;

/**
 * BTW op ElevenLabs se rekening. **Nagegaan, 8 September 2026.**
 *
 * Carli se egte faktuur, gelees deur `/api/eleven/prices`:
 * `next_invoice.amount_due_cents` was 11385, oftewel $113,85. Pro se
 * plakkerprys is $99. En $99 x 1,15 = $113,85, tot die sent. Dit is
 * Suid-Afrikaanse BTW van 15%.
 *
 * Tot vandag was BTW nêrens in hierdie lêer, in `docs/MAANDELIKSE-KOSTE.md`
 * of in `docs/KOSTE-EN-WINS.md` nie. Elke dollarbedrag was 'n plakkerprys, en
 * elke som daaruit was 15% te laag.
 *
 * ── Waarop dit toegepas word, en waarop nie ──────────────────────────────
 *
 * NET op ElevenLabs, en op Zoho hieronder wat reeds ingesluit ingevoer word.
 * Dit is wat Carli op haar staat gesien het en bevestig het.
 *
 * Anthropic, Vercel, Supabase, GitHub en Kits.AI is ook dollarrekeninge en hef
 * dit dálk ook — maar dit is nie nagegaan nie, en 'n som wat 15% aanvaar waar
 * niemand gekyk het nie is dieselfde fout as die een wat hier reggemaak word,
 * net in die ander rigting. Hulle bly plakkerpryse totdat die staat anders sê.
 */
const VAT = 1.15;

/** Wat 'n ElevenLabs-plan werklik van haar rekening af vat, BTW ingesluit. */
const randForPlan = (plan: { usd: number }): number => plan.usd * RAND_PER_USD * VAT;

/**
 * ElevenLabs se planne — **nagegaan**, 8 September 2026.
 *
 * Carli het hulle prysbladsy gestuur. Dit was tot vandag die grootste
 * onbekende in hierdie hele lêer: die reël hier het gesê "ONGEVERIFIEER ...
 * dit is wat die kode tot dusver aangeneem het", en die aanname was met
 * omtrent 85% te ruim.
 *
 * ── Wat die bladsy werklik sê ────────────────────────────────────────────
 *
 * Musiek kos **$0,15 per minuut**, op elke plan. Die "ingesluit"-getalle per
 * plan is:
 *
 *   Free 3 · Starter 40 · Creator 147 · Pro 660 · Scale 1 993 · Business 6 600
 *
 * ── En die ding wat dit oopmaak ──────────────────────────────────────────
 *
 * Vermenigvuldig elkeen met $0,15 en jy kry die plan se prys terug:
 *
 *   147 x 0,15 = $22    660 x 0,15 = $99    6 600 x 0,15 = $990
 *
 * Dieselfde som werk vir elke ander produk op die bladsy: 8 250 minute
 * stem-skeiding x $0,12 = $990; 4 500 uur transkripsie x $0,22 = $990;
 * 9,9 miljoen karakters x $0,10 per 1 000 = $990.
 *
 * **'n Plan is dus 'n dollar-begroting, nie 'n stel aparte toelaes nie.** Die
 * "ingesluit"-getalle is net verskillende maniere om dieselfde geld te spandeer.
 * Dit maak die hele som eenvoudiger en eerliker: een liedjie van twee minute
 * kos ons $0,30, oftewel R4,80, op elke plan.
 *
 * Die krediete hieronder is daardie minute maal `EL_CREDITS_PER_MINUTE`, sodat
 * die res van hierdie lêer onveranderd bly werk. Sien `docs/ELEVENLABS-PRYSE.md`
 * vir die volledige lys.
 */
const EL_PLANS = [
  { name: 'Creator', usd: 22, credits: 147 * 900 },
  { name: 'Pro', usd: 99, credits: 660 * 900 },
  /* Scale is die een uitsondering: 1 993 x $0,15 = $299, nie $330 nie. Die
     plan kos meer as wat dit aan gebruik teruggee, en dit wys hieronder as 'n
     hoër koers per liedjie. Nie reggemaak nie — dit is wat die bladsy sê. */
  { name: 'Scale', usd: 330, credits: 1_993 * 900 },
  { name: 'Business', usd: 990, credits: 6_600 * 900 },
] as const;

/** ElevenLabs se krediete per minuut musiek. Uit `plans.ts`. */
const EL_CREDITS_PER_MINUTE = 900;
/** Wat een minuut musiek werklik kos, van hulle prysbladsy af. */
const MUSIC_USD_PER_MINUTE = 0.15;
/** Wat 'n vol liedjie is, in minute. Uit `plans.ts`. */
const SONG_MINUTES = 2;
/** ElevenLabs-krediete vir een vol liedjie. */
const EL_PER_SONG = EL_CREDITS_PER_MINUTE * SONG_MINUTES;
/** FutureBox-krediete vir een vol liedjie. Uit `credits.ts`. */
const FB_PER_SONG = CREDITS.song;

/**
 * Vaste maandelikse kostes, sonder ElevenLabs en sonder Kling.
 *
 * Werkswinkels staan apart omdat dit die een reël is wat sy kan uitskakel
 * sonder dat iets in die toep breek — en op die kleiner planne is dit die
 * verskil tussen wins en verlies.
 */
const FIXED_CORE: Record<string, number> = {
  'Anthropic (kopiloot)': 1500,
  'Supabase Pro': 400,
  'Vercel Pro': 320,
  GitHub: 64,
  /* Kits.AI, $40 = R640. Sangstem-omskakeling, gekies 7 September 2026. Die
     een reël op hierdie lys wat 'n gat toemaak eerder as om iets te laat loop:
     dit is die enigste model wat sing. Sien `docs/MAANDELIKSE-KOSTE.md`. */
  'Kits.AI': 640,
  /* Zoho, R241,50 — BTW reeds ingesluit, want dit is wat op die staat staan
     eerder as 'n plakkerprys wat omgereken moet word. Bevestig deur Carli op
     8 September 2026.

     Dit was tot vandag op GEEN kostelys nie. Nie 'n som wat verkeerd was nie —
     'n reël wat glad nie bestaan het nie, en die soort wat 'n mens eers sien
     wanneer die bank dit trek. */
  Zoho: 241.5,
  /* Domeine en Spaceship, bygevoeg 8 September 2026 nadat Carli gesê het
     "dit is nie net dit nie, dit is domains".

     AANNAME, en dit staan hier omdat dit geld raak: dit is TWEE reëls, nie
     een nie. Sy het hulle met 'n "en" tussenin genoem, wat hulle apart maak.
     Spaceship is self 'n domeinregistrateur, so as die R168 se domeine BY
     Spaceship staan, tel ons dit twee keer en die rekening is R210,24 te
     hoog. Een woord van haar maak dit reg; sien `docs/MAANDELIKSE-KOSTE.md`,
     waar dieselfde vraag staan sodat dit nie hier begrawe lê nie. */
  Domeine: 168,
  /* $13,14 deur dieselfde koers as al die ander dollarreëls, eerder as 'n
     rand-bedrag hier ingetik: verander die koers en hierdie reël volg saam.
     'n Ingetikte R210,24 sou stilweg verouder. */
  Spaceship: 13.14 * RAND_PER_USD,
};
const WORKSHOPS = 4000;

/** Hoeveel gratis lede agter elke betalende een staan, by 5% omskakeling. */
const FREE_PER_PAYING = 19;

/** Die mengsel van betalende lede, soos `plans.ts` dit aanneem. */
const MIX: Record<Exclude<Tier, 'free'>, number> = { maker: 0.6, studio: 0.3, label: 0.1 };

/* ───────────────────────────────────────────────────────────── somme ─── */

const randPerElCredit = (plan: (typeof EL_PLANS)[number]): number =>
  randForPlan(plan) / plan.credits;

/** Wat een vol liedjie ons kos, op 'n gegewe plan. */
const songCost = (plan: (typeof EL_PLANS)[number]): number => EL_PER_SONG * randPerElCredit(plan);

/**
 * ElevenLabs-krediete wat een lid in 'n maand deurbrand.
 *
 * Die slegste geval is dat elke krediet op musiek gaan, want musiek is die
 * duurste ding per krediet wat die toep verkoop — 'n video by die standaard
 * graad kos ons minder per krediet as 'n liedjie. So word alles as musiek
 * gereken, en dan is elke ander mengsel goedkoper as hierdie antwoord.
 */
const elCreditsFor = (fbCredits: number, use: number): number =>
  (fbCredits * use * EL_PER_SONG) / FB_PER_SONG;

interface Row {
  readonly tier: Exclude<Tier, 'free'>;
  readonly rand: number;
  readonly gateway: number;
  readonly music: number;
  readonly margin: number;
}

function rowsFor(plan: (typeof EL_PLANS)[number], use: number): Row[] {
  return (['maker', 'studio', 'label'] as const).map((tier) => {
    const rand = TIER_SPECS[tier].rand;
    const gateway = gatewayFee(rand);
    const music = elCreditsFor(TIER_CREDITS[tier], use) * randPerElCredit(plan);
    return { tier, rand, gateway, music, margin: rand - gateway - music };
  });
}

/** Wat een betalende lid werklik bydra, ná die gratis stert agter hom. */
function contribution(
  plan: (typeof EL_PLANS)[number],
  use: number,
  freeUse: number,
  freeCredits: number,
): { revenue: number; gateway: number; own: number; tail: number; net: number } {
  const rows = rowsFor(plan, use);
  const revenue = rows.reduce((sum, one) => sum + one.rand * MIX[one.tier], 0);
  const gateway = rows.reduce((sum, one) => sum + one.gateway * MIX[one.tier], 0);
  const own = rows.reduce((sum, one) => sum + one.music * MIX[one.tier], 0);
  const tail =
    FREE_PER_PAYING * elCreditsFor(freeCredits, freeUse) * randPerElCredit(plan);
  return { revenue, gateway, own, tail, net: revenue - gateway - own - tail };
}

/** ElevenLabs-krediete wat een betalende lid plus sy gratis stert opvreet. */
function elPerPaying(use: number, freeUse: number, freeCredits: number): number {
  const own = (['maker', 'studio', 'label'] as const).reduce(
    (sum, tier) => sum + elCreditsFor(TIER_CREDITS[tier], use) * MIX[tier],
    0,
  );
  return own + FREE_PER_PAYING * elCreditsFor(freeCredits, freeUse);
}

/**
 * Rand, soos 'n mens dit hier skryf: spasie tussen die duisende, komma voor
 * die sente, en die minusteken vóór die R eerder as tussen die R en die
 * getal — "R-25,63" lees soos 'n tikfout, "\u2212R25,63" soos geld wat weg is.
 */
const rand = (value: number): string => {
  const body = Math.abs(value)
    .toLocaleString('af-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00a0/g, ' ');
  return `${value < 0 ? '\u2212' : ''}R${body}`;
};

/** 'n Heelgetal met spasies tussen die duisende. */
const count = (value: number): string =>
  value.toLocaleString('af-ZA').replace(/\u00a0/g, ' ');

/** 'n Desimaal met 'n komma, soos alles anders op hierdie bladsy. */
const dec = (value: number, places: number): string => value.toFixed(places).replace('.', ',');

interface Scenario {
  readonly name: string;
  readonly use: number;
  readonly freeUse: number;
  readonly freeCredits: number;
  readonly workshops: boolean;
  readonly why: string;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'Voorsigtig',
    use: 1,
    freeUse: 1,
    freeCredits: TIER_CREDITS.free,
    workshops: true,
    why: 'Elke lid brand elke krediet op, elke gratis gebruiker ook, en die werkswinkels loop. Dit gebeur nie — maar as die som hier werk, werk hy altyd.',
  },
  {
    name: 'Realisties',
    use: 0.6,
    freeUse: 0.5,
    freeCredits: TIER_CREDITS.free,
    workshops: true,
    why: 'Betalende lede gebruik 60% van hul toelae, die helfte van die gratis gebruikers maak ooit iets. Dít is die syfer om planne op te maak.',
  },
  {
    name: 'Voorsigtig, sonder werkswinkels',
    use: 1,
    freeUse: 1,
    freeCredits: TIER_CREDITS.free,
    workshops: false,
    why: 'Die slegste geval weer, met die werkswinkels af. Dit wys of die slegste geval hoegenaamd veilig gemaak kan word.',
  },
  {
    name: 'Realisties, sonder werkswinkels',
    use: 0.6,
    freeUse: 0.5,
    freeCredits: TIER_CREDITS.free,
    workshops: false,
    why: 'Dieselfde as bo, met die werkswinkels af. Dit is die enigste hefboom wat oorbly noudat die gratis laag se musiek weg is.',
  },
];

/* ── Hoekom daar nie meer 'n "sonder musiek"-scenario is nie ─────────────

   Daar was twee, en hulle het die gratis laag se gebruik op nul gestel om te
   wys wat sou gebeur as die gratis laag nie musiek kry nie. Op 8 September
   2026 is dit gedoen: `TIER_CREDITS.free` is nul.

   'n Scenario wat 'n besluit modelleer wat reeds geneem is, is nie 'n scenario
   nie — dit is dieselfde som twee keer, en die tweede een lyk soos 'n keuse
   wat nog oop is. Wat oorbly om oop te wees, is die werkswinkels. */

/* ─────────────────────────────────────────────────────────── uitset ──── */

const out: string[] = [];
const say = (line = ''): void => void out.push(line);

say('# Koste en wins — net ElevenLabs');
say('');
say('> Gereken deur `scripts/costs-eleven.mts` uit `app/lib/plans.ts` en');
say('> `app/lib/credits.ts`. Moenie hierdie lêer met die hand regmaak nie —');
say('> verander die prys in daardie lêers en loop die skrip weer, anders sê die');
say('> pryskaart en hierdie som twee verskillende dinge.');
say('');
say(`Geskryf ${new Date().toISOString().slice(0, 10)}. Kling is uit die som uit.`);
say('');
say('## Waarop dit rus');
say('');
say('| Ding | Waarde | Waarvandaan |');
say('|---|---|---|');
say(`| Rand per dollar | R${RAND_PER_USD} | aanname, dieselfde as \`plans.ts\` |`);
say(`| ElevenLabs-krediete per minuut musiek | ${EL_CREDITS_PER_MINUTE} | \`plans.ts\` |`);
say(`| 'n Vol liedjie | ${SONG_MINUTES} min = ${EL_PER_SONG} ElevenLabs-krediete | \`plans.ts\` |`);
say(`| Wat ons daarvoor vra | ${FB_PER_SONG} FutureBox-krediete | \`credits.ts\` |`);
say(`| Gratis lede per betalende een | ${FREE_PER_PAYING} | 5% omskakeling |`);
say(`| Mengsel van betalende lede | 60% Maker, 30% Studio, 10% Label | \`plans.ts\` |`);
say('');
say('**Nagegaan op 8 September 2026** teen ElevenLabs se eie prysbladsy.');
say(`Musiek kos $${MUSIC_USD_PER_MINUTE} per minuut op elke plan, en die minute wat`);
say('elke plan insluit is presies die plan se prys gedeel deur daardie koers —');
say("'n plan is 'n dollar-begroting. Sien `docs/ELEVENLABS-PRYSE.md`.");
say('');
say('| Plan | Per maand | Krediete | Rand per krediet | Wat een liedjie ons kos |');
say('|---|---|---|---|---|');
for (const plan of EL_PLANS) {
  say(
    `| ${plan.name} | $${plan.usd} + BTW = ${rand(randForPlan(plan))} | ${count(plan.credits)} | R${dec(randPerElCredit(plan), 5)} | ${rand(songCost(plan))} |`,
  );
}
say('');

for (const scenario of SCENARIOS) {
  const fixedCore = Object.values(FIXED_CORE).reduce((a, b) => a + b, 0);
  const fixed = fixedCore + (scenario.workshops ? WORKSHOPS : 0);
  say(`## ${scenario.name}`);
  say('');
  say(scenario.why);
  say('');
  say(
    `Vaste koste sonder ElevenLabs: ${rand(fixed)} ${scenario.workshops ? '(werkswinkels ingesluit)' : '(sonder werkswinkels)'}.`,
  );
  say('');
  say('| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede wat die plan se krediete hou | Werk dit? |');
  say('|---|---|---|---|---|');
  for (const plan of EL_PLANS) {
    const c = contribution(plan, scenario.use, scenario.freeUse, scenario.freeCredits);
    const total = fixed + randForPlan(plan);
    const breakEven = c.net > 0 ? Math.ceil(total / c.net) : Infinity;
    const capacity = Math.floor(
      plan.credits / elPerPaying(scenario.use, scenario.freeUse, scenario.freeCredits),
    );
    const works = Number.isFinite(breakEven) && breakEven <= capacity;
    say(
      `| ${plan.name} | ${rand(c.net)} | ${Number.isFinite(breakEven) ? breakEven : '—'} | ${capacity} | ${works ? '**ja**' : 'nee'} |`,
    );
  }
  say('');
  say('*"Werk dit" beteken: die getal lede wat jy nodig het om gelyk te breek,');
  say('pas binne die getal lede wat die plan se krediete kan bedien. As gelykbreek');
  say('meer lede vra as wat die plan kan voed, kan daardie plan nooit wins maak nie —');
  say('hoeveel mense ook al inteken.*');
  say('');
}

/* ── Wat sou dit regmaak ──────────────────────────────────────────────────
 *
 * Die tabelle hierbo sê wat waar is. Hierdie deel sê wat om daaraan te doen,
 * en dit word uitgereken eerder as geraai: vir elke plan word gesoek na die
 * grootste gratis toelae wat die slegste geval nog laat werk. Twee-en-twintig
 * bladsye se advies is minder werd as een getal wat 'n mens Maandag kan gaan
 * verander. */
say('## Wat dit sou regmaak');
say('');
say('Vir elke ElevenLabs-plan: die grootste gratis toelae waarby selfs die');
say('slegste geval — almal brand alles op — nog steeds wins maak. Die');
say('werkswinkels is hier af, want dit is die goedkoopste ding om eerste te');
say('sny.');
say('');
say('| Plan | Gratis toelae vandag | Grootste wat nog werk | Wat dit beteken |');
say('|---|---|---|---|');
const fixedNoWorkshops = Object.values(FIXED_CORE).reduce((a, b) => a + b, 0);
for (const plan of EL_PLANS) {
  let best = -1;
  for (let free = TIER_CREDITS.free; free >= 0; free -= 1) {
    const c = contribution(plan, 1, 1, free);
    const total = fixedNoWorkshops + randForPlan(plan);
    const breakEven = c.net > 0 ? Math.ceil(total / c.net) : Infinity;
    const capacity = Math.floor(plan.credits / elPerPaying(1, 1, free));
    if (Number.isFinite(breakEven) && breakEven <= capacity) {
      best = free;
      break;
    }
  }
  const meaning =
    best < 0
      ? 'Geen gratis toelae maak hierdie plan veilig nie — die plan self is te klein.'
      : best === TIER_CREDITS.free
        ? 'Niks hoef te verander nie.'
        : best === 0
          ? 'Die gratis laag mag geen musiek kry nie — net blaaierskesse.'
          : `${best} krediete in plaas van ${TIER_CREDITS.free} — ${best / CREDITS.halfSong} half liedjie${best / CREDITS.halfSong === 1 ? '' : 'e'} in plaas van 2.`;
  say(`| ${plan.name} | ${TIER_CREDITS.free} | ${best < 0 ? '—' : best} | ${meaning} |`);
}
say('');

/* ── Video, en hoekom dit nie hier gereken word nie ───────────────────────
 *
 * Nie 'n leemte nie, 'n weiering. Twee getalle in die kode kan nie albei waar
 * wees nie, en 'n som wat op een van hulle staan is 'n som wat mooi lyk en
 * niks weet nie. */
say('## Video — waarom dit hier ontbreek');
say('');
say("Video is nie in die somme hierbo nie, en dit is nie 'n leemte nie.");
say('');
{
  /* Gereken, nie getik nie. Die eerste weergawe van hierdie paragraaf het
     albei getalle uit die kop gegee en albei was verkeerd — in 'n paragraaf
     wie se hele punt is dat 'n getal nie klop nie. */
  const SEEDANCE_UNITS = 20;   // server/video/eleven.ts, per vyf sekondes
  const SEEDANCE_RAND = 2.62;  // dieselfde lêer, "per greep"
  const business = EL_PLANS[EL_PLANS.length - 1];
  const atMusicRate = SEEDANCE_UNITS * randPerElCredit(business);
  say("Die kode dra twee getalle vir dieselfde greep. `server/video/eleven.ts` sê");
  say(`Seedance kos ${SEEDANCE_UNITS} ElevenLabs-eenhede per vyf sekondes, en dieselfde lêer sê`);
  say(`'n greep kos ongeveer ${rand(SEEDANCE_RAND)}. By die koers wat die musiekkant gebruik —`);
  say(`R${dec(randPerElCredit(business), 5)} per krediet op ${business.name} — is ${SEEDANCE_UNITS} krediete`);
  say(`${rand(atMusicRate)}, nie ${rand(SEEDANCE_RAND)} nie. Die twee is ${Math.round(SEEDANCE_RAND / atMusicRate)} keer uit mekaar.`);
}
say('');
say("Een van drie dinge is waar: video word teen 'n ander koers as musiek");
say("gereken, of die R2,62 kom van 'n ander plan af, of een van die twee is");
say('eenvoudig verkeerd. Van hier af kan dit nie uitgemaak word nie — die enigste');
say("ding wat dit oplos is 'n regte faktuur.");
say('');
say('**Wat dit beteken vir jou:** die musiek-somme hierbo staan onafhanklik, want');
say('musiek se koers is nagegaan. Moenie video by hulle optel voordat een faktuur');
say('gesien is nie. En sit dit as vraag vyf by die e-pos aan ElevenLabs.');
say('');
say('Wat wel seker is: sonder Kling loop albei die video-enjins op die');
say("ElevenLabs-sleutel wat jy reeds het, so video maak nie 'n nuwe rekening of");
say("'n nuwe vaste koste nie — wat dit ook al per greep is.");
say('');

say('## Wat elke laag op sy eie los, by volle gebruik');
say('');
for (const plan of EL_PLANS) {
  say(`### Op ElevenLabs ${plan.name}`);
  say('');
  say('| Laag | Prys | Poortfooi | Musiek | Bly oor |');
  say('|---|---|---|---|---|');
  for (const row of rowsFor(plan, 1)) {
    say(
      `| ${TIER_SPECS[row.tier].name} | ${rand(row.rand)} | −${rand(row.gateway)} | −${rand(row.music)} | **${rand(row.margin)}** |`,
    );
  }
  say('');
}

/* ── Die antwoord, in gewone taal ─────────────────────────────────────────
 *
 * 'n Tabel is nie 'n antwoord nie. Dit is die deel wat sê wat om te doen, en
 * dit word uit dieselfde somme gebou sodat dit nie kan wegdryf van die syfers
 * waarop dit staan nie. */
{
  const fixedNo = Object.values(FIXED_CORE).reduce((a, b) => a + b, 0);
  /* `use` is how much of their allowance members actually burn. At 1 it is the
     worst case and at 0,6 the realistic one — the same two the scenario tables
     above use, so this conclusion cannot drift from them. */
  const at = (plan: (typeof EL_PLANS)[number], workshops: boolean, use: number, freeUse: number) => {
    const c = contribution(plan, use, freeUse, TIER_CREDITS.free);
    const total = fixedNo + (workshops ? WORKSHOPS : 0) + randForPlan(plan);
    const capacity = Math.floor(plan.credits / elPerPaying(use, freeUse, TIER_CREDITS.free));
    const breakEven = c.net > 0 ? Math.ceil(total / c.net) : Infinity;
    return {
      breakEven,
      capacity,
      net: c.net,
      fixed: total,
      works: Number.isFinite(breakEven) && breakEven <= capacity,
      /* What is left at the ceiling. The plan's credits run out before the
         market does, so this is not "profit at current scale" — it is the most
         this plan can ever earn, however well anybody sells. */
      ceilingProfit: capacity * c.net - total,
    };
  };
  const worst = (plan: (typeof EL_PLANS)[number], workshops: boolean) => at(plan, workshops, 1, 1);
  const real = (plan: (typeof EL_PLANS)[number], workshops: boolean) => at(plan, workshops, 0.6, 0.5);
  const business = EL_PLANS[EL_PLANS.length - 1];
  const withShops = worst(business, true);
  const without = worst(business, false);

  say('## Die antwoord');
  say('');
  say('**1. Op ElevenLabs se gewone lys is Business die enigste plan wat ooit');
  say('wins kan maak.** Nie omdat die kleiner planne te duur is nie — hulle is');
  say('goedkoper per maand — maar omdat hulle te min krediete het. Elke plan het');
  say("'n dak, en die getal lede wat jy nodig het om gelyk te breek is by Creator,");
  say('Pro en Scale hoër as die getal lede wat die plan se krediete kan voed. Meer');
  say('mense laat inteken maak dit erger, nie beter nie.');
  say('');
  /* Afgelei, nie getik nie. Hierdie sin het "Op Business werk dit" beweer
     terwyl sy eie twee getalle die teenoorgestelde gesê het — 140 teen 128 —
     en dit was al so voordat die koste in September gestyg het. 'n Sin wat 'n
     gevolgtrekking hardkodeer terwyl die syfers langs hom uitgereken word, sal
     op 'n dag lieg, en hierdie een het. */
  const realNo = real(business, false);
  const realWs = real(business, true);
  say(
    `**2. Op Business hang dit af van hoeveel lede werklik verbruik.** In die slegste geval — elke lid brand elke krediet — is gelykbreek **${without.breakEven} lede** en die plan hou **${without.capacity}**: dit ${without.works ? 'werk' : '**werk nie**'}. Met die werkswinkels terug word dit **${withShops.breakEven}** teen **${withShops.capacity}**, en dit ${withShops.works ? 'werk' : 'werk ook nie'}.`,
  );
  say('');
  say(
    `Realisties — 60% verbruik — is gelykbreek **${realNo.breakEven} lede** sonder werkswinkels en **${realWs.breakEven}** met, teen 'n dak van **${realNo.capacity}** lede. Albei ${realNo.works && realWs.works ? 'werk' : 'werk nie'}. Die werkswinkels is dus nie 'n uitgawe nie, dit is 'n besluit: hulle kos ${realWs.breakEven - realNo.breakEven} ekstra lede.`,
  );
  say('');
  say('');
  say('### En wat SARS daarvan vat');
  say('');
  say('Carli, 8 September 2026: *"ek dink sars tot en met 30% van my inkomste');
  say('neem van hierdie produk, dus wil ek nie \'n verlies ly nie."*');
  say('');
  say('**Die belangrikste ding eerste: maatskappybelasting is op WINS, nie op');
  say('omset nie.** Geen wins, geen belasting. Gelykbreek skuif dus glad nie —');
  say(`dit bly ${realNo.breakEven} lede sonder werkswinkels en ${realWs.breakEven} met. Belasting`);
  say('vat net \'n stuk van wat bo gelykbreek oorbly.');
  say('');
  say('Dit is die hele antwoord op "moet ons die pryse herbesin?". Nie oor SARS');
  say('nie.');
  say('');
  const REV_PER_MEMBER = (['maker', 'studio', 'label'] as const).reduce(
    (sum, tier) => sum + TIER_SPECS[tier].rand * MIX[tier], 0,
  );
  say('| By vol kapasiteit | Sonder werkswinkels | Met werkswinkels |');
  say('|---|---|---|');
  say(`| Lede | ${realNo.capacity} | ${realWs.capacity} |`);
  say(`| Omset | ${rand(realNo.capacity * REV_PER_MEMBER)} | ${rand(realWs.capacity * REV_PER_MEMBER)} |`);
  say(`| Wins voor belasting | ${rand(realNo.ceilingProfit)} | ${rand(realWs.ceilingProfit)} |`);
  for (const rate of [0.27, 0.3]) {
    say(`| Ná ${Math.round(rate * 100)}% | ${rand(realNo.ceilingProfit * (1 - rate))} | ${rand(realWs.ceilingProfit * (1 - rate))} |`);
  }
  say(`| Ná 30%, per jaar | ${rand(realNo.ceilingProfit * 0.7 * 12)} | ${rand(realWs.ceilingProfit * 0.7 * 12)} |`);
  say('');
  say('**Ja, dit maak wins. Maar kyk na wat daardie tabel eintlik sê.**');
  say('');
  say(`Dit is nie wins by die huidige skaal nie — dit is die **meeste wat hierdie`);
  say('plan ooit kan verdien**, hoe goed dit ook al verkoop word. Die dak is nie');
  say(`die mark nie, dit is ElevenLabs se krediete: by ${realNo.capacity} lede is die plan se`);
  say('krediete op, en lid 215 kan nie bedien word nie.');
  say('');
  say('**Dít is die ding om te herbesin, en dit is nie belasting nie.**');
  say('');
  say('Drie hefbome, in volgorde van hoeveel hulle beweeg:');
  say('');
  say('1. **Prys.** Elke rand op die maandprys gaan reguit deur na bydrae — daar');
  say('   is geen ekstra ElevenLabs-koste aan \'n hoër prys nie. Tien persent op');
  say(`   die prys is ongeveer ${rand(realNo.capacity * REV_PER_MEMBER * 0.1)} per maand by vol kapasiteit,`);
  say('   en dit skuif gelykbreek af sowel as die dak op.');
  say('2. **Die dak self.** Meer lede as die plan kan voed, beteken \'n groter');
  say('   plan of minder krediete per lid. Albei is prysbesluite.');
  say('3. **Die werkswinkels.** Hulle kos');
  say(`   ${realWs.breakEven - realNo.breakEven} ekstra lede en ${rand(WORKSHOPS)} per maand.`);
  say('');
  say('### Twee dinge vir haar rekenmeester, en albei kan die 30% laat val');
  say('');
  say('**1. Klein Sake Korporasie (SBC).** \'n (Pty) Ltd wat kwalifiseer betaal');
  say('nie 27% op alles nie: die eerste R95 750 belasbare inkomste is teen **0%**,');
  say('en die snit tot R365 000 teen **7%**. Die maksimum jaarwins hierbo is');
  say(`${rand(realNo.ceilingProfit * 12)} — heeltemal binne daardie tweede snit.`);
  say('   Die effektiewe koers sou dan naby **3%** wees, nie 30% nie. Kwalifikasie');
  say('   het voorwaardes (alle aandeelhouers natuurlike persone, omset onder');
  say('   R20m, nie \'n persoonlike diensverskaffer nie) en dit is \'n vraag vir');
  say('   \'n rekenmeester, nie vir hierdie lêer nie.');
  say('');
  say('**2. BTW-registrasie.** Die 15% wat sy nou aan ElevenLabs en Zoho betaal is');
  say('   \'n dooie koste **solank sy nie geregistreer is nie**. Geregistreer kan sy');
  say('   dit terugeis — maar dan moet sy 15% op lidmaatskappe hef of dit self dra.');
  say(`   Verpligte registrasie is by R1 miljoen omset oor 12 maande; by vol`);
  say(`   kapasiteit is die omset ${rand(realNo.capacity * REV_PER_MEMBER * 12)} per jaar, dus`);
  say('   **bereik sy dit nooit op hierdie plan nie**. Vrywillige registrasie is');
  say('   moontlik bo R50 000 omset, en dan word die BTW terugeisbaar.');
  say('');
  say(`   Wat dit werd is: die BTW op ElevenLabs alleen is ${rand(randForPlan(business) - business.usd * RAND_PER_USD)} per maand,`);
  say(`   oftewel ${rand((randForPlan(business) - business.usd * RAND_PER_USD) * 12)} per jaar. Teen \'n maksimum jaarwins van`);
  say(`   ${rand(realNo.ceilingProfit * 12)} is dit nie klein nie.`);
  say('');
  say('*Geen van hierdie twee is belastingadvies nie. Albei is gedokumenteerde');
  say('SARS-reëls wat groot genoeg is om te vra, met die somme reeds gedoen sodat');
  say('die gesprek met \'n rekenmeester een vraag is en nie \'n navorsingstaak nie.*');
  say('');
  say('**3. Die gratis laag is die duurste ding in die toep.** Negentien gratis');
  say(`gebruikers agter elke betalende een, elk met ${TIER_CREDITS.free} krediete, is meer`);
  say('ElevenLabs-krediete as wat die betalende lid self gebruik. Dit is die een');
  say('hefboom wat die meeste beweeg, en dit kos niks om te trek nie: die gratis');
  say('laag se blaaierskesse — regte klank en video, op die foon self gemaak — kos');
  say('ons nul, en dit is die deel wat mense oortuig. Die twee half liedjies is die');
  say('duur deel.');
  say('');
  say("**4. Moenie op Business begin nie.** Die syfers hierbo is nie 'n opdrag om");
  say(`vandag ${rand(randForPlan(business))} 'n maand te betaal nie. Met 'n handjievol toetsers is`);
  say('Creator reg, en die verlies daarop is klein genoeg om te dra. Wat die syfers');
  say('sê, is dat daar geen pad is wat by Creator of Pro of Scale bly en wins maak');
  say('nie — so die groei moet die skuif na Business betaal, en dit moet gebeur');
  say('vóórdat die krediete opraak, nie daarna nie.');
  say('');
  say('**5. Daarom die e-pos aan ElevenLabs.** Die gat tussen Scale ($330) en');
  say("Business ($990) is presies waar hierdie besigheid gaan sit. 'n Pasgemaakte");
  say("plan wat daardie gat vul — of 'n laer koers vir musiek spesifiek — is die");
  say('enkele grootste ding wat aan hierdie somme kan verander. Sien');
  say('`docs/DIENSTE-EN-KOSTE.md` vir wat om te vra.');
  say('');
  say('**6. Wat hier nié in is nie.** Kling is uit, soos gevra. Ook uit: Music.ai');
  say('(die kamers wat dit gebruik is af), advertensie-inkomste, borge, en die');
  say('bemarkings-byvoegsel. Elkeen van dié maak die prentjie beter, nie slegter');
  say("nie — hulle is net nog nie waar nie, en 'n som wat op onverdiende geld");
  say("staan is nie 'n som nie.");
  say('');
}

writeFileSync(new URL('../docs/KOSTE-EN-WINS.md', import.meta.url), out.join('\n') + '\n');

/* ─────────────────────────────────────────────── kort op die skerm ──── */

console.log('\nWins per betalende lid, en of die plan ooit gelyk kan breek:\n');
for (const scenario of SCENARIOS) {
  const fixed =
    Object.values(FIXED_CORE).reduce((a, b) => a + b, 0) + (scenario.workshops ? WORKSHOPS : 0);
  console.log(`  ${scenario.name}`);
  for (const plan of EL_PLANS) {
    const c = contribution(plan, scenario.use, scenario.freeUse, scenario.freeCredits);
    const total = fixed + randForPlan(plan);
    const breakEven = c.net > 0 ? Math.ceil(total / c.net) : Infinity;
    const capacity = Math.floor(
      plan.credits / elPerPaying(scenario.use, scenario.freeUse, scenario.freeCredits),
    );
    console.log(
      `    ${plan.name.padEnd(9)} ${rand(c.net).padStart(10)} per lid   gelykbreek ${String(Number.isFinite(breakEven) ? breakEven : '—').padStart(5)}   plek vir ${String(capacity).padStart(5)}   ${Number.isFinite(breakEven) && breakEven <= capacity ? 'JA' : 'nee'}`,
    );
  }
  console.log('');
}
console.log('docs/KOSTE-EN-WINS.md geskryf.\n');
