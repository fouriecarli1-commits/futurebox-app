/**
 * The music video maker.
 *
 * No video model is involved, and none is needed for this to be real: the
 * browser can watch the song's own frequencies and draw to them, then record
 * the canvas and the audio together into a file you can download and post. It
 * complements the track in the most literal sense available — every bar you see
 * moving is that moment of the audio.
 *
 * Recording happens in real time, because MediaRecorder captures a live stream
 * rather than rendering ahead. A 30-second hook takes 30 seconds. That is why
 * the short clip is the default: it is also the length that gets posted.
 */

import type { TimedLine } from './timeline';

export type Aspect = '9:16' | '16:9';

export interface VideoStyle {
  /** Drawn from the track so two songs do not look identical. */
  readonly hue: number;
  readonly title: string;
  readonly subtitle: string;
  readonly look: 'bars' | 'wave' | 'pulse';
}

export interface RenderOptions {
  readonly audio: Blob;
  readonly aspect: Aspect;
  readonly seconds: number;
  /** Where in the track to start, so you can grab the chorus rather than the intro. */
  readonly startSeconds: number;
  readonly style: VideoStyle;
  readonly onProgress?: (fraction: number) => void;
  /**
   * The words, with the seconds they land on.
   *
   * A lyric video is the format a new song actually gets posted as, and this
   * app can make one honestly because it wrote the composition plan: it knows
   * the verse was asked for at 72 seconds. Empty means the visualiser alone.
   */
  readonly lyrics?: readonly TimedLine[];
}

const SIZES: Record<Aspect, { width: number; height: number }> = {
  '9:16': { width: 720, height: 1280 },
  '16:9': { width: 1280, height: 720 },
};

/** The first container the browser will actually record. */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function videoSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickMimeType() !== null
  );
}

