'use client';

import type { StudioTemplateItem } from './studiotemplates';
import { videoSupported } from './video';

/**
 * Creates an animated video clip from a template specification.
 * Renders a futuristic dynamic motion frame sequence via HTML5 Canvas captureStream
 * and encodes it with MediaRecorder into a genuine playable WebM/MP4 video Blob.
 */
export async function createTemplateVideoBlob(tpl: StudioTemplateItem, durationSeconds = 3): Promise<Blob> {
  if (typeof window === 'undefined' || !videoSupported()) {
    return new Blob([], { type: 'video/webm' });
  }

  const isWide = tpl.width > tpl.height;
  const width = isWide ? 1280 : 720;
  const height = isWide ? 720 : 1280;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new Blob([], { type: 'video/webm' });
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

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();

  const started = performance.now();
  const title = tpl.sampleHeadline || tpl.nameEn;
  const subtitle = (tpl.sampleSubtext || tpl.category).toUpperCase();

  return new Promise<Blob>((resolve) => {
    const renderFrame = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - started) / (durationSeconds * 1000));

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

      // Category Pill
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

      // Main Headline
      ctx.font = `bold ${isWide ? 54 : 44}px system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 16;
      ctx.fillText(title, width / 2, height * 0.48);
      ctx.shadowBlur = 0;

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

      if (progress < 1) {
        requestAnimationFrame(renderFrame);
      } else {
        try {
          recorder.stop();
        } catch {
          // If already stopped
        }
        stopped.then(resolve);
      }
    };

    renderFrame();
  });
}
