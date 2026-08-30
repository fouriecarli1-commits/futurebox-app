'use client';

/**
 * The booth — where somebody actually sings.
 *
 * What was here before was a record button with a slider, and the complaint was
 * fair: it is fine for proving the idea works and useless for singing a song.
 * A singer needs to see where they are, know when to come in, hear whether they
 * are on the note, and fix the one line that went wrong without starting again.
 *
 * It is called the booth because that is what the room is called, and because
 * "Studio" is already the timeline screen. Two things called Studio is how you
 * end up with neither meaning anything.
 *
 * Four things it does that the button did not:
 *
 *   · **Words in time.** The line being sung is large, the next one waits
 *     underneath, and a bar counts down to the moment it starts. The timings
 *     are the song's own composition plan, so they are known rather than felt.
 *   · **A waveform of both.** The backing above, your take below, on one clock.
 *   · **The note you are on.** Not sheet music — see `app/lib/pitch.ts` for why
 *     there is no score to engrave — but the answer to the question a singer
 *     actually has, which is whether this note is the right one.
 *   · **Punching in.** Drag across the part that went wrong and sing only that.
 *     The rest of the take is kept, and the join is crossfaded so it does not
 *     click.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Ear, Layers, Loader2, Mic, Pause, Play, Scissors, Sliders, Sparkles, Square, Users, Wand2, X } from 'lucide-react';
import { decode, knownLatency, mixdown } from '../lib/mixdown';
import { encodeWav } from '../lib/wav';
import { accessToken } from '../lib/cloud';
import { decodeAt, shapeOf, spliceTake } from '../lib/takes';
import { detectPitch, noteOf } from '../lib/pitch';
import { scaleOf, tuneBuffer, type Tuned } from '../lib/tune';
import { melodyOf, readable, type Note } from '../lib/melody';
import { failed, loadStems, separate, type Stems } from '../lib/stems';
import {
  failed as heardFailed,
  forgetHeard,
  linesFrom,
  loadHeard,
  transcribe,
  type Heard,
} from '../lib/transcript';
import { stretchBuffer } from '../lib/stretch';
import NoteBar, { type Trail } from './NoteBar';
import ProBooth from './ProBooth';
import { alignTo, fitInto, partsOf, timelineOf, wordsOf, type Part, type TimedLine } from '../lib/timeline';
import { vocalSpanOf } from '../lib/vocalspan';
import { phrasesOf } from '../lib/phrases';
import { useLang } from '../lib/i18n';
import type { Track } from '../lib/library';

type Phase = 'idle' | 'counting' | 'recording' | 'playing';

/** Bars of silence before the first note, so nobody starts cold. */
const COUNT_IN = 3;
/** How much of the song plays before a punch-in starts recording. */
const PRE_ROLL = 2;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function VocalBooth({
  track,
  music,
  startTake,
  onKeep,
  onSplit,
  onClose,
}: {
  track: Track;
  /** The backing to sing over. */
  music: Blob;
  /** `doubled` is true when the AI voice was left in the mix under yours. */
  onKeep: (mixed: Blob, doubled: boolean, take: Blob) => void | Promise<void>;
  /**
   * A take to start from, when a finished song is being opened up again.
   *
   * A mix that has been kept is a file, and a file cannot be re-tuned: the
   * voice and the backing are the same samples by then. So the take is kept
   * beside the mix, and opening the song for editing hands it back here — at
   * which point everything on this screen works exactly as it did the moment
   * before it was first kept.
   */
  startTake?: Blob | null;
  /** Told once the song has been split, so the track can remember it. */
  onSplit?: () => void;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(COUNT_IN);
  const [at, setAt] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [backing, setBacking] = useState<AudioBuffer | null>(null);
  const [recorded, setRecorded] = useState<AudioBuffer | null>(null);
  /** The tuned version of the take, and what tuning it found to do. */
  const [tuned, setTuned] = useState<{ buffer: AudioBuffer; report: Tuned } | null>(null);
  const [hearRaw, setHearRaw] = useState(false);
  const [strength, setStrength] = useState(0.4);
  const [inKey, setInKey] = useState(true);
  /** What is heard, drawn and kept: the tuned take unless it is being compared. */
  const take = hearRaw ? recorded : tuned?.buffer ?? recorded;
  const [offset, setOffset] = useState(0);
  const [level, setLevel] = useState(0);
  const [hot, setHot] = useState(false);
  const hotUntil = useRef(0);
  const [note, setNote] = useState<{ name: string; octave: number; cents: number } | null>(null);

  /** The part being re-recorded, in seconds. Null means the whole song. */
  const [region, setRegion] = useState<{ from: number; to: number } | null>(null);
  const dragRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const punchAtRef = useRef(0);
  const sungAtRef = useRef(1);
  const playCtxRef = useRef<AudioContext | null>(null);
  const takeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const duration = backing?.duration || track.seconds || 0;
  /** The song's own key, when it says one, so tuning can stay inside it. */
  const scale = useMemo(() => scaleOf(track.key ?? ''), [track.key]);
  /** Notes read off the backing, when it is a single line clear enough to read. */
  const [guide, setGuide] = useState<Note[]>([]);
  /** Whether the backing was even worth trying, so the screen can say why not. */
  const [guideRead, setGuideRead] = useState(false);
  /** The notes of the take, read back off it. */
  const [sung, setSung] = useState<Note[]>([]);
  /** The last couple of seconds of what the microphone heard. */
  const trailRef = useRef<Trail[]>([]);

  /**
   * The song split in two: the AI voice on its own, and everything else.
   *
   * With it, the voice becomes a guide you sing beside and then turn down, the
   * stave gets notes it can trust — one voice reads, a full mix does not — and
   * what you keep is your voice on the backing, with the AI singer gone.
   */
  const [stems, setStems] = useState<Stems | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  /** The AI voice's own buffer, for reading its melody. */
  const [guideBuffer, setGuideBuffer] = useState<AudioBuffer | null>(null);

  // ── the desk ──────────────────────────────────────────────────────────────
  const [deskOpen, setDeskOpen] = useState(false);
  /** The multitrack view, over this one. */
  const [proOpen, setProOpen] = useState(false);
  const [guideLevel, setGuideLevel] = useState(0.7);
  const [backingLevel, setBackingLevel] = useState(0.85);
  const [takeLevel, setTakeLevel] = useState(1);
  /** Playing speed, pitch held. Below one for a song that is too fast to sing. */
  const [speed, setSpeed] = useState(1);
  /** Hand alignment, in milliseconds, on top of the measured latency. */
  const [nudge, setNudge] = useState(0);
  /**
   * How much of the AI voice stays in the finished song, under yours.
   *
   * Off by default, because a double is a production choice and not a
   * correction, and because turning it up on a take that is not yet in time
   * makes things worse rather than better.
   */
  const [doubleLevel, setDoubleLevel] = useState(0);

  const guideRef = useRef<HTMLAudioElement | null>(null);
  const guideUrlRef = useRef<string | null>(null);

  /**
   * Where the AI voice actually sings, once it is on its own.
   *
   * This is what stops the words running ahead of the singing. The plan says a
   * verse starts at zero; the recording usually has a bar or two of music in
   * front of it, and every word after that is early by the same amount.
   */
  const phrases = useMemo(
    () => (guideBuffer ? phrasesOf(guideBuffer.getChannelData(0), guideBuffer.sampleRate) : []),
    [guideBuffer],
  );

  /**
   * Where the singing starts and stops in a song nobody has separated.
   *
   * Estimated off the mix, which is a far easier question than what the tune
   * is: a lead vocal sits in the middle of the picture and in a band the bass
   * and the cymbals mostly are not. It is still an estimate, so the desk
   * carries the number and a person can move it.
   */
  const span = useMemo(
    () => (backing && !phrases.length ? vocalSpanOf(backing) : null),
    [backing, phrases],
  );
  /**
   * The words the record actually sings, with a time on every one.
   *
   * The written lyric sheet is what was *asked for*; a music engine sings
   * something close to it and not the same as it. When these exist they win,
   * because they are the song rather than the request, and because they carry
   * their own timing and nothing has to be estimated at all.
   */
  const [heard, setHeard] = useState<Heard[] | null>(null);
  const [reading, setReading] = useState(false);
  /** Set when somebody wants the words they wrote back on screen. */
  const [preferWritten, setPreferWritten] = useState(false);

  /** Moved by hand. Null means whatever was measured or estimated. */
  const [introAt, setIntroAt] = useState<number | null>(null);
  /** True while the next click on the waveform means "the singing starts here". */
  const [pointing, setPointing] = useState(false);
  /**
   * How far the words have been moved by hand, in seconds.
   *
   * Separate from everything that decides *where* the words go, and separate
   * from the song, because it has to work in the middle of a take. The take is
   * recorded against the backing; the words are only a thing to read. Moving
   * what you are reading must not move what is being recorded, and until now
   * the hand was locked out during a take for fear of exactly that — which
   * left a singer watching the words run away with no way to catch them.
   */
  const [wordsShift, setWordsShift] = useState(0);
  /** Where the song and the shift were when the hand went down. */
  const holdRef = useRef<{ at: number; shift: number } | null>(null);
  const pulledRef = useRef(0);
  const singingFrom = introAt ?? span?.from ?? 0;

  const placed = useMemo<TimedLine[]>(() => {
    // Nothing to time and nothing to guess: every word came back with a start
    // and an end on it.
    if (heard && !preferWritten) return linesFrom(heard);
    const stored = (track.parts ?? []) as readonly Part[];
    // Falling back to the lyric sheet matters more than it looks. Only songs
    // made since the plan was stored carry one, so on everything made before
    // that — and on anything written straight into the words box — the booth
    // had no words to show at all, which is the whole point of the screen.
    const parts = stored.length ? stored : partsOf(track.lyrics ?? '');
    const even = parts.length && duration ? timelineOf(parts, duration) : [];
    if (phrases.length) return alignTo(even, phrases);
    // Laid into the part of the song somebody sings, rather than across the
    // whole file. The plan knows nothing about the bars of music in front of
    // the first word, and nearly every song has some.
    const to = span?.to ?? duration;
    if (!even.length || !(to > singingFrom)) return even;
    return fitInto(even, singingFrom, to);
  }, [duration, heard, phrases, preferWritten, singingFrom, span, track.lyrics, track.parts]);

  /** The same lines, moved by however much the hand has pulled them. */
  const lines = useMemo(
    () =>
      wordsShift
        ? placed.map((line) => ({ ...line, start: line.start + wordsShift, end: line.end + wordsShift }))
        : placed,
    [placed, wordsShift],
  );

  /** Every word with its own moment, for writing under the stave. */
  const words = useMemo(() => wordsOf(lines), [lines]);
  /** Where the first word lands, however that was arrived at. */
  const wordsFrom = lines.length ? lines[0].start : 0;

  /**
   * While the hand is down, the words stay where they are.
   *
   * The song keeps moving, so the shift has to grow by exactly as much as the
   * song does. That is the whole trick: holding still is a correction, and it
   * is applied at the speed the mistake is being made.
   */
  useEffect(() => {
    const held = holdRef.current;
    if (!held) return;
    setWordsShift(held.shift + (at - held.at) + pulledRef.current);
  }, [at]);

  const current = lines.findIndex((line) => at >= line.start && at < line.end);
  const next = current >= 0 ? lines[current + 1] : lines.find((line) => line.start > at);
  /** Seconds until the next line starts, for the run-up bar. */
  const untilNext = next ? next.start - at : Infinity;

  // ── setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => {
      setPhase('idle');
      const source = takeSourceRef.current;
      takeSourceRef.current = null;
      try {
        source?.stop();
      } catch {
        // Already finished.
      }
    });
    audioRef.current = element;
    // Once the song has been split, what plays and what gets mixed into is the
    // backing without the AI voice on it. The voice comes back separately, on
    // its own fader, and only into your ears.
    const played = stems?.music ?? music;
    urlRef.current = URL.createObjectURL(played);
    element.src = urlRef.current;
    void decode(played).then(setBacking);
    return () => {
      element.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      streamRef.current?.getTracks().forEach((one) => one.stop());
      void micCtxRef.current?.close();
      void playCtxRef.current?.close();
    };
  }, [music, stems]);

  /** The guide voice: a second player, so its level is yours to set. */
  useEffect(() => {
    if (!stems) {
      setGuideBuffer(null);
      return;
    }
    const element = new Audio();
    guideRef.current = element;
    guideUrlRef.current = URL.createObjectURL(stems.vocals);
    element.src = guideUrlRef.current;
    void decode(stems.vocals).then(setGuideBuffer);
    return () => {
      element.pause();
      guideRef.current = null;
      if (guideUrlRef.current) URL.revokeObjectURL(guideUrlRef.current);
    };
  }, [stems]);

  useEffect(() => {
    setHeard(loadHeard(track.id));
  }, [track.id]);

  useEffect(() => {
    if (!startTake || !backing) return;
    let dropped = false;
    void decodeAt(startTake, backing.sampleRate).then((buffer) => {
      if (!dropped && buffer) setRecorded(buffer);
    });
    return () => {
      dropped = true;
    };
  }, [backing, startTake]);

  /** Anything already split for this song is on the device. */
  useEffect(() => {
    let dropped = false;
    void loadStems(track.id).then((found) => {
      if (!dropped && found) setStems(found);
    });
    return () => {
      dropped = true;
    };
  }, [track.id]);

  // Level and speed are live: moving a fader while it plays has to be heard.
  useEffect(() => {
    const element = guideRef.current;
    if (element) element.volume = guideLevel;
  }, [guideLevel]);

  useEffect(() => {
    [audioRef.current, guideRef.current].forEach((element) => {
      if (!element) return;
      // Pitch held, or slowing a song down to sing it moves it out of key,
      // which would defeat the whole point of slowing it down.
      (element as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
      element.playbackRate = speed;
    });
  }, [speed, stems]);

  // The clock, and the microphone's live readings, on one frame loop.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'playing') return;
    const element = audioRef.current;
    if (!element) return;
    let frame = 0;
    const window_ = new Float32Array(2048);

    const step = () => {
      setAt(element.currentTime);
      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getFloatTimeDomainData(window_);
        let power = 0;
        let peak = 0;
        for (let i = 0; i < window_.length; i += 1) {
          const sample = window_[i];
          power += sample * sample;
          const size = sample < 0 ? -sample : sample;
          if (size > peak) peak = size;
        }
        const rms = Math.sqrt(power / window_.length);
        // The meter reads in decibels, because loudness is not linear: a healthy
        // vocal sits around -20 dB and would peg a plain linear bar. -50 dB is
        // the floor a quiet room sits at.
        const db = rms > 0 ? (20 * Math.log(rms)) / Math.LN10 : -100;
        setLevel(Math.max(0, Math.min(1, (db + 50) / 50)));
        // Red means the take is actually clipping, not merely loud, and it is
        // held for a moment because a clip lasts a few samples.
        if (peak > 0.97) hotUntil.current = performance.now() + 800;
        setHot(performance.now() < hotUntil.current);
        const reading = detectPitch(window_, micCtxRef.current?.sampleRate ?? 48_000);
        // Only when the reading is confident. A note that flickers is worse
        // than no note at all, because a singer will chase it.
        setNote(reading ? noteOf(reading.hz) : null);
        if (reading) {
          const trail = trailRef.current;
          trail.push({ at: element.currentTime, midi: 69 + 12 * Math.log2(reading.hz / 440) });
          // Only what is still on screen is worth keeping.
          while (trail.length && element.currentTime - trail[0].at > 4) trail.shift();
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      // Nothing is being measured any more, so nothing should still be shown.
      setLevel(0);
      setHot(false);
      setNote(null);
    };
  }, [phase]);

  /**
   * The backing read for a melody, once, when it arrives.
   *
   * Deferred rather than done inline: it is a second or two of arithmetic on a
   * full-length song, and it must not sit in front of the record button.
   */
  useEffect(() => {
    // The AI voice on its own where the song has been split, and the whole
    // song otherwise. That difference is the difference between a stave with
    // the tune on it and a stave with nothing on it: one voice can be read,
    // and a mix with a bass line under it reads as the bass.
    const source = guideBuffer ?? backing;
    if (!source) return;
    let dropped = false;
    const timer = window.setTimeout(() => {
      const notes = melodyOf(source.getChannelData(0), source.sampleRate);
      if (dropped) return;
      // Judged against the singing where the singing is known, and against the
      // whole file otherwise. An instrumental stretch is not a failure to read
      // the tune; it is a stretch with no tune in it.
      const sung_ = phrases.reduce((total, phrase) => total + (phrase.to - phrase.from), 0);
      setGuide(readable(notes, sung_ || source.duration) ? notes : []);
      setGuideRead(true);
    }, 60);
    return () => {
      dropped = true;
      window.clearTimeout(timer);
    };
  }, [backing, guideBuffer, phrases]);

  /** The same for the take, so you can see the notes you actually sang. */
  useEffect(() => {
    if (!take) {
      setSung([]);
      return;
    }
    let dropped = false;
    const timer = window.setTimeout(() => {
      const notes = melodyOf(take.getChannelData(0), take.sampleRate);
      if (!dropped) setSung(notes);
    }, 60);
    return () => {
      dropped = true;
      window.clearTimeout(timer);
    };
  }, [take]);

  // ── drawing ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !backing) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const columns = Math.max(80, Math.floor(width / 3));
    const lane = height / 2;

    const drawLane = (buffer: AudioBuffer, top: number, colour: string, played: string) => {
      const shape = shapeOf(buffer, columns);
      const step = width / columns;
      const head = duration > 0 ? (at / duration) * width : 0;
      for (let i = 0; i < columns; i += 1) {
        const x = i * step;
        const size = Math.max(1, shape[i] * (lane - 8));
        context.fillStyle = x <= head ? played : colour;
        context.fillRect(x, top + lane / 2 - size / 2, Math.max(1, step - 0.5), size);
      }
    };

    drawLane(backing, 0, 'rgb(63,63,70)', 'rgb(82,82,91)');
    if (take) drawLane(take, lane, 'rgba(16,185,129,0.45)', 'rgb(16,185,129)');

    // Where each section begins, so the shape can be read as a song.
    context.strokeStyle = 'rgba(255,255,255,0.25)';
    lines.filter((line) => line.opensSection).forEach((line) => {
      const x = duration > 0 ? (line.start / duration) * width : 0;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    });

    // The part about to be re-recorded.
    if (region && duration > 0) {
      const from = (region.from / duration) * width;
      const to = (region.to / duration) * width;
      context.fillStyle = 'rgba(245,158,11,0.18)';
      context.fillRect(from, 0, Math.max(2, to - from), height);
      context.strokeStyle = 'rgb(245,158,11)';
      context.strokeRect(from, 0, Math.max(2, to - from), height);
    }

    // Where the words are set to start, so the guess can be seen against the
    // wave rather than only read as a number.
    if (duration > 0 && wordsFrom > 0.05) {
      const line = (wordsFrom / duration) * width;
      context.fillStyle = 'rgb(245,158,11)';
      context.fillRect(line - 1, 0, 2, height);
      context.beginPath();
      context.moveTo(line - 5, 0);
      context.lineTo(line + 5, 0);
      context.lineTo(line, 7);
      context.fill();
    }

    const head = duration > 0 ? (at / duration) * width : 0;
    context.fillStyle = '#fff';
    context.fillRect(head - 1, 0, 2, height);
  }, [at, backing, duration, lines, region, take, wordsFrom]);

  // ── recording ──────────────────────────────────────────────────────────────
  /**
   * The take, stopped.
   *
   * It plays through Web Audio rather than through the audio element the
   * backing uses, because it is a buffer rather than a file, so it has to be
   * started and stopped by hand.
   */
  const hush = useCallback(() => {
    guideRef.current?.pause();
    const source = takeSourceRef.current;
    takeSourceRef.current = null;
    if (!source) return;
    try {
      source.stop();
    } catch {
      // Already finished. Nothing to stop.
    }
  }, []);

  /** The guide voice, started at wherever the backing is. */
  const withGuide = useCallback((from: number) => {
    const element = guideRef.current;
    if (!element) return;
    element.volume = guideLevel;
    (element as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    element.playbackRate = speed;
    element.currentTime = Math.max(0, Math.min(from, element.duration || from));
    void element.play().catch(() => undefined);
  }, [guideLevel, speed]);

  const openMic = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;
    try {
      // All three off. They are tuned for a voice call and they wreck singing.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
      streamRef.current = stream;
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        ctx.createMediaStreamSource(stream).connect(analyser);
        micCtxRef.current = ctx;
        analyserRef.current = analyser;
      }
      return stream;
    } catch (error) {
      setProblem(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? t('take.denied', 'The microphone was not allowed. Turn it on for this site and try again.')
          : t('take.noMic', 'No microphone could be opened.'),
      );
      return null;
    }
  }, [t]);

  const start = useCallback(
    async (from: number) => {
      setProblem(null);
      hush();
      const stream = await openMic();
      const element = audioRef.current;
      if (!stream || !element) return;

      // The song is moved to where the take starts *before* the count, so the
      // words, the stave and the clock all show the place you are counting
      // into. Counting into a blank screen and then being shown the words on
      // the beat you were meant to sing them is too late to be any use.
      element.currentTime = Math.max(0, from);
      setAt(Math.max(0, from));
      setPhase('counting');
      for (let n = COUNT_IN; n > 0; n -= 1) {
        setCount(n);
        await new Promise((resolve) => setTimeout(resolve, 850));
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      // A second at a time. Started without an interval, a MediaRecorder hands
      // over the whole recording in one piece at the very end — so if that one
      // event does not arrive, there is no take at all. This way the audio is
      // already in hand before stop is ever pressed.
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;

      // Recorder first, then the music, and the gap between them measured — it
      // is silence at the front of the recording and most of the alignment.
      recorder.start(1000);
      const began = performance.now();
      await element.play();
      withGuide(element.currentTime);
      const music_ = performance.now();
      setOffset(-((music_ - began) / 1000 + knownLatency()));
      punchAtRef.current = Math.max(0, from);
      // The speed it was actually sung at, kept because the slider is allowed
      // to move afterwards and the take has to be pulled back by the speed it
      // was recorded at, not by whatever the slider says later.
      sungAtRef.current = speed;
      setPhase('recording');
    },
    [hush, openMic, speed, withGuide],
  );

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    audioRef.current?.pause();
    hush();
    if (!recorder || recorder.state !== 'recording') {
      setPhase('idle');
      return;
    }
    const gather = (): Blob => new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });

    /**
     * The recording, however it ends.
     *
     * `onstop` is the tidy way and it is not a promise anybody should stake a
     * screen on: a recorder whose track has gone, or which errors on the way
     * down, never fires it. Waiting on it alone is what left the booth stuck —
     * the take never arrived, so "busy" never cleared, so neither the keep
     * button nor the record button would do anything ever again. Three seconds
     * and then take what has already been handed over, which since the change
     * above is nearly all of it.
     */
    const finished = new Promise<Blob>((resolve) => {
      const done = (): void => resolve(gather());
      recorder.onstop = done;
      recorder.onerror = done;
      window.setTimeout(done, 3000);
    });

    try {
      recorder.stop();
    } catch {
      // Already down. Whatever it handed over is still in hand.
    }
    setPhase('idle');
    setBusy(true);

    // Everything from here can throw — decoding, stretching, splicing — and a
    // throw that leaves `busy` set is a booth nobody can use again without
    // reloading the page. So it clears in a finally, always.
    try {
      const raw = await finished;
      const rate = backing?.sampleRate ?? 48_000;
      const decoded = raw.size > 0 ? await decodeAt(raw, rate) : null;
      if (!decoded) {
        setProblem(t('take.unreadable', 'That recording could not be read back.'));
        return;
      }

      /**
       * A take sung against a slowed song is itself slow, so it is pulled back
       * to speed before anything else touches it. After this it is on the
       * song's clock like any other take, which is what keeps the rest of the
       * screen — splicing, tuning, the waveform, the mix — from having to know
       * about the speed control at all.
       */
      const wasAt = sungAtRef.current;
      const piece = wasAt !== 1 ? (stretchBuffer(decoded, wasAt) ?? decoded) : decoded;

      // Where this piece belongs on the song's clock: where recording started,
      // pushed by the measured latency — which was measured in real seconds,
      // and a real second is `wasAt` song seconds.
      const landsAt = Math.max(0, punchAtRef.current + offset * wasAt);
      // Spliced onto the untouched take, not onto a tuned one: tuning reads the
      // whole thing at once, so it is re-run over the result rather than left
      // half applied.
      const joined = spliceTake(punchAtRef.current > 0 ? recorded : null, piece, landsAt, duration);
      if (!joined) {
        setProblem(t('take.unreadable', 'That recording could not be read back.'));
        return;
      }
      setRecorded(joined);
      setTuned(null);
      setRegion(null);
    } catch {
      setProblem(t('take.unreadable', 'That recording could not be read back.'));
    } finally {
      setBusy(false);
    }
  }, [backing, duration, hush, offset, recorded, t]);

  const play = useCallback(() => {
    const element = audioRef.current;
    if (!element) return;
    if (phase === 'playing') {
      element.pause();
      hush();
      setPhase('idle');
      return;
    }

    // Listening back has to mean listening back to the voice as well. Playing
    // only the backing was the first version of this and it made the button a
    // lie: there is nothing to judge in a backing track you have already heard.
    hush();
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (take && Ctx) {
      const ctx = playCtxRef.current ?? new Ctx();
      playCtxRef.current = ctx;
      void ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = take;
      source.connect(ctx.destination);
      // The take sits on the song's clock, so it starts from wherever the
      // backing is rather than from its own beginning.
      source.start(0, Math.min(element.currentTime, take.duration));
      takeSourceRef.current = source;
    }
    void element.play();
    withGuide(element.currentTime);
    setPhase('playing');
  }, [hush, phase, take, withGuide]);

  /**
   * The take moved onto the note.
   *
   * A couple of seconds of arithmetic for a three-minute song, so the spinner
   * is given a frame to paint before it starts — otherwise the screen sits
   * still and the button looks broken.
   */
  const straighten = useCallback(() => {
    if (!recorded) return;
    setProblem(null);
    setBusy(true);
    window.setTimeout(() => {
      try {
        const chosen = inKey ? scale ?? undefined : undefined;
        const done = tuneBuffer(recorded, { strength, scale: chosen });
        if (!done) {
          setProblem(t('booth.tuneFailed', 'The take could not be tuned on this browser.'));
          return;
        }
        setTuned(done);
        setHearRaw(false);
      } catch {
        setProblem(t('booth.tuneFailed', 'The take could not be tuned on this browser.'));
      } finally {
        setBusy(false);
      }
    }, 30);
  }, [inKey, recorded, scale, strength, t]);

  const keep = useCallback(async () => {
    if (!backing || !take) return;
    setBusy(true);
    // In a finally, for the same reason as stopping: a throw in here used to
    // leave the booth unusable until the page was reloaded.
    try {
      const mixed = await mixdown({
        music: backing,
        take,
        offset: nudge / 1000,
        musicGain: backingLevel,
        takeGain: takeLevel,
        double: guideBuffer,
        doubleGain: guideBuffer ? doubleLevel : 0,
      });
      if (!mixed) {
        setProblem(t('take.mixFailed', 'The mix could not be made.'));
        return;
      }
      // The take goes with it, so this mix can be opened up and changed again.
      await onKeep(mixed, guideBuffer !== null && doubleLevel > 0, encodeWav(take));
    } catch {
      setProblem(t('take.mixFailed', 'The mix could not be made.'));
    } finally {
      setBusy(false);
    }
  }, [backing, backingLevel, doubleLevel, guideBuffer, nudge, onKeep, t, take, takeLevel]);

  /**
   * The take with the room taken off it.
   *
   * ElevenLabs' audio isolation, which the podcast screen has had all along
   * and the booth — the one place in the app where somebody actually records
   * — did not. It does not touch pitch or timing; it takes away the fan, the
   * traffic and the shape of the room, which is most of what makes a recording
   * made at a kitchen table sound like one.
   */
  const cleanUp = useCallback(async () => {
    if (!recorded) return;
    setProblem(null);
    setCleaning(true);
    try {
      const form = new FormData();
      form.append('audio', encodeWav(recorded), 'take.wav');
      const token = await accessToken();
      const response = await fetch('/api/voice/clean', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!response.ok) {
        const problem_ = (await response.json().catch(() => ({}))) as { message?: string };
        setProblem(problem_.message ?? `The recording could not be cleaned up (${response.status}).`);
        return;
      }
      const cleaned = await decodeAt(await response.blob(), recorded.sampleRate);
      if (!cleaned) {
        setProblem(t('take.unreadable', 'That recording could not be read back.'));
        return;
      }
      setRecorded(cleaned);
      setTuned(null);
    } catch {
      setProblem('Could not reach the app’s server. Check your connection and try again.');
    } finally {
      setCleaning(false);
    }
  }, [recorded, t]);

  /**
   * Split the song into the AI voice and the backing.
   *
   * It costs money upstream, so nothing does it on its own: a person asks for
   * it, having been told on the button what it is for.
   */
  const split = useCallback(async () => {
    setProblem(null);
    setSplitting(true);
    try {
      const result = await separate(track.id, music, duration || track.seconds || 0);
      if (failed(result)) {
        setProblem(result.message);
        return;
      }
      setStems(result);
      onSplit?.();
    } catch {
      setProblem('The voice could not be separated. Try again in a moment.');
    } finally {
      setSplitting(false);
    }
  }, [duration, music, onSplit, track.id, track.seconds]);

  /**
   * Read the words off the song.
   *
   * The separated voice where there is one — a transcriber given one voice is
   * doing a far easier job than one given a band as well.
   */
  const readWords = useCallback(async () => {
    setProblem(null);
    setReading(true);
    try {
      const result = await transcribe(track.id, stems?.vocals ?? music, duration || track.seconds || 0);
      if (heardFailed(result)) {
        setProblem(result.message);
        return;
      }
      setHeard(result);
      setPreferWritten(false);
      setWordsShift(0);
    } catch {
      setProblem('The words could not be read off the song. Try again in a moment.');
    } finally {
      setReading(false);
    }
  }, [duration, music, stems, track.id, track.seconds]);

  const seconds = (event: React.MouseEvent<HTMLCanvasElement>): number => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * duration;
  };

  const busyOrLive = phase === 'recording' || phase === 'counting';

  if (proOpen) {
    return (
      <ProBooth
        title={track.title}
        backing={backing}
        onKeep={(mixed) => onKeep(mixed, guideBuffer !== null && doubleLevel > 0, take ? encodeWav(take) : mixed)}
        onClose={() => setProOpen(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-base font-bold text-white truncate">{t('booth.title', 'The booth')}</p>
          <p className="text-sm text-zinc-500 truncate">{track.title}</p>
        </div>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── The words ─────────────────────────────────────────────────────── */}
      {/*
        Everything between the header and the buttons scrolls together.

        Before this, the words were the only flexible thing on the screen and
        every panel underneath them had a fixed height, so the words were the
        first thing squeezed and the last thing that should be: on a short
        window the line being sung was cut in half by the header. Now the whole
        middle gives way at once, the buttons stay where they are, and the
        words keep a floor they cannot be pushed below.
      */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Centred while it fits, and from the top once it does not. When the
            content is taller than the window this container is exactly as tall
            as its content, so there is no free space to centre and nothing
            gets pushed above the top edge. */}
        <div className="min-h-full flex flex-col justify-center">
        <div className="px-6 min-h-[7rem] flex flex-col items-center justify-center text-center gap-3 py-4">
        {/* The count belongs to the recording, not to the words: a song with
            no words on it still has to be counted in. */}
        {phase === 'counting' && (
          <span className="text-5xl font-black text-emerald-400 tabular-nums leading-none">{count}</span>
        )}

        {lines.length === 0 ? (
          <p className="text-base text-zinc-500 max-w-md leading-relaxed">
            {t('booth.noWords', 'This song has no words on it, so there is nothing to follow. Sing anyway — the waveform and the note still work.')}
          </p>
        ) : (
          <>
            {phase !== 'counting' && current > 0 && (
              <p className="text-base text-zinc-600 truncate max-w-3xl">{lines[current - 1].text}</p>
            )}
            <p
              className="font-black text-white leading-tight max-w-4xl"
              style={{ fontSize: 'clamp(1.35rem, 5.2vh, 3rem)' }}
            >
              {/* Always something to read: the line you are in, or the one you
                  are about to be in. "Ready" only when the song is over. */}
              {current >= 0 ? lines[current].text : next ? next.text : t('booth.ready', 'Ready')}
            </p>
            {current >= 0 && next && (
              <p className="text-lg text-zinc-500 max-w-3xl truncate">{next.text}</p>
            )}
            {/* The run-up. A bar that empties is easier to sing to than a number. */}
            {untilNext < 4 && (
              <div className="w-64 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-none"
                  style={{ width: `${Math.max(0, Math.min(100, (1 - untilNext / 4) * 100))}%` }}
                />
              </div>
            )}
          </>
        )}
        </div>

      {/* ── The note bar ────────────────────────────────────────────────────
          Where you are and whether you are on it. It sits with the waveform
          rather than under the words: the words are what a singer looks at,
          and crowding them off the top of the screen defeats them. What the
          bar can honestly show is written underneath it rather than left to
          be guessed from an empty bar. */}
      <div className="flex-shrink-0 px-5 pb-2 space-y-1.5">
        <NoteBar
          onHold={() => {
            holdRef.current = { at, shift: wordsShift };
            pulledRef.current = 0;
          }}
          onDrag={(pulled) => {
            pulledRef.current = pulled;
            const held = holdRef.current;
            if (held) setWordsShift(held.shift + (at - held.at) + pulled);
          }}
          onRelease={() => {
            holdRef.current = null;
            pulledRef.current = 0;
          }}
          at={at}
          guide={guide}
          sung={sung}
          trail={trailRef.current}
          words={words}
          scale={scale}
          bpm={track.bpm ?? 0}
          live={busyOrLive}
        />
        {/* The note being sung, beside the stave it is being sung on, with what
            the stave can honestly show next to it. */}
        <div className="flex items-center gap-4">
          {note ? (
            <>
              <span className="text-2xl font-black text-white tabular-nums flex-shrink-0">
                {note.name}
                <span className="text-zinc-500 text-base">{note.octave}</span>
              </span>
              <span className="w-28 h-2 rounded-full bg-zinc-800 relative overflow-hidden flex-shrink-0">
                {/* Middle is in tune. Left is flat, right is sharp. */}
                <span className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
                <span
                  className={`absolute inset-y-0 w-2 rounded-full ${
                    Math.abs(note.cents) < 15 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ left: `calc(${50 + Math.max(-50, Math.min(50, note.cents))}% - 4px)` }}
                />
              </span>
              <span className="text-sm text-zinc-500 tabular-nums w-12 flex-shrink-0">
                {note.cents > 0 ? '+' : ''}{note.cents}
              </span>
            </>
          ) : (
            /* Only claim to be listening while the microphone is actually
               open. Idle, the honest thing to say is what the row is for. */
            <span className="text-sm text-zinc-700 flex-shrink-0">
              {busyOrLive ? t('booth.listening', 'Listening…') : t('booth.noteHint', 'Your note shows here as you sing.')}
            </span>
          )}
          <p className="text-sm text-zinc-600 leading-snug flex-1 min-w-0">
            {phrases.length
              ? `${t('booth.wordsMeasured', 'The words are lined up with where the voice actually sings.')} `
              : span && introAt === null
                ? `${t('booth.wordsFitted', 'The words start where the singing seems to start. If that is out, set it under the wave.')} `
                : ''}
            {`${t('booth.holdStave', 'Hold the words on the stave to stop them, or drag them to where you actually sing them. It works while you record and it does not touch the take.')} `}
            {guide.length
              ? t('booth.barGuide', 'The notes are read off the singing. Your voice draws on the stave as you sing.')
              : guideRead
                ? t('booth.barNoGuide', 'No notes yet: the tune cannot be read out of a finished mix without getting it wrong. Separate the voice below and the notes appear.')
                : t('booth.barReading', 'Reading the backing…')}
          </p>
        </div>
      </div>

      {/* ── The waveform ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pb-4 space-y-2">
        <canvas
          ref={canvasRef}
          className={`w-full rounded-xl bg-zinc-900/60 ${pointing ? 'cursor-copy ring-2 ring-amber-400' : 'cursor-crosshair'}`}
          style={{ height: 'clamp(3.25rem, 9vh, 6rem)' }}
          onMouseDown={(event) => {
            // Pointing at the entry wins over selecting a part to re-sing:
            // the waveform is where the voice coming in is actually visible,
            // and that is the whole reason this mode exists.
            if (pointing) {
              setIntroAt(seconds(event));
              setPointing(false);
              return;
            }
            if (busyOrLive) return;
            dragRef.current = seconds(event);
          }}
          onMouseMove={(event) => {
            if (dragRef.current === null) return;
            const now = seconds(event);
            const from = Math.min(dragRef.current, now);
            const to = Math.max(dragRef.current, now);
            setRegion(to - from > 0.4 ? { from, to } : null);
          }}
          onMouseUp={(event) => {
            const startedAt = dragRef.current;
            dragRef.current = null;
            // A click rather than a drag is a seek, not a selection.
            if (startedAt !== null && Math.abs(seconds(event) - startedAt) <= 0.4) {
              setRegion(null);
              const element = audioRef.current;
              if (element) {
                element.currentTime = startedAt;
                setAt(startedAt);
              }
            }
          }}
        />
        <div className="flex items-center justify-between text-sm text-zinc-500 tabular-nums">
          <span>{clock(at)}</span>
          <span>
            {region
              ? `${t('booth.selected', 'Selected')} ${clock(region.from)} – ${clock(region.to)}`
              : pointing
                ? t('booth.pointNow', 'Click where the voice comes in')
                : t('booth.dragToPunch', 'Drag across a part to sing it again')}
          </span>
          <span>{clock(duration)}</span>
        </div>

        {/*
          Where the words start, and two ways to put it right.

          The estimate is an estimate, and on a real record it can be wrong in
          ways no amount of arithmetic here will fix — a song can open with an
          ad-lib or a hummed line, and no measurement can know that it is not
          the first word of the verse. What can be known for certain is where
          somebody points, so the number is on screen with the waveform it
          belongs to, and both ways of setting it take about a second.
        */}
        {lines.length > 0 && (!phrases.length || wordsShift !== 0) && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-zinc-500">
              {t('booth.wordsStart', 'Words start at')}{' '}
              <span className="text-amber-400 font-semibold tabular-nums">{clock(singingFrom)}</span>
              {introAt === null && span ? ` ${t('booth.aGuess', '(a guess)')}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setIntroAt(at)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-amber-300"
            >
              {t('booth.startHere', 'Start them here')}
            </button>
            <button
              type="button"
              onClick={() => setPointing((on) => !on)}
              className={`px-2.5 py-1 rounded-lg border ${
                pointing
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-amber-300'
              }`}
            >
              {pointing ? t('booth.pointCancel', 'Cancel') : t('booth.point', 'Point at it on the wave')}
            </button>
            {wordsShift !== 0 && (
              <span className="text-amber-400 tabular-nums">
                {t('booth.pulled', 'pulled')} {wordsShift > 0 ? '+' : ''}
                {wordsShift.toFixed(1)} s
              </span>
            )}
            {(introAt !== null || wordsShift !== 0) && (
              <button
                type="button"
                onClick={() => {
                  setIntroAt(null);
                  setWordsShift(0);
                }}
                className="px-2.5 py-1 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                {t('booth.startBack', 'Back to the guess')}
              </button>
            )}
          </div>
        )}

        {/* The microphone's level, so a dead mic is obvious before a take. */}
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${hot ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>

        {/* ── The words the record actually sings ─────────────────────────
            The lyric sheet is what was asked for. A music engine sings
            something close to it and not the same as it — a line repeated, a
            word swapped, a phrase bent to fit the melody — and no amount of
            moving the words about in time fixes a word that is not there. */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3 flex-wrap">
          <Ear className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-zinc-400 leading-snug flex-1 min-w-[240px]">
            {heard && !preferWritten
              ? t('booth.heardOn', 'These are the words the song actually sings, read off the recording, each one timed to where it lands.')
              : t('booth.heardWhy', 'Singing something the words do not quite match? The engine does not always sing what it was given. This reads the words off the recording itself, with the time of every one.')}
          </p>
          {heard ? (
            <div className="flex rounded-xl border border-zinc-700 overflow-hidden flex-shrink-0">
              {[
                { written: false, label: t('booth.asSung', 'As sung') },
                { written: true, label: t('booth.asWritten', 'As written') },
              ].map((choice) => (
                <button
                  key={String(choice.written)}
                  type="button"
                  onClick={() => setPreferWritten(choice.written)}
                  className={`px-3 py-1.5 text-sm font-semibold ${
                    preferWritten === choice.written ? 'bg-emerald-500 text-onAccent' : 'bg-zinc-950 text-zinc-400'
                  }`}
                >
                  {choice.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  forgetHeard(track.id);
                  setHeard(null);
                  setPreferWritten(false);
                }}
                className="px-3 py-1.5 text-sm bg-zinc-950 text-zinc-600 hover:text-zinc-300"
              >
                {t('booth.readAgain', 'Read again')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void readWords()}
              disabled={reading || busy || busyOrLive}
              className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ear className="w-4 h-4" />}
              {reading ? t('booth.reading', 'Listening to the song…') : t('booth.readWords', 'Read the words off the song')}
            </button>
          )}
        </div>

        {/* ── Singing with the singer ─────────────────────────────────────
            People sing better beside somebody already on the note. That is
            most of why a choir works, and it is why this is offered rather
            than left as a fader nobody finds. */}
        {!stems && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3 flex-wrap">
            <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-zinc-400 leading-snug flex-1 min-w-[240px]">
              {t('booth.splitWhy', 'Sing next to the AI voice: it is taken off the song, played in your ear at whatever level you want, and left out of what you keep. It also puts the tune on the stave, which a full mix cannot.')}
            </p>
            <button
              type="button"
              onClick={() => void split()}
              disabled={splitting || busy || busyOrLive}
              className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {splitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {splitting ? t('booth.splitting', 'Separating the voice…') : t('booth.split', 'Separate the voice')}
            </button>
          </div>
        )}

        {/* ── The voices ──────────────────────────────────────────────────
            Two voices can end up in this song, and each is somebody's to set:
            yours, which can be tuned and cleaned, and the AI's, which can stay
            in at any level or be left out. They were scattered across three
            places — a fader in the desk, a panel here, and one feature only
            the podcast screen had. One panel, one voice to a row. */}
        {recorded && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {t('booth.voices', 'The voices in this song')}
            </p>

            <div className="flex items-center gap-3 flex-wrap border-t border-zinc-800 pt-2.5">
              <span className="text-sm font-semibold text-zinc-200 w-28 flex-shrink-0">
                {t('booth.yourVoice', 'Your voice')}
              </span>
              <button
                type="button"
                onClick={() => void cleanUp()}
                disabled={cleaning || busy || busyOrLive}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {cleaning ? t('booth.cleaning', 'Cleaning it up…') : t('booth.clean', 'Take the room off it')}
              </button>
              <span className="text-sm text-zinc-600 leading-snug flex-1 min-w-[200px]">
                {t('booth.cleanNote', 'Takes away the fan, the traffic and the shape of the room. It does not touch pitch or timing.')}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-zinc-200 w-28 flex-shrink-0">
                {t('booth.aiVoice', 'The AI voice')}
              </span>
              {stems ? (
                <>
                  <label className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <span className="text-sm text-zinc-500">{t('booth.off', 'Off')}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={2}
                      value={Math.round(doubleLevel * 100)}
                      onChange={(event) => setDoubleLevel(Number(event.target.value) / 100)}
                      className="flex-1 accent-emerald-500"
                      aria-label={t('booth.aiVoice', 'The AI voice')}
                    />
                    <span className="text-sm text-zinc-400 tabular-nums w-10">
                      {doubleLevel > 0 ? `${Math.round(doubleLevel * 100)}%` : t('booth.off', 'Off')}
                    </span>
                  </label>
                  <span className="text-sm text-zinc-600 leading-snug w-full">
                    {t('booth.aiVoiceNote', 'Keep it in the song at whatever level you want, or leave it out. Under your own it steadies a lead that is not quite carrying — but only once your take is in time and on the note. When any of it is kept, the song credits say so.')}
                  </span>
                </>
              ) : (
                <span className="text-sm text-zinc-600 leading-snug flex-1 min-w-[200px]">
                  {t('booth.aiVoiceLocked', 'Separate the voice above and you can keep it in the song at any level, or leave it out.')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap border-t border-zinc-800 pt-2.5">
              <span className="text-sm font-semibold text-zinc-200 w-28 flex-shrink-0">
                {t('booth.tune', 'Tuning')}
              </span>
              <label className="flex items-center gap-2 flex-1 min-w-[220px]">
                <span className="text-sm text-zinc-500">{t('booth.gentle', 'Gentle')}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(strength * 100)}
                  onChange={(event) => {
                    setStrength(Number(event.target.value) / 100);
                    // What you hear must match where the slider is, so the old
                    // result goes rather than sitting there being wrong.
                    setTuned(null);
                  }}
                  className="flex-1 accent-emerald-500"
                  aria-label={t('booth.tune', 'Tuning')}
                />
                <span className="text-sm text-zinc-500">{t('booth.strong', 'Strong')}</span>
              </label>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {scale && (
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={inKey}
                    onChange={(event) => {
                      setInKey(event.target.checked);
                      setTuned(null);
                    }}
                    className="accent-emerald-500"
                  />
                  {t('booth.stayInKey', 'Stay in')} {track.key}
                </label>
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={straighten}
                disabled={busy || busyOrLive || strength === 0}
                className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {tuned ? t('booth.tuneAgain', 'Tune again') : t('booth.tuneIt', 'Tune the take')}
              </button>
            </div>

            {tuned && (
              <div className="flex items-center gap-3 flex-wrap border-t border-zinc-800 pt-2.5">
                <p className="text-sm text-zinc-400 leading-snug flex-1 min-w-[240px]">
                  {t('booth.tuneReport', 'Of the {seconds} seconds you sang, {inTune}% was already inside ten cents. Across all of it you were {off} cents off on average, and {moved} cents of that was taken out.')
                    .replace('{seconds}', Math.round(tuned.report.voicedSeconds).toString())
                    .replace('{inTune}', Math.round(tuned.report.alreadyInTune * 100).toString())
                    .replace('{off}', Math.round(tuned.report.averageCents).toString())
                    .replace('{moved}', Math.round(tuned.report.movedCents).toString())}
                </p>
                <div className="flex rounded-xl border border-zinc-700 overflow-hidden flex-shrink-0">
                  {[
                    { raw: true, label: t('booth.hearRaw', 'As sung') },
                    { raw: false, label: t('booth.hearTuned', 'Tuned') },
                  ].map((choice) => (
                    <button
                      key={String(choice.raw)}
                      type="button"
                      onClick={() => {
                        setHearRaw(choice.raw);
                        hush();
                        if (phase === 'playing') setPhase('idle');
                      }}
                      className={`px-3 py-1.5 text-sm font-semibold ${
                        hearRaw === choice.raw ? 'bg-emerald-500 text-onAccent' : 'bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
      </div>
      </div>
      </div>

        {/* ── The desk ──────────────────────────────────────────────────────
          For somebody who records for a living and wants the levels in their
          own hands. Every fader here does something real: three of them are
          in the mix that gets kept, one changes what you hear while you sing,
          and one changes the speed you sing at. Nothing here is decoration. */}
      {deskOpen && (
        <div className="absolute right-5 bottom-24 w-[23rem] max-w-[calc(100vw-2.5rem)] max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              {t('booth.desk', 'Desk')}
            </p>
            <button type="button" onClick={() => setDeskOpen(false)} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {stems && (
            <Fader
              label={t('booth.guideLevel', 'AI voice in your ear')}
              hint={t('booth.guideHint', 'Only in your headphones. It is never in the song you keep.')}
              value={guideLevel}
              onChange={setGuideLevel}
              format={(value) => `${Math.round(value * 100)}%`}
            />
          )}

          <Fader
            label={t('booth.speed', 'Speed')}
            hint={t('booth.speedHint', 'The song plays slower without changing key, and your take is pulled back to full speed afterwards. Below about three-quarters that pulling starts to smear the words.')}
            value={speed}
            min={0.5}
            max={1}
            step={0.05}
            onChange={setSpeed}
            format={(value) => `${value.toFixed(2)}×`}
          />

          <Fader
            label={t('booth.backingLevel', 'Backing in the mix')}
            value={backingLevel}
            onChange={setBackingLevel}
            format={(value) => `${Math.round(value * 100)}%`}
          />

          <Fader
            label={t('booth.takeLevel', 'Your voice in the mix')}
            value={takeLevel}
            onChange={setTakeLevel}
            format={(value) => `${Math.round(value * 100)}%`}
          />

          <Fader
            label={t('booth.nudge', 'Timing')}
            hint={t('booth.nudgeHint', 'On top of the round trip the browser already measured. Minus pulls your voice earlier.')}
            value={nudge}
            min={-250}
            max={250}
            step={5}
            onChange={setNudge}
            format={(value) => `${value > 0 ? '+' : ''}${Math.round(value)} ms`}
          />
        </div>
      )}

      {/* The buttons stay put. Scrolling to find "stop" is not a thing anybody
          should have to do with a microphone open. */}
      <div className="flex-shrink-0 px-5 pt-2 pb-3 border-t border-zinc-800 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {busyOrLive ? (
            <button
              type="button"
              onClick={() => void stop()}
              className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              {t('take.stop', 'Stop')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void start(region ? Math.max(0, region.from - PRE_ROLL) : 0)}
              disabled={busy || !backing}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {region ? <Scissors className="w-4 h-4" /> : <Circle className="w-4 h-4 fill-current" />}
              {region ? t('booth.punch', 'Sing just this part') : t('booth.record', 'Record from the top')}
            </button>
          )}

          <button
            type="button"
            onClick={play}
            disabled={busyOrLive || !backing}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {phase === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {/* Before there is a take this button is a rehearsal: the song
                plays and the words move with it. Calling that "listen back"
                describes something else. */}
            {take ? t('booth.listen', 'Listen back') : t('booth.playAlong', 'Play it and follow the words')}
          </button>

          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            {t('booth.pro', 'Pro')}
          </button>

          <button
            type="button"
            onClick={() => setDeskOpen((open) => !open)}
            className={`px-3.5 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 ${
              deskOpen ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            {t('booth.desk', 'Desk')}
          </button>

          <span className="flex-1" />

          <button
            type="button"
            onClick={() => void keep()}
            disabled={!take || busy}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('take.keep', 'Keep this take')}
          </button>
        </div>

        <p className="text-sm text-zinc-600 leading-snug flex items-start gap-1.5">
          <Mic className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {t('booth.headphones', 'Headphones, or the microphone picks up the backing as well. The note shown is what you are singing — the words and the backing say what it should be.')}
        </p>
      </div>
    </div>
  );
}

/**
 * One fader on the desk.
 *
 * Its number is always on screen. A fader whose value you cannot read is a
 * guess, and somebody setting a vocal level against a backing is not guessing.
 */
function Fader({
  label,
  hint,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}): React.ReactElement {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-200">{label}</span>
        <span className="text-sm text-zinc-400 tabular-nums">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-500"
      />
      {hint && <span className="block text-sm text-zinc-600 leading-snug">{hint}</span>}
    </label>
  );
}
