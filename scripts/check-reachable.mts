/**
 * Nothing that looks pressable is dead, and nothing useful is hidden.
 *
 * ── Two of hers, one shape ───────────────────────────────────────────────
 *
 *   "Ek sien dit nie daar nie."
 *   "Ek kom ook agter die liedjies se links vat mens nerens heen nie."
 *
 * The first: the selfie camera lives behind the song's words button, and that
 * button only drew when the app had written timed lines for that song. So an
 * instrumental, a song made without lyrics and every song brought in from a
 * file had no path to the camera at all — though the camera has nothing to do
 * with words. A screen gated on something it does not need is a feature nobody
 * can find.
 *
 * The second: every row in our own Top 10 was a `<button disabled>`, because
 * the handler that would have made it live was optional and nobody ever passed
 * one. A list that looks pressable and is not is worse than a list that
 * plainly is not — the first wastes a press and teaches somebody the app is
 * broken.
 *
 * Both are invisible to a typecheck, invisible in a screenshot, and invisible
 * to anybody who has not tried the case. So they are checked in the source.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── The camera is reachable from any song ──────────────────────────────── */

const channel = read('app/components/Channel.tsx');

ok(
  'the words button is not gated on the song having words',
  !/\{timedFor\(track\)\.length > 0 && \(/.test(channel),
  'a song with no lyrics must still reach the camera behind it',
);
ok('and it says which of the two it is', /chan\.filmIt/.test(channel));
ok(
  'the camera view is still opened from it',
  /setLyricsFor\(\{ track/.test(channel) && /FollowWords/.test(channel),
);

/* And the view behind it does not need lines to work. It films the person; the
   lines are an overlay that never reaches the file. */
const follow = read('app/components/FollowWords.tsx');
ok(
  'the camera does not depend on there being lines',
  !/if \(!lines\.length\) return null/.test(follow),
);

/* ── Every chart row goes somewhere ─────────────────────────────────────── */

const charts = read('app/components/Charts.tsx');
const rows = [...charts.matchAll(/line\(row, at, 'ours'([^)]*)\)/g)].map((m) => m[1].trim());

ok('our charts draw rows', rows.length > 0, `${rows.length}`);
for (const one of rows) {
  ok(
    `a row rendered with "${one || 'no handler'}" is pressable`,
    one.length > 0 && !/undefined/.test(one),
    'pass onOpenLive, or the row is a disabled button',
  );
}

/* And the handler is actually supplied, all the way down. A prop that is
   optional and never passed is how the first version went dead. */
ok('Spotlight passes it to the charts', /onOpenLive=\{onOpenLive\}/.test(read('app/components/Spotlight.tsx')));
ok('and the page passes it to Spotlight', /onOpenLive=\{\(\) => goTab\('live'\)\}/.test(read('app/page.tsx')));
ok(
  'the destination is required rather than optional',
  /readonly onOpenLive: \(\) => void;/.test(charts),
  'an optional handler is one nobody has to pass',
);

if (failures) {
  console.error(`\ncheck:reachable — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:reachable — the camera opens from any song, and every chart row goes somewhere.');
