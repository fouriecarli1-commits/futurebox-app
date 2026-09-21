/**
 * Every way into another room, and what it carries.
 *
 * ── Why an inventory and not a rule ──────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Al die kamers se AI praat nie met mekaar
 * nie."*
 *
 * She had reported it three times by then, about three different doors, and
 * each time it was answered by fixing that door. That is the tell: the fault
 * is not in any one hand-off, it is that nothing anywhere holds a door to
 * carrying what it knows. The adverts desk, the hooks room and the card that
 * appears when a song finishes were each written by somebody who meant well,
 * and each one moved her somewhere and stopped.
 *
 * A general rule cannot decide this. Most doors in the studio SHOULD carry
 * nothing — the rail, the tab bar and the "you could also go here" hints are
 * navigation, and a hint that filled the next room in would be the app
 * deciding something nobody asked it to.
 *
 * So this is the `check:everycheck` shape: every door in `page.tsx` is
 * listed, each plain one has a reason written beside it, and a door that is
 * neither carrying nor listed fails. The point is not that the list is
 * right — it is that adding a door makes somebody say which kind it is,
 * once, in writing.
 *
 * ── What counts as carrying ──────────────────────────────────────────────
 *
 * A wire on the copilot bus, an errand as `goToRoom`'s second argument, or
 * state the destination reads (`setVideoSong`, `setEditSong`, `setHandoff`).
 * All three are ways of arriving somewhere that knows why you came.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* Prose stripped first: a `goToRoom` written in a note is not a door, and
   the brace-walking below would read the note's own braces as code. */
