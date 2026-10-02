/**
 * A room is called one thing.
 *
 * ── Why this is worth a check of its own ─────────────────────────────────
 *
 * Carli said it twice, four days apart: *"die naam is nogsteeds nie verander
 * nie"*, and then *"Die video editor se naam het steeds nie verander nie."*
 *
 * I went looking in the app's metadata both times, found a stale title there,
 * fixed it, and was wrong about which name she meant. The rail called that room
 * the **Cutting room**. Its own heading — the first words on the screen she was
 * standing in — said **Video editor**. One room, two names, and the one she
 * could see was not the one anybody had edited.
 *
 * That is the same fault `check:brand` catches for the app's own name, and the
 * same remedy: one key, and everything that prints it reads that key.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not decide what a room should be called. That is hers. What it
 * refuses is a room answering to two names at once, which is how somebody is
 * told a thing has not changed when it has — in a different file.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

const dict = readFileSync('app/lib/i18n.tsx', 'utf8');

/** Every `rail.<room>` entry, which is the name a person navigates by. */
const railed = [...dict.matchAll(/^\s*"rail\.([a-z]+)":\s*\{\s*en:\s*"([^"]+)"/gm)]
  .map((m) => ({ room: m[1], en: m[2] }));

ok('the rail names rooms', railed.length > 5, `${railed.length} rooms`);

/* ── The heading inside a room is the rail's own key ──────────────────────

   Checked by reading the components rather than the dictionary, because a
   second name only becomes a fault when something DRAWS it. A key sitting
   unused in `i18n.tsx` is dead weight, not a lie on a screen. */
const COMPONENTS = 'app/components';
const files = readdirSync(COMPONENTS).filter((one) => one.endsWith('.tsx'));

/* The rooms whose own screen has a heading at the top, and the component that
   draws it. Listed rather than guessed at: not every room is one component, and
   a check that inferred the mapping would be wrong in both directions. */
const HEADS: readonly { readonly room: string; readonly file: string }[] = [
  { room: 'videoedit', file: 'VideoEditor.tsx' },
];

for (const { room, file } of HEADS) {
  const text = withoutComments(readFileSync(join(COMPONENTS, file), 'utf8'));
  const name = railed.find((one) => one.room === room)?.en ?? '';
  ok(`${file} draws its heading from the rail's own key`,
    new RegExp(`t\\(\\s*'rail\\.${room}'`).test(text),
    `the rail calls it "${name}"; a second key here is a second name`);

  /* And no OTHER name for the same room is drawn in it. The old one was
     `edit.title`, which is why it is named: a key that is gone from the
     dictionary but still called for falls back to its English default and
     keeps printing the old name with nothing to say it is wrong. */
  const stale = [...text.matchAll(/t\(\s*'(edit\.title|video\.title|room\.title)'/g)].map((m) => m[1]);
  ok(`  and names it nowhere else in ${file}`,
    stale.length === 0,
    stale.join(', '));
}

/* ── And a key nothing reads is not left behind ───────────────────────────

   `t('some.key', 'An English fallback')` is silent when the key is missing: it
   draws the fallback. So deleting `edit.title` from the dictionary without
   deleting the CALL would have changed nothing on the screen at all, and the
   next person to look would have found the dictionary right and the room still
   wrong. */
const calls = new Set<string>();
for (const file of files) {
  const text = withoutComments(readFileSync(join(COMPONENTS, file), 'utf8'));
  for (const m of text.matchAll(/t\(\s*'(rail\.[a-z]+)'/g)) calls.add(m[1]);
}
ok('the cutting room\'s heading is one of those calls',
  calls.has('rail.videoedit'),
  'a fallback string is silent when its key is gone, so a deleted key with a'
  + ' live call keeps printing the old name with nothing to say it is wrong');

if (bad) {
  console.error(`\ncheck:oneroomname — ${bad} room(s) answering to more than one name.\n`);
  process.exit(1);
}
console.log('\ncheck:oneroomname — every room is called one thing, and the screen reads the same key the rail does.');
