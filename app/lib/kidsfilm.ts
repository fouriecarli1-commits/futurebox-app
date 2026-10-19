/**
 * Easy Editing: a film from the child's own drawings, with their own voice
 * over it, made in the browser and kept on the wall.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 13 October 2026: *"colouring must also be able to edit in a very
 * easy video editor, so that they can through drawings create their own
 * video, and maybe even record their own story that goes over that
 * drawings (and remember, they can AI that drawing into live in this
 * editor as well)."*
 *
 * ── What it is ───────────────────────────────────────────────────────────
 *
 * Frames are pieces off the gallery wall, in the order they were pressed.
 * Each is on screen for a few seconds with a slow push in, and a short
 * fade between. The voice is the microphone, recorded on the device and
 * never sent anywhere; a kept song can play quietly under it. The film is
 * drawn onto a canvas, the canvas is captured as a stream, the voice and
 * the song are mixed into that stream, and the browser's own recorder
 * writes the WebM. It costs nothing because nothing leaves the phone —
 * `CREDITS.browserVideo` is nought for exactly this.
 *
 * "Bring it to life" on a frame is the room's paid press (`kidsalive.ts`),
 * and the picture that comes back is offered as a frame of its own.
 */

/** The film is square, like the drawings. */
export const FILM_SIDE = 720;
/** How long each frame is on screen, and the fade between two. */
export const FRAME_SECONDS = 3;
export const FADE_SECONDS = 0.5;
/** The most frames one film takes. */
export const FRAMES_MOST = 8;
/** The most a voice-over may run, in seconds. */
export const VOICE_MOST_SECONDS = 60;
/** The song under the voice, quietly. */
export const SONG_GAIN = 0.3;
/** The puzzle pieces' paint on the timeline, from Google's page, round and round. */
export const PIECE_PAINT: readonly string[] = ['#39ff88', '#ffe600', '#ff007f', '#00ffcc', '#a855f7', '#f97316', '#ec4899', '#4da6ff'];

/** The ground between frames and under a picture that is not square. */
export const FILM_GROUND = '#0a1410';

/** What one frame is: the picture, drawn to fit. */
export interface Frame {
  readonly id: string;
  readonly blob: Blob;
  readonly title: string;
}

export const filmSeconds = (frames: number): number => Math.max(0, frames * FRAME_SECONDS);

/** Can this browser make a film at all? Safari on some phones cannot. */
export function canFilm(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return typeof MediaRecorder !== 'undefined'
    && typeof canvas.captureStream === 'function'
    && (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') || MediaRecorder.isTypeSupported('video/webm'));
}

const loadImage = (blob: Blob): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const url = URL.createObjectURL(blob);
  const one = new Image();
  one.onload = () => { URL.revokeObjectURL(url); resolve(one); };
  one.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  one.src = url;
});

/**
 * Draw the film and record it. Answers the WebM, or a sentence.
 *
 * The clock is the audio context's, so the pictures and the sound agree
 * about time; the canvas is redrawn on every animation frame until the
 * last frame has faded.
 */
/* ── Music that is always there ─────────────────────────────────────────

   The owner, 19 October 2026: *"Daar kom nie klank uit by kids easy editing
   nie. Ek love hierdie funksie vir kids."* A film had sound only when a
   voice was recorded or a kept song chosen — and the song picker did not
   even show with no songs kept, so most first films were silent, and "Play
   it through" never played a sound at all. These tunes are drawn by the
   phone, so every film has music. */

export interface Tune {
  readonly id: string;
  readonly emoji: string;
  readonly says: readonly [string, string];
  readonly bpm: number;
  /** The melody, one note an eighth, as MIDI numbers; 0 is a rest. Loops. */
  readonly melody: readonly number[];
  /** The bass, one note a beat. Loops. */
  readonly bass: readonly number[];
}

