/**
 * Every Music.ai workflow this app names is one she can actually set.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * A workflow is the one part of this supplier the app cannot provide. The
 * key is ours; the slugs are hers, made by hand in their dashboard, and the
 * app can only say which ones it is looking for. Three things have to agree
 * for that to work, and nothing held any of them:
 *
 *   the map in `musicai.ts`   — what the code reads
 *   `docs/SWITCH-ON.md`       — what she is told to set
 *   `/api/analyse/setup`      — the screen that says which are set
 *
 * A slug added to the map and left out of the page is a feature that is off
 * with no way to find out why, which is exactly what that page exists to
 * prevent — one level up from the fault it was written for.
 *
 * ── The one that is a type error waiting to happen ───────────────────────
 *
 * `Which` is the two jobs the analyse room can ask for; `Flow` is every
 * slug. They were one name, and adding a third workflow made the room's
 * price table fail to compile. That was the type system being right: a slug
 * existing is not the same as a job the room can run. Separated, nothing
 * compiles-checks the other direction any more — a job with no slug behind
 * it — so it is asserted here instead.
 */
import { readFileSync } from 'node:fs';
import {
  WORKFLOWS, slugFor, whatIsSet, wrongSlugs,
  type Flow, type Which, type Workflow,
} from '../app/lib/server/musicai';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const flows = Object.keys(WORKFLOWS) as Flow[];
const nameOf = (one: Flow) => `MUSIC_AI_WORKFLOW_${one.toUpperCase()}`;

const source = readFileSync('app/lib/server/musicai.ts', 'utf8');
const page = readFileSync('docs/SWITCH-ON.md', 'utf8');

ok(`there are workflows to check at all (${flows.length})`, flows.length > 0);

const unread = flows.filter((one) => !source.includes(`process.env.${nameOf(one)}`));
ok('  and each reads its variable by its literal name',
  unread.length === 0,
  `${unread.map(nameOf).join(', ')} — a variable read through a computed name`
  + ' is invisible to every rule that asks whether it is written down where'
  + ' she works from, which is why `check:envdoc` refuses one');

const undocumented = flows.filter((one) => !page.includes(nameOf(one)));
ok('  and each is named on the page she sets things from',
  undocumented.length === 0,
  `${undocumented.map(nameOf).join(', ')} — she cannot create a workflow for a`
  + ' slug nobody told her about, and an unset slug is a room that says it is'
  + ' not set up with no way to find out which one');

/* ── The setup screen, built rather than read ──────────────────────────── */

/**
 * `whatIsSet` run on an account, which is what `/api/analyse/setup` answers
 * with. It used to type the three names out by hand, so a fourth would have
 * been missing from the one screen whose whole job is to say which slugs are
 * set — and even built from the map, it only said WHICH were set, never
 * whether what they held was real.
 *
 * The slugs below are shaped like the ones a workflow saved without a name
 * gets: `untitled-workflow-` and seven hex characters. Two of those differ by
 * a few characters in the middle, both are valid, and swapped they both start
 * a job — so this is the case the join has to catch.
 */
const ACCOUNT: readonly Workflow[] = [
  { id: '1', name: 'Chords and Beat Mapping', slug: 'untitled-workflow-a1b2c3d' },
  { id: '2', name: 'Basic Stems - Auto', slug: 'stem-separation-suite' },
];

const was = {
  read: process.env.MUSIC_AI_WORKFLOW_READ,
  stems: process.env.MUSIC_AI_WORKFLOW_STEMS,
  align: process.env.MUSIC_AI_WORKFLOW_ALIGN,
  apiKey: process.env.MUSIC_AI_API_KEY,
  secret: process.env.POST_SECRET,
};
/* Set with a trailing space on purpose: this value reaches us by being pasted
   into a web form, and Vercel keeps what it is given. */
process.env.MUSIC_AI_WORKFLOW_READ = 'untitled-workflow-a1b2c3d ';
process.env.MUSIC_AI_WORKFLOW_STEMS = 'untitled-workflow-a1b2cf9';
process.env.MUSIC_AI_WORKFLOW_ALIGN = '';

const reported = whatIsSet(ACCOUNT);
const wrong = wrongSlugs(reported);

ok('  and the setup screen reports every workflow in the map',
  flows.every((one) => nameOf(one) in reported)
  && Object.keys(reported).length === flows.length,
  `${Object.keys(reported).join(', ')}`);

ok('  and a slug that is on the account is named rather than just confirmed',
  reported.MUSIC_AI_WORKFLOW_READ?.onAccount === true
  && reported.MUSIC_AI_WORKFLOW_READ?.name === 'Chords and Beat Mapping',
  `read came back as ${JSON.stringify(reported.MUSIC_AI_WORKFLOW_READ)} — the`
  + ' name is the whole point of the join: two untitled slugs are told apart'
  + ' by what the account calls them, not by their last three characters');

ok('  and a pasted space does not stop it matching',
  reported.MUSIC_AI_WORKFLOW_READ?.slug === 'untitled-workflow-a1b2c3d',
  `read came back as ${JSON.stringify(reported.MUSIC_AI_WORKFLOW_READ?.slug)} —`
  + ' a slug with a space on the end is a job that fails at their end under a'
  + ' name that looks right in every screen we have');

