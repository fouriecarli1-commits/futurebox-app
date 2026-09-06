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
import { readFileSync } from 'node:fs';
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
const reserved = [...page.matchAll(/paddingBottom:\s*([^,}]+)/g)].map((m) => m[1].trim());
ok('the studio reserves room under itself', reserved.length > 0, `${reserved.length} found`);
for (const one of reserved) {
  ok(
    `"${one}" leaves room for the inset too`,
    /barClearance\(/.test(one) || /safe-area-inset-bottom/.test(one),
    'use barClearance()',
  );
}

/* And the bar is still over the things a person should be able to leave. */
ok('the bar sits above the studio and the front door', /z-\[?95\]?/.test(bar));

if (failures) {
  console.error(`\ncheck:tabbar — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:tabbar — the bar pads itself, and every page reserves what it really takes.');
