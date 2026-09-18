'use client';
/**
 * The words block, in every state it has, side by side, for `audit/wordsteady.mjs`.
 *
 * PROBE=1 only.
 *
 * ── Why a page and not a source check ────────────────────────────────────
 *
 * `check:recordroom` reads `VocalBooth.tsx` and holds the one cause Carli
 * named in September: the read-the-words row. It says out loud what it does
 * not claim — *"'Alles hop rond' may have more than this one cause"* — and
 * the rest of it turned out to be the words themselves. A source check could
 * not have found that, because the question is not which classes are written
 * down; it is how tall the block comes out when a line has nine words in it
 * instead of two. That is a browser question.
 *
 * ── Why the real room is not what is measured ────────────────────────────
 *
 * `VocalBooth` needs a track, a decoded song and a microphone before it
 * draws a word. A probe that has to sing to reach the thing it measures is a
 * probe nobody writes, which is exactly why this was never measured. So the
 * block is its own component and this page drives it directly — the real
 * one, not a copy of it, or this would agree with itself and nothing else.
 *
 * ── What each frame is ───────────────────────────────────────────────────
 *
 * A phone-width column shaped exactly like the room around it: a scroller
 * that centres its contents, the words in it, and a marker straight after
 * standing in for the "Listening…" strip. Every state the block has is one
 * frame, and the assertion is that the marker sits at the same pixel in all
 * of them — because a block that changes height moves what is under it, and
 * being centred, it moves the words themselves by half as much again.
 */
import React from 'react';
import SungWords from '../components/SungWords';
import type { TimedLine } from '../lib/timeline';

const line = (text: string, start: number): TimedLine => ({
  text,
  section: 'verse',
  opensSection: false,
  start,
  end: start + 3,
});

/* Deliberately uneven. Two words, then a line that cannot fit on one row at
   390 pixels, then one word — the shape that makes the block breathe. */
const LINES: TimedLine[] = [
  line('Ons roep', 0),
  line('Want ons kan, want ons leef, en ons sing dit elke aand tot die son weer opkom', 3),
  line('Nou', 6),
  line('Dis alles wat ons het', 9),
];

interface Scene {
  readonly id: string;
  readonly current: number;
  readonly next: TimedLine | undefined;
  readonly untilNext: number;
  readonly counting: boolean;
  readonly count: number;
}

const SCENES: readonly Scene[] = [
  /* The first line of a song: nothing above it. */
  { id: 'first', current: 0, next: LINES[1], untilNext: 9, counting: false, count: 0 },
  /* The one she can see happening: a line that wraps. */
  { id: 'long', current: 1, next: LINES[2], untilNext: 9, counting: false, count: 0 },
  /* And straight back to one word. */
  { id: 'short', current: 2, next: LINES[3], untilNext: 9, counting: false, count: 0 },
  /* The last line: nothing below it. */
  { id: 'last', current: 3, next: undefined, untilNext: Infinity, counting: false, count: 0 },
  /* Between lines, which is most of a song. */
  { id: 'between', current: -1, next: LINES[1], untilNext: 6, counting: false, count: 0 },
  /* The run-up bar showing, which happens twice a line. */
  { id: 'runup', current: 1, next: LINES[2], untilNext: 1.2, counting: false, count: 0 },
  /* Counting in. */
  { id: 'counting', current: -1, next: LINES[0], untilNext: 2, counting: true, count: 3 },
];

function Frame({ scene }: { scene: Scene }): React.ReactElement {
  return (
    <div
      data-frame={scene.id}
      style={{ width: 390, height: 520, display: 'flex', flexDirection: 'column', background: '#09090b' }}
    >
      {/* The same two wrappers the room puts around it. The outer one
          scrolls; the inner one centres, which is what turns a change in
          height into a change in position. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center">
          <SungWords
            lines={LINES}
            current={scene.current}
            next={scene.next}
            untilNext={scene.untilNext}
            counting={scene.counting}
            count={scene.count}
            split={false}
          />
          {/* Standing in for the strip that follows the words in the room. */}
          <div data-below={scene.id} className="px-5 text-sm text-zinc-500">
            Listening…
          </div>
        </div>
      </div>
    </div>
  );
}

export default function P(): React.ReactElement {
  return (
    <div className="p-4">
      <p id="ready">sungwords</p>
      <div className="flex flex-wrap gap-4">
        {SCENES.map((scene) => (
          <Frame key={scene.id} scene={scene} />
        ))}
      </div>
    </div>
  );
}
