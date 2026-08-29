/**
 * Finding the bit worth posting.
 *
 * A hook is not "the first fifteen seconds" — that is usually the intro, which
 * is the part designed to be skipped. The bit that holds someone is where
 * something arrives: the beat drops in, the chorus lands, the arrangement
 * suddenly fills out.
 *
 * So this looks for two things at once. Loud on its own is not enough (a track
 * that is loud throughout has no hook anywhere), and a rise on its own is not
 * enough either (a quiet section following silence rises without being worth
 * hearing). The moments that score are loud *and* louder than what came before.
 */

export interface Hook {
  readonly startSeconds: number;
  readonly seconds: number;
  /** 0–1, for showing which is strongest. */
  readonly score: number;
  /**
   * Why this moment, as a value rather than as a sentence.
   *
   * It was an English string, and the screen turned it back into one of three
   * translations by matching on its first word — so a new kind of reason
   * silently became "safe pick". A reason that has to survive being translated
   * cannot be carried as prose.
   */
  readonly kind: 'section' | 'arrival' | 'fullest' | 'steady';
  /** The section's own name, when the reason is that it is one. */
  readonly label?: string;
}

const WINDOW = 0.1; // seconds per energy reading

/** Loudness over time, one reading per WINDOW. */
function energyEnvelope(buffer: AudioBuffer): Float32Array {
  const channel = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(buffer.sampleRate * WINDOW));
  const count = Math.floor(channel.length / per);
  const envelope = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let j = 0; j < per; j++) {
      const sample = channel[i * per + j];
      sum += sample * sample;
    }
    envelope[i] = Math.sqrt(sum / per);
  }
  return envelope;
}

export function findHooks(buffer: AudioBuffer, clipSeconds: number, count = 3): Hook[] {
  const envelope = energyEnvelope(buffer);
  if (envelope.length === 0) return [];

  const clipWindows = Math.max(1, Math.round(clipSeconds / WINDOW));
  const lookBack = Math.round(2 / WINDOW); // two seconds of "before"
  const loudest = Math.max(...Array.from(envelope));
  if (loudest === 0) return [];

  const candidates: Array<{ index: number; score: number; energy: number; rise: number }> = [];
  const step = Math.max(1, Math.round(0.5 / WINDOW));

  for (let start = 0; start + clipWindows < envelope.length; start += step) {
    let energy = 0;
    for (let i = start; i < start + clipWindows; i++) energy += envelope[i];
    energy = energy / clipWindows / loudest;

    let before = 0;
    let seen = 0;
    for (let i = Math.max(0, start - lookBack); i < start; i++) {
      before += envelope[i];
      seen++;
    }
    before = seen > 0 ? before / seen / loudest : 0;

    // Both matter: loud on its own has no shape, a rise on its own can be quiet.
    const rise = Math.max(0, energy - before);
    candidates.push({ index: start, score: energy * 0.6 + rise * 1.4, energy, rise });
  }

  candidates.sort((a, b) => b.score - a.score);

  // Keep them apart, or all three land on the same drop.
  const chosen: typeof candidates = [];
  const apart = clipWindows * 0.75;
  for (const candidate of candidates) {
    if (chosen.every((other) => Math.abs(other.index - candidate.index) > apart)) {
      chosen.push(candidate);
      if (chosen.length === count) break;
    }
  }

  const best = chosen[0]?.score ?? 1;
  return chosen
    .map((candidate): Hook => ({
      startSeconds: Math.round(candidate.index * WINDOW * 10) / 10,
      seconds: clipSeconds,
      score: best === 0 ? 0 : candidate.score / best,
      kind:
        candidate.rise > 0.18 ? 'arrival' : candidate.energy > 0.75 ? 'fullest' : 'steady',
    }))
    .sort((a, b) => a.startSeconds - b.startSeconds);
}

/** Decodes a stored file so the hooks can be found from it. */
export async function decodeTrack(blob: Blob): Promise<AudioBuffer> {
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    await context.close();
  }
}

export function formatMoment(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The sections the song was actually built from, as hook candidates.
 *
 * Energy analysis guesses where something arrives. The composition plan does
 * not have to guess: the app told the music service where the chorus was, so
 * that boundary is known rather than inferred. A named section beats a loudness
 * peak, and "the chorus" is a better thing to read on a button than "a rise at
 * 1:12".
 *
 * Scaled to the file's real length first, for the same reason everything else
 * that reads the plan is: the plan asked for a length and the file has one.
 */
export function sectionHooks(
  parts: readonly { name: string; seconds: number }[],
  duration: number,
  clipSeconds: number,
): Hook[] {
  const planned = parts.reduce((total, part) => total + Math.max(1, part.seconds), 0);
  if (!planned || !(duration > 0)) return [];
  const scale = duration / planned;

  const out: Hook[] = [];
  let at = 0;
  parts.forEach((part) => {
    const start = at;
    at += Math.max(1, part.seconds) * scale;
    // A section that starts so late the clip would run off the end is not a
    // clip anybody can post.
    if (start + clipSeconds > duration + 1) return;
    const name = part.name.toLowerCase();
    // The chorus is what a listener came for, so it leads.
    const score = name.indexOf('chorus') !== -1 || name.indexOf('hook') !== -1 ? 1 : 0.7;
    out.push({
      startSeconds: Math.max(0, start),
      seconds: clipSeconds,
      score,
      kind: 'section',
      label: part.name,
    });
  });
  return out.sort((a, b) => b.score - a.score);
}
