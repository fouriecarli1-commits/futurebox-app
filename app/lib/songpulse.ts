'use client';

/**
 * The beat of a song that is playing, as a count that goes up on each one.
 *
 * For the kids video stage: the dancers jump and the lights pulse on the
 * child's own song (`KidsStage`'s `pulse`). Read off the low end of the
 * sound — a kick drum is where a child hears the beat — by an analyser on the
 * playing element, so it follows the real song and not a guess at its tempo.
 *
 * Where the analyser cannot be had (an old browser, a sound it may not read),
 * a steady two beats a second while it plays; where it finds no beat (a soft
 * lullaby), a sway about once a second. Dancers that move a little off the
 * beat are far better than dancers that stand still.
 */

import { useEffect, useState } from 'react';

/** `createMediaElementSource` may be called once per element, ever. */
const wired = new WeakMap<HTMLMediaElement, { context: AudioContext; analyser: AnalyserNode }>();

function wire(audio: HTMLMediaElement): { context: AudioContext; analyser: AnalyserNode } | null {
  const had = wired.get(audio);
  if (had) return had;
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    const context = new Context();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(context.destination);
    const made = { context, analyser };
    wired.set(audio, made);
    return made;
  } catch {
    return null;
  }
}

/**
 * Is this frame a beat?
 *
 * The low end's energy against its own recent average: a beat is a jump well
 * above what has been usual, and no two closer than a sixth of a second — a
 * kick's tail must not count twice. Pure, so the rule can be checked.
 */
export function isBeat(energy: number, average: number, sinceLast: number): boolean {
  return energy > 0.08 && energy > average * 1.35 && sinceLast > 160;
}

export function useSongPulse(audio: HTMLMediaElement | null, playing: boolean): number {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (!audio || !playing) return undefined;
    const got = wire(audio);
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    if (!got) {
      timer = setInterval(() => setPulse((n) => n + 1), 500);
      return () => { if (timer) clearInterval(timer); };
    }
    void got.context.resume().catch(() => undefined);
    const bins = new Uint8Array(got.analyser.frequencyBinCount);
    let average = 0;
    let last = 0;
    const tick = (now: number): void => {
      got.analyser.getByteFrequencyData(bins);
      /* The first few bins: below about 250 Hz at the usual sample rates. */
      let sum = 0;
      for (let i = 1; i < 6; i += 1) sum += bins[i];
      const energy = sum / (5 * 255);
      /* A beat, or — in a soft song with no drum to find — a gentle sway
         every so often, so the stage never stands still while it plays. */
      if (isBeat(energy, average, now - last) || now - last > 1100) {
        last = now;
        setPulse((n) => n + 1);
      }
      average = average * 0.92 + energy * 0.08;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audio, playing]);
  return pulse;
}
