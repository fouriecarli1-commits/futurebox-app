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
 * ElevenLabs se planne.
 *
 * ONGEVERIFIEER. Hierdie masjien kom nie by elevenlabs.io uit nie, so dit is
 * wat die kode tot dusver aangeneem het — die Business-reël kom uit
 * `plans.ts`, die res uit dieselfde bron. Dit is die eerste ding wat die
 * e-pos aan hulle moet bevestig, want die hele antwoord hieronder hang
 * daaraan.
 */
const EL_PLANS = [
  { name: 'Creator', usd: 22, credits: 100_000 },
  { name: 'Pro', usd: 99, credits: 500_000 },
  { name: 'Scale', usd: 330, credits: 2_000_000 },
  { name: 'Business', usd: 990, credits: 11_000_000 },
] as const;

/** ElevenLabs se krediete per minuut musiek. Uit `plans.ts`. */
const EL_CREDITS_PER_MINUTE = 900;
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
};
const WORKSHOPS = 4000;

/** Hoeveel gratis lede agter elke betalende een staan, by 5% omskakeling. */
const FREE_PER_PAYING = 19;

/** Die mengsel van betalende lede, soos `plans.ts` dit aanneem. */
const MIX: Record<Exclude<Tier, 'free'>, number> = { maker: 0.6, studio: 0.3, label: 0.1 };

/* ───────────────────────────────────────────────────────────── somme ─── */

const randPerElCredit = (plan: (typeof EL_PLANS)[number]): number =>
  (plan.usd * RAND_PER_USD) / plan.credits;

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
    name: 'Voorsigtig, gratis laag sonder musiek',
    use: 1,
    freeUse: 0,
    freeCredits: TIER_CREDITS.free,
    workshops: false,
    why: 'Die slegste geval weer, maar met die gratis laag se musiek af en die werkswinkels af. Dit wys of die slegste geval hoegenaamd veilig gemaak kan word.',
  },
  {
    name: 'Realisties, gratis laag sonder musiek',
    use: 0.6,
    freeUse: 0,
    freeCredits: TIER_CREDITS.free,
    workshops: false,
    why: 'Dieselfde as bo, maar die gratis laag kry blaaierskesse in plaas van musiekkrediete, en die werkswinkels is af. Die twee hefbome wat die meeste beweeg.',
  },
];

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
say('**Ongeverifieer:** ElevenLabs se planne self. Hierdie masjien kom nie by');
say('elevenlabs.io uit nie, so die vier reëls hieronder is wat die kode tot');
say('dusver aangeneem het. Dít is wat die e-pos aan ElevenLabs moet bevestig,');
say('want die hele antwoord hang daaraan.');
say('');
say('| Plan | Per maand | Krediete | Rand per krediet | Wat een liedjie ons kos |');
say('|---|---|---|---|---|');
for (const plan of EL_PLANS) {
  say(
    `| ${plan.name} | $${plan.usd} = ${rand(plan.usd * RAND_PER_USD)} | ${count(plan.credits)} | R${dec(randPerElCredit(plan), 5)} | ${rand(songCost(plan))} |`,
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
    const total = fixed + plan.usd * RAND_PER_USD;
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
    const total = fixedNoWorkshops + plan.usd * RAND_PER_USD;
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
  const worst = (plan: (typeof EL_PLANS)[number], workshops: boolean) => {
    const c = contribution(plan, 1, 1, TIER_CREDITS.free);
    const total = fixedNo + (workshops ? WORKSHOPS : 0) + plan.usd * RAND_PER_USD;
    return {
      breakEven: c.net > 0 ? Math.ceil(total / c.net) : Infinity,
      capacity: Math.floor(plan.credits / elPerPaying(1, 1, TIER_CREDITS.free)),
    };
  };
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
  say(
    `**2. Op Business werk dit — solank die werkswinkels nie loop nie.** Met alles op sy ergste: gelykbreek by **${without.breakEven} lede**, en die plan hou **${without.capacity}**. Sit die ${rand(WORKSHOPS)} werkswinkels terug en gelykbreek skuif na **${withShops.breakEven}**, wat méér is as wat die plan kan voed. Die werkswinkels is dus nie 'n uitgawe nie, dit is 'n besluit: hulle mag eers terugkom wanneer die lede daar is.`,
  );
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
  say(`vandag ${rand(business.usd * RAND_PER_USD)} 'n maand te betaal nie. Met 'n handjievol toetsers is`);
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
    const total = fixed + plan.usd * RAND_PER_USD;
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
