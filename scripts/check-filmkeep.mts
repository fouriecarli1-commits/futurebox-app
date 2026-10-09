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
const keepvid = withoutComments(readFileSync('app/components/KeepVideo.tsx', 'utf8'));
const cut = withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'));

/**
 * Every shape has a name on the way out, and no name is invented.
 *
 * A fourth shape added to `SHAPES` and not to `ASPECTS` would hand the
 * uploader `undefined` and the Channel a row it cannot lay out, which is a
 * film that looks wrong rather than a film that is missing — quieter, and
 * still her work not arriving the way she left it.
 */
function shapesAndAspectsAgree(): boolean {
  const keysOf = (what: string): string[] => {
    const at = cut.indexOf(`export const ${what}`);
    if (at < 0) return [];
    const body = cut.slice(cut.indexOf('{', at) + 1, cut.indexOf('};', at));
    return [...body.matchAll(/^\s*(\w+):/gm)].map((one) => one[1]);
  };
  const shapes = keysOf('SHAPES');
  const aspects = keysOf('ASPECTS');
  return shapes.length > 0
    && shapes.length === aspects.length
    && shapes.every((one) => aspects.includes(one));
}

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
  && /export type Kept = 'kept' \| 'held' \| 'full' \| 'off'/.test(keep)
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

/* ── An empty film cannot land on a film ───────────────────────────────── */

/* Carli, 5 October 2026: *"Ek het nou 'n video gemaak op editor... Toe ek
   terug na die editor gaan is dit ook nie meer daar nie."*

   The first version of the keeping had the loss built into it. `loadFilm`
   answered `null` for BOTH "nothing was ever kept" and "the read failed", the
   room could not tell them apart, so a failed read opened an empty clock —
   and nine hundred milliseconds later the save wrote that empty clock over
   the real film AND deleted every clip nothing in it pointed at. One bad read
   and the material was gone off the disk for good.

   So two separate rules, either of which alone would have stopped it. */

ok('an empty film never replaces a kept film that has shots in it',
  /anyway/.test(keep)
  && /standing/.test(keep)
  && /edit\.pieces\.length === 0/.test(keep)
  && /return 'held'/.test(keep),
  'the write and the delete are the same transaction, so an empty film going'
  + ' down takes the material with it — this is the rule that makes a bad'
  + ' save survivable instead of permanent');

ok('  and the standing film is read inside the same transaction',
  before(keep, "const standing = film.get(ONLY)", "film.put(thin, ONLY)")
  && /readwrite/.test(keep),
  'read it in its own transaction first and two saves can interleave between'
  + ' the look and the write, which is the guard being there and not holding');

ok('  and an empty clock she made herself still empties the disk',
  /const everHad = useRef\(false\)/.test(room)
  && /if \(edit\.pieces\.length\) everHad\.current = true;/.test(room)
  && /const meant = edit\.pieces\.length === 0 && everHad\.current;/.test(room)
  && /keepFilm\(edit, meant\)/.test(room),
  'a guard with no exception resurrects the clip she deleted on her next'
  + ' visit. "Has this room had a film in it since it opened" separates the'
  + ' two cases and needs nothing remembered in eleven handlers: a bad read'
  + ' opens the room empty and it never had one');

