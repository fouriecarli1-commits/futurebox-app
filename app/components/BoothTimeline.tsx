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
 *   · drag either end of a clip, which cuts it without destroying anything;
 *   · arm the marker in the ruler's corner and drag out a piece of the song,
 *     which the room above then offers to cut, fade, repeat or fill.
 *
 * All three are pointer events with the pointer captured and `touch-none` on
 * the surface, so a thumb that slides off the strip keeps dragging instead of
 * dropping the clip and scrolling the room.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { lengthOf, repeatOf, windowOf, type Lane } from '../lib/session';
import { shapeOf } from '../lib/takes';
import { barSeconds, sayPlace, placeAt, snapped, type Meter, type Snap } from '../lib/tempo';
import { pullTo, reachOf, REACH, type Sticky } from '../lib/magnet';
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
 * and which no thumb can hit: Carli found it by trying.
 *
 * ── And then both came back down ─────────────────────────────────────────
 *
 * *"Dit voel of daai hel blokkie bietjie nouer kan wees om meer spasie te
 * maak vir klank baan en die liedjie se naam moet bietjie boontoe skuif."*
 *
 * Right, and the reason is worth keeping: a 44-pixel rule is about the area
 * a thumb has to land in, not about how big the thing looks. The buttons are
 * still 44 by 44 — they have to be — and each now draws a small pill inside
 * itself instead of filling its whole box with colour. Two slabs became two
 * lights you can press, which is what they always should have looked like.
 *
 * 92 is exactly two 44s and the gaps, so the gutter is as narrow as a
 * pressable M and S allow, and every pixel saved goes to the waveform. The
 * row lost ten with the name pulled tight to the top.
 */
