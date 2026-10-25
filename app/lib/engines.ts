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

import { notify } from './notify';
import { accessToken, currentAccount } from './cloud';
import { videoIsReady } from './videograde';
import { stillWorthWaiting } from './jobwait';
import { shapeSong } from './songshape';
import { rowsFrom, sungAnchorsIn, sungWordsIn } from './sungwords';

/**
 * A refusal from a route, with whether there is another way round it.
 *
 * An `Error` subclass rather than a return shape, so that nothing which
 * already catches one of these has to change: `error.message` is the same
 * sentence it always was. `sayItInstead` is read by the song room and by
 * nothing else — see `Refusal.sayItInstead` in `lib/moderation.ts`, where
 * exactly one rule sets it.
 */
export class Refused extends Error {
  readonly sayItInstead: boolean;

  constructor(message: string, sayItInstead = false) {
    super(message);
    this.name = 'Refused';
    this.sayItInstead = sayItInstead;
  }
}


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
  /** The pair room it is made from, when two people make it together. */
  readonly pair?: string;
  /**
   * How each line is to be sung, from the member reading it aloud —
   * written line to spoken spelling (`lib/server/sayas.ts`). The words
   * shown and released stay the written ones.
   */
  readonly sayAs?: Readonly<Record<string, string>>;
  /**
   * One of several versions of the same song, made in one press so she can
   * pick: how many, which one this is (from nought), and the id of the run,
   * which the server's ledger holds every take to. See `versionsCost`.
   */
  readonly versions?: number;
  readonly take?: number;
  readonly bundle?: string;
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
  /**
   * What the job is called on this device — never sent to the engine, which
   * gets `treatment` alone. See the body of `generateVideo`.
   */
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
  /**
   * Which room asked, so the room that started a job is the one that
   * collects it if she leaves before it lands. See `resumeVideos`.
   */
  readonly surface?: string;
}

export interface EngineResult {
  readonly blob: Blob;
  /** Shown against the release, so listeners see what made it. */
  readonly model: string;
  /**
   * The words the engine actually sang, where it said so.
   *
   * Absent for an instrumental, for an engine that sends no words, and —
   * on purpose — where no row the engine sent looks like a lyric sheet. A
   * description shown as lyrics is a release with the wrong words printed
   * on it, so `lib/sungwords.ts` says no rather than guessing.
   */
  readonly sung?: string;
  /** When the engine said each section starts, where it said (`sungAnchorsIn`). */
  readonly sungAt?: readonly { readonly line: string; readonly at: number }[];
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
import type { SongEngine } from './credits';

let audioReady: boolean | null = null;
let audioProbe: Promise<boolean> | null = null;

/**
 * Which engine a song with English words goes to, as the music route says.
 *
 * ElevenLabs until the route has answered, because it is the dearer of the
 * two and a price shown early should never be the lower one. Read off the
 * same request `probeAudio` makes, so asking costs nothing extra.
 */
let songEngineIs: SongEngine = 'eleven';
export async function songEngine(): Promise<SongEngine> {
  await probeAudio();
  return songEngineIs;
}

export async function probeAudio(): Promise<boolean> {
  if (audioReady !== null) return audioReady;
  if (!audioProbe) {
    audioProbe = fetch('/api/music')
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((data: { available?: boolean; engine?: string }) => {
        audioReady = Boolean(data.available);
        songEngineIs = data.engine === 'google' ? 'google' : 'eleven';
        return audioReady;
      })
      .catch(() => {
        audioReady = false;
        return false;
      });
  }
  return audioProbe;
}

/* The video probe lives in `videograde.ts`, so a screen that only asks what
   video can do — the photo editor's "give it a little motion" — can ask
   without importing the song engine's door to `/api/music` along with it
   (`check:kidsafe` follows imports, and counts every door it finds). */
export { probeVideo, probeVideoEngine, videoIsReady, type VideoEngine, type VideoGrades } from './videograde';

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
 * minutes is a wandering, repeating take — the "baie baie sleg" The owner paid for
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
  available: (kind) => (kind === 'audio' ? audioReady === true : videoIsReady()),

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
        pair: request.pair || undefined,
        sayAs: request.sayAs && Object.keys(request.sayAs).length ? request.sayAs : undefined,
        ...(request.versions && request.versions > 1
          ? { versions: request.versions, take: request.take ?? 0, bundle: request.bundle }
          : {}),
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
      /* ── One refusal travels with a flag on it ───────────────────────
 
         A prompt refused for naming an artist's SOUND can be turned into a
         describable style instead — see `app/api/styleword/route.ts`. The
         room can only offer that if it knows which refusal it got, and a
         plain `Error` carries nothing but a sentence.
 
         Thrown rather than returned so every existing caller is unchanged:
         a `Refused` IS an `Error`, so `error.message` still reads the same
         everywhere that only wants the words. */
      throw new Refused(
        detail.message ?? 'The music service could not make that one.',
        Boolean((detail as { sayItInstead?: boolean }).sayItInstead),
      );
    }

    const model = response.headers.get('X-Music-Model') ?? 'ElevenLabs Music';
    /* ── The words it actually sang ────────────────────────────────────
 
       Google's music model answers with the lyrics as well as the audio,
       and until now the browser read the header and nothing looked at it —
       `lib/server/lyria.ts` found the same fault one layer down on 9
       October, where the rows were extracted and dropped on the floor. This
       is the other half of that.
 
       `null` where no row looks like a lyric sheet, which is a real answer:
       no words shown is unhelpful, and the wrong words shown is a release
       with a description printed on it. `lib/sungwords.ts` carries the
       reasoning and `check:gesing` drives the reading. */
    const rows = rowsFrom(response.headers);
    const sung = sungWordsIn(rows);
    const sungAt = sungAnchorsIn(rows);
    return {
      blob: await collect(response, request),
      model,
      ...(sung ? { sung } : {}),
      ...(sungAt.length ? { sungAt } : {}),
    };
  },

  /**
   * A video, which is a wait rather than a call.
   *
   * The server starts a job and answers with an id; this asks how it is going
   * until it is done, then downloads our own copy of the file. Every message
   * shown along the way is something that was actually observed — there is no
   * percentage, because the engine does not report one and inventing a bar
   * that creeps to ninety and waits there would be a lie about what is known.
   *
   * The asking is `collectVideo` below, and the id is written down on this
   * device before the first ask — see `PENDING_KEY` for why.
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
        /* The treatment and nothing else.

           This was `${request.title}. ${request.treatment}` — so the scene's
           label ("Marketing. "), a song's title or the storyboard's "Shot. "
           went to the engine as the first words of the shot, and a video model
           reads the first words of a prompt as the most important thing in
           it. A song called "Rooi Rose" asked for roses. The title is still
           taken: it names the job on this device (`rememberPending`), which is
           what it was for. */
        prompt: request.treatment.trim(),
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

    const owner = (await currentAccount().catch(() => null))?.id;
    const job: PendingVideo = {
      ...(owner ? { owner } : {}),
      id: opened.id,
      surface: request.surface ?? 'canvas',
      title: request.title,
      prompt: request.treatment.trim(),
      aspect: request.aspect,
      seconds: request.seconds,
      grade: request.grade ?? 'standard',
      spoken: request.speak === true,
      startedAt: Date.now(),
    };
    rememberPending(job);
    return collectVideo(job, false);
  },
};

