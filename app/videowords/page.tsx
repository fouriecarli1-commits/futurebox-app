'use client';
/**
 * The music video panel over a song that has words and no plan, for
 * audit/videowords.mjs.
 *
 * PROBE=1 only.
 *
 * No plan on purpose. Putting the words on screen used to need one, because a
 * plan was the only thing that knew where a line lands — so a song brought in
 * from a file, or one made before plans were kept, could not have a lyric
 * video at all. `lib/lyrictime.ts` listens to the file now and falls back to
 * the plan and then to an even spread, so this is the case that has to work
 * and is the one this page exists to put on a screen.
 *
 * Real audio behind it, written into the same store the panel reads from: a
 * film rendered over a song that will not decode is not a film.
 */
import React, { useEffect, useState } from 'react';
import VideoPanel from '@/app/components/VideoPanel';
import { encodeWav } from '@/app/lib/wav';
import { putAudio, saveTracks, type Track } from '@/app/lib/library';

const SECONDS = 12;
const RATE = 22050;

const TRACK = {
  id: 'videowords-brought-in',
  title: 'Brought in from a file',
  genre: 'Acoustic',
  bpm: 96,
  key: 'A Minor',
  lyrics: '[Verse]\nEk ry alleen deur die Karoo\nDie pad is lank en stil\n\n[Chorus]\nEn ek sing vir jou',
  style: 'warm acoustic',
  models: [],
  source: 'upload',
  seconds: SECONDS,
  createdAt: '2026-09-05T10:00:00.000Z',
  seed: 3,
} as unknown as Track;

export default function VideoWords() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext })
        .OfflineAudioContext;
      const room = new Ctx(1, SECONDS * RATE, RATE);
      const buffer = room.createBuffer(1, SECONDS * RATE, RATE);
      const data = buffer.getChannelData(0);
      /* Loud in bursts rather than a flat tone, so the part of the ladder that
         looks for where the singing is has something to find. */
      for (let i = 0; i < data.length; i += 1) {
        const beat = Math.floor(i / (RATE / 2)) % 2 === 0 ? 1 : 0.15;
        data[i] = Math.sin((2 * Math.PI * 220 * i) / RATE) * 0.45 * beat;
      }
      const wav = encodeWav(buffer);
      await putAudio(TRACK.id, wav);
      saveTracks([TRACK]);
      setReady(true);
    })();
  }, []);

  if (!ready) return <p className="p-6 text-zinc-400">making the song…</p>;
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <VideoPanel track={TRACK} onClose={() => undefined} />
    </div>
  );
}
