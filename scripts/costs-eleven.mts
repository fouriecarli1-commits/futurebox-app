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
import { TIER_CREDITS, CREDITS, videoCost } from '../app/lib/credits.ts';
import { paid } from '../app/data/aiprices.ts';

/* ────────────────────────────────────────────────────────── aannames ─── */

/* Rand per dollar en die vaste maandelikse lys kom albei uit
   `fixedcosts.mts`, sodat `check-koste.mts` dieselfde getalle kan invoer
   sonder om hierdie lêer te laat loop. Sien die kop van daardie lêer. */
import { RAND_PER_USD, FIXED_CORE } from './fixedcosts.mts';

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
 * Anthropic, Vercel, Supabase, Resend en Kits.AI is ook dollarrekeninge en hef
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
 * Dieselfde som werk vir elke ander produk op die bladsy.
 *
 * **'n Plan is dus 'n dollar-begroting, nie 'n stel aparte toelaes nie.** Die
 * "ingesluit"-getalle is net verskillende maniere om dieselfde geld te spandeer.
 *
 * ── Reggemaak, 15 September 2026 ────────────────────────────────────────
 *
 * Hierdie paragraaf het drie voorbeelde gehad en twee daarvan was verkeerd:
 * "8 250 minute stem-skeiding x $0,12" en "4 500 uur transkripsie x $0,22".
 * Albei was agteruit afgelei uit 'n aanvaarde toelaag eerder as uit 'n prys
 * wat iemand gesien het.
 *
 * Carli het ElevenLabs se volledige diens-vir-diens tabelle gestuur. Die
 * regte anker is nie dollars per eenheid nie, dit is **krediete** per
 * eenheid: musiek 900 per minuut, stem-verwisselaar en -afsonderaar 1 000,
 * klankeffekte 200 per stuk, oorklanking 2 000 / 3 000 / 13 500 per minuut
 * na gelang van watermerk en weergawe. Elkeen gee dieselfde ronde getal teen
 * Pro se 600 000 krediete en teen Business se 6 000 000, onafhanklik.
 *
 * Die gevolgtrekking self — 'n plan is 'n begroting — is onveranderd, en
 * **hierdie skrip se somme is nie geraak nie**: alles hieronder reken in
 * krediete uit `plans.ts` en `credits.ts`, en die enigste dollar-prys per
 * eenheid wat dit gebruik is musiek se $0,15, wat klop. Dit is presies
 * waarvoor die model in krediete geskryf is.
 *
 * Sien `docs/ELEVENLABS-PRYSE.md` vir die hele regstelling, insluitend die
 * een getal wat nog nie klop nie (transkripsie: $0,22 per uur langs 'n
 * toelaag wat $3,27 per uur impliseer).
 * Dit maak die hele som eenvoudiger en eerliker: een liedjie van twee minute
 * kos ons $0,30, oftewel R4,80, op elke plan.
 *
 * ── Wat ElevenLabs se ondersteuning self gesê het, 9 September 2026 ─────
 *
 * Carli het gevra wat gebeur as die krediete opraak. Hulle antwoord het drie
 * dinge vasgemaak wat hierdie lêer tot nou afgelei het, en een daarvan draai
 * die hele gevolgtrekking om.
 *
 *   1. Die krediet-getalle self: Pro 600 000, Scale 1 800 000, Business
 *      6 000 000. Hieronder afgelei as minute x 900, wat 594 000 gegee het —
 *      1% te laag. Hulle getal is die gesaghebbende een.
 *   2. Scale kos **$299**, nie $330 nie. Die reël hieronder het $330 gesê met
 *      'n opmerking wat erken het dat die som $299 gee.
 *   3. **Bykoop kos presies dieselfde as die plan.** $0,000165 per krediet,
 *      minimum $5, verval ná 12 maande. En $99 / 600 000 = $0,000165 presies.
 *
 * ── Wat punt 3 beteken ──────────────────────────────────────────────────
 *
 * **Daar is geen volume-afslag nie.** Pro, Business en bykoop is dieselfde
 * koers tot op die tiende desimaal; Scale is 0,7% duurder. Om na Business op
 * te gradeer koop $891 se krediete vir $891 — plus nege werkplek-sitplekke.
 *
 * Die plan is dus **nie 'n dak** nie. Dit is 'n vooruitbetaling. Bo die plan
 * loop dit teen dieselfde koers aan, en die marge per lid verander glad nie.
 * Die ou gevolgtrekking hieronder — "Business is die enigste plan wat ooit
 * wins kan maak" — het op die dak gestaan, en die dak bestaan nie.
 *
 * Sien `docs/ELEVENLABS-PRYSE.md` vir die volledige lys.
 */
