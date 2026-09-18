'use client';

/**
 * The line being sung, in a block that is the same height all the way through.
 *
 * ── The report this exists to answer ─────────────────────────────────────
 *
 * Carli, 17 September 2026: *"Die record skerm in Probooth moet hard wees en
 * nie beweeg nie. Huidiglik hop alles rond."* That was answered once, by
 * taking the paragraph out of the read-the-words row, and `check:recordroom`
 * holds it. That check says out loud what it does not claim: *"'Alles hop
 * rond' may have more than this one cause."*
 *
 * It did. Carli, 18 September 2026, still: *"Hierdie skerm is nogsteeds nie
 * hard nie. Die skerm spring rond soos wat die woorde meer en minder is."*
 *
 * The words themselves were the rest of it, and she named the mechanism
 * exactly: the block got taller and shorter as the lines got longer and
 * shorter, and everything under it moved.
 *
 * ── Five separate things were changing height, on their own timetable ────
 *
 *   · the line above, which is absent on the first line of a song;
 *   · the line being sung, which wraps to one line or two depending on how
 *     many words are in it — the one she can see happening;
 *   · the line below, which is absent on the last line;
 *   · the run-up bar, which appears four seconds before every line and goes
 *     again the moment it starts — so it alone moves the screen twice per
 *     line, all the way down a song;
 *   · the count-in, which is a whole extra row for three seconds.
 *
 * And the container above this one is `justify-center`, so every one of those
 * moved the words in BOTH directions: half the change up, half down. A line
 * that grew by one row shifted the line being read by half a row while it was
 * being read.
 *
 * ── So nothing here is sized by its contents ─────────────────────────────
 *
 * Three slots, and the slots are the same size whatever is in them:
 *
 *   · one line above, exactly one line tall, cut off rather than wrapped;
 *   · the line being sung, exactly two lines of its own size tall, with the
 *     text centred in that space and clamped to two lines;
 *   · one line below, exactly one line tall, cut off rather than wrapped.
 *
 * An empty slot keeps a non-breaking space in it, so the first and last lines
 * of a song sit where every other line sits.
 *
 * The count-in goes INSIDE the slot the line being sung uses, rather than
 * above it. It is not an extra row; it is what that space says for three
 * seconds. And the run-up bar keeps its row at all times and is merely
 * invisible when there is nothing to count down, which costs six pixels and
 * buys a screen that does not move.
 *
 * ── Two lines, and why not three ─────────────────────────────────────────
 *
 * A reserved height is a floor and a ceiling at once: reserve three and a
 * one-line lyric sits in a hole, reserve one and a long line is cut in half.
 * Two is what the clamp already produces at the top of its range on a phone
 * — `clamp(1.35rem, 5.2vh, 3rem)` against a 390-pixel screen — so two is what
 * the room was already giving the words on the lines that are long. Nothing
 * is lost that was not already being lost; what changes is that the short
 * lines now cost the same as the long ones.
 *
 * ── Its own file, so it can be measured ──────────────────────────────────
 *
 * This was sixty lines inside `VocalBooth`, which needs a track, a
 * microphone and a decoded song before it will draw anything. A claim about
 * height has to be measured in a browser, and a probe that has to sing to
 * reach the thing it measures does not get written. Out here,
 * `app/probe-sungwords` can drive it through a dozen lines of wildly
 * different lengths and watch whether anything moves.
 */

import React from 'react';
import Hint from './Hint';
import { useLang } from '../lib/i18n';
import type { TimedLine } from '../lib/timeline';

/**
 * The size of the line being sung.
 *
 * Exported because the slot's height is derived from it and the probe
 * asserts the relationship. Two numbers that must agree, written once.
 */
export const SUNG_SIZE = 'clamp(1.35rem, 5.2vh, 3rem)';
/** `leading-tight` × two lines. */
export const SUNG_LINES = 2.5;

/** So an empty slot is exactly as tall as a full one. */
const BLANK = ' ';

