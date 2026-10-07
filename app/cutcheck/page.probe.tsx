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
import { maskOnto, shareKept } from '../lib/cutout';

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
    }));
  }, []);

  return <pre data-cutcheck>{said}</pre>;
}
