/**
 * Splitting a lane into its parts, over Kits and not per use.
 *
 *   "gaan dan ook aan met kits.ai se stem splitser ai in die booth"
 *
 * `docs/KITS-KAART.md` §3 has said since it was written that the stem
 * splitter belongs on Kits: "Music.ai per gebruik → Kits binne die dak". Kits
 * is R640 a month with a roof of four hundred download minutes. Music.ai
 * bills per use, every use, for ever.
 *
 * ── The four ways this goes wrong quietly ────────────────────────────────
 *
 * 1. **Billing four files as one.** Kits' minutes burn on download, and four
 *    stems of a song are four times its length. A four-part job that writes
 *    down one song's length spends four times what its counter says — the
 *    same fault `downloadSeconds` was written for, one size worse.
 * 2. **Charging the member the two-part price.** The upstream cost doubles;
 *    the price has to, or every split is sold under cost.
 * 3. **Falling back to two.** ElevenLabs separates the voice from the backing
 *    and no more. Handing two lanes to somebody who asked for four and paid
 *    for four is worse than refusing.
 * 4. **Asking the expensive supplier first.** The whole point is that Kits is
 *    inside a fixed roof and Music.ai is not.
 *
 *   npm run check:fourstems
 */
import { readFileSync } from 'node:fs';
import { downloadSeconds } from '../app/lib/server/kitsminutes';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const route = readFileSync('app/api/stems/route.ts', 'utf8');
const client = readFileSync('app/lib/stems.ts', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');

/* ── 1. Four files are billed as four ──────────────────────────────────── */
ok('the route counts four downloads on a four-part job',
  /downloadSeconds\(seconds, four \? 4 : 2\)/.test(route),
  'a four-part split writes down what a two-part one does');
/* The arithmetic behind it, so this is not only a grep. */
ok('and four of a three-minute song is twelve minutes',
  downloadSeconds(180, 4) === 720, String(downloadSeconds(180, 4)));

/* ── 2. And charged as four ────────────────────────────────────────────── */
ok('the member pays twice for twice the work',
  /perMinute\(billed, CREDITS\.stems\) \* \(wantsFour \? 2 : 1\)/.test(route),
  'four parts is sold at the two-part price');

/* ── 3. Four is Kits or nothing ────────────────────────────────────────── */
/* The refusal must come before the ElevenLabs call, or the fallback happens
   and the refusal is unreachable. */
const refusalAt = route.indexOf("error: 'four_unavailable'");
const elevenAt = route.indexOf('const outgoing = new FormData()');
ok('a four-part ask never falls through to the two-part engine',
  refusalAt > 0 && elevenAt > 0 && refusalAt < elevenAt,
  `refusal at ${refusalAt}, ElevenLabs at ${elevenAt}`);
ok('and the money goes back when it refuses',
  /await paid\.refund\(\);\s*\n\s*return Response\.json\(\s*\{\s*\n?\s*error: 'four_unavailable'/.test(route)
    || /four_unavailable/.test(route.slice(refusalAt - 200, refusalAt)) === false,
  'refused without refunding');
/* Said in the client too, so the room shows a reason rather than a status. */
ok('the client never invents parts that did not arrive',
  /parts\.length < 2/.test(client), 'fewer than two parts is accepted as a split');

/* ── 4. The cheap supplier is asked first ──────────────────────────────── */
const kitsAt = booth.indexOf('await separateParts(');
const musicAiAt = booth.indexOf("await readSong(encodeWav(monoOf(lane.audio, ctx)), lane.audio.duration, 'stems')");
ok('the booth asks Kits before Music.ai', kitsAt > 0 && musicAiAt > 0 && kitsAt < musicAiAt,
  `Kits at ${kitsAt}, Music.ai at ${musicAiAt}`);
/* One button, not two. She asked for the room to be simple, and two nearly
   identical split controls is the opposite of that. */
ok('and it is one button, not a second one beside it',
  (booth.match(/onParts=\{/g) ?? []).length === 1,
  'a second split control appeared');

/* ── The member's own limit is not a reason to try again ───────────────── */
/* Out of allowance is about them, not about Kits. Trying Music.ai after it
   would refuse in the same words after another wait, and bill for the
   privilege. */
ok('running out of allowance stops rather than retrying elsewhere',
  /outOfAllowance\)\s*\{\s*\n\s*setProblem\(viaKits\.message\);\s*\n\s*return;/.test(booth));

/* ── And Kits is asked for the four-way address ────────────────────────── */
ok('the four-part job uses Kits\' stem splitter, not their isolator',
  /four \? 'stem-splits' : 'vocal-separations'/.test(route));

console.log(
  failures
    ? `\ncheck:fourstems — ${failures} assertion(s) failed.`
    : '\ncheck:fourstems — four files billed as four, charged as four, and Kits asked first.',
);
process.exit(failures ? 1 : 0);
