'use client';
/**
 * The readings, for audit/heard.mjs.
 *
 * PROBE=1 only. Three songs deliberately at opposite ends, because a block
 * that reads the same whatever it is handed is the failure worth catching:
 * a ballad in a flat major, a house track, and something squashed and busy.
 */
import React from 'react';
import WhatWeHeard from '@/app/components/WhatWeHeard';

const BALLAD = { bpm: 68, key: 'E♭ major', brightness: 0.22, weight: 0.1, density: 1.4, punch: 7.5 };
const HOUSE = { bpm: 126, key: 'A minor', brightness: 0.61, weight: 0.44, density: 4.2, punch: 4.1 };
const SQUASHED = { bpm: 174, key: '', brightness: 0.7, weight: 0.38, density: 8.9, punch: 2.1 };

export default function HeardProbe(): React.ReactElement {
  return (
    <div className="min-h-screen space-y-6 bg-zinc-950 p-4">
      <div data-probe="ballad"><WhatWeHeard heard={BALLAD} /></div>
      <div data-probe="house"><WhatWeHeard heard={HOUSE} /></div>
      <div data-probe="squashed"><WhatWeHeard heard={SQUASHED} /></div>
      {/* Nothing measured draws nothing. */}
      <div data-probe="none"><WhatWeHeard heard={null} /></div>
    </div>
  );
}
