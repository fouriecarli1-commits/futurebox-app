'use client';

/**
 * The stave: sheet music that moves, with the words written under it.
 *
 * A singer asked for something to sing off — a stave that shows where you are
 * in the song, with the words on it, both lighting up as they arrive. This is
 * that, scrolling right to left past a fixed line, the way the music actually
 * passes you.
 *
 * Everything on it is real or it is not drawn:
 *
 *   · **The lines and the clef** come from the notes themselves — treble or
 *     bass, whichever the singing sits in.
 *   · **The key signature** is the song's own key, which the app chose, so it
 *     is known rather than heard.
 *   · **The bar lines** are the song's own tempo. No tempo, no bar lines.
 *   · **The notes** are read off the audio, and only where that reading can be
 *     trusted — see `app/lib/melody.ts`, which measures how often it can be.
 *     On a finished mix it cannot, and then the stave carries the words and
 *     your own voice and no notes, rather than notes that are wrong.
 *   · **The words** sit under the notes on the same clock, and the ones being
 *     sung into the note coming up are lit with it.
 *   · **Your voice** draws on the stave live while you sing, so you can see
 *     yourself sitting on the line or under it.
 */

import React, { useEffect, useRef } from 'react';
import type { Note } from '../lib/melody';
import type { TimedWord } from '../lib/timeline';

/** How much of the song is on screen, and where "now" sits in it. */
const WINDOW_S = 6;
const NOW_AT = 0.32;
/** The strip along the bottom the words are written in. */
const WORDS_H = 24;
/** Half the gap between two stave lines: one step of the stave. */
const STEP = 5;
/** The width of the clef and key signature, which do not scroll. */
const HEADER = 52;

/** Letter and accidental for each pitch class, spelled with sharps or flats. */
const SHARP_LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP_ACC = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const FLAT_LETTER = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const FLAT_ACC = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];
/** The keys written with flats. Everything else is written with sharps. */
const FLAT_KEYS = [5, 10, 3, 8, 1, 6];

/**
 * Where each sharp and flat of a key signature is written.
 *
 * These are placements, not arithmetic. A key signature is not "the altered
 * letter, anywhere it fits" — every sharp and flat has one traditional line or
 * space, in one traditional order, and a signature written anywhere else looks
 * wrong to anybody who reads music. Steps are seven to the octave: E4 is 30.
 */
const SIGN_ORDER_SHARP = [3, 0, 4, 1, 5, 2, 6];
const SIGN_ORDER_FLAT = [6, 2, 5, 1, 4, 0, 3];
/** Indexed by letter: C D E F G A B. */
const TREBLE_SHARP_AT = [35, 36, 37, 38, 39, 33, 34];
const TREBLE_FLAT_AT = [35, 36, 37, 31, 32, 33, 34];
const BASS_SHARP_AT = [21, 22, 23, 24, 25, 19, 20];
const BASS_FLAT_AT = [21, 22, 23, 17, 18, 19, 20];

export interface Trail {
  readonly at: number;
  readonly midi: number;
}

interface Spelled {
  /** Position on the stave: seven letters to the octave, not twelve semitones. */
  readonly step: number;
  /** −1 flat, 0 natural, 1 sharp. */
  readonly accidental: number;
  readonly letter: number;
}

function spell(midi: number, flats: boolean): Spelled {
  const rounded = Math.round(midi);
  const pc = ((rounded % 12) + 12) % 12;
  const letter = flats ? FLAT_LETTER[pc] : SHARP_LETTER[pc];
  const accidental = flats ? FLAT_ACC[pc] : SHARP_ACC[pc];
  // The octave of the *letter*: a B natural and the C above it are a step
  // apart on the stave but an octave apart in the numbering.
  const octave = Math.floor((rounded - accidental) / 12) - 1;
  return { step: octave * 7 + letter, accidental, letter };
}

