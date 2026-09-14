/**
 * What the copilot may do to a mix, proved without an API key.
 *
 * ── The fault this is written against ───────────────────────────────────
 *
 * Carli, 14 September 2026: *"Copilot pop op en vra dat persoon 'n mixing
 * voorstel en copilot kan die mixing verander volgens die vraag en
 * voorstel."*
 *
 * A model is asked for changes inside a range and it will mostly stay inside
 * it. "Mostly" is not a property you can build a fader on: a gain of 4 that
 * reaches `lane.gain` is a lane twelve decibels over everything else and a
 * mix somebody has to rebuild by hand. So the rules live in
 * `app/lib/mixplan.ts` rather than in the route, and this runs them for
 * real — no key, no network, no model.
 *
 * ── The one rule that is not arithmetic ─────────────────────────────────
 *
 * Nothing is applied on its own. That cannot be proved by calling a
 * function, so it is proved the other way: the panel has an Apply button,
 * and the room's `onApply` is reached from nothing else.
 *
 *   npm run check:mixplan
 */

import { readFileSync } from 'node:fs';
import { planMix, applyMove, sayMove, MOST_MOVES, type LaneNow } from '../app/lib/mixplan';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const LANES: LaneNow[] = [
  { id: 'a', name: 'Voice', gain: 1, pan: 0, muted: false, fx: [] },
  { id: 'b', name: 'Drums', gain: 1, pan: -0.5, muted: false, fx: ['reverb'] },
];

/* ── Clamped, because a model is not a contract ───────────────────────── */
const loud = planMix([{ laneId: 'a', gain: 4, why: 'much louder' }], LANES);
ok('a fader beyond the top of its range is brought back to it', loud[0]?.gain === 1.5, String(loud[0]?.gain));
const quiet = planMix([{ laneId: 'a', gain: -2, why: 'off' }], LANES);
ok('  and below the bottom of it', quiet[0]?.gain === 0, String(quiet[0]?.gain));
const wide = planMix([{ laneId: 'a', pan: 3, why: 'right' }], LANES);
ok('  and a pan past hard right', wide[0]?.pan === 1, String(wide[0]?.pan));
const silly = planMix([{ laneId: 'a', gain: 'loud', why: 'louder' }], LANES);
ok('  and a number that is not one is dropped rather than guessed',
  silly.length === 0 || silly[0]?.gain === undefined, JSON.stringify(silly));

/* ── Dropped, because identity is not a matter of degree ──────────────── */
ok('a change to a lane that is not in the session is dropped',
  planMix([{ laneId: 'ghost', gain: 0.5, why: 'quieter' }], LANES).length === 0,
  'that is not a change with a typo in it, it is a change to something else');
ok('an effect name the rack does not have is ignored',
  planMix([{ laneId: 'a', fxOn: 'autotune', why: 'tune it' }], LANES).length === 0);
ok('a change that changes nothing is not shown',
  planMix([{ laneId: 'a', why: 'leave it' }], LANES).length === 0,
  'a line in the list that moves no fader is noise');
ok('a change with no reason given is dropped',
  planMix([{ laneId: 'a', gain: 0.5 }], LANES).length === 0,
  'the person has to be able to read why before agreeing to it');

/* ── One per lane, and not too many ───────────────────────────────────── */
const twice = planMix(
  [
    { laneId: 'a', gain: 0.5, why: 'quieter' },
    { laneId: 'a', gain: 1.2, why: 'louder' },
  ],
  LANES,
);
ok('two changes to one lane keep only the first',
  twice.length === 1 && twice[0].gain === 0.5,
  'applying both in order silently picks the last, which is a coin toss dressed as advice');

const many = planMix(
  Array.from({ length: 20 }, (_, i) => ({ laneId: i % 2 ? 'b' : 'a', gain: 0.5, why: 'quieter' })),
  LANES,
);
ok(`at most ${MOST_MOVES} changes come back`, many.length <= MOST_MOVES, String(many.length));

/* ── What a move does when it is applied ──────────────────────────────── */
const on = applyMove(
  planMix([{ laneId: 'a', fxOn: 'reverb', why: 'space' }], LANES)[0],
  { gain: 1 },
);
ok('switching an effect on gives it real settings, not an empty object',
  Boolean(on.fx?.reverb && typeof on.fx.reverb.mix === 'number'),
  JSON.stringify(on.fx));
const off = applyMove(
  planMix([{ laneId: 'b', fxOff: 'reverb', why: 'too wet' }], LANES)[0],
  { gain: 1, fx: { reverb: { size: 2, mix: 0.4 } } },
);
ok('  and switching one off removes it rather than zeroing it',
  off.fx !== undefined && !('reverb' in off.fx),
  'a node left in the chain at nothing is not the same as no node — see the note on Fx');

/* ── Readable before it is agreed to ──────────────────────────────────── */
const said = sayMove(planMix([{ laneId: 'a', gain: 0.5, why: 'quieter' }], LANES)[0], LANES);
ok('a change is described in decibels against where the fader is now',
  /Voice/.test(said) && /-6\.0 dB/.test(said), said);

/* ── And nothing moves on its own ─────────────────────────────────────── */
const panel = readFileSync('app/components/BoothAsk.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
ok('the panel has a button that applies them, and applies on nothing else',
  /onClick=\{\(\) => \{\s*onApply\(keeping\);/.test(panel) &&
    panel.split('onApply(').length === 2,
  'a mix is somebody’s taste; faders moving while they listen is indistinguishable from a bug');
ok('  and each one can be dropped from the list first', /setDropped\(/.test(panel));
ok('  and the room applies them in one pass, not one render per fader',
  /setLanes\(\(was\) =>\s*was\.map\(\(lane\) => \{/.test(booth),
  'a loop of state updates would let the two-second save write a half-applied mix');
ok('the panel says it cannot hear the audio',
  /ask\.cannotHear/.test(panel),
  'confident advice about a cymbal nobody heard is worse than no advice');

const route = readFileSync('app/api/mixdesk/route.ts', 'utf8');
ok('the route is told the same, so it does not invent listening',
  /You CANNOT hear the audio/.test(route));
ok('  and puts the question through the moderation gate', /screen\(question, 'song'\)/.test(route));
ok('  and through the same brake as the copilot', /tooMany\('mixdesk', request, LIMITS\)/.test(route));
ok('  and applies the rules rather than trusting the schema', /planMix\(/.test(route));

if (failures) {
  console.error(
    '\ncheck:mixplan — a model asked for a fader between 0 and 1.5 will mostly answer inside\n' +
      'that range, and "mostly" is not a property you can build a fader on.\n',
  );
  process.exit(1);
}
console.log('\ncheck:mixplan — clamped, dropped, described, and applied only when asked.');
