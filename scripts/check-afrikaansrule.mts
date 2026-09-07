/**
 * Afrikaans that is Afrikaans, everywhere the app writes it.
 *
 * "die prompt in copilot is ook geneig om nederlands te prompt met afrikaanse
 *  goed."
 *
 * `app/api/help/route.ts` has asked for "plain South African Afrikaans rather
 * than Dutch-sounding formal Afrikaans" since it was written. Every other
 * route that writes Afrikaans said only "in Afrikaans", which is the single
 * most common way to get Dutch out of a model: the two languages are close,
 * Dutch is far better represented in training data, and the drift is not a
 * translation error to a South African — it reads as an app written by
 * somebody who is not from here.
 *
 * So the rule lives in one place and this asserts it reaches every prompt
 * that can produce Afrikaans prose. A route that calls a language model and
 * mentions Afrikaans must carry it, or be named here with the reason.
 *
 * Matched on the interpolation `${AFRIKAANS_RULE}` and not on the name. The
 * first version looked for the name, which the import line satisfies — so
 * deleting the rule from the prompt and leaving the import passed. Imported
 * is not used, the same way named is not run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/** Carries the point in its own words, or has no Afrikaans prose to write. */
const ALLOWED: Record<string, string> = {
  'help/route.ts': 'says it in its own words: "plain South African Afrikaans rather than Dutch-sounding formal"',
};

function routes(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routes(path, found);
    else if (name === 'route.ts') found.push(path);
  }
  return found;
}

const all = routes(join(ROOT, 'app/api'));
let looked = 0;

for (const path of all) {
  const source = readFileSync(path, 'utf8');
  const name = path.slice(join(ROOT, 'app/api').length + 1);
  /* Only routes that actually put a prompt to a language model. A route that
     names Afrikaans in a comment, or takes it as a language code to hand to a
     speech engine, has no prompt to guard — dialogue and presenter are both
     that, and listing them as exemptions would be listing files that never
     had the problem. */
  const asksAModel = /@anthropic-ai\/sdk/.test(source);
  if (!asksAModel || !/Afrikaans/.test(source)) continue;
  looked += 1;
  const excuse = ALLOWED[name];
  ok(
    `${name} tells the model not to write Dutch`,
    /\$\{AFRIKAANS_RULE\}/.test(source) || Boolean(excuse),
    'says only "in Afrikaans", which is how Dutch gets out',
  );
}

ok('there are prompts to check', looked >= 6, `${looked} found`);

for (const [name, why] of Object.entries(ALLOWED)) {
  const path = join(ROOT, 'app/api', name);
  ok(`the exemption for ${name} is still about a real prompt`, all.includes(path), why);
}

/* The rule itself has to carry the markers, not just the word "Dutch". Naming
   the language is an instruction about a label; the word pairs are about what
   ends up on the page, and the double negative is the strongest signal there
   is — Dutch has nothing like it. */
const rule = readFileSync(join(ROOT, 'app/lib/server/afrikaans.ts'), 'utf8');
ok('the rule names Dutch as the failure', /not Dutch/i.test(rule));
ok('and gives the word pairs rather than only the label', /jy and jou/.test(rule) && /never niet/.test(rule));
ok('and the double negative, which is the strongest tell', /nie daarvan nie/.test(rule));

/* And the copilot is told the language rather than left to guess it. */
const route = readFileSync(join(ROOT, 'app/api/copilot/route.ts'), 'utf8');
const screen = readFileSync(join(ROOT, 'app/components/Copilot.tsx'), 'utf8');
ok('the copilot screen sends the language the app is being used in', /\blang,/.test(screen));
ok('and the route puts it in the context it builds', /body\.lang === 'af'/.test(route));

if (failures > 0) {
  console.log(`\ncheck:afrikaansrule — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\ncheck:afrikaansrule — all ${looked} Afrikaans prompts warn the model off Dutch.`);
}
