'use client';

/**
 * Pro DAW Studio ("Azure Horizon" style workstation).
 *
 * Implements the arrangement & workstation UI requested by Carli:
 *   1. Arranger & Timeline Grid with track headers (New Track, Virtual Instrument)
 *      with Mute (M), Solo (S), Record Arm (R), Input Monitor (I), volume faders,
 *      pan knobs, bar grid 1..12+, snap magnet, and zoom.
 *   2. Bottom Virtual Instrument Keyboard:
 *      - Preset: Chord & Stab / Loft Jack with < > arrows.
 *      - Macro knobs: Chord Color, Drawbar Stack, Pitch Jab, Grit.
 *      - Scale Highlighter: e.g. F# / Minor Scale with cyan dots on notes in scale.
 *      - Octave selector (< Octave 3 >).
 *      - Real Web Audio API synthesizer that plays chords and notes.
 *   3. Right Drawers:
 *      - Stem Generation: Drums, Bass, Guitar, Keys, Strings, Others,
 *        Styles (AI Match, Alternative, Arena, Ballad), HI-FI toggle, Generate Stem.
 *      - Voice Conversion: Voices (Zuri, Amy, Trent, Rosa), My Voices, Search,
 *        HI-FI toggle, Convert Voice.
 *   4. Top DAW Bar: "Azure Horizon", transport controls, counter (001 01, 00:00:00.00),
 *      120 bpm, 4/4, C, Master volume, Mix & Master, Share, and view switchers.
 */

import { barClearance } from './TabBar';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, Pause, Square, Repeat, Volume2, VolumeX, Undo2, Redo2,
  Share2, Sliders, Music2, Plus, Sparkles, X, ChevronDown, ChevronLeft,
  ChevronRight, Search, Filter, AlertTriangle, Info, Zap, Layers,
  Compass, Radio, Users, Cloud, Disc, AudioWaveform, SlidersHorizontal,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';

export interface DawTrack {
  id: string;
  name: string;
  isVirtualInstrument?: boolean;
  muted: boolean;
  soloed: boolean;
  armed: boolean;
  monitored: boolean;
  volume: number; // 0 to 100
  pan: number; // -50 to 50
  color: string;
}

export type DrawerType = 'none' | 'stems' | 'voices' | 'mixmaster';

