/**
 * A button whose only border is a divider.
 *
 * ── What was on the screen ───────────────────────────────────────────────
 *
 * Carli photographed the header on her phone, in her light theme. Beside
 * her name, where "Sign out" should be, was a pale green rectangle with
 * square corners sitting inside a rounded grey pill — a block of colour
 * with the words only just readable on it, looking like a rendering fault.
 *
 * ── Why it happened ──────────────────────────────────────────────────────
 *
 * `app/globals.css` gives every button a box and a colour, and it finds
 * them with an attribute selector:
 *
 *     button[class*="border"]:not([class*="bg-emerald"]) … {
 *       background-color: rgb(var(--fb-primary-500) / 0.09);
 *       border-color:     rgb(var(--fb-primary-500) / 0.32);
 *     }
 *
 * The reasoning was: a button that declares a border is a button somebody
 * meant to look like a button, so colour it. That is true of `border`. It
 * is not true of `border-l`, which also contains the substring "border" —
 * and `border-l` is a hairline down one edge, used to divide two controls
 * that sit flush against each other. Give one of those a background and a
 * border-colour and you get exactly what she saw: filled, unrounded, and
 * bordered on one side only.
 *
 * ── Why a check and not just a fix ───────────────────────────────────────
 *
 * Because this is the eleventh time this session that a check has been
 * green while the thing it was written for was broken, and the shape is
 * always the same: the rule matched the *attribute* rather than the thing.
 * Two buttons in the app were built this way. The third has not been
 * written yet, and it will be — a divider between a label and its X is a
 * natural thing to reach for, and nothing about writing it tells you it
 * will come out green.
 *
 * ── What is allowed ──────────────────────────────────────────────────────
 *
 * A directional border is fine on a button that has already taken itself
 * out of the green rule's reach, by declaring a background the rule
 * excludes (`bg-rose`, `bg-amber`, `bg-emerald`, `bg-gradient`,
 * `bg-transparent`).
 *
 * That exclusion is a *substring* match on the whole class attribute, in
 * the CSS as much as here — `:not([class*="bg-rose"])`. So a Tailwind
 * variant counts: `hover:bg-rose-500/10` contains `bg-rose`, and a button
 * carrying only that is already exempt, whether or not anybody meant it to
 * be. This check mirrors that deliberately rather than being stricter,
 * because a check that disagrees with the stylesheet is a check that sends
 * you to fix something that is not broken.
 *
 * That is not a hypothetical. Writing this, I gave the Adverts shelf's X a
 * faint rose wash to exempt it — and then the negative test would not go
 * red with the wash removed, because `hover:bg-rose-500/10` had been
 * exempting it all along. The button had never rendered green. The fix was
 * reverted; the lesson is that the only way to know a rule's reach is to
 * take the fix away and watch the check fail without it.
 *
 * Everything else must declare a plain `border`, which means it gets a
 * radius and a box and looks like the thing it is.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** The backgrounds `globals.css` already refuses to paint over. */
const EXEMPT = /bg-(emerald|rose|red|amber|gradient|transparent)/;

/* Walked rather than globbed, the way every other check in `scripts/`
   reads the tree. */
const walk = (dir: string, found: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (path.endsWith('.tsx')) found.push(path);
  }
  return found;
};

const files = walk('app').sort();
ok('there are components to read', files.length > 40, `${files.length} found`);

type Hit = { readonly file: string; readonly line: number; readonly cls: string };
const hits: Hit[] = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  for (const match of source.matchAll(/<(button|label)\b/g)) {
    const at = source.slice(0, match.index).split('\n').length - 1;
    /* The opening tag can run over many lines — an onClick with an arrow in
       it means we cannot just read to the first `>`. Eighteen lines is more
       than any tag in this app and short enough not to reach the next one. */
    const window = lines.slice(at, at + 18).join('\n');
    const cls = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(window);
    if (!cls) continue;
    const value = cls[1] ?? cls[2] ?? '';
    const directional = /(?<![\w-])border-[lrtbxy](?![\w-])/.test(value);
    const plain = /(?<![\w-])border(?![\w-])/.test(value);
    if (directional && !plain && !EXEMPT.test(value)) {
      hits.push({ file, line: at + 1, cls: value.slice(0, 70) });
    }
  }
}

ok(
  'no button is bordered on one side only',
  hits.length === 0,
  hits.map((h) => `${h.file}:${h.line} "${h.cls}"`).join(' · '),
);

if (failures) {
  console.error(
    '\ncheck:sideborder — a button with only `border-l`/`border-t`/… is matched by the\n' +
      'green rule in app/globals.css, which then paints it a filled rectangle with no\n' +
      'radius. Give it a plain `border` so it is a real button, or a `bg-rose`/`bg-amber`\n' +
      'wash if it is meant to stay a divider.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:sideborder — ${files.length} files, and every bordered button is bordered all the way round.`);
