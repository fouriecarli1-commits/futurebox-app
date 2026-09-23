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
 *
 * ── And the doors that are not in `page.tsx` ─────────────────────────────
 *
 * Carli, 22 September 2026: *"adverts sit nogsteeds nie die prompt in die
 * nuwe kamers nie."* The fourth report of this family, and the door she was
 * pressing — "Open the room and start it", on a recommendation card — was
 * not in the inventory below, because it lives in `AdFormats.tsx` and calls
 * a prop rather than `goToRoom`. It filled the room's boxes and left the
 * copilot beside them empty, for every format, for days.
 *
 * Which is this file's own fault one level up. It was written to end a
 * family of faults and then scoped to one file, so the family carried on in
 * the files it does not read. A rule that is about the app and reads one
 * file is a rule about that file.
 *
 * So the second half of this scans the components. A door there is a call to
 * a prop whose name begins `onGoTo` — which is what a component has instead
 * of `goToRoom` — and it is held to exactly the same two questions.
 */

import { readFileSync, readdirSync } from 'node:fs';

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
  /* Carli, 22 September 2026: *"Kyk asb in make a song en channel dat daar
     by cover art 'n opsie is vir real art."* Somebody who presses this is
     standing on one particular song, and the gallery is a wall of tiles
     that has no way of knowing which. The id alone is not enough either:
     the copilot there has to be told a person is shopping for a cover, or
     it opens as a general explainer about splits and windows. */
  'albumart|onGoToArt': 'a song whose cover is being decided',
};
for (const [key, what] of Object.entries(mustBrief)) {
  const door = doors.find((one) => one.key === key);
  ok(`${key} — ${what} — arrives at a room that knows why`,
    Boolean(door?.carries && door?.briefs),
    !door ? 'the door is gone, so this rule is measuring nothing'
    : !door.carries ? 'it moves her and stops'
    : 'it carries the thing but not the reason — which is how an empty shot box passed for a hand-off');
}

/* ── The same two questions, in the components ───────────────────────── */

