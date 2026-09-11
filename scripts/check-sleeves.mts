/**
 * A sleeve somebody made shows wherever the song shows.
 *
 * ── What this found the day it was written ───────────────────────────────
 *
 * Carli, 11 September 2026, testing: "As iemand op die live post… en dan
 * verander jy eers later die cover page van die liedjie, verander die cover
 * page dan op die live channel ook?"
 *
 * Nothing was ever copied into a live post — it carries the song's id and
 * nothing else — so there was no stale picture to go wrong. The real answer
 * was worse. **No screen in this app showed a real cover at all**, except
 * the one card in the channel whose button had just been pressed, in that
 * session. Four screens drew the generated pattern from `Cover.tsx`: the
 * channel grid, the live room, the live full-screen player, and the
 * full-screen player for your own songs.
 *
 * So a cover cost two credits and was visible until the tab was closed.
 *
 * It was not an oversight in any one of them. `Sleeve.tsx` is the MAKER —
 * spinner, credits, a remake button — and mounting it on every tile would
 * put a generate button on every song on the screen, which is why the
 * channel mounts exactly one. The asking and the showing were the same
 * thing, so the showing inherited the asking's cost, so nothing asked.
 *
 * ── The rule ────────────────────────────────────────────────────────────
 *
 * A `<Cover>` drawn for a SONG passes `photo`. Recognised by what it is
 * seeded on rather than by which file it is in, so a fifth screen is held
 * to it the day it is written. A `<Cover>` with a `url` is a video's
 * thumbnail and a different thing; one seeded on a handle is a channel's
 * picture, not a song's.
 */
import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── The one path, derived in two places ────────────────────────────────
 
   `app/api/cover/route.ts` writes the file and `app/api/live/route.ts` now
   signs it for a reader. Neither stores the path; both build it. That is
   the right design — the cover route's own header explains why there is no
   migration behind it — and it has exactly one failure mode, which is the
   two of them drifting apart. The picture would then exist and be
   unfindable, with nothing throwing anywhere. */
const coverRoute = readFileSync('app/api/cover/route.ts', 'utf8');
const liveRoute = readFileSync('app/api/live/route.ts', 'utf8');

const shapeOf = (source: string): string | null => {
  const found = source.match(/coverPath\s*=\s*\(([^)]*)\)[^=]*=>\s*`([^`]+)`/);
  return found ? found[2] : null;
};
const written = shapeOf(coverRoute);
const read = shapeOf(liveRoute);

ok('the cover route says where a sleeve lives', written !== null, 'no coverPath found');
ok('  and the live route says the same thing', written !== null && written === read,
  `writes to \`${written}\`, reads from \`${read}\` — the picture would exist and never be found`);

/* ── A screenful at a time ───────────────────────────────────────────── */
ok('the cover route can be asked about many songs at once',
  /searchParams\.get\('tracks'\)/.test(coverRoute) && /createSignedUrls/.test(coverRoute),
  'only one song at a time, which is why a grid never asked');

/* Scoped to the caller, not to an id in the query. These become storage
   paths read with the service-role key, which does not consult the bucket
   policies, so the folder is the only thing between one account and
   another's pictures. */
ok('  and asks only inside the caller\'s own folder',
  /createSignedUrls\(\s*ids\.map\(\(one\) => coverPath\(caller\.id, one\)\)/.test(coverRoute),
  'the owner comes from somewhere other than the signed-in caller');

ok('  and refuses an id that is not one',
  /ids\.some\(\(one\) => !storageId\(one\)\)/.test(coverRoute),
  'an id shaped like a way out of the folder reaches a path built with the service key');

ok('the live room sends each post its sleeve',
  /cover:\s*post\.kind === 'track'/.test(liveRoute) && /createSignedUrls/.test(liveRoute),
  'posts arrive with no picture, so the room draws its pattern forever');

/* ── Every song's picture asks for the sleeve ───────────────────────── */
const drawn: string[] = [];
const bare: string[] = [];
for (const file of readdirSync('app/components').filter((one) => one.endsWith('.tsx'))) {
  const source = readFileSync(`app/components/${file}`, 'utf8');
  for (const found of source.matchAll(/<Cover\b[\s\S]{0,400}?\/>/g)) {
    const tag = found[0];
    const seed = (tag.match(/seed=\{([^}]*)\}/) ?? [])[1] ?? '';
    /* A song, by what it is seeded on. `item.id` is a masterclass and
       `handle` is a channel; neither has a sleeve to show. */
    if (!/\bsourceId\b|\bone\.id\b|\btrack\.id\b/.test(seed)) continue;
    /* A video's own thumbnail is accurate by construction and beats
       everything, including a sleeve. */
    if (/\burl=/.test(tag)) continue;
    drawn.push(`${file}`);
    if (!/\bphoto=/.test(tag)) bare.push(`${file} (seed=${seed})`);
  }
}

ok('every screen that draws a song is found', drawn.length >= 4,
  `${drawn.length}: ${[...new Set(drawn)].join(', ')}`);
ok('  and every one of them shows the sleeve when there is one', bare.length === 0,
  `${bare.join('; ')} — a cover that was paid for is invisible there`);

/* ── And a link that has expired falls back ─────────────────────────── */
/* These are signed for an hour. A room left open over lunch has stale
   addresses in it, and a broken-image icon on every panel is worse than
   the drawing ever was. */
const cover = readFileSync('app/components/Cover.tsx', 'utf8');
ok('a sleeve that will not load falls back to the drawing',
  /onError=\{\(\) => setNoSleeve\(true\)\}/.test(cover),
  'an expired link leaves a broken image where the picture was');
ok('  and a new song is given a fresh chance',
  /useEffect\(\(\) => setNoSleeve\(false\), \[photo\]\)/.test(cover),
  'one failure sticks to the component, so every song after it in a scroller draws blank');

if (failures) {
  console.error(`\ncheck:sleeves — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:sleeves — one song, one picture: the sleeve where there is one, the drawing where there is not.');
