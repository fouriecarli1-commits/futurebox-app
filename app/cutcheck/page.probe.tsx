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
import { EDGES, SOFTNESS, blurBehind, feathered, maskOnto, shareKept } from '../lib/cutout';

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
    small.width = 64;
    small.height = 64;
    const rough = small.getContext('2d');
    if (!rough) return;
    rough.fillStyle = '#ffffff';
    rough.fillRect(0, 0, 32, 64);

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

    /* ── The staircase, which is the thing she can actually see ──────
 
       Carli, 7 October 2026, twice: *"Its not looking perfect"* and then
       *"Nogsteeds rowwe edges"*. Softness was the wrong instrument — an edge
       can be soft and still be a staircase, and a staircase is what a blown
       up mask is.
 
       A DIAGONAL edge in a small mask, grown to a picture that is a
       different shape, which is the real case: the model takes a square, so
       a portrait photograph comes back with mask pixels that are taller than
       they are wide. The first feather was computed from the width alone and
       so barely blurred vertically at all — which is exactly the horizontal
       streaking along her collar.
 
       Measured as the biggest jump sideways between one row and the next
       where the edge crosses half. A staircase jumps by the scale factor; a
       real edge moves by about one. */
    /* The real proportions: the model answers at 256 square and a phone
       photograph is ten or more times that, in a shape that is not square.
       A 20-pixel mask on a 200-pixel picture is not the same problem — at
       that size a blur of half a mask pixel is sub-pixel and does nothing,
       which is how three edges came to measure identically. */
    const STAIR = 64;
    const WIDE = 480;
    const TALL = 720;
    const stair = document.createElement('canvas');
    stair.width = STAIR;
    stair.height = STAIR;
    const cut = stair.getContext('2d');
    if (!cut) return;
    cut.fillStyle = '#ffffff';
    cut.beginPath();
    cut.moveTo(0, 0);
    cut.lineTo(STAIR, STAIR);
    cut.lineTo(0, STAIR);
    cut.closePath();
    cut.fill();

    /** The biggest sideways jump between neighbouring rows of an edge. */
    const jaggedness = (grown: HTMLCanvasElement): number => {
      const look = grown.getContext('2d', { willReadFrequently: true });
      if (!look) return -1;
      const got = look.getImageData(0, 0, grown.width, grown.height).data;
      const crossing: number[] = [];
      for (let y = 0; y < grown.height; y += 1) {
        let at = -1;
        for (let x = 0; x < grown.width; x += 1) {
          if (got[(y * grown.width + x) * 4 + 3] < 128) { at = x; break; }
        }
        if (at > 2 && at < grown.width - 2) crossing.push(at);
      }
      let worst = 0;
      for (let i = 1; i < crossing.length; i += 1) {
        const jump = Math.abs(crossing[i] - crossing[i - 1]);
        if (jump > worst) worst = jump;
      }
      return crossing.length < 10 ? -1 : worst;
    };

    /* And the one that shipped: a single jump, at the browser's default
       quality, with no feather. That is the baseline the staircase has to be
       measured against — NOT "the same code with the blur set to nought",
       which still grows the mask in steps and so has no staircase either.
       Comparing against that said the feather was doing nothing, and it was
       right: the stepped growth is what kills the stairs, and the blur is
       what softens what is left. */
    const oneJump = document.createElement('canvas');
    oneJump.width = WIDE;
    oneJump.height = TALL;
    const jump = oneJump.getContext('2d');
    if (!jump) return;
    jump.imageSmoothingQuality = 'low';
    jump.drawImage(stair, 0, 0, WIDE, TALL);

    const stairs = [jaggedness(oneJump),
      ...EDGES.map((one) => jaggedness(feathered(stair, WIDE, TALL, one.soft)))];

    /* And the pure half, with arrays made here rather than by a model. */
    const allOn = new Uint8ClampedArray(400).fill(255);
    const allOff = new Uint8ClampedArray(400).fill(0);
    const half = new Uint8ClampedArray(400);
    for (let i = 0; i < half.length; i += 4) half[i] = i < half.length / 2 ? 255 : 0;

    /* ── And the blur that keeps the person sharp ─────────────────────
 
       A picture of fine vertical stripes, and a mask over the left half.
       Stripes because a blur is only visible as a loss of difference
       between neighbouring pixels, and flat colour has none to lose — a
       blur over red is red, and every reading of it would pass.
 
       So: the spread of values down a row, left and right. Behind the mask
       it must collapse; in front of it the stripes must survive exactly. */
    const striped = document.createElement('canvas');
    striped.width = SIDE;
    striped.height = SIDE;
    const bars = striped.getContext('2d');
    if (!bars) return;
    for (let x = 0; x < SIDE; x += 1) {
      bars.fillStyle = x % 4 < 2 ? '#ffffff' : '#000000';
      bars.fillRect(x, 0, 1, SIDE);
    }
    const behind = blurBehind(striped, mask, SIDE, SIDE, 6, 0);
    const readBehind = behind.getContext('2d', { willReadFrequently: true });
    if (!readBehind) return;
    const blurred = readBehind.getImageData(0, 0, SIDE, SIDE).data;
    const spread = (from: number, to: number): number => {
      let low = 255;
      let high = 0;
      const row = Math.floor(SIDE / 2);
      for (let x = from; x < to; x += 1) {
        const v = blurred[(row * SIDE + x) * 4];
        if (v < low) low = v;
        if (v > high) high = v;
      }
      return high - low;
    };
    /* Well inside each half, so the feather at the seam is not what is
       being read. */
    const sharpSide = spread(4, SIDE / 2 - 12);
    const softSide = spread(SIDE / 2 + 12, SIDE - 4);

    setSaid(JSON.stringify({
      sharpSide,
      softSide,
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
      stairs,
      scale: Math.max(WIDE / STAIR, TALL / STAIR),
    }));
  }, []);

  return <pre data-cutcheck>{said}</pre>;
}
