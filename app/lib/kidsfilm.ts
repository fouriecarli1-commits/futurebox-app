/**
 * Easy Editing: a film from the child's own drawings, with their own voice
 * over it, made in the browser and kept on the wall.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026: *"colouring must also be able to edit in a very
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
export async function makeFilm(
  frames: readonly Frame[],
  voice: Blob | null,
  song: Blob | null,
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
  const mixOut = ctx.createMediaStreamDestination();
  const decode = async (blob: Blob | null): Promise<AudioBuffer | null> => {
    if (!blob) return null;
    try { return await ctx.decodeAudioData(await blob.arrayBuffer()); } catch { return null; }
  };
  const [voiceBuffer, songBuffer] = await Promise.all([decode(voice), decode(song)]);
  const voiceSeconds = voiceBuffer ? Math.min(VOICE_MOST_SECONDS, voiceBuffer.duration) : 0;
  const total = Math.max(filmSeconds(frames.length), voiceSeconds) + FADE_SECONDS;
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

  const started = ctx.currentTime + 0.1;
  if (voiceBuffer) {
    const source = ctx.createBufferSource();
    source.buffer = voiceBuffer;
    source.connect(mixOut);
    source.start(started);
    source.stop(started + voiceSeconds + 0.05);
  }
  if (songBuffer) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = songBuffer;
    source.loop = true;
    gain.gain.setValueAtTime(SONG_GAIN, started);
    gain.gain.setValueAtTime(SONG_GAIN, started + total - 1);
    gain.gain.linearRampToValueAtTime(0.0001, started + total);
    source.connect(gain).connect(mixOut);
    source.start(started);
    source.stop(started + total + 0.05);
  }

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
