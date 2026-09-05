/**
 * Does the app see what it says it sees?
 *
 * Same standard as `check:listen`: the pictures below are built on purpose,
 * with the answer known before the measurement is taken — a warm bright one, a
 * cold dark one, an empty one and a crowded one.
 *
 * This is why `lib/photo.ts` takes an RGBA array rather than reaching for a
 * canvas. A measurement that can only be taken in a browser, on a real
 * photograph, is a measurement nobody can check.
 */
import { measurePicture, wordsFor, moodFor } from '../app/lib/photo';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const W = 64;
const H = 64;

/** A picture of one colour. */
function flat(r: number, g: number, b: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** A picture that changes every pixel: as busy as a picture gets. */
function noise(): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    const value = (i * 97) % 256;
    out[i * 4] = value;
    out[i * 4 + 1] = (value * 3) % 256;
    out[i * 4 + 2] = (value * 7) % 256;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/* ── Warm, bright, empty: a sunlit wall ───────────────────────────────── */
const sunlit = measurePicture(flat(240, 190, 120), W, H);
check('a warm bright picture reads as warm', sunlit.hue < 70 || sunlit.hue > 300, `hue ${Math.round(sunlit.hue)}`);
check('and as bright', sunlit.brightness > 0.6, sunlit.brightness.toFixed(2));
check('and as empty', sunlit.busyness < 0.05, sunlit.busyness.toFixed(3));
check('which becomes words a model can use',
  wordsFor(sunlit).includes('warm and golden') && wordsFor(sunlit).includes('bright and airy'),
  wordsFor(sunlit).join(', '));

/* ── Cold and dark: a stairwell at night ──────────────────────────────── */
const night = measurePicture(flat(20, 30, 60), W, H);
check('a cold dark picture reads as cold', night.hue >= 170 && night.hue <= 300, `hue ${Math.round(night.hue)}`);
check('and as dark', night.brightness < 0.2, night.brightness.toFixed(2));
check('which is a different song', wordsFor(night).includes('dark and late'), wordsFor(night).join(', '));

/* ── Grey: no colour to speak of ──────────────────────────────────────── */
const grey = measurePicture(flat(128, 128, 128), W, H);
check('a grey picture is not given a colour it does not have',
  grey.saturation < 0.05 && wordsFor(grey).includes('black and white, no colour'),
  `saturation ${grey.saturation.toFixed(3)}`);

/* ── Crowded ──────────────────────────────────────────────────────────── */
const crowded = measurePicture(noise(), W, H);
check('a crowded picture reads as busy', crowded.busyness > 0.35, crowded.busyness.toFixed(2));
check('and asks for a busy arrangement',
  wordsFor(crowded).includes('busy arrangement'), wordsFor(crowded).join(', '));

/* ── The moods are different for different pictures ───────────────────── */
const moods = new Set([moodFor(sunlit), moodFor(night), moodFor(crowded)]);
check('and three different pictures do not all get the same mood',
  moods.size >= 2, [...moods].join(', '));

/* ── An empty picture says nothing rather than inventing something ────── */
const nothing = measurePicture(new Uint8ClampedArray(0), 0, 0);
check('an empty picture is measured as empty, not guessed at',
  nothing.brightness === 0 && nothing.busyness === 0 && nothing.saturation === 0);

/* Every description is short enough to sit beside what a person wrote rather
   than instead of it — the model weights the front of a style list most. */
for (const [what, seen] of [['sunlit', sunlit], ['night', night], ['crowded', crowded]] as const) {
  check(`the ${what} description stays short`, wordsFor(seen).length <= 4,
    `${wordsFor(seen).length}: ${wordsFor(seen).join(', ')}`);
}

if (failures) {
  console.error(`\ncheck:photo — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:photo — what it says it saw is what was in the picture.');
