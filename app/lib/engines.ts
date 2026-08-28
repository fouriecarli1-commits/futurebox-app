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

export interface AudioRequest {
  readonly title: string;
  readonly style: string;
  readonly lyrics: string;
  readonly bpm: number;
  readonly key: string;
  readonly seconds: number;
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

/** Splits a lyric sheet on its [Section] tags, which is what the plan needs. */
export function splitSections(lyrics: string): { name: string; lines: string[]; seconds: number }[] {
  const out: { name: string; lines: string[]; seconds: number }[] = [];
  let current: { name: string; lines: string[]; seconds: number } | null = null;
  lyrics.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const tag = line.match(/^\[(.+)\]$/);
    if (tag) {
      if (current && current.lines.length) out.push(current);
      current = { name: tag[1], lines: [], seconds: 20 };
      return;
    }
    if (!current) current = { name: 'Verse', lines: [], seconds: 20 };
    current.lines.push(line);
  });
  if (current && (current as { lines: string[] }).lines.length) out.push(current);
  // Longer sections for more words, within what the API accepts.
  return out.map((section) => ({
    ...section,
    seconds: Math.min(60, Math.max(8, section.lines.length * 4)),
  }));
}

export const engines: Engines = {
  available: (kind) => (kind === 'audio' ? audioReady === true : false),

  async generateAudio(request: AudioRequest): Promise<EngineResult> {
    const sections = splitSections(request.lyrics);
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
        instrumental: sections.length === 0,
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

    return {
      blob: await response.blob(),
      model: response.headers.get('X-Music-Model') ?? 'ElevenLabs Music',
    };
  },

  generateVideo: async () => {
    throw new Error(NO_VIDEO_ENGINE);
  },
};
