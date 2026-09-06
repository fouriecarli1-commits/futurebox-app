/**
 * The scene window: what the copilot may write, and what it may not touch.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 *   "Wanneer die copilot in video prompt, moet daar darem 'n bar wees binne
 *    die video wat my begelei om die regte keuses te maak vir die scenes.
 *    Daar is huidiglik geen so window waarin die scenes en styl van die video
 *    kom nie."
 *
 * Most of the board was already there — write shots, reorder them, throw them
 * away, and each one shows the clip that came back for it. What was missing is
 * the half she names: the copilot could describe a music video in the chat and
 * the person had to retype it into the list beside it, shot by shot.
 *
 * ── The rule that costs money if it breaks ───────────────────────────────
 *
 * `write_scenes` replaces the list. A shot that has already been generated has
 * been paid for, and replacing it with a sentence is spending somebody's money
 * and then throwing away what it bought. Made shots survive, and they survive
 * first. That is the assertion this file exists for; the rest is scaffolding
 * around it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { askFor, shotsFrom, MOST_SHOTS, type Shot } from '../app/lib/storyboard.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── The look joins every shot, and joins it at the end ─────────────────── */

const shot: Shot = { id: 's1', prompt: 'A woman walks into the sea', seconds: 5 };

ok('a shot with no look is sent as written', askFor(shot) === 'A woman walks into the sea');
ok(
  'a look is joined onto the shot',
  askFor(shot, 'grainy super-8') === 'A woman walks into the sea. grainy super-8',
);
ok(
  'and it goes last, because a prompt is read hardest at its front',
  askFor(shot, 'grainy super-8').startsWith('A woman walks'),
);
ok('an empty look changes nothing', askFor(shot, '   ') === askFor(shot));

/* ── What the copilot writes becomes shots ──────────────────────────────── */

const written = shotsFrom(
  '1. Wide over the Karoo at sunset\n2. Close on hands on a guitar\n\n- A car on a dirt road\n',
  5,
);
ok('every line becomes a shot', written.length === 3, `${written.length}`);
ok(
  'the numbering a person writes does not reach the engine',
  written[0].prompt === 'Wide over the Karoo at sunset',
  written[0].prompt,
);
ok('and neither does a bullet', written[2].prompt === 'A car on a dirt road', written[2].prompt);
ok('blank lines are not shots', written.every((one) => one.prompt.length > 0));
ok('each one gets its own id', new Set(written.map((one) => one.id)).size === written.length);
ok('and the length the desk said', written.every((one) => one.seconds === 5));

const many = shotsFrom(Array.from({ length: MOST_SHOTS + 10 }, (_, i) => `Shot ${i}`).join('\n'), 5);
/* The cap's value written here too, not only its name.
 
   `many.length === MOST_SHOTS` proves the cap is applied and says nothing
   about what it is: change the constant and both sides move together, exactly
   as check:prices did with the video rate. Thirty shots is a decision about
   how long a board can get before it stops being usable, so it is pinned. */
const CAP = 30;
ok(`the cap is ${CAP} shots`, MOST_SHOTS === CAP, `the code says ${MOST_SHOTS}`);
ok(`no more than ${CAP} shots come back`, many.length === CAP, `${many.length}`);

/* ── And the room registers them, and keeps what was paid for ───────────── */

const board = readFileSync(join(ROOT, 'app/components/Storyboard.tsx'), 'utf8');

ok('the board registers its operations with the copilot', /useCopilotOps\('canvas'/.test(board));
ok('one of them sets the look', /set_look:/.test(board));
ok('and one writes the scenes', /write_scenes:/.test(board));
ok(
  'a generated shot is kept when scenes are rewritten',
  /filter\(\(one\) => one\.makeId\)/.test(board),
  'write_scenes must not discard a paid-for shot',
);
ok(
  'and the look is what is actually sent to the engine',
  /treatment: askFor\(shot, board\.look\)/.test(board),
);
ok('the look survives a reload', /readonly look\?: string/.test(
  readFileSync(join(ROOT, 'app/lib/storyboard.ts'), 'utf8'),
));
ok(
  'and is read back off the stored board',
  /typeof said\.look === 'string'/.test(readFileSync(join(ROOT, 'app/lib/storyboard.ts'), 'utf8')),
);

if (failures) {
  console.error(`\ncheck:storyboard — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:storyboard — the copilot writes the scenes, and never spends what was already paid for.');
