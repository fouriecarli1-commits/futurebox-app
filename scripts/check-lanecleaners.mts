/**
 * Cleaning a lane, and the law it must not break.
 *
 * Carli: "by die booth moet daar oor die algemeen ook reverb, echo en
 * background cleaners wees."
 *
 * ── The law ──────────────────────────────────────────────────────────────
 *
 * `lib/session.ts` exists for one rule: the mixer and the mixdown can never
 * disagree about what somebody is listening to. Both go through `wireLane`,
 * so anything added to a lane has to be added there and nowhere else — a
 * cleaner that ran only in the render would make the file differ from what was
 * approved, invisibly, and the difference is exactly the kind nobody can point
 * at.
 *
 * ── Why two filters and not four ─────────────────────────────────────────
 *
 * A high pass and a low pass are one biquad each and sound identical in both
 * paths. A **gate** has to look at the samples and decide, and Web Audio has
 * no node that does it; a **de-reverb** is a model rather than a filter.
 * Building either of those locally would mean either breaking the law above or
 * shipping something that only half works.
 *
 * So the free half is filters, and the rest is the isolator — which already
 * exists, already costs credits, and already says so.
 *
 *   npm run check:lanecleaners
 */
import { readFileSync } from 'node:fs';
import { HISS_HZ, NOTHING_OFF, RUMBLE_HZ, isUncleaned } from '../app/lib/tone';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── 1. Nothing is built when nothing is asked ─────────────────────────── */
ok('a lane with nothing taken off builds nothing', isUncleaned(NOTHING_OFF));
ok('and a lane made before this existed is the same',
  isUncleaned(undefined));
ok('one switch is enough to build it', !isUncleaned({ rumble: true, hiss: false }));

/* ── 2. The numbers are the ones the server already uses ───────────────── */
const kits = readFileSync('app/lib/server/kits.ts', 'utf8');
ok('rumble cuts where PHONE_CLEANUP cuts', RUMBLE_HZ === 80
  && /cutoff_frequency_hz: 80/.test(kits), String(RUMBLE_HZ));
ok('and hiss where the low pass does', HISS_HZ === 12000
  && /cutoff_frequency_hz: 12000/.test(kits), String(HISS_HZ));

/* ── 3. It runs in `wireLane`, which is both paths ─────────────────────── */
const session = readFileSync('app/lib/session.ts', 'utf8');
ok('the cleaner is built inside wireLane',
  /export function wireLane[\s\S]*?wireClean\(ctx, lane\.clean\)/.test(session));
/* Both the live path and the render call `wireLane`; nothing else may wire a
   lane, or the two can drift. */
ok('and the render goes through the same function',
  /mixSession[\s\S]*?startLane\(wireLane\(offline, lane, bus\), lane\)/.test(session));

/* ── 4. Clean first, then shape ────────────────────────────────────────── */
ok('the cleaner is in front of the tone stack',
  /if \(cleaned\) cleaned\.output\.connect\(shaped \? shaped\.input : level\);/.test(session),
  'driving a take that still has rumble in it drives the rumble too');
ok('and the head of the chain is the cleaner when there is one',
  /const head: AudioNode = cleaned \? cleaned\.input : shaped \? shaped\.input : level;/.test(session));

/* ── 5. The half a filter cannot do says what it costs ─────────────────── */
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
ok('the lane offers to take the room off', /onClick=\{onDeRoom\}/.test(booth));
ok('and its price is beside it', /<Cost rate=\{CREDITS\.clean\} seconds=\{lane\.audio\.duration\} \/>/.test(booth));
/* The same rule every paid lane action follows: a trimmed lane is not billed
   for the part that was cut off it. */
ok('it is billed for the piece that plays, not the whole recording',
  /const deRoom = useCallback[\s\S]*?const piece = pieceOf\(lane, ctx\);/.test(booth));
ok('the cleaned audio replaces the lane rather than adding one',
  /one\.id === lane\.id\s*\?\s*\{ \.\.\.one, audio: cleaned/.test(booth));
/* What comes back is already the piece that played, so keeping the old window
   would trim it a second time. */
ok('and the cut is cleared, because it has already been spent',
  /audio: cleaned, from: undefined, to: undefined/.test(booth));

/* ── 6. It says the free half is free ──────────────────────────────────── */
const strings = readFileSync('app/lib/i18n.tsx', 'utf8');
ok('the explanation says the filters cost nothing',
  /Neither costs anything: they happen on this device/.test(strings));
ok('and says why they run first',
  /driving a take that still has rumble in it drives the rumble too/.test(strings));

console.log(
  failures
    ? `\ncheck:lanecleaners — ${failures} assertion(s) failed.`
    : '\ncheck:lanecleaners — cleaned before shaped, in both paths, and the paid half says so.',
);
process.exit(failures ? 1 : 0);
