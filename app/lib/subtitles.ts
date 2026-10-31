/**
 * Subtitles from what is said in the film, with the word being said lit.
 *
 * The owner, 31 October 2026: *"Doen ook net goeie navorsing van video
 * editors. Dit moet al die features hê en ons slim AI intergrations."* Every
 * leading editor captions speech automatically and lights each word as it is
 * spoken (docs/VIDEO-EDITOR-ROADMAP.md, gap 2).
 *
 * The shots' own sound is put together on the device into one small voice
 * file, read by the transcription route (`/api/transcribe`, priced per
 * minute on its button), and the timed words come back. Everything else is
 * here: where each word falls on the FILM's clock (through every shot's trim
 * and speed), how the words are grouped into short lines, and how a line is
 * drawn, in the export and in the room alike.
 */

/** A word on the film's clock. */
export interface SubWord {
  readonly text: string;
  readonly from: number;
  readonly to: number;
}

/** One line of subtitles: a few words, up together. */
export interface Subtitle {
  readonly from: number;
  readonly to: number;
  readonly words: readonly SubWord[];
}

/** How the lines look. */
export interface SubtitleLook {
  /** The word being said lights up in this colour; off, the line is plain white. */
  readonly lit?: string | null;
  /** Up from the foot of the picture, as a share of its height. */
  readonly rise?: number;
  /** Size, as a share of the picture's shorter side. */
  readonly size?: number;
}

export const SUB_LIT_DEFAULT = '#39ff14';
export const SUB_LITS = ['#39ff14', '#22d3ee', '#ff2bd6', '#fde68a', '#a78bfa', '#ffffff'] as const;

/** The most words, and letters, on one line; and the pause that starts a new one. */
export const MOST_WORDS = 6;
export const MOST_LETTERS = 32;
export const NEW_LINE_GAP = 0.7;

/** A stretch of the voice file and where it sits on the film. */
export interface SpeechPart {
  /** Where it starts in the voice file, in seconds. */
  readonly at: number;
  /** How long it is in the voice file (the clip's own seconds). */
  readonly long: number;
  /** Where it starts on the film. */
  readonly film: number;
  /** The shot's speed: a clip at 2× plays its seconds in half the film's. */
  readonly speed: number;
}

/** A second of the voice file, on the film's clock; null if it falls in no part. */
export function onFilm(parts: readonly SpeechPart[], second: number): number | null {
  for (const part of parts) {
    if (second >= part.at - 1e-6 && second <= part.at + part.long + 1e-6) {
      return part.film + (second - part.at) / Math.max(0.1, part.speed);
    }
  }
  return null;
}

/**
 * The timed words, put on the film's clock and grouped into lines: a new line
 * after a pause, after a full stop, or when one would grow too long.
 */
export function linesFrom(
  words: readonly { readonly text: string; readonly start: number; readonly end: number }[],
  parts: readonly SpeechPart[],
): Subtitle[] {
  const placed: SubWord[] = [];
  for (const word of words) {
    const text = word.text.trim();
    if (!text) continue;
    const from = onFilm(parts, word.start);
    const to = onFilm(parts, word.end);
    if (from === null) continue;
    placed.push({ text, from, to: Math.max(from + 0.05, to ?? from + 0.3) });
  }
  const lines: Subtitle[] = [];
  let now: SubWord[] = [];
  const close = (): void => {
    if (!now.length) return;
    lines.push({ from: now[0].from, to: now[now.length - 1].to, words: now });
    now = [];
  };
  for (const word of placed) {
    const last = now[now.length - 1];
    const letters = now.reduce((n, one) => n + one.text.length + 1, 0) + word.text.length;
    if (last && (word.from - last.to > NEW_LINE_GAP || now.length >= MOST_WORDS || letters > MOST_LETTERS || /[.!?]$/.test(last.text))) close();
    now.push(word);
  }
  close();
  /* A line stays up until the next one comes, if that is soon: a gap shorter
     than a blink reads as flicker. */
  return lines.map((line, k) => {
    const next = lines[k + 1];
    return next && next.from - line.to < 0.4 ? { ...line, to: next.from } : line;
  });
}

/** The line up at this second, if any. */
export function subtitleAt(lines: readonly Subtitle[], second: number): Subtitle | null {
  return lines.find((line) => second >= line.from && second < line.to) ?? null;
}

/** The word being said at this second, by its place in the line; -1 between words. */
export function wordAt(line: Subtitle, second: number): number {
  let lit = -1;
  line.words.forEach((word, k) => { if (second >= word.from) lit = k; });
  return lit;
}

/**
 * The line drawn on a frame: bold white words with a dark edge, centred near
 * the foot, wrapped to two rows if it must, and the word being said in the
 * lit colour, glowing and a little larger.
 */
