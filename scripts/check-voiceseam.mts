/**
 * The seam in front of "this recording, in this voice".
 *
 *   npm run check:voiceseam
 *
 * ── What is actually being proved ────────────────────────────────────────
 *
 * That a SECOND supplier is a file rather than a rewrite.
 *
 * There is no way to assert that by reading the one supplier we have: an
 * interface shaped entirely around Kits would pass every test written with
 * Kits in mind. So this check writes the second supplier. `Hummer` below is a
 * complete stand-in implemented against `lib/server/singer.ts` and nothing
 * else — different id shape (words, not numbers), a different ceiling in
 * different units, its own tuning — and the check then drives it through the
 * same interface the room uses.
 *
 * If the seam were secretly Kits-shaped, `Hummer` could not be written. That
 * is the whole claim, and it is why this file is longer than the thing it
 * tests.
 *
 * ── Why the seam exists ──────────────────────────────────────────────────
 *
 * Kits' terms §1.3: they may remove or replace any voice model, and remove
 * functionality, if they have "any reason to believe" it may infringe. The
 * catalogue is not a stable dependency. Before the seam, losing it meant the
 * feature stopped rather than moved.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  mineOnly, type Ask, type Room, type Singer, type Sung, type Voice,
} from '../app/lib/server/singer.ts';
import { ROLL, enrolled, theSinger } from '../app/lib/server/singers.ts';
import { kitsSinger } from '../app/lib/server/singerkits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── A second supplier, written against the interface and nothing else ─── */

/** What a Hummer tuning carries. Nothing Kits has ever heard of. */
interface HumTuning {
  readonly breathiness?: number;
  readonly steps?: number;
}

const seen: { ask: Ask | null; tuning: unknown; noted: number } =
  { ask: null, tuning: undefined, noted: 0 };

/**
 * A supplier that is nothing like Kits.
 *
 * Voices named with words. A ceiling counted in GPU-seconds rather than
 * download-minutes. A tuning with its own two fields. If any of that could
 * not be expressed, the seam would be a Kits function with a new name.
 */
const hummer: Singer = {
  id: 'hummer',
  name: 'Hummer',
  configured: () => true,
  voices: async (): Promise<readonly Voice[]> => ([
    { id: 'alto-warm', name: 'Warm alto' },
    { id: 'tenor-bright', name: 'Bright tenor' },
  ]),
  stillThere: async (voice) => voice !== 'withdrawn',
  room: async (seconds): Promise<Room> => (seconds <= 60
    ? { ok: true, leftSeconds: 3600 - seconds }
    : { ok: false, code: 'hummer_gpu_used', message: 'No GPU seconds left this month.', left: 0 }),
  note: async (seconds) => { seen.noted += seconds; },
  sing: async (ask): Promise<Sung> => {
    seen.ask = ask;
    seen.tuning = mineOnly(hummer, ask.tuning);
    return { ok: true, audio: new ArrayBuffer(8), type: 'audio/wav' };
  },
};

/* ── 1. It can be written at all ─────────────────────────────────────── */

ok('a supplier unlike Kits can be written against the seam',
  hummer.id === 'hummer' && typeof hummer.sing === 'function',
  'this file compiling and running IS the assertion: `Hummer` implements'
  + ' `Singer` and imports nothing from `kits.ts`');

ok('  with voices named in words rather than numbers',
  (await hummer.voices()).every((one) => /[a-z]/.test(one.id)),
  'Kits’ ids are digits. A seam that demanded digits would be Kits with a'
  + ' new name, and the route would have to be rewritten for anyone else');

ok('  and a ceiling counted in its own units',
  (await hummer.room(30)).ok && !(await hummer.room(600)).ok,
  'Kits counts download-minutes against a monthly four hundred; this one'
  + ' counts GPU-seconds. The route asks "is there room" and does not know');

ok('  and a refusal that keeps its own code, so it can be said in Afrikaans',
  (await hummer.room(600)).code === 'hummer_gpu_used',
  '`lib/apierror.ts` turns a code into a sentence in her language, and a seam'
  + ' that flattened every refusal into one English message would quietly'
  + ' remove a translation');

