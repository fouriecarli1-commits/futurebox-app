/**
 * The copilot may act on more than one field in a reply — prove it.
 *
 * This exists because of a fault that passed every check we had. The reply
 * schema carried one action, described as "One action, or none. Never more
 * than one." Every other part of the chain was correct: Campaign.tsx
 * registered five operations, surfaces.ts described all five, `check:ops`
 * confirmed they agreed, and the copilot still could not fill in a brief. The
 * wiring was whole and the schema was one field wide.
 *
 * So this check does not read the schema's wording, and it does not assert
 * that the copilot is "able to fill a brief" — a claim, not a constraint. It
 * runs the real ordering function over real lists and looks at what comes out.
 * If somebody narrows the reply to one action again, the five-field case below
 * comes back with one and this fails.
 *
 *   npm run check:copilotplan
 */
import { readFileSync } from 'node:fs';
import { planActions, isHeavy } from '../app/lib/copilotplan';
import { describeOtherRoomOps } from '../app/lib/surfaces';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw: string) => {
  if (!ok) problems.push(`  ${what}\n      got: ${saw}`);
};
const shape = (list: { kind: string; op?: string; room?: string }[]) =>
  list
    .map((one) => `${one.op ? `${one.kind}:${one.op}` : one.kind}${one.room ? `@${one.room}` : ''}`)
    .join(', ') || '(nothing)';

/* The case the adverts desk needs: a whole brief in one reply. This is the
   one that was impossible before — the schema could carry a single field. */
const brief = [
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio in Pretoria' },
  { kind: 'surface_op', op: 'set_who', value: 'Musicians aged 18 to 30' },
  { kind: 'surface_op', op: 'set_offer', value: 'First hour free' },
  { kind: 'surface_op', op: 'set_tone', value: 'Warm' },
  { kind: 'surface_op', op: 'set_market', value: 'South Africa' },
];
const planned = planActions(brief, 'campaign');
check(
  'a five-field brief must survive as five actions',
  planned.length === 5 && planned.every((one, i) => one.op === brief[i].op),
  shape(planned),
);

/* Money and movement go last, whatever order they were asked in. */
const mixed = planActions([
  { kind: 'generate', value: '' },
  { kind: 'set_title', value: 'Vuurvliegies' },
  { kind: 'set_style', value: 'Amapiano' },
], 'make');
check(
  'a generation asked for first must end up last',
  mixed.length === 3 && mixed[2].kind === 'generate' && mixed[0].kind === 'set_title',
  shape(mixed),
);

const moving = planActions([
  { kind: 'go', value: 'video' },
  { kind: 'set_lyrics', value: 'Ek loop alleen' },
], 'make');
check(
  'a move must come after the work done in the room being left',
  moving.length === 2 && moving[1].kind === 'go',
  shape(moving),
);

/* Two heavy actions: neither runs, and the free work still stands. */
const twoHeavy = planActions([
  { kind: 'set_style', value: 'Amapiano' },
  { kind: 'generate', value: '' },
  { kind: 'go', value: 'studio' },
], 'make');
check(
  'two heavy actions must both be dropped, keeping the free one',
  twoHeavy.length === 1 && twoHeavy[0].kind === 'set_style',
  shape(twoHeavy),
);

const twoGos = planActions([
  { kind: 'go', value: 'booth' },
  { kind: 'go', value: 'canvas' },
], 'make');
check('two moves in one reply must leave nothing', twoGos.length === 0, shape(twoGos));

/* none is a way of saying nothing, not a thing to do. */
const withNone = planActions([
  { kind: 'none', value: '' },
  { kind: 'set_title', value: 'Herfs' },
], 'make');
check(
  'none must be dropped rather than applied',
  withNone.length === 1 && withNone[0].kind === 'set_title',
  shape(withNone),
);

check('an empty reply must plan nothing', planActions([], 'make').length === 0, shape(planActions([], 'make')));

/* ── Setting up the room you are being sent to ──────────────────────────
 
   The case this exists for: somebody on the song screen describes what
   they sell and asks for help marketing it. The reply should fill the
   adverts brief AND take them there, in that order, so the boxes are
   full when they arrive. */
const sentAndSetUp = planActions([
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio', room: 'campaign' },
  { kind: 'surface_op', op: 'set_who', value: 'Musicians', room: 'campaign' },
  { kind: 'go', value: 'campaign' },
], 'make');
check(
  'a reply may fill in the room it is sending them to, before the move',
  sentAndSetUp.length === 3
    && sentAndSetUp[0].room === 'campaign'
    && sentAndSetUp[1].room === 'campaign'
    && sentAndSetUp[2].kind === 'go',
  shape(sentAndSetUp),
);

/* And the rule that makes that safe. An operation aimed at a room this
   reply is NOT opening would sit in the hand-off queue and fire days
   later, when the person happened to open that room for their own
   reasons — changing something under them with no reply on screen to
   explain it. */
const aimedNowhere = planActions([
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio', room: 'campaign' },
  { kind: 'set_title', value: 'Herfs' },
], 'make');
check(
  'an operation aimed at a room nobody is going to must be dropped',
  aimedNowhere.length === 1 && aimedNowhere[0].kind === 'set_title',
  shape(aimedNowhere),
);

const aimedElsewhere = planActions([
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio', room: 'campaign' },
  { kind: 'go', value: 'booth' },
], 'make');
check(
  'an operation for one room while the reply opens another must be dropped',
  aimedElsewhere.length === 1 && aimedElsewhere[0].kind === 'go',
  shape(aimedElsewhere),
);

