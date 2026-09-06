'use client';

/**
 * The words, big enough to read off the screen while you sing.
 *
 * The panel in `NowPlaying` is the right thing for a desk: small type, every
 * line clickable to seek, the whole sheet visible at once. It is the wrong
 * thing for the two moments people actually asked for — singing along, and
 * filming yourself doing it with the phone propped against something.
 *
 * So this is the other view of the same data. Three lines at a time, the one
 * being sung in the middle and large, everything else dimmed. No controls in
 * the way, because a hand reaching for a button is a hand in the shot.
 *
 * ── Filming yourself ─────────────────────────────────────────────────────
 *
 * The front camera goes behind the words, so the screen is a teleprompter and
 * a viewfinder at once — which is the whole reason somebody props a phone
 * against a mug in the first place.
 *
 * The recording is the camera and its microphone. It is *not* a clean mix of
 * the track: doing that means routing the playing audio element through a Web
 * Audio graph, and an element routed that way stays routed after this closes.
 * Breaking playback everywhere else in the app to improve one recording is a
 * bad trade. So the song reaches the recording the way it reaches the room —
 * out loud — and the screen says so before anybody records a silent take
 * wearing headphones.
 *
 * The preview is mirrored because that is what a person expects to see; the
 * file is not, because mirrored footage reads as wrong to everybody else.
 *
 * ── Why it is a portal ───────────────────────────────────────────────────
 *
 * `position: fixed` is only relative to the window when no ancestor has a
 * transform, a filter, `backdrop-filter` or `contain` — any of those becomes
 * the containing block instead, and a full-screen view quietly stops being
 * full screen. Measured here at twenty pixels down and twenty short, with the
 * room behind showing along the top edge. On the one screen somebody props a
 * phone against and films themselves in front of, that strip is in the shot.
 *
 * ── What it is honest about ──────────────────────────────────────────────
 *
 * The section timings are real — the app wrote the composition plan and knows
 * the chorus was asked for at 36 seconds. Inside a section the lines are
 * spread evenly, which nobody sings, so a line can land a second or two out.
 * The note at the bottom says exactly that rather than implying a karaoke
 * track it cannot deliver. Somebody about to film themselves should know
 * which parts to trust.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, Circle, Download, Ear, Loader2, Square, X } from 'lucide-react';
import { lineAt, type TimedLine } from '../lib/timeline';
import { useLang } from '../lib/i18n';
import { downloadBlob, safeFilename } from '../lib/library';

export default function FollowWords({
  lines,
  audio,
  title,
  onClose,
  askWords,
  wordCost,
}: {
  lines: readonly TimedLine[];
  /** The element that is actually playing, so the words follow the sound. */
  audio: HTMLAudioElement | null;
  title: string;
  onClose: () => void;
  /**
   * Write the words out by listening to the song, where that is possible.
   *
   * Offered here rather than on the card outside, because here is where
   * somebody finds out the words are missing: they came to sing along and the
   * screen is empty. A button on the card would be a button about a problem
   * they have not met yet.
   *
   * Absent when there is nothing to listen to — a song with no file on this
   * device — and the screen then says what it can do instead of offering
   * something that would fail.
   *
   * Answers with the reason it could not, or null when it worked. Silence is
   * not an answer: the first version of this posted without a token, the route
   * refused it, and the button spun and then did nothing at all.
   */
  askWords?: () => Promise<string | null>;
  /** What that costs, so the press is informed. */
  wordCost?: number;
}): React.ReactElement {
  const { t } = useLang();
  const [at, setAt] = useState(0);
  /** True while the song is being listened to. See `askWords`. */
  const [asking, setAsking] = useState(false);
  /** Why the last attempt to write the words out did not work. */
  const [wordProblem, setWordProblem] = useState<string | null>(null);
  const frame = useRef<number>(0);

  // Read from the element every frame rather than counting: a paused track, a
  // seek, or a stutter all have to move the words, and only the element knows.
  useEffect(() => {
    if (!audio) return undefined;
    const step = (): void => {
      setAt(audio.currentTime);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [audio]);

  // Escape closes it. Somebody who opened this by accident, mid-song, should
  // not have to hunt for a small X with a phone in their other hand.
  useEffect(() => {
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  /* ── The camera ──────────────────────────────────────────────────── */
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [filming, setFilming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [take, setTake] = useState<Blob | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const stopCamera = React.useCallback((): void => {
    recorder.current?.state === 'recording' && recorder.current.stop();
    stream.current?.getTracks().forEach((one) => one.stop());
    stream.current = null;
    setFilming(false);
    setRecording(false);
  }, []);

  // The camera is released when this closes, always. A light left on after
  // somebody thinks they have stopped filming is the worst bug this could have.
  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async (): Promise<void> => {
    setProblem(null);
    try {
      // `ideal`, not a bare value. `facingMode: 'user'` is a *hard* constraint:
      // a laptop with one webcam that reports no facing direction fails it
      // outright with NotFoundError, so the front-camera preference would have
      // broken this on most desktops while looking like a permission problem.
      // Same for the size — a camera that cannot do 1080×1920 should give what
      // it has rather than nothing.
      const got = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });
      stream.current = got;
      if (video.current) {
        video.current.srcObject = got;
        void video.current.play();
      }
      setFilming(true);
    } catch (refusal) {
      // Refused and absent are different problems with different fixes, and
      // telling somebody to check a permission they already granted is how an
      // app wastes an evening. The browser names which one it was.
      const kind = refusal instanceof Error ? refusal.name : '';
      setProblem(
        kind === 'NotFoundError' || kind === 'OverconstrainedError'
          ? t('sing.noDevice', 'No camera was found on this device.')
          : t(
              'sing.noCamera',
              'The camera was not allowed. Check the permission in your browser and try again.',
            ),
      );
    }
  };

  const startRecording = (): void => {
    const source = stream.current;
    if (!source || typeof MediaRecorder === 'undefined') return;
    const type = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((one) =>
      MediaRecorder.isTypeSupported(one),
    );
    if (!type) {
      setProblem(t('sing.noRecord', 'This browser cannot record video.'));
      return;
    }
    chunks.current = [];
    const made = new MediaRecorder(source, { mimeType: type });
    made.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    made.onstop = () => setTake(new Blob(chunks.current, { type }));
    recorder.current = made;
    made.start();
    setTake(null);
    setRecording(true);
  };

  const stopRecording = (): void => {
    recorder.current?.stop();
    setRecording(false);
  };

  /* Nothing to portal into until the browser has one. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = lines.length ? lineAt(lines, at) : -1;
  // Three at a time: the one being sung, the one before for context, and the
  // one coming so there is time to draw breath.
  const window_ = [current - 1, current, current + 1];

  if (!mounted) return <></>;

  return createPortal(
    /* Above the tab bar, not under it.
 
       The bar is `z-95` and this was `z-90`, so a light strip sat across the
       bottom of a dark full-screen view, over the record button — "die lyrics
       button se bar allign nie mooi nie, daar is 'n wit stuk wat uit steek".
       Everywhere else the bar over an overlay is right, because you should be
       able to leave by pressing a tab. Not here: this is a teleprompter you
       film yourself against, and a navigation bar in the shot is in the shot.
       The X is the way out. */
    <div className="fixed inset-0 z-[100] bg-scrim flex flex-col">
      {/* Mirrored for the person looking at it. The file that comes out is
          not, because mirrored footage reads as wrong to everybody else. */}
      <video
        ref={video}
        muted
        playsInline
        /* `contain`, not `cover`.
 
           `cover` crops the camera's frame to fill the screen, and a phone
           screen is far taller than any camera's picture — so the middle was
           blown up and what somebody saw was their own face enormous: "die
           video opname vergroot die gesig vreeslik baie". Worse than ugly, it
           was a lie: the recorder captures the camera's whole frame, so the
           preview was showing a shot the file would not contain. Letterboxed
           and honest beats filled and wrong on the one screen whose whole job
           is to show you what is being filmed. */
        className={`absolute inset-0 w-full h-full object-contain scale-x-[-1] ${
          filming ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      {filming && <div className="absolute inset-0 bg-black/45" />}

      {/* The close first, on the left.

          It was on the right, where the corner search now sits fixed above
          every screen — so the way out of the teleprompter was under a button
          that opens a search. Order swapped rather than the title moved,
          because the title should still have the width. */}
      <div className="relative flex items-start gap-4 p-5">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('play.close', 'Close')}
          className="text-zinc-600 hover:text-white flex-shrink-0"
        >
          <X className="w-6 h-6" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm text-zinc-500">{title}</p>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        {/* No words at all — a song brought in from a file, or one made
            without any.

            The camera still works and that is the point: it films the person,
            the song plays out loud, and the lines are an overlay. So this says
            what is missing rather than pretending the screen is loading, and
            offers the one thing that can fix it.

            Honest about what it is before the money, not after. A transcriber
            is built for speech, and singing with a band behind it is the
            hardest case there is — somebody who knows that reads a rough
            result as a draft, and somebody who does not reads it as the app
            being broken. */}
        {lines.length === 0 ? (
          <div className="max-w-sm space-y-3">
            <p className="text-xl text-zinc-500 leading-snug">
              {t('play.noWords', 'This song has no words written down. The camera still works — film yourself to it.')}
            </p>
            {askWords && (
              <>
                <button
                  type="button"
                  disabled={asking}
                  onClick={() => {
                    setAsking(true);
                    setWordProblem(null);
                    void askWords()
                      .then((why) => setWordProblem(why))
                      .finally(() => setAsking(false));
                  }}
                  className="mx-auto flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-50"
                >
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ear className="h-4 w-4" />}
                  {asking
                    ? t('play.listening', 'Listening to it…')
                    : t('play.writeWords', 'Listen to it and write the words out')}
                  {typeof wordCost === 'number' && !asking && (
                    <span className="text-zinc-500">· {wordCost}</span>
                  )}
                </button>
                {wordProblem && (
                  <p className="text-sm text-amber-300 leading-snug">{wordProblem}</p>
                )}
                <p className="text-sm text-zinc-600 leading-snug">
                  {t(
                    'play.writeWordsWhy',
                    'It is a transcriber built for speech, and singing over a band is the hardest thing you can give it. Expect a draft you tidy up, not a lyric sheet.',
                  )}
                </p>
              </>
            )}
          </div>
        ) : current < 0 ? (
          <p className="text-2xl text-zinc-600">{t('play.waiting', 'Waiting for the first line…')}</p>
        ) : (
          window_.map((index) => {
            const line = lines[index];
            if (!line) return <span key={index} className="block h-8" />;
            const now = index === current;
            return (
              <p
                key={`${index}-${line.start}`}
                className={`transition-all duration-300 leading-tight ${
                  now
                    ? 'text-3xl sm:text-5xl font-black text-white'
                    : 'text-xl sm:text-2xl text-zinc-700'
                }`}
              >
                {line.text}
              </p>
            );
          })
        )}
      </div>

      <div className="relative px-6 pb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!filming ? (
            <button
              type="button"
              onClick={() => void startCamera()}
              className="px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-emerald-500 flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              {t('sing.film', 'Film yourself')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  recording
                    ? 'bg-rose-500 text-white'
                    : 'bg-emerald-500 text-onAccent hover:bg-emerald-400'
                }`}
              >
                {recording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" fill="currentColor" />}
                {recording ? t('sing.stop', 'Stop') : t('sing.record', 'Record')}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-500 flex items-center gap-2"
              >
                <CameraOff className="w-4 h-4" />
                {t('sing.cameraOff', 'Camera off')}
              </button>
            </>
          )}
          {take && (
            <button
              type="button"
              onClick={() => downloadBlob(take, safeFilename(title, take.type.includes('mp4') ? 'mp4' : 'webm'))}
              className="px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-emerald-600 text-emerald-300 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('sing.save', 'Save the take')}
            </button>
          )}
        </div>

        {problem && <p className="text-sm text-rose-400 text-center leading-snug">{problem}</p>}

        {filming && !recording && !take && (
          <p className="text-sm text-amber-300/90 text-center leading-snug">
            {t(
              'sing.aloud',
              'The recording picks up whatever the microphone hears, so play the song out loud. On headphones the take comes back with only your voice on it.',
            )}
          </p>
        )}

        <p className="text-sm text-zinc-600 text-center leading-snug">
          {t(
            'play.followNote',
            'The sections are timed from the plan the app wrote. Inside a section the lines are spread evenly, so one can land a second or two out.',
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}
