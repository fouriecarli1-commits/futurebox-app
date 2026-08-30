'use client';

/**
 * The note bar: where you are in the song, and whether you are on the note.
 *
 * A singer asked for something to follow — words in time, and a bar of notes
 * to sing off. The words are straightforward. The notes are not, and it is
 * worth being exact about why, because the honest version of this is more
 * useful than the version that pretends.
 *
 * There is no score in this app. The engine returns a finished audio file, so
 * the only way to notation is to listen to the file, and `app/lib/melody.ts`
 * measures how well that works: on one line — a bare lead, a solo voice, your
 * own take — it reads the tune correctly note for note; on a mix it follows
 * the bass and reports the wrong notes with total confidence. So the bar shows
 * a melody only where one can actually be read, and says so where it cannot.
 *
 * What is always true, and always on the bar:
 *
 *   · the notes of the song's key, as the lines you are singing between —
 *     the app chose that key, so it is known rather than heard;
 *   · your own voice, live, moving on those lines while you sing;
 *   · the notes of your take once you have sung one, which is a real melody
 *     read off a single voice, and the thing to follow on the second pass.
 */

import React, { useEffect, useRef } from 'react';
import type { Note } from '../lib/melody';

/** How much of the song is on screen, and where "now" sits in it. */
const WINDOW_S = 6;
const NOW_AT = 0.3;
const LOWEST = 45;
const HIGHEST = 84;

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function nameOf(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export interface Trail {
  readonly at: number;
  readonly midi: number;
}

export default function NoteBar({
  at,
  guide,
  sung,
  trail,
  scale,
  live,
}: {
  /** Where the song is, in seconds. */
  at: number;
  /** Notes to follow, when any could honestly be read. */
  guide: readonly Note[];
  /** The notes of the take, read back off the recording. */
  sung: readonly Note[];
  /** The last few seconds of what the microphone heard. */
  trail: readonly Trail[];
  /** The pitch classes of the song's key, when it has one. */
  scale: readonly number[] | null;
  live: boolean;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    // The range on screen: whatever there is to show, opened out to at least
    // an octave and a half so the lines never sit on top of each other.
    let low = Infinity;
    let high = -Infinity;
    const stretch = (midi: number): void => {
      if (midi < low) low = midi;
      if (midi > high) high = midi;
    };
    guide.forEach((one) => stretch(one.midi));
    sung.forEach((one) => stretch(one.midi));
    trail.forEach((one) => stretch(one.midi));
    if (!Number.isFinite(low)) {
      low = 57;
      high = 72;
    }
    const middle = (low + high) / 2;
    const span = Math.max(15, high - low + 4);
    low = Math.max(LOWEST, Math.round(middle - span / 2));
    high = Math.min(HIGHEST, low + span);

    const from = at - WINDOW_S * NOW_AT;
    const to = from + WINDOW_S;
    const x = (seconds: number): number => ((seconds - from) / WINDOW_S) * width;
    const y = (midi: number): number => height - ((midi - low) / (high - low)) * height;
    const lane = height / (high - low);

    // The lines of the key. Everything else is drawn between them.
    context.font = '10px ui-sans-serif, system-ui, sans-serif';
    // Infinity, not -Infinity: the loop climbs in pitch, so it walks *up* the
    // canvas and every later label has a smaller y than the one before it.
    let lastLabel = Infinity;
    for (let midi = Math.ceil(low); midi <= high; midi += 1) {
      const inKey = !scale || scale.indexOf(((midi % 12) + 12) % 12) >= 0;
      if (!inKey) continue;
      const line = y(midi);
      context.fillStyle = midi % 12 === (scale ? scale[0] : 0) ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)';
      context.fillRect(0, line - 0.5, width, 1);
      // A scale has two places where the next note is a semitone up, and at
      // this height those two labels land on top of each other. Skip the one
      // that would not fit rather than printing a smudge.
      if (lastLabel - line < 11) continue;
      // And not one that would sit half off the top edge.
      if (line < 11) continue;
      lastLabel = line;
      context.fillStyle = 'rgba(161,161,170,0.75)';
      context.fillText(nameOf(midi), 4, line - 2);
    }

    const block = (one: Note, fill: string, radius: number): void => {
      const left = x(one.from);
      const right = x(one.to);
      if (right < 0 || left > width) return;
      const top = y(one.midi) - lane * 0.36;
      context.fillStyle = fill;
      context.beginPath();
      const w = Math.max(3, right - left);
      const h = Math.max(3, lane * 0.72);
      const r = Math.min(radius, h / 2, w / 2);
      context.moveTo(left + r, top);
      context.arcTo(left + w, top, left + w, top + h, r);
      context.arcTo(left + w, top + h, left, top + h, r);
      context.arcTo(left, top + h, left, top, r);
      context.arcTo(left, top, left + w, top, r);
      context.fill();
    };

    // What you sang last time, underneath, then what there is to follow.
    sung.forEach((one) => block(one, 'rgba(16,185,129,0.30)', 4));
    guide.forEach((one) => {
      const now = at >= one.from && at < one.to;
      block(one, now ? 'rgba(52,211,153,0.95)' : 'rgba(228,228,231,0.55)', 5);
    });

    // Your voice, right now, as a line through the last couple of seconds.
    if (trail.length > 1) {
      context.strokeStyle = 'rgb(52,211,153)';
      context.lineWidth = 2.5;
      context.lineJoin = 'round';
      context.beginPath();
      let started = false;
      trail.forEach((point, index) => {
        const previous = trail[index - 1];
        // A jump means a gap in the singing, not a slide through the notes.
        if (started && previous && (point.at - previous.at > 0.15 || Math.abs(point.midi - previous.midi) > 4)) {
          context.stroke();
          context.beginPath();
          started = false;
        }
        const here = x(point.at);
        if (!started) {
          context.moveTo(here, y(point.midi));
          started = true;
        } else {
          context.lineTo(here, y(point.midi));
        }
      });
      context.stroke();
    }

    // Now.
    const head = x(at);
    context.fillStyle = live ? 'rgb(52,211,153)' : 'rgba(255,255,255,0.55)';
    context.fillRect(head - 1, 0, 2, height);
  }, [at, guide, live, scale, sung, trail]);

  return <canvas ref={canvasRef} className="w-full h-36 rounded-2xl bg-zinc-900/70 border border-zinc-800" />;
}
