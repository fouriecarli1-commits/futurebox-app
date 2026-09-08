'use client';

/**
 * The take you just sang, written on a stave.
 *
 * ── What it is, and what it deliberately is not ──────────────────────────
 *
 * `docs/MUSIEKDENKE.md` §3.4. Not a lesson and not a test — the notes that
 * came out of your own mouth, engraved the way a musician would engrave them,
 * next to the take. Nobody has to be able to read it. Somebody who records
 * forty takes will start to read the shape of a line anyway, which is the
 * whole idea and the reason it is called silent.
 *
 * It is **not a score to sing from**. It is a reading of what was sung, after
 * the fact, and `lib/melody.ts` decides whether the reading is trustworthy
 * enough to exist at all — a full mix does not pass that gate and never
 * reaches this file.
 *
 * ── Why it is drawn rather than typeset ──────────────────────────────────
 *
 * The Unicode musical symbols (U+1D11E and friends) are the obvious way to
 * put a clef on a page and are the wrong one: they need a music font
 * installed, and on a phone without one they come out as a box or nothing at
 * all. A stave whose clef is a box on the device most people use is not a
 * stave. So the clefs are SVG paths, the noteheads are ellipses and the stems
 * are lines, and the picture is the same everywhere.
 *
 * The noteheads are drawn at the right pitch and in the right order, sized by
 * their written value, and the line is laid out in time rather than in even
 * columns — a long note takes more of the page than a short one, which is
 * what makes the rhythm visible as well as the tune. It is not a full
 * engraving: there are no bar lines, no beams and no rests, and it does not
 * claim to be a part somebody could hand a session player.
 */

import React from 'react';
import { engrave, type Heard } from '../lib/notation';
import { useLang } from '../lib/i18n';
import Hint from './Hint';

/** Half the gap between two stave lines, which is one diatonic step. */
const STEP = 5;
/** The five lines, top to bottom, as y offsets from the top line. */
const LINES = [0, 1, 2, 3, 4];
const TOP = 26;
/** The stave is eight steps tall; ledger lines need room above and below. */
const HEIGHT = TOP + 8 * STEP + 34;

/* Where each sharp and flat sits in a key signature, in steps above the
   bottom line, for each clef. These are conventions rather than derivations:
   the order is fixed and so are the octaves the symbols are drawn in. */
const SHARP_STEPS: Record<string, number[]> = {
  treble: [8, 5, 9, 6, 3, 7, 4],
  bass: [6, 3, 7, 4, 1, 5, 2],
};
const FLAT_STEPS: Record<string, number[]> = {
  treble: [4, 7, 3, 6, 2, 5, 1],
  bass: [2, 5, 1, 4, 0, 3, -1],
};

/** A treble clef, and a bass clef, as paths rather than as font characters. */
const CLEFS: Record<string, { d: string; transform: string }> = {
  treble: {
    d: 'M8.6 41.6c-3.1 0-5.6-2.5-5.6-5.6 0-3 2.4-5.4 5.4-5.4.5 0 1 .1 1.4.2l-.9-5.4C5.3 22.6 2 19.2 2 14.6 2 10 5 6.4 8.4 2.6c.4-.4.8-.4 1.1.1 1.5 2.3 2.4 5 2.4 7.7 0 3.6-1.6 6.4-4.2 9.1l.6 3.6c.5-.1 1-.1 1.5-.1 4.5 0 8 3.4 8 7.8 0 3.9-2.6 6.9-6.2 7.7l.6 3.5c.1.6.2 1.3.2 1.9 0 3.3-2.4 5.6-5.6 5.6-2.6 0-4.6-1.6-4.6-3.8 0-1.5 1.1-2.6 2.6-2.6 1.4 0 2.4 1 2.4 2.4 0 1.3-.9 2.2-2.1 2.3.6.5 1.4.8 2.2.8 2.1 0 3.6-1.6 3.6-3.9 0-.5-.1-1.1-.2-1.6l-.5-3.2c-.6.1-1.2.2-1.8.2zm1.6-1.1c2.6-.7 4.4-3 4.4-5.9 0-3.2-2.5-5.7-5.9-5.7-.3 0-.7 0-1 .1l2.5 11.5zM9.6 5.1c-2 2.1-3.4 4.5-3.4 7.2 0 2.9 1.9 5.2 4.4 6.4 1.8-2.2 2.9-4.4 2.9-7 0-2.4-1.3-5-2.9-6.6-.3-.3-.7-.3-1 0zM7.9 32.6c-2.1.4-3.6 2.1-3.6 4.2 0 2.2 1.7 3.9 3.9 3.9.4 0 .8-.1 1.2-.2L7.9 32.6z',
    transform: `translate(2, ${TOP - 24}) scale(0.62)`,
  },
  bass: {
    d: 'M4 6.5C4 3 7 0 11.5 0 17 0 21 4 21 10.5 21 22 12 29 3.5 33.5c-.7.4-1.2-.4-.6-.9C10 27 17.5 21 17.5 12.5c0-5-2.5-8.5-6-8.5-2.5 0-4.5 1.8-4.5 4 0 .6.1 1.1.3 1.6 1-.8 1.9-1.1 2.9-1.1 2 0 3.5 1.5 3.5 3.5S12.2 15.5 10 15.5C6.5 15.5 4 12.5 4 8.5v-2zM25.5 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 10a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
    transform: `translate(3, ${TOP - 2}) scale(0.55)`,
  },
};