/** Prose stripped, as above: a note is not a door. */
const strip = (text: string): string => text
  .replace(/\/\*[\s\S]*?\*\//g, (had) => had.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before + ' '.repeat(had.length - before.length));

function blockAround(text: string, at: number): string {
  let depth = 0;
  let open = -1;
  for (let i = at; i >= 0; i -= 1) {
    if (text[i] === '}') depth += 1;
    else if (text[i] === '{') {
      if (depth === 0) { open = i; break; }
      depth -= 1;
    }
  }
  if (open === -1) return '';
  depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return text.slice(open);
}

interface RoomDoor extends Door { readonly file: string; }
const inRooms: RoomDoor[] = [];
for (const name of readdirSync('app/components').filter((one) => one.endsWith('.tsx'))) {
  const body = strip(readFileSync(`app/components/${name}`, 'utf8'));
  /* A door handed over as a REFERENCE, never called here.
 
     `onClick={onGoToMake}` is a door and `onGoToMake(` never appears in the
     file, so the call scan below cannot see it — five of them, in the booth,
     the live room, Make a song and the voice studio. Finding them only
     because I went looking is the same hole as this file reading one file:
     an inventory that cannot see a shape of door is an inventory of the
     shapes it can see.
 
     `onGoTo={onGoTo}` is excluded: a prop passed straight down to a child is
     not a door, it is the same door seen twice, and it is counted where the
     child actually presses it. */
  for (const found of body.matchAll(/\bon[A-Z][A-Za-z]*=\{(onGoTo[A-Za-z]*)\}/g)) {
    const attribute = /\bon[A-Z][A-Za-z]*/.exec(found[0])?.[0] ?? '';
    if (attribute === found[1]) continue;
    inRooms.push({
      file: name,
      key: `${name}|${found[1]}`,
      line: body.slice(0, found.index).split('\n').length,
      /* Nothing goes with a bare reference by definition: there is no block
         to put a wire in. Every one of them is navigation, and each says so
         in `PLAIN_IN_ROOMS`. */
      carries: false,
      briefs: false,
    });
  }
  for (const found of body.matchAll(/\bonGoTo[A-Za-z]*\(/g)) {
    const at = found.index;
    /* The prop's own declaration and its destructuring are not doors. */
    const before = body.slice(Math.max(0, at - 30), at);
    if (/[.:]\s*$|function\s+$/.test(before)) continue;
    const call = body.slice(at, at + 400);
    const around = blockAround(body, at);
    inRooms.push({
      file: name,
      key: `${name}|${/^(onGoTo[A-Za-z]*)\(/.exec(call)?.[1] ?? '?'}`,
      line: body.slice(0, at).split('\n').length,
      /* Something travelled: a wire put on the bus through the desk's
         `onSetUp`, one of the builders, or an argument on the door itself
         — `onGoToArt({ id, title })` names the song it is about. */
      carries:
        /onSetUp\(/.test(around)
        || /handoverFor\(|filmThisAd\(|readThisAd\(|videoFromHook\(|videoFromSong\(/.test(around)
        || /^onGoTo[A-Za-z]*\(\s*[{'"`]/.test(call),
      /* And the copilot in that room was told why. The three builders are
         each held to including a brief by their own file — `check:adhandover`
         and `check:hookcarry` — so naming them here is not taking their word
         for it. */
      briefs:
        /'brief'/.test(around)
        || /handoverFor\(|filmThisAd\(|readThisAd\(|videoFromHook\(|videoFromSong\(/.test(around),
    });
  }
}

ok(`the scan found the doors inside the rooms too \u2014 ${inRooms.length}`, inRooms.length > 5,
  `${inRooms.length} found; there are doors in AdFormats, Campaign, MarketPlan, Channel and MakeMusic alone`);

/**
 * The component doors that carry nothing, and why each one is right to.
 *
 * Same contract as `PLAIN` above: the list is not the point. Adding a door
 * to a room makes somebody say, once, in writing, which kind it is.
 */
const PLAIN_IN_ROOMS: Readonly<Record<string, string>> = {
  'Account.tsx|onGoToChannel':
    'a hint on the account screen \u2014 where your finished songs live. Nothing is being set up',
  'Booth.tsx|onGoToMake':
    'an empty booth pointing at Make a song \u2014 there is nothing recorded yet to carry',
  'LiveChannel.tsx|onGoToMake':
    'the live room with nothing in it yet, pointing at where songs are made',
  'MakeMusic.tsx|onGoToSound':
    'a hint beside the style box: a voice is trained in the sound room. It is "go and look"',
  'VoiceScreen.tsx|onGoToBooth':
    'a hint from the voice studio: singing lives next door',
  'VoiceScreen.tsx|onGoToPodcast':
    'a hint from the voice studio: a show lives next door',
};

/**
 * The component doors that must ALSO brief the room they open.
 *
 * Carrying a value is not carrying the reason, which is the whole of her
 * report: the advert card really did fill the shot box, and the copilot
 * beside it had never heard of the advert.
 */
const MUST_BRIEF_IN_ROOMS: Readonly<Record<string, string>> = {
  'AdFormats.tsx|onGoTo': 'a recommendation card \u2014 the door she presses first',
  'Campaign.tsx|onGoTo': 'the two buttons under a written advert, and the copilot\u2019s own pair',
  'MarketPlan.tsx|onGoTo': 'a slot in the week \u2014 "make this one, on Tuesday"',
};

/* The two that carry a song and are briefed on the other side of the prop,
   by the handler in `page.tsx` that the `albumart|onGoToArt` rule above
   already holds. Named here rather than left to the brief test, which reads
   this file and cannot see through a prop. */
const BRIEFED_BY_THE_PAGE: Readonly<Record<string, string>> = {
  'Channel.tsx|onGoToArt': 'real art, from a song in the channel',
  'MakeMusic.tsx|onGoToArt': 'real art, from the song being made',
};

const strays = inRooms.filter((one) =>
  !one.carries
  && !(one.key in PLAIN_IN_ROOMS)
  && !(one.key in MUST_BRIEF_IN_ROOMS)
  && !(one.key in BRIEFED_BY_THE_PAGE));
ok('  and every one of them carries something or says why it does not',
  strays.length === 0,
  strays.map((one) => `${one.file}:${one.line} (${one.key})`).join(', '));

for (const [key, what] of Object.entries(MUST_BRIEF_IN_ROOMS)) {
  const family = inRooms.filter((one) => one.key === key);
  ok(`${key} \u2014 ${what} \u2014 opens a room that knows why`,
    family.length > 0 && family.every((one) => one.carries && one.briefs),
    family.length === 0 ? 'the door is gone, so this rule is measuring nothing'
    : `${family.filter((one) => !one.briefs).length} of ${family.length} move her and leave the copilot empty`);
}

for (const [key, what] of Object.entries(BRIEFED_BY_THE_PAGE)) {
  const family = inRooms.filter((one) => one.key === key);
  ok(`${key} \u2014 ${what} \u2014 names the song it is about`,
    family.length > 0 && family.every((one) => one.carries),
    family.length === 0 ? 'the door is gone, so this rule is measuring nothing'
    : 'it opens the gallery with no way of knowing which song she was standing on');
}

/* No note left behind for a door that no longer exists. Same rule as above,
   and the same reason: a stale note reads as a considered decision. */
const goneFromRooms = [
  ...Object.keys(PLAIN_IN_ROOMS),
  ...Object.keys(MUST_BRIEF_IN_ROOMS),
  ...Object.keys(BRIEFED_BY_THE_PAGE),
].filter((key) => !inRooms.some((one) => one.key === key));
ok('  and no reason is left behind for a room door that is gone',
  goneFromRooms.length === 0, goneFromRooms.join(', '));

console.log(
  `\n  ${doors.filter((one) => one.carries).length} of ${doors.length} doors carry something,`
  + ` and ${doors.filter((one) => one.briefs).length} tell the next room's copilot why.`,
);
console.log(
  `  ${inRooms.filter((one) => one.carries).length} of ${inRooms.length} doors inside the rooms carry something,`
  + ` and ${inRooms.filter((one) => one.briefs).length} brief the room they open.`,
);

if (failures) {
  console.error(`\ncheck:handover — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  'check:handover — every way into another room either carries what the last room knew,'
  + ' or is listed as navigation with the reason written beside it.',
);
