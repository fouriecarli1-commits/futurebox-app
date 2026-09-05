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
 * Video is now two things, and both are real. A browser-drawn video is made
 * from the track's own audio (`app/lib/video.ts`), costs nothing, works
 * offline and is what a free account gets. `generateVideo` is the other one:
 * Kling, through `app/api/video`, which is a job rather than a call — the
 * server starts it and this asks how it is going until there is a file. It is
 * switched on by KLINGAI_ACCESS_KEY and KLINGAI_SECRET_KEY, and
 * `available('video')` is false until `probeVideo()` has confirmed with the
 * server that they are set. No screen may offer the engine before that.
 *
 * On Suno specifically: it has no public generation API. The wrappers people
 * pass around scrape a private endpoint, so they break without warning and
 * breach its terms. ElevenLabs Music is the closest legitimate equivalent —
 * lyrics per section, vocals, and a commercial licence on paid plans.
 */

import { accessToken } from './cloud';
import { shapeSong } from './songshape';

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
  /**
   * A sound of the caller's own, trained on their own songs.
   *
   * Passed through as an id and nothing more: the server checks it belongs to
   * whoever is asking before it reaches ElevenLabs, so a browser that made one
   * up gets an ordinary song rather than somebody else's sound.
   */
  readonly finetuneId?: string;
  /** Told what is happening, as it happens. Optional; nothing depends on it. */
  readonly onStage?: (stage: Stage) => void;
}

/**
 * The shapes an engine will make, which is not the same set the browser's own
 * renderer makes.
 *
 * `lib/video.ts` has an `Aspect` of two values, because the sketch it draws
 * only ever does wide and tall. The engines do three, and `VideoCanvas`
 * declared its own three-value copy locally to say so — two types of the same
 * name meaning different things, with `shapes[0] as Aspect` papering over the
 * gap. Named once, here, where the request that carries it is defined.
 */
export type EngineAspect = '16:9' | '9:16' | '1:1';

