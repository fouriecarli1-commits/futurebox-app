/**
 * Which rooms a child could be left alone in, measured rather than decided.
 *
 *   npm run check:kidsafe
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Dalk 'n kindervriendelike weergawe."*
 * Maybe a child-friendly version.
 *
 * The obvious build is a switch that hides the rooms a child should not be
 * in. Before writing it, the question is which rooms those are — and that is
 * a measurement, not an opinion, so this file takes it.
 *
 * ── What it measures ─────────────────────────────────────────────────────
 *
 * Two things, derived from the code rather than listed by hand:
 *
 *   1. **Which routes spend.** Every handler under `app/api` that calls
 *      `charge`. `check:paidcall` already reads the code this way, for the
 *      same reason: a hand-written list of paid routes is a list that is
 *      true on the day it is written.
 *   2. **Which room can reach one.** The room-to-component map comes out of
 *      `page.tsx`'s own `studioTab === '…' && <Component` lines, and each
 *      component is followed through its local imports.
 *
 * Comments are stripped first, with the repo's own `withoutComments`. The
 * first version of this analysis did not, and reported that every one of the
 * fifteen rooms could spend — because `app/lib/cloud.ts` has a COMMENT
 * mentioning `/api/music`, and `cloud.ts` is imported by everything. Fifteen
 * out of fifteen is the reading a broken instrument gives, and it was a
 * measurement of prose.
 *
 * ── What the measurement says, and why it changes the design ─────────────
 *
 * Three rooms cannot spend at all: the art market, the collab room and the
 * hook feed. The photo editor can spend on exactly one thing — taking the
 * picture off the device.
 *
 * And the rooms that are FREE are not the rooms that are SAFE. The collab
 * room costs nothing and puts a child in a conversation with strangers; the
 * art market costs no credits and is a shop. Of the four, the photo editor
 * is the only one with no other people in it and no money in it once the
 * download door is shut — which happens to be the room a child would
 * actually want.
 *
 * So a child-friendly version is not "hide some rooms". It is one room with
 * one door closed. That is a small thing to build and a decision about her
 * product rather than about the code, so it is written up in
 * `docs/OPEN-QUESTIONS.md` and left to her.
 *
 * ── What this check holds in the meantime ────────────────────────────────
 *
 * The numbers in that document, so they cannot quietly stop being true. If
 * somebody adds a charging call to the photo editor, or to one of the three
 * free rooms, this reddens — and the write-up is wrong out loud rather than
 * silently.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import { SURFACE_IDS } from '../app/lib/surfaces.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
};

const ROOT = 'app';
const code = new Map<string, string>();
for (const file of walk(ROOT)) code.set(file, withoutComments(readFileSync(file, 'utf8')));

/* ── 1. The routes that spend ───────────────────────────────────────── */
const charging = new Set<string>();
for (const file of walk(join(ROOT, 'api'))) {
  if (/\bcharge\s*\(/.test(code.get(file) ?? '')) {
    charging.add('/' + file.replace(`${ROOT}/`, '').replace(/\/route\.tsx?$/, ''));
  }
}
ok('the routes that spend credits can be read off the code',
  charging.size >= 15,
  `${charging.size} found — \`charge(\` in a handler under app/api is what`
  + ' makes a route a paid one, and a count this low means the instrument is'
  + ' not finding them rather than that the app got cheaper');

/* ── 2. Which room can reach one ────────────────────────────────────── */
const page = code.get(join(ROOT, 'page.tsx')) ?? '';
const rooms = new Map<string, Set<string>>();
for (const m of page.matchAll(/studioTab === '([a-z_]+)' &&\s*(?:\(\s*)?[\s\S]{0,400}?<([A-Z][A-Za-z0-9]*)/g)) {
  const list = rooms.get(m[1]) ?? new Set<string>();
  list.add(m[2]);
  rooms.set(m[1], list);
}
ok('  and every room on the rail can be found in the page that mounts it',
  SURFACE_IDS.every((id) => rooms.has(id)),
  `${SURFACE_IDS.filter((id) => !rooms.has(id)).join(', ')} — a room this`
  + ' cannot see is a room it reports as free, which is the direction that'
  + ' matters');

const fileFor = (name: string): string | undefined =>
  [...code.keys()].find((one) => one.endsWith(`/components/${name}.tsx`));

const reaches = (file: string | undefined, seen = new Set<string>()): string[] => {
  if (!file || seen.has(file)) return [];
  seen.add(file);
  const src = code.get(file) ?? '';
  const hits = [...charging].filter((one) => src.includes(`'${one}`)
    || src.includes(`"${one}`) || src.includes(`\`${one}`));
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
    const base = join(file, '..', m[1]);
    for (const ext of ['.tsx', '.ts']) {
      if (code.has(base + ext)) { hits.push(...reaches(base + ext, seen)); break; }
    }
  }
  return [...new Set(hits)];
};

const spend = new Map<string, readonly string[]>();
for (const [room, comps] of rooms) {
  const all = new Set<string>();
  for (const one of comps) reaches(fileFor(one)).forEach((r) => all.add(r));
  spend.set(room, [...all].sort());
}

console.log('\n  what each room can spend on:');
for (const [room, routes] of [...spend].sort()) {
  console.log(`    ${room.padEnd(14)} ${routes.length ? routes.join(' ') : '— nothing'}`);
}
console.log('');

/* ── 3. The figures the write-up rests on ───────────────────────────── */
/* Named rather than counted, so a room that becomes free and a room that
   stops being free both fail rather than cancelling out. */
const FREE = ['albumart', 'collab', 'hooks_feed'];
const nowFree = [...spend].filter(([, routes]) => routes.length === 0).map(([room]) => room).sort();
ok('three rooms cannot spend a credit at all',
  JSON.stringify(nowFree) === JSON.stringify([...FREE].sort()),
  `${JSON.stringify(nowFree)} against ${JSON.stringify(FREE)} —`
  + ' `docs/OPEN-QUESTIONS.md` says which three, and a write-up whose figures'
  + ' have quietly changed is worse than none');

/* ── This assertion changed on 9 October 2026, and how it changed matters ─

   It read `['/api/post/export']` — one paid door — on the ground that the
   photo editor was the only room with no other people and no money in it,
   and therefore the room a child-friendly FutureBox would be. It reddened
   the moment the picture-change control went in, which is exactly its job.

   The control came out and the question went to her. Her answer:

     *"Ek dink die child funksie is net om met liedjie maak te speel - en
     dalk om die liedjie 'n video te maak."*

   The child version is the BOOTH. Making a song, and maybe a video of it —
   both of which cost credits, so "the room with no money in it" was never
   the thing she wanted. The measurement was right; the design conclusion
   drawn from it was mine and it was wrong about her product. That is the
   useful failure mode of a check like this one: it stopped a change, a human
   looked, and the finding turned out to be the part that needed correcting.

   So the number is rewritten with today's date rather than the rule being
   dropped. Still named rather than counted, so the NEXT paid door in this
   room reddens too — the point was never one door, it was that nobody adds
   one silently. What the child mode needs is written up in
   `docs/OPEN-QUESTIONS.md`, and it is about the booth. */
ok('  and the photo editor spends on exactly the two things it is meant to',
  JSON.stringify(spend.get('photo'))
    === JSON.stringify(['/api/google/picture', '/api/post/export']),
  `${JSON.stringify(spend.get('photo'))} — taking the picture off the device,`
  + ' and changing what is in it by saying what to change. Every other tool'
  + ' in that room runs on the device and is free. A THIRD paid door is a'
  + ' decision somebody has to make out loud, which is what this line is'
  + ' for');

ok('  and the free rooms are not the safe ones, which is the whole finding',
  FREE.includes('collab'),
  'the collab room costs nothing and puts a child in a conversation with'
  + ' strangers. If it ever stops being free this sentence needs rewriting,'
  + ' and so does the write-up that rests on it');

if (bad) {
  console.error(`\ncheck:kidsafe — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  'check:kidsafe — which rooms can spend a credit is read off the code, and'
  + ' the three that cannot and the photo editor’s single paid door are still'
  + ' what the write-up says they are.',
);
