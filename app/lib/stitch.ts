'use client';

/**
 * Many short clips, one long film.
 *
 * ── The problem this exists for ──────────────────────────────────────────
 *
 * Every video engine on the shelf caps a single generation somewhere between
 * four and thirty seconds. A music video is three minutes. That gap is not
 * something a better prompt closes — it is a hard limit of the models — so a
 * long video has to be built the way a film always has been: shot by shot,
 * cut together.
 *
 * The cutting is the part that was missing. Generating twelve clips was
 * already possible and left somebody with twelve files and no way to make one.
 *
 * ── Why it runs in the browser ───────────────────────────────────────────
 *
 * The clips are already here. Sending twelve of them up to a server, encoding
 * there, and sending one back is a lot of somebody's mobile data for work a
 * laptop can do, and it needs a machine this app does not run — a Vercel
 * function has neither the time nor the memory for a three-minute encode.
 *
 * ── How, and what that costs ─────────────────────────────────────────────
 *
 * Each clip is played onto one canvas in order while a `MediaRecorder` records
 * the canvas the whole way through. It is the same mechanism the booth and the
 * selfie recorder already use, so it works everywhere they do.
 *
 * The cost is honest and unavoidable: **it happens in real time**. A
 * three-minute film takes three minutes, with the tab open and awake. That is
 * not slowness in this code, it is what recording a canvas means — the frames
 * are captured as they are painted, and painting them faster does not make the
 * video shorter.
 *
 * `VideoEncoder` (WebCodecs) would beat that handsomely: decode and re-encode
 * without playing anything, several times faster than real time. It is not
 * used here for a reason that matters more than speed — it is absent from the
 * browser this project runs its checks in, so a WebCodecs path could be
 * written and could not be verified. Everything else in this repository is
 * measured before it is claimed, and an export nobody has watched work is the
 * worst thing to make an exception for. The note in `docs/LONG_VIDEO.md` says
 * what it would take to add it later.
 *
 * ── The sound ────────────────────────────────────────────────────────────
 *
 * `canvas.captureStream()` carries pictures and nothing else, so a music video
 * built this way would come out silent. The song is played through an
 * `AudioContext` into a `MediaStreamAudioDestinationNode`, and that track is
 * added to the same stream the recorder is given — one file, sound and
 * picture, in one pass.
 *
 * The clips' own sound is deliberately not carried. Every one of them is a
 * separate generation with its own room tone, and twelve of those cutting
 * against each other under a song is noise. A clip with a line worth keeping
 * belongs in the video desk on its own.
 */

export interface Scene {
  /** The clip itself, as it came back from the engine. */
  readonly clip: Blob;
  /** Named only so a progress line can say which one is being laid down. */
  readonly name?: string;
  /**
   * Where to start and stop inside the clip, in seconds.
   *
   * A generation comes back at the length the engine makes, which is rarely
   * the length the cut wants: the first half-second is the model finding the
   * shot, and the last second is often it drifting off. Both are paid for
   * either way, so trimming is the cheapest edit available — no second
   * generation, no upload, just less of the same file.
   *
   * Left out means the whole clip. Out of order or out of range is clamped
   * rather than refused: a slider that can be dragged past the end is a
   * slider somebody will drag past the end, and losing a scene over it would
   * be a poor trade for a validation message.
   */
  readonly from?: number;
  readonly to?: number;
  /**
   * Words printed over this scene, for the whole time it is on screen.
   *
   * Burned into the picture rather than carried as a subtitle track, and that
   * is a decision rather than a shortcut: a `.vtt` beside the file is ignored
   * by every place these get posted. Instagram, TikTok and a WhatsApp forward
   * all play the picture and nothing else, so words that are not in the
   * picture are words nobody sees — and the whole reason to caption is that
   * most of these are watched with the sound off.
   *
   * The cost is that they cannot be turned off afterwards. That is why it is
   * a choice made on the board, per shot, and why the film can be cut again
   * without them for anywhere that does carry a subtitle track.
   */
  readonly caption?: string;
}

export interface Cut {
  readonly scenes: readonly Scene[];
  /** The song, laid under the whole thing. Optional: a silent film is allowed. */
  readonly audio?: Blob | null;
  /** The film's shape. Clips are fitted into it, never stretched. */
  readonly width: number;
  readonly height: number;
  /**
   * What goes in the space a clip does not fill.
   *
   * `'black'` is the plain letterbox. `'blur'` fills it with an enlarged,
   * blurred copy of the same frame, so a wide shot dropped into a tall film
   * reads as one picture rather than a small picture with two dead bands
   * around it. Neither one crops: the clip itself is drawn identically in both
   * cases, and this is only about what sits behind it.
   *
   * Defaults to `'black'`, which is what every existing cut was made with.
   */
  readonly background?: 'black' | 'blur';
  /** Called as each scene starts, so a screen can say where it is. */
  readonly onScene?: (index: number, total: number) => void;
}

