'use client';
/**
 * A bench for `maskOnto`, for audit/cutout.mjs.
 *
 * PROBE=1 only.
 *
 * ── Why this page has to exist ───────────────────────────────────────────
 *
 * The background remover has two halves and only one of them is ours. Google's
 * model decides what is a person; `maskOnto` decides what that answer does to
 * the picture. The second is ten lines and is the one that can be wrong in a
 * way nobody notices — a mask applied inside out keeps the background and
 * throws the person away, and on a dark phone screen the result still looks
 * like "a picture with something cut out of it".
 *
 * It cannot be tested through the photo editor, because the model finds no
 * person in anything that can be drawn in a canvas: it is trained on
 * photographs and a flat rectangle, a gradient and a drawn figure all come
 * back as nobody. That is correct behaviour and it leaves the compositing
 * unexercised.
 *
 * So the mask is made by hand here — left half opaque, right half clear —
 * and the one real function is called with it. The numbers go into the DOM
 * for the walk to read.
 */
import React, { useEffect, useState } from 'react';
import { EDGES, SOFTNESS, maskOnto, shareKept } from '../lib/cutout';

const SIDE = 200;

export default function CutCheck(): React.ReactElement {
  const [said, setSaid] = useState<string>('');

  useEffect(() => {
    /* A picture that is entirely one colour, so every surviving pixel is
       known, and a mask that keeps exactly the left half. */
    const picture = document.createElement('canvas');
    picture.width = SIDE;
    picture.height = SIDE;
    const paint = picture.getContext('2d');
    if (!paint) return;
    paint.fillStyle = '#ff0000';
    paint.fillRect(0, 0, SIDE, SIDE);

    const mask = document.createElement('canvas');
    mask.width = SIDE;
    mask.height = SIDE;
    const draw = mask.getContext('2d');
    if (!draw) return;
    /* Left half white and opaque, right half left as it was made: entirely
       transparent. `destination-in` reads the mask's ALPHA, so this is the
       shape the real model's mask has once its grey is resolved. */
    draw.fillStyle = '#ffffff';
    draw.fillRect(0, 0, SIDE / 2, SIDE);

    const out = maskOnto(picture, mask, SIDE, SIDE);
    const read = out.getContext('2d', { willReadFrequently: true });
    if (!read) return;
    const { data } = read.getImageData(0, 0, SIDE, SIDE);

    let keptLeft = 0;
    let keptRight = 0;
    let colourChanged = 0;
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % SIDE;
      if (data[i + 3] > 128) {
        if (x < SIDE / 2) keptLeft += 1; else keptRight += 1;
        if (data[i] < 200 || data[i + 1] > 60 || data[i + 2] > 60) colourChanged += 1;
      }
    }

    /* ── A SMALL mask on a big picture, which is the real case ───────
 
       Carli, 7 October 2026, on a photograph of herself: *"Its not looking
       perfect."* The model answers at 256 by 256 whatever it is given, so on
       a phone photograph one mask pixel covers a block ten or more across —
       and stretched hard that is a staircase with streaks.
 
       Twenty against two hundred here, which is the same ten-to-one. What is
       measured is the SOFTNESS of the edge: how many pixels come out part
       way between kept and gone. A hard stretch gives almost none. */
    const small = document.createElement('canvas');
    small.width = 20;
    small.height = 20;
    const rough = small.getContext('2d');
    if (!rough) return;
    rough.fillStyle = '#ffffff';
    rough.fillRect(0, 0, 10, 20);

    /** How many pixels of an edge are part way between kept and gone. */
    const softnessOf = (amount: number): number => {
      const made = maskOnto(picture, small, SIDE, SIDE, amount);
      const look = made.getContext('2d', { willReadFrequently: true });
      if (!look) return -1;
      const got = look.getImageData(0, 0, SIDE, SIDE).data;
      let band = 0;
      for (let i = 0; i < got.length; i += 4) {
        if (got[i + 3] > 10 && got[i + 3] < 245) band += 1;
      }
      return band;
    };
    /* Nought is what shipped: the mask stretched with no feather at all. */
    const edges = [0, ...EDGES.map((one) => one.soft)].map(softnessOf);

    const soft = maskOnto(picture, small, SIDE, SIDE);
    const seen = soft.getContext('2d', { willReadFrequently: true });
    if (!seen) return;
    const blown = seen.getImageData(0, 0, SIDE, SIDE).data;
    let edge = 0;
    let keptFar = 0;
    let goneFar = 0;
    for (let i = 0; i < blown.length; i += 4) {
      const a = blown[i + 3];
      const x = (i / 4) % SIDE;
      if (a > 10 && a < 245) edge += 1;
      /* Well away from the seam, so the feather cannot reach. */
      if (x < SIDE * 0.3 && a > 245) keptFar += 1;
      if (x > SIDE * 0.7 && a < 10) goneFar += 1;
    }

    /* And the pure half, with arrays made here rather than by a model. */
    const allOn = new Uint8ClampedArray(400).fill(255);
    const allOff = new Uint8ClampedArray(400).fill(0);
    const half = new Uint8ClampedArray(400);
    for (let i = 0; i < half.length; i += 4) half[i] = i < half.length / 2 ? 255 : 0;

    setSaid(JSON.stringify({
      keptLeft,
      keptRight,
      colourChanged,
      side: SIDE,
      allOn: shareKept(allOn),
      allOff: shareKept(allOff),
      half: shareKept(half),
      empty: shareKept(new Uint8ClampedArray(0)),
      edge,
      keptFar,
      goneFar,
      softness: SOFTNESS,
      edges,
      softest: Math.max(...EDGES.map((one) => one.soft)),
    }));
  }, []);

  return <pre data-cutcheck>{said}</pre>;
}