export interface VideoRequest {
  readonly title: string;
  readonly treatment: string;
  readonly aspect: EngineAspect;
  readonly seconds: number;
  /**
   * What was paid for, not which engine. The server picks the engine, because
   * the cheapest and dearest differ by thirteen times the money and nobody
   * buying a video has any way to know that.
   */
  readonly grade?: 'standard' | 'better' | 'premium';
  /** Whether a quoted line should be spoken by the engine itself. */
  readonly speak?: boolean;
  /**
   * A picture for the clip to start from, as a data URL.
   *
   * The cheapest thing on this whole desk. A look settled in one frame is a
   * look that does not have to be found by describing it three times at full
   * price, and it is the only way to put the same face, the same room or the
   * same product in two clips that are meant to cut together.
   */
  readonly image?: string;
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
 * The same question about video, and rather more of an answer.
 *
 * Whether the engine is on is not the only thing worth knowing about it. Which
 * model, whether a quoted line will actually be spoken, and — for whoever runs
 * the place — how much of the month's allowance is gone. All of that used to
 * be findable only by opening /api/video and reading JSON, which is a thing
 * nobody should have to do to find out whether their own app is plugged in.
 */
export interface VideoGrades {
  readonly available: boolean;
  /** 'api-key', 'signed' or 'none' — which Kling credentials the server found. */
  readonly auth: string;
  /** Which rungs have a working engine behind them right now. */
  readonly grades: readonly string[];
  /**
   * What each rung can actually make. The desk reads this rather than
   * guessing — a length or a shape nobody can generate is not a choice, it is
   * a refusal waiting to happen four minutes later.
   */
  readonly can?: Record<
    string,
    { seconds: number[]; aspects: string[]; speaks: boolean; startFrame: boolean }
  >;
  /** True where some available engine can speak a quoted line aloud. */
  readonly sound: boolean;
  /**
   * True where some available engine will start from a picture you attach.
   *
   * The desk asks before it shows the attachment. A paperclip that quietly
   * does nothing is worse than no paperclip, because the member believes the
   * clip they paid for came from their picture.
   */
  readonly startFrame: boolean;
  /**
   * Every engine and what it has spent this month. Present only for whoever
   * runs the place — it is the size of a bill, and the member buying a video
   * has no business with it and no use for it.
   */
  readonly engines?: readonly {
    readonly id: string;
    readonly name: string;
    readonly grade: string;
    readonly model: string;
    readonly used: number;
    readonly ceiling: number;
  }[];
}

/** Kept as the old name so screens that only wanted a yes or no still read. */
export type VideoEngine = VideoGrades;

const NO_ENGINE: VideoGrades = {
  available: false,
  auth: 'none',
  grades: [],
  sound: false,
  startFrame: false,
};

let videoState: VideoGrades | null = null;
let videoProbe: Promise<VideoGrades> | null = null;

/**
 * Ask the server what video can do right now.
 *
 * Carries the token when there is one, because the per-engine spend is only
 * answered for the operator and there is no way to ask as them without it.
 */
export async function probeVideoEngine(): Promise<VideoGrades> {
  if (videoState !== null) return videoState;
  if (!videoProbe) {
    videoProbe = (async () => {
      try {
        const token = await accessToken();
        const response = await fetch('/api/video', {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error('probe');
        const data = (await response.json()) as Partial<VideoGrades>;
        videoState = {
          available: Boolean(data.available),
          auth: String(data.auth ?? 'none'),
          grades: Array.isArray(data.grades) ? data.grades : [],
          sound: Boolean(data.sound),
          startFrame: Boolean(data.startFrame),
          ...(data.can ? { can: data.can } : {}),
          ...(data.engines ? { engines: data.engines } : {}),
        };
      } catch {
        videoState = NO_ENGINE;
      }
      videoReady = videoState.available;
      return videoState;
    })();
  }
  return videoProbe;
}

/** The plain yes or no, for screens that only need that much. */
let videoReady: boolean | null = null;

export async function probeVideo(): Promise<boolean> {
  return (await probeVideoEngine()).available;
}

/**
 * Splits a lyric sheet on its [Section] tags and gives the song a shape.
 *
 * The lengths have to add up to the length the person chose. When there are
 * lyrics, the composition plan is the whole request — the `seconds` field is
 * not part of that shape and the model never sees it — so parts summing to a
 * hundred seconds make a hundred-second song however clearly the button said
 * three minutes.
 *
 * How that total is spread used to be a weighting: each part got a share of
 * the length in proportion to how many lines it carried. Four lines and three
 * minutes came out as one part of a hundred and twenty seconds holding four
 * lines, and what comes back from asking a model to stretch one verse over two
 * minutes is a wandering, repeating take — the "baie baie sleg" Carli paid for
 * more than once.
 *
 * The words now get the time the words need and the surplus goes to parts with
 * nobody singing on them, which is what a song is actually made of. That lives
 * in `lib/songshape.ts`, on its own, because it is arithmetic worth testing
 * without a browser.
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

  return shapeSong(out, totalSeconds ?? 0).map((part) => ({
    name: part.name,
    lines: part.lines.slice(),
    seconds: part.seconds,
  }));
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
  available: (kind) => (kind === 'audio' ? audioReady === true : videoReady === true),

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
        finetuneId: request.finetuneId || undefined,
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

  /**
   * A video from Kling, which is a wait rather than a call.
   *
   * The server starts a job and answers with an id; this asks how it is going
   * until it is done, then downloads our own copy of the file. Every message
   * shown along the way is something that was actually observed — there is no
   * percentage, because the engine does not report one and inventing a bar
   * that creeps to ninety and waits there would be a lie about what is known.
   */
  generateVideo: async (request) => {
    const token = await accessToken();

    const started = await fetch('/api/video', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt: `${request.title}. ${request.treatment}`.trim(),
        aspect: request.aspect,
        /* The length as it was asked for.

           This was `request.seconds > 7 ? 10 : 5`, which is the same bug the
           route had and had already been fixed for: every length that was not
           five became ten. The desk offers 4, 6, 8, 15, 20 and 30 because the
           engines declare them, and it prices what it offers — so somebody
           could pick thirty seconds, watch the button say what thirty seconds
           costs, pay it, and be handed ten. Fixing one end of a wire and not
           the other left the desk lying in exactly the same way, one layer
           further in.

           Nothing downstream needed a clamp here: the route checks the ask
           against every length an engine declares, and `nearestLength` moves
           it to what the chosen engine actually makes. */
        seconds: request.seconds,
        grade: request.grade ?? 'standard',
        speak: request.speak === true,
        ...(request.image ? { image: request.image } : {}),
      }),
    });

    const opened = (await started.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!started.ok || !opened.id) {
      // A refusal, a plan gate, a used-up allowance: every one of those has a
      // message written for the person, and it is shown as it was written.
      throw new Error(opened.message ?? NO_VIDEO_ENGINE);
    }

    // Ten seconds between asks, for up to eight minutes. Kling's own ceiling
    // for a clip this length is under five; the rest is room for a queue.
    const deadline = Date.now() + 8 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((wake) => setTimeout(wake, 10_000));

      const asked = await fetch(`/api/video?id=${encodeURIComponent(opened.id)}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      const progress = (await asked.json().catch(() => ({}))) as {
        state?: string;
        url?: string;
        message?: string;
      };

      if (progress.state === 'failed') {
        throw new Error(progress.message ?? 'The video engine could not make that one.');
      }
      if (progress.state === 'done' && progress.url) {
        const file = await fetch(progress.url);
        if (!file.ok) throw new Error('The video was made but could not be downloaded.');
        return { blob: await file.blob(), model: 'Kling AI' };
      }
    }

    // The job is not lost — it is in `videos` with the credits still spent on
    // it, and asking again later will find it. Said plainly rather than
    // reported as a failure, which would be untrue and would suggest a refund
    // that is not coming.
    throw new Error(
      'The engine is still working on that one after eight minutes. It has not been lost — it will be in your videos when it lands.',
    );
  },
};
