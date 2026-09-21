/**
 * Mono, stereo, or folded for a surround decoder.
 *
 * ── What she asked for, and what is honest to give ───────────────────────
 *
 * Carli, 21 September 2026: *"Mono/stereo/dolby surround. Download type."*
 *
 * Two of the three are arithmetic and this file does them exactly. The third
 * needs saying plainly, because getting it wrong would be a claim her company
 * cannot back:
 *
 * **We do not encode Dolby and this file never says we do.** Dolby Digital,
 * Dolby Atmos and Pro Logic are licensed, trademarked formats; producing one
 * needs a licence and an encoder, and calling a file something it is not is
 * the one thing `docs` §"say what it actually is" exists to stop. What is in
 * here is the MATRIX fold those decoders were designed to unfold — the same
 * arithmetic the format is built on, which is not owned by anybody — so a
 * surround receiver put in its matrix mode pulls the middle of the mix to the
 * centre speaker and the sides to the rears. It is called "Surround (matrix)"
 * on the screen and the room says exactly this underneath it.
 *
 * ── The fold ─────────────────────────────────────────────────────────────
 *
 * A matrix decoder looks for two things in a two-channel file:
 *
 *   what is IN PHASE on both channels  → the centre
 *   what is OUT OF PHASE between them  → the rears
 *
 * A stereo mix already carries both — the middle of a mix is what both
 * channels share, the width is what they do not — so the fold does not invent
 * a surround field. It takes the difference, turns its phase a quarter turn,
 * and puts it back the other way round on each channel, which is what makes a
 * decoder able to pull it out cleanly instead of guessing:
 *
 *   S  = (L − R) / 2                 what only one side has
 *   Lt = (L + jS) · headroom
 *   Rt = (R − jS) · headroom
 *
 * `jS` is S with every frequency turned ninety degrees — a Hilbert transform.
 * Without it the two channels are simply plus and minus the same signal, and
 * a decoder cannot tell that apart from an ordinary wide mix; this is the step
 * a half-done version leaves out, and leaving it out is why "surround" so
 * often means "slightly odd stereo".
 *
 * ── Why the arithmetic is here and not in the component ──────────────────
 *
 * The same reason `fitTo` came out of `fit`: a number you can only get by
 * rendering audio in a browser is a number nobody can check. Every function
 * below takes arrays and returns arrays, so `check:channels` puts known
 * signals through them and reads the answer.
 */

export type Layout = 'mono' | 'stereo' | 'surround';

export const LAYOUTS: readonly {
  readonly id: Layout;
  readonly label: readonly [string, string];
  readonly note: readonly [string, string];
}[] = [
  {
    id: 'stereo',
    label: ['mix.stereo', 'Stereo'],
    note: ['mix.stereoNote', 'Two channels, exactly as the room plays it. This is the one to pick unless you have a reason not to.'],
  },
  {
    id: 'mono',
    label: ['mix.mono', 'Mono'],
    note: ['mix.monoNote', 'One channel. Radio, a phone speaker, a shop — and the honest test of a mix, because anything that disappears here was only there because of the width.'],
  },
  {
    id: 'surround',
    label: ['mix.surround', 'Surround (matrix)'],
    note: ['mix.surroundNote', 'Still two channels, folded so a surround receiver in its matrix mode can put the middle of the mix in the centre speaker and the sides behind you. It is not a Dolby file and we do not licence Dolby — on anything else it plays as ordinary stereo.'],
  },
];

export function layoutById(id: string): Layout {
  return LAYOUTS.some((one) => one.id === id) ? (id as Layout) : 'stereo';
}

/** How many channels the file ends up with. */
export function channelsOf(layout: Layout): number {
  return layout === 'mono' ? 1 : 2;
}

