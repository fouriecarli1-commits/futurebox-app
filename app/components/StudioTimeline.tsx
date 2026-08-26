'use client';

/**
 * Studio — the timeline view.
 *
 * You get the arrangement laid out in bars, you point at a spot, and you say
 * what should be different there. FutureBox cannot render the audio itself, so
 * the output of this screen is a precise edit request rather than a new mix:
 * bars, timecodes, section names, key and tempo, written the way the tool that
 * *does* render it needs to hear it. The panel says so plainly rather than
 * miming a render and leaving you to work out why nothing changed.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, Repeat, Plus, Copy, Check, Volume2, VolumeX,
  Trash2, ArrowUp, Music4, Info,
} from 'lucide-react';
import { TRACK_FLAVOURS, type TrackFlavour } from '../data/studio';
import {
  arrangementFor, lanesFor, totalBars, barToSeconds, secondsToBar, formatTimecode,
  formatBarPosition, sectionAtBar, secondsPerBar, buildEditPrompt, SECTION_COLOURS,
  EDIT_SUGGESTIONS, BEATS_PER_BAR, type EditRequest,
} from '../lib/arrangement';

const PX_PER_BAR = 56;
const SELECTION_BARS = 4;

export default function StudioTimeline() {
  const [trackId, setTrackId] = useState(TRACK_FLAVOURS[0].id);
  const track = TRACK_FLAVOURS.find((t) => t.id === trackId) as TrackFlavour;

  const sections = arrangementFor(track);
  const lanes = lanesFor(track);
  const bars = totalBars(sections);
  const duration = barToSeconds(bars + 1, track.bpm);

  const [playhead, setPlayhead] = useState(0); // seconds
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [muted, setMuted] = useState<string[]>([]);
  const [selection, setSelection] = useState<{ laneId: string; startBar: number } | null>(null);
  const [note, setNote] = useState('');
  const [edits, setEdits] = useState<EditRequest[]>([]);
  const [copied, setCopied] = useState(false);

  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  // The transport is a clock, not an audio engine: it moves the playhead so you
  // can read a position off the ruler while you decide what to change.
  useEffect(() => {
    if (!playing) {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      return;
    }
    last.current = performance.now();
    const step = (now: number) => {
      const delta = (now - last.current) / 1000;
      last.current = now;
      setPlayhead((prev) => {
        const next = prev + delta;
        if (next >= duration) {
          if (looping) return 0;
          setPlaying(false);
          return duration;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [playing, looping, duration]);

  // Changing track resets the transport — a playhead at bar 40 of a different
  // arrangement is meaningless.
  useEffect(() => {
    setPlaying(false);
    setPlayhead(0);
    setSelection(null);
    setEdits([]);
  }, [trackId]);

  const currentBar = secondsToBar(playhead, track.bpm);
  const currentSection = sectionAtBar(sections, currentBar);

  const placeSelection = useCallback(
    (laneId: string, event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const bar = Math.max(1, Math.floor((event.clientX - rect.left) / PX_PER_BAR) + 1);
      setSelection({ laneId, startBar: Math.min(bar, bars) });
      setPlayhead(barToSeconds(bar, track.bpm));
    },
    [bars, track.bpm],
  );

  const queueEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selection || !note.trim()) return;
    setEdits((prev) => [
      ...prev,
      {
        id: `${selection.laneId}-${selection.startBar}-${prev.length}`,
        laneId: selection.laneId,
        startBar: selection.startBar,
        lengthBars: SELECTION_BARS,
        note: note.trim(),
        status: 'queued',
      },
    ]);
    setNote('');
  };

  const prompt = buildEditPrompt(track, sections, edits, lanes);
  const suggestions = selection ? (EDIT_SUGGESTIONS[selection.laneId] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Transport */}
      <div className="flex flex-wrap items-center gap-3 bg-black/60 border border-zinc-800 rounded-2xl px-4 py-3">
        <select
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
        >
          {TRACK_FLAVOURS.filter((t) => t.onChannel).map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setPlayhead(0);
              setPlaying(false);
            }}
            title="Back to start"
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-300"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            title={playing ? 'Pause' : 'Play'}
            className="w-11 h-11 rounded-xl bg-white text-onAccent hover:bg-zinc-200 flex items-center justify-center"
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => setLooping((l) => !l)}
            title="Loop"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              looping ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-4 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="font-mono text-sm text-white tabular-nums">{formatTimecode(playhead)}</span>
          <span className="font-mono text-sm text-zinc-500 tabular-nums">{formatBarPosition(currentBar)}</span>
        </div>

        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="font-mono text-white">{track.bpm} BPM</span>
          <span className="font-mono">{BEATS_PER_BAR}/4</span>
          <span className="font-mono">{track.key}</span>
        </div>

        {currentSection && (
          <span className="ml-auto text-sm text-zinc-300">
            Playhead is in <strong className="text-white">{currentSection.label}</strong>
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="flex">
          {/* Lane headers */}
          <div className="w-44 flex-shrink-0 border-r border-zinc-800 bg-black/40">
            <div className="h-8 border-b border-zinc-800 flex items-center px-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tracks</span>
            </div>
            {lanes.map((lane) => {
              const isMuted = muted.includes(lane.id);
              return (
                <div key={lane.id} className="h-16 border-b border-zinc-800/70 px-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{lane.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{lane.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => (isMuted ? m.filter((x) => x !== lane.id) : [...m, lane.id]))}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isMuted ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
            <div className="h-12 flex items-center px-3">
              <span className="text-sm text-zinc-600 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add new track
              </span>
            </div>
          </div>

          {/* Scrolling grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="relative" style={{ width: bars * PX_PER_BAR }}>
              {/* Bar ruler */}
              <div className="h-8 border-b border-zinc-800 relative">
                {Array.from({ length: bars }, (_, i) => i + 1)
                  .filter((bar) => (bar - 1) % 4 === 0)
                  .map((bar) => (
                    <div
                      key={bar}
                      className="absolute top-0 h-full flex items-center pl-1.5 border-l border-zinc-800"
                      style={{ left: (bar - 1) * PX_PER_BAR }}
                    >
                      <span className="font-mono text-xs text-zinc-500">{bar}</span>
                    </div>
                  ))}
              </div>

              {/* Lanes */}
              {lanes.map((lane) => {
                const isMuted = muted.includes(lane.id);
                return (
                  <div
                    key={lane.id}
                    onClick={(e) => placeSelection(lane.id, e)}
                    className={`h-16 border-b border-zinc-800/70 relative cursor-crosshair ${isMuted ? 'opacity-35' : ''}`}
                  >
                    {sections.map((section) => (
                      <div
                        key={section.id}
                        className={`absolute top-2 bottom-2 rounded-lg border ${SECTION_COLOURS[section.kind]} flex items-center px-2 overflow-hidden`}
                        style={{
                          left: (section.startBar - 1) * PX_PER_BAR + 2,
                          width: section.lengthBars * PX_PER_BAR - 4,
                        }}
                      >
                        <span className="text-xs font-semibold truncate">{section.label}</span>
                      </div>
                    ))}

                    {/* Queued edits sit on top of the arrangement they change */}
                    {edits
                      .filter((edit) => edit.laneId === lane.id)
                      .map((edit) => (
                        <div
                          key={edit.id}
                          title={edit.note}
                          className="absolute top-1 bottom-1 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-400/15 flex items-center px-2 overflow-hidden"
                          style={{
                            left: (edit.startBar - 1) * PX_PER_BAR + 2,
                            width: edit.lengthBars * PX_PER_BAR - 4,
                          }}
                        >
                          <span className="text-xs font-semibold text-cyan-100 truncate">{edit.note}</span>
                        </div>
                      ))}

                    {/* Selection */}
                    {selection?.laneId === lane.id && (
                      <div
                        className="absolute top-0 bottom-0 border-2 border-white/70 bg-white/10 rounded-lg pointer-events-none"
                        style={{
                          left: (selection.startBar - 1) * PX_PER_BAR,
                          width: SELECTION_BARS * PX_PER_BAR,
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-px bg-emerald-400 pointer-events-none"
                style={{ left: (currentBar - 1) * PX_PER_BAR }}
              >
                <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Prompt bar */}
        <form onSubmit={queueEdit} className="border-t border-zinc-800 bg-black/60 p-3 space-y-2.5">
          {selection ? (
            <p className="text-sm text-zinc-300">
              Selected: <strong className="text-white">{lanes.find((l) => l.id === selection.laneId)?.name}</strong>,
              bars {selection.startBar}–{selection.startBar + SELECTION_BARS - 1}
              {sectionAtBar(sections, selection.startBar) && (
                <> in <strong className="text-white">{sectionAtBar(sections, selection.startBar)!.label}</strong></>
              )}{' '}
              <span className="font-mono text-zinc-500">
                ({formatTimecode(barToSeconds(selection.startBar, track.bpm))} –{' '}
                {formatTimecode(barToSeconds(selection.startBar + SELECTION_BARS, track.bpm))})
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Click anywhere on a track to choose the spot you want to change.</p>
          )}

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNote(s)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-2.5 focus-within:border-emerald-500 transition-all">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!selection}
              placeholder={selection ? 'Say what should be different here' : 'Select a spot on the timeline first'}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed"
            />
            <span className="font-mono text-xs text-zinc-500">{track.models[0] ?? 'stack'}</span>
            <button
              type="submit"
              disabled={!selection || !note.trim()}
              className="w-8 h-8 rounded-full bg-white text-onAccent flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Queued edits and the export */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold text-white flex items-center gap-2">
              <Music4 className="w-4 h-4 text-cyan-400" />
              Queued changes
            </h5>
            <span className="text-sm text-zinc-500">{edits.length}</span>
          </div>

          {edits.length === 0 ? (
            <p className="text-sm text-zinc-500 leading-relaxed">
              Nothing queued. Pick a spot, describe the change, and it lands here and on the timeline.
            </p>
          ) : (
            <ul className="space-y-2">
              {edits.map((edit) => (
                <li key={edit.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-black/40 border border-zinc-800">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-100 leading-snug">{edit.note}</p>
                    <p className="text-xs text-zinc-500 pt-0.5">
                      {lanes.find((l) => l.id === edit.laneId)?.name} · bars {edit.startBar}–
                      {edit.startBar + edit.lengthBars - 1}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEdits((prev) => prev.filter((x) => x.id !== edit.id))}
                    className="text-zinc-600 hover:text-rose-400 flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-sm font-bold text-white">Edit request</h5>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(prompt).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  },
                  () => setCopied(false),
                );
              }}
              className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {prompt}
          </pre>

          <p className="text-sm text-zinc-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
            <span>
              Copy this into the tool that made the track. The bars and timecodes are the point — a generation spent
              on &ldquo;make the chorus bigger&rdquo; is a generation wasted.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