export type Made =
  | { readonly ok: true; readonly blob: Blob; readonly seconds: number; readonly ext: 'webm' | 'mp4' }
  | { readonly ok: false; readonly why: 'unsupported' | 'no_scenes' | 'unreadable' | 'failed' };

/** What this browser will record into, best first. */
function recordable(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const wanted = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return wanted.find((one) => MediaRecorder.isTypeSupported(one)) ?? null;
}

export function canStitch(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    recordable() !== null
  );
}

/**
 * The whole clip drawn inside the frame, letterboxed rather than cropped.
 *
 * Scenes come back in whatever shape the engine made them, and a film built
 * from a mix of wide and tall is normal — the desk offers both. Cropping to
 * fill would cut the top off a tall shot; stretching would make every face in
 * it wrong. Bars are the honest option and are what the black background is
 * for.
 */
function fitted(
  video: HTMLVideoElement,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const source = video.videoWidth / Math.max(1, video.videoHeight);
  const frame = width / height;
  if (source > frame) {
    const h = Math.round(width / source);
    return { x: 0, y: Math.round((height - h) / 2), w: width, h };
  }
  const w = Math.round(height * source);
  return { x: Math.round((width - w) / 2), y: 0, w, h: height };
}

/**
 * The frame filled edge to edge, overflowing on the long side.
 *
 * The opposite of `fitted`: nothing is left over, and what does not fit is
 * pushed off the sides. Only ever used for the background, where losing the
 * edges of a copy of the picture costs nothing — the picture itself is still
 * drawn whole, on top.
 */
function covering(
  video: HTMLVideoElement,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const source = video.videoWidth / Math.max(1, video.videoHeight);
  const frame = width / height;
  if (source > frame) {
    const w = Math.round(height * source);
    return { x: Math.round((width - w) / 2), y: 0, w, h: height };
  }
  const h = Math.round(width / source);
  return { x: 0, y: Math.round((height - h) / 2), w: width, h };
}

/**
 * Whether this browser will honour `context.filter`.
 *
 * Every browser this app supports does, but a blurred background is a
 * preference rather than a requirement, and a browser that quietly ignores the
 * filter would draw a sharp, enormously enlarged copy of the clip behind the
 * clip — much worse than the black bars it replaced. So it is asked rather
 * than assumed, and a no falls back to black.
 */
function blurs(context: CanvasRenderingContext2D): boolean {
  try {
    context.filter = 'blur(2px)';
    const took = context.filter.includes('blur');
    context.filter = 'none';
    return took;
  } catch {
    return false;
  }
}

/**
 * The blurred background, painted the cheap way.
 *
 * A `blur(60px)` over a 1280 × 720 canvas, thirty times a second, for three
 * minutes, is real work — and this already runs in real time, so a draw loop
 * that cannot keep up drops frames straight into the file.
 *
 * It does not have to cost that. The frame is first drawn onto a scratch
 * canvas about a sixteenth of the size, where a two-pixel blur is the same
 * picture as a thirty-two-pixel blur at full size and costs a sixteenth as
 * much; enlarging that back over the frame does the rest, because a bilinear
 * upscale is itself a blur. What comes out is indistinguishable at a glance
 * from the expensive version.
 *
 * It is then darkened a little. Undarkened, a bright background competes with
 * the shot in front of it, which is the opposite of the point.
 */
const SCRATCH_LONG = 96;

function backdrop(
  context: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  const paint = scratch.getContext('2d');
  if (!paint) return;
  const small = covering(video, scratch.width, scratch.height);
  paint.filter = `blur(${Math.max(2, Math.round(SCRATCH_LONG / 24))}px)`;
  paint.drawImage(video, small.x, small.y, small.w, small.h);
  paint.filter = 'none';

  const big = covering(video, width, height);
  context.imageSmoothingEnabled = true;
  context.drawImage(scratch, 0, 0, scratch.width, scratch.height, big.x, big.y, big.w, big.h);
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, width, height);
}

/**
 * The window a scene actually plays, given what its clip turned out to be.
 *
 * Clamped in one place so the drawing loop below and anything that wants to
 * add the lengths up cannot disagree about what a trim means. A window that
 * collapses to nothing is widened to the whole clip: a scene somebody put in
 * the film should appear in the film, and an empty trim is far more likely to
 * be a slider mishandled than an intention.
 */
/**
 * Words over the picture, sized to the film rather than to a guess.
 *
 * Everything here is a fraction of the frame's height, so the same caption is
 * the same size on a 1080-tall vertical film as on a 720-tall wide one. The
 * band behind it is the part that makes this legible: white text over
 * arbitrary footage is white text over a white wall about a tenth of the time,
 * and an outline thick enough to survive that is thick enough to read badly.
 *
 * Three lines at most. A fourth means somebody wrote a paragraph, and cutting
 * it off is a clearer signal than shrinking the type until it is unreadable.
 */