/**
 * A Hilbert transform as a windowed FIR, odd length so it has a true centre.
 *
 * The ideal kernel is 2/(pi·n) for odd n and 0 for even — infinitely long, so
 * it is cut to `taps` and windowed to stop the cut ringing. Cutting it costs
 * the bottom end: the shorter the kernel, the higher the frequency at which
 * the turn stops being a full quarter and starts fading out. Measured, at
 * 44.1k, as the gain of the turn against the signal going in:
 *
 *        taps     40Hz   60Hz   80Hz  110Hz  160Hz  220Hz  440Hz
 *         127    0.124  0.184  0.244  0.332  0.468  0.614  0.936
 *         255    0.246  0.362  0.471  0.617  0.804  0.938  1.001
 *         511    0.471  0.662  0.807  0.942  1.000  1.002  1.001
 *        1023    0.803  0.965  1.002  0.999  1.000  1.002  0.998
 *
 * It was 127, with a comment claiming the turn was "accurate down to a couple
 * of hundred hertz". The table says 0.614 at 220 Hz — four decibels down, and
 * a third of the turn simply missing at 110. The comment was wrong and the
 * only reason to keep the kernel that short was that convolving with it was
 * already slow (see `through`), which is not a reason, it is a second bug.
 *
 * So: 1023, which is flat from about eighty hertz. Below that the turn fades
 * out and below forty there is little left, and that is the right place to
 * stop — what gets turned is the DIFFERENCE between the channels, and the
 * bottom of a mix is almost entirely in the middle. There is very little
 * width down there to turn. Going longer buys those few hertz at the price of
 * a longer pre-ring before every transient, which is smearing you can hear on
 * anything percussive; 1023 is 11.6 ms either side of centre.
 *
 * Exported so the check can look at the kernel itself rather than only at what
 * comes out of it — a kernel whose even taps are not zero is not a Hilbert
 * transform, and that is invisible in the output of one short signal.
 */
export function hilbertKernel(taps = 1023): Float32Array {
  const odd = taps % 2 === 0 ? taps + 1 : taps;
  const mid = (odd - 1) / 2;
  const out = new Float32Array(odd);
  for (let i = 0; i < odd; i += 1) {
    const n = i - mid;
    if (n === 0 || n % 2 === 0) {
      out[i] = 0;
      continue;
    }
    /* Hamming, so the truncation does not ring. */
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (odd - 1));
    out[i] = (2 / (Math.PI * n)) * window;
  }
  return out;
}

/**
 * Multiply-and-add, the way the definition reads.
 *
 * Returns the whole convolution, `signal.length + kernel.length - 1` long.
 * This is the obvious version and it is here to be obvious: `through` runs
 * the fast one, and `check:channels` proves the two agree. A fast transform
 * nobody has checked against arithmetic they can read is a fast transform
 * that might be wrong.
 */
export function convolve(signal: Float32Array, kernel: Float32Array): Float32Array {
  const out = new Float32Array(signal.length + kernel.length - 1);
  for (let i = 0; i < signal.length; i += 1) {
    const value = signal[i];
    if (value === 0) continue;
    for (let k = 0; k < kernel.length; k += 1) out[i + k] += value * kernel[k];
  }
  return out;
}

/* ── The fast one ───────────────────────────────────────────────────────
 *
 * `convolve` on a three-minute mix with this kernel is about thirty-five
 * seconds of arithmetic. Measured, on a server, single-threaded: 4.3 s at
 * 127 taps and 16.6 s at 511, and it goes up in a straight line with the
 * kernel. On her phone, several times that. A download button that locks the
 * room for a minute is not a download button, so the kernel was being kept
 * short to hide the cost — which is how the bass response above got wrong.
 *
 * Multiplying spectra costs n·log(n) instead of n·taps, so the kernel's
 * length stops mattering almost entirely and can be chosen for how it sounds
 * instead. Same answer, to the last decimal the check can measure.
 */

const twiddles = new Map<number, { cos: Float64Array; sin: Float64Array }>();

function twiddleFor(n: number): { cos: Float64Array; sin: Float64Array } {
  const had = twiddles.get(n);
  if (had) return had;
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i += 1) {
    cos[i] = Math.cos((-2 * Math.PI * i) / n);
    sin[i] = Math.sin((-2 * Math.PI * i) / n);
  }
  const made = { cos, sin };
  twiddles.set(n, made);
  return made;
}

/** In place, length a power of two. Angles come from a table, so nothing drifts. */
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let swap = re[i]; re[i] = re[j]; re[j] = swap;
      swap = im[i]; im[i] = im[j]; im[j] = swap;
    }
  }
  const { cos, sin } = twiddleFor(n);
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = n / len;
    for (let at = 0; at < n; at += len) {
      for (let k = 0; k < half; k += 1) {
        const wr = cos[k * step];
        const wi = inverse ? -sin[k * step] : sin[k * step];
        const i0 = at + k;
        const i1 = i0 + half;
        const vr = re[i1] * wr - im[i1] * wi;
        const vi = re[i1] * wi + im[i1] * wr;
        re[i1] = re[i0] - vr;
        im[i1] = im[i0] - vi;
        re[i0] += vr;
        im[i0] += vi;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i += 1) { re[i] /= n; im[i] /= n; }
}

