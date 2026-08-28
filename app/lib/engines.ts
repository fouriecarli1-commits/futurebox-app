/**
 * Where the real engines live.
 *
 * Music is real. `generateAudio` calls `app/api/music`, which calls ElevenLabs
 * Music server-side and hands back a sung, produced track. It is switched on by
 * setting ELEVENLABS_API_KEY; without it `available('audio')` answers false and
 * the studio makes a browser sketch instead, labelled as one.
 *
 * `available()` is answered by `probeAudio()`, which asks the server once. It
 * has to be asked rather than assumed, because only the server knows whether a
 * key is set — so screens render the sketch path first and upgrade when the
 * answer lands. No screen claims a capability this file has not confirmed.
 *
 * Video is the other way round: videos are made in your browser from the
 * track's own audio (`app/lib/video.ts`), which is why `available('video')` is
 * false and nothing here calls out for one. A hosted video engine would plug in
 * at `generateVideo` — Runway and Luma publish APIs; the shape to copy is
 * `app/api/music/route.ts`, including how it answers when no key is set.
 *
 * On Suno specifically: it has no public generation API. The wrappers people
 * pass around scrape a private endpoint, so they break without warning and
 * breach its terms. ElevenLabs Music is the closest legitimate equivalent —
 * lyrics per section, vocals, and a commercial licence on paid plans.
 */

import { accessToken } from './cloud';

/**
 * Where a generation has got to.
 *
 * Every one of these is something observed, never a guess dressed as progress.
 * There is no percentage during the long part because there is nothing to
 * measure: the music service takes a single request and answers when it is
 * finished, with nothing in between. Inventing a bar that creeps to 90% and
 * waits there would be the easy thing to build and a lie about what is known.
 *
 * What is real: the plan that was sent, the moment the service began answering,
 * and the bytes arriving after that — which is a genuine measurement, so that
 * is the only stage that carries a number.
 */
export type Stage =
  | { readonly at: 'plan'; readonly parts: number; readonly seconds: number }
  | { readonly at: 'sent' }
  | { readonly at: 'receiving'; readonly received: number; readonly expected: number | null }
  | { readonly at: 'saving' };

export interface AudioRequest {
  readonly title: string;
  readonly style: string;
  readonly lyrics: string;
  readonly bpm: number;
  readonly key: string;
  readonly seconds: number;
  /**
   * Ask for a backing track with no voice on it.
   *
   * The sections still go, so the song keeps its shape and its timing — this
   * is a song with the singing left out, not a loop.
   */
  readonly instrumental?: boolean;
  /** Told what is happening, as it happens. Optional; nothing depends on it. */
  readonly onStage?: (stage: Stage) => void;
}

export interface VideoRequest {
  readonly title: string;
  readonly treatment: string;
  readonly aspect: '16:9' | '9:16';
  readonly seconds: number;
}

export interface EngineResult {
  readonly blob: Blob;
  /** Shown against the release, so listeners see what made it. */
  readonly model: string;
}

export interface Engines {
  /** False until an engine is configured. Screens must check before offering. */
  available(kind: 'audio' | 'video'): boolean;
  generateAudio(request: AudioRequest): Promise<EngineResult>;
  generateVideo(request: VideoRequest): Promise<EngineResult>;
}

const NO_VIDEO_ENGINE = 'No video engine is connected — videos are made in your browser instead.';

/**
 * Whether the server has a music key, asked once and remembered.
 *
 * This has to be async because only the server knows, and it must never block
 * the first paint — so screens render the sketch path and upgrade to the real
 * engine when the answer arrives.
 */
let audioReady: boolean | null = null;
let audioProbe: Promise<boolean> | null = null;

export async function probeAudio(): Promise<boolean> {
  if (audioReady !== null) return audioReady;
  if (!audioProbe) {
    audioProbe = fetch('/api/music')
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((data: { available?: boolean }) => {
        audioReady = Boolean(data.available);
        return audioReady;
      })
      .catch(() => {
        audioReady = false;
        return false;
      });
  }
  return audioProbe;
}

/**
 * The bounds a single part of the plan has to stay inside. They are the music
 * API's own, repeated here so the split never proposes a length the server has
 * to quietly clamp away.
 */
const MIN_SECTION_SECONDS = 4;
const MAX_SECTION_SECONDS = 120;

/**
 * Splits a lyric sheet on its [Section] tags and gives each part a length.
 *
 * The lengths have to add up to the length the person chose. When there are
 * lyrics, the composition plan is the whole request — the `seconds` field is
 * not part of that shape and the model never sees it — so parts summing to a
 * hundred seconds make a hundred-second song however clearly the button said
 * three minutes. Each part is therefore weighted by how many lines it carries
 * and then scaled to the chosen total, rather than sized on its own.
 */
