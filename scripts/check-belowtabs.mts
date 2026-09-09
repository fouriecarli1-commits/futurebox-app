/**
 * Every full-screen room leaves the tab bar its own strip.
 *
 * ── The fault, and why it is a class rather than a bug ───────────────────
 *
 * `TabBar` is `fixed bottom-0 z-[95]`. Every full-screen room in this app is
 * below that: the Pro Booth at z-[70], The Booth at z-[60], the song and live
 * screens at z-[80]. So the bar is painted over the foot of each of them, and
 * whatever a room keeps down there is underneath it.
 *
 * The Pro Booth's "Mix it down" — the button that whole room exists to reach —
 * was under it, and Carli asked for a feature that had been built and covered:
 * "hoe word dit uiteindelik as een liedjie ge-export?" Asking the same question
 * of The Booth found two more, one of them "Take the room off it", which is a
 * paid control.
 *
 * One number in one place, then, and a rule that a new room cannot be written
 * without meeting.
 *
 * ── What this can and cannot see ─────────────────────────────────────────
 *
 * This is a static check and it holds a shape: a room below the bar reserves
 * the strip. Whether a *particular* control is actually painted over is a
 * question only a browser answers, and `audit/probooth.mjs` and
 * `audit/boothwalk.mjs` ask it — both by looking at what is painted at each
 * control, not at where it would be. This one stops the next room being
 * written without the thought; those two prove the two rooms that matter.
 *
 *   npm run check:belowtabs
 */
import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** The bar's own z-index, read rather than repeated. */
const bar = readFileSync('app/components/TabBar.tsx', 'utf8');
const barZ = Number(/fixed bottom-0 inset-x-0 z-\[(\d+)\]/.exec(bar)?.[1] ?? 0);
ok('the tab bar states its own layer', barZ > 0, String(barZ));
ok('and states its height as a number other files can import',
  /export const BAR_HEIGHT/.test(bar));

/* One number, and it is `TabBar`'s own.
 
   This check first shipped with a `.below-tabs` rule in globals.css carrying
   its own 57 — read off the bar's `min-h-[56px]` plus a border. `TabBar`
   already exported `barClearance()` built on `BAR_HEIGHT`, which is **64**,
   and already had `check:tabbar` guarding it. So the new rule was a second
   source of truth that was seven pixels short, and Carli found the difference
   the way it is always found: "By your voice is daar ook 'n hele button onder
   agter die main button bar."
 
   The rule is gone. Every room uses the helper. */
ok('there is no second clearance rule to drift from the first',
  !/below-tabs/.test(readFileSync('app/globals.css', 'utf8')));
ok('the clearance is built on the bar\u2019s own height',
  /export const BAR_HEIGHT = \d+;/.test(bar)
  && /calc\(\$\{BAR_HEIGHT\}px \+ env\(safe-area-inset-bottom\)/.test(bar));

/**
 * Rooms that clear the bar another way, or that do not need to.
 *
 * Named with a reason, and the reason is checked below — an exemption that has
 * quietly stopped being true is the same gap wearing a label.
 */
const OTHERWISE: Record<string, { why: string; holds: (source: string) => boolean }> = {
  'app/components/Account.tsx': {
    why: 'clears it with pb-24, which is 96px against the bar’s 64',
    holds: (s) => /pb-24/.test(s),
  },
  'app/components/Search.tsx': {
    why: 'clears it with pb-24',
    holds: (s) => /pb-24/.test(s),
  },
  /* The two full-bleed media rooms. Padding the container would letterbox the
     video, which is the thing the room is for. Their controls are laid out
     against the viewport rather than against the container, so the fix — if
     they need one — belongs on the controls and not here.
     **Not yet proven in a browser.** Neither has a probe that asks what is
     painted at its controls, and that is written down rather than assumed. */
  'app/components/SongScreen.tsx': {
    why: 'full-bleed video; padding would letterbox it — controls unverified, see the note',
    holds: () => true,
  },
  'app/components/RoomScreen.tsx': {
    why: 'full-bleed scroller; same as SongScreen — controls unverified',
    holds: () => true,
  },
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(`${dir}/${entry.name}`)
      : entry.name.endsWith('.tsx')
        ? [`${dir}/${entry.name}`]
        : [],
  );

const files = [...walk('app/components'), 'app/page.tsx'];
const rooms: string[] = [];
for (const path of files) {
  const source = readFileSync(path, 'utf8');
  /* `z-50` as well as `z-[50]`.
 
     Tailwind's own scale needs no brackets, and this pattern only matched the
     bracketed arbitrary values — so the studio, which is `fixed inset-0 z-50`
     and holds Make a song, was not in the list at all. `audit/underbar.mjs`
     found a button under the bar in that very room on its first run, in a
     file this check had never looked at. */
  for (const found of source.matchAll(/fixed inset-0 z-(?:\[(\d+)\]|(\d+))/g)) {
    const layer = Number(found[1] ?? found[2]);
    if (layer < barZ) rooms.push(path);
  }
  for (const found of [] as RegExpMatchArray[]) {
    if (Number(found[1]) < barZ) rooms.push(path);
  }
}
const under = [...new Set(rooms)];
ok('there are rooms below the bar to check', under.length > 5, `${under.length} found`);

const bare: string[] = [];
for (const path of under) {
  const source = readFileSync(path, 'utf8');
  if (path in OTHERWISE) continue;
  if (!/barClearance\(/.test(source)) bare.push(path.replace('app/components/', ''));
}
ok('every room below the bar reserves its strip with the exported clearance',
  bare.length === 0, bare.join(', '));

for (const [path, { why, holds }] of Object.entries(OTHERWISE)) {
  ok(`the exemption for ${path.replace('app/components/', '')} still holds — ${why}`,
    holds(readFileSync(path, 'utf8')));
}

/* And the two rooms that a browser does check, so this file cannot be read as
   the whole story. */
ok('a probe asks what is painted at the Pro Booth’s controls',
  /the tab bar covers nothing the room offers/.test(readFileSync('audit/probooth.mjs', 'utf8')));
ok('and at The Booth’s',
  /stranded under the tab bar/.test(readFileSync('audit/boothwalk.mjs', 'utf8')));

console.log(
  failures
    ? `\ncheck:belowtabs — ${failures} assertion(s) failed.`
    : '\ncheck:belowtabs — one number, in one place, and every room below the bar uses it.',
);
process.exit(failures ? 1 : 0);
