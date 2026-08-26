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

function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frequencies: Uint8Array,
  waveform: Uint8Array,
  style: VideoStyle,
  elapsed: number,
): void {
  const level = frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length / 255;

  // Background breathes with the track rather than sitting still.
  const glow = 6 + level * 22;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `hsl(${style.hue} 55% ${glow}%)`);
  gradient.addColorStop(1, `hsl(${(style.hue + 40) % 360} 60% 4%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const centreY = height * 0.5;
  context.save();

  if (style.look === 'bars') {
    const count = 48;
    const barWidth = (width * 0.8) / count;
    const left = width * 0.1;
    for (let i = 0; i < count; i++) {
      const value = frequencies[Math.floor((i / count) * frequencies.length)] / 255;
      const barHeight = Math.max(3, value * height * 0.32);
      context.fillStyle = `hsl(${(style.hue + i * 3) % 360} 85% ${55 + value * 25}%)`;
      context.fillRect(left + i * barWidth, centreY - barHeight / 2, barWidth * 0.62, barHeight);
    }
  } else if (style.look === 'wave') {
    context.lineWidth = 4 + level * 8;
    context.strokeStyle = `hsl(${style.hue} 90% ${60 + level * 20}%)`;
    context.beginPath();
    for (let x = 0; x < width; x++) {
      const sample = waveform[Math.floor((x / width) * waveform.length)] / 128 - 1;
      const y = centreY + sample * height * 0.18;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  } else {
    const radius = Math.min(width, height) * (0.14 + level * 0.16);
    const ring = context.createRadialGradient(width / 2, centreY, radius * 0.3, width / 2, centreY, radius);
    ring.addColorStop(0, `hsl(${style.hue} 90% 65% / 0.9)`);
    ring.addColorStop(1, `hsl(${style.hue} 90% 50% / 0)`);
    context.fillStyle = ring;
    context.beginPath();
    context.arc(width / 2, centreY, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();

  // The title, so a clip posted on its own still says whose it is.
  const titleSize = Math.round(width * 0.062);
  context.fillStyle = 'rgba(255,255,255,0.96)';
  context.font = `800 ${titleSize}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  context.textAlign = 'center';
  context.fillText(style.title.slice(0, 28), width / 2, height * 0.82);

  context.fillStyle = 'rgba(255,255,255,0.55)';
  context.font = `500 ${Math.round(titleSize * 0.46)}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  context.fillText(style.subtitle, width / 2, height * 0.87);

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
    drawFrame(context, width, height, frequencies, waveform, options.style, elapsed / duration);
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