/* ── 2. A tuning crosses to its owner and nobody else ─────────────────── */

const base: Omit<Ask, 'tuning'> = {
  voice: 'alto-warm',
  audio: new Blob([new Uint8Array(4)]),
  filename: 'take.wav',
  want: 'voice',
  deadline: Date.now() + 1000,
};

await hummer.sing({ ...base, tuning: { by: 'hummer', it: { breathiness: 0.4 } satisfies HumTuning } });
ok('a supplier is given its own tuning',
  (seen.tuning as HumTuning | undefined)?.breathiness === 0.4,
  JSON.stringify(seen.tuning));

await hummer.sing({ ...base, tuning: { by: 'kits', it: { cleanup: { noiseGate: { threshold_db: -45 } } } } });
ok('and another supplier’s tuning is DROPPED, not half-read',
  seen.tuning === undefined,
  `${JSON.stringify(seen.tuning)} — a second supplier finding field names it`
  + ' nearly recognises and applying something nearly right is the failure'
  + ' nobody reports. Dropping it is visible: the voice comes back unpolished'
  + ' and somebody says so');

await hummer.sing({ ...base, tuning: null });
ok('  and no tuning at all is not an error',
  seen.tuning === undefined && seen.ask?.voice === 'alto-warm',
  JSON.stringify(seen.ask?.voice));

ok('`mineOnly` is the one place that decision is made',
  mineOnly(hummer, { by: 'hummer', it: 7 }) === 7
  && mineOnly(hummer, { by: 'kits', it: 7 }) === undefined
  && mineOnly(hummer, null) === undefined,
  'the same two-line check copied into every supplier is the same check with'
  + ' two places to get it wrong');

/* ── 3. The spine carries what is true of all of them ─────────────────── */

await hummer.sing({ ...base, pitch: -12, strength: 0.8, want: 'mix' });
ok('pitch, strength and whether the music comes back are on the ask itself',
  seen.ask?.pitch === -12 && seen.ask?.strength === 0.8 && seen.ask?.want === 'mix',
  JSON.stringify({ p: seen.ask?.pitch, s: seen.ask?.strength, w: seen.ask?.want }));

ok('  because every system that does this has them under some name',
  true,
  'unlike a noise gate’s attack time in milliseconds, which is one'
  + ' supplier’s effects chain and travels as an opaque tuning');

/* ── 4. Choosing who answers ──────────────────────────────────────────── */

/* Driven through the very function the room calls, with a roll handed in —
   not a copy of it written to be tested. A chooser tested through a
   re-implementation of itself is a chooser nobody has tested. */
const off: Singer = { ...hummer, id: 'asleep', configured: () => false };
const two: readonly Singer[] = [off, hummer];

ok('nobody configured means nobody answers, rather than a crash',
  theSinger('asleep', two) === null,
  'the route turns that into "not switched on yet", which is the same answer'
  + ' it gave before the seam existed');

ok('the first configured supplier answers when none is named',
  theSinger('', two)?.id === 'hummer',
  String(theSinger('', two)?.id));

ok('and one named by SINGER answers instead',
  theSinger('hummer', two)?.id === 'hummer' && theSinger('nobody', two) === null,
  'so a second supplier is switched on without new code being deployed');

ok('  whatever case it is written in, and with a stray space',
  theSinger('  HuMMer ', two)?.id === 'hummer',
  'an environment variable typed by a person');

/* ── 5. Kits, behind it ───────────────────────────────────────────────── */

ok('Kits is on the roll',
  ROLL.some((one) => one.id === 'kits'),
  ROLL.map((one) => one.id).join(', '));

ok('  and `enrolled` reports it',
  enrolled().some((one) => one.id === 'kits'),
  enrolled().map((one) => one.id).join(', '));

