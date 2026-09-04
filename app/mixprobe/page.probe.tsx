'use client';

/**
 * A page that exists only so the mix can be measured in a real browser.
 *
 * `check:mix` pins the arithmetic — what `trimFor` answers given a peak and an
 * average. It cannot answer the question that actually matters, which is
 * whether the audio that comes out of `mixSession` has those properties: that
 * a lane panned right really does end up on the right, that the ceiling holds
 * on rendered samples rather than on a number, and that two renders of the
 * same session are the same file.
 *
 * That needs Web Audio, which needs a browser. A `.probe.tsx` is not served —
 * `audit/mixdown.mjs` copies it to `page.tsx`, builds, measures and removes it,
 * so the app never ships a route that exists for a test.
 */

import React, { useState } from 'react';
import {
  FLAT_MASTER, mixSession, peakOf, readSession, rmsOf, type Lane, type Master,
} from '../lib/session';
import { CLEAN } from '../lib/tone';

const RATE = 48_000;

/** A tone, so the numbers coming out are numbers somebody can check by hand. */
function tone(hz: number, seconds: number, level: number): AudioBuffer {
  const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext;
  const offline = new Ctx(1, Math.ceil(seconds * RATE), RATE);
  const buffer = offline.createBuffer(1, Math.ceil(seconds * RATE), RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.sin((2 * Math.PI * hz * i) / RATE) * level;
  return buffer;
}

function laneOf(id: string, audio: AudioBuffer, how: Partial<Lane> = {}): Lane {
  return { id, name: id, audio, at: 0, gain: 1, muted: false, soloed: false, ...how };
}

export default function MixProbe(): React.ReactElement {
  const [said, setSaid] = useState('');

  const run = async (): Promise<void> => {
    const out: Record<string, number | string> = {};

    // ── Pan really pans ───────────────────────────────────────────────
    const right = await mixSession([laneOf('r', tone(440, 1, 0.5), { pan: 1 })], RATE);
    if (right) {
      out.rightChannelLeft = peakOf(oneChannel(right, 0));
      out.rightChannelRight = peakOf(oneChannel(right, 1));
    }
    const centre = await mixSession([laneOf('c', tone(440, 1, 0.5))], RATE);
    if (centre) {
      out.centreLeft = peakOf(oneChannel(centre, 0));
      out.centreRight = peakOf(oneChannel(centre, 1));
    }

    // ── A lane's own level is applied ─────────────────────────────────
    const quiet = await mixSession([laneOf('q', tone(440, 1, 0.8), { gain: 0.25 })], RATE);
    if (quiet) out.quietPeak = peakOf(quiet);

    // ── A muted lane is not in the file ───────────────────────────────
    const muted = await mixSession([
      laneOf('a', tone(440, 1, 0.5)),
      laneOf('b', tone(880, 1, 0.5), { muted: true }),
    ], RATE);
    if (muted) out.mutedPeak = peakOf(muted);

    // ── The ceiling holds on real samples ─────────────────────────────
    const hot: Lane[] = [
      laneOf('h1', tone(300, 1, 0.9)),
      laneOf('h2', tone(700, 1, 0.9)),
      laneOf('h3', tone(1100, 1, 0.9)),
    ];
    const master: Master = { ...FLAT_MASTER, ceilingDb: -1 };
    const read = await readSession(hot, RATE, master);
    if (read) {
      out.rawPeak = read.peak;
      out.trim = read.trim;
      const rendered = await mixSession(hot, RATE, master, read.trim);
      if (rendered) {
        out.finalPeak = peakOf(rendered);
        out.finalRms = rmsOf(rendered);
      }
    }

    // ── Loudness matching reaches its target where there is room ──────
    const soft = [laneOf('s', tone(440, 2, 0.05))];
    const loud: Master = { ...FLAT_MASTER, matchLoudness: true };
    const softRead = await readSession(soft, RATE, loud);
    if (softRead) {
      const rendered = await mixSession(soft, RATE, loud, softRead.trim);
      if (rendered) out.matchedRms = rmsOf(rendered);
    }

    /* ── Tone ─────────────────────────────────────────────────────────
       Three questions. Does a clean tone genuinely do nothing — because a
       lane nobody touched must come out untouched. Does drive compress
       without simply turning the volume up, which is the whole reason the
       curve is normalised. And does the speaker band actually remove what is
       above it, rather than being three filters that were wired but never
       connected. */
    const plain = await mixSession([laneOf('p', tone(440, 1, 0.5))], RATE);
    const clean = await mixSession([laneOf('p', tone(440, 1, 0.5), { tone: CLEAN })], RATE);
    out.cleanIsUntouched = plain && clean && same(plain, clean) ? 1 : 0;

    const driven = await mixSession(
      [laneOf('d', tone(440, 1, 0.5), { tone: { ...CLEAN, drive: 0.9 } })],
      RATE,
    );
    if (plain && driven) {
      out.plainRms = rmsOf(plain);
      out.drivenRms = rmsOf(driven);
      out.plainPeak = peakOf(plain);
      out.drivenPeak = peakOf(driven);
    }

    /* Full scale in, full scale out. This is what "normalised" actually
       promises — not that the peak never moves (a soft clip pushes a
       half-scale signal up towards the ceiling, which is the compression
       everybody wants from it) but that it never pushes past where an
       undriven full-scale lane already sits. */
    const loudPlain = await mixSession([laneOf('lp', tone(440, 1, 1))], RATE);
    const loudDriven = await mixSession(
      [laneOf('ld', tone(440, 1, 1), { tone: { ...CLEAN, drive: 0.9 } })],
      RATE,
    );
    if (loudPlain && loudDriven) {
      out.loudPlainPeak = peakOf(loudPlain);
      out.loudDrivenPeak = peakOf(loudDriven);
    }

    const bright = await mixSession([laneOf('b', tone(9000, 1, 0.5))], RATE);
    const boxed = await mixSession(
      [laneOf('b', tone(9000, 1, 0.5), { tone: { ...CLEAN, cabinet: true } })],
      RATE,
    );
    if (bright && boxed) {
      /* Measured as an average, not as a peak. A filter handed a sine that
         starts abruptly overshoots on the first few cycles — the step
         response — and the peak over the whole buffer is that transient
         rather than what the filter passes. Reading the peak said the
         four-pole cabinet was only 7 dB down at 9 kHz when it is twenty; the
         measurement was wrong, not the filter. */
      out.brightRms = rmsOf(bright);
      out.boxedRms = rmsOf(boxed);
      out.brightPeak = peakOf(bright);
      out.boxedPeak = peakOf(boxed);
    }

    // ── The same session twice is the same file ───────────────────────
    const once = await mixSession(hot, RATE, master, read?.trim ?? 1);
    const twice = await mixSession(hot, RATE, master, read?.trim ?? 1);
    out.identical = once && twice && same(once, twice) ? 1 : 0;

    // ── A lane that starts before zero is trimmed, not shifted ────────
    const early = await mixSession([
      laneOf('back', tone(200, 2, 0.4), { backing: true }),
      laneOf('take', tone(900, 2, 0.4), { at: -1 }),
    ], RATE);
    if (early) out.earlySeconds = Number(early.duration.toFixed(3));

    setSaid(JSON.stringify(out));
  };

  return (
    <main className="p-6 space-y-4 bg-black min-h-screen">
      <button type="button" data-probe="run" onClick={() => void run()} className="px-4 py-2 bg-emerald-500 rounded-xl">
        Run
      </button>
      <pre data-probe="out" className="text-xs text-emerald-300 whitespace-pre-wrap">{said}</pre>
    </main>
  );
}

function oneChannel(buffer: AudioBuffer, channel: number): AudioBuffer {
  const Ctx = (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext;
  const offline = new Ctx(1, buffer.length, buffer.sampleRate);
  const out = offline.createBuffer(1, buffer.length, buffer.sampleRate);
  out.getChannelData(0).set(buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)));
  return out;
}

function same(a: AudioBuffer, b: AudioBuffer): boolean {
  if (a.length !== b.length || a.numberOfChannels !== b.numberOfChannels) return false;
  for (let channel = 0; channel < a.numberOfChannels; channel += 1) {
    const one = a.getChannelData(channel);
    const two = b.getChannelData(channel);
    for (let i = 0; i < one.length; i += 97) {
      if (Math.abs(one[i] - two[i]) > 1e-7) return false;
    }
  }
  return true;
}
