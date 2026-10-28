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
 * It began as deliberately not a digital audio workstation, and the reason
 * still holds: pretending to be one by drawing knobs that do nothing would be
 * worse than leaving them out. What is here is real — every fader, every
 * mute, every offset, every effect is in the file that comes out the other
 * end, and `app/lib/session.ts` decides that once so the mixer and the
 * mixdown can never disagree about what you are listening to.
 *
 * On 22 October 2026 the owner asked for it to work and look exactly like a
 * studio, with every function there. So it now has a studio's transport row
 * (`BoothTransport`), markers, copy and paste, a mixer with every lane side
 * by side, a playhead that moves without re-working the room every frame
 * (`lib/liveclock.ts`), its own pedals and amps (`lib/pedals.ts`), and a
 * hum that is read note by note onto a piano roll (`HumRoll`). What it still
 * does not have, and says so rather than drawing it: automation lanes, bus
 * routing, and a level meter on every lane — the master has the scope.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowUp, Bot, Check, ChevronDown, Circle, Clock, Download, Gauge, Grid3x3, Guitar, HelpCircle, KeyRound, Layers, Link2, Link2Off, Loader2, Menu, Mic2, Music2, Play as PlayIcon, Plus, Redo2, Repeat, RotateCcw, Scissors, Search, Settings, Sliders, Square, SquareSplitHorizontal, Star, Timer, Trash2, Undo2, Volume2, VolumeX, Wand2, Sparkles, Waves, X } from 'lucide-react';
import {
  FLAT_MASTER, MOST_REPEATS, audible, carveLane, dbOf, fadedCopy, smoothedCopy, lengthOf, mixSession, monoOf, passesOf, pieceOf,
  playsOf, readInto, readSession, repeatOf, span, startLane, windowOf, wireLane, wireMaster,
  type Carved, type Lane, type Master, type Reading,
} from '../lib/session';
import { failed, separate, separateParts } from '../lib/stems';
import { done as forgetJob, keyIn, partOf, read as readSong, spansIn, tempoIn, type Span } from '../lib/analyse';
import { CLEAN, isClean, type Tone, NOTHING_OFF } from '../lib/tone';
import { ampMaker, ampName, through } from '../lib/nam';
import {
  LICENCES, UNKNOWN, licenceOf, mayBeSold, needsCredit, type LicenceId,
} from '../lib/amplicence';
import {
  AMP_MAX_BYTES, ampId, ampJson, favouriteAmp, forgetAmp, loadAmps, rememberAmp, setAmpLicence, setAmpMaker,
  STOCK_AMPS,
  type Amp,
} from '../lib/amps';
import { accessToken } from '../lib/cloud';
import AmpCatalogue from './AmpCatalogue';
import VoicePicker from './VoicePicker';
import type { VoiceState } from './VoiceLab';
import { CREDITS, creditsSaid, perMinute } from '../lib/credits';
import { decodeAt, shapeOf } from '../lib/takes';
import { forgetSession, keepSession, keptSession, soundOf } from '../lib/keepsession';
import { takenLoop, waitingLoop } from '../lib/jamhandover';
import { roundsFor } from '../lib/looper';
import { encodeWav, type Depth } from '../lib/wav';
import { encodeMp3, kbpsUnder, mp3Bytes } from '../lib/mp3';
import { type Limit } from '../lib/squeeze';
import FileSize from './FileSize';
import { zipOf } from '../lib/zip';
import BoothScope from './BoothScope';
import { whatsIn, type Heard as PieceHeard } from '../lib/whatsin';
import { transitionsIn } from '../lib/transitions';
import { midiBlob, midiFor, type Source } from '../lib/midi';
import { LAYOUTS, layoutById, type Layout } from '../lib/channels';
import { BAR, ROW2, STACK } from '../lib/benchbar';
import { knownLatency } from '../lib/mixdown';
import { loads } from '../lib/nam';
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
import SaysDone from './SaysDone';
import { EDGE, INK, INK_DIM, LIT, PANEL } from '../lib/boothlook';
import BoothTimeline from './BoothTimeline';
import BoothTransport from './BoothTransport';
import BoothDock, { type Desk } from './BoothDock';
import BoothFx from './BoothFx';
import BoothAsk from './BoothAsk';
import { applyMove, type LaneNow, type Move } from '../lib/mixplan';
import { canMove, move } from '../lib/laneorder';
import { NO_FX, type Fx } from '../lib/fx';
import { trackPitchSoftly, tune, type TuneHow } from '../lib/tuner';
import { useOwnScreen } from '../lib/fullroom';
import { useSideways } from '../lib/sideways';
import { useAtDesk } from '../lib/atdesk';
import VoiceMixer, { DEFAULT_SETTINGS, settingsToForm, type VoiceSettings } from './VoiceMixer';
import Cost from './Cost';
import HowToTrain from './HowToTrain';
import SingVoices from './SingVoices';
import Note from './Note';
import { attach } from '../lib/workfile';
import {
  BAR_CHOICES, INSTRUMENTS, bodyFor, instrumentBy, secondsFor,
  type Bars, type Family,
} from '../lib/parts';
import { songCost, type SongEngine } from '../lib/credits';
import { songEngine } from '../lib/engines';
import { makeHistory } from '../lib/undo';
import { liveClock } from '../lib/liveclock';
import { heardIn, inKey, keyOf, notesIn, scaleNotes, snapTo, GRIDS, type GridId, type Heard, type HumNote } from '../lib/humnotes';
import HumRoll, { nameOf } from './HumRoll';
import { downloadBlob, safeFilename } from '../lib/library';
import { GROUPS, PLAIN, VOICES, renderHum, voiceById, type Tweak, type VoiceId } from '../lib/huminstrument';
import AmpFace from './AmpFace';

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

/**
 * A fingerprint of one recording, the same for the same sound.
 *
 * For the bounce's charge reference (see `signature`): two lanes with the
 * same id can hold different sound, and only the samples know. Taken from
 * the sound itself and not from the buffer object, because reopening the
 * booth decodes every saved lane into a NEW buffer — a tag counted per object
 * gave the same unchanged mix a new reference after a reload, and the second
 * "Save to my phone" was charged again (found in review, 15 October 2026).
 * Every 997th sample of every channel, plus the length, rate and channel
 * count: cheap on a three-minute take, and a changed sound changes it.
 * Cached weakly, so a recording thrown away is not kept alive by it.
 */
const SOUNDS = new WeakMap<AudioBuffer, string>();
function soundTag(buffer: AudioBuffer): string {
  const known = SOUNDS.get(buffer);
  if (known !== undefined) return known;
  let hash = 2166136261;
  const mix = (n: number): void => {
    hash ^= n;
    hash = Math.imul(hash, 16777619) >>> 0;
  };
  mix(buffer.length);
  mix(buffer.sampleRate);
  mix(buffer.numberOfChannels);
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i += 997) mix(Math.round(data[i] * 32767) & 0xffff);
  }
  const tag = hash.toString(36);
  SOUNDS.set(buffer, tag);
  return tag;
}

/**
 * How long the piece of a lane that a paid action sends actually is.
 *
 * `pieceOf` sends the cut window once — not the whole recording, and not the
 * repeats — and that is what the route bills. The prices on the buttons read
 * `lane.audio.duration`, the whole take, so a lane trimmed to its chorus said
 * three minutes' worth of credits and was charged for thirty seconds. Found
 * on 15 October 2026. One function, so the label and the bill are the same
 * arithmetic.
 */
function pieceSeconds(lane: Lane): number {
  const window = windowOf(lane);
  return Math.max(0, window.to - window.from);
}

/** The three qualities a stem or a mix can be written in. See `Depth` in lib/wav.ts. */
const DEPTHS: readonly { readonly id: Depth; readonly label: readonly [string, string]; readonly note: readonly [string, string] }[] = [
  { id: 16, label: ['pro.depth16', '16-bit'], note: ['pro.depth16Note', 'CD quality. The smallest file, and it plays anywhere.'] },
  { id: 24, label: ['pro.depth24', '24-bit'], note: ['pro.depth24Note', 'Studio quality, for handing to somebody who will mix it again. Half as big again.'] },
  { id: 32, label: ['pro.depth32', '32-bit float'], note: ['pro.depth32Note', 'Nothing rounded and nothing clipped: a peak over full is kept to be turned down later. Twice the size of 16-bit.'] },
];

/**
 * The song's key as the rack's root: "A Minor" is A, "C# Major" is C#, and
 * the spellings the rack does not use (D#, G#, A#, Db, Gb) are turned into
 * the ones it does. Nothing for a key it cannot read.
 */
