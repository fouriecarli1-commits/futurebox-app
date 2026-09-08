'use client';
/**
 * The form strip, for audit/songform.mjs.
 *
 * PROBE=1 only. Three songs, because the thing worth looking at is not one
 * strip but three beside each other: a pop song, a standard, and something
 * the app has no name for. If the shape of a song is not visible from a
 * column of these, the strip has failed at the one thing it exists for.
 */
import React from 'react';
import SongForm from '@/app/components/SongForm';

const POP = [
  { name: 'Intro', lines: [], seconds: 6 },
  { name: 'Verse 1', lines: ['a'], seconds: 22 },
  { name: 'Chorus 1', lines: ['a'], seconds: 20 },
  { name: 'Verse 2', lines: ['a'], seconds: 22 },
  { name: 'Chorus 2', lines: ['a'], seconds: 20 },
  { name: 'Bridge', lines: ['a'], seconds: 14 },
  { name: 'Final chorus', lines: ['a'], seconds: 28 },
  { name: 'Outro', lines: [], seconds: 8 },
];

const STANDARD = [
  { name: 'Vers 1', lines: ['a'], seconds: 24 },
  { name: 'Vers 2', lines: ['a'], seconds: 24 },
  { name: 'Brug', lines: ['a'], seconds: 20 },
  { name: 'Vers 3', lines: ['a'], seconds: 24 },
];

const ODD = [
  { name: 'Kwaito section', lines: ['a'], seconds: 30 },
  { name: 'Chant', lines: ['a'], seconds: 12 },
  { name: 'Kwaito section 2', lines: ['a'], seconds: 30 },
];

export default function SongFormProbe(): React.ReactElement {
  return (
    <div className="min-h-screen space-y-6 bg-zinc-950 p-4">
      <div data-probe="pop"><SongForm parts={POP} /></div>
      <div data-probe="standard"><SongForm parts={STANDARD} /></div>
      <div data-probe="odd"><SongForm parts={ODD} /></div>
      {/* A brought-in file has no plan. It must draw nothing at all rather
          than an empty strip, and the probe checks that this box is empty. */}
      <div data-probe="none"><SongForm parts={[]} /></div>
    </div>
  );
}
