'use client';
/**
 * The song picker and its draggable window, for audit/songwindow.mjs.
 *
 * PROBE=1 only.
 *
 * Two songs and real audio behind both, because the bar is drawn from the file
 * — a picker tested against a track with no audio would be a picker tested
 * against the spinner. One of them carries a composition plan and a tempo, so
 * the section labels and the beat snapping have something to be measured
 * against; the other is a file brought in, which has neither.
 *
 * The video length lives here rather than in the component, the way it does in
 * the desk, so the probe can change it and watch the window follow.
 */
import React, { useEffect, useState } from 'react';
import SongWindow, { type SongCut } from '@/app/components/SongWindow';
import { encodeWav } from '@/app/lib/wav';
import { putAudio, saveTracks, type Track } from '@/app/lib/library';

const SECONDS = 40;
const RATE = 22050;
/* 96 BPM is a beat every 0.625s, which divides neither 5 nor 10 evenly — so a
   window that lands on a beat cannot have landed there by rounding to a
   second. */
const BPM = 96;

const PLANNED = {
  id: 'songwindow-planned',
  title: 'Karoo pad',
  genre: 'Acoustic',
  bpm: BPM,
  key: 'A Minor',
  lyrics: '[Verse]\nEk ry alleen\n\n[Chorus]\nEn ek sing vir jou',
  style: 'warm acoustic',
  models: [],
  source: 'engine',
  seconds: SECONDS,
  createdAt: '2026-09-06T10:00:00.000Z',
  seed: 3,
  parts: [
    { name: 'Intro', lines: [], seconds: 8 },
    { name: 'Verse', lines: ['Ek ry alleen'], seconds: 16 },
    { name: 'Chorus', lines: ['En ek sing vir jou'], seconds: 16 },
  ],
} as unknown as Track;

const BROUGHT = {
  ...PLANNED,
  id: 'songwindow-brought',
  title: 'Van my foon af',
  source: 'upload',
  bpm: 0,
  parts: undefined,
} as unknown as Track;

export default function SongWindowProbe() {
  const [ready, setReady] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [cut, setCut] = useState<SongCut | null>(null);

  useEffect(() => {
    void (async () => {
      const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext })
        .OfflineAudioContext;
      const room = new Ctx(1, SECONDS * RATE, RATE);
      const buffer = room.createBuffer(1, SECONDS * RATE, RATE);
      const data = buffer.getChannelData(0);
      // Loud in bursts, so the drawn bar has a shape rather than a flat block.
      for (let i = 0; i < data.length; i += 1) {
        const loud = Math.floor(i / (RATE / 2)) % 2 === 0 ? 1 : 0.15;
        data[i] = Math.sin((2 * Math.PI * 220 * i) / RATE) * 0.45 * loud;
      }
      const wav = encodeWav(buffer);
      await putAudio(PLANNED.id, wav);
      await putAudio(BROUGHT.id, wav);
      saveTracks([PLANNED, BROUGHT]);
      setReady(true);
    })();
  }, []);

  if (!ready) return <p className="p-6 text-zinc-400">making the songs…</p>;
  return (
    <div className="min-h-screen bg-zinc-950 p-4 space-y-4">
      <div className="flex gap-2">
        {[5, 10].map((one) => (
          <button
            key={one}
            type="button"
            data-length={one}
            onClick={() => setSeconds(one)}
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
          >
            {one}s
          </button>
        ))}
      </div>

      {/* What the component handed back, in the DOM, so the probe reads the
          state rather than inferring it from pixel positions. */}
      <p data-cut={cut ? `${cut.songId}|${cut.from.toFixed(3)}|${cut.to.toFixed(3)}` : 'none'}
         className="text-xs text-zinc-500">
        {cut ? `${cut.from.toFixed(3)} – ${cut.to.toFixed(3)}` : 'nothing chosen'}
      </p>

      <SongWindow seconds={seconds} value={cut} onChange={setCut} />
    </div>
  );
}
