/**
 * The storybook, recorded as a film.
 *
 * ── Why this is not `stitch.ts` ──────────────────────────────────────────
 *
 * The cutting room's stitcher takes a `Scene` whose `clip` is a video Blob
 * and decodes it. A storybook page is a still picture and a reading, and
 * there is no path through that file for one. Adding stills to it would mean
 * a second kind of scene threaded through nine hundred lines that every
 * other room in the app depends on, to serve a room that needs none of its
 * transitions, words, logo or grades.
 *
 * So this draws the pictures and records the canvas, and it is about a
 * hundred lines because that is all a slideshow is.
 *
 * ── Why the plan is somewhere else ───────────────────────────────────────
 *
 * `timelineOf` in `lib/storypages.ts` decides when each page is on screen,
 * and it is driven by `check:storie`. What is left here is drawing and
 * recording, which a browser does and a check cannot — so the split is
 * exactly along the line of what can be asserted. The arithmetic that can be
 * wrong is testable; the part that is only I/O is thin enough to read.
 *
 * ── Why the audio is scheduled rather than concatenated ──────────────────
 *
 * Each page is its own recording, and joining PCM by hand is how a click
 * appears between every page. Scheduling each one at its own moment on a
 * single audio context gives the browser the join, and the same context
 * feeds the recorder — so what is recorded is exactly what is heard.
 */

export interface Spread {
  /** Already-drawn picture for this page. */
  readonly picture: CanvasImageSource;
  /** The page read aloud. */
  readonly audio: AudioBuffer;
  /** When it comes up, and for how long, from `timelineOf`. */
  readonly at: number;
  readonly seconds: number;
}

export interface Frame {
  readonly width: number;
  readonly height: number;
}

/** 16:9, which is what a story gets watched on. */
export const STORY_FRAME: Frame = { width: 1280, height: 720 };

/**
 * Draw one page, filling the frame without squashing it.
 *
 * A generated picture is square and the frame is not, so something has to
 * give: the picture is covered rather than contained, because bars down the
 * side of a children's book read as a mistake and a crop does not.
 */
export function drawSpread(
  context: CanvasRenderingContext2D,
  picture: CanvasImageSource,
  frame: Frame,
): void {
  const source = picture as unknown as { width?: number; height?: number };
  const w = Number(source.width) || frame.width;
  const h = Number(source.height) || frame.height;
  const scale = Math.max(frame.width / w, frame.height / h);
  const drawn = { w: w * scale, h: h * scale };
  context.fillStyle = '#000';
  context.fillRect(0, 0, frame.width, frame.height);
  context.drawImage(
    picture,
    (frame.width - drawn.w) / 2,
    (frame.height - drawn.h) / 2,
    drawn.w,
    drawn.h,
  );
}

/**
 * Which page is on screen at this moment, or the last one past the end.
 *
 * Takes only the one field it reads, so the timeline out of `timelineOf` can
 * be handed to it directly — which is what `check:storie` does. A signature
 * asking for a whole `Spread` would mean a check could only reach this with
 * a decoded picture and an AudioBuffer in hand, which in a script is neither.
 */
export function spreadAt(spreads: readonly { readonly at: number }[], when: number): number {
  for (let i = spreads.length - 1; i >= 0; i -= 1) {
    if (when >= spreads[i].at) return i;
  }
  return 0;
}

export interface Recorded {
  readonly film: Blob;
  readonly seconds: number;
}

/**
 * Record the whole book, in real time.
 *
 * Real time because a canvas recorder has no other speed: the browser
 * captures what it paints. A three-minute story takes three minutes with the
 * tab open, which is the same bargain the cutting room's export makes and
 * for the same reason.
 *
 * `onAt` is called with the seconds elapsed, so the room can show where it
 * is rather than a spinner for three minutes.
 */
export async function recordStory(
  spreads: readonly Spread[],
  frame: Frame = STORY_FRAME,
  onAt?: (seconds: number) => void,
): Promise<Recorded | { says: string }> {
  if (!spreads.length) return { says: 'There is nothing to record yet.' };
  if (typeof MediaRecorder === 'undefined') {
    return { says: 'This browser cannot record a film. Try Chrome or Safari.' };
  }

  const last = spreads[spreads.length - 1];
  const total = last.at + last.seconds;

  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const context = canvas.getContext('2d');
  if (!context) return { says: 'This browser would not give a drawing surface.' };

  const Ctx = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return { says: 'This browser would not start its audio.' };
  const audio = new Ctx();
  const out = audio.createMediaStreamDestination();

  /* Every page scheduled against one clock, so the joins are the browser's
     and the recorder hears exactly what the room does. */
  const startAt = audio.currentTime + 0.2;
  for (const spread of spreads) {
    const source = audio.createBufferSource();
    source.buffer = spread.audio;
    source.connect(out);
    source.start(startAt + spread.at);
  }

  const stream = new MediaStream([
    ...canvas.captureStream(30).getVideoTracks(),
    ...out.stream.getAudioTracks(),
  ]);

  /* webm where it is taken and mp4 where it is not, which is Safari. Asked
     for rather than assumed: a recorder handed a type it does not support
     throws, and the throw is at construction rather than at the first frame. */
  const type = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']
    .find((one) => MediaRecorder.isTypeSupported(one)) ?? '';
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const parts: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };

  const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  recorder.start();

  const began = performance.now();
  await new Promise<void>((resolve) => {
    const paint = (): void => {
      const when = (performance.now() - began) / 1000;
      drawSpread(context, spreads[spreadAt(spreads, when)].picture, frame);
      onAt?.(Math.min(when, total));
      if (when >= total) { resolve(); return; }
      requestAnimationFrame(paint);
    };
    requestAnimationFrame(paint);
  });

  recorder.stop();
  await done;
  await audio.close().catch(() => {});

  return {
    film: new Blob(parts, { type: type || 'video/webm' }),
    seconds: total,
  };
}