ok('a slug that is set and is NOT on the account is reported as wrong',
  reported.MUSIC_AI_WORKFLOW_STEMS?.onAccount === false
  && reported.MUSIC_AI_WORKFLOW_STEMS?.slug === 'untitled-workflow-a1b2cf9'
  && wrong.includes('MUSIC_AI_WORKFLOW_STEMS'),
  `stems came back as ${JSON.stringify(reported.MUSIC_AI_WORKFLOW_STEMS)},`
  + ` wrong = [${wrong.join(', ')}] — this is the failure that costs money:`
  + ' the room charges, starts the job, names a workflow the account does not'
  + ' have, and the refusal arrives from their end with the credits taken');

ok('  and an EMPTY variable is not reported as wrong, only as unset',
  reported.MUSIC_AI_WORKFLOW_ALIGN?.slug === null
  && reported.MUSIC_AI_WORKFLOW_ALIGN?.onAccount === false
  && !wrong.includes('MUSIC_AI_WORKFLOW_ALIGN'),
  `align came back as ${JSON.stringify(reported.MUSIC_AI_WORKFLOW_ALIGN)},`
  + ` wrong = [${wrong.join(', ')}] — align is deliberately unset until`
  + ' alignment moves off ElevenLabs, and a page that calls that an error is a'
  + ' page she learns to ignore');

/* ── And the page itself, answered for real ────────────────────────────── */

/**
 * `/api/analyse/setup` called, not grepped.
 *
 * The rule here was a regular expression over the route's source asking
 * whether it mentioned `whatIsSet`. It passed with the answer thrown away —
 * proven by replacing `using: set` with an empty object, which it did not
 * notice. A grep catches a deletion and misses a substitution, and this page
 * is the one screen she has for telling a wrong slug from an unset one.
 *
 * So the route is imported and called. There is one `fetch` behind Music.ai
 * and it is stubbed with the same account as above, so the page answers about
 * a known account with known slugs and the answer is read off the body.
 */
const realFetch = globalThis.fetch;
process.env.MUSIC_AI_API_KEY = 'test-key-not-a-real-one';
process.env.POST_SECRET = 'test-secret-not-a-real-one';
globalThis.fetch = (async (url: string | URL | Request): Promise<Response> => {
  const where = String(url instanceof Request ? url.url : url);
  if (where.endsWith('/application')) {
    return Response.json({ id: 'app', name: 'FutureBox test account' });
  }
  if (where.includes('/workflow')) return Response.json({ workflows: ACCOUNT });
  throw new Error(`check:werkvloeie — the route reached ${where}, which is not stubbed`);
}) as typeof globalThis.fetch;

const { GET } = await import('../app/api/analyse/setup/route');
const answered = await GET(new Request(
  `https://example.test/api/analyse/setup?key=${process.env.POST_SECRET}`,
));
const body = await answered.json() as {
  ready?: boolean;
  using?: Record<string, { slug: string | null; name: string | null; onAccount: boolean }>;
  next?: string;
};

globalThis.fetch = realFetch;
process.env.MUSIC_AI_WORKFLOW_READ = was.read;
process.env.MUSIC_AI_WORKFLOW_STEMS = was.stems;
process.env.MUSIC_AI_WORKFLOW_ALIGN = was.align;
process.env.MUSIC_AI_API_KEY = was.apiKey;
process.env.POST_SECRET = was.secret;

ok('the page answers with the join rather than a list of its own',
  body.using?.MUSIC_AI_WORKFLOW_READ?.name === 'Chords and Beat Mapping'
  && body.using?.MUSIC_AI_WORKFLOW_STEMS?.onAccount === false
  && body.using?.MUSIC_AI_WORKFLOW_ALIGN?.slug === null,
  `using came back as ${JSON.stringify(body.using)} — the whole point of this`
  + ' page is that "not set", "set" and "set to something that is not there"'
  + ' are three different answers on one screen');

ok('  and it names the variable holding the wrong slug',
  typeof body.next === 'string' && body.next.includes('MUSIC_AI_WORKFLOW_STEMS'),
  `next came back as ${JSON.stringify(body.next)} — "something is wrong" with`
  + ' no variable named is a page she has to guess from, and there are three'
  + ' slugs that look alike enough to need telling apart');

/* ── A job the room can ask for must have a slug ───────────────────────── */

const JOBS: readonly Which[] = ['read', 'stems'];
const orphans = JOBS.filter((one) => !(flows as string[]).includes(one));
ok('every job the analyse room can ask for has a workflow behind it',
  orphans.length === 0,
  `${orphans.join(', ')} — the room would charge for it, start a job and name`
  + ' a workflow that is not in the map, which fails at their end against a'
  + ' bill that has already been taken');

/* `Which` is maintained by hand now that it is not `keyof typeof WORKFLOWS`,
   so the list above has to be the whole of it. Asserted by exhaustiveness:
   a job added to the type and not to `JOBS` stops this compiling. */
const covered: Record<Which, true> = { read: true, stems: true };
ok('  and the list above is every job there is',
  JOBS.length === Object.keys(covered).length,
  'a job added to `Which` and not here would be checked by nothing');

if (bad) {
  console.error(`\ncheck:werkvloeie — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:werkvloeie — ${flows.length} Music.ai workflows, each read by its own`
  + ' name, each on the page she sets things from, and each reported by the'
  + ' screen that says which are set.',
);
