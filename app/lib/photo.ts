/**
 * A song from a picture — the half of it that is measurement.
 *
 * ── What this does ───────────────────────────────────────────────────────
 *
 * Reads a photograph's colour, light and busyness and turns them into style
 * words and a mood. A picture of a beach at golden hour and a picture of a
 * concrete stairwell at night are different songs, and the difference is
 * legible in the pixels: warm against cold, bright against dark, empty against
 * crowded.
 *
 * ── What it deliberately does not do ─────────────────────────────────────
 *
 * It does not know what is *in* the picture. It cannot tell a beach from an
 * orange wall, and it says so rather than guessing — "warm, bright, open"
 * describes both honestly, and a person looking at their own photograph
 * supplies the beach.
 *
 * That limit is the reason this is free and instant. Naming the subject needs
 * a model, which costs a credit and needs a key; what is here needs neither,
 * runs on the device, and never sends the picture anywhere. A photograph is a
 * personal thing and most of them have somebody's face in them.
 *
 * ── Why the maths takes pixels ───────────────────────────────────────────
 *
 * Same reason `lib/listen.ts` takes samples: a measurement that can only be
 * taken in a browser, on a real photograph, is a measurement nobody can check.
 * Everything below takes an RGBA array, so a test can build a picture whose
 * answer is known before the question is asked.
 */

/** What a picture is, in numbers. */
export interface Seen {
  /** 0–360, the dominant hue. Meaningless when `saturation` is near zero. */
  readonly hue: number;
  /** 0–1. Below about 0.12 the picture is effectively grey. */
  readonly saturation: number;
  /** 0–1, average lightness. */
  readonly brightness: number;
  /** 0–1, how far the light spreads between its darkest and brightest. */
  readonly contrast: number;
  /** 0–1, how much detail there is — an empty sky against a crowded street. */
  readonly busyness: number;
}

/**
 * Measure a picture from its pixels.
 *
 * `data` is RGBA, four bytes a pixel, as `CanvasRenderingContext2D.getImageData`
 * hands it over. Every fourth pixel is sampled on each axis: a photograph does
 * not change its character between neighbouring pixels, and sixteen times less
 * work is the difference between instant and a visible pause on a phone.
 */
export function measurePicture(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Seen {
  let count = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumLight = 0;
  let darkest = 1;
  let brightest = 0;
  let edges = 0;

  const at = (x: number, y: number) => (y * width + x) * 4;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = at(x, y);
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      /* Rec. 709 luma rather than a plain mean: the eye reads green as much
         brighter than blue, and an average that ignores that calls a deep blue
         picture "mid-bright". */
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      sumR += r;
      sumG += g;
      sumB += b;
      sumLight += light;
      if (light < darkest) darkest = light;
      if (light > brightest) brightest = light;
      count += 1;

      /* Busyness: how different this pixel is from the one four along. A sky
         is nearly zero; a market street is not. */
      if (x + 4 < width) {
        const j = at(x + 4, y);
        const other = (0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) / 255;
        if (Math.abs(other - light) > 0.08) edges += 1;
      }
    }
  }

  if (!count) {
    return { hue: 0, saturation: 0, brightness: 0, contrast: 0, busyness: 0 };
  }

  const r = sumR / count;
  const g = sumG / count;
  const b = sumB / count;
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const span = high - low;

  let hue = 0;
  if (span > 0) {
    if (high === r) hue = ((g - b) / span) % 6;
    else if (high === g) hue = (b - r) / span + 2;
    else hue = (r - g) / span + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    hue,
    saturation: high > 0 ? span / high : 0,
    brightness: sumLight / count,
    contrast: brightest - darkest,
    busyness: edges / count,
  };
}

/**
 * What that picture sounds like, as style words.
 *
 * Four or five things, in the order they matter, because the model weights the
 * front of a style list most and this is meant to sit *beside* whatever the
 * person writes rather than instead of it.
 */
export function wordsFor(seen: Seen): string[] {
  const words: string[] = [];

  /* Warm or cold, and only where there is enough colour to mean it. A
     black-and-white photograph has a hue and it is noise. */
  if (seen.saturation >= 0.12) {
    const warm = seen.hue < 70 || seen.hue > 300;
    const green = seen.hue >= 70 && seen.hue < 170;
    words.push(warm ? 'warm and golden' : green ? 'green and open' : 'cool and blue');
  } else {
    words.push('black and white, no colour');
  }

  words.push(seen.brightness > 0.6 ? 'bright and airy' : seen.brightness > 0.3 ? 'soft daylight' : 'dark and late');
  words.push(seen.busyness > 0.35 ? 'busy arrangement' : seen.busyness < 0.12 ? 'sparse, lots of space' : 'unhurried');
  if (seen.contrast > 0.8) words.push('big dynamics');
  else if (seen.contrast < 0.3) words.push('flat and even, no big peaks');

  return words;
}

/**
 * A mood to put the words to, from the same numbers.
 *
 * One of the eight the fifty starting points are filed under, so a picture can
 * open that list at the right place rather than leaving somebody to guess
 * which of the eight their photograph is.
 */
export function moodFor(seen: Seen): 'love' | 'loss' | 'party' | 'home' | 'road' | 'faith' | 'work' | 'young' {
  const warm = seen.saturation >= 0.12 && (seen.hue < 70 || seen.hue > 300);
  if (seen.brightness < 0.25) return seen.busyness > 0.3 ? 'party' : 'loss';
  if (seen.brightness > 0.7 && seen.busyness < 0.15) return 'faith';
  if (seen.busyness > 0.4) return warm ? 'party' : 'work';
  if (warm) return seen.busyness < 0.15 ? 'home' : 'love';
  return seen.busyness < 0.15 ? 'road' : 'young';
}
