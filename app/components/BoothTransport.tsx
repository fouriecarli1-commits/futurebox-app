'use client';

/**
 * The booth's transport: the row of buttons every studio has above its lanes.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Die probooth moet dan ook fyn nagegaan word,
 * sodat dit presies werk soos 'n DAW studio werk en lyk … AL die funksies
 * moet daar wees."*
 *
 * Going through it as a musician would found the transport in four places:
 * play on the dock, record on the Audio effects desk, the loop on the strip
 * that appears only once a piece is marked, and the click on Track controls.
 * Each was real; none was where a hand reaches for it. A studio puts back to
 * the start, stop, record, loop and click in one row over the music, and the
 * tempo beside them — so that is what this is. Every button here calls the
 * room's own function; nothing is a second way of doing a thing.
 *
 * On a phone it wraps onto a second row rather than sliding sideways. The
 * owner, of an earlier row that slid: *"niemand gaan weet dit is daar nie"* —
 * a control past the edge of a row nothing says can be dragged is a control
 * that does not exist. The tempo is left to Track controls there, which the
 * dock opens in one press.
 *
 * ── Markers ──────────────────────────────────────────────────────────────
 *
 * One button sets a marker where the line is, or takes away the one it is
 * standing on, and the two beside it jump to the marker before and after.
 * The markers themselves are drawn on the ruler and jump there when pressed.
 *
 * ── The look ─────────────────────────────────────────────────────────────
 *
 * The booth's own literals, as `BoothTimeline` explains: the room is a piece
 * of equipment and does not follow the theme. One row; on a phone it slides
 * sideways inside itself rather than wrapping, so the timeline keeps its
 * height and the page never scrolls sideways.
 */

import React from 'react';
import { ClipboardPaste, Circle, Copy, CopyPlus, Flag, Repeat, SkipBack, SkipForward, Sliders, Square, StepBack, Timer } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { EDGE, INK, INK_DIM, LIT, PANEL } from '../lib/boothlook';

const RED = '#f87171';

function Key({
  label,
  on = false,
  hot = false,
  disabled = false,
  onPress,
  data,
  keys,
  children,
}: {
  readonly label: string;
  /** The key that does the same, shown on hover and told to a screen reader. */
  readonly keys?: string;
  readonly on?: boolean;
  readonly hot?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly data: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      title={keys ? `${label} (${keys})` : label}
      aria-keyshortcuts={keys}
      aria-pressed={on}
      disabled={disabled}
      onClick={onPress}
      data-transport-key={data}
      className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl border px-2.5 transition-colors disabled:opacity-40"
      style={hot
        ? { borderColor: RED, background: 'rgba(248,113,113,0.18)', color: RED }
        : on
          ? { borderColor: LIT, background: 'rgba(56,189,248,0.16)', color: LIT }
          : { borderColor: EDGE, background: 'rgba(255,255,255,0.03)', color: INK }}
    >
      {children}
    </button>
  );
}

