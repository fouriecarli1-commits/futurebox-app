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
import { planActions, isHeavy } from '../app/lib/copilotplan';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw: string) => {
  if (!ok) problems.push(`  ${what}\n      got: ${saw}`);
};
const shape = (list: { kind: string; op?: string }[]) =>
  list.map((one) => (one.op ? `${one.kind}:${one.op}` : one.kind)).join(', ') || '(nothing)';

/* The case the adverts desk needs: a whole brief in one reply. This is the
   one that was impossible before — the schema could carry a single field. */
const brief = [
  { kind: 'surface_op', op: 'set_what', value: 'A recording studio in Pretoria' },
  { kind: 'surface_op', op: 'set_who', value: 'Musicians aged 18 to 30' },
  { kind: 'surface_op', op: 'set_offer', value: 'First hour free' },
  { kind: 'surface_op', op: 'set_tone', value: 'Warm' },
  { kind: 'surface_op', op: 'set_market', value: 'South Africa' },
];
const planned = planActions(brief);
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
]);
check(
  'a generation asked for first must end up last',
  mixed.length === 3 && mixed[2].kind === 'generate' && mixed[0].kind === 'set_title',
  shape(mixed),
);

const moving = planActions([
  { kind: 'go', value: 'video' },
  { kind: 'set_lyrics', value: 'Ek loop alleen' },
]);
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
]);
check(
  'two heavy actions must both be dropped, keeping the free one',
  twoHeavy.length === 1 && twoHeavy[0].kind === 'set_style',
  shape(twoHeavy),
);

const twoGos = planActions([
  { kind: 'go', value: 'booth' },
  { kind: 'go', value: 'canvas' },
]);
check('two moves in one reply must leave nothing', twoGos.length === 0, shape(twoGos));

/* none is a way of saying nothing, not a thing to do. */
const withNone = planActions([
  { kind: 'none', value: '' },
  { kind: 'set_title', value: 'Herfs' },
]);
check(
  'none must be dropped rather than applied',
  withNone.length === 1 && withNone[0].kind === 'set_title',
  shape(withNone),
);

check('an empty reply must plan nothing', planActions([]).length === 0, shape(planActions([])));

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

if (problems.length > 0) {
  console.error(`check:copilotplan — the copilot's action list breaks its rules:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:copilotplan — a reply may carry several actions (a ${brief.length}-field brief survives whole), ` +
    'money and movement go last, and two heavy actions cancel.',
);
