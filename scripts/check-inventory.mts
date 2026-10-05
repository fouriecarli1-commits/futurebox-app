/**
 * Every room the app has is in the document that decides what gets built next.
 *
 * ── Why this one exists ──────────────────────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` is not notes. It is the list the order of work
 * is read off — "The order to do them in" at the bottom of it is where every
 * "gaan aan met take" starts. So a room missing from it is a room nobody
 * audits, nobody misses, and nobody schedules.
 *
 * Three were missing when this check was written: the Video Editor, which is
 * the largest room in the app and was built after the inventory; the Sound
 * trainer, which the inventory itself names as buried inside the Channel; and
 * Album art. The document went on listing thirteen rooms in the confident
 * present tense while the app had fifteen.
 *
 * That is the same fault `audit/rooms.mjs` was written for, one layer up: a
 * list of rooms typed by hand into a file, drifting away from the app, with
 * nothing to say so. `check:probes` holds the probes' list to `SURFACES`.
 * This holds the inventory's.
 *
 * ── What it cannot hold ──────────────────────────────────────────────────
 *
 * Whether a section is TRUE. A heading with a ✅ under it that is not so is
 * invisible here, and the only thing that catches that is opening the room.
 * What this stops is the quieter one: a room with no section at all, which no
 * amount of reading the document reveals, because nothing about a list of
 * thirteen looks short.
 */
import { readFileSync } from 'node:fs';
import { DOORS } from '../audit/rooms.mjs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const doc = readFileSync('docs/FUNCTION_INVENTORY.md', 'utf8');

/* The room-by-room part only. The headings above it are the three gaps and
   the ones below are the order of work, and a room named in either of those
   is a room talked ABOUT rather than a room with a section. */
const from = doc.indexOf('## Room by room');
const to = doc.indexOf('## What the reference has');
const rooms = from >= 0 && to > from ? doc.slice(from, to) : '';

ok('the room-by-room section is where it is expected',
  rooms.length > 0,
  'the headings are read out of it by name, so a renamed section has to fail'
  + ' here rather than silently stop checking anything');

/** The `### …` headings inside it, which is what a room's entry looks like. */
const headings = [...rooms.matchAll(/^### (.+)$/gm)]
  .map((one) => one[1].replace(/\s*—.*$/, '').trim());

const doors = Object.values(DOORS);

/* ── Every door has a section ──────────────────────────────────────────── */

/* Matched either way round, and the first draft was not: it asked only
   whether the heading contained the door's name, so the "Collab" section was
   reported missing because the door is called "Collab Radar" — a heading can
   be shorter than the door as easily as longer. What must not happen is a
   door no heading mentions at all. */
const fits = (head: string, door: string): boolean => {
  const a = head.toLowerCase();
  const b = door.toLowerCase();
  return a.includes(b) || b.includes(a);
};

const missing = doors.filter((door) => !headings.some((head) => fits(head, door)));

ok(`all ${doors.length} rooms the app opens have a section`,
  missing.length === 0,
  missing.length
    ? `no section for: ${missing.join(', ')} — the order of work is read off`
      + ' this document, so a room that is not in it is a room nobody schedules'
    : '');

/* ── And no section is about a room that is gone ────────────────────────── */

/* The other direction, and the reason it is worth having: a section for a
   room that was renamed or taken out reads exactly like a section for a room
   that works, and it is the one kind of staleness that makes the document
   longer rather than shorter. */
const AS_WELL = new Set([
  /* Two rooms the inventory splits that the app opens as one door. "Music
     video" and "Video desk" are both `canvas` — the desk makes a clip and the
     music-video path lays a song under it, and they are different enough to
     audit apart even though one button opens both. */
  'Music video',
  /* And two booths behind one door. `booth` opens the quick one — record over
     the backing, keep a take — and the lanes room is reached from inside it.
     Audited apart because they are different rooms to stand in, and the door
     can only be called one thing. */
  'The Booth',
]);

const stale = headings.filter(
  (head) => !AS_WELL.has(head) && !doors.some((door) => fits(head, door)),
);

ok('and no section is left over from a room the app no longer opens',
  stale.length === 0,
  stale.length
    ? `${stale.join(', ')} — if one of these is deliberate, name it in AS_WELL`
      + ' with the reason, rather than letting every stale heading through'
    : '');

/* ── The order of work only names rooms that exist ─────────────────────── */

ok('the room-by-room list is as long as the app',
  headings.length >= doors.length,
  `${headings.length} sections for ${doors.length} doors — nothing about a`
  + ' list of thirteen looks short, which is why this is counted and not read');

if (bad) {
  console.error(`\ncheck:inventory — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:inventory — all ${doors.length} rooms the app opens have a section in`
  + ' the document the order of work is read off, and no section is left over'
  + ' from a room that is gone.',
);
