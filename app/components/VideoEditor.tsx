'use client';

/**
 * The video editor — a timeline you cut on, not a storyboard with a render
 * button.
 *
 * ── What this is, and what it is not ─────────────────────────────────────
 *
 * Carli, 24 September 2026, after I pointed at the long-shot board and called
 * it an editor: *"Jy sê ons het een, maar ek vermoed jy meen die long shot
 * funksie. wat ek bedoel is 'n editing program soos 'n video editor lyk amper
 * soos die probooth. Waar jy tydlyne het, asook kan jy filters apply en
 * export."*
 *
 * She was right and I was wrong. A board that lists shots and then calls an
 * engine is a brief. An editor is a clock with your own material on it that
 * you cut, reorder, trim and fade — and the difference is that at no point
 * does an editor need to ask anybody for anything.
 *
 * ── Everything here is free to serve, and that is the design ─────────────
 *
 * Not one thing in this room costs a cent. Trimming, splitting, reordering,
 * fading, the looks, the sound bed, the words on screen and the export all
 * happen in this browser: `stitch.ts` paints frames onto a canvas and records
 * them, which is why this app has no per-minute render bill and why somebody
 * can sit here for three hours without the meter moving.
 *
 * That is also why the room is gated on a plan rather than on credits. It
 * costs nothing to run and it is worth paying for, which is exactly the shape
 * `credits.ts` describes: entering a room is included, generating in it costs
 * credits. There is nothing to generate here yet.
 *
 * ── The three things she asked for that are NOT here ─────────────────────
 *
 * Taking a background out, taking an item out, and generating a missing
 * piece. All three need an engine — fal.ai for the first two — and all three
 * are priced in `credits.ts` and named on every plan card.
 *
 * They are doors that say so rather than buttons that lie. The reason they
 * are not wired tonight is not that the code is hard: it is that the legal
 * audit of the same day found that a supplier receiving video of a person
 * needs a line on the privacy page and an answer about POPIA section 72
 * before a single frame is sent. `check:verwerkers` fails the build the day
 * somebody writes that fetch without one, and fal.ai is already registered
 * in it waiting.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Scissors, Trash2, ChevronLeft, ChevronRight, Loader2, Download,
  Play, Pause, SkipBack, Plus, Volume2, VolumeX, Type, Sparkles, Lock, Image as ImageIcon, Undo2, Redo2,
  RotateCw, Layers, Gauge, Move, Copy, Shuffle, Crop,
} from 'lucide-react';
import Card from './Card';
import Note from './Note';
import { useLang } from '../lib/i18n';
import { FILTERS, filterCss, filterName } from '../lib/videofilters';
import {
  FONTS, PLAIN_FONT, fontFor, WORDS_LARGEST, WORDS_SMALLEST,
} from '../lib/videofonts';
import { canStitch, CAPTION_ROUND, lengthOf, stitch } from '../lib/stitch';
import {
  loadMark, MARK_LARGEST, MARK_OPACITY, MARK_SHARE, MARK_SMALLEST,
  type Corner, type Spot,
} from '../lib/logomark';
import { fit } from '../lib/imagefile';
import { downloadBlob, safeFilename } from '../lib/library';
import { check, type Plan } from '../lib/entitlements';
import { CREDITS, perMinute } from '../lib/credits';
import { billForEdit, inTheFilm, type BillLine } from '../lib/filmcost';
import { loadWallet, NO_WALLET, type Wallet } from '../lib/wallet';
import { KEEP_STEPS } from '../lib/undo';
import {
  NOTHING, SHAPES, LONGEST_FADE, SHORTEST_PIECE,
  add, atSecond, change, cutFrom, drop, duplicate, fadesFor, filmSecond, lengthOfPiece,
  move, runs, split, startsAt, trim,
  type Edit, type Piece,
} from '../lib/videoedit';
import {
  JOINS, JOIN_FOR, LONGEST_JOIN, joinFits, joinName, needsHeld,
} from '../lib/videojoins';

/**
 * One row of the bill, in words.
 *
 * Here rather than inside the component so the sentence for each row is in one
 * place and `check:afrikaans` can see every key. The count goes into the
 * sentence rather than beside it, because "3 pieces with words" and "words · 3"
 * read differently to somebody deciding what to take off.
 */
function billWord(
  t: (key: string, fallback: string) => string,
  line: BillLine,
): string {
  const n = String(line.count);
  switch (line.id) {
    case 'film':
      return t('bill.film', 'The film, {n} minute(s)').replace('{n}', n);
    case 'words':
      return t('bill.words', 'Words on {n} piece(s)').replace('{n}', n);
    case 'look':
      return t('bill.look', 'A look on {n} piece(s)').replace('{n}', n);
    case 'join':
      return t('bill.join', '{n} transition(s)').replace('{n}', n);
    case 'mark':
      return t('bill.mark', 'Your mark on it');
    default:
      return t('bill.under', 'A track under it');
  }
}

/** A block on the strip is never thinner than this, however short the piece. */
const THINNEST = 11;

/**
 * How many pixels a second of film is worth on the strip.
 *
 * Forty. A one-second piece is a block wide enough to hit with a thumb, and a
 * thirty-second advert fits in about 1 200 pixels — a couple of screens of
 * scrolling on a phone, which is what scrolling is for.
 *
 * Fixed rather than fitted to the screen, and that is the decision. A strip
 * that squeezes to fit shows a proportion, not a duration: it makes a
 * ten-second film and a ten-minute one look identical, and there is nowhere
 * to point at "eighteen seconds in". A ruler that lies about time is a bar
 * chart wearing a ruler.
 */
const PER_SECOND = 40;

/**
 * And how few it may shrink to before the strip scrolls instead.
 *
 * Carli, 30 September 2026: *"video desk se grootte uit preporsie is. Die hele
 * skerm slide by ver links en regs … Dit is net die probooth wat ruimte en
 * beweging moet hê."*
 *
 * She was right and the measurement was exact: the page itself cannot slide —
 * `overflow-x: clip` sees to that — but the strip was 474 pixels inside a 334
 * pixel window on a phone. At almost the full width of the screen, dragging it
 * IS dragging the screen as far as anybody's thumb is concerned.
 *
 * So a second is no longer a fixed forty pixels. The film is fitted to the
 * strip, up to `PER_SECOND` — a short film fills the width and never moves,
 * which is every film this app makes, since Veo's own lengths are four, six
 * and eight seconds.
 *
 * The floor is what stops that becoming the other lie. Squeezing ten minutes
 * into 334 pixels makes every block half a pixel wide, and a strip nobody can
 * hit is not a timeline either. Below this density it scrolls, because a long
 * film genuinely is longer than a phone.
 *
 * What makes fitting honest here — and it did not use to be — is the ruler.
 * A strip that squeezes with no times on it shows a proportion; one whose
 * marks say "0:30" at thirty seconds shows a duration at whatever zoom it is
 * drawn at. The ruler is why this is now a fair trade and was not before.
 */
const LEAST_PER_SECOND = 9;

/**
 * Where each corner puts the mark's CENTRE, as fractions of the frame.
 *
 * A second description of `markBox`'s corner arithmetic, and that is a real
 * cost worth naming: two places now know what "bottom right" means. It is
 * paid because the preview positions an `<img>` with CSS percentages and the
 * render positions a `drawImage` with pixels, and nothing can be shared
 * between those two without handing the preview a canvas it does not need.
 *
 * `check:logomark` measures the two against each other, so a change to one
 * that is not made to the other is a red build rather than a logo that moves
 * when the film is made.
 */
const CORNER_AT: Record<Corner, { readonly x: number; readonly y: number }> = {
  topLeft: { x: 0.13, y: 0.14 },
  topRight: { x: 0.87, y: 0.14 },
  bottomLeft: { x: 0.13, y: 0.86 },
  bottomRight: { x: 0.87, y: 0.86 },
};

/**
 * How close to an edge anything on the frame may be put, as a fraction.
 *
 * Three percent, and it is one number rather than one per control on purpose:
 * the drag clamps to it, the nudge buttons clamp to it, and the align buttons
 * sit inside it. A nudge that could reach 1.02 would leave a logo where no
 * drag can pick it up again, which is the exact fault the drag's own clamp was
 * written against — so they share the clamp instead of each having one.
 */
const EDGE = 0.03;

/** A spot kept inside the frame. The only clamp in this room. */
function penned(spot: Spot): Spot {
  return {
    x: Math.max(EDGE, Math.min(1 - EDGE, spot.x)),
    y: Math.max(EDGE, Math.min(1 - EDGE, spot.y)),
  };
}

/**
 * Where an align button puts a thing's CENTRE, on one axis.
 *
 * Carli, 2 October 2026. What an align control does, wherever it appears, is
 * move an element to an edge or to the middle on ONE axis and leave the other
 * where it was — and that is the behaviour somebody wants: "put it at the top"
 * should not also drag it sideways into the middle.
 *
 * The edge figures are READ OUT of `CORNER_AT` rather than typed again, so
 * "left" here and "top left" there are the same place. Two sets of numbers for
 * one edge is how a room ends up with an align button that puts a logo
 * somewhere the corner buttons say is not the edge.
 */
const ALIGNS = [
  { id: 'left', axis: 'x', to: CORNER_AT.topLeft.x, en: 'Left', af: 'Links' },
  { id: 'across', axis: 'x', to: 0.5, en: 'Middle', af: 'Middel' },
  { id: 'right', axis: 'x', to: CORNER_AT.topRight.x, en: 'Right', af: 'Regs' },
  { id: 'top', axis: 'y', to: CORNER_AT.topLeft.y, en: 'Top', af: 'Bo' },
  { id: 'down', axis: 'y', to: 0.5, en: 'Centre', af: 'Senter' },
  { id: 'bottom', axis: 'y', to: CORNER_AT.bottomLeft.y, en: 'Bottom', af: 'Onder' },
] as const satisfies readonly {
  readonly id: string; readonly axis: 'x' | 'y'; readonly to: number;
  readonly en: string; readonly af: string;
}[];

/**
 * How far one nudge moves a thing, as a share of the frame.
 *
 * One percent. On a desk this is the arrow keys; a phone has no arrow keys, so
 * it is four buttons — and the reason they are here at all is the same reason
 * the zoom is: a drag on a 390-pixel preview cannot be landed on a round
 * number, and "a bit left" is most of what somebody actually wants.
 */
const NUDGE = 0.01;

const NUDGES = [
  { id: 'left', dx: -NUDGE, dy: 0, turn: 'rotate-180' },
  { id: 'up', dx: 0, dy: -NUDGE, turn: '-rotate-90' },
  { id: 'down', dx: 0, dy: NUDGE, turn: 'rotate-90' },
  { id: 'right', dx: NUDGE, dy: 0, turn: '' },
] as const;

/**
 * Where the words sit when nobody has moved them.
 *
 * The same place `drawCaption` puts an unplaced caption: a twelfth of the
 * frame up from the bottom, in the middle. Named here because the align and
 * nudge buttons have to start from somewhere, and starting them from a
 * different place than the renderer draws would make the first tap on an arrow
 * jump the words rather than move them.
 */
const WORDS_AT: Spot = { x: 0.5, y: 0.88 };

/**
 * Align and nudge, for anything that sits on the frame.
 *
 * One component for the words and for the mark, because they are the same six
 * buttons and the same four arrows over two different spots. Two copies would
 * be two places to fix the day the nudge changes, and the words' copy is
 * always the one that gets forgotten.
 */
