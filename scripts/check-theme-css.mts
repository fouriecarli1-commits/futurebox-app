/**
 * The CSS defaults and the theme engine have to agree.
 *
 * `app/globals.css` writes the default theme out as literal `:root` variables
 * so that the first paint — before any JavaScript has run — is already the
 * right colour. `applyTheme()` then sets the same variables as inline styles on
 * the root element once a theme loads.
 *
 * When the two disagree, the failure is quiet and nasty: every page paints in
 * the stale colours and then flips, and any page where the effect does not run
 * keeps them. That is exactly what happened when the default moved from
 * near-black to near-white and this block did not move with it — the landing
 * page flipped to light on hydration and the signed-in shell stayed dark.
 *
 * So: compare them, and fail the build rather than let it happen twice.
 *
 *   npm run check:theme
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_THEME, PRESETS, SURFACES, themeVariables, type Theme } from '../app/lib/theme';

const want = themeVariables(DEFAULT_THEME);

const css = readFileSync('app/globals.css', 'utf8');
const open = css.indexOf(':root {');
if (open === -1) {
  console.error('check:theme — no :root block in app/globals.css');
  process.exit(1);
}
const block = css.slice(open, css.indexOf('\n}\n', open));

const got: Record<string, string> = {};
for (const match of block.matchAll(/(--fb-[\w-]+):\s*([^;]+);/g)) {
  got[match[1]] = match[2].trim();
}

const problems: string[] = [];
for (const [name, value] of Object.entries(want)) {
  if (got[name] === undefined) problems.push(`  ${name} — missing from globals.css`);
  else if (got[name] !== value) problems.push(`  ${name} — css has "${got[name]}", theme says "${value}"`);
}
for (const name of Object.keys(got)) {
  if (!(name in want)) problems.push(`  ${name} — in globals.css, not produced by the theme`);
}

if (problems.length > 0) {
  console.error(
    `check:theme — app/globals.css does not match themeVariables(DEFAULT_THEME):\n${problems.join('\n')}\n\n` +
      'Regenerate the :root block from the theme engine, or change DEFAULT_THEME back.',
  );
  process.exit(1);
}

/* ---------------------------------------------------------------------------
 * The contrast guarantee.
 *
 * On a light surface the text stops are not assigned a lightness, they are
 * solved for a ratio against the darkest ground the app puts text on. This
 * asserts the solve actually holds, for every light preset and not only the
 * default — a hue added to ACCENTS, or a target edited by hand, would otherwise
 * silently produce a palette that fails on one preset and passes on another.
 *
 * The thresholds are the WCAG AA floor for body text, not the targets: the
 * targets step down for hierarchy and the floor is what must never be crossed.
 * ------------------------------------------------------------------------ */
const AA_BODY = 4.5;
/** Stops the app uses as text. Counted, not assumed — see the notes in theme.ts. */
const TEXT_STOPS = [50, 100, 200, 300, 400, 500, 600];
const ACCENT_TEXT_STOPS = [50, 100, 200, 300, 400];
const FAMILIES = ['primary', 'secondary', 'highlight', 'tertiary', 'danger'];

function channels(value: string): [number, number, number] {
  const parts = value.split(/\s+/).map(Number);
  return [parts[0], parts[1], parts[2]];
}