export function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  lines: readonly Subtitle[],
  second: number,
  width: number,
  height: number,
  look: SubtitleLook = {},
): void {
  const line = subtitleAt(lines, second);
  if (!line) return;
  const short = Math.min(width, height);
  const px = Math.max(12, Math.round(short * (look.size ?? 0.062)));
  const lit = look.lit === undefined ? SUB_LIT_DEFAULT : look.lit;
  const saying = lit ? wordAt(line, second) : -1;
  ctx.save();
  ctx.font = `800 ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';
  const space = ctx.measureText(' ').width;
  const widths = line.words.map((word) => ctx.measureText(word.text).width);
  /* Into rows no wider than most of the picture. */
  const most = width * 0.86;
  const rows: number[][] = [[]];
  let rowWide = 0;
  line.words.forEach((_, k) => {
    const add = widths[k] + (rows[rows.length - 1].length ? space : 0);
    if (rows[rows.length - 1].length && rowWide + add > most) { rows.push([]); rowWide = 0; }
    rows[rows.length - 1].push(k);
    rowWide += widths[k] + (rows[rows.length - 1].length > 1 ? space : 0);
  });
  const rowTall = px * 1.25;
  const foot = height * (1 - (look.rise ?? 0.16));
  rows.forEach((row, r) => {
    const wide = row.reduce((n, k, i) => n + widths[k] + (i ? space : 0), 0);
    let x = (width - wide) / 2;
    const y = foot - (rows.length - 1 - r) * rowTall;
    for (const k of row) {
      const word = line.words[k].text;
      const on = k === saying;
      ctx.save();
      if (on) {
        ctx.translate(x + widths[k] / 2, y);
        ctx.scale(1.08, 1.08);
        ctx.translate(-(x + widths[k] / 2), -y);
      }
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, px * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(word, x, y);
      if (on && lit) {
        ctx.shadowColor = lit;
        ctx.shadowBlur = px * 0.6;
      }
      ctx.fillStyle = on && lit ? lit : '#ffffff';
      ctx.fillText(word, x, y);
      ctx.restore();
      x += widths[k] + space;
    }
  });
  ctx.restore();
}

/** The voice file's sample rate: plenty for speech, and small to send. */
export const SPEECH_RATE = 16000;

/** Mono samples as a 16-bit WAV. */
export function wavOf(samples: Float32Array, rate: number): Blob {
  const n = samples.length;
  const bytes = new ArrayBuffer(44 + n * 2);
  const view = new DataView(bytes);
  const put = (at: number, text: string): void => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
  put(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); put(8, 'WAVE');
  put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return new Blob([bytes], { type: 'audio/wav' });
}

/** A shot, as far as its speech needs to know. */
export interface SpeakingShot {
  readonly clip: Blob;
  readonly from: number;
  readonly to: number;
  readonly speed?: number;
  /** Where it starts on the film. */
  readonly film: number;
  /** Whether its own sound is heard in the film. */
  readonly heard: boolean;
}

/**
 * The film's speech as one voice file: each heard shot's own sound, trimmed
 * as it is on the film, one after another, and where each part sits on the
 * film. Null when no shot has a sound to read.
 */
export async function speechOf(shots: readonly SpeakingShot[]): Promise<{ readonly blob: Blob; readonly seconds: number; readonly parts: readonly SpeechPart[] } | null> {
  const pieces: Float32Array[] = [];
  const parts: SpeechPart[] = [];
  let at = 0;
  for (const shot of shots) {
    if (!shot.heard) continue;
    let decoded: AudioBuffer;
    try {
      decoded = await new OfflineAudioContext(1, 1, SPEECH_RATE).decodeAudioData(await shot.clip.arrayBuffer());
    } catch {
      continue; /* No sound in this clip at all. */
    }
    const start = Math.max(0, Math.floor(shot.from * SPEECH_RATE));
    const end = Math.min(decoded.length, Math.ceil(shot.to * SPEECH_RATE));
    if (end <= start) continue;
    const mono = new Float32Array(end - start);
    for (let c = 0; c < decoded.numberOfChannels; c += 1) {
      const data = decoded.getChannelData(c);
      for (let i = start; i < end; i += 1) mono[i - start] += data[i] / decoded.numberOfChannels;
    }
    pieces.push(mono);
    parts.push({ at, long: mono.length / SPEECH_RATE, film: shot.film, speed: Math.max(0.1, Math.min(4, shot.speed ?? 1)) });
    at += mono.length / SPEECH_RATE;
  }
  if (!pieces.length) return null;
  const all = new Float32Array(pieces.reduce((n, one) => n + one.length, 0));
  let o = 0;
  for (const one of pieces) { all.set(one, o); o += one.length; }
  return { blob: wavOf(all, SPEECH_RATE), seconds: all.length / SPEECH_RATE, parts };
}