function nextPowerOfTwo(least: number): number {
  let size = 1;
  while (size < least) size <<= 1;
  return size;
}

/** The same convolution, block by block through the frequency domain. */
function convolveFast(signal: Float32Array, kernel: Float32Array): Float32Array {
  const size = nextPowerOfTwo(kernel.length * 4);
  const block = size - kernel.length + 1;

  const kr = new Float64Array(size);
  const ki = new Float64Array(size);
  kr.set(kernel);
  fft(kr, ki, false);

  const out = new Float32Array(signal.length + kernel.length - 1);
  const br = new Float64Array(size);
  const bi = new Float64Array(size);
  for (let at = 0; at < signal.length; at += block) {
    br.fill(0);
    bi.fill(0);
    const take = Math.min(block, signal.length - at);
    for (let i = 0; i < take; i += 1) br[i] = signal[at + i];
    fft(br, bi, false);
    for (let i = 0; i < size; i += 1) {
      const re = br[i] * kr[i] - bi[i] * ki[i];
      bi[i] = br[i] * ki[i] + bi[i] * kr[i];
      br[i] = re;
    }
    fft(br, bi, true);
    const reach = Math.min(size, out.length - at);
    for (let i = 0; i < reach; i += 1) out[at + i] += br[i];
  }
  return out;
}

/** `signal` through `kernel`, centred, so nothing is delayed against anything. */
export function through(signal: Float32Array, kernel: Float32Array): Float32Array {
  const full = signal.length < kernel.length * 4
    ? convolve(signal, kernel)
    : convolveFast(signal, kernel);
  const mid = (kernel.length - 1) / 2;
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i += 1) out[i] = full[i + mid];
  return out;
}

/**
 * The loudest a folded sample may be.
 *
 * ── Measured, not guessed ────────────────────────────────────────────────
 *
 * This was a flat 1/1.5, on the reasoning that L + S reaches 1.5× when the
 * mix is already at the ceiling. `check:channels` put a square wave through
 * it and found seven samples past 1 anyway: a Hilbert transform rings at a
 * discontinuity, and the ring goes above what the arithmetic alone predicts.
 * A fixed guess was both too small for that case and too large for every
 * ordinary one — every mix came out three and a half decibels quieter for a
 * worst case almost none of them contain.
 *
 * So the fold is built at unity and scaled only by what it actually turned
 * out to need. A mix with headroom in it keeps every decibel it had; one
 * that would have gone over comes down by exactly enough and not a hair
 * more. Deterministic either way — the same mix folds to the same file.
 */
export const FOLD_CEILING = 1;

/** The most any of these reaches, either way from zero. */
function peakOf(channels: readonly Float32Array[]): number {
  let peak = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) {
      const size = Math.abs(channel[i]);
      if (size > peak) peak = size;
    }
  }
  return peak;
}

/**
 * The mix, in the layout asked for.
 *
 * Takes and returns plain arrays. `right` may be the same array as `left` for
 * a mono source, which is the ordinary case for a one-lane session.
 */
export function foldTo(
  layout: Layout,
  left: Float32Array,
  right: Float32Array,
): Float32Array[] {
  if (layout === 'mono') {
    const out = new Float32Array(left.length);
    /* Halved, not summed. Two copies of the same thing added together is
       twice as loud and clips; the point of a mono fold is the same mix with
       one fewer channel, not a louder one. */
    for (let i = 0; i < left.length; i += 1) out[i] = (left[i] + right[i]) / 2;
    return [out];
  }

  if (layout === 'stereo') return [left, right];

  const side = new Float32Array(left.length);
  for (let i = 0; i < left.length; i += 1) side[i] = (left[i] - right[i]) / 2;
  const turned = through(side, hilbertKernel());

  const lt = new Float32Array(left.length);
  const rt = new Float32Array(left.length);
  for (let i = 0; i < left.length; i += 1) {
    lt[i] = left[i] + turned[i];
    rt[i] = right[i] - turned[i];
  }

  /* Only as much as it turned out to need. See `FOLD_CEILING`. */
  const peak = peakOf([lt, rt]);
  if (peak > FOLD_CEILING) {
    const scale = FOLD_CEILING / peak;
    for (let i = 0; i < left.length; i += 1) {
      lt[i] *= scale;
      rt[i] *= scale;
    }
  }
  return [lt, rt];
}
