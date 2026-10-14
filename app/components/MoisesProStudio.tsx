'use client';

/**
 * Moises-style AI Audio & Stems Studio for ProBooth.
 *
 * Implements the 5 reference screens provided by Carli:
 *   1. Left Stem Mixer Console (Vocals, Background Vocals, Drums, Bass,
 *      Lead Guitar, Rhythm Guitar, Other, Smart Metronome) with Mute (M),
 *      Solo (S), cyan horizontal level faders, and Rotary Pan Knobs (L - R).
 *   2. Chords View ('AI Lyrics Transcription + Chords') with cyan chords
 *      above words, transposable based on Song Key, and 'Easy v' complexity.
 *   3. Lyrics View ('AI Lyrics Transcription') with synchronized scrolling
 *      lyrics and line highlighting.
 *   4. Waveforms View: Multi-track colored waveforms for all stems with tall
 *      white playhead and Smart Metronome speed toggles (0.5x, 1x, 2x).
 *   5. Song Key popover ('Song Key', Tuning 440 Hz, [-] Em [+], Reset).
 *   6. Right Sections Panel (Intro, Verse, Chorus, Solo, Bridge, Outro)
 *      with clickable timestamps.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Music2,
  Headphones, Download, MoreHorizontal, ChevronDown, Plus, Minus, RotateCcw,
  Sliders, Layers, FileText, AlignLeft, ListOrdered, Check, Sparkles, X, ArrowLeft,
} from 'lucide-react';
import { useLang } from '../lib/i18n';

export interface StemChannel {
  readonly id: string;
  readonly nameKey: string;
  readonly nameFallback: string;
  volume: number; // 0 to 100
  pan: number; // -50 (L) to +50 (R)
  muted: boolean;
  soloed: boolean;
  color: string;
}

export interface SongSection {
  readonly label: string;
  readonly at: number; // in seconds
}

export interface LyricLine {
  readonly time: number;
  readonly chords: readonly { readonly chord: string; readonly pos: number }[];
  readonly text: string;
}

const DEFAULT_SECTIONS: readonly SongSection[] = [
  { label: 'Intro', at: 1 },
  { label: 'Intro', at: 11 },
  { label: 'Verse', at: 21 },
  { label: 'Chorus', at: 57 },
  { label: 'Verse', at: 82 },
  { label: 'Verse', at: 101 },
  { label: 'Chorus', at: 132 },
  { label: 'Instrumental Solo', at: 152 },
  { label: 'Bridge', at: 162 },
  { label: 'Instrumental', at: 182 },
  { label: 'Chorus', at: 203 },
  { label: 'Outro', at: 240 },
];

const DEFAULT_LYRICS: readonly LyricLine[] = [
  {
    time: 21,
    chords: [{ chord: 'Em', pos: 0 }, { chord: 'E', pos: 5 }],
    text: 'To get in the mood',
  },
  {
    time: 35,
    chords: [{ chord: 'A', pos: 12 }],
    text: 'You gotta feel the groove',
  },
  {
    time: 57,
    chords: [{ chord: 'E', pos: 8 }, { chord: 'Em', pos: 12 }, { chord: 'E', pos: 16 }],
    text: 'You gotta feel it',
  },
  {
    time: 72,
    chords: [{ chord: 'A', pos: 10 }],
    text: 'Feel it in your soul',
  },
  {
    time: 82,
    chords: [{ chord: 'E', pos: 6 }, { chord: 'Em', pos: 9 }],
    text: "Don't you know?\nWhere we at",
  },
  {
    time: 101,
    chords: [{ chord: 'D', pos: 8 }, { chord: 'A', pos: 12 }],
    text: "Where we've been, baby\nWhere we've been, my baby",
  },
  {
    time: 120,
    chords: [{ chord: 'Em', pos: 8 }],
    text: "I'm gonna show you",
  },
];

const KEYS = ['C', 'C#', 'Dm', 'D#m', 'Em', 'F', 'F#m', 'G', 'G#m', 'Am', 'Bbm', 'Bm'] as const;

export default function MoisesProStudio({
  songTitle = 'Feel the Groove (feat. Priscilla Zamborlini)',
  duration = 252, // 4:12 in seconds
  onBackToTimeline,
  onOpenDaw,
  onClose,
}: {
  readonly songTitle?: string;
  readonly duration?: number;
  readonly onBackToTimeline?: () => void;
  readonly onOpenDaw?: () => void;
  readonly onClose?: () => void;
}): React.ReactElement {
  const { t } = useLang();

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [looping, setLooping] = useState(false);
  const [masterVolume, setMasterVolume] = useState(85);
  const [isMasterMuted, setIsMasterMuted] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<'chords' | 'lyrics' | 'waveforms'>('chords');
  const [showSections, setShowSections] = useState(false);
  const [chordDifficulty, setChordDifficulty] = useState<'easy' | 'medium' | 'advanced'>('easy');
  const [metronomeSpeed, setMetronomeSpeed] = useState<'0.5x' | '1x' | '2x'>('1x');

  // Key & Tempo popovers
  const [bpm, setBpm] = useState(95);
  const [keyIndex, setKeyIndex] = useState(4); // 'Em'
  const [showKeyPopover, setShowKeyPopover] = useState(false);
  const [showBpmPopover, setShowBpmPopover] = useState(false);
  const [showCountInPopover, setShowCountInPopover] = useState(false);
  const [countInEnabled, setCountInEnabled] = useState(true);
  const [countInClicks, setCountInClicks] = useState(4);
  const originalKeyIndex = 4;

  const tempoName = useMemo(() => {
    if (bpm < 60) return 'Largo';
    if (bpm < 76) return 'Adagio';
    if (bpm < 108) return 'Allegretto';
    if (bpm < 120) return 'Moderato';
    if (bpm < 168) return 'Allegro';
    if (bpm < 200) return 'Vivace';
    return 'Presto';
  }, [bpm]);

  // Stems mixer state
  const [stems, setStems] = useState<StemChannel[]>([
    {
      id: 'vocals',
      nameKey: 'moises.vocals',
      nameFallback: 'Vocals',
      volume: 85,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#3b82f6',
    },
    {
      id: 'bg_vocals',
      nameKey: 'moises.bgVocals',
      nameFallback: 'Background Vocals',
      volume: 80,
      pan: -15,
      muted: false,
      soloed: false,
      color: '#38bdf8',
    },
    {
      id: 'drums',
      nameKey: 'moises.drums',
      nameFallback: 'Drums',
      volume: 90,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#06b6d4',
    },
    {
      id: 'bass',
      nameKey: 'moises.bass',
      nameFallback: 'Bass',
      volume: 85,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#22d3ee',
    },
    {
      id: 'lead_guitar',
      nameKey: 'moises.leadGuitar',
      nameFallback: 'Lead Guitar',
      volume: 75,
      pan: 20,
      muted: false,
      soloed: false,
      color: '#14b8a6',
    },
    {
      id: 'rhythm_guitar',
      nameKey: 'moises.rhythmGuitar',
      nameFallback: 'Rhythm Guitar',
      volume: 70,
      pan: -20,
      muted: false,
      soloed: false,
      color: '#0d9488',
    },
    {
      id: 'other',
      nameKey: 'moises.other',
      nameFallback: 'Other',
      volume: 65,
      pan: 10,
      muted: false,
      soloed: false,
      color: '#67e8f9',
    },
    {
      id: 'smart_metronome',
      nameKey: 'moises.metronome',
      nameFallback: 'Smart Metronome',
      volume: 60,
      pan: 0,
      muted: false,
      soloed: false,
      color: '#94a3b8',
    },
  ]);

  // Timer loop for playback simulation
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          if (looping) return 0;
          setPlaying(false);
          return duration;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, duration, looping]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Transpose chords when song key changes
  const transposeChord = useCallback((chord: string, offset: number): string => {
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
    const isMinor = chord.endsWith('m');
    const root = isMinor ? chord.slice(0, -1) : chord;
    const idx = roots.indexOf(root);
    if (idx === -1) return chord;
    const newIdx = (idx + offset + roots.length * 10) % roots.length;
    return `${roots[newIdx]}${isMinor ? 'm' : ''}`;
  }, []);

  const keyOffset = keyIndex - originalKeyIndex;

  const handleSeek = (newSecs: number): void => {
    setCurrentTime(Math.max(0, Math.min(duration, newSecs)));
  };

  const updateStem = (id: string, patch: Partial<StemChannel>): void => {
    setStems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  // Calculate active section
  const currentSection = useMemo(() => {
    for (let i = DEFAULT_SECTIONS.length - 1; i >= 0; i--) {
      if (currentTime >= DEFAULT_SECTIONS[i].at) {
        return DEFAULT_SECTIONS[i];
      }
    }
    return DEFAULT_SECTIONS[0];
  }, [currentTime]);

  return (
    <div className="flex h-full w-full flex-col bg-black text-zinc-100 select-none overflow-hidden font-sans">
      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-4">
        {/* Left: Back Button & Song Title */}
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('booth.back', 'Back')}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('booth.back', 'Back')}</span>
            </button>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/90 text-zinc-400">
            <Music2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-200 truncate max-w-[240px] sm:max-w-md">
            {songTitle}
          </span>
        </div>

        {/* Right: Controls & Popovers */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Metronome BPM with Popover matching Screenshot 4 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBpmPopover(!showBpmPopover);
                setShowKeyPopover(false);
                setShowCountInPopover(false);
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 font-semibold text-zinc-300 hover:border-zinc-700"
            >
              <span className="text-[11px] text-zinc-400">⏱</span>
              <span>{bpm}</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {showBpmPopover && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <div className="text-center">
                  <h4 className="text-xs font-bold text-zinc-300">
                    {t('moises.bpmTitle', 'BPM')}
                  </h4>
                  <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
                    {tempoName}
                  </p>
                </div>

                <div className="my-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setBpm((b) => Math.max(40, b - 1))}
                    aria-label="Decrease BPM"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-2xl font-black text-zinc-100 tracking-wide tabular-nums">
                    {bpm}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBpm((b) => Math.min(240, b + 1))}
                    aria-label="Increase BPM"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBpm(95);
                    setShowBpmPopover(false);
                  }}
                  className="w-full text-center text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {t('moises.reset', 'Reset')}
                </button>
              </div>
            )}
          </div>

          {/* Key Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowKeyPopover(!showKeyPopover);
                setShowBpmPopover(false);
                setShowCountInPopover(false);
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 font-semibold text-zinc-300 hover:border-zinc-700"
            >
              <span>{KEYS[keyIndex]}</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {/* Song Key Popover matching Screenshot 4 */}
            {showKeyPopover && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <div className="text-center">
                  <h4 className="text-xs font-bold text-zinc-300">
                    {t('moises.songKey', 'Song Key')}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {t('moises.tuning', 'Tuning (Hz): 440')} 𝄢
                  </p>
                </div>

                <div className="my-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setKeyIndex((k) => (k > 0 ? k - 1 : KEYS.length - 1))}
                    aria-label="Lower key by half step"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xl font-black text-cyan-400 tracking-wide">
                    {KEYS[keyIndex]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setKeyIndex((k) => (k < KEYS.length - 1 ? k + 1 : 0))}
                    aria-label="Raise key by half step"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setKeyIndex(originalKeyIndex);
                    setShowKeyPopover(false);
                  }}
                  className="w-full text-center text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {t('moises.reset', 'Reset')}
                </button>
              </div>
            )}
          </div>

          {/* Time Signature & Count in with Popover matching Screenshot 2 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCountInPopover(!showCountInPopover);
                setShowBpmPopover(false);
                setShowKeyPopover(false);
              }}
              className="flex h-8 items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 font-bold text-[11px] text-zinc-300 hover:border-zinc-700"
            >
              <span>12 34</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {showCountInPopover && (
              <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-200">
                    {t('moises.countIn', 'Count in')}
                  </h4>
                  {/* Toggle Switch matching Screenshot 2 */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={countInEnabled}
                    onClick={() => setCountInEnabled(!countInEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      countInEnabled ? 'bg-zinc-200' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        countInEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400 mt-2">
                  {t('moises.clicksBefore', 'Clicks before playback starts')}
                </p>

                <div className="my-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={!countInEnabled}
                    onClick={() => setCountInClicks((c) => Math.max(1, c - 1))}
                    aria-label="Decrease clicks"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className={`text-2xl font-black tracking-wide tabular-nums ${countInEnabled ? 'text-zinc-100' : 'text-zinc-600'}`}>
                    {countInClicks}
                  </span>
                  <button
                    type="button"
                    disabled={!countInEnabled}
                    onClick={() => setCountInClicks((c) => Math.min(16, c + 1))}
                    aria-label="Increase clicks"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export */}
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span>{t('moises.export', 'Export')}</span>
          </button>

          {/* Back to Classic Timeline toggle if requested */}
          {onBackToTimeline && (
            <button
              type="button"
              onClick={onBackToTimeline}
              className="flex h-8 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('moises.toggleTimeline', 'Lane Timeline')}</span>
            </button>
          )}

          {/* Switch to Azure Horizon DAW Arranger */}
          {onOpenDaw && (
            <button
              type="button"
              onClick={onOpenDaw}
              className="flex h-8 items-center gap-1 rounded-lg border border-cyan-700 bg-cyan-950/70 px-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/70 shadow-sm"
            >
              <span>🎹</span>
              <span className="hidden sm:inline">{t('daw.toggleDaw', 'DAW Arranger')}</span>
            </button>
          )}

          <button
            type="button"
            aria-label="More options"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Main Working Area (Left Stems Console + Center View + Right Sections) ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ── Left Stems Console ────────────────────────────────────────── */}
        <aside
          aria-label="Stem Mixer"
          className="flex w-64 sm:w-72 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950 p-3 overflow-y-auto no-scrollbar space-y-3.5"
        >
          {stems.map((stem) => (
            <div
              key={stem.id}
              className="flex flex-col gap-1.5 rounded-xl border border-zinc-900 bg-zinc-900/50 p-2.5 transition-colors hover:border-zinc-800"
            >
              {/* Row 1: Mute (M), Solo (S), Channel Name */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateStem(stem.id, { muted: !stem.muted })}
                  className={`flex h-5 w-6 items-center justify-center rounded text-[10px] font-black transition-colors ${
                    stem.muted
                      ? 'bg-red-500/30 text-red-400 border border-red-500/40'
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => updateStem(stem.id, { soloed: !stem.soloed })}
                  className={`flex h-5 w-6 items-center justify-center rounded text-[10px] font-black transition-colors ${
                    stem.soloed
                      ? 'bg-amber-400/30 text-amber-300 border border-amber-400/40'
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  S
                </button>
                <span className="flex-1 truncate text-xs font-semibold text-zinc-300">
                  {t(stem.nameKey, stem.nameFallback)}
                </span>
              </div>

              {/* Row 2: Cyan Volume Level Slider + Rotary Pan Knob */}
              <div className="flex items-center gap-3 pt-0.5">
                {/* Horizontal Cyan Slider */}
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stem.muted ? 0 : stem.volume}
                    onChange={(e) => updateStem(stem.id, { volume: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-cyan-400"
                  />
                </div>

                {/* Rotary Pan Knob */}
                <div
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() =>
                    updateStem(stem.id, {
                      pan: stem.pan === 0 ? 25 : stem.pan === 25 ? -25 : 0,
                    })
                  }
                  title={`${t('moises.pan', 'Pan')}: ${stem.pan === 0 ? 'C' : stem.pan < 0 ? `L${Math.abs(stem.pan)}` : `R${stem.pan}`}`}
                >
                  <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 group-hover:border-zinc-500">
                    {/* Tick mark indicating angle */}
                    <div
                      className="absolute h-2 w-0.5 bg-zinc-300 rounded-full top-0.5"
                      style={{
                        transformOrigin: 'bottom center',
                        transform: `rotate(${stem.pan * 2.5}deg)`,
                      }}
                    />
                  </div>
                  <div className="flex w-7 justify-between text-[8px] font-bold text-zinc-500 mt-0.5">
                    <span>L</span>
                    <span>R</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </aside>

        {/* ── Center Main Display ───────────────────────────────────────── */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-black">
          {/* Top Control Bar inside Center Display */}
          <div className="flex h-11 items-center justify-between border-b border-zinc-900 px-6 text-xs">
            <span className="font-bold text-zinc-400">
              {viewMode === 'chords' && t('moises.title', 'AI Lyrics Transcription + Chords')}
              {viewMode === 'lyrics' && t('moises.lyricsOnly', 'AI Lyrics Transcription')}
              {viewMode === 'waveforms' && t('moises.waveforms', 'Waveforms')}
            </span>

            {/* View-specific actions */}
            {viewMode === 'chords' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setChordDifficulty((d) => (d === 'easy' ? 'medium' : d === 'medium' ? 'advanced' : 'easy'))
                  }
                  className="flex h-7 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 font-medium text-zinc-300 hover:border-zinc-700"
                >
                  <span className="capitalize">{chordDifficulty}</span>
                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                </button>
                <button
                  type="button"
                  aria-label="Headphones monitor"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                >
                  <Headphones className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Download chords"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 1. CHORDS VIEW */}
          {viewMode === 'chords' && (
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 flex flex-col items-center justify-center space-y-8">
              {DEFAULT_LYRICS.map((line, idx) => {
                const isActive = currentTime >= line.time && currentTime < line.time + 15;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSeek(line.time)}
                    className={`flex flex-col items-center text-center cursor-pointer transition-all ${
                      isActive ? 'scale-105 opacity-100' : 'opacity-75 hover:opacity-95'
                    }`}
                  >
                    {/* Chords row in vivid cyan */}
                    <div className="flex items-center gap-3 text-sm font-black text-cyan-400 tracking-wider">
                      {line.chords.map((c, cIdx) => (
                        <span key={cIdx} className="bg-cyan-950/40 px-1 rounded border border-cyan-800/40">
                          {transposeChord(c.chord, keyOffset)}
                        </span>
                      ))}
                    </div>
                    {/* Lyrics row */}
                    <div
                      className={`mt-1.5 text-base sm:text-lg font-medium whitespace-pre-line ${
                        isActive ? 'text-zinc-100 font-bold' : 'text-zinc-300'
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. LYRICS VIEW (Teleprompter) */}
          {viewMode === 'lyrics' && (
            <div className="flex-1 overflow-y-auto p-8 sm:p-14 flex flex-col items-center justify-center space-y-7">
              {DEFAULT_LYRICS.map((line, idx) => {
                const isActive = currentTime >= line.time && currentTime < line.time + 15;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSeek(line.time)}
                    className={`cursor-pointer text-center text-lg sm:text-2xl font-bold whitespace-pre-line transition-all ${
                      isActive
                        ? 'text-cyan-300 scale-110 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. WAVEFORMS MULTI-TRACK VIEW */}
          {/* Sideways on purpose: a music timeline is as long as the song, and wrapping it would break time into rows. */}
          {viewMode === 'waveforms' && (
            <div className="relative flex-1 overflow-x-auto p-4 flex flex-col no-scrollbar">
              {/* Top Time Ruler */}
              <div className="relative h-6 border-b border-zinc-800 mb-2 flex items-center text-[10px] text-zinc-500 font-mono">
                {Array.from({ length: 9 }, (_, i) => {
                  const s = i * 30;
                  return (
                    <span
                      key={i}
                      className="absolute"
                      style={{ left: `${(s / duration) * 100}%` }}
                    >
                      {formatTime(s)}
                    </span>
                  );
                })}
              </div>

              {/* Multi-Track Waveforms Stack */}
              <div className="relative flex-1 flex flex-col space-y-1.5">
                {stems.map((stem) => (
                  <div
                    key={stem.id}
                    className="relative h-11 w-full rounded-md border border-zinc-800/80 bg-zinc-900/60 overflow-hidden flex items-center"
                    style={{ backgroundColor: `${stem.color}15` }}
                  >
                    {/* Stem Name Label */}
                    <span className="absolute left-2 text-[10px] font-bold text-zinc-400 z-10 pointer-events-none">
                      {t(stem.nameKey, stem.nameFallback)}
                    </span>

                    {/* Metronome Speed toggle if Smart Metronome */}
                    {stem.id === 'smart_metronome' && (
                      <div className="absolute left-32 flex items-center gap-1 z-10">
                        {(['0.5x', '1x', '2x'] as const).map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => setMetronomeSpeed(sp)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              metronomeSpeed === sp
                                ? 'bg-zinc-200 text-black'
                                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Synthetic High-Resolution Waveform Visualization */}
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 30">
                      <path
                        d="M0 15 Q 10 5, 20 15 T 40 15 T 60 8 T 80 22 T 100 15 T 120 4 T 140 26 T 160 15 T 180 6 T 200 24 T 220 15 T 240 7 T 260 23 T 280 15 T 300 5 T 320 25 T 340 15 T 360 8 T 380 22 T 400 15"
                        fill="none"
                        stroke={stem.color}
                        strokeWidth="1.8"
                        strokeOpacity={stem.muted ? '0.2' : '0.85'}
                      />
                    </svg>
                  </div>
                ))}

                {/* Full-Height Vertical Playhead Line across all tracks */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-zinc-100 z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-zinc-100 shadow-md" />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Right Sections Panel (Drawer) ─────────────────────────────── */}
        {showSections && (
          <aside
            aria-label="Song Sections"
            className="flex w-52 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 p-3 overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="text-xs font-bold text-zinc-300">
                {t('moises.sections', 'Sections')}
              </span>
              <button
                type="button"
                onClick={() => setShowSections(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {DEFAULT_SECTIONS.map((sec, idx) => {
                const isCurrent = currentSection.at === sec.at;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSeek(sec.at)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-zinc-800 text-cyan-300 font-bold border border-zinc-700'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <span>{sec.label}</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {formatTime(sec.at)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Transport Bar ────────────────────────────────────────── */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-zinc-800/80 bg-zinc-950 px-4 sm:px-6">
        {/* Playback Controls & Transport */}
        <div className="flex flex-1 items-center justify-center sm:justify-start gap-4">
          {/* Mute Master */}
          <button
            type="button"
            onClick={() => setIsMasterMuted(!isMasterMuted)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            {isMasterMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Seek -10s */}
          <button
            type="button"
            onClick={() => handleSeek(currentTime - 10)}
            className="text-zinc-400 hover:text-zinc-200"
            title="Seek -10s"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-black shadow-lg hover:bg-zinc-200 active:scale-95 transition-all"
          >
            {playing ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black ml-0.5" />}
          </button>

          {/* Seek +10s */}
          <button
            type="button"
            onClick={() => handleSeek(currentTime + 10)}
            className="text-zinc-400 hover:text-zinc-200"
            title="Seek +10s"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Loop Toggle */}
          <button
            type="button"
            onClick={() => setLooping(!looping)}
            className={`transition-colors ${looping ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Repeat className="h-4 w-4" />
          </button>

          {/* Time Scrubber */}
          <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-xs">
            <span className="font-mono text-xs text-zinc-400">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded bg-zinc-800 accent-zinc-200"
            />
            <span className="font-mono text-xs text-zinc-500">{formatTime(duration)}</span>
          </div>
        </div>

        {/* View Switchers (Lyrics, Chords, Sections, Waveforms) */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('lyrics')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'lyrics'
                ? 'bg-zinc-200 text-black shadow'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t('moises.lyrics', 'Lyrics')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('chords')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'chords'
                ? 'bg-zinc-200 text-black shadow'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>🎹</span>
            <span>{t('moises.chords', 'Chords')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('waveforms')}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'waveforms'
                ? 'bg-zinc-200 text-black shadow'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{t('moises.waveforms', 'Waveforms')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSections(!showSections)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              showSections
                ? 'bg-zinc-200 text-black shadow'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span>{t('moises.sections', 'Sections')}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
