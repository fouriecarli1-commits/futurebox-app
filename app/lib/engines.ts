/**
 * Where a real music or video engine plugs in.
 *
 * Nothing in FutureBox generates AI audio or video today. This file is the one
 * seam where that changes, kept deliberately small so wiring an engine is a
 * contained job rather than a hunt through the app.
 *
 * It is a contract, not a stub pretending to work: `available()` answers false
 * until an engine is configured, and every screen asks before offering. No
 * screen claims a capability this file has not confirmed.
 *
 * To connect one:
 *   1. Pick an engine with a documented HTTP API and a key you hold. Suno has
 *      no public generation API — the wrappers people pass around break and
 *      violate its terms. ElevenLabs Music, Stability, Replicate and Runway do
 *      publish APIs.
 *   2. Add a route handler under `app/api/` that calls it server-side, so the
 *      key never reaches the browser. `app/api/songwriter/route.ts` is the
 *      shape to copy — including how it answers when no key is set.
 *   3. Implement `generateAudio` / `generateVideo` below to call that route.
 *   4. Return a URL or a Blob. The rest of the app already handles both: the
 *      track lands in the maker's channel, plays, downloads, shares and remixes
 *      with no further changes.
 */

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

const NOT_CONNECTED = 'No music or video engine is connected yet.';

export const engines: Engines = {
  available: () => false,
  generateAudio: async () => {
    throw new Error(NOT_CONNECTED);
  },
  generateVideo: async () => {
    throw new Error(NOT_CONNECTED);
  },
};
