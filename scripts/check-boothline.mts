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
  /* `1fr` became a width in pixels on 18 September, when the timeline learned
     to zoom: `1fr` means "what is left of the box", and the whole point of a
     zoom is to be WIDER than the box. The property is unchanged and is the
     one this file exists for — the ruler and every lane are still two cells
     of one column, so they cannot disagree about where a second is. What is
     pinned here is that there are exactly two columns and the second is one
     value shared by all of them. */
  /gridTemplateColumns: `\$\{GUTTER\}px \$\{axisWide\}px`/.test(line) &&
    /const axisWide = Math\.max\(1, Math\.round\(room \* zoom\)\)/.test(line),
  'a per-row axis is a per-row pixels-per-second, which is what made a ruler useless',
);
ok(
  '  and every cell names its own row and column',
  /* The corner cell's style object went multi-line again when it was pinned
     to the left edge for the sideways scroll, so this is matched per property
     like the three below it rather than as one line of source. */
  /gridColumn: 1,\n\s*gridRow: 1,/.test(line) &&
    /* The ruler's cell grew a conditional background when the marker was
       added, so its style object is written over several lines now. The rule
       is that the cell NAMES its row and column, not that both sit on one
       line — matched per property, which is what was ever meant. */
    /gridColumn: 2,\n?\s*gridRow: 1,/.test(line) &&
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
/* The ruler's press used to be four lines and this was a four-line regex.
   It is not any more: armed, the same drag marks a piece of the song instead
   of scrubbing, so the press has a branch in front of it. The rule being kept
   is unchanged — a press anywhere on the ruler moves the line, because a thumb
   aiming at a 2-pixel head misses — so the match is on the two statements
   that carry it rather than on their exact neighbourhood. */
ok(
  '  and the whole ruler scrubs, not only the head',
  /held\.current = \{ what: 'head' \};\s*onSeek\(Math\.max\(0, Math\.min\(total, secondsAt\(event\.clientX\)\)\)\);\s*\}\}/.test(line),
);
ok(
  '  and armed, that same drag marks a piece instead of scrubbing',
  /if \(marking\) \{/.test(line) && /what: 'region', anchor: where/.test(line),
  'Carli asked for dragging lines that single a piece out; one button says which of the two the ruler is doing',
);
ok(
  '  and the marked piece is drawn across every lane, not inside one',
  /region && region\.to - region\.from > 0\.01/.test(line) &&
    /gridColumn: 2, gridRow: `1 \/ span \$\{lanes\.length \+ 1\}`/.test(line),
  'a piece of a song is a piece of the song; which lane it acts on is the lane that is open',
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
/* Both of these were written against the exact expression the move used
   when there was one lane to move. The interlock made it a group — the
   clamp is on the SHIFT now and not on one lane's position, and the result
   goes through `onSlide` rather than `onChange` so it is not rounded a
   second time per lane. The properties are the same two; the lines they
   live on are not. Re-pinned rather than deleted, because both are things
   she asked for and reported. */
ok(
  'a clip can be dragged the length of the song',
  /onSlide\(now\.with\.map\(\(one\) => \(\{ id: one\.id, at: one\.at \+ shift \}\)\)\)/.test(line) &&
    /low = Math\.max\(low, -one\.plays \+ 0\.5 - one\.at\)/.test(line),
  'Carli: the added instrument sound must be draggable over the whole song',
);
ok(
  '  and it lands on the grid the room is set to',
  /const byStart = pullTo\(wanted, grid\(wanted\), points, reach\)/.test(line) &&
    /snap === 'off' \? null : snapped\(seconds, meter, snap\)/.test(line),
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
  /* Matched wherever the attribute sits on the tag. It used to be
     `<div data-booth ` with the class on the same line; the room's root
     className became a template literal when the sideways layout gave it a
     direction, which put every attribute on a line of its own and made this
     read as the palette flag having been removed. The property is that the
     room's root carries the flag, not how prettier laid the tag out. */
  /<div\s+data-booth\b/.test(booth),
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
