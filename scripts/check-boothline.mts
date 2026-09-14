/**
 * The booth's timeline: one axis, and a room that stays black.
 *
 * ── The alignment ────────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Die timeline van die verskillende layers moet
 * reg by en teen mekaar wees."*
 *
 * The old room drew each lane's waveform inside its own row, between that
 * row's name column and that row's buttons — so every row had its own
 * pixels-per-second. The room knew: the bar lines were drawn INSIDE each
 * waveform, with a note saying a ruler across the top could not be trusted
 * because "bar 2 on the ruler sat nowhere near bar 2 in the audio".
 *
 * The fix is structural rather than arithmetic. One CSS grid, two columns —
 * a fixed gutter and one `1fr` — puts the ruler and every lane in the same
 * column, so they cannot disagree about where a second is. That makes this
 * check a shape check and not a pixel one, which is the honest kind: if the
 * grid is still there, alignment is not something a row can get wrong.
 *
 * What it therefore refuses: a second place to draw a lane. Two waveforms for
 * one lane is two places to cut it and two places to disagree about the cut,
 * which is exactly what was removed.
 *
 * ── The look, which is a requirement and not a slip ──────────────────────
 *
 * Carli: *"die booth se swart met die blou musieklyn sal 'n unieke take wees
 * vir die booth, dat dit heeltemal anders lyk as die res van die app."*
 *
 * Every other screen in this app must follow the theme, and `check:theme`
 * and `check:scrim` exist to make sure they do. The booth is the exception,
 * and it is an exception with a reason: it is meant to read as a piece of
 * studio equipment sitting inside the app, identical on every theme somebody
 * picks. So it carries `data-booth`, and `globals.css` gives that a fixed
 * dark ramp.
 *
 * That also repairs something nobody had said out loud: the booth's markup
 * was written against a dark theme, and the theme the app ships is LIGHT and
 * inverts the surface ramp — so `bg-zinc-950` resolved to 250 250 249. The
 * pro booth has been a white room.
 *
 *   npm run check:boothline
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const line = readFileSync('app/components/BoothTimeline.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');

/* ── One axis ─────────────────────────────────────────────────────────── */
ok(
  'the ruler and every lane sit in one grid column',
  /gridTemplateColumns: `\$\{GUTTER\}px 1fr`/.test(line),
  'a per-row axis is a per-row pixels-per-second, which is what made a ruler useless',
);
ok(
  '  and every cell names its own row and column',
  /gridColumn: 1, gridRow: 1,/.test(line) &&
    /gridColumn: 2, gridRow: 1,/.test(line) &&
    /gridColumn: 1,\n\s*gridRow: index \+ 2,/.test(line) &&
    /gridColumn: 2,\n\s*gridRow: index \+ 2,/.test(line),
  'the playhead is placed explicitly, so anything left to auto-flow is pushed around it into an implicit third column',
);
ok(
  '  and the playhead is drawn in that same column, across every lane',
  /gridColumn: 2, gridRow: `1 \/ span \$\{lanes\.length \+ 1\}`/.test(line),
);
ok(
  '  with a head big enough for a thumb to catch',
  /h-7 w-7 touch-none/.test(line),
  'Carli asked for a line a finger can catch; a 2-pixel line is not one',
);
ok(
  '  and the whole ruler scrubs, not only the head',
  /onPointerDown=\{\(event\) => \{\s*grab\(event\);\s*held\.current = \{ what: 'head' \};\s*onSeek\(/.test(line),
);

/* ── And only one of it ───────────────────────────────────────────────── */
ok(
  'the lane rows no longer draw a waveform of their own',
  !/const canvasRef/.test(booth) && !/ref=\{stripRef\}/.test(booth),
  'two waveforms for one lane is two places to cut it and two answers about the cut',
);
ok(
  '  and the cut lives on the timeline with the drag',
  /what: 'cut'/.test(line) && /what: 'move'/.test(line),
);
ok(
  'a clip can be dragged the length of the song',
  /onChange\(lane\.id, \{ at: where \}\)/.test(line),
  'Carli: the added instrument sound must be draggable over the whole song',
);
ok(
  '  and it lands on the grid the room is set to',
  /snapped\(Math\.max\(-plays \+ 0\.5/.test(line),
  'a clip dragged to the bar line and a take recorded at it have to agree',
);

/* ── The readout above it ─────────────────────────────────────────────── */
ok(
  'the time in the song is right above the timeline',
  /\{clock\(at\)\}/.test(line) && /\/ \{clock\(total\)\}/.test(line),
);
ok('  with where that is in bars and beats', /sayPlace\(placeAt\(at, meter\)\)/.test(line));
ok('  and which section of the song it is in', /\{here\.label\}/.test(line));

/* ── The room's own palette ───────────────────────────────────────────── */
ok(
  'the booth carries its own palette flag',
  /<div data-booth /.test(booth),
  'without it the room follows the theme, and the shipped theme is light',
);
ok(
  '  and the stylesheet gives that flag a fixed dark ramp',
  /\[data-booth\] \{/.test(css) && /--fb-surface-950: 15 16 21;/.test(css),
);
ok(
  '  which is dark at the 950 end, unlike the theme the app ships',
  /--fb-surface-50: 243 244 247;/.test(css),
  'a ramp that is light at 950 is the inverted light ramp, which is what made the booth white',
);
ok(
  'the timeline paints in literals rather than palette tokens',
  !/text-zinc-|bg-zinc-|text-white|bg-black/.test(line),
  'this screen must look the same on every theme, which a token cannot promise',
);

if (failures) {
  console.error(
    '\ncheck:boothline — the lanes line up because they share one grid column, not because\n' +
      'each row draws itself carefully. And the booth is the one room that must NOT follow\n' +
      'the theme: it is a piece of studio equipment, black on every theme somebody picks.\n',
  );
  process.exit(1);
}
console.log('\ncheck:boothline — one axis, one place to cut, and a room that stays black.');
