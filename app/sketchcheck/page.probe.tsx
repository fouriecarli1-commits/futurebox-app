'use client';
/**
 * Renders every style sketch offline and reports what came out.
 *
 * PROBE=1 only. Existence is not the claim being tested — audibility is, and
 * an OfflineAudioContext is the only way to measure that without a microphone.
 *
 * ## Why there is a fingerprint as well as a loudness
 *
 * The other half of the bug this replaced was seventeen names sharing three
 * sounds, and the check for that compared `rms` — how loud each one is. That
 * worked at seventeen and stopped working at sixty-four, for a reason that has
 * nothing to do with the sound: loudness is one number in a narrow range, so
 * past a certain count two grooves collide by arithmetic whether or not
 * anybody could tell them apart.
 *
 * So each sketch is also described by what it actually is: the energy in three
 * bands, and how many times it hits. Two styles with the same loudness but a
 * different amount of bass, or a different number of onsets, are two different
 * sounds — and two that match on all four really are the same groove wearing
 * two names, which is the thing worth failing over.
 *
 * The bands are separated by counting zero crossings in short windows rather
 * than by an FFT. It is coarse, and coarse is enough: this is telling a log
 * drum from a punk snare, not doing spectral analysis.
 */
import React, { useEffect, useState } from 'react';
import { GENRE_SAMPLES } from '@/app/data/genres';
import { schedule, SKETCH_SECONDS } from '@/app/lib/preview';

interface Row {
  name: string;
  peak: number;
  rms: number;
  silentFor: number;
  /** Coarse energy split, low to high, each rounded so noise does not count. */
  bands: [number, number, number];
  /** How many times it hits in eight seconds. Tempo and pattern, together. */
  onsets: number;
}

export default function SketchCheck() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    void (async () => {
      const out: Row[] = [];
      for (const one of GENRE_SAMPLES) {
        const rate = 22050;
        const ctx = new OfflineAudioContext(1, rate * SKETCH_SECONDS, rate);
        const master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        schedule(ctx, master, one, 0.05);
        const buffer = await ctx.startRendering();
        const data = buffer.getChannelData(0);

        let peak = 0;
        let sum = 0;
        let quiet = 0;
        let run = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
          sum += data[i] * data[i];
          if (v < 0.0005) {
            run += 1;
            if (run > quiet) quiet = run;
          } else {
            run = 0;
          }
        }
        // Three bands, by how fast the wave is crossing zero in each window.
        // Slow crossings are bass, fast ones are hats and noise.
        const WINDOW = 512;
        const energy = [0, 0, 0];
        for (let start = 0; start + WINDOW <= data.length; start += WINDOW) {
          let crossings = 0;
          let power = 0;
          for (let i = start + 1; i < start + WINDOW; i += 1) {
            if ((data[i] >= 0) !== (data[i - 1] >= 0)) crossings += 1;
            power += data[i] * data[i];
          }
          const band = crossings < 40 ? 0 : crossings < 140 ? 1 : 2;
          energy[band] += power;
        }
        const total = energy[0] + energy[1] + energy[2] || 1;

        // Onsets: a jump in short-window loudness after a quieter one. Counts
        // the hits, so a four-on-the-floor and a one-drop differ even when
        // they are equally loud.
        let onsets = 0;
        let previous = 0;
        for (let start = 0; start + WINDOW <= data.length; start += WINDOW) {
          let power = 0;
          for (let i = start; i < start + WINDOW; i += 1) power += data[i] * data[i];
          const level = Math.sqrt(power / WINDOW);
          if (level > 0.02 && level > previous * 1.8) onsets += 1;
          previous = level;
        }

        out.push({
          name: one.name,
          peak,
          rms: Math.sqrt(sum / data.length),
          silentFor: quiet / rate,
          // Rounded to fortieths rather than twentieths. At twentieths two
          // grooves that plainly differ — jungle at 170 against indie rock at
          // 138 — landed in the same bucket, which is the description being
          // too coarse rather than the sounds being the same. Finer, not
          // looser: the bar stays where it is.
          bands: [
            Math.round((energy[0] / total) * 40),
            Math.round((energy[1] / total) * 40),
            Math.round((energy[2] / total) * 40),
          ],
          onsets,
        });
      }
      setRows(out);
    })();
  }, []);

  return (
    <pre id="result" data-done={rows ? 'yes' : 'no'}>
      {rows ? JSON.stringify(rows) : 'rendering'}
    </pre>
  );
}