const CAPTION_LINES = 3;

function wrapped(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): { lines: string[]; over: boolean } {
  const lines: string[] = [];
  let line = '';
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i += 1) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (context.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i];
    if (lines.length === CAPTION_LINES) return { lines, over: true };
  }
  if (line) lines.push(line);
  return { lines, over: false };
}

export function drawCaption(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
): void {
  const words = text.trim();
  if (!words) return;

  const face = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const room = width * 0.86;

  /* Made smaller before it is cut short.

     Three lines is the ceiling, and a line that spills past it used to be
     dropped — so a caption ending "…nie terug nie" came out ending "…nie
     terug", which is a different sentence. Two smaller sizes are tried first,
     and only a caption that will not fit even at the smallest is trimmed,
     with a mark to say so. */
  let size = 0;
  let lines: string[] = [];
  for (const share of [0.048, 0.041, 0.035]) {
    size = Math.max(14, Math.round(height * share));
    context.font = `700 ${size}px ${face}`;
    const fit = wrapped(context, words, room);
    lines = fit.lines;
    if (!fit.over) break;
    if (share === 0.035) {
      const last = lines[lines.length - 1] ?? '';
      lines[lines.length - 1] = `${last.replace(/[\s,.;:]+$/, '')}\u2026`;
    }
  }
  if (!lines.length) return;

  context.save();
  context.font = `700 ${size}px ${face}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';

  const step = Math.round(size * 1.28);
  const pad = Math.round(size * 0.42);
  /* Clear of the bottom eighth, which is where every app that plays these
     puts its own furniture — the caption, the handle, the progress bar. A
     subtitle under that is a subtitle behind a username. */
  const bottom = height - Math.round(height * 0.12);
  const firstBaseline = bottom - step * (lines.length - 1);
  /* Measured rather than assumed: a box built on the font size is lopsided,
     because the size includes room for descenders the first line does not
     use, and the caption then sits visibly low inside its own band. */
  const metrics = context.measureText(lines[0]);
  const ascent = metrics.actualBoundingBoxAscent || size * 0.72;
  const descent = metrics.actualBoundingBoxDescent || size * 0.24;
  const boxTop = firstBaseline - ascent - pad;
  const boxHeight = bottom + descent + pad - boxTop;
  const widest = Math.max(...lines.map((one) => context.measureText(one).width));
  const boxWidth = Math.min(width * 0.94, widest + pad * 2.4);

  context.fillStyle = 'rgba(0, 0, 0, 0.62)';
  context.beginPath();
  context.roundRect((width - boxWidth) / 2, boxTop, boxWidth, boxHeight, Math.round(size * 0.34));
  context.fill();

  context.fillStyle = '#ffffff';
  lines.forEach((one, index) => {
    context.fillText(one, width / 2, firstBaseline + step * index);
  });
  context.restore();
}

export function windowOf(scene: Scene, duration: number): { from: number; to: number } {
  if (!Number.isFinite(duration) || duration <= 0) return { from: 0, to: 0 };
  const from = Math.min(Math.max(0, scene.from ?? 0), duration);
  const to = Math.min(Math.max(0, scene.to ?? duration), duration);
  return to - from < 0.05 ? { from: 0, to: duration } : { from, to };
}

/** A blob's length, which a recorded webm will not admit to without a seek. */
export async function lengthOf(blob: Blob): Promise<number> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(blob);
  video.src = url;
  video.muted = true;
  await new Promise<void>((done) => {
    video.onloadedmetadata = () => done();
    video.onerror = () => done();
  });
  if (!Number.isFinite(video.duration) || video.duration === Infinity) {
    /* A webm from `MediaRecorder` carries no duration in its header, because
       the header is written before the length is known. Seeking past the end
       makes the browser work it out. This is a known quirk, not a bug here. */
    video.currentTime = 1e101;
    await new Promise<void>((done) => {
      video.onseeked = () => done();
      setTimeout(done, 1200);
    });
  }
  URL.revokeObjectURL(url);
  return Number.isFinite(video.duration) ? video.duration : 0;
}

export async function stitch(cut: Cut): Promise<Made> {
  if (!cut.scenes.length) return { ok: false, why: 'no_scenes' };
  const mimeType = recordable();
  if (!mimeType || !canStitch()) return { ok: false, why: 'unsupported' };

  const canvas = document.createElement('canvas');
  canvas.width = cut.width;
  canvas.height = cut.height;
  const context = canvas.getContext('2d');
  if (!context) return { ok: false, why: 'unsupported' };

  /* The scratch the blurred background is built on, at the film's own shape
     so the cover maths below is the same maths at both sizes. Made once for
     the whole export rather than per scene, and left unused when the
     background is black. */
  const wantsBlur = cut.background === 'blur' && blurs(context);
  const scratch = document.createElement('canvas');
  const scale = SCRATCH_LONG / Math.max(cut.width, cut.height);
  scratch.width = Math.max(2, Math.round(cut.width * scale));
  scratch.height = Math.max(2, Math.round(cut.height * scale));

  const stream = canvas.captureStream(30);

  /* The song, on the same stream as the pictures.

     A separate audio context rather than an <audio> element, because an
     element's output cannot be added to a MediaStream — and a music video that
     comes out silent is not a music video. */
  let audioContext: AudioContext | null = null;
  let song: AudioBufferSourceNode | null = null;
  if (cut.audio) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioContext = new Ctx();
      try {
        const buffer = await audioContext.decodeAudioData(await cut.audio.arrayBuffer());
        const destination = audioContext.createMediaStreamDestination();
        song = audioContext.createBufferSource();
        song.buffer = buffer;
        song.connect(destination);
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
      } catch {
        // A song that will not decode is a film without one, not a failure.
        song = null;
      }
    }
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const parts: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) parts.push(event.data);
  };
  const finished = new Promise<void>((done) => {
    recorder.onstop = () => done();
  });

  const urls: string[] = [];
  try {
    recorder.start();
    await audioContext?.resume();
    song?.start();

    for (let index = 0; index < cut.scenes.length; index += 1) {
      cut.onScene?.(index, cut.scenes.length);
      const video = document.createElement('video');
      const url = URL.createObjectURL(cut.scenes[index].clip);
      urls.push(url);
      video.src = url;
      // The clips' own sound is not carried — see the note at the top.
      video.muted = true;
      video.playsInline = true;

      const ready = await new Promise<boolean>((done) => {
        video.onloadedmetadata = () => done(true);
        video.onerror = () => done(false);
      });
      // One clip that will not open is a gap, not a ruined export.
      if (!ready) continue;

      /* Trimmed by seeking, not by cutting the file.

         The clip is played from `from` and abandoned at `to`, which is the
         whole of it: the recorder is capturing the canvas, so whatever is not
         painted is not in the film. The seek is awaited because playing from
         zero while the browser catches up would put the discarded head of the
         clip into the cut — a bug that would look like the trim being ignored
         and would only show on a slow device. */
      const window = windowOf(cut.scenes[index], video.duration);
      if (window.from > 0) {
        video.currentTime = window.from;
        await new Promise<void>((done) => {
          let settled = false;
          const go = () => {
            if (settled) return;
            settled = true;
            done();
          };
          video.onseeked = go;
          // A seek that never reports is a scene that plays whole, not a cut
          // that hangs.
          setTimeout(go, 2000);
        });
      }

      await video.play().catch(() => undefined);
      const box = fitted(video, cut.width, cut.height);
      /* A clip already the shape of the film has no bars to fill, and painting
         a background behind an opaque frame would be work for nothing. The
         slack is for rounding, not for a shape that is nearly right: an eight
         pixel band still wants filling. */
      const fills = (box.w * box.h) / (cut.width * cut.height);
      const caption = cut.scenes[index].caption?.trim() ?? '';

      await new Promise<void>((done) => {
        let stop = false;
        const end = () => {
          if (stop) return;
          stop = true;
          done();
        };
        video.onended = end;
        const draw = () => {
          if (stop) return;
          if (video.ended || video.currentTime >= window.to) {
            end();
            return;
          }
          /* Repainted every frame rather than once: a clip narrower than the
             frame would otherwise leave the previous scene showing in the
             bars. The blurred background is repainted for the same reason and
             one more — it is a copy of *this* frame, so it moves with the
             shot instead of being a still behind a moving picture. */
          context.fillStyle = '#000';
          context.fillRect(0, 0, cut.width, cut.height);
          if (wantsBlur && fills < 0.995) backdrop(context, scratch, video, cut.width, cut.height);
          context.drawImage(video, box.x, box.y, box.w, box.h);
          /* Over the picture and over the bars alike, so a caption on a wide
             shot in a tall film sits in the black band rather than across a
             face. Painted every frame because the frame under it is. */
          if (caption) drawCaption(context, caption, cut.width, cut.height);
          requestAnimationFrame(draw);
        };
        draw();
      });
    }

    recorder.stop();
    song?.stop();
    await finished;
  } catch {
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch {
      // Already stopped.
    }
    return { ok: false, why: 'failed' };
  } finally {
    urls.forEach((one) => URL.revokeObjectURL(one));
    void audioContext?.close();
  }

  if (!parts.length) return { ok: false, why: 'failed' };
  const blob = new Blob(parts, { type: mimeType });
  return {
    ok: true,
    blob,
    seconds: await lengthOf(blob),
    ext: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm',
  };
}