const SCALES: Record<string, number[]> = {
  'F# Minor': [6, 8, 9, 11, 1, 2, 4], // F#, G#, A, B, C#, D, E
  'C Major': [0, 2, 4, 5, 7, 9, 11],
  'A Minor': [9, 11, 0, 2, 4, 5, 7],
  'G Major': [7, 9, 11, 0, 2, 4, 6],
  'E Minor': [4, 6, 7, 9, 11, 0, 2],
  'D Minor': [2, 4, 5, 7, 9, 10, 0],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function ProDawStudio({
  projectTitle = 'Azure Horizon',
  onBackToStemStudio,
  onBackToTimeline,
  onClose,
}: {
  readonly projectTitle?: string;
  readonly onBackToStemStudio?: () => void;
  readonly onBackToTimeline?: () => void;
  readonly onClose?: () => void;
}): React.ReactElement {
  const { t } = useLang();
  /* Back closes it, as every overlay that covers the app does (`check:backlayers`). */
  useBackLayer(Boolean(onClose), () => onClose?.());

  // DAW Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playheadBar, setPlayheadBar] = useState(1);
  const [playheadBeat, setPlayheadBeat] = useState(1);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);

  // Tempo & Signature
  const [bpm, setBpm] = useState(120);
  const [keyRoot, setKeyRoot] = useState('C');
  const [masterVolume, setMasterVolume] = useState(82);

  // Right Drawer
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>('none');
  const [stemCategory, setStemCategory] = useState<'drums' | 'bass' | 'guitar' | 'keys' | 'strings' | 'others'>('drums');
  const [stemTab, setStemTab] = useState<'styles' | 'custom'>('styles');
  const [selectedStyle, setSelectedStyle] = useState<string>('drums_arena');
  const [isHiFi, setIsHiFi] = useState(true);

  // Voice Conversion state
  const [voiceTab, setVoiceTab] = useState<'voices' | 'my_voices'>('voices');
  const [voiceQuery, setVoiceQuery] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>('zuri');

  // Audio Effects Modal State (Screenshots 1 & 2)
  const [isAudioEffectsOpen, setIsAudioEffectsOpen] = useState(false);
  const [effectsSearch, setEffectsSearch] = useState('');
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [isGeneratingEffect, setIsGeneratingEffect] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [activeEffectsList, setActiveEffectsList] = useState<string[]>(['compressor', 'eq']);

  // Mix & Master state
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const [masterFaderDb, setMasterFaderDb] = useState(0.0);

  // Virtual Instrument State
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(true);
  const [octave, setOctave] = useState(3);
  const [activeScale, setActiveScale] = useState<string>('F# Minor');
  const [chordColor, setChordColor] = useState(65);
  const [drawbarStack, setDrawbarStack] = useState(45);
  const [pitchJab, setPitchJab] = useState(30);
  const [grit, setGrit] = useState(25);
  const [activeNotePressed, setActiveNotePressed] = useState<number | null>(null);

  // Tracks list
  const [tracks, setTracks] = useState<DawTrack[]>([
    {
      id: 't_1',
      name: 'New Track',
      isVirtualInstrument: false,
      muted: false,
      soloed: false,
      armed: false,
      monitored: false,
      volume: 75,
      pan: 0,
      color: '#3b82f6',
    },
    {
      id: 't_2',
      name: 'Virtual Instrument',
      isVirtualInstrument: true,
      muted: false,
      soloed: false,
      armed: true,
      monitored: false,
      volume: 85,
      pan: 0,
      color: '#06b6d4',
    },
  ]);

  // Audio Context for the Virtual Instrument Synth
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play synthetic note on piano press
  const playSynthNote = useCallback((midiNote: number) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq * 1.002, ctx.currentTime); // subtle chorusing

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + chordColor * 30, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [getAudioContext, chordColor]);

  // Clock runner for DAW playback simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlayheadBeat((b) => {
        if (b >= 4) {
          setPlayheadBar((bar) => (bar >= 16 ? 1 : bar + 1));
          return 1;
        }
        return b + 1;
      });
      setPlayheadSeconds((s) => s + 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const updateTrack = (id: string, patch: Partial<DawTrack>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const isNoteInScale = useCallback((noteIndexInOctave: number): boolean => {
    const scaleNotes = SCALES[activeScale] || SCALES['C Major'];
    return scaleNotes.includes(noteIndexInOctave);
  }, [activeScale]);

  // Generate piano keys from C(octave) to C(octave+3)
  const pianoKeys = useMemo(() => {
    const keys: { midi: number; name: string; isBlack: boolean; noteIndex: number; label?: string }[] = [];
    const startMidi = (octave + 1) * 12; // e.g. Octave 3 -> MIDI 48 (C3)
    const count = 37; // 3 octaves plus top C

    for (let i = 0; i < count; i++) {
      const midi = startMidi + i;
      const noteIndex = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
      const octNum = Math.floor(midi / 12) - 1;
      const name = `${NOTE_NAMES[noteIndex]}${octNum}`;
      const label = noteIndex === 0 ? `C${octNum}` : undefined;
      keys.push({ midi, name, isBlack, noteIndex, label });
    }
    return keys;
  }, [octave]);

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {/* ── Top Header Bar (Azure Horizon) ────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 sm:px-4">
        {/* Left: Project title & Transport Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Project icon and name */}
          <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              <AudioWaveform className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-xs font-bold text-zinc-200 tracking-tight">
              {projectTitle}
            </span>
          </div>

          {/* Transport buttons: Stop, Play, Record, Loop */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setIsRecording(false);
                setPlayheadBar(1);
                setPlayheadBeat(1);
                setPlayheadSeconds(0);
              }}
              title={t('daw.stop', 'Stop')}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <Square className="h-3 w-3 fill-zinc-300" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? t('daw.pause', 'Pause') : t('daw.play', 'Play')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-all active:scale-95 ${
                isPlaying ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 fill-black" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRecording(!isRecording);
                if (!isPlaying) setIsPlaying(true);
              }}
              title={t('daw.record', 'Record')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-all active:scale-95 ${
                isRecording ? 'bg-red-500 text-black animate-pulse' : 'bg-zinc-800 text-red-400 hover:bg-zinc-700'
              }`}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </button>
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              title={t('daw.loop', 'Loop')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                isLooping ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Repeat className="h-3 w-3" />
            </button>
          </div>

          {/* Counter Display: 001 01 & 00:00:00.00 */}
          <div className="hidden md:flex flex-col font-mono text-[10px] leading-tight text-zinc-400 px-2 border-l border-zinc-800">
            <span className="font-bold text-zinc-200">
              {String(playheadBar).padStart(3, '0')} {String(playheadBeat).padStart(2, '0')}
            </span>
            <span className="text-zinc-500">
              00:{String(Math.floor(playheadSeconds)).padStart(2, '0')}.00
            </span>
          </div>

          {/* Tempo, Meter, Key */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-2 border-l border-zinc-800">
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{bpm} bpm</span>
            <span className="text-zinc-500">4/4</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-cyan-400">{keyRoot}</span>
          </div>
        </div>

        {/* Center/Right: Master level, Mix & Master, Share, Viewport Toggles */}
        <div className="flex items-center gap-2">
          {/* Master volume slider */}
          <div className="hidden sm:flex items-center gap-1.5 text-zinc-400">
            <Volume2 className="h-3.5 w-3.5" />
            <input
              type="range"
              min="0"
              max="100"
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              className="h-1 w-16 appearance-none rounded bg-zinc-800 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-0.5">
            <button type="button" className="p-1 text-zinc-400 hover:text-zinc-200">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="p-1 text-zinc-400 hover:text-zinc-200">
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mix & Master Button */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'mixmaster' ? 'none' : 'mixmaster')}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold shadow-md transition-all active:scale-95 ${
              activeDrawer === 'mixmaster'
                ? 'bg-cyan-400 text-black shadow-cyan-500/30 ring-1 ring-cyan-300'
                : 'bg-cyan-500 text-black hover:bg-cyan-400'
            }`}
          >
            <Sliders className="h-3 w-3" />
            <span>{t('daw.mixAndMaster', 'Mix & Master')}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            className="hidden sm:flex h-7 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-100 px-2.5 text-xs font-semibold text-black hover:bg-zinc-200 active:scale-95 transition-all"
          >
            <Share2 className="h-3 w-3" />
            <span>{t('daw.share', 'Share')}</span>
          </button>

          {/* Toggle back to Moises Studio */}
          {onBackToStemStudio && (
            <button
              type="button"
              onClick={onBackToStemStudio}
              className="flex h-7 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 text-xs font-medium text-cyan-300 hover:bg-zinc-700"
            >
              <Disc className="h-3 w-3" />
              <span className="hidden md:inline">{t('moises.toggleStudio', 'Studio Console')}</span>
            </button>
          )}

          {/* Close / Back button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-200"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Middle Working Area (Arranger + Drawers + Right Utility Rail) ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Arranger Center Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top of Arranger: Track Headers + Timeline Grid */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Track Headers Column */}
            <div className="w-56 sm:w-64 shrink-0 border-r border-zinc-800/80 bg-zinc-950 flex flex-col">
              {/* + Add Track Row */}
              <div className="flex h-9 items-center justify-between border-b border-zinc-800 px-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const newId = `t_${tracks.length + 1}`;
                    setTracks((prev) => [
                      ...prev,
                      {
                        id: newId,
                        name: `Track ${prev.length + 1}`,
                        muted: false,
                        soloed: false,
                        armed: false,
                        monitored: false,
                        volume: 80,
                        pan: 0,
                        color: '#a855f7',
                      },
                    ]);
                  }}
                  className="flex items-center gap-1.5 font-bold text-zinc-300 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('daw.addTrack', 'Add track')}</span>
                </button>
                <div className="text-zinc-500 hover:text-zinc-300 cursor-pointer">📈</div>
              </div>

              {/* Track Headers List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 p-2">
                {tracks.map((trk) => (
                  <div
                    key={trk.id}
                    className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-xs hover:border-zinc-700 transition-colors"
                  >
                    {/* Header Row: Title & Icons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        {trk.isVirtualInstrument ? (
                          <span className="flex items-center gap-1 rounded bg-cyan-950 px-1 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800/60">
                            🎹 {t('daw.virtualInstrument', 'Virtual Instrument')}
                          </span>
                        ) : (
                          <span className="font-semibold text-zinc-200 truncate">
                            {trk.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <span>fx</span>
                        <span>⋮</span>
                      </div>
                    </div>

                    {/* M, S, R, I Buttons */}
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => updateTrack(trk.id, { muted: !trk.muted })}
                        className={`h-4.5 px-1.5 rounded text-[9px] font-black ${
                          trk.muted ? 'bg-red-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTrack(trk.id, { soloed: !trk.soloed })}
                        className={`h-4.5 px-1.5 rounded text-[9px] font-black ${
                          trk.soloed ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTrack(trk.id, { armed: !trk.armed })}
                        className={`h-4.5 px-1.5 rounded text-[9px] font-black ${
                          trk.armed ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        R
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTrack(trk.id, { monitored: !trk.monitored })}
                        className={`h-4.5 px-1.5 rounded text-[9px] font-black ${
                          trk.monitored ? 'bg-cyan-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        I
                      </button>

                      {/* Mini Volume Fader */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={trk.volume}
                        onChange={(e) => updateTrack(trk.id, { volume: Number(e.target.value) })}
                        className="h-1 flex-1 ml-1 appearance-none rounded bg-zinc-800 accent-zinc-200 cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center Arranger Grid */}
            {/* Sideways on purpose: a music timeline is as long as the song, and wrapping it would break time into rows. */}
            <div className="relative flex-1 flex flex-col overflow-x-auto bg-black">
              {/* Timeline Bar Numbers (1..16) */}
              <div className="flex h-9 border-b border-zinc-800 bg-zinc-950/70 text-[10px] text-zinc-500 font-mono">
                {Array.from({ length: 16 }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 flex items-center border-r border-zinc-900 px-1.5 min-w-[50px]"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Arranger Track Lanes with Playhead */}
              <div className="relative flex-1 p-2 space-y-1">
                {tracks.map((trk) => (
                  <div
                    key={trk.id}
                    className="h-16 w-full rounded-md border border-zinc-900 bg-zinc-950/40 relative overflow-hidden"
                  >
                    {/* Simulated clip in Track */}
                    <div
                      className="absolute inset-y-1 left-4 right-16 rounded border border-cyan-500/40 bg-cyan-950/30 flex items-center px-3"
                    >
                      <span className="text-[10px] font-bold text-cyan-300">
                        {trk.name} (Audio Clip)
                      </span>
                    </div>
                  </div>
                ))}

                {/* Vertical Playhead Needle */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-zinc-100 z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ left: `${((playheadBar - 1 + (playheadBeat - 1) / 4) / 16) * 100}%` }}
                >
                  <div className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-zinc-100 shadow-md" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Virtual Instrument Keyboard Section (Screenshots 1, 3, 5) ── */}
          {isKeyboardOpen && (
            <div className="flex shrink-0 flex-col border-t border-zinc-800 bg-zinc-950 p-2 sm:p-3">
              {/* Preset Selector & Macro Controls Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-2 mb-2 text-xs">
                {/* Left: Preset name with < > */}
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-950 border border-indigo-700/50 text-indigo-300">
                    🎹
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-semibold">
                      {t('daw.chordAndStab', 'Chord & Stab')}
                    </span>
                    <span className="font-bold text-zinc-200">
                      {t('daw.loftJack', 'Loft Jack')}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 ml-1 text-zinc-500">
                    <button type="button" className="hover:text-zinc-200">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="hover:text-zinc-200">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Macro Knobs/Sliders: Chord Color, Drawbar Stack, Pitch Jab, Grit */}
                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">
                    <span className="text-[10px] text-zinc-400">🪄</span>
                    <span className="text-[11px] font-semibold text-zinc-300">
                      {t('daw.chordColor', 'Chord Color')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">
                    <span className="text-[10px] text-zinc-400">🎚️</span>
                    <span className="text-[11px] font-semibold text-zinc-300">
                      {t('daw.drawbarStack', 'Drawbar Stack')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">
                    <span className="text-[10px] text-zinc-400">📈</span>
                    <span className="text-[11px] font-semibold text-zinc-300">
                      {t('daw.pitchJab', 'Pitch Jab')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">
                    <span className="text-[10px] text-zinc-400">⚡</span>
                    <span className="text-[11px] font-semibold text-zinc-300">
                      {t('daw.grit', 'Grit')}
                    </span>
                  </div>
                </div>

                {/* Octave & Scale Highlighter */}
                <div className="flex items-center gap-2">
                  {/* Octave switcher */}
                  <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-zinc-300">
                    <button
                      type="button"
                      onClick={() => setOctave((o) => Math.max(1, o - 1))}
                      className="text-zinc-500 hover:text-zinc-200"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <span>{t('daw.octave', 'Octave')} {octave}</span>
                    <button
                      type="button"
                      onClick={() => setOctave((o) => Math.min(5, o + 1))}
                      className="text-zinc-500 hover:text-zinc-200"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Scale Picker */}
                  <select
                    value={activeScale}
                    onChange={(e) => setActiveScale(e.target.value)}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-cyan-300 cursor-pointer"
                  >
                    <option value="F# Minor">{t('daw.fSharpMinor', 'F# / Minor Scale')}</option>
                    <option value="C Major">{t('daw.cMajor', 'C / Major Scale')}</option>
                    <option value="A Minor">{t('daw.aMinor', 'A / Minor Scale')}</option>
                    <option value="G Major">{t('daw.gMajor', 'G / Major Scale')}</option>
                    <option value="E Minor">{t('daw.eMinor', 'E / Minor Scale')}</option>
                    <option value="D Minor">{t('daw.dMinor', 'D / Minor Scale')}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsAudioEffectsOpen(true)}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-bold text-orange-400 hover:border-orange-500/50 hover:text-orange-300 transition-colors"
                    title={t('daw.audioEffects', 'Audio Effects')}
                  >
                    Fx
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsKeyboardOpen(false)}
                    className="text-zinc-500 hover:text-zinc-300 ml-1"
                    title={t('daw.hideKeyboard', 'Hide keyboard')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Piano Keys with Cyan Dots for Notes in Scale */}
              {/* Sideways on purpose: a music timeline is as long as the song, and wrapping it would break time into rows. */}
              <div className="relative flex h-32 sm:h-36 w-full select-none overflow-x-auto justify-center bg-black/80 rounded-xl p-1 no-scrollbar">
                {pianoKeys.map((key) => {
                  const inScale = isNoteInScale(key.noteIndex);
                  const isPressed = activeNotePressed === key.midi;

                  if (key.isBlack) {
                    return (
                      <button
                        key={key.midi}
                        type="button"
                        onPointerDown={() => {
                          setActiveNotePressed(key.midi);
                          playSynthNote(key.midi);
                        }}
                        onPointerUp={() => setActiveNotePressed(null)}
                        onPointerLeave={() => setActiveNotePressed(null)}
                        className={`relative z-10 -mx-3 sm:-mx-3.5 h-20 sm:h-22 w-6 sm:w-7 rounded-b-md transition-all active:translate-y-0.5 ${
                          isPressed
                            ? 'bg-cyan-500 shadow-cyan-500/50'
                            : 'bg-zinc-800 hover:bg-zinc-800 shadow-md'
                        } border border-black flex flex-col justify-end items-center pb-2`}
                      >
                        {/* Cyan scale dot matching Screenshot 1 */}
                        {inScale && (
                          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={key.midi}
                      type="button"
                      onPointerDown={() => {
                        setActiveNotePressed(key.midi);
                        playSynthNote(key.midi);
                      }}
                      onPointerUp={() => setActiveNotePressed(null)}
                      onPointerLeave={() => setActiveNotePressed(null)}
                      className={`relative z-0 h-32 sm:h-36 flex-1 max-w-[36px] sm:max-w-[42px] min-w-[28px] rounded-b-lg border border-zinc-700 transition-all ${
                        isPressed
                          ? 'bg-cyan-200'
                          : 'bg-zinc-100 hover:bg-zinc-200'
                      } flex flex-col justify-between items-center py-2 text-black shadow-sm`}
                    >
                      {/* Top cyan dot if in scale */}
                      {inScale ? (
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
                      ) : (
                        <div className="h-1.5 w-1.5" />
                      )}
                      {/* Bottom Label (e.g. C3, C4, C5, C6) */}
                      <span className="text-[10px] font-bold text-zinc-700">
                        {key.label || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Bottom Section: Audio Effects Strip (Screenshots 1 & 2) ────── */}
          {!isKeyboardOpen && (
            <div className="flex h-10 shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black tracking-wider text-orange-500 uppercase">
                  {t('daw.audioEffectsUpper', 'AUDIO EFFECTS')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAudioEffectsOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {t('daw.addEffect', '+ Add')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsKeyboardOpen(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 p-1"
                  title="Keyboard"
                >
                  🎹
                </button>
                <button
                  type="button"
                  onClick={() => setIsKeyboardOpen(true)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                  title={t('common.close', 'Close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Drawers (Stem Generation & Voice Conversion) ────────────── */}
        {/* 1. Stem Generation Drawer (Screenshot 3) */}
        {activeDrawer === 'stems' && (
          <aside
            aria-label="Stem Generation"
            className="flex w-72 sm:w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 p-4 overflow-y-auto no-scrollbar space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-200">
                  {t('daw.stemGeneration', 'Stem Generation')}
                </span>
                <Info className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Instrument Chips (Drums, Bass, Guitar, Keys, Strings, Others) */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'drums', label: t('daw.drums', 'Drums'), icon: '🥁' },
                { id: 'bass', label: t('daw.bass', 'Bass'), icon: '🎸' },
                { id: 'guitar', label: t('daw.guitar', 'Guitar'), icon: '🎧' },
                { id: 'keys', label: t('daw.keys', 'Keys'), icon: '🎹' },
                { id: 'strings', label: t('daw.strings', 'Strings'), icon: '🎻' },
                { id: 'others', label: t('daw.others', 'Others'), icon: '🗄️' },
              ].map((inst) => {
                const isSel = stemCategory === inst.id;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => setStemCategory(inst.id as typeof stemCategory)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-semibold transition-all ${
                      isSel
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span>{inst.icon}</span>
                    <span>{inst.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Styles vs Custom Tabs */}
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStemTab('styles')}
                className={`flex-1 rounded-md py-1 transition-all ${
                  stemTab === 'styles' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('daw.styles', 'Styles')}
              </button>
              <button
                type="button"
                onClick={() => setStemTab('custom')}
                className={`flex-1 rounded-md py-1 transition-all ${
                  stemTab === 'custom' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('daw.custom', 'Custom')}
              </button>
            </div>

            {/* Style Cards (AI Match, Alternative, Arena, Ballad) */}
            <div className="space-y-2">
              {/* AI Match */}
              <div
                onClick={() => setSelectedStyle('ai_match')}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                  selectedStyle === 'ai_match'
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {t('daw.aiMatch', 'AI Match')}
                  </span>
                  <span className="text-[11px] text-zinc-400 leading-snug">
                    {t('daw.aiMatchDesc', 'Generate a drum track from the context audio.')}
                  </span>
                </div>
              </div>

              {/* Alternative */}
              <div
                onClick={() => setSelectedStyle('alternative')}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                  selectedStyle === 'alternative'
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-900/50 text-blue-300">
                  🌊
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {t('daw.alternative', 'Alternative')}
                  </span>
                  <span className="text-[11px] text-zinc-400 leading-snug">
                    {t('daw.alternativeDesc', 'Indie-rock drums with dynamic accents and a driving beat.')}
                  </span>
                </div>
              </div>

              {/* Arena */}
              <div
                onClick={() => setSelectedStyle('arena')}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                  selectedStyle === 'arena'
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-950/60 text-red-400 border border-red-800/40">
                  🥁
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {t('daw.arena', 'Arena')}
                  </span>
                  <span className="text-[11px] text-zinc-400 leading-snug">
                    {t('daw.arenaDesc', 'Stadium-sized drums with reverb and powerful, anthemic impact.')}
                  </span>
                </div>
              </div>

              {/* Ballad */}
              <div
                onClick={() => setSelectedStyle('ballad')}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                  selectedStyle === 'ballad'
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                  🎶
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">
                    {t('daw.ballad', 'Ballad')}
                  </span>
                  <span className="text-[11px] text-zinc-400 leading-snug">
                    {t('daw.balladDesc', 'Gentle, expressive drums with subtle cymbals for heartfelt songs.')}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning when no context tracks */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{t('daw.noTracksWarning', 'No tracks in your session to use as context. Add tracks to generate a stem.')}</span>
            </div>

            {/* Bottom Actions: HI-FI + Generate Stem */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1 font-semibold">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  {t('daw.hifi', 'HI-FI')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsHiFi(!isHiFi)}
                  className={`h-5 w-9 rounded-full transition-colors relative ${isHiFi ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                >
                  <span className={`block h-4 w-4 rounded-full bg-black transition-transform ${isHiFi ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all"
              >
                <span>{t('daw.generateStem', 'Generate Stem')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </aside>
        )}

        {/* 2. Voice Conversion Drawer (Screenshot 5) */}
        {activeDrawer === 'voices' && (
          <aside
            aria-label="Voice Conversion"
            className="flex w-72 sm:w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 p-4 overflow-y-auto no-scrollbar space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-200">
                  {t('daw.voiceConversion', 'Voice Conversion')}
                </span>
                <Info className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Voices vs My Voices */}
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVoiceTab('voices')}
                className={`flex-1 rounded-md py-1 transition-all ${
                  voiceTab === 'voices' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('daw.voices', 'Voices')}
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('my_voices')}
                className={`flex-1 rounded-md py-1 transition-all ${
                  voiceTab === 'my_voices' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('daw.myVoices', 'My Voices')}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder={t('daw.searchVoices', 'Search')}
                value={voiceQuery}
                onChange={(e) => setVoiceQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-8 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:outline-hidden"
              />
              <Filter className="absolute right-2.5 h-3.5 w-3.5 text-zinc-500 cursor-pointer" />
            </div>

            {/* 2x2 Voice Cards Grid (Zuri, Amy, Trent, Rosa) */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'zuri', name: 'Zuri', role: t('daw.mezzoSoprano', 'Mezzo-soprano'), bg: 'from-amber-600 to-amber-900', initial: 'Z' },
                { id: 'amy', name: 'Amy', role: t('daw.mezzoSoprano', 'Mezzo-soprano'), bg: 'from-emerald-600 to-teal-900', initial: 'A' },
                { id: 'trent', name: 'Trent', role: t('daw.baritone', 'Baritone'), bg: 'from-blue-600 to-indigo-900', initial: 'T' },
                { id: 'rosa', name: 'Rosa', role: t('daw.mezzoSoprano', 'Mezzo-soprano'), bg: 'from-purple-600 to-rose-900', initial: 'R' },
              ].map((v) => {
                const isSel = selectedVoice === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`relative flex flex-col rounded-xl border p-2 cursor-pointer overflow-hidden transition-all ${
                      isSel ? 'border-cyan-400 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    {/* Simulated Voice Photo Card */}
                    <div className={`h-24 w-full rounded-lg bg-linear-to-tr ${v.bg} flex items-center justify-center text-2xl font-black text-white/90 shadow-inner`}>
                      {v.initial}
                    </div>
                    <span className="text-xs font-bold text-zinc-200 mt-1.5 block">
                      {v.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {v.role}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Select Audio Prompt */}
            <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-xs">
              <span className="text-[11px] text-zinc-300">
                {t('daw.selectAudioNotice', 'Select audio to convert')}
              </span>
              <button
                type="button"
                className="rounded-md bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-black hover:bg-cyan-400"
              >
                {t('daw.selectBtn', 'Select')}
              </button>
            </div>

            {/* Bottom Actions: HI-FI + Convert Voice */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1 font-semibold">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  {t('daw.hifi', 'HI-FI')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsHiFi(!isHiFi)}
                  className={`h-5 w-9 rounded-full transition-colors relative ${isHiFi ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                >
                  <span className={`block h-4 w-4 rounded-full bg-black transition-transform ${isHiFi ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all"
              >
                <span>{t('daw.convertVoice', 'Convert Voice')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </aside>
        )}

        {/* 3. Mix & Master Drawer (Screenshots 1 & 2) */}
        {activeDrawer === 'mixmaster' && (
          <aside
            aria-label="Mix and Master"
            className="flex w-64 sm:w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 p-4 justify-between select-none"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  {t('daw.mixAndMasterTitle', 'MIX AND MASTER')}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDrawer('none')}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Center circular target/meter icon */}
              <div className="flex justify-center pt-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 text-cyan-400 shadow-inner">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-500/40">
                    <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  </div>
                </div>
              </div>

              {/* Cyan Pill Buttons: Mastering & Auto Mix */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 py-2 text-xs font-bold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/50 active:scale-98 transition-all shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{t('daw.mastering', 'Mastering')}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 py-2 text-xs font-bold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/50 active:scale-98 transition-all shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{t('daw.autoMix', 'Auto Mix')}</span>
                </button>
              </div>

              {/* Fx button */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsAudioEffectsOpen(true)}
                  className="flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all"
                >
                  Fx
                </button>
              </div>

              {/* Pan Indicator L | R */}
              <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-zinc-500">
                <span className="hover:text-zinc-300 cursor-pointer">L</span>
                <span className="h-2.5 w-0.5 bg-zinc-700" />
                <span className="hover:text-zinc-300 cursor-pointer">R</span>
              </div>

              {/* 0.00 Numeric Readout */}
              <div className="flex justify-center">
                <span className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-xs font-bold text-zinc-200">
                  {masterFaderDb.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Fader Track & VU Meter + dB Scale */}
            <div className="flex flex-col items-center py-4">
              <div className="flex items-stretch gap-3 h-44">
                {/* dB Markings */}
                <div className="flex flex-col justify-between text-[9px] font-mono font-semibold text-zinc-500 text-right select-none py-1">
                  <span>+6</span>
                  <span className="text-zinc-600">-</span>
                  <span>0</span>
                  <span>-6</span>
                  <span>-12</span>
                  <span>-24</span>
                  <span>-48</span>
                  <span>-∞</span>
                </div>

                {/* Vertical Fader Slider */}
                <div className="relative flex w-8 justify-center">
                  {/* Fader Track Groove */}
                  <div className="absolute inset-y-0 w-1.5 rounded-full bg-zinc-800 shadow-inner" />

                  {/* Level Meter Bar (Next to groove) */}
                  <div className="absolute right-0 inset-y-1 w-1 rounded bg-zinc-800 overflow-hidden flex flex-col justify-end">
                    <div
                      className="w-full bg-linear-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-100"
                      style={{ height: `${isPlaying ? Math.min(100, Math.max(15, (masterVolume * 0.9) + Math.random() * 10)) : 0}%` }}
                    />
                  </div>

                  {/* Fader Handle Input */}
                  <input
                    type="range"
                    min="-48"
                    max="6"
                    step="0.5"
                    value={masterFaderDb}
                    onChange={(e) => setMasterFaderDb(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  />

                  {/* Visual Fader Cap */}
                  <div
                    className="absolute w-7 h-4 rounded border border-zinc-400 bg-zinc-100 shadow-md pointer-events-none z-10 transition-transform flex items-center justify-center"
                    style={{
                      top: `${((6 - masterFaderDb) / 54) * 85 + 5}%`,
                    }}
                  >
                    <div className="h-0.5 w-3 bg-zinc-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* M (Mute) Button */}
              <button
                type="button"
                onClick={() => setIsMasterMuted(!isMasterMuted)}
                className={`mt-4 flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-all ${
                  isMasterMuted
                    ? 'border-red-500 bg-red-500 text-black shadow-lg shadow-red-500/30'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
                title={t('daw.muteMaster', 'Mute Master')}
              >
                M
              </button>
            </div>
          </aside>
        )}

        {/* ── Far Right Utility Icons Rail ───────────────────────────────── */}
        <div className="flex w-11 shrink-0 flex-col items-center border-l border-zinc-800 bg-zinc-950 py-3 space-y-4 text-zinc-400 text-xs">
          {/* Arranger toggle */}
          <button type="button" className="p-1 hover:text-zinc-200" title={t('daw.arranger', 'Arranger')}>
            <span>||\</span>
          </button>
          {/* Routing / Swap */}
          <button type="button" className="p-1 hover:text-zinc-200" title={t('daw.routing', 'Routing')}>
            <span>⇄</span>
          </button>
          {/* Virtual Instrument Keyboard toggle */}
          <button
            type="button"
            onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
            className={`p-1.5 rounded-lg transition-colors ${isKeyboardOpen ? 'bg-cyan-950 text-cyan-300' : 'hover:text-zinc-200'}`}
            title={t('daw.keyboard', 'Keyboard')}
          >
            <span>🎹</span>
          </button>
          {/* Mix & Master Meter toggle (•) */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'mixmaster' ? 'none' : 'mixmaster')}
            className={`p-1.5 rounded-lg transition-colors ${activeDrawer === 'mixmaster' ? 'bg-cyan-950 text-cyan-300' : 'hover:text-zinc-200'}`}
            title={t('daw.mixAndMaster', 'Mix & Master')}
          >
            <span className="text-sm font-bold tracking-tighter">(•)</span>
          </button>
          {/* Stems / Users toggle */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'stems' ? 'none' : 'stems')}
            className={`p-1.5 rounded-lg transition-colors ${activeDrawer === 'stems' ? 'bg-cyan-950 text-cyan-300' : 'hover:text-zinc-200'}`}
            title={t('daw.stemGeneration', 'Stem Generation')}
          >
            <Users className="h-4 w-4" />
          </button>
          {/* Voice Conversion toggle */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'voices' ? 'none' : 'voices')}
            className={`p-1.5 rounded-lg transition-colors ${activeDrawer === 'voices' ? 'bg-cyan-950 text-cyan-300' : 'hover:text-zinc-200'}`}
            title={t('daw.voiceConversion', 'Voice Conversion')}
          >
            <Radio className="h-4 w-4" />
          </button>
          {/* Audio Effects FX toggle */}
          <button
            type="button"
            onClick={() => setIsAudioEffectsOpen(true)}
            className={`p-1.5 rounded-lg transition-colors ${isAudioEffectsOpen ? 'bg-orange-950 text-orange-400' : 'hover:text-zinc-200'}`}
            title={t('daw.audioEffects', 'Audio Effects')}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {/* Cloud Export */}
          <button type="button" className="p-1 hover:text-zinc-200" title={t('daw.cloud', 'Cloud Export')}>
            <Cloud className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Audio Effects Dialog (Screenshots 1 & 2) ───────────────────────── */}
      {isAudioEffectsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-scrim/60 backdrop-blur-xs duration-150" style={{ paddingBottom: barClearance(12) }}>
          <div
            className="relative flex flex-col w-full max-w-2xl max-h-[88vh] rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-xl p-4 sm:p-5 overflow-hidden text-zinc-200"
            role="dialog"
            aria-label={t('daw.audioEffects', 'Audio Effects')}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                {t('daw.audioEffects', 'Audio Effects')}
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={effectsSearch}
                    onChange={(e) => setEffectsSearch(e.target.value)}
                    placeholder={t('daw.searchVoices', 'Search')}
                    className="h-7 w-28 sm:w-36 rounded-lg border border-zinc-700 bg-zinc-800/80 pl-7 pr-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAudioEffectsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Top 2 Cards: Generate Effect + VST Connected */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
              {/* Generate Effect */}
              <div
                onClick={() => setIsGeneratingEffect(!isGeneratingEffect)}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 hover:border-purple-500/50 hover:bg-purple-950/20 cursor-pointer transition-all group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 transition-colors">
                    {t('daw.generateEffect', 'Generate Effect')}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {t('daw.generateEffectDesc', 'Describe the sound and the knobs')}
                  </p>
                </div>
              </div>

              {/* VST Connected */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200">
                      {t('daw.vstConnected', 'VST Connected')}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {t('daw.vstPluginsCount', 'You have 0 plugins in total')}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400 shrink-0 ml-2" />
              </div>
            </div>

            {/* AI Generator Expansion */}
            {isGeneratingEffect && (
              <div className="mb-3 rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-2 duration-100">
                <p className="text-xs font-semibold text-purple-300">
                  {t('daw.generateEffectDesc', 'Describe the sound and the knobs')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder={t('daw.generatePromptPlaceholder', 'e.g. Dreamy shoegaze shimmer reverb with slow pitch wobble')}
                    className="flex-1 rounded-lg border border-purple-500/40 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (generatePrompt.trim()) {
                        setActiveEffectsList((prev) => [...prev, 'gen_' + Date.now()]);
                        setIsGeneratingEffect(false);
                        setGeneratePrompt('');
                      }
                    }}
                    className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-purple-400"
                  >
                    {t('daw.generateEffect', 'Generate Effect')}
                  </button>
                </div>
              </div>
            )}

            {/* 17 Effects Grid (Screenshot 1 & 2) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 overflow-y-auto pr-1 no-scrollbar flex-1 max-h-[52vh]">
              {[
                {
                  id: 'compressor',
                  name: t('daw.fx.compressor', 'Compressor'),
                  desc: t('daw.fx.compressorDesc', 'Evens out dynamics'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                      <path d="M4 12c3 0 4-3 8-3s5 3 8 3" />
                    </svg>
                  ),
                },
                {
                  id: 'gate',
                  name: t('daw.fx.gate', 'Gate'),
                  desc: t('daw.fx.gateDesc', 'Cuts noise and bleed'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <line x1="3" y1="18" x2="21" y2="18" />
                      <path d="M4 18l5-12h6l5 12" />
                    </svg>
                  ),
                },
                {
                  id: 'limiter',
                  name: t('daw.fx.limiter', 'Limiter'),
                  desc: t('daw.fx.limiterDesc', 'Stops peaks clipping'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <path d="M4 18c3 0 4-8 8-8s5 8 8 8" />
                    </svg>
                  ),
                },
                {
                  id: 'eq',
                  name: t('daw.fx.eq', 'EQ'),
                  desc: t('daw.fx.eqDesc', 'Shapes frequencies'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <line x1="6" y1="4" x2="6" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                      <line x1="18" y1="4" x2="18" y2="20" />
                      <circle cx="6" cy="14" r="2" fill="currentColor" />
                      <circle cx="12" cy="8" r="2" fill="currentColor" />
                      <circle cx="18" cy="16" r="2" fill="currentColor" />
                    </svg>
                  ),
                },
                {
                  id: 'guitarTuner',
                  name: t('daw.fx.guitarTuner', 'Guitar Tuner'),
                  desc: t('daw.fx.guitarTunerDesc', 'Chromatic tuner'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M12 2v20M8 6a4 4 0 0 0 8 0M6 10a6 6 0 0 0 12 0" />
                    </svg>
                  ),
                },
                {
                  id: 'utility',
                  name: t('daw.fx.utility', 'Utility'),
                  desc: t('daw.fx.utilityDesc', 'Stereo width and pan'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <circle cx="9" cy="12" r="5" />
                      <circle cx="15" cy="12" r="5" />
                    </svg>
                  ),
                },
                {
                  id: 'visualizer',
                  name: t('daw.fx.visualizer', 'Visualizer'),
                  desc: t('daw.fx.visualizerDesc', 'Audio analysis displays'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="4" y="10" width="2.5" height="10" rx="1" fill="currentColor" />
                      <rect x="8.5" y="6" width="2.5" height="14" rx="1" fill="currentColor" />
                      <rect x="13" y="13" width="2.5" height="7" rx="1" fill="currentColor" />
                      <rect x="17.5" y="8" width="2.5" height="12" rx="1" fill="currentColor" />
                    </svg>
                  ),
                },
                {
                  id: 'ampModeler',
                  name: t('daw.fx.ampModeler', 'Amp Modeler'),
                  desc: t('daw.fx.ampModelerDesc', 'Guitar amps and cabs'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="4" y="7" width="16" height="12" rx="2" />
                      <line x1="9" y1="4" x2="15" y2="4" />
                      <line x1="4" y1="11" x2="20" y2="11" />
                      <circle cx="7" cy="9" r="0.75" fill="currentColor" />
                      <circle cx="10" cy="9" r="0.75" fill="currentColor" />
                    </svg>
                  ),
                },
                {
                  id: 'bitCrusher',
                  name: t('daw.fx.bitCrusher', 'Bit Crusher'),
                  desc: t('daw.fx.bitCrusherDesc', 'Lo-fi digital crunch'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 17h4v-5h4v-5h4v5h3v5h3" />
                    </svg>
                  ),
                },
                {
                  id: 'saturator',
                  name: t('daw.fx.saturator', 'Saturator'),
                  desc: t('daw.fx.saturatorDesc', 'Warm drive and grit'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 18c0-7 8-7 8-14s8 7 8 14" />
                    </svg>
                  ),
                },
                {
                  id: 'waveFolder',
                  name: t('daw.fx.waveFolder', 'WaveFolder'),
                  desc: t('daw.fx.waveFolderDesc', 'Metallic harmonics'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 18l4-12 4 8 4-8 4 12" />
                    </svg>
                  ),
                },
                {
                  id: 'chorus',
                  name: t('daw.fx.chorus', 'Chorus'),
                  desc: t('daw.fx.chorusDesc', 'Thickens and widens'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 14c3-4 6-4 9 0s6 4 9 0" />
                      <path d="M4 10c3-4 6-4 9 0s6 4 9 0" />
                    </svg>
                  ),
                },
                {
                  id: 'tremolo',
                  name: t('daw.fx.tremolo', 'Tremolo'),
                  desc: t('daw.fx.tremoloDesc', 'Pulses volume and pan'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 14h3v-6h5v6h5v-6h5" />
                    </svg>
                  ),
                },
                {
                  id: 'delay',
                  name: t('daw.fx.delay', 'Delay'),
                  desc: t('daw.fx.delayDesc', 'Echoes and repeats'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 15c2-6 5-6 7 0s5 4 6 0 4 2 5 0" />
                    </svg>
                  ),
                },
                {
                  id: 'reverb',
                  name: t('daw.fx.reverb', 'Reverb'),
                  desc: t('daw.fx.reverbDesc', 'Hall space and depth'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M5 19l14-14" />
                      <path d="M9 19a10 10 0 0 0 10-10" />
                      <path d="M14 19a5 5 0 0 0 5-5" />
                    </svg>
                  ),
                },
                {
                  id: 'vocoder',
                  name: t('daw.fx.vocoder', 'Vocoder'),
                  desc: t('daw.fx.vocoderDesc', 'Robot and talkbox'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="5" y="7" width="14" height="12" rx="3" />
                      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                      <line x1="9" y1="16" x2="15" y2="16" />
                      <line x1="12" y1="4" x2="12" y2="7" />
                    </svg>
                  ),
                },
                {
                  id: 'voiceTuner',
                  name: t('daw.fx.voiceTuner', 'Voice Tuner'),
                  desc: t('daw.fx.voiceTunerDesc', 'Auto pitch correction'),
                  glyph: (
                    <svg className="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M6 18c0-3 3-5 6-5s6 2 6 5" />
                      <circle cx="12" cy="7" r="3" />
                      <line x1="12" y1="10" x2="12" y2="13" />
                    </svg>
                  ),
                },
              ]
                .filter((fx) =>
                  effectsSearch.trim()
                    ? fx.name.toLowerCase().includes(effectsSearch.toLowerCase()) ||
                      fx.desc.toLowerCase().includes(effectsSearch.toLowerCase())
                    : true
                )
                .map((fx) => {
                  const isSelected = selectedEffectId === fx.id || activeEffectsList.includes(fx.id);
                  return (
                    <div
                      key={fx.id}
                      onClick={() => {
                        setSelectedEffectId(fx.id);
                        setActiveEffectsList((prev) =>
                          prev.includes(fx.id) ? prev.filter((x) => x !== fx.id) : [...prev, fx.id]
                        );
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/30 text-zinc-100 shadow-xs shadow-cyan-500/20'
                          : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="h-8 w-8 flex items-center justify-center mb-1.5 text-zinc-300">
                        {fx.glyph}
                      </div>
                      <span className="text-xs font-bold text-zinc-200 block truncate w-full">
                        {fx.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight line-clamp-2">
                        {fx.desc}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Sparkle Button (Bottom Right) ────────────────────── */}
      <button
        type="button"
        onClick={() => setActiveDrawer('stems')}
        className="absolute bottom-4 right-14 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-black shadow-lg shadow-cyan-400/30 hover:bg-cyan-300 active:scale-95 transition-all"
        title={t('daw.aiAssistant', 'AI Assistant')}
      >
        <Sparkles className="h-5 w-5 fill-black" />
      </button>
    </div>
  );
}