function rootOf(keyName: string | undefined): string | null {
  const root = (keyName ?? '').trim().match(/^([A-Ga-g])\s*([#b♯♭]?)/);
  if (!root) return null;
  const spelled = `${root[1].toUpperCase()}${root[2] === '♯' ? '#' : root[2] === '♭' ? 'b' : root[2]}`;
  const same: Record<string, string> = { 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb', Db: 'C#', Gb: 'F#', Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' };
  const named = same[spelled] ?? spelled;
  return (KEYS as readonly string[]).includes(named) ? named : null;
}

export default function ProBooth({
  title,
  songId,
  backing,
  bpm,
  keyName,
  onKeep,
  onClose,
}: {
  title: string;
  /**
   * The song's own tempo and key, so the rack opens on them rather than on
   * 120 and C. Seen on 24 October 2026: a 96 BPM song in A minor opened a
   * studio reading "120 bpm · C", and every generated part and the click
   * would have followed the wrong number until somebody noticed.
   */
  bpm?: number;
  keyName?: string;
  /**
   * The song's own id, which is what the saved session is filed under.
   *
   * Optional because the probe page has no library song to give; without
   * it the title stands in, as it always did. See `lib/keepsession.ts` for
   * the song whose takes were written over before this was passed.
   */
  songId?: string;
  /** The song, as the first lane. Everything else is placed against it. */
  backing: AudioBuffer | null;
  /**
   * The finished mix, and the two things `keepMix` files beside it.
   *
   * This room says them itself rather than the room that opened it. It was
   * `onKeep(mixed)`, and The Booth filled the other two from ITS state: a
   * Booth whose AI double was turned up credited "AI voice, kept under
   * yours" on a lanes mix that never had it, and filed The Booth's last take
   * as this song's take — a recording that is not in the mix at all. Found
   * on 15 October 2026 going through every function in the booth.
   */
  onKeep: (mixed: Blob, doubled: boolean, take: Blob) => void | Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const { lang, t } = useLang();
  /** Which song the saved session belongs to. See `lib/keepsession.ts`. */
  const song = useMemo(() => ({ id: songId, title }), [songId, title]);

  /* The booth itself. It is a full-screen overlay above the room, and until
     now it was not a layer at all — so Back closed the room underneath it.
     It closes through `leave`, which ends a running take and writes it down
     first; see there. The ref is because `leave` is made further down. */
  const leaveRef = useRef<() => void>(onClose);
  useBackLayer(true, () => leaveRef.current());

  const [lanes, setLanes] = useState<Lane[]>([]);
  /* A generated part has no words, so it goes to whichever engine the music
     route says is on — and the two are priced differently. */
  const [partEngine, setPartEngine] = useState<SongEngine>('eleven');
  useEffect(() => { void songEngine().then(setPartEngine); }, []);

  /**
   * Taking it back.
   *
   * Kept in a ref rather than in state because the history is not drawn —
   * only what it can offer is, and that is `undoWhat`/`redoWhat` below,
   * which are set every time it changes. A history in state would rebuild
   * the whole room on every remembered step, including the ones that happen
   * while a finger is still on the screen.
   *
   * `lanesNow` exists for the same reason and is the harder half: `undo`
   * has to hand the CURRENT lanes to redo, and a callback that closed over
   * `lanes` would hand it whatever they were when the button was last
   * rendered. The ref is written on every render, so it is never the stale
   * one.
   */
  const history = useRef(makeHistory<Lane>());
  const lanesNow = useRef<Lane[]>([]);
  lanesNow.current = lanes;
  const [undoWhat, setUndoWhat] = useState<string | null>(null);
  const [redoWhat, setRedoWhat] = useState<string | null>(null);
  const saidSo = useCallback(() => {
    setUndoWhat(history.current.undoable());
    setRedoWhat(history.current.redoable());
  }, []);
  /**
   * Put the lanes as they are on the stack, then change them.
   *
   * Before and not after: the stack holds what to go BACK to, so it has to
   * be read while it is still true. Every change that cannot be undone by
   * dragging an edge goes through here — see `check:undo`, which reads this
   * file and says which ones do not.
   */
  const remember = useCallback((what: string) => {
    history.current.remember(what, lanesNow.current);
    saidSo();
  }, [saidSo]);

  /**
   * Back one step, and forward again.
   *
   * `setStale(true)` on both, because the mix on file was rendered from
   * lanes that are no longer the lanes: a bounce still offering the old
   * file after an undo is the same lie as one offering it after a fade.
   */
  const stepBack = useCallback(() => {
    const step = history.current.undo(lanesNow.current);
    if (!step) return;
    setLanes([...step.lanes]);
    setStale(true);
    saidSo();
  }, [saidSo]);
  const stepForward = useCallback(() => {
    const step = history.current.redo(lanesNow.current);
    if (!step) return;
    setLanes([...step.lanes]);
    setStale(true);
    saidSo();
  }, [saidSo]);
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
  /* A loop sent from the jam room arrived as a lane — see below. */
  const [jamArrived, setJamArrived] = useState(false);
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
  const [meter, setMeter] = useState<Meter>(() => sane({
    ...DEFAULT_METER,
    bpm: bpm && Number.isFinite(bpm) ? bpm : DEFAULT_METER.bpm,
    key: rootOf(keyName) ?? DEFAULT_METER.key,
  }));
  /* The markers on the ruler, in seconds, kept in order. Saved with the
     session — a marker that is gone after a reload is not a marker. */
  const [markers, setMarkers] = useState<number[]>([]);
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
  /* Waves or spectrograms on every lane. The owner, 26 October 2026: *"Kan
     ons ook 'n spectogram in ons probooth en video editor in bou?"* Kept
     on the device, because somebody who mixes by eye wants it every time. */
  const [laneView, setLaneView] = useState<'wave' | 'spectrum'>(() => {
    try { return window.localStorage.getItem('futurebox.booth.view') === 'spectrum' ? 'spectrum' : 'wave'; } catch { return 'wave'; }
  });
  const pickLaneView = (next: 'wave' | 'spectrum'): void => {
    setLaneView(next);
    try { window.localStorage.setItem('futurebox.booth.view', next); } catch { /* a private window keeps nothing */ }
  };
  /**
   * Which desk is out from behind the bars, if any.
   *
   * Starts shut. The room opens on the timeline, which is the thing it is
   * about; every control in the app was on screen at once before, and the
   * result was a room where the work was a strip at the top.
   */
  const [deskOpen, setDeskOpen] = useState<Desk>(null);

  /* The app's own tab bar goes while this room is open. The owner: *"daai buttons
     vervang die harde buttons van die hele app, dan val daai hele bar van die
     app in die booth weg."* */
  useOwnScreen(true);

  /* Held sideways, the room lays out across rather than down: the timeline
     and the lane controls in a column on the left, the dock as a rail on
     the right. The owner: *"dan gaan die buttons weer beter werk aan die kant
     van die skerm en nie onder nie."* See `app/lib/sideways.ts`. */
  const sideways = useSideways();
  /* A desk wants the rail for the same reason a turned phone does: width to
     spare. This room already had the rail and only ever offered it to a
     phone. The owner, 9 October 2026: *"Die website moet nie lyk soos 'n foon
     app nie."* `lib/atdesk.ts` carries why these are two questions. */
  const atDesk = useAtDesk();
  const onEdge = sideways || atDesk;
  /* Antigravity's studio console and DAW screens were mounted in front of
     the lanes from 13 October; on 14 October the owner: *"die hele probooth
     moet oorgedoen word … Dit werk nie."* They were mock screens — their
     stems hard-coded, their playback a timer — and a member saw them first
     while the probes, by a special case on the probe's address, saw the
     real room. The lanes are the room now, for everybody. */
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
  /* The same sheet, asked to play the lane as an instrument rather than sing
     it in a voice: Kits' instrument models, chosen on the Stems desk. The
     instrument is kept apart from the remembered voice, so playing a lane as
     a saxophone does not leave the saxophone chosen the next time somebody
     wants a singer. */
  const [asInstrument, setAsInstrument] = useState(false);
  const [instrumentId, setInstrumentId] = useState('');
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
  useBackLayer(changing !== null, () => { setChanging(null); setAsInstrument(false); });

  /* ── What a lane actually is ────────────────────────────────────────────
     Chords, key, tempo and sections, read by a service rather than guessed
     here. The answer is kept per lane: reading is paid for and a second press
     on the same lane should show what the first one bought. */
  /* `saw` is what the workflow actually called its outputs.
 
     The owner ran the read on 6 October with all three slugs confirmed against
     her account, and got "nothing in the answer was a tempo, a key or a list
     of chords" — the workflow ran, and what came back was in a shape this app
     did not recognise. From here that is unfixable: the answer was thrown
     away and only the verdict kept.
 
     Music.ai hand back a map of output name to value, and for most workflows
     that value is a LINK to a file rather than the number itself. If that is
     what happened, the names will say so in one press instead of an evening
     of guessing. */
  const [known, setKnown] = useState<Record<string, {
    tempo: number | null; key: string | null; spans: Span[]; saw: string[];
  }>>({});
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
  const [staleSaid, setStale] = useState(false);
  /**
   * The lanes the reading was taken of.
   *
   * `setStale(true)` was called by hand at the places somebody remembered
   * to, and five places that change the lanes did not: a take recorded, a
   * file brought in, a lane thrown out, the copilot's moves, and "Start
   * fresh". After any of those the old loudness trim went on being applied
   * — to what she heard and to the file she exported — for a mix that no
   * longer existed. Found on 15 October 2026 (The owner: *"Kyk mooi of elke
   * funksie in … probooth … werk."*).
   *
   * So the reading remembers the lanes it was taken of, and any lane that
   * is not one of those makes it stale, whoever changed it. Lane by lane
   * rather than the array, so moving a lane up the stack — which changes no
   * sound, the mix is a sum — does not throw the measurement away.
   */
  const [readOf, setReadOf] = useState<readonly Lane[]>([]);
  const moved = useMemo(
    () => reading !== null
      && (readOf.length !== lanes.length || lanes.some((one) => !readOf.includes(one))),
    [lanes, readOf, reading],
  );
  const stale = staleSaid || moved;
  const trim = reading && !stale ? reading.trim : 1;

  const ctxRef = useRef<AudioContext | null>(null);
  /** The live picture's ear on the master, made with the context. */
  const scopeRef = useRef<AnalyserNode | null>(null);
  const playingRef = useRef<AudioBufferSourceNode[]>([]);
  /* The playhead while it moves — see `lib/liveclock.ts`. The timeline's
     line and clock follow this every frame; `at` follows it a few times a
     second, so the room is not worked out again sixty times a second. */
  const live = useMemo(() => liveClock(0), []);
  const startedRef = useRef({ at: 0, from: 0 });
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordFromRef = useRef(0);
  /* The marked piece a take was looped over, or null for an ordinary take. */
  const loopTakeRef = useRef<{ readonly from: number; readonly to: number } | null>(null);
  /** How much count-in went onto the front of the take being recorded. */
  const leadRef = useRef(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rate = backing?.sampleRate ?? 48_000;
  const total = Math.max(span(lanes), 1);

  /* ── The canvas, which is longer than the song ────────────────────

     The owner: *"Wil nie ver op die timeline beweeg nie."*

     It would not, and the reason is circular rather than a clamp: the song's
     length IS the end of its last lane, so dragging a clip to the right made
     the song longer, which made the timeline redraw wider, which put the
     clip back under the thumb. Every pixel gained was given away by the
     rescale. A clip could be moved a little and never far.

     So the drawing surface is the song plus room at the end, rounded up to a
     whole number of four-bar blocks. Rounded, because a canvas that grew
     smoothly would rescale on every frame for the same reason; in blocks it
     sits still while a clip crosses it and jumps once when the song really
     does get longer.

     Only the timeline uses this. The transport still reads the song's own
     length, and `mixSession` still renders exactly as far as the last lane
     plays — an editor with room at the end is not a song with silence at
     the end. */
  const canvas = useMemo(() => {
    const bar = barSeconds(sane(meter));
    const block = bar > 0.05 && bar < 60 ? bar * 4 : 8;
    return Math.max(total + block, Math.ceil((total + block / 2) / block) * block);
  }, [total, meter]);

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
   * The owner, 9 September 2026: "'n projek waarmee mens besig is moet half kan
   * stoor, en restart waar 'n mens is."
   *
   * Runs once. A lane whose audio will not decode is dropped rather than
   * failing the whole restore — losing one take is bad and losing four
   * because of it is worse.
   */
  useEffect(() => {
    let gone = false;
    void (async () => {
      const kept = await keptSession(song);
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
          /* The three that were written down and never read back, plus the
             interlock. See `KeptLane` for what each one losing meant. */
          ...(lane.repeat === undefined ? {} : { repeat: lane.repeat }),
          ...(lane.fx === undefined ? {} : { fx: lane.fx }),
          ...(lane.clean === undefined ? {} : { clean: lane.clean }),
          ...(lane.link === undefined ? {} : { link: lane.link }),
          ...(lane.pan === undefined ? {} : { pan: lane.pan }),
          ...(lane.tone ? { tone: lane.tone } : {}),
          /* Written down since 15 October 2026 — see `KeptLane`. */
          ...(lane.fadeIn ? { fadeIn: lane.fadeIn } : {}),
          ...(lane.fadeOut ? { fadeOut: lane.fadeOut } : {}),
          ...(lane.notes?.length ? { notes: lane.notes } : {}),
          ...(amped && lane.ampedName ? { amped: { name: lane.ampedName, audio: amped } } : {}),
        });
      }
      if (gone) return;
      if (back.length) {
        setLanes(back);
        setMeter(kept.meter);
        setMaster(kept.master);
        if (kept.markers?.length) setMarkers([...kept.markers]);
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
    /* Once, on the room opening. `context` is stable and `song` identifies
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
  /* Whether a change is waiting for the two seconds to pass. `leave` reads
     it: the timer below is cleared when the room unmounts, so a change made
     in the last two seconds before Back was a change that was never written
     down. */
  const unsaved = useRef(false);
  /* Counts changes, so a save that finishes only clears `unsaved` when no
     change landed while it was writing — re-encoding every lane takes a
     second on a phone, and a change in that second was otherwise marked as
     saved and lost on Back (found in review, 15 October 2026). */
  const changes = useRef(0);
  const writeDown = useCallback(
    (now: readonly Lane[]): Promise<void> => {
      const at = changes.current;
      return keepSession(song, meter, master, now, markers).then((done) => {
        if (changes.current === at) unsaved.current = false;
        if (done.ok) {
          setSavedAt(Date.now());
          setSaveFailed(null);
        } else {
          setSaveFailed(done.why);
        }
      });
    },
    [master, meter, song, markers],
  );
  useEffect(() => {
    if (restoring) return undefined;
    if (!lanes.length) return undefined;
    unsaved.current = true;
    changes.current += 1;
    const timer = window.setTimeout(() => {
      void writeDown(lanes);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [lanes, restoring, writeDown]);

  const context = useCallback((): AudioContext | null => {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    return ctxRef.current;
  }, []);

  /* ── A loop from the jam room ──────────────────────────────────────────
     The owner, 18 October 2026: "Send to ProBooth" in the jam room's looper.
     The loop waits on this device (`lib/jamhandover.ts`) until a booth opens,
     and arrives here as a lane from the top of the song that goes round to
     its end. After the saved session is back, so it lands on top of it
     rather than being written over by it. */
  useEffect(() => {
    if (restoring) return undefined;
    let gone = false;
    void (async () => {
      /* Nothing waiting is the usual case, and then the audio context is
         left alone: making it here, before anybody has pressed anything,
         would start the room's sound on a clock nobody asked for. */
      const sent = await waitingLoop();
      if (!sent || gone) return;
      const ctx = context();
      if (!ctx) return;
      const audio = await soundOf(sent.wav, ctx);
      if (!audio || gone) return;
      await takenLoop(sent.id);
      setLanes((was) => [
        ...was,
        {
          id: `lane-jam-${sent.made}`,
          name: t('pro.jamLoop', 'Jam loop'),
          audio,
          at: 0,
          gain: 1,
          muted: false,
          soloed: false,
          repeat: roundsFor(backing?.duration ?? 0, audio.duration, MOST_REPEATS),
        },
      ]);
      setJamArrived(true);
    })();
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring]);

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

  /* The marked piece, while "Loop it" is on — set further down, where the
     mark lives, and read here by the clock. */
  const loopSpan = useRef<{ readonly from: number; readonly to: number } | null>(null);

  const play = useCallback(
    /** `lead` is a count-in: everything starts that many seconds later.
        `at` is the next pass of a loop: an exact time on the audio clock to
        start at, with what is playing now stopped at that same moment rather
        than at once, so the join has no gap in it. */
    (from: number, lead = 0, at?: number) => {
      const ctx = context();
      if (!ctx) return;
      if (at === undefined) {
        hush();
      } else {
        playingRef.current.forEach((source) => {
          try {
            source.stop(at);
          } catch {
            // Already finished.
          }
        });
        playingRef.current = [];
        metronomeRef.current?.stop();
      }
      void ctx.resume();
      const begins = at ?? ctx.currentTime + 0.06 + lead;

      /* The same bus the render builds, and the same one number on the end of
         it. The click is deliberately not on this bus: a metronome that got
         quieter when the master came down would be a metronome you stop being
         able to hear exactly when you need it. */
      if (!scopeRef.current || scopeRef.current.context !== ctx) {
        scopeRef.current = ctx.createAnalyser();
        scopeRef.current.fftSize = 2048;
        scopeRef.current.smoothingTimeConstant = 0.78;
      }
      const bus = wireMaster(ctx, master, master.gain * trim, scopeRef.current);

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

      /* ── Silence says why ─────────────────────────────────────────────
         The owner, 28 October 2026: *"Geen geen geen klank in die probooth
         nie."* Play pressed, lanes there, and nothing came out — with no
         word as to why. A moment after it starts, the master's own ear is
         asked whether anything is going out; if nothing is, the reason that
         this room can see is said, and the one it cannot (the device) last. */
      const playable = audible(lanes);
      /* Nothing set to play at all: said at once, nothing to wait for. */
      if (lanes.length && !playable.length) {
        setProblem(lanes.some((one) => one.soloed)
          ? t('pro.silentSolo', 'Only a soloed lane plays (S), and it is muted or empty. Turn S off on the lanes to hear them all.')
          : t('pro.silentMuted', 'Every lane is muted (M). Tap M on a lane to hear it.'));
        return;
      }
      /* Only when there is sound to hear here: a song that opens on a
         second of silence must not be reported as a broken speaker. */
      const somethingThere = playable.some((one) => {
        const into = from - one.at;
        if (into < -1) return false;
        const data = one.audio.getChannelData(0);
        const rate = one.audio.sampleRate;
        const start = Math.max(0, Math.floor(((one.from ?? 0) + Math.max(0, into)) * rate));
        const end = Math.min(data.length, start + Math.floor(1.2 * rate));
        for (let i = start; i < end; i += 64) if (Math.abs(data[i]) > 0.002) return true;
        return false;
      });
      if (!somethingThere && playable.length) return;
      window.setTimeout(() => {
        const ear = scopeRef.current;
        if (!ear || !playingRef.current.length) return;
        const wave = new Float32Array(ear.fftSize);
        ear.getFloatTimeDomainData(wave);
        let loudest = 0;
        for (let i = 0; i < wave.length; i += 1) loudest = Math.max(loudest, Math.abs(wave[i]));
        if (loudest > 0.0005) return;
        const why = ctx.state !== 'running'
          ? t('pro.silentBlocked', 'The browser has not let the sound start yet. Tap Play once more.')
          : master.gain * trim <= 0.001
              ? t('pro.silentMaster', 'The master volume is all the way down. Turn it up in the mixer.')
              : playable.every((one) => one.gain <= 0.001)
                ? t('pro.silentLanes', 'The lane volumes are all the way down. Turn a lane up in the mixer.')
                : t('pro.silentDevice', 'The booth is playing, but nothing is reaching your speakers. Check the device volume, a muted tab, or headphones and Bluetooth.');
        setProblem(why);
      }, 1200);
    },
    [clickDb, clicker, clicking, context, division, hush, lanes, master, meter, t, trim],
  );

  const stopPlaying = useCallback(() => {
    hush();
    setPlaying(false);
    /* Exactly where it stopped, not where the last few-times-a-second
       reading left it: a pause followed by play has to carry on from the
       sample it stopped on. */
    setAt(live.now());
  }, [hush, live]);

  /**
   * Put the playhead somewhere, by hand.
   *
   * There was no way to do this at all: `at` only ever moved because
   * something was playing, so the only way to hear the middle of a song was
   * to play it from the top. The owner: *"Die lyn wat deur die timeline beweeg
   * moet langer wees sodat 'n vinger hom kan vang en die klank plek kan
   * drag."* — a line you can catch is only worth catching if letting go of it
   * moves the sound.
   *
   * While something is playing it starts again from where the thumb left it,
   * which is what a transport does; stopped, it just moves the mark.
   */
  const seek = useCallback(
    (seconds: number) => {
      /* Not while a take is running. The song is what she is singing
         against, and moving it under her moves where the take is filed:
         `stopRecording` places the take from where recording STARTED, so
         every second the playhead was dragged is a second the take lands
         away from the music it was sung to. The timeline, the dock's skips
         and the arrow keys all come through here. */
      if (recording) return;
      const where = Math.max(0, Math.min(total, seconds));
      setAt(where);
      if (playing) {
        hush();
        play(where);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, playing, recording, hush, play],
  );

  // The clock, while anything is running.
  useEffect(() => {
    if (!playing && !recording) return;
    let frame = 0;
    let told = 0;
    const step = (): void => {
      const ctx = ctxRef.current;
      if (ctx) {
        const now = startedRef.current.from + (ctx.currentTime - startedRef.current.at);
        /* ── Round again ───────────────────────────────────────────────
           With "Loop it" on, the next pass of the marked piece is laid down
           a moment before this one ends, to start exactly where it ends —
           on the audio clock, not at the next frame. Only once per pass:
           after it is laid down the clock's start is in the future. */
        const span = loopSpan.current;
        if (span && startedRef.current.at <= ctx.currentTime && now >= span.to - 0.08) {
          play(span.from, 0, startedRef.current.at + (span.to - startedRef.current.from));
        }
        const here = Math.max(0, Math.min(total, now));
        live.set(here);
        const wall = performance.now();
        if (wall - told >= 200) {
          told = wall;
          setAt(here);
        }
        if (now >= total && !recording) {
          stopPlaying();
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, recording, stopPlaying, total, play, live]);
  /* Stood still, the clock is wherever the room says — a seek, an undo, a
     drag of the playhead. */
  useEffect(() => {
    if (!playing && !recording) live.set(at);
  }, [at, playing, recording, live]);

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
    /* ── A browser that cannot record, said as a sentence ─────────────

       `new MediaRecorder` on a browser without one (an older Safari, some
       in-app browsers that wrap a web view) threw a ReferenceError out of
       this handler, so the button did nothing at all and the microphone
       light came on for nothing. Asked first, before the microphone is
       opened. Found on 15 October 2026 going through every function in the
       booth. */
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setProblem(t(
        'pro.noRecorder',
        'This browser cannot record. Open the app in Chrome, Safari or Firefox to record a lane — everything else in this room still works here.',
      ));
      return;
    }
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
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current);
    } catch {
      setProblem(t(
        'pro.noRecorder',
        'This browser cannot record. Open the app in Chrome, Safari or Firefox to record a lane — everything else in this room still works here.',
      ));
      return;
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    /* Looping the marked piece: the take starts at the top of it, and every
       pass round is kept — see `stopRecording`. */
    const span = loopSpan.current;
    loopTakeRef.current = span;
    const from = span ? span.from : at;
    if (span) setAt(span.from);
    recordFromRef.current = from;
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
    play(from, lead);
    setRecording(true);
  }, [at, countBars, meter, play, t]);

  /* Returns the lane it made, so a way out of the room can write the take
     down before the room is gone — see `leave`. */
  const stopRecording = useCallback(async (): Promise<Lane | null> => {
    const recorder = recorderRef.current;
    setRecording(false);
    stopPlaying();
    if (!recorder || recorder.state !== 'recording') return null;

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
        return null;
      }
      /* ── Looped: one take per pass ───────────────────────────────────
         The recorder ran the whole time the piece went round, so the file
         holds every pass back to back. Each becomes its own lane over the
         marked piece — the same recording, cut to that pass — with the last
         one on and the others muted, so she can listen through and keep the
         best. Nothing is copied: a lane's cut is a window into its audio. */
      const span = loopTakeRef.current;
      loopTakeRef.current = null;
      if (span) {
        const passes = passesOf(piece.duration, leadRef.current + knownLatency(), span.to - span.from);
        if (passes.length > 1) {
          const number = lanesNow.current.filter((one) => !one.backing).length + 1;
          const stamp = Date.now();
          const made: Lane[] = passes.map((pass, k) => ({
            id: `lane-${stamp}-${k}`,
            name: `${t('pro.take', 'Take')} ${number} · ${t('pro.pass', 'pass')} ${k + 1}`,
            audio: piece,
            at: span.from,
            from: pass.from,
            to: pass.to,
            gain: 1,
            muted: k !== passes.length - 1,
            soloed: false,
          }));
          setLanes((was) => [...was, ...made]);
          return made[made.length - 1];
        }
      }
      /* Named from the lanes as they are now, outside the setter, so the
         lane handed back is the same object that lands in the session. */
      const lane: Lane = {
        id: `lane-${Date.now()}`,
        name: `${t('pro.take', 'Take')} ${lanesNow.current.filter((one) => !one.backing).length + 1}`,
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
      };
      setLanes((was) => [
        ...was,
        lane,
      ]);
      return lane;
    } catch {
      setProblem(t('pro.unreadable', 'That recording could not be read back.'));
      return null;
    } finally {
      setBusy(false);
    }
  }, [rate, stopPlaying, t]);

  /**
   * Out of the room — and never with a take still running.
   *
   * Found on 15 October 2026, when the owner asked for every function in the
   * booth to be looked at (*"Kyk mooi of elke funksie in … probooth …
   * werk."*). The header's Back and the phone's back gesture both closed the
   * room while the recorder ran. The room unmounted, the recorder with it,
   * and the take she was in the middle of singing was nowhere: not a lane,
   * not on the device. The "Sing with the words" door already hid itself
   * mid-take for exactly this reason; these two did not.
   *
   * So leaving ends the take first, as if Stop had been pressed, and writes
   * the session down there and then rather than in two seconds — which is
   * after the room is gone. The same for any change still waiting on that
   * timer: Back inside two seconds of moving a fader used to lose the move.
   */
  const leaving = useRef(false);
  const leave = useCallback(async (): Promise<void> => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      let now: readonly Lane[] = lanesNow.current;
      if (recorderRef.current?.state === 'recording') {
        const lane = await stopRecording();
        if (lane) now = [...now.filter((one) => one.id !== lane.id), lane];
        unsaved.current = true;
      }
      if (unsaved.current && !restoring && now.length) await writeDown(now);
    } finally {
      leaving.current = false;
      onClose();
    }
  }, [onClose, restoring, stopRecording, writeDown]);
  leaveRef.current = () => { void leave(); };

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
        /* The route's own sentence, like every other paid call in this room.
           `/api/music` says whether it is a sign-in, an empty balance, a
           plan or words it would not set — four answers with four different
           things to do — and this printed one sentence for all of them.
           Found on 15 October 2026 going through every function in the
           booth. The status is added only when there are no words. */
        const said = (await response.json().catch(() => ({}))) as { message?: string };
        setProblem(said.message
          ?? `${t('part.failed', 'That part could not be generated. Nothing was charged.')} (${response.status})`);
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

  /**
   * ── Where this lane's sound changes ──────────────────────────
   *
   * The owner, 10 October 2026: *"sal dit 'n goeie funksie wees as die booth na
   * die klank baan luister, en die natuurlike oorgange identifiseer … dan as
   * mens op dit click spring die driehoekies aan die onderste lyn van die
   * klank baan op by elke natuurlike oorgange, progressies, modulasies. Dit
   * help die editor om te weet waar om oorgange te kry vir editing."*
   *
   * Measured once and kept, because the measurement is a few hundred FFTs and
   * the answer does not change until the audio does. Pressing the button again
   * only hides and shows them.
   *
   * On the lane's OWN clock, not the session's. Moving the clip along the song
   * must not move the marks, and the cut has to be able to hide the ones
   * outside it — both of which fall out for free from measuring the audio
   * rather than the arrangement.
   *
   * It calls nothing: `lib/transitions.ts` runs here, in the browser, on the
   * samples this room already has. The first press costs `CREDITS.findMarks`
   * (the owner, 28 October 2026: *"Niks 1 credit nie. Altyd 2"*).
   */
  const findMarks = async (id: string): Promise<void> => {
    const lane = lanes.find((one) => one.id === id);
    if (!lane) return;
    if (lane.marks) {
      /* Already measured. The press is a switch from here on, and re-running
         a few hundred FFTs to answer a question already answered would make
         the second press slower than the first for no reason. */
      change(id, { marksOn: !lane.marksOn });
      return;
    }
    /* Paid once, the first time; showing and hiding them after is a switch. */
    if (!(await payTool('marks', `${lane.id}|${lane.amped ? 'amped' : 'dry'}`))) return;
    const source = lane.amped?.audio ?? lane.audio;
    const marks = transitionsIn(source.getChannelData(0), source.sampleRate);
    /* An empty array rather than leaving it absent: "asked, and there is
       nothing there" is a different state from "nobody has asked", and the
       lane strip says so. A drone has no transitions and that is an answer. */
    change(id, { marks, marksOn: true });
  };

  /**
   * ── A lane out of the room, as sound or as notes ───────────────
   *
   * The owner, 10 October 2026: *"iemand op 'n spesifieke track kan click en dan
   * is daar 'n dropdownmenu wat die opsie gee vir download midi, download
   * wav. Dit gee die geleentheid om 'n sekere klank te save vir 'n ander
   * projek."*
   *
   * The WAV is the cut piece through its amp — `pieceOf`, which is the same
   * function the mixdown uses, so the file and the song cannot disagree about
   * what this lane is. It is NOT the mix: the level, the pan and the tone
   * stack are nodes in the graph and belong to this session's balance, and
   * somebody taking a sound to another project wants the sound rather than
   * this song's opinion of it. The strip says so in a line.
   *
   * The MIDI is notes, and whether they are known or heard is the whole of
   * `lib/midi.ts`'s honesty. Nothing is written if nothing was found: a file
   * with no notes in it is a file somebody opens in a week and cannot tell
   * from a broken export.
   */
  /* ── The quality a file is written in ─────────────────────────────
     The owner, 14 October 2026, from the ProBooth design she sent: the stems
     and the mix come out at the quality she picks. Remembered on this
     device, because somebody who works in 24-bit works in 24-bit every
     time; the storage can be missing, so 16 stands when it is. */
  const [depth, setDepthState] = useState<Depth>(16);
  useEffect(() => {
    try {
      const kept = Number(window.localStorage.getItem('fb.booth.depth'));
      if (kept === 24 || kept === 32) setDepthState(kept);
    } catch { /* private window: 16 it is */ }
  }, []);
  const setDepth = (next: Depth): void => {
    setDepthState(next);
    try { window.localStorage.setItem('fb.booth.depth', String(next)); } catch { /* kept for this visit only */ }
  };

  /**
   * Mono, stereo, or folded for a surround decoder.
   *
   * The owner, 21 September 2026: *"Mono/stereo/dolby surround. Download type."*
   *
   * One state for both doors — the phone and the Library — because a song
   * that goes to her channel in a different layout from the one she just
   * saved is the kind of difference nobody notices until a shop plays it.
   * Stereo to begin with, which is what every file this room has ever made
   * has been.
   */
  const [layout, setLayout] = useState<Layout>('stereo');

  /* ── WAV or MP3, and how big ────────────────────────────────────────
     The owner, 18 October 2026: a file size to choose at every export, and
     an MP3 encoder for the booth so that it can mean something — a WAV's
     size is its length (`lib/mp3.ts` says why). WAV stays the default;
     the choice is remembered like the depth. The limit is per file: the
     mix, or each stem. */
  const [soundKind, setSoundKindState] = useState<'wav' | 'mp3'>('wav');
  const [soundMost, setSoundMost] = useState<Limit>(null);
  useEffect(() => {
    try {
      if (window.localStorage.getItem('fb.booth.kind') === 'mp3') setSoundKindState('mp3');
    } catch { /* private window: WAV it is */ }
  }, []);
  const setSoundKind = (next: 'wav' | 'mp3'): void => {
    setSoundKindState(next);
    try { window.localStorage.setItem('fb.booth.kind', next); } catch { /* kept for this visit only */ }
  };
  /** The file, in the kind chosen, under the limit when it is an MP3. */
  const writeSound = useCallback(async (buffer: AudioBuffer, how: Layout = 'stereo'): Promise<{ readonly blob: Blob; readonly ext: 'wav' | 'mp3' }> => {
    if (soundKind === 'wav') return { blob: encodeWav(buffer, how, depth), ext: 'wav' };
    const { kbps } = kbpsUnder(buffer.duration, soundMost);
    return { blob: await encodeMp3(buffer, kbps, how), ext: 'mp3' };
  }, [depth, soundKind, soundMost]);
  const depthPicker = (
    <div className="space-y-1.5" data-exportquality>
      <p className="text-xs font-semibold" style={{ color: INK_DIM }}>
        {t('pro.kindTitle', 'Kind of file')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(['wav', 'mp3'] as const).map((one) => (
          <button
            key={one}
            type="button"
            data-exportkind={one}
            aria-pressed={soundKind === one}
            onClick={() => setSoundKind(one)}
            className={`h-[44px] min-w-0 truncate rounded-xl border px-2 text-xs font-bold ${
              soundKind === one
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-200'
            }`}
          >
            {one === 'wav' ? 'WAV' : 'MP3'}
          </button>
        ))}
      </div>
      <p className="text-xs leading-snug" style={{ color: INK_DIM }}>
        {soundKind === 'wav'
          ? t('pro.kindWav', 'Every sample, written down. What a studio hands another studio — and big: a minute of stereo is about ten megabytes.')
          : t('pro.kindMp3', 'What phones, platforms and messages take. Much smaller, and you choose how small.')}
      </p>
      {soundKind === 'mp3' ? (
        <FileSize
          limit={soundMost}
          onLimit={setSoundMost}
          estimate={(() => {
            const channels = layout === 'mono' ? 1 : 2;
            const { kbps, fits } = kbpsUnder(total, soundMost);
            return { before: total * rate * channels * 2, after: mp3Bytes(total, kbps), scale: 1, fits };
          })()}
          busy={false}
          kind="sound"
        />
      ) : (
      <>
      <p className="text-xs font-semibold" style={{ color: INK_DIM }}>
        {t('pro.depthTitle', 'Quality of the file')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DEPTHS.map((one) => (
          <button
            key={one.id}
            type="button"
            data-exportdepth={one.id}
            aria-pressed={depth === one.id}
            onClick={() => setDepth(one.id)}
            className={`h-[44px] min-w-0 truncate rounded-xl border px-2 text-xs font-bold ${
              depth === one.id
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-200'
            }`}
          >
            {t(one.label[0], one.label[1])}
          </button>
        ))}
      </div>
      <p className="text-xs leading-snug" style={{ color: INK_DIM }}>
        {(() => {
          const chosen = DEPTHS.find((one) => one.id === depth) ?? DEPTHS[0];
          return t(chosen.note[0], chosen.note[1]);
        })()}
      </p>
      </>
      )}
    </div>
  );

  /** Every lane in one .zip, at the chosen quality — one download, not one per lane. */
  /**
   * Charges for one of the booth's own tools, and answers whether to go on.
   *
   * The owner, 28 October 2026: *"Funksies wat sinvol is moet altyd 'n paar
   * krediete kos"* — and *"Niks 1 credit nie. Altyd 2."* The work is done in
   * this browser; `/api/boothtool` only takes the credits, by the price in
   * `CREDITS`, once per `what` (the same file saved twice is one charge).
   * A refusal is said in the route's own words, as `payFor` does.
   */
  const payTool = useCallback(async (tool: 'zip' | 'wav' | 'midi' | 'hum' | 'marks' | 'smooth' | 'heard', what: string): Promise<boolean> => {
    let sign = 0x811c9dc5;
    for (let i = 0; i < what.length; i += 1) sign = Math.imul(sign ^ what.charCodeAt(i), 0x01000193) >>> 0;
    try {
      const token = await accessToken();
      const answer = await fetch('/api/boothtool', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tool, ref: `${what.length}-${sign.toString(36)}` }),
      });
      if (answer.ok) return true;
      const said = (await answer.json().catch(() => null)) as { message?: string } | null;
      setProblem(said?.message ?? t('pro.notPaid', 'That could not be paid for just now.'));
      return false;
    } catch {
      setProblem(t('pro.notPaid', 'That could not be paid for just now.'));
      return false;
    }
  }, [t]);

  const saveAll = async (): Promise<void> => {
    const ctx = context();
    if (!ctx) {
      setProblem(t('pro.noAudio', 'This browser would not start its audio.'));
      return;
    }
    const taken = new Set<string>();
    const entries: { name: string; data: Blob }[] = [];
    for (const lane of lanes) {
      const named = lane.name.trim() || t('pro.laneOne', 'Lane');
      const written = await writeSound(pieceOf(lane, ctx));
      let file = safeFilename(named, written.ext);
      for (let n = 2; taken.has(file); n += 1) file = safeFilename(`${named} ${n}`, written.ext);
      taken.add(file);
      entries.push({ name: file, data: written.blob });
    }
    const zip = await zipOf(entries);
    if (!(await payTool('zip', `${title}|${soundKind}|${depth}|${lanes.map((lane) => `${lane.id}:${lane.from ?? 0}:${lane.to ?? ''}:${lane.repeat ?? 1}`).join(',')}`))) return;
    downloadBlob(zip, safeFilename(`${title || t('pro.untitled', 'song')} stems ${soundKind === 'mp3' ? 'mp3' : `${depth}-bit`}`, 'zip'));
  };

  const saveLane = async (lane: Lane, what: 'wav' | 'midi'): Promise<void> => {
    const ctx = context();
    if (!ctx) {
      setProblem(t('pro.noAudio', 'This browser would not start its audio.'));
      return;
    }
    const piece = pieceOf(lane, ctx);
    const named = lane.name.trim() || t('pro.laneOne', 'Lane');
    const which = `${lane.id}|${lane.from ?? 0}|${lane.to ?? ''}|${lane.repeat ?? 1}|${soundKind}|${depth}`;
    if (what === 'wav') {
      const written = await writeSound(piece);
      if (!(await payTool('wav', which))) return;
      downloadBlob(written.blob, safeFilename(named, written.ext));
      return;
    }
    const source: Source = lane.notes?.length ? 'exact' : 'heard';
    const notes = lane.notes?.length
      ? lane.notes
      : notesIn(piece.getChannelData(0), piece.sampleRate);
    const written = midiFor(notes, { bpm: meter.bpm, name: named, source });
    if (written.notes === 0) {
      setProblem(t(
        'pro.midiNone',
        'No notes were heard in that lane, so there is nothing to write. MIDI follows one line at a time — a full mix or a wash of reverb has no single line in it.',
      ));
      return;
    }
    if (!(await payTool('midi', which))) return;
    downloadBlob(midiBlob(written), safeFilename(named, 'mid'));
  };

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

  /**
   * Put lanes where the timeline says, exactly.
   *
   * No snapping and no grid, and that is the point of it being separate from
   * `change`. The timeline owns the magnet and it has already applied the
   * grid — see `onSlide` on `BoothTimeline` — so a second rounding here
   * would move a locked group's lanes by different amounts and pull the
   * group apart, and would swallow a tenth-of-a-second nudge from the arrow
   * keys whole.
   *
   * One `setLanes` for all of them, so a locked group moves in one render
   * rather than sliding into place one lane per frame.
   */
  const slide = (moves: readonly { readonly id: string; readonly at: number }[]): void => {
    if (!moves.length) return;
    setStale(true);
    setLanes((was) =>
      was.map((lane) => {
        const move = moves.find((one) => one.id === lane.id);
        return move ? { ...lane, at: move.at } : lane;
      }),
    );
  };

  /**
   * Lock two lanes together, or let one out of the lock.
   *
   * ── What she asked for ────────────────────────────────────────────────
   *
   * The owner, 16 September 2026: *"ook 'n interlock funksie om twee tydlyne met
   * mekaar vas te maak."*
   *
   * ── Joining two locks, which is the case that goes wrong ──────────────
   *
   * Locking a lane that is already in a lock to a lane that is in a
   * DIFFERENT lock has to merge both groups, not move two lanes out of
   * theirs. The naive version — give these two the first lane's group —
   * leaves whatever else was in the second group behind, and the person is
   * looking at a lane that used to move with this one and now does not,
   * having asked for more locking rather than less.
   *
   * So both old groups are absorbed: every lane carrying either string ends
   * up carrying the surviving one.
   *
   * ── And a group of one is a group of none ────────────────────────────
   *
   * Letting a lane out can leave one lane behind holding the string. A lock
   * of one locks nothing, and leaving the badge on it would be a lie on the
   * screen — so the string comes off that lane too.
   */
  const interlock = (id: string, other: string): void => {
    if (id === other) return;
    /* On the undo stack since 15 October 2026. Joining two locks merges both
       groups, and letting one lane out can dissolve a group of two — neither
       is put back by pressing the same button again, which is what the old
       reason for leaving this off the stack assumed. */
    remember(t('undo.lock', 'locking the lanes'));
    setLanes((was) => {
      const mine = was.find((one) => one.id === id);
      const yours = was.find((one) => one.id === other);
      if (!mine || !yours) return was;

      /* Already locked to each other: this is the way out. */
      if (mine.link && mine.link === yours.link) {
        const group = mine.link;
        const loose = was.map((one) => (one.id === other ? { ...one, link: undefined } : one));
        const left = loose.filter((one) => one.link === group);
        return left.length > 1
          ? loose
          : loose.map((one) => (one.link === group ? { ...one, link: undefined } : one));
      }

      const group = mine.link ?? yours.link ?? `lk${Date.now().toString(36)}`;
      const absorbed = [mine.link, yours.link].filter((one): one is string => Boolean(one));
      return was.map((one) =>
        one.id === id || one.id === other || (one.link && absorbed.includes(one.link))
          ? { ...one, link: group }
          : one,
      );
    });
  };

  /**
   * Move a lane up or down the stack, swapping it with its neighbour.
   *
   * The owner: *"Tracks moet ook geswitch kan word, menend op en af beweeg en
   * omgeruil word."* A swap rather than a lift-and-insert, because that is
   * what she described and because on a phone it is the gesture that can be
   * done with one thumb and undone with the other button.
   *
   * Nothing about the sound depends on the order — the mix is a sum — so
   * this is a change to how the room reads and not to what it renders, and
   * it deliberately does not mark the master stale. The colours do come
   * with it, because `hueFor` reads the position: a lane moved down the
   * stack takes its neighbour's shade, which is the point of colouring by
   * depth in the first place.
   */
  /**
   * Move a lane one place, with everything locked to it.
   *
   * ── What this used to do, and why it was wrong ─────────────────────────
   *
   * It SWAPPED: take the lane at `from`, take the one at `from + way`, put
   * each where the other was. Two lines, obviously correct, and it tore an
   * interlocked group in half every time one of its members was moved —
   * because a swap knows about two indexes and nothing about a group.
   *
   * The owner, 18 September 2026, asked for the arrows to be in the gutter and
   * gave the reason in the same breath: *"dit raak belangrik wanneer 'n hele
   * tydlyn se klankbane gelyktydig opgeskuif moet word."* The reason was the
   * real finding. The arrows already existed, here on the lane's own card —
   * she could not find them, which is its own answer — but the thing she
   * wanted them FOR was the one thing they could not do.
   *
   * She chose to keep them here rather than widen the gutter, which on a
   * 390-pixel phone would have cost the timeline 44 pixels and a whole lane
   * of height. So the buttons stay and the behaviour changes.
   *
   * `app/lib/laneorder.ts` holds the arithmetic, so what a group does when
   * it is moved past a lane outside it is settled where a check can ask it
   * rather than in a handler where the only way to ask is a browser. It
   * gives back the SAME array when there is nowhere to go, and that
   * identity is what stops a press at the top of the stack writing the
   * session to disk for nothing.
   */
  const shuffleLane = (id: string, way: -1 | 1): void => {
    /* Undoable like everything else that rearranges the session: a locked
       group moved past another lane is not always put back by the other
       arrow, because the group moves as one and the lane it passed does
       not. Remembered only when there is somewhere to go, so a press at the
       top of the stack does not leave an undo step that does nothing. */
    if (!canMove(lanesNow.current, id, way === -1 ? 'up' : 'down')) return;
    remember(t('undo.order', 'moving the lane'));
    setLanes((was) => {
      const next = move(was, id, way === -1 ? 'up' : 'down');
      return next === was ? was : [...next];
    });
  };

  const measure = useCallback(async () => {
    setBusy(true);
    try {
      const got = await readSession(lanes, rate, master);
      setReading(got);
      setReadOf(lanes);
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
    async (lane: Lane, instrument?: { readonly id: string; readonly name: string }) => {
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
          setProblem(put.why);
          return;
        }
        /* Which engine, and what each one needs told about it: a voice id at
           ElevenLabs, a trained model number at Kits. */
        const sings = Boolean(instrument) || (engine === 'singing' && canSing);
        if (sings) form.append('voiceModelId', instrument?.id ?? modelId);
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
        setAsInstrument(false);
        setLanes((was) => [
          ...was.map((one) => (one.id === lane.id ? { ...one, muted: true } : one)),
          {
            id: `${lane.id}-voice-${Date.now()}`,
            name: `${lane.name} · ${instrument ? instrument.name : sings ? t('pro.sungReally', 'sung') : t('pro.sungBy', 'another voice')}`,
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
  const instruments = voices?.singing?.instruments ?? [];
  const playAs = (lane: Lane): void => {
    setAsInstrument(true);
    setChanging(lane);
  };

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
        /* The piece that plays, like every other paid lane action. This sent
           the whole recording — billed for what was cut off, and read through
           without its amp — while the price on the button was about to say
           the cut length. Found on 15 October 2026. */
        const piece = pieceOf(lane, ctx);
        const got = await readSong(encodeWav(monoOf(piece, ctx)), piece.duration);
        if (!got.ok) {
          setProblem(got.message);
          return;
        }
        setKnown((was) => ({
          ...was,
          [lane.id]: {
            tempo: tempoIn(got.data),
            key: keyIn(got.data),
            /* On the session's clock, which is what the timeline draws them
               against: the piece's first second plays at `lane.at`. */
            spans: spansIn(got.data).map((one) => ({ ...one, at: one.at + lane.at })),
            /* The names only, and a word for the shape of each — never the
               values. A link from a supplier can carry a signature on it. */
            saw: Object.entries(got.data as Record<string, unknown>).map(([name, value]) =>
              (typeof value === 'string' && /^https?:\/\//.test(value) ? `${name} (link)` : name)),
          },
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
        /* ── Through storage when it is big, which a lane always is ──────
 
           This appended the WAV straight onto the form, and a lane is a WAV:
           a minute and a bit at 44.1 kHz is over six megabytes, and the
           platform refuses a request body past about four and a half before
           this route ever runs. The refusal is a BARE 413 with no JSON in
           it, so the screen could not even read a reason and fell back to
           "The room could not be taken off that lane."
 
           The owner hit exactly that on 6 October, on a 1:12 lane. `runThrough`
           two hundred lines up has used `attach` since it was written, and
           `/api/voice/clean` has taken a storage key for just as long — the
           road existed and this one call was not on it. */
        const put = await attach(form, encodeWav(piece), 'audio', 'lane.wav');
        if (!put.ok) {
          setProblem(put.why);
          return;
        }
        form.append('seconds', String(Math.round(piece.duration)));
        const token = await accessToken();
        const response = await fetch('/api/voice/clean', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        if (!response.ok) {
          const said = (await response.json().catch(() => ({}))) as { message?: string };
          /* The status when there are no words. The owner pressed this on
             6 October and got the bare sentence, which means the refusal
             carried no `message` at all — a `charge()` that answered with
             only an `error`, or an engine that refused without one. Those
             are different problems: a 402 is credits, a 413 is the file, a
             500 is theirs. One number ends the guessing, and it is only
             shown when the sentence could not be. */
          setProblem(said.message
            ?? `${t('pro.deRoomFailed', 'The room could not be taken off that lane.')} (${response.status})`);
          return;
        }
        const cleaned = await readInto(await response.blob(), rate);
        if (!cleaned) {
          setProblem(t('pro.badFile', 'That file could not be read as audio.'));
          return;
        }
        /* The cut is spent: what comes back is already the piece that played,
           so `from` and `to` would trim it a second time. */
        remember(t('undo.clean', 'die skoonmaak'));
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

  /* ── The voice tuner ───────────────────────────────────────────────
     The owner, 20 October 2026: the tuner was named on the effects desk as
     not built. It hears the lane here, on the phone, and writes the tuned
     sound back as the lane's — the same way "Clean with AI" does, and with
     the same Undo. No credits: nothing leaves the device. */
  const [tuning, setTuning] = useState<number | null>(null);
  const tuneLane = useCallback(
    async (lane: Lane, how: TuneHow) => {
      const ctx = context();
      if (!ctx || tuning !== null) return;
      setProblem(null);
      setTuning(0);
      try {
        const piece = pieceOf(lane, ctx);
        const channels = Array.from({ length: piece.numberOfChannels }, (_, c) => piece.getChannelData(c));
        const heard = await trackPitchSoftly(channels, piece.sampleRate, (share) => setTuning(share * 0.95));
        if (!heard.hz.some((one) => one > 0)) {
          setProblem(t('fx.tunerNothing', 'No sung notes were heard on that lane, so there is nothing to tune.'));
          return;
        }
        const tuned = tune(channels, piece.sampleRate, how, heard);
        const out = ctx.createBuffer(tuned.length, piece.length, piece.sampleRate);
        tuned.forEach((data, c) => out.copyToChannel(data, c));
        remember(t('undo.tune', 'the tuning'));
        /* Like the clean: what comes back is already the piece that played. */
        setLanes((was) => was.map((one) => (
          one.id === lane.id
            ? { ...one, audio: out, from: undefined, to: undefined, amped: undefined }
            : one
        )));
      } catch {
        setProblem(t('fx.tunerFailed', 'That lane could not be tuned.'));
      } finally {
        setTuning(null);
      }
    },
    [context, remember, t, tuning],
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
        /* ── Paid once ──────────────────────────────────────────────────

           Kits answering is Kits charging. When what came back would not
           decode, this used to fall through to Music.ai and charge a second
           time for the same lane — two bills, and still possibly nothing.
           The second supplier is for when the first one did NOT charge: it
           refused, it is not set up, or it failed and refunded. Found on 15
           October 2026 going through every function in the booth. */
        if ('message' in viaKits && viaKits.charged) {
          setProblem(viaKits.message);
          return;
        }
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
          /* Paid for, and nothing in it would play. Said, and stopped —
             see "Paid once" above. */
          setProblem(t('pro.partsUnreadable', 'The parts came back in a form the browser could not read.'));
          return;
        }
        /* Out of allowance is the member's own limit and not a reason to try
           the other supplier — the second one would refuse in the same words
           after another wait. */
        if ('message' in viaKits && viaKits.outOfAllowance) {
          setProblem(viaKits.message);
          return;
        }

        /* The same piece Kits was sent, for the same reason: billed for what
           plays, and parts that line up with the lane they came from. */
        const got = await readSong(encodeWav(monoOf(piece, ctx)), piece.duration, 'stems');
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


  /* ── Paying for a bounce ───────────────────────────────────────────────

     The owner, 1 October 2026: *"Onthou dat hierdie ook 'n betaalde produk is wat
     krediete werd is."* The same decision as the cutting room, and the same
     shape: everything in this room — recording, the lanes, the grid, the
     metronome, the faders, the mastering, undo — is free however long
     somebody sits here. The bounce costs, at `CREDITS.mixOut` a minute.

     ── Why the same mix is charged once ────────────────────────────────

     There are two ways out of this room: into the Library, and onto the
     phone. They are one mix. Somebody who keeps a song and then also wants
     it on their phone has made one thing, and charging twice for the second
     press would be charging for a download.

     So the reference is a SIGNATURE of the mix rather than the moment: the
     lanes and what each is set to, the master, the trim and the layout. Two
     presses with nothing changed between them carry the same reference, and
     `spend_credits` takes a charge once per reference — which it did not do
     until 2 October, when this room's two doors made the gap matter.

     Change a fader and the signature changes, which is right: that is a
     different mix, and it is the one somebody is now paying for. */
  /* What the next bounce will cost, from the table rather than typed.
     Worked out from the lanes rather than from a finished mix, because the
     price has to be on the button BEFORE the render that would tell us the
     real length — and the render is the slow part. The longest lane is what
     `mixSession` renders to, so it is the same number. */
  const bounceCost = useMemo(() => {
    /* `span` of what is heard, which is exactly what `mixSession` renders
       to. The sum this replaced ignored repeats, so a part looped past the
       end of the song made the mix — and the bill — longer than the price
       on the button said. */
    const longest = span(audible(lanes));
    return longest > 0 ? perMinute(longest, CREDITS.mixOut) : 0;
  }, [lanes]);

  const signature = useCallback((length: number): string => {
    /* Every field `mixSession` actually reads, and nothing else. A signature
       over fields the render ignores would charge twice for one mix because
       a name was edited; one that misses a field the render DOES read would
       charge once for two different mixes, which is the worse direction. */
    /* ── Every field, and the recording itself ──────────────────────

       This listed seven fields and `mixSession` reads fifteen. The pan, the
       rack, the tone, the cleaners, the amp, the repeats and the two fades
       were all in the file and none of them in the reference, so a mix with
       a reverb added, or panned, or faded out, carried the same reference as
       the one already paid for and went out uncharged. Found on 15 October
       2026 going through every function in the booth.

       And the audio by identity, not by its lane's id: "Take the room off"
       and a baked fade put new samples on the SAME lane id, and a different
       sound under the same name is a different mix. */
    const parts = lanes.map((one) => [
      one.id, one.gain, one.at, one.muted ? 1 : 0, one.soloed ? 1 : 0,
      one.from ?? '', one.to ?? '',
      one.pan ?? 0, one.repeat ?? 1, one.fadeIn ?? 0, one.fadeOut ?? 0,
      JSON.stringify(one.fx ?? null), JSON.stringify(one.tone ?? null), JSON.stringify(one.clean ?? null),
      one.amped ? `${one.amped.name}#${soundTag(one.amped.audio)}` : '',
      soundTag(one.audio),
    ].join(':'));
    const shape = [
      layout, rate, Math.round(length * 100),
      master.gain, master.ceilingDb, master.matchLoudness ? 1 : 0,
      master.rumbleHz ?? '', master.hissDb ?? '',
      Math.round(trim * 10_000), ...parts,
    ].join('|');
    /* A short, stable digest. Not a hash for security — nothing here is
       secret and nobody gains by colliding with their own earlier mix. It is
       only to keep the reference inside the eighty characters the route
       takes, and to keep it the same string for the same mix. */
    let a = 0x811c9dc5;
    for (let i = 0; i < shape.length; i += 1) {
      a ^= shape.charCodeAt(i);
      a = Math.imul(a, 0x01000193) >>> 0;
    }
    return `${lanes.length}-${Math.round(length)}-${a.toString(36)}`;
  }, [lanes, layout, master, rate, trim]);

  /**
   * Charges for a finished mix, and answers whether it may be handed over.
   *
   * Called with the mix already rendered, for the reason `app/api/madehere`
   * sets out at length: charging first would need a refund path, a refund
   * path needs an amount, and the only place a later request could get one
   * is the browser.
   */
  const payFor = useCallback(async (length: number): Promise<boolean> => {
    try {
      /* `callerFrom` reads the `Authorization` header and nothing else —
         there is no cookie session here — so without this the route cannot
         see a signed-in person and answers "Sign in first". It did, for as
         long as this call has existed, and the sentence it printed was true
         about the request and wrong about her. Found in the cutting room on
         5 October 2026; this call had the identical hole. */
      const token = await accessToken();
      const answer = await fetch('/api/madehere', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kind: 'mix', seconds: length, ref: signature(length) }),
      });
      if (answer.ok) return true;
      const said = (await answer.json().catch(() => null)) as { message?: string } | null;
      /* Their sentence: `charge` knows whether it is a sign-in, an empty
         balance or a plan, and each needs a different thing done about it. */
      setProblem(said?.message ?? t('pro.notPaid', 'That could not be paid for just now.'));
      return false;
    } catch {
      setProblem(t('pro.notPaid', 'That could not be paid for just now.'));
      return false;
    }
  }, [signature, t]);

  const keep = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setProblem(null);
    try {
      /* The same master, and the same trim the mixer was listening through.
         A render that worked out its own number would be a file that is not
         the mix somebody approved. */
      const mixed = await mixSession(lanes, rate, master, trim);
      if (!mixed) {
        setProblem(t('pro.mixFailed', 'The mix could not be made.'));
        return false;
      }
      if (!(await payFor(mixed.duration))) return false;
      const file = encodeWav(mixed, layout);
      /* Not doubled: "AI voice, kept under yours" is The Booth's guide
         voice, which this room never plays. And the take filed beside the
         mix is the mix — a session of lanes has no one take, and handing
         The Booth's last recording in its place filed a recording that is
         not in this song. See `onKeep` above. */
      await onKeep(file, false, file);
      return true;
    } catch {
      setProblem(t('pro.mixFailed', 'The mix could not be made.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [lanes, layout, master, onKeep, payFor, rate, t, trim]);

  const heard = useMemo(() => audible(lanes), [lanes]);

  /* ── Out of the room, as a file ─────────────────────────────────

     The owner, 15 September 2026: *"Onthou die volledige mixing moet uiteindelik
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

  /* ── TONE3000: out to their screens, and back to the shelf ───────────
 
     Their Select flow is their sign-in, their browser and their player —
     their own words are *"zero auth UI or tone browser to build"* — so
     three of their seven design requirements are met by not building
     something.
 
     The journey LEAVES this page. She goes to their site, chooses, and
     comes back on a fresh load, which is why none of this can live on a
     lane: the lane she pressed on may be gone by then. What comes back
     lands on the SHELF, which is storage rather than state, so every lane
     row sees it and one press puts it on any of them. */
  const [t3kSaid, setT3kSaid] = useState('');

  /**
   * The tone she chose, proved and put on the shelf.
   *
   * Proved with `loads`, which is the one line inside `through` that decides
   * whether this engine can read a capture, without any audio around it. A
   * shelf that fills with files that will not load is worse than no shelf:
   * every one is a press that fails later with nothing on the row to say
   * which. The same rule the file picker has followed since it was written.
   */
  const takeTone = useCallback(async (toneId: string) => {
    if (!toneId) return;
    setT3kSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch(`/api/tone3000/tone?tone=${encodeURIComponent(toneId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const said = await answer.json().catch(() => null) as
        { nam?: string; name?: string; why?: string; theirStatus?: number } | null;
      if (!answer.ok || !said?.nam) {
        /* ── Why, and not just that ───────────────────────────────────
 
           This said "That amp could not be brought in" for six different
           refusals. The owner pressed it on 6 October, got that sentence, and
           neither of us could tell an amp with no NAM file in it from
           TONE3000 refusing the download from our own database being
           unreachable — three problems with three different answers, and
           one of them is "pick a different amp", which she could have done
           in ten seconds if anything had said so.
 
           The route has carried `why` since it was written. The screen was
           throwing it away. Her TONE3000 sign-in keeps its own line because
           it is the only one whose answer is to go back through their
           door. */
        setT3kSaid(
          said?.why === 'signin' || said?.why === 'expired'
            ? t('pro.t3kAgain', 'Sign in to TONE3000 again to bring this amp in.')
            : said?.why === 'nonam'
              ? t('pro.t3kNoNam', 'That one has no NAM capture in it — it may be in another format, like AIDA-X. Pick an amp whose files list a .nam.')
              : said?.why === 'gone'
                ? t('pro.t3kNoFile', 'TONE3000 has no file to download for that amp.')
                : said?.why === 'store'
                  ? `${t('pro.t3kStore', 'The file was found and would not download. Worth one more try.')}${said?.theirStatus ? ` (${said.theirStatus})` : ''}`
                  : said?.why === 'refused'
                    /* Their code on the end. A bare number in a sentence a
                       member reads is not pretty, and it is the difference
                       between an evening of guessing and one message: a 401
                       is a sign-in that is not what we think it is, a 403 a
                       permission never asked for, a 429 too many tries, a
                       500 their bad minute. Only shown where it exists. */
                    ? `${t('pro.t3kRefused', 'TONE3000 refused the download. Try another amp; if it keeps happening, sign in to TONE3000 again.')}${said?.theirStatus ? ` (${said.theirStatus})` : ''}`
                    : said?.why === 'database'
                      ? t('pro.t3kOurs', 'Something on our side could not be reached. Try again in a moment.')
                      : t('pro.t3kGone', 'That amp could not be brought in.'),
        );
        return;
      }
      const name = ampName(said.nam);
      if (!(await loads(said.nam))) {
        setT3kSaid(t('pro.t3kNoLoad', 'That capture did not load as an amp here.'));
        return;
      }
      await rememberAmp({
        id: ampId(),
        name,
        from: said.name ?? `${toneId}.nam`,
        bytes: said.nam.length,
        createdAt: new Date().toISOString(),
      }, said.nam);
      setT3kSaid(t('pro.t3kGot', 'It is on your amp shelf. Put it on a track.'));
    } catch {
      setT3kSaid(t('pro.t3kGone', 'That amp could not be brought in.'));
    }
  }, [t]);

  /* ── Coming back from their page ─────────────────────────────────────
 
     Read off the address rather than handed down a bus. The callback puts
     `?t3k=ja&tone=…` on the way back in, and this room is the only thing
     that knows what to do with a tone id — so it reads it where it lands
     and takes it off the address afterwards, or a refresh would fetch the
     same capture again.
 
     `af` is her closing their window while already signed in, which is
     their third outcome and not a failure: there is simply no tone. It is
     said plainly rather than left as silence, because silence after a
     journey reads as something broken. */
  useEffect(() => {
    const here = new URL(window.location.href);
    const how = here.searchParams.get('t3k');
    if (!how) return;
    const tone = here.searchParams.get('tone') ?? '';
    here.searchParams.delete('t3k');
    here.searchParams.delete('tone');
    here.searchParams.delete('why');
    here.searchParams.delete('room');
    window.history.replaceState(null, '', `${here.pathname}${here.search}${here.hash}`);
    if (how === 'ja' && tone) void takeTone(tone);
    else if (how === 'af') setT3kSaid(t('pro.t3kNone', 'No amp was chosen.'));
    else if (how === 'no') setT3kSaid(t('pro.t3kNo', 'TONE3000 could not be reached just now.'));
  }, [takeTone, t]);

  /* Returns whether the file was written, because the button says so now:
     save it → rendering it… → saved. The render is the slow part — a whole
     mix, offline — so a press with no answer is a press somebody makes
     twice, and two renders of the same session is the wait twice over.

     `saving` stays: the Library button beside this one reads it to stand
     down while a render is out, which is a different fact from this button's
     own state and belongs to the room. */
  const toPhone = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setProblem(null);
    try {
      const mixed = await mixSession(lanes, rate, master, trim);
      if (!mixed) {
        setProblem(t('pro.mixFailed', 'The mix could not be made.'));
        return false;
      }
      if (!(await payFor(mixed.duration))) return false;
      const { blob, ext } = await writeSound(mixed, layout);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      /* The song's own name, so a phone's downloads folder is readable.
         Anything a file system might refuse becomes a dash, and a song with
         no name at all still gets a file rather than an error. */
      const safe = (title || t('pro.untitled', 'song')).replace(/[^\p{L}\p{N} _-]/gu, '-').trim();
      /* The layout goes in the name unless it is the ordinary one. Comparing
         the three means downloading all three, and three files called
         `song.wav` become `song (1).wav` and `song (2).wav` — which is a
         phone's downloads folder telling you nothing about the one thing
         you downloaded them to tell apart. Stereo keeps its plain name so
         nothing about the existing file changes. */
      link.download = `${safe || 'song'}${layout === 'stereo' ? '' : ` (${layout})`}${ext === 'wav' && depth !== 16 ? ` (${depth}-bit)` : ''}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      setProblem(t('pro.mixFailed', 'The mix could not be made.'));
      return false;
    } finally {
      setSaving(false);
    }
    /* `depth` and `payFor` were missing, so "Save to my phone" went on
       writing whichever bit depth was chosen when the callback was last
       made — 16-bit, for anybody who picked 24 or 32 after opening the room
       — and charged against a signature of the mix as it was then. Found on
       15 October 2026. */
  }, [lanes, layout, master, payFor, rate, t, title, trim, writeSound, depth]);

  /* ── The desks ────────────────────────────────────────────────────

     The owner, 14 September 2026: *"Bo op die 4 buttons heel onder is 'n tweede
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

  /* ── The cut, which is a cut and costs nothing ──────────────────

     The owner, 15 September: *"Die cut tool doen niks nie. Daar moet 'n
     moontlikheid wees om die timeline te split."*

     There was no cut tool. There were two pairs of scissors that meant
     something else: "split the voice off" and "split into named parts" are
     both AI separations that cost credits and take half a minute, and one
     of them was drawn with a pair of scissors — which in every desk on
     earth means "cut here". So the one thing scissors obviously does was
     the one thing the room could not do.

     This is the DAW one. One lane becomes two, both pointing at the same
     recording with different pieces of it: nothing is rendered, nothing is
     uploaded, nothing is spent, and it is undone by dragging an edge back.

     On a repeated clip it cuts at the nearest seam rather than inside a
     repetition, because a repetition cut in half cannot be said in this
     model — and because a musician splitting a looped part means "at the
     top of a bar", which is what the seam is. */
  const cutHere = useCallback(() => {
    const lane = lanes.find((one) => one.id === picked);
    if (!lane) return;
    const window = windowOf(lane);
    const once = window.to - window.from;
    const times = repeatOf(lane);
    const into = at - lane.at;
    /* A tenth of a second at each end, which is the same floor the drag
       handles use: a cut that leaves a sliver leaves two lanes where one of
       them is a click. */
    if (!(into > 0.1 && into < once * times - 0.1)) {
      setProblem(
        t('pro.cutWhere', 'Put the line inside the lane first — the cut happens where the line is.'),
      );
      return;
    }
    setProblem(null);
    setStale(true);
    /* The fade in stays with the front half and the fade out with the back.
       Both halves used to carry both, so a lane that faded in and out became
       two that each did — a dip to silence at the cut that nobody drew.
       `fadedApart` in lib/session.ts holds the same rule for a region. */
    const left: Lane = { ...lane, id: `${lane.id}-a`, name: lane.name, fadeOut: undefined };
    const right: Lane = { ...lane, id: `${lane.id}-b`, name: lane.name, fadeIn: undefined };

    /* Two lanes where there was one, and there is no button that joins them
       back up — so this is not one of the free ones however cheap it looks.
       Both halves still point at the same recording, which is why the cut
       costs nothing; it is the SESSION that cannot be put back by hand. */
    remember(t('undo.split', 'die sny in twee'));
    if (times > 1) {
      const seam = Math.max(1, Math.min(times - 1, Math.round(into / once)));
      setLanes((was) =>
        was.flatMap((one) =>
          one.id !== lane.id
            ? [one]
            : [
                { ...left, repeat: seam },
                { ...right, at: lane.at + seam * once, repeat: times - seam },
              ],
        ),
      );
      setPicked(`${lane.id}-a`);
      return;
    }
    setLanes((was) =>
      was.flatMap((one) =>
        one.id !== lane.id
          ? [one]
          : [
              { ...left, from: window.from, to: window.from + into, repeat: 1 },
              {
                ...right,
                at: lane.at + into,
                from: window.from + into,
                to: window.to,
                repeat: 1,
              },
            ],
      ),
    );
    setPicked(`${lane.id}-a`);
  }, [at, lanes, picked, t]);

  /* ── A marked piece of the song ──────────────────────────────────────

     The owner, 15 September 2026: *"Is daar nie 'n manier om ekstra dragging
     lines in die timeline te hê wat 'n gedeelte uitsonder, dan highlight
     daai gedeelte met 'n button wat op pop met verskillende opsies binne die
     button, cut, dalk ai tool wat die klank verbeter, of 'n instrument
     generate vir daai gedeelte, jy sal waarskynlik beter weet watter tools
     nodig is."*

     ── What it is, and what it is not ──────────────────────────────────

     The mark is TIME. It is drawn across every lane, because a piece of a
     song is a piece of a song. The lane it acts on is the lane that is open
     — the same "Which lane" choice every other desk in this room is scoped
     by, so there is one answer to "which sound is this about" rather than
     two that can disagree.

     ── Why these tools and not others ──────────────────────────────────

     Every one of them is `carveLane` and then something. Nothing here
     renders a session, nothing re-reads a take, and only the last two spend
     anything — which is why the free ones are at the top: cutting a piece
     out, keeping only it, repeating it and fading it are what a person does
     to a marked piece ninety times out of a hundred, they happen the instant
     they are pressed, and every one of them is undone by dragging an edge
     back.

     Generating a part for the mark is better than generating one without it,
     and that is the whole reason it is on this list: the length comes from
     the piece she drew instead of from a guess at how many bars she meant.

     The one thing on her list that is NOT here is the AI cleanup. It is not
     free, it is not instant, and there is no service wired to this room that
     improves a marked second and a half of audio — so it is not offered.
     Taking the room off a lane is the nearest thing that exists, it lives on
     that lane's own card, and a button here promising to "make it better"
     would have been a button that could not. */
  const [region, setRegion] = useState<{ readonly from: number; readonly to: number } | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  /* What the marked piece sounds like (`whatsIn`). The owner, 28 October
     2026: "hum and instrument or vocal in this part". Read on a press, for
     `CREDITS.whatsIn` — *"Niks 1 credit nie. Altyd 2"* — and forgotten when
     the sheet closes or the mark moves, so an answer is never about a
     different piece. */
  const [pieceHeard, setPieceHeard] = useState<readonly PieceHeard[] | null>(null);
  useEffect(() => { setPieceHeard(null); }, [regionOpen, region, picked]);
  const askPiece = useCallback(async (): Promise<void> => {
    if (!region) return;
    const lane = lanes.find((one) => one.id === picked);
    const ctx = context();
    const carved = lane ? carveLane(lane, region.from, region.to) : null;
    if (!lane || !carved || !ctx) {
      setProblem(t('hum.noLane', 'Nothing could be read from that piece. Open a lane with a hum or a tapped rhythm on it, and mark a part of it.'));
      return;
    }
    if (!(await payTool('heard', `${lane.id}|${region.from}|${region.to}`))) return;
    const sound = playsOf(carved.inside, ctx);
    setPieceHeard(whatsIn(sound.getChannelData(0), sound.sampleRate));
  }, [region, lanes, picked, context, payTool, t]);
  /* ── Loop the marked piece ─────────────────────────────────────────────
     The owner, 18 October 2026: play a marked piece round and round, and sing
     over it until one is right. The clock reads `loopSpan`; a piece shorter
     than a quarter of a second is not a loop, it is a stutter. */
  const [looping, setLooping] = useState(false);
  useEffect(() => {
    loopSpan.current = looping && region && region.to - region.from >= 0.25 ? region : null;
  }, [looping, region]);
  useEffect(() => {
    if (!region) setLooping(false);
  }, [region]);
  /* The phone's back button closes the tools rather than leaving the room —
     the same rule every other overlay in here follows. */
  useBackLayer(regionOpen, () => setRegionOpen(false));
  /* The desks and the "Generate a part" sheet, which take the whole screen
     and were not layers at all: Back from inside one left the booth. Found
     on 15 October 2026 going through every function in the room. The desk
     is registered when it opens, so it sits above the booth's own layer;
     the part sheet opens from a desk and so sits above that. */
  useBackLayer(deskOpen !== null, () => setDeskOpen(null));
  useBackLayer(partOpen, () => setPartOpen(false));

  /**
   * The marked piece, carved out of the open lane, without committing it.
   *
   * Every tool below starts here, so the reasons it can fail — no lane open,
   * the mark sitting where that lane is not — are said once in one voice
   * rather than five times in five.
   */
  const carveHere = useCallback((): { lane: Lane; carved: Carved } | null => {
    if (!region || region.to - region.from < 0.1) return null;
    const lane = lanes.find((one) => one.id === picked);
    if (!lane) {
      setProblem(
        t('pro.regionNoLane', 'Open a lane first — tap its name on the left. The marked piece works on whichever lane is open.'),
      );
      return null;
    }
    const carved = carveLane(lane, region.from, region.to);
    if (!carved) {
      setProblem(
        t('pro.regionMiss', 'The marked piece does not cross that lane. Move the mark over it, or open the lane it does cross.'),
      );
      return null;
    }
    setProblem(null);
    return { lane, carved };
  }, [lanes, picked, region, t]);

  /** The three pieces back into the session, in the order they play. */
  const commit = useCallback((
    what: string,
    id: string,
    pieces: readonly (Lane | null)[],
  ): Lane[] => {
    /* Every region operation lands here, so this is the one place undo has
       to be told about them — a fade, a cut, a keep, a repeat and a send
       are one remembered step each, named by whoever called. */
    remember(what);
    const kept = pieces.filter((one): one is Lane => one !== null);
    setLanes((was) => was.flatMap((one) => (one.id !== id ? [one] : kept)));
    setStale(true);
    return kept;
  }, [remember]);

  /** Out, leaving the gap. */
  const regionCut = useCallback(() => {
    const got = carveHere();
    if (!got) return;
    const kept = commit(t('undo.cut', 'die uitsny'), got.lane.id, [got.carved.before, got.carved.after]);
    setPicked(kept[0]?.id ?? null);
    setRegion(null);
    setRegionOpen(false);
  }, [carveHere, commit]);

  /** Only this, and the rest of the lane gone. */
  const regionKeep = useCallback(() => {
    const got = carveHere();
    if (!got) return;
    commit(t('undo.keep', 'die weggooi van die res'), got.lane.id, [got.carved.inside]);
    setPicked(got.carved.inside.id);
    setRegionOpen(false);
  }, [carveHere, commit]);

  /**
   * Round twice, and everything after it on that lane moves along.
   *
   * Only that lane. A repeat that pushed every other lane along would be a
   * different operation — an insert into the arrangement — and it is not
   * what a person marking one part of one lane is asking for.
   */
  const regionRepeat = useCallback(() => {
    const got = carveHere();
    if (!got) return;
    const { before, inside, after } = got.carved;
    const extra = lengthOf(inside);
    commit(t('undo.repeat', 'die herhaling'), got.lane.id, [
      before,
      { ...inside, repeat: Math.min(64, repeatOf(inside) * 2) },
      after ? { ...after, at: after.at + extra } : null,
    ]);
    setPicked(inside.id);
    setRegionOpen(false);
  }, [carveHere, commit]);

  /**
   * Up out of silence, or down into it, across the marked piece.
   *
   * The only one of these that makes new samples. It has to: a fade set on a
   * gain node would be in the preview and not in the export, and the rule
   * this room is built on is that what she hears and what renders are the
   * same thing. So the carved middle gets a buffer of its own — a second or
   * two of audio, not a copy of the take — and the lane either side goes on
   * pointing at the recording.
   */
  const regionFade = useCallback(
    (way: 'in' | 'out') => {
      const ctx = context();
      if (!ctx) return;
      const got = carveHere();
      if (!got) return;
      const { before, inside, after } = got.carved;
      commit(t('undo.fade', 'die in- of uitdoof'), got.lane.id, [
        before,
        {
          ...inside,
          audio: fadedCopy(playsOf(inside, ctx), ctx, way),
          /* Baked, so the window, the repeats and the amp that were folded
             into those samples must not be applied to them a second time. */
          amped: undefined,
          from: undefined,
          to: undefined,
          repeat: 1,
          /* And the corner fade going the same way is replaced by the one
             just written into the samples — keeping both faded the piece
             twice, down to nothing well before the mark said. The other
             corner is left: a fade up at the front of a lane is not undone
             by fading its end down. */
          ...(way === 'in' ? { fadeIn: undefined } : { fadeOut: undefined }),
        },
        after,
      ]);
      setPicked(inside.id);
      setRegionOpen(false);
    },
    [carveHere, commit, context],
  );

  /**
   * A part generated for exactly this long.
   *
   * The nearest whole number of bars the engine will take, at the room's own
   * tempo — which is the improvement over the panel on its own. It opens the
   * same panel, already filled in, with the playhead moved to the front of
   * the mark so the part lands where she drew it.
   */
  const regionPart = useCallback(() => {
    if (!region) return;
    const kept = sane(meter);
    const want = region.to - region.from;
    const bars = BAR_CHOICES.reduce((best, one) =>
      Math.abs(secondsFor(one, kept.bpm, kept.beats) - want) <
      Math.abs(secondsFor(best, kept.bpm, kept.beats) - want)
        ? one
        : best,
    );
    setPartBars(bars);
    seek(region.from);
    setRegionOpen(false);
    setPartOpen(true);
  }, [meter, region, seek]);

  /**
   * The paid two, run on the marked piece alone.
   *
   * Carved first and then handed on, so what goes up the wire is the piece
   * she drew rather than the whole lane — which is the difference between
   * being billed for two bars and being billed for three minutes. Both of
   * them already take a lane and send `pieceOf` it; there is nothing to
   * change in either.
   */
  /* Up to three at once (The owner, 14 October 2026: "die ai magic vir
     humming wat weer stems create"): one hum, played back as a stem per
     instrument, each on a lane of its own. A fourth press replaces the
     oldest, so the list never needs emptying first. */
  const [humVoices, setHumVoices] = useState<VoiceId[]>(['bass']);
  const pickHumVoice = (id: VoiceId): void => setHumVoices((was) => (
    was.includes(id)
      ? (was.length > 1 ? was.filter((one) => one !== id) : was)
      : [...was, id].slice(-3)
  ));

  const [humming, setHumming] = useState(false);
  /* `humIt` is made further down, with the hum card it belongs to; the
     marked piece reaches it through this, filled in once it exists. */
  const humRef = useRef<((piece?: { audio: AudioBuffer; at: number }) => Promise<void>) | null>(null);

  const regionSend = useCallback(
    (what: 'voice' | 'parts' | 'clean' | 'change' | 'hum') => {
      const ctx = context();
      const got = carveHere();
      if (!got || !ctx) return;
      const { before, inside, after } = got.carved;
      commit(t('undo.mark', 'die merk van die stuk'), got.lane.id, [before, inside, after]);
      setPicked(inside.id);
      setRegionOpen(false);
      if (what === 'voice') void split(inside);
      else if (what === 'parts') void intoParts(inside);
      else if (what === 'clean') void deRoom(inside);
      else if (what === 'change') setChanging(inside);
      else void humRef.current?.({ audio: playsOf(inside, ctx), at: inside.at });
    },
    [carveHere, commit, context, deRoom, intoParts, split],
  );

  /**
   * The transition across the mark, smoothed: the level glides from the
   * front of the mark to its end instead of jumping, for `CREDITS.smoothJoin`,
   * and written into the sound like a fade, so the export has it too. `smoothedCopy` in
   * lib/session.ts does the measuring.
   */
  const regionSmooth = useCallback(async () => {
    const ctx = context();
    if (!ctx) return;
    const got = carveHere();
    if (!got) return;
    if (!(await payTool('smooth', `${got.lane.id}|${region?.from}|${region?.to}|${Date.now()}`))) return;
    const { before, inside, after } = got.carved;
    commit(t('undo.smooth', 'die gladde oorgang'), got.lane.id, [
      before,
      { ...inside, audio: smoothedCopy(playsOf(inside, ctx), ctx), amped: undefined, from: undefined, to: undefined, repeat: 1 },
      after,
    ]);
    setPicked(inside.id);
    setRegionOpen(false);
  }, [carveHere, commit, context, payTool, region]);

  /* The keyboard. The owner, 14 October 2026: "Die keyboard shortcuts vir sekere
     goed moet ook kan werk". The same keys the video editor answers: Ctrl+Z
     and Ctrl+Y (or Ctrl+Shift+Z) step back and forward, Space plays and
     stops, S cuts the open lane at the playhead, and Delete takes out the
     stretch marked on it. Never while somebody is typing in a box. Held in a
     ref so the listener is added once and always calls today's functions. */
  /* ── The transport row ─────────────────────────────────────────────────

     See `BoothTransport` for why it exists. Each of these is the room's own
     function under a studio's name: nothing here plays, records or loops by
     a route of its own. */
  const toStart = useCallback((): void => {
    if (recording) return;
    seek(0);
  }, [recording, seek]);
  /** Stop, and back to where play began. Stopped already, to the very start. */
  const stopAll = useCallback((): void => {
    if (recording) { void stopRecording(); return; }
    if (!playing) { setAt(0); return; }
    const back = looping && region ? region.from : startedRef.current.from;
    stopPlaying();
    setAt(Math.max(0, back));
  }, [recording, stopRecording, playing, looping, region, stopPlaying]);
  const recordToggle = useCallback((): void => {
    if (recording) void stopRecording();
    else if (!busy && !making) void record();
  }, [recording, stopRecording, busy, making, record]);
  /** Loop the marked piece; with nothing marked, four bars from the bar the line is in. */
  const loopToggle = useCallback((): void => {
    if (recording) return;
    if (looping) { setLooping(false); return; }
    let piece = region;
    if (!piece || piece.to - piece.from < 0.25) {
      const bar = barSeconds(sane(meter));
      const first = Math.max(0, Math.floor(live.now() / bar) * bar);
      piece = { from: first, to: Math.min(Math.max(total, first + bar), first + bar * 4) };
      setRegion(piece);
    }
    setLooping(true);
    loopSpan.current = piece;
    if (!playing) {
      setAt(piece.from);
      play(piece.from);
    }
  }, [recording, looping, region, meter, live, total, playing, play]);
  /** The click on or off — and, while playing, from this moment rather than the next play. */
  const clickToggle = useCallback((): void => {
    const next = !clicking;
    setClicking(next);
    if (!playing && !recording) return;
    if (!next) { metronomeRef.current?.stop(); return; }
    const beat = clicker();
    if (!beat) return;
    beat.setVolume(clickDb);
    beat.start(sane(meter), division, startedRef.current.at - startedRef.current.from, live.now());
  }, [clicking, playing, recording, clicker, clickDb, meter, division, live]);

  /* Markers: one press sets one where the line is, or takes away the one it
     stands on. A tenth of a second is "on it": a thumb cannot do better on a
     three-minute song, and two markers that close are one. */
  const markerAt = markers.find((one) => Math.abs(one - at) < 0.1);
  const markerToggle = useCallback((): void => {
    const here = live.now();
    setMarkers((was) => {
      const near = was.find((one) => Math.abs(one - here) < 0.1);
      if (near !== undefined) return was.filter((one) => one !== near);
      return [...was, Math.round(here * 1000) / 1000].sort((a, b) => a - b);
    });
  }, [live]);
  const toMarker = useCallback((way: -1 | 1): void => {
    const here = live.now();
    const next = way > 0
      ? markers.find((one) => one > here + 0.05)
      : [...markers].reverse().find((one) => one < here - 0.05);
    if (next !== undefined) seek(next);
    else if (way < 0) seek(0);
  }, [markers, live, seek]);

  /* ── Copy, paste, duplicate ───────────────────────────────────────────
     A lane is a track and its one clip at once, so a copy is a new lane:
     pasted where the line is, or duplicated straight after the original so
     it carries on from where it ends — a chorus played twice. The sound is
     not copied (a lane's audio is never changed in place, only replaced), so
     a copy costs nothing however long the take. */
  const clip = useRef<Lane | null>(null);
  const [hasClip, setHasClip] = useState(false);
  const copyLane = useCallback((): void => {
    const lane = lanes.find((one) => one.id === picked);
    if (!lane) return;
    clip.current = lane;
    setHasClip(true);
  }, [lanes, picked]);
  const placeCopy = useCallback((from: Lane, where: number): void => {
    remember(t('undo.copy', 'the copy'));
    const made: Lane = {
      ...from,
      id: `lane-copy-${Date.now()}`,
      name: `${from.name} · ${t('daw.copyName', 'copy')}`,
      at: Math.max(0, where),
      muted: false,
      soloed: false,
      backing: undefined,
    };
    setLanes((was) => [...was, made]);
    setPicked(made.id);
    setStale(true);
  }, [remember, t]);
  const pasteLane = useCallback((): void => {
    if (clip.current) placeCopy(clip.current, live.now());
  }, [placeCopy, live]);
  const duplicateLane = useCallback((): void => {
    const lane = lanes.find((one) => one.id === picked);
    if (lane) placeCopy(lane, lane.at + lengthOf(lane));
  }, [lanes, picked, placeCopy]);

  const keyed = useRef({ stepBack, stepForward, cutHere, regionCut, play, stopPlaying, playing, at, region, recording, stopRecording, toStart, recordToggle, loopToggle, clickToggle, markerToggle, toMarker, copyLane, pasteLane, duplicateLane });
  keyed.current = { stepBack, stepForward, cutHere, regionCut, play, stopPlaying, playing, at, region, recording, stopRecording, toStart, recordToggle, loopToggle, clickToggle, markerToggle, toMarker, copyLane, pasteLane, duplicateLane };
  useEffect(() => {
    const press = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const now = keyed.current;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'z') { event.preventDefault(); if (event.shiftKey) now.stepForward(); else now.stepBack(); return; }
      if (mod && key === 'y') { event.preventDefault(); now.stepForward(); return; }
      /* Copy, paste and duplicate the open lane — but only when nothing is
         selected on the page, so copying a sentence still copies it. */
      const selecting = Boolean(window.getSelection?.()?.toString());
      if (mod && key === 'c' && !selecting) { now.copyLane(); return; }
      if (mod && key === 'v') { event.preventDefault(); now.pasteLane(); return; }
      if (mod && key === 'd') { event.preventDefault(); now.duplicateLane(); return; }
      if (mod || event.altKey) return;
      if (key === 'home') { event.preventDefault(); now.toStart(); return; }
      if (key === 'r') { now.recordToggle(); return; }
      if (key === 'l') { now.loopToggle(); return; }
      if (key === 'k') { now.clickToggle(); return; }
      if (key === 'm') { now.markerToggle(); return; }
      if (key === ',') { now.toMarker(-1); return; }
      if (key === '.') { now.toMarker(1); return; }
      if (key === ' ' && !(target && target.closest('button'))) {
        event.preventDefault();
        /* Mid-take, Space ends the take. It used to stop the song and leave
           the recorder running against silence — the same two-buttons-one-
           word trap the transport strip's "Stop recording" was renamed for. */
        if (now.recording) void now.stopRecording();
        else if (now.playing) now.stopPlaying(); else now.play(now.at);
        return;
      }
      if (key === 's') { now.cutHere(); return; }
      if ((key === 'delete' || key === 'backspace') && now.region) { event.preventDefault(); now.regionCut(); }
    };
    window.addEventListener('keydown', press);
    return () => window.removeEventListener('keydown', press);
  }, []);

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
          'What the song is in. A generated part is asked for in this key, so a bass line comes back in the same key as the rest, and the voice tuner pulls notes onto it.',
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
              ? 'border-sky-500 bg-sky-500/15 text-sky-300'
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
                className="h-11 min-w-0 flex-1 accent-sky-500 touch-manipulation"
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
        {/* ── Cut, and how many times it goes round ────────────────

            Above the row rather than in it, because it is the only free
            thing among five paid ones and because it is the one she looked
            for and could not find. */}
        {picked && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cutHere}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100"
            >
              <Scissors className="h-4 w-4" />
              {t('pro.cutAt', 'Cut where the line is')}
            </button>
            <Hint>
              {t(
                'pro.cutAtWhat',
                'Splits this lane in two at the playhead, and uses no credits. Both halves point at the same recording, so nothing is lost — drag an edge back and it is whole again. Move the white line first: the cut happens where the line is.',
              )}
            </Hint>
            {/* No `?? lanes[0]`. With nothing picked this printed the FIRST
                lane's repeat count beside the cut button for whatever lane
                the eye was on — a number about somebody else's lane, which is
                worse than no number. Same family as the presenter's cast
                picker; see the note on `member` in `Presenter.tsx`. */}
            {(() => {
              const pickedLane = lanes.find((one) => one.id === picked);
              if (!pickedLane) return null;
              const times = repeatOf(pickedLane);
              if (times <= 1) return null;
              return (
                <span className="inline-flex items-center gap-1 text-sm" style={{ color: INK_DIM }}>
                  <Repeat className="h-4 w-4" />
                  ×{times}
                </span>
              );
            })()}
          </div>
        )}

        {/* ── Where this lane sits, and what it is locked to ────────────

            The owner, 16 September 2026: *"Tracks moet ook geswitch kan word,
            menend op en af beweeg en omgeruil word"* and *"'n interlock
            funksie om twee tydlyne met mekaar vas te maak."*

            Both of them here rather than in the timeline's gutter, and that
            is a measurement and not a preference. The gutter is 96 pixels —
            two 44-pixel buttons and the gaps — and it already holds the
            name, the mute and the solo, with the name button overlapping the
            other two by ten pixels as it is. There is no fourth or fifth
            button's worth of room in it on a 390-pixel screen, and shrinking
            any of them below 44 is the rule this room has already been
            through once.

            So they live on the card that is titled with the lane's own name
            and opens when you tap that name — which is where the rest of
            this lane's controls are, and is reachable with one thumb. */}
        {picked && lanes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {([-1, 1] as const).map((way) => {
              /* `canMove`, not "is this index 0". A lane sitting at index 1
                 whose locked group starts at index 0 cannot go up either —
                 the group is the unit, so the question has to be asked of
                 the group. The old index test greyed out exactly one button
                 and let the rest lie. */
              const off = !canMove(lanes, picked, way === -1 ? 'up' : 'down');
              return (
                <button
                  key={way}
                  type="button"
                  disabled={off}
                  onClick={() => shuffleLane(picked, way)}
                  title={
                    way === -1
                      ? t('pro.laneUpWhat', 'Move this lane one place up, and everything locked to it with it. It changes the order the lanes are drawn in and the colour this one takes; it changes nothing about the sound, because a mix is a sum.')
                      : t('pro.laneDownWhat', 'Move this lane one place down, and everything locked to it with it.')
                  }
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 disabled:opacity-40"
                >
                  {way === -1 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {way === -1 ? t('pro.laneUp', 'Move up') : t('pro.laneDown', 'Move down')}
                </button>
              );
            })}
            <Hint>
              {t(
                'pro.interlockWhat',
                'Lock this lane to another one and the two move together: drag either and both slide by the same amount, so a part that sits under another part stays under it. Only time is locked — the level, the mute, the solo and the cut stay each lane\u2019s own, because those are what you lock two lanes in order to be able to set differently. Press a locked lane again to let it out.',
              )}
            </Hint>
          </div>
        )}

        {picked && lanes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: INK_DIM }}>
              {t('pro.interlock', 'Lock to')}
            </span>
            {lanes
              .filter((one) => one.id !== picked)
              .map((one) => {
                const mine = lanes.find((two) => two.id === picked);
                const locked = Boolean(mine?.link && mine.link === one.link);
                return (
                  <button
                    key={one.id}
                    type="button"
                    onClick={() => interlock(picked, one.id)}
                    aria-pressed={locked}
                    className={`inline-flex min-h-[44px] max-w-[11rem] items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
                      locked
                        ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {locked ? <Link2Off className="h-4 w-4 shrink-0" /> : <Link2 className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{one.name}</span>
                  </button>
                );
              })}
          </div>
        )}

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
            onRemove={() => {
              remember(t('undo.lane', 'die weggooi van die baan'));
              setLanes((was) => was.filter((one) => one.id !== lane.id));
            }}
            onSplit={() => void split(lane)}
            onVoice={() => setChanging(lane)}
            onRead={() => void look(lane)}
            onParts={() => void intoParts(lane)}
            reading={looking === lane.id}
            found={known[lane.id]}
            onUseTempo={(bpm, root) =>
              setMeter((was) => sane({ ...was, bpm, key: root ?? was.key }))
            }
            onSave={(what) => void saveLane(lane, what)}
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

  /* ── Getting the song out of the room ─────────────────────────

     The owner, 15 September: *"Dan wil ek weet hoe export 'n liedjie? Ek sien
     nerens iets oor dit nie?"*

     Both destinations existed and neither was findable. "Save to my phone"
     was the seventh button in a wrapping row on the Audio-effects desk, and
     the way to the channel was a sentence behind a question mark. Somebody
     looking for how a song leaves this room had nowhere to look.

     A card of its own, on Mix & master, which is the desk somebody is on
     when a song is finished — and named with the word she used, because
     that is the word people search a screen for.

     The two are not the same journey and the card says so. The phone is a
     render and a download, here, costing nothing. The channel goes through
     the Library on purpose: one file, one name, one thing that can be
     posted, rather than a second path that could disagree with the first
     about what the song is.

     Both are the paid mixdown — `payFor` charges either, once per mix (see
     `signature`) — so both say the price on the button, as every paid press
     in this app does. This card said "costing nothing" until the capability
     check of 20 October 2026 found it charging without a word. */
  const exportCard = (
    <Card
      wide
      icon={<Download className="h-4 w-4" />}
      title={t('pro.export', 'Export the song')}
      what={t(
        'pro.exportWhat',
        'Both give you the same mix: every lane, its level, where it sits, its cuts and its effects, rendered exactly as the room plays it. The phone is a file you keep; the Library is the copy your channel posts from.',
      )}
    >
      {/* ── Which layout the file comes out in ─────────────────────────

          The owner, 21 September 2026: *"Mono/stereo/dolby surround. Download
          type."*

          Above both buttons, not beside one, because it is a property of
          the file and both doors make the same file — a song that reaches
          her channel in a different layout from the one she just saved to
          her phone is the kind of difference nobody notices until a shop
          plays it.

          The note under it changes with the choice rather than listing all
          three at once. Three paragraphs of explanation above two buttons
          is the wall of writing this room was rebuilt to get rid of, and
          the only one worth reading is the one you have chosen.

          And the surround note says what it is NOT. Dolby is licensed and
          trademarked; this is the matrix fold those decoders unfold, which
          is arithmetic and belongs to nobody. Saying so on the screen is
          the same rule as every other claim in this app. */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold" style={{ color: INK_DIM }}>
          {t('mix.layout', 'How it comes out')}
        </p>
        {/* One under the other, all three the same size. They were 74, 67
            and 148 wide in a wrapping flex, and "Surround (matrix)" is long
            enough that three across would wrap it onto two lines and make
            that row taller than every other control in the desk. */}
        <div className={STACK}>
          {LAYOUTS.map((one) => (
            <button
              key={one.id}
              type="button"
              data-layout={one.id}
              onClick={() => setLayout(layoutById(one.id))}
              aria-pressed={layout === one.id}
              className={`${BAR} border ${
                layout === one.id
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200'
              }`}
            >
              {t(one.label[0], one.label[1])}
            </button>
          ))}
        </div>
        <p className="text-sm leading-snug" style={{ color: INK_DIM }}>
          {(() => {
            const chosen = LAYOUTS.find((one) => one.id === layout) ?? LAYOUTS[0];
            return t(chosen.note[0], chosen.note[1]);
          })()}
        </p>
        {depthPicker}
      </div>

      {/* `again`: a second copy in the phone's downloads folder is nothing
          worse than a second copy, and somebody who cannot find the first
          one will want to press it again. */}
      <SaysDone
        disabled={busy || saving || recording || !heard.length}
        icon={<Download className="h-4 w-4" />}
        label={`${t('pro.toPhone', 'Save to my phone')}${bounceCost > 0 ? ` · ${bounceCost} ${t('pro.credits', 'credits')}` : ''}`}
        busyLabel={t('pro.toPhoneBusy', 'Rendering the mix\u2026')}
        doneLabel={t('pro.toPhoneDone', 'Saved to your phone')}
        again={3000}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-bold text-zinc-100 disabled:opacity-40"
        onDo={toPhone}
      />
      {/* The busy label is the one that earns its place here. This renders
          the whole mix offline before it sends anything, and the label used
          to stay "Send it to my Library" with a spinner beside it — so the
          only way to know the long part had started was to notice a small
          shape change on a button under your thumb.

          The done label is honestly almost never seen: `onKeep` closes this
          room. It is there because a room that does not close — because the
          caller changed, or because it fails on the way out — must not be
          left showing the word that starts the render. No `again` for the
          same reason: there is nothing here to press twice. */}
      <SaysDone
        disabled={busy || saving || recording || !heard.length}
        icon={<Check className="h-4 w-4" />}
        label={`${t('pro.toLibrary', 'Send it to my Library')}${bounceCost > 0 ? ` · ${bounceCost} ${t('pro.credits', 'credits')}` : ''}`}
        busyLabel={t('pro.toLibraryBusy', 'Making one song of it\u2026')}
        doneLabel={t('pro.toLibraryDone', 'It is in your Library')}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl fb-fx-go px-4 text-sm font-bold text-onAccent disabled:opacity-40"
        onDo={keep}
      />
      <p className="text-sm leading-snug" style={{ color: INK_DIM }}>
        {heard.length
          ? soundKind === 'mp3'
            ? t(
                'pro.exportSaysMp3',
                'The phone gets an MP3 and the room stays open. The Library copy is a WAV, closes this room, and the post button there sends it to your channel. One mix is paid for once, whichever you press first.',
              )
            : t(
                'pro.exportSays',
                'The phone gets a WAV and the room stays open. The Library copy closes this room, and the post button there sends it to your channel. One mix is paid for once, whichever you press first.',
              )
          : t('pro.keepNone', 'Record a take or bring audio in, and this makes one song out of all of it.')}
      </p>
    </Card>
  );

  /* ── Mix and master ──────────────────────────────────────

     Three controls and a reading. Not a chain of processors: what is here is
     one multiplication, worked out from a measurement of the actual mix and
     applied identically to what you hear and to what comes out. Drawing a
     compressor that only ran in one of those two places would make the file
     differ from the approval, invisibly. */
  /* ── The mixer: every lane side by side ─────────────────────────────

     The owner, 22 October 2026, asked for every function a studio has. A lane's
     level and pan were on that lane's own row only, one lane at a time, so
     balancing a mix meant opening, nudging and closing each lane in turn —
     with no way to see two levels at once. A mixer is the view where they
     are all up together: a fader, a pan, mute and solo per lane, and a way
     into that lane's effects. Every control is the same field the lane row
     sets, through the same `change`, so the two can never disagree. A
     double press on a fader puts it back to where it started. */
  const mixer = (
    <Card
      wide
      icon={<Sliders className="h-4 w-4" />}
      title={t('daw.mixerTitle', 'Mixer')}
      what={t('daw.mixerWhat', 'Every lane side by side: its level, where it sits left to right, mute and solo. Press a fader twice to put it back to 100.')}
    >
      {/* One lane to a row, lying on its side. The owner, 27 October 2026:
          *"Daai mixer moet eerder sideways."* Upright strips wrapped three to
          a phone and left one lane standing in a third of the card with the
          rest empty. Lying down, every lane uses the full width, the two
          sliders are as long as the screen allows, and the rows line up:
          name and the three buttons on top, then level and pan, each with
          its label on the left and its value on the right in the same
          columns on every lane. On a desk two lanes sit side by side. */}
      <div data-mixer className="grid gap-2 lg:grid-cols-2">
        {lanes.map((lane) => {
          const db = lane.gain > 0 ? 20 * Math.log10(lane.gain) : -Infinity;
          const fxCount = lane.fx ? Object.keys(lane.fx).length : 0;
          const on = picked === lane.id;
          return (
            <div
              key={lane.id}
              data-strip={lane.id}
              onClick={() => setPicked(lane.id)}
              className="min-w-0 rounded-2xl border p-2.5"
              style={{
                borderColor: on ? LIT : EDGE,
                background: on
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.10), rgba(255,255,255,0.02) 60%)'
                  : 'rgba(255,255,255,0.02)',
                boxShadow: on ? '0 0 0 1px rgba(56,189,248,0.25), 0 0 18px rgba(56,189,248,0.15)' : undefined,
              }}
            >
              {/* The name is the strip's label, not a button beside three buttons:
                  touching anywhere on the strip picks the lane, and the three
                  controls are one equal-width set (check:tidybars). */}
              <div className="flex items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate px-1 text-sm font-bold"
                  style={{ color: on ? LIT : INK }}
                  title={lane.name}
                  data-stripname={lane.id}
                >
                  {lane.name}
                </span>
                <div className="grid w-[13.5rem] shrink-0 grid-cols-3 gap-1.5">
                <button
                  type="button"
                  aria-pressed={lane.muted}
                  aria-label={`${t('daw.mute', 'Mute')} · ${lane.name}`}
                  onClick={() => change(lane.id, { muted: !lane.muted })}
                  className="h-11 w-full rounded-xl border text-xs font-black transition-colors"
                  style={lane.muted
                    ? { borderColor: '#f87171', background: 'rgba(248,113,113,0.18)', color: '#fecaca', boxShadow: '0 0 12px rgba(248,113,113,0.35)' }
                    : { borderColor: EDGE, color: INK_DIM }}
                >
                  {t('pro.mute', 'M')}
                </button>
                <button
                  type="button"
                  aria-pressed={lane.soloed}
                  aria-label={`${t('daw.solo', 'Solo')} · ${lane.name}`}
                  onClick={() => change(lane.id, { soloed: !lane.soloed })}
                  className="h-11 w-full rounded-xl border text-xs font-black transition-colors"
                  style={lane.soloed
                    ? { borderColor: '#fbbf24', background: 'rgba(251,191,36,0.18)', color: '#fde68a', boxShadow: '0 0 12px rgba(251,191,36,0.35)' }
                    : { borderColor: EDGE, color: INK_DIM }}
                >
                  {t('pro.solo', 'S')}
                </button>
                <button
                  type="button"
                  onClick={() => { setPicked(lane.id); setDeskOpen('effects'); }}
                  className="h-11 w-full rounded-xl border px-1 text-xs font-bold transition-colors"
                  style={{ borderColor: fxCount ? LIT : EDGE, color: fxCount ? LIT : INK_DIM }}
                >
                  {t('daw.fx', 'Effects')}
                  {fxCount ? ` · ${fxCount}` : ''}
                </button>
              </div>
              </div>
              <div className="mt-1 grid grid-cols-[3.5rem_minmax(0,1fr)_4rem] items-center gap-x-2">
                <span className="text-[11px] font-semibold" style={{ color: INK_DIM }}>{t('pro.level', 'Level')}</span>
                <input
                  type="range"
                  min={0}
                  max={150}
                  value={Math.round(lane.gain * 100)}
                  data-stripfader={lane.id}
                  onChange={(event) => change(lane.id, { gain: Number(event.target.value) / 100 })}
                  onDoubleClick={() => change(lane.id, { gain: 1 })}
                  aria-label={`${t('pro.level', 'Level')} · ${lane.name}`}
                  className="h-11 w-full min-w-0 accent-sky-500 touch-manipulation"
                />
                <span className="text-right text-[11px] tabular-nums" style={{ color: INK }}>
                  {Number.isFinite(db) ? `${db > 0 ? '+' : ''}${db.toFixed(1)} dB` : '−∞'}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: INK_DIM }}>{t('daw.panShort', 'Pan')}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={Math.round((lane.pan ?? 0) * 100)}
                  data-strippan={lane.id}
                  onChange={(event) => change(lane.id, { pan: Number(event.target.value) / 100 })}
                  onDoubleClick={() => change(lane.id, { pan: 0 })}
                  aria-label={`${t('daw.pan', 'Left or right')} · ${lane.name}`}
                  className="h-11 w-full min-w-0 accent-sky-500 touch-manipulation"
                />
                <span className="text-right text-[11px] tabular-nums" style={{ color: INK }}>
                  {Math.abs(lane.pan ?? 0) < 0.01
                    ? t('daw.centre', 'centre')
                    : `${(lane.pan ?? 0) < 0 ? 'L' : 'R'} ${Math.round(Math.abs(lane.pan ?? 0) * 100)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  const mixDesk = (
    <>
      {mixer}
      {exportCard}
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
            className="h-11 min-w-0 flex-1 accent-sky-500 touch-manipulation"
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

          The owner's mastering list had "Take off, rumble, hiss" on it and this
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
              ? 'border-sky-500 bg-sky-500/15 text-sky-300'
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
              <div className="min-w-0">
                <p className="text-base font-bold text-white">{t('part.title', 'Generate a part')}</p>
              </div>
              <button
                type="button"
                onClick={() => setPartOpen(false)}
                aria-label={t('share.close', 'Close')}
                className="p-2 -m-2 sm:p-0 sm:m-0 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grouped the way a mixer's channel list is grouped. Chords and harmonic
                progressions sit at the front alongside drums, bass and keys. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 space-y-3">
            {(['chords', 'drums', 'bass', 'keys', 'guitars', 'winds', 'texture'] as Family[]).map((family) => (
              <div key={family} className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {t(`part.family.${family}`, family)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {INSTRUMENTS.filter((one) => one.family === family).map((one) => (
                    <button
                      key={one.id}
                      type="button"
                      onClick={() => setPartId(one.id)}
                      aria-pressed={partId === one.id}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                        partId === one.id
                          ? 'border-sky-500 bg-sky-500/20 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-sky-500/40 hover:text-white'
                      }`}
                    >
                      {t(one.name, one.english)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                {t('part.bars', 'bars')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BAR_CHOICES.map((bars) => (
                  <button
                    key={bars}
                    type="button"
                    onClick={() => setPartBars(bars)}
                    aria-pressed={partBars === bars}
                    className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums transition-all ${
                      partBars === bars
                        ? 'border-sky-500 bg-sky-500/20 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-sky-500/40 hover:text-white'
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
                {/* The real time signature. It said "/4" whatever the
                    unit was, so a session in 6/8 read back as 6/4. */}
                {sane(meter).bpm} BPM · {sane(meter).beats}/{sane(meter).unit}
              </span>
              <span className="block pt-1 text-xs text-zinc-500 tabular-nums">
                {clock(secondsFor(partBars, sane(meter).bpm, sane(meter).beats))}
              </span>
            </p>

            <Cost credits={songCost(secondsFor(partBars, sane(meter).bpm, sane(meter).beats), partEngine)} />

            <button
              type="button"
              onClick={() => void makePart()}
              disabled={making}
              className="min-h-[44px] w-full rounded-xl fb-fx-go px-4 py-3 font-bold text-onAccent flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* ── The tools for the marked piece ────────────────────────────

          Free first, paid last, with a line between them, because that is
          the order the decision is actually made in: three of these happen
          instantly and cost nothing, and the two at the bottom send audio
          away and are billed by the minute. Every row says what it does
          rather than what it is called. */}
      {regionOpen && region && (
        <div className="fixed inset-0 z-[80] bg-scrim/85 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="flex w-full sm:max-w-lg max-h-[88vh] flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-start justify-between gap-3 p-4 pb-2">
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight text-white">
                  {t('pro.regionTitle', 'The marked piece')}
                </p>
                <p className="pt-0.5 text-xs leading-snug text-zinc-400 tabular-nums">
                  {clock(region.from)} – {clock(region.to)} ·{' '}
                  {(region.to - region.from).toFixed(1)}s
                  {' · '}
                  <span className="text-zinc-500">
                    {lanes.find((one) => one.id === picked)?.name
                      ?? t('pro.regionNoLaneShort', 'no lane open')}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRegionOpen(false)}
                aria-label={t('share.close', 'Close')}
                className="p-2 -m-2 sm:p-0 sm:m-0 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 pt-2">
              {/* ── AI magic, on the marked piece alone ──────────────────
                  The owner, 14 October 2026: "Pobooth moet ook die klanke kan
                  skoon maak, verbeter of verander via AI. Daai drag lines om
                  sekere gedeeltes te verbeter, of om oorgange uit te smooth."
                  Each one cuts the mark onto a piece of its own first, so
                  what changes is what she drew and what is billed is its
                  length. */}
              {!pieceHeard && (
                <button
                  type="button"
                  data-pieceheardask
                  onClick={() => { void askPiece(); }}
                  disabled={busy || humming}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 text-sm font-bold text-sky-200 disabled:opacity-50"
                >
                  <Waves className="h-4 w-4 shrink-0" />
                  {t('pro.heardAsk', 'What is in this piece?')} · {creditsSaid(CREDITS.whatsIn, t)}
                </button>
              )}
              {pieceHeard && pieceHeard.length > 0 && (
                <p role="status" data-pieceheard className="rounded-xl bg-sky-500/10 px-3 py-2 text-[13px] text-sky-100">
                  <span className="font-black">{t('pro.heardTitle', 'In this piece:')}</span>{' '}
                  {pieceHeard.map((one) => (one === 'voice'
                    ? t('pro.heardVoice', 'sounds like a voice')
                    : one === 'instruments'
                      ? t('pro.heardInstruments', 'instruments')
                      : one === 'hum'
                        ? t('pro.heardHum', 'a steady hum or drone')
                        : t('pro.heardQuiet', 'quiet stretches'))).join(' · ')}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t('pro.magicTitle', 'AI magic on this piece')}
              </p>
              {([
                {
                  id: 'smooth',
                  icon: <Waves className="h-4 w-4" />,
                  title: t('pro.magicSmooth', 'Smooth the transition'),
                  says: t('pro.magicSmoothWhat', 'The loudness glides from the front of the mark to its end instead of jumping, written into the sound.'),
                  price: creditsSaid(CREDITS.smoothJoin, t),
                  run: () => { void regionSmooth(); },
                },
                {
                  id: 'clean',
                  icon: <Wand2 className="h-4 w-4" />,
                  title: t('pro.magicClean', 'Clean it with AI'),
                  says: t('pro.magicCleanWhat', 'The room, the hum and the noise taken off, so the voice or the instrument is all that is left.'),
                  price: `${perMinute(Math.max(1, region.to - region.from), CREDITS.clean)} ${t('video.credits', 'credits')}`,
                  run: () => regionSend('clean'),
                },
                {
                  id: 'change',
                  icon: <Mic2 className="h-4 w-4" />,
                  title: t('pro.magicChange', 'Sing it in another voice'),
                  says: t('pro.magicChangeWhat', 'Pick a voice — your own clone or a studio one — and this piece comes back sung by it, on a lane of its own.'),
                  price: `${perMinute(Math.max(1, region.to - region.from), CREDITS.voiceChange)}+ ${t('video.credits', 'credits')}`,
                  run: () => regionSend('change'),
                },
                {
                  id: 'hum',
                  icon: <Music2 className="h-4 w-4" />,
                  title: t('pro.magicHum', 'Play it as instruments'),
                  says: `${t('pro.magicHumWhat', 'The tune in this piece, played by')} ${humVoices.map((id) => { const v = voiceById(id); return v ? t(v.says[0], v.says[1]) : id; }).join(', ')} — ${t('pro.magicHumEach', 'a stem each.')}`,
                  price: creditsSaid(CREDITS.humPart, t),
                  run: () => regionSend('hum'),
                },
              ] as const).map((one) => (
                <button
                  key={one.id}
                  type="button"
                  data-regionmagic={one.id}
                  onClick={one.run}
                  disabled={busy || humming}
                  className="flex w-full items-start gap-3 rounded-xl border border-sky-500/40 bg-sky-950/30 p-3 text-left disabled:opacity-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                    {one.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="block text-sm font-bold leading-tight text-white">{one.title}</span>
                      <span className="shrink-0 text-[11px] font-bold text-sky-300">{one.price}</span>
                    </span>
                    <span className="block pt-0.5 text-xs leading-snug text-zinc-400">{one.says}</span>
                  </span>
                </button>
              ))}
              <div className="grid grid-cols-3 gap-1.5" data-regionhumvoices>
                {(['keys', 'strings', 'sax', 'guitar', 'lead', 'choir'] as const).map((id) => {
                  const v = voiceById(id);
                  if (!v) return null;
                  const on = humVoices.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pickHumVoice(id)}
                      className={`h-[44px] min-w-0 truncate rounded-lg border px-2 text-xs font-bold ${on ? 'border-sky-400/70 bg-sky-500/10 text-sky-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
                    >
                      {t(v.says[0], v.says[1])}
                    </button>
                  );
                })}
              </div>

              <p className="pt-2 text-xs font-bold uppercase tracking-wide text-zinc-600">
                {t('pro.magicEdit', 'Or edit it')}
              </p>
              {([
                {
                  id: 'cut',
                  icon: <Scissors className="h-4 w-4" />,
                  title: t('pro.regionCut', 'Cut this piece out'),
                  says: t('pro.regionCutWhat', 'The piece goes, and what was either side of it stays where it is. It leaves a gap — nothing slides up to fill it.'),
                  run: regionCut,
                },
                {
                  id: 'keep',
                  icon: <SquareSplitHorizontal className="h-4 w-4" />,
                  title: t('pro.regionKeep', 'Keep only this piece'),
                  says: t('pro.regionKeepWhat', 'Everything else on that lane goes, and this stays exactly where it is on the clock.'),
                  run: regionKeep,
                },
                {
                  id: 'repeat',
                  icon: <Repeat className="h-4 w-4" />,
                  title: t('pro.regionRepeat', 'Play it twice'),
                  says: t('pro.regionRepeatWhat', 'The piece goes round a second time and the rest of that lane moves along to make room. Every other lane stays where it is.'),
                  run: regionRepeat,
                },
                {
                  id: 'fadein',
                  icon: <Waves className="h-4 w-4" />,
                  title: t('pro.regionFadeIn', 'Fade up across it'),
                  says: t('pro.regionFadeWhat', 'Silent where the mark starts, full where it ends. It is written into the sound, so the export has it too.'),
                  run: () => regionFade('in'),
                },
                {
                  id: 'fadeout',
                  icon: <Waves className="h-4 w-4" />,
                  title: t('pro.regionFadeOut', 'Fade down across it'),
                  says: t('pro.regionFadeOutWhat', 'Full where the mark starts, silent where it ends.'),
                  run: () => regionFade('out'),
                },
                {
                  id: 'part',
                  icon: <Music2 className="h-4 w-4" />,
                  title: t('pro.regionPart', 'Generate a part this long'),
                  says: t('pro.regionPartWhat', 'Opens the part panel with the bars already set to the length you marked, at this room’s tempo and key. It lands at the front of the mark, on a lane of its own.'),
                  run: regionPart,
                },
              ] as const).map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={one.run}
                  className="flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                    {one.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight text-white">{one.title}</span>
                    <span className="block pt-0.5 text-xs leading-snug text-zinc-400">{one.says}</span>
                  </span>
                </button>
              ))}

              {/* Everything above this line is free, instant and undone by
                  dragging an edge back. Everything below it leaves the
                  browser and is billed by the minute — of the marked piece,
                  which is the point of doing it from here. */}
              <p className="pt-2 text-xs font-bold uppercase tracking-wide text-zinc-600">
                {t('pro.regionPaid', 'These send the piece away, and cost credits')}
              </p>

              {([
                {
                  id: 'voice',
                  icon: <Mic2 className="h-4 w-4" />,
                  title: t('pro.regionSplit', 'Lift the voice off, here only'),
                  says: t('pro.regionSplitWhat', 'The piece is cut onto its own lane and sent. You get the voice and everything else back as two lanes, billed for the length of the mark and not of the song.'),
                  run: () => regionSend('voice'),
                },
                {
                  id: 'parts',
                  icon: <Layers className="h-4 w-4" />,
                  title: t('pro.regionParts', 'Split it into instruments, here only'),
                  says: t('pro.regionPartsWhat', 'Drums, bass, voice and the rest of this piece as separate lanes. Same billing: the length of the mark.'),
                  run: () => regionSend('parts'),
                },
              ] as const).map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={one.run}
                  disabled={busy || looking !== null}
                  className="flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left disabled:opacity-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                    {one.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight text-white">{one.title}</span>
                    <span className="block pt-0.5 text-xs leading-snug text-zinc-400">{one.says}</span>
                  </span>
                </button>
              ))}

              <Note className="text-xs leading-snug text-zinc-500">
                {t(
                  'pro.regionFree',
                  'Cutting, keeping and repeating render nothing and throw nothing away: the pieces still point at the same recording, so dragging an edge back undoes any of them. The fades, the smoothing and the AI changes are written into the sound.',
                )}
              </Note>
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
                  {asInstrument
                    ? t('pro.playAs', 'Play this as an instrument')
                    : t('pro.sing', 'Sing this in another voice')}
                </p>
                <p className="text-sm text-zinc-500 leading-snug truncate">{changing.name}</p>
              </div>
              <button type="button" onClick={() => { setChanging(null); setAsInstrument(false); }} aria-label={t('share.close', 'Close')} className="p-2 -m-2 sm:p-0 sm:m-0 text-zinc-500 hover:text-white">
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
            {canSing && !asInstrument && (
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
                      ? 'border-sky-500 bg-sky-500/15 text-white'
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
                      ? 'border-sky-500 bg-sky-500/15 text-white'
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
                badly, and §9 of private/DIENSTE-EN-KOSTE.md called a real singing
                model the one thing this app promises and cannot deliver.

                The panel is titled "Sing this in another voice", the button
                says "Sing it", and the cost is on the same screen. Being told
                afterwards is being told too late. Above the cost, deliberately:
                the caveat has to be read before the press, not after it.

                The singing model gets its own sentence rather than no sentence.
                What it cannot do is different — it needs a model trained on a
                voice, and it is not a spoken-word tool — and silence there
                would read as "this one is perfect". */}
            {asInstrument ? (
              <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                  'pro.playAsWhat',
                  'The notes and the rhythm of this lane, played by the instrument you pick, on a lane of its own. A sung or hummed line works best; a whole mix does not.',
                )}</Note>
            ) : engine === 'speech' || !canSing ? (
              <Note className="text-sm text-amber-300/90 leading-relaxed">{t(
                  'pro.singBuilt',
                  'The model behind it is built for speech. On a spoken lane it is reliable; on a sung one it is a gamble \u2014 the melody is what it handles worst. For singing, pick a singing model instead.',
                )}</Note>
            ) : (
              <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                  'pro.singReal',
                  'This one is built for singing: it is a voice trained on one singer, and it follows a melody rather than fighting it. It needs a trained voice to sing in \u2014 yours, once you have made one at kits.ai \u2014 and it is the wrong tool for a spoken lane.',
                )}</Note>
            )}
            <Cost
              credits={perMinute(
                pieceSeconds(changing),
                asInstrument || (engine === 'singing' && canSing) ? CREDITS.sing : CREDITS.voiceChange,
              )}
            />

            {asInstrument ? (
              <div className="space-y-2" data-instrumentpicker>
                <p className="text-sm font-bold text-white">
                  {t('pro.whichInstrument', 'Which instrument')}
                </p>
                {instruments.length ? (
                  <SingVoices
                    mine={[]}
                    stock={instruments}
                    value={instrumentId}
                    onChange={setInstrumentId}
                    idPrefix="play"
                  />
                ) : (
                  <p className="text-sm text-zinc-500">
                    {voices
                      ? t('pro.noInstruments', 'No instruments are on offer right now.')
                      : t('pro.voicesLoading', 'Fetching the voices\u2026')}
                  </p>
                )}
              </div>
            ) : engine === 'singing' && canSing ? (
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
              onClick={() => {
                if (!asInstrument) {
                  void changeVoice(changing);
                  return;
                }
                const picked = instruments.find((one) => one.id === instrumentId);
                if (picked) void changeVoice(changing, { id: picked.id, name: picked.name });
              }}
              disabled={busy || (asInstrument
                ? !instruments.some((one) => one.id === instrumentId)
                : engine === 'singing' && canSing ? !modelId : !voiceId)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl fb-fx-go text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {asInstrument ? t('pro.playGo', 'Play it') : t('pro.singGo', 'Sing it')}
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
  /* ── Hum it, and have it played ────────────────────────────────────────
 
     The owner, 9 October 2026, about a thing Suno had launched: *"Wat oulik is
     is dat mens die ritme van 'n liedjie met jou stem kan sing en in sit, en
     dan kies jy net die instrument tipe."*
 
     Beside "Generate a part" on purpose. It is the same job — get an
     instrument onto a lane — reached the other way round: that one is asked
     for in words and costs credits, this one is hummed and costs nothing,
     because every bit of it runs on the device. Two ways into one job belong
     in one place.
 
     `lib/humnotes.ts` finds the notes and `lib/huminstrument.ts` plays them;
     `check:neurie` drives both on a hum it synthesises itself. Nothing here
     does any of that work, which is why there is so little of it. */
  const [humSnap, setHumSnap] = useState(true);
  /* ── How the notes are put right, before anyone touches one ─────────────

     The owner, 22 October 2026: *"Gaan die Hum funksie na, as daardie baie fyn,
     genuanseerd, en baie baie goed verfyn word … dan kan dit ons selling
     point word."* Three choices a musician makes about a hummed line, each
     one a thing that was decided for her before:

       · the grid — sixteenths, eighths, triplets — and how hard the notes
         are pulled onto it (`humFeel`): all the way is tight, half way keeps
         the push and drag of the hum and only tidies it;
       · the key — every note as hummed, the key heard in the hum
         (`keyOf`), or the session's key major or minor. A note outside it
         goes the way the voice was leaning (`inKey`), never just the nearest;
       · and then any single note, by hand, on the roll (`HumRoll`). */
  const [humGrid, setHumGrid] = useState<GridId>('1/16');
  const [humFeel, setHumFeel] = useState(1);
  const [humKey, setHumKey] = useState<'off' | 'heard' | 'major' | 'minor'>('off');
  /** What was read from the take, so the roll, the preview and the lane all use one reading. */
  const [humRead, setHumRead] = useState<{ readonly sign: string; readonly heard: Heard; readonly seconds: number; readonly at: number } | null>(null);
  /** The notes as changed by hand on the roll, or null while nobody has. */
  const [humEdited, setHumEdited] = useState<HumNote[] | null>(null);
  /** Each hand change, so the roll has an undo of its own. */
  const [humBack, setHumBack] = useState<HumNote[][]>([]);
  /* ── Takes ─────────────────────────────────────────────────────────────
     A retake no longer throws the last one away. Each hum recorded in the
     card is a take; the one before is muted and kept, and the takes sit in a
     row to be listened to and chosen between — which is how a studio does
     it, and the only way to know the new one is better. */
  const [humTakes, setHumTakes] = useState<string[]>([]);
  const humArmed = useRef<Set<string> | null>(null);
  useEffect(() => {
    const armed = humArmed.current;
    if (!armed) return;
    const fresh = lanes.find((one) => !one.backing && !armed.has(one.id));
    if (!fresh) return;
    humArmed.current = null;
    setHumTakes((was) => (was.includes(fresh.id) ? was : [...was, fresh.id]));
    setPicked(fresh.id);
  }, [lanes]);
  const recordHum = useCallback((): void => {
    humArmed.current = new Set(lanesNow.current.map((one) => one.id));
    void record();
  }, [record]);

  /* ── Which lane gets played ────────────────────────────────────────────
 
     The one picked, or the newest take if nothing is picked.
 
     The owner, 9 October 2026, looking at the first version: *"Daar is niks wat
     record nie."* She was right, and it was the whole feature: the card said
     "Pick a lane first" and the way to MAKE that lane was a record button on
     a different desk. Recording does not pick the new lane either — only a
     session with exactly one lane in it picks anything automatically — so
     the honest first step was hidden behind two screens she had no reason to
     visit.
 
     The record button is in the card now, and this falls back to the newest
     take so that pressing it and then pressing an instrument works without
     anybody picking anything. */
  const humLane = lanes.find((one) => one.id === picked)
    ?? [...lanes].reverse().find((one) => !one.backing)
    ?? null;

  /* ── Hear it first, set it, then keep it ───────────────────────────────

     The owner, 21 October 2026, having hummed a line and picked the violin:
     *"Iewers moet die opgeneemde klank, eers iewers lê om na te luister, dan
     die instrument kies, en dan daai klank kan verstel totdat dit klink soos
     dit moet. Daar moet ook 'n retake button wees."*

     So the hum is listened to on its own, a hum that is wrong is taken
     again, the instrument is HEARD before it becomes a lane, and the dials
     below (`Tweak`) shape it until it is right. Only "Put it on a lane"
     adds anything to the session. */
  const [humTweak, setHumTweak] = useState<Tweak>(PLAIN);
  const [humSounding, setHumSounding] = useState<'hum' | 'part' | null>(null);
  const humVoiceRef = useRef<AudioBufferSourceNode | null>(null);
  const hushHum = useCallback((): void => {
    try { humVoiceRef.current?.stop(); } catch { /* already over */ }
    humVoiceRef.current = null;
    setHumSounding(null);
  }, []);
  useEffect(() => hushHum, [hushHum]);
  const soundOut = useCallback((buffer: AudioBuffer, what: 'hum' | 'part'): void => {
    const ctx = context();
    if (!ctx) return;
    hushHum();
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    node.onended = () => { if (humVoiceRef.current === node) { humVoiceRef.current = null; setHumSounding(null); } };
    humVoiceRef.current = node;
    setHumSounding(what);
    void ctx.resume?.();
    node.start();
  }, [context, hushHum]);

  /* What the take is, as a string: a reading of one cut of a lane is not a
     reading of the same lane cut somewhere else. */
  const humSign = humLane
    ? `${humLane.id}:${humLane.at}:${humLane.from ?? ''}:${humLane.to ?? ''}:${humLane.repeat ?? 1}:${humLane.audio.length}:${humLane.amped?.name ?? ''}`
    : '';
  const songRoot = Math.max(0, (KEYS as readonly string[]).indexOf(meter.key));
  const heardKey = useMemo(() => (humRead ? keyOf(humRead.heard.notes) : null), [humRead]);
  const humScale = humKey === 'heard' && heardKey
    ? scaleNotes(heardKey.root, heardKey.minor)
    : humKey === 'major' || humKey === 'minor'
      ? scaleNotes(songRoot, humKey === 'minor')
      : null;
  /** Notes as heard, put in key and on the grid as the card is set. */
  const shapeHum = useCallback((raw: readonly HumNote[], at: number): HumNote[] => {
    let out = [...raw];
    if (humKey === 'heard') {
      const found = keyOf(raw);
      if (found) out = inKey(out, found.root, found.minor);
    } else if (humKey === 'major' || humKey === 'minor') {
      out = inKey(out, songRoot, humKey === 'minor');
    }
    return humSnap ? snapTo(out, meter.bpm, { grid: humGrid, strength: humFeel, offset: at }) : out;
  }, [humKey, songRoot, humSnap, meter.bpm, humGrid, humFeel]);
  const humShaped = useMemo(
    () => (humRead ? shapeHum(humRead.heard.notes, humRead.at) : null),
    [humRead, shapeHum],
  );
  /* A choice changed after a hand edit starts again from the reading: the
     hand edits were made on the old grid or key. The roll's own undo brings
     them back. */
  const humEditedNow = useRef<HumNote[] | null>(null);
  humEditedNow.current = humEdited;
  useEffect(() => {
    const was = humEditedNow.current;
    if (!was) return;
    setHumBack((back) => [...back.slice(-30), was]);
    setHumEdited(null);
  }, [shapeHum]);
  const humNotes = humEdited ?? humShaped;

  /** Read the take now: the notes, the voice's line and the key. */
  const readHum = useCallback((): { source: AudioBuffer; heard: Heard; at: number } | null => {
    const ctx = context();
    if (!humLane || !ctx) return null;
    const source = playsOf(humLane, ctx);
    const heard = heardIn(source.getChannelData(0), source.sampleRate);
    setHumRead({ sign: humSign, heard, seconds: source.duration, at: humLane.at });
    setHumEdited(null);
    setHumBack([]);
    return { source, heard, at: humLane.at };
  }, [humLane, humSign, context]);
  /* A new take, or the same take cut differently, is read again when it is
     next asked for — not the old reading passed off as this one. */
  useEffect(() => {
    if (humRead && humRead.sign !== humSign) { setHumRead(null); setHumEdited(null); setHumBack([]); }
  }, [humSign, humRead]);
  const editHum = useCallback((next: HumNote[]): void => {
    setHumBack((back) => [...back.slice(-30), humEdited ?? humShaped ?? []]);
    setHumEdited(next);
  }, [humEdited, humShaped]);
  const undoHumEdit = useCallback((): void => {
    if (!humBack.length) return;
    setHumEdited(humBack[humBack.length - 1]);
    setHumBack(humBack.slice(0, -1));
  }, [humBack]);

  /** The hum's sound and the notes heard in it, or why there are none. */
  const humHeard = useCallback((piece?: { audio: AudioBuffer; at: number }) => {
    if (piece) {
      /* A marked piece from the timeline's AI magic: read on the spot, put
         right the way the card is set. */
      const heard = notesIn(piece.audio.getChannelData(0), piece.audio.sampleRate);
      return { source: piece.audio, notes: shapeHum(heard, piece.at), at: piece.at };
    }
    const ctx = context();
    if (!humLane || !ctx) return null;
    if (humRead && humRead.sign === humSign && humNotes) {
      return { source: playsOf(humLane, ctx), notes: humNotes, at: humLane.at };
    }
    const fresh = readHum();
    if (!fresh) return null;
    return { source: fresh.source, notes: shapeHum(fresh.heard.notes, fresh.at), at: fresh.at };
  }, [humLane, humRead, humSign, humNotes, readHum, shapeHum, context]);

  /** The hum on its own, before anything is made of it. */
  const listenToHum = useCallback((): void => {
    if (humSounding === 'hum') { hushHum(); return; }
    const ctx = context();
    const source = humLane && ctx ? playsOf(humLane, ctx) : humLane?.audio;
    if (source) soundOut(source, 'hum');
  }, [humLane, humSounding, context, hushHum, soundOut]);

  /** The picked instruments, played from the hum with the dials as set — heard, not kept. */
  const hearPart = useCallback((): void => {
    if (humSounding === 'part') { hushHum(); return; }
    const got = humHeard();
    const ctx = context();
    const voices = humVoices.map((id) => voiceById(id)).filter((one): one is NonNullable<typeof one> => Boolean(one));
    if (!got || !ctx || !voices.length) return;
    if (!got.notes.length) {
      setProblem(t('hum.nothing', 'Nothing was heard in that lane to play. Hum or tap the rhythm with a bit of space between the notes, then try again.'));
      return;
    }
    const parts = voices.map((voice) => renderHum(got.notes, voice, got.source.duration, got.source.sampleRate, humTweak));
    const longest = parts.reduce((most, one) => Math.max(most, one.length), 0);
    const buffer = ctx.createBuffer(1, longest, got.source.sampleRate);
    const mix = buffer.getChannelData(0);
    for (const part of parts) for (let i = 0; i < part.length; i += 1) mix[i] += part[i] / parts.length;
    soundOut(buffer, 'part');
  }, [humSounding, humHeard, humVoices, humTweak, context, hushHum, soundOut, t]);

  /** Take the hum again: the one before is muted and kept as a take, and the microphone opens. */
  const retakeHum = useCallback((): void => {
    if (!humLane || recording) return;
    hushHum();
    remember(t('undo.retake', 'the retake'));
    const before = humLane.id;
    setLanes((was) => was.map((one) => (one.id === before ? { ...one, muted: true } : one)));
    setHumTakes((was) => (was.includes(before) ? was : [before, ...was]));
    setStale(true);
    recordHum();
  }, [humLane, recording, hushHum, recordHum, remember, t]);

  /** One note, as the first picked instrument plays it — for the roll. */
  const auditionNote = useCallback((note: HumNote): void => {
    const ctx = context();
    const voice = voiceById(humVoices[0] ?? 'keys');
    if (!ctx || !voice) return;
    const long = Math.min(1.2, Math.max(0.15, note.to - note.from));
    const played = renderHum([{ ...note, from: 0.02, to: 0.02 + long, loud: Math.max(0.6, note.loud) }], voice, long + 0.1, ctx.sampleRate, humTweak);
    const buffer = ctx.createBuffer(1, played.length, ctx.sampleRate);
    buffer.getChannelData(0).set(played);
    soundOut(buffer, 'part');
  }, [context, humVoices, humTweak, soundOut]);

  /* ── To a studio instrument model ─────────────────────────────────────
     The on-device instruments are arithmetic; the instrument models on the
     voice sheet are trained on real players and cost credits. Sent the raw
     hum, they also play the breaths, the scoops and the notes the reader got
     wrong. Sent THIS — the corrected notes, played as a clean tone with
     nothing else in it — they play exactly the line on the roll. The guide
     lands as a lane of its own and the sheet opens on it, with its price. */
  const humToModel = useCallback((): void => {
    const got = humHeard();
    const ctx = context();
    const flute = voiceById('flute');
    if (!got || !ctx || !flute || !got.notes.length) {
      setProblem(t('hum.nothing', 'Nothing was heard in that lane to play. Hum or tap the rhythm with a bit of space between the notes, then try again.'));
      return;
    }
    const played = renderHum(got.notes, flute, got.source.duration, got.source.sampleRate, PLAIN);
    const buffer = ctx.createBuffer(1, played.length, got.source.sampleRate);
    buffer.getChannelData(0).set(played);
    const guide: Lane = {
      id: `hum-guide-${Date.now()}`,
      name: `${humLane?.name ?? t('hum.from', 'hummed')} · ${t('hum.guide', 'guide')}`,
      audio: buffer,
      at: got.at,
      gain: 1,
      muted: true,
      soloed: false,
      notes: got.notes,
    };
    remember(t('hum.guide', 'guide'));
    setLanes((was) => [...was, guide]);
    setStale(true);
    playAs(guide);
  }, [humHeard, context, humLane, remember, t, playAs]);

  /**
   * The hum, played as instruments — one lane per instrument picked.
   *
   * `piece` is a marked piece from the timeline's AI magic: its own sound,
   * already cut, and the clock time it starts at. Without one it is the
   * lane in the hum card, whole, as it always was.
   */
  const humIt = useCallback(async (piece?: { audio: AudioBuffer; at: number }): Promise<void> => {
    /* What the lane PLAYS — its cut, its repeats, its amp — not the whole
       recording under it (`humHeard`). A hum trimmed to its good bar was
       played back whole, starting at the lane's start, so the instrument came
       in with the false start she had cut off and ran past the end of the
       clip. Found on 15 October 2026. */
    const got = humHeard(piece);
    const voices = humVoices.map((id) => voiceById(id)).filter((one): one is NonNullable<typeof one> => Boolean(one));
    if (humming) return;
    /* Every way this stops says why. It returned silently, and a press from
       the AI magic sheet (which closes as it is pressed) looked like a
       button that does nothing — the owner, 28 October 2026: "Helfte AI
       magic se functions werk nie". */
    if (!voices.length) {
      setProblem(t('hum.noVoice', 'Choose an instrument first: open the hum panel and tap one, then try again.'));
      return;
    }
    if (!got) {
      setProblem(t('hum.noLane', 'Nothing could be read from that piece. Open a lane with a hum or a tapped rhythm on it, and mark a part of it.'));
      return;
    }
    const { source, at } = got;
    hushHum();
    setHumming(true);
    setProblem(null);
    try {
      if (!got.notes.length) {
        setProblem(t(
          'hum.nothing',
          'Nothing was heard in that lane to play. Hum or tap the rhythm with a bit of space between the notes, then try again.',
        ));
        return;
      }
      /* Snapped by default (in `humHeard`), and her own instinct about this
         feature: a hummed rhythm is never quite in time and the point is to
         get something usable rather than something faithful. The switch is
         there because a swung or rubato part is the case where it is wrong. */
      const { notes } = got;
      const ctx = context();
      if (!ctx) {
        setProblem(t('pro.noAudio', 'This browser would not start its audio.'));
        return;
      }
      if (!(await payTool('hum', `${at}|${voices.map((one) => one.id).join(',')}|${notes.length}|${Date.now()}`))) return;
      const made: Lane[] = voices.map((voice, n) => {
      const played = renderHum(
        notes,
        voice,
        source.duration,
        source.sampleRate,
        /* As she set it after hearing it. A part from the timeline's AI magic
           takes the same dials: one set of dials, one sound. */
        humTweak,
      );
      const buffer = ctx.createBuffer(1, played.length, source.sampleRate);
      /* `set` on the channel rather than `copyToChannel`: one fewer copy,
         and `copyToChannel` wants a `Float32Array<ArrayBuffer>` where a
         plain `Float32Array` is `ArrayBufferLike`, which is a type error
         about shared memory in a function that has never seen any. */
      buffer.getChannelData(0).set(played);

      return {
          id: `hum-${Date.now()}-${n}-${voice.id}`,
          name: `${t(voice.says[0], voice.says[1])} · ${t('hum.from', 'hummed')}`,
          audio: buffer,
          /* On top of the lane it came from, so it plays with the hum rather
             than after it. Somebody who wanted it elsewhere drags it. */
          at,
          gain: 1,
          muted: false,
          soloed: false,
          /* The notes this lane IS. Kept so that "download MIDI" on it is a
             fact rather than a reading: re-transcribing our own synthesised
             audio to recover notes we already had is lossy and absurd. */
          notes,
        };
      });
      setLanes((was) => [...was, ...made]);
      setStale(true);
    } finally {
      setHumming(false);
    }
  }, [humHeard, humVoices, humTweak, humming, hushHum, context, payTool, t]);
  humRef.current = humIt;

  const stemDesk = (
    <>
      {/* ── Every lane, as its own file; and a lane made better by AI ──────
          The owner, 14 October 2026: *"Stems moet ook apart gedownload kan word.
          Stems moet ook deur ai integration verbeter kan word."* Each lane
          could already be taken away one at a time from its own card, and
          cleaned one at a time from there too. Both are here now for every
          lane at once, where the stems are: one press writes each lane as
          its own WAV, and each lane has its AI clean beside its name, with
          the price on it. */}
      {lanes.length > 0 && (
        /* Each card the full width of the sheet. Two columns made this the
           tall narrow strip the owner called "langwerpige piesang kolomme"
           (20 October 2026): a list of lanes with two buttons each does not
           fit in 166 pixels. */
        <Card
          wide
          icon={<Layers className="h-4 w-4" />}
          title={t('pro.stemsAway', 'Every lane, as its own file')}
          what={t(
            'pro.stemsAwayWhat',
            'Each lane is written as a WAV of its own, named after the lane, cut where you cut it. Clean a lane with AI first if the room or the reverb is in the way.',
          )}
        >
          <button
            type="button"
            data-prosaveall
            disabled={busy}
            onClick={() => { void saveAll(); }}
            className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 text-sm font-bold text-sky-300 disabled:opacity-50"
          >
            <Layers className="h-4 w-4" />
            {t('pro.saveAllZip', 'Every lane in one .zip')} ({lanes.length}) · {creditsSaid(CREDITS.stemsZip, t)}
          </button>
          <div className="mt-2">{depthPicker}</div>
          <ul className="mt-2 space-y-1.5">
            {lanes.map((lane) => (
              <li key={lane.id} className="space-y-1">
                <span className="block truncate text-xs text-zinc-300">{lane.name}</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-proimprove={lane.id}
                    disabled={busy}
                    onClick={() => void deRoom(lane)}
                    className="inline-flex h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 px-3 text-xs font-bold text-sky-300 disabled:opacity-50"
                  >
                    <Wand2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2 text-center leading-tight">
                      {t('pro.improveAi', 'Clean with AI')} · {perMinute(pieceSeconds(lane), CREDITS.clean)} {t('video.credits', 'credits')}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-prosaveone={lane.id}
                    onClick={() => void saveLane(lane, 'wav')}
                    aria-label={`${t('pro.saveOne', 'Download')} ${lane.name} · ${creditsSaid(CREDITS.laneWav, t)}`}
                    className="inline-flex h-[44px] min-w-0 items-center justify-center rounded-xl border border-zinc-700 px-3 text-xs font-bold text-zinc-200"
                  >
                    {soundKind === 'mp3' ? 'MP3' : 'WAV'} · {CREDITS.laneWav}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card
        wide
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
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 text-sm font-semibold text-sky-200 hover:border-sky-400 hover:bg-sky-900/40 hover:text-white transition-all disabled:opacity-50"
        >
          <Music2 className="h-4 w-4 text-sky-400" />
          {t('part.title', 'Generate a part')}
        </button>
      </Card>

      {/* ── A lane played as an instrument ─────────────────────────────
          The owner, 20 October 2026, of Kits' instrument models offered as
          voices: *"Hier is 'n fantastiese lys van instrumente maar moet dit
          nie by stems wees nie."* So they are here, where instruments are:
          one press per lane opens the picker, and the price is on the sheet
          before anything is spent. */}
      {lanes.length > 0 && (
        <Card
          wide
          icon={<Guitar className="h-4 w-4" />}
          title={t('pro.playAs', 'Play this as an instrument')}
          paid
          paidSays={t('dock.paidSays', 'Some of this costs credits.')}
          what={t(
            'pro.playAsWhat',
            'The notes and the rhythm of this lane, played by the instrument you pick, on a lane of its own. A sung or hummed line works best; a whole mix does not.',
          )}
        >
          <ul className="space-y-1.5" data-playaslanes>
            {lanes.map((lane) => (
              <li key={lane.id}>
                <button
                  type="button"
                  data-playas={lane.id}
                  disabled={busy}
                  onClick={() => playAs(lane)}
                  className="inline-flex h-[44px] w-full min-w-0 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 text-sm font-bold text-sky-200 disabled:opacity-50"
                >
                  <Guitar className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">{lane.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Hum it instead ───────────────────────────────────────────────
          Free, and said so plainly: it is the only thing on this desk that
          is, and the reason is worth knowing rather than guessing at — none
          of it leaves the phone. */}
      <Card
        wide
        icon={<Mic2 className="h-4 w-4" />}
        title={t('hum.title', 'Hum it, and have it played')}
        what={t(
          'hum.what',
          'Record yourself humming or tapping the rhythm on a lane, see the notes and put them right, pick an instrument, and it comes back played. The instruments here cost no credits and none of it leaves this device; the studio model at the end says its price.',
        )}
      >
        <div className="space-y-3" data-humcard>
          {/* ── 1. Hum it ─────────────────────────────────────────────────
              Her whole report on the first version: *"Daar is niks wat
              record nie."* The card asked for a lane and the way to make one
              was a record button on another desk. The first step of a
              feature belongs in the feature. */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('hum.step1', '1 · Hum or tap it')}
            </p>
            {recording ? (
              <button
                type="button"
                onClick={() => void stopRecording()}
                data-humstop
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-500 bg-red-500/20 px-4 text-sm font-bold text-red-300"
              >
                <Square className="h-4 w-4 fill-current" />
                {t('pro.stopRecording', 'Stop recording')}
              </button>
            ) : (
              <button
                type="button"
                onClick={recordHum}
                disabled={busy || making}
                data-humrecord
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-onAccent disabled:opacity-50"
              >
                <Circle className="h-4 w-4 fill-current" />
                {t('hum.record', 'Record a hum')}
              </button>
            )}
            <p className="text-[11px] leading-snug text-zinc-600">
              {humLane
                ? `${t('hum.using', 'Will play')}: ${humLane.name}`
                : t('hum.nothingYet', 'Nothing recorded yet. Leave a little space between the notes.')}
            </p>
            {/* The hum, heard on its own, and taken again if it is wrong. */}
            {humLane && !recording && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-humlisten
                  onClick={listenToHum}
                  className="fb-fx-booth-tile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold text-sky-100"
                >
                  {humSounding === 'hum' ? <Square className="h-4 w-4 fill-current" /> : <PlayIcon className="h-4 w-4" />}
                  {humSounding === 'hum' ? t('hum.stopListen', 'Stop') : t('hum.listen', 'Listen to my hum')}
                </button>
                <button
                  type="button"
                  data-humretake
                  onClick={retakeHum}
                  disabled={busy || making}
                  className="fb-fx-booth-tile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold text-sky-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('hum.retake', 'Retake')}
                </button>
              </div>
            )}
            {/* The takes, to choose between. Pressing one makes it the one
                the notes are read from; "Listen to my hum" plays it. */}
            {(() => {
              const takes = humTakes.filter((id) => lanes.some((one) => one.id === id));
              if (takes.length < 2) return null;
              return (
                <div className="flex flex-wrap gap-1.5" data-humtakes>
                  {takes.map((id, n) => (
                    <button
                      key={id}
                      type="button"
                      data-humtake={id}
                      aria-pressed={humLane?.id === id}
                      onClick={() => { hushHum(); setPicked(id); }}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${
                        humLane?.id === id ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {t('hum.take', 'Take')} {n + 1}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* ── 2. The notes, seen and put right ──────────────────────────
              What was heard, on a piano roll over the line the voice itself
              sang, with the grid and the key chosen here and any one note
              moved by hand. Nothing below reads the hum again: the preview,
              the lane and the studio model all play these notes. */}
          <div className="space-y-2" data-humnotes>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('hum.step2notes', '2 · See the notes, and put them right')}
            </p>
            {!humRead || humRead.sign !== humSign ? (
              <button
                type="button"
                data-humread
                disabled={!humLane || recording || busy}
                onClick={() => {
                  const got = readHum();
                  if (got && !got.heard.notes.length) {
                    setProblem(t('hum.nothing', 'Nothing was heard in that lane to play. Hum or tap the rhythm with a bit of space between the notes, then try again.'));
                  }
                }}
                className="fb-fx-booth-tile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-sky-100 disabled:opacity-50"
              >
                <Music2 className="h-4 w-4" />
                {t('hum.read', 'Show the notes')}
              </button>
            ) : (
              <>
                <p className="text-[11px] leading-snug text-zinc-400" data-humsummary>
                  {`${humNotes?.length ?? 0} ${t('roll.notes', 'notes')}`}
                  {heardKey && heardKey.sure > 0.15
                    ? ` · ${t('hum.heardIn', 'heard in')} ${nameOf(heardKey.root + 60).replace(/-?\d+$/, '')} ${heardKey.minor ? t('fx.scaleMinor', 'Minor') : t('fx.scaleMajor', 'Major')}`
                    : ''}
                  {Math.abs(humRead.heard.tuningCents) >= 10
                    ? ` · ${t('hum.tunedBy', 'hummed')} ${Math.abs(humRead.heard.tuningCents)} ${t('roll.cents', 'cents')} ${humRead.heard.tuningCents > 0 ? t('hum.sharp', 'sharp') : t('hum.flat', 'flat')}, ${t('hum.tunedFix', 'allowed for')}`
                    : ''}
                </p>
                <HumRoll
                  notes={humNotes ?? []}
                  onChange={editHum}
                  seconds={humRead.seconds}
                  contour={humRead.heard.pitch}
                  beat={60 / Math.max(1, meter.bpm)}
                  barBeats={meter.beats}
                  offset={humRead.at}
                  step={humSnap ? (60 / Math.max(1, meter.bpm)) * (GRIDS.find((one) => one.id === humGrid)?.beat ?? 0.25) : 0}
                  scale={humScale}
                  onAudition={auditionNote}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-humundo
                    disabled={!humBack.length}
                    onClick={undoHumEdit}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-xs font-bold text-zinc-200 disabled:opacity-40"
                  >
                    <Undo2 className="h-4 w-4" />
                    {t('hum.undoEdit', 'Undo that change')}
                  </button>
                  <button
                    type="button"
                    data-humfresh
                    disabled={!humEdited}
                    onClick={() => { if (humEdited) { setHumBack((back) => [...back.slice(-30), humEdited]); setHumEdited(null); } }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-xs font-bold text-zinc-200 disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('hum.fresh', 'As it was heard')}
                  </button>
                </div>
              </>
            )}

            <label data-tidycard className="flex items-start gap-2.5 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={humSnap}
                data-humsnap
                onChange={(event) => setHumSnap(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-sky-500"
              />
              <span>
                {t('hum.snap', 'Put it on the click')}
                <span className="block text-[11px] leading-snug text-zinc-600">
                  {t(
                    'hum.snapWhy',
                    'A hummed rhythm is never quite in time. Off is for a part that swings or drifts on purpose.',
                  )}
                </span>
              </span>
            </label>
            {humSnap && (
              <>
                <div className="grid grid-cols-5 gap-1" role="group" aria-label={t('hum.grid', 'The grid')} data-humgrid>
                  {GRIDS.map((one) => (
                    <button
                      key={one.id}
                      type="button"
                      aria-pressed={humGrid === one.id}
                      onClick={() => setHumGrid(one.id)}
                      className={`min-h-[44px] rounded-xl border text-xs font-bold tabular-nums ${
                        humGrid === one.id ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {one.id}
                    </button>
                  ))}
                </div>
                <label className="grid grid-cols-[minmax(0,7rem)_1fr_2.75rem] items-center gap-2 text-xs text-zinc-300">
                  <span className="truncate">{t('hum.feel', 'Loose · tight')}</span>
                  <input
                    type="range"
                    min={0.25}
                    max={1}
                    step={0.05}
                    value={humFeel}
                    data-humfeel
                    onChange={(event) => setHumFeel(Number(event.target.value))}
                    className="h-11 w-full accent-sky-400"
                  />
                  <span className="text-right tabular-nums text-sky-200">{Math.round(humFeel * 100)}%</span>
                </label>
              </>
            )}
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              <span>{t('hum.keyTo', 'Keep the notes to a key')}</span>
              <select
                value={humKey}
                data-humkey
                onChange={(event) => setHumKey(event.target.value as typeof humKey)}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
              >
                <option value="off">{t('hum.keyOff', 'Every note as hummed')}</option>
                <option value="heard" disabled={!heardKey}>
                  {heardKey
                    ? `${t('hum.keyHeard', 'The key heard in the hum')}: ${nameOf(heardKey.root + 60).replace(/-?\d+$/, '')} ${heardKey.minor ? t('fx.scaleMinor', 'Minor') : t('fx.scaleMajor', 'Major')}`
                    : t('hum.keyHeardNone', 'The key heard in the hum (show the notes first)')}
                </option>
                <option value="major">{`${t('hum.keySong', 'The song’s key')}: ${meter.key} ${t('fx.scaleMajor', 'Major')}`}</option>
                <option value="minor">{`${t('hum.keySong', 'The song’s key')}: ${meter.key} ${t('fx.scaleMinor', 'Minor')}`}</option>
              </select>
            </label>
          </div>

          {/* ── 3. Pick the sound ─────────────────────────────────────────
              One column, not two. The owner, 9 October 2026: *"Dit lyk nie goed
              nie."* This desk is already two columns wide on a phone, so a
              grid of two inside one of them gave each button about forty
              pixels of text — "An / octave / down / from / what / you /
              hummed", one word a line. A row each, name and sentence on
              separate lines, uses the width the card actually has. */}
          <div className="space-y-1.5">
            {/* ── Or a voice ─────────────────────────────────────────────
                The owner, 14 October 2026: *"Die sing/humm vir stem parts moet
                ook daar wees."* An instrument plays the notes of a hum on
                the device; a VOICE has to sing them, and that is the voice
                changer every lane already has — the hum is sung back in a
                cloned or studio voice, on its own lane, for the price the
                panel shows. One press opens it on the hummed lane. */}
            <button
              type="button"
              data-humtovoice
              disabled={!humLane || busy}
              onClick={() => { if (humLane) setChanging(humLane); }}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 text-sm font-bold text-sky-300 disabled:opacity-50"
            >
              <Mic2 className="h-4 w-4" />
              {t('hum.toVoice', 'Sing my hum as a voice part')}
            </button>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('hum.step3pick', '3 · Pick the sound')}
            </p>
            {/* ── Under headings, because there are thirteen of them now ──

                Four on 9 October, thirteen on the 10th. The owner: *"daar moet
                van alles wat opsies is, 'n verskeidenheid wees."*

                Thirteen in one column is the list nobody reads past the
                third, which was the honest half of the argument the library
                used to make for keeping it at four. So they sit under the
                four headings a person actually looks under — the low end,
                the held ones, the struck ones, and the kit — and the
                headings come from `GROUPS` rather than from a list written
                out again here. */}
            <div className="space-y-2.5">
              {GROUPS.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    {t(group.says[0], group.says[1])}
                  </p>
                  {VOICES.filter((one) => one.group === group.id).map((one) => (
                    <button
                      key={one.id}
                      type="button"
                      onClick={() => pickHumVoice(one.id)}
                      aria-pressed={humVoices.includes(one.id)}
                      data-humvoice={one.id}
                      data-tidycard
                      className={`block min-h-[44px] w-full rounded-xl border px-3 py-2 text-left ${
                        humVoices.includes(one.id)
                          ? 'border-sky-400/70 bg-sky-500/10'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      <span className={`block text-sm font-bold ${
                        humVoices.includes(one.id) ? 'text-sky-200' : 'text-zinc-200'
                      }`}
                      >
                        {t(one.says[0], one.says[1])}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-snug text-zinc-500">
                        {t(one.what[0], one.what[1])}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. Hear it, and set it until it sounds right ───────────────
              The owner, 21 October 2026: *"dan die instrument kies, en dan
              daai klank kan verstel totdat dit klink soos dit moet."* Heard
              here, changed here, heard again — nothing is added to the song
              until step 4. Each dial is one `Tweak` field, and in the middle
              each one is the instrument as it comes. */}
          <div className="space-y-2" data-humshape>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('hum.step4shape', '4 · Hear it, and shape it')}
            </p>
            <button
              type="button"
              data-humhear
              onClick={hearPart}
              disabled={!humLane || humming || busy || recording || making || !humVoices.length}
              className="fb-fx-booth-tile inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-sky-100 disabled:opacity-50"
            >
              {humSounding === 'part' ? <Square className="h-4 w-4 fill-current" /> : <PlayIcon className="h-4 w-4" />}
              {humSounding === 'part' ? t('hum.stopHear', 'Stop') : t('hum.hear', 'Hear it')}
            </button>
            {([
              ['octave', t('hum.dialOctave', 'Octave'), -2, 2, 1, (v: number) => (v > 0 ? `+${v}` : `${v}`)],
              ['bright', t('hum.dialBright', 'Darker · brighter'), -1, 1, 0.1, (v: number) => (v > 0 ? `+${Math.round(v * 10)}` : `${Math.round(v * 10)}`)],
              ['vibrato', t('hum.dialVibrato', 'Vibrato'), 0, 3, 0.1, (v: number) => `${Math.round(v * 100)}%`],
              ['attack', t('hum.dialAttack', 'Sharp · slow start'), 0.25, 4, 0.05, (v: number) => `${v.toFixed(2)}×`],
              ['length', t('hum.dialLength', 'Short · long notes'), 0.5, 2, 0.05, (v: number) => `${v.toFixed(2)}×`],
              ['room', t('hum.dialRoom', 'Room'), 0, 1, 0.05, (v: number) => `${Math.round(v * 100)}%`],
            ] as const).map(([key, label, low, high, step, said]) => (
              <label key={key} className="grid grid-cols-[minmax(0,7rem)_1fr_2.75rem] items-center gap-2 text-xs text-zinc-300">
                <span className="truncate">{label}</span>
                <input
                  type="range"
                  min={low}
                  max={high}
                  step={step}
                  value={humTweak[key]}
                  data-humdial={key}
                  onChange={(event) => { const v = Number(event.target.value); setHumTweak((was) => ({ ...was, [key]: v })); }}
                  className="h-11 w-full accent-sky-400"
                />
                <span className="text-right tabular-nums text-sky-200">{said(humTweak[key])}</span>
              </label>
            ))}
            <button
              type="button"
              data-humplain
              onClick={() => setHumTweak(PLAIN)}
              className="text-xs font-semibold text-sky-300 underline-offset-2 hover:underline"
            >
              {t('hum.plain', 'Back to how it comes')}
            </button>
          </div>

          {/* ── 4. Keep it ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('hum.step5', '5 · Put it on a lane')}
            </p>
            <button
              type="button"
              onClick={() => void humIt()}
              disabled={!humLane || humming || busy || recording || making}
              data-humgo
              className="fb-fx-go inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-50"
            >
              <Check className="h-4 w-4 shrink-0" />
              {humming
                ? t('hum.working', 'Listening to it\u2026')
                : `${humVoices.length > 1
                  ? `${t('hum.keepMany', 'Put them on')} ${humVoices.length} ${t('hum.lanes', 'lanes')}`
                  : t('hum.keep', 'Put it on a lane')} · ${creditsSaid(CREDITS.humPart, t)}`}
            </button>
            {/* Or the same notes, played by an instrument model trained on a
                real player. That one costs credits, and says how many here
                and again on the sheet before anything is spent. */}
            <button
              type="button"
              data-hummodel
              onClick={humToModel}
              disabled={!humLane || humming || busy || recording || making}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 text-sm font-bold text-sky-200 disabled:opacity-50"
            >
              <Guitar className="h-4 w-4 shrink-0" />
              <span className="line-clamp-2 text-center leading-tight">
                {t('hum.toModel', 'These notes, played by a studio instrument model')}
                {humLane ? ` · ${perMinute(humRead?.seconds ?? pieceSeconds(humLane), CREDITS.sing)} ${t('video.credits', 'credits')}` : ''}
              </span>
            </button>
          </div>
        </div>
      </Card>

      <Card
        icon={<Scissors className="h-4 w-4" />}
        title={t('pro.takeApart', 'Take a lane apart')}
        paid
        paidSays={t('dock.paidSays', 'Some of this costs credits.')}
        what={t(
          'pro.takeApartWhat',
          'Pick a lane and split it here: lifting the voice off makes singing and music two lanes, and named parts splits it into drums, bass and the rest. The same two are on that lane\u2019s own row under Track controls.',
        )}
      >
        {/* The two splits, right here, for the picked lane. The capability
            check of 20 October 2026 found "Split Stems" on the timeline
            opening this desk, and this card only sending her on to Track
            controls — two hops to reach a split that the button had
            promised. Each says its price, as every paid press does. */}
        {(() => {
          const lane = lanes.find((one) => one.id === picked);
          if (!lane) return null;
          return (
            <div className="grid gap-2" data-prosplitnow>
              <button
                type="button"
                onClick={() => void split(lane)}
                disabled={busy}
                data-prosplitvoice
                aria-label={t('pro.split', 'Split the voice off')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 disabled:opacity-40"
              >
                <SquareSplitHorizontal className="h-4 w-4" />
                {t('pro.splitShort', 'Voice off')} · {perMinute(pieceSeconds(lane), CREDITS.stems)} {t('video.credits', 'credits')}
              </button>
              <button
                type="button"
                onClick={() => void intoParts(lane)}
                disabled={busy || looking === lane.id}
                data-prosplitparts
                aria-label={t('pro.parts', 'Split into named parts')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 disabled:opacity-40"
              >
                <Layers className="h-4 w-4" />
                {t('pro.partsShort', 'Named parts')} · {perMinute(pieceSeconds(lane), CREDITS.parts)} {t('video.credits', 'credits')}
              </button>
            </div>
          );
        })()}
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

     The owner: *"Copilot pop op en vra dat persoon 'n mixing voorstel en copilot
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
        /* Remembered first. Eight faders and a rack moved by one press are
           not put back by dragging one of them, and the panel promises
           "every one of these is a fader you can drag back" — Undo is what
           makes that true for all of them at once. Found missing on 15
           October 2026. */
        remember(t('undo.copilot', 'the copilot’s changes'));
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
      {/* ── Two across, one width each ───────────────────────────────
 
          The owner, 7 October 2026: *"bars binne pop outs moet ewe groot en lank
          wees"*. This was `flex flex-wrap`, which gives every button the width
          of its own words: "Play" came out 81, "Click" 85 and "Back to the
          start" 140, three in a row with a ragged right edge, and the row
          after it starting wherever the last one happened to end.
 
          A grid of two gives each one the same column whatever it says. The
          one that makes the song spans both, because it is the thing this
          row is for. See `lib/benchbar.ts`. */}
      <div className={`${ROW2} items-center`}>
        {recording ? (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className={`${BAR} border border-red-500 bg-red-500/20 text-red-300`}
          >
            <Square className="w-4 h-4 fill-current" />
            {/* Not "Stop".

                While a take is being recorded the transport beside this one
                also reads "Stop", and the owner hit both: two buttons, the same
                word, one ends the recording and one ends the playback. A
                stop button has to say what it stops. */}
            {t('pro.stopRecording', 'Stop recording')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void record()}
            disabled={busy}
            className={`${BAR} fb-fx-go text-onAccent disabled:opacity-50`}
          >
            <Circle className="w-4 h-4 fill-current" />
            {t('pro.record', 'Record a lane')}
          </button>
        )}

        <button
          type="button"
          onClick={() => (playing ? stopPlaying() : play(at))}
          disabled={busy || recording || !heard.length}
          className={`${BAR} border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-50`}
        >
          {playing ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {playing ? t('pro.stopPlaying', 'Stop') : t('pro.play', 'Play')}
        </button>

        {/* ── The click, beside the thing you press to hear it ───────────

            The owner, 21 September 2026, asking for a feature that already
            exists: *"Metronome in probooth."*

            It is built and it is good — its own class, its own clock, a
            count-in, a volume, four divisions, and it runs on the lanes'
            clock rather than a timer of its own. What it did not have was
            anywhere a musician would look. The only switch was inside a
            card called "Click", inside the clock panel, folded shut like
            every other card in the room; on a phone that is three presses
            from the transport, and if you do not already know it is there
            you will not find it.

            So there is a switch in the transport row, next to Play and
            Record. The card keeps the settings — how often and how loud
            are things you set once — and this is the one you reach for
            every take. Same state, two doors; a second copy of the state
            is how two switches come to disagree. */}
        <button
          type="button"
          data-click
          onClick={() => setClicking((was) => !was)}
          aria-pressed={clicking}
          disabled={busy}
          title={t(
            'pro.clickWhat',
            'The metronome you record against. How often it clicks and how loud it is are here too — a click you cannot hear over the song is a click that is not doing its job.',
          )}
          className={`${BAR} border disabled:opacity-50 ${
            clicking
              ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}
        >
          <Timer className="w-4 h-4" />
          {clicking ? t('pro.clickOn', 'Clicking') : t('pro.click', 'Click')}
        </button>

        <button
          type="button"
          onClick={() => {
            stopPlaying();
            setAt(0);
          }}
          disabled={recording}
          className={`${BAR} border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-50`}
        >
          {t('pro.toStart', 'Back to the start')}
        </button>

        {/* ── The way to the words ─────────────────────────────────────────

            The owner: "wanneer mens record moet daar op 'n manier 'n baie meer
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
            a trap.

            Last in the grid and across both columns: it leaves the room, so it
            is not one of the pairs, and five in a grid of two left "Back to the
            start" alone in half a row. */}
        {!recording && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`${BAR} col-span-2 border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-50`}
          >
            <Mic2 className="w-4 h-4" />
            {t('pro.toWords', 'Sing with the words')}
          </button>
        )}


        {/* Minutes, and bars.

            `docs/MUSIEKDENKE.md` §3.6. This room's whole subject is a
            metronome, a time signature and a bar grid, and it had never once
            said the word "bar" with a number after it — so a week of work in
            here taught nobody to count. The clock stays, because a clock is
            what a file is measured in; the bar is what the music is.

            Counted from one, and in the time signature that is actually set:
            bar 2 arrives after four beats in 4/4 and after three in a waltz.
            See `placeAt` in lib/tempo.ts. */}
        <span className="col-span-2 px-1 text-sm tabular-nums text-zinc-500">
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
          className={`${BAR} col-span-2 border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-50`}
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


        <button
          type="button"
          onClick={() => void keep()}
          disabled={busy || recording || !heard.length}
          className={`${BAR} col-span-2 fb-fx-go text-onAccent disabled:opacity-40`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {/* Not "Mix it down".
 
              The owner: "wanneer daar baie klanke en sound bars gelayer word, hoe
              word dit uiteindelik as een liedjie ge-export? is dit duidelik?
              gaan mense weet hoe?"
 
              No. "Mix it down" is what the thing is called by people who
              already know what it is called. Somebody looking at eight lanes
              and wondering how they become one file is not helped by a term
              that assumes the answer. The button now says what it makes. */}
          {t('pro.keep', 'Make one song')}
          {/* The price, before the press. Everything in this room is free
              and this is one of the two presses that is not, which makes it
              the easiest place in the app to meet a charge nobody expected.
              `check:saysprice` holds the same rule on the cutting room. */}
          {bounceCost > 0 && (
            <span data-proboothprice className="rounded-lg bg-zinc-950/20 px-2 py-0.5 text-[11px]">
              {bounceCost} {t('pro.credits', 'credits')}
            </span>
          )}
        </button>

        {/* Getting the song out of the room has a card of its own on Mix &
            master — see `exportCard`. It was here, at the end of a wrapping
            row of seven buttons, and the owner looked for it and did not find
            it: *"Dan wil ek weet hoe export 'n liedjie? Ek sien nerens iets
            oor dit nie?"* A button that exists at the bottom of a strip is
            a button that does not exist. */}
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
        <p className="col-span-2 text-[11px] leading-snug" style={{ color: INK_DIM }}>
          {t('pro.wordsWhereShort', 'The words and the AI voice are in ProBooth. Your lanes are saved.')}
          <Hint className="ml-1">
          {t(
            'pro.wordsWhere',
            'The words on screen, and the AI voice in your ear to sing next to, are in ProBooth — the room this one opened from. Your lanes here are saved, so you can go and come back.',
          )}
          </Hint>
        </p>
        <p className="col-span-2 text-[11px] leading-snug" style={{ color: INK_DIM }}>
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
            onWhole={(what) => remember(
              what === 'reset'
                ? t('undo.rackReset', 'resetting the rack')
                : t('undo.preset', 'the preset'),
            )}
            onTune={(how) => { void tuneLane(fxLane, how); }}
            tuning={tuning}
            keyRoot={Math.max(0, (KEYS as readonly string[]).indexOf(meter.key))}
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

       The owner, 9 September 2026: "hoe export mens of bring alles by mekaar?
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
      /* The marker `check:lessenaar` finds this wrapper by. */
      data-cutroom
      className={`fixed inset-0 z-[70] bg-zinc-950 flex overflow-hidden ${
        onEdge ? 'flex-row' : 'flex-col'
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
      {/* The column, and the lines that sit under it — what went wrong, the
          TONE3000 line, the marked piece's strip. Together, so that held
          sideways, where the room is a row, they stay under the timeline
          rather than becoming narrow columns beside it: the marked piece's
          strip used to squeeze the timeline while it was being marked, and
          the far end of the mark landed seconds from where the finger was.
          While a desk is open the column is hidden and this holds only those
          lines, at their own size. */}
      <div className={`flex min-w-0 flex-col overflow-hidden ${deskOpen ? 'shrink-0' : 'flex-1'}`}>
      <div className={`min-w-0 flex-1 flex-col overflow-hidden ${deskOpen ? 'hidden' : 'flex'}`}>
      <div className="relative flex flex-wrap items-center justify-between gap-3 bg-linear-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-2.5 border-b border-cyan-500/30 shadow-[0_4px_24px_-4px_rgba(6,182,212,0.25)] shrink-0 z-30">
        {/* Subtle neon laser top accent line */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-cyan-500 via-emerald-400 to-fuchsia-500 opacity-90 shadow-[0_0_12px_rgba(6,182,212,0.9)]" />

        {/* Left section: Back + Logo & Title + Undo/Redo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            /* Through `leave`: a running take is stopped and kept first. */
            onClick={() => void leave()}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-all hover:border-cyan-400 hover:text-white hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('booth.back', 'Back')}</span>
          </button>
          {/* The same bar as the recorder's, from Google's ProBooth page: the
              mark, the room's badge and the song. */}
          <div className="flex min-w-0 items-center gap-2 pl-1">
            <span className="hidden text-sm font-extrabold text-white sm:inline">
              FUTURE<span className="text-emerald-500">BOX</span>
            </span>
            <span className="whitespace-nowrap rounded-lg border border-sky-400/45 bg-sky-500/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              {t('booth.title', 'ProBooth')}
              <span className="hidden sm:inline"> · {t('pro.lanesBadge', 'Lanes')}</span>
            </span>
            <span className="hidden min-w-0 truncate text-xs text-zinc-400 md:inline">{title}</span>
          </div>

          {/* Undo / Redo */}
          <div className="flex shrink-0 items-center gap-1 pl-1">
            <button
              type="button"
              data-undo
              onClick={stepBack}
              disabled={undoWhat === null}
              aria-label={undoWhat === null ? t('undo.nothing', 'Niks om te herstel nie') : `${t('undo.does', 'Herstel')}: ${undoWhat}`}
              title={undoWhat === null ? t('undo.nothing', 'Niks om te herstel nie') : `${t('undo.does', 'Herstel')}: ${undoWhat}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-cyan-500 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-redo
              onClick={stepForward}
              disabled={redoWhat === null}
              aria-label={redoWhat === null ? t('undo.nothingAgain', 'Niks om oor te doen nie') : `${t('undo.again', 'Doen weer')}: ${redoWhat}`}
              title={redoWhat === null ? t('undo.nothingAgain', 'Niks om oor te doen nie') : `${t('undo.again', 'Doen weer')}: ${redoWhat}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-cyan-500 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right utility buttons: Sliders, Help, Settings */}
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            type="button"
            onClick={() => setDeskOpen((was) => (was === 'mix' ? null : 'mix'))}
            title={t('pro.deskTone', 'Mixer & Levels')}
            aria-label={t('pro.deskTone', 'Mixer & Levels')}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-cyan-400 hover:text-white transition-all"
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeskOpen((was) => (was === 'tracks' ? null : 'tracks'))}
            title={t('pro.deskMeter', 'Tempo & Tracks')}
            aria-label={t('pro.deskMeter', 'Tempo & Tracks')}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-cyan-400 hover:text-white transition-all"
          >
            <Gauge className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeskOpen((was) => (was === 'effects' ? null : 'effects'))}
            title={t('pro.deskLayout', 'Effects & Tone')}
            aria-label={t('pro.deskLayout', 'Effects & Tone')}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-cyan-400 hover:text-white transition-all"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── That the work is being kept, and that it was picked back up ────

          The owner lost a whole session to a back gesture: "toe ek terug swipe of
          back druk, dan gooi hy mens heeltemal uit na die home screen toe en
          jy verloor jou hele projek."

          It is written down now, on the device, two seconds after every
          change. This strip is the part of that she can see — because storage
          that works silently and storage that has quietly stopped look exactly
          the same from a chair, and the difference is a night's takes. */}
      {jamArrived && (
        <div className="flex items-center gap-3 border-b border-sky-500/30 bg-sky-500/10 px-5 py-2 text-xs text-sky-100" data-jamarrived>
          <Repeat className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {t('pro.jamArrived', 'Your loop from the jam room is in, as the lane “Jam loop”, going round from the top to the end of the song. Drag its end to make it shorter.')}
          </span>
          <button
            type="button"
            onClick={() => setJamArrived(false)}
            aria-label={t('pro.jamArrivedOk', 'Got it')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {(cameBack || savedAt !== null || saveFailed) && (
        /* A plain "saved" is said on a desk only: on a phone it was a whole
           row taken from the lanes to say that nothing is wrong. A failure
           and "Carried on … Start fresh" still show everywhere. */
        <div className={`${cameBack || saveFailed ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-800 bg-zinc-950 px-5 py-2 text-xs`}>
          {saveFailed ? (
            <span className="font-semibold text-amber-300">
              {saveFailed === 'full'
                ? t('pro.keptFull', 'This device has no room left, so the session is not being saved. Mix it down, or make some space.')
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
                void forgetSession(song);
                remember(t('undo.all', 'die skoonvee van al die bane'));
                setLanes((was) => was.filter((lane) => lane.backing));
                setCameBack(false);
                setSavedAt(null);
              }}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-semibold text-zinc-300 hover:border-sky-500 hover:text-white"
            >
              {t('pro.startFresh', 'Start fresh')}
            </button>
          )}
        </div>
      )}


      {/* ── The timeline ───────────────────────────────────────────────

          The owner, 14 September 2026: *"Die timeline van die verskillende layers
          moet reg by en teen mekaar wees."*

          One shared axis for the ruler and every lane, so alignment is a
          property of the layout rather than something each row has to get
          right — see the long note at the top of `BoothTimeline`. The clips
          are dragged, cut and dragged again with a thumb, and the playhead
          has a head big enough to catch. */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* The timeline container */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* The sound, live. Not on a phone held sideways: there the
              timeline needs every pixel of a short screen. */}
          {/* The transport, over the music where a hand reaches for it. Not
              on a phone held sideways, where the rail carries play and the
              timeline needs every pixel of a short screen. */}
          {!sideways && (
            <BoothTransport
              recording={recording}
              looping={looping}
              clicking={clicking}
              countBars={countBars}
              bpm={meter.bpm}
              signature={`${meter.beats}/${meter.unit}`}
              keyName={meter.key}
              markerHere={markerAt !== undefined}
              hasMarkers={markers.length > 0}
              onMarker={markerToggle}
              onPrevMarker={() => toMarker(-1)}
              onNextMarker={() => toMarker(1)}
              onStart={toStart}
              onStop={stopAll}
              onRecord={recordToggle}
              onLoop={loopToggle}
              onClick={clickToggle}
              onTempo={() => setDeskOpen('tracks')}
              onMixer={() => setDeskOpen('mix')}
              lanePicked={Boolean(picked)}
              hasClip={hasClip}
              onCopy={copyLane}
              onPaste={pasteLane}
              onDuplicate={duplicateLane}
              busy={busy || making}
            />
          )}
          {/* Only while there is sound to draw: still, it was an empty strip
              above the lanes. */}
          {!sideways && (playing || recording) && <BoothScope ear={scopeRef} playing={playing} />}
          <div className="inline-grid grid-cols-2 gap-1.5 self-start" data-boothviews role="group" aria-label={t('lane.viewWhat', 'What the sound is made of: time across, pitch up, loudness as colour.')}>
            {(['wave', 'spectrum'] as const).map((one) => (
              <button
                key={one}
                type="button"
                data-boothview={one}
                aria-pressed={laneView === one}
                title={one === 'spectrum' ? t('lane.viewWhat', 'What the sound is made of: time across, pitch up, loudness as colour.') : undefined}
                onClick={() => pickLaneView(one)}
                className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold ${laneView === one ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200' : 'border-white/10 text-zinc-400 hover:text-white'}`}
              >
                {one === 'wave' ? <Waves className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
                {one === 'wave' ? t('lane.viewWave', 'Waveform') : t('lane.viewSpectrum', 'Spectrogram')}
              </button>
            ))}
          </div>
          <BoothTimeline
            view={laneView}
            markers={markers}
            onMarks={(id) => { void findMarks(id); }}
            lanes={lanes}
            total={canvas}
            at={at}
            live={live}
            playing={playing || recording}
            meter={meter}
            snap={snap}
            spans={Object.values(known).flatMap((one) => one.spans ?? [])}
            onSeek={seek}
            onChange={(id, how) => change(id, how)}
            onSlide={slide}
            onPick={(id) => setPicked((was) => (was === id ? null : id))}
            picked={picked}
            region={region}
            onRegion={setRegion}
          />

          {/* Not on a phone held sideways: there the room is under three
              hundred pixels tall, these three wrap into rows, and the
              timeline above was left two pixels (`check:probooth`). The rail
              beside it opens the same three desks. */}
          {lanes.length <= 2 && !sideways && (
            /* One row that slides sideways, not three that wrap.
               The owner, 21 October 2026, from her phone: functions sat
               behind the button bar. The room is a column that does not
               scroll; the timeline keeps a floor of 40vh, and these three
               wrapped onto three rows a card's height under it — so on a
               phone the card was cut off at the dock with two buttons out
               of reach. As one row it is 70 pixels and always whole. */
            <div data-quickslots className="fb-fx-booth-panel mx-3 my-2 shrink-0 rounded-2xl border px-3 pb-2 pt-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300/80">
                {t('pro.quickSlots', 'Studio Track Slots')}
              </span>
              <div className="-mx-1 mt-1.5 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setDeskOpen('stems')}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-950/30 px-3 text-xs font-semibold text-sky-300 hover:border-sky-400 hover:bg-sky-900/40 transition-all"
                >
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <span>{t('pro.splitStemsAction', 'Split Stems (Vocals, Drums, Bass, Instruments)')}</span>
                </button>
                {/* ── Each one does what it says ─────────────────────────

                    Found on 15 October 2026 going through every function in
                    the booth: "Add Vocal / Harmony Track" opened the Voice
                    desk, which sings an EXISTING lane in another voice and
                    adds nothing, and "Add Instrument / Neural Part" opened
                    Tempo & Tracks, which has no generator on it at all. Two
                    buttons whose words and whose deeds disagreed.

                    The vocal one records a new lane, against the click and
                    count-in already set — the dock's middle button and this
                    one both stop it. The instrument one opens the part sheet
                    itself, which says its price before anything is spent. */}
                <button
                  type="button"
                  data-quickrecord=""
                  onClick={() => void (recording ? stopRecording() : record())}
                  disabled={busy || making}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-950/30 px-3 text-xs font-semibold text-sky-300 hover:border-sky-400 hover:bg-sky-900/40 transition-all disabled:opacity-50"
                >
                  {recording ? <Square className="h-3.5 w-3.5 fill-current text-red-400" /> : <Mic2 className="h-3.5 w-3.5 text-sky-400" />}
                  <span>{recording ? t('pro.stopRecording', 'Stop recording') : t('pro.addVocalTrack', 'Add Vocal / Harmony Track')}</span>
                </button>
                <button
                  type="button"
                  data-quickpart=""
                  onClick={() => setPartOpen(true)}
                  disabled={busy || recording || making}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/30 px-3 text-xs font-semibold text-purple-300 hover:border-purple-400 hover:bg-purple-900/40 transition-all disabled:opacity-50"
                >
                  <Music2 className="h-3.5 w-3.5 text-purple-400" />
                  <span>{t('pro.addInstrumentTrack', 'Add Instrument / Neural Part')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ── What went wrong, wherever you are ─────────────────────

          Outside the column above, and that is the whole point of the line.

          The owner, 15 September: *"Die stem generation op die ai liedjies wil
          nie die instrumente split van die liedjies nie."*

          It may well be refusing for a reason it is perfectly willing to
          give. Every paid action in this room — splitting a lane, reading
          it, singing it again, taking the room off it — is started from a
          desk, and the desks cover the column this message used to live in.
          So the room said why, into a box nobody could see, and the
          symptom was a button that did nothing.

          Mine, from the rebuild the night before. A message about a failure
          has to draw where the failure was started.

          Pinned above the bars rather than in the flow: the desk is
          scrolled, and a sentence at the bottom of a scroll is a sentence
          that arrives after somebody has given up. */}
      {problem && (
        <p
          role="alert"
          className="shrink-0 border-t px-5 py-2 text-sm font-semibold leading-snug"
          style={{ borderColor: EDGE, background: PANEL, color: '#fbbf24' }}
        >
          {problem}
        </p>
      )}

      {/* The TONE3000 errand's own line, beside the room's and not inside
          it. `problem` is what the mix and the money say; this is what
          happened on somebody else's site, and folding the two together
          would mean a tone that could not be fetched reads like a mix that
          could not be paid for.

          Dismissable, because it is the only message here that arrives
          without her pressing anything — she comes back from their page and
          it is already on the screen. */}
      {t3kSaid && (
        <p
          role="status"
          data-t3ksaid=""
          className="shrink-0 flex items-start gap-2 border-t px-5 py-2 text-sm font-semibold leading-snug"
          style={{ borderColor: EDGE, background: PANEL, color: '#6ee7b7' }}
        >
          <span className="min-w-0 flex-1">{t3kSaid}</span>
          <button
            type="button"
            onClick={() => setT3kSaid('')}
            aria-label={t('pro.t3kClose', 'Close')}
            className="min-h-[24px] shrink-0 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </p>
      )}

      {/* ── The marked piece, and the button that opens its tools ──────

          The owner: *"highlight daai gedeelte met 'n button wat op pop met
          verskillende opsies binne die button."*

          One button, and the options inside it. Pinned above the bars rather
          than floating over the mark itself, and that is a phone decision:
          a toolbar drawn on top of the piece covers the piece, and on a
          390-pixel screen a two-second mark is forty pixels wide — there is
          no room over it for anything. Down here it is always in the same
          place, always reachable by the thumb that is already on the bars,
          and it is only on the screen while something is marked. */}
      {region && region.to - region.from > 0.01 && (
        <div
          className="flex shrink-0 items-center gap-2 border-t px-3 py-2"
          style={{ borderColor: EDGE, background: PANEL }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black tabular-nums" style={{ color: LIT }}>
              {clock(region.from)} – {clock(region.to)} · {(region.to - region.from).toFixed(1)}s
            </p>
            <p className="truncate text-[11px]" style={{ color: INK_DIM }}>
              {lanes.find((one) => one.id === picked)?.name
                ?? t('pro.regionNoLaneShort', 'no lane open')}
            </p>
          </div>
          <button
            type="button"
            data-regionloop=""
            data-loopfrom={region.from.toFixed(2)}
            data-loopto={region.to.toFixed(2)}
            data-playat={at.toFixed(2)}
            aria-pressed={looping}
            disabled={recording}
            onClick={() => {
              const next = !looping;
              setLooping(next);
              /* Turned on while stopped: start going round from the top of
                 the piece, which is what pressing a loop button means. */
              if (next && !playing && region) {
                setAt(region.from);
                play(region.from);
              }
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black disabled:opacity-50"
            style={looping
              ? { background: 'rgba(56,189,248,0.22)', color: LIT, boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.6)' }
              : { background: 'rgba(255,255,255,0.06)', color: INK_DIM }}
            title={t('pro.loopWhat', 'Plays the marked piece round and round. Record while it loops and every pass is kept as its own take.')}
          >
            <Repeat className="h-4 w-4" />
            {looping ? t('pro.looping', 'Looping') : t('pro.loopIt', 'Loop it')}
          </button>
          <button
            type="button"
            data-regiontools=""
            onClick={() => setRegionOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 fb-fx-go rounded-full px-4 py-2 text-sm font-black text-onAccent"
          >
            <Sparkles className="h-4 w-4" />
            {t('pro.regionMagic', 'AI magic')}
          </button>
          <button
            type="button"
            onClick={() => setRegion(null)}
            aria-label={t('pro.regionClear', 'Clear the marked piece')}
            title={t('pro.regionClear', 'Clear the marked piece')}
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', color: INK_DIM }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      </div>

      {/* ── The two bars, and whatever is out from behind them ────────

          The app's own tab bar is gone while this room is open — see
          `useOwnScreen` above and `app/lib/fullroom.ts`. The way out is the
          back button at the top left, which was already there. */}
      <BoothDock
        open={deskOpen}
        onOpen={setDeskOpen}
        playing={playing}
        recording={recording}
        /* Mid-take the middle button ends the take; see `recording` on
           BoothDock. The skips stand down there and `seek` refuses too. */
        onPlay={() => (recording ? void stopRecording() : playing ? stopPlaying() : play(at))}
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
  onSave,
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
  found?: { tempo: number | null; key: string | null; spans: Span[]; saw: string[] };
  onUseTempo: (bpm: number, key: string | null) => void;
  /** Take this lane out of the room: `wav` is the sound, `mid` is the notes. */
  onSave: (what: 'wav' | 'midi') => void;
  busy: boolean;
}): React.ReactElement {
  const { t, lang } = useLang();
  const quiet = audible(lanes).indexOf(lane) < 0;
  const [open, setOpen] = useState(false);
  /** Whether the take-it-away menu is down. */
  const [saving, setSaving] = useState(false);
  /**
   * How far the menu sits from its button's left edge, in pixels.
   *
   * It was `absolute right-0 w-72`: 288 pixels growing leftwards from the
   * button's right edge. The button wraps to wherever the row puts it, and
   * on a 390-pixel phone it often lands near the left — so the menu ran off
   * the left of the screen with its first words cut. Found on 15 October
   * 2026. Worked out from where the button actually is when it is pressed,
   * and kept 12 pixels inside both edges of the screen.
   */
  const [saveLeft, setSaveLeft] = useState(0);
  /**
   * Whether this lane's MIDI would be a fact or a reading.
   *
   * Known from the lane alone, which is the point: the menu has to say which
   * of the two it is BEFORE the file is downloaded, so this cannot be the
   * result of doing the transcription.
   */
  const source: Source = lane.notes?.length ? 'exact' : 'heard';
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

  /* ── The shelf ────────────────────────────────────────────────────────
 
     The owner, 23 September 2026: *"ek wil 'n ordentlike probooth bou en voel ons
     moet ook nog amp modellers in bring."*
 
     The modelling was already here. What was not was anywhere to keep a
     capture: the file was read, the lane was run through it, and the file
     itself was dropped — so a second lane meant finding it in the file
     manager again, and a re-recorded take could not get its amp back at all.
     `lib/amps.ts` holds them now. */
  const [shelf, setShelf] = useState<Amp[]>([]);
  /* Which capture is waiting to be told what it came under. `null` is none,
     and the row that asks is drawn beside that capture rather than as a
     dialogue over the room — a question about one thing belongs next to the
     thing. */
  const [asking, setAsking] = useState<string | null>(null);

  useEffect(() => { setShelf(loadAmps()); }, []);

  /** Run this lane through a capture, whatever it came from. */
  const runThrough = async (json: string, name: string): Promise<void> => {
    /* Any context will do: `through` only wants it to make the buffer, and
       a one-frame offline context costs nothing and closes itself. */
    const room = new OfflineAudioContext(1, 1, lane.audio.sampleRate);
    const audio = await through(room, lane.audio, json);
    onChange({ amped: { name, audio } });
  };

  /* ── The door out to TONE3000 is NOT here yet, on purpose ────────────
 
     The server side is finished and held by checks: `/api/tone3000/start`
     sends her, the callback brings her back with a tone id and the room she
     left, and `/api/tone3000/tone` turns that id into a `.nam`.
 
     Where the capture LANDS was the hard part. `runThrough` above puts an
     amp on THIS lane, and the return journey has no lane: she leaves, their
     page loads, she comes back on a fresh page, and the lane she pressed on
     may not exist any more. Remembering a lane id across that is remembering
     something that can go stale while she is away.

     So it lands on the shelf below — storage rather than state, which every
     lane row reads — and one press puts it on any lane. `takeTone` writes it
     there, proving it first with the same rule this function follows.
 
     Taken out with it: a split of this function into a text-taking half.
     It was written for the return journey and nothing else used it, and a
     refactor whose only caller has been removed is a shape kept for a
     feature that does not exist. `check:ampshelf` reads THIS function for
     the run-it-before-you-keep-it rule and the size rule, and the split
     moved both out of its reach — which is how it was noticed. */
  const bringAmp = async (file: File) => {
    setAmping(true);
    setAmpFailed('');
    try {
      if (file.size > AMP_MAX_BYTES) {
        setAmpFailed(t('pro.ampTooBig', 'That file is too large to be a capture. A .nam is usually under a megabyte.'));
        return;
      }
      const json = await file.text();
      const name = ampName(json);
      /* Run it FIRST, and keep it only once it worked.
 
         A shelf that fills up with files that will not load is worse than no
         shelf: every one of them is a press that fails later, with nothing
         on the row to say which. `through` throws on a capture this engine
         cannot read, so the catch below is the whole test. */
      await runThrough(json, name);
      /* ── Who made it, and what may be done with it ────────────────
 
         The owner, 7 October 2026, on TONE3000: *"Didn't Tone3000 give us
         permission if we add their name on products?"* Partly — three of
         the eight licences a capture can carry forbid selling outright,
         and the credit a `cc-by` asks for is the MAKER's name, not the
         site's.
 
         The maker is in the file often enough to be worth reading. The
         licence never is, so the capture goes onto the shelf as "I do not
         know" and the row asks. Cautious by default, because somebody who
         does not know what a capture came under has not got permission —
         they have got a capture and a question. */
      const made = ampId();
      await rememberAmp({
        id: made,
        name,
        from: file.name,
        bytes: file.size,
        createdAt: new Date().toISOString(),
        maker: ampMaker(json) || undefined,
        licence: UNKNOWN,
      }, json);
      setShelf(loadAmps());
      setAsking(made);
    } catch {
      setAmpFailed(t('pro.ampFailed', 'That file did not load as an amp.'));
    } finally {
      setAmping(false);
    }
  };

  /** One off the shelf, onto this lane. */
  const useAmp = async (amp: Amp) => {
    setAmping(true);
    setAmpFailed('');
    try {
      const json = await ampJson(amp.id);
      if (!json) {
        /* The details survived and the bytes did not — a browser's storage
           can be cleared in halves. Said, and the dead row taken off, rather
           than leaving a button that fails every time it is pressed. */
        setAmpFailed(t('pro.ampGone', 'That capture is not on this device any more.'));
        await forgetAmp(amp.id);
        setShelf(loadAmps());
        return;
      }
      await runThrough(json, amp.name);
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
      <div className="w-full sm:w-40 shrink-0 space-y-1">
        {/* ── The name, as a field rather than as text ─────────────

            The owner, 10 October 2026: *"Op elke track van die probooth moet daar
            'n manier wees om die track 'n naam te gee. Vir 'n professional
            moet hulle weet watter instrument is waar."*

            It was already here and she looked and did not find it — which is
            the same thing as it not being here. It was a borderless,
            placeholder-less, label-less `bg-transparent` input, so what was on
            the screen was the lane's name in bold, looking exactly like the
            heading it was sitting where. Nothing said it could be typed in.

            So: a border, a label above it, and a placeholder that is an
            instrument. The placeholder is doing the real work — "Bass, Lead
            vocal, Kick" is the sentence that says both "this is a field" and
            "this is what goes in it", and a professional with eleven lanes
            open is exactly the person who needs the second half. */}
        <label htmlFor={`lane-name-${lane.id}`} className="block text-[10px] font-bold uppercase tracking-wide text-zinc-600">
          {t('pro.laneName', 'Lane name')}
        </label>
        <input
          id={`lane-name-${lane.id}`}
          data-lanenamefield
          value={lane.name}
          onChange={(event) => onChange({ name: event.target.value.slice(0, 40) })}
          placeholder={t('pro.laneNameHint', 'Bass, Lead vocal, Kick…')}
          className="min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm font-semibold text-zinc-200 placeholder:font-normal placeholder:text-zinc-600 outline-hidden focus:border-sky-500 focus:text-white"
        />
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => onChange({ muted: !lane.muted })}
            className={`min-h-[44px] min-w-[44px] rounded text-[11px] font-bold border ${
              lane.muted ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {lane.muted ? <VolumeX className="w-3 h-3" /> : t('pro.mute', 'M')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ soloed: !lane.soloed })}
            className={`min-h-[44px] min-w-[44px] rounded text-[11px] font-bold border ${
              lane.soloed
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
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
            className="flex-1 accent-sky-500 h-11 touch-manipulation"
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
          there is a different one. The owner: *"Die timeline van die verskillende
          layers moet reg by en teen mekaar wees."*

          Two places to cut the same lane would also be two places to
          disagree about where the cut is. */}
      {/* ── The word, which this did not have ─────────────────────────
 
          The owner, 6 October 2026: *"Daai drie strepies ekstra funksies is
          darem baie weggesteek."*
 
          She is right, and the fault was not where the drawer sits. Behind
          this one button are the cleaners, the whole tone stack and the amp
          — and it carried a slider icon and nothing else. A `title` and an
          `aria-label` are not a label: the first needs a mouse resting on
          it, which a phone does not have, and the second is for a screen
          reader. Somebody looking at the screen saw three stripes.
 
          The order inside stays as it is. Cleaners, then tone, then amp is
          the order the sound actually runs through, and that is not a
          preference to shuffle for findability. What was wrong is that
          nothing said the drawer was there.
 
          `data-tonedrawer` so a probe can say the word is on it rather than
          that a button exists. */}
      <button
        type="button"
        data-tonedrawer=""
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        title={t('pro.tone', 'Tone')}
        aria-label={t('pro.tone', 'Tone')}
        className={`shrink-0 flex items-center gap-1.5 whitespace-nowrap px-2.5 py-2 sm:px-2 sm:py-1 rounded-xl border text-xs font-bold ${
          isClean(lane.tone)
            ? 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
            : 'border-sky-500/50 text-sky-400'
        }`}
      >
        <Sliders className="w-4 h-4 shrink-0" />
        {t('pro.tone', 'Tone')}
      </button>

      {/* Sized by what is in it, not by a number that was right once.

          This was `w-32` — 128 pixels — and `flex-shrink-0`, holding an L, a
          slider and an R that come to 155. A box that may not shrink and is
          smaller than its contents does not scroll and does not wrap: it
          paints the overflow over whatever is beside it. What the owner saw was
          this block's "R" printed underneath the start-time field next to it:
          "kyk fyn na bar langs die skertjie. daar is iets dubbel daar."

          The row around it already wraps. Letting these blocks be as wide as
          they need means the wrap can do its job. */}
      <div className="min-w-0 max-w-full flex flex-wrap items-center gap-1.5">
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
 
             The owner, looking at the fix: "daar is steeds iets bo oor die R. dit
             lyk soos 'n 0." It was the slider, over the R, over the 0.
 
             A stated width contributes itself to the measurement, which is
             what a content-sized box needs from every child in it. */
          className="w-24 accent-sky-500 h-11 touch-manipulation"
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
      {/* Allowed to wrap within the card. `shrink-0` sized this row to all of
          its buttons on one line, so on a phone it ran past the card and the
          whole Track controls panel slid sideways with "Take this lane away"
          hanging off it — the owner's photograph, 20 October 2026: "Hier is
          'n hele button uit plek uit." */}
      <div className="min-w-0 max-w-full flex flex-wrap items-center gap-1">
        <input
          type="number"
          step={0.05}
          value={Number(lane.at.toFixed(2))}
          onChange={(event) => onChange({ at: Number(event.target.value) })}
          disabled={lane.backing}
          className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-2 sm:py-1 min-h-[44px] text-sm text-zinc-300 tabular-nums disabled:opacity-40"
          aria-label={t('pro.startsAt', 'Starts at')}
        />
        <span className="text-[11px] text-zinc-600">s</span>
        {/* Splitting costs money and everything else in this room does not, so
            the price is on the control rather than in a dialog after it. */}
        <button
          type="button"
          onClick={onSplit}
          disabled={busy}
          title={`${t('pro.split', 'Split the voice off')} — ${perMinute(pieceSeconds(lane), CREDITS.stems)} ${t('video.credits', 'credits')}`}
          aria-label={t('pro.split', 'Split the voice off')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-sky-400 disabled:opacity-40"
        >
          <SquareSplitHorizontal className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onParts}
          disabled={busy || reading}
          title={`${t('pro.parts', 'Split into named parts')} — ${perMinute(pieceSeconds(lane), CREDITS.parts)} ${t('video.credits', 'credits')}`}
          aria-label={t('pro.parts', 'Split into named parts')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-sky-400 disabled:opacity-40"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRead}
          disabled={busy || reading}
          title={`${t('pro.read', 'Read the chords, key and tempo')} — ${perMinute(pieceSeconds(lane), CREDITS.read)} ${t('video.credits', 'credits')}`}
          aria-label={t('pro.read', 'Read the chords, key and tempo')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-sky-400 disabled:opacity-40"
        >
          {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onVoice}
          disabled={busy}
          title={t('pro.sing', 'Sing this in another voice')}
          aria-label={t('pro.sing', 'Sing this in another voice')}
          className="p-2 sm:p-0 text-zinc-600 hover:text-sky-400 disabled:opacity-40"
        >
          <Mic2 className="w-4 h-4" />
        </button>
        {/* ── Take this one away ─────────────────────────────

            The owner, 10 October 2026: *"iemand op 'n spesifieke track kan click
            en dan is daar 'n dropdownmenu wat die opsie gee vir download midi,
            download wav. Dit gee die geleentheid om 'n sekere klank te save
            vir 'n ander projek."*

            A menu rather than two buttons, because the two are not
            interchangeable and the difference needs a sentence each. The WAV
            is the sound. The MIDI is the notes — and on a recording those
            notes have to be FOUND, one line at a time, which is a thing
            somebody must know BEFORE the file is on their machine and not
            after they have built a session on it. `check:midi` holds that
            sentence to being on the screen. */}
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            data-lanesave
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              const screen = window.innerWidth;
              const wide = Math.min(288, screen - 24);
              /* Right edges lined up where that fits, as it was; otherwise
                 slid until both edges are on the screen. */
              const wanted = box.width - wide;
              setSaveLeft(Math.max(12 - box.left, Math.min(wanted, screen - 12 - wide - box.left)));
              setSaving((was) => !was);
            }}
            aria-expanded={saving}
            title={t('pro.save', 'Take this lane away')}
            className="flex min-h-[44px] w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 hover:border-sky-500/50 hover:text-sky-300"
          >
            <ArrowDownToLine className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t('pro.save', 'Take this lane away')}</span>
          </button>
          {saving && (
            <div
              data-lanesavemenu
              className="absolute z-20 mt-1 w-72 max-w-[calc(100vw-24px)] space-y-1 rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-xl"
              style={{ left: saveLeft }}
            >
              <button
                type="button"
                data-savewav
                onClick={() => { setSaving(false); onSave('wav'); }}
                className="w-full rounded-xl px-2.5 py-2 text-left hover:bg-zinc-900"
              >
                <span className="block text-sm font-bold text-zinc-200">
                  {t('pro.saveWav', 'Download WAV')} · {creditsSaid(CREDITS.laneWav, t)}
                </span>
                <span className="block text-xs leading-snug text-zinc-500">
                  {t(
                    'pro.saveWavNote',
                    'The sound, cut as you cut it, through its amp. Not the mix — the level, the pan and the tone are this song’s balance and do not travel with it.',
                  )}
                </span>
              </button>
              <button
                type="button"
                data-savemidi
                onClick={() => { setSaving(false); onSave('midi'); }}
                className="w-full rounded-xl px-2.5 py-2 text-left hover:bg-zinc-900"
              >
                <span className="block text-sm font-bold text-zinc-200">
                  {t('pro.saveMidi', 'Download MIDI')} · {creditsSaid(CREDITS.laneMidi, t)}
                </span>
                {/* Which of the two this would be, said before the press.
                    A lane the booth BUILT from notes carries them; anything
                    else has to be listened to. */}
                <span className="block text-xs leading-snug text-zinc-500">
                  {source === 'heard'
                    ? t(
                        'pro.midiHeard',
                        'The notes, found by listening. One line at a time — a chord comes out as a single note and a full mix comes out as nonsense, so this is for a bass, a melody or a hummed beat.',
                      )
                    : t(
                        'pro.midiExact',
                        'The notes this lane was built from, exactly as they were played. Nothing is measured and nothing can be wrong.',
                      )}
                </span>
              </button>
            </div>
          )}
        </div>
        {!lane.backing && (
          <button type="button" data-droplane onClick={onRemove} className="p-2 sm:p-0 text-zinc-600 hover:text-red-400 ml-auto">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {/* ── What the row of icons does, before it is pressed ────────────

            The owner: "daar moet pop out vraagtekens wees by die skêr, en die
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
            'Two halves: lift the voice off this lane, so the singing and the music become two lanes. Layers: split it into named parts — drums, bass, and the rest. Magnifier: read the chords, key and tempo. Microphone: sing this lane in another voice. Bin: remove the lane. The first four cost credits and each one says how many; the bin uses none. The scissors above are a plain cut and use none.',
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
              {t('pro.key', 'Key')} <span className="text-sky-400">{found.key}</span>
            </span>
          )}
          {found.tempo !== null && (
            <button
              type="button"
              onClick={() => onUseTempo(found.tempo as number, found.key)}
              className="px-2.5 py-2 sm:py-1 min-h-[44px] rounded-xl border border-sky-500/50 bg-sky-500/10 text-xs font-bold text-sky-300"
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
              {found.saw.length > 0 && (
                <>
                  {' '}
                  {t('pro.readSaw', 'What came back:')} {found.saw.join(', ')}
                </>
              )}
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
        {/* ── The rig, at a glance ───────────────────────────────────────
            The owner, 14 October 2026, from the TONE3000 page in her ProBooth
            design: the capture, the cabinet and the pedals as three cards.
            These are the three things this lane really runs through — the
            amp capture from the shelf or the catalogue below, the speaker,
            and the drive of the tone stack — said plainly, with what each
            is set to now. Every control is still the one further down. */}
        <div className="grid grid-cols-3 gap-1.5" data-amprig>
          {([
            [t('pro.rigAmp', 'Amp capture'), lane.amped?.name ?? t('pro.rigNone', 'None yet'), 'text-amber-300'],
            [t('pro.rigCab', 'Cabinet'), tone.cabinet ? t('pro.rigCabOn', 'Guitar speaker') : t('pro.rigCabOff', 'Straight'), 'text-teal-300'],
            [t('pro.rigDrive', 'Drive'), `${Math.round(tone.drive * 100)}%`, 'text-sky-300'],
          ] as const).map(([what, now, ink]) => (
            <div key={what} className="min-w-0 rounded-lg border border-amber-500/20 bg-zinc-900/80 p-2">
              <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{what}</span>
              <span className={`block truncate text-xs font-bold ${ink}`}>{now}</span>
            </div>
          ))}
        </div>
        {/* ── Taking things off, before shaping what is left ─────────────

            The owner: "by die booth moet daar oor die algemeen ook reverb, echo en
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
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold ${
                  on
                    ? 'border-sky-500 bg-sky-500/15 text-white'
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
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-40"
          >
            {t('pro.deRoom', 'Take the room off')}
          </button>
          <Cost rate={CREDITS.clean} seconds={pieceSeconds(lane)} />
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
              className="w-28 accent-sky-500 h-11 touch-manipulation"
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
              className="w-28 accent-sky-500 h-11 touch-manipulation"
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
              className="w-28 accent-sky-500 h-11 touch-manipulation"
              aria-label={t('pro.blend', 'Blend')}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange({ tone: { ...tone, cabinet: !tone.cabinet } })}
            aria-pressed={tone.cabinet}
            className={`px-2.5 py-2 sm:py-1 min-h-[44px] rounded-xl border text-xs font-bold ${
              tone.cabinet
                ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {t('pro.cabinet', 'Speaker')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ tone: CLEAN })}
            className="px-2.5 py-2 sm:py-1 min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 text-xs font-bold text-zinc-500 hover:text-white"
          >
            {t('pro.clean', 'Straight')}
          </button>
        </div>
        <Note className="text-[11px] text-zinc-600 leading-snug">{t(
            'pro.toneWhat',
            'A tone stack built here, not a model of a named amplifier: a soft clip, a tilt, and the band a guitar speaker passes. Turning the drive up changes the shape and not the level, so it cannot be pushed just because louder sounded better.',
          )}</Note>

        {/* ── Built-in stock amp sounds ── */}
        <div className="pt-2 border-t border-zinc-800 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>{t('pro.stockAmps', 'Stock amp sounds (built-in)')}</span>
            </span>
            <span className="text-[10px] text-sky-400 font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30">
              {t('pro.offlineReady', 'Works without internet')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STOCK_AMPS.map((amp) => {
              const isActive =
                Math.abs(tone.drive - amp.tone.drive) < 0.02 &&
                Math.abs(tone.colour - amp.tone.colour) < 0.02 &&
                tone.cabinet === amp.tone.cabinet;
              return (
                <button
                  key={amp.id}
                  type="button"
                  onClick={() => onChange({ tone: amp.tone })}
                  aria-pressed={isActive}
                  title={lang === 'af' ? amp.descAf : amp.descEn}
                  className={`flex min-h-[44px] items-center gap-2 px-2 py-1.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    isActive
                      ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                      : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white'
                  }`}
                >
                  <AmpFace amp={amp} size={44} />
                  <span>
                    <span className="block text-xs font-bold">{amp.name}</span>
                    <span className="block text-[10px] text-zinc-500 font-normal">
                      {amp.category}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-zinc-500">
            {t(
              'pro.stockAmpsWhy',
              'Ready-made guitar tones from the room’s own drive, colour and speaker cabinet — a starting point in the spirit of classic amps, not captures of them. For a real captured amp, load a .nam file.',
            )}
          </p>
        </div>

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
                <span className="px-2.5 py-2 sm:py-1 min-h-[44px] rounded-lg bg-sky-500/15 border border-sky-500/50 text-sky-300 text-xs font-bold min-w-0 truncate max-w-[12rem]">
                  {lane.amped.name}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ amped: undefined })}
                  className="px-2.5 py-1.5 min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  {t('pro.ampOff', 'Take it off')}
                </button>
              </>
            ) : (
              <label className={`px-2.5 py-1.5 min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold flex items-center gap-1.5 ${
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
          {/* ── The catalogue ─────────────────────────────────────────
              Captures she chose and uploaded, credited to their makers,
              for every member to search. It replaced "Browse TONE3000",
              which went out through their site and on her phone did not
              come back: "Ons kan nie deur hulle website werk nie, want dit
              werk nie." What is pressed here lands on the shelf below with
              the maker and the licence already on it. */}
          <AmpCatalogue onShelf={() => setShelf(loadAmps())} />
          {/* ── The ones you keep ──────────────────────────────────────
              One press to put an amp that is already here onto this lane.
              Drawn whether or not a lane is amped, because swapping one for
              another is the thing somebody actually does — the old row made
              that "take it off, then find the file again". */}
          {shelf.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-ampshelf>
              {shelf.map((one) => {
                const on = lane.amped?.name === one.name;
                return (
                  /* Three real buttons with a gap, not a segmented group.
 
                     The group version gave the middle one `border-y`, and
                     `check:sideborder` refused it — the green rule in
                     globals.css matches a one-sided border and paints it a
                     filled rectangle with no radius. The check was right and
                     the look was mine; a tight gap reads the same and every
                     button is a button. */
                  <span key={one.id} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void useAmp(one)}
                      disabled={amping}
                      aria-pressed={on}
                      title={one.from}
                      data-useamp={one.id}
                      className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-bold max-w-[10rem] truncate disabled:opacity-50 ${
                        on
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-500'
                      }`}
                    >
                      {one.name}
                    </button>
                    {/* Kept, so eviction never takes it. Twelve is not many
                        and the one you always use should not age out. */}
                    <button
                      type="button"
                      onClick={() => setShelf(favouriteAmp(one.id, !one.favourite))}
                      aria-pressed={Boolean(one.favourite)}
                      aria-label={t('pro.ampKeep', 'Keep this amp on the shelf')}
                      className={`min-h-[44px] px-1.5 rounded-xl border border-zinc-700 bg-zinc-950 ${
                        one.favourite ? 'text-amber-300' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void forgetAmp(one.id).then(() => setShelf(loadAmps()))}
                      aria-label={t('pro.ampForget', 'Take this amp off this device')}
                      className="min-h-[44px] px-1.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] text-zinc-600 hover:text-rose-300 hover:border-rose-500/50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {/* ── What this capture came under ─────────────────────────────
 
              The owner, 7 October 2026, on TONE3000: *"Didn't Tone3000 give us
              permission if we add their name on products?"* Partly. Three of
              the eight licences a capture can carry forbid selling outright,
              and the credit a `cc-by` asks for is the maker's name and not
              the site's. `lib/amplicence.ts` carries all eight.
 
              Asked beside the capture rather than as a dialogue over the
              room, and asked ONCE — on the way in — because the question it
              answers is asked months later by somebody who was not there and
              cannot reconstruct it. */}
          {asking && shelf.some((one) => one.id === asking) && (
            <div
              data-amplicence={asking}
              className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5"
            >
              <p className="text-[11px] leading-snug text-amber-200">
                {t(
                  'pro.ampAsk',
                  'What did this capture come under? Three of the licences on TONE3000 say a song made through them may not be sold, so this is worth a moment now rather than a question later.',
                )}
              </p>
              {/* The maker, where the file did not say. The credit a cc-by asks
                  for names a person, and a capture with no `modeled_by` would
                  otherwise be credited to its own name. Prefilled from the
                  file; hers to correct. */}
              <label htmlFor="fb-ampmaker" className="block text-[11px] leading-snug text-zinc-400">
                {t('pro.ampMakerAsk', 'Who made it? The name on the TONE3000 page, so the credit names a person.')}
              </label>
              <input
                id="fb-ampmaker"
                data-amplicencemaker
                type="text"
                maxLength={80}
                value={shelf.find((one) => one.id === asking)?.maker ?? ''}
                onChange={(event) => { setShelf(setAmpMaker(asking, event.target.value)); }}
                placeholder={t('pro.ampMakerWho', 'The maker')}
                className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
              <select
                data-amplicencepick
                value={shelf.find((one) => one.id === asking)?.licence ?? UNKNOWN}
                onChange={(event) => {
                  setShelf(setAmpLicence(asking, event.target.value as LicenceId));
                }}
                className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
              >
                {LICENCES.map((one) => (
                  <option key={one.id} value={one.id}>{t(one.name[0], one.name[1])}</option>
                ))}
              </select>
              <button
                type="button"
                data-amplicencedone
                onClick={() => setAsking(null)}
                className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-zinc-200"
              >
                {t('pro.ampAskDone', 'That is right')}
              </button>
            </div>
          )}

          {/* And what the shelf is owed, once there is anything on it that
              owes something. Printed rather than kept, because a credit
              nobody can see is a credit nobody gives. */}
          {shelf.some((one) => needsCredit(one.licence)) && (
            <p data-ampcredits className="text-[11px] leading-snug text-zinc-500">
              {t('pro.ampCredits', 'Captures on this shelf that ask to be credited:')}
              {' '}
              {shelf.filter((one) => needsCredit(one.licence))
                .map((one) => `${one.maker || one.name} (${licenceOf(one.licence).id})`)
                .join(' \u00b7 ')}
              {shelf.some((one) => !mayBeSold(one.licence)) && (
                <>
                  {' '}
                  <strong className="text-amber-300">
                    {t('pro.ampNotForSale', 'Some of these say a song made through them may not be sold.')}
                  </strong>
                </>
              )}
            </p>
          )}

          {shelf.length > 0 && (
            <Note className="text-[11px] text-zinc-600 leading-snug">{t('pro.ampShelf')}</Note>
          )}

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