const GUTTER = 96;  // two 44s, a gap between them, and a hair each side
/** A lane is drawn this tall. */
const ROW = 78;

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
  onSlide,
  onPick,
  picked,
  region,
  onRegion,
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
  /**
   * Move whole lanes along the clock — one, or a locked group of them.
   *
   * Separate from `onChange` for two reasons, both of which bit.
   *
   * A locked group has to move by ONE number. `onChange` re-snaps whatever
   * `at` it is handed, so four calls in a row would each round to the grid
   * on their own and a group locked together would drift apart the first
   * time it was dragged across a bar line. The timeline already did the
   * snapping and the magnet — these positions are final, and the room
   * writes them down as given.
   *
   * And a nudge has to be a nudge. The arrow keys move a clip a tenth of a
   * second; `onChange` snapped that straight back onto the nearest bar, so
   * with the grid on the arrows did nothing at all. That was a real fault
   * and this is where it is fixed.
   */
  readonly onSlide: (moves: readonly { readonly id: string; readonly at: number }[]) => void;
  /** Tapping a lane's name opens its controls. */
  readonly onPick: (id: string) => void;
  readonly picked?: string | null;
  /**
   * The piece of the song that is marked, in seconds on the session's clock.
   *
   * Null is the normal state: nothing marked, and the ruler scrubs. The room
   * above owns it, because everything that can be done TO a marked piece —
   * cutting it out, fading it, sending it away to have the voice taken off —
   * is the room's business and not the timeline's. The timeline draws it and
   * lets a thumb move its ends.
   */
  readonly region: { readonly from: number; readonly to: number } | null;
  readonly onRegion: (region: { readonly from: number; readonly to: number } | null) => void;
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
    /* `with` is every lane this drag moves and where each one started — the
       dragged lane first. Held rather than looked up per frame because
       `lanes` changes under the drag: reading a start position out of the
       current lanes after the first move would measure from where the clip
       has already got to, and the clip would accelerate away from the
       finger. It is also what makes the interlock a group rather than a
       special case: a lane on its own is a group of one. */
    | {
        what: 'move';
        grabbedAt: number;
        with: readonly { readonly id: string; readonly at: number; readonly plays: number }[];
      }
    | { what: 'cut'; id: string; edge: 'from' | 'to' }
    | { what: 'region'; anchor: number }
    | { what: 'regionEdge'; edge: 'from' | 'to' }
    | null
  >(null);
  const [showing, setShowing] = useState<string | null>(null);
  /**
   * Whether a drag on the ruler marks a piece instead of scrubbing.
   *
   * Armed rather than always on, and that is the whole design of it. The
   * ruler already does the thing a thumb reaches for most — move the line —
   * and a gesture that sometimes scrubs and sometimes draws a box, depending
   * on how long you held it, is a gesture nobody can rely on. One button
   * says which of the two the ruler is doing, and it says so out loud.
   */
  const [marking, setMarking] = useState(false);
  /**
   * The magnet, and it starts ON.
   *
   * Carli, 16 September 2026: *"Die timeline het 'n magnet nodig."*
   *
   * Off by default would be a feature nobody finds — and unlike the marker,
   * which changes what a drag MEANS, the magnet only changes where a drag
   * ends up by a few pixels. It is safe to have on, it is the behaviour
   * every desk ships with on, and there is a button to turn it off for the
   * one case that wants it off: placing something deliberately just past the
   * thing it would otherwise stick to.
   *
   * `lib/magnet` has the rule it follows and why the reach is in pixels.
   */
  const [magnet, setMagnet] = useState(true);
  /**
   * How much wider than the screen the song is drawn.
   *
   * ── What was missing, and it was the whole thing ─────────────────────
   *
   * Carli, 18 September 2026: *"Die probooth se sideways scroll werk nie."*
   *
   * It did not work because it did not exist. Until now the whole session
   * was squeezed into whatever width the screen had: on a 390-pixel phone
   * the lane area is 294 pixels, so a three-minute song put a BAR at about
   * a pixel and a half. Every gesture this room offers — place a clip, cut
   * an edge, mark a piece — was being asked for at a scale where a fingertip
   * covers eight bars. The magnet was carrying work that a zoom should have
   * been doing.
   *
   * 1 is "the whole song fits", which is where it starts and is the right
   * first view: you can see what you have before you go into it. Above that
   * the axis is drawn wider than the box it sits in and the box scrolls.
   *
   * ── Why it doubles rather than sliding ───────────────────────────────
   *
   * A slider is a fiddly control on a phone and a continuous zoom means the
   * bar lines never sit still. Doubling gives six steps from a whole song to
   * a single bar, each one a press, and every step is a number somebody can
   * hold in their head: half the song, a quarter of it, an eighth.
   */
  const [zoom, setZoom] = useState(1);
  const MOST_ZOOM = 32;
  /** The box the axis is drawn inside, which is what the zoom multiplies. */
  const scroller = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState(0);
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const measure = (): void => setRoom(Math.max(0, box.clientWidth - GUTTER));
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(box);
    return () => watcher.disconnect();
  }, []);
  /* The axis's own width in pixels. At zoom 1 it is the room, so nothing
     scrolls and the room reads exactly as it did before this existed. */
  const axisWide = Math.max(1, Math.round(room * zoom));
  /** What the drag in progress stuck to, for the readout. Null is the grid. */
  const [stuck, setStuck] = useState<Sticky | null>(null);

  /** How near a point has to be to pull, in seconds on this axis. */
  const reach = magnet ? reachOf(REACH, total, wide) : 0;

  /**
   * The points a drag sticks to: every clip's two ends, the playhead, the
   * marked piece's ends, and the two ends of the song.
   *
   * `skip` is the lanes the drag is moving. A clip cannot stick to itself —
   * it is always exactly on its own start, so without this every drag would
   * be pinned to where it began and nothing would move at all. The same
   * goes for the rest of a locked group, which is moving with it.
   */
  const stickies = (skip: readonly string[] = [], withRegion = true): Sticky[] => {
    const points: Sticky[] = [
      { at: 0, what: 'song' },
      { at: total, what: 'song' },
      { at, what: 'head' },
    ];
    if (withRegion && region) {
      points.push({ at: region.from, what: 'region' });
      points.push({ at: region.to, what: 'region' });
    }
    for (const one of lanes) {
      if (skip.includes(one.id)) continue;
      points.push({ at: one.at, what: 'clip', name: one.name });
      points.push({ at: one.at + lengthOf(one), what: 'clip', name: one.name });
    }
    return points;
  };

  /** The grid's answer, or null when there is no grid. `pullTo` needs the
   *  difference: with Snap off the grid is not a quieter answer, it is none. */
  const grid = (seconds: number): number | null =>
    snap === 'off' ? null : snapped(seconds, meter, snap);

  /** A point on the ruler, clamped to the song, on the grid and magnetised. */
  const pointAt = (clientX: number): number => {
    const raw = Math.max(0, Math.min(total, secondsAt(clientX)));
    /* The marked piece does not stick to its own two ends: `from` sticking to
       `to` collapses the piece to nothing, which is the one thing dragging an
       end must not be able to do by accident. */
    return pullTo(raw, grid(raw), stickies([], false), reach).at;
  };

  /**
   * Begin marking a piece, from wherever the finger went down.
   *
   * ── Why this is not the ruler's alone ────────────────────────────────
   *
   * Carli, 15 September 2026: *"Die mark button wat jy in die probooth gesit
   * het doen niks nie. Die bar se ekstra lyne trek nie om 'n plek af te
   * baken nie."*
   *
   * It did work, and only on the ruler — a 44-pixel strip at the very top of
   * the timeline. Nobody marking a piece of a song looks there: they look at
   * the sound, and they drag across the sound, which is the lane rows. So a
   * feature that was armed, working and tested read as a button that does
   * nothing, because the one place it answered was the one place a hand does
   * not go.
   *
   * Armed, the whole timeline marks — the ruler, the rows, the clips. The
   * clip's own drag and the cut handles stand down while the marker is on,
   * which is the point of it being a mode: one button says what a drag
   * means, and every surface means the same thing by it.
   */
  const startRegion = (event: React.PointerEvent): void => {
    event.stopPropagation();
    grab(event);
    const where = pointAt(event.clientX);
    held.current = { what: 'region', anchor: where };
    onRegion({ from: where, to: where });
  };

  const onMove = (event: React.PointerEvent): void => {
    const now = held.current;
    if (!now) return;
    event.preventDefault();
    if (now.what === 'head') {
      onSeek(Math.max(0, Math.min(total, secondsAt(event.clientX))));
      return;
    }
    /* Marking a piece, and moving one of its ends. Both are the same sum:
       one point is held and the other follows the finger, and the smaller of
       the two is the start — so an end dragged past the other end turns the
       region round instead of collapsing it, which is what every editor
       does and what a hand expects. */
    if (now.what === 'region') {
      const where = pointAt(event.clientX);
      onRegion({ from: Math.min(now.anchor, where), to: Math.max(now.anchor, where) });
      return;
    }
    if (now.what === 'regionEdge') {
      if (!region) return;
      const where = pointAt(event.clientX);
      const other = now.edge === 'from' ? region.to : region.from;
      onRegion({ from: Math.min(other, where), to: Math.max(other, where) });
      return;
    }
    if (now.what === 'move') {
      const held0 = now.with[0];
      /* How far the finger has come, not where it is. A clip dragged by
         position jumps its own left edge under the thumb the moment you pick
         it up anywhere but its very start. */
      const asked = secondsAt(event.clientX) - now.grabbedAt;

      /* ── The group's own walls ────────────────────────────────────────

         One shift moves every lane in a locked group, so the shift is what
         gets clamped and not each lane's position: clamping them one by one
         would stop the lane that hit the end of the song and let the others
         carry on, which is the interlock coming apart at exactly the moment
         it is meant to hold.

         Each lane gives a floor and a ceiling for the shift — half a second
         of it has to stay inside the song at either end — and the group
         takes the tightest of each. */
      let low = -Infinity;
      let high = Infinity;
      for (const one of now.with) {
        low = Math.max(low, -one.plays + 0.5 - one.at);
        high = Math.min(high, total - 0.5 - one.at);
      }
      const walled = (shift: number): number => Math.max(low, Math.min(high, shift));

      const wanted = held0.at + walled(asked);
      const mine = now.with.map((one) => one.id);
      const points = stickies(mine);

      /* ── Which end of the clip the magnet catches ─────────────────────

         Both, and the nearer one wins. A part that has to come in where the
         drums stop is its START against another clip's end; a part that has
         to finish where the chorus begins is its END against a point. A
         magnet that only watched the start could not do the second one, and
         lining up the end by eye is the thing people do worst.

         The grid is offered to the start alone, though, and that is
         deliberate: Snap quantises where a lane STARTS — that is what the
         box on the dock says and what `snapped` does for a recording — so a
         grid that pulled the end onto a bar would be moving the clip by a
         rule nobody asked for. The end gets the magnet and no grid. */
      const byStart = pullTo(wanted, grid(wanted), points, reach);
      const byEnd = pullTo(wanted + held0.plays, null, points, reach);
      let settled = byStart.at;
      let caught = byStart.to;
      if (
        byEnd.to &&
        (!byStart.to || Math.abs(wanted + held0.plays - byEnd.at) < Math.abs(wanted - byStart.at))
      ) {
        settled = byEnd.at - held0.plays;
        caught = byEnd.to;
      }

      /* Walled again: a magnet is allowed to pull a clip a few pixels, and
         it is not allowed to pull it out of the song. */
      const shift = walled(settled - held0.at);
      setStuck(caught);
      onSlide(now.with.map((one) => ({ id: one.id, at: one.at + shift })));
      return;
    }

    const lane = lanes.find((one) => one.id === now.id);
    if (!lane) return;

    /* Cutting. The numbers are on the lane's own clock, and trimming the
       front keeps the audio where it is on the session's clock — the lane's
       start moves by the same amount, so a note on beat three stays on beat
       three. */
    const whole = (lane.amped?.audio ?? lane.audio).duration;
    const window = windowOf(lane);
    /* ── The magnet on a cut, and no grid on a cut ──────────────────────

       The magnet is added here; the grid is not, and the absence is on
       purpose rather than an oversight. Trimming the head of a lane moves
       `at` by exactly as much as it moves `from`, which is what keeps the
       audio still on the session's clock — the room's `change` leaves `at`
       alone whenever `from` is in the patch for that reason. Rounding one of
       the two to a bar and not the other slides the lane by up to half a
       beat on every drag, and the drag then fights the grid.

       A point, though, is a point: sticking a lane's end to where another
       lane starts moves both numbers by the same amount and nothing goes out
       of step. So a cut sticks to things and not to the ruler. */
    const askedAt = secondsAt(event.clientX);
    const pulled = pullTo(askedAt, null, stickies([lane.id]), reach);
    const wanted = pulled.at;
    setStuck(pulled.to);
    if (now.edge === 'from') {
      const into = Math.max(0, Math.min(window.to - 0.1, window.from + (wanted - lane.at)));
      onChange(lane.id, { from: into, to: window.to, at: lane.at + (into - window.from) });
    } else {
      /* ── The end: a trim up to the recording, repeats past it ───────

         Carli: *"Kan nie die instrument generated parts drag om groter te
         word nie."* The end used to stop dead at `whole`, the length of the
         recording, which is right for a trim and is not what a clip's end
         does anywhere else: past the recording, the recording repeats.

         So one gesture, two meanings, decided by where the finger is. Inside
         the recording it cuts. Past it, the piece is left whole and the
         count goes up — rounded, because a part that goes round two and a
         half times is not a thing anybody asks a band for. */
      const asked = Math.max(0.1, wanted - lane.at);
      const most = whole - window.from;
      if (asked <= most) {
        onChange(lane.id, { from: window.from, to: window.from + asked, repeat: 1 });
      } else {
        onChange(lane.id, {
          from: window.from,
          to: whole,
          repeat: Math.max(1, Math.round(asked / Math.max(0.05, most))),
        });
      }
    }
  };
  const endDrag = (): void => {
    const was = held.current;
    held.current = null;
    setShowing(null);
    setStuck(null);
    /* A tap with the marker armed is a tap, not a piece. Without this every
       press on the ruler while marking would leave a region of no length
       behind it, and the room above would put a toolbar on the screen for a
       piece of the song that is nothing. */
    if (
      (was?.what === 'region' || was?.what === 'regionEdge') &&
      region &&
      region.to - region.from < 0.1
    ) {
      onRegion(null);
    }
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

  /**
   * A number per interlock group, so two locks can be told apart.
   *
   * The `link` string itself is a timestamp in base 36 — unguessable, which
   * is what it is for, and unreadable, which is no good on a badge. The
   * number is the group's position in the order the lanes sit in, so the
   * badge reads 1 for the top-most lock and 2 for the next. It moves when a
   * lane is reordered past another lock, and that is fine: the badge says
   * "these ones are locked to each other", not "this is lock number two
   * forever".
   */
  const locks: string[] = [];
  for (const one of lanes) if (one.link && !locks.includes(one.link)) locks.push(one.link);

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
      /* ── And the floor comes off on a short screen ─────────────────────
 
         `min-h-[40vh]` is a floor, and a floor taller than the room is a
         floor that pushes the bottom of the timeline past the fold. On a
         phone in landscape the viewport is about 390 tall: the header, the
         transport and the dock take most of it, and 40vh insists on 156 more
         than there is. The column cannot shrink to fit, so the scroller ends
         up taller than what is left and its last lanes sit under the edge of
         the screen with no way to reach them.
 
         Under 500px of viewport height the floor is dropped and `flex-1`
         gets exactly what is left, which is what it was for. Measured in
         height rather than width on purpose — a tablet held upright is wide
         and short of nothing, and a phone on its side is narrow in neither
         sense that matters here.

         Said honestly: `audit/boothsideways.mjs` does NOT demonstrate this
         one. Putting the floor back leaves that probe green, because the
         probe page renders the room and the tab bar and not the rest of the
         app's chrome, so there is more height there than in the real room.
         The touch-action fault below is the one it catches. This is kept as
         reasoning rather than as a reproduction: a floor that can exceed the
         space available is a hazard whether or not today's layout trips it,
         and it costs nothing to remove on a screen that short. */
      className="flex min-h-[40vh] flex-1 flex-col [@media(max-height:500px)]:min-h-0"
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

        {/* ── In and out along the song ────────────────────────────────

            Here rather than in the ruler's corner, which now holds two
            switches and has no room for two more, and rather than on a desk
            behind an icon — a zoom is not a setting, it is something you
            reach for every few seconds while you work, so it sits in the one
            row that is always on the screen.

            `self-center` because this row is `items-baseline`, which is right
            for the clock beside its units and wrong for a button. */}
        <span className="ml-1 flex flex-shrink-0 items-center self-center">
          {([-1, 1] as const).map((way) => {
            const off = way === -1 ? zoom <= 1 : zoom >= MOST_ZOOM;
            return (
              <button
                key={way}
                type="button"
                data-zoom={way === 1 ? 'in' : 'out'}
                disabled={off}
                onClick={() =>
                  setZoom((was) =>
                    way === 1 ? Math.min(MOST_ZOOM, was * 2) : Math.max(1, was / 2),
                  )
                }
                aria-label={
                  way === 1
                    ? t('pro.zoomIn', 'Closer in along the song')
                    : t('pro.zoomOut', 'Further out along the song')
                }
                title={t(
                  'pro.zoomWhat',
                  'How much of the song is on the screen. All of it to start with, which is where a bar on a phone is a pixel and a half wide — press + and the timeline gets wider than the screen and scrolls sideways, so a clip can be put exactly where it belongs. The names on the left stay put while it does.',
                )}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
              >
                <span
                  className="flex h-6 w-7 items-center justify-center rounded text-base font-black leading-none"
                  style={{ background: 'rgba(255,255,255,0.07)', color: INK_DIM }}
                >
                  {way === 1 ? '+' : '\u2212'}
                </span>
              </button>
            );
          })}
          {/* Only once it is doing something. A "1x" sitting on the screen
              for ever is a number nobody needs; a "4x" is the answer to
              "why does this not look like the whole song". */}
          {zoom > 1 && (
            <span className="ml-0.5 text-[11px] font-bold tabular-nums" style={{ color: INK_DIM }}>
              {zoom}\u00d7
            </span>
          )}
        </span>
        {/* Armed, and nothing marked yet: say what to do, in the one row
            that is always on the screen and always looked at.

            A mode nobody can see is a mode that reads as a broken button —
            which is how Carli found this one. The switch in the corner tints,
            the ruler tints, and this says the sentence. */}
        {marking && !region ? (
          <span
            className="ml-auto truncate rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: 'rgba(56,189,248,0.2)', color: '#7dd3fc' }}
          >
            {t('pro.markHow', 'Drag across the song to mark a piece')}
          </span>
        ) : here ? (
          <span
            className="ml-auto rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: 'rgba(56,189,248,0.14)', color: '#7dd3fc' }}
          >
            {here.label}
          </span>
        ) : null}
      </div>

      {/* Both directions on one box. Down the lanes and along the song are
          the same scroller, because the ruler and every lane are cells of one
          grid — which is the guarantee this component exists for, and two
          scrollers would be two ways for them to disagree about where a
          second is. */}
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain"
      >
        <div
          className="relative grid"
          /* A width in pixels rather than `1fr`, because `1fr` means "what
             is left of the box" and the whole point of a zoom is to be
             wider than the box. At zoom 1 it IS what is left of the box, so
             this is the same layout it always was until somebody presses +. */
          style={{ gridTemplateColumns: `${GUTTER}px ${axisWide}px` }}
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
          {/* ── The corner, which used to be a blank square ──────────────

              Carli, 15 September 2026: *"Is daar nie 'n manier om ekstra
              dragging lines in die timeline te hê wat 'n gedeelte uitsonder,
              dan highlight daai gedeelte met 'n button wat op pop met
              verskillende opsies binne die button."*

              This is the switch for it, and it sits here because this is the
              one cell in the grid that belongs to the ruler rather than to a
              lane — the marker is a mode of the ruler, so its button is the
              ruler's own corner. 44 tall, which is what pulled the ruler up
              to 44 with it. */}
          {/* ── Two switches, not one ──────────────────────────────────

              The magnet joined the marker in here, and the word "Mark" came
              off to make room for it. That is the same trade the gutter
              below already made: M and S are two 44-pixel buttons drawing
              small pills in a 96-pixel cell, because 44 is about the area a
              thumb has to land in and not about how big the thing looks. Two
              44s and the gaps is exactly what 96 holds.

              Both switches belong in this one cell for the same reason: it
              is the only cell in the grid that is the ruler's rather than a
              lane's, and both of them say what a DRAG is about to do. */}
          <div
            className="flex items-center justify-between"
            /* Stuck to the left edge, so the two switches stay reachable
               however far along the song you have scrolled. `z-3` puts it
               over the lanes sliding past and under the playhead. */
            style={{
              gridColumn: 1,
              gridRow: 1,
              position: 'sticky',
              left: 0,
              zIndex: 3,
              background: PANEL,
              borderBottom: `1px solid ${EDGE}`,
              borderRight: `1px solid ${EDGE}`,
            }}
          >
            <button
              type="button"
              data-mark=""
              onClick={() => {
                setMarking((was) => !was);
                if (marking) onRegion(null);
              }}
              aria-pressed={marking}
              aria-label={t('pro.mark', 'Mark')}
              title={t(
                'pro.markWhat',
                'Draw a piece of the song on the ruler, then choose what to do with it: cut it out, fade it, repeat it, or have a part generated for exactly that long.',
              )}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className="flex h-6 w-7 items-center justify-center rounded text-[9px] font-black leading-none"
                style={{
                  background: marking ? 'rgba(56,189,248,0.32)' : 'rgba(255,255,255,0.07)',
                  color: marking ? '#7dd3fc' : INK_DIM,
                  /* Two upright bars with a gap: the shape of what the button
                     draws, which reads at this size where a word does not. */
                  boxShadow: marking
                    ? 'inset 2px 0 0 #7dd3fc, inset -2px 0 0 #7dd3fc'
                    : 'inset 2px 0 0 rgba(238,242,255,0.45), inset -2px 0 0 rgba(238,242,255,0.45)',
                }}
                aria-hidden
              />
            </button>
            <button
              type="button"
              data-magnet=""
              onClick={() => setMagnet((was) => !was)}
              aria-pressed={magnet}
              aria-label={t('pro.magnet', 'Magnet')}
              title={t(
                'pro.magnetWhat',
                'Sticks a sound you drag to the things around it: where another sound starts or ends, the white line, the ends of a marked piece, and the start and end of the song. It only pulls when you are already close, and it does not replace Snap — the bar grid still works, and whichever of the two is nearer wins. Switch it off to place something just past the thing it keeps sticking to.',
              )}
              className="flex h-11 w-11 items-center justify-center"
            >
              {/* A horseshoe: two legs and an arch, drawn rather than
                  spelled, because "M" is already taken by mute one row down
                  and a word does not fit in 28 pixels. */}
              <span
                className="flex h-6 w-7 items-center justify-center rounded"
                style={{
                  background: magnet ? 'rgba(250,204,21,0.28)' : 'rgba(255,255,255,0.07)',
                }}
                aria-hidden
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                  <path
                    d="M4 13V7a4 4 0 0 1 8 0v6"
                    stroke={magnet ? '#fde047' : INK_DIM}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path d="M4 13h2.6M12 13H9.4" stroke={magnet ? '#fde047' : INK_DIM} strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </span>
            </button>
          </div>
          <div
            ref={axis}
            data-axis
            /* `overflow-hidden`: the last mark sits at 100% and its label
               runs past the end, which widened the room sideways on a phone
               — measured at 96 wide holding 131. Clipped rather than moved:
               a label half off the right edge still reads, and nudging the
               last one in would put it on top of the one before it. */
            className="relative h-11 touch-none select-none overflow-hidden"
            style={{
              gridColumn: 2,
              gridRow: 1,
              /* Armed, the strip is blue. Not decoration: the ruler scrubs in
                 one mode and draws in the other, and the only honest way to
                 tell somebody which they are about to get is to make the two
                 look different. */
              background: marking ? 'rgba(56,189,248,0.16)' : PANEL,
              borderBottom: `1px solid ${EDGE}`,
            }}
            /* The whole ruler scrubs, not only the head. A thumb aiming at a
               2-pixel line on a phone misses; a thumb aiming at a strip the
               width of the room does not. */
            onPointerDown={(event) => {
              grab(event);
              /* Armed, the ruler draws instead of scrubbing. Nothing else
                 about the gesture changes — same strip, same capture, same
                 clamp — which is why the button above has to be visibly on:
                 the only difference between the two is what happens, and a
                 person has to be able to see which one they are about to
                 get. */
              if (marking) {
                startRegion(event);
                return;
              }
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
            /* What the clip is drawn as: the piece, repeated. `lengthOf` is
               the same number the mix uses, so the block and the song agree
               about where this lane ends. */
            const plays = lengthOf(lane);
            const once = window.to - window.from;
            const times = repeatOf(lane);
            const hue = hueFor(index, lanes.length);
            /* How wide the clip really comes out, in pixels, so the handles
               can be a share of it rather than a fixed 24 that swallows a
               narrow one whole. The same `minWidth: 44` floor the block
               below draws with, applied here first — and `wide` is 0 until
               the axis has been measured once, which falls through to the
               floor and corrects itself on the next render. */
            const clipPx = Math.max(44, wide > 0 ? (plays / Math.max(0.001, total)) * wide : 0);
            /* At most a quarter each, so half the clip is always a grip. */
            const gripEnd = Math.max(8, Math.min(24, clipPx / 4));
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
                  /* Stuck, like the corner above it. A name column that
                     scrolled away with the song would leave somebody looking
                     at four anonymous stripes of colour a minute into a
                     track — and the whole reason for a name beside a lane is
                     to tell them apart while you are working inside one. */
                  style={{
                    gridColumn: 1,
                    gridRow: index + 2,
                    height: ROW,
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
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
                    /* The top of the cell, not all of it. M and S own the
                       bottom, and a name button that covered them would put
                       its own centre under one of theirs — which is a press
                       aimed at the lane landing on solo. 44 tall, because it
                       is a button. */
                    className="absolute inset-x-0 top-0 h-11 px-1.5 pt-1 text-left"
                  >
                    <span className="block w-full truncate text-[11px] font-bold leading-tight" style={{ color: INK }}>
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
                  <span className="pointer-events-none absolute inset-x-0.5 bottom-0.5 flex items-center justify-between [&>button]:pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => onChange(lane.id, { muted: !lane.muted })}
                      aria-pressed={lane.muted}
                      aria-label={t('pro.mute', 'Mute')}
                      title={t('pro.muteWhat', 'Silence this lane. It stays in the session and comes back when you press it again.')}
                      className="flex h-11 w-11 items-center justify-center"
                    >
                      {/* 44 by 44 to press, smaller to look at. */}
                      <span
                        className="flex h-6 w-8 items-center justify-center rounded text-[11px] font-black leading-none"
                        style={{
                          background: lane.muted ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.07)',
                          color: lane.muted ? '#fca5a5' : INK_DIM,
                        }}
                      >
                        M
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(lane.id, { soloed: !lane.soloed })}
                      aria-pressed={lane.soloed}
                      aria-label={t('pro.solo', 'Solo')}
                      title={t('pro.soloWhat', 'Hear only this lane. Solo another one as well and you hear those two; press it again to get everything back.')}
                      className="flex h-11 w-11 items-center justify-center"
                    >
                      <span
                        className="flex h-6 w-8 items-center justify-center rounded text-[11px] font-black leading-none"
                        style={{
                          background: lane.soloed ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.07)',
                          color: lane.soloed ? '#fde047' : INK_DIM,
                        }}
                      >
                        S
                      </span>
                    </button>
                  </span>
                </div>

                <div
                  /* ── `touch-none` only while marking ────────────────────
 
                     Carli, 16 September 2026: *"die scroll op die timeline
                     werk nie reg in die probooth wanneer mens die foon dwars
                     swaai."*
 
                     This was `touch-none` unconditionally. That is
                     `touch-action: none`, which tells the browser this
                     element owns every touch gesture on it — so a finger
                     dragged up the lanes never scrolled the list. It was
                     added for the region marker, which does need the
                     gesture, and taken for free the rest of the time.
 
                     Turning the phone sideways is what made it visible
                     rather than what caused it. In portrait the lanes
                     usually fit and nobody scrolls them; in landscape the
                     viewport is about 390 tall, the lanes do not fit, and
                     the only part of the screen big enough to put a thumb on
                     is the part that had scrolling switched off.
 
                     `touch-pan-y` rather than nothing: the browser keeps
                     vertical scrolling, and a horizontal drag is still ours
                     to claim — which is what the clip and the cut handles
                     below do with their own `touch-none`. */
                  className="relative"
                  /* ── Both directions, in one declaration ───────────────

                     Tailwind has `touch-pan-x` and `touch-pan-y` and no
                     utility for the two together, and two classes do not
                     combine — the second wins and the first is silently
                     lost. Written as a style so it says what it means:
                     the browser may pan this element in either direction,
                     and anything else is ours.

                     Which is exactly what a lane needs now that the song is
                     wider than the screen: up and down goes to the lane
                     list, along goes to the song, and a drag on a CLIP is
                     still the clip's own. While the marker is armed it is
                     all ours, because marking draws across the lanes. */
                  /* Named so a probe can measure it against the ruler.
                     The whole point of this layout is that they are two
                     cells of one grid and cannot disagree about where a
                     second is; a claim like that is worth a measurement. */
                  data-lanerow={index}
                  style={{
                    gridColumn: 2,
                    gridRow: index + 2,
                    height: ROW,
                    borderBottom: `1px solid ${EDGE}`,
                    touchAction: marking ? 'none' : 'pan-x pan-y',
                  }}
                  /* The empty stretch either side of a clip. It is most of a
                     row on a long song and it had no handler at all, so a
                     mark drawn across the gap between two parts — which is
                     exactly where somebody marks — landed on nothing. */
                  onPointerDown={marking ? startRegion : undefined}
                >
                  {/* The grid, on the shared axis. */}
                  {bars.map((second) => (
                    <span
                      key={second}
                      data-barline={second}
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
                    /* ── And the CLIP has to let a thumb scroll too ────────
 
                       Carli, 17 September 2026, the second time: *"Die
                       probooth se scroll up and down werk nie. Ek wou na
                       ander tydlyne gaan toe werk dit nie."*
 
                       Yesterday's repair put `touch-pan-y` on the lane ROW
                       and left `touch-none` here, which fixed the part of
                       the row with nothing in it and left the part with
                       something in it exactly as it was. The clip is drawn
                       at least 44 pixels wide and the full height of the
                       row, and it is the only thing in there you can see —
                       so it is where a thumb lands every time. A fix that
                       only works where you would not put your finger is not
                       a fix, and reporting it again was right.
 
                       `touch-pan-y` says precisely what is true of a clip:
                       the browser may take a vertical drag, a horizontal one
                       is ours. A vertical pan cancels the pointer, the drag
                       ends where it started, and the list scrolls — which is
                       what a hand means by dragging up a column of lanes.
 
                       Still `touch-none` while the marker is armed: marking
                       draws across the clips on purpose, and the gesture
                       belongs to the mark for as long as the mode is on. */
                    className={`absolute top-1 bottom-1 cursor-grab rounded-lg active:cursor-grabbing ${
                      marking ? 'touch-none' : 'touch-pan-y'
                    }`}
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
                      /* Marking beats moving. A drag across a clip is the
                         most natural way to say "this piece of the song",
                         and while the marker is armed that is what it
                         means. */
                      if (marking) {
                        startRegion(event);
                        return;
                      }
                      grab(event);
                      /* The dragged lane first, then everything locked to
                         it. First rather than merely present: every sum in
                         the move reads `with[0]` as "the one under the
                         finger", and the finger's own clip is the one whose
                         grip has to be kept. */
                      const together = lane.link
                        ? lanes.filter((one) => one.id !== lane.id && one.link === lane.link)
                        : [];
                      held.current = {
                        what: 'move',
                        grabbedAt: secondsAt(event.clientX),
                        with: [lane, ...together].map((one) => ({
                          id: one.id,
                          at: one.at,
                          plays: lengthOf(one),
                        })),
                      };
                      setShowing(lane.id);
                      /* Opens the lane, and never closes it.
                         `onPick` TOGGLES — that is right for the name button
                         in the gutter, where pressing the open lane again is
                         how you shut its controls. On a clip it is wrong:
                         picking a clip up off the lane whose desk is already
                         open shut that desk, so the panel vanished from
                         under the drag. `audit/boothmagnet.mjs` found it by
                         dragging a clip and then looking for the button that
                         had been on the screen a moment earlier. */
                      if (picked !== lane.id) onPick(lane.id);
                    }}
                    onKeyDown={(event) => {
                      const jump = event.shiftKey ? 1 : 0.1;
                      const step =
                        event.key === 'ArrowLeft' ? -jump : event.key === 'ArrowRight' ? jump : 0;
                      if (!step) return;
                      event.preventDefault();
                      /* Through `onSlide`, which does not re-snap. A tenth of
                         a second handed to a grid set to bars comes back as
                         the bar it started on, so with Snap on these arrows
                         used to do nothing whatever. And the group moves
                         together here for the same reason it does under a
                         finger: a lock that holds for one gesture and not the
                         other is not a lock. */
                      const moving = lane.link
                        ? lanes.filter((one) => one.link === lane.link)
                        : [lane];
                      onSlide(moving.map((one) => ({ id: one.id, at: one.at + step })));
                    }}
                  >
                    <Wave lane={lane} />
                    {/* ── Where it goes round ────────────────────────

                        A seam at every repeat, so a part that goes round
                        four times looks like four and not like one long
                        one. Without them the only difference between a
                        repeated bar and a four-bar recording is the sound,
                        which is a thing you have to press play to see. */}
                    {times > 1 &&
                      Array.from({ length: times - 1 }, (_, n) => (
                        <span
                          key={n}
                          className="pointer-events-none absolute inset-y-0 w-px"
                          style={{
                            left: `${((n + 1) / times) * 100}%`,
                            background: 'rgba(5,6,10,0.45)',
                          }}
                        />
                      ))}
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
                    {/* ── That this one is locked to another ──────────────

                        On the clip rather than in the gutter, and numbered.
                        A lock you cannot see is a clip that drags something
                        else with it for no reason you can point at — which
                        is the most alarming thing a timeline can do. The
                        number is the group, so two locks in one session read
                        as two and not as "some of these move together".

                        Bottom-left, because the top-left is the name and the
                        two ends are the cut handles. */}
                    {lane.link && (
                      <span
                        /* Named, so a probe can ask which lanes are in a
                           lock without reading a React state it cannot
                           see. The number is the group's place in the
                           order the lanes sit in. */
                        data-lock={locks.indexOf(lane.link) + 1}
                        className="pointer-events-none absolute bottom-1 left-1.5 flex items-center gap-0.5 rounded px-1 text-[9px] font-black leading-none"
                        style={{ background: 'rgba(5,6,10,0.55)', color: '#fde047' }}
                      >
                        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" aria-hidden>
                          <path d="M6.5 9.5 9.5 6.5" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                          <path d="M9 4.5 10.5 3a2.8 2.8 0 0 1 4 4l-1.5 1.5" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                          <path d="M7 11.5 5.5 13a2.8 2.8 0 0 1-4-4L3 7.5" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {locks.indexOf(lane.link) + 1}
                      </span>
                    )}
                    {/* ── The two ends, and the grip between them ──────────

                        Carli, 19 September 2026: *"Die interlocking werk nie.
                        Dit wys die funksie is aan maar die bane is nie vas
                        aan mekaar nie."*

                        The interlock was working. What was not working was
                        picking the clip up at all — and a lock you cannot
                        test by dragging is a lock that looks broken.

                        These handles were a flat 24 pixels at each end, and
                        the clip is drawn at least 44 wide. Measured on a
                        390-pixel phone with two lanes over a 16-second
                        session: the clip came out 49 pixels, the two handles
                        took 48 of them, and the element under the middle of
                        the clip was "Where this lane ends". Every touch was
                        a trim, so nothing ever moved.

                        It gets worse as a session grows, which is the shape
                        of the report: a clip's width is its share of the
                        whole song, so every lane added and every part
                        dragged further out makes every other clip narrower.
                        It works at first and stops working later.

                        So an end may never take more than a quarter of the
                        clip. Half the clip is always the grip, at every
                        width and every zoom, and trimming stays available
                        rather than being switched off below some threshold
                        — the handles simply get narrower with the thing
                        they belong to. */}
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
                        /* Same reasoning as the clip: a cut is a sideways
                           drag, so vertical stays the browser's. These are
                           24 pixels at each end of the clip and a thumb aimed
                           at the lane below lands on one often. */
                        className={`absolute inset-y-0 cursor-ew-resize ${
                          marking ? 'touch-none' : 'touch-pan-y'
                        }`}
                        style={{ width: gripEnd, [edge === 'from' ? 'left' : 'right']: 0 }}
                        onPointerDown={(event) => {
                          /* Before the block underneath, or every cut would
                             be read as picking the whole clip up. */
                          event.stopPropagation();
                          if (marking) {
                            startRegion(event);
                            return;
                          }
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
                      {plays.toFixed(1)}s{times > 1 ? ` · ×${times}` : ''}
                      {/* What the magnet caught, while it is caught. A clip
                          that lands on a number by itself is a clip you
                          cannot tell was helped — and the whole value of a
                          magnet is knowing it took hold, so the next drag
                          can be aimed rather than nudged. */}
                      {stuck && (
                        <span style={{ color: '#fde047' }}>
                          {' · '}
                          {stuck.what === 'clip'
                            ? stuck.name
                            : stuck.what === 'head'
                              ? t('pro.stuckHead', 'the line')
                              : stuck.what === 'region'
                                ? t('pro.stuckMark', 'the mark')
                                : t('pro.stuckSong', 'the song')}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* ── The marked piece ────────────────────────────────────────

              Drawn across every lane rather than inside one, because that is
              what it is: a piece of the SONG. Which lane it acts on is the
              lane that is open — the same "Which lane" choice every other
              desk in this room is scoped by — so the mark itself does not
              have to carry one, and the same mark can have the voice lifted
              off one lane and a part generated under another without being
              drawn again.

              The body lets presses through to the clips underneath it. Only
              the two ends take them, and only in the ruler's own band at the
              top, so a marked piece does not put a 28-pixel dead stripe down
              through the middle of every clip it crosses. */}
          {region && region.to - region.from > 0.01 && (
            <div
              className="pointer-events-none relative"
              style={{ gridColumn: 2, gridRow: `1 / span ${lanes.length + 1}` }}
            >
              <span
                className="absolute inset-y-0"
                style={{
                  left: `${percent(region.from)}%`,
                  width: `${Math.max(0.2, percent(region.to) - percent(region.from))}%`,
                  background: 'rgba(56,189,248,0.14)',
                  borderLeft: '2px solid #38bdf8',
                  borderRight: '2px solid #38bdf8',
                }}
              />
              {(['from', 'to'] as const).map((edge) => (
                <span
                  key={edge}
                  role="slider"
                  aria-label={
                    edge === 'from'
                      ? t('pro.regionFrom', 'Where the marked piece starts')
                      : t('pro.regionTo', 'Where the marked piece ends')
                  }
                  aria-valuemin={0}
                  aria-valuemax={Math.round(total)}
                  aria-valuenow={Math.round(region[edge])}
                  aria-valuetext={clock(region[edge])}
                  tabIndex={0}
                  className="pointer-events-auto absolute top-0 h-11 w-7 touch-none cursor-ew-resize"
                  style={{ left: `${percent(region[edge])}%`, transform: 'translateX(-50%)' }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    grab(event);
                    held.current = { what: 'regionEdge', edge };
                  }}
                  onKeyDown={(event) => {
                    const jump = event.shiftKey ? 1 : 0.1;
                    const step =
                      event.key === 'ArrowLeft' ? -jump : event.key === 'ArrowRight' ? jump : 0;
                    if (!step) return;
                    event.preventDefault();
                    const moved = Math.max(0, Math.min(total, region[edge] + step));
                    const other = edge === 'from' ? region.to : region.from;
                    onRegion({ from: Math.min(other, moved), to: Math.max(other, moved) });
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-y-1.5 left-1/2 w-1.5 -translate-x-1/2 rounded-full"
                    style={{ background: '#38bdf8' }}
                  />
                </span>
              ))}
            </div>
          )}

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

    /* The piece, drawn once per repeat.

       The clip is as wide as the lane plays, so a part that goes round four
       times is four times the width — and a wave stretched across all of it
       would show one very slow version of a fast part, which is a picture of
       something that is not happening. Each pass gets its own quarter, and
       the seams drawn over the top line up with them. */
    const times = repeatOf(lane);
    const pass = width / times;
    paint.fillStyle = 'rgba(16,185,129,0.85)';
    for (let x = 0; x < width; x += 1) {
      const inPass = pass > 0 ? (x % pass) / pass : 0;
      const which = first + Math.floor(inPass * (last - first));
      const size = Math.max(1, (shape[which] ?? 0) * (height - 4));
      paint.fillRect(x, height / 2 - size / 2, 1, size);
    }
  });
  return <canvas ref={canvas} className="pointer-events-none h-full w-full" />;
}
