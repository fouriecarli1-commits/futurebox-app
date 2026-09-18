/**
 * Nothing is hidden behind the bottom bar.
 *
 * ── The bug this exists to end ───────────────────────────────────────────
 *
 * "in make a video, die buttons heel onder sny copilot se prompt bar af."
 *
 * `TabBar` is `BAR_HEIGHT` of content plus `env(safe-area-inset-bottom)`,
 * because it pads itself away from the home indicator. Every page that made
 * room for it reserved the bare number, so on any phone with an indicator the
 * page was short by exactly the inset — 34 pixels on an iPhone, which is most
 * of a text field. The room whose last thing is the copilot's input is where
 * that shows, and it did.
 *
 * The failure is invisible on a desktop, invisible in a screenshot taken
 * without an inset, and invisible to anybody who does not already know the bar
 * pads itself. So it is checked in the one place it can be: the source.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const bar = readFileSync(join(ROOT, 'app/components/TabBar.tsx'), 'utf8');

ok('the bar pads itself away from the home indicator', /env\(safe-area-inset-bottom\)/.test(bar));
ok('and exports the clearance a page has to leave', /export function barClearance/.test(bar));
ok(
  'which includes the inset rather than only the height',
  /calc\(\$\{BAR_HEIGHT\}px \+ env\(safe-area-inset-bottom\)/.test(bar),
);

/* Every page that reserves room does it with the helper.

   Matching on `paddingBottom` next to the bare constant rather than on the
   constant alone: the file that defines the bar is allowed to use its own
   number, and so is anything measuring rather than reserving. */
const page = readFileSync(join(ROOT, 'app/page.tsx'), 'utf8');
/* `--bar-clear` counts as a reservation too.
 
   The copilot pane needs the clearance at desk width and not at phone width
   — on the Make tab the whole room sits under it — and an inline style
   cannot hold a media query. So its value goes into a custom property and
   two utilities decide where it applies. Read only `paddingBottom` and that
   reservation would have left this check's sight on the day it was made,
   which is the shape of every fault this file exists to stop. */
const reserved = [
  ...[...page.matchAll(/paddingBottom:\s*([^,}]+)/g)].map((m) => m[1].trim()),
  ...[...page.matchAll(/'--bar-clear[^']*'[^:]*\]:\s*([^,}]+)/g)].map((m) => m[1].trim()),
];
ok('the studio reserves room under itself', reserved.length > 0, `${reserved.length} found`);
/* And a variable nobody applies reserves nothing. */
const usesVar = /pb-\[var\(--bar-clear\)\]/.test(page);
const setsVar = /'--bar-clear/.test(page);
ok('  and the clearance it puts in a variable is applied somewhere',
  setsVar === usesVar, setsVar ? 'set and never used' : 'used and never set');
for (const one of reserved) {
  ok(
    `"${one}" leaves room for the inset too`,
    /barClearance\(/.test(one) || /safe-area-inset-bottom/.test(one),
    'use barClearance()',
  );
}

/* ── Nothing fixed may sit where the bar will land on it ─────────────────

   The rules above are about a page that SCROLLS. They do nothing for
   something `position: fixed`, which is not in the flow and so is not moved
   by anybody's padding — it needs the number on its own `bottom`.

   Carli, 18 September 2026, with a photograph of the "Want a video for this
   one?" card: *"daai pop up window is half uit die prent."* On a 390-pixel
   phone its bottom measured 820 against the bar's top at 786, so 34 pixels
   of it — the whole button row — sat under a bar painted at z-95 over its
   z-60. It was not too wide and not off the side. It was too low.

   `bottom-6` is 24 pixels from the bottom of the SCREEN, which in this app
   is 58 pixels inside the bar. Two places had it and both were invisible in
   the same way, so this is a class and not a typo.

   `bottom-0` is allowed through: a full-width sheet or the bar itself is
   MEANT to reach the bottom edge, and covering the bar deliberately is a
   different decision from being eaten by it. Everything else fixed near the
   bottom goes through `aboveBar`. */
ok('the bar exports where a fixed thing has to stop', /export function aboveBar/.test(bar));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.tsx') ? [full] : [];
  });

const tooLow: string[] = [];
for (const file of walk(join(ROOT, 'app'))) {
  const text = readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    if (!/\bfixed\b/.test(line)) continue;
    /* A non-zero bottom-N on the same className as `fixed`. */
    const hit = line.match(/\bbottom-(?!0\b)([1-9]\d*)\b/);
    if (hit) tooLow.push(`${file.slice(ROOT.length + 1)} — bottom-${hit[1]}`);
  }
}
ok(
  'and nothing fixed is pinned to the screen bottom instead of above the bar',
  tooLow.length === 0,
  `${tooLow.length}: ${tooLow.join(', ')} — use style={{ bottom: aboveBar() }}`,
);

/* And the bar is still over the things a person should be able to leave. */
ok('the bar sits above the studio and the front door', /z-\[?95\]?/.test(bar));

if (failures) {
  console.error(`\ncheck:tabbar — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:tabbar — the bar pads itself, and every page reserves what it really takes.');