export function extensionFor(mimeType: string): string {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

/** Wraps a line to the frame, because a long one otherwise runs off the edge. */
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const tried = line ? `${line} ${word}` : word;
    if (context.measureText(tried).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = tried;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frequencies: Uint8Array,
  waveform: Uint8Array,
  style: VideoStyle,
  elapsed: number,
  /** Where this frame sits in the whole track, for looking up the words. */
  atSeconds: number,
  lyrics: readonly TimedLine[],
): void {
  const level = frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length / 255;

  // Which line is being sung, and which section it belongs to.
  let current = -1;
  for (let i = 0; i < lyrics.length; i += 1) {
    if (atSeconds >= lyrics[i].start && atSeconds < lyrics[i].end) {
      current = i;
      break;
    }
  }
  const words = current >= 0 ? lyrics[current] : null;

  // The colour moves with the song's structure, not only with its loudness: a
  // chorus should not look like the verse before it. Sections are known
  // exactly, so this is the one place a video can follow the arrangement.
  let sectionIndex = 0;
  if (words) {
    const names: string[] = [];
    lyrics.forEach((line) => {
      if (names.indexOf(line.section) === -1) names.push(line.section);
    });
    sectionIndex = Math.max(0, names.indexOf(words.section));
  }
  const hue = (style.hue + sectionIndex * 47) % 360;

  // Background breathes with the track rather than sitting still.
  const glow = 6 + level * 22;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `hsl(${hue} 55% ${glow}%)`);
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360} 60% 4%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // With words on screen they own the middle, and the visualiser moves down
  // to a band of its own. Without them it stays where it was.
  const centreY = lyrics.length ? height * 0.78 : height * 0.5;
  context.save();

  if (style.look === 'bars') {
    const count = 48;
    const barWidth = (width * 0.8) / count;
    const left = width * 0.1;
    for (let i = 0; i < count; i++) {
      const value = frequencies[Math.floor((i / count) * frequencies.length)] / 255;
      const barHeight = Math.max(3, value * height * 0.32);
      context.fillStyle = `hsl(${(hue + i * 3) % 360} 85% ${55 + value * 25}%)`;
      context.fillRect(left + i * barWidth, centreY - barHeight / 2, barWidth * 0.62, barHeight);
    }
  } else if (style.look === 'wave') {
    context.lineWidth = 4 + level * 8;
    context.strokeStyle = `hsl(${hue} 90% ${60 + level * 20}%)`;
    context.beginPath();
    for (let x = 0; x < width; x++) {
      const sample = waveform[Math.floor((x / width) * waveform.length)] / 128 - 1;
      const y = centreY + sample * height * 0.18;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  } else if (lyrics.length) {
    // A blob under a lyric leaves the frame half empty. A band across the foot
    // composes with the words instead of competing with them.
    const count = 64;
    const step = width / count;
    for (let i = 0; i < count; i += 1) {
      const value = frequencies[Math.floor((i / count) * frequencies.length)] / 255;
      // A floor, so a quiet passage still shows a band rather than a hairline.
      const barHeight = Math.max(height * 0.012, value * height * 0.16);
      context.fillStyle = `hsl(${(hue + i * 2) % 360} 85% ${60 + value * 20}% / 0.8)`;
      context.fillRect(i * step, centreY - barHeight / 2, step * 0.7, barHeight);
    }
  } else {
    const radius = Math.min(width, height) * (0.14 + level * 0.16);
    const ring = context.createRadialGradient(width / 2, centreY, radius * 0.3, width / 2, centreY, radius);
    ring.addColorStop(0, `hsl(${hue} 90% 65% / 0.9)`);
    ring.addColorStop(1, `hsl(${hue} 90% 50% / 0)`);
    context.fillStyle = ring;
    context.beginPath();
    context.arc(width / 2, centreY, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();

  // ── The words ────────────────────────────────────────────────────────────
  if (words) {
    context.textAlign = 'center';

    // Which part of the song, small, above the line. It is known rather than
    // guessed, so it is worth showing.
    context.fillStyle = 'rgba(255,255,255,0.45)';
    context.font = `700 ${Math.round(width * 0.028)}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    context.fillText(words.section.toUpperCase(), width / 2, height * 0.16);

    const size = Math.round(width * (width > height ? 0.062 : 0.095));
    context.font = `800 ${size}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    const wrapped = wrap(context, words.text, width * 0.84);

    // A quarter of a second, fixed. It was a fifth of the line's own window,
    // which on a six-second line is a 1.2-second fade — long enough that a
    // frame grabbed anywhere in it shows words too faint to read.
    context.globalAlpha = Math.min(1, (atSeconds - words.start) / 0.25);
    context.fillStyle = 'rgba(255,255,255,0.97)';
    wrapped.forEach((line, i) => {
      context.fillText(line, width / 2, height * 0.4 + i * size * 1.25);
    });
    context.globalAlpha = 1;

    // The next line, held back, so a singer can see what is coming.
    const next = lyrics[current + 1];
    if (next && next.section === words.section) {
      context.fillStyle = 'rgba(255,255,255,0.3)';
      context.font = `600 ${Math.round(size * 0.6)}px -apple-system, "Segoe UI", Roboto, sans-serif`;
      context.fillText(next.text.slice(0, 60), width / 2, height * 0.4 + wrapped.length * size * 1.25 + size * 0.5);
    }
  }

  // The title, so a clip posted on its own still says whose it is.
  const titleSize = Math.round(width * 0.062);
  context.fillStyle = 'rgba(255,255,255,0.96)';
  context.font = `800 ${titleSize}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  context.textAlign = 'center';
  const titleY = lyrics.length ? height * 0.08 : height * 0.82;
  context.fillText(style.title.slice(0, 28), width / 2, titleY);

  context.fillStyle = 'rgba(255,255,255,0.55)';
  context.font = `500 ${Math.round(titleSize * 0.46)}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  context.fillText(style.subtitle, width / 2, titleY + titleSize * 0.75);

  // A quiet progress line — it reads as intent rather than decoration.
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(width * 0.1, height * 0.93, width * 0.8, 3);
  context.fillStyle = 'rgba(255,255,255,0.85)';
  context.fillRect(width * 0.1, height * 0.93, width * 0.8 * elapsed, 3);
}

export interface RenderResult {
  readonly blob: Blob;
  readonly mimeType: string;
}

/** Records the visualiser and the audio together into one file. */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error('This browser cannot record video.');

  const { width, height } = SIZES[options.aspect];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot draw the video.');

  const audioContext = new AudioContext();
  const decoded = await audioContext.decodeAudioData(await options.audio.arrayBuffer());

  const source = audioContext.createBufferSource();
  source.buffer = decoded;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  const frequencies = new Uint8Array(analyser.frequencyBinCount);
  const waveform = new Uint8Array(analyser.frequencyBinCount);

  const destination = audioContext.createMediaStreamDestination();
  source.connect(analyser);
  analyser.connect(destination);

  const stream = canvas.captureStream(30);
  destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  const duration = Math.min(options.seconds, Math.max(1, decoded.duration - options.startSeconds));
  let frame = 0;
  const started = performance.now();

  const draw = () => {
    const elapsed = (performance.now() - started) / 1000;
    if (elapsed >= duration) return;
    analyser.getByteFrequencyData(frequencies);
    analyser.getByteTimeDomainData(waveform);
    drawFrame(
      context, width, height, frequencies, waveform, options.style, elapsed / duration,
      // Absolute position in the track, not in the clip — a hook cut from 1:12
      // has to show the words being sung at 1:12.
      options.startSeconds + elapsed,
      options.lyrics ?? [],
    );
    if (frame++ % 6 === 0) options.onProgress?.(elapsed / duration);
    requestAnimationFrame(draw);
  };

  recorder.start();
  source.start(0, options.startSeconds, duration);
  requestAnimationFrame(draw);

  await new Promise((resolve) => setTimeout(resolve, duration * 1000 + 250));

  recorder.stop();
  source.stop();
  const blob = await finished;
  await audioContext.close();
  options.onProgress?.(1);

  return { blob, mimeType };
}

/** Picks a look and a colour from the track, so releases do not all match. */
export function styleFor(title: string, genre: string, bpm: number): VideoStyle {
  const source = `${title}${genre}`;
  let seed = 0;
  for (let i = 0; i < source.length; i++) seed += source.charCodeAt(i);
  const look: VideoStyle['look'] = bpm >= 124 ? 'bars' : bpm <= 95 ? 'wave' : 'pulse';
  return {
    hue: seed % 360,
    title,
    subtitle: `${genre} · ${bpm} BPM`,
    look,
  };
}