export interface SungWordsProps {
  readonly lines: readonly TimedLine[];
  /** Index into `lines`, or -1 when the playhead is between lines. */
  readonly current: number;
  readonly next: TimedLine | undefined;
  /** Seconds until the next line starts. `Infinity` when there is none. */
  readonly untilNext: number;
  readonly counting: boolean;
  readonly count: number;
  /** Whether the song has been split, which takes the AI voice off it. */
  readonly split: boolean;
}

export default function SungWords({
  lines,
  current,
  next,
  untilNext,
  counting,
  count,
  split,
}: SungWordsProps): React.ReactElement {
  const { t } = useLang();

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[7rem] flex-col items-center justify-center gap-3 px-6 py-4 text-center">
        <p className="max-w-md text-base leading-relaxed text-zinc-500">
          {t(
            'booth.noWords',
            'This song has no words on it, so there is nothing to follow. Sing anyway — the waveform and the note still work.',
          )}
        </p>
      </div>
    );
  }

  /* Always something to read: the line you are in, or the one you are about
     to be in. "Ready" only when the song is over. */
  const sung = current >= 0 ? lines[current].text : next ? next.text : t('booth.ready', 'Ready');
  const before = !counting && current > 0 ? lines[current - 1].text : BLANK;
  const after = current >= 0 && next ? next.text : BLANK;
  /* The bar keeps its row whether or not it has anything to say. */
  const runUp = untilNext < 4 ? Math.max(0, Math.min(100, (1 - untilNext / 4) * 100)) : 0;

  return (
    <div
      data-words
      className="flex flex-col items-center gap-3 px-6 py-4 text-center"
      style={{ ['--sung' as string]: SUNG_SIZE }}
    >
      {/* The line before. One line, always. */}
      <p data-slot="before" className="h-6 w-full max-w-3xl truncate text-base leading-6 text-zinc-600">
        {before}
      </p>

      {/* The line being sung, or the count. Two lines of its own size, always. */}
      <div
        data-slot="sung"
        className="flex w-full max-w-4xl items-center justify-center overflow-hidden"
        style={{ height: `calc(var(--sung) * ${SUNG_LINES})` }}
      >
        {counting ? (
          <span className="text-5xl font-black leading-none text-emerald-400 tabular-nums">{count}</span>
        ) : (
          <p className="line-clamp-2 font-black leading-tight text-white" style={{ fontSize: 'var(--sung)' }}>
            {sung}
          </p>
        )}
      </div>

      {/* The line after. One line, always. */}
      <p data-slot="after" className="h-7 w-full max-w-3xl truncate text-lg leading-7 text-zinc-500">
        {after}
      </p>

      {/* The run-up. A bar that empties is easier to sing to than a number.

          Kept in the layout at all times rather than mounted four seconds
          before each line: a six-pixel row that comes and goes twice a line
          is the single busiest source of movement on this screen. */}
      <div
        data-slot="runup"
        className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-800"
        style={{ opacity: untilNext < 4 ? 1 : 0 }}
        aria-hidden
      >
        <div className="h-full bg-emerald-400 transition-none" style={{ width: `${runUp}%` }} />
      </div>

      {/* The AI singer is on this backing, and nothing said so.

          Singing along with it is the whole point of a guide vocal — it is
          how you learn where the lines fall — and it has worked from the
          first day, because an unsplit song plays exactly as it was
          generated. But the only control for it, the "AI voice in your ear"
          fader, appears after the song is split. So the one state where the
          AI voice is definitely playing was the one state that never
          mentioned it, and people concluded the feature was gone.

          It used to be hidden during the count-in as well, which meant it
          arrived on the screen at the exact moment recording started and
          shoved the first line down. It is a fact about the backing, not
          about the phase, so it now says so throughout. */}
      {!split && (
        <p className="flex max-w-md items-center gap-1 text-sm leading-snug text-emerald-400/80">
          {t('booth.withAi', 'The AI singer is on this backing — sing along with it.')}
          <Hint>
            {t(
              'booth.withAiWhy',
              'An unsplit song plays as it was made, voice and all, which is what makes it a guide. On headphones your take comes back with only your voice on it. Out loud, the microphone hears the AI singer too — split the song below to take that voice out of the backing.',
            )}
          </Hint>
        </p>
      )}
    </div>
  );
}
