'use client';

/**
 * The sound, live: what is coming out of the booth right now.
 *
 * Carli, 14 October 2026, from the ProBooth design she sent: "die
 * visualizer vir klank". The design drew a curve from three slider values.
 * This draws the real thing — an analyser on the master, after the fader,
 * so the bars are the music she is hearing and they stop when it stops.
 *
 * Bars on a log scale from 30 Hz to 16 kHz, because that is how an ear
 * spreads pitch: on a straight scale the bass is two bars at the left and
 * the top octave is half the screen. A line over them is the wave itself,
 * and a peak light at the end goes amber near full and red at it, which is
 * the one meter worth having while recording.
 *
 * Draws only while something plays. Standing still it is a flat line, and
 * it costs nothing: no frame is asked for.
 */
import React, { useEffect, useRef } from 'react';
import { EDGE, PANEL } from '../lib/boothlook';
import { useLang } from '../lib/i18n';

const BARS = 56;
const LOW = 30;
const HIGH = 16000;

/* Drawn in canvas, which takes colours as strings. Kept here, named. */
const BAR_LOW = '#10b981';
const BAR_HIGH = '#22d3ee';
const WAVE = 'rgba(167,243,208,0.55)';
const FLAT = 'rgba(148,163,184,0.35)';
const PEAK_OK = '#10b981';
const PEAK_NEAR = '#f59e0b';
const PEAK_OVER = '#f43f5e';

export default function BoothScope({
  ear,
  playing,
}: {
  readonly ear: React.RefObject<AnalyserNode | null>;
  readonly playing: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const peakLight = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const paper = canvas.current;
    if (!paper) return;
    const pen = paper.getContext('2d');
    if (!pen) return;

    const size = (): { w: number; h: number } => {
      const box = paper.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(box.width * ratio));
      const h = Math.max(1, Math.round(box.height * ratio));
      if (paper.width !== w || paper.height !== h) { paper.width = w; paper.height = h; }
      return { w, h };
    };

    const flat = (): void => {
      const { w, h } = size();
      pen.clearRect(0, 0, w, h);
      pen.strokeStyle = FLAT;
      pen.lineWidth = 1;
      pen.beginPath();
      pen.moveTo(0, h - 1.5);
      pen.lineTo(w, h - 1.5);
      pen.stroke();
      if (peakLight.current) peakLight.current.style.background = FLAT;
    };

    if (!playing) { flat(); return; }

    let frame = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let wave: Float32Array<ArrayBuffer> | null = null;

    const draw = (): void => {
      frame = requestAnimationFrame(draw);
      const node = ear.current;
      if (!node) { flat(); return; }
      if (!freq || freq.length !== node.frequencyBinCount) freq = new Uint8Array(node.frequencyBinCount);
      if (!wave || wave.length !== node.fftSize) wave = new Float32Array(node.fftSize);
      node.getByteFrequencyData(freq);
      node.getFloatTimeDomainData(wave);

      const { w, h } = size();
      pen.clearRect(0, 0, w, h);

      const nyquist = node.context.sampleRate / 2;
      const gap = Math.max(1, w / BARS / 5);
      const barW = w / BARS - gap;
      const fill = pen.createLinearGradient(0, 0, w, 0);
      fill.addColorStop(0, BAR_LOW);
      fill.addColorStop(1, BAR_HIGH);
      pen.fillStyle = fill;
      pen.shadowColor = BAR_HIGH;
      pen.shadowBlur = 8;
      for (let b = 0; b < BARS; b += 1) {
        const from = LOW * (HIGH / LOW) ** (b / BARS);
        const to = LOW * (HIGH / LOW) ** ((b + 1) / BARS);
        const i0 = Math.max(0, Math.floor((from / nyquist) * freq.length));
        const i1 = Math.min(freq.length - 1, Math.max(i0, Math.ceil((to / nyquist) * freq.length)));
        let most = 0;
        for (let i = i0; i <= i1; i += 1) if (freq[i] > most) most = freq[i];
        const tall = Math.max(1.5, (most / 255) * (h - 2));
        const x = b * (barW + gap);
        pen.fillRect(x, h - tall, barW, tall);
      }
      pen.shadowBlur = 0;

      let peak = 0;
      pen.strokeStyle = WAVE;
      pen.lineWidth = Math.max(1, (window.devicePixelRatio || 1));
      pen.beginPath();
      /* Every sample, spread across the width, rather than one sample per
         pixel. That was a 2048-sample window drawn one sample a column, so on
         a phone the line ran off the right of the canvas and on a wide desk
         it stopped a third of the way across — and the peak light only heard
         the samples that happened to be drawn, so a click between two of
         them never turned it red. Found on 15 October 2026, going through
         every function in the booth. Each column now draws the lowest and
         highest sample in its share of the window, which is what a scope
         does, and the peak is read from all of them. */
      for (let i = 0; i < wave.length; i += 1) {
        const v = Math.abs(wave[i]);
        if (v > peak) peak = v;
      }
      const columns = Math.max(1, Math.min(w, wave.length));
      const across = w / columns;
      const yOf = (v: number): number => h / 2 - v * (h / 2 - 2);
      for (let c = 0; c < columns; c += 1) {
        const i0 = Math.floor((c * wave.length) / columns);
        const i1 = Math.max(i0 + 1, Math.floor(((c + 1) * wave.length) / columns));
        let low = wave[i0];
        let high = wave[i0];
        for (let i = i0 + 1; i < i1; i += 1) {
          if (wave[i] < low) low = wave[i];
          if (wave[i] > high) high = wave[i];
        }
        const x = c * across;
        if (c === 0) pen.moveTo(x, yOf(low)); else pen.lineTo(x, yOf(low));
        if (high !== low) pen.lineTo(x, yOf(high));
      }
      pen.stroke();

      if (peakLight.current) {
        peakLight.current.style.background = peak >= 0.99 ? PEAK_OVER : peak >= 0.7 ? PEAK_NEAR : PEAK_OK;
      }
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [ear, playing]);

  return (
    <div
      className="flex h-11 flex-shrink-0 items-center gap-2 border-b px-3"
      style={{ borderColor: EDGE, background: PANEL }}
      data-boothscope=""
      role="img"
      aria-label={t('pro.scope', 'The sound, live: how loud each pitch is right now')}
    >
      <canvas ref={canvas} className="h-8 min-w-0 flex-1" aria-hidden />
      <span
        ref={peakLight}
        className="h-3 w-3 flex-shrink-0 rounded-full"
        title={t('pro.scopePeak', 'Green is fine, amber is near full, red is too loud')}
        aria-hidden
      />
    </div>
  );
}