/* Two moves cancel, so nobody arrives anywhere — and an operation that
   was riding on one of them must not be delivered into the room they are
   still standing in. */
const aimedAtACancelledMove = planActions([
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio', room: 'campaign' },
  { kind: 'go', value: 'campaign' },
  { kind: 'go', value: 'booth' },
], 'make');
check(
  'an operation riding on a move that got cancelled must be dropped too',
  aimedAtACancelledMove.length === 0,
  shape(aimedAtACancelledMove),
);

/* The ordinary case: no room named means the room they are standing in,
   stamped so the studio never has to guess. */
const here = planActions([{ kind: 'surface_op', op: 'set_market', value: 'Afrikaans' }], 'campaign');
check(
  'an operation with no room named is for the room they are standing in',
  here.length === 1 && here[0].room === 'campaign',
  shape(here),
);

/* A room name the model made up is not a room. Dropped rather than
   delivered to the current one: "somewhere else" and "here" are
   different intentions and guessing between them is how an advert brief
   gets a podcast title in it. */
const madeUp = planActions([
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio', room: 'marketing-desk' },
  { kind: 'go', value: 'campaign' },
], 'make');
check(
  'an operation naming a room that does not exist must be dropped',
  madeUp.length === 1 && madeUp[0].kind === 'go',
  shape(madeUp),
);

/* The two kinds that cost money or move somebody are the two that are held
   back. If a third is ever added to the action list without being named here,
   it will slip through the ordering rule silently. */
const HELD = ['generate', 'go'];
const FREE = ['none', 'surface_op', 'set_title', 'set_style', 'set_lyrics'];
check(
  'every kind the route offers must be classified as heavy or free',
  HELD.every((kind) => isHeavy(kind)) && FREE.every((kind) => !isHeavy(kind)),
  `heavy: ${HELD.filter(isHeavy).join(', ')}`,
);

/* The route's own action list, read from the source, must contain no kind
   this check has not been told about — so adding one forces a decision here
   rather than defaulting it to free. */
const { readFileSync } = await import('node:fs');
const route = readFileSync('app/api/copilot/route.ts', 'utf8');
const enumMatch = route.match(/z\s*\.enum\(\[([^\]]+)\]\)/);
if (!enumMatch) {
  console.error('check:copilotplan — could not find the action kinds in the copilot route.');
  process.exit(1);
}
const kinds = [...enumMatch[1].matchAll(/'([a-z_]+)'/g)].map((one) => one[1]);
const unknown = kinds.filter((kind) => !HELD.includes(kind) && !FREE.includes(kind));
check(
  `the route offers ${kinds.length} kinds and this check knows ${HELD.length + FREE.length}`,
  unknown.length === 0,
  unknown.length ? `unclassified: ${unknown.join(', ')}` : 'all known',
);

/* ── The model has to be TOLD the other rooms have operations ──────────
 
   The rules above are exactly right and worth nothing if the model never
   learns that the adverts desk can be set up. That was the whole fault
   both times: every part was built and one description was missing. So
   this asserts the description exists, covers the room it was built for,
   and reaches the prompt. */
const elsewhere = describeOtherRoomOps('make');
check(
  'the other rooms\' operations must be described, or none of the above can ever happen',
  elsewhere.includes('campaign') && elsewhere.includes('set_what'),
  elsewhere.slice(0, 120),
);
check(
  'and the room they are standing in must not be in that list, it is described in full above it',
  !describeOtherRoomOps('campaign').includes('campaign:'),
  'campaign described twice',
);

const routeSource = readFileSync('app/api/copilot/route.ts', 'utf8');
check(
  'and the copilot route must actually send it',
  /describeOtherRoomOps\(here\)/.test(routeSource),
  'the description exists and no prompt carries it',
);
check(
  'and planActions must be told which room they are standing in',
  /planActions\([^)]*body\.surface\)/.test(routeSource),
  'without it every operation looks like it is aimed somewhere else',
);

/* ── And the studio has to deliver it differently ───────────────────────
 
   `dispatch` only reaches a mounted room, so a hand-off sent with it
   lands nowhere: the destination does not exist at the moment of
   sending. That is what `handoff` is for. */
const page = readFileSync('app/page.tsx', 'utf8');
/* Matched on the branch itself, not on the word `handoff` appearing
   anywhere in the file — page.tsx already hands off in four other places
   (the advert desk's shot to the video desk, its line to the voice
   studio, a song to the booth), so a looser pattern passes while this
   exact path is wrong. The first version of this assertion did, and did
   not notice the surface_op branch being put back to dispatch-only. */
const branch = page.slice(page.indexOf("if (action.kind === 'surface_op')"));
check(
  'the studio must route a surface_op on the room it names',
  /action\.room/.test(branch.slice(0, 1600)),
  'the op carries a room and nothing reads it',
);
check(
  'and hand off to a room being opened rather than dispatching into the one being left',
  /copilotBus\.handoff\(where/.test(branch.slice(0, 1600))
    && /copilotBus\.dispatch\(studioTab/.test(branch.slice(0, 1600)),
  'both are needed: dispatch for here, handoff for where they are going',
);

if (problems.length > 0) {
  console.error(`check:copilotplan — the copilot's action list breaks its rules:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:copilotplan — a reply may carry several actions (a ${brief.length}-field brief survives whole), ` +
    'money and movement go last, two heavy actions cancel, and a room is only set up ahead ' +
    'of somebody the reply is actually taking there.',
);