export default function Staff({
  notes,
  musicKey = '',
  bpm = 100,
  className = '',
}: {
  readonly notes: readonly Heard[];
  /** What `Track.key` holds — "A Minor". '' when nobody worked it out. */
  readonly musicKey?: string;
  readonly bpm?: number;
  readonly className?: string;
}): React.ReactElement | null {
  const { t } = useLang();
  const score = engrave(notes, { key: musicKey, bpm });
  /* Nothing read, nothing drawn. An empty stave says "this is a stave with no
     notes on it", which is a different and untrue claim from "the reading was
     not clear enough", and the room says the second one itself. */
  if (!score.notes.length) return null;

  const clef = CLEFS[score.clef];
  const accidentals = score.signature > 0
    ? SHARP_STEPS[score.clef].slice(0, score.signature).map((step) => ({ step, mark: '♯' }))
    : FLAT_STEPS[score.clef].slice(0, -score.signature).map((step) => ({ step, mark: '♭' }));

  /** Where the music starts, after the clef and the key signature. */
  const left = 34 + accidentals.length * 7;
  const right = 12;
  /* Laid out in time, so a long note takes more of the page than a short one.
     A per-note column would draw a waltz and a march identically. */
  const span = Math.max(0.5, score.seconds);
  const width = 1000;
  const x = (second: number) => left + ((width - left - right) * second) / span;
  const y = (step: number) => TOP + (8 - step) * STEP;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-sm font-semibold text-zinc-300">{t('staff.title', 'What you sang')}</span>
        <span className="text-xs text-zinc-500">
          {t('staff.sub', 'The notes this app heard in your take, written down.')}
        </span>
        {/* `docs/MUSIEKDENKE.md` §3.5: the term, explained once, where it is.

            The stave is the one thing built out of that document that names
            something without saying what it is — every reading in
            `WhatWeHeard` is its own explanation, and "verse–chorus" carries
            its meaning in the words. Five lines and four spaces does not.
            Two sentences, behind a mark, for the one time somebody wonders. */}
        <Hint>
          {t(
            'staff.what',
            'Five lines and the four spaces between them. Higher on the page is a higher note, and the sign at the front says which notes the song sharpens or flattens all the way through. Nothing here needs reading to use the app.',
          )}
        </Hint>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={`${t('staff.title', 'What you sang')}: ${score.notes.map((one) => one.name).join(', ')}`}
        >
          {LINES.map((line) => (
            <line
              key={line} x1={4} x2={width - 4}
              y1={TOP + line * 2 * STEP} y2={TOP + line * 2 * STEP}
              stroke="currentColor" strokeWidth={1} className="text-zinc-500"
            />
          ))}

          <path d={clef.d} transform={clef.transform} fill="currentColor" className="text-zinc-300" />

          {accidentals.map((one, index) => (
            <text
              key={`${one.mark}-${index}`}
              x={32 + index * 7} y={y(one.step) + 5}
              fontSize={15} fill="currentColor" className="text-zinc-300"
            >
              {one.mark}
            </text>
          ))}

          {score.notes.map((one, index) => {
            const cx = x(one.from);
            const cy = y(one.step);
            /* Ledger lines: a note past either end of the stave needs the
               lines it would have sat on drawn under it, or it floats in
               space and cannot be read at all. */
            const ledgers: number[] = [];
            for (let step = 10; step <= one.step; step += 2) ledgers.push(step);
            for (let step = -2; step >= one.step; step -= 2) ledgers.push(step);
            const open = one.value === 'whole' || one.value === 'half';
            /* Stems point down above the middle line and up below it, which
               is what keeps a line of noteheads inside its own stave. */
            const down = one.step > 4;
            return (
              <g key={`${one.from}-${index}`}>
                {ledgers.map((step) => (
                  <line
                    key={step} x1={cx - 7} x2={cx + 7} y1={y(step)} y2={y(step)}
                    stroke="currentColor" strokeWidth={1} className="text-zinc-500"
                  />
                ))}
                {one.accidental && (
                  <text
                    x={cx - 15} y={cy + 4} fontSize={14} fill="currentColor"
                    className="text-emerald-300"
                  >
                    {one.accidental === '#' ? '♯' : one.accidental === 'b' ? '♭' : '♮'}
                  </text>
                )}
                {one.value !== 'whole' && (
                  <line
                    x1={cx + (down ? -4.6 : 4.6)} x2={cx + (down ? -4.6 : 4.6)}
                    y1={cy} y2={cy + (down ? 24 : -24)}
                    stroke="currentColor" strokeWidth={1.3} className="text-zinc-200"
                  />
                )}
                {(one.value === 'eighth' || one.value === 'sixteenth') && (
                  <path
                    d={`M${cx + (down ? -4.6 : 4.6)} ${cy + (down ? 24 : -24)} q7 4 7 10`}
                    stroke="currentColor" strokeWidth={1.3} fill="none" className="text-zinc-200"
                  />
                )}
                <ellipse
                  cx={cx} cy={cy} rx={4.6} ry={3.4} transform={`rotate(-20 ${cx} ${cy})`}
                  fill={open ? 'none' : 'currentColor'}
                  stroke="currentColor" strokeWidth={open ? 1.4 : 0}
                  className="text-zinc-100"
                />
                {one.dotted && (
                  <circle cx={cx + 9} cy={cy - (one.step % 2 === 0 ? STEP : 0)} r={1.5}
                    fill="currentColor" className="text-zinc-100" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* The names underneath, because the point is that somebody who cannot
          read the stave yet can still read this — and reading them together,
          forty takes in a row, is how the stave stops needing them. */}
      <p className="text-xs leading-snug text-zinc-500">
        {score.notes.slice(0, 24).map((one) => one.name).join(' · ')}
        {score.notes.length > 24 ? ' …' : ''}
      </p>
    </div>
  );
}