export const TUNES: readonly Tune[] = [
  { id: 'happy', emoji: '🌈', says: ['kids.filmTuneHappy', 'Happy tune'], bpm: 112,
    melody: [72, 74, 76, 79, 76, 74, 72, 0, 74, 76, 77, 81, 79, 77, 76, 0, 76, 79, 81, 84, 81, 79, 76, 74, 72, 76, 74, 71, 72, 0, 0, 0],
    bass: [48, 48, 53, 53, 55, 55, 48, 48] },
  { id: 'space', emoji: '🚀', says: ['kids.filmTuneSpace', 'Space tune'], bpm: 96,
    melody: [69, 0, 76, 0, 74, 72, 74, 0, 69, 0, 76, 0, 79, 77, 76, 0, 72, 0, 77, 0, 76, 74, 72, 0, 71, 72, 74, 76, 69, 0, 0, 0],
    bass: [45, 45, 41, 41, 43, 43, 40, 40] },
  { id: 'adventure', emoji: '🗺️', says: ['kids.filmTuneAdventure', 'Adventure tune'], bpm: 124,
    melody: [67, 67, 72, 0, 71, 72, 74, 0, 76, 76, 74, 72, 71, 0, 67, 0, 69, 69, 72, 0, 74, 76, 77, 0, 79, 77, 76, 74, 72, 0, 0, 0],
    bass: [43, 48, 45, 41, 43, 48, 43, 43] },
];

const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/**
 * A tune drawn into sound, `seconds` long. Plain arithmetic into a buffer,
 * so the preview and the film play exactly the same thing.
 */
export function tuneBuffer(ctx: BaseAudioContext, tune: Tune, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.ceil(seconds * rate));
  const buffer = ctx.createBuffer(1, length, rate);
  const out = buffer.getChannelData(0);
  const eighth = 60 / tune.bpm / 2;
  const add = (midi: number, start: number, last: number, loud: number, bright: number): void => {
    if (!midi) return;
    const hz = midiHz(midi);
    const from = Math.floor(start * rate);
    const to = Math.min(length, Math.floor((start + last) * rate));
    for (let i = from; i < to; i += 1) {
      const t = (i - from) / rate;
      const env = Math.min(1, t * 80) * Math.exp(-t * 3.2);
      out[i] += loud * env * (Math.sin(2 * Math.PI * hz * t) + bright * Math.sin(4 * Math.PI * hz * t));
    }
  };
  for (let step = 0; step * eighth < seconds; step += 1) {
    add(tune.melody[step % tune.melody.length], step * eighth, eighth * 1.6, 0.22, 0.3);
    if (step % 2 === 0) add(tune.bass[(step / 2) % tune.bass.length], step * eighth, eighth * 2, 0.28, 0.1);
  }
  const fade = Math.min(length, Math.floor(rate));
  for (let i = 0; i < fade; i += 1) out[length - 1 - i] *= i / fade;
  return buffer;
}

/** What plays under a film: a kept song, one of the tunes, or nothing. */
export type Under = { readonly song: Blob } | { readonly tune: Tune } | null;

/** The voice and the music, started on a context, into where they should go. */
async function mix(
  ctx: AudioContext,
  voice: Blob | null,
  under: Under,
  frames: number,
  outs: readonly AudioNode[],
): Promise<{ started: number; total: number }> {
  const decode = async (blob: Blob | null): Promise<AudioBuffer | null> => {
    if (!blob) return null;
    try { return await ctx.decodeAudioData(await blob.arrayBuffer()); } catch { return null; }
  };
  const [voiceBuffer, songBuffer] = await Promise.all([decode(voice), decode(under && 'song' in under ? under.song : null)]);
  const voiceSeconds = voiceBuffer ? Math.min(VOICE_MOST_SECONDS, voiceBuffer.duration) : 0;
  const total = Math.max(filmSeconds(frames), voiceSeconds) + FADE_SECONDS;
  const music = songBuffer ?? (under && 'tune' in under ? tuneBuffer(ctx, under.tune, total + 1) : null);
  const started = ctx.currentTime + 0.1;
  if (voiceBuffer) {
    const source = ctx.createBufferSource();
    source.buffer = voiceBuffer;
    for (const out of outs) source.connect(out);
    source.start(started);
    source.stop(started + voiceSeconds + 0.05);
  }
  if (music) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = music;
    source.loop = Boolean(songBuffer);
    /* Under a voice the music steps back; on its own it is the film's sound. */
    const level = voiceBuffer ? SONG_GAIN : 0.8;
    gain.gain.setValueAtTime(level, started);
    gain.gain.setValueAtTime(level, started + total - 1);
    gain.gain.linearRampToValueAtTime(0.0001, started + total);
    source.connect(gain);
    for (const out of outs) gain.connect(out);
    source.start(started);
    source.stop(started + total + 0.05);
  }
  return { started, total };
}