/* ── A job that outlives the page that started it ──────────────────────────

   The owner, 15 October 2026: *"Kyk mooi of elke funksie in video desk ... werk."*

   The poll had no try around it. One dropped connection on a phone in the
   eight minutes a clip takes threw out of the loop, the id went with it, and
   the job was lost to the browser — while the server only marks a row done,
   or refunds a failed one, when somebody ASKS it about that row (`GET
   /api/video?id=`). Nothing else ever asks. So a blip mid-wait meant a clip
   paid for and never collected, and a failed one never refunded, and the
   desk said "it keeps going if you leave" about a job nobody would ever
   look at again.

   Now: the id is written to this device the moment the server hands it back
   and crossed off only when the server has said done or failed. A blip is
   waited out with a longer gap rather than thrown. And a room that mounts
   asks about whatever it left behind (`resumeVideos`), which is the ask that
   collects the clip — or brings the credits back. */

/** Where the jobs still out are written down. Per device, like `makes`. */
const PENDING_KEY = 'futurebox.video.pending.v1';

/** A job old enough that it is not coming, and asking again is only noise. */
const PENDING_OLDEST = 7 * 24 * 60 * 60_000;

export interface PendingVideo {
  readonly id: string;
  /** Which room started it, so the right room collects it. */
  readonly surface: string;
  readonly title: string;
  readonly prompt: string;
  readonly aspect: EngineAspect;
  readonly seconds: number;
  readonly grade: 'standard' | 'better' | 'premium';
  readonly spoken: boolean;
  readonly startedAt: number;
  /**
   * The account that started it. The list is per device, and on a shared
   * phone a second person asking about the first one's job gets a 404 — which
   * used to wipe it, so it was never collected or refunded (found in review,
   * 15 October 2026). Absent on jobs written before this was added.
   */
  readonly owner?: string;
}

function readPending(): PendingVideo[] {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    const list = raw ? (JSON.parse(raw) as PendingVideo[]) : [];
    return Array.isArray(list) ? list.filter((one) => one && typeof one.id === 'string') : [];
  } catch {
    return [];
  }
}

function writePending(list: readonly PendingVideo[]): void {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    // Storage off or full. The wait in this tab still works; only coming
    // back for it later does not, which is how it was before this existed.
  }
}

function rememberPending(job: PendingVideo): void {
  writePending([job, ...readPending().filter((one) => one.id !== job.id)]);
}

function forgetPending(id: string): void {
  writePending(readPending().filter((one) => one.id !== id));
}

