'use client';
/**
 * Renders every style sketch offline and reports what came out.
 *
 * PROBE=1 only. Existence is not the claim being tested — audibility is, and
 * an OfflineAudioContext is the only way to measure that without a microphone.
 */
import React, { useEffect, useState } from 'react';
import { GENRE_SAMPLES } from '@/app/data/genres';
import { schedule, SKETCH_SECONDS } from '@/app/lib/preview';

interface Row {
  name: string;
  peak: number;
  rms: number;
  silentFor: number;
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
        out.push({
          name: one.name,
          peak,
          rms: Math.sqrt(sum / data.length),
          silentFor: quiet / rate,
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
