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
}

export interface Cut {
  readonly scenes: readonly Scene[];
  /** The song, laid under the whole thing. Optional: a silent film is allowed. */
  readonly audio?: Blob | null;
  /** The film's shape. Clips are fitted into it, never stretched. */
  readonly width: number;
  readonly height: number;
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

      await video.play().catch(() => undefined);
      const box = fitted(video, cut.width, cut.height);

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
          if (video.ended) {
            end();
            return;
          }
          // Repainted every frame rather than once: a clip narrower than the
          // frame would otherwise leave the previous scene showing in the bars.
          context.fillStyle = '#000';
          context.fillRect(0, 0, cut.width, cut.height);
          context.drawImage(video, box.x, box.y, box.w, box.h);
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
