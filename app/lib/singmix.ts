'use client';

/**
 * The song on the take, not just the room it was played in.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * "al wat opgeneem word is die selfie video, en die liedjie saam met wat jy
 *  sing, maar nie die woorde nie."
 *
 * Three things in that sentence: the picture, the song, and her voice. The
 * words screen recorded the stream `getUserMedia` hands back — the camera and
 * the microphone — so the song only reached the file as room sound, bounced
 * off a wall and back into a phone. And with headphones in, which is how
 * anybody actually sings along to something, it did not reach the file at
 * all: the take came out as a voice over silence.
 *
 * ── Why it is a choice and not a default ─────────────────────────────────
 *
 * A clean copy of the song can be mixed into the recording. It sounds like a
 * record instead of like a room, and it is the whole point of the feature.
 * But the microphone is still open, so if the song is *also* coming out of a
 * speaker the file gets it twice — once clean and once a few milliseconds
 * later through the air — which is an echo, and reads as broken.
 *
 * No browser will say whether headphones are plugged in. So the person is
 * asked, once, in the only terms that matter to them: are you wearing
 * headphones. It is not a preference to be defaulted, it is a fact about the
 * room that only they can see.
 *
 * ── How ──────────────────────────────────────────────────────────────────
 *
 * The same graph `stitch.ts` uses to put a song under a music video: the file
 * is decoded into an `AudioBuffer` and played from a buffer source, never
 * from an `<audio>` element. An element routed into a Web Audio graph stays
 * routed after the screen closes, and breaking playback everywhere else in
 * the app to improve one recording is a bad trade — that objection is what
 * kept this unbuilt, and a buffer source does not have it.
 *
 * In headphone mode the shared element is muted and the buffer is what she
 * hears, so there is exactly one sound in the room and it is the one being
 * recorded.
 */

/** Which tracks end up on the file. Separated out so the rule can be tested. */
export function tracksFor(
  camera: readonly MediaStreamTrack[],
  mixed: readonly MediaStreamTrack[],
): MediaStreamTrack[] {
  /* The picture from the camera, the sound from the graph. Never the camera
     stream's own audio track as well: it is the same microphone arriving by
     a second path, and two of it on one file is the echo this exists to
     avoid. */
  const picture = camera.filter((one) => one.kind === 'video');
  const sound = mixed.filter((one) => one.kind === 'audio');
  return [...picture, ...sound];
}

export interface Mix {
  /** The stream to hand the recorder. */
  readonly stream: MediaStream;
  /** Start the song, if there is one on this mix. Call it as recording starts. */
  start(): void;
  /** Give back the audio context and stop the song. Safe to call twice. */
  stop(): void;
  /** Whether a clean copy of the song is actually on the stream. */
  readonly withSong: boolean;
}

function contextClass(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/**
 * Build the stream the take is recorded from.
 *
 * `song` is the file being sung along to, and `from` is how far into it the
 * person already is — she opens the words while it is playing and presses
 * record somewhere in the middle, so a copy starting at zero would be a
 * different song from the one she can hear.
 *
 * Falls back to the camera stream untouched whenever the graph cannot be
 * built — no Web Audio, a file that will not decode, a browser that refuses
 * the context. A take that sounds like a room is worth having; a screen that
 * refuses to record is not.
 */
export async function mixFor(
  camera: MediaStream,
  song: Blob | null,
  from: number,
): Promise<Mix> {
  const plain: Mix = { stream: camera, start: () => undefined, stop: () => undefined, withSong: false };

  const Ctx = contextClass();
  if (!Ctx || typeof MediaStream === 'undefined') return plain;

  let context: AudioContext;
  try {
    context = new Ctx();
  } catch {
    return plain;
  }

  const destination = context.createMediaStreamDestination();

  /* Her voice, always. Taken from the camera stream's own audio track rather
     than asking for the microphone a second time: a second getUserMedia is a
     second permission prompt on some browsers, and on others a second, quieter
     copy of the same input. */
  const heard = camera.getAudioTracks();
  if (heard.length > 0) {
    try {
      context.createMediaStreamSource(new MediaStream(heard)).connect(destination);
    } catch {
      /* Nothing to be done about a microphone the graph will not take. The
         song below is still worth having on the file. */
    }
  }

  let source: AudioBufferSourceNode | null = null;
  if (song) {
    try {
      const buffer = await context.decodeAudioData(await song.arrayBuffer());
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      /* And to the speakers, because the shared element is muted while this
         mode is on. Without this she would be singing to nothing. */
      source.connect(context.destination);
    } catch {
      source = null;
    }
  }

  if (!source && heard.length === 0) {
    /* Neither half of the sound could be built. The plain camera stream is
       strictly better than a silent one. */
    void context.close().catch(() => undefined);
    return plain;
  }

  const stream = new MediaStream(tracksFor(camera.getTracks(), destination.stream.getTracks()));
  let stopped = false;

  return {
    stream,
    withSong: source !== null,
    start: () => {
      void context.resume().catch(() => undefined);
      /* `offset` and not a seek afterwards: a buffer source can only be
         started once, and only its start call knows where to begin. */
      try {
        source?.start(0, Math.max(0, from));
      } catch {
        /* Already started, or a start past the end of the song. */
      }
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        source?.stop();
      } catch {
        /* Never started. */
      }
      void context.close().catch(() => undefined);
    },
  };
}
