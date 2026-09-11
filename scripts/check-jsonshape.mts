/**
 * The key a screen reads has to be a key its route sends.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * `/api/plan` returned the model's parsed output at the top level.
 * `MarketPlan.tsx` read `said.plan`. So every press of "Work out the plan"
 * spent up to two minutes and a high-effort call, got a perfectly good plan
 * back, and showed "That could not be worked out just now." The marketing
 * desk's centrepiece had never once rendered — and it was sold for R199.
 *
 * Nothing was broken. The route worked, the model answered, the schema
 * validated, and the screen handled its failure case politely. Two files
 * disagreed about one word, each internally consistent, and that is invisible
 * to a build, a typecheck and eighty-six other checks: the route is typed
 * against its schema, the screen is typed against its own declaration, and
 * nothing in TypeScript joins them across a network call.
 *
 * ── Why this is a short list and not a scanner ───────────────────────────
 *
 * The first version of this walked all fifty-nine `fetch('/api/…')` sites and
 * compared declared keys against returned ones. It read thirty-seven of them,
 * found the real bug, and reported three more that were not bugs at all —
 * nested types read as top-level, a template-literal path truncated to its
 * parent route. A check with three false alarms in its first run is a check
 * somebody switches off, and one that silently reads thirty-seven of
 * fifty-nine while printing a verdict is the exact shape this codebase has
 * been bitten by four times: measure a subset, report on the whole.
 *
 * So: the routes that hand back a model's parsed output are the ones where
 * this bites, because their reply is a whole document rather than a field or
 * two and nobody eyeballs its shape. There are six. Each pair below was read
 * by hand. The list is closed — a seventh such route fails this check until
 * somebody adds it, which is the point: the cost of the entry is the reason
 * the pair gets looked at.
 *
 *   npm run check:jsonshape
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Route → the key the screen reads the reply under, and the screens that read it.
 *
 * `reads: null` means the screen takes the reply's own fields directly, with
 * no key in front of them. That is a fine contract and a different one, and
 * writing down which of the two each route has is what makes them
 * distinguishable at a glance.
 *
 * The key may come from either side and this check does not care which: the
 * route may wrap it (`Response.json({ plan })`) or the schema may already
 * have it as a field (`/api/campaign`'s own schema is `{ ads: [...] }`).
 * What matters is only whether the key the screen asks for is there.
 */
const PAIRS: readonly { route: string; reads: string | null; screens: readonly string[] }[] = [
  { route: 'app/api/plan/route.ts', reads: 'plan', screens: ['app/components/MarketPlan.tsx'] },
  { route: 'app/api/campaign/route.ts', reads: 'ads', screens: ['app/components/Campaign.tsx'] },
  {
    route: 'app/api/translate/route.ts',
    reads: 'lines',
    screens: ['app/components/Storyboard.tsx', 'app/components/VideoPanel.tsx'],
  },
  { route: 'app/api/photosong/route.ts', reads: null, screens: ['app/components/PromptCards.tsx'] },
  { route: 'app/api/songfrom/route.ts', reads: null, screens: ['app/components/PromptCards.tsx'] },
  { route: 'app/api/recommend/route.ts', reads: null, screens: ['app/components/Recommend.tsx'] },
];

const problems: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith('route.ts')) out.push(path);
  }
  return out;
}

/* ── Every route that hands back a parsed reply is in the list ──────────
 
   Matched on `Response.json(<identifier>)` — a bare value rather than an
   object literal, which is what "the reply is the model's answer" looks
   like. A new one is a new chance to get this wrong, so it fails here
   rather than being picked up by whoever notices the screen is blank. */
const handsBackParsed = walk('app/api').filter((path) => {
  const source = readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  return /Response\.json\(\s*\{?\s*\w+\s*:?\s*\w*\s*\}?\s*\)/.test(source)
    && /zodOutputFormat|parsed_output/.test(source);
});

for (const path of handsBackParsed) {
  if (!PAIRS.some((one) => one.route === path)) {
    problems.push(
      `  ${path} hands back a parsed reply and is not in the list above.\n` +
        '      Read its screen, work out which key that screen reads, and add the pair.',
    );
  }
}
if (handsBackParsed.length === 0) {
  console.error('check:jsonshape — found no routes handing back a parsed reply at all. The scan is broken.');
  process.exit(1);
}

/* ── And each pair actually agrees ──────────────────────────────────────── */