const source = readFileSync('app/page.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, (had) => had.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before + ' '.repeat(had.length - before.length));

/** The `{` of the block this index sits inside. */
function openerOf(at: number): number {
  let depth = 0;
  for (let i = at; i >= 0; i -= 1) {
    if (source[i] === '}') depth += 1;
    else if (source[i] === '{') {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}
function closerOf(open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

interface Door {
  readonly key: string;
  readonly line: number;
  readonly carries: boolean;
  /** Whether the copilot in the next room is told anything at all. */
  readonly briefs: boolean;
}

const doors: Door[] = [];
for (const found of source.matchAll(/goToRoom\(/g)) {
  const at = found.index;
  // The definition itself is not a door.
  if (/const\s+$/.test(source.slice(Math.max(0, at - 40), at))) continue;
  const open = openerOf(at);
  if (open === -1) continue;
  const body = source.slice(open, closerOf(open) + 1);
  const head = source.slice(Math.max(0, open - 200), open);
  const named = [...head.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{?|([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].pop();
  const room = /goToRoom\(\s*'([a-z_]+)'/.exec(source.slice(at, at + 60))?.[1] ?? '*';
  doors.push({
    key: `${room}|${named?.[1] ?? named?.[2] ?? '?'}`,
    line: source.slice(0, at).split('\n').length,
    carries:
      /copilotBus\.handoff\(/.test(body)
      || /goToRoom\([^)]*,\s*\{/.test(body)
      || /setVideoSong\(|setEditSong\(|setHandoff\(/.test(body),
    /* Said outright, or carried by a builder whose own check guarantees it.
       A handler that loops over `videoFromHook(...)` has no literal 'brief'
       anywhere in it and briefs the next room perfectly well — reading only
       for the literal failed two correct doors, which is how this rule
       found out it was measuring spelling rather than behaviour. The
       builders named here are held to including a brief by their own
       files: `check:hookcarry` and `check:adhandover`. */
    briefs:
      /'brief'/.test(body)
      || /goToRoom\([^)]*,\s*\{\s*id:/.test(body)
      || /videoFromHook\(|videoFromSong\(|filmThisAd\(|readThisAd\(/.test(body),
  });
}

ok('the scan found the doors at all', doors.length > 15, `${doors.length} found`);

/**
 * The doors that carry nothing, and why each one is right to.
 *
 * Every entry is somebody choosing where to go, not the app deciding
 * something for them — so there is nothing to carry, and filling the next
 * room in would be the app answering a question nobody asked.
 */
const PLAIN: Readonly<Record<string, string>> = {
  'make|kind': 'the copilot’s own generate: it is the ACT, and its fields travelled in the same reply',
  '*|kind': 'the copilot’s own go: its surface_ops carry separately, aimed by planActions',
  'live|tab': 'the tab bar. Somebody pressing Live is choosing a room, not asking for anything in it',
  'channels|tab': 'the tab bar, same',
  '*|onGo': 'the rail and the studio grid: a list of rooms is navigation. The search result under the same name DOES carry, which is why this note is judged on the family',
  '*|onClick': 'the room grid and the “next” button at the foot of the rail',
  'channels|onGoToChannel': 'a hint — where your finished songs live. Nothing is being set up',
  'booth|onGoToBooth': 'a hint from the voice studio: singing lives next door',
  'podcast|onGoToPodcast': 'a hint from the voice studio: a show lives next door',
  'sound|onGoToSound': 'a hint: where a voice is trained',
  'make|onGoToMake': 'a hint from an empty room — make something first. There is nothing yet to carry',
  'live|onClick': 'the front page pointing at the room where members’ real work is, now that the invented card is gone. It is "go and look", not "here is the thing you asked for"',
};

const unexplained = doors.filter((one) => !one.carries && !(one.key in PLAIN));
ok('every door either carries something or says why it does not',
  unexplained.length === 0,
  unexplained.map((one) => `line ${one.line} (${one.key})`).join(', '));

/* And the other direction, which is what stops the list rotting: a reason
   left behind for a door that no longer exists reads as a considered
   decision and is a stale note. The same rule `check:everycheck` holds. */
const stale = Object.keys(PLAIN).filter((key) => !doors.some((one) => one.key === key));
ok('  and no reason is left behind for a door that is gone', stale.length === 0, stale.join(', '));

/* A door listed as plain that has quietly started carrying is fine — it has
   been improved — but the note beside it is now wrong, and the next person
   reads it as the decision.

   Judged on the whole family, not on one door. A key like `*|onGo` covers
   the rail, the studio grid AND the search result that opens a room on a
   named song, because all three are handlers called `onGo` heading for a
   room chosen at runtime. The note is about the family, so it is only out
   of date when every door in the family has moved on — the first version
   of this rule failed a correct file for the one that had. */
const families = [...new Set(doors.map((one) => one.key))];
const outgrown = families.filter(
  (key) => key in PLAIN && doors.filter((one) => one.key === key).every((one) => one.carries),
);
ok('  and no note says a door carries nothing when every one of them does',
  outgrown.length === 0, outgrown.join(', '));

/* ── The ones she reported, named ────────────────────────────────────── */

/* ── The ones she reported, named ────────────────────────────────────

   Carrying a VALUE is not the same as carrying the reason, and the
   difference is the whole of her report. The card that appears when a song
   finishes always set `videoSong` — the song really was under the desk —
   and that is why "it carries something" was true while she was looking at
   an empty shot box and a copilot that had never heard of her song.

   So these doors must also brief the room they open: a wire the copilot
   itself takes, or an errand, which is the same thing said in the
   registry's own vocabulary. */
const mustBrief: Readonly<Record<string, string>> = {
  'canvas|onMakeVideo': 'a moment picked in the hooks room',
  'canvas|onClick': 'the card that appears the moment a song is finished',
  'canvas|onToVideo': 'an episode being turned into a video',
  'booth|onBooth': 'a song being taken out of the studio to be sung',
  'booth|onOpenInBooth': 'a song somebody sent through the collab room',
  'make|onBuildOn': 'building on somebody else’s song',
};
for (const [key, what] of Object.entries(mustBrief)) {
  const door = doors.find((one) => one.key === key);
  ok(`${key} — ${what} — arrives at a room that knows why`,
    Boolean(door?.carries && door?.briefs),
    !door ? 'the door is gone, so this rule is measuring nothing'
    : !door.carries ? 'it moves her and stops'
    : 'it carries the thing but not the reason — which is how an empty shot box passed for a hand-off');
}

console.log(
  `\n  ${doors.filter((one) => one.carries).length} of ${doors.length} doors carry something,`
  + ` and ${doors.filter((one) => one.briefs).length} tell the next room's copilot why.`,
);

if (failures) {
  console.error(`\ncheck:handover — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  'check:handover — every way into another room either carries what the last room knew,'
  + ' or is listed as navigation with the reason written beside it.',
);
