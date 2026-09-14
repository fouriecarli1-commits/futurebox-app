'use client';

/**
 * The booth's timeline: one clock, every lane against it, dragged with a thumb.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 14 September 2026, with four pictures of what she wants: *"Die booth
 * moet heeltemal verander. Die timeline van die verskillende layers moet reg
 * by en teen mekaar wees. Die lyn wat deur die timeline beweeg moet langer
 * wees sodat 'n vinger hom kan vang en die klank plek kan drag. Reg bo die
 * timeline moet die tyd in die liedjie gemeet word, en dan sommer ook wys
 * watter seksie van die liedjie dit in is. Die added instrument sound moet ook
 * oor die hele liedjie gedrag kan word, of gecut word en die gedeelte gedrag
 * word na waar die klank in die liedjie moet wees."*
 *
 * ── Why the alignment had to be rebuilt rather than nudged ───────────────
 *
 * The old room drew each lane's waveform inside its own row, between that
 * row's name column and that row's buttons. Every row's pixels-per-second was
 * therefore its own, and the room knew it: the bar lines were drawn *inside*
 * each waveform, with a note explaining that a ruler across the top could not
 * be trusted because "bar 2 on the ruler sat nowhere near bar 2 in the audio".
 *
 * That note was right about the old layout and is the reason for this one. A
 * single CSS grid with two columns — a fixed gutter and one `1fr` track —
 * puts the ruler and every lane in the *same* column, so they cannot disagree
 * about where a second is. Alignment is then a property of the layout instead
 * of something each row has to get right, and a ruler above the lanes becomes
 * honest for the first time.
 *
 * ── The look, which is deliberate and not the app's ──────────────────────
 *
 * Carli: *"die booth se swart met die blou musieklyn sal 'n unieke take wees
 * vir die booth, dat dit heeltemal anders lyk as die res van die app."*
 *
 * So every colour in here is a literal, and none of them is a palette token.
 * That is not a shortcut around the theme — it is the requirement: the booth
 * is meant to look like a piece of studio equipment sitting inside the app
 * rather than another one of its rooms, and it has to look the same on every
 * theme somebody picks. The one place literal colour is usually a bug is a
 * screen that should have followed the theme and did not; this is the other
 * case, written down so the next reader does not "fix" it.
 *
 * ── What a thumb can do here ─────────────────────────────────────────────
 *
 *   · drag the playhead — by its head, which is deliberately big, or by
 *     anywhere on the ruler;
 *   · drag a clip along the whole song, which moves where that sound sits;
 *   · drag either end of a clip, which cuts it without destroying anything.
 *
 * All three are pointer events with the pointer captured and `touch-none` on
 * the surface, so a thumb that slides off the strip keeps dragging instead of
 * dropping the clip and scrolling the room.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { windowOf, type Lane } from '../lib/session';
import { shapeOf } from '../lib/takes';
import { barSeconds, sayPlace, placeAt, snapped, type Meter, type Snap } from '../lib/tempo';
import type { Span } from '../lib/analyse';
import { useLang } from '../lib/i18n';

/* ── The booth's own palette ──────────────────────────────────────────── */
const VOID = '#05060a';
const PANEL = '#0b0d14';
const EDGE = 'rgba(255,255,255,0.07)';
const INK = '#eef2ff';
const INK_DIM = 'rgba(238,242,255,0.45)';
/** The head of the playhead, and the line itself. */
const HEAD = '#ffffff';

/**
 * A lane's colour, by how far down the stack it is.
 *
 * Her picture runs blue at the top to cyan at the bottom, which is doing real
 * work rather than decoration: on a phone the rows are close together, and a
 * clip you have dragged three rows down is recognisably the same clip because
 * its colour came with it.
 */
function hueFor(index: number, count: number): number {
  return 218 - (Math.min(index, count - 1) / Math.max(1, count - 1)) * 40;
}

