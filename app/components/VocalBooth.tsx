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
import { Check, Circle, Loader2, Mic, Pause, Play, Scissors, Sliders, Sparkles, Square, Users, X } from 'lucide-react';
import { decode, knownLatency, mixdown } from '../lib/mixdown';
import { decodeAt, shapeOf, spliceTake } from '../lib/takes';
import { detectPitch, noteOf } from '../lib/pitch';
import { scaleOf, tuneBuffer, type Tuned } from '../lib/tune';
import { melodyOf, readable, type Note } from '../lib/melody';
import { failed, loadStems, separate, type Stems } from '../lib/stems';
import { stretchBuffer } from '../lib/stretch';
import NoteBar, { type Trail } from './NoteBar';
import { partsOf, timelineOf, wordsOf, type Part, type TimedLine } from '../lib/timeline';
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
  onKeep,
  onSplit,
  onClose,
}: {
  track: Track;
  /** The backing to sing over. */
  music: Blob;
  onKeep: (mixed: Blob) => void | Promise<void>;
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
  /** The AI voice's own buffer, for reading its melody. */
  const [guideBuffer, setGuideBuffer] = useState<AudioBuffer | null>(null);

  // ── the desk ──────────────────────────────────────────────────────────────
  const [deskOpen, setDeskOpen] = useState(false);
  const [guideLevel, setGuideLevel] = useState(0.7);
  const [backingLevel, setBackingLevel] = useState(0.85);
  const [takeLevel, setTakeLevel] = useState(1);
  /** Playing speed, pitch held. Below one for a song that is too fast to sing. */
  const [speed, setSpeed] = useState(1);
  /** Hand alignment, in milliseconds, on top of the measured latency. */
  const [nudge, setNudge] = useState(0);

  const guideRef = useRef<HTMLAudioElement | null>(null);
  const guideUrlRef = useRef<string | null>(null);

  const lines = useMemo<TimedLine[]>(() => {
    const stored = (track.parts ?? []) as readonly Part[];
    // Falling back to the lyric sheet matters more than it looks. Only songs
    // made since the plan was stored carry one, so on everything made before
    // that — and on anything written straight into the words box — the booth
    // had no words to show at all, which is the whole point of the screen.
    const parts = stored.length ? stored : partsOf(track.lyrics ?? '');
    return parts.length && duration ? timelineOf(parts, duration) : [];
  }, [duration, track.lyrics, track.parts]);

  /** Every word with its own moment, for writing under the stave. */
  const words = useMemo(() => wordsOf(lines), [lines]);

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
      setGuide(readable(notes, source.duration) ? notes : []);
      setGuideRead(true);
    }, 60);
    return () => {
      dropped = true;
      window.clearTimeout(timer);
    };
  }, [backing, guideBuffer]);

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

    const head = duration > 0 ? (at / duration) * width : 0;
    context.fillStyle = '#fff';
    context.fillRect(head - 1, 0, 2, height);
  }, [at, backing, duration, lines, region, take]);

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
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;

      // Recorder first, then the music, and the gap between them measured — it
      // is silence at the front of the recording and most of the alignment.
      recorder.start();
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
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
    });
    recorder.stop();
    setPhase('idle');
    setBusy(true);

    const raw = await finished;
    const rate = backing?.sampleRate ?? 48_000;
    const decoded = await decodeAt(raw, rate);
    if (!decoded) {
      setBusy(false);
      setProblem(t('take.unreadable', 'That recording could not be read back.'));
      return;
    }

    /**
     * A take sung against a slowed song is itself slow, so it is pulled back
     * to speed before anything else touches it. After this it is on the song's
     * clock like any other take, which is what keeps the rest of the screen —
     * splicing, tuning, the waveform, the mix — from having to know about the
     * speed control at all.
     */
    const wasAt = sungAtRef.current;
    const piece = wasAt !== 1 ? (stretchBuffer(decoded, wasAt) ?? decoded) : decoded;
    setBusy(false);

    // Where this piece belongs on the song's clock: where recording started,
    // pushed by the measured latency — which was measured in real seconds, and
    // a real second is `wasAt` song seconds.
    const landsAt = Math.max(0, punchAtRef.current + offset * wasAt);
    // Spliced onto the untouched take, not onto a tuned one: tuning reads the
    // whole thing at once, so it is re-run over the result rather than left
    // half applied.
    setRecorded(spliceTake(punchAtRef.current > 0 ? recorded : null, piece, landsAt, duration));
    setTuned(null);
    setRegion(null);
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
      const chosen = inKey ? scale ?? undefined : undefined;
      const done = tuneBuffer(recorded, { strength, scale: chosen });
      setBusy(false);
      if (!done) {
        setProblem(t('booth.tuneFailed', 'The take could not be tuned on this browser.'));
        return;
      }
      setTuned(done);
      setHearRaw(false);
    }, 30);
  }, [inKey, recorded, scale, strength, t]);

  const keep = useCallback(async () => {
    if (!backing || !take) return;
    setBusy(true);
    const mixed = await mixdown({
      music: backing,
      take,
      offset: nudge / 1000,
      musicGain: backingLevel,
      takeGain: takeLevel,
    });
    setBusy(false);
    if (!mixed) {
      setProblem(t('take.mixFailed', 'The mix could not be made.'));
      return;
    }
    await onKeep(mixed);
  }, [backing, backingLevel, nudge, onKeep, t, take, takeLevel]);

  /**
   * Split the song into the AI voice and the backing.
   *
   * It costs money upstream, so nothing does it on its own: a person asks for
   * it, having been told on the button what it is for.
   */
  const split = useCallback(async () => {
    setProblem(null);
    setSplitting(true);
    const result = await separate(track.id, music, duration || track.seconds || 0);
    setSplitting(false);
    if (failed(result)) {
      setProblem(result.message);
      return;
    }
    setStems(result);
    onSplit?.();
  }, [duration, music, onSplit, track.id, track.seconds]);

  const seconds = (event: React.MouseEvent<HTMLCanvasElement>): number => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * duration;
  };

  const busyOrLive = phase === 'recording' || phase === 'counting';

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
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center px-6 text-center gap-3">
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
            <p className="text-3xl md:text-5xl font-black text-white leading-tight max-w-4xl">
              {/* Always something to read: the line you are in, or the one you
                  are about to be in. "Ready" only when the song is over. */}
              {current >= 0 ? lines[current].text : next ? next.text : t('booth.ready', 'Ready')}
            </p>
            {next && (
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
            {guide.length
              ? t('booth.barGuide', 'The notes are read off the singing and the words sit under them. Your voice draws on the stave as you sing.')
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
          className="w-full h-24 rounded-xl bg-zinc-900/60 cursor-crosshair"
          onMouseDown={(event) => {
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
              : t('booth.dragToPunch', 'Drag across a part to sing it again')}
          </span>
          <span>{clock(duration)}</span>
        </div>

        {/* The microphone's level, so a dead mic is obvious before a take. */}
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${hot ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.round(level * 100)}%` }}
          />
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

        {/* ── Tuning ──────────────────────────────────────────────────────
            Only once there is something to tune. Everything it did is said in
            numbers underneath, because "improved" is not a claim anybody can
            check and "pulled 22 cents" is. */}
        {recorded && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
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

        <div className="flex flex-wrap items-center gap-2 pt-1">
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
