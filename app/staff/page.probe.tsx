'use client';
/**
 * The stave, for audit/staff.mjs.
 *
 * PROBE=1 only. Four melodies, because the things that go wrong with an
 * engraving are not visible in one line: a key with sharps, a key with flats,
 * a line that needs ledger lines above and below, and a bass line.
 */
import React from 'react';
import Staff from '@/app/components/Staff';

/** A scale up and back, in G — so the F is sharp and comes from the key. */
const IN_G = [64, 66, 67, 69, 71, 72, 74, 76, 74, 71, 67, 64].map((midi, i) => ({
  from: i * 0.5, to: i * 0.5 + 0.45, midi,
}));

/** The same shape in E flat, where the black keys are flats. */
const IN_EB = [63, 65, 67, 68, 70, 72, 74, 75].map((midi, i) => ({
  from: i * 0.5, to: i * 0.5 + 0.45, midi,
}));

/** Wide, so ledger lines are needed above and below, and mixed lengths. */
const WIDE = [
  { from: 0, to: 1.9, midi: 57 },
  { from: 2, to: 2.2, midi: 60 },
  { from: 2.3, to: 2.5, midi: 64 },
  { from: 2.6, to: 3.5, midi: 72 },
  { from: 3.6, to: 3.8, midi: 79 },
  { from: 3.9, to: 4.8, midi: 84 },
  { from: 5, to: 5.7, midi: 61 },
];

/** In G major, but with an F natural in it — the accidental easiest to lose. */
const NATURAL = [67, 69, 71, 65, 67].map((midi, i) => ({
  from: i * 0.5, to: i * 0.5 + 0.45, midi,
}));

const LOW = [43, 45, 47, 48, 50, 52, 47, 43].map((midi, i) => ({
  from: i * 0.5, to: i * 0.5 + 0.45, midi,
}));

export default function StaffProbe(): React.ReactElement {
  return (
    <div className="min-h-screen space-y-7 bg-zinc-950 p-4">
      <div data-probe="g"><Staff notes={IN_G} musicKey="G Major" bpm={120} /></div>
      <div data-probe="eb"><Staff notes={IN_EB} musicKey="Eb Major" bpm={120} /></div>
      <div data-probe="wide"><Staff notes={WIDE} musicKey="" bpm={120} /></div>
      <div data-probe="natural"><Staff notes={NATURAL} musicKey="G Major" bpm={120} /></div>
      <div data-probe="low"><Staff notes={LOW} musicKey="C Major" bpm={120} /></div>
      {/* A take nothing could be read from draws nothing at all. */}
      <div data-probe="none"><Staff notes={[]} /></div>
    </div>
  );
}