/**
 * Ids being asked about in this tab right now.
 *
 * A room that mounts again while the press that started a job is still
 * waiting must not start a second wait on the same id — two waits collect
 * the clip twice and file it twice.
 */
const asking = new Set<string>();

/** What `GET /api/video?id=` answers. */
type JobAnswer = { state?: string; url?: string | null; message?: string };

/** The quickest gap between asks: the provider's own guidance for video. */
const ASK_EVERY = 10_000;
/** The slowest, once a run of asks has failed in a row. */
const ASK_SLOWEST = 60_000;

/**
 * Wait for one job, and come back with the clip or a sentence.
 *
 * Every failure to ASK — no network, a 5xx, a sign-in that has lapsed and
 * is being renewed — doubles the gap and asks again, inside the same
 * eight-minute ceiling every other room uses (`lib/jobwait.ts`). Only the
 * server saying failed, or saying it has never heard of the id, ends the
 * wait early. `askNow` skips the first gap, for a job that was started
 * long enough ago that it may well be waiting already.
 */
async function collectVideo(job: PendingVideo, askNow: boolean): Promise<EngineResult> {
  asking.add(job.id);
  try {
    const since = Date.now();
    let wait = ASK_EVERY;
    let first = true;
    while (stillWorthWaiting(since, Date.now())) {
      if (!(first && askNow)) await new Promise((wake) => setTimeout(wake, wait));
      first = false;

      let progress: JobAnswer | null = null;
      let gone = false;
      try {
        const token = await accessToken();
        const asked = await fetch(`/api/video?id=${encodeURIComponent(job.id)}`, {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        if (asked.status === 404) gone = true;
        else if (asked.ok) progress = (await asked.json().catch(() => null)) as JobAnswer | null;
      } catch {
        // Not reached. Said nothing about the job, so it is asked about again.
      }

      if (gone) {
        forgetPending(job.id);
        throw new Error('That video could not be found on your account any more.');
      }
      if (!progress) {
        wait = Math.min(wait * 2, ASK_SLOWEST);
        continue;
      }
      wait = ASK_EVERY;

      if (progress.state === 'failed') {
        forgetPending(job.id);
        // The route has already given the credits back by the time it says
        // failed — it refunds on the same ask that marks the row.
        throw new Error(progress.message ?? 'The video engine could not make that one.');
      }
      if (progress.state === 'done' && progress.url) {
        const file = await fetch(progress.url).catch(() => null);
        if (!file?.ok) {
          // Made and kept on our side; only this copy did not arrive. The
          // id stays written down, so the next visit asks for a fresh link.
          throw new Error(
            'The video was made but could not be downloaded just now. It is kept, and it comes in the next time you open this room.',
          );
        }
        const blob = await file.blob();
        forgetPending(job.id);
        /* Said wherever she is (the owner, 20 October 2026: a notification
           for videos that have finished). Not over the room that asked for
           it while she is looking at it — `Notifier` leaves that one out. */
        notify({
          id: `video-${job.id}`,
          kind: 'video',
          room: job.surface,
          title: 'Your video is ready',
          titleKey: 'notice.videoReady',
          body: (job.title || job.prompt).slice(0, 90) || undefined,
        });
        return { blob, model: 'Video engine' };
      }
    }

    // The job is not lost — the id is still written down on this device, and
    // the room that started it asks again whenever it is opened. Said plainly
    // rather than reported as a failure, which would be untrue and would
    // suggest a refund that is not (yet) coming.
    throw new Error(
      'The engine is still working on that one after eight minutes. It has not been lost — it comes in the next time you open this room, or the credits come back if it failed.',
    );
  } finally {
    asking.delete(job.id);
  }
}

/**
 * Ask about every job a room left behind, and hand each one back as it lands.
 *
 * Called when a room mounts. A job this tab is already waiting on is left to
 * the wait that started it. `landed` is called whether or not the room is
 * still on screen — it is where the clip gets filed, and filing must not
 * depend on her still looking.
 */
export function resumeVideos(
  surface: string | readonly string[],
  landed: (job: PendingVideo, result: EngineResult) => void,
  failed: (job: PendingVideo, message: string) => void,
): void {
  if (typeof window === 'undefined') return;
  const surfaces = typeof surface === 'string' ? [surface] : surface;
  void (async () => {
    /* Only this account's jobs: another person's on the same phone are left
       for them, not asked about and wiped by the 404 their owner check gives. */
    const me = (await currentAccount().catch(() => null))?.id;
    const now = Date.now();
    const all = readPending();
    const fresh = all.filter((one) => now - one.startedAt < PENDING_OLDEST);
    if (fresh.length !== all.length) writePending(fresh);
    for (const job of fresh) {
      if (!surfaces.includes(job.surface) || asking.has(job.id)) continue;
      if (job.owner && job.owner !== me) continue;
      void collectVideo(job, true).then(
        (result) => landed(job, result),
        (problem: unknown) => failed(job, problem instanceof Error ? problem.message : String(problem)),
      );
    }
  })();
}
