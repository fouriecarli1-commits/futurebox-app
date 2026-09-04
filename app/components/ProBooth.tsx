'use client';

/**
 * The booth for people who do this for a living.
 *
 * The ordinary booth is built around one voice over one song, and that is the
 * right shape for somebody singing along to something they generated. It is
 * the wrong shape for a musician. They want lanes — a lead, a double, a
 * harmony, a guitar recorded on a phone, a sound they generated and dropped in
 * — each with a level, a place in time, a mute and a solo, and a mix at the end
 * that is theirs rather than the app's.
 *
 * What it deliberately is not: a digital audio workstation. There is no
 * automation, no plugin chain, no bus routing, and pretending otherwise by
 * drawing knobs that do nothing would be worse than leaving them out. What is
 * here is real — every fader, every mute, every offset is in the file that
 * comes out the other end, and `app/lib/session.ts` decides that once so the
 * mixer and the mixdown can never disagree about what you are listening to.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Gauge, Loader2, Mic2, Music2, Plus, Scissors, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import {
  FLAT_MASTER, audible, dbOf, mixSession, monoOf, readInto, readSession, span, wireLane,
  type Lane, type Master, type Reading,
} from '../lib/session';
import { failed, separate } from '../lib/stems';
import { accessToken } from '../lib/cloud';
import VoicePicker from './VoicePicker';
import type { VoiceState } from './VoiceLab';
import { CREDITS, perMinute } from '../lib/credits';
import { decodeAt, shapeOf } from '../lib/takes';
import { encodeWav } from '../lib/wav';
import { knownLatency } from '../lib/mixdown';
import {
  COUNT_INS, DEFAULT_METER, DIVISIONS, FASTEST, SLOWEST, barSeconds, countInSeconds,
  displayOf, sane, snapped, type CountIn, type DivisionId, type Meter, type Snap,
} from '../lib/tempo';
import { Metronome } from '../lib/metronome';
import { useLang } from '../lib/i18n';
import Cost from './Cost';

/** A lane is drawn this tall. Enough to read a waveform, small enough to stack. */
const LANE_H = 56;

