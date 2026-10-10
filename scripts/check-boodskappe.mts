/**
 * Why somebody walked into a room, and whether the copilot was told.
 *
 * ── What she saw ─────────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Copilot se suggestions vir generations moet meer
 * wees. Tans is daar net een suggestion waarmee hy voorstel om te help."*
 *
 * She was looking at `lib/errands.ts`, which had exactly one errand in it —
 * and the shape of that fault is the thing this check exists to stop coming
 * back. The app has carried people between rooms for weeks: a hook to the
 * video desk, an advert to the video desk, an advert to the voice room,
 * somebody else's song into Make a song. Every one of those carried the
 * VALUES across and nothing else. The canvas arrived filled in; the copilot
 * arrived knowing nothing, and opened with the room's generic line about
 * what a video desk is for to somebody holding a specific job.
 *
 * ── The three ways an errand does nothing, all of them silent ────────────
 *
 * **Written and never raised.** An errand nobody passes to `goToRoom` is a
 * paragraph in a file. Nothing throws; the copilot simply goes on saying the
 * generic thing. That is precisely how five hand-offs went unserved.
 *
 * **Raised and pointed at the wrong room.** `errandBelongs` compares the
 * errand's surface to the room and IGNORES it where they disagree — which is
 * the right behaviour and means a typo in a room name produces no error at
 * all, just the old generic line back again.
 *
 * **A brief that says nothing the room does not already say.** An errand
 * whose lines repeat `purpose` has cost a file edit and changed nothing a
 * person would notice.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import {
  ERRANDS, ERRAND_IDS, briefFor, errandBelongs, errandHelps, errandSeeds, isErrandId,
} from '../app/lib/errands.ts';
import { SURFACES, type SurfaceId } from '../app/lib/surfaces.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. There is a real variety of them ────────────────────────────────── */

ok(`the copilot knows more than one reason to be somewhere (${ERRAND_IDS.length})`,
  ERRAND_IDS.length >= 4,
  'one errand against six hand-offs is five rooms a person walks into with a'
  + ' specific job while the copilot offers the generic line');

ok('  and every one of them is pointed at a room that exists',
  ERRAND_IDS.every((id) => Boolean(SURFACES[ERRANDS[id].surface as SurfaceId])),
  ERRAND_IDS.map((id) => `${id} → ${ERRANDS[id].surface}`).join(', ')
  + ' — `errandBelongs` ignores an errand whose room does not match, so a'
  + ' wrong room name produces no error at all, just the generic line back');

/* ── 2. Every one of them is actually raised ───────────────────────────── */

function sources(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, found);
    else if (/\.tsx?$/.test(name) && !path.includes('lib/errands.ts')) found.push(path);
  }
  return found;
}

const code = sources('app').map((path) => withoutComments(readFileSync(path, 'utf8'))).join('\n');

for (const id of ERRAND_IDS) {
  ok(`  ${id} is actually raised somewhere`,
    new RegExp(`id: '${id}'`).test(code),
    'an errand nobody passes to `goToRoom` is a paragraph in a file. Nothing'
    + ' throws and nothing looks broken — the copilot just goes on saying the'
    + ' generic thing, which is how five hand-offs went unserved for weeks');
}

/* ── 3. Each one says something the room does not already say ──────────── */

for (const id of ERRAND_IDS) {
  const kind = ERRANDS[id];
  const brief = briefFor({ id, subject: 'A Thing' });

  ok(`  ${id} briefs the model on more than the room already does`,
    brief.length >= 3,
    'two lines is a label. The point is the half the room cannot know: what'
    + ' they are holding, and what about it changes the advice');

  ok(`    and says what the subject is`,
    brief.some((line) => line.includes('A Thing')),
    `${id} takes a subject and never uses it, so the copilot is told somebody`
    + ' arrived and not what with');

  ok(`    and offers a real choice of starters (${errandSeeds({ id }, 'en').length})`,
    errandSeeds({ id }, 'en').length >= 4,
    'three buttons under a sentence is a menu with one real option on it,'
    + ' which is what she was looking at when she said this');

  ok(`    in both languages, and not the same words twice`,
    errandSeeds({ id }, 'af').length === errandSeeds({ id }, 'en').length
    && errandSeeds({ id }, 'af').every((one, at) => one !== errandSeeds({ id }, 'en')[at]),
    'an Afrikaans seed that is the English one is a button that tells her the'
    + ' app was built in a hurry');

  ok(`    and its help line is its own, not the room's`,
    errandHelps({ id }, 'en') !== SURFACES[kind.surface as SurfaceId].helps.en,
    'an errand whose opening line repeats the room’s has cost a file edit'
    + ' and changed nothing a person would notice');
}

/* ── 4. The guard that makes a wrong room harmless ─────────────────────── */

ok('an errand is ignored in a room it does not belong to',
  !errandBelongs({ id: 'podcast_video' }, 'make')
  && errandBelongs({ id: 'podcast_video' }, 'canvas'),
  'a brief about a podcast episode, read in the song room, is worse than no'
  + ' brief at all');

ok('  and nonsense is ignored rather than thrown on',
  !errandBelongs(null, 'canvas')
  && !errandBelongs({ id: 'nope' as never }, 'canvas')
  && !isErrandId('nope') && !isErrandId(undefined),
  '`errandBelongs` is read during render, so a throw here does not fail an'
  + ' errand — it takes the screen down');

/* ── 5. And the panel shows all of them ────────────────────────────────── */

const panel = withoutComments(readFileSync('app/components/Copilot.tsx', 'utf8'));

ok('the panel offers every starter rather than the first few',
  /errandSeeds\(context\.errand/.test(panel) && !/errandSeeds\([^)]*\)\s*\.slice/.test(panel),
  'a list written to give a choice and then sliced to three is the same'
  + ' complaint one layer down');

console.log(bad === 0
  ? `\n  ${ERRAND_IDS.length} reasons to walk into a room, every one raised,`
    + ' pointed at a real room, and saying something the room cannot.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