export default function BoothTransport({
  recording,
  looping,
  clicking,
  countBars,
  bpm,
  signature,
  keyName,
  onMarker,
  markerHere,
  hasMarkers,
  onPrevMarker,
  onNextMarker,
  onStart,
  onStop,
  onRecord,
  onLoop,
  onClick,
  onTempo,
  onMixer,
  lanePicked,
  hasClip,
  onCopy,
  onPaste,
  onDuplicate,
  busy,
}: {
  readonly recording: boolean;
  readonly looping: boolean;
  readonly clicking: boolean;
  /** Bars counted in before a take, so the record button can say so. */
  readonly countBars: number;
  readonly bpm: number;
  readonly signature: string;
  readonly keyName: string;
  readonly onMarker: () => void;
  /** Whether the line is standing on a marker, so the button takes it away. */
  readonly markerHere: boolean;
  readonly hasMarkers: boolean;
  readonly onPrevMarker: () => void;
  readonly onNextMarker: () => void;
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly onRecord: () => void;
  readonly onLoop: () => void;
  readonly onClick: () => void;
  readonly onTempo: () => void;
  readonly onMixer: () => void;
  /** Whether a lane is open, which is what copy and duplicate act on. */
  readonly lanePicked: boolean;
  /** Whether something has been copied, so paste has something to put down. */
  readonly hasClip: boolean;
  readonly onCopy: () => void;
  readonly onPaste: () => void;
  readonly onDuplicate: () => void;
  readonly busy: boolean;
}): React.ReactElement {
  const { t } = useLang();
  return (
    /* Sideways on purpose, on a phone: one row of small keys that slides,
       not two rows that push the lanes (the song itself) off the screen.
       The owner, 27 October 2026, of this room: "Ek weet nie wat dit doen
       nie" — each key now says its name when pressed (`IconTips`). Wraps
       again from `sm` up, where there is width for all of it. */
    <div
      data-transport=""
      className="flex shrink-0 flex-nowrap items-center gap-1 px-2 py-1"
      style={{ background: PANEL, borderBottom: `1px solid ${EDGE}` }}
    >
      <Key data="start" keys="Home" label={t('daw.toStart', 'Back to the start')} onPress={onStart} disabled={recording}>
        <SkipBack className="h-4 w-4" />
      </Key>
      <Key data="stop" label={t('daw.stop', 'Stop')} onPress={onStop}>
        <Square className="h-4 w-4 fill-current" />
      </Key>
      <Key
        data="record"
        keys="R"
        hot={recording}
        disabled={busy && !recording}
        label={recording
          ? t('pro.stopRecording', 'Stop recording')
          : countBars > 0
            ? `${t('daw.recordLane', 'Record a new lane')} · ${countBars} ${countBars === 1 ? t('daw.barIn', 'bar counted in') : t('daw.barsIn', 'bars counted in')}`
            : t('daw.recordLane', 'Record a new lane')}
        onPress={onRecord}
      >
        <Circle className="h-4 w-4 fill-current" style={{ color: RED }} />
      </Key>
      <Key data="loop" keys="L" on={looping} disabled={recording} label={looping ? t('daw.loopOff', 'Stop looping') : t('daw.loopOn', 'Loop the marked piece, or four bars from here')} onPress={onLoop}>
        <Repeat className="h-4 w-4" />
      </Key>
      <Key data="click" keys="K" on={clicking} label={clicking ? t('daw.clickOff', 'Metronome on: a tick on every beat. Tap to turn it off') : t('daw.clickOn', 'Metronome: a tick on every beat, to play and sing in time')} onPress={onClick}>
        {/* A metronome, not a note: the owner, 28 October 2026, could not tell
            what the note did ("Sy description se net click on, click off"). */}
        <Timer className="h-4 w-4" />
      </Key>
      <span aria-hidden className="mx-0.5 hidden h-6 w-px shrink-0 sm:block" style={{ background: EDGE }} />
      <Key data="prevmarker" keys="," label={t('daw.prevMarker', 'To the marker before')} onPress={onPrevMarker} disabled={!hasMarkers || recording}>
        <StepBack className="h-4 w-4" />
      </Key>
      <Key data="marker" keys="M" on={markerHere} label={markerHere ? t('daw.markerOff', 'Take this marker away') : t('daw.markerOn', 'Set a marker here')} onPress={onMarker}>
        <Flag className="h-4 w-4" />
      </Key>
      <Key data="nextmarker" keys="." label={t('daw.nextMarker', 'To the marker after')} onPress={onNextMarker} disabled={!hasMarkers || recording}>
        <SkipForward className="h-4 w-4" />
      </Key>
      <span aria-hidden className="mx-0.5 hidden h-6 w-px shrink-0 sm:block" style={{ background: EDGE }} />
      <Key data="copy" keys="Control+C" label={t('daw.copy', 'Copy the open lane')} onPress={onCopy} disabled={!lanePicked}>
        <Copy className="h-4 w-4" />
      </Key>
      <Key data="paste" keys="Control+V" label={t('daw.paste', 'Paste it where the line is, as a lane of its own')} onPress={onPaste} disabled={!hasClip || recording}>
        <ClipboardPaste className="h-4 w-4" />
      </Key>
      <Key data="duplicate" keys="Control+D" label={t('daw.duplicate', 'Play the open lane again straight after itself')} onPress={onDuplicate} disabled={!lanePicked || recording}>
        <CopyPlus className="h-4 w-4" />
      </Key>
      <span aria-hidden className="mx-0.5 hidden h-6 w-px shrink-0 sm:block" style={{ background: EDGE }} />
      <button
        type="button"
        data-transport-key="tempo"
        onClick={onTempo}
        aria-label={`${t('pro.tempo', 'Tempo')} ${bpm} · ${signature} · ${t('pro.key', 'Key')} ${keyName}`}
        className="hidden h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-bold tabular-nums sm:flex"
        style={{ borderColor: EDGE, color: INK }}
      >
        <span>{Math.round(bpm)}</span>
        <span style={{ color: INK_DIM }}>bpm</span>
        <span style={{ color: INK_DIM }}>·</span>
        <span>{signature}</span>
        <span style={{ color: INK_DIM }}>·</span>
        <span style={{ color: LIT }}>{keyName}</span>
      </button>
      <Key data="mixer" label={t('daw.mixer', 'Mixer: every lane side by side')} onPress={onMixer}>
        <Sliders className="h-4 w-4" />
      </Key>
    </div>
  );
}
