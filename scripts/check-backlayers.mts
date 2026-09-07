/**
 * Every full-screen overlay is something Back can get out of.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * "Binne pro booth is daar nie 'n manier om back te gaan nie, die foon se
 *  back knoppie spring na die groot home page, en gaan nie terug na die
 *  vorige bladsy van the booth nie."
 *
 * `app/page.tsx` assembles the back stack and knows about four things: the
 * room, the front door, the search and the account panel. A whole room was
 * one layer. So the Pro Booth — itself a full-screen overlay *above* the room,
 * with its own panels above that — was not a layer at all, and one press of
 * the hardware button unwound every one of them at once.
 *
 * The same was true of the words screen somebody films themselves in front of,
 * and of a song opened full screen.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * A component that paints `fixed inset-0` at a z-index above the studio is a
 * screen in its own right, and the hardware button has to treat it as one. So
 * it either registers with `useBackLayer`, or it is one of the few the page
 * itself already tracks — named here, with the reason, the same posture
 * `check:signed` takes with unsigned calls.
 *
 * The failure this prevents is not cosmetic. On a phone the back gesture is
 * how people leave things, and an app that answers it by throwing away
 * everything they had open is an app they stop trusting with work in progress.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/** Tracked by `page.tsx` itself, which owns the stack. The key is the file. */
const PAGE_TRACKS: Record<string, string> = {
  'Search.tsx': 'page.tsx holds searchOpen and pushes the layer for it',
  'Account.tsx': 'page.tsx holds accountOpen and pushes the layer for it',
};

/**
 * Not a screen: a message over the current one, dismissed by reading it.
 * Listed rather than inferred, so adding one is a decision.
 */
const NOT_A_SCREEN: Record<string, string> = {
  'OutOfCredits.tsx': 'a message about the balance, not a place somebody navigated to',
  'ShareRow.tsx': 'the share sheet, which the platform’s own back gesture closes',
};

const dir = join(ROOT, 'app/components');
const overlays: string[] = [];
for (const name of readdirSync(dir)) {
  if (!name.endsWith('.tsx')) continue;
  const source = readFileSync(join(dir, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  /* A full-screen overlay above the studio. Below z-50 is furniture inside a
     page; at and above it, it is covering the app. */
  if (!/fixed inset-0[^"'`]*z-\[(?:[5-9]\d|\d{3,})\]/.test(source)) continue;
  overlays.push(name);
  const registers = /useBackLayer\(/.test(source);
  const excused = PAGE_TRACKS[name] ?? NOT_A_SCREEN[name];
  ok(
    `${name} can be left with the back button`,
    registers || Boolean(excused),
    'it paints over the whole app and registers no layer, so Back unwinds past it',
  );
}

ok('there are overlays to check', overlays.length >= 4, `${overlays.length} found`);

/* An excuse has to still be about a file that exists and still paints one. */
for (const [name, why] of Object.entries({ ...PAGE_TRACKS, ...NOT_A_SCREEN })) {
  ok(`the exemption for ${name} is still about a real overlay`, overlays.includes(name), why);
}

/* And the machinery itself. */
const stack = readFileSync(join(ROOT, 'app/lib/backstack.ts'), 'utf8');
ok('useBackLayer exists and takes the closer through a ref', /const latest = useRef\(close\)/.test(stack));
ok('and the page appends what the rooms registered', /useInnerLayers/.test(readFileSync(join(ROOT, 'app/page.tsx'), 'utf8')));

if (failures > 0) {
  console.log(`\ncheck:backlayers — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\ncheck:backlayers — all ${overlays.length} full-screen overlays answer the back button.`);
}