/**
 * "Play it through": the film's sound, out loud, for as long as the film
 * will be. `perFrame` is how long each picture stays up.
 */
export async function playThrough(
  frames: number,
  voice: Blob | null,
  under: Under,
): Promise<{ stop: () => void; perFrame: number; total: number } | null> {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  const ctx = new AudioContext();
  void ctx.resume().catch(() => undefined);
  const { total } = await mix(ctx, voice, under, frames, [ctx.destination]);
  return { stop: () => { void ctx.close().catch(() => undefined); }, perFrame: total / Math.max(1, frames), total };
}

export async function makeFilm(
  frames: readonly Frame[],
  voice: Blob | null,
  under: Under,
  onProgress?: (fraction: number) => void,
): Promise<{ film: Blob } | { says: string }> {
  if (!frames.length) return { says: 'Pick a drawing first.' };
  if (!canFilm()) return { says: 'This browser cannot make a film. Try Chrome.' };
  const pictures = await Promise.all(frames.map((one) => loadImage(one.blob)));
  if (pictures.some((one) => !one)) return { says: 'One of the pictures could not be read.' };

  const canvas = document.createElement('canvas');
  canvas.width = FILM_SIDE;
  canvas.height = FILM_SIDE;
  const ink = canvas.getContext('2d');
  if (!ink) return { says: 'This browser cannot draw the film.' };

  const ctx = new AudioContext();
  void ctx.resume().catch(() => undefined);
  const mixOut = ctx.createMediaStreamDestination();
  /* Heard while it is made, as well as recorded: the film plays out loud
     while the phone films it, so a child hears their story and their song. */
  const { started, total } = await mix(ctx, voice, under, frames.length, [mixOut, ctx.destination]);
  const perFrame = total / frames.length;

  const stream = canvas.captureStream(30);
  mixOut.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

  const drawFrame = (image: HTMLImageElement, zoom: number, alpha: number): void => {
    const fit = Math.min(FILM_SIDE / image.width, FILM_SIDE / image.height) * zoom;
    const w = image.width * fit;
    const h = image.height * fit;
    ink.globalAlpha = alpha;
    ink.drawImage(image, (FILM_SIDE - w) / 2, (FILM_SIDE - h) / 2, w, h);
    ink.globalAlpha = 1;
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      void ctx.close();
      resolve({ film: new Blob(chunks, { type: 'video/webm' }) });
    };
    recorder.start(250);
    const paint = (): void => {
      const t = ctx.currentTime - started;
      ink.fillStyle = FILM_GROUND;
      ink.fillRect(0, 0, FILM_SIDE, FILM_SIDE);
      const at = Math.min(frames.length - 1, Math.max(0, Math.floor(t / perFrame)));
      const into = t - at * perFrame;
      const zoom = 1 + 0.08 * Math.min(1, Math.max(0, into / perFrame));
      drawFrame(pictures[at]!, zoom, 1);
      /* The next frame fades in over the end of this one. */
      if (at + 1 < frames.length && into > perFrame - FADE_SECONDS) {
        drawFrame(pictures[at + 1]!, 1, (into - (perFrame - FADE_SECONDS)) / FADE_SECONDS);
      }
      onProgress?.(Math.min(1, Math.max(0, t / total)));
      if (t < total) requestAnimationFrame(paint);
      else recorder.stop();
    };
    requestAnimationFrame(paint);
  });
}