/** What a root key may be. Carried, never computed with — see the note by the
 *  meter state below. */
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const SNAPS: readonly Snap[] = ['off', 'bar', 'beat', 'smart'];

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function ProBooth({
  title,
  backing,
  onKeep,
  onClose,
}: {
  title: string;
  /** The song, as the first lane. Everything else is placed against it. */
  backing: AudioBuffer | null;
  onKeep: (mixed: Blob) => void | Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [lanes, setLanes] = useState<Lane[]>([]);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /* ── The clock everything else is measured against ──────────────────────

     Tempo, time signature and key. The key is carried and shown but nothing
     here computes with it: no transposition, no chord detection, no key-aware
     anything. A control that implied otherwise would be a lie on the screen.
     It is here because a musician setting up a session writes it down, and
     because a lane brought in from elsewhere is easier to place when the
     session says what it is in. */
  const [meter, setMeter] = useState<Meter>(DEFAULT_METER);
  const [clicking, setClicking] = useState(false);
  const [division, setDivision] = useState<DivisionId>('1/1');
  const [clickDb, setClickDb] = useState(-6);
  const [countBars, setCountBars] = useState<CountIn>(0);
  const [snap, setSnap] = useState<Snap>('smart');
  const metronomeRef = useRef<Metronome | null>(null);

  /* ── Singing a lane in somebody else's voice ────────────────────────────
     The list is fetched once and only when the panel is opened: forty voices
     with their descriptions is a request nobody in this room has asked for
     until they open it. */
  const [voices, setVoices] = useState<VoiceState | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [changing, setChanging] = useState<Lane | null>(null);

  /* ── The master ─────────────────────────────────────────────────────────
     `trim` is the one number both the live path and the render apply, worked
     out from a measurement of the mix. `stale` is what keeps it honest: the
     moment a lane changes, the reading on screen is about a mix that no longer
     exists, and a number that is quietly out of date is worse than no number. */
  const [master, setMaster] = useState<Master>(FLAT_MASTER);
  const [reading, setReading] = useState<Reading | null>(null);
  const [stale, setStale] = useState(false);
  const trim = reading && !stale ? reading.trim : 1;

  const ctxRef = useRef<AudioContext | null>(null);
  const playingRef = useRef<AudioBufferSourceNode[]>([]);
  const startedRef = useRef({ at: 0, from: 0 });
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordFromRef = useRef(0);
  /** How much count-in went onto the front of the take being recorded. */
  const leadRef = useRef(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rate = backing?.sampleRate ?? 48_000;
  const total = Math.max(span(lanes), 1);

  // The song is the first lane, and it arrives once.
  useEffect(() => {
    if (!backing) return;
    setLanes((was) =>
      was.some((lane) => lane.backing)
        ? was
        : [
            {
              id: 'backing',
              name: title,
              audio: backing,
              at: 0,
              gain: 0.85,
              muted: false,
              soloed: false,
              backing: true,
            },
            ...was,
          ],
    );
  }, [backing, title]);

  const context = useCallback((): AudioContext | null => {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    return ctxRef.current;
  }, []);

  const clicker = useCallback((): Metronome | null => {
    const ctx = context();
    if (!ctx) return null;
    if (!metronomeRef.current) metronomeRef.current = new Metronome(ctx);
    return metronomeRef.current;
  }, [context]);

  useEffect(() => {
    metronomeRef.current?.setVolume(clickDb);
  }, [clickDb]);

  const hush = useCallback(() => {
    playingRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    });
    playingRef.current = [];
    metronomeRef.current?.stop();
  }, []);

  const play = useCallback(
    /** `lead` is a count-in: everything starts that many seconds later. */
    (from: number, lead = 0) => {
      const ctx = context();
      if (!ctx) return;
      hush();
      void ctx.resume();
      const begins = ctx.currentTime + 0.06 + lead;

      /* The same bus the render builds, and the same one number on the end of
         it. The click is deliberately not on this bus: a metronome that got
         quieter when the master came down would be a metronome you stop being
         able to hear exactly when you need it. */
      const bus = ctx.createGain();
      bus.gain.value = master.gain * trim;
      bus.connect(ctx.destination);

      audible(lanes).forEach((lane) => {
        const source = wireLane(ctx, lane, bus);
        // A lane that starts before the moment being played from is joined
        // part-way through rather than from its beginning.
        const into = from - lane.at;
        if (into >= 0) {
          if (into < lane.audio.duration) source.start(begins, into);
        } else {
          source.start(begins - into);
        }
        playingRef.current.push(source);
      });
      startedRef.current = { at: begins, from };

      /* The click runs on the same clock as the lanes rather than on one of
         its own: it is handed the audio-clock time that session second zero
         corresponds to, so a take recorded against it lands where the grid
         says it should. Two clocks would be two answers. */
      if (clicking) {
        const beat = clicker();
        if (beat) {
          beat.setVolume(clickDb);
          if (lead > 0) beat.countIn(sane(meter), Math.round(lead / barSeconds(meter)), begins);
          beat.start(sane(meter), division, begins - from, from);
        }
      }

      setPlaying(true);
    },
    [clickDb, clicker, clicking, context, division, hush, lanes, master.gain, meter, trim],
  );

  const stopPlaying = useCallback(() => {
    hush();
    setPlaying(false);
  }, [hush]);

  // The clock, while anything is running.
  useEffect(() => {
    if (!playing && !recording) return;
    let frame = 0;
    const step = (): void => {
      const ctx = ctxRef.current;
      if (ctx) {
        const now = startedRef.current.from + (ctx.currentTime - startedRef.current.at);
        setAt(Math.max(0, Math.min(total, now)));
        if (now >= total && !recording) {
          stopPlaying();
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, recording, stopPlaying, total]);

  useEffect(
    () => () => {
      hush();
      metronomeRef.current?.close();
      streamRef.current?.getTracks().forEach((one) => one.stop());
      void ctxRef.current?.close();
    },
    [hush],
  );

  // ── recording into a lane of its own ──────────────────────────────────────
  const record = useCallback(async () => {
    setProblem(null);
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          // Off, for the same reason as the ordinary booth: all three are built
          // for speech and all three chew a held note.
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
        });
      }
    } catch {
      setProblem(t('pro.noMic', 'No microphone could be opened.'));
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    recordFromRef.current = at;
    /* The count-in is not trimmed off the front of the take. The recorder
       starts now and the music starts `lead` seconds later, so the first
       `lead` seconds of the file are the bars being counted — which means the
       take belongs at `at - lead` on the session clock and needs no cutting.
       Trimming would mean guessing where the cut goes; arithmetic does not
       guess. A negative start is trimmed by the mixer, and what it trims is
       silence. */
    const lead = countInSeconds(countBars, sane(meter));
    leadRef.current = lead;
    // A chunk a second, so a recording that ends badly is still a recording.
    recorder.start(1000);
    play(at, lead);
    setRecording(true);
  }, [at, countBars, meter, play, t]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    setRecording(false);
    stopPlaying();
    if (!recorder || recorder.state !== 'recording') return;

    const gather = (): Blob => new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    const finished = new Promise<Blob>((resolve) => {
      const done = (): void => resolve(gather());
      recorder.onstop = done;
      recorder.onerror = done;
      window.setTimeout(done, 3000);
    });
    try {
      recorder.stop();
    } catch {
      // Already down.
    }

    setBusy(true);
    try {
      const raw = await finished;
      const piece = raw.size > 0 ? await decodeAt(raw, rate) : null;
      if (!piece) {
        setProblem(t('pro.unreadable', 'That recording could not be read back.'));
        return;
      }
      setLanes((was) => [
        ...was,
        {
          id: `lane-${Date.now()}`,
          name: `${t('pro.take', 'Take')} ${was.filter((lane) => !lane.backing).length + 1}`,
          audio: piece,
          /* Where it was sung, less the round trip the browser measured, less
             the count-in that is sitting on the front of the file. Not
             clamped to zero: a take counted in from the top of the session
             genuinely begins before it, and clamping would push the whole
             performance late by the length of the count. */
          at: recordFromRef.current - leadRef.current - knownLatency(),
          gain: 1,
          muted: false,
          soloed: false,
        },
      ]);
    } catch {
      setProblem(t('pro.unreadable', 'That recording could not be read back.'));
    } finally {
      setBusy(false);
    }
  }, [rate, stopPlaying, t]);

  // ── bringing audio in from outside ────────────────────────────────────────
  const bringIn = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setProblem(null);
      setBusy(true);
      try {
        for (const file of Array.from(files)) {
          const audio = await readInto(file, rate);
          if (!audio) {
            setProblem(t('pro.badFile', 'That file could not be read as audio.'));
            continue;
          }
          setLanes((was) => [
            ...was,
            {
              id: `lane-${Date.now()}-${file.name}`,
              name: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
              audio,
              at,
              gain: 1,
              muted: false,
              soloed: false,
            },
          ]);
        }
      } finally {
        setBusy(false);
      }
    },
    [at, rate, t],
  );

  const change = (id: string, how: Partial<Lane>): void => (
    setStale(true),
    setLanes((was) =>
      was.map((lane) => {
        if (lane.id !== id) return lane;
        const next = { ...lane, ...how };
        /* The grid applies where a start time is being set, and nowhere else.
           Snapping a gain or a name would be absurd, and snapping on every
           change would move a lane somebody had placed by ear the moment they
           renamed it. */
        return how.at === undefined ? next : { ...next, at: snapped(next.at, sane(meter), snap) };
      }),
    )
  );

  const measure = useCallback(async () => {
    setBusy(true);
    try {
      const got = await readSession(lanes, rate, master);
      setReading(got);
      setStale(false);
    } finally {
      setBusy(false);
    }
  }, [lanes, master, rate]);

  /**
   * A lane split into the voice and everything else, as two new lanes.
   *
   * Both arrive at the lane's own start, so they sit exactly on top of what
   * they came from, and the original is muted rather than removed — a split
   * that threw the source away would be a paid operation somebody cannot undo.
   */
  const split = useCallback(
    async (lane: Lane) => {
      setProblem(null);
      setBusy(true);
      try {
        const ctx = context();
        if (!ctx) return;
        /* Mono and on its own. Sent as itself from its own first sample, not
           as its position in the session — a lane sitting at forty seconds
           would otherwise be forty seconds of silence billed by the minute. */
        const sent = encodeWav(monoOf(lane.audio, ctx));
        const got = await separate(`lane:${lane.id}`, sent, lane.audio.duration);
        if (failed(got)) {
          setProblem(got.message);
          return;
        }
        const [voice, music] = await Promise.all([
          readInto(got.vocals, rate),
          readInto(got.music, rate),
        ]);
        if (!voice || !music) {
          setProblem(t('pro.splitUnreadable', 'The separated parts came back in a form the browser could not read.'));
          return;
        }
        setStale(true);
        setLanes((was) => [
          ...was.map((one) => (one.id === lane.id ? { ...one, muted: true } : one)),
          {
            id: `${lane.id}-voice`,
            name: `${lane.name} · ${t('pro.voicePart', 'voice')}`,
            audio: voice,
            at: lane.at,
            gain: lane.gain,
            muted: false,
            soloed: false,
            pan: lane.pan,
          },
          {
            id: `${lane.id}-music`,
            name: `${lane.name} · ${t('pro.musicPart', 'everything else')}`,
            audio: music,
            at: lane.at,
            gain: lane.gain,
            muted: false,
            soloed: false,
            pan: lane.pan,
          },
        ]);
      } catch {
        setProblem(t('pro.splitFailed', 'That lane could not be separated.'));
      } finally {
        setBusy(false);
      }
    },
    [context, rate, t],
  );

  useEffect(() => {
    if (!changing || voices) return;
    void accessToken().then((token) =>
      fetch('/api/voice', { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        .then((r) => (r.ok ? r.json() : null))
        .then((said) => setVoices(said as VoiceState))
        .catch(() => undefined),
    );
  }, [changing, voices]);

  /**
   * The same performance, sung by somebody else, as a lane of its own.
   *
   * A new lane rather than a replacement, and the original muted rather than
   * removed. Conversion is paid for and it is a matter of taste whether it is
   * better — overwriting the take would make a judgement call irreversible on
   * somebody's behalf, and the take might be the only copy of a performance
   * they cannot repeat.
   */
  const changeVoice = useCallback(
    async (lane: Lane) => {
      setProblem(null);
      setBusy(true);
      try {
        const ctx = context();
        if (!ctx) return;
        const form = new FormData();
        form.append('audio', encodeWav(monoOf(lane.audio, ctx)), 'lane.wav');
        if (voiceId) form.append('voiceId', voiceId);
        form.append('seconds', String(Math.round(lane.audio.duration)));

        const token = await accessToken();
        const response = await fetch('/api/voice/change', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!response.ok) {
          const said = (await response.json().catch(() => ({}))) as { message?: string };
          setProblem(said.message ?? t('pro.voiceFailed', 'That lane could not be sung in another voice.'));
          return;
        }
        const sung = await readInto(await response.blob(), rate);
        if (!sung) {
          setProblem(t('pro.voiceUnreadable', 'What came back could not be read as audio.'));
          return;
        }
        setStale(true);
        setChanging(null);
        setLanes((was) => [
          ...was.map((one) => (one.id === lane.id ? { ...one, muted: true } : one)),
          {
            id: `${lane.id}-voice-${Date.now()}`,
            name: `${lane.name} · ${t('pro.sungBy', 'another voice')}`,
            audio: sung,
            at: lane.at,
            gain: lane.gain,
            muted: false,
            soloed: false,
            pan: lane.pan,
          },
        ]);
      } catch {
        setProblem(t('pro.voiceFailed', 'That lane could not be sung in another voice.'));
      } finally {
        setBusy(false);
      }
    },
    [context, rate, t, voiceId],
  );

  const keep = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    try {
      /* The same master, and the same trim the mixer was listening through.
         A render that worked out its own number would be a file that is not
         the mix somebody approved. */
      const mixed = await mixSession(lanes, rate, master, trim);
      if (!mixed) {
        setProblem(t('pro.mixFailed', 'The mix could not be made.'));
        return;
      }
      await onKeep(encodeWav(mixed));
    } catch {
      setProblem(t('pro.mixFailed', 'The mix could not be made.'));
    } finally {
      setBusy(false);
    }
  }, [lanes, master, onKeep, rate, t, trim]);

  const heard = useMemo(() => audible(lanes), [lanes]);

  return (
    <div className="fixed inset-0 z-[70] bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-base font-bold text-white truncate">{t('pro.title', 'The booth — pro')}</p>
          <p className="text-sm text-zinc-500 truncate">
            {title} · {lanes.length} {lanes.length === 1 ? t('pro.lane', 'lane') : t('pro.lanes', 'lanes')} ·{' '}
            {clock(total)}
          </p>
          {/* Every lane, every take and the mix are made on the device. This is
              the room with the most controls and the fewest of them cost
              anything, which is exactly the room where somebody assumes they
              all do. */}
          <Cost credits={0} className="pt-0.5" />
        </div>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── The clock: tempo, time signature, key, click and grid ───────
          One strip rather than a panel behind a menu. Everything on it changes
          what the next take will sound like or land on, and a control that
          changes a recording is a control that has to be visible while the
          recording is being set up. */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-lg font-black text-white tabular-nums tracking-tight">
          {displayOf(at, sane(meter))}
        </span>

        <label className="flex items-center gap-1.5 text-sm text-zinc-400">
          <span className="sr-only">{t('pro.bpm', 'Tempo')}</span>
          <input
            type="number"
            min={SLOWEST}
            max={FASTEST}
            value={meter.bpm}
            onChange={(event) => setMeter((was) => sane({ ...was, bpm: Number(event.target.value) }))}
            className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 tabular-nums"
            aria-label={t('pro.bpm', 'Tempo')}
          />
          <span className="text-xs text-zinc-500">{t('pro.bpmUnit', 'bpm')}</span>
        </label>

        <span className="flex items-center gap-1 text-sm text-zinc-400">
          <select
            value={meter.beats}
            onChange={(event) => setMeter((was) => sane({ ...was, beats: Number(event.target.value) }))}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-1.5 py-1 text-sm text-zinc-100"
            aria-label={t('pro.beats', 'Beats in a bar')}
          >
            {[2, 3, 4, 5, 6, 7, 9, 12].map((one) => (
              <option key={one} value={one}>{one}</option>
            ))}
          </select>
          <span className="text-zinc-600">/</span>
          <select
            value={meter.unit}
            onChange={(event) => setMeter((was) => sane({ ...was, unit: Number(event.target.value) }))}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-1.5 py-1 text-sm text-zinc-100"
            aria-label={t('pro.unit', 'What counts as a beat')}
          >
            {[2, 4, 8, 16].map((one) => (
              <option key={one} value={one}>{one}</option>
            ))}
          </select>
        </span>

        <select
          value={meter.key}
          onChange={(event) => setMeter((was) => sane({ ...was, key: event.target.value }))}
          className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100"
          aria-label={t('pro.key', 'Key')}
        >
          {KEYS.map((one) => (
            <option key={one} value={one}>{one}</option>
          ))}
        </select>

        {/* ── The click ─────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setClicking((was) => !was)}
          aria-pressed={clicking}
          className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-sm font-semibold flex items-center gap-1.5 ${
            clicking
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
              : 'bg-zinc-950 border-zinc-700 text-zinc-500'
          }`}
        >
          <Music2 className="w-4 h-4" />
          {t('pro.click', 'Click')}
        </button>

        {clicking && (
          <>
            <select
              value={division}
              onChange={(event) => setDivision(event.target.value as DivisionId)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100"
              aria-label={t('pro.division', 'How often it clicks')}
            >
              {DIVISIONS.map((one) => (
                <option key={one.id} value={one.id}>{one.id}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">{t('pro.clickLevel', 'Click level')}</span>
              <input
                type="range"
                min={-40}
                max={0}
                value={clickDb}
                onChange={(event) => setClickDb(Number(event.target.value))}
                className="w-20 accent-emerald-500"
                aria-label={t('pro.clickLevel', 'Click level')}
              />
              <span className="text-xs text-zinc-500 tabular-nums w-12 text-right">
                {clickDb <= -40 ? t('pro.off', 'off') : `${clickDb} dB`}
              </span>
            </label>
          </>
        )}

        {/* ── Counting in ───────────────────────────────────────────── */}
        <label className="flex items-center gap-1.5 text-sm text-zinc-400">
          <span className="text-xs text-zinc-500">{t('pro.countIn', 'Count in')}</span>
          <select
            value={countBars}
            onChange={(event) => setCountBars(Number(event.target.value) as CountIn)}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100"
            aria-label={t('pro.countIn', 'Count in')}
          >
            {COUNT_INS.map((one) => (
              <option key={one} value={one}>
                {one === 0
                  ? t('pro.off', 'off')
                  : `${one} ${one === 1 ? t('pro.bar', 'bar') : t('pro.bars', 'bars')}`}
              </option>
            ))}
          </select>
        </label>

        {/* ── The grid ──────────────────────────────────────────────── */}
        <label className="flex items-center gap-1.5 text-sm text-zinc-400">
          <span className="text-xs text-zinc-500">{t('pro.snap', 'Snap')}</span>
          <select
            value={snap}
            onChange={(event) => setSnap(event.target.value as Snap)}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100"
            aria-label={t('pro.snap', 'Snap')}
          >
            {SNAPS.map((one) => (
              <option key={one} value={one}>{t(`pro.snap.${one}`, one)}</option>
            ))}
          </select>
        </label>

        {countBars > 0 && !clicking && (
          /* A count-in with the click switched off is four bars of silence and
             then a recording that has already started — which reads as the
             button not working. Said here rather than discovered. */
          <span className="text-xs text-amber-400 leading-snug">
            {t('pro.silentCount', 'The count-in has nothing to count with — switch the click on.')}
          </span>
        )}
      </div>

      {/* ── The lanes ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
        {lanes.map((lane) => (
          <LaneRow
            key={lane.id}
            lane={lane}
            lanes={lanes}
            total={total}
            at={at}
            onChange={(how) => change(lane.id, how)}
            onRemove={() => setLanes((was) => was.filter((one) => one.id !== lane.id))}
            onSplit={() => void split(lane)}
            onVoice={() => setChanging(lane)}
            busy={busy}
          />
        ))}

        {lanes.length <= 1 && (
          <p className="text-sm text-zinc-600 leading-snug px-1 pt-2">
            {t('pro.empty', 'Record a take or bring a file in, and it lands here as a lane of its own. Every lane keeps its own level, its own place in time and its own mute — and what you hear is what gets mixed.')}
          </p>
        )}
      </div>

      {problem && <p className="text-sm text-amber-400 leading-snug px-5 pb-2">{problem}</p>}

      {/* ── Picking a voice for a lane ──────────────────────────────────
          Over the room rather than beside it: choosing among forty voices is
          the only thing being done while it is open, and it is a paid one. */}
      {changing && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-bold text-white">
                  {t('pro.sing', 'Sing this in another voice')}
                </p>
                <p className="text-sm text-zinc-500 leading-snug truncate">{changing.name}</p>
              </div>
              <button type="button" onClick={() => setChanging(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* What it does and does not do, before the money is spent. It
                keeps the performance — the timing, the phrasing, the breaths —
                and changes whose voice is carrying it. Somebody expecting it
                to fix their singing needs to know that before they buy it. */}
            <p className="text-sm text-zinc-500 leading-relaxed">
              {t(
                'pro.singWhat',
                'It keeps the performance — the timing, the phrasing, the breaths — and changes whose voice is carrying it. It does not fix the singing, and it will keep a wrong note as faithfully as a right one.',
              )}
            </p>
            <Cost credits={perMinute(changing.audio.duration, CREDITS.voiceChange)} />

            {voices ? (
              <VoicePicker
                mine={voices.mine ?? []}
                stock={voices.stock ?? []}
                value={voiceId}
                onChange={setVoiceId}
              />
            ) : (
              <p className="text-sm text-zinc-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('pro.voicesLoading', 'Fetching the voices…')}
              </p>
            )}

            <button
              type="button"
              onClick={() => void changeVoice(changing)}
              disabled={busy || !voiceId}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('pro.singGo', 'Sing it')}
            </button>
          </div>
        </div>
      )}

      {/* ── Mix and master ──────────────────────────────────────────────
          Three controls and a reading. Not a chain of processors: what is here
          is one multiplication, worked out from a measurement of the actual
          mix and applied identically to what you hear and to what comes out.
          Drawing a compressor that only ran in one of those two places would
          make the file differ from the approval, invisibly. */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" />
          {t('pro.master', 'Master')}
        </span>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">{t('pro.masterLevel', 'Level')}</span>
          <input
            type="range"
            min={0}
            max={200}
            value={Math.round(master.gain * 100)}
            onChange={(event) => {
              setMaster((was) => ({ ...was, gain: Number(event.target.value) / 100 }));
              setStale(true);
            }}
            className="w-24 accent-emerald-500"
            aria-label={t('pro.masterLevel', 'Level')}
          />
          <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">
            {Math.round(master.gain * 100)}
          </span>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">{t('pro.ceiling', 'Ceiling')}</span>
          <select
            value={master.ceilingDb}
            onChange={(event) => {
              setMaster((was) => ({ ...was, ceilingDb: Number(event.target.value) }));
              setStale(true);
            }}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 tabular-nums"
            aria-label={t('pro.ceiling', 'Ceiling')}
          >
            {[-0.1, -0.3, -1, -2, -3].map((one) => (
              <option key={one} value={one}>{one} dB</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setMaster((was) => ({ ...was, matchLoudness: !was.matchLoudness }));
            setStale(true);
          }}
          aria-pressed={master.matchLoudness}
          className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-sm font-semibold ${
            master.matchLoudness
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
              : 'bg-zinc-950 border-zinc-700 text-zinc-500'
          }`}
        >
          {t('pro.matchLoudness', 'Match the loudness')}
        </button>

        <button
          type="button"
          onClick={() => void measure()}
          disabled={busy || recording || !heard.length}
          className="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-300 hover:text-white disabled:opacity-40"
        >
          {t('pro.measure', 'Measure the mix')}
        </button>

        {reading && (
          <span className={`text-xs tabular-nums ${stale ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {t('pro.peak', 'Peak')} {dbOf(reading.peak).toFixed(1)} dB ·{' '}
            {t('pro.average', 'Average')} {dbOf(reading.rms).toFixed(1)} dB ·{' '}
            {t('pro.trim', 'Master')} {dbOf(reading.trim) >= 0 ? '+' : ''}
            {dbOf(reading.trim).toFixed(1)} dB
          </span>
        )}

        {/* A reading about a mix that no longer exists is worse than none. */}
        {reading && stale && (
          <span className="text-xs text-amber-400">
            {t('pro.stale', 'Something changed — measure it again.')}
          </span>
        )}
        {!reading && (
          <span className="text-xs text-zinc-600 leading-snug">
            {t('pro.unmeasured', 'Until it is measured, the master does nothing at all — what you hear is the lanes as they are.')}
          </span>
        )}
      </div>

      {/* ── The transport ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-2 pb-3 border-t border-zinc-800 flex flex-wrap items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            {t('pro.stop', 'Stop')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void record()}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Circle className="w-4 h-4 fill-current" />
            {t('pro.record', 'Record a lane')}
          </button>
        )}

        <button
          type="button"
          onClick={() => (playing ? stopPlaying() : play(at))}
          disabled={busy || recording || !heard.length}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {playing ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {playing ? t('pro.stopPlaying', 'Stop') : t('pro.play', 'Play')}
        </button>

        <button
          type="button"
          onClick={() => {
            stopPlaying();
            setAt(0);
          }}
          disabled={recording}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold disabled:opacity-50"
        >
          {t('pro.toStart', 'Back to the start')}
        </button>

        <span className="text-sm text-zinc-500 tabular-nums px-1">
          {clock(at)} / {clock(total)}
        </span>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {t('pro.bringIn', 'Bring audio in')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void bringIn(event.target.files);
            event.target.value = '';
          }}
        />

        <span className="flex-1" />

        <button
          type="button"
          onClick={() => void keep()}
          disabled={busy || recording || !heard.length}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t('pro.keep', 'Mix it down')}
        </button>
      </div>
    </div>
  );
}

/** One lane: what it is, what it sounds like, and where it sits. */
function LaneRow({
  lane,
  lanes,
  total,
  at,
  onChange,
  onRemove,
  onSplit,
  onVoice,
  busy,
}: {
  lane: Lane;
  lanes: readonly Lane[];
  total: number;
  at: number;
  onChange: (how: Partial<Lane>) => void;
  onRemove: () => void;
  onSplit: () => void;
  onVoice: () => void;
  busy: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const quiet = audible(lanes).indexOf(lane) < 0;

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

    // Where this lane sits on the session's clock, not on its own.
    const left = (lane.at / total) * width;
    const wide = (lane.audio.duration / total) * width;
    const columns = Math.max(8, Math.floor(wide / 2));
    const shape = shapeOf(lane.audio, columns);
    context.fillStyle = quiet
      ? 'rgba(113,113,122,0.35)'
      : lane.backing
        ? 'rgba(148,163,184,0.55)'
        : 'rgba(16,185,129,0.75)';
    for (let i = 0; i < columns; i += 1) {
      const x = left + (i / columns) * wide;
      const size = Math.max(1, shape[i] * (height - 6));
      context.fillRect(x, height / 2 - size / 2, Math.max(1, wide / columns - 0.5), size);
    }

    const head = (at / total) * width;
    context.fillStyle = '#fff';
    context.fillRect(head - 1, 0, 2, height);
  }, [at, lane, quiet, total]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 flex items-center gap-3">
      <div className="w-40 flex-shrink-0 space-y-1">
        <input
          value={lane.name}
          onChange={(event) => onChange({ name: event.target.value.slice(0, 40) })}
          className="w-full bg-transparent text-sm font-semibold text-zinc-200 outline-none focus:text-white"
          aria-label={t('pro.laneName', 'Lane name')}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ muted: !lane.muted })}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
              lane.muted ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {lane.muted ? <VolumeX className="w-3 h-3" /> : t('pro.mute', 'M')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ soloed: !lane.soloed })}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
              lane.soloed
                ? 'bg-amber-500/20 border-emerald-500 text-emerald-300'
                : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {t('pro.solo', 'S')}
          </button>
          <input
            type="range"
            min={0}
            max={150}
            value={Math.round(lane.gain * 100)}
            onChange={(event) => onChange({ gain: Number(event.target.value) / 100 })}
            className="flex-1 accent-emerald-500"
            aria-label={t('pro.level', 'Level')}
          />
          <span className="text-[11px] text-zinc-500 tabular-nums w-8 text-right">
            {Math.round(lane.gain * 100)}
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} className="flex-1 rounded-lg bg-zinc-950/70" style={{ height: LANE_H }} />

      <div className="w-24 flex-shrink-0 flex items-center gap-1.5">
        <span className="text-[11px] text-zinc-600">L</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={Math.round((lane.pan ?? 0) * 100)}
          onChange={(event) => onChange({ pan: Number(event.target.value) / 100 })}
          className="flex-1 accent-emerald-500"
          aria-label={t('pro.pan', 'Where it sits, left to right')}
        />
        <span className="text-[11px] text-zinc-600">R</span>
      </div>

      <div className="w-28 flex-shrink-0 flex items-center gap-1">
        <input
          type="number"
          step={0.05}
          value={Number(lane.at.toFixed(2))}
          onChange={(event) => onChange({ at: Number(event.target.value) })}
          disabled={lane.backing}
          className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-sm text-zinc-300 tabular-nums disabled:opacity-40"
          aria-label={t('pro.startsAt', 'Starts at')}
        />
        <span className="text-[11px] text-zinc-600">s</span>
        {/* Splitting costs money and everything else in this room does not, so
            the price is on the control rather than in a dialog after it. */}
        <button
          type="button"
          onClick={onSplit}
          disabled={busy}
          title={`${t('pro.split', 'Split the voice off')} — ${perMinute(lane.audio.duration, CREDITS.stems)} ${t('video.credits', 'credits')}`}
          aria-label={t('pro.split', 'Split the voice off')}
          className="text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
        >
          <Scissors className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onVoice}
          disabled={busy}
          title={t('pro.sing', 'Sing this in another voice')}
          aria-label={t('pro.sing', 'Sing this in another voice')}
          className="text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
        >
          <Mic2 className="w-4 h-4" />
        </button>
        {!lane.backing && (
          <button type="button" onClick={onRemove} className="text-zinc-600 hover:text-red-400 ml-auto">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
