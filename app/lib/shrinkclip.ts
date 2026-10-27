/**
 * A clip made smaller on the phone before it is sent to an engine.
 *
 * fal.ai's background remover bills by the megapixel over every frame
 * (`docs/FAL-SKEMAS.md`): five seconds straight off a phone is about $0.31
 * at 1080p and $1.24 at 4K, against $0.14 at 720p, and the price on the
 * button was set for the small one. A smaller clip also uploads in a
 * fraction of the time, and the person in it is cut out just as well.
 *
 * It plays the clip into a canvas of the smaller size and records that, so
 * it takes as long as the clip lasts. Without sound: the engine does not
 * hear, and the clip it sends back goes beside the original on the clock,
 * which still has its sound. A clip already small enough is sent as it is,
 * and a phone that cannot record sends the original, which the route then
 * prices by its real size.
 */
import { measure, recordable } from './stitch';

/** The long side, in pixels, that the engine is sent. 720p. */
export const SEND_LONG_SIDE = 1280;

export async function shrinkClip(clip: Blob, longest = SEND_LONG_SIDE): Promise<Blob> {
  const seen = await measure(clip);
  const long = Math.max(seen.width, seen.height);
  const type = recordable();
  if (!long || long <= longest || !type || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return clip;

  const scale = longest / long;
  const width = Math.max(2, Math.round((seen.width * scale) / 2) * 2);
  const height = Math.max(2, Math.round((seen.height * scale) / 2) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return clip;

  const video = document.createElement('video');
  const url = URL.createObjectURL(clip);
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  try {
    await new Promise<void>((done, fail) => {
      video.onloadeddata = () => done();
      video.onerror = () => fail(new Error('the clip would not open'));
    });

    const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 4_000_000 });
    const parts: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };
    const stopped = new Promise<void>((done) => { recorder.onstop = () => done(); });

    let running = true;
    const draw = (): void => {
      if (!running) return;
      ctx.drawImage(video, 0, 0, width, height);
      requestAnimationFrame(draw);
    };
    recorder.start(1000);
    draw();
    await video.play();
    await new Promise<void>((done) => { video.onended = () => done(); });
    running = false;
    recorder.stop();
    await stopped;

    const made = new Blob(parts, { type: type.split(';')[0] });
    return made.size > 0 ? made : clip;
  } catch {
    return clip;
  } finally {
    URL.revokeObjectURL(url);
  }
}