/** Which letters the key signature already alters, so they are not re-marked. */
function signature(scale: readonly number[] | null, flats: boolean): Int8Array {
  const marks = new Int8Array(7);
  if (!scale) return marks;
  scale.forEach((pc) => {
    const letter = flats ? FLAT_LETTER[pc] : SHARP_LETTER[pc];
    marks[letter] = flats ? FLAT_ACC[pc] : SHARP_ACC[pc];
  });
  return marks;
}

export default function NoteBar({
  at,
  guide,
  sung,
  trail,
  words,
  scale,
  bpm,
  live,
  onHold,
  onDrag,
  onRelease,
}: {
  /** Where the song is, in seconds. */
  at: number;
  /** Notes to follow, when any could honestly be read. */
  guide: readonly Note[];
  /** The notes of the take, read back off the recording. */
  sung: readonly Note[];
  /** The last few seconds of what the microphone heard. */
  trail: readonly Trail[];
  /** The words, each with its own moment. */
  words: readonly TimedWord[];
  /** The pitch classes of the song's key, when it has one. */
  scale: readonly number[] | null;
  /** The song's tempo, for the bar lines. Zero draws none. */
  bpm: number;
  live: boolean;
  /** Somebody has taken hold of the words. */
  onHold?: () => void;
  /** How far they have pulled, in seconds. Positive is later. */
  onDrag?: (seconds: number) => void;
  onRelease?: () => void;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Where the drag began: the pointer's x, and the song's time then. */
  const heldRef = useRef<{ x: number; at: number } | null>(null);

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

    const flats = !!scale && FLAT_KEYS.indexOf(scale[0]) >= 0;
    const marks = signature(scale, flats);

    // Treble or bass, whichever the singing sits in.
    const heard: number[] = [];
    guide.forEach((one) => heard.push(one.midi));
    sung.forEach((one) => heard.push(one.midi));
    trail.forEach((one) => heard.push(one.midi));
    heard.sort((a, b) => a - b);
    const middle = heard.length ? heard[heard.length >> 1] : 67;
    const treble = middle >= 57;

    // The bottom line of the stave: E4 in treble, G2 in bass.
    const bottomStep = treble ? 4 * 7 + 2 : 2 * 7 + 4;
    const staffTop = (height - WORDS_H - STEP * 8) / 2;
    const bottomY = staffTop + STEP * 8;
    const y = (step: number): number => bottomY - (step - bottomStep) * STEP;
    /** A pitch anywhere between two notes, for drawing a voice rather than a note. */
    const yOf = (midi: number): number => {
      const below = spell(Math.floor(midi), flats);
      const above = spell(Math.floor(midi) + 1, flats);
      const part = midi - Math.floor(midi);
      return y(below.step) + (y(above.step) - y(below.step)) * part;
    };

    const from = at - (WINDOW_S * (NOW_AT * width - HEADER)) / width;
    const x = (seconds: number): number => HEADER + ((seconds - from) / WINDOW_S) * (width - HEADER);

    /** The note being sung into: the one you are on, or the next one along. */
    let coming: Note | null = null;
    for (let i = 0; i < guide.length; i += 1) {
      if (at < guide[i].to) {
        coming = guide[i];
        break;
      }
    }

    // Its span, shaded top to bottom, so the note and the words underneath it
    // are one moment rather than two things near each other.
    if (coming) {
      const left = Math.max(HEADER, x(coming.from));
      const right = x(coming.to);
      if (right > HEADER) {
        context.fillStyle = 'rgba(52,211,153,0.12)';
        context.fillRect(left, 0, Math.max(2, right - left), height);
      }
    }

    // ── the stave ────────────────────────────────────────────────────────
    context.fillStyle = 'rgba(228,228,231,0.30)';
    for (let line = 0; line < 5; line += 1) {
      context.fillRect(0, staffTop + line * STEP * 2, width, 1);
    }

    // Bar lines, from the song's own tempo.
    if (bpm > 0) {
      const bar = (60 / bpm) * 4;
      context.fillStyle = 'rgba(228,228,231,0.22)';
      for (let n = Math.max(0, Math.floor(from / bar)); n * bar < from + WINDOW_S; n += 1) {
        const line = x(n * bar);
        if (line > HEADER) context.fillRect(line, staffTop, 1, STEP * 8);
      }
    }

    // ── the clef and the key signature, which do not move ────────────────
    context.fillStyle = 'rgb(9,9,11)';
    context.fillRect(0, 0, HEADER, height);
    context.fillStyle = 'rgba(228,228,231,0.30)';
    for (let line = 0; line < 5; line += 1) {
      context.fillRect(0, staffTop + line * STEP * 2, HEADER, 1);
    }
    context.fillStyle = 'rgba(228,228,231,0.9)';
    context.textBaseline = 'middle';
    // The clef glyphs, with the letter they name as the fallback: not every
    // machine has a font with musical symbols in it. A treble clef curls on
    // the G line and a bass clef's dots sit either side of the F line, which
    // is what makes each of them mean anything.
    context.font = `${STEP * 9}px serif`;
    const clef = treble ? '\u{1D11E}' : '\u{1D122}';
    if (context.measureText(clef).width > STEP) {
      context.fillText(clef, 2, y(treble ? bottomStep + 2 : bottomStep + 6));
    } else {
      context.font = `bold ${STEP * 3}px ui-sans-serif, system-ui, sans-serif`;
      context.fillText(treble ? 'G' : 'F', 4, y(treble ? bottomStep + 2 : bottomStep + 6));
    }

    // The key signature, in its traditional order and on its traditional lines.
    const order = flats ? SIGN_ORDER_FLAT : SIGN_ORDER_SHARP;
    const places = treble
      ? flats
        ? TREBLE_FLAT_AT
        : TREBLE_SHARP_AT
      : flats
        ? BASS_FLAT_AT
        : BASS_SHARP_AT;
    context.font = `${STEP * 3.4}px serif`;
    let atX = 22;
    order.forEach((letter) => {
      if (!marks[letter]) return;
      context.fillText(marks[letter] > 0 ? '♯' : '♭', atX, y(places[letter]));
      atX += STEP * 1.8;
    });

    // ── the notes ────────────────────────────────────────────────────────
    const head = (
      midi: number,
      centre: number,
      seconds: number,
      fill: string,
      size: number,
      hollow: boolean,
    ): void => {
      if (centre < HEADER - 10 || centre > width + 10) return;
      const spelled = spell(midi, flats);
      const line = y(spelled.step);
      const rx = STEP * 0.95 * size;
      const ry = STEP * 0.78 * size;

      // Ledger lines, so a note above or below the stave still has a place.
      context.fillStyle = 'rgba(228,228,231,0.30)';
      for (let step = bottomStep + 10; step <= spelled.step; step += 2) {
        context.fillRect(centre - rx - 3, y(step), rx * 2 + 6, 1);
      }
      for (let step = bottomStep - 2; step >= spelled.step; step -= 2) {
        context.fillRect(centre - rx - 3, y(step), rx * 2 + 6, 1);
      }

      context.save();
      context.translate(centre, line);
      context.rotate(-0.32);
      context.beginPath();
      context.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      if (hollow) {
        context.strokeStyle = fill;
        context.lineWidth = 1.8;
        context.stroke();
      } else {
        context.fillStyle = fill;
        context.fill();
      }
      context.restore();

      // A stem, up or down depending on where the note sits.
      const up = spelled.step < bottomStep + 4;
      context.fillStyle = fill;
      context.fillRect(up ? centre + rx - 1 : centre - rx, up ? line - STEP * 5.5 : line, 1.6, STEP * 5.5);

      // An accidental only where the key signature does not already say it.
      if (spelled.accidental !== marks[spelled.letter]) {
        context.fillStyle = fill;
        context.font = `${STEP * 3.2}px serif`;
        context.fillText(
          spelled.accidental > 0 ? '♯' : spelled.accidental < 0 ? '♭' : '♮',
          centre - rx - STEP * 2.4,
          line,
        );
      }
      void seconds;
    };

    // What you sang, small and behind what there is to sing.
    sung.forEach((one) => head(one.midi, x((one.from + one.to) / 2), one.to - one.from, 'rgba(16,185,129,0.5)', 0.62, true));

    guide.forEach((one) => {
      const centre = x((one.from + one.to) / 2);
      const beats = bpm > 0 ? (one.to - one.from) / (60 / bpm) : 1;
      const now = one === coming;
      head(one.midi, centre, one.to - one.from, now ? 'rgb(52,211,153)' : 'rgba(228,228,231,0.75)', 1, beats >= 1.6);
    });

    // ── your voice ───────────────────────────────────────────────────────
    if (trail.length > 1) {
      context.strokeStyle = 'rgba(52,211,153,0.9)';
      context.lineWidth = 2;
      context.lineJoin = 'round';
      context.beginPath();
      let started = false;
      trail.forEach((point, index) => {
        const previous = trail[index - 1];
        // A jump is a gap in the singing, not a slide through the notes.
        if (started && previous && (point.at - previous.at > 0.15 || Math.abs(point.midi - previous.midi) > 4)) {
          context.stroke();
          context.beginPath();
          started = false;
        }
        const here = x(point.at);
        if (here < HEADER) return;
        if (!started) {
          context.moveTo(here, yOf(point.midi));
          started = true;
        } else {
          context.lineTo(here, yOf(point.midi));
        }
      });
      context.stroke();
    }

    // ── the words ────────────────────────────────────────────────────────
    /**
     * Under the stave, on the same clock, the way a lead sheet is written.
     * The ones going into the note coming up are lit with it — lit by the
     * clock, because the word and the note are the same moment, and not by
     * any claim about which syllable was written for which note.
     */
    context.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    const row = height - WORDS_H / 2;
    let lastRight = HEADER;
    words.forEach((word) => {
      const left = x(word.start);
      if (left < HEADER || left > width + 40) return;
      if (left < lastRight + 4) return;
      lastRight = left + context.measureText(word.text).width;
      const inComing = coming ? word.start < coming.to && word.end > coming.from : false;
      const now = at >= word.start && at < word.end;
      context.fillStyle = inComing || now ? 'rgb(52,211,153)' : 'rgba(161,161,170,0.75)';
      context.fillText(word.text, left, row);
    });

    // ── now ──────────────────────────────────────────────────────────────
    const playhead = x(at);
    if (playhead > HEADER) {
      context.fillStyle = live ? 'rgb(52,211,153)' : 'rgba(255,255,255,0.6)';
      context.fillRect(playhead - 1, staffTop - STEP * 2, 2, STEP * 12 + WORDS_H);
    }
    context.textBaseline = 'alphabetic';
  }, [at, bpm, guide, live, scale, sung, trail, words]);

  /**
   * Taking hold of the words.
   *
   * The hand moves the words and nothing else. It does not move the song, it
   * does not touch the microphone, and it works in the middle of a take —
   * which is the whole point of it. When the words are running ahead of the
   * singer there is no way to fix that while singing except to reach up and
   * hold them back, and this is that: hold, and they stop while the song
   * carries on underneath; drag right and they arrive later; drag left and
   * they arrive sooner.
   *
   * The arithmetic is the drawing's own, in reverse: the window is six seconds
   * wide across everything but the clef, so a pixel is worth that divided by
   * the width.
   */
  const pull = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const held = heldRef.current;
    if (!held || !onDrag) return;
    const width = event.currentTarget.clientWidth - HEADER;
    if (width <= 0) return;
    onDrag(((event.clientX - held.x) * WINDOW_S) / width);
  };

  const letGo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!heldRef.current) return;
    heldRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onRelease?.();
  };

  // The stave gives way on a short window rather than pushing the words off
  // the top of the screen, which is what a fixed height did.
  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-2xl bg-zinc-950 border border-zinc-800 touch-none ${
        onDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ height: 'clamp(6.5rem, 18vh, 10rem)' }}
      onPointerDown={(event) => {
        if (!onDrag) return;
        heldRef.current = { x: event.clientX, at };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        onHold?.();
      }}
      onPointerMove={pull}
      onPointerUp={letGo}
      onPointerCancel={letGo}
    />
  );
}
