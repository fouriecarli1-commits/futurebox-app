/**
 * A history that keeps the wrong thing, and a room that records into nothing.
 *
 * ── Two faults, and neither shows on a screen ────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` has had "History per room" third in the order
 * of work, under a gap marked **closed** and described as "in the foot of
 * every room that produces something". Measured on 5 October 2026: four rooms
 * record into it and four show it. The cutting room — which makes a whole
 * film — did neither, so a film exported and not immediately downloaded was
 * gone. The claim was not true when it was written.
 *
 * The other fault is the cap. Twenty-four per room was written for clips and
 * readings, where a count is a fine proxy for size. The cutting room's output
 * is a stitched film, and twenty-four of those is nearly two gigabytes — so
 * the thing meant to stop her losing work would instead fill her phone, and
 * fail the NEXT write, silently, while she was saving something else.
 *
 * Eviction is the half that loses work and it is invisible until after it
 * has: a history that drops the wrong thing looks exactly like one that
 * works, right up to the moment she goes looking for the film she starred. So
 * `roomFor` is pure and this file EXECUTES it, the way `check:brought` does.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  KEEP_BYTES_PER_SURFACE, KEEP_PER_SURFACE, MOST_ONE_MAKE, roomFor, usedBytes, type Make,
} from '../app/lib/makes';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const MB = 1024 * 1024;
const film = (id: string, mb: number, at: string, starred = false): Make => ({
  id,
  surface: 'videoedit',
  kind: 'video',
  title: id,
  createdAt: `2026-10-05T0${at}:00:00Z`,
  bytes: mb * MB,
  ...(starred ? { favourite: true } : {}),
});

/* ── The cap that actually binds ───────────────────────────────────────── */

ok('the budget is bytes and not only a count',
  KEEP_BYTES_PER_SURFACE > 0 && MOST_ONE_MAKE === KEEP_BYTES_PER_SURFACE / 2,
  'twenty-four readings is a few megabytes and twenty-four stitched films is'
  + ' most of a phone — and the way a count fails here is the next write, not'
  + ' this one');

const nearFull = [film('a', 100, '1'), film('b', 100, '2')];
const third = film('c', 100, '3');
ok('a room at the byte budget gives up its oldest to take one more',
  roomFor(nearFull, third).drop.map((one) => one.id).join() === 'a'
  && roomFor(nearFull, third).fits,
  `dropped ${JSON.stringify(roomFor(nearFull, third).drop.map((one) => one.id))}`
  + ` — 200 of ${Math.round(KEEP_BYTES_PER_SURFACE / MB)} MB used and 100 coming,`
  + ' so exactly one has to go and it is the older one');

ok('  and only as many as it has to',
  roomFor([film('a', 20, '1'), film('b', 20, '2')], film('c', 20, '3')).drop.length === 0,
  'three small films fit inside the budget, and a history that throws'
  + ' something away when it did not need to is a history that loses work for'
  + ' no reason at all');

ok('  and a starred one is never the one that goes',
  roomFor([film('a', 100, '1', true), film('b', 100, '2')], film('c', 100, '3'))
    .drop.map((one) => one.id).join() === 'b',
  'the star in this app does not mean "I liked this", it means "keep this'
  + ' when the rest goes" — which is the only thing that makes a cap safe to'
  + ' have');

ok('  and when the starred ones alone fill the room, the arriving file is refused',
  roomFor([film('a', 120, '1', true), film('b', 120, '2', true)], film('c', 100, '3'))
    .fits === false,
  'because the alternative is taking something she asked to keep, and a star'
  + ' that is overruled under pressure is a star that promises nothing');

ok('  and a file bigger than half the room is not kept at all',
  roomFor([], film('a', Math.round(MOST_ONE_MAKE / MB) + 1, '1')).fits === false
  && roomFor([], film('a', Math.round(MOST_ONE_MAKE / MB) - 1, '1')).fits === true,
  'without this one enormous film evicts everything and then sits there as'
  + ' the only thing in the room');

ok('  and the count is still a ceiling of its own',
  (() => {
    const many = Array.from({ length: KEEP_PER_SURFACE }, (_, n) => ({
      ...film(`m${n}`, 1, '1'),
      createdAt: `2026-10-05T01:00:${String(n).padStart(2, '0')}Z`,
    }));
    const out = roomFor(many, film('new', 1, '9'));
    return out.fits && out.drop.length === 1 && out.drop[0].id === 'm0';
  })(),
  `${KEEP_PER_SURFACE} one-megabyte films are nowhere near the byte budget, so`
  + ' only the count can catch them — a cap that answers one question and not'
  + ' the other lets a room grow without limit in small pieces');

ok('  and the sums are read off the bytes written rather than guessed',
  usedBytes([film('a', 7, '1'), film('b', 3, '2')]) === 10 * MB
  && /bytes: blob\.size/.test(withoutComments(readFileSync('app/lib/makes.ts', 'utf8'))),
  'a size taken on trust from a caller is a budget counted in numbers nobody'
  + ' checked');

/* ── Nothing records into a history that is never shown ────────────────── */

const files = readdirSync('app/components').filter((one) => one.endsWith('.tsx'));
const written = new Set<string>();
const shown = new Set<string>();
for (const name of files) {
  const text = withoutComments(readFileSync(`app/components/${name}`, 'utf8'));
  for (const hit of text.matchAll(/surface: '([a-z_]+)'/g)) {
    if (/rememberMake\(/.test(text)) written.add(hit[1]);
  }
  for (const hit of text.matchAll(/<History[\s\S]{0,200}?surface="([a-z_]+)"/g)) {
    shown.add(hit[1]);
  }
}

const unseen = [...written].filter((one) => !shown.has(one));
ok(`every room that records into the history also shows it (${written.size} rooms)`,
  unseen.length === 0,
  unseen.length
    ? `${unseen.join(', ')} records and shows nothing — a history nothing`
      + ' displays is work she cannot get back to, which is the whole point of'
      + ' having one'
    : '');

ok('the cutting room records the film it made',
  written.has('videoedit') && shown.has('videoedit'),
  'it makes a whole film, and before today a film exported and not'
  + ' immediately downloaded was gone — the inventory called this closed while'
  + ' the largest room in the app had neither half of it');

ok('  and says so when the film is too big to keep',
  /data-editorbigfilm/.test(withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'))),
  'a film over half the room\'s budget is not kept, and a history that'
  + ' silently did not keep something is the fault this was built to stop,'
  + ' wearing the other mask');

/* ── The sentence on the screen says the cap the code keeps ───────────── */

const dict = readFileSync('app/lib/i18n.tsx', 'utf8');
const shelf = withoutComments(readFileSync('app/components/History.tsx', 'utf8'));

ok('the history tells her the cap it actually keeps',
  /\{mb\} MB or \{n\} per room/.test(dict)
  && /KEEP_BYTES_PER_SURFACE \/ \(1024 \* 1024\)/.test(shelf)
  && /String\(KEEP_PER_SURFACE\)/.test(shelf),
  'it said "the newest two dozen per room", which stopped being true the day'
  + ' the budget became bytes. A sentence promising a cap the code does not'
  + ' keep is worse than no sentence, because she plans around it — so the'
  + ' numbers are read off the file that sets them and cannot drift again');

if (bad) {
  console.error(`\ncheck:history — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:history — the cap is ${Math.round(KEEP_BYTES_PER_SURFACE / MB)} MB and`
  + ` ${KEEP_PER_SURFACE} items per room, a star is never overruled, every room`
  + ' that records also shows, and the cutting room keeps the film it made.',
);