ok('  and there is only one door that can say it',
  !/keepFilm\([A-Za-z]*, true\)/.test(keep)
  && !/forgetFilm/.test(keep)
  && (keep.match(/anyway/g) ?? []).length > 0
  && (room.match(/keepFilm\(/g) ?? []).length === 1,
  'there used to be a `forgetFilm()` with `anyway` hardcoded, and the browser'
  + ' walk proving New project empties the disk went through it — so the'
  + ' room\'s own rule for a deliberate empty film was exercised by nothing,'
  + ' and breaking it left every check green');

ok('a read that failed is told apart from nothing ever kept',
  /export type Found =/.test(keep)
  && /how: 'broke'/.test(keep)
  && /how: 'none'/.test(keep),
  'one `null` for both is the whole fault: the room cannot tell an empty disk'
  + ' from a disk it could not read, so it treats a film it cannot see as a'
  + ' film that is not there');

ok('  and the room stops keeping anything after a read that failed',
  /if \(opening \|\| broke\) return undefined;/.test(room),
  'the stored film may be perfectly good — writing this session over it on a'
  + ' read that went wrong is how a lost session becomes a lost film');

ok('  and says so, while there is still a film to save',
  /data-editorkeptoff/.test(room),
  'a room that has silently stopped keeping her work tells her at the same'
  + ' moment it told her last time: by opening empty');

/* ── The way back in ───────────────────────────────────────────────────── */

ok('the room reads the kept project when it opens',
  /loadFilm\(\)/.test(room),
  'the whole request');

ok('  and never over a clip she has already brought in',
  /setEdit\(\(now\) => \(now\.pieces\.length \? now : had\)\)/.test(room)
  && /found\.how === 'had' \? found\.edit : null/.test(room),
  'the read is a round trip to disk and she can be faster than it; a restore'
  + ' that lands on top of a new clip is the same loss wearing the other mask');

ok('  and holds the explanation page until the read answers',
  /const \[opening, setOpening\] = useState\(true\)/.test(room)
  && /opening && edit\.pieces\.length === 0/.test(room),
  'the room asking what it is for, flashing over a film that is about to'
  + ' appear, looks exactly like the fault being fixed');

ok('  and nothing is written before the first read is done',
  /if \(opening \|\| broke\) return undefined;/.test(room)
  && before(room, 'void loadFilm()', 'const soon = setTimeout'),
  'a save that beats the load writes an empty film over the real one — the'
  + ' fault would then be permanent rather than a lost session');

ok('saving waits until she stops',
  /setTimeout\(\(\) => \{[^}]*void keepFilm\(edit, meant\)/.test(room),
  'a slider drag is a few hundred changes, and a transaction each is a room'
  + ' that stutters');

/* ── And out the other side ────────────────────────────────────────────── */

/* Carli, 5 October 2026: *"Ek het nou 'n video gemaak op editor. Toe ek
   channel toe gaan is dit nie daar nie."*

   Correct, and for the same reason the music videos were missing in
   September: what comes out of this room is a blob that only ever existed on
   the phone. The Channel lists the `videos` table. Nothing had uploaded it,
   so no row existed, so the room had nothing to show — and the only button
   under the finished film was Save it, which writes to the downloads folder
   and tells the server nothing. */

ok('the finished film can be kept in her channel',
  /<KeepVideo/.test(room) && /import KeepVideo from '\.\/KeepVideo'/.test(room),
  'a film that can only be downloaded is a film that is not in the Channel,'
  + ' which is where she went looking for it');

ok('  and it goes up as made here, not as something a camera took',
  before(room, 'data-editormade', '<KeepVideo')
  && /keepFilmed\(blob, title, seconds, 'made', aspect\)/.test(keepvid),
  'the rights panel reads that word off the row — a film the desk made is not'
  + ' a filmed take, and the two carry different obligations');

ok('  and under a name she set, in all three places the film has one',
  /readonly title\?: string;/.test(cut)
  && /data-editorfilmtitle/.test(room)
  && /const filmName = \(edit\.title \?\? ''\)\.trim\(\)/.test(room)
  && /title=\{filmName\}/.test(room)
  && /safeFilename\(filmName, made\.ext\)/.test(room)
  && (room.match(/edit\.pieces\[0\]\?\.name/g) ?? []).length === 2,
  'the file she saves and the row in her channel are the same film and have'
  + ' to carry the same name. Before this each press reached for the first'
  + " clip's own filename, so her channel would fill with VID_20261005_123456"
  + ' — a feature that works and nobody wants to use. The two remaining'
  + ' readings are the fallback and the placeholder, which are the same fact');

/* Three plain facts and not one clever line. The first draft of this rule
   leaned on `before(cut, …)` over a string that lives in the OTHER file, so
   it answered false, so the clause was true whatever either file said. */
ok('  and the name is kept with the project',
  /readonly title\?: string;/.test(cut)
  && /interface Thin extends Omit<Edit, 'pieces' \| 'cover' \| 'under'>/.test(keep)
  && /const thin: Thin = \{\s*\.\.\.edit,/.test(keep),
  'the thin film is the edit with the blobs swapped out and spread whole, so'
  + ' a field added to the edit is kept without filmkeep.ts being touched —'
  + ' which is only true while `Thin` derives from `Edit` instead of listing'
  + ' its fields, and while the spread is still there');

ok('  and at the shape the FILM came out, not the first clip\'s',
  /* Through `aspectOf` since 9 October 2026, for the reason in
     `check:logomark`: an edit can carry its own frame now, and a custom one
     has no key in `ASPECTS` — so the table read would answer `9:16` for a
     wide custom film and the Channel would letterbox it, which is the exact
     fault this line was written against.

     `ASPECTS` is still asserted to exist and still has to agree with
     `SHAPES`, because `aspectOf` reads it for every NAMED shape and only
     falls back to nearest-by-ratio for a custom one. */
  /aspect=\{aspectOf\(edit\)\}/.test(room)
  && /export const ASPECTS/.test(cut)
  && /export function aspectOf/.test(cut)
  && shapesAndAspectsAgree(),
  'a tall film cut from wide clips is a tall film; reading the clip would put'
  + ' a 16:9 row on a 9:16 video and the Channel would letterbox it');

if (bad) {
  console.error(`\ncheck:filmkeep — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmkeep — the project is kept where a video fits, the material is'
  + ' written once and dropped when nothing points at it, a save that cannot'
  + ' happen is said out loud, and the read cannot land on top of her work.',
);
