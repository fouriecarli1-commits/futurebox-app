'use client';

/**
 * Cutting a piece out of a video somebody owns.
 *
 * ── Why this exists, and what it is not ──────────────────────────────────
 *
 * The question was whether the hooks room could pull clips out of YouTube.
 * It cannot — YouTube's Terms allow access only through the playback pages,
 * the embeddable player, or a means they designate, and their API serves
 * metadata rather than the media. See `docs/OPEN-QUESTIONS.md` §G.
 *
 * What is legitimate is the same job on a file somebody already has: their
 * own recording, their own export, the video they filmed. That is what this
 * does, and it is the whole of the useful half of the original question.
 *
 * ── How the moments are found ────────────────────────────────────────────
 *
 * By the video's own sound. `decodeAudioData` on the file gives the audio
 * track as samples, and the hook-finder that already reads songs reads that
 * — so a moment in a video is chosen the same way a moment in a song is,
 * where something arrives rather than where the file happens to start.
 *
 * A video whose audio this browser cannot decode is refused with a sentence
 * rather than cut silently: a hook with no sound is not a hook.
 *
 * ── How the cut is made ──────────────────────────────────────────────────
 *
 * `lib/stitch.ts`, with one scene and a window. It plays the clip onto a
 * canvas and records it, which is the same mechanism the storyboard uses to
 * cut a film — so the picture is fitted into the shape rather than stretched
 * or cropped, and the trim is a seek rather than a promise.
 *
 * The stitcher deliberately drops a clip's own sound, because a film cut from
 * a dozen generated clips wants one song under it and not a dozen room tones.
 * That is wrong here: the whole point of a hook is the moment as it sounded.
 * So the window's audio is sliced out of the decoded buffer, encoded as a
 * wav, and handed back in as the film's soundtrack.
 */

import { stitch, type Made } from './stitch';
import { encodeWav } from './wav';

/** The shapes a hook is cut to. Tall first: that is what these are for. */
export const HOOK_SHAPES = {
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1280, height: 720 },
} as const;

export type HookShape = keyof typeof HOOK_SHAPES;

/** The audio of a video file, or null when this browser cannot read it. */
export async function soundOf(file: Blob): Promise<AudioBuffer | null> {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const context = new Ctx();
  try {
    return await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    return null;
  } finally {
    void context.close();
  }
}

/**
 * The part of a decoded buffer between two times, as a wav.
 *
 * Copied channel by channel rather than by slicing the underlying array: the
 * channels of an `AudioBuffer` are separate typed arrays and treating them as
 * one interleaved block is the classic way to get a clip that plays half in
 * one ear and a second late.
 */
export function soundBetween(buffer: AudioBuffer, from: number, to: number): Blob {
  const rate = buffer.sampleRate;
  const start = Math.max(0, Math.min(buffer.length, Math.round(from * rate)));
  const end = Math.max(start + 1, Math.min(buffer.length, Math.round(to * rate)));
  const frames = end - start;

  const Ctx =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const room = new Ctx(buffer.numberOfChannels, frames, rate);
  const cut = room.createBuffer(buffer.numberOfChannels, frames, rate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    cut.copyToChannel(buffer.getChannelData(channel).subarray(start, end), channel);
  }
  return encodeWav(cut);
}

/**
 * A hook, cut out of a video file, with the sound that was on it.
 *
 * `onScene` is not offered: there is one scene, so the only honest progress
 * is "it is running", and the cut happens in real time — a fifteen-second
 * hook takes fifteen seconds, which the room says before the button is
 * pressed rather than after.
 */
export async function cutHook(
  file: Blob,
  from: number,
  seconds: number,
  shape: HookShape,
  sound: AudioBuffer | null,
): Promise<Made> {
  const to = from + seconds;
  return stitch({
    scenes: [{ clip: file, from, to }],
    audio: sound ? soundBetween(sound, from, to) : null,
    ...HOOK_SHAPES[shape],
    // A wide video cut to a tall hook is letterboxed by default; the blurred
    // fill is what makes it read as one picture rather than a small picture in
    // a black box, and it is what every one of these is posted looking like.
    background: 'blur',
  });
}
