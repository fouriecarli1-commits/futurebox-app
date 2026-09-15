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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, Check, Circle, Download, Ear, Headphones, Loader2, Pause, Play, Radio, Speaker, Square, X } from 'lucide-react';
import { lineAt, type TimedLine } from '../lib/timeline';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { downloadBlob, safeFilename } from '../lib/library';
import { keepFilmed } from '../lib/filmed';
import { mixFor, type Mix } from '../lib/singmix';

/** Where the headphones answer is kept. Hers, not this song's. */
/**
 * Text on this screen is written in literal light, not in the palette.
 *
 * ── Why, and it is not a preference ──────────────────────────────────────
 *
 * This overlay is `bg-scrim`, which is dark in EVERY theme on purpose — the
 * whole point of a scrim is that the page behind it goes away. The palette
 * underneath it is not: `zinc` is remapped onto the surface family, and a
 * light surface family inverts the ramp, so `text-zinc-100` — the dark-theme
 * way of writing "bright label" — resolves to near-black.
 *
 * In the light theme the app actually ships, that put near-black button
 * labels on a near-black sheet. Carli, 14 September 2026, with a photograph
 * of it: *"Kyk hoe dof is die buttons in die lyrics opsie."* Both buttons on
 * the no-words screen were there, boxed, green-washed and pressable, with
 * their words very nearly invisible.
 *
 * It is the same fault as the sung line (#76), one layer out. That one was
 * `text-white` on the scrim and was fixed where it stood; the buttons around
 * it were left in the palette, so the screen went on failing in exactly the
 * direction nobody looks — the low zinc numbers, which read as "bright" to
 * anyone writing dark-theme markup.
 *
 * The rule for anything sitting directly on the scrim, with no card of its
 * own between it and the sheet: light is a constant here, so write it as one.
 * A control that carries its own themed surface is a different case and keeps
 * the palette.
 */
const INK = 'text-[#ffffff]';
const INK_SOFT = 'text-[rgba(255,255,255,0.78)]';
const INK_DIM = 'text-[rgba(255,255,255,0.62)]';

const EARS_KEY = 'futurebox.sing.ears.v1';