/** The gutter, in pixels. Wide enough for a name, narrow enough on a phone. */
/**
 * The gutter, and how tall a lane is.
 *
 * Both grew when M and S became buttons instead of lights. They were 28 by
 * 18, which this app's own rule — 44 pixels under a coarse pointer — forbids
 * and which no thumb can hit: Carli found it by trying. Two 44-wide buttons
 * and a gap need 92 of the gutter, and a 44-tall button under a name needs
 * 88 of the row.
 *
 * The cost is real and worth naming: a lane is 26 pixels taller, so a session
 * of eight stems is 208 pixels longer to scroll. The list scrolls either way;
 * a control nobody can press does not become pressable by being closer to
 * the next one.
 */
const GUTTER = 100;
/** A lane is drawn this tall. */
const ROW = 88;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface TimelineLane {
  readonly lane: Lane;
  /** Its sections, where the song has been read. Drawn on the ruler. */
  readonly spans?: readonly Span[];
}

export default function BoothTimeline({
  lanes,
  total,
  at,
  meter,
  snap,
  spans,
  onSeek,
  onChange,
  onPick,
  picked,
}: {
  readonly lanes: readonly Lane[];
  /** The length of the whole session, in seconds. The axis is this wide. */
  readonly total: number;
  /** Where the playhead is. */
  readonly at: number;
  readonly meter: Meter;
  readonly snap: Snap;
  /** The song's sections, where it has been read. Empty is fine. */
  readonly spans?: readonly Span[];
  readonly onSeek: (seconds: number) => void;
  readonly onChange: (id: string, how: Partial<Lane>) => void;
  /** Tapping a lane's name opens its controls. */
  readonly onPick: (id: string) => void;
  readonly picked?: string | null;
}): React.ReactElement {
  const { t } = useLang();
  /* The one element every position in here is measured against. Held rather
     than measured per event: a `getBoundingClientRect` inside a pointermove
     is a layout read on every frame of a drag. */
  const axis = useRef<HTMLDivElement | null>(null);
  const [wide, setWide] = useState(0);
  useEffect(() => {
    const box = axis.current;
    if (!box) return;
    const measure = (): void => setWide(box.clientWidth);
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(box);
    return () => watcher.disconnect();
  }, [lanes.length]);

  const secondsAt = useCallback(
    (clientX: number): number => {
      const box = axis.current;
      if (!box || total <= 0) return 0;
      const rect = box.getBoundingClientRect();
      const part = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      return part * total;
    },
    [total],
  );

  const percent = (seconds: number): number =>
    total > 0 ? Math.max(0, Math.min(100, (seconds / total) * 100)) : 0;

  /* ── Dragging ─────────────────────────────────────────────────────────

     One handler set for three different things, because they are the same
     gesture with a different answer at the end: what is being held is kept on
     a ref so a move between renders reads it without a frame of lag. */
  const held = useRef<
    | { what: 'head' }
    | { what: 'move'; id: string; grabbedAt: number; wasAt: number }
    | { what: 'cut'; id: string; edge: 'from' | 'to' }
    | null
  >(null);
  const [showing, setShowing] = useState<string | null>(null);

  const onMove = (event: React.PointerEvent): void => {
    const now = held.current;
    if (!now) return;
    event.preventDefault();
    if (now.what === 'head') {
      onSeek(Math.max(0, Math.min(total, secondsAt(event.clientX))));
      return;
    }
    const lane = lanes.find((one) => one.id === now.id);
    if (!lane) return;

    if (now.what === 'move') {
      /* Where the clip would land if it kept the grip it was picked up by —
         so a clip does not jump its own left edge under the thumb, which is
         what dragging by position rather than by grip feels like. */
      const moved = now.wasAt + (secondsAt(event.clientX) - now.grabbedAt);
      const window = windowOf(lane);
      const plays = window.to - window.from;
      /* Clamped so a clip cannot be dragged entirely out of the song, and
         snapped to the grid the room is set to — the same `snapped` the
         recording uses, so a clip dragged to the bar line and a take
         recorded at it land on the same number. */
      const where = snapped(Math.max(-plays + 0.5, Math.min(total - 0.5, moved)), meter, snap);
      onChange(lane.id, { at: where });
      return;
    }

    /* Cutting. The numbers are on the lane's own clock, and trimming the
       front keeps the audio where it is on the session's clock — the lane's
       start moves by the same amount, so a note on beat three stays on beat
       three. */
    const whole = (lane.amped?.audio ?? lane.audio).duration;
    const window = windowOf(lane);
    const wanted = secondsAt(event.clientX);
    if (now.edge === 'from') {
      const into = Math.max(0, Math.min(window.to - 0.1, window.from + (wanted - lane.at)));
      onChange(lane.id, { from: into, to: window.to, at: lane.at + (into - window.from) });
    } else {
      const played = window.to - window.from;
      const into = Math.max(window.from + 0.1, Math.min(whole, window.from + (wanted - lane.at)));
      onChange(lane.id, { from: window.from, to: into });
      void played;
    }
  };
  const endDrag = (): void => {
    held.current = null;
    setShowing(null);
  };

  const grab = (event: React.PointerEvent): void => {
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  };

  /* ── The ruler's marks ────────────────────────────────────────────────

     Every fifteen seconds on a short session, every thirty on a long one.
     Chosen from the length rather than fixed, because a four-minute song at
     a mark every five seconds is forty-eight labels in the width of a phone. */
  const step = total > 240 ? 30 : total > 90 ? 15 : 5;
  const marks: number[] = [];
  for (let second = 0; second <= total; second += step) marks.push(second);

  /* The bar lines, behind everything, on the shared axis rather than inside
     each waveform — which is the whole point of this layout. Thinned out
     where a bar would be less than eight pixels wide, because a grid you
     cannot see through is not a grid. */
  const bar = barSeconds(meter);
  const barsEvery = wide > 0 && bar > 0 && (bar / Math.max(0.001, total)) * wide < 8
    ? Math.ceil(8 / ((bar / Math.max(0.001, total)) * wide))
    : 1;
  const bars: number[] = [];
  if (bar > 0) for (let second = 0, n = 0; second <= total; second += bar, n += 1) {
    if (n % barsEvery === 0) bars.push(second);
  }

  const here = spans && spans.length
    ? [...spans].filter((one) => one.at <= at + 0.01).sort((a, b) => b.at - a.at)[0]
    : undefined;

  return (
    <div
      /* The room is a column that fills the screen and does not scroll, so
         this takes everything the header and the two bars do not — which is
         the point of the rebuild: the timeline is the room.

         `min-h-[40vh]` is a floor rather than a layout. It was 58vh and
         load-bearing for a while, because the room below `sm` was itself a
         scrolling column and a `flex-1` child of a content-sized column has
         no height to take a fraction of; on a phone the timeline measured 0
         of 900 pixels. The room does not scroll any more, so `flex-1` works
         on every width — the floor stays as a guard against the same shape
         of mistake coming back somewhere above it. */
      /* A handle for the probe, and only for the probe. `audit/probooth.mjs`
         has to measure how much of the screen the work gets, and it was
         finding the grid inside the scroller — which is content-sized, so it
         read the same 98 pixels on a phone and on a tablet and would have
         gone on reading it however much room the timeline was actually
         given. Named rather than climbed to by shape, so restyling the
         column does not quietly move the measurement. */
      data-timeline=""
      className="flex min-h-[40vh] flex-1 flex-col"
      style={{ background: VOID }}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* ── The readout, right above the timeline ──────────────────────

          "Reg bo die timeline moet die tyd in die liedjie gemeet word, en dan
          sommer ook wys watter seksie van die liedjie dit in is."

          Three things, because a musician is asking three different
          questions: where am I on the clock, where am I in the music (the
          bar and beat), and what part of the song is this. The section is
          only there once the song has been read — a made-up name would be
          worse than none. */}
      <div
        className="flex flex-shrink-0 items-baseline gap-3 px-4 py-2"
        style={{ borderBottom: `1px solid ${EDGE}`, background: PANEL }}
      >
        <span className="text-2xl font-black tabular-nums tracking-tight" style={{ color: INK }}>
          {clock(at)}
        </span>
        <span className="text-xs tabular-nums" style={{ color: INK_DIM }}>
          / {clock(total)}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: 'rgba(56,189,248,0.9)' }}>
          {sayPlace(placeAt(at, meter))}
        </span>
        {here && (
          <span
            className="ml-auto rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: 'rgba(56,189,248,0.14)', color: '#7dd3fc' }}
          >
            {here.label}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `${GUTTER}px 1fr` }}
        >
          {/* ── The ruler ──────────────────────────────────────────────

              Every cell in here names its own row and column, and that is
              load-bearing rather than tidy.

              The playhead below is placed explicitly — column 2, spanning
              every row — and CSS grid resolves definite placement first and
              then auto-places what is left *around* it. So with the ruler and
              the lane rows left to auto-flow, the cursor found column 2 of
              every row already taken and pushed all of them into an implicit
              THIRD column, sized by its content. The ruler came out 96 pixels
              wide on a 390-pixel screen, the lanes with it, and the whole
              alignment this component exists for was quietly undone by the
              one element drawn on top of it.

              Naming every cell removes the auto-placement pass entirely. */}
          <div style={{ gridColumn: 1, gridRow: 1, background: PANEL, borderBottom: `1px solid ${EDGE}` }} />
          <div
            ref={axis}
            data-axis
            /* `overflow-hidden`: the last mark sits at 100% and its label
               runs past the end, which widened the room sideways on a phone
               — measured at 96 wide holding 131. Clipped rather than moved:
               a label half off the right edge still reads, and nudging the
               last one in would put it on top of the one before it. */
            className="relative h-9 touch-none select-none overflow-hidden"
            style={{ gridColumn: 2, gridRow: 1, background: PANEL, borderBottom: `1px solid ${EDGE}` }}
            /* The whole ruler scrubs, not only the head. A thumb aiming at a
               2-pixel line on a phone misses; a thumb aiming at a strip the
               width of the room does not. */
            onPointerDown={(event) => {
              grab(event);
              held.current = { what: 'head' };
              onSeek(Math.max(0, Math.min(total, secondsAt(event.clientX))));
            }}
            role="slider"
            tabIndex={0}
            aria-label={t('pro.scrub', 'Where you are in the song')}
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(at)}
            aria-valuetext={clock(at)}
            onKeyDown={(event) => {
              const jump = event.shiftKey ? 5 : 1;
              if (event.key === 'ArrowLeft') { event.preventDefault(); onSeek(Math.max(0, at - jump)); }
              if (event.key === 'ArrowRight') { event.preventDefault(); onSeek(Math.min(total, at + jump)); }
            }}
          >
            {/* A label is only drawn where it fits.

                `overflow-hidden` clips the paint and does nothing about the
                measurement: a label at `left: 100%` still counts as content,
                so the ruler reported 294 wide holding 329 and the room read
                as having something hidden off to the side. Dropped rather
                than nudged in — the last label pulled back inside would sit
                on top of the one before it, and a tick with no number is
                still a tick. Measured against the axis's real width, so the
                rule is the same on a phone and on a desk. */}
            {marks
              .filter((second) => wide <= 0 || (percent(second) / 100) * wide <= wide - 42)
              .map((second) => (
              <span
                key={second}
                className="pointer-events-none absolute top-1 text-[10px] tabular-nums"
                style={{ left: `${percent(second)}%`, color: INK_DIM, transform: 'translateX(2px)' }}
              >
                {clock(second)}
              </span>
            ))}
            {/* The sections, on the ruler, where a name can be read once
                rather than repeated on every lane. */}
            {(spans ?? [])
              .filter((one) => wide <= 0 || (percent(one.at) / 100) * wide <= wide - 42)
              .map((one) => (
              <span
                key={`${one.label}-${one.at}`}
                className="pointer-events-none absolute bottom-0.5 truncate text-[10px] font-bold"
                style={{ left: `${percent(one.at)}%`, color: '#7dd3fc', transform: 'translateX(2px)', maxWidth: 90 }}
              >
                {one.label}
              </span>
            ))}
          </div>

          {/* ── A row per lane ───────────────────────────────────────── */}
          {lanes.map((lane, index) => {
            const window = windowOf(lane);
            const plays = window.to - window.from;
            const hue = hueFor(index, lanes.length);
            const on = picked === lane.id;
            return (
              <React.Fragment key={lane.id}>
                {/* ── The gutter: the lane's name, and its M and S ───────

                    Carli, 15 September 2026: *"Die m en s langs klankbaan
                    kan ook nie gedruk word nie."*

                    They could not. They were two `<span>`s inside the
                    button that picks the lane — lights that showed mute and
                    solo and did nothing when pressed, which is the fault of
                    "every button must look like a button" running the other
                    way: a thing that looks like a button and is not. And a
                    button cannot be nested inside a button, so the fix is
                    the cell rather than the spans: the name is one button,
                    and M and S are two of their own.

                    Solo is not exclusive, and that is `audible()`'s rule
                    rather than a shortcut here: any lane soloed silences
                    everything that is not, so two soloed lanes are a submix
                    of those two. That is what a desk does. */}
                <div
                  className="relative"
                  style={{
                    gridColumn: 1,
                    gridRow: index + 2,
                    height: ROW,
                    background: on ? 'rgba(56,189,248,0.10)' : PANEL,
                    borderBottom: `1px solid ${EDGE}`,
                    borderRight: `1px solid ${EDGE}`,
                  }}
                >
                  <button
                    type="button"
                    /* Named, because the probe reaches for "a lane in the
                       gutter" and used to find it as the grid's own direct
                       child. The gutter is a cell with three buttons in it
                       now — the name, M and S — so a selector that means
                       "the lane" has to say so rather than describe where
                       it happened to sit. */
                    data-lanename=""
                    onClick={() => onPick(lane.id)}
                    aria-pressed={on}
                    title={t('pro.openLane', 'Open this lane\u2019s controls')}
                    /* The whole cell, with the name drawn at the top of
                       it and M and S sitting on top at the foot. A lane
                       header in any desk works this way, and it is what
                       lets all three be 44 pixels without the gutter
                       swallowing the timeline: the name gets the space
                       between and behind them rather than a strip of its
                       own. */
                    className="absolute inset-0 px-1.5 pt-1.5 text-left"
                  >
                    <span className="block w-full truncate text-xs font-bold" style={{ color: INK }}>
                      {lane.name}
                    </span>
                  </button>

                  {/* Side by side at the foot, 44 by 44 each, which is what
                      the gutter and the row were widened for. */}
                  {/* The strip itself lets presses through; only the two
                      buttons in it take them. Without that, a full-width
                      box at the foot of the cell swallows every press aimed
                      at the middle of the name behind it — which is where
                      a finger aiming at the lane lands. */}
                  <span className="pointer-events-none absolute inset-x-1 bottom-0.5 flex items-center justify-between [&>button]:pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => onChange(lane.id, { muted: !lane.muted })}
                      aria-pressed={lane.muted}
                      aria-label={t('pro.mute', 'Mute')}
                      title={t('pro.muteWhat', 'Silence this lane. It stays in the session and comes back when you press it again.')}
                      className="h-11 w-11 rounded-lg text-[11px] font-black leading-none"
                      style={{
                        background: lane.muted ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.06)',
                        color: lane.muted ? '#fca5a5' : INK_DIM,
                      }}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(lane.id, { soloed: !lane.soloed })}
                      aria-pressed={lane.soloed}
                      aria-label={t('pro.solo', 'Solo')}
                      title={t('pro.soloWhat', 'Hear only this lane. Solo another one as well and you hear those two; press it again to get everything back.')}
                      className="h-11 w-11 rounded-lg text-[11px] font-black leading-none"
                      style={{
                        background: lane.soloed ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.06)',
                        color: lane.soloed ? '#fde047' : INK_DIM,
                      }}
                    >
                      S
                    </button>
                  </span>
                </div>

                <div
                  className="relative touch-none"
                  style={{
                    gridColumn: 2,
                    gridRow: index + 2,
                    height: ROW,
                    borderBottom: `1px solid ${EDGE}`,
                  }}
                >
                  {/* The grid, on the shared axis. */}
                  {bars.map((second) => (
                    <span
                      key={second}
                      className="pointer-events-none absolute inset-y-0 w-px"
                      style={{ left: `${percent(second)}%`, background: EDGE }}
                    />
                  ))}

                  {/* ── The clip ─────────────────────────────────────

                      A block you can pick up, rather than a waveform painted
                      across the row. "Die added instrument sound moet ook oor
                      die hele liedjie gedrag kan word" — so the block is the
                      handle, and the two ends of it are the cut. */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={t('pro.dragLane', 'Drag this sound to where it belongs')}
                    className="absolute top-1 bottom-1 cursor-grab touch-none rounded-lg active:cursor-grabbing"
                    style={{
                      left: `${percent(lane.at)}%`,
                      width: `${Math.max(1.2, (plays / Math.max(0.001, total)) * 100)}%`,
                      /* Eighteen pixels of clip is not a handle. A four-bar
                         part inside a four-minute song is a sliver of the
                         width, and the thing a thumb has to pick up cannot
                         be narrower than a thumb — so it is drawn at least
                         44 wide even where the sound is shorter than that.
                         It reads slightly long at the far end of the zoom,
                         which is the right trade against not being able to
                         move it at all. */
                      minWidth: 44,
                      background: `hsl(${hue} 86% 62% / ${lane.muted ? 0.22 : 0.55})`,
                      boxShadow: on ? '0 0 0 2px rgba(255,255,255,0.7) inset' : undefined,
                      overflow: 'hidden',
                    }}
                    onPointerDown={(event) => {
                      grab(event);
                      held.current = {
                        what: 'move',
                        id: lane.id,
                        grabbedAt: secondsAt(event.clientX),
                        wasAt: lane.at,
                      };
                      setShowing(lane.id);
                      onPick(lane.id);
                    }}
                    onKeyDown={(event) => {
                      const jump = event.shiftKey ? 1 : 0.1;
                      if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        onChange(lane.id, { at: lane.at - jump });
                      }
                      if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        onChange(lane.id, { at: lane.at + jump });
                      }
                    }}
                  >
                    <Wave lane={lane} />
                    {/* The lane's name, on the clip.

                        A block of colour with a wave in it says which lane
                        it is only if you read the gutter at the same time,
                        and on a phone the gutter truncates at about twelve
                        characters. It is also what is left when the wave
                        cannot draw — which is how Carli found the canvas
                        fault above, looking at a clip that said nothing. */}
                    <span
                      className="pointer-events-none absolute left-1.5 top-1 max-w-[calc(100%-1rem)] truncate text-[10px] font-bold"
                      style={{ color: 'rgba(5,6,10,0.75)' }}
                    >
                      {lane.name}
                    </span>
                    {/* The two ends. Wide enough for a thumb, drawn narrow. */}
                    {(['from', 'to'] as const).map((edge) => (
                      <span
                        key={edge}
                        role="slider"
                        aria-label={
                          edge === 'from'
                            ? t('pro.cutFrom', 'Where this lane starts')
                            : t('pro.cutTo', 'Where this lane ends')
                        }
                        aria-valuemin={0}
                        aria-valuemax={Math.round(total)}
                        aria-valuenow={Math.round(edge === 'from' ? lane.at : lane.at + plays)}
                        tabIndex={0}
                        className="absolute inset-y-0 w-6 touch-none cursor-ew-resize"
                        style={{ [edge === 'from' ? 'left' : 'right']: 0 }}
                        onPointerDown={(event) => {
                          /* Before the block underneath, or every cut would
                             be read as picking the whole clip up. */
                          event.stopPropagation();
                          grab(event);
                          held.current = { what: 'cut', id: lane.id, edge };
                          setShowing(lane.id);
                        }}
                      >
                        <span
                          className="pointer-events-none absolute inset-y-1.5 w-1 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.75)',
                            [edge === 'from' ? 'left' : 'right']: 3,
                          }}
                        />
                      </span>
                    ))}
                  </div>

                  {/* What the drag is doing, while it is being done. A clip
                      moved by eye is a clip that cannot be moved back. */}
                  {showing === lane.id && (
                    <span
                      className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums"
                      style={{ background: 'rgba(0,0,0,0.8)', color: INK }}
                    >
                      {clock(Math.max(0, lane.at))} · {sayPlace(placeAt(Math.max(0, lane.at), meter))} ·{' '}
                      {plays.toFixed(1)}s
                    </span>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* ── The playhead, over everything, in the same column ───────

              "Die lyn wat deur die timeline beweeg moet langer wees sodat 'n
              vinger hom kan vang."

              Full height of the stack, so it is a line through the music
              rather than a mark on a ruler, with a head at the top that is
              28 pixels of target for a 2-pixel line. `pointer-events-none` on
              the column and back on for the head alone, or the line would
              swallow every press meant for a clip underneath it. */}
          <div
            className="pointer-events-none relative"
            style={{ gridColumn: 2, gridRow: `1 / span ${lanes.length + 1}` }}
          >
            <span
              className="absolute inset-y-0 w-0.5"
              style={{ left: `${percent(at)}%`, background: HEAD, opacity: 0.85 }}
            />
            <span
              className="pointer-events-auto absolute top-0 h-7 w-7 touch-none rounded-b-md"
              style={{
                left: `${percent(at)}%`,
                transform: 'translateX(-50%)',
                background: HEAD,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                cursor: 'ew-resize',
              }}
              onPointerDown={(event) => {
                grab(event);
                held.current = { what: 'head' };
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The sound inside a clip.
 *
 * Only the part that plays, because the clip IS the part that plays: what was
 * cut away is outside the block now rather than drawn faint inside it, which
 * is the difference between a timeline of clips and a timeline of waveforms
 * with markers on them.
 */
function Wave({ lane }: { readonly lane: Lane }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const box = canvas.current;
    if (!box) return;
    const ratio = window.devicePixelRatio || 1;
    const width = box.clientWidth;
    const height = box.clientHeight;
    if (!(width > 0 && height > 0)) return;
    box.width = Math.floor(width * ratio);
    box.height = Math.floor(height * ratio);
    const paint = box.getContext('2d');
    if (!paint) return;
    paint.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint.clearRect(0, 0, width, height);

    const sound = lane.amped?.audio ?? lane.audio;
    const cut = windowOf(lane);
    const whole = sound.duration || 1;
    const columns = Math.max(8, Math.floor(width));
    /* Enough detail that the visible window gets about one column per pixel,
       and never more than the shape can give.

       The floor under the divisor is the repair for the white rectangle in
       Carli's photograph of 15 September: with `Math.max(0.001, …)` under it
       instead, a clip whose window had collapsed asked for a hundred and
       twenty-six million columns on a three-minute song, the allocation
       failed on the phone, and Chrome drew the dead canvas as a broken
       image. A tenth of a second is the shortest window this room can make
       — the cut handles stop there — so it is the honest floor, and
       `shapeOf` clamps what it is handed as well. */
    const seen = Math.max(0.1, cut.to - cut.from);
    const shape = shapeOf(sound, Math.max(8, Math.floor((whole / seen) * columns)));
    const first = Math.floor((cut.from / whole) * shape.length);
    const last = Math.max(first + 1, Math.floor((cut.to / whole) * shape.length));

    paint.fillStyle = 'rgba(16,185,129,0.85)';
    for (let x = 0; x < width; x += 1) {
      const which = first + Math.floor((x / width) * (last - first));
      const size = Math.max(1, (shape[which] ?? 0) * (height - 4));
      paint.fillRect(x, height / 2 - size / 2, 1, size);
    }
  });
  return <canvas ref={canvas} className="pointer-events-none h-full w-full" />;
}
