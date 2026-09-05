'use client';
/**
 * Mounts the booth over a real, short song, for audit/singview.mjs.
 *
 * PROBE=1 only. The seeded library in `boothcheck` has songs with no audio
 * behind them, so opening one lands on "That file is missing from this
 * device" — which is the right thing for the room to say and useless for
 * looking at the room. This makes a wav in the browser and hands it over, so
 * the screen that a singer actually stands in front of can be measured.
 */
import React, { useEffect, useState } from 'react';
import VocalBooth from '@/app/components/VocalBooth';
import { encodeWav } from '@/app/lib/wav';
import type { Track } from '@/app/lib/library';

const SECONDS = 24;
const RATE = 44100;

const TRACK: Track = {
  id: 'sing-probe',
  title: 'A song to stand in front of',
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
    { name: 'Verse 1', seconds: 12, lines: ['The first line of it', 'And then the second'] },
    { name: 'Chorus', seconds: 12, lines: ['Here comes the chorus', 'And it lands'] },
  ],
} as unknown as Track;

export default function SingBooth() {
  const [music, setMusic] = useState<Blob | null>(null);

  useEffect(() => {
    const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext;
    const room = new Ctx(2, SECONDS * RATE, RATE);
    const buffer = room.createBuffer(2, SECONDS * RATE, RATE);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) {
        // Two tones, so the waveform has something in it and the note bar has
        // a pitch to read rather than a flat line.
        const t = i / RATE;
        data[i] = (Math.sin(2 * Math.PI * 220 * t) * 0.3 + Math.sin(2 * Math.PI * 330 * t) * 0.15) * 0.8;
      }
    }
    setMusic(encodeWav(buffer));
  }, []);

  if (!music) return <p className="p-6 text-zinc-400">making the song…</p>;
  return (
    <VocalBooth
      track={TRACK}
      music={music}
      onKeep={() => undefined}
      onClose={() => undefined}
    />
  );
}
