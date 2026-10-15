/**
 * What video can do right now, asked of the server.
 *
 * Out of `engines.ts` so that asking costs nothing in imports: `engines.ts`
 * also holds the door to `/api/music`, and a room that only wants to know
 * whether a picture can be brought to life should not reach a song engine.
 */
import { accessToken } from './cloud';

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
    { seconds: number[]; aspects: string[]; speaks: boolean; startFrame: boolean; endFrame?: boolean }
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
        };
      } catch {
        videoState = NO_ENGINE;
      }
      return videoState;
    })();
  }
  return videoProbe;
}

export async function probeVideo(): Promise<boolean> {
  return (await probeVideoEngine()).available;
}

/** Whether the probe has answered, and answered yes. */
export function videoIsReady(): boolean {
  return videoState?.available === true;
}