function luminance(rgb: readonly number[]): number {
  const parts = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

function ratio(a: readonly number[], b: readonly number[]): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const failures: string[] = [];
for (const preset of PRESETS) {
  const surface = SURFACES.find((one) => one.id === preset.surface);
  if (surface?.mode !== 'light') continue;
  const vars = themeVariables(preset as Theme);
  // The worst ground the app puts text on: the zinc-800 chip, not the page.
  const ground = channels(vars['--fb-surface-800']);

  for (const stop of TEXT_STOPS) {
    const got = ratio(channels(vars[`--fb-surface-${stop}`]), ground);
    if (got < AA_BODY) failures.push(`  ${preset.id}: surface-${stop} is ${got.toFixed(2)}:1 on surface-800`);
  }
  for (const family of FAMILIES) {
    for (const stop of ACCENT_TEXT_STOPS) {
      const got = ratio(channels(vars[`--fb-${family}-${stop}`]), ground);
      if (got < AA_BODY) failures.push(`  ${preset.id}: ${family}-${stop} is ${got.toFixed(2)}:1 on surface-800`);
    }
  }
  // Accent fills carry `text-onAccent`, which is dark in every theme.
  const onAccent = channels(vars['--fb-on-accent']);
  for (const family of FAMILIES) {
    const got = ratio(onAccent, channels(vars[`--fb-${family}-500`]));
    if (got < AA_BODY) failures.push(`  ${preset.id}: onAccent is ${got.toFixed(2)}:1 on ${family}-500`);
  }
}

/* ── `bg-white` is never a fill ────────────────────────────────────────────

   `tailwind.config.js` remaps `white` to `--fb-ink`, so that `text-white`
   follows the theme — near-white on a dark surface, near-black on a light one.
   That is right for text and it is a trap for a fill.

   `bg-white` on a light preset paints **near-black**. Four play buttons were
   written as `bg-white text-onAccent`, which reads as "a white disc with a
   dark glyph on it" and on a light theme rendered a black disc with a black
   glyph inside it: a solid dot with no icon. Somebody found it by looking at
   the screen, which is the only way it was ever going to be found.

   So: no `bg-white` anywhere. A fill that has to stay bright in every theme is
   an accent fill — `bg-emerald-500 text-onAccent`, which the check above
   already proves clears AA in every preset. The one real exception is Google's
   own sign-in button, which is brand chrome rather than themed UI and is
   written as a literal `bg-[#ffffff]`. */
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx$/.test(path)) out.push(path);
  }
  return out;
};
for (const file of walk('app')) {
  const src = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const found of src.matchAll(/\bbg-white(\/\d+)?\b/g)) {
    failures.push(
      `  ${file}: ${found[0]} paints near-black on a light theme. ` +
        'Use bg-emerald-500 with text-onAccent for a bright fill.',
    );
  }

  /* ── And no room brings its own colours ──────────────────────────────

     Carli, four times across two days, about the album art room: *"dit lyk
     soos 'n website binne 'n app"*, and then *"daai hele bladsy en kamer
     moet die selfde kleur en tema regdeur hê"*, and finally *"dit lyk
     uiters crap"*.

     Each time I answered by making that room MORE its own thing, and the
     comment I left above its palette said the quiet part plainly: "it is
     not emerald, which is the rest of this app, which is the point." It
     was not the point. A room with its own hex palette is a foreign page
     pasted into the app — three colour systems on one phone screen — and
     it also silently opts out of every theme the person can choose and of
     the AA arithmetic above, which only knows about the families.

     A literal colour in a Tailwind arbitrary value is the tell, so that is
     what is counted. The allowlist is short and each entry is a reason,
     not a grandfathering: a colour that must NOT follow the theme. */
  const brandOrOverPicture = new Set([
    /* Sign-in buttons. Google, Apple and Facebook each specify their
       button's exact colours, and a themed version is off-brand. */
    'app/components/Landing.tsx',
    'app/components/SignInWith.tsx',
    /* Words printed over somebody's artwork or video. White with a scrim
       under it, because the surface behind is a photograph and not a
       theme — the same reasoning as subtitles on any player. */
    'app/components/FollowWords.tsx',
    'app/components/SongScreen.tsx',
  ]);
  if (brandOrOverPicture.has(file.split('\\').join('/'))) continue;
  for (const found of src.matchAll(
    /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow)-\[(?:#[0-9A-Fa-f]{3,8}|rgba?\([^\]]*\))\]/g,
  )) {
    failures.push(
      `  ${file}: ${found[0]} is a colour of its own. It ignores the theme the person chose` +
        ' and the contrast arithmetic above. Use the zinc/emerald families, or scrim/onAccent.',
    );
  }

  /* And the same colour written as a CSS variable in a style object.
 
     Which is how the album art room actually did it, and the first version of the
     rule above sailed straight past it: the palette was ten entries of
     `'--grond': '#F7F3EC'` in a `React.CSSProperties`, not a single
     `bg-[#...]` class. Putting a hex one level of indirection away from
     Tailwind does not make it follow the theme — it only makes it harder to
     grep, which is worse.
 
     A value that resolves through `var(--fb-…)` is the correct shape and
     passes: that IS the theme, named once and reused. */
  for (const found of src.matchAll(/'(--[\w-]+)':\s*'([^']+)'/g)) {
    const value = found[2];
    const literal = /^#[0-9A-Fa-f]{3,8}$/.test(value)
      || (/^rgba?\(/.test(value) && !value.includes('var(--fb-'));
    if (!literal) continue;
    failures.push(
      `  ${file}: ${found[1]} is set to the literal ${value}. A room may not carry its own palette` +
        ' — point it at rgb(var(--fb-surface-…)) or rgb(var(--fb-primary-…)) so it follows the theme.',
    );
  }
}

if (failures.length > 0) {
  console.error(
    `check:theme — light presets fall below ${AA_BODY}:1 for body text:\n${failures.join('\n')}\n\n` +
      'Adjust the targets in app/lib/theme.ts, or the stop is being used for something it was not solved for.',
  );
  process.exit(1);
}

console.log(
  `check:theme — globals.css matches the default theme (${Object.keys(want).length} variables), ` +
    'and every light preset clears AA for body text.',
);
