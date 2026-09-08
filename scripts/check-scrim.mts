/**
 * The wash behind a modal has to be dark, in every theme.
 *
 * ── The fault this was written for ───────────────────────────────────────
 *
 * `tailwind.config.js` remaps `black` onto `--fb-void`, "the deepest surface",
 * so the whole app can change theme without touching markup. In the light
 * theme the app actually ships, `--fb-void` is `222 220 216` — a pale grey.
 *
 * That is right for what the remap was for: `bg-black/40` as a shaded inset
 * inside a card. It is wrong for the one place the markup means literal
 * darkness — the sheet of colour over the page behind an open dialog. Six
 * modals wrote `bg-black/70`, and in the shipped theme every one of them laid
 * a 70%-opaque *pale grey* over a pale page: no dimming, no separation, the
 * page behind still bright and still legible under the panel.
 *
 * It survived because nothing about it is broken. Nothing throws, no test
 * fails, and on the dark theme it was written against it looks correct. The
 * only way to find it is to open a modal in the default theme and look at it,
 * which is how it was found — in `audit/buildon.mjs`, on the permission panel.
 *
 * `--fb-scrim` (17 16 14) exists for exactly this and is dark in every theme.
 *
 * ── What this refuses, and what it lets through ──────────────────────────
 *
 * `bg-black/<n>` together with `fixed inset-0`. That covers the viewport and
 * nothing else does, so it is a scrim by construction.
 *
 * `absolute inset-0` is deliberately NOT matched, and the first version of
 * this matched it and was wrong: it covers whatever box it is in, and six of
 * those in this app are the case the remap exists for — a hover shade over
 * cover art, a round wash over a profile photo. Darkening a picture inside a
 * card is what `--fb-void` is for.
 *
 * The honest limit that leaves: a scrim written as `absolute inset-0` inside
 * a `fixed` parent — `ThemeStudio` has one — reads the same to this check as
 * a shade on a photograph, and passes. Narrowing the rule to what it can
 * actually tell apart is better than a rule that makes people delete it.
 *
 *   npm run check:scrim
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every .tsx under app/, however deep. */
function pages(dir: string, into: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) pages(path, into);
    else if (path.endsWith('.tsx')) into.push(path);
  }
  return into;
}

/**
 * A className that covers the viewport.
 *
 * Matched on the class string rather than on the JSX, because the two halves
 * can be written in either order: `fixed inset-0 z-[70] … bg-black/70` and
 * `fixed inset-0 bg-black/70 flex …` are the same thing, and both were here.
 */
const COVERS = /\bfixed\s+inset-0\b/;
const LITERAL_BLACK = /\bbg-black(?:\/\d+)?\b/;

const problems: string[] = [];
for (const file of pages('app')) {
  const source = readFileSync(file, 'utf8');
  source.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/className="([^"]*)"/g)) {
      const classes = match[1];
      if (COVERS.test(classes) && LITERAL_BLACK.test(classes)) {
        problems.push(`  ${file}:${index + 1} — ${classes.slice(0, 110)}`);
      }
    }
  });
}

if (problems.length > 0) {
  console.error(
    `check:scrim — ${problems.length} full-page wash(es) painted in bg-black:\n${problems.join('\n')}\n\n` +
      'bg-black is --fb-void, which is a pale grey in the light theme the app ships.\n' +
      'Use bg-scrim (--fb-scrim), which is dark in every theme.',
  );
  process.exit(1);
}

console.log('check:scrim — every full-page wash uses bg-scrim.');