function Placing({ which, at, put }: {
  readonly which: 'words' | 'mark';
  readonly at: Spot;
  readonly put: (spot: Spot) => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  return (
    <div className="space-y-1.5">
      <span className="text-sm text-zinc-400 inline-flex items-center gap-1.5">
        <Move className="w-3.5 h-3.5" />
        {t('edit.place', 'Where it sits')}
      </span>
      <div className="flex flex-wrap gap-2">
        {ALIGNS.map((one) => (
          <button
            key={one.id}
            type="button"
            data-editoralign={`${which}:${one.id}`}
            onClick={() => put(penned(one.axis === 'x' ? { ...at, x: one.to } : { ...at, y: one.to }))}
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-300"
          >
            {lang === 'af' ? one.af : one.en}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {NUDGES.map((one) => (
          <button
            key={one.id}
            type="button"
            aria-label={t('edit.nudge', 'A little at a time')}
            data-editornudge={`${which}:${one.id}`}
            onClick={() => put(penned({ x: at.x + one.dx, y: at.y + one.dy }))}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 inline-flex items-center justify-center"
          >
            <ChevronRight className={`w-4 h-4 ${one.turn}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * How far apart the marks on the ruler are, for a film of a given length.
 *
 * Picked so a strip carries somewhere between four and twenty marks. Every
 * second on a five-minute film is three hundred labels drawn on top of each
 * other; every thirty on a ten-second one is one mark and no ruler at all.
 */
function stepFor(total: number, perSecond: number): number {
  /* Against PIXELS, not against seconds. The marks used to be chosen from the
     length alone, which was right while a second was always forty pixels and
     wrong the moment it stopped being — a fitted strip would have drawn twenty
     labels into 334 pixels and painted them on top of each other. At least
     forty-four pixels apart is a thumb's width, which is the same number every
     control in this app is sized against. */
  if (total <= 0) return 1;
  for (const step of [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]) {
    if (step * perSecond < 44) continue;
    if (total / step > 20) continue;
    /* And it has to mark the film more than once. The 44-pixel rule alone
       chose a two-second step for a 1.9-second film, which is a single mark
       at nought — `check:editor` reported "1 marks", and a ruler with one mark
       on it is not a ruler, it is a tick. */
    if (total / step >= 1) return step;
  }
  /* Nothing in the ladder both spaces the labels and marks the film twice,
     which happens once a film is shorter than about two labels wide. Half the
     film is then the honest answer: start, middle, end, a little tighter than
     44 pixels apart. Tight beats absent. */
  return Math.max(0.1, Math.round((total / 2) * 10) / 10);
}

/**
 * The largest file the editor will take in.
 *
 * `OwnFootage` has had a 500MB ceiling since it was written; this room had
 * none at all, which meant a two-gigabyte phone recording was decoded with
 * nothing in the way of it and the tab died — a white screen with nothing in
 * the console, which is the exact failure `check:photopath` exists to stop on
 * the picture side.
 *
 * The same 500MB, in one place, because two ceilings for "a video this app
 * will hold" is two answers to one question.
 */
export const CLIP_MAX_BYTES = 500 * 1024 * 1024;

function seconds(value: number): string {
  const whole = Math.max(0, value);
  const mins = Math.floor(whole / 60);
  const rest = whole - mins * 60;
  return mins > 0 ? `${mins}:${rest.toFixed(1).padStart(4, '0')}` : `${rest.toFixed(1)}s`;
}

export default function VideoEditor({
  plan,
  onUpgrade,
}: {
  readonly plan: Plan;
  readonly onUpgrade?: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [edit, setEdit] = useState<Edit>(NOTHING);

  /* ── Taking it back ─────────────────────────────────────────────────────
 
     The Pro Booth got undo in September and an editor without it is worse:
     a split you did not mean, a piece dropped, and the only way back is to
     bring the file in again and start the trims over.
 
     Not `lib/undo.ts`, and the reason is worth writing down rather than
     leaving as an inconsistency. That module is built around what makes
     audio history dangerous — it weighs each step by DISTINCT AudioBuffer
     bytes and evicts against a 256MB ceiling, because two lanes can hold two
     copies of the same minute of sound.
 
     An `Edit` is a list of small objects holding Blob REFERENCES. Twenty
     steps of it share the same handful of files and weigh nothing. Forcing
     it through a `Holder` contract that wants `audio: Sound` would mean
     describing a video clip as a sound to satisfy a type, which is how a
     module ends up meaning two things.
 
     What IS shared is the depth: `KEEP_STEPS`, so the two rooms in this app
     that can be taken back are taken back the same number of times. */
  const [past, setPast] = useState<readonly Edit[]>([]);
  const [future, setFuture] = useState<readonly Edit[]>([]);

  /** Every change to the film goes through here, so none of them is unrepeatable. */
  const commit = useCallback((how: (was: Edit) => Edit) => {
    setEdit((was) => {
      const next = how(was);
      if (next === was) return was;
      setPast((steps) => [...steps, was].slice(-KEEP_STEPS));
      setFuture([]);
      return next;
    });
  }, []);

  const stepBack = useCallback(() => {
    setPast((steps) => {
      if (!steps.length) return steps;
      const back = steps[steps.length - 1];
      setEdit((now) => {
        setFuture((ahead) => [now, ...ahead].slice(0, KEEP_STEPS));
        return back;
      });
      return steps.slice(0, -1);
    });
  }, []);

  const stepForward = useCallback(() => {
    setFuture((ahead) => {
      if (!ahead.length) return ahead;
      const forward = ahead[0];
      setEdit((now) => {
        setPast((steps) => [...steps, now].slice(-KEEP_STEPS));
        return forward;
      });
      return ahead.slice(1);
    });
  }, []);
  const [picked, setPicked] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState<{ url: string; blob: Blob; ext: string; seconds: number } | null>(null);

  /* The one door. The room costs nothing to serve, so this is not about cost
     — it is that the plan cards say the editor comes with a paid plan, and a
     card that says so while the room opens for everybody is a card that
     lies. `ENTITLEMENTS['video.editor']` is the same row the cards are drawn
     from, so the two cannot disagree. */
  const allowed = check('video.editor', plan).allowed;

  const made_ = useRef<string | null>(null);
  useEffect(() => () => { if (made_.current) URL.revokeObjectURL(made_.current); }, []);

  const piece = useMemo(
    () => edit.pieces.find((one) => one.id === picked) ?? null,
    [edit.pieces, picked],
  );

  /* No `?? pieces[0]`. A picker that cannot name what it picked must pick
     nothing — see the note on `member` in `Presenter.tsx`, and
     `check:whofirst`, which holds it. The effect below moves the selection
     onto a real piece instead. */
  useEffect(() => {
    if (!edit.pieces.length) return;
    if (edit.pieces.some((one) => one.id === picked)) return;
    setPicked(edit.pieces[0].id);
  }, [edit.pieces, picked]);

  /* ── Your own mark on the film ──────────────────────────────────────────
 
     Carli asked for "om 'n item in te sit". The useful version of that, and
     the one that needs no engine, is a logo: `stitch.ts` has painted a mark
     into the corner of every frame since September and `logomark.ts` loads
     it. Nothing new is being built here — it is being reached.
 
     Kept as a loaded `HTMLImageElement` rather than on the `Edit`, because
     `cutFrom` is pure and synchronous and loading an image is neither. The
     edit stays a description of the film; this is the one piece of it that
     has to be decoded before it can be drawn. */
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [markName, setMarkName] = useState('');
  const [corner, setCorner] = useState<Corner>('bottomRight');
  /* Where it has been dragged to, or null for "wherever the corner says".
     Null is the default and is not the same as the centre: a mark that has
     never been moved should obey the corner buttons, and a `{x: .5, y: .5}`
     default would silently ignore them. */
  const [markAt, setMarkAt] = useState<Spot | null>(null);
  const [markShare, setMarkShare] = useState(MARK_SHARE);
  /* Turned, how solid, and whether it goes under the words.
 
     All three live here rather than on the `Edit` for the same reason the
     image does: there is one mark over the whole film, not one per piece. The
     words' three are on the piece, because a caption is a piece's caption. */
  /* ── What this film will cost, worked out as she builds it ──────────────

     Carli, 3 October 2026: *"wanneer die video klaar is, en hulle op die export
     knoppie druk dan wys daar die hoeveelheid krediete, en hulle moet dan
     confirm of hulle wil voortgaan."*

     `billForEdit` is the same function the route runs to charge. Not a copy of
     it with the same numbers in — the same function — because two copies of a
     price is two prices, and the one on the button is the one somebody agreed
     to. `check:filmcost` holds both ends against it. */
  const [asking, setAsking] = useState(false);
  const [wallet, setWallet] = useState<Wallet>(NO_WALLET);

  const [markTurn, setMarkTurn] = useState(0);
  const [markSolid, setMarkSolid] = useState(MARK_OPACITY);
  const [markUnder, setMarkUnder] = useState(false);

  /* ── The shape the film is actually coming out in ───────────────────────
 
     Read here because the preview has to be drawn in it, and until 3 October
     2026 it was not: the preview showed the CLIP at the clip's own shape, and
     the film comes out at the film's.
 
     That was a quiet lie about placement. Everything on the frame — the logo,
     the words — is positioned in FRACTIONS of the frame, and `drawMark` and
     `drawCaption` read those fractions against the film's 1080x1920. The
     preview read them against whatever shape the clip happened to be. So a
     logo dragged to the bottom of a landscape clip, in a vertical film, landed
     at the same fraction in the film — which in the film is inside the black
     bar, with the picture letterboxed above it.
 
     She placed it on a picture and it came out on nothing. Nothing in the app
     could have told her: `check:logomark` measures the preview's fractions
     against `markBox`'s and they agreed exactly. They were both right about the
     fraction and the preview was wrong about the frame. */
  const shape = SHAPES[edit.shape ?? 'tall'] ?? SHAPES.tall;

  /* How much the preview is magnified. One means no magnification at all,
     and at one the zoom box is not a scroller — see the note where it is
     drawn. Whole numbers only: a continuous zoom on a phone is a gesture
     nobody can land on a round number, and the point of this is placing
     something precisely, not exploring. */
  const [zoom, setZoom] = useState(1);

  /* How long the track under it runs. Read once when it is chosen, because
     the lane below cannot clamp a scrub without it — and a scrub that can be
     dragged past the end of the song is a film with silence under it and
     nothing on screen to say why. */
  const [underLength, setUnderLength] = useState(0);
  useEffect(() => {
    if (!edit.under) { setUnderLength(0); return undefined; }
    let live = true;
    void lengthOf(edit.under).then((found) => {
      if (live && Number.isFinite(found) && found > 0) setUnderLength(found);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [edit.under]);

  /* ── The playhead ───────────────────────────────────────────────────────
 
     `at` is a second on the EDIT's clock, not on any one file's. Everything
     else — which piece is on screen, where the line is drawn, what the viewer
     is seeked to — is worked out from it by `atSecond`, so there is one
     answer to "where are we" rather than one per control. */
  const [at, setAt] = useState(0);
  const [running, setRunning] = useState(false);
  const strip = useRef<HTMLDivElement | null>(null);

  /* Where in the picked piece's OWN material the viewer should land, once it
     has something to land on.

     A `currentTime` set before the element has decoded a frame is thrown
     away without an error, which is exactly how scrubbing used to put the
     playhead in the right place and the picture in the wrong one. So the
     instruction is written down here and applied by whichever of the two
     effects below gets to a ready element first. */
  const wanted = useRef<number | null>(null);
  const viewer = useRef<HTMLVideoElement | null>(null);

  const total = runs(edit);

  /* How wide the strip actually is, measured rather than assumed. A breakpoint
     guess would be wrong on every phone it was not written for, and the strip
     is not the window: it sits inside a card with its own padding. */
  /* The picture's own height, so the words over it are the same share of it
     that `drawCaption` will make them of the frame. */
  const frame = useRef<HTMLDivElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(0);
  useEffect(() => {
    const box = frame.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(() => setFrameHeight(box.clientHeight));
    watch.observe(box);
    setFrameHeight(box.clientHeight);
    return () => watch.disconnect();
    /* Keyed on the picked piece rather than on `source`, which is declared
       below this. Same moment either way: the frame is only ever a different
       size because a different piece is in it. */
  }, [picked]);

  const [stripWidth, setStripWidth] = useState(0);
  useEffect(() => {
    const box = strip.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(() => setStripWidth(box.clientWidth));
    watch.observe(box);
    setStripWidth(box.clientWidth);
    return () => watch.disconnect();
  }, [edit.pieces.length]);

  /** Pixels a second, fitted to the strip and never denser than `PER_SECOND`. */
  const perSecond = useMemo(() => {
    if (total <= 0 || stripWidth <= 0) return PER_SECOND;
    return Math.min(PER_SECOND, Math.max(LEAST_PER_SECOND, stripWidth / total));
  }, [total, stripWidth]);

  const step = stepFor(total, perSecond);
  const fades = fadesFor(edit);

  /* Recomputed as she builds, so the number on the button is never stale. Cheap
     — it walks the pieces once and adds up — and it has to be live, because the
     whole promise is that the price is known before the press. */
  const bill = useMemo(() => billForEdit(edit, Boolean(mark)), [edit, mark]);

  /* The clock cannot point past the end of the film. Dropping the last piece
     while the playhead is inside it used to leave the line hanging off the
     right of the strip. */
  useEffect(() => {
    const end = runs(edit);
    setAt((was) => (was > end ? end : was));
  }, [edit]);

  /**
   * Move the clock, and bring everything else along.
   *
   * This is the only thing that writes `at`, apart from playback itself.
   * `atSecond` says which piece is over that second and how far into its own
   * material that is, so the picked piece, the viewer and the playhead all
   * come from one answer rather than three.
   */
  const scrubTo = useCallback((second: number) => {
    const where = Math.max(0, Math.min(second, runs(edit)));
    setAt(where);
    const found = atSecond(edit, where);
    if (!found) { wanted.current = null; return; }
    wanted.current = found.into;
    setPicked(found.piece.id);
    const v = viewer.current;
    if (v && found.piece.id === picked && v.readyState > 0) {
      v.currentTime = found.into;
      wanted.current = null;
    }
  }, [edit, picked]);

  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (!piece) { setSource(null); return undefined; }
    const url = URL.createObjectURL(piece.clip);
    setSource(url);
    return () => URL.revokeObjectURL(url);
    /* Keyed on the clip rather than the piece: trimming makes a new piece
       object every keystroke and the material behind it has not changed. */
  }, [piece?.clip]);

  /* The speed and the volume, onto the element that is being watched.
 
     Set here rather than as attributes on the `<video>` because neither is a
     React attribute that re-renders cleanly: `playbackRate` and `volume` are
     properties, and a `defaultPlaybackRate` is a different thing that only
     applies after a load.
 
     The point of doing it at all is that the preview is the only place she can
     check a decision before paying to render it. A speed slider that moved the
     strip and the export but not the picture under her thumb would be a
     control she has to guess at. */
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.playbackRate = Math.max(0.1, Math.min(4, piece?.speed ?? 1));
    /* Clamped at one for the same reason `stitch` clamps it: an element's
       `volume` throws above one, and the 0–2 range is kept across the app so
       the slider means one thing everywhere. Louder than the material needs a
       gain node, which this preview does not have and the Pro Booth does. */
    v.volume = Math.max(0, Math.min(1, piece?.loud ?? 1));
  }, [piece?.speed, piece?.loud, source]);

  /* A waiting seek, landed the moment the element can take one. */
  useEffect(() => {
    const v = viewer.current;
    if (!v) return undefined;
    const land = () => {
      if (wanted.current === null) return;
      v.currentTime = wanted.current;
      wanted.current = null;
      if (running) void v.play();
    };
    v.addEventListener('loadeddata', land);
    return () => v.removeEventListener('loadeddata', land);
  }, [source, running]);

  /* And the same seek for the case `loadeddata` never fires: two pieces cut
     out of ONE file share a Blob, so picking the other half of a split does
     not change `source` and the element is already decoded. Without this,
     scrubbing across a split moved the line and left the picture. */
  useEffect(() => {
    const v = viewer.current;
    if (!v || wanted.current === null) return;
    if (v.readyState === 0) return;
    v.currentTime = wanted.current;
    wanted.current = null;
  }, [picked, source]);

  /* Seek to whichever end just moved, so the frame on screen is the frame
     being decided about.

     Only when the start of the SAME piece moved, and that qualifier is the
     whole fix. The first version watched `piece?.from`, which also changes
     when you pick a DIFFERENT piece — so scrubbing into the second half of a
     split moved the line, moved the picture, and then this effect dragged
     the picture back to the top of that piece. It ran second and won.

     Invisible in a typecheck and invisible on screen unless you happen to
     look at the frame rather than the line. `check:editor` reads both and
     reported the line at 1.5s over a picture at 0.99s. */
  const trimmed = useRef<{ readonly id: string; readonly from: number } | null>(null);
  useEffect(() => {
    const v = viewer.current;
    const was = trimmed.current;
    trimmed.current = piece ? { id: piece.id, from: piece.from } : null;
    if (!v || !piece || !was) return;
    if (was.id !== piece.id || was.from === piece.from) return;
    if (Number.isFinite(piece.from)) v.currentTime = piece.from;
  }, [piece?.id, piece?.from]);

  /* The end of a piece: a stop when you are cutting, the next piece when the
     whole film is running.

     That hop is the one thing that makes this a timeline and not a row of
     files with their own play buttons. The clock is read off the element
     rather than counted on a timer, so it cannot drift away from the picture
     while a slow phone decodes. */
  useEffect(() => {
    const v = viewer.current;
    if (!v || !piece) return undefined;
    const tick = () => {
      /* Through `filmSecond`, which divides by the speed. This read
         `startsAt(...) + (v.currentTime - piece.from)` and so ran the line at
         the rate of the FILE rather than of the film: on a piece at two times
         the playhead finished the block while the picture was halfway through
         it. The inverse of this conversion lives beside it in `videoedit.ts`
         and `check:cutmaths` walks out through one and back through the other. */
      if (running) setAt(filmSecond(edit, piece.id, v.currentTime));
      if (v.currentTime < piece.to) return;
      if (!running) { v.pause(); return; }
      const after = edit.pieces[edit.pieces.findIndex((one) => one.id === piece.id) + 1];
      if (!after) { v.pause(); setRunning(false); setAt(runs(edit)); return; }
      wanted.current = after.from;
      setPicked(after.id);
    };
    v.addEventListener('timeupdate', tick);
    return () => v.removeEventListener('timeupdate', tick);
  }, [piece, running, edit]);

  /* Play and pause follow the one flag, so the button and the end of the
     film cannot disagree about whether the film is running. */
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    if (running) void v.play();
    else v.pause();
  }, [running, source]);

  const bringIn = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem('');
    setBusy('bring');
    try {
      let next = edit;
      for (const file of Array.from(files)) {
        if (file.size > CLIP_MAX_BYTES) {
          setProblem(t(
            'edit.toobig',
            'That file is larger than 500MB. Trim it on your phone first, or bring it in in pieces.',
          ));
          continue;
        }
        const length = await lengthOf(file);
        if (!Number.isFinite(length) || length <= 0) {
          setProblem(t('edit.unreadable', 'That file could not be read as video.'));
          continue;
        }
        next = add(next, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          clip: file,
          name: file.name.replace(/\.[^.]+$/, ''),
          from: 0,
          to: length,
          /* What the material actually holds, so a trim can be dragged back out
             again. See the note on `holds`: without it the only ceiling is
             wherever the edge is now, and a trim you cannot undo by dragging is
             a one-way door. */
          holds: length,
        });
      }
      commit(() => next);
    } finally {
      setBusy(null);
    }
  }, [edit, commit, t]);

  /* ── One press of Back for a whole gesture ─────────────────────────────

     The edit as it was when a gesture STARTED, held here until it ends.
 
     Carli will never read this, and it is the reason a slider in this room is
     usable at all. A `<input type="range">` fires `change` on every pixel it
     is dragged across, and every one of those used to go through `commit`,
     which files a history step. One pull of the size slider was therefore
     thirty or forty steps — `KEEP_STEPS` is twenty — so a single drag emptied
     the history and Back meant "a pixel and a half ago". Everything before it,
     including bringing the clip in, was gone.
 
     Found by `check:editor` on 2 October 2026 and not by looking: the walk
     that undoes everything stopped reaching the empty clock the moment this
     room grew enough sliders to overflow twenty steps in one probe. The
     tempting fix was to raise `KEEP_STEPS`, which would have moved the number
     the fault appears at without touching the fault.
 
     The fade handles already did it this way. These helpers are that
     mechanism, lifted out so the sliders and the drags share one copy. */
  const beforeDrag = useRef<Edit | null>(null);

  /** A gesture started: remember the film as it is, file nothing yet. */
  const holding = useCallback(() => {
    /* Only if nothing is held already. A held arrow key repeats `keydown`, and
       re-reading the edit on each repeat would shrink the step to the last
       repeat alone — Back would then undo one key press out of fifty. */
    if (beforeDrag.current === null) beforeDrag.current = edit;
  }, [edit]);

  /** A gesture ended: file ONE step, covering everything it changed. */
  const held = useCallback(() => {
    const was = beforeDrag.current;
    beforeDrag.current = null;
    if (!was) return;
    setEdit((now) => {
      if (now === was) return now;
      setPast((steps) => [...steps, was].slice(-KEEP_STEPS));
      setFuture([]);
      return now;
    });
  }, []);

  /** The handlers a slider needs to be one press of Back, however far it goes. */
  const gesture = {
    onPointerDown: holding,
    onPointerUp: held,
    onPointerCancel: held,
    /* The arrow keys on a focused slider are a gesture too, and `onBlur` is
       the backstop for a pointer that went up somewhere this element never
       heard about. Both are no-ops when nothing is held. */
    onKeyDown: holding,
    onKeyUp: held,
    onBlur: held,
  };

  const tweak = useCallback((how: Partial<Omit<Piece, 'id'>>) => {
    if (!piece) return;
    commit((was) => change(was, piece.id, how));
  }, [piece, commit]);

  /**
   * The same change, but inside a gesture: no history step of its own.
   *
   * Falls back to `tweak` when nothing is being held, so a change that arrives
   * without a pointer or a key — a test filling the input, an assistive device
   * setting it directly — is still one step on the history rather than none at
   * all. Silently unrepeatable is worse than one step too many.
   */
  const slide = useCallback((how: Partial<Omit<Piece, 'id'>>) => {
    if (!piece) return;
    if (beforeDrag.current === null) { commit((was) => change(was, piece.id, how)); return; }
    setEdit((was) => change(was, piece.id, how));
  }, [piece, commit]);

  /** And the same, for a change to the film as a whole rather than a piece. */
  const slideFilm = useCallback((how: (was: Edit) => Edit) => {
    if (beforeDrag.current === null) { commit(how); return; }
    setEdit(how);
  }, [commit]);

  /* Scrubbing the bed. Horizontal, and it moves the SONG under a fixed
     window rather than moving the window: dragging left shows a later part,
     the same direction a tape moves when it is pulled. One history step for
     the whole drag, like the fades below. */
  const scrubBed = useCallback((event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const node = event.currentTarget;
    const startX = event.clientX;
    const startFrom = edit.underFrom ?? 0;
    const ceiling = Math.max(0, underLength - total);
    beforeDrag.current = edit;
    node.setPointerCapture(event.pointerId);

    const move = (m: PointerEvent) => {
      const by = (startX - m.clientX) / perSecond;
      const want = Math.round((startFrom + by) * 10) / 10;
      /* Clamped only once the length is known. Until then a scrub still
         works and simply cannot be stopped at the far end — which is better
         than refusing to move at all while the file is still being read. */
      const held = Math.max(0, underLength > 0 ? Math.min(ceiling, want) : want);
      setEdit((was) => ({ ...was, underFrom: held }));
    };
    const done = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', done);
      node.removeEventListener('pointercancel', done);
      try { node.releasePointerCapture(event.pointerId); } catch { /* already gone */ }
      const was = beforeDrag.current;
      beforeDrag.current = null;
      if (!was) return;
      setEdit((now) => {
        if (now === was) return now;
        setPast((steps) => [...steps, was].slice(-KEEP_STEPS));
        setFuture([]);
        return now;
      });
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', done);
    node.addEventListener('pointercancel', done);
  }, [edit, perSecond, total, underLength]);

  /* ── Dragging a fade, off the timeline ─────────────────────────────────

     Carli, 30 September 2026: *"Op die tydlyn kan mens aan die begin en einde
     van elke tydlyn 'n trek lyntjie in sit wat die in en uitfade moontlik maak
     om te trek."*

     The sliders below the strip stay — a number is the only way to say
     "exactly half a second" — but a fade is a thing you feel against the
     picture, and reaching for a slider in another card to set it is reaching
     away from the thing you are judging.

     ── One step back for a whole drag ───────────────────────────────────

     The drag writes with `setEdit` and not `commit`, on purpose. `commit`
     files a history step per call, and a drag across a strip is a few hundred
     calls — which would fill `KEEP_STEPS` with one gesture and leave Back
     meaning "a pixel and a half ago". The edit as it was is held at
     pointerdown and filed once, at the end, so one drag is one press of Back.

     ── And it must not scrub ────────────────────────────────────────────

     The handles sit on the track, whose `onPointerDown` moves the clock. So
     the event is stopped here: grabbing a fade handle and having the playhead
     jump under it is two answers to one gesture. */
  const takeFade = useCallback((which: 'in' | 'out', event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const node = event.currentTarget;
    const track = node.parentElement;
    if (!track || total <= 0) return;
    const box = track.getBoundingClientRect();
    beforeDrag.current = edit;
    node.setPointerCapture(event.pointerId);

    const move = (m: PointerEvent) => {
      const second = (m.clientX - box.left) / perSecond;
      const wanted = which === 'in' ? second : total - second;
      const held = Math.max(0, Math.min(LONGEST_FADE, Math.round(wanted * 10) / 10));
      setEdit((was) => (which === 'in' ? { ...was, fadeIn: held } : { ...was, fadeOut: held }));
    };
    const done = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', done);
      node.removeEventListener('pointercancel', done);
      try { node.releasePointerCapture(event.pointerId); } catch { /* already gone */ }
      const was = beforeDrag.current;
      beforeDrag.current = null;
      if (!was) return;
      /* Filed by hand rather than through `commit`, which would run the
         change a second time — the edit already holds the result. */
      setEdit((now) => {
        if (now === was) return now;
        setPast((steps) => [...steps, was].slice(-KEEP_STEPS));
        setFuture([]);
        return now;
      });
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', done);
    node.addEventListener('pointercancel', done);
  }, [edit, perSecond, total]);

  /* Dragging the mark. The same shape as the fade handles: pointer capture,
     fractions rather than pixels, and clamped so it cannot be pushed off the
     frame and left somewhere nobody can reach it again. */
  const dragOnFrame = useCallback((
    event: React.PointerEvent<HTMLElement>,
    put: (spot: { x: number; y: number }) => void,
    /* Called once, when the drag ends. The words pass `held` through it so one
       drag is one press of Back; the mark passes nothing, because where the
       mark sits is not on the `Edit` and was never on the history. */
    ended?: () => void,
  ) => {
    event.preventDefault();
    const node = event.currentTarget;
    const frame = node.parentElement;
    if (!frame) return;
    const box = frame.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    node.setPointerCapture(event.pointerId);

    const move = (m: PointerEvent) => {
      /* Through `penned`, which the nudge buttons also use. This used to clamp
         with its own two numbers and the nudge would have had a second pair —
         and a drag that stops at 0.97 beside a nudge that stops at 0.95 is two
         controls that disagree about where the frame ends. */
      put(penned({
        x: (m.clientX - box.left) / box.width,
        y: (m.clientY - box.top) / box.height,
      }));
    };
    const done = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', done);
      node.removeEventListener('pointercancel', done);
      try { node.releasePointerCapture(event.pointerId); } catch { /* already gone */ }
      ended?.();
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', done);
    node.addEventListener('pointercancel', done);
  }, []);

  /* ── Trimming by the edge of the block ──────────────────────────────────

     The most ordinary thing a timeline has, and this room did not have it: the
     ends of a piece were two number boxes in a card below. The boxes stay — a
     number is the only way to say "exactly half a second" — but the gesture
     somebody reaches for is the edge of the block, and until now the strip was
     the one place in this app you could see a length and not change it.

     The same shape as the fade handles above: pointer capture, the edit held at
     pointerdown and filed once at pointerup, and `stopPropagation` so grabbing an
     edge does not also scrub the track underneath.

     ── And it goes through `trim`, which owns every clamp ───────────────────

     A pixel on the strip is a FILM second; an edge of a window is a position in
     the FILE; a piece at two times covers two of the second per one of the first.
     That conversion and the four clamps — nought, `holds`, not crossing, and
     `SHORTEST_PIECE` apart — live in `videoedit.ts` where `check:cutmaths` reads
     them with numbers, not here where only a browser could. */
  const takeEdge = useCallback((
    which: 'from' | 'to',
    id: string,
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const node = event.currentTarget;
    const track = node.parentElement;
    if (!track || perSecond <= 0) return;
    const box = track.getBoundingClientRect();
    beforeDrag.current = edit;
    node.setPointerCapture(event.pointerId);

    const move = (m: PointerEvent) => {
      setEdit((was) => {
        const piece = was.pieces.find((one) => one.id === id);
        if (!piece) return was;
        /* Where the pointer is, on the FILM's clock... */
        const second = (m.clientX - box.left) / perSecond;
        /* ...turned into how far into this piece that is... */
        const into = second - startsAt(was, id);
        const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
        /* ...and then into a position in the FILE.
 
           The right edge is measured from the piece's own start, so dragging it
           sets `to` to "this much material from `from`". The left edge is a
           position in the material directly: moving it changes where in the file
           the window opens, and the block's left edge on the strip is wherever
           the pieces before it end. */
        return which === 'to'
          ? trim(was, id, 'to', piece.from + Math.max(0, into) * fast)
          : trim(was, id, 'from', piece.from + into * fast);
      });
    };
    const done = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', done);
      node.removeEventListener('pointercancel', done);
      try { node.releasePointerCapture(event.pointerId); } catch { /* already gone */ }
      held();
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', done);
    node.addEventListener('pointercancel', done);
  }, [edit, perSecond, held]);

  /* ── Resizing by the corner, on the picture ─────────────────────────────

     Carli, 30 September 2026: *"dit moet ook gemanipuleer moet kan word op die
     skerm van die video, deur dit rond te kan skuif, en groter en kleiner te kan
     maak."*

     She got the first half the same week. The second half has been a slider in
     another card ever since, which is reaching away from the thing being judged
     — the same objection that put the fade handles on the strip.

     ── Scaled by the distance from the middle, not by pixels ────────────────

     The size is multiplied by how much further out the thumb has got than where
     it started: a factor, not an offset. Three reasons, and the third is why.

     It needs no assumption about which way the thing is wider, so one function
     serves the logo (a share of the frame's WIDTH) and the words (a share of its
     HEIGHT) without either of them being a special case.

     It behaves the same on a 390-pixel phone and a 1200-pixel desk, because a
     factor has no units.

     And it works on a rotated element. The box of a turned overlay is its
     axis-aligned bounds, so its WIDTH is not its width — but its centre is
     still its centre, and a distance from the centre is still a distance.

     The centre is read once, at pointerdown. The overlay grows under the thumb
     and the centre does not move, because both overlays are positioned BY their
     centre — so re-reading it every frame would be measuring a box that is
     changing because of the thing being measured. */
  const grip = useCallback((
    event: React.PointerEvent<HTMLElement>,
    /** The size it is at now, in whatever unit the caller keeps it in. */
    from: number,
    put: (size: number) => void,
    least: number,
    most: number,
    /** Called once, when the drag ends. The words pass `held` through it. */
    ended?: () => void,
  ) => {
    event.preventDefault();
    /* Or the overlay underneath starts a move at the same time, and one gesture
       gets two answers — the fault the fade handles' own note describes. */
    event.stopPropagation();
    const node = event.currentTarget;
    const overlay = node.parentElement;
    if (!overlay) return;
    const box = overlay.getBoundingClientRect();
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const began = Math.hypot(event.clientX - middle.x, event.clientY - middle.y);
    /* A grab landing on the centre would divide by nearly nothing and send the
       size to its ceiling on the first pixel of movement. */
    if (began < 6) return;
    node.setPointerCapture(event.pointerId);

    const move = (m: PointerEvent) => {
      const now = Math.hypot(m.clientX - middle.x, m.clientY - middle.y);
      put(Math.max(least, Math.min(most, from * (now / began))));
    };
    const done = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', done);
      node.removeEventListener('pointercancel', done);
      try { node.releasePointerCapture(event.pointerId); } catch { /* already gone */ }
      ended?.();
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', done);
    node.addEventListener('pointercancel', done);
  }, []);

  const preview = useCallback(async () => {
    if (!edit.pieces.length || busy) return;
    setProblem('');
    setBusy('make');
    try {
      const result = await stitch({
        ...cutFrom(edit), mark, markCorner: corner, markAt, markShare,
        markTurn, markSolid, markUnder,
      });
      if (!result.ok) {
        setProblem(
          result.why === 'unsupported'
            ? t('edit.noRecord', 'This browser cannot record a film. Chrome or Edge can.')
            : t('edit.failed', 'That could not be put together just now.'),
        );
        return;
      }
      /* ── Paid for here, with the film already in hand ────────────

         Carli, 1 October 2026: *"Onthou dat hierdie ook 'n betaalde produk
         is wat krediete werd is."*

         After the render and before the film is handed over, which is the
         order `app/api/madehere` is written for: charging first would mean a
         refund path, a refund path needs an amount, and the only place a
         later request could get one is the browser. Charging for a film that
         exists needs none of that and can never charge for one that does not.

         A reference per attempt, so an answer lost on a bad connection and
         retried is one charge rather than two. */
      const ref = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      try {
        const answer = await fetch('/api/madehere', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          /* What is IN the film, as counts — never a price.
 
             The route runs `billFor` on these itself, which is the same
             function that put the number on the button she just agreed to. A
             browser that sent a figure would be a browser choosing what to pay.
 
             `result.seconds` and not `runs(edit)`: the length charged for is the
             length of the file that actually came out, measured off it. */
          body: JSON.stringify({
            kind: 'film',
            seconds: result.seconds,
            ref,
            inIt: inTheFilm(edit, Boolean(mark)),
          }),
        });
        const said = (await answer.json().catch(() => null)) as { message?: string } | null;
        if (!answer.ok) {
          /* Their words, not ours: `charge` says whether it is a sign-in, an
             empty balance or a plan, and each needs a different thing done
             about it. A sentence of our own here would be a guess at which. */
          setProblem(said?.message ?? t('edit.notPaid', 'That could not be paid for just now.'));
          return;
        }
      } catch {
        setProblem(t('edit.notPaid', 'That could not be paid for just now.'));
        return;
      }

      if (made_.current) URL.revokeObjectURL(made_.current);
      made_.current = URL.createObjectURL(result.blob);
      setMade({ url: made_.current, blob: result.blob, ext: result.ext, seconds: result.seconds });
    } catch {
      setProblem(t('edit.failed', 'That could not be put together just now.'));
    } finally {
      setBusy(null);
    }
  }, [edit, busy, mark, corner, markAt, markShare, markTurn, markSolid, markUnder, t]);

  if (!allowed) {
    return (
      <Card title={t('edit.title', 'Video editor')} icon={<Film className="w-4 h-4" />}>
        <div data-editorlocked className="space-y-3">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t(
              'edit.locked',
              'The editor comes with every paid plan — a timeline you cut on, fades, sound under it, the looks and an export.',
            )}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'edit.lockedFree',
              'Sketching a video in your own browser stays free and always will. This is the version with a clock under it.',
            )}
          </p>
          {onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              data-editorupgrade
              className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 inline-flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {t('edit.seePlans', 'See the plans')}
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-videoeditor>
      <Card title={t('edit.title', 'Video editor')} icon={<Film className="w-4 h-4" />}>
        <div className="space-y-4">
          <Note>
            {t(
              'edit.what',
              'Bring your own clips in, cut them on the clock, and take the film out. Everything on this page happens on your own device — no credits, no queue, no waiting.',
            )}
          </Note>

          {/* ── Bring the material in ──────────────────────────────── */}
          <label
            data-editorbring
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 cursor-pointer hover:border-zinc-600"
          >
            {busy === 'bring' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('edit.bring', 'Bring clips in')}
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(event) => { void bringIn(event.target.files); event.target.value = ''; }}
            />
          </label>

          {/* ── Take it back ────────────────────────────────────────────
 
              Beside the way in rather than beside each thing it undoes: one
              pair of buttons for the whole room is what every editor does,
              and a per-control undo is a room full of arrows.
 
              Disabled rather than hidden when there is nothing to take back.
              A button that appears and disappears moves everything beside it,
              and on a phone that means pressing the wrong thing. */}
          <div className="flex gap-2">
            <button
              type="button"
              data-editorundo
              disabled={past.length === 0}
              onClick={stepBack}
              title={t('edit.undo', 'Take back the last change')}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Undo2 className="w-4 h-4" />
              {t('edit.undoShort', 'Back')}
            </button>
            <button
              type="button"
              data-editorredo
              disabled={future.length === 0}
              onClick={stepForward}
              title={t('edit.redo', 'Put the change back')}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Redo2 className="w-4 h-4" />
              {t('edit.redoShort', 'Forward')}
            </button>
          </div>

          {/* ── The shape, which changes what you are looking at ────── */}
          <div className="space-y-1.5">
            <span className="text-sm text-zinc-400">{t('edit.shape', 'Shape')}</span>
            <div className="flex gap-2">
              {(Object.keys(SHAPES) as (keyof typeof SHAPES)[]).map((one) => {
                const on = (edit.shape ?? 'tall') === one;
                return (
                  <button
                    key={one}
                    type="button"
                    aria-pressed={on}
                    data-editorshape={one}
                    onClick={() => commit((was) => ({ ...was, shape: one }))}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                      on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {one === 'tall' ? t('edit.tall', 'Tall') : one === 'wide' ? t('edit.wide', 'Wide') : t('edit.square', 'Square')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── The clock ────────────────────────────────────────────────
 
              Carli, 29 September: *"dit moet seker ook op 'n tydlyn wees.
              Die ordentlike editor."*
 
              The first version drew the pieces as blocks in a row, sized by
              how long each ran as a SHARE of the whole. That reads as a
              proportion and not as time: a ten-second piece and a ten-second
              piece next to a two-minute one were both slivers, and there was
              nowhere to point at "eighteen seconds in".
 
              So it is a real clock now. Seconds are pixels — `PER_SECOND` of
              them — the strip is as wide as the film is long and scrolls, a
              ruler above it carries the marks, and a playhead says where you
              are. Tap anywhere on it and the viewer shows that frame.
 
              The width is the honest part: a three-minute film is a
              three-minute strip. A timeline that squeezes to fit is a
              proportion bar wearing a ruler. */}
          {edit.pieces.length === 0 ? (
            <p className="text-sm text-zinc-500 leading-relaxed" data-editorempty>
              {t('edit.nothing', 'Nothing on the clock yet. Bring a clip in and it appears here as a block you can cut.')}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-zinc-400">{t('edit.clock', 'The clock')}</span>
                <span className="text-sm text-zinc-500" data-editorruns>
                  {seconds(at)} / {seconds(total)}
                </span>
              </div>

              <div
                ref={strip}
                /* sideways on purpose, and only past the floor: `perSecond`
                   fits the film to this strip, so everything this app makes —
                   Veo's lengths are four, six and eight seconds — fills the
                   width and stays still. It scrolls only below
                   `LEAST_PER_SECOND`, where a film really is longer than a
                   phone and the alternative is blocks half a pixel wide. */
                className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950"
                data-editorstrip
              >
                <div style={{ width: Math.max(stripWidth || 280, total * perSecond) }} className="relative select-none">
                  {/* The ruler. A mark every `stepFor` seconds, so a
                      ten-second film is marked every second and a five-minute
                      one every thirty — the alternative is either three marks
                      or three hundred. */}
                  <div className="relative h-5 border-b border-zinc-800" data-editorruler>
                    {Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step).map((mark) => (
                      <span
                        key={mark}
                        style={{ left: mark * perSecond }}
                        className="absolute top-0 h-full border-l border-zinc-700 pl-1 text-[10px] leading-5 text-zinc-500"
                      >
                        {seconds(mark)}
                      </span>
                    ))}
                  </div>

                  {/* The blocks, at their real place in time. */}
                  <div
                    className="relative h-16"
                    data-editortrack
                    data-persecond={perSecond.toFixed(3)}
                    onPointerDown={(event) => {
                      const box = event.currentTarget.getBoundingClientRect();
                      scrubTo((event.clientX - box.left) / perSecond);
                    }}
                  >
                    {edit.pieces.map((one) => {
                      const from = startsAt(edit, one.id);
                      const wide = lengthOfPiece(one) * perSecond;
                      const on = one.id === picked;
                      return (
                        <button
                          key={one.id}
                          type="button"
                          aria-pressed={on}
                          data-editorblock
                          onClick={() => setPicked(one.id)}
                          style={{ left: from * perSecond, width: Math.max(THINNEST, wide) }}
                          className={`absolute top-1 bottom-1 overflow-hidden rounded-lg border-2 px-2 py-1 text-left ${
                            on ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          <span className="block truncate text-[11px] font-semibold text-zinc-200">{one.name}</span>
                          <span className="block text-[11px] text-zinc-500">{seconds(lengthOfPiece(one))}</span>
                        </button>
                      );
                    })}

                    {/* ── The joins, where they actually are ────────────────

                        A mark on the strip at every join that is not a hard
                        cut, as wide as the join really lasts.

                        Here rather than only in the inspector, because a
                        transition is the one control in this room whose effect
                        cannot be seen in the preview: the preview plays one
                        piece at a time and a join is the seam between two. The
                        strip is the honest answer — she can see WHERE it is and
                        HOW LONG it is, measured through `joinFits` so the mark
                        is the join's real length and not the slider's number.

                        Pointer-events off, so it never eats a tap meant for the
                        block underneath or for the track. */}
                    {edit.pieces.map((one, i) => {
                      if (i === 0) return null;
                      const kind = one.join ?? 'cut';
                      if (kind === 'cut') return null;
                      const lasts = joinFits(one.joinFor ?? JOIN_FOR, lengthOfPiece(one));
                      if (lasts <= 0) return null;
                      const at = startsAt(edit, one.id) * perSecond;
                      return (
                        <div
                          key={`join-${one.id}`}
                          data-editorjoinmark={kind}
                          title={joinName(kind, lang)}
                          style={{ left: at, width: Math.max(4, lasts * perSecond) }}
                          className="pointer-events-none absolute top-0 h-full border-x border-emerald-400/70 bg-emerald-400/25"
                        />
                      );
                    })}

                    {/* ── The ends of the picked piece, as something to pull ──

                        Only on the piece that is picked. Handles on every block
                        at once is eight grab targets in a 334-pixel strip, and
                        the thing somebody is trimming is the thing they just
                        tapped. Every editor that has these shows them on the
                        selection.

                        ── What each one looks like it does, and what it does ──

                        The right edge follows the thumb exactly: drag it left and
                        the block ends there.

                        The left edge does NOT move under the thumb, and that is
                        worth saying rather than hiding. This strip has no gaps —
                        pieces are laid end to end — so where a block STARTS on the
                        film's clock is decided by the pieces before it, and
                        nothing about trimming this one's in-point can change it.
                        Dragging it right takes material off the start, so the
                        block gets shorter at its far end and the pieces after it
                        slide left.

                        What makes that legible is the picture: the viewer seeks to
                        the new start as it moves, so she is watching the frame the
                        piece will now open on. That is the feedback that matters,
                        and it was already there — the effect that seeks on a
                        changed `from` has been in this room since the trim boxes
                        were. */}
                    {picked && edit.pieces.some((one) => one.id === picked) && (() => {
                      const one = edit.pieces.find((two) => two.id === picked);
                      if (!one) return null;
                      const opens = startsAt(edit, one.id) * perSecond;
                      const shuts = opens + lengthOfPiece(one) * perSecond;
                      return (
                        <>
                          <div
                            data-editortrimfrom
                            role="slider"
                            aria-label={t('edit.trimFrom', 'Where it starts in the clip')}
                            aria-valuemin={0}
                            aria-valuemax={one.holds ?? one.to}
                            aria-valuenow={one.from}
                            tabIndex={0}
                            onPointerDown={(event) => takeEdge('from', one.id, event)}
                            onKeyDown={(event) => {
                              const by = event.key === 'ArrowRight' ? 0.1
                                : event.key === 'ArrowLeft' ? -0.1 : 0;
                              if (!by) return;
                              event.preventDefault();
                              commit((was) => trim(was, one.id, 'from', one.from + by));
                            }}
                            style={{ left: Math.max(0, opens - 1) }}
                            className="absolute top-0 h-full w-3.5 cursor-ew-resize touch-none"
                          >
                            <span className="pointer-events-none absolute inset-y-1 left-0 w-1 rounded-full bg-emerald-400" />
                          </div>
                          <div
                            data-editortrimto
                            role="slider"
                            aria-label={t('edit.trimTo', 'Where it ends in the clip')}
                            aria-valuemin={0}
                            aria-valuemax={one.holds ?? one.to}
                            aria-valuenow={one.to}
                            tabIndex={0}
                            onPointerDown={(event) => takeEdge('to', one.id, event)}
                            onKeyDown={(event) => {
                              const by = event.key === 'ArrowRight' ? 0.1
                                : event.key === 'ArrowLeft' ? -0.1 : 0;
                              if (!by) return;
                              event.preventDefault();
                              commit((was) => trim(was, one.id, 'to', one.to + by));
                            }}
                            style={{ left: Math.max(0, shuts - 12) }}
                            className="absolute top-0 h-full w-3.5 cursor-ew-resize touch-none"
                          >
                            <span className="pointer-events-none absolute inset-y-1 right-0 w-1 rounded-full bg-emerald-400" />
                          </div>
                        </>
                      );
                    })()}

                    {/* ── The fades, as something to pull ──────────────────

                        A shaded wedge at each end showing what is being faded,
                        and a handle on its inside edge to drag. The wedge
                        ignores pointers so it never eats a tap meant for a
                        block; only the handle takes one. */}
                    {fades.in > 0 && (
                      <div
                        style={{ width: fades.in * perSecond }}
                        className="pointer-events-none absolute inset-y-0 left-0 rounded-l-lg bg-gradient-to-r from-black/80 to-transparent"
                      />
                    )}
                    {fades.out > 0 && (
                      <div
                        style={{ width: fades.out * perSecond }}
                        className="pointer-events-none absolute inset-y-0 right-0 rounded-r-lg bg-gradient-to-l from-black/80 to-transparent"
                      />
                    )}
                    <div
                      data-editorfadeinhandle
                      role="slider"
                      aria-label={t('edit.fadeIn', 'Fade in')}
                      aria-valuemin={0}
                      aria-valuemax={LONGEST_FADE}
                      aria-valuenow={fades.in}
                      tabIndex={0}
                      onPointerDown={(event) => takeFade('in', event)}
                      onKeyDown={(event) => {
                        const by = event.key === 'ArrowRight' ? 0.1 : event.key === 'ArrowLeft' ? -0.1 : 0;
                        if (!by) return;
                        event.preventDefault();
                        commit((was) => ({
                          ...was,
                          fadeIn: Math.max(0, Math.min(LONGEST_FADE, Math.round(((was.fadeIn ?? 0) + by) * 10) / 10)),
                        }));
                      }}
                      style={{ left: Math.max(0, fades.in * perSecond - 7) }}
                      className="absolute top-0 h-full w-3.5 cursor-ew-resize touch-none"
                    >
                      <span className="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-amber-400/90" />
                    </div>
                    <div
                      data-editorfadeouthandle
                      role="slider"
                      aria-label={t('edit.fadeOut', 'Fade out')}
                      aria-valuemin={0}
                      aria-valuemax={LONGEST_FADE}
                      aria-valuenow={fades.out}
                      tabIndex={0}
                      onPointerDown={(event) => takeFade('out', event)}
                      onKeyDown={(event) => {
                        const by = event.key === 'ArrowLeft' ? 0.1 : event.key === 'ArrowRight' ? -0.1 : 0;
                        if (!by) return;
                        event.preventDefault();
                        commit((was) => ({
                          ...was,
                          fadeOut: Math.max(0, Math.min(LONGEST_FADE, Math.round(((was.fadeOut ?? 0) + by) * 10) / 10)),
                        }));
                      }}
                      style={{ right: Math.max(0, fades.out * perSecond - 7) }}
                      className="absolute top-0 h-full w-3.5 cursor-ew-resize touch-none"
                    >
                      <span className="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-amber-400/90" />
                    </div>

                    {/* The playhead. Drawn over the blocks and ignoring
                        pointers, so tapping "on the line" still reaches the
                        track underneath and moves it. */}
                    <div
                      data-editorplayhead
                      style={{ left: Math.min(at, total) * perSecond }}
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400"
                    >
                      <span className="absolute -top-1 -left-1 block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>

                  {/* ── The sound, on a lane of its own ──────────────────

                      Carli, 30 September 2026: *"dan moet dit soos die
                      probooth die tydlyne hê, asook vir die klank."*

                      Inside the same scrolling strip as the blocks, which is
                      the only way the two can be read against each other: a
                      lane in its own box at its own width is a second picture
                      of time, and two pictures of time that do not line up
                      are worse than one.

                      Two things are drawn. The bed runs the whole film,
                      because that is what a bed does — dragging it does not
                      move it along the film, it scrubs WHICH PART of the song
                      is used, which is the only thing about it there is to
                      choose. And a mark under every piece that carries its
                      own sound, so "why can I hear a room" has an answer you
                      can see rather than six checkboxes to go and open. */}
                  <div className="relative h-10 border-t border-zinc-800" data-editorsoundlane>
                    {edit.under ? (
                      <div
                        data-editorbed
                        onPointerDown={(event) => scrubBed(event)}
                        style={{ width: Math.max(0, total * perSecond) }}
                        className="absolute inset-y-1 left-0 cursor-ew-resize touch-none overflow-hidden rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1"
                      >
                        <span className="block truncate text-[11px] font-semibold text-sky-200">
                          {t('edit.bed', 'Track under it')}
                        </span>
                        <span className="block text-[11px] text-sky-300/70">
                          {t('edit.bedFrom', 'From')} {seconds(edit.underFrom ?? 0)}
                          {underLength > 0 ? ` / ${seconds(underLength)}` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="absolute inset-y-0 left-2 flex items-center text-[11px] text-zinc-600">
                        {t('edit.noBed', 'No track under it yet')}
                      </span>
                    )}

                    {edit.pieces.filter((one) => one.sound).map((one) => (
                      <span
                        key={one.id}
                        data-editorownsound
                        style={{
                          left: startsAt(edit, one.id) * perSecond,
                          width: Math.max(THINNEST, lengthOfPiece(one) * perSecond),
                        }}
                        className="pointer-events-none absolute bottom-0 h-1 rounded-full bg-emerald-400/80"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Playing the whole film in place, rather than only on export.
                  It hops the viewer from piece to piece as the clock runs,
                  which is the one thing that makes a timeline a timeline and
                  not a list of files. */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  data-editorplayall
                  onClick={() => setRunning((was) => !was)}
                  className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
                >
                  {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {running ? t('edit.pause', 'Pause') : t('edit.playAll', 'Play the film')}
                </button>
                <button
                  type="button"
                  data-editorrewind
                  onClick={() => { setRunning(false); scrubTo(0); }}
                  className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
                >
                  <SkipBack className="w-4 h-4" />
                  {t('edit.rewind', 'Back to the start')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── The piece you picked ───────────────────────────────────────
 
          Not a Card, and that is a decision rather than an oversight.
 
          Every card in this app starts folded, which is right for a room
          somebody is reading and wrong for the panel that exists BECAUSE
          they just picked something. `check:editor` caught it the first time
          it ran: a clip went in, a block appeared, and the controls for that
          block were behind a fold nobody asked for.
 
          `openOn` looked like the fix and is not — a Card skips the first
          change on purpose, so a panel that mounts already picked mounts
          shut. Which is the tell that this was never a card. A card folds
          because a room is long; an inspector that folds is a control panel
          hiding itself from the person holding it. */}
      {piece && (
        <section
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4"
          data-editorpiece
        >
          <h3 className="text-sm font-semibold text-zinc-100 inline-flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            {piece.name}
          </h3>

          {/* ── You were cutting blind ─────────────────────────────────────
 
              The first version of this panel had two number boxes and no
              picture. "Starts at 3.4" is not a decision anybody can make
              about a shot they cannot see — it is a guess, checked by
              exporting the whole film and watching it.
 
              So the piece is on screen, the look is on it, and moving either
              end seeks to that end. Watching the frame you are trimming TO is
              the entire job.
 
              `filterCss` is the same function the render uses, so the frame
              here and the frame in the finished film cannot disagree. */}
          {/* ── The picture, with the mark on it where it will really be ──

              Carli, 30 September 2026: *"Mens moet die logo foto fisies moet
              kan skuif."*

              The mark is drawn over the viewer rather than beside it, because
              the only useful question about a logo is what it covers. Four
              corner buttons cannot answer that: in a vertical clip of a
              person, the corner that is free depends on where the person is
              standing, and often none of them is.

              Positioned from the same fractions `drawMark` uses, so what is
              under her thumb here is what lands in the film. */}
          {/* The frame is measured rather than asked to measure itself.

              This was `@container` with the words sized in `cqh`, which is
              the elegant version and the one that can fail quietly: container
              queries are a Tailwind plugin in v3, the class compiles to
              nothing without it, and `cqh` then falls back to a font size of
              nought — words that vanish, with no error anywhere. A measured
              height cannot do that. */}

          {/* ── Zooming the picture ────────────────────────────────────────

              Carli, 30 September 2026: *"mens moet op die prent van die video
              kan kliek en in en uit zoom."*

              This zooms the PREVIEW and not the film. It is the magnifying
              glass over the thing being worked on, not a punch-in on the
              shot — nothing below changes a single frame of what comes out,
              and that is deliberate: she asked for it in the same breath as
              moving the logo and placing the words, which are the two jobs
              that are guesswork at 390 pixels wide.

              A punch-in on the shot itself is a different and also useful
              thing, and it is not this. Saying so here because "zoom" means
              both, and shipping the wrong one silently would be worse than
              shipping neither.

              The overlays scale with the picture because they are positioned
              in percentages inside the same box, so a logo placed at 2x is
              still in the same place at 1x. */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-zinc-500" data-editorzoomnow>{`${zoom}×`}</span>
            <button
              type="button"
              data-editorzoomout
              disabled={zoom <= 1}
              onClick={() => setZoom((was) => Math.max(1, was - 1))}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 disabled:opacity-40"
            >
              &minus;
            </button>
            <button
              type="button"
              data-editorzoomin
              disabled={zoom >= 4}
              onClick={() => setZoom((was) => Math.min(4, was + 1))}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 disabled:opacity-40"
            >
              +
            </button>
          </div>

          {/* sideways on purpose: only ever at a zoom she has chosen. At 1x
              the inner box is exactly the outer one and there is nothing to
              scroll; above it, panning IS the feature, and native scrolling
              is the only panning that behaves like the phone it is on. */}
          <div
            data-editorzoombox
            className={zoom > 1 ? 'overflow-auto rounded-xl' : ''}
          >
          <div
            ref={frame}
            data-editorframe
            /* The FILM's shape, not the clip's. The box is the frame, so a
               fraction means the same thing here as it does in the render —
               and the black bars somebody's clip will really have are the
               black of this box showing through `object-contain`. */
            style={{
              aspectRatio: `${shape.width} / ${shape.height}`,
              ...(zoom > 1 ? { width: `${zoom * 100}%` } : {}),
            }}
            className="relative origin-top-left overflow-hidden rounded-xl border border-zinc-800 bg-black"
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={viewer}
              data-editorviewer
              src={source ?? undefined}
              playsInline
              muted={!piece.sound}
              style={{ filter: filterCss(piece.look) || undefined }}
              /* `contain` or `cover`, from the same flag the renderer reads, so
                 the bars she sees are the bars she gets. */
              className={`absolute inset-0 h-full w-full ${
                piece.fill ? 'object-cover' : 'object-contain'
              }`}
            />
            {(piece.words ?? '').trim().length > 0 && (
              <div
                data-editorwordsdrag
                /* Through `holding`/`held` and `slide`, not `tweak`: a drag
                   across the frame is a few hundred pointermoves, and one of
                   them per history step was the other half of the fault the
                   note beside `beforeDrag` describes. One drag, one Back. */
                onPointerDown={(event) => {
                  holding();
                  dragOnFrame(event, (spot) => slide({ wordsAt: spot }), held);
                }}
                style={{
                  left: `${(piece.wordsAt?.x ?? WORDS_AT.x) * 100}%`,
                  top: `${(piece.wordsAt?.y ?? WORDS_AT.y) * 100}%`,
                  fontFamily: fontFor(piece.wordsFont).stack,
                  fontWeight: fontFor(piece.wordsFont).weight,
                  fontSize: Math.max(9, (piece.wordsSize ?? 0.048) * frameHeight),
                  maxWidth: '86%',
                  /* The centring is in the transform rather than in a
                     `-translate-x-1/2` class, because an inline `transform`
                     replaces the whole property and would have thrown the
                     Tailwind translate away — the words would have hung off to
                     the right of where they land in the film, which is the
                     quiet kind of wrong this preview exists to prevent. */
                  transform: `translate(-50%, -50%) rotate(${piece.wordsTurn ?? 0}deg)`,
                  opacity: piece.wordsSolid ?? 1,
                  /* Approximate, and said so rather than implied: the renderer
                     rounds against the band's MEASURED height, and the band
                     here is a div that has not been measured. It moves the
                     right way and lands within a pixel or two of the film. */
                  borderRadius: (piece.wordsRound ?? CAPTION_ROUND)
                    * Math.max(9, (piece.wordsSize ?? 0.048) * frameHeight),
                  zIndex: 2,
                }}
                className="absolute cursor-move touch-none select-none bg-black/60 px-2 py-1 text-center leading-tight text-white outline-dashed outline-1 outline-emerald-400/50"
              >
                {piece.words}
                {/* The corner. Sits half outside the band so the whole of it is
                    grabbable without covering a letter, and `touch-none` so a
                    phone does not scroll the page instead. */}
                <span
                  data-editorwordsgrip
                  onPointerDown={(event) => {
                    holding();
                    grip(
                      event, piece.wordsSize ?? 0.048,
                      (size) => slide({ wordsSize: size }),
                      WORDS_SMALLEST, WORDS_LARGEST, held,
                    );
                  }}
                  className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-emerald-400 bg-zinc-950"
                />
              </div>
            )}
            {mark && (
              /* Wrapped rather than left as a bare `<img>`, so the corner handle
                 has something to sit in the corner OF. The wrapper carries the
                 place, the size and the turn; the picture fills it. */
              <div
                data-editormarkdrag
                onPointerDown={(event) => dragOnFrame(event, setMarkAt)}
                style={{
                  width: `${markShare * 100}%`,
                  left: `${(markAt ? markAt.x : CORNER_AT[corner].x) * 100}%`,
                  top: `${(markAt ? markAt.y : CORNER_AT[corner].y) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${markTurn}deg)`,
                  /* `markSolid`, not the `opacity-80` class that was here. The
                     class was a third opacity — the render used
                     `MARK_OPACITY`, 0.92, and the preview showed 0.80, so the
                     logo was always slightly fainter here than in the film.
                     Reading the slider fixes a disagreement as well as adding
                     a control. */
                  opacity: markSolid,
                  zIndex: markUnder ? 1 : 3,
                }}
                className="absolute cursor-move touch-none select-none outline-dashed outline-1 outline-emerald-400/50"
              >
                <img src={mark.src} alt="" draggable={false} className="block w-full" />
                <span
                  data-editormarkgrip
                  onPointerDown={(event) => grip(
                    event, markShare, setMarkShare, MARK_SMALLEST, MARK_LARGEST,
                  )}
                  className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-emerald-400 bg-zinc-950"
                />
              </div>
            )}
          </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              data-editorplaypiece
              onClick={() => {
                const v = viewer.current;
                if (!v) return;
                v.currentTime = piece.from;
                void v.play();
              }}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" />
              {t('edit.playPiece', 'Play this piece')}
            </button>
            <span className="self-center text-sm text-zinc-500" data-editorpiecelen>
              {seconds(lengthOfPiece(piece))}
            </span>
          </div>

          <div className="space-y-4">
            {/* Trim. Two numbers rather than a drag: a drag on a phone is a
                guess, and the thing somebody wants is usually "start half a
                second later", which is a number. */}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block text-sm text-zinc-400">{t('edit.from', 'Starts at')}</span>
                <input
                  type="number" step="0.1" min={0} max={Math.max(0, piece.to - SHORTEST_PIECE)}
                  value={piece.from.toFixed(1)}
                  data-editorfrom
                  onChange={(e) => tweak({ from: Number(e.target.value) })}
                  className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-sm text-zinc-400">{t('edit.to', 'Ends at')}</span>
                <input
                  type="number" step="0.1" min={piece.from + SHORTEST_PIECE}
                  value={piece.to.toFixed(1)}
                  data-editorto
                  onChange={(e) => tweak({ to: Number(e.target.value) })}
                  className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
            </div>

            {/* ── Fill the frame, or fit the whole picture in ─────────────

                A wide clip in a vertical film is letterboxed, with the blurred
                wash behind the bars. That is right for an establishing shot and
                wrong for a face, so it is a choice per piece rather than one
                answer for the film.

                `covering` has been in `stitch.ts` since it was written, for the
                background. This points it at the picture, so there is one piece
                of arithmetic for "fill this frame" and the preview's
                `object-cover` is showing the same crop. */}
            <button
              type="button"
              aria-pressed={piece.fill === true}
              data-editorfill
              onClick={() => tweak({ fill: !piece.fill })}
              className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                piece.fill ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
              }`}
            >
              <Crop className="w-4 h-4" />
              {piece.fill
                ? t('edit.fillOn', 'Filling the frame, sides cropped')
                : t('edit.fillOff', 'Whole picture, bars where it does not fit')}
            </button>

            {/* ── How it arrives after the piece before it ────────────────

                Carli, 3 October 2026: *"net 'n praktiese video editing en die
                elemente wat moontlik is."* Every join in this room was a hard
                cut until now, which is the most ordinary thing a timeline
                editor has and the most obvious thing ours was missing.

                Only from the second piece on. The first piece of a film has
                nothing behind it to arrive from, and a picker offering a
                dissolve there would be a control that does nothing — which this
                app treats as worse than a control that is absent.

                `videojoins.ts` holds every number and the honest note about
                what the outgoing half of a dissolve is in this renderer: one
                `<video>` decodes at a time, so it is the last frame of the shot
                before, held. At six tenths of a second that is invisible; two
                seconds of it would be a freeze, which is why six tenths is the
                ceiling. */}
            {startsAt(edit, piece.id) > 0 && (
              <div className="space-y-1.5">
                <span className="text-sm text-zinc-400 inline-flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5" />
                  {t('edit.join', 'How it comes in')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {JOINS.map((one) => {
                    const on = (piece.join ?? 'cut') === one.id;
                    return (
                      <button
                        key={one.id}
                        type="button"
                        aria-pressed={on}
                        data-editorjoin={one.id}
                        onClick={() => tweak({ join: one.id })}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                          on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {joinName(one.id, lang)}
                      </button>
                    );
                  })}
                </div>
                {(piece.join ?? 'cut') !== 'cut' && (
                  <label className="block space-y-1.5">
                    <span className="block text-sm text-zinc-400">
                      {t('edit.joinFor', 'How long it takes')}
                    </span>
                    <input
                      type="range" min={0.1} max={LONGEST_JOIN} step={0.05}
                      value={piece.joinFor ?? JOIN_FOR}
                      data-editorjoinfor
                      {...gesture}
                      onChange={(e) => slide({ joinFor: Number(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                    {/* What it will REALLY be, not what the slider says. A
                        join is capped at half the piece it arrives on, so a
                        six-tenth join on a four-tenth shot is two tenths —
                        and a slider reading 0.6 over a join that lasts 0.2
                        is a control that lies about itself. */}
                    <span className="block text-sm text-zinc-500" data-editorjoinnow>
                      {seconds(joinFits(piece.joinFor ?? JOIN_FOR, lengthOfPiece(piece)))}
                      {needsHeld(piece.join ?? 'cut')
                        ? ` · ${t('edit.joinHeld', 'over the frame the last shot left')}`
                        : ''}
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* ── How fast it plays ────────────────────────────────────

                A clip's speed is the one control on it that changes how LONG
                the piece is as well as how it looks — which is why
                `lengthOfPiece` divides by it. A four-second take
                at two times is two seconds of film, the strip draws it two
                seconds wide, and the ruler under it still tells the truth.

                Nought-point-five to two, not nought-point-one to four, though
                the model carries the wider range: past two the browser drops
                the audio and the picture stutters, and a slider that can be
                put somewhere the export looks broken is a slider that makes
                support calls. */}
            <label className="block space-y-1.5">
              <span className="block text-sm text-zinc-400 inline-flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                {t('edit.speed', 'How fast it plays')}
              </span>
              <input
                type="range" min={0.5} max={2} step={0.05}
                value={piece.speed ?? 1}
                data-editorspeed
                {...gesture}
                onChange={(e) => slide({ speed: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
              <span className="block text-sm text-zinc-500" data-editorspeednow>
                {`${(piece.speed ?? 1).toFixed(2)}×`}
              </span>
            </label>

            {/* The looks. Seven, free, and applied in the browser — the same
                `filterCss` the render uses, so the preview swatch and the
                finished film cannot disagree. */}
            <div className="space-y-1.5">
              <span className="text-sm text-zinc-400">{t('edit.look', 'Look')}</span>
              {/* Wrapped, not scrolled. Seven looks at `shrink-0` came to 644
                  pixels in a 334 pixel strip, so this was the second thing on
                  this desk that moved under a thumb. Three rows of buttons
                  that stay still beat one row that slides — and a look nobody
                  scrolled to is a look nobody knows is there. */}
              <div className="flex flex-wrap gap-2 pb-1">
                {FILTERS.map((one) => {
                  const on = (piece.look ?? 'none') === one.id;
                  return (
                    <button
                      key={one.id}
                      type="button"
                      aria-pressed={on}
                      data-editorlook={one.id}
                      onClick={() => tweak({ look: one.id })}
                      style={{ filter: filterCss(one.id) || undefined }}
                      className={`min-h-[44px] shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      {filterName(one.id, 'en')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Words over the piece. */}
            <label className="space-y-1.5 block">
              <span className="text-sm text-zinc-400 inline-flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                {t('edit.words', 'Words on screen')}
              </span>
              <input
                type="text"
                value={piece.words ?? ''}
                data-editorwords
                placeholder={t('edit.wordsAsk', 'Up for as long as this piece is')}
                onChange={(e) => tweak({ words: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
            </label>

            {/* ── How those words are set ────────────────────────────────

                Carli, 30 September 2026: *"Die teks moet font opsies hê, en
                dit moet ook gemanipuleer moet kan word op die skerm van die
                video, deur dit rond te kan skuif, en groter en kleiner te kan
                maak."*

                Only shown once there are words. A font picker over an empty
                caption is three rows of controls for a thing that is not on
                the screen. */}
            {(piece.words ?? '').trim().length > 0 && (
              <>
                <div className="space-y-1.5">
                  <span className="block text-sm text-zinc-400">{t('edit.font', 'The face')}</span>
                  <div className="flex flex-wrap gap-2">
                    {FONTS.map((one) => {
                      const on = (piece.wordsFont ?? PLAIN_FONT) === one.id;
                      return (
                        <button
                          key={one.id}
                          type="button"
                          aria-pressed={on}
                          data-editorfont={one.id}
                          onClick={() => tweak({ wordsFont: one.id })}
                          style={{ fontFamily: one.stack, fontWeight: one.weight }}
                          className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm ${
                            on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                          }`}
                        >
                          {lang === 'af' ? one.af : one.en}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block space-y-1.5">
                  <span className="block text-sm text-zinc-400">
                    {t('edit.wordsSize', 'How big the words are')}
                  </span>
                  <input
                    type="range"
                    min={WORDS_SMALLEST}
                    max={WORDS_LARGEST}
                    step={0.002}
                    value={piece.wordsSize ?? 0.048}
                    data-editorwordssize
                    {...gesture}
                    onChange={(e) => slide({ wordsSize: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </label>

                {/* ── Turned, faint, and round ───────────────────────────

                    Carli, 2 October 2026: *"Kyk asb na hierdie, hoe 'n video
                    editor prakties lyk, asook die elemente wat dit het."* And
                    the day after, correcting me: *"Hierdie is hoe meeste video
                    editing programme lyk."*

                    Turned, how solid, how round: the ordinary handles on
                    anything sitting on a frame. They are what makes a caption
                    an element somebody is designing with rather than a subtitle
                    the renderer decided on. All three were already in
                    `drawCaption`; these are the handles. */}
                <label className="block space-y-1.5">
                  <span className="block text-sm text-zinc-400 inline-flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" />
                    {t('edit.wordsTurn', 'Turned')}
                  </span>
                  <input
                    type="range" min={-180} max={180} step={1}
                    value={piece.wordsTurn ?? 0}
                    data-editorwordsturn
                    {...gesture}
                    onChange={(e) => slide({ wordsTurn: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                  <span className="block text-sm text-zinc-500" data-editorwordsturnnow>
                    {`${Math.round(piece.wordsTurn ?? 0)}°`}
                  </span>
                </label>

                <label className="block space-y-1.5">
                  <span className="block text-sm text-zinc-400">
                    {t('edit.wordsSolid', 'How solid the words are')}
                  </span>
                  <input
                    type="range" min={0.1} max={1} step={0.05}
                    value={piece.wordsSolid ?? 1}
                    data-editorwordssolid
                    {...gesture}
                    onChange={(e) => slide({ wordsSolid: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="block text-sm text-zinc-400">
                    {t('edit.wordsRound', 'How round the band behind them is')}
                  </span>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={piece.wordsRound ?? CAPTION_ROUND}
                    data-editorwordsround
                    {...gesture}
                    onChange={(e) => slide({ wordsRound: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </label>

                <Placing
                  which="words"
                  at={piece.wordsAt ?? WORDS_AT}
                  put={(spot) => tweak({ wordsAt: spot })}
                />

                {piece.wordsAt && (
                  <button
                    type="button"
                    data-editorwordsreset
                    onClick={() => tweak({ wordsAt: null })}
                    className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300"
                  >
                    {t('edit.wordsBottom', 'Put the words back at the bottom')}
                  </button>
                )}
              </>
            )}

            {/* This piece's own sound. Off by default — most material is room
                tone, and a bed of six rooms at once is noise. */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                aria-pressed={piece.sound === true}
                data-editorsound
                onClick={() => tweak({ sound: !piece.sound })}
                className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                  piece.sound ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                }`}
              >
                {piece.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {piece.sound ? t('edit.soundOn', 'Its own sound is on') : t('edit.soundOff', 'Its own sound is off')}
              </button>
              {piece.sound && (
                <label className="inline-flex items-center gap-2">
                  <span className="text-sm text-zinc-400">{t('edit.loud', 'How loud')}</span>
                  <input
                    type="range" min={0} max={2} step={0.05}
                    value={piece.loud ?? 1}
                    data-editorloud
                    {...gesture}
                    onChange={(e) => slide({ loud: Number(e.target.value) })}
                    className="w-32 accent-emerald-500"
                  />
                </label>
              )}
            </div>

            {/* Move, split, remove. */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button" data-editorearlier
                onClick={() => commit((was) => move(was, piece.id, 'earlier'))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('edit.earlier', 'Earlier')}
              </button>
              <button
                type="button" data-editorlater
                onClick={() => commit((was) => move(was, piece.id, 'later'))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                {t('edit.later', 'Later')}
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button" data-editorsplit
                /* `startsAt` and not `piece.from`. `split` takes a second on
                   the FILM's clock; `piece.from` is a position in the file, and
                   the two are only the same number for a piece that is first in
                   the film and untrimmed. Splitting the second piece of a film
                   cut it at the wrong place, and `check:editor` could not see it
                   because it only ever split the first one. */
                onClick={() => commit((was) => split(
                  was, piece.id, startsAt(was, piece.id) + lengthOfPiece(piece) / 2,
                ))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                <Scissors className="w-4 h-4" />
                {t('edit.split', 'Split in two')}
              </button>
              {/* A copy, with every grade, caption, speed and placement on it.
                  A shot that has been framed and graded is twenty seconds of
                  work, and wanting it twice should not mean doing all of it
                  again. */}
              <button
                type="button" data-editorcopy
                onClick={() => commit((was) => duplicate(was, piece.id))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                {t('edit.copy', 'Make a copy')}
              </button>
              <button
                type="button" data-editordrop
                onClick={() => commit((was) => drop(was, piece.id))}
                className="min-h-[44px] rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-300 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {t('edit.drop', 'Take it out')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Under the whole thing ────────────────────────────────────── */}
      <Card title={t('edit.under', 'Sound and fades')} icon={<Volume2 className="w-4 h-4" />}>
        <div className="space-y-4">
          <label
            data-editorunder
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 cursor-pointer hover:border-zinc-600"
          >
            <Plus className="w-4 h-4" />
            {edit.under ? t('edit.underSwap', 'Change the track under it') : t('edit.underAdd', 'Put a track under it')}
            <input
              type="file" accept="audio/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) commit((was) => ({ ...was, under: file }));
                e.target.value = '';
              }}
            />
          </label>

          {edit.under && (
            <label className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{t('edit.underLoud', 'How loud the track sits')}</span>
              <input
                type="range" min={0} max={2} step={0.05}
                value={edit.underLoud ?? 1}
                data-editorunderloud
                {...gesture}
                onChange={(e) => slideFilm((was) => ({ ...was, underLoud: Number(e.target.value) }))}
                className="w-32 accent-emerald-500"
              />
            </label>
          )}

          {/* ── A mark in the corner ──────────────────────────────────
 
              Sized and placed by `logomark.ts`, which every other route that
              brands a clip already uses. Same share of the frame, same
              inset, same opacity — a second set of numbers here would mean a
              logo that sits in one place on a video desk clip and another
              place on an edited one. */}
          <div className="space-y-2">
            <span className="text-sm text-zinc-400 inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {t('edit.mark', 'Your mark in the corner')}
            </span>
            <label
              data-editormark
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 cursor-pointer hover:border-zinc-600"
            >
              <Plus className="w-4 h-4" />
              {markName || t('edit.markAdd', 'Put a logo on it')}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  /* Through `fit` rather than straight into a FileReader.
 
                     `check:photopath` caught the first version: a photograph
                     off a modern phone is two hundred megapixels and ten
                     megabytes, a byte ceiling lets it through, and the decode
                     kills the tab — a white screen with nothing in the
                     console. Every other picture input in this app goes
                     through the same function, so a logo behaves here the way
                     it behaves in Cast.
 
                     The mark is painted at 16% of the frame's width
                     (`MARK_SHARE`), so 1024 on the longest edge is more than
                     it can ever use. */
                  void fit(file, 1024).then((made) => {
                    if (!made.ok) {
                      setProblem(t('edit.markBad', 'That picture could not be read.'));
                      return;
                    }
                    void loadMark(made.preview).then((img) => {
                      if (!img) {
                        setProblem(t('edit.markBad', 'That picture could not be read.'));
                        return;
                      }
                      setMark(img);
                      setMarkName(file.name.replace(/\.[^.]+$/, ''));
                    });
                  });
                }}
              />
            </label>
            {mark && (
              <>
              {/* Bigger and smaller. A logo that cannot be resized is a logo
                  drawn for one video: the mark that reads on a wide advert is
                  twice the size of the one that reads on a vertical clip. */}
              <label className="block space-y-1.5">
                <span className="block text-sm text-zinc-400">
                  {t('edit.markSize', 'How big the mark is')}
                </span>
                <input
                  type="range"
                  min={MARK_SMALLEST}
                  max={MARK_LARGEST}
                  step={0.01}
                  value={markShare}
                  data-editormarksize
                  onChange={(e) => setMarkShare(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </label>

              {/* Turned and faint, the same two the words carry. A watermark
                  is the one thing on a film that is usually MEANT to be faint,
                  and until tonight ours was pinned at `MARK_OPACITY` with no
                  way to quieten it behind a shot. */}
              <label className="block space-y-1.5">
                <span className="block text-sm text-zinc-400 inline-flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  {t('edit.markTurn', 'Turned')}
                </span>
                <input
                  type="range" min={-180} max={180} step={1}
                  value={markTurn}
                  data-editormarkturn
                  onChange={(e) => setMarkTurn(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <span className="block text-sm text-zinc-500" data-editormarkturnnow>
                  {`${Math.round(markTurn)}°`}
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="block text-sm text-zinc-400">
                  {t('edit.markSolid', 'How solid the mark is')}
                </span>
                <input
                  type="range" min={0.1} max={1} step={0.05}
                  value={markSolid}
                  data-editormarksolid
                  onChange={(e) => setMarkSolid(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </label>

              {/* Layer order. There are exactly two things on this canvas that
                  are ours rather than hers — the mark and the words — so it is
                  one switch rather than a list of layers, and the
                  default keeps what was always true: the mark last, over
                  everything. */}
              <button
                type="button"
                aria-pressed={markUnder}
                data-editormarkunder
                onClick={() => setMarkUnder((was) => !was)}
                className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                  markUnder ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                }`}
              >
                <Layers className="w-4 h-4" />
                {markUnder
                  ? t('edit.markUnder', 'The mark goes under the words')
                  : t('edit.markOver', 'The mark goes over the words')}
              </button>

              <Placing
                which="mark"
                at={markAt ?? CORNER_AT[corner]}
                put={setMarkAt}
              />

              {markAt && (
                <button
                  type="button"
                  data-editormarkreset
                  onClick={() => setMarkAt(null)}
                  className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300"
                >
                  {t('edit.markCorner', 'Put it back in a corner')}
                </button>
              )}

              <div className="flex gap-2 flex-wrap">
                {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as Corner[]).map((one) => (
                  <button
                    key={one}
                    type="button"
                    aria-pressed={corner === one}
                    data-editorcorner={one}
                    onClick={() => { setCorner(one); setMarkAt(null); }}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                      corner === one ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {one === 'topLeft' ? t('edit.topLeft', 'Top left')
                      : one === 'topRight' ? t('edit.topRight', 'Top right')
                      : one === 'bottomLeft' ? t('edit.bottomLeft', 'Bottom left')
                      : t('edit.bottomRight', 'Bottom right')}
                  </button>
                ))}
              </div>
              </>
            )}
          </div>

          {/* Fades. Clamped by `fadesFor`, which also stops the two of them
              together being longer than the film — a two-second fade each end
              on a three-second cut is a cut nobody ever sees. */}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="block text-sm text-zinc-400">{t('edit.fadeIn', 'Fade in')}</span>
              <input
                type="range" min={0} max={LONGEST_FADE} step={0.1}
                value={edit.fadeIn ?? 0}
                data-editorfadein
                {...gesture}
                onChange={(e) => slideFilm((was) => ({ ...was, fadeIn: Number(e.target.value) }))}
                className="w-full accent-emerald-500"
              />
              <span className="block text-sm text-zinc-500">{seconds(fades.in)}</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm text-zinc-400">{t('edit.fadeOut', 'Fade out')}</span>
              <input
                type="range" min={0} max={LONGEST_FADE} step={0.1}
                value={edit.fadeOut ?? 0}
                data-editorfadeout
                {...gesture}
                onChange={(e) => slideFilm((was) => ({ ...was, fadeOut: Number(e.target.value) }))}
                className="w-full accent-emerald-500"
              />
              <span className="block text-sm text-zinc-500">{seconds(fades.out)}</span>
            </label>
          </div>
        </div>
      </Card>

      {/* ── Take it out ──────────────────────────────────────────────── */}
      <Card title={t('edit.out', 'Put it together')} icon={<Play className="w-4 h-4" />}>
        <div className="space-y-3">
          <button
            type="button"
            disabled={!edit.pieces.length || busy !== null || !canStitch()}
            data-editormake
            /* Opens the bill rather than starting the render. Everything before
               this button is free and stays free; this is the one press that
               spends, so it asks first. */
            onClick={() => {
              setProblem('');
              setAsking(true);
              /* Asked fresh every time rather than held from the room opening:
                 a balance read when the room opened is a balance from before
                 whatever else she spent this hour, and a confirm screen showing
                 a stale number is worse than one showing none. */
              void loadWallet().then(setWallet);
            }}
            className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {busy === 'make' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t('edit.make', 'Put it together')}
            {/* ── The price, on the button, before it is pressed ──────────

                A charge somebody meets afterwards is a surprise, and a
                surprise about money is the thing that makes people stop
                trusting a room. Everything up to this button is free and
                stays free; this is the one press that costs, so this is
                where the number goes. */}
            {bill.total > 0 && (
              <span data-editorprice className="rounded-lg bg-zinc-950/20 px-2 py-0.5 text-[11px]">
                {bill.total} {t('edit.credits', 'credits')}
              </span>
            )}
          </button>

          {/* ── The bill, and the press that agrees to it ──────────────────

              Carli, 3 October 2026: *"dan wys daar die hoeveelheid krediete, en
              hulle moet dan confirm of hulle wil voortgaan."*

              Itemised rather than a total, and that is the point of it: a
              number on its own is something to accept or refuse, and a list is
              something to change your mind about. Somebody looking at "3
              transitions · 3" who did not care much about the transitions now
              knows exactly what taking them off saves.

              Shown BEFORE the render and not after, which matters most to
              whoever cannot afford it. The charge happens after the film exists
              — deliberately, so nobody is ever billed for a film that never
              arrived — and the cost of that order is that somebody with an
              empty balance would otherwise sit through a full real-time render
              to be told no at the end. The balance is read here so that the
              answer comes first. */}
          {asking && bill.total > 0 && (
            <div
              data-editorbill
              className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3.5"
            >
              <p className="text-sm font-semibold text-zinc-100">
                {t('edit.billTitle', 'What this film costs')}
              </p>

              <ul className="space-y-1.5">
                {bill.lines.map((line) => (
                  <li
                    key={line.id}
                    data-editorbillline={line.id}
                    className="flex items-baseline justify-between gap-3 text-sm text-zinc-400"
                  >
                    <span>{billWord(t, line)}</span>
                    <span className="shrink-0 tabular-nums text-zinc-300">{line.credits}</span>
                  </li>
                ))}
              </ul>

              {/* Said out loud whenever it is doing something. A discount
                  nobody is told about is a price nobody can check — and this
                  one is the whole reason a film with a caption on every shot is
                  still affordable. */}
              {bill.ceiling && (
                <p data-editorceiling className="text-sm text-emerald-400">
                  {t(
                    'edit.billCeiling',
                    'What is in it never costs more than the film itself, so {asked} comes down to {paid}.',
                  ).replace('{asked}', String(bill.asked)).replace('{paid}', String(bill.elements))}
                </p>
              )}

              <p className="flex items-baseline justify-between gap-3 border-t border-zinc-800 pt-2 text-sm font-semibold text-zinc-100">
                <span>{t('edit.billTotal', 'Altogether')}</span>
                <span data-editorbilltotal className="tabular-nums">
                  {bill.total} {t('edit.credits', 'credits')}
                </span>
              </p>

              {/* What they have, when there is anything to say. A signed-out
                  visitor and an app with no accounts both get nothing here
                  rather than a zero, because a zero reads as "you have used
                  them up" — the same distinction `Balance.tsx` makes. */}
              {wallet.metered && wallet.signedIn && wallet.ready && (
                <p data-editorbalance className="text-sm text-zinc-500">
                  {t('edit.billHave', 'You have {n}.').replace('{n}', String(wallet.balance))}
                </p>
              )}

              {wallet.metered && wallet.signedIn && wallet.ready && wallet.balance < bill.total ? (
                /* ── Short, and told so before the render rather than after ──

                    She asked for exactly this: *"Dit gaan dan ook mense wat op
                    die free version is keer om videos te export, menend hulle
                    kan 'n video bou, en die funksies toets, maar nie hulle video
                    export nie."* The room stays open, the work stays theirs, and
                    the one press that spends is the one that stops. */
                <div className="space-y-2" data-editorshort>
                  <p className="text-sm text-rose-400">
                    {t(
                      'edit.billShort',
                      'That is {n} more than you have. The film stays here — nothing is lost.',
                    ).replace('{n}', String(bill.total - wallet.balance))}
                  </p>
                  {onUpgrade && (
                    <button
                      type="button"
                      data-editorbillplans
                      onClick={onUpgrade}
                      className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950"
                    >
                      {t('edit.billSeePlans', 'See the plans')}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  data-editorbillgo
                  disabled={busy !== null}
                  onClick={() => { setAsking(false); void preview(); }}
                  className="min-h-[44px] w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
                >
                  {t('edit.billGo', 'Yes, put it together')}
                </button>
              )}

              <button
                type="button"
                data-editorbillno
                onClick={() => setAsking(false)}
                className="min-h-[44px] w-full rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300"
              >
                {t('edit.billNo', 'Not yet')}
              </button>
            </div>
          )}

          <Note>
            {t(
              'edit.realTime',
              'Cutting, fades, looks and words are free however long you take. Putting the film together is what costs, and it plays the film through once to record it — so it takes about as long as the film is.',
            )}
          </Note>

          {problem && (
            <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
              {problem}
            </p>
          )}

          {made && (
            <div className="space-y-2" data-editormade>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={made.url} controls className="w-full rounded-xl border border-zinc-800 bg-black" />
              <button
                type="button"
                data-editorsave
                onClick={() => downloadBlob(made.blob, safeFilename(edit.pieces[0]?.name ?? 'film', made.ext))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('edit.save', 'Save it')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ── The three that need an engine ────────────────────────────── */}
      <Card title={t('edit.engine', 'The ones that need an engine')} icon={<Sparkles className="w-4 h-4" />}>
        <div className="space-y-2" data-editorcoming>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'edit.engineWhat',
              'Taking a background out, taking an item out of a shot, and generating a piece you do not have. These three cannot happen on your device — they need an engine, and they cost credits.',
            )}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'edit.engineWhen',
              'They are priced and on the plan cards, and they are not switched on yet. Sending video of a person to another company needs an answer about what that company may do with it first, and that answer is being got rather than assumed.',
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
