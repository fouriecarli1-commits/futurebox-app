'use client';

/**
 * The pictures along one block on the clock.
 *
 * The owner, 8 October 2026: *"Hoe moontlik is dit om die video se visuals op die
 * tydlyn te wys? Dit gaan dit makliker maak om te weet waar om te cut ens."*
 *
 * The arithmetic — how many, taken from where, remembered under what — is in
 * `lib/filmstrip.ts` where `check:filmstrip` drives it. This is the part that
 * needs a browser: it decodes, it remembers, and it gets out of the way.
 *
 * ── Three things it must not do ──────────────────────────────────────────
 *
 * **It must not be in the way of a press.** The block is a button and the
 * strip is underneath it; `pointer-events: none` means a thumb aiming at the
 * block never lands on a picture instead.
 *
 * **It must not decode twice.** Blocks remount constantly — every trim, every
 * reorder, every play tick re-renders the strip — and decoding a dozen frames
 * on each of those would make the room unusable while it looked like it was
 * working. The cache is module-level for that reason: it outlives the
 * component, because the component dies all the time.
 *
 * **It must not hold the room up.** Decoding happens after paint and the
 * block is perfectly usable without it; the pictures arrive when they arrive.
 * A block whose material will not decode simply stays as it was, which is
 * what every block looked like until today.
 */

import React, { useEffect, useState } from 'react';
import { FRAME_WIDE, howMany, stripFor, stripKey } from '../lib/filmstrip';

/**
 * Strips already decoded, by key.
 *
 * Module-level, so it survives the remounts described above. Capped, because
 * a long afternoon of cutting would otherwise hold every frame of every trim
 * she has tried — each strip is a dozen small JPEGs as data URLs, and the
 * ones worth keeping are the ones on screen.
 */
const REMEMBERED = new Map<string, string[]>();

/** How many strips are kept. A dozen blocks on screen, a few zoom levels. */
const KEEP = 48;

/** Keys currently being decoded, so two blocks never race the same work. */
const BUSY = new Set<string>();

/* Named `keepStrip` rather than `remember`, which is what `lib/makes.ts`
   and `lib/dubjob.ts` call the functions that write to IndexedDB. Nothing
   here is filed anywhere — these pictures live for as long as the tab does
   and are decoded again from material already present. `check:onthisdevice`
   read the collision as this room filing something and saying nothing about
   where it went, and a reader would make the same mistake. */
function keepStrip(key: string, shots: string[]): void {
  if (REMEMBERED.size >= KEEP) {
    /* Oldest first. A Map keeps insertion order, so the first key is the one
       longest unused — good enough, and a real LRU here would be bookkeeping
       on every render for a cache of forty-eight. */
    const oldest = REMEMBERED.keys().next().value;
    if (oldest !== undefined) REMEMBERED.delete(oldest);
  }
  REMEMBERED.set(key, shots);
}

export default function FilmStrip({
  clip,
  clipId,
  from,
  to,
  wide,
  tall,
}: {
  readonly clip: Blob;
  /** Stable for this piece, so a trim is a different strip. */
  readonly clipId: string;
  readonly from: number;
  readonly to: number;
  /** The block's width in pixels, which decides how many pictures fit. */
  readonly wide: number;
  readonly tall: number;
}): React.ReactElement | null {
  const count = howMany(wide);
  /* Drawn at the size each picture is shown, times the screen's own density.
     The owner, 30 October 2026: *"Daai prent is baie swak kwaliteit en blurry.
     Mens kan eintlik nie sien waar mens in die video is nie."* Every picture
     was drawn 48 by 27 and stretched over a lane up to 180 tall, on a screen
     with three pixels to every one. Rounded to a step of 16 so a lane being
     dragged taller does not redraw the strip on every pixel. */
  const dense = typeof window === 'undefined' ? 1 : Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const step = (v: number): number => Math.max(16, Math.ceil(v / 16) * 16);
  const pixWide = step((Math.max(1, wide) / count) * dense);
  const pixTall = step(Math.max(1, tall) * dense);
  const key = `${stripKey(clipId, from, to, count)}|${pixWide}x${pixTall}`;
  const [shots, setShots] = useState<string[]>(() => REMEMBERED.get(key) ?? []);

  useEffect(() => {
    const had = REMEMBERED.get(key);
    if (had) {
      setShots(had);
      return undefined;
    }
    setShots([]);
    if (BUSY.has(key)) return undefined;
    let alive = true;
    BUSY.add(key);
    void (async () => {
      try {
        const got = await stripFor(clip, from, to, count, pixWide, pixTall);
        if (got.length) keepStrip(key, got);
        if (alive) setShots(got);
      } catch {
        /* A block with no pictures is the block this room had yesterday. */
      } finally {
        BUSY.delete(key);
      }
    })();
    return () => { alive = false; };
  }, [key, clip, from, to, count, pixWide, pixTall]);

  if (shots.length === 0) return null;

  return (
    <span
      aria-hidden="true"
      data-filmstrip={shots.length}
      className="pointer-events-none absolute inset-0 flex overflow-hidden rounded-lg"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 z-[1] h-1/2 bg-linear-to-b from-black/70 to-transparent" />
      {shots.map((one, at) => (
        <span
          key={`${key}-${at}`}
          className="h-full flex-1 bg-cover bg-center"
          style={{
            backgroundImage: `url(${one})`,
            /* Nearly full strength since 30 October 2026, so it can be read
               where the film is; the words over it get a dark band of their
               own instead (below). */
            opacity: 0.9,
            minWidth: 0,
          }}
        />
      ))}
    </span>
  );
}

export { FRAME_WIDE };
