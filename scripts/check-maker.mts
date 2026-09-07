/**
 * A clip that leaves the app says whose it is.
 *
 * Carli, 7 September 2026: "let wel dat die creator van die liedjie se channel
 * naam ook daarop moet verskyn."
 *
 * The drawn snippet carried the title and the style line — "Ons Springbok
 * tribe", "upbeat electronic dance pop · 155 BPM" — and said nothing at all
 * about who made it. The comment above that code said "so a clip posted on its
 * own still says whose it is", which was a claim about the title, and the title
 * is what it is, not whose it is. On somebody else's feed that is an anonymous
 * clip, which is the one thing a snippet exists to stop being.
 *
 * ── What this proves, and what it does not ───────────────────────────────
 *
 * `nameOf` is run, against the three cases that matter: a name, a handle with
 * no name, and neither. That last one is the one worth having a test for — a
 * placeholder drawn across somebody's video ("Unknown", or a blank line under
 * the title) is worse than nothing, and it is the behaviour that goes wrong
 * first when somebody "tidies up" an empty string later.
 *
 * `styleFor` is run, so the name reaches the shape that gets drawn.
 *
 * What is asserted rather than run is the drawing itself: it is a canvas call
 * in a browser, and reading the pixels back would need a probe page of its own.
 * So this holds the three things that would break it — the field, the call
 * that draws it, and the guard that keeps an empty name from being drawn —
 * and does not pretend to have looked at the picture.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { nameOf } from '../app/lib/radar.ts';
import { styleFor } from '../app/lib/video.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── The name itself ────────────────────────────────────────────────────── */

ok('a channel with a name is called by it',
  nameOf({ name: 'Carli', handle: 'carli', about: '', links: {} } as never) === 'Carli');
ok('a channel with only a handle is called by the handle',
  nameOf({ name: '', handle: 'carli', about: '', links: {} } as never) === '@carli');
ok('and whitespace is not a name',
  nameOf({ name: '   ', handle: 'carli', about: '', links: {} } as never) === '@carli');
ok('a channel with neither gets nothing, not a placeholder',
  nameOf({ name: '', handle: '', about: '', links: {} } as never) === '' && nameOf(null) === '',
  'a word like "Unknown" drawn across somebody’s video is worse than a blank');

/* ── It reaches the thing that gets drawn ───────────────────────────────── */

ok('the name travels on the style the renderer is handed',
  styleFor('Ons Springbok tribe', 'dance pop', 155, 'Carli').by === 'Carli');
ok('and no name means an empty one rather than an absent field',
  styleFor('Ons Springbok tribe', 'dance pop', 155).by === '');

/* ── And the renderer draws it ──────────────────────────────────────────── */

const video = read('app/lib/video.ts');
ok('the style carries a maker', /readonly by\?: string;/.test(video));
ok('the renderer draws it', /context\.fillText\(style\.by/.test(video));
ok('and only when there is one',
  /if \(style\.by\) \{/.test(video),
  'an empty line under the title reads as a fault');

/* ── Every room that draws a clip passes it ─────────────────────────────── */

for (const path of ['app/components/Hooks.tsx', 'app/components/VideoPanel.tsx']) {
  const source = read(path);
  const call = /styleFor\([^)]*\)/.exec(source)?.[0] ?? '';
  ok(`${path} passes the maker to styleFor`,
    /,\s*maker\)/.test(call),
    call || 'no styleFor call found');
  ok(`${path} fetches the channel to get it`,
    /fetchCreator\(\)/.test(source) && /nameOf\(creator\)/.test(source));
}

if (failures > 0) {
  console.log(`\ncheck:maker — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:maker — a clip that leaves the app carries the channel that made it.');
}