export function splitSections(
  lyrics: string,
  totalSeconds?: number,
): { name: string; lines: string[]; seconds: number }[] {
  const out: { name: string; lines: string[] }[] = [];
  let current: { name: string; lines: string[] } | null = null;
  lyrics.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const tag = line.match(/^\[(.+)\]$/);
    if (tag) {
      if (current && current.lines.length) out.push(current);
      current = { name: tag[1], lines: [] };
      return;
    }
    if (!current) current = { name: 'Verse', lines: [] };
    current.lines.push(line);
  });
  if (current && (current as { lines: string[] }).lines.length) out.push(current);
  if (!out.length) return [];

  // More words wants more room, and that is only a starting proportion: what
  // decides the actual seconds is the total below.
  const weights = out.map((section) => Math.max(1, section.lines.length));
  const natural = weights.reduce((sum, weight) => sum + weight * 4, 0);
  const lengths = fit(weights, totalSeconds && totalSeconds > 0 ? totalSeconds : natural);
  return out.map((section, index) => ({ ...section, seconds: lengths[index] }));
}

/**
 * Weights turned into seconds that add up to the total, with every part inside
 * what the API accepts.
 *
 * Rounding and those bounds both leave a little over or under, so the remainder
 * is spent on the longest parts, where a second either way is least audible.
 * A total that cannot be reached — one section and three minutes, when a
 * section may not exceed two — comes back as close as the bounds allow rather
 * than as a request the server would reject.
 */
function fit(weights: number[], total: number): number[] {
  const sum = weights.reduce((running, weight) => running + weight, 0);
  const lengths = weights.map((weight) =>
    Math.min(MAX_SECTION_SECONDS, Math.max(MIN_SECTION_SECONDS, Math.round((weight * total) / sum))),
  );

  let drift = total - lengths.reduce((running, length) => running + length, 0);
  for (let guard = 0; drift !== 0 && guard < 1_000; guard += 1) {
    const step = drift > 0 ? 1 : -1;
    let pick = -1;
    lengths.forEach((length, index) => {
      const room = step > 0 ? length < MAX_SECTION_SECONDS : length > MIN_SECTION_SECONDS;
      if (room && (pick === -1 || length > lengths[pick])) pick = index;
    });
    if (pick === -1) break;
    lengths[pick] += step;
    drift -= step;
  }
  return lengths;
}

/**
 * The audio, read as it arrives.
 *
 * `response.blob()` would be one line and would wait in silence for the whole
 * file. Reading the stream costs a few more and buys the one honest measure of
 * progress in the whole operation: bytes actually received out of bytes
 * expected. Where the server sends no Content-Length, the expected size is
 * worked out from the format — 128 kbit/s is 16 000 bytes a second — and is a
 * stated estimate rather than a number pretending to be exact.
 */
async function collect(response: Response, request: AudioRequest): Promise<Blob> {
  const type = response.headers.get('content-type') ?? 'audio/mpeg';
  const declared = Number(response.headers.get('content-length') ?? '');
  const expected = Number.isFinite(declared) && declared > 0 ? declared : request.seconds * 16_000;

  const reader = response.body?.getReader();
  // Older browsers, and any proxy that hands back a body without a reader.
  if (!reader) return response.blob();

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.length;
    request.onStage?.({ at: 'receiving', received, expected });
  }
  return new Blob(chunks as BlobPart[], { type });
}

export const engines: Engines = {
  available: (kind) => (kind === 'audio' ? audioReady === true : false),

  async generateAudio(request: AudioRequest): Promise<EngineResult> {
    // The chosen length is what the plan has to add up to, so it is part of
    // the split rather than something the server is asked to apply after.
    const sections = splitSections(request.lyrics, request.seconds);
    request.onStage?.({
      at: 'plan',
      parts: sections.length,
      seconds: sections.reduce((total, section) => total + section.seconds, 0) || request.seconds,
    });
    // The server decides what this account may spend, so it has to be told who
    // is asking. Without a token it treats the caller as signed out.
    const token = await accessToken();

    // The server may take up to five minutes; the browser had no limit at all,
    // so anything that stalled — a dropped connection, a proxy holding the
    // socket open — left the button spinning forever with nothing to press.
    // A little past the server's own ceiling, so a real timeout there is
    // reported as itself rather than pre-empted here.
    const abort = new AbortController();
    const bell = setTimeout(() => abort.abort(), 310_000);

    // Announced before the wait, not after it. Reported once the fetch resolved,
    // this stage could only ever appear at the moment it stopped being true —
    // the whole minute of waiting showed as "working out the plan".
    request.onStage?.({ at: 'sent' });

    let response: Response;
    try {
      response = await fetch('/api/music', {
        signal: abort.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      body: JSON.stringify({
        style: request.style,
        sections,
        prompt: request.title ? `A song called "${request.title}"` : undefined,
        seconds: request.seconds,
        instrumental: Boolean(request.instrumental) || sections.length === 0,
        }),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('That took longer than five minutes and was given up on. Try a shorter song.');
      }
      throw new Error('Could not reach the music service.');
    } finally {
      clearTimeout(bell);
    }

    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { message?: string };
      // 401 and 402 are the allowance answering, not a failure — the message is
      // written for the person and is shown as-is.
      throw new Error(detail.message ?? 'The music service could not make that one.');
    }

    const model = response.headers.get('X-Music-Model') ?? 'ElevenLabs Music';
    return { blob: await collect(response, request), model };
  },

  generateVideo: async () => {
    throw new Error(NO_VIDEO_ENGINE);
  },
};