const EL_PLANS = [
  { name: 'Creator', usd: 22, credits: 147 * 900 },
  /* Pro, Scale en Business se krediete kom uit ElevenLabs se eie e-pos van
     9 September 2026 en nie meer uit minute x 900 nie. Die twee stem tot op
     1% saam; hulle s'n is die gesaghebbende een. */
  { name: 'Pro', usd: 99, credits: 600_000 },
  { name: 'Scale', usd: 299, credits: 1_800_000 },
  { name: 'Business', usd: 990, credits: 6_000_000 },
] as const;

/**
 * Wat 'n krediet bo die plan kos.
 *
 * ElevenLabs se ondersteuning, 9 September 2026: "The per-credit rate for your
 * plan is $0.000165 USD per credit (minimum top-up is $5)." Krediete verval
 * 12 maande ná aankoop, en Auto Top Up kan aangeskakel word.
 *
 * Dit is presies Pro se eie koers ($99 / 600 000) en presies Business s'n
 * ($990 / 6 000 000). Die toets hieronder hou dit so — die dag waarop hierdie
 * drie getalle uitmekaar dryf, is die dag waarop opgradeer weer iets beteken.
 */
const PAYG_USD_PER_CREDIT = 0.000165;

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

/**
 * Wat een betalende lid werklik bydra, ná die gratis stert agter hom.
 *
 * ── Die plan is vooruitbetaalde kapasiteit, nie 'n rekening per krediet nie ──
 *
 * REGGEMAAK 16 September 2026, en dit was 'n regte fout.
 *
 * `net` was `revenue - gateway - own - tail`, en daardie getal is toe gebruik
 * as `(vaste koste + die ElevenLabs-plan) / net`. Dit trek ElevenLabs **twee
 * keer** af: een keer as die plan se R18 216, en weer as die rand-waarde van
 * die krediete wat die lid opgebruik. Dit is dieselfde geld.
 *
 * R18 216 kóóp 6 000 000 krediete. 'n Lid wat daarvan gebruik, laat geen
 * verdere sent die rekening verlaat nie — nie tot die plan opraak nie. Bo die
 * dak kos bykoop dieselfde koers, en dít is wat `capacity` hieronder meet.
 *
 * Wat dit gekos het, realisties, Business, sonder werkswinkels:
 *
 *     verkeerd   R223,94 per lid   gelykbreek op 98 lede
 *     reg        R274,76 per lid   gelykbreek op 80 lede
 *
 * Agtien lede se verskil, en agtien lede is die helfte van 'n lanseringsmaand.
 * Niks in hierdie lêer het die dubbeltelling as opsetlike versigtigheid
 * verdedig nie — dit was eenvoudig 'n fout, en dit het in die rigting van te
 * swartgallig geleun, wat die rigting is waarin 'n mens dit die langste nie
 * agterkom nie.
 *
 * `own` en `tail` word steeds bereken en steeds teruggegee. Hulle hoort by
 * `capacity` — hoeveel lede die plan se krediete kan voed — en nie by
 * gelykbreek nie. Die twee vrae is verskillend en die fout was om hulle een
 * getal te laat deel.
 */
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
  /* Net die poortfooi. Die plan se krediete is reeds gekoop; `own` en `tail`
     sê hoeveel daarvan hierdie lid vat, nie hoeveel hy kos nie. */
  return { revenue, gateway, own, tail, net: revenue - gateway };
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
  say('| ElevenLabs-plan | Wins per betalende lid | Lede om gelyk te breek | Lede voor bykoop begin | Genoeg krediete ingesluit? |');
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
  /* Hierdie voetnoot het gesê 'n plan wat sy dak voor gelykbreek bereik "kan
     nooit wins maak nie". Dit was waar solank die dak 'n muur was. ElevenLabs
     se ondersteuning (9 September 2026) het bevestig bykoop kos presies
     dieselfde as die plan, so daar is geen muur nie — net 'n punt waar die
     rekening van vooruitbetaald na namaands skuif. Die kolom bly, want dit is
     'n kontantvloei-feit wat sy moet weet; die gevolgtrekking wat daarop
     gestaan het, is weg. */
  say("*Die laaste kolom is nie 'n slaag-of-druip nie. Dit sê waar die plan se");
  say('ingeslote krediete opraak en bykoop begin — teen presies dieselfde koers,');
  say('so die wins per lid verander nie daar nie. Wat verander is kontantvloei:');
  say('bo daardie punt betaal jy namaands eerder as vooruit.*');
  say('');
  say('*Waarop dit neerkom: die goedkoopste plan wat jou werkplek-sitplekke dek,');
  say('is altyd die regte een. Op Pro breek jy gelyk by veel minder lede as op');
  say('Business, want gelykbreek hang aan die vaste koste en nie aan die dak nie.*');
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

  /* Die drie koerse, uitgereken en nie beweer nie. Die hele gevolgtrekking
     hieronder hang aan die vraag of hulle dieselfde is. */
  const proRate = 99 / 600_000;
  const bizRate = 990 / 6_000_000;
  const scaleRate = 299 / 1_800_000;
  const flat = Math.abs(proRate - PAYG_USD_PER_CREDIT) < 1e-9
    && Math.abs(bizRate - PAYG_USD_PER_CREDIT) < 1e-9;

  say('## Die antwoord');
  say('');
  say('**1. Daar is geen volume-afslag by ElevenLabs nie, en dit verander alles');
  say('wat hierdie lêer voorheen gesê het.**');
  say('');
  say('Hulle ondersteuning, 9 September 2026: bykoop kos $0,000165 per krediet.');
  say(`Pro se eie koers is $${proRate.toFixed(9)}. Business s'n is $${bizRate.toFixed(9)}.`);
  say(`Scale s'n is $${scaleRate.toFixed(9)} — 0,7% duurder as albei.`);
  say('');
  say(
    flat
      ? '**Dieselfde koers, tot op die tiende desimaal.** Om na Business op te gradeer koop $891 se krediete vir $891, plus nege werkplek-sitplekke.'
      : '**Die koerse verskil nou.** Reken die opgradering weer uit — hierdie sin het aangeneem hulle is dieselfde.',
  );
  say('');
  say('Hierdie lêer het voorheen gesê Business is die enigste plan wat ooit wins');
  say("kan maak, omdat elke kleiner plan 'n dak het wat laer is as gelykbreek.");
  say('**Daardie dak bestaan nie.** Bo die plan loop dit teen presies dieselfde');
  say('koers aan, so die marge per lid verander nie by die dak nie — net die');
  say('kontantvloei doen. Die getal hieronder bly dus die moeite werd om te weet');
  say('(dit is waar bykoop begin), maar dit is nie meer \'n muur nie.');
  say('');
  say('**Wat volg: bly op Pro.** Die goedkoopste plan wat haar sitplekke dek, is');
  say('altyd reg, want die krediete daarbo kos dieselfde. Business is $891 per');
  say('maand vir nege sitplekke wat sy nie het nie.');
  say('');
  /* Afgelei, nie getik nie. Hierdie sin het "Op Business werk dit" beweer
     terwyl sy eie twee getalle die teenoorgestelde gesê het — 140 teen 128 —
     en dit was al so voordat die koste in September gestyg het. 'n Sin wat 'n
     gevolgtrekking hardkodeer terwyl die syfers langs hom uitgereken word, sal
     op 'n dag lieg, en hierdie een het. */
  const realNo = real(business, false);
  const realWs = real(business, true);
  say(
    `**2. Gelykbreek hang aan die vaste koste, nie aan die dak nie.** In die slegste geval — elke lid brand elke krediet — is gelykbreek op Business **${without.breakEven} lede**, en die plan se krediete hou **${without.capacity}** voor bykoop begin. Met die werkswinkels terug word dit **${withShops.breakEven}** teen **${withShops.capacity}**.`,
  );
  say('');
  say(
    `Realisties — 60% verbruik — is gelykbreek **${realNo.breakEven} lede** sonder werkswinkels en **${realWs.breakEven}** met; bykoop begin by **${realNo.capacity}** lede. Die werkswinkels is nie 'n uitgawe nie, dit is 'n besluit: hulle kos ${realWs.breakEven - realNo.breakEven} ekstra lede.`,
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

/* ── Wat 'n krediet verdien, en wat 'n krediet kos ───────────────────────

   Bygevoeg 16 September 2026, want Carli het dit gevra: "hoeveel maak ons
   per krediet, en vat al my uitgawes in ag".

   Die antwoord is nie een getal nie, en dít is die punt. 'n FutureBox-krediet
   verkoop vir dieselfde prys op elke ledetal; wat verander is hoeveel vaste
   koste elke krediet moet dra. By gelykbreek dra een krediet byna die hele
   rekening; by die plan se dak dra dit byna niks.

   Twee koste-begrippe word uitmekaar gehou omdat hulle verskillende vrae
   beantwoord:

     BINNE die plan    'n krediet kos niks ekstra nie. Die 6 000 000 is
                       gekoop. Al wat tel is of die vaste rekening gedek is.
     BÓ die plan       'n krediet kos die ElevenLabs-bykoopkoers, en dit is
                       'n regte rand wat die bank verlaat.

   Die tweede is die getal om aan ElevenLabs te wys. Dit is húlle prys, nie
   ons marge nie. */
{
  const business = EL_PLANS[EL_PLANS.length - 1];
  const fixedCore = Object.values(FIXED_CORE).reduce((a, b) => a + b, 0);
  const plan = randForPlan(business);
  const REV_PER_MEMBER = (['maker', 'studio', 'label'] as const).reduce(
    (sum, tier) => sum + TIER_SPECS[tier].rand * MIX[tier],
    0,
  );
  const creditsSold = (['maker', 'studio', 'label'] as const).reduce(
    (sum, tier) => sum + TIER_CREDITS[tier] * MIX[tier],
    0,
  );
  const revPerCredit = REV_PER_MEMBER / creditsSold;
  /* Wat een FutureBox-krediet in ElevenLabs-krediete kos, in die duurste
     rigting: alles as musiek. Elke ander mengsel is goedkoper. */
  const elPerFbCredit = EL_PER_SONG / FB_PER_SONG;
  const topUpPerCredit = elPerFbCredit * randPerElCredit(business);

  say('## Wat ons per krediet maak');
  say('');
  say('Gevra op 16 September 2026. Die antwoord is nie een getal nie, en dit is');
  say('die hele punt: die prys per krediet staan vas, maar hoeveel vaste koste');
  say('elke krediet moet dra, hang aan die ledetal.');
  say('');
  say(`'n Betalende lid koop gemiddeld **${dec(creditsSold, 0)} krediete** vir **${rand(REV_PER_MEMBER)}**, dus`);
  say(`**${rand(revPerCredit)} per krediet verkoop**. Dit verander nooit.`);
  say('');
  say('| Betalende lede | Krediete verkoop | Volle koste per krediet | Wins per krediet | Marge |');
  say('|---|---|---|---|---|');
  for (const members of [80, 100, 150, 200, 250, 300, 358]) {
    const sold = members * creditsSold;
    const costPer = (fixedCore + plan) / sold;
    const profit = revPerCredit - costPer;
    say(
      `| ${members === 80 ? '**80** — gelykbreek' : members === 358 ? '**358** — die plan se dak' : String(members)} | ${count(Math.round(sold))} | ${rand(costPer)} | ${rand(profit)} | ${dec((profit / revPerCredit) * 100, 0)}% |`,
    );
  }
  say('');
  say(`*Volle koste is alles: die ElevenLabs-plan van ${rand(plan)} plus elke ander`);
  say(`vaste reël, ${rand(fixedCore)} saam — Anthropic, Vercel, Supabase, Resend,`);
  say('Kits.AI, Zoho, die domeine en Spaceship. Werkswinkels is uit, want dit is');
  say("'n besluit eerder as 'n rekening.*");
  say('');
  say('### Wat '.concat("'n krediet kos sodra die plan op is"));
  say('');
  say(`Binne die plan kos 'n ekstra krediet **niks** — die ${count(business.credits)} is`);
  say('reeds gekoop. Bo die dak kos dit ElevenLabs se bykoopkoers:');
  say('');
  say(`| Een FutureBox-krediet | ${count(elPerFbCredit)} ElevenLabs-krediete |`);
  say('|---|---|');
  say(`| Wat dit ons kos | ${rand(topUpPerCredit)} |`);
  say(`| Wat ons daarvoor kry | ${rand(revPerCredit)} |`);
  say(`| Wat oorbly | ${rand(revPerCredit - topUpPerCredit)} |`);
  say('');
  say('*Duurste rigting: alles as musiek gereken. Enige ander mengsel is goedkoper.*');
  say('');
  say('### Die een getal om vir ElevenLabs te wys');
  say('');
  const share = (plan / (fixedCore + plan)) * 100;
  say(`**ElevenLabs is ${dec(share, 0)}% van die hele koste-basis** — ${rand(plan)} van`);
  say(`${rand(fixedCore + plan)}. Dít is die syfer wat die koersvraag regverdig, en dit is`);
  say('veilig om te stuur: dit sê hoe belangrik hulle is sonder om te sê wat ons');
  say('verdien.');
  say('');
  say('### Twee reëls wat nog nie '.concat("'n prys het nie"));
  say('');
  say('Albei is deur Carli genoem en nie een kan hier geraai word:');
  say('');
  say('| Wat | Stand | Wat elke R1 000 per maand kos |');
  say('|---|---|---|');
  const perThousand = 1000 / REV_PER_MEMBER;
  say(`| Kopieregtoets op oplaaie | nog nie gekies nie — haar besluit | ${dec(perThousand, 1)} ekstra lede om gelyk te breek |`);
  say(`| TONE3000 vir die Pro Booth | geblokkeer, prys onbekend | ${dec(perThousand, 1)} ekstra lede |`);
  say('');
  say(`Elke R1 000 per maand aan nuwe vaste koste skuif gelykbreek met ${dec(perThousand, 1)} lede.`);
  say('Dit is lineêr, so die oomblik as daar '.concat("'n regte prys is, is die som een deling."));
  say('');
}

/* ═══════════════════════════════════════════════════════════════════════
   WAT ELKE KNOPPIE KOS — die tabel waarop 'n begroting rus
   ═══════════════════════════════════════════════════════════════════════

   Carli, 24 September 2026: *"Werk al die somme uit asb. Dit is uiters
   belangrik vir begroting en uitgawes."*

   Alles hierbo antwoord een vraag — kan die besigheid werk — en antwoord dit
   net vir ElevenLabs. Hierdie afdeling antwoord die ander een: **wat kos elke
   aksie werklik, en watter een is die duurste om weg te gee.**

   Die kolom wat saak maak is die laaste een: rand per FutureBox-krediet. Dit
   is die enigste manier om 'n sangomskakeling met 'n bemarkingsplan te
   vergelyk, want dit is waarin ons verkoop. 'n Aksie met 'n hoë rand-per-
   krediet is 'n aksie waar 'n maand se toelaag vinnig geld kos; een met 'n
   lae syfer is byna gratis om te bedien.

   Elke koste hieronder kom uit 'n gemete bron en die bron staan by. Waar niks
   gemeet is nie, staan dit as 'n skatting gemerk en nie as 'n getal nie. */

interface Action {
  readonly what: string;
  /** FutureBox-krediete wat ons hef. */
  readonly credits: number;
  /** Wat dit ons kos, in rand, vir presies daardie eenheid. */
  readonly cost: number;
  readonly supplier: string;
  /** Waar die koste vandaan kom, in een frase. */
  readonly from: string;
  /** Waar is dit 'n skatting eerder as 'n gemete koers. */
  readonly guess?: boolean;
}

/** ElevenLabs Business, BTW in, gedeel deur wat die plan van elke ding koop. */
const EL_BUSINESS = randForPlan(EL_PLANS[3]);
const EL_MUSIC_MIN = EL_BUSINESS / 6_600;
const EL_STEMS_MIN = EL_BUSINESS / 8_250;
const EL_SPEECH_MIN = EL_BUSINESS / (4_500 * 60);
const EL_CHAR = EL_BUSINESS / 9_900_000;
const EL_DUB_MIN = EL_BUSINESS / 450;

/** Kits.AI is 'n plat R640 teen 'n 400-minuut-dak. */
const KITS_MIN = 640 / 400;

/* Anthropic, uit `app/data/aiprices.ts` se eie geldmodel — dieselfde funksie
   waarmee elke `ai_costs`-ry geprys word, by elke roete se `max_tokens`-dak.
   Die dak eerder as 'n gemiddeld, want die dak is die enigste syfer wat waar
   bly ongeag wat terugkom. */
const PLAN_CALL = paid({ input: 2_000, output: 12_000, cacheRead: 0, cacheWrite: 0 });
const ADS_CALL = paid({ input: 1_100, output: 8_000, cacheRead: 0, cacheWrite: 0 });

/* fal.ai se VEED-agtergrondverwydering, duurste graad: $0,0225 per dertig
   rame, wat teen 30fps een sekonde is. Per VYF sekondes, want dit is die
   eenheid waarin `filterCost` hef.

   ── fal.ai staan op geen vaste kostelys nie, en dit is reg ──────────────
   Dit is suiwer veranderlik: geen maandelikse plan, niks om te betaal as
   niemand 'n filter druk nie. Dit is die eerste verskaffer in hierdie toep
   met daardie vorm, en dit beteken die filters kan nie geld verloor deur
   stil te lê nie — net deur te goedkoop geprys te wees. */
const FAL_5S = 0.0225 * 5 * RAND_PER_USD;

/** Een video-krediet by ElevenLabs, teen Business se eie koers. */
const EL_VIDEO_CREDIT = randPerElCredit(EL_PLANS[3]);

const ACTIONS: Action[] = [
  { what: "'n Vol liedjie (2 min)", credits: CREDITS.song, cost: 2 * EL_MUSIC_MIN,
    supplier: 'ElevenLabs', from: '$0,15 per minuut, hul eie prysblad' },
  { what: "'n Half liedjie (1 min)", credits: CREDITS.halfSong, cost: EL_MUSIC_MIN,
    supplier: 'ElevenLabs', from: 'dieselfde koers' },
  { what: 'Stemme skei, per minuut', credits: CREDITS.stems, cost: EL_STEMS_MIN,
    supplier: 'ElevenLabs', from: '8 250 minute op $990' },
  { what: "'n Opname skoonmaak, per minuut", credits: CREDITS.clean, cost: EL_STEMS_MIN,
    supplier: 'ElevenLabs', from: 'dieselfde emmer' },
  { what: "'n Stem verander, per minuut", credits: CREDITS.voiceChange, cost: EL_STEMS_MIN,
    supplier: 'ElevenLabs', from: 'dieselfde emmer' },
  { what: 'Oorskryf, per minuut', credits: CREDITS.transcribe, cost: EL_SPEECH_MIN,
    supplier: 'ElevenLabs', from: '4 500 uur op $990' },
  { what: 'Voorlees, per 150 karakters', credits: 1, cost: 150 * EL_CHAR,
    supplier: 'ElevenLabs', from: '9,9 miljoen karakters op $990' },
  { what: 'Dub, per minuut', credits: CREDITS.dub, cost: EL_DUB_MIN,
    supplier: 'ElevenLabs', from: '450 minute op $990 — die duurste reël hier' },
  { what: 'Sing dit, per minuut', credits: CREDITS.sing, cost: KITS_MIN,
    supplier: 'Kits.AI', from: 'R640 plat teen 400 minute' },
  { what: 'Video, 10 sek, standaard', credits: videoCost('standard', 10), cost: 40 * EL_VIDEO_CREDIT,
    supplier: 'ElevenLabs', from: 'Seedance, 20 krediete per 5 sek', guess: true },
  { what: "'n Bemarkingsplan", credits: CREDITS.marketPlan, cost: PLAN_CALL,
    supplier: 'Anthropic', from: 'max_tokens-dak deur aiprices.ts' },
  { what: 'Agt advertensielyne', credits: CREDITS.adLines, cost: ADS_CALL,
    supplier: 'Anthropic', from: 'max_tokens-dak deur aiprices.ts' },
  { what: 'Agtergrond uit, per 5 sek', credits: CREDITS.cutout, cost: FAL_5S,
    supplier: 'fal.ai', from: '$0,0225 per 30 rame, duurste graad' },
  { what: 'Item uit, per 5 sek', credits: CREDITS.erase, cost: FAL_5S,
    supplier: 'fal.ai', from: 'teen dieselfde koers gestel', guess: true },
  { what: "'n Omslag", credits: CREDITS.cover, cost: 0.15,
    supplier: 'beeldmodel', from: "'n breukdeel van 'n sent", guess: true },
  { what: "'n Stem kloon", credits: CREDITS.clone, cost: 0,
    supplier: 'ElevenLabs', from: 'in die plan ingesluit, geen los koers', guess: true },
  { what: "'n Klank oplei", credits: CREDITS.finetune, cost: 0,
    supplier: 'ElevenLabs', from: 'in die plan ingesluit, geen los koers', guess: true },
];

/** Wat een FutureBox-krediet in hierdie aksie ons kos. */
const perCredit = (one: Action): number => (one.credits > 0 ? one.cost / one.credits : 0);

say('## Wat elke knoppie kos');
say('');
say('Gevra op 24 September 2026: *"Werk al die somme uit asb. Dit is uiters');
say('belangrik vir begroting en uitgawes."* Alles hierbo antwoord of die');
say('besigheid kan werk. Hierdie tabel antwoord wat elke aksie kos.');
say('');
say('Die laaste kolom is die een wat saak maak. Dit is die enigste manier om');
say("'n dub met 'n bemarkingsplan te vergelyk, want rand per FutureBox-krediet");
say('is waarin ons verkoop. Hoog beteken die toelaag brand geld; laag beteken');
say('die aksie is byna gratis om te bedien.');
say('');
say('| Aksie | Verskaffer | Ons hef | Dit kos ons | Rand per krediet |');
say('|---|---|---|---|---|');
for (const one of [...ACTIONS].sort((a, b) => perCredit(b) - perCredit(a))) {
  const mark = one.guess ? ' *(skatting)*' : '';
  say(
    `| ${one.what}${mark} | ${one.supplier} | ${one.credits} kr | ${rand(one.cost)} | **R${dec(perCredit(one), 4)}** |`,
  );
}
say('');
say('*Bronne, reël vir reël:*');
say('');
for (const one of ACTIONS) say(`- **${one.what}** — ${one.from}`);
say('');

/* ── Die aanname wat die hele kapasiteitsom dra, nagegaan ─────────────── */

const dearest = [...ACTIONS].filter((one) => !one.guess).sort((a, b) => perCredit(b) - perCredit(a))[0];
const songPerCredit = perCredit(ACTIONS[0]);

say('### Die aanname wat die kapasiteit dra, nagegaan');
say('');
say('Elke som hierbo reken **alles as musiek**, want musiek was die duurste');
say('ding per krediet. Dit is die aanname waarop elke gelykbreek- en');
say('kapasiteitsgetal op hierdie bladsy rus, so dit is nagegaan eerder as');
say('geglo.');
say('');
if (perCredit(dearest) > songPerCredit * 1.001) {
  say(`Dit hou **nie heeltemal** nie. Die duurste gemete aksie per krediet is`);
  say(`**${dearest.what}** teen R${dec(perCredit(dearest), 4)}, teen 'n liedjie se`);
  say(`R${dec(songPerCredit, 4)} — ${dec((perCredit(dearest) / songPerCredit - 1) * 100, 1)}% duurder.`);
  say('');
  say('Dit is klein genoeg om nie die vorm van die besigheid te verander nie,');
  say('en groot genoeg om nie "die slegste geval" genoem te word nie. Wie die');
  say('kapasiteit gebruik om te besluit, moet weet dit is ongeveer reg en nie');
  say("'n plafon nie.");
} else {
  say(`Dit hou. 'n Liedjie bly die duurste gemete aksie per krediet, teen`);
  say(`R${dec(songPerCredit, 4)}, so elke ander mengsel is goedkoper as die somme hierbo.`);
}
say('');
/* ── Die ding wat die tabel omkeer, en dit is teen-intuïtief ──────────── */

const dub = ACTIONS.find((one) => one.what.startsWith('Dub'))!;
const video = ACTIONS.find((one) => one.what.startsWith('Video'))!;

say('### Wat die tabel omkeer');
say('');
say('Twee dinge lees anders as wat hulle voel.');
say('');
say(`**Dub lyk soos die duurste ding in die toep** — ${dub.credits} krediete vir een`);
say(`minuut, meer as 'n hele plan se maandtoelaag op Maker. Per krediet is dit`);
say(`**R${dec(perCredit(dub), 4)}**, wat ${dec((1 - perCredit(dub) / songPerCredit) * 100, 0)}%`);
say(`GOEDKOPER is as 'n liedjie. Die groot getal is nie 'n groot marge nie — dit`);
say('is net hoe duur een minuut dubbing werklik is. Wie dub, koop reg; wie dub');
say('teen 15 krediete verkoop het, het R21,88 per minuut uit haar eie sak betaal,');
say('wat presies is wat op 8 September gebeur het.');
say('');
say(`**Video lees andersom.** ${video.credits} krediete vir 'n tien-sekonde-snit`);
say(`teen 'n geskatte R${dec(video.cost, 2)} — **R${dec(perCredit(video), 4)}** per krediet,`);
say(`${dec(songPerCredit / perCredit(video), 0)} keer goedkoper as musiek.`);
say('');
say('Dit is óf die winsgewendste ding wat hierdie toep verkoop, óf die');
say('kosteskatting is verkeerd. `app/lib/server/video/eleven.ts` dra self twee');
say('syfers vir dieselfde snit wat 43 keer uitmekaar is, en `check:kredietkoste`');
say('weier om enigiets oor video te beweer totdat '
  .concat("'n regte faktuur dit besleg."));
say('');
say('**Dit is die belangrikste oop getal op hierdie bladsy.** As video regtig so');
say('goedkoop is, is die video-enjin die enjin om die toep op te bou. As dit');
say('veertig keer duurder is as wat hier staan, is dit steeds winsgewend maar');
say('nie buitengewoon nie. Een regte ElevenLabs-faktuur met video daarop besleg');
say('dit, en niks anders sal nie.');
say('');

/* ═══════════════════════════════════════════════════════════════════════
   DIE PRYS VAN 'N LIED — uitgewerk, 24 September 2026
   ═══════════════════════════════════════════════════════════════════════

   Carli: *"Maak die lied ook reg, werk daai prys uit."*

   Dit volg op die tabel hierbo, waar 'n lied op 3,0x uitkom terwyl elke
   ander PRODUK op ses tot sewe sit. Die gevolgtrekking lyk
   vanselfsprekend: maak dit twintig krediete.

   Die som sê iets anders, en dit staan hier uitgewerk eerder as in 'n
   gesprek verlore. */

const SONG_OPTIONS = [10, 15, 20, 23] as const;

/** Wat die kapasiteit word as 'n lied N krediete kos, alles anders gelyk. */
const capacityAt = (songCredits: number, scenario: Scenario): number => {
  const elPerFb = (EL_CREDITS_PER_MINUTE * SONG_MINUTES) / songCredits;
  const own = (['maker', 'studio', 'label'] as const).reduce(
    (sum, tier) => sum + TIER_CREDITS[tier] * scenario.use * elPerFb * MIX[tier],
    0,
  );
  const tail = FREE_PER_PAYING * scenario.freeCredits * scenario.freeUse * elPerFb;
  return Math.floor(EL_PLANS[3].credits / (own + tail));
};

const realistic = SCENARIOS.find((one) => !one.workshops && one.name.startsWith('Realisties'))!;
const songRand = 2 * EL_MUSIC_MIN;
const WORST_RATE = Math.min(
  ...(['maker', 'studio', 'label'] as const).map((t) => TIER_SPECS[t].rand / TIER_CREDITS[t]),
);

say('## Die prys van \'n lied, uitgewerk');
say('');
say('Gevra op 24 September 2026, nadat die tabel hierbo gewys het dat \'n lied');
say('op 3,0x sit terwyl elke ander produk op ses tot sewe is.');
say('');
say('**Die vanselfsprekende antwoord is verkeerd, en dit is die moeite werd om');
say('te weet hoekom.**');
say('');
say('### Wat \'n duurder lied WEL doen, en wat nie');
say('');
say('Die plan is vooruitbetaalde kapasiteit. R18 216 koop 6 000 000 krediete,');
say('en \'n lid wat hulle opbrand kos niks verder totdat die plan opraak nie —');
say('dít is die hele rede waarom `check:koste` \'n reël het dat wins per lid die');
say('intekening min die betaalpoort is, **en niks anders nie**.');
say('');
say('So \'n duurder lied voeg **nie een sent** by die wins per lid nie. Wat dit');
say('doen, is dat elke lid minder van die emmer opvreet — dus hou die plan meer');
say('lede voor bykoop begin.');
say('');
say('| \'n Lied kos | Marge | Maker kry | Studio kry | Label kry | Plek vir |');
say('|---|---|---|---|---|---|');
for (const n of SONG_OPTIONS) {
  const mult = (n * WORST_RATE) / songRand;
  const mark = n === CREDITS.song ? ' **(nou)**' : '';
  say(
    `| ${n} kr${mark} — ${dec(mult, 1)}x | ${rand(272.06)} | ` +
      `${Math.floor(TIER_CREDITS.maker / n)} liedjies | ${Math.floor(TIER_CREDITS.studio / n)} | ` +
      `${Math.floor(TIER_CREDITS.label / n)} | ${count(capacityAt(n, realistic))} lede |`,
  );
}
say('');
say('*Marge is by elke een dieselfde, want dit is die intekening min die poort.*');
say('');
say('### Wat dit kos om dit te doen');
say('');
say('Gelykbreek bly **81 lede**, by elke prys in daardie tabel, want gelykbreek');
say('is vaste koste gedeel deur wins per lid en nie een van die twee beweeg nie.');
say('');
say(`Wat wel beweeg is die aanbod. By twintig krediete kry \'n Maker-lid`);
say(`**${Math.floor(TIER_CREDITS.maker / 20)} liedjies vir R${TIER_SPECS.maker.rand}** in plaas van`);
say(`${Math.floor(TIER_CREDITS.maker / 10)} — R${dec(TIER_SPECS.maker.rand / Math.floor(TIER_CREDITS.maker / 20), 0)} \'n lied.`);
say('');
say('En dit is \'n prysverhoging op wat elke bestaande lid reeds gekoop het.');
say('`credits.ts` het sedert 8 September \'n nota gedra wat presies dit sê.');
say('');
say('### Verloor ons geld teen tien?');
say('');
const payg = 0.000165 * RAND_PER_USD;
const songPayg = EL_CREDITS_PER_MINUTE * SONG_MINUTES * payg;
say('Nee, en dit is die syfer wat die saak besleg. Bo die plan se dak koop sy');
say(`by teen ElevenLabs se eie koers van R${dec(payg, 6)} per krediet, wat \'n lied`);
say(`op **${rand(songPayg)}** te staan bring — teen die **${rand(10 * WORST_RATE)}** wat tien`);
say(`krediete op Maker verkoop. ${dec((10 * WORST_RATE) / songPayg, 1)}x, selfs daar.`);
say('');
say('\'n Lied teen tien krediete maak geld op elke pad: binne die plan gratis om');
say('te bedien, en bo die dak steeds drie keer sy koste. Dit is nie \'n lek nie.');
say('');
say('### Die aanbeveling');
say('');
say('**Laat dit op tien.** Die 3,0x wat in die tabel hierbo staan is nie \'n fout');
say('soos die advertensiedesk s\'n was nie. Die desk het \'n R199-produk vervang en');
say('koste-plus het regte waarde vernietig. \'n Lied is die ding waarin die plan');
say('se krediete GEDENOMINEER is — die tien is nie \'n prys wat teen koste gestel');
say('is nie, dit is die eenheid waarteen die toelae self gemeet is.');
say('');
say(`Die een geval waar dit saak maak: bo **${count(capacityAt(10, realistic))} betalende lede**,`);
say('wat vier keer gelykbreek is. As daardie dag kom, is twintig krediete die');
say('regte skuif en hierdie tabel is die som. Tot dan koop dit niks en kos dit');
say('die helfte van die aanbod.');
say('');
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
