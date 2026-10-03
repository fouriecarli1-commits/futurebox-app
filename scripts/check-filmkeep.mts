/**
 * The project is kept, and a project that cannot be kept says so.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Die kamer onthou nie die projek nie. Ek het
 * perongeluk back gedruk en toe ek terug gaan was die projek weg."*
 *
 * ── What this holds that the browser walk cannot ─────────────────────────
 *
 * `audit/filmkeep.mjs` proves the film comes back, which is the request. It
 * cannot prove the two things that only show up on a bad day:
 *
 * A disk with no room left. A save that fails and is swallowed leaves her
 * working in a room that quietly stopped keeping anything — and she finds out
 * at the same moment as last time, by coming back to an empty clock. No probe
 * can fill a phone's disk, so the rule is that the save ANSWERS rather than
 * throws, and that the room draws the answer.
 *
 * And the race on the way in: the read is a round trip to disk, and somebody
 * with a clip ready is faster than it. A restore written without that in mind
 * lands on top of the clip she just brought in, which is the same loss wearing
 * the other mask.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const keep = withoutComments(readFileSync('app/lib/filmkeep.ts', 'utf8'));
const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const library = withoutComments(readFileSync('app/lib/library.ts', 'utf8'));

/* ── Where it is kept ──────────────────────────────────────────────────── */

ok('the project is kept somewhere that can hold a video',
  /indexedDB\.open/.test(keep) && !/localStorage/.test(keep),
  'a minute of phone video is tens of megabytes and localStorage holds about'
  + ' five of them, in strings');

ok('  and not in the database the songs are in',
  /const DB_NAME = 'futurebox-film'/.test(keep)
  && /const DB_NAME = 'futurebox'/.test(library),
  'library.ts opens `futurebox` at version 1 on every call; adding a store'
  + ' would mean version 2, and every one of those calls would then fail with'
  + ' a VersionError for the rest of the session');

ok('the material is kept apart from the edit',
  /const STUFF = /.test(keep) && /clipAt: /.test(keep),
  'the edit changes on every keystroke and the material never does — writing'
  + ' the whole project per change is three hundred megabytes through a'
  + ' transaction while she nudges a slider');

ok('  and a Blob already stored is not stored again',
  /if \(!already\.has\(key\)\) stuff\.put/.test(keep),
  'what a save costs then is kilobytes, which is what makes it safe to do'
  + ' every time she stops typing');

ok('  and material nothing points at any more is thrown away',
  /if \(!wanted\.has\(key\)\) stuff\.delete/.test(keep),
  'a clip taken off the clock that stays on the disk fills a phone with films'
  + ' she finished weeks ago');

ok('two pieces holding one clip keep one copy of it',
  /WeakMap<Blob, string>/.test(keep),
  '`duplicate` makes a new piece around the SAME Blob — keyed by piece id,'
  + ' every copy of a shot would write another copy of the material');

ok('  and still do after the project has been reopened',
  /for \(const \[key, blob\] of stuff\) if \(!keyFor\.has\(blob\)\) keyFor\.set/.test(keep),
  'the map is in memory and the reload empties it, so it is rebuilt from what'
  + ' came back rather than left to hand out new keys for the same bytes');

/* ── A save that could not happen ──────────────────────────────────────── */

/* Written out as three plain tests and not as one clever expression. The
   first version of this line was `A && B === false ? C : true`, which parses,
   compiles, reads like an assertion and passes whatever the file says — the
   exact shape of a check that is green because it measures nothing. */
ok('a save answers rather than throws',
  /Promise<Kept>/.test(keep)
  && /export type Kept = 'kept' \| 'full' \| 'off'/.test(keep)
  && /catch \(why\) \{/.test(keep),
  'the room has to be able to tell a full disk from a private window, and a'
  + ' thrown error up an effect is neither');

ok('  and a full disk is told apart from anything else',
  /QuotaExceededError/.test(keep),
  'they need different sentences: one is "there is no room", the other is'
  + ' "this browser will not keep anything"');

ok('  and the room says so on the screen',
  /data-editorkeptfull/.test(room) && /edit\.keptFull/.test(room),
  'a room that quietly stopped keeping her work tells her at exactly the'
  + ' moment it told her last time — by opening empty');

/* ── The way back in ───────────────────────────────────────────────────── */

ok('the room reads the kept project when it opens',
  /loadFilm\(\)/.test(room),
  'the whole request');

ok('  and never over a clip she has already brought in',
  /setEdit\(\(now\) => \(now\.pieces\.length \? now : had\)\)/.test(room),
  'the read is a round trip to disk and she can be faster than it; a restore'
  + ' that lands on top of a new clip is the same loss wearing the other mask');

ok('  and holds the explanation page until the read answers',
  /const \[opening, setOpening\] = useState\(true\)/.test(room)
  && /opening && edit\.pieces\.length === 0/.test(room),
  'the room asking what it is for, flashing over a film that is about to'
  + ' appear, looks exactly like the fault being fixed');

ok('  and nothing is written before the first read is done',
  /if \(opening\) return undefined;/.test(room)
  && before(room, 'void loadFilm()', 'const soon = setTimeout'),
  'a save that beats the load writes an empty film over the real one — the'
  + ' fault would then be permanent rather than a lost session');

ok('saving waits until she stops',
  /setTimeout\(\(\) => \{\s*void keepFilm\(edit\)/.test(room),
  'a slider drag is a few hundred changes, and a transaction each is a room'
  + ' that stutters');

if (bad) {
  console.error(`\ncheck:filmkeep — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmkeep — the project is kept where a video fits, the material is'
  + ' written once and dropped when nothing points at it, a save that cannot'
  + ' happen is said out loud, and the read cannot land on top of her work.',
);
