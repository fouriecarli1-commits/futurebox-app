/**
 * No room waits for a job that is never coming.
 *
 * ── What was wrong, in three rooms ──────────────────────────────────────
 *
 * A job poll answers "nothing yet" for three different things: the video is
 * still being made, nobody is signed in, and any network blip at all. Three
 * rooms treated all of them as "keep waiting" and asked again every five
 * seconds, for ever — the kids' room, the photo room's *bring the photograph
 * to life*, and the cutting room's shot.
 *
 * And while a job is live, the press that started it is disabled; in the
 * kids' room the whole room is. So a job that stalls without ever reporting
 * `failed` does not just lose a video: it locks the room until somebody
 * thinks to reload the page, and in the kids' room the person it happens to
 * is six.
 *
 * The grown-up path in `lib/engines.ts` has had an eight-minute ceiling and a
 * carefully worded message for this since it was written. None of the three
 * had either. The kids' room was found first; the other two were found by
 * looking for the same shape.
 *
 * ── Why the decision is a function and not an `if` in the effect ─────────
 *
 * Because an `if` inside a `useEffect` cannot be tested with real numbers,
 * and this check exists to test it with real numbers. A check that read the
 * room's source and asserted "there is a comparison against WAIT_MOST" would
 * pass on a comparison pointing the wrong way — which is the whole failure
 * mode worth guarding against, and exactly the kind of green that measures
 * something adjacent to the thing that matters.
 *
 * So `stillWorthWaiting` is exported, and this asks it the questions that
 * matter at the boundary.
 *
 * ── The zero ────────────────────────────────────────────────────────────
 *
 * `since === 0` means no wait has started. The first version of the function
 * did not special-case it, so a zero read as a wait that began in 1970 and
 * every job was abandoned the instant it started — the opposite bug, and a
 * worse one, because it would have broken videos that were working.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WAIT_MOST, stillWorthWaiting } from '../app/lib/jobwait.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
}

/* A real clock reading rather than a small number, because the arithmetic is
   on milliseconds since 1970 and a bug that only shows up at that magnitude
   is exactly the kind this is for. */
const now = Date.UTC(2026, 9, 11, 14, 30, 0);

ok('it waits when the video has only just been asked for',
  stillWorthWaiting(now, now));

ok('it still waits one millisecond before the ceiling',
  stillWorthWaiting(now - (WAIT_MOST - 1), now));

ok('it still waits exactly at the ceiling',
  stillWorthWaiting(now - WAIT_MOST, now));

ok('and it stops one millisecond past the ceiling',
  !stillWorthWaiting(now - (WAIT_MOST + 1), now),
  'the room stays locked with every control disabled');

ok('it stops long past the ceiling',
  !stillWorthWaiting(now - 60 * 60_000, now));

ok('a wait that has not started is not a wait that began in 1970',
  stillWorthWaiting(0, now),
  'treating zero as a timestamp abandons every job the instant it starts');

/* ── The ceiling is the same one the grown-up path uses ──────────────────

   Not a style point. Two different limits for the same engine on the same
   account would mean one of them is wrong, and nothing would say which. */
ok('the ceiling is eight minutes',
  WAIT_MOST === 8 * 60_000,
  `it is ${WAIT_MOST}ms`);


/* ── And no fourth room ships with the same shape ────────────────────────

   This part is structural, and says so. It cannot tell whether a comparison
   points the right way — the boundary tests above are what do that. What it
   CAN do is stop the shape from reappearing, which is how all three of these
   got here: the poll was copied from room to room, clock and all missing,
   because copying it was easier than writing one.

   The rule: a file that polls a job on an interval reads the shared ceiling.
   A room that wants to wait differently writes its reason in ALLOWED. */
const POLLS = /setInterval\(\(\) => \{ void ask\(\); \}/;

/** Files that poll on an interval for something that is not a job. */
const ALLOWED: Readonly<Record<string, string>> = {};

const roomFiles = readdirSync('app/components').filter((one) => one.endsWith('.tsx'));
for (const one of roomFiles) {
  const code = withoutComments(readFileSync(join('app/components', one), 'utf8'));
  if (!POLLS.test(code)) continue;
  const why = ALLOWED[one];
  if (why) {
    console.log(`  ok   ${one} polls without the shared ceiling on purpose — ${why}`);
    continue;
  }
  /* `stillWorthWaiting(` with the paren, not the bare name.

     The first version of this tested for the bare name and PASSED a mutation
     that replaced the whole condition with `if (false)` — because the import
     line still said `stillWorthWaiting`. It was measuring whether the room
     had heard of the ceiling, not whether it applied it. Caught by mutating
     it, which is the only reason this line is right. */
  ok(`${one} polls a job, and applies the shared ceiling`,
    /stillWorthWaiting\(/.test(code),
    'it asks for ever, and the press that started the job is disabled while it does');
}

if (bad) {
  console.error(`\ncheck:jobwait — ${bad} answer(s) wrong. A room stays locked until somebody reloads the page.\n`);
  process.exit(1);
}
console.log('\ncheck:jobwait — three rooms wait eight minutes for a job, then unlock themselves and say so.');