/** The top-level field names of a route's reply schema. */
function schemaKeys(code: string): string[] | null {
  const schema = /const \w*Schema = z\.object\(\{([\s\S]*?)\n\}\)/.exec(code);
  if (!schema) return null;
  return [...schema[1].matchAll(/^  ([A-Za-z_$][\w$]*):/gm)].map((one) => one[1]);
}

for (const { route, reads, screens } of PAIRS) {
  const code = readFileSync(route, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

  /* What the reply carries, from whichever side puts it there.

     The wrapper is found by shape rather than by position: an object with
     exactly ONE property whose value is an identifier — `{ plan: parsed }`,
     `{ lines: got }`. Every failure return in these routes is two or more
     properties of string literals (`{ error: 'unparsed', message: '…' }`),
     so they cannot be mistaken for the payload. The first version took the
     first `Response.json({` in the file and got `error` every time, then
     reported the routes it had just been told were correct — which is how a
     check earns a reputation for crying wolf on its first day. */
  const wrapped = /Response\.json\(\s*\{\s*([A-Za-z_$][\w$]*)\s*(?::\s*[A-Za-z_$][\w$.]*\s*)?\}\s*[,)]/.exec(code);
  const fields = schemaKeys(code);
  if (!wrapped && fields === null) {
    problems.push(`  ${route}: could not read how it returns its reply, so this pair is unchecked.`);
    continue;
  }
  const carries = new Set<string>([...(fields ?? []), ...(wrapped ? [wrapped[1]] : [])]);

  if (reads !== null && !carries.has(reads)) {
    problems.push(
      `  ${route} does not put anything under "${reads}" — it carries ${[...carries].join(', ') || 'nothing readable'}.\n` +
        `      ${screens.join(', ')} reads "${reads}", so a good reply arrives and is thrown away.\n` +
        '      This is the /api/plan fault exactly.',
    );
    continue;
  }

  for (const screen of screens) {
    const page = readFileSync(screen, 'utf8');
    if (reads !== null) {
      if (!new RegExp(`\\.${reads}\\b`).test(page)) {
        problems.push(`  ${screen} never reads "${reads}", which is where ${route} puts its reply.`);
      }
      continue;
    }
    /* A bare reply read through a wrapper key is the same fault the other
       way round. Only the keys this list knows about are looked for — a
       screen may legitimately name others of its own. */
    const wrongly = ['plan', 'ads', 'lines'].find((key) =>
      new RegExp(`as\\s*(?:\\|\\s*)?\\{[^}]*\\b${key}\\??:`).test(page)
      && !page.includes(`/api/${key}`));
    if (wrongly && screens.length === 1) {
      problems.push(
        `  ${screen} reads a "${wrongly}" wrapper, but ${route} returns its reply with no key in front of it.`,
      );
    }
  }
}

/* ── And the probes must stub the shape the route actually sends ────────
 
   audit/addon.mjs stubbed `/api/plan` as `{ plan: … }` and asserted the
   week rendered. It passed, for months, while the real route returned the
   plan bare and the screen showed nothing — because a probe that stubs one
   side proves the other side and calls it the system. It is a third copy
   of a contract that already had two, and the one nobody thinks to check.
 
   So a stub for a route in the list must carry the same key. */
const probes = readdirSync('audit').filter((name) => name.endsWith('.mjs'));
for (const { route, reads } of PAIRS) {
  const name = route.replace(/^app\/api\//, '').replace(/\/route\.ts$/, '');
  for (const probe of probes) {
    const source = readFileSync(join('audit', probe), 'utf8');
    const stub = new RegExp(`route\\(\\s*['"\`][^'"\`]*\\/api\\/${name}[^'"\`]*['"\`][\\s\\S]{0,2400}?\\)\\);`).exec(source);
    if (!stub) continue;
    const carries = reads === null
      // A bare reply: the stub must not invent a wrapper.
      ? !new RegExp(`body:\\s*JSON\\.stringify\\(\\s*\\{\\s*(plan|ads|lines)\\s*:`).test(stub[0])
      : new RegExp(`\\b${reads}\\s*:`).test(stub[0]);
    if (!carries) {
      problems.push(
        `  audit/${probe} stubs /api/${name} in a shape the route does not send.\n` +
          `      The route ${reads ? `puts its reply under "${reads}"` : 'sends its reply with no key in front of it'}, ` +
          'so this probe is testing a contract that does not exist.',
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`check:jsonshape — a screen and its route disagree about the reply:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:jsonshape — all ${PAIRS.length} routes that hand back a model's reply agree with the ` +
    `${PAIRS.reduce((n, one) => n + one.screens.length, 0)} screens that read them, ` +
    'and no route has appeared unaccounted for.',
);
