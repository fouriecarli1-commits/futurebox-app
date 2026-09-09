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
import { ArrowLeft, Check, Circle, Gauge, Layers, Loader2, Mic2, Music2, Plus, Scissors, Search, Sliders, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import {
  FLAT_MASTER, audible, dbOf, lengthOf, mixSession, monoOf, pieceOf, readInto, readSession,
  span, startLane, windowOf, wireLane,
  type Lane, type Master, type Reading,
} from '../lib/session';
import { failed, separate, separateParts } from '../lib/stems';
import { done as forgetJob, keyIn, partOf, read as readSong, spansIn, tempoIn, type Span } from '../lib/analyse';
import { CLEAN, isClean, type Tone } from '../lib/tone';
import { ampName, through } from '../lib/nam';
import { accessToken } from '../lib/cloud';
import VoicePicker from './VoicePicker';
import type { VoiceState } from './VoiceLab';
import { CREDITS, perMinute } from '../lib/credits';
import { decodeAt, shapeOf } from '../lib/takes';
import { forgetSession, keepSession, keptSession, soundOf } from '../lib/keepsession';
import { encodeWav } from '../lib/wav';
import { knownLatency } from '../lib/mixdown';
import {
  COUNT_INS, DEFAULT_METER, DIVISIONS, FASTEST, SLOWEST, barSeconds, countInSeconds,
  displayOf, placeAt, sane, sayPlace, snapped,
  type CountIn, type DivisionId, type Meter, type Snap,
} from '../lib/tempo';
import { Metronome } from '../lib/metronome';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import Hint from './Hint';
import Cost from './Cost';
import WatchTutorial from './WatchTutorial';
import SingVoices from './SingVoices';
import Note from './Note';
import { TOO_BIG_TO_SEND, attach } from '../lib/workfile';
import {
  BAR_CHOICES, INSTRUMENTS, bodyFor, instrumentBy, secondsFor,
  type Bars, type Family,
} from '../lib/parts';
import { songCost } from '../lib/credits';

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

  /* The booth itself. It is a full-screen overlay above the room, and until
     now it was not a layer at all — so Back closed the room underneath it. */
  useBackLayer(true, onClose);

  const [lanes, setLanes] = useState<Lane[]>([]);
  /**
   * Whether the saved session has been looked for yet.
   *
   * Nothing may seed or save until this is false. The backing lane is added by
   * an effect that fires on mount, and if it ran first it would put a fresh
   * backing in beside the restored one; if a save ran first it would write an
   * empty session over the one being restored. One flag settles both orders.
   */
  const [restoring, setRestoring] = useState(true);
  /** When the session was last written down, and what went wrong if it was not. */
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState<'unavailable' | 'full' | 'failed' | null>(null);
  const [cameBack, setCameBack] = useState(false);
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

  /* ── Which engine sings it ──────────────────────────────────────────────
     Two of them now, and they are not the same job. `speech` is ElevenLabs'
     speech-to-speech, which this room has always used and which handles a
     melody badly — the warning under the button has said so since §80.
     `singing` is Kits.AI, an RVC model trained on one singer, and it is the
     thing this app has promised and not had.

     The singing engine is the default the moment it is available. A panel
     titled "Sing this in another voice" that quietly picks the speech model
     when a singing one is switched on would be the same untruth in a new
     place. */
  const [engine, setEngine] = useState<'speech' | 'singing'>('speech');
  const canSing = Boolean(voices?.singing?.configured);
  /**
   * Which trained voice at Kits, by its number.
   *
   * Kept in the browser rather than on the account, because this app cannot
   * list her models — there is no endpoint here anybody has verified — so the
   * number is either one she named in the environment or one she typed once.
   * Remembering it is the difference between a feature and an errand.
   */
  const [modelId, setModelId] = useState('');
  useEffect(() => {
    if (modelId) return;
    const named = voices?.singing?.models?.[0]?.id;
    let kept: string | null = null;
    try {
      kept = window.localStorage.getItem('futurebox.singingModel');
    } catch {
      // A browser with storage switched off still gets to type a number.
    }
    const first = kept ?? named ?? '';
    if (first) setModelId(first);
  }, [modelId, voices]);
  useEffect(() => {
    if (canSing) setEngine('singing');
  }, [canSing]);
  const chooseModel = useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 20);
    setModelId(digits);
    try {
      window.localStorage.setItem('futurebox.singingModel', digits);
    } catch {
      // Not worth telling anybody about; it just will not be remembered.
    }
  }, []);

  /* And the voice panel over it, so Back dismisses the panel rather than the
     whole booth. Registered after the booth's own layer, so it is the
     innermost and closes first. */
  useBackLayer(changing !== null, () => setChanging(null));

  /* ── What a lane actually is ────────────────────────────────────────────
     Chords, key, tempo and sections, read by a service rather than guessed
     here. The answer is kept per lane: reading is paid for and a second press
     on the same lane should show what the first one bought. */
  const [known, setKnown] = useState<Record<string, { tempo: number | null; key: string | null; spans: Span[] }>>({});
  /* Which lane is being read right now. Named apart from the master's
     `reading` deliberately: two different things called the same word in one
     file is how the wrong one gets set. */
  const [looking, setLooking] = useState<string | null>(null);

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
    if (!backing || restoring) return;
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
  }, [backing, restoring, title]);

  /**
   * Come back to where she was.
   *
   * Carli, 9 September 2026: "'n projek waarmee mens besig is moet half kan
   * stoor, en restart waar 'n mens is."
   *
   * Runs once. A lane whose audio will not decode is dropped rather than
   * failing the whole restore — losing one take is bad and losing four
   * because of it is worse.
   */
  useEffect(() => {
    let gone = false;
    void (async () => {
      const kept = await keptSession(title);
      if (gone) return;
      if (!kept || !kept.lanes.length) {
        setRestoring(false);
        return;
      }
      const ctx = context();
      if (!ctx) {
        setRestoring(false);
        return;
      }
      const back: Lane[] = [];
      for (const lane of kept.lanes) {
        const audio = await soundOf(lane.wav, ctx);
        if (!audio) continue;
        const amped = lane.ampedWav ? await soundOf(lane.ampedWav, ctx) : null;
        back.push({
          id: lane.id,
          name: lane.name,
          audio,
          at: lane.at,
          gain: lane.gain,
          muted: lane.muted,
          soloed: lane.soloed,
          ...(lane.backing ? { backing: true } : {}),
          ...(lane.from === undefined ? {} : { from: lane.from }),
          ...(lane.to === undefined ? {} : { to: lane.to }),
          ...(lane.pan === undefined ? {} : { pan: lane.pan }),
          ...(lane.tone ? { tone: lane.tone } : {}),
          ...(amped && lane.ampedName ? { amped: { name: lane.ampedName, audio: amped } } : {}),
        });
      }
      if (gone) return;
      if (back.length) {
        setLanes(back);
        setMeter(kept.meter);
        setMaster(kept.master);
        /* The master's trim is worked out from a measurement, and a
           measurement of a mix this room has not rendered yet is not one it
           may claim. So the master comes back set and stale: what she chose,
           marked as needing measuring again. */
        setStale(true);
        setSavedAt(kept.savedAt);
        setCameBack(true);
      }
      setRestoring(false);
    })();
    return () => {
      gone = true;
    };
    /* Once, on the room opening. `context` is stable and `title` identifies
       the session; re-running this on anything else would restore over work. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * And write it down again whenever it changes.
   *
   * Debounced, because dragging a fader is a hundred renders and each save
   * re-encodes every lane to WAV. Two seconds after the last change is soon
   * enough to survive a back gesture and slow enough not to be in the way.
   */
  useEffect(() => {
    if (restoring) return undefined;
    if (!lanes.length) return undefined;
    const timer = window.setTimeout(() => {
      void keepSession(title, meter, master, lanes).then((done) => {
        if (done.ok) {
          setSavedAt(Date.now());
          setSaveFailed(null);
        } else {
          setSaveFailed(done.why);
        }
      });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [lanes, master, meter, restoring, title]);

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
        /* Joining part-way through, and stopping where the lane is cut — both
           worked out in `startLane`, which the render calls too. This was four
           lines here and four more in `mixSession`, and a cut added to one of
           them would have made what she hears and what comes out disagree. */
        startLane(source, lane, from, begins);
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
  /* What to generate, and how much of it. `docs/MUSIEKDENKE.md`'s rule holds
     here too: the request is written in bars, a key and a tempo, which are
     the four things a musician says when they ask a player for a part. */
  const [partOpen, setPartOpen] = useState(false);
  const [partId, setPartId] = useState('pad');
  const [partBars, setPartBars] = useState<Bars>(8);
  const [making, setMaking] = useState(false);

  /**
   * A part, generated and dropped in as a lane at the playhead.
   *
   * Posted to `/api/music` rather than to a route of its own: a part is a
   * short instrumental song, and that route already charges by length, guards
   * the words before spending, handles the free allowance and refunds a
   * refusal. A second copy of a money path is how two copies stop agreeing.
   * See `lib/parts.ts`.
   */
  const makePart = useCallback(async () => {
    const instrument = instrumentBy(partId);
    if (!instrument) return;
    const kept = sane(meter);
    setProblem(null);
    setMaking(true);
    try {
      const token = await accessToken();
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          bodyFor({ bars: partBars, beats: kept.beats, bpm: kept.bpm, key: kept.key, instrument }),
        ),
      });
      if (!response.ok) {
        setProblem(t('part.failed', 'That part could not be generated. Nothing was charged.'));
        return;
      }
      const audio = await readInto(await response.blob(), rate);
      if (!audio) {
        setProblem(t('pro.badFile', 'That file could not be read as audio.'));
        return;
      }
      /* At the playhead, like a file brought in, and named for what it is —
         "Synth pad · 8 bars" is what a mixer's channel would be called. */
      setLanes((was) => [
        ...was,
        {
          id: `part-${Date.now()}-${instrument.id}`,
          name: `${t(instrument.name, instrument.english)} · ${partBars} ${t('part.bars', 'bars')}`,
          audio,
          at,
          gain: 1,
          muted: false,
          soloed: false,
        },
      ]);
      setStale(true);
      setPartOpen(false);
    } catch {
      setProblem(t('part.failed', 'That part could not be generated. Nothing was charged.'));
    } finally {
      setMaking(false);
    }
  }, [at, meter, partBars, partId, rate, t]);

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
        /* The grid applies where a start time is being *placed*, and nowhere
           else. Snapping a gain or a name would be absurd, and snapping on
           every change would move a lane somebody had placed by ear the moment
           they renamed it.

           A trim is the other exception, and it is not obvious. Cutting the
           head of a lane moves `at` by exactly as much as it moves `from`,
           which is what keeps the audio still on the clock — so the two
           numbers have to agree to the sample. Snapping one of them and not
           the other slides the lane by up to half a beat every time an edge is
           dragged, and the drag then fights the grid. So: when `from` is in
           the patch, `at` was derived rather than chosen, and it is left
           alone. */
        if (how.at === undefined || how.from !== undefined) return next;
        return { ...next, at: snapped(next.at, sane(meter), snap) };
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
        /* The piece that plays, not the whole recording. A lane trimmed to
           its chorus and sent whole would be billed by the minute for the
           verses she cut out, and the stems would not line up with the lane
           they came from. */
        const piece = pieceOf(lane, ctx);
        const sent = encodeWav(monoOf(piece, ctx));
        const got = await separate(`lane:${lane.id}`, sent, piece.duration);
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
        /* A lane is a WAV, so anything past about fifty seconds is over the
           platform's body limit and has to go through storage first. */
        /* The piece that plays — see the note in `split`. */
        const piece = pieceOf(lane, ctx);
        const put = await attach(form, encodeWav(monoOf(piece, ctx)), 'audio', 'lane.wav');
        if (!put.ok) {
          setProblem(TOO_BIG_TO_SEND);
          return;
        }
        /* Which engine, and what each one needs told about it: a voice id at
           ElevenLabs, a trained model number at Kits. */
        const sings = engine === 'singing' && canSing;
        if (sings) form.append('voiceModelId', modelId);
        else if (voiceId) form.append('voiceId', voiceId);
        form.append('seconds', String(Math.round(piece.duration)));

        const token = await accessToken();
        const response = await fetch(sings ? '/api/voice/sing' : '/api/voice/change', {
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
            name: `${lane.name} · ${sings ? t('pro.sungReally', 'sung') : t('pro.sungBy', 'another voice')}`,
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
    [canSing, context, engine, modelId, rate, t, voiceId],
  );

  /**
   * Ask what a lane is, and offer to set the session to match.
   *
   * The tempo is not applied on its own. A reading is a machine's opinion and
   * a session's tempo is the thing every take is recorded against — silently
   * moving it because a service said 128 would move the grid under work
   * somebody has already done. It is offered; the person decides.
   */
  const look = useCallback(
    async (lane: Lane) => {
      setProblem(null);
      setLooking(lane.id);
      try {
        const ctx = context();
        if (!ctx) return;
        const got = await readSong(encodeWav(monoOf(lane.audio, ctx)), lane.audio.duration);
        if (!got.ok) {
          setProblem(got.message);
          return;
        }
        setKnown((was) => ({
          ...was,
          [lane.id]: { tempo: tempoIn(got.data), key: keyIn(got.data), spans: spansIn(got.data) },
        }));
      } catch {
        setProblem(t('pro.readFailed', 'That lane could not be read.'));
      } finally {
        setLooking(null);
      }
    },
    [context, t],
  );

  /**
   * A lane split into named parts rather than two.
   *
   * The two-stem split above is ElevenLabs and answers one question: is this
   * the voice, or is it everything else. This is the other kind — drums, bass,
   * guitars, keys, whatever the workflow was built to return — and each part
   * arrives as a lane at the source's own start so they sit on top of it.
   *
   * The source is muted rather than removed, for the same reason as the other
   * split: it is paid for, and a person may want the original back.
   */
  /**
   * A lane into its named parts — vocals, drums, bass, and the rest.
   *
   * ── Two services, one button ─────────────────────────────────────────
   *
   * `docs/KITS-KAART.md` §3: the stem splitter belongs on Kits, "Music.ai per
   * gebruik → Kits binne die dak". Kits' plan is a fixed R640 a month with a
   * roof of four hundred download minutes; Music.ai bills per use, every use,
   * for ever.
   *
   * So Kits is asked first and Music.ai catches everything Kits cannot do:
   * the key not being set, the monthly roof being reached, a job that fails.
   * Exactly the arrangement `/api/stems` already runs for the two-way split,
   * and for the same reason — one button, one result, and the cheaper
   * supplier tried first.
   *
   * A second button would have been quicker to build and would have made the
   * room worse. She asked for this to be simple; two nearly identical split
   * controls beside each other is not simple, and nobody could tell which one
   * to press.
   */
  const intoParts = useCallback(
    async (lane: Lane) => {
      setProblem(null);
      setLooking(lane.id);
      try {
        const ctx = context();
        if (!ctx) return;

        /* Kits first. The piece that plays, not the whole recording — a lane
           trimmed to its chorus would otherwise be billed by the minute for
           the verses that were cut, and its parts would not line up with the
           lane they came from. */
        const piece = pieceOf(lane, ctx);
        const viaKits = await separateParts(encodeWav(monoOf(piece, ctx)), piece.duration);
        if (!('message' in viaKits)) {
          const kitsLanes: Lane[] = [];
          for (const part of viaKits.parts) {
            const audio = await readInto(part.audio, rate);
            if (!audio) continue;
            kitsLanes.push({
              id: `${lane.id}-${part.instrument}-${kitsLanes.length}`,
              /* Their word for it, not ours. "drums" is what Kits called the
                 file and what the lane is called, so a room reading four
                 lanes is reading their names rather than a translation. */
              name: `${lane.name} · ${part.instrument}`,
              audio,
              at: lane.at,
              gain: lane.gain,
              muted: false,
              soloed: false,
              pan: lane.pan,
            });
          }
          if (kitsLanes.length > 0) {
            setStale(true);
            setLanes((was) => [
              ...was.map((one) => (one.id === lane.id ? { ...one, muted: true } : one)),
              ...kitsLanes,
            ]);
            return;
          }
        }
        /* Out of allowance is the member's own limit and not a reason to try
           the other supplier — the second one would refuse in the same words
           after another wait. */
        if ('message' in viaKits && viaKits.outOfAllowance) {
          setProblem(viaKits.message);
          return;
        }

        const got = await readSong(encodeWav(monoOf(lane.audio, ctx)), lane.audio.duration, 'stems');
        if (!got.ok) {
          setProblem(got.message);
          return;
        }
        if (got.parts.length === 0) {
          setProblem(t('pro.noParts', 'That workflow returned no audio to split into.'));
          return;
        }

        /* Fetched one at a time rather than all at once: six stems of a long
           song is a lot of megabytes, and a phone asked for all of them
           together drops some of them. */
        const made: Lane[] = [];
        for (const name of got.parts) {
          const blob = await partOf(got.id, name);
          if (!blob) continue;
          const audio = await readInto(blob, rate);
          if (!audio) continue;
          made.push({
            id: `${lane.id}-${name}-${made.length}`,
            name: `${lane.name} · ${name}`,
            audio,
            at: lane.at,
            gain: lane.gain,
            muted: false,
            soloed: false,
            pan: lane.pan,
          });
        }
        /* Their storage, freed as soon as the parts are here. */
        void forgetJob(got.id);

        if (made.length === 0) {
          setProblem(t('pro.partsUnreadable', 'The parts came back in a form the browser could not read.'));
          return;
        }
        setStale(true);
        setLanes((was) => [
          ...was.map((one) => (one.id === lane.id ? { ...one, muted: true } : one)),
          ...made,
        ]);
      } catch {
        setProblem(t('pro.partsFailed', 'That lane could not be split into parts.'));
      } finally {
        setLooking(null);
      }
    },
    [context, rate, t],
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
    /* One page on a phone, four pinned strips on a desk.

       The room is a desk: a header and a clock nailed to the top, the master
       and the transport nailed to the foot, and the lanes scrolling in what is
       left between them. On a 1280-pixel screen that is right — the transport
       is what you reach for most and it should never move.

       On a 390-pixel one the four strips are most of the height, the lanes get
       a sliver, and everything appears to sit behind everything else. So below
       sm the whole room is one column that scrolls, every section laid out in
       full, nothing pinned. */
    /* The room stops where the tab bar starts.

       `TabBar` is `fixed bottom-0 z-[95]` and this room is `z-[70]`, so the
       bar is painted over the foot of the room at every width. The transport
       lives there — and so did "Mix it down", the button that produces the
       file this whole room exists to make. On a phone it was underneath the
       bar with nothing to say so, and every probe had rendered the room
       without the bar, so nothing had ever noticed.

       Carli, 9 September 2026: "hoe export mens of bring alles by mekaar?
       Iets soos 'n mix together knoppie?" It was there. It was covered.

       Fifty-six pixels is the bar's own `min-h`, plus its top border and the
       phone's safe area. `audit/probooth.mjs` asks what is painted at each
       control rather than trusting this number, so a taller bar fails there
       instead of quietly swallowing a button again. */
    <div className="fixed inset-0 z-[70] bg-zinc-950 flex flex-col overflow-y-auto sm:overflow-hidden pb-[calc(57px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 bg-zinc-950 px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        {/* Out of the room, and it says so.

            Carli: "the booth en the pro booth het nie 'n back knoppie nie."
            There was a way out — a bare grey cross in the top right — and it
            was not a button by this app's own rule: no box, no word, the
            lightest grey on the screen, in the corner a thumb reaches last.
            On a phone the only reliable way back was the hardware key.

            Left, boxed, with the word on it, and the cross is gone: two
            controls that do the same thing is how you get somebody wondering
            which one loses their take. */}
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('booth.back', 'Back')}
        </button>
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
      </div>

      {/* ── That the work is being kept, and that it was picked back up ────

          Carli lost a whole session to a back gesture: "toe ek terug swipe of
          back druk, dan gooi hy mens heeltemal uit na die home screen toe en
          jy verloor jou hele projek."

          It is written down now, on the device, two seconds after every
          change. This strip is the part of that she can see — because storage
          that works silently and storage that has quietly stopped look exactly
          the same from a chair, and the difference is a night's takes. */}
      {(cameBack || savedAt !== null || saveFailed) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-800 bg-zinc-950 px-5 py-2 text-xs">
          {saveFailed ? (
            <span className="font-semibold text-amber-300">
              {saveFailed === 'full'
                ? t('pro.keptFull', 'This device has no room left, so the session is not being saved. Mix it down, or free some space.')
                : t('pro.keptNo', 'This browser will not keep the session, so leaving the room will lose it. Mix it down before you go.')}
            </span>
          ) : (
            <span className="text-zinc-500">
              {cameBack
                ? t('pro.keptBack', 'Carried on from where you left off.')
                : t('pro.kept', 'Saved on this device. Leaving the room will not lose it.')}
            </span>
          )}
          {cameBack && !saveFailed && (
            /* The one thing a resume has to offer: not resuming. Somebody who
               opened the room to start something new must not have to work out
               how to get rid of last night's takes. */
            <button
              type="button"
              onClick={() => {
                void forgetSession();
                setLanes((was) => was.filter((lane) => lane.backing));
                setCameBack(false);
                setSavedAt(null);
              }}
              className="min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-semibold text-zinc-300 hover:border-emerald-500 hover:text-white"
            >
              {t('pro.startFresh', 'Start fresh')}
            </button>
          )}
        </div>
      )}

      {/* ── The clock: tempo, time signature, key, click and grid ───────
          One strip rather than a panel behind a menu. Everything on it changes
          what the next take will sound like or land on, and a control that
          changes a recording is a control that has to be visible while the
          recording is being set up. */}
      <div className="flex-shrink-0 bg-zinc-950 px-4 py-2 border-b border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-2">
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
            className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100 tabular-nums"
            aria-label={t('pro.bpm', 'Tempo')}
          />
          <span className="text-xs text-zinc-500">{t('pro.bpmUnit', 'bpm')}</span>
        </label>

        <span className="flex items-center gap-1 text-sm text-zinc-400">
          <select
            value={meter.beats}
            onChange={(event) => setMeter((was) => sane({ ...was, beats: Number(event.target.value) }))}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-1.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100"
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
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-1.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100"
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
          className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100"
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
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100"
              aria-label={t('pro.division', 'How often it clicks')}
            >
              {DIVISIONS.map((one) => (
                <option key={one.id} value={one.id}>{one.id}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="sr-only">{t('pro.clickLevel', 'Click level')}</span>
              <input
                type="range"
                min={-40}
                max={0}
                value={clickDb}
                onChange={(event) => setClickDb(Number(event.target.value))}
                className="w-20 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
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
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100"
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
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100"
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
      <div className="sm:flex-1 sm:min-h-0 sm:overflow-y-auto px-4 py-3 space-y-2">
        {lanes.map((lane) => (
          <LaneRow
            key={lane.id}
            lane={lane}
            lanes={lanes}
            total={total}
            at={at}
            meter={meter}
            onChange={(how) => change(lane.id, how)}
            onRemove={() => setLanes((was) => was.filter((one) => one.id !== lane.id))}
            onSplit={() => void split(lane)}
            onVoice={() => setChanging(lane)}
            onRead={() => void look(lane)}
            onParts={() => void intoParts(lane)}
            reading={looking === lane.id}
            found={known[lane.id]}
            onUseTempo={(bpm, root) =>
              setMeter((was) => sane({ ...was, bpm, key: root ?? was.key }))
            }
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
      {/* ── Generate a part ───────────────────────────────────────────────

          The whole point of this panel is the sentence at the bottom of it.
          A genre picker would have been quicker to build and would not have
          made sense to anybody who does this for a living; what a player is
          actually asked for is *eight bars of Rhodes in A minor at 96, in
          four*, and the room already knows three of those four. So the
          request is written in those terms every time, in front of somebody
          about to press a button — which is `docs/MUSIEKDENKE.md`'s rule
          applied to the one room where the reader is already a musician.

          The limit is under the button and not behind a mark: the engine
          reads words and cannot hear the session, so the part comes back
          *described* as being in this key and tempo rather than locked to the
          click. A professional needs that before the press, not after. */}
      {partOpen && (
        <div className="fixed inset-0 z-[80] bg-scrim/85 flex items-end sm:items-center justify-center p-0 sm:p-6">
          {/* A column with a scrolling middle, not one long scrolling box.

              The first version scrolled the whole panel, which put the
              request, the price and the button below the fold — so the thing
              this panel exists for was the one thing you could not see, and
              somebody had to scroll past twenty-three instruments to find out
              what pressing would cost. The list scrolls; the decision does
              not move. */}
          <div className="flex w-full sm:max-w-lg max-h-[88vh] flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-start justify-between gap-3 p-4 pb-2">
              <p className="text-base font-bold text-white">{t('part.title', 'Generate a part')}</p>
              <button
                type="button"
                onClick={() => setPartOpen(false)}
                aria-label={t('share.close', 'Close')}
                className="p-2 -m-2 sm:p-0 sm:m-0 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grouped the way a mixer's channel list is grouped. Twenty-three
                names in one flat run is a wall nobody reads to the end of. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 space-y-3">
            {(['drums', 'bass', 'keys', 'guitars', 'winds', 'texture'] as Family[]).map((family) => (
              <div key={family} className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                  {t(`part.family.${family}`, family)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {INSTRUMENTS.filter((one) => one.family === family).map((one) => (
                    <button
                      key={one.id}
                      type="button"
                      onClick={() => setPartId(one.id)}
                      aria-pressed={partId === one.id}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                        partId === one.id
                          ? 'border-emerald-500 bg-emerald-500/15 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      {t(one.name, one.english)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                {t('part.bars', 'bars')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BAR_CHOICES.map((bars) => (
                  <button
                    key={bars}
                    type="button"
                    onClick={() => setPartBars(bars)}
                    aria-pressed={partBars === bars}
                    className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums ${
                      partBars === bars
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {bars}
                  </button>
                ))}
              </div>
            </div>
            </div>

            {/* The request, the price and the button, which never move. */}
            <div className="space-y-2.5 border-t border-zinc-800 p-4">
            {/* The request, read back. Somebody who presses this forty times
                has read the four things a musician says forty times. */}
            <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm leading-snug text-zinc-300">
              <span className="font-bold text-white">
                {partBars} {t('part.bars', 'bars')}
              </span>{' '}
              {t('part.of', 'of')}{' '}
              <span className="font-bold text-white">
                {t(instrumentBy(partId)?.name ?? '', instrumentBy(partId)?.english ?? '')}
              </span>
              {sane(meter).key ? (
                <>
                  {' · '}
                  <span className="font-bold text-white">{sane(meter).key}</span>
                </>
              ) : null}
              {' · '}
              {t('part.at', 'at')}{' '}
              <span className="tabular-nums">
                {sane(meter).bpm} BPM · {sane(meter).beats}/4
              </span>
              <span className="block pt-1 text-xs text-zinc-500 tabular-nums">
                {clock(secondsFor(partBars, sane(meter).bpm, sane(meter).beats))}
              </span>
            </p>

            <Cost credits={songCost(secondsFor(partBars, sane(meter).bpm, sane(meter).beats))} />

            <button
              type="button"
              onClick={() => void makePart()}
              disabled={making}
              className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 font-bold text-onAccent flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {making ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music2 className="w-4 h-4" />}
              {making ? t('part.making', 'Generating\u2026') : t('part.make', 'Generate it')}
            </button>

            <Note className="text-xs leading-snug text-zinc-500">
              {t(
                'part.limit',
                'The engine reads words, not the session. What comes back is described as being in this key and tempo — it is not locked to the click, so a part may need nudging into place. Drag it on its lane.',
              )}
            </Note>
            <p className="text-xs text-zinc-600">{t('part.landed', 'It is a new lane, at the playhead.')}</p>
            </div>
          </div>
        </div>
      )}

      {changing && (
        <div className="fixed inset-0 z-[80] bg-scrim/85 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-bold text-white">
                  {t('pro.sing', 'Sing this in another voice')}
                </p>
                <p className="text-sm text-zinc-500 leading-snug truncate">{changing.name}</p>
              </div>
              <button type="button" onClick={() => setChanging(null)} className="p-2 -m-2 sm:p-0 sm:m-0 text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* What it does and does not do, before the money is spent. It
                keeps the performance — the timing, the phrasing, the breaths —
                and changes whose voice is carrying it. Somebody expecting it
                to fix their singing needs to know that before they buy it. */}
            <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                'pro.singWhat',
                'It keeps the performance — the timing, the phrasing, the breaths — and changes whose voice is carrying it. It does not fix the singing, and it will keep a wrong note as faithfully as a right one.',
              )}</Note>
            {/* ── Which engine ────────────────────────────────────────
                Only drawn when there are two of them: a chooser with one
                option is furniture. The singing model is first and selected,
                because it is the one that does what the panel's title says. */}
            {canSing && (
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label={t('pro.engine', 'Which model sings it')}
              >
                <button
                  type="button"
                  onClick={() => setEngine('singing')}
                  aria-pressed={engine === 'singing'}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold ${
                    engine === 'singing'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {t('pro.engineSinging', 'Singing model')}
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('speech')}
                  aria-pressed={engine === 'speech'}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold ${
                    engine === 'speech'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {t('pro.engineSpeech', 'Speech model')}
                </button>
              </div>
            )}

            {/* And what the chosen one is built for, which decides whether the
                result is worth buying at all.

                The note above is careful about one thing — it will not fix the
                singing — and was silent about the thing that matters more.
                Over the speech model that is `eleven_multilingual_sts_v2`:
                §A1 of docs/OPEN-QUESTIONS.md records that it handles singing
                badly, and §9 of docs/DIENSTE-EN-KOSTE.md called a real singing
                model the one thing this app promises and cannot deliver.

                The panel is titled "Sing this in another voice", the button
                says "Sing it", and the cost is on the same screen. Being told
                afterwards is being told too late. Above the cost, deliberately:
                the caveat has to be read before the press, not after it.

                The singing model gets its own sentence rather than no sentence.
                What it cannot do is different — it needs a model trained on a
                voice, and it is not a spoken-word tool — and silence there
                would read as "this one is perfect". */}
            {engine === 'speech' || !canSing ? (
              <Note className="text-sm text-amber-300/90 leading-relaxed">{t(
                  'pro.singBuilt',
                  'The model behind it is built for speech. On a spoken lane it is reliable; on a sung one it is a gamble \u2014 the melody is what it handles worst. A model built for singing is the one thing this app still cannot do.',
                )}</Note>
            ) : (
              <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                  'pro.singReal',
                  'This one is built for singing: it is a voice trained on one singer, and it follows a melody rather than fighting it. It needs a trained voice to sing in \u2014 yours, once you have made one at kits.ai \u2014 and it is the wrong tool for a spoken lane.',
                )}</Note>
            )}
            <Cost
              credits={perMinute(
                changing.audio.duration,
                engine === 'singing' && canSing ? CREDITS.sing : CREDITS.voiceChange,
              )}
            />

            {engine === 'singing' && canSing ? (
              /* Her trained voices and Kits' own catalogue, in one picker.

                 This used to say "no voice list to show" and ask for a number,
                 because on the free tier the list endpoint answered 403. With
                 the plan on the account it answers, and it answers twice: the
                 voices trained here, and the hundred-odd anybody can sing in
                 without training anything. */
              <div className="space-y-2">
                <p className="text-sm font-bold text-white">
                  {t('pro.singModel', 'Which trained voice')}
                </p>
                <SingVoices
                  mine={voices?.singing?.models ?? []}
                  stock={voices?.singing?.stock ?? []}
                  value={modelId}
                  onChange={chooseModel}
                  idPrefix="sing"
                />
                <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                    'pro.singModelHelp',
                    'The voices above are the ones trained on your kits.ai account. If one is missing, type its number \u2014 it is in the address bar when you open that voice there. Your choice is remembered on this device.',
                  )}</Note>
                {/* The way to get one, for anybody who has not. */}
                <WatchTutorial />
              </div>
            ) : voices ? (
              <VoicePicker
                mine={voices.mine ?? []}
                stock={voices.stock ?? []}
                value={voiceId}
                onChange={setVoiceId}
              />
            ) : (
              <p className="text-sm text-zinc-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('pro.voicesLoading', 'Fetching the voices\u2026')}
              </p>
            )}

            <button
              type="button"
              onClick={() => void changeVoice(changing)}
              disabled={busy || (engine === 'singing' && canSing ? !modelId : !voiceId)}
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
      <div className="flex-shrink-0 bg-zinc-950 px-4 py-2 border-t border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" />
          {t('pro.master', 'Master')}
        </span>

        <label className="flex items-center gap-1.5 w-full sm:w-auto">
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
            className="w-24 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
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
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-100 tabular-nums"
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
      {/* Both bottom strips carry their own background. They are pinned while
          the lane list scrolls underneath, and a transparent bar over moving
          content is a bar you can read the lanes through — which on a phone,
          where the list is long and the strip is close, looks like the
          controls have collided. */}
      <div className="flex-shrink-0 bg-zinc-950 px-5 pt-2 pb-3 border-t border-zinc-800 flex flex-wrap items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            {/* Not "Stop".

                While a take is being recorded the transport beside this one
                also reads "Stop", and Carli hit both: two buttons, the same
                word, one ends the recording and one ends the playback. A
                stop button has to say what it stops. */}
            {t('pro.stopRecording', 'Stop recording')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void record()}
            disabled={busy}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Circle className="w-4 h-4 fill-current" />
            {t('pro.record', 'Record a lane')}
          </button>
        )}

        <button
          type="button"
          onClick={() => (playing ? stopPlaying() : play(at))}
          disabled={busy || recording || !heard.length}
          className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
          className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold disabled:opacity-50"
        >
          {t('pro.toStart', 'Back to the start')}
        </button>

        {/* Minutes, and bars.

            `docs/MUSIEKDENKE.md` §3.6. This room's whole subject is a
            metronome, a time signature and a bar grid, and it had never once
            said the word "bar" with a number after it — so a week of work in
            here taught nobody to count. The clock stays, because a clock is
            what a file is measured in; the bar is what the music is.

            Counted from one, and in the time signature that is actually set:
            bar 2 arrives after four beats in 4/4 and after three in a waltz.
            See `placeAt` in lib/tempo.ts. */}
        <span className="text-sm text-zinc-500 tabular-nums px-1">
          {clock(at)} / {clock(total)}
          <span className="ml-2 text-zinc-400">
            {t('pro.barShort', 'bar')} {sayPlace(placeAt(at, meter))}
          </span>
          {/* `docs/MUSIEKDENKE.md` §3.5. "33.2" is the whole vocabulary of
              this feature and it is not guessable from looking at it. */}
          <Hint>
            {t(
              'pro.barWhat',
              'Bars, then the beat inside the bar — 33.2 is the second beat of the thirty-third bar. Both count from one, and how many beats make a bar is the time signature set above.',
            )}
          </Hint>
        </span>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
          className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {t('pro.bringIn', 'Bring audio in')}
        </button>

        {/* Beside bringing a file in, because it is the same decision — this
            session needs a part it does not have — and the room should not
            make somebody leave to answer it. */}
        <button
          type="button"
          onClick={() => setPartOpen(true)}
          disabled={busy || recording || making}
          className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Music2 className="w-4 h-4" />
          {t('part.title', 'Generate a part')}
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
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {/* Not "Mix it down".
 
              Carli: "wanneer daar baie klanke en sound bars gelayer word, hoe
              word dit uiteindelik as een liedjie ge-export? is dit duidelik?
              gaan mense weet hoe?"
 
              No. "Mix it down" is what the thing is called by people who
              already know what it is called. Somebody looking at eight lanes
              and wondering how they become one file is not helped by a term
              that assumes the answer. The button now says what it makes. */}
          {t('pro.keep', 'Make one song')}
        </button>
        {/* And the sentence, because a button alone still leaves "and then
            what?" — the room closes and the song is in the Library, and both
            halves of that are worth knowing before it is pressed. */}
        <p className="w-full text-[11px] leading-snug text-zinc-500">
          {heard.length
            ? t(
                'pro.keepWhat',
                'Every lane you can hear becomes one song, with its levels, cuts and tone baked in. It lands in your Library and this room closes.',
              )
            : t('pro.keepNone', 'Record a take or bring audio in, and this makes one song out of all of it.')}
        </p>
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
  meter,
  onChange,
  onRemove,
  onSplit,
  onVoice,
  onRead,
  onParts,
  reading,
  found,
  onUseTempo,
  busy,
}: {
  lane: Lane;
  lanes: readonly Lane[];
  total: number;
  at: number;
  /** The session's tempo and time signature, for the bar lines on the wave. */
  meter: Meter;
  onChange: (how: Partial<Lane>) => void;
  onRemove: () => void;
  onSplit: () => void;
  onVoice: () => void;
  onRead: () => void;
  onParts: () => void;
  reading: boolean;
  found?: { tempo: number | null; key: string | null; spans: Span[] };
  onUseTempo: (bpm: number, key: string | null) => void;
  busy: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const quiet = audible(lanes).indexOf(lane) < 0;
  const [open, setOpen] = useState(false);
  const tone: Tone = lane.tone ?? CLEAN;

  /* Bringing an amp in.

     A capture is a file the person already has — the format every Neural Amp
     Modeler plugin loads — so this is a file picker and not a shop. Running a
     take through one is seconds of arithmetic on a phone, not a moment, so
     there is a spinner and the row says what it is doing.

     The failure is named rather than swallowed. A .nam that will not load is
     either not a capture or a newer architecture than the engine here reads,
     and both are answers somebody can act on. Silence is not. */
  const [amping, setAmping] = useState(false);
  const [ampFailed, setAmpFailed] = useState('');

  /* ── Cutting the lane ────────────────────────────────────────────────────

     Pointer events with the pointer captured, so an edge dragged with a thumb
     that slides off the strip keeps dragging rather than dropping where it
     left. `touch-none` on the strip stops the page scrolling underneath, which
     is the difference between trimming a lane and scrolling past one. */
  const stripRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<'from' | 'to' | null>(null);
  /**
   * The same thing as `dragging`, in state, so the readout can be drawn.
   *
   * The ref stays because the pointer handlers read it synchronously between
   * renders and a state read there would be one frame stale. Keeping both is
   * deliberate: one drives the drag, one draws it.
   *
   * Carli: "moet daar nie 'n getal verskuif soos wat die bar getrek word nie."
   * There was none. The edges moved, the waveform dimmed behind them, and
   * nothing anywhere said what the cut had been set to — so a trim was a thing
   * you did by eye and could not repeat.
   */
  const [held, setHeld] = useState<'from' | 'to' | null>(null);
  /** And which edge has the keyboard, so arrow keys get the same readout. */
  const [focused, setFocused] = useState<'from' | 'to' | null>(null);
  const window_ = windowOf(lane);
  const played = lengthOf(lane);
  const whole = (lane.amped?.audio ?? lane.audio).duration;
  const cut = window_.from > 0.01 || window_.to < whole - 0.01;

  /** Where on the session's clock a pointer is. */
  const clockAt = (clientX: number): number => {
    const strip = stripRef.current;
    if (!strip || !(total > 0)) return 0;
    const box = strip.getBoundingClientRect();
    if (box.width <= 0) return 0;
    return ((clientX - box.left) / box.width) * total;
  };

  /**
   * An edge moved to a moment on the session's clock.
   *
   * The front and the back are not symmetrical. Cutting the head moves `at` by
   * the same amount as `from`, which is what keeps the audio still: a note on
   * beat three stays on beat three. Cutting the tail only moves `to`.
   *
   * A tenth of a second is the floor. Zero would be a lane that is in the
   * session and cannot be heard, which reads as a lane that has vanished.
   */
  const moveEdge = (edge: 'from' | 'to', to: number) => {
    const origin = lane.at - window_.from; // where sample zero sits on the clock
    const wanted = Math.max(0, to - origin); // seconds into the lane's own audio
    if (edge === 'from') {
      const from = Math.min(Math.max(0, wanted), window_.to - 0.1);
      onChange({ from, to: window_.to, at: origin + from });
    } else {
      const end = Math.min(Math.max(window_.from + 0.1, wanted), whole);
      onChange({ from: window_.from, to: end });
    }
  };

  const startDrag = (edge: 'from' | 'to') => (event: React.PointerEvent) => {
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragging.current = edge;
    setHeld(edge);
  };
  const onDragMove = (event: React.PointerEvent) => {
    if (!dragging.current) return;
    moveEdge(dragging.current, clockAt(event.clientX));
  };
  const endDrag = () => {
    dragging.current = null;
    setHeld(null);
  };

  /* Arrow keys as well, a tenth of a second at a time — the same floor the
     drag clamps to, so the two ways of moving an edge agree. */
  const onEdgeKey = (edge: 'from' | 'to') => (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 1 : 0.1;
    const now = edge === 'from' ? lane.at : lane.at + played;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveEdge(edge, now - step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveEdge(edge, now + step);
    }
  };

  const bringAmp = async (file: File) => {
    setAmping(true);
    setAmpFailed('');
    try {
      const json = await file.text();
      /* Any context will do: `through` only wants it to make the buffer, and
         a one-frame offline context costs nothing and closes itself. */
      const room = new OfflineAudioContext(1, 1, lane.audio.sampleRate);
      const audio = await through(room, lane.audio, json);
      onChange({ amped: { name: ampName(json), audio } });
    } catch {
      setAmpFailed(t('pro.ampFailed', 'That file did not load as an amp.'));
    } finally {
      setAmping(false);
    }
  };

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

    /* Where this lane sits on the session's clock, not on its own — and what
       of it plays.

       The whole recording is drawn, cut parts included, because a cut you
       cannot see is a cut you cannot undo by eye: dragging an edge back out
       needs the shape of what is out there to aim at. The trimmed parts are
       drawn faint, and the part that plays is drawn at full strength. */
    /* Not called `window`: that shadows the global one, and the next line
       down asks it for `devicePixelRatio`. */
    const played_ = windowOf(lane);
    const whole_ = (lane.amped?.audio ?? lane.audio).duration;
    /* The head that was cut sits before `lane.at`, because trimming the front
       keeps the audio still on the clock rather than sliding it. */
    const originAt = lane.at - played_.from;
    const left = (originAt / total) * width;
    const wide = (whole_ / total) * width;
    const columns = Math.max(8, Math.floor(wide / 2));
    const shape = shapeOf(lane.amped?.audio ?? lane.audio, columns);
    const playing = quiet
      ? 'rgba(113,113,122,0.35)'
      : lane.backing
        ? 'rgba(148,163,184,0.55)'
        : 'rgba(16,185,129,0.75)';
    const trimmed = 'rgba(113,113,122,0.18)';
    for (let i = 0; i < columns; i += 1) {
      const second = (i / columns) * whole_;
      const x = left + (i / columns) * wide;
      const size = Math.max(1, shape[i] * (height - 6));
      context.fillStyle = second >= played_.from && second < played_.to ? playing : trimmed;
      context.fillRect(x, height / 2 - size / 2, Math.max(1, wide / columns - 0.5), size);
    }

    /* ── The bars, behind the sound ───────────────────────────────────

       `docs/MUSIEKDENKE.md` §3.6. Drawn here rather than as a ruler above
       the lanes, and the first version was that ruler: a strip across the
       full width of the room, while every lane's waveform starts after the
       lane-name column and ends before the controls. Bar 2 on the ruler sat
       nowhere near bar 2 in the audio. A ruler that does not line up with
       what it rules is worse than none, because it is read.

       In here the mapping from seconds to pixels is the one the waveform is
       already drawn with, so the grid is aligned by construction and cannot
       drift. Every fourth line is brighter, which is how a bar count is
       read at a glance — in fours, not one at a time.

       Behind the sound, and faint: this is a thing to notice, not a thing to
       look at. */
    const bar = barSeconds(meter);
    if (bar > 0 && total > 0 && total / bar <= 400) {
      for (let n = 1; n * bar < total; n += 1) {
        const x = ((n * bar) / total) * width;
        context.fillStyle = n % 4 === 0 ? 'rgba(161,161,170,0.45)' : 'rgba(113,113,122,0.22)';
        context.fillRect(x, 0, 1, height);
      }
    }

    const head = (at / total) * width;
    context.fillStyle = '#fff';
    context.fillRect(head - 1, 0, 2, height);
  }, [at, lane, meter, quiet, total]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
    {/* Wraps rather than squeezing. Five controls after the waveform fitted on
        a desktop and ran off the side of a phone, and the pan slider was
        overlapping the start-time field at 1280px — which is not a narrow
        screen. The waveform keeps a floor so it stays a waveform. */}
    <div className="p-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="w-full sm:w-40 flex-shrink-0 space-y-1">
        <input
          value={lane.name}
          onChange={(event) => onChange({ name: event.target.value.slice(0, 40) })}
          className="w-full bg-transparent py-1.5 sm:py-0 text-sm font-semibold text-zinc-200 outline-none focus:text-white"
          aria-label={t('pro.laneName', 'Lane name')}
        />
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => onChange({ muted: !lane.muted })}
            className={`px-2 py-1.5 sm:py-0.5 min-w-[34px] sm:min-w-0 min-h-[34px] sm:min-h-0 rounded text-[11px] font-bold border ${
              lane.muted ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {lane.muted ? <VolumeX className="w-3 h-3" /> : t('pro.mute', 'M')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ soloed: !lane.soloed })}
            className={`px-2 py-1.5 sm:py-0.5 min-w-[34px] sm:min-w-0 min-h-[34px] sm:min-h-0 rounded text-[11px] font-bold border ${
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
            className="flex-1 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
            aria-label={t('pro.level', 'Level')}
          />
          <span className="text-[11px] text-zinc-500 tabular-nums w-8 text-right">
            {Math.round(lane.gain * 100)}
          </span>
        </div>
      </div>

      {/* ── The lane, and the two edges that cut it ───────────────────────

          "Ek dink maar net of klanke gecut kan word? Dat verskillende klank
           bane onder mekaar kan sit en uit eindelik geedit kan word?"

          The lanes sat under each other already; this is the editing. Drag the
          left edge and the head of the take is cut; drag the right and the
          tail is. Nothing is destroyed — `from` and `to` are two numbers on the
          lane and the recording underneath is untouched, so it drags back out
          again and the amp and stems do not have to be redone.

          Trimming the front keeps the audio still on the session's clock: the
          lane's start moves by the same amount as the cut, so a note that was
          on beat three stays on beat three. Sliding it instead would mean
          every trim needed a nudge afterwards to put it back. */}
      <div
        ref={stripRef}
        className="relative flex-1 min-w-[180px] touch-none"
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg bg-zinc-950/70"
          style={{ height: LANE_H }}
        />
        {(['from', 'to'] as const).map((edge) => {
          const seconds = edge === 'from' ? lane.at : lane.at + played;
          return (
            <div
              key={edge}
              data-lane-edge={edge}
              role="slider"
              tabIndex={0}
              aria-label={
                edge === 'from'
                  ? t('pro.cutFrom', 'Where this lane starts')
                  : t('pro.cutTo', 'Where this lane ends')
              }
              aria-valuemin={0}
              aria-valuemax={Math.round(total)}
              aria-valuenow={Math.round(seconds)}
              aria-valuetext={clock(seconds)}
              onPointerDown={startDrag(edge)}
              onKeyDown={onEdgeKey(edge)}
              onFocus={() => setFocused(edge)}
              onBlur={() => setFocused((was) => (was === edge ? null : was))}
              className="absolute inset-y-0 w-8 cursor-ew-resize focus:outline-none"
              /* Held inside the strip.
 
                 The handle is 32 pixels wide and centred on the edge it moves,
                 so at the very end it hung 16 pixels past the waveform — half
                 a handle outside the lane, which on a phone is half a handle
                 nobody can grab. Clamped rather than clipped: `overflow-hidden`
                 would hide the half instead of moving it. */
              style={{
                left: `max(0px, min(calc(${total > 0 ? (seconds / total) * 100 : 0}% - 16px), calc(100% - 32px)))`,
              }}
            >
              <span
                className="pointer-events-none absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full"
                style={{ background: cut ? 'rgb(52 211 153)' : 'rgba(82,82,91,0.7)' }}
              />
              {/* ── The number, while the edge is being moved ────────────
 
                  Two of them, because one is not enough to work with: where
                  the edge now sits on the session's clock, and how long the
                  lane plays for once it is cut. The first is what you are
                  aiming at; the second is what you are actually deciding.
 
                  `bg-scrim` rather than a black at any opacity — every colour
                  in this app is a theme variable and `black` resolves to a
                  pale grey in the shipped light theme, so a label written on
                  `bg-black/70` is white on white. `check:scrim` holds the rule.
 
                  Shown on keyboard focus too. The edges take arrow keys, and a
                  readout only a mouse can summon is not a readout. */}
              {(held === edge || focused === edge) && (
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-scrim px-1.5 py-1 text-[11px] font-bold tabular-nums text-white shadow-lg">
                  {clock(seconds)}
                  <span className="pl-1 font-semibold text-zinc-400">
                    {clock(Math.max(0, window_.to - window_.from))}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        title={t('pro.tone', 'Tone')}
        aria-label={t('pro.tone', 'Tone')}
        className={`flex-shrink-0 p-2.5 sm:p-1.5 rounded-lg border ${
          isClean(lane.tone)
            ? 'border-zinc-800 text-zinc-600 hover:text-zinc-300'
            : 'border-emerald-500/50 text-emerald-400'
        }`}
      >
        <Sliders className="w-4 h-4" />
      </button>

      {/* Sized by what is in it, not by a number that was right once.

          This was `w-32` — 128 pixels — and `flex-shrink-0`, holding an L, a
          slider and an R that come to 155. A box that may not shrink and is
          smaller than its contents does not scroll and does not wrap: it
          paints the overflow over whatever is beside it. What Carli saw was
          this block's "R" printed underneath the start-time field next to it:
          "kyk fyn na bar langs die skertjie. daar is iets dubbel daar."

          The row around it already wraps. Letting these blocks be as wide as
          they need means the wrap can do its job. */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-zinc-600">L</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={Math.round((lane.pan ?? 0) * 100)}
          onChange={(event) => onChange({ pan: Number(event.target.value) / 100 })}
          className="flex-1 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
          aria-label={t('pro.pan', 'Where it sits, left to right')}
        />
        <span className="text-[11px] text-zinc-600">R</span>
      </div>

      {/* The same fault, and the one that hid the mic.

          128 pixels holding 190: a start-time field, a unit, and five actions
          — split, parts, read, sing, remove. The last two were simply outside
          the card, reachable only by dragging a row nothing says is draggable.

          "ek moes die bar links skuif om daai opname mic te sien. niemand
           gaan weet dit is daar nie." Nobody was going to. */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1">
        <input
          type="number"
          step={0.05}
          value={Number(lane.at.toFixed(2))}
          onChange={(event) => onChange({ at: Number(event.target.value) })}
          disabled={lane.backing}
          className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-sm text-zinc-300 tabular-nums disabled:opacity-40"
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
          className="p-2 sm:p-0 text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
        >
          <Scissors className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onParts}
          disabled={busy || reading}
          title={`${t('pro.parts', 'Split into named parts')} — ${perMinute(lane.audio.duration, CREDITS.parts)} ${t('video.credits', 'credits')}`}
          aria-label={t('pro.parts', 'Split into named parts')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRead}
          disabled={busy || reading}
          title={`${t('pro.read', 'Read the chords, key and tempo')} — ${perMinute(lane.audio.duration, CREDITS.read)} ${t('video.credits', 'credits')}`}
          aria-label={t('pro.read', 'Read the chords, key and tempo')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
        >
          {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onVoice}
          disabled={busy}
          title={t('pro.sing', 'Sing this in another voice')}
          aria-label={t('pro.sing', 'Sing this in another voice')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
        >
          <Mic2 className="w-4 h-4" />
        </button>
        {!lane.backing && (
          <button type="button" onClick={onRemove} className="p-2 sm:p-0 text-zinc-600 hover:text-red-400 ml-auto">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>

    {/* ── What the reading said ─────────────────────────────────────────
        Offered, not applied. A reading is a machine's opinion and the
        session's tempo is what every take is recorded against — moving it on
        its own would move the grid under work somebody has already done. */}
    {found && (
      <div className="border-t border-zinc-800 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {found.tempo !== null && (
            <span className="text-sm text-zinc-300 tabular-nums">
              {found.tempo} <span className="text-zinc-500">{t('pro.bpmUnit', 'bpm')}</span>
            </span>
          )}
          {found.key && (
            <span className="text-sm text-zinc-300">
              {t('pro.key', 'Key')} <span className="text-emerald-400">{found.key}</span>
            </span>
          )}
          {found.tempo !== null && (
            <button
              type="button"
              onClick={() => onUseTempo(found.tempo as number, found.key)}
              className="px-2.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-xs font-bold text-emerald-300"
            >
              {t('pro.useTempo', 'Set the session to this')}
            </button>
          )}
          {found.tempo === null && found.key === null && found.spans.length === 0 && (
            /* The workflow ran and this app recognised nothing in what came
               back. Said plainly: the answer is not wrong, it is in a shape
               nobody here knows, and that is a workflow to change rather than
               a bug to report. */
            <span className="text-xs text-amber-400 leading-snug">
              {t('pro.readUnknown', 'It read the song, but nothing in the answer was a tempo, a key or a list of chords. That is a workflow that returns something else.')}
            </span>
          )}
        </div>

        {found.spans.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {found.spans.slice(0, 48).map((span, at) => (
              <span
                key={`${span.at}-${at}`}
                title={`${span.at.toFixed(1)}s`}
                className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 tabular-nums"
              >
                {span.label}
              </span>
            ))}
            {found.spans.length > 48 && (
              <span className="text-[11px] text-zinc-600 self-center">
                +{found.spans.length - 48}
              </span>
            )}
          </div>
        )}
      </div>
    )}

    {/* ── Tone ──────────────────────────────────────────────────────────
        A tone stack, not a model of a named amplifier. Nothing here was
        measured against a Fender or a Marshall and no cabinet recording is
        loaded — those are somebody else's licensed product. What it does is
        real and it is most of what a guitar recorded on a phone needs, which
        is something to stop it sounding like a phone. The screen says so,
        because a guitarist reading "amp modeller" and hearing this would be
        right to be annoyed. */}
    {open && (
      <div className="border-t border-zinc-800 px-3 py-2.5 space-y-2">
        {/* Each control takes a whole line on a phone. Wrapping alone is not
            enough: a label and a slider that together are wider than half the
            screen still get put on one line by `flex-wrap`, and then they sit
            on top of each other. Found in Afrikaans and not in English, which
            is exactly why the probe runs in both. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 w-10">{t('pro.drive', 'Drive')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(tone.drive * 100)}
              onChange={(event) => onChange({ tone: { ...tone, drive: Number(event.target.value) / 100 } })}
              className="w-28 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
              aria-label={t('pro.drive', 'Drive')}
            />
          </label>
          <label className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 w-10">{t('pro.colour', 'Colour')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(tone.colour * 100)}
              onChange={(event) => onChange({ tone: { ...tone, colour: Number(event.target.value) / 100 } })}
              className="w-28 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
              aria-label={t('pro.colour', 'Colour')}
            />
          </label>
          <label className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 w-10">{t('pro.blend', 'Blend')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(tone.mix * 100)}
              onChange={(event) => onChange({ tone: { ...tone, mix: Number(event.target.value) / 100 } })}
              className="w-28 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
              aria-label={t('pro.blend', 'Blend')}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange({ tone: { ...tone, cabinet: !tone.cabinet } })}
            aria-pressed={tone.cabinet}
            className={`px-2.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 rounded-lg border text-xs font-bold ${
              tone.cabinet
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {t('pro.cabinet', 'Speaker')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ tone: CLEAN })}
            className="px-2.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold text-zinc-500 hover:text-white"
          >
            {t('pro.clean', 'Straight')}
          </button>
        </div>
        <Note className="text-[11px] text-zinc-600 leading-snug">{t(
            'pro.toneWhat',
            'A tone stack built here, not a model of a named amplifier: a soft clip, a tilt, and the band a guitar speaker passes. Turning the drive up changes the shape and not the level, so it cannot be pushed just because louder sounded better.',
          )}</Note>

        {/* ── A real amplifier, captured ────────────────────────────────
            The stack above is honest about being a stack. This is the other
            thing: somebody else's amplifier, measured, in the file format
            every Neural Amp Modeler plugin reads. It runs here in the
            browser — the engine is MIT and the capture is the person's own
            file, so nothing is being redistributed that is not theirs.

            It bakes into the lane rather than sitting in the graph, because
            inference is a function over samples and not an audio node. The
            recording underneath is kept, so taking the amp off is instant. */}
        <div className="pt-1.5 border-t border-zinc-800 space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{t('pro.amp', 'Amp')}</span>
            {lane.amped ? (
              <>
                <span className="px-2.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-xs font-bold min-w-0 truncate max-w-[12rem]">
                  {lane.amped.name}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ amped: undefined })}
                  className="px-2.5 py-1.5 min-h-[32px] rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  {t('pro.ampOff', 'Take it off')}
                </button>
              </>
            ) : (
              <label className={`px-2.5 py-1.5 min-h-[32px] rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold flex items-center gap-1.5 ${
                amping ? 'text-zinc-600' : 'text-zinc-300 hover:text-white cursor-pointer'
              }`}>
                {amping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {amping ? t('pro.amping', 'Running it through…') : t('pro.ampBring', 'Bring in an amp')}
                <input
                  type="file"
                  accept=".nam,application/json"
                  disabled={amping}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    // Cleared so choosing the same file twice fires again.
                    event.target.value = '';
                    if (file) void bringAmp(file);
                  }}
                />
              </label>
            )}
          </div>
          {ampFailed ? (
            <p className="text-[11px] text-amber-400 leading-snug">{ampFailed}</p>
          ) : (
            <Note className="text-[11px] text-zinc-600 leading-snug">{t(
                'pro.ampWhat',
                'A .nam capture of a real amplifier — the file any Neural Amp Modeler plugin loads. It runs on this device and is baked into the lane, so the mixdown hears exactly what you do. Your recording is kept underneath.',
              )}</Note>
          )}
        </div>
      </div>
    )}
    </div>
  );
}
