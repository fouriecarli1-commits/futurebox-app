'use client';
/**
 * A channel with two real songs in it, for audit/songscreen.mjs.
 *
 * PROBE=1 only. The seeded library has songs with no audio behind it, and a
 * full-screen player over a song that will not play is a screen that never
 * moves — which is the one thing this view has to be measured doing. So this
 * makes two wavs in the browser, writes them into the same IndexedDB store
 * the app reads from, and mounts the channel over them.
 *
 * Two songs on purpose, and deliberately different:
 *
 *   · one with the composition plan this app writes, so its words are laid on
 *     the music and the screen can say so;
 *   · one with words and no plan — the shape a song brought in from a file
 *     has — so the fallback that spreads them evenly is exercised, and the
 *     sentence admitting it is the fallback can be checked.
 */
import React, { useEffect, useState } from 'react';
import Channel from '@/app/components/Channel';
import { encodeWav } from '@/app/lib/wav';
import { putAudio, saveTracks, type Track } from '@/app/lib/library';

const SECONDS = 12;
const RATE = 22050;

const TRACKS: Track[] = [
  {
    id: 'full-planned',
    title: 'The one with a plan',
    genre: 'Amapiano',
    bpm: 112,
    key: 'A Minor',
    lyrics: '[Verse 1]\nThe first line of it\nAnd then the second\n\n[Chorus]\nHere comes the chorus\nAnd it lands',
    style: 'warm, late night',
    models: ['Backing'],
    source: 'engine',
    seconds: SECONDS,
    createdAt: '2026-09-01T10:00:00.000Z',
    seed: 7,
    parts: [
      { name: 'Verse 1', seconds: 6, lines: ['The first line of it', 'And then the second'] },
      { name: 'Chorus', seconds: 6, lines: ['Here comes the chorus', 'And it lands'] },
    ],
  } as unknown as Track,
  {
    id: 'full-brought-in',
    title: 'The one brought in',
    genre: '',
    bpm: 0,
    key: '',
    lyrics: 'A line I typed myself\nAnd a second one after it',
    style: '',
    models: [],
    source: 'upload',
    seconds: SECONDS,
    createdAt: '2026-09-01T11:00:00.000Z',
    seed: 0,
  } as unknown as Track,
];

export default function SongFull() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext })
        .OfflineAudioContext;
      const room = new Ctx(1, SECONDS * RATE, RATE);
      const buffer = room.createBuffer(1, SECONDS * RATE, RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.sin((2 * Math.PI * 220 * i) / RATE) * 0.4;
      }
      const wav = encodeWav(buffer);
      for (const one of TRACKS) await putAudio(one.id, wav);
      saveTracks(TRACKS);
      setReady(true);
    })();
  }, []);

  if (!ready) return <p className="p-6 text-zinc-400">making the songs…</p>;
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <Channel reloadKey={1} email="probe@futurebox.test" onUpgrade={() => undefined} />
    </div>
  );
}
