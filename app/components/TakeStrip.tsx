'use client';

/**
 * The one thing a phone in the booth was not showing: am I on the note.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The booth hid the stave and the waveform below `sm`, on purpose: they are
 * desk instruments — you read the wave to find the bar that went wrong and
 * you drag words onto the stave — and both want a mouse and a wide screen. On
 * a 390-pixel phone they took the height from the one thing a person standing
 * at a microphone is looking at, which is the words.
 *
 * What that decision missed is that it also took away the answer to the only
 * question a singer asks while singing. Carli, holding the phone: "dit vat
 * mens nie na 'n recording studio toe wat die liedjie se woorde wys, of
 * enigsins 'n klank baan wys of dalk 'n note balk dat mens kan sien of mens op
 * noot sing nie."
 *
 * So this is not the stave brought back. It is the part of it that answers her
 * question, at a size a phone can spare: the notes the song sings, your own
 * voice drawn against them, the note you are on, and whether the microphone is
 * hearing anything at all.
 *
 * ── What is drawn is what is known ───────────────────────────────────────
 *
 * The same rule the stave keeps. The guide notes are read off the audio and
 * only where that reading can be trusted — on a finished mix it cannot, and
 * then there are no bars, only your own line and a sentence saying why. Notes
 * that are wrong are worse than no notes: a singer will chase them.
 */

import React, { useEffect, useRef } from 'react';
import type { Note } from '../lib/melody';
import type { Trail } from './NoteBar';
import { useLang } from '../lib/i18n';

/** How much time is on the ribbon, and where "now" sits in it. */
const WINDOW_S = 5;
const NOW_AT = 0.7;
/** The narrowest range of notes the ribbon will draw, in semitones. */
const LEAST_SPAN = 10;

export default function TakeStrip({
  at,
  guide,
  trail,
  note,
  level,
  hot,
  live,
  guideRead,
  className = '',
}: {
  /** Where the song is, in seconds. */
  readonly at: number;
  /** What the song sings, where that could be read off it. */
  readonly guide: readonly Note[];
  /** What is being sung right now. Mutated in place by the booth. */
  readonly trail: readonly Trail[];
  readonly note: { readonly name: string; readonly octave: number; readonly cents: number } | null;
  /** 0 to 1, off the microphone. */
  readonly level: number;
  /** Actually clipping, rather than merely loud. */
  readonly hot: boolean;
  /** The microphone is open: recording, counting in, or playing back. */
  readonly live: boolean;
  /** The backing has been read for its melody, whether or not it yielded one. */
  readonly guideRead: boolean;
  readonly className?: string;
}): React.ReactElement {
  const { t } = useLang();
  const canvas = useRef<HTMLCanvasElement | null>(null);

  /* Redrawn every frame while the microphone is open, because the trail is a
     mutable array the booth pushes into — React is never told it changed, and
     asking it to be told sixty times a second would be the wrong trade. */
  useEffect(() => {
    let frame = 0;
    const draw = (): void => {
      const box = canvas.current;
      const context = box?.getContext('2d');
      if (box && context) {
        const ratio = window.devicePixelRatio || 1;
        const width = box.clientWidth;
        const height = box.clientHeight;
        if (box.width !== Math.round(width * ratio) || box.height !== Math.round(height * ratio)) {
          box.width = Math.round(width * ratio);
          box.height = Math.round(height * ratio);
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const from = at - WINDOW_S * NOW_AT;
        const to = from + WINDOW_S;
        const x = (when: number): number => ((when - from) / WINDOW_S) * width;

        const near = guide.filter((one) => one.to > from && one.from < to);
        const sung = trail.filter((one) => one.at > from && one.at < to);

        /* The range of notes on screen, with a floor: a window holding one
           note would otherwise be drawn as a bar filling the whole height,
           and a voice a tone under it would look an octave out. */
        const heard = [...near.map((one) => one.midi), ...sung.map((one) => one.midi)];
        const middle = heard.length ? heard.reduce((sum, one) => sum + one, 0) / heard.length : 60;
        const lowest = heard.length ? Math.min(...heard) : middle;
        const highest = heard.length ? Math.max(...heard) : middle;
        const span = Math.max(LEAST_SPAN, highest - lowest + 4);
        const top = (lowest + highest) / 2 + span / 2;
        const y = (midi: number): number => ((top - midi) / span) * height;

        /* The line where the song is now. */
        context.strokeStyle = 'rgba(255,255,255,0.18)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(Math.round(x(at)) + 0.5, 0);
        context.lineTo(Math.round(x(at)) + 0.5, height);
        context.stroke();

        /* What the song sings: a bar per note, dimmer once it is behind you. */
        for (const one of near) {
          const left = x(Math.max(one.from, from));
          const right = x(Math.min(one.to, to));
          context.fillStyle = one.to < at ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.55)';
          context.fillRect(left, y(one.midi) - 3, Math.max(2, right - left), 6);
        }

        /* Your own voice. Drawn as points rather than a joined line: the
           pitch reading drops out on a consonant and on a breath, and a line
           that leaps across the gap draws a slide nobody sang. */
        context.fillStyle = 'rgba(255,255,255,0.92)';
        for (const one of sung) {
          context.fillRect(x(one.at) - 1.5, y(one.midi) - 1.5, 3, 3);
        }

        if (!near.length && !sung.length) {
          context.fillStyle = 'rgba(255,255,255,0.12)';
          context.fillRect(0, height / 2 - 0.5, width, 1);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [at, guide, trail]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <canvas
        ref={canvas}
        /* Named, for the same reason the stave is. */
        data-take-strip
        aria-hidden="true"
        className="w-full rounded-xl bg-zinc-900/60"
        style={{ height: 'clamp(3rem, 9vh, 4.5rem)' }}
      />

      <div className="flex items-center gap-2.5">
        {/* The note, and how far off it you are. */}
        {note ? (
          <>
            <span className="text-xl font-black text-white tabular-nums flex-shrink-0">
              {note.name}
              <span className="text-zinc-500 text-sm">{note.octave}</span>
            </span>
            <span className="h-2 flex-1 min-w-0 rounded-full bg-zinc-800 relative overflow-hidden">
              {/* Middle is in tune. Left is flat, right is sharp. */}
              <span className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
              <span
                className={`absolute inset-y-0 w-2 rounded-full ${
                  Math.abs(note.cents) < 15 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ left: `calc(${50 + Math.max(-50, Math.min(50, note.cents))}% - 4px)` }}
              />
            </span>
            <span className="text-sm text-zinc-500 tabular-nums w-11 flex-shrink-0 text-right">
              {note.cents > 0 ? '+' : ''}
              {note.cents}
            </span>
          </>
        ) : (
          /* Only claim to be listening while the microphone is actually open.
             Idle, the honest thing to say is what the row is for. */
          <span className="text-sm text-zinc-500 leading-snug">
            {live
              ? t('booth.listening', 'Listening…')
              : guide.length
                ? t('booth.stripIdle', 'Press record: the song’s notes are the bars, and your voice draws on them.')
                : guideRead
                  ? t('booth.barNoGuide', 'No notes yet: the tune cannot be read out of a finished mix without getting it wrong. Separate the voice below and the notes appear.')
                  : t('booth.barReading', 'Reading the backing…')}
          </span>
        )}
      </div>

      {/* The microphone's level, so a dead microphone is obvious before a take
          rather than after one. This was on the desk only, which is exactly
          where somebody holding a phone could not see it. */}
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-none ${hot ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
    </div>
  );
}
