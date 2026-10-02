'use client';

/**
 * A block on a sound lane, with the sound's real shape drawn in it.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Die eie video se klank moet sy eie klankbaan hê, en
 * die musiek wat in gebring word moet nog 'n tydlyn wees onder die video se
 * klankbaan. Elke klankbaan moet golwe hê, sodat golwe gematch kan word wanneer
 * nodig."*
 *
 * "Sodat golwe gematch kan word" is the whole specification. A decorative
 * squiggle would be a fraction of this code and would be a picture of nothing —
 * you cannot line a drum hit up against a cut with it. So every wave here is
 * measured from the file it sits under, by `peaksOf`, which is the same reader
 * the Pro Booth's lanes use.
 *
 * ── Why the decode is cached by Blob ─────────────────────────────────────
 *
 * A three-minute track is about thirty million samples and decoding it takes
 * real time. React will re-render this lane on every scrub, every trim and
 * every keystroke in the caption box, and decoding on each of those would make
 * the room unusable within a minute of bringing a song in.
 *
 * Keyed on the Blob object itself: a new Blob is new audio and the same Blob is
 * the same audio, which is exactly the question. A `WeakMap` so a clip dropped
 * from the film does not hold its decoded peaks alive for the life of the tab.
 */

import React, { useEffect, useRef, useState } from 'react';
import { peaksOf, type Peaks } from '../lib/peaks';

const remembered = new WeakMap<Blob, Peaks>();
/** The ones already being read, so two lanes asking at once decode once. */
const reading = new WeakMap<Blob, Promise<Peaks | null>>();

async function shapeOf(blob: Blob): Promise<Peaks | null> {
  const had = remembered.get(blob);
  if (had) return had;
  const already = reading.get(blob);
  if (already) return already;
  const job = peaksOf(blob).then((got) => {
    if (got) remembered.set(blob, got);
    return got;
  });
  reading.set(blob, job);
  return job;
}

export default function WaveBlock({
  sound, wide, tall, colour, from, long,
}: {
  readonly sound: Blob;
  /** How wide the block is on the clock, in pixels. */
  readonly wide: number;
  readonly tall: number;
  readonly colour: string;
  /**
   * Where in the SOUND this block starts and how much of it is heard, in
   * seconds. A music bed dragged onto the chorus starts part-way in, and a
   * wave drawn from the top of the file would be the shape of a part of the
   * song nobody is hearing — which is worse than no wave, because it looks
   * like information.
   */
  readonly from?: number;
  readonly long?: number;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [shape, setShape] = useState<Peaks | null>(null);

  useEffect(() => {
    let alive = true;
    void shapeOf(sound).then((got) => { if (alive) setShape(got); });
    return () => { alive = false; };
  }, [sound]);

  useEffect(() => {
    const node = canvas.current;
    if (!node || !shape || wide <= 0 || tall <= 0) return;
    /* Drawn at the device's own pixels, or the wave is a blurred smear on
       every phone made since about 2014. */
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    node.width = Math.max(1, Math.round(wide * dpr));
    node.height = Math.max(1, Math.round(tall * dpr));
    const context = node.getContext('2d');
    if (!context) return;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, wide, tall);
    context.fillStyle = colour;

    const total = shape.duration > 0 ? shape.duration : 1;
    const start = Math.max(0, Math.min(from ?? 0, total));
    const span = Math.max(0.01, Math.min(long ?? (total - start), total - start));
    const middle = tall / 2;

    /* One bar per pixel column, with a one-pixel gap: a wave drawn as a filled
       shape at this height is a solid block, and what makes it readable at
       forty pixels tall is the gaps. */
    for (let x = 0; x < wide; x += 2) {
      /* Which part of the file this column is looking at. The block covers
         `span` seconds starting at `start`, however wide it happens to be
         drawn — so zooming the clock stretches the same sound rather than
         showing more of it. */
      const second = start + (x / wide) * span;
      const column = Math.min(
        shape.values.length - 1,
        Math.max(0, Math.round((second / total) * (shape.values.length - 1))),
      );
      /* A floor, so silence is a line rather than nothing: a lane that goes
         blank where a track is quiet reads as a lane with no audio in it. */
      const size = Math.max(1, shape.values[column] * (tall - 4));
      context.fillRect(x, middle - size / 2, 1, size);
    }
  }, [shape, wide, tall, colour, from, long]);

  return (
    <canvas
      ref={canvas}
      data-wave
      aria-hidden
      style={{ width: wide, height: tall, display: 'block' }}
    />
  );
}
