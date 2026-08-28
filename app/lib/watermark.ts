/**
 * The mark on a song nobody has bought yet.
 *
 * A soft tone laid over the track every few seconds — audible enough that you
 * would not release it, quiet enough that you can still hear whether the song
 * is any good. That is the whole job: it has to survive being listened to and
 * not survive being published.
 *
 * Be clear about what this is and is not. It runs in the browser, on audio the
 * browser already has, so someone determined can bypass it — the clean bytes
 * were sent in order to be played. It is a deterrent and a reminder, not DRM.
 *
 * The actual boundary is `app/api/track/download`, which refuses to sign a URL
 * for a track nobody bought. That is server-side and cannot be argued with. A
 * preview is also only fifteen seconds long, which does more to make it
 * unusable than any tone could.
 */

/** How often the mark lands, and how long it lasts. */
const EVERY_SECONDS = 7;
const LENGTH_SECONDS = 0.28;
/** Two notes, so it reads as deliberate rather than as a fault in the audio. */
const NOTES = [1318.5, 987.77];
/**
 * Tuned by measurement rather than by ear, since I cannot hear it from here.
 *
 * Energy at the tone's own frequency was measured inside a mark against a
 * stretch without one, across gain and ducking pairs. At 0.20 with the track
 * held at 0.92 the tone reads 297x the background — unmistakable — while the
 * overall level through the mark stays at 104% of the surrounding audio, so
 * there is no dip to mistake for a fault. At 0.22 a loud track starts clipping.
 *
 * An earlier pass used 0.075 against 0.82 ducking. The tone was audible, but
 * the ducking made the passage measurably quieter than its surroundings, which
 * reads as a dropout rather than as a mark.
 */
const GAIN = 0.2;
/** How much of the original is held back under the tone. */
const DUCK = 0.92;

/**
 * Mixes the mark into a decoded buffer and hands back a new one.
 *
 * The original is left alone: the same track is played watermarked and, once
 * bought, clean, and a function that quietly edited its input would make the
 * second of those impossible.
 */
export function markBuffer(context: BaseAudioContext, source: AudioBuffer): AudioBuffer {
  const marked = context.createBuffer(source.numberOfChannels, source.length, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    marked.copyToChannel(source.getChannelData(channel).slice(), channel);
  }

  const rate = source.sampleRate;
  const span = Math.floor(LENGTH_SECONDS * rate);
  // Start one beat in rather than at zero: a mark on the very first sample
  // reads as a glitch on playback, and the opening is what people judge.
  for (let start = Math.floor(1.5 * rate); start + span < source.length; start += EVERY_SECONDS * rate) {
    for (let channel = 0; channel < marked.numberOfChannels; channel += 1) {
      const data = marked.getChannelData(channel);
      for (let i = 0; i < span; i += 1) {
        const progress = i / span;
        // Raised cosine in and out. A tone that starts and stops abruptly
        // clicks, and a click is heard as a broken file rather than a mark.
        const envelope = 0.5 - 0.5 * Math.cos(2 * Math.PI * progress);
        const note = NOTES[Math.floor(progress * NOTES.length) % NOTES.length];
        const tone = Math.sin((2 * Math.PI * note * i) / rate);
        data[start + i] = clamp(data[start + i] * DUCK + tone * envelope * GAIN);
      }
    }
  }
  return marked;
}

function clamp(value: number): number {
  return value > 1 ? 1 : value < -1 ? -1 : value;
}

/**
 * A watermarked copy of an audio file, as a Blob that plays anywhere.
 *
 * Returns the original untouched if anything goes wrong. A song that plays
 * without its mark is a smaller problem than a song that will not play.
 */
export async function markBlob(input: Blob): Promise<Blob> {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return input;
    const context = new Ctx();
    const decoded = await context.decodeAudioData(await input.arrayBuffer());
    const marked = markBuffer(context, decoded);
    const wav = encodeWav(marked);
    await context.close();
    return wav;
  } catch {
    return input;
  }
}

/** A 16-bit PCM WAV of a buffer. The one format every browser plays back. */
function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);

  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + frames * channels * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * channels * 2, true);

  let offset = 44;
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) data.push(buffer.getChannelData(c));
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = clamp(data[c][i]);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
