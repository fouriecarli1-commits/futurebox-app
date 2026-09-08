/**
 * Kits' four hundred minutes are counted on what comes back, not what is sent.
 *
 * ── The undercount ───────────────────────────────────────────────────────
 *
 * The minutes burn on **download** — `docs/KITS-KAART.md` §1, and it is the
 * sentence the whole ceiling rests on. Every caller wrote down the length of
 * the file it *sent*, which is right for a voice conversion, where one file
 * goes and one comes back.
 *
 * It is wrong for a separation. `/api/stems` downloads the voice *and* the
 * backing, each the full length of the song, and wrote down one song's
 * length — half of what it burned. At R640 for 400 minutes that is R1.60 a
 * minute of real money, and a ceiling that reads half of what has been spent
 * is not a ceiling.
 *
 * ── What this refuses ────────────────────────────────────────────────────
 *
 * A route that downloads Kits audio and hands `note` a number that did not go
 * through `downloadSeconds`. The arithmetic is one line and the fault is
 * invisible: everything works, nothing errors, and the number is quietly half.
 *
 *   npm run check:kitsminutes
 */
import { readFileSync } from 'node:fs';
import { downloadSeconds } from '../app/lib/server/kitsminutes';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── The arithmetic ────────────────────────────────────────────────────── */
ok('one file back is the length of the take', downloadSeconds(180, 1) === 180);
ok('two files back is twice it', downloadSeconds(180, 2) === 360, String(downloadSeconds(180, 2)));
ok('and four stems is four times', downloadSeconds(180, 4) === 720, String(downloadSeconds(180, 4)));
/* Never zero, never negative: a caller that forgets to say bills one file
   rather than nothing, which errs towards stopping early — the direction
   `kitsminutes.ts` says it errs in on purpose. */
ok('a caller that says nothing still bills one', downloadSeconds(180, 0) === 180, String(downloadSeconds(180, 0)));
ok('and a nonsense count does too', downloadSeconds(180, Number.NaN) === 180);
ok('a take of no length spends nothing', downloadSeconds(0, 4) === 0);
ok('and neither does a negative one', downloadSeconds(-30, 4) === 0, String(downloadSeconds(-30, 4)));
/* Half a file is not a thing. Rounding up would overcharge; flooring to one
   is the honest floor. */
ok('a fractional file count floors to whole files', downloadSeconds(100, 2.9) === 200, String(downloadSeconds(100, 2.9)));

/* ── Every route that spends Kits minutes goes through it ──────────────── */
const ROUTES = ['app/api/voice/sing/route.ts', 'app/api/stems/route.ts'];
for (const path of ROUTES) {
  const source = readFileSync(path, 'utf8');
  if (!/from '@\/app\/lib\/server\/kitsminutes'/.test(source)) continue;
  ok(`${path} counts what comes back`, /downloadSeconds\(/.test(source));
  /* And the same number is checked and written down. A route that asks
     `enough` about one file and then notes two has a ceiling that lets
     everything through and a counter that fills twice as fast — both wrong,
     in opposite directions, from one typo. */
  const asked = /enough\(\s*(\w+)\s*\)/.exec(source)?.[1];
  const noted = /note\(\s*(\w+)\s*,/.exec(source)?.[1];
  ok(`${path} checks the same number it writes down`, Boolean(asked) && asked === noted,
    `enough(${asked}) vs note(${noted})`);
}

/* ── And the map does not tell the next person to break it ─────────────── */
/* `docs/KITS-KAART.md` §5 suggested feeding `jobStartTime`/`jobEndTime` to
   the counter "because Kits gives the real times back". Those are how long
   the job *ran*, not how much audio came back — a three-minute song can
   process in twenty seconds — so following it would have replaced an exact
   number with one four times too small. A document that tells the next
   person to break the thing is worse than one that says nothing. */
const map = readFileSync('docs/KITS-KAART.md', 'utf8');
/* Asserted as "wherever the map names those two fields, it says what they
   are". A rule shaped as "the recommendation is gone" would pass the moment
   somebody deleted the paragraph, and deleting it is the wrong fix: the
   correction is worth more than the silence, because the idea is a natural
   one that will occur to the next person too. */
const names = map.includes('jobStartTime');
ok('the map says what jobStartTime actually measures',
  !names || /hoe lank die \*\*werk geloop het\*\*/.test(map),
  'KITS-KAART names jobStartTime without saying it is job duration, not audio length');

console.log(
  failures
    ? `\ncheck:kitsminutes — ${failures} assertion(s) failed.`
    : '\ncheck:kitsminutes — the ceiling counts downloaded audio, and every route agrees with itself.',
);
process.exit(failures ? 1 : 0);
