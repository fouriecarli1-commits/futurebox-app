'use client';

import type { StudioTemplateItem } from './studiotemplates';
import { videoSupported } from './video';
import { motionAt } from './videoextras';

/**
 * Why this throws rather than handing back an empty Blob, as it used to.
 *
 * An empty Blob is not a clip, but it looked like one all the way down: the
 * cutting room put it on the clock as a four-second shot, the strip drew a
 * block, and the picture stayed black with nothing anywhere saying why. A
 * browser that cannot record is a sentence she needs to read, so the caller
 * gets an error to turn into one.
 */
export class TemplateVideoUnsupported extends Error {
  constructor() {
    super('This browser cannot record a template clip.');
    this.name = 'TemplateVideoUnsupported';
  }
}

/**
 * Creates an animated video clip from a template specification.
 * Renders a futuristic dynamic motion frame sequence via HTML5 Canvas captureStream
 * and encodes it with MediaRecorder into a genuine playable WebM/MP4 video Blob.
 */
export async function createTemplateVideoBlob(tpl: StudioTemplateItem, durationSeconds = 3): Promise<Blob> {
  if (typeof window === 'undefined' || !videoSupported() || typeof MediaRecorder === 'undefined') {
    throw new TemplateVideoUnsupported();
  }

  const isWide = tpl.width > tpl.height;
  const width = isWide ? 1280 : 720;
  const height = isWide ? 720 : 1280;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') {
    throw new TemplateVideoUnsupported();
  }

  const stream = canvas.captureStream(25);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      /* Nothing recorded is the same fault as no recorder, arrived later. */
      if (!chunks.length) { reject(new TemplateVideoUnsupported()); return; }
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();

  const started = performance.now();
  return new Promise<Blob>((resolve, reject) => {
    const renderFrame = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - started) / (durationSeconds * 1000));

      drawTemplateFrame(ctx, tpl, width, height, progress);

      if (progress < 1) {
        requestAnimationFrame(renderFrame);
      } else {
        try {
          recorder.stop();
        } catch {
          // If already stopped
        }
        stopped.then(resolve, reject);
      }
    };

    renderFrame();
  });
}

/**
 * One frame of a template's motion, `progress` of the way through (0 to 1).
 *
 * Lifted out of the recorder below so the templates window can PLAY it
 * before anybody picks it — Carli, 14 October 2026: *"Die motion templates
 * moet 'n simulator hê wanneer mens op dit kliek."* The preview and the clip
 * that is recorded are drawn by this one function, so what plays in the
 * window is what lands on the clock.
 */
export function drawTemplateFrame(
  ctx: CanvasRenderingContext2D,
  tpl: StudioTemplateItem,
  width: number,
  height: number,
  progress: number,
): void {
  const isWide = width > height;
  const title = tpl.sampleHeadline || tpl.nameEn;
  const subtitle = (tpl.sampleSubtext || tpl.category).toUpperCase();
  // Draw background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(0.5, '#0d1f2d');
  grad.addColorStop(1, '#05070a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle dynamic glow circle
  const glowGrad = ctx.createRadialGradient(
    width * 0.5 + Math.sin(progress * Math.PI * 2) * 50,
    height * 0.45,
    20,
    width * 0.5,
    height * 0.45,
    width * 0.6,
  );
  glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  glowGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Title & category display
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  /* The words come in rather than sitting there: the label pops and the
     headline rises, by `motionAt` — the same motions the video editor's
     words use. A template that only drifted a glow behind still words was
     a still with a screensaver, which is why it read as "not working". */
  const seconds = progress * 3;
  const pop = motionAt('pop', seconds);
  const rise = motionAt('rise', seconds - 0.35);

  // Category Pill
  ctx.save();
  ctx.globalAlpha = pop.alpha;
  ctx.translate(width / 2, height * 0.38);
  ctx.scale(pop.scale, pop.scale);
  ctx.translate(-width / 2, -height * 0.38);
  const pillY = height * 0.38;
  ctx.font = 'bold 22px system-ui, sans-serif';
  const catText = `★ FUTUREBOX STUDIO — ${subtitle} ★`;
  const catWidth = ctx.measureText(catText).width;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(width / 2 - catWidth / 2 - 20, pillY - 20, catWidth + 40, 40, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.fillText(catText, width / 2, pillY);
  ctx.restore();

  // Main Headline
  ctx.save();
  ctx.globalAlpha = rise.alpha;
  ctx.translate(0, rise.dy * height);
  ctx.font = `bold ${isWide ? 54 : 44}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(title, width / 2, height * 0.48);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Cinematic corner frame marks
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
  ctx.lineWidth = 3;
  const m = 40;
  const len = 30;
  // Top-Left
  ctx.beginPath();
  ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m);
  ctx.stroke();
  // Top-Right
  ctx.beginPath();
  ctx.moveTo(width - m - len, m); ctx.lineTo(width - m, m); ctx.lineTo(width - m, m + len);
  ctx.stroke();
  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(m, height - m - len); ctx.lineTo(m, height - m); ctx.lineTo(m + len, height - m);
  ctx.stroke();
  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(width - m - len, height - m); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m, height - m - len);
  ctx.stroke();
}

/**
 * A moving template's last frame, as a picture to start a still from.
 *
 * For the photo room, where a template cannot move: the frame the motion
 * comes to rest on, drawn by `drawTemplateFrame`, so the still is what the
 * simulator just played. Null for a template that does not move, which
 * keeps its own drawing.
 */
export function templateStill(tpl: StudioTemplateItem): string | null {
  if (!(tpl.isVideo || tpl.category === 'landscape_video' || tpl.category === 'mobile_video')) return null;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = tpl.width > tpl.height ? 1280 : 720;
  canvas.height = tpl.width > tpl.height ? 720 : 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawTemplateFrame(ctx, tpl, canvas.width, canvas.height, 1);
  return canvas.toDataURL('image/png');
}