export default function FollowWords({
  lines,
  audio,
  title,
  onClose,
  askWords,
  wordCost,
  songFile,
  openFilming = false,
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
  /**
   * Open with the camera already asked for.
   *
   * ── Why this is a prop and not a second screen ───────────────────────
   *
   * Carli: "elke liedjie [moet] ook die opsie en button het om 'n film
   * yourself to it". The screen she is describing is this one, and it has
   * been here since #6 — behind a button labelled **Lyrics** on every song
   * that has words, which is nearly all of them. A door named after one of
   * the two things behind it is a door nobody opens for the other.
   *
   * So the card has its own camera button now, and it comes straight here
   * with the camera on rather than making somebody find the toggle inside.
   *
   * If the browser refuses the permission — some ask only on a direct press,
   * and an effect a tick after the click can fall outside that — nothing is
   * lost: `problem` says what happened and the camera button inside is still
   * there to press. Failing back to the screen she asked for is a worse day
   * than she wanted, not a broken one.
   */
  openFilming?: boolean;
  askWords?: () => Promise<string | null>;
  /** What that costs, so the press is informed. */
  wordCost?: number;
  /**
   * The song itself, for mixing a clean copy onto the take.
   *
   * A function rather than a blob, because the file is read out of IndexedDB
   * and this screen opens the instant the button is pressed — waiting for a
   * read before the words appear would be a button that does nothing for a
   * second. Called once, when recording starts and the mode needs it.
   *
   * Absent when there is no file on this device. The take is then whatever
   * the microphone hears, which is what it always was.
   */
  songFile?: () => Promise<Blob | null>;
}): React.ReactElement {
  const { t } = useLang();

  /* The words screen, which somebody films themselves in front of. Back should
     put the camera away, not leave the room. */
  useBackLayer(true, onClose);
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
      /* Not while a take is running — see the X above. `recorder` is read
         rather than the `recording` state so this effect does not have to be
         torn down and rebuilt every time a take starts. */
      if (event.key !== 'Escape') return;
      if (recorder.current?.state === 'recording' || recorder.current?.state === 'paused') return;
      onClose();
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
  /**
   * A take held where it is, rather than ended.
   *
   * Carli, 13 September 2026: "Jy kan nie pause nie." There was Record and
   * Stop and nothing between them, so the only way to break off — a knock at
   * the door, a line gone wrong — was to end the take and start again.
   *
   * Three things have to stop together or the take comes back out of step:
   * the recorder, the song on the mix's own audio graph, and the shared
   * element the words are read from. `currentTime` is what moves the
   * teleprompter, so pausing the element freezes the words as well, which is
   * what a pause should look like.
   */
  const [paused, setPaused] = useState(false);
  const [take, setTake] = useState<Blob | null>(null);
  /** Wall-clock marks, so the take's length is measured and not guessed. */
  const began = useRef(0);
  const held = useRef(0);
  const heldAt = useRef(0);
  const ran = useRef(0);

  /** The take is in the channel. One press; the button becomes a receipt. */
  const [kept, setKept] = useState(false);
  const [keeping, setKeeping] = useState(false);

  /**
   * Keep the take where the channel and the live room can reach it.
   *
   * The file goes straight into the bucket and the row is written on the
   * server — see `lib/filmed.ts` for the platform wall that shapes it. What
   * belongs here is what somebody sees: one button, a spinner while it goes,
   * and a line saying where it went, because "kept" with no destination is
   * the kind of confirmation that makes people press twice.
   */
  const keep = useCallback(async () => {
    if (!take || keeping) return;
    setKeeping(true);
    setProblem(null);
    try {
      const done = await keepFilmed(take, title, Math.round(ran.current));
      if (!done.ok) {
        setProblem(
          done.why === 'signed_out'
            ? t('sing.keepSignedOut', 'Sign in first, so the take is saved to your account.')
            : t('sing.keepFailed', 'That take did not go up. Check the signal and try again.'),
        );
        return;
      }
      setKept(true);
    } finally {
      setKeeping(false);
    }
  }, [keeping, t, take, title]);
  const [problem, setProblem] = useState<string | null>(null);
  const mix = useRef<Mix | null>(null);

  /**
   * Whether she is wearing headphones — the one fact that decides what the
   * take can hold, and the one no browser will tell us.
   *
   * On headphones the song can be mixed onto the file clean, which is what
   * she asked for. Out loud it cannot: the microphone is open, so a clean
   * copy plus the same song coming off a speaker is the song twice, a few
   * milliseconds apart, which is an echo.
   *
   * Remembered, because it is a fact about her and not about this song, and
   * being asked it before every take would be furniture. `null` means not
   * asked yet, and until it is answered there is no Record button — this is
   * the one question worth standing in front of the button.
   */
  const [ears, setEars] = useState<'phones' | 'aloud' | null>(null);
  useEffect(() => {
    try {
      const was = window.localStorage.getItem(EARS_KEY);
      if (was === 'phones' || was === 'aloud') setEars(was);
    } catch {
      /* Storage blocked. She is asked again, which is the safe way to be wrong. */
    }
  }, []);
  const chooseEars = (which: 'phones' | 'aloud'): void => {
    setEars(which);
    try {
      window.localStorage.setItem(EARS_KEY, which);
    } catch {
      /* Not remembered. Still answered for this take. */
    }
  };

  const stopCamera = React.useCallback((): void => {
    recorder.current?.state === 'recording' && recorder.current.stop();
    stream.current?.getTracks().forEach((one) => one.stop());
    stream.current = null;
    mix.current?.stop();
    mix.current = null;
    if (audio) audio.muted = false;
    setFilming(false);
    setRecording(false);
  }, [audio]);

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
      /* ── Upright, because that is what the takes are for ──────────────

         Carli, 14 September 2026: "Die film myself terwyl mens 'n liedjie
         luister neem in wide screen in plaas van in 'n long screen vir
         tick tok. Meeste mense gaan opneem vir tiktok takes."

         The two numbers below already said 1080 by 1920, and `ideal` is a
         preference: a camera that cannot give exactly that is free to hand
         back its native landscape frame, and phone sensors are landscape.
         So the size was asked for and the SHAPE was not.

         `aspectRatio` asks for the shape on its own, which a camera can
         satisfy by cropping when it cannot satisfy the exact pixels. 0.5625
         is 9:16 written the way the constraint wants it — width over
         height — and writing it as the division keeps it readable. */
      const got = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          aspectRatio: { ideal: 9 / 16 },
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

  /* Opened straight into the camera, when the card asked for that.

     Once, on mount, and only where it was asked for — a dependency on
     `filming` here would re-ask the moment somebody put the camera away,
     which is a permission prompt fighting a person who just said no.

     `void`, not awaited: a failure is already reported by `startCamera` into
     `problem`, and there is nothing this effect could do with a rejection
     that the screen is not already doing. */
  const askedToFilm = useRef(false);
  useEffect(() => {
    if (!openFilming || askedToFilm.current) return;
    askedToFilm.current = true;
    void startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFilming]);

  const startRecording = async (): Promise<void> => {
    const camera = stream.current;
    if (!camera || typeof MediaRecorder === 'undefined') return;
    /* ── Ask for the codecs, not just the container ────────────────────

       Carli: "Die afgelaaide video kan nie die klank speel nie, dit sê
       audio codec not supported."

       This asked for `video/mp4` with no codecs named, and that is the
       whole fault. `isTypeSupported('video/mp4')` answers yes and then the
       browser picks what goes inside — and an MP4 containing **Opus**
       audio is a perfectly legal MP4 that Android's own player cannot
       play. It opens the file, finds the audio track, and says exactly
       what she read.

       Measured rather than assumed: in a Chromium here,
       `isTypeSupported('video/mp4')` is true while every specific mp4
       codec string is false — so the one thing the old list checked is
       the one thing that says nothing about what comes out.

       H.264 baseline with AAC-LC first, because that is the pair that
       plays on a phone's gallery, in a desktop player, and uploads to
       TikTok — which is what the whole feature is for. The bare
       container stays in the list, below the explicit ones, because on a
       browser that only answers the short form it is still better than
       WebM. WebM last, and when it is what we get, the screen says so. */
    const type = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find((one) => MediaRecorder.isTypeSupported(one));
    if (!type) {
      setProblem(t('sing.noRecord', 'This browser cannot record video.'));
      return;
    }
    /* Said before the take rather than discovered after it. A WebM plays in
       the browser that made it and is refused by most phone galleries and
       by TikTok, so somebody about to film three minutes deserves to know
       which they are getting. Not a refusal: a WebM take is still a take,
       and on a browser that offers nothing else it is this or nothing. */
    setProblem(
      type.startsWith('video/webm')
        ? t(
            'sing.webmOnly',
            'This browser can only record in a format some phone players and TikTok will not open. The take will work here; it may not open elsewhere.',
          )
        : null,
    );

    /* The song onto the file, when she has said she is on headphones.

       Out loud it is deliberately not mixed: the microphone is open and the
       speaker is playing, so a clean copy would be the song twice, a few
       milliseconds apart. Out loud the take is what the room sounds like,
       which is what it always was. */
    let built: Mix | null = null;
    if (ears === 'phones' && songFile) {
      const file = await songFile().catch(() => null);
      built = await mixFor(camera, file, audio?.currentTime ?? 0);
      /* One sound in the room, and it is the one being recorded. The shared
         element is muted rather than paused, so the words keep following it —
         `currentTime` is what they read, and a paused song stops the screen. */
      if (built.withSong && audio) audio.muted = true;
    }
    mix.current = built;

    chunks.current = [];
    const made = new MediaRecorder(built ? built.stream : camera, { mimeType: type });
    made.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    made.onstop = () => {
      /* Minus whatever was paused. A held take has a shorter recording than
         it has wall clock, and the number that matters is the one somebody
         will watch. */
      ran.current = Math.max(0, (performance.now() - began.current - held.current) / 1000);
      setTake(new Blob(chunks.current, { type }));
    };
    recorder.current = made;
    made.start();
    built?.start();
    setTake(null);
    setKept(false);
    /* When it started, so the length of the take is a measurement rather
       than a guess. The channel stores it and the room shows it, and a
       number nobody measured is a number somebody later trusts. */
    began.current = performance.now();
    held.current = 0;
    setRecording(true);
  };

  /* Give the song back to the room. Called from every path out of recording —
     the stop button, closing the screen, the camera being switched off — so a
     muted element cannot outlive the take that muted it and leave her with a
     song that plays silently ever after. */
  const endMix = React.useCallback((): void => {
    mix.current?.stop();
    mix.current = null;
    if (audio) audio.muted = false;
  }, [audio]);

  const stopRecording = (): void => {
    recorder.current?.stop();
    endMix();
    setRecording(false);
    setPaused(false);
  };

  /* Hold everything, or carry everything on. Both halves in one place so the
     three things that must move together cannot drift apart in a later edit. */
  const holdTake = (): void => {
    try { recorder.current?.pause(); } catch { /* already paused, or ended */ }
    mix.current?.hold();
    audio?.pause();
    heldAt.current = performance.now();
    setPaused(true);
  };
  const carryOnTake = (): void => {
    try { recorder.current?.resume(); } catch { /* not paused */ }
    mix.current?.carryOn();
    void audio?.play().catch(() => undefined);
    if (heldAt.current) held.current += performance.now() - heldAt.current;
    heldAt.current = 0;
    setPaused(false);
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
    /* `overscroll-contain`, and nothing panning at all while a take runs.
 
       Carli, 13 September 2026: "Jy kan na 'n volgende liedjie scroll terwyl
       jy film. Dit recording van jouself moet vas wees binne in een liedjie."
 
       The page behind is locked already, but the STUDIO's own scroll
       container is not the page — it is a div with `overflow-y-auto`, and a
       flick that runs past the end of anything scrollable in here chains
       outward into it. `overscroll-contain` stops the chaining; `touch-none`
       while recording stops the gesture existing at all, which is the part
       she actually asked for. Taps are unaffected: `touch-action` governs
       panning and zooming, not pressing. */
    <div
      className={`fixed inset-0 z-[100] bg-scrim flex flex-col overscroll-contain ${
        recording ? 'touch-none' : ''
      }`}
    >
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
      {/* A literal dark, not `bg-black/45`. `black` is remapped onto
          `--fb-void`, "the deepest surface", which in the light theme is
          222 220 216 — so the wash meant to sink the camera behind the words
          was painting a 45% PALE grey over it and lifting it instead. */}
      {filming && <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" />}

      {/* The close first, on the left.

          It was on the right, where the corner search now sits fixed above
          every screen — so the way out of the teleprompter was under a button
          that opens a search. Order swapped rather than the title moved,
          because the title should still have the width. */}
      <div className="relative flex items-start gap-4 p-5">
        <button
          type="button"
          /* Mid-take this stops the take instead of leaving. Two presses to
             get out, which is the right number when the first one would
             otherwise throw away what she is in the middle of filming — and
             it is the other half of "vas binne een liedjie": there is no
             single press that ends a take by leaving the song. */
          onClick={recording ? stopRecording : onClose}
          aria-label={recording ? t('sing.stop', 'Stop') : t('play.close', 'Close')}
          /* `hover:text-white` here would have hidden the way out under the
             pointer, for the same reason as the line above. */
          className="flex-shrink-0 opacity-75 hover:opacity-100"
          style={{ color: '#ffffff' }}
        >
          <X className="w-6 h-6" />
        </button>
        {/* On the scrim, and over the camera once it is on, so a literal
            rather than a palette grey: 2.49 measured, which is under the 4.5
            a person needs for small text. */}
        <p
          className="min-w-0 flex-1 truncate text-sm"
          style={{ color: 'rgba(255,255,255,0.72)' }}
        >
          {title}
        </p>
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
            <p className={`text-xl leading-snug ${INK_SOFT}`}>
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
                  className={`mx-auto flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-50 ${INK}`}
                >
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ear className="h-4 w-4" />}
                  {asking
                    ? t('play.listening', 'Listening to it…')
                    : t('play.writeWords', 'Listen to it and write the words out')}
                  {typeof wordCost === 'number' && !asking && (
                    <span className={INK_DIM}>· {wordCost}</span>
                  )}
                </button>
                {wordProblem && (
                  <p className="text-sm text-amber-300 leading-snug">{wordProblem}</p>
                )}
                <p className={`text-sm leading-snug ${INK_DIM}`}>
                  {t(
                    'play.writeWordsWhy',
                    'It is a transcriber built for speech, and singing over a band is the hardest thing you can give it. Expect a draft you tidy up, not a lyric sheet.',
                  )}
                </p>
              </>
            )}
          </div>
        ) : current < 0 ? (
          <p className={`text-2xl ${INK_DIM}`}>{t('play.waiting', 'Waiting for the first line…')}</p>
        ) : (
          window_.map((index) => {
            const line = lines[index];
            if (!line) return <span key={index} className="block h-8" />;
            const now = index === current;
            return (
              /* The line being sung is a literal white with a shadow, not
                 `text-white`.

                 Tailwind's `white` is remapped onto `--fb-ink`, which is
                 19 18 17 — near-black, because it is the ink colour for a
                 light page. Over `bg-scrim` (17 16 14) that measures a
                 contrast ratio of 1.02: the one line she is actually meant to
                 read was invisible, on the screen whose entire job is to show
                 it to her while she films herself.

                 It went unnoticed because it fails in the direction nobody
                 checks. The lines she is *not* singing use `text-zinc-700`,
                 and `zinc` is remapped onto the surface family, which is light
                 here — they measure 8.79 and look right. So the screen reads
                 as working: there are words on it, they move, and the only one
                 missing is the one in the middle.

                 `LiveChannel` carries this same note and the same fix. */
              <p
                key={`${index}-${line.start}`}
                className={`transition-all duration-300 leading-tight ${
                  now ? 'text-3xl sm:text-5xl font-black' : 'text-xl sm:text-2xl text-zinc-700'
                }`}
                style={
                  now
                    ? { color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.9)' }
                    : undefined
                }
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
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-700 hover:border-emerald-500 flex items-center gap-2 ${INK}`}
            >
              <Camera className="w-4 h-4" />
              {t('sing.film', 'Film yourself')}
            </button>
          ) : (
            <>
              {/* The one question worth standing in front of the button.

                  No browser will say whether headphones are in, and the
                  answer decides what the take can hold: on headphones the
                  song is mixed onto the file clean, which is what she asked
                  for; out loud it cannot be, because the microphone would
                  catch the same song off the speaker and put it on twice.

                  Asked once and remembered — it is a fact about her, not
                  about this song. */}
              {ears === null ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => chooseEars('phones')}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-onAccent hover:bg-emerald-400 flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4" />
                    {t('sing.onPhones', 'I have headphones in')}
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseEars('aloud')}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-700 hover:border-emerald-500 flex items-center gap-2 ${INK}`}
                  >
                    <Speaker className="w-4 h-4" />
                    {t('sing.onSpeaker', 'It is playing out loud')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => chooseEars(ears === 'phones' ? 'aloud' : 'phones')}
                  disabled={recording}
                  aria-label={t('sing.switchEars', 'Change how you are listening')}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-50 flex items-center gap-2 ${INK_SOFT}`}
                >
                  {ears === 'phones' ? <Headphones className="w-4 h-4" /> : <Speaker className="w-4 h-4" />}
                  {ears === 'phones' ? t('sing.phones', 'Headphones') : t('sing.aloudShort', 'Out loud')}
                </button>
              )}
              {/* Pause, between Record and Stop, and only while a take is
                  running. "Jy kan nie pause nie." */}
              {recording && (
                <button
                  type="button"
                  onClick={paused ? carryOnTake : holdTake}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-2 ${INK}`}
                >
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {paused ? t('sing.carryOn', 'Carry on') : t('sing.hold', 'Pause')}
                </button>
              )}
              <button
                type="button"
                disabled={ears === null}
                onClick={recording ? stopRecording : () => void startRecording()}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 ${
                  recording
                    ? 'bg-rose-500 text-onAccent'
                    : 'bg-emerald-500 text-onAccent hover:bg-emerald-400'
                }`}
              >
                {recording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" fill="currentColor" />}
                {recording ? t('sing.stop', 'Stop') : t('sing.record', 'Record')}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-zinc-700 hover:border-zinc-500 flex items-center gap-2 ${INK_SOFT}`}
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
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm bg-zinc-900 border border-emerald-600 text-emerald-300 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('sing.save', 'Save the take')}
            </button>
          )}
          {/* ── And into the channel ──────────────────────────────────────

              Carli, 14 September 2026: *"die video nie in die channel save
              nie, sodat dit later in die live channel gedeel kan word nie."*

              Download was the only thing offered, and a downloaded take is
              out of this app's knowledge: the room cannot post it, the
              channel cannot show it, and a second device has never heard of
              it. Both, not one instead of the other — a file you keep is not
              the same thing as a take your channel can post, and somebody
              filming for TikTok wants the first. */}
          {take && !kept && (
            <button
              type="button"
              onClick={() => void keep()}
              disabled={keeping}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm bg-emerald-500 text-onAccent font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {keeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              {keeping ? t('sing.keeping', 'Keeping it\u2026') : t('sing.keepIt', 'Keep it in my channel')}
            </button>
          )}
          {kept && (
            <span className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm bg-emerald-500/15 border border-emerald-600 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {t('sing.keptIt', 'In your channel. You can post it in Live.')}
            </span>
          )}
        </div>

        {problem && <p className="text-sm text-rose-400 text-center leading-snug">{problem}</p>}

        {/* What the take will actually hold, said before it is made rather
            than discovered when it is played back. */}
        {filming && !recording && !take && (
          <p className="text-sm text-amber-300/90 text-center leading-snug">
            {ears === null
              ? t(
                  'sing.whichEars',
                  'How are you listening? On headphones the song goes onto the take clean. Out loud it cannot, because the microphone would catch it off the speaker and put it on twice.',
                )
              : ears === 'phones'
                ? t(
                    'sing.phonesNote',
                    'The song goes onto the take clean, with your voice over it. Keep the headphones on \u2014 if it comes out of a speaker as well you will hear it twice.',
                  )
                : t(
                    'sing.aloud',
                    'The take is whatever the microphone hears, so play the song out loud. On headphones it would come back with only your voice on it.',
                  )}
          </p>
        )}

        <p className={`text-sm text-center leading-snug ${INK_DIM}`}>
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