ok('  and it answers every part of the interface',
  (['configured', 'voices', 'stillThere', 'room', 'note', 'sing'] as const)
    .every((one) => typeof kitsSinger[one] === 'function'),
  'a supplier missing a method is a supplier that compiles and then throws');

ok('the roll is one explicit list and not something suppliers join themselves',
  /export const ROLL: readonly Singer\[\] = \[kitsSinger\]/
    .test(withoutComments(readFileSync('app/lib/server/singers.ts', 'utf8'))),
  'the self-registering version enrolled into one module instance and was read'
  + ' from another, because two import specifiers for the same file are two'
  + ' module records under plain node. It would have worked in the bundle and'
  + ' not under node, which is the worst place for a difference to live');

const adapter = withoutComments(readFileSync('app/lib/server/singerkits.ts', 'utf8'));

ok('a voice that cannot be fetched is treated as still there',
  /catch \{\s*return true;/.test(adapter),
  'an outage is not a withdrawal. Refusing a member’s saved voice because'
  + ' Kits was briefly unreachable would be the §1.3 guard doing more harm'
  + ' than the thing it guards against');

ok('  and what a usable voice id looks like is Kits’ answer, not the seam’s',
  /const id = safeModelId\(ask\.voice\)/.test(adapter),
  'theirs are digits and go back out in a form field; a supplier whose ids are'
  + ' words must not be refused by a rule written for one whose ids are not');

ok('the phone default survives the move',
  /mine\.cleanup === undefined \? PHONE_CLEANUP : mine\.cleanup/.test(adapter),
  'an absent tuning means "nothing was said", so the tuned default for a phone'
  + ' take applies. An empty object means "no cleaning at all", which is a'
  + ' different answer and worse for the recordings this app gets');

ok('  and the seam’s own two dials win over anything in the tuning',
  /\.\.\.\(ask\.pitch === undefined \? \{\} : \{ pitchShift: ask\.pitch \}\)/.test(adapter),
  'they are what the room asked for in its own words; a tuning is the'
  + ' leftovers');

/* ── 6. The route goes through the seam ───────────────────────────────── */

const route = withoutComments(readFileSync('app/api/voice/sing/route.ts', 'utf8'));

ok('the route asks the seam to sing, not Kits',
  /const done = await who\.sing\(\{/.test(route) && !/\bconvert\(/.test(route),
  'this is the whole change: one way to sing in another voice that does not'
  + ' name who does it');

ok('  and asks the seam whether there is room, not Kits’ minutes',
  /await who\.room\(billed/.test(route) && !/from '@\/app\/lib\/server\/kitsminutes'/.test(route),
  'a seam that only moves audio is cosmetic. What differs between suppliers is'
  + ' what their work costs and against which ceiling');

ok('  and writes the usage down through it too',
  /void who\.note\(billed/.test(route),
  'kept after the audio is in hand, because Kits’ minutes burn on download'
  + ' and a conversion that failed downloaded nothing');

ok('  and no longer validates the voice id in one supplier’s shape',
  !/safeModelId/.test(route),
  'that rule moved to the supplier that defines it');

ok('the route names no supplier of its own',
  !/singerkits'/.test(route.replace(/import type \{[^}]*\} from '@\/app\/lib\/server\/singerkits';/, '')),
  'a route holding a list of suppliers is a route that has to be edited to add'
  + ' one, which is the thing being removed. The one mention left is a TYPE'
  + ' import for the tuning it builds — erased at compile time, and the route'
  + ' has to know the shape of the settings it is sending somewhere');

ok('the refusal still carries its code and what is left',
  /error: room\.code, message: room\.message, left: room\.left/.test(route),
  '"you are out" and "everybody is out" have to stay different answers on the'
  + ' screen, not only in here');

if (bad) {
  console.error(`\ncheck:voiceseam — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:voiceseam — the room asks for a recording in a voice and does not know'
  + ' who answers: a second supplier unlike Kits is written here against the'
  + ' same interface and driven through it, a tuning crosses only to the'
  + ' supplier that issued it, and the ceiling is asked of whoever has one.',
);
