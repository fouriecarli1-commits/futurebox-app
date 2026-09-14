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
import { Activity, ArrowDownToLine, ArrowLeft, Bot, Check, Circle, Clock, Download, Gauge, Grid3x3, KeyRound, Layers, Loader2, Mic2, Music2, Plus, Scissors, Search, Sliders, Square, Timer, Trash2, Volume2, VolumeX, Wand2, Waves, X } from 'lucide-react';
import {
  FLAT_MASTER, audible, dbOf, lengthOf, mixSession, monoOf, pieceOf, readInto, readSession,
  span, startLane, windowOf, wireLane, wireMaster,
  type Lane, type Master, type Reading,
} from '../lib/session';
import { failed, separate, separateParts } from '../lib/stems';
import { done as forgetJob, keyIn, partOf, read as readSong, spansIn, tempoIn, type Span } from '../lib/analyse';
import { CLEAN, isClean, type Tone, NOTHING_OFF } from '../lib/tone';
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
  displayOf, paceOf, placeAt, sane, sayPlace, snapped,
  type CountIn, type DivisionId, type Meter, type Snap,
} from '../lib/tempo';
import { Metronome } from '../lib/metronome';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import Hint from './Hint';
import { Card, Row } from './BoothCard';
import { INK_DIM, LIT } from '../lib/boothlook';
import BoothTimeline from './BoothTimeline';
import BoothDock, { type Desk } from './BoothDock';
import BoothFx from './BoothFx';
import BoothAsk from './BoothAsk';
import { applyMove, type LaneNow, type Move } from '../lib/mixplan';
import { NO_FX, type Fx } from '../lib/fx';
import { useOwnScreen } from '../lib/fullroom';
import { useSideways } from '../lib/sideways';
import VoiceMixer, { DEFAULT_SETTINGS, settingsToForm, type VoiceSettings } from './VoiceMixer';
import Cost from './Cost';
import HowToTrain from './HowToTrain';
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
  /**
   * Which lane's controls are open under the timeline.
   *
   * One at a time, and chosen by tapping its name. Every lane's full set of
   * controls stacked down the room was the old shape, and on a phone it meant
   * the timeline — the thing the room is about — was a strip at the top of a
   * very long page. A lane is picked, its controls are there, and the
   * timeline keeps the screen.
   */
  const [picked, setPicked] = useState<string | null>(null);
  /**
   * Which desk is out from behind the bars, if any.
   *
   * Starts shut. The room opens on the timeline, which is the thing it is
   * about; every control in the app was on screen at once before, and the
   * result was a room where the work was a strip at the top.
   */
  const [deskOpen, setDeskOpen] = useState<Desk>(null);

  /* The app's own tab bar goes while this room is open. Carli: *"daai buttons
     vervang die harde buttons van die hele app, dan val daai hele bar van die
     app in die booth weg."* */
  useOwnScreen(true);

  /* Held sideways, the room lays out across rather than down: the timeline
     and the lane controls in a column on the left, the dock as a rail on
     the right. Carli: *"dan gaan die buttons weer beter werk aan die kant
     van die skerm en nie onder nie."* See `app/lib/sideways.ts`. */
  const sideways = useSideways();
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
  /**
   * The voice desk, and why it is kept beside the engine choice.
   *
   * It only means anything on the singing engine — the dials and the effects
   * are Kits' — so it is drawn only when that one is chosen. Kept out here
   * rather than inside the panel so a take that came out wrong can be tried
   * again with one thing moved, without the settings resetting underneath.
   */
  const [desk, setDesk] = useState<VoiceSettings>(DEFAULT_SETTINGS);
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
      const bus = wireMaster(ctx, master, master.gain * trim);

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
    [clickDb, clicker, clicking, context, division, hush, lanes, master, meter, trim],
  );

  const stopPlaying = useCallback(() => {
    hush();
    setPlaying(false);
  }, [hush]);

  /**
   * Put the playhead somewhere, by hand.
   *
   * There was no way to do this at all: `at` only ever moved because
   * something was playing, so the only way to hear the middle of a song was
   * to play it from the top. Carli: *"Die lyn wat deur die timeline beweeg
   * moet langer wees sodat 'n vinger hom kan vang en die klank plek kan
   * drag."* — a line you can catch is only worth catching if letting go of it
   * moves the sound.
   *
   * While something is playing it starts again from where the thumb left it,
   * which is what a transport does; stopped, it just moves the mark.
   */
  const seek = useCallback(
    (seconds: number) => {
      const where = Math.max(0, Math.min(total, seconds));
      setAt(where);
      if (playing) {
        hush();
        play(where);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, playing, hush, play],
  );

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
        /* The desk, and only on the engine it belongs to. Untouched it puts
           nothing on the form, so the request is byte for byte the one that
           was sent before this panel existed. */
        if (sings) settingsToForm(form, desk);

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
  /**
   * Take the room off one lane.
   *
   * The half a biquad cannot do. A high pass takes out rumble and a low pass
   * takes off hiss, and both are free and identical in the live path and in
   * the render — but reverb and a room are a model's job. This is the isolator
   * the booth has always had on a take in the other room, per lane.
   *
   * It replaces `audio` rather than adding a lane. A cleaned take is the same
   * take, and the cut, the level and the place in time all belong to it; a
   * second lane would leave somebody muting one of two things that are the
   * same performance.
   */
  const deRoom = useCallback(
    async (lane: Lane) => {
      const ctx = context();
      if (!ctx) return;
      setBusy(true);
      setProblem(null);
      try {
        const form = new FormData();
        /* The piece that plays, like every other paid lane action — a trimmed
           lane is not billed for what was cut off it. */
        const piece = pieceOf(lane, ctx);
        form.append('audio', encodeWav(piece), 'lane.wav');
        form.append('seconds', String(Math.round(piece.duration)));
        const token = await accessToken();
        const response = await fetch('/api/voice/clean', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        if (!response.ok) {
          const said = (await response.json().catch(() => ({}))) as { message?: string };
          setProblem(said.message ?? t('pro.deRoomFailed', 'The room could not be taken off that lane.'));
          return;
        }
        const cleaned = await readInto(await response.blob(), rate);
        if (!cleaned) {
          setProblem(t('pro.badFile', 'That file could not be read as audio.'));
          return;
        }
        /* The cut is spent: what comes back is already the piece that played,
           so `from` and `to` would trim it a second time. */
        setLanes((was) => was.map((one) => (
          one.id === lane.id
            ? { ...one, audio: cleaned, from: undefined, to: undefined, amped: undefined }
            : one
        )));
      } catch {
        setProblem(t('pro.deRoomFailed', 'The room could not be taken off that lane.'));
      } finally {
        setBusy(false);
      }
    },
    [context, rate, t],
  );

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

  /* ── Out of the room, as a file ─────────────────────────────────

     Carli, 15 September 2026: *"Onthou die volledige mixing moet uiteindelik
     'n export knoppie hê, mens moet dit kan save op 'n manier na channel en
     foon."*

     Two destinations and they are not the same journey. The channel already
     has one: "Make one song" renders the mix, puts it in the Library under
     this song's name, and the Library posts to Live — so the work there is
     to say so, not to build a second path that could disagree with the
     first about what a song is.

     The phone had none. A mix that only exists inside this app is a mix
     nobody can send to a bandmate, put on a memory stick, or upload
     anywhere this app does not reach, and that is a real limit on something
     somebody spent an evening on.

     The same `mixSession` and the same trim as "Make one song", so the file
     that lands in the phone is the file that lands in the Library and the
     file the mixer approved. A second render with its own numbers would be
     a silently different song. */
  const [saving, setSaving] = useState(false);
  const toPhone = useCallback(async () => {
    setSaving(true);
    setProblem(null);
    try {
      const mixed = await mixSession(lanes, rate, master, trim);
      if (!mixed) {
        setProblem(t('pro.mixFailed', 'The mix could not be made.'));
        return;
      }
      const blob = encodeWav(mixed);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      /* The song's own name, so a phone's downloads folder is readable.
         Anything a file system might refuse becomes a dash, and a song with
         no name at all still gets a file rather than an error. */
      const safe = (title || t('pro.untitled', 'song')).replace(/[^\p{L}\p{N} _-]/gu, '-').trim();
      link.download = `${safe || 'song'}.wav`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setProblem(t('pro.mixFailed', 'The mix could not be made.'));
    } finally {
      setSaving(false);
    }
  }, [lanes, master, rate, t, title, trim]);

  /* ── The desks ────────────────────────────────────────────────────

     Carli, 14 September 2026: *"Bo op die 4 buttons heel onder is 'n tweede
     button bar … en links en regs van dit is Track control icon en
     mix/master icon, en daaruit pop al die netjiese funksies op."*

     Each of these is a panel that already existed as a strip down the page.
     Cut into a variable rather than moved, so the JSX is unchanged and the
     only thing this commit decides is WHERE it is drawn — which is the whole
     point of the rebuild. */
  /* One lane means that lane.

     Nobody picks the only sound in the room, and until they did, every desk
     that acts on a lane opened saying "no lane is open" to somebody looking
     at exactly one. It follows the lanes rather than being set once: a
     session that drops back to a single lane picks it, and one that grows
     past a single lane leaves the choice alone. */
  useEffect(() => {
    if (lanes.length === 1 && picked !== lanes[0].id) setPicked(lanes[0].id);
  }, [lanes, picked]);

  /* ── Picking a lane, from inside the desk ───────────────────────

     Three of the six desks act on one lane: Track controls, Audio effects
     and Voice. A lane used to be picked by tapping its name in the
     timeline's gutter, which was fine while the desk was a strip under a
     timeline you could still see.

     A desk that takes the screen cannot borrow the timeline's gutter. Found
     by the probe, which tried to tap a lane with the desk open and waited
     thirty seconds for something that was not on the screen — and the same
     wait a person would have had, except they would have had to work out
     that the answer was to close the desk, tap, and open it again. Three
     actions to change which lane a fader belongs to.

     So the desks that need a lane carry the list themselves. It is the same
     `picked` either way, so tapping the gutter still works and the two
     never disagree. */
  const lanePick = lanes.length > 1 && (
    <Card
      wide
      icon={<Layers className="h-4 w-4" />}
      title={t('pro.whichLane', 'Which lane')}
      what={t(
        'pro.whichLaneWhat',
        'Everything on this desk that belongs to one sound belongs to the one picked here. It is the same choice as tapping a lane\u2019s name on the timeline — whichever you use, the other follows.',
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        {lanes.map((one) => (
          <button
            key={one.id}
            type="button"
            onClick={() => setPicked(one.id)}
            aria-pressed={picked === one.id}
            className={`min-h-[44px] max-w-full truncate rounded-xl border px-3 text-sm font-semibold ${
              picked === one.id
                ? 'border-sky-400 bg-sky-400/15 text-white'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300'
            }`}
          >
            {one.name}
          </button>
        ))}
      </div>
    </Card>
  );

  /* ── Track controls ──────────────────────────────────────

     The clock — tempo, time signature, key, click, count-in, grid — and the
     controls of whichever lane is open.

     Every one of these changes what the next take will sound like or land
     on, which is why they are one press from the timeline rather than two
     menus deep. They were one strip of eleven controls wrapping across a
     phone; a card each means the name of the thing is next to the thing,
     which a strip cannot do without a label per control and twice the
     width. */
  const trackDesk = (
    <>
      {lanePick}
      <Card
        icon={<Timer className="h-4 w-4" />}
        title={t('pro.bpm', 'Tempo')}
        what={t(
          'pro.bpmWhat',
          'Beats a minute. It sets the bar lines on the timeline, what the click counts, and where a clip lands when it snaps — so it is worth setting before the first take rather than after.',
        )}
      >
        <Row>
          <input
            type="number"
            min={SLOWEST}
            max={FASTEST}
            value={meter.bpm}
            onChange={(event) => setMeter((was) => sane({ ...was, bpm: Number(event.target.value) }))}
            className="min-h-[44px] w-20 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm tabular-nums text-zinc-100"
            aria-label={t('pro.bpm', 'Tempo')}
          />
          {/* The bars-and-beats readout moved to the desk's header, where it
              is on every desk rather than only this one — a desk covers the
              timeline, and the transport under it still plays. */}
          <span className="text-xs" style={{ color: INK_DIM }}>{t('pro.bpmUnit', 'bpm')}</span>
          {/* The Italian name for the speed, beside the number.

              On her list as "moderato", between the count-in and the capo,
              and it is not decoration: a musician asked for a tempo answers
              in these words, and a room that only counts beats a minute is
              a room built by somebody who does not. It is read from the
              number rather than set, because the number is the truth. */}
          <span className="ml-auto text-xs italic" style={{ color: LIT }}>
            {t(`pro.pace.${paceOf(meter.bpm)}`, paceOf(meter.bpm))}
          </span>
        </Row>
      </Card>

      <Card
        icon={<Grid3x3 className="h-4 w-4" />}
        title={t('pro.timeSig', 'Time signature')}
        what={t(
          'pro.timeSigWhat',
          'How many beats make a bar, and what counts as a beat. Four over four is four quarter-notes; six over eight is six eighths. It decides where the bar lines fall and how the transport reads.',
        )}
      >
        <Row>
          <select
            value={meter.beats}
            onChange={(event) => setMeter((was) => sane({ ...was, beats: Number(event.target.value) }))}
            className="min-h-[44px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
            aria-label={t('pro.beats', 'Beats in a bar')}
          >
            {[2, 3, 4, 5, 6, 7, 9, 12].map((one) => (
              <option key={one} value={one}>{one}</option>
            ))}
          </select>
          <span style={{ color: INK_DIM }}>/</span>
          <select
            value={meter.unit}
            onChange={(event) => setMeter((was) => sane({ ...was, unit: Number(event.target.value) }))}
            className="min-h-[44px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
            aria-label={t('pro.unit', 'What counts as a beat')}
          >
            {[2, 4, 8, 16].map((one) => (
              <option key={one} value={one}>{one}</option>
            ))}
          </select>
        </Row>
      </Card>

      <Card
        icon={<KeyRound className="h-4 w-4" />}
        title={t('pro.key', 'Key')}
        what={t(
          'pro.keyWhat',
          'What the song is in. Nothing here re-tunes anything — it is what a generated part is asked for in, and what the copilot is told, so a bass line comes back in the same key as the rest.',
        )}
      >
        <select
          value={meter.key}
          onChange={(event) => setMeter((was) => sane({ ...was, key: event.target.value }))}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
          aria-label={t('pro.key', 'Key')}
        >
          {KEYS.map((one) => (
            <option key={one} value={one}>{one}</option>
          ))}
        </select>
      </Card>

      <Card
        icon={<Music2 className="h-4 w-4" />}
        title={t('pro.click', 'Click')}
        what={t(
          'pro.clickWhat',
          'The metronome you record against. How often it clicks and how loud it is are here too — a click you cannot hear over the song is a click that is not doing its job.',
        )}
      >
        <button
          type="button"
          onClick={() => setClicking((was) => !was)}
          aria-pressed={clicking}
          /* The visible word is the state — "Clicking" or "Silent" — because
             a toggle that reads the same whichever way it is set tells you
             nothing. The accessible name stays "Click": a screen reader
             pairs it with the pressed state itself and "Silent, not pressed"
             is a sentence with two negatives in it. */
          aria-label={t('pro.click', 'Click')}
          className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${
            clicking
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
              : 'border-zinc-700 bg-zinc-950 text-zinc-500'
          }`}
        >
          <Music2 className="h-4 w-4" />
          {clicking ? t('pro.clickOn', 'Clicking') : t('pro.clickOff', 'Silent')}
        </button>
        {clicking && (
          <>
            <Row label={t('pro.division', 'How often it clicks')}>
              <select
                value={division}
                onChange={(event) => setDivision(event.target.value as DivisionId)}
                className="min-h-[44px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
                aria-label={t('pro.division', 'How often it clicks')}
              >
                {DIVISIONS.map((one) => (
                  <option key={one.id} value={one.id}>{one.id}</option>
                ))}
              </select>
            </Row>
            <Row label={t('pro.clickLevel', 'Click level')}>
              <input
                type="range"
                min={-40}
                max={0}
                value={clickDb}
                onChange={(event) => setClickDb(Number(event.target.value))}
                className="h-9 min-w-0 flex-1 accent-emerald-500 touch-manipulation"
                aria-label={t('pro.clickLevel', 'Click level')}
              />
              <span className="w-12 text-right text-xs tabular-nums" style={{ color: INK_DIM }}>
                {clickDb <= -40 ? t('pro.off', 'off') : `${clickDb} dB`}
              </span>
            </Row>
          </>
        )}
      </Card>

      <Card
        icon={<Clock className="h-4 w-4" />}
        title={t('pro.countIn', 'Count in')}
        what={t(
          'pro.countInWhat',
          'How many bars of click before the recording starts, so you come in on the beat instead of on the button. It needs the click switched on to count with.',
        )}
      >
        <select
          value={countBars}
          onChange={(event) => setCountBars(Number(event.target.value) as CountIn)}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
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
        {countBars > 0 && !clicking && (
          /* A count-in with the click switched off is four bars of silence and
             then a recording that has already started — which reads as the
             button not working. Said here rather than discovered. */
          <p className="text-sm leading-snug text-amber-400">
            {t('pro.silentCount', 'The count-in has nothing to count with — switch the click on.')}
          </p>
        )}
      </Card>

      <Card
        icon={<Sliders className="h-4 w-4" />}
        title={t('pro.snap', 'Snap')}
        what={t(
          'pro.snapWhat',
          'What a dragged clip lands on. Smart picks a sensible division from the tempo; a named one holds you to it; off lets a clip sit anywhere, which is what you want for a sound that is meant to be slightly late.',
        )}
      >
        <select
          value={snap}
          onChange={(event) => setSnap(event.target.value as Snap)}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
          aria-label={t('pro.snap', 'Snap')}
        >
          {SNAPS.map((one) => (
            <option key={one} value={one}>{t(`pro.snap.${one}`, one)}</option>
          ))}
        </select>
      </Card>

      {/* ── The picked lane ──────────────────────────────────

          One lane at a time, opened by tapping its name in the timeline's
          gutter. Every lane's full set of controls stacked down the room was
          the old shape and it cost the timeline the screen.

          Wide, because a lane row is a name, a fader, a pan slider, a start
          time and five actions, and half a phone is not enough for any two
          of those side by side. */}
      <Card
        wide
        icon={<Waves className="h-4 w-4" />}
        /* The lane's own name when one is open, so the card says which
           lane these controls belong to. `pro.lane` is the word "lane"
           lower-case, used mid-sentence elsewhere; a card heading needs its
           own string rather than a borrowed one. */
        title={lanes.find((one) => one.id === picked)?.name ?? t('pro.laneCard', 'The open lane')}
        what={t(
          'pro.laneWhat',
          'The controls of whichever lane you have open: its name, how loud it is, where it sits left to right, when it starts, its mute and its solo — and the five actions that cost credits, each of which says what it costs.',
        )}
      >
        {lanes.filter((one) => one.id === picked).map((lane) => (
          <LaneRow
            key={lane.id}
            lane={lane}
            lanes={lanes}
            total={total}
            at={at}
            meter={meter}
            onChange={(how) => change(lane.id, how)}
            onDeRoom={() => void deRoom(lane)}
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

        {!picked && (
          <p className="text-sm leading-snug" style={{ color: INK_DIM }}>
            {lanes.length <= 1
              ? t('pro.empty', 'Record a take or bring a file in, and it lands here as a lane of its own. Every lane keeps its own level, its own place in time and its own mute — and what you hear is what gets mixed.')
              : t('pro.pickLane', 'Tap a lane\u2019s name on the left to open its controls. Drag its block along the song to move it, or drag either end of the block to cut it.')}
          </p>
        )}
      </Card>
    </>
  );

  /* ── Mix and master ──────────────────────────────────────

     Three controls and a reading. Not a chain of processors: what is here is
     one multiplication, worked out from a measurement of the actual mix and
     applied identically to what you hear and to what comes out. Drawing a
     compressor that only ran in one of those two places would make the file
     differ from the approval, invisibly. */
  const mixDesk = (
    <>
      <Card
        icon={<Gauge className="h-4 w-4" />}
        title={t('pro.masterLevel', 'Level')}
        what={t(
          'pro.masterLevelWhat',
          'How loud the finished song is, before the ceiling. 100 is the mix as your faders left it; above that you are asking for more than the lanes give, and the ceiling below will hold it back.',
        )}
      >
        <Row>
          <input
            type="range"
            min={0}
            max={200}
            value={Math.round(master.gain * 100)}
            onChange={(event) => {
              setMaster((was) => ({ ...was, gain: Number(event.target.value) / 100 }));
              setStale(true);
            }}
            className="h-9 min-w-0 flex-1 accent-emerald-500 touch-manipulation"
            aria-label={t('pro.masterLevel', 'Level')}
          />
          <span className="w-10 text-right text-sm tabular-nums" style={{ color: INK_DIM }}>
            {Math.round(master.gain * 100)}
          </span>
        </Row>
      </Card>

      <Card
        icon={<ArrowDownToLine className="h-4 w-4" />}
        title={t('pro.ceiling', 'Ceiling')}
        what={t(
          'pro.ceilingWhat',
          'The loudest the file is allowed to get. Nothing goes above it, so nothing clips — and a shade under zero is the convention, because some players add a little of their own on the way out.',
        )}
      >
        <select
          value={master.ceilingDb}
          onChange={(event) => {
            setMaster((was) => ({ ...was, ceilingDb: Number(event.target.value) }));
            setStale(true);
          }}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm tabular-nums text-zinc-100"
          aria-label={t('pro.ceiling', 'Ceiling')}
        >
          {[-0.1, -0.3, -1, -2, -3].map((one) => (
            <option key={one} value={one}>{one} dB</option>
          ))}
        </select>
      </Card>

      <Card
        icon={<Activity className="h-4 w-4" />}
        title={t('pro.measure', 'Measure the mix')}
        what={t(
          'pro.measureWhat',
          'Plays the whole song through silently and reads its peak and its average. Everything else on this desk is worked out from that reading, which is why the master does nothing until it has one.',
        )}
      >
        <button
          type="button"
          onClick={() => void measure()}
          disabled={busy || recording || !heard.length}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-200 disabled:opacity-40"
        >
          {t('pro.measure', 'Measure the mix')}
        </button>
        {reading ? (
          <p className={`text-sm tabular-nums ${stale ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {t('pro.peak', 'Peak')} {dbOf(reading.peak).toFixed(1)} dB ·{' '}
            {t('pro.average', 'Average')} {dbOf(reading.rms).toFixed(1)} dB ·{' '}
            {t('pro.trim', 'Master')} {dbOf(reading.trim) >= 0 ? '+' : ''}
            {dbOf(reading.trim).toFixed(1)} dB
          </p>
        ) : (
          /* Not behind a mark: this one is the state of the desk, not an
             explanation of it. A master that is doing nothing has to say so
             where the eye already is. */
          <p className="text-sm leading-snug text-zinc-500">
            {t('pro.unmeasured', 'Until it is measured, the master does nothing at all — what you hear is the lanes as they are.')}
          </p>
        )}
        {/* A reading about a mix that no longer exists is worse than none. */}
        {reading && stale && (
          <p className="text-sm text-amber-400">
            {t('pro.stale', 'Something changed — measure it again.')}
          </p>
        )}
      </Card>

      {/* ── Taking things off the mix ─────────────────────────────

          Carli's mastering list had "Take off, rumble, hiss" on it and this
          desk had neither. Both are one filter and both run on the shared
          master bus, so what she hears is what the file gets — see
          `wireMaster`. */}
      <Card
        icon={<ArrowDownToLine className="h-4 w-4" />}
        title={t('pro.noRumble', 'Take the rumble off')}
        what={t(
          'pro.rumbleWhat',
          'Cuts everything under the note you set. A phone picks up traffic, a knock on the table and the singer\u2019s own breath as energy nobody hears — and every limiter ducks the whole song for it. 60 is safe on anything with a voice; go to 100 only if there is no bass.',
        )}
      >
        <select
          value={master.rumbleHz ?? 0}
          onChange={(event) => {
            setMaster((was) => ({ ...was, rumbleHz: Number(event.target.value) }));
            setStale(true);
          }}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
          aria-label={t('pro.noRumble', 'Take the rumble off')}
        >
          {[0, 40, 60, 80, 100].map((hz) => (
            <option key={hz} value={hz}>
              {hz === 0 ? t('pro.off', 'off') : `${hz} Hz`}
            </option>
          ))}
        </select>
      </Card>

      <Card
        icon={<Waves className="h-4 w-4" />}
        title={t('pro.noTop', 'Take the top off')}
        what={t(
          'pro.hissWhat',
          'Pulls the very top down, above 9 kHz. It makes a hissy phone recording easier to listen to — but it is a shelf and not a de-noiser: it cannot tell hiss from a cymbal, so far down it takes the air out of the song with the hiss.',
        )}
      >
        <select
          value={master.hissDb ?? 0}
          onChange={(event) => {
            setMaster((was) => ({ ...was, hissDb: Number(event.target.value) }));
            setStale(true);
          }}
          className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
          aria-label={t('pro.noTop', 'Take the top off')}
        >
          {[0, -2, -4, -6, -9].map((db) => (
            <option key={db} value={db}>
              {db === 0 ? t('pro.off', 'off') : `${db} dB`}
            </option>
          ))}
        </select>
      </Card>

      <Card
        icon={<Volume2 className="h-4 w-4" />}
        title={t('pro.matchLoudness', 'Match the loudness')}
        what={t(
          'pro.matchWhat',
          'Brings the finished song to the loudness streaming services play everything at, so yours is not the quiet one in somebody\u2019s playlist. It needs a measurement first.',
        )}
      >
        <button
          type="button"
          onClick={() => {
            setMaster((was) => ({ ...was, matchLoudness: !was.matchLoudness }));
            setStale(true);
          }}
          aria-pressed={master.matchLoudness}
          aria-label={t('pro.matchLoudness', 'Match the loudness')}
          className={`min-h-[44px] w-full rounded-xl border px-3 text-sm font-semibold ${
            master.matchLoudness
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
              : 'border-zinc-700 bg-zinc-950 text-zinc-500'
          }`}
        >
          {master.matchLoudness ? t('pro.matchOn', 'Matching') : t('pro.matchOff', 'Not matching')}
        </button>
      </Card>
    </>
  );

  /* ── The two overlays ───────────────────────────────────────────────

     Both of these are `fixed inset-0` sheets over the whole room, and both
     are opened from somewhere else: "Generate a part" from the Stems desk
     below, "Sing this in another voice" from the lane's own row of icons on
     the Track-controls desk.

     They were inside the Stems desk when the room was rebuilt around the six
     icons, which meant each one rendered only while that desk happened to be
     open — so the voice button on a lane set a flag and drew nothing, and the
     Voice desk's own line told people to press it. An overlay over the whole
     room cannot be scoped to one panel of it; they are mounted at the room's
     level and gated on their own state, which is what they were always gated
     on. */
  /* ── The Voice desk ─────────────────────────────────────

     It was a line of text telling you to go and press a button somewhere
     else — and, until the overlays were moved out of the Stems desk, a
     button that could not answer. A desk whose whole content is directions
     to another desk is not a desk.

     It opens the sheet itself now, for the lane that is open. With no lane
     open there is nothing to sing again, and it says which lane it would
     act on rather than making somebody find out by pressing. */
  const voiceLane = lanes.find((one) => one.id === picked);
  const voiceDesk = (
    <>
      {lanePick}
      <Card
      wide
      icon={<Mic2 className="h-4 w-4" />}
      title={t('pro.sing', 'Sing this in another voice')}
      paid
      paidSays={t('dock.paidSays', 'Some of this costs credits.')}
      what={t(
        'pro.voiceDeskWhat',
        'Keeps your timing and your phrasing and changes whose voice it is. It works on one lane at a time — the one you have open — and the sheet says what it costs and which engine it will use before anything runs.',
      )}
    >
      {voiceLane ? (
        <>
          <p className="text-sm" style={{ color: INK_DIM }}>
            {t('pro.voiceOn', 'The lane that is open')}: <span className="font-bold text-white">{voiceLane.name}</span>
          </p>
          <button
            type="button"
            onClick={() => setChanging(voiceLane)}
            disabled={busy}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 disabled:opacity-50"
          >
            <Mic2 className="h-4 w-4" />
            {t('pro.singPick', 'Pick a voice for it')}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm leading-snug" style={{ color: INK_DIM }}>
            {t('pro.voiceNoLane', 'No lane is open. Singing again is done to one lane, so open the one you mean first.')}
          </p>
          <button
            type="button"
            onClick={() => setDeskOpen('tracks')}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300"
          >
            <Sliders className="h-4 w-4" />
            {t('pro.pickOne', 'Pick a lane first')}
          </button>
        </>
      )}
      </Card>
    </>
  );

  const boothOverlays = (
    <>
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
                <HowToTrain />
                {/* ── The desk ──────────────────────────────────────────

                    Only on this engine: every dial and every effect is Kits',
                    and drawing them beside the speech engine would offer
                    controls that go nowhere.

                    Below the voice rather than above it, because the order is
                    the order of the decision — which voice first, then how
                    much of it. */}
                <VoiceMixer settings={desk} onChange={setDesk} />
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

    </>
  );

  /* ── The Stems desk ────────────────────────────────────

     One sound becoming more than one — which is either taking a lane apart
     or asking for a part that was never played.

     Asking for one used to sit in the strip at the foot of the effects desk,
     beside recording and mixing down, because that strip was once the whole
     room's bottom bar. Behind an icon it was in the wrong drawer: nothing
     about generating a bass line is an effect, and the sheet it opened
     belonged to this desk, so pressing it there set a flag and drew nothing.

     Taking a lane apart stays on the lane's own row, where its level, its
     place and its bin already are — it is a thing done to one lane, and the
     row is where a lane's own actions live. Said here, because a desk called
     Stems that did not mention splitting would send people looking. */
  const stemDesk = (
    <>
      <Card
        icon={<Music2 className="h-4 w-4" />}
        title={t('part.title', 'Generate a part')}
        paid
        paidSays={t('dock.paidSays', 'Some of this costs credits.')}
        what={t(
          'pro.partWhat',
          'Eight bars of something this song does not have \u2014 a bass line, a pad, a shaker \u2014 asked for in the key and tempo the clock is set to, and landing as a lane of its own.',
        )}
      >
        <button
          type="button"
          onClick={() => setPartOpen(true)}
          disabled={busy || recording || making}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 disabled:opacity-50"
        >
          <Music2 className="h-4 w-4" />
          {t('part.title', 'Generate a part')}
        </button>
      </Card>

      <Card
        icon={<Scissors className="h-4 w-4" />}
        title={t('pro.takeApart', 'Take a lane apart')}
        paid
        paidSays={t('dock.paidSays', 'Some of this costs credits.')}
        what={t(
          'pro.takeApartWhat',
          'Splitting belongs to one lane, so it lives on that lane\u2019s own row: open it under Track controls. The scissors lift the voice off it \u2014 singing and music become two lanes \u2014 and the layers split it into named parts: drums, bass, and the rest.',
        )}
      >
        <button
          type="button"
          onClick={() => setDeskOpen('tracks')}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300"
        >
          <Sliders className="h-4 w-4" />
          {picked
            ? t('pro.toLane', 'Open the lane\u2019s controls')
            : t('pro.pickOne', 'Pick a lane first')}
        </button>
      </Card>
    </>
  );

  /* ── The copilot's desk ────────────────────────────────────────────

     Carli: *"Copilot pop op en vra dat persoon 'n mixing voorstel en copilot
     kan die mixing verander volgens die vraag en voorstel."*

     What it is told is the desk — every lane's name, fader, place and which
     effects are on, and the master's measurement where there is one. NOT the
     audio: sending a mix to a model to listen to is a different and far more
     expensive product, and confident advice about a cymbal nobody heard is
     worse than no advice. The panel says as much before the box.

     What comes back is proposals, applied only when she presses the button.
     A mix is somebody's taste, and eight faders moving while they listen
     would be indistinguishable from a bug. */
  const deskNow: LaneNow[] = lanes.map((one) => ({
    id: one.id,
    name: one.name,
    gain: one.gain,
    pan: one.pan ?? 0,
    muted: one.muted,
    fx: Object.keys(one.fx ?? {}),
  }));
  const askDesk = (
    <Card
      wide
      icon={<Bot className="h-4 w-4" />}
      title={t('dock.ai', 'Copilot')}
      what={t(
        'pro.askWhat',
        'Say what is wrong with the mix in your own words — "die stem is te sag", "die dromme oorheers" — and it moves the faders. It is shown every lane’s name, level and place, and the master’s reading if you have taken one, and it says what it is about to change before it changes it.',
      )}
    >
    <BoothAsk
      lanes={deskNow}
      reading={
        reading
          ? `peak ${dbOf(reading.peak).toFixed(1)} dB, average ${dbOf(reading.rms).toFixed(1)} dB`
          : undefined
      }
      onApply={(moves: readonly Move[]) => {
        /* One `setLanes`, not one per move: a loop of state updates would
           make the room re-render between faders and the session's
           two-second save would write a half-applied mix if anything threw
           in the middle. */
        setLanes((was) =>
          was.map((lane) => {
            const move = moves.find((one) => one.laneId === lane.id);
            return move ? { ...lane, ...applyMove(move, lane) } : lane;
          }),
        );
      }}
    />
    </Card>
  );

  /* The transport strip: record, the way to the words, and mixing down.

     It keeps its own place at the foot of the effects panel rather than
     becoming a seventh button, because the one thing in it that is not a
     control — "Mix it down", the button this whole room exists to press —
     must not end up behind an icon. */
  const makeDeskTail = (
    <>
      {/* ── The transport ───────────────────────────────────────────────── */}
      {/* Both bottom strips carry their own background. They are pinned while
          the lane list scrolls underneath, and a transparent bar over moving
          content is a bar you can read the lanes through — which on a phone,
          where the list is long and the strip is close, looks like the
          controls have collided. */}
      {/* No background, no border, no padding of its own: it is inside a
          card now, and a card inside a card is a box somebody has to look
          through. It kept the room's chrome from when it was a pinned strip
          at the foot of the screen. */}
      <div className="flex flex-wrap items-center gap-2">
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

        {/* ── The way to the words ─────────────────────────────────────────

            Carli: "wanneer mens record moet daar op 'n manier 'n baie meer
            duidelike riglyn wees hoe om te kom by die plek waar mens saam met
            die woorde kan record en dan die opsie om saam met die AI stem te
            record."

            Both of those exist, and both are in The Booth, one step back: the
            words move with the song there, and "Sing next to the AI voice"
            takes the singer off the record and puts it in your headphones
            without leaving it in what you keep.

            This room has neither and never said so. Somebody who came here to
            sing — and this is the room with the big green Record button — had
            no way to know they were in the wrong one, and the way out was a
            "Back" that named nothing.

            The button is offered next to Record rather than in a note, because
            what is wanted at that moment is not an explanation, it is the
            other room.

            Not while a take is running. Leaving mid-recording would throw the
            take away, and a button that does that beside "Stop recording" is
            a trap. */}
        {!recording && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Mic2 className="w-4 h-4" />
            {t('pro.toWords', 'Sing with the words')}
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

        {/* Asking for a part that was never played is on the Stems desk, with
            the sheet it opens — not here. It sat beside bringing a file in
            while this strip was the room's whole bottom bar; once the room
            went behind six icons, it was a button on one desk opening a sheet
            that belonged to another, which drew nothing at all. */}
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

        {/* Beside it, because it is the same decision one step later: the
            song is made, and now it has to go somewhere. */}
        <button
          type="button"
          onClick={() => void toPhone()}
          disabled={busy || saving || recording || !heard.length}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-sm font-bold text-zinc-200 flex items-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {t('pro.toPhone', 'Save to my phone')}
        </button>
        <Hint>
          {t(
            'pro.toPhoneWhat',
            'Renders the same mix as "Make one song" and hands it to your phone as a WAV — every lane, its levels, its cuts and its effects, in one file. It costs nothing, nothing leaves the device, and the room stays open.',
          )}
        </Hint>
        <Hint>
          {t(
            'pro.toChannelWhat',
            'To put it in your channel: press "Make one song". It lands in your Library under this song\u2019s name, and the post button there sends it to Live. It goes that way rather than straight from here so that what people hear in the room is the same file your Library holds.',
          )}
        </Hint>
        {/* ── What is in the other room, said once ──────────────────────

            The button above is the way there; this is what is there, because
            "Sing with the words" does not say that the AI voice is in the same
            place, and that is the half she keeps saying matters most.

            And it says the lanes are safe. Somebody who has recorded four
            takes will not press a button that leaves the room unless they are
            told they can come back — which they now can, since the session is
            written down. A true sentence here is what makes the button
            usable. */}
        {/* ── One line printed, the rest behind the mark ─────────────

            These were two full paragraphs under the buttons. I put both
            behind marks when this desk was rebuilt and that was one step
            too far: they are not explanations of a control, they are the
            two things somebody needs to know *before* pressing a button
            that leaves the room — that the AI voice is where they are
            going, and that four takes will still be here when they come
            back. A sentence nobody reads before pressing is a sentence
            that was not there.

            So the short form is printed and the long form is behind the
            mark, which is the shape the rest of the app uses: enough on
            the screen to decide with, the rest for whoever wants it. */}
        <p className="w-full text-[11px] leading-snug" style={{ color: INK_DIM }}>
          {t('pro.wordsWhereShort', 'The words and the AI voice are in The Booth. Your lanes are saved.')}
          <Hint className="ml-1">
          {t(
            'pro.wordsWhere',
            'The words on screen, and the AI voice in your ear to sing next to, are in The Booth — the room this one opened from. Your lanes here are saved, so you can go and come back.',
          )}
          </Hint>
        </p>
        <p className="w-full text-[11px] leading-snug" style={{ color: INK_DIM }}>
          {heard.length
            ? t('pro.keepWhatShort', 'Every lane you can hear becomes one song, in your Library.')
            : t('pro.keepNone', 'Record a take or bring audio in, and this makes one song out of all of it.')}
          <Hint className="ml-1">
          {heard.length
            ? t(
                'pro.keepWhat',
                'Every lane you can hear becomes one song, with its levels, cuts and tone baked in. It lands in your Library and this room closes.',
              )
            : t('pro.keepNone', 'Record a take or bring audio in, and this makes one song out of all of it.')}
          </Hint>
        </p>
      </div>
    </>
  );

  /* ── The rack, for the lane that is open ────────────────────────────

     Per lane, not per session. An effect is a property of a sound: a
     compressor that belongs to the room would squash the guitar because the
     voice needed it, which is the opposite of having lanes at all.

     Nothing to rack when no lane is picked, and that is said rather than
     shown as an empty panel — a rack with no lane under it looks broken. */
  const fxLane = lanes.find((one) => one.id === picked);
  const fxDesk = (
    <>
      {lanePick}
      {/* ── Recording, and mixing down ───────────────────────────

          First card on the desk, and wide, because "Mix it down" is the
          button this whole room exists to press. It was at the foot of a
          panel you had to scroll to reach. */}
      <Card
        wide
        icon={<Circle className="h-4 w-4" />}
        title={t('pro.takeAndMix', 'Record, and mix it down')}
        what={t(
          'pro.takeAndMixWhat',
          'A take records against whatever the click and the count-in are set to, and lands as a lane of its own. Mixing down renders every lane through everything on this desk — what you hear is what comes out.',
        )}
      >
        {makeDeskTail}
      </Card>

      {fxLane ? (
        <Card
          wide
          icon={<Wand2 className="h-4 w-4" />}
          title={fxLane.name}
          what={t(
            'fx.rackWhat',
            'The rack for this lane. Everything in it runs in your ears and in the file alike, and each one draws what it is doing to the sound rather than only naming it.',
          )}
        >
          <BoothFx
            fx={fxLane.fx ?? NO_FX}
            onChange={(next: Fx) => change(fxLane.id, { fx: next })}
          />
        </Card>
      ) : (
        <Card
          wide
          icon={<Wand2 className="h-4 w-4" />}
          title={t('fx.rack', 'The effects rack')}
        >
          {/* Not behind a mark: with no lane open this is the state of the
              desk, and the one thing somebody has to do next. */}
          <p className="text-sm leading-snug" style={{ color: INK_DIM }}>
            {t(
              'fx.pickFirst',
              'Tap a lane\u2019s name on the timeline first. An effect belongs to a sound, not to the room \u2014 a compressor the whole session shared would squash the guitar because the voice needed it.',
            )}
          </p>
          <button
            type="button"
            onClick={() => setDeskOpen(null)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300"
          >
            <Waves className="h-4 w-4" />
            {t('fx.toTimeline', 'Back to the timeline')}
          </button>
        </Card>
      )}
    </>
  );


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

       The number lives in one place now — the `below-tabs` rule in
       `globals.css` — because this is not one room's problem: eleven
       full-screen overlays sit below that bar, and The Booth had two controls
       under it as well. `check:belowtabs` requires every one of them to carry
       the rule. */
    /* `data-booth`: the room's own fixed dark palette, which does not follow
       the theme. See the block at the foot of `globals.css` for why that is
       the requirement in here and a bug everywhere else — and for the fault
       it repairs, which is that `bg-zinc-950` resolves to near-WHITE in the
       light theme the app ships, so this room has been a white one.

       No `barClearance` any more, and the room does not scroll. The app's
       own tab bar is hidden while this is open (`useOwnScreen`), so there is
       nothing at the foot to clear; and the room is a column that fills the
       screen exactly — header, the timeline taking what is left, and the two
       bars pinned under it. Whatever needs to scroll scrolls inside itself. */
    <div
      data-booth
      className={`fixed inset-0 z-[70] bg-zinc-950 flex overflow-hidden ${
        sideways ? 'flex-row' : 'flex-col'
      }`}
    >
      {/* Everything but the dock, in a column of its own. In portrait that
          column is the room; sideways it is the left of it, and the rail
          takes the right. One wrapper rather than two layouts: the header,
          the timeline and the lane controls do not care which way the
          device is held, and giving them a second copy that does is how the
          two come to disagree about something. */}
      {/* Hidden while a desk is open, so the desk gets the screen.

          `hidden` and not unmounted: the timeline holds a scroll position, a
          picked lane and a drag in progress, and unmounting it would throw
          all three away every time somebody opened a control to change what
          they were looking at. This is the one place in the room where the
          difference is visible, so it is written down rather than left to
          whoever next reads the line. */}
      <div className={`min-w-0 flex-1 flex-col overflow-hidden ${deskOpen ? 'hidden' : 'flex'}`}>
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


      {/* ── The timeline ───────────────────────────────────────────────

          Carli, 14 September 2026: *"Die timeline van die verskillende layers
          moet reg by en teen mekaar wees."*

          One shared axis for the ruler and every lane, so alignment is a
          property of the layout rather than something each row has to get
          right — see the long note at the top of `BoothTimeline`. The clips
          are dragged, cut and dragged again with a thumb, and the playhead
          has a head big enough to catch. */}
      <BoothTimeline
        lanes={lanes}
        total={total}
        at={at}
        meter={meter}
        snap={snap}
        /* The sections, from whichever lane has been read — in practice the
           song, which is the only lane that has sections to have. */
        spans={Object.values(known).flatMap((one) => one.spans ?? [])}
        onSeek={seek}
        onChange={(id, how) => change(id, how)}
        onPick={(id) => setPicked((was) => (was === id ? null : id))}
        picked={picked}
      />


      {problem && <p className="text-sm text-amber-400 leading-snug px-5 pb-2">{problem}</p>}

      </div>

      {/* ── The two bars, and whatever is out from behind them ────────

          The app's own tab bar is gone while this room is open — see
          `useOwnScreen` above and `app/lib/fullroom.ts`. The way out is the
          back button at the top left, which was already there. */}
      <BoothDock
        open={deskOpen}
        onOpen={setDeskOpen}
        playing={playing}
        onPlay={() => (playing ? stopPlaying() : play(at))}
        onSkip={(by) => seek(at + by)}
        place={displayOf(at, sane(meter))}
      >
        {deskOpen === 'tracks' && trackDesk}
        {deskOpen === 'mix' && mixDesk}
        {deskOpen === 'stems' && stemDesk}
        {deskOpen === 'effects' && fxDesk}
        {deskOpen === 'voice' && voiceDesk}
        {deskOpen === 'ai' && askDesk}
      </BoothDock>

      {/* Over the whole room, and so mounted at the room's level rather than
          inside any one desk — see `boothOverlays`. */}
      {boothOverlays}
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
  onDeRoom,
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
  /** Take the reverb and the room off this lane. Costs credits; see `deRoom`. */
  onDeRoom: () => void;
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

  /* What of the lane plays, and whether it has been cut at all.

     The cutting itself — the pointer drags, the edge handles and the readout
     that moved with them — is on the timeline above now, on the one axis
     every lane shares. These numbers stay because the rest of this row reads
     them: the length it prints, and whether to say the lane is cut. */
  const window_ = windowOf(lane);
  const played = lengthOf(lane);
  const whole = (lane.amped?.audio ?? lane.audio).duration;
  const cut = window_.from > 0.01 || window_.to < whole - 0.01;

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

  /* The waveform was painted here, by an effect that also drew the bar
     lines inside it and the playhead over them. All three are on the shared
     timeline now — one axis every lane uses, which is what makes a ruler
     above them honest. See the note where the strip used to be. */

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

      {/* ── Where the waveform used to be ─────────────────────────────

          The lane's own strip — its canvas and the two edges that cut it —
          lived here, and is now the clip on the shared timeline above.

          It had to move rather than be duplicated. This strip sat between
          this row's name column and this row's buttons, so its
          pixels-per-second was its own; the bar lines were drawn *inside* the
          waveform with a note saying a ruler across the top could not be
          trusted, because "bar 2 on the ruler sat nowhere near bar 2 in the
          audio". That note was right about this layout and is the reason
          there is a different one. Carli: *"Die timeline van die verskillende
          layers moet reg by en teen mekaar wees."*

          Two places to cut the same lane would also be two places to
          disagree about where the cut is. */}
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
          /* A width, not `flex-1`, and this is the second half of the same bug.
 
             Taking `w-32` off this block let it size to its contents, which
             fixed the box. But the slider inside it was `flex-1` — that is
             `flex: 1 1 0%`, a basis of nothing — so a container measured by
             its contents measured this one as **zero wide**. The block came
             out the width of "L", a gap and "R", and the slider painted
             straight across the R and into the start-time field beside it.
 
             Carli, looking at the fix: "daar is steeds iets bo oor die R. dit
             lyk soos 'n 0." It was the slider, over the R, over the 0.
 
             A stated width contributes itself to the measurement, which is
             what a content-sized box needs from every child in it. */
          className="w-24 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
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
        {/* ── What the row of icons does, before it is pressed ────────────

            Carli: "daar moet pop out vraagtekens wees by die skêr, en die
            layer, en die sirkel. voordat mense daarop click moet hulle weet
            wat dit gaan doen."

            Every one of these carries a `title`, which on a phone is nothing
            at all — there is no pointer to hover with, so on the device most
            of them are used the icons are unlabelled and two of them spend
            money.

            One mark for the row rather than one beside each. Five more marks
            in a row that only just fits would be five more things to hit by
            accident, and the question a person actually has is not "what is
            this one" but "what are these". */}
        <Hint className="ml-1">
          {t(
            'pro.whatRow',
            'Scissors: split the voice off this lane, so the singing and the music become two lanes. Layers: split it into named parts — drums, bass, and the rest. Magnifier: read the chords, key and tempo. Microphone: sing this lane in another voice. Bin: remove the lane. The first four cost credits and each one says how many; the bin costs nothing.',
          )}
        </Hint>
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
        {/* ── Taking things off, before shaping what is left ─────────────

            Carli: "by die booth moet daar oor die algemeen ook reverb, echo en
            background cleaners wees."

            Above the tone stack because that is the order it runs in, and the
            order is not a preference: driving a take that still has desk
            rumble in it drives the rumble too.

            Two switches and not four. A rumble filter and a hiss filter are
            one biquad each and sound identical in the live path and in the
            render — which is the law `lib/session.ts` exists to keep. A gate
            has to look at the samples and Web Audio has no node for it; doing
            it only in the render would make the file differ from what was
            approved, invisibly. So the free half is here, and the rest is the
            isolator beside it, which says what it costs. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            {t('pro.cleanUp', 'Take off')}
            <Hint>{t(
              'pro.cleanWhat',
              'Rumble is a high pass at 80 Hz — desk knocks, footsteps, and the low end a phone microphone invents. Hiss is a low pass at 12 kHz, which takes the fizz off a small microphone without dulling a voice. Both run before the tone stack, because driving a take that still has rumble in it drives the rumble too. Neither costs anything: they happen on this device.',
            )}</Hint>
          </span>
          {([
            ['rumble', t('pro.rumble', 'Rumble')],
            ['hiss', t('pro.hiss', 'Hiss')],
          ] as const).map(([key, label]) => {
            const on = !!lane.clean?.[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({
                  clean: { ...(lane.clean ?? NOTHING_OFF), [key]: !on },
                })}
                className={`min-h-[38px] rounded-lg border px-3 py-2 text-xs font-bold ${
                  on
                    ? 'border-emerald-500 bg-emerald-500/15 text-white'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            );
          })}
          {/* The half a filter cannot do. Reverb and a room are a model's job,
              not a biquad's, and this is the isolator the booth already has —
              per lane now, rather than only on a take in the other room. */}
          <button
            type="button"
            onClick={onDeRoom}
            disabled={busy}
            className="min-h-[38px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-40"
          >
            {t('pro.deRoom', 'Take the room off')}
          </button>
          <Cost rate={CREDITS.clean} seconds={lane.audio.duration} />
        </div>

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
