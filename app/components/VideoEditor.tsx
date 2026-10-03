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
  Play, Pause, SkipBack, Plus, Volume2, VolumeX, Type, Sparkles, Lock, Image as ImageIcon, Undo2, Redo2, ChevronsUpDown,
  RotateCw, Layers, Gauge, Move, Copy, Shuffle, Crop, RefreshCw,
} from 'lucide-react';
import Card from './Card';
import CutDock, { type Bench } from './CutDock';
import DeskSheet from './BoothCard';
import { CUT_LOOK, INK, INK_DIM, LIT, PANEL, RAISE, PRESS } from '../lib/cutlook';
import { REACH, pullTo, reachOf } from '../lib/magnet';
import { heldWords, pointsOf, slidWords, spanReady, tidy, wordsSpan } from '../lib/videospan';
import { coverName, frameFrom, isPicture } from '../lib/videocover';
import WaveBlock from './WaveBlock';
import {
  BACK_DEFAULT, BOXES, BOX_DEFAULT, INK_DEFAULT, PAINTS, paintFor, roundFor,
} from '../lib/videopaint';
import {
  GRADES, GRADE_DEFAULT, RATES, bitsFor, gradeFor, rateFor, sizeFor, weighs,
} from '../lib/videoquality';
import Note from './Note';
import { useOwnScreen } from '../lib/fullroom';
import { useLang } from '../lib/i18n';
import { FILTERS, filterCss, filterName } from '../lib/videofilters';
import { DIALS, NO_ADJUST, adjusted, gradeCss } from '../lib/videoadjust';
import {
  FONTS, PLAIN_FONT, fontFor, WORDS_LARGEST, WORDS_SMALLEST,
} from '../lib/videofonts';
import { canStitch, CAPTION_ROUND, lengthOf, stitch } from '../lib/stitch';
import {
  loadMark, MARK_LARGEST, MARK_OPACITY, MARK_SHARE, MARK_SMALLEST,
  type Corner, type Spot,
} from '../lib/logomark';
import { fit } from '../lib/imagefile';
import { myVideos, type MyVideo } from '../lib/filmed';
import { keepFilm, loadFilm } from '../lib/filmkeep';
import { downloadBlob, safeFilename } from '../lib/library';
import { check, type Plan } from '../lib/entitlements';
import { CREDITS, perMinute } from '../lib/credits';
import { billForEdit, inTheFilm, type BillLine } from '../lib/filmcost';
import { loadWallet, NO_WALLET, type Wallet } from '../lib/wallet';
import { KEEP_STEPS } from '../lib/undo';
import {
  NOTHING, SHAPES, LONGEST_FADE, SHORTEST_PIECE,
  add, atSecond, change, cutFrom, drop, duplicate, fadesFor, filmSecond, lengthOfPiece,
  captionAt, cutOut, cutSong, move, runs, songSecond, split, splitHere, startsAt, trim,
  wordsReach,
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

/**
 * A row of colours to choose from.
 *
 * Written once and used twice — the words and what is behind them — because
 * two copies of a colour grid is two grids that drift apart the first time one
 * of them gets a swatch the other does not.
 *
 * ── Why the swatch is the colour and not a label ─────────────────────────
 *
 * Carli asked for *"'n goeie variety van kleur keuses"*. Twenty named buttons
 * is a list to read; twenty filled circles is a palette to look at, and the
 * eye finds the one it wants before it has read anything. The name is still
 * there for a screen reader and on hover, which is where a name belongs when
 * the thing itself is on the screen.
 *
 * The chosen one is marked with a ring rather than a tick: a tick has to be
 * dark on a light swatch and light on a dark one, and a ring OUTSIDE the
 * circle is legible against all twenty without knowing which is under it.
 */
/** A hex at an alpha, for the preview — the same 62% the renderer paints at. */
function tintOf(hex: string, alpha: number): string {
  const full = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!full) return `rgba(0, 0, 0, ${alpha})`;
  const n = parseInt(full[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function Swatches({
  label, mark, chosen, onPick, t,
}: {
  readonly label: string;
  readonly mark: string;
  readonly chosen: string;
  readonly onPick: (id: string) => void;
  readonly t: (key: string, fallback?: string) => string;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm text-zinc-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {PAINTS.map((one) => {
          const on = chosen === one.id;
          const name = t(one.name[0], one.name[1]);
          return (
            <button
              key={one.id}
              type="button"
              aria-pressed={on}
              aria-label={name}
              title={name}
              data-editorpaint={`${mark}:${one.id}`}
              onClick={() => onPick(one.id)}
              /* 44 by 44 for the thumb, with the colour drawn smaller inside
                 it — a 44-pixel circle of colour is a very loud grid, and the
                 target has to be the thumb's size whatever the dot's size. */
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                background: 'transparent',
                boxShadow: on ? `0 0 0 2px ${LIT}` : 'none',
              }}
            >
              <span
                aria-hidden
                className="block h-7 w-7 rounded-full"
                style={{
                  background: one.hex,
                  /* A hairline, so white on the panel and black on the panel
                     are both circles rather than a hole and a blank. */
                  boxShadow: 'inset 0 0 0 1px rgba(236,253,245,0.35)',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function VideoEditor({
  plan,
  onUpgrade,
  copilot,
  covered,
}: {
  readonly plan: Plan;
  readonly onUpgrade?: () => void;
  /**
   * The thing you talk to, handed in rather than built here.
   *
   * Carli, 4 October 2026: *"Die copilot kan ook net 'n button wees wat uit
   * pop."* Everywhere else in the studio it is the third pane of a scrolling
   * page and that is right. This room does not scroll — it is a screen with a
   * bar at its foot — so a pane below it was a second screenful nobody ever
   * reached, and it undid the one thing the rebuild was for.
   *
   * It stays `page.tsx`'s copilot, with the same bus and the same canvas, so
   * what it is told here is what it would be told anywhere. Only the way in
   * changes: a button, and a sheet over the room.
   */
  readonly copilot?: React.ReactNode;
  /**
   * Whether something is drawn over this room.
   *
   * The room claims the whole screen while it is open, which is what sends the
   * app's own bar away — see `useOwnScreen` below. It stays MOUNTED when the
   * room list is opened over it, so without this it goes on holding the screen
   * while she is looking at a different thing entirely, and the bar is missing
   * from the door and from every tab she reaches through it.
   *
   * Carli, 4 October 2026: *"Die res van die app se harde buttons onder het
   * verdwyn seker toe jy die nuwe video kamer gebou het."* She was right about
   * the cause as well as the symptom.
   */
  readonly covered?: boolean;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [edit, setEdit] = useState<Edit>(NOTHING);
  /* ── The room takes the whole screen ──────────────────────────────────
 
     Carli, 4 October 2026: *"Daai onderste harde bar van die hele app moet weg
     wees binne die kamer, dan moet die kamer se knoppies in daai spasie wees en
     die hele kamer moet groter wees."*
 
     Which is word for word what she asked for the Pro Booth on 14 September:
     *"daai buttons vervang die harde buttons van die hele app, dan val daai hele
     bar van die app in die booth weg."* `app/lib/fullroom.ts` was built that
     day, for that request, and carries the reasoning — two rows of buttons under
     a third row of buttons is three rows of buttons, and the bottom one belongs
     to a different application.
 
     The cutting room grew its own bar on 1 October and never claimed the
     screen, so it had both. One line, and the app's bar steps aside for as long
     as this room is mounted. The height below then measures no bar and the room
     grows into the space, which is the rest of what she asked for. */
  /* Released the moment anything is drawn over the room. A claim is a claim on
     the SCREEN, and a room that is not the screen any more must not hold one.

     `page.tsx` already knew this about the paint — `data-cutshell` is guarded
     with `!atDoor`, so the door does not wear the room's colours. The claim
     needed the same guard and did not have it. */
  useOwnScreen(!covered);

  /* ── How tall the clock is, which she can change ──────────────────────

     Carli, 4 October 2026: *"Ek sal dit ook like as mens die tydlyn se hoogte
     kan verstel, menend dit vir oomblikke groter kan drag sodat mens die
     tydlyn mooi kan sien wanneer mens edit. En dan weer kleiner kan maak
     wanneer mens die video prent weer beter wil sien."*

     Which is the trade this room is built on: the picture and the clock are
     fighting over one screen, and which one needs the room changes minute to
     minute. So it is hers to set rather than a number I pick.

     Local state and not part of the edit, deliberately. This is how she is
     looking at the film, not something about the film — it does not belong in
     an export, in a saved edit, or in the history. Pressing Back after
     dragging the clock taller should undo her last CUT, not her last look.

     64 is what it was before it could move. The floor is a block still being
     tappable; the ceiling is leaving the picture something. */
  const [laneTall, setLaneTall] = useState(64);
  const TALLEST_LANE = 180;
  /**
   * 52, and the number is not a taste — it is the thumb rule, backwards.
   *
   * A block is drawn `top-1 bottom-1` inside this, so it is eight pixels
   * shorter than whatever this says. At the 40 I first wrote, a block came out
   * 32 pixels tall, and `check:editor`'s "every control the editor adds is a
   * thumb tall" caught it: she could shrink the clock to a size where the
   * blocks on it could not reliably be tapped.
   *
   * The rule was right and the floor was wrong. 52 less the eight is 44, which
   * is the smallest a target may be — so every height she can reach is one
   * where the film is still editable.
   */
  const SHORTEST_LANE = 52;
  /**
   * How tall a sound lane is, which follows the picture lane.
   *
   * Carli asked for the clock's height to be hers; a sound lane that stayed 40
   * pixels while the picture lane grew to 180 would be a wave she still cannot
   * read, which is the thing she wanted the height FOR. So it grows with it —
   * at a share, because a waveform needs less room than a row of thumbnails
   * and giving it the same would push the picture off the screen.
   *
   * Floored at 53, and the number moved from 34 on 5 October 2026 when the
   * waves became things to press. 34 was the height at which a wave stops
   * being a wave and becomes a texture — a fine floor for something only
   * looked at. A block on this lane is `inset-y-1`, so a thumb's 44 pixels
   * needs 52 of lane — plus the one the lane's own top border takes, which is
   * why this is 53 and not 52. The probe measured 43 at 52 and said so.
   *
   * Found by `audit/editor.mjs` the moment the lane was made tappable: 25px,
   * then 43. A lane somebody has to hit and cannot is worse than a lane
   * nobody can press, because the second one at least looks like what it is.
   */
  const soundTall = Math.max(53, Math.round(laneTall * 0.62));

  /** Whether the copilot's sheet is over the room. */
  const [asking2, setAsking2] = useState(false);

  /* ── How tall the room is, measured rather than guessed ─────────────────

     The room is a fixed-height column with a bar at its foot, which is the
     whole shape of the October rebuild. To be that, it needs a height — and
     the height is the screen less whatever is above it less the app's own bar.

     "Whatever is above it" was a constant: `calc(100dvh - 7.5rem)`. It is not
     a constant. The header over this room is a back arrow, a search and an
     "All rooms / Cutting room" card, and how tall that stack is depends on the
     width, the language and whether the card is folded. Measured on a 390x844
     phone the room started 155 pixels down, so 7.5rem of allowance left it
     ending 93 pixels below the bottom of the screen — and what was down there
     was the lower half of the bar: Bring it in, Looks, Words, Sound, Your mark.

     Two probes said so and neither could say why, because neither could see
     the guess: `audit/underbar.mjs` reported five controls under the tab bar,
     and the screenshot showed the icon row sliced through the middle.

     So it is read off the element. One number, recomputed when the window
     changes size or the layout above it moves, and correct by construction at
     every width rather than at the one somebody measured. */
  const shell = useRef<HTMLDivElement | null>(null);
  const [tall, setTall] = useState<number | null>(null);

  useEffect(() => {
    const box = shell.current;
    if (!box) return undefined;
    const fit = (): void => {
      const top = box.getBoundingClientRect().top;
      /* `visualViewport` rather than `innerHeight` where it exists: on a phone
         the address bar coming and going changes one and not the other, and
         the one that matches what she can see is the visual viewport. */
      const screen = window.visualViewport?.height ?? window.innerHeight;
      /* The bar measured, not assumed, for the same reason the top is. On a
         phone with a home indicator it is the bar's height plus the safe area,
         and the safe area is a number only the device knows. */
      /* Nought when there is no bar, not `BAR_HEIGHT`.
 
         This room claims the screen, so the app's bar is not drawn while it is
         open and the space under it is the room's. The fallback is only for the
         frame before the bar would have mounted in a room that does not claim
         it — reserving 64 pixels for a bar that is not there is how a room ends
         up with a strip of nothing along the bottom. */
      const bar = document.querySelector('nav.fixed.bottom-0');
      const under = bar ? bar.getBoundingClientRect().height : 0;
      setTall(Math.max(320, Math.round(screen - top - under)));
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(document.body);
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, []);

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

  /* ── Which lane the cutting controls are aimed at ───────────────────────

     Carli, 5 October 2026: *"Die sound tracks onder videos moet ook geselect
     kan word, sodat mens daardie tyd lyne ook kan split. Huidiglik kan mens
     nie die musiek tydlyne select nie."*

     The three lanes were not equals. The picture lane could be tapped, the
     shots' sound lane was `pointer-events: none` — a picture of a wave — and
     the music lane could be dragged along and nothing else. So "cut" could
     only ever mean one thing, and the other two timelines were things to look
     at.

     `shots` picks the shot it belongs to rather than being a lane of its own
     to cut: a shot's sound IS that shot, and splitting one of them without the
     other would be two clips claiming the same seconds. The music is its own
     lane and its own cut — see `cutSong`. */
  const [lane, setLane] = useState<'film' | 'shots' | 'music'>('film');

  /* ── Starting over ──────────────────────────────────────────────────────

     Carli, 5 October 2026: *"Iewers moet daar 'n button wees by bring it in,
     new project, om die huidige project weg te vat en met 'n nuwe een te
     begin."*

     It became necessary the day the room started remembering. Before that,
     leaving and coming back WAS a new project — badly, by losing the old one.
     Now the film is still there when she comes back, which is right, and there
     was no other way to put it down.

     Two presses and not a dialog. The second press is the confirmation and the
     button says so in between; a mis-tap on a phone is one press, and the
     thing behind this one is an afternoon. */
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState<{ url: string; blob: Blob; ext: string; seconds: number } | null>(null);

  /* ── The project, kept between visits ───────────────────────────────────

     Carli, 5 October 2026: *"Die kamer onthou nie die projek nie. Ek het
     perongeluk back gedruk en toe ek terug gaan was die projek weg."*

     The edit lived in React state and nowhere else, so the phone's own Back
     button threw away an afternoon of work and nothing anywhere said so —
     from the room's point of view it was simply a new room with an empty
     clock. See `lib/filmkeep.ts` for where it goes and why it is not the
     database the songs are in.

     `opening` is held until the first read answers, because the alternative is
     the explanation page flashing up over a film that is about to appear —
     which looks exactly like the fault being fixed. */
  const [opening, setOpening] = useState(true);
  const [kept, setKept] = useState<'full' | null>(null);

  useEffect(() => {
    let gone = false;
    void loadFilm().then((had) => {
      if (gone) return;
      /* Only if there is something in it. An empty kept film must not land on
         top of a clip she has brought in while this was still reading — the
         read is a round trip to disk and she can be faster than it. */
      if (had?.pieces.length) setEdit((now) => (now.pieces.length ? now : had));
      setOpening(false);
    });
    return () => { gone = true; };
  }, []);

  /* Written a moment after she stops, not on every keystroke: a slider drag is
     a few hundred changes and each one would be a transaction. The material
     itself is written once — `keepFilm` only puts a Blob it has not already
     got — so what this actually costs per save is kilobytes. */
  useEffect(() => {
    if (opening) return undefined;
    const soon = setTimeout(() => {
      void keepFilm(edit).then((how) => setKept(how === 'full' ? 'full' : null));
    }, 900);
    return () => clearTimeout(soon);
  }, [edit, opening]);

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
  /** Which bench is out. `null` is all of them shut — see `CutDock.tsx`. */
  const [bench, setBench] = useState<Bench>(null);

  /* ── What is already in her channel ──────────────────────────────────────

     Carli, 4 October 2026: *"die button wat sê bring it in, or choose from
     channel"*.

     `null` is "not asked yet" and `[]` is "asked, and there is nothing" —
     two different sentences on screen, and one state cannot say both. The
     listing is fetched when she presses, not on mount: the room opens for
     everybody including signed-out, and a request that comes back 401 before
     anybody asked for it is a wasted round trip on a phone. */
  const [channel, setChannel] = useState<MyVideo[] | null>(null);
  /** Which video's file is being pulled down, so its own card can say so. */
  const [pulling, setPulling] = useState<string | null>(null);


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

  /* ── Whether the words are up where the playhead is standing ───────────

     Carli, 4 October 2026: *"al maak ek die teks kleiner dat dit nie oor die
     hele video stuk strek nie, wys die teks steeds oor die hele video stuk."*

     She had dragged a caption in to half its clip and this room went on
     drawing it over all of it. The FILM was right — `stitch.ts` has gated on
     the caption's ends since the lane was built — so the room was lying about
     a film that was correct, and the only way to find that out was to pay for
     the render and watch it.

     `wordsUp` is now the one answer and `stitch.ts` asks it too, because a
     preview and a renderer that each decide for themselves is how the two
     came apart in the first place.

     `at` is the film's clock and `startsAt` is where this piece begins on it,
     so the difference is seconds into the piece — the same number the
     renderer works out from the file's position, and the same one the lane
     draws the block from.

     ── And a ghost rather than nothing, while she is setting them ────────

     Hidden outright, the words bench becomes unusable the moment a caption is
     shortened: the colour, the face, the box and the position are all set by
     looking at the thing, and there would be nothing to look at. So on that
     bench, and only there, a caption whose moment has passed stays as a faint
     outline she can still take hold of. Anywhere else the room shows exactly
     what the film will. */
  const wordsNow = useMemo(() => {
    /* Across the whole film, not within the selected piece. The moment a
       caption could outlive its own shot, "the piece under the playhead" and
       "the piece whose words are up" stopped being the same thing — and a
       preview that asks the first one shows nothing over every shot a caption
       has been stretched across. */
    const said = captionAt(edit, at);
    if (said) return { said, ghost: false };
    /* Nothing is up. On the words bench the selected piece's caption stays as
       a faint outline so there is still something to colour, turn and place;
       anywhere else the room shows exactly what the film will. */
    if (bench === 'words' && piece && (piece.words ?? '').trim()) {
      return { said: piece, ghost: true };
    }
    return { said: null, ghost: false };
  }, [piece, at, edit, bench]);
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

  /* ── The cover, as something to look at ───────────────────────────────

     An object URL for whichever Blob the edit is carrying, revoked when it
     changes or the room closes. Without the revoke every frame she grabs
     leaks one, and a room somebody spends an evening in is where that shows.

     Keyed on the Blob itself rather than on a counter: a new Blob is a new
     cover and the same Blob is the same cover, which is exactly the question
     this effect has to answer. */
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    const blob = edit.cover ?? null;
    if (!blob) { setCoverUrl(null); return undefined; }
    const url = URL.createObjectURL(blob);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [edit.cover]);

  /**
   * One frame out of the film, at the film's own shape.
   *
   * Taken from the viewer that is already showing that second, which is the
   * only element in the room with the right frame decoded — asking a fresh
   * `<video>` for it would mean loading the clip again and seeking, and the
   * picture she is looking at IS the picture she means.
   */
  const takeCover = useCallback(async () => {
    const node = viewer.current;
    if (!node || !piece) return;
    const shot = await frameFrom(node, shape.width, shape.height, piece.fill ?? false);
    if (!shot) {
      setProblem(t('edit.coverNoFrame', 'That frame could not be read.'));
      return;
    }
    setProblem('');
    commit((was) => ({ ...was, cover: shot, coverFrom: 'shot' }));
  }, [piece, shape, commit, t]);

  /* ── The two red lines, and where they stick ──────────────────────────

     Carli, 4 October 2026: *"Hier is die magneet funksie baie belangrik."*

     The points are every cut in the film, both ends and the playhead — see
     `pointsOf`. The reach is the Pro Booth's twelve pixels converted to
     seconds on THIS axis, which is the whole argument in `magnet.ts`: a
     tolerance in seconds is a different distance on a phone than on a desk and
     a different one again on a long film than on a short one.

     The magnet can be switched off, because a line that will not go where the
     hand puts it is worse than no magnet — the same reason Snap can be off in
     the booth. */
  const span = edit.span ?? null;
  const magnetOn = edit.magnet ?? true;
  const stick = useCallback((second: number): number => {
    const clamped = Math.max(0, Math.min(total, second));
    if (!magnetOn) return clamped;
    const wide = total * perSecond;
    const within = reachOf(REACH, total, wide);
    return pullTo(clamped, null, pointsOf(
      edit.pieces.map((one) => startsAt(edit, one.id)), total, at,
    ), within).at;
  }, [edit, total, perSecond, at, magnetOn]);

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
    /* The element's own `muted={!piece.sound}` already keeps a silent shot
       silent here, which is right and stays where it is. */
  }, [piece?.speed, piece?.loud, source]);

  /* ── The song, under the preview ────────────────────────────────────────

     Carli, 5 October 2026: *"Wanneer ek die musiek tydlyn in sit en ek druk
     play, dan hoor mens nie die klank binne die video nie."*

     The bed was mixed in `stitch.ts` and nowhere else, so it existed only in
     the finished file: laying a track under a film and pressing play gave
     silence, and the only way to hear what she had made was to pay for the
     render. Everything this room is for — matching a cut to a drum hit,
     hearing whether a caption lands on the line — needs the song in the
     preview.

     An element rather than the renderer's audio graph. The graph is built for
     writing a file and schedules one source per surviving stretch; this has to
     follow a playhead somebody is dragging about, and an element that can be
     seeked is the right shape for that. */
  const bed = useRef<HTMLAudioElement | null>(null);
  const [bedUrl, setBedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!edit.under) { setBedUrl(null); return undefined; }
    const url = URL.createObjectURL(edit.under);
    setBedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [edit.under]);

  useEffect(() => {
    const a = bed.current;
    if (!a) return;
    /* The same clamp the picture gets, and for the same reason: an element's
       `volume` throws above one, while the slider's range is kept at 0–2
       everywhere so it means one thing across the app. */
    a.volume = Math.max(0, Math.min(1, edit.underLoud ?? 1));
  }, [edit.underLoud, bedUrl]);

  /* ── Kept on the film's clock ──────────────────────────────────────────

     The song does not run straight: it starts at `underFrom`, and every
     stretch cut out of it with the red lines makes it jump. `songSecond` asks
     `stretches` — the same function the renderer schedules from — so the
     preview and the film cannot disagree about where the song is.

     Corrected rather than driven. `at` changes a few times a second while the
     film plays, and setting `currentTime` on every one of those would stutter
     the audio; so the element is left to run and is only pulled back when it
     has drifted further than a quarter of a second, which is also exactly
     what a skip or a scrub looks like. */
  useEffect(() => {
    const a = bed.current;
    if (!a || !bedUrl) return;
    const want = songSecond(edit, at);
    if (want === null) { a.pause(); return; }
    if (Number.isFinite(a.duration) && want > a.duration) { a.pause(); return; }
    if (Math.abs(a.currentTime - want) > 0.25) a.currentTime = want;
    if (running) { if (a.paused) void a.play().catch(() => undefined); }
    else a.pause();
  }, [at, running, edit, bedUrl]);

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

  /* Takes a `FileList` from the file input, or a plain array from
     `bringFromChannel`. `Array.from` reads both, so the channel path does not
     need a second copy of the length check, the decode, or the `holds` note
     below — a second copy is how the two ways in end up disagreeing about
     what a clip is. */
  const bringIn = useCallback(async (files: FileList | readonly File[] | null) => {
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

  /**
   * Ask the server what is in her channel.
   *
   * Rows whose `url` came back null are dropped here and not drawn: the row
   * has outlived its file, and a card that cannot be opened is worse than a
   * card that is not there — she presses it, nothing happens, and the room
   * looks broken rather than empty.
   */
  const loadChannel = useCallback(async () => {
    setProblem('');
    setBusy('channel');
    try {
      const mine = await myVideos();
      setChannel(mine.filter((one) => !!one.url));
    } finally {
      setBusy(null);
    }
  }, []);

  /**
   * Pull one of her kept videos down and put it on the clock.
   *
   * The room works on Blobs it can decode, draw and stitch — a title and an
   * id are not one, which is why `/api/video/kept` had to start signing a
   * link per row before this could exist at all. The link is short-lived, so
   * the fetch happens on the press and not when the list was drawn.
   */
  const bringFromChannel = useCallback(async (one: MyVideo) => {
    if (!one.url) return;
    setProblem('');
    setPulling(one.id);
    try {
      const response = await fetch(one.url);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const kind = blob.type || 'video/mp4';
      const ext = kind.includes('webm') ? 'webm' : 'mp4';
      await bringIn([new File([blob], `${one.title || 'video'}.${ext}`, { type: kind })]);
    } catch {
      setProblem(t(
        'edit.channelfailed',
        'That one could not be fetched. Open the page again so the links are fresh, and try once more.',
      ));
    } finally {
      setPulling(null);
    }
  }, [bringIn, t]);

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
  const slide = useCallback((how: Partial<Omit<Piece, 'id'>>, onto?: string) => {
    /* The piece this change lands on is usually the selected one, and since
       captions can run past their own shot it is sometimes not: the words on
       the frame may belong to a piece two cuts back, and dragging them has to
       move THAT caption rather than silently writing a `wordsAt` onto whatever
       happens to be picked. */
    const id = onto ?? piece?.id;
    if (!id) return;
    if (beforeDrag.current === null) { commit((was) => change(was, id, how)); return; }
    setEdit((was) => change(was, id, how));
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

  /* ── Dragging a caption along its own lane ──────────────────────────────

     Carli, 4 October 2026: *"Video editor se teks moet ook sy eie tydlyn hê.
     Dit moet bo op die video tydlyn kom en dan ook gedrag kan word om die
     lengte van die teks oor die video te bepaal."*

     `edge` is which end, or `null` for the whole block — moving it along
     without changing how long it is up, which is the commonest adjustment and
     the one that would be impossible if only the ends could be grabbed.

     One history step per gesture, through `beforeDrag`/`held`, the same as
     every other drag in this room: a caption nudged half a second should not
     cost twenty presses of Back. */
  const takeWords = useCallback((
    which: 'from' | 'to' | null,
    id: string,
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const node = event.currentTarget;
    const lane = node.closest('[data-editorwordslane]');
    if (!lane || perSecond <= 0) return;
    const box = lane.getBoundingClientRect();
    beforeDrag.current = edit;
    node.setPointerCapture(event.pointerId);
    const grabbedAt = (event.clientX - box.left) / perSecond;
    /* ── Where it was when she grabbed it, read once ──────────────────────

       Carli, 4 October 2026: *"Al haal ek die magnet af spring die teks
       nogsteeds rond asof die magnet aan is."*

       It was not the magnet — there is no magnet on this drag at all, which is
       why switching it off changed nothing. It was a runaway.

       `had` used to be read from the LIVE piece inside `setEdit`, while `by` is
       measured from the pointer's ORIGINAL grab point. So the first move added
       the full distance to the block's start, the second added the same full
       distance to the already-moved block, and the third added it again: the
       block accelerated away from the finger in jumps that got bigger. On a
       phone, where pointermove fires every frame, that reads exactly like a
       magnet yanking it about.

       The origin has to be fixed for the whole gesture, like `beforeDrag`
       beside it. Read once, here. */
    const began = (() => {
      const piece = edit.pieces.find((one) => one.id === id);
      if (!piece) return null;
      return wordsSpan(piece, lengthOfPiece(piece), wordsReach(edit, id));
    })();

    const move = (m: PointerEvent) => {
      setEdit((was) => {
        const piece = was.pieces.find((one) => one.id === id);
        if (!piece) return was;
        const long = lengthOfPiece(piece);
        /* The live span for the two edges — each of those sets one end to an
           absolute position and leaves the other where it is, so reading it
           back every move is correct and is what keeps the other end still.

           The MOVE uses `began` instead: it is a displacement from where the
           gesture started, and a displacement applied to a moving origin is
           the runaway described above. */
        /* How far this caption may run before it would land on the next one —
           read live, because a caption ahead of it can be dragged while this
           gesture is not happening and the ceiling then changes. */
        const reach = wordsReach(was, id);
        const had = wordsSpan(piece, long, reach);
        /* Where the pointer is on the FILM's clock, turned into how far into
           this piece that is — the caption's clock is its own piece's. */
        const into = (m.clientX - box.left) / perSecond - startsAt(was, id);
        let want = had;
        if (which === 'from') want = { from: into, to: had.to };
        else if (which === 'to') want = { from: had.from, to: into };
        else {
          /* Moved by the distance the pointer has travelled, not snapped to
             the pointer: grabbing a block in its middle and having it jump so
             its start is under the finger is the thing that makes a drag feel
             like a throw. */
          /* `slidWords` owns this, so it can be given a sixty-second shot in
             `check:cutspan` and proved without a clamp in the way. */
          want = slidWords(began ?? had, into - (grabbedAt - startsAt(was, id)), long, reach);
        }
        const next = heldWords(want.from, want.to, long, reach);
        return {
          ...was,
          pieces: was.pieces.map((one) => (one.id === id
            ? { ...one, wordsFrom: next.from, wordsTo: next.to } : one)),
        };
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
      <Card title={t('rail.videoedit', 'Video Editor')} icon={<Film className="w-4 h-4" />}>
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
    /* ── One room, in the shape she drew ──────────────────────────────────

       Carli, 4 October 2026: *"Die tydlyne moet reg onder die video prent wees.
       … Dit is funksioneel nes soos die probooth. Dit moet lyk soos 'n editing
       kamer. Daar moet nie allerhande buttons wees soos daar nou is nie, alles
       moet binne een kamer wees en met icons. … Die oorhoofse editing funksies
       moet heel onder op die hoof bar wees en moet vas wees soos in die probooth
       en dan van daar af wees funksies op pop waarvan mens kan kies."*

       What was here was eight cards down one scrolling page: bring-in, undo,
       shape, clock, strip, preview, inspector, sound, fades, export. Somebody
       looking for the looks scrolled past the sound to find them, and the
       picture they were cutting was three cards below the clock they were
       cutting it on.

       Now it is a screen rather than a page. The picture; the clock directly
       under it; and a fixed bar at the bottom whose seven icons open the room's
       own benches. The same shape the Pro Booth got in September, after the same
       complaint, for the same reason — `BoothDock.tsx` carries that note and
       `CutDock.tsx` is this room's copy of the idea.

       Not one new control is below. Every one of them was already in this room.
       What changed is that the room has a floor. */
    <div
      className="flex flex-col"
      data-videoeditor
      data-cutroom
      ref={shell}
      /* The room takes the screen rather than growing a page under it, so that
         the bar at the bottom is AT the bottom. `page.tsx` already bleeds this
         surface to the edges; this is the height that matches.

         ── A minimum is not a height, and that was the first bug ──────────

         This was `minHeight` alone, which says "at least this tall" and
         nothing about the top. A floor with no ceiling is not a screen: the
         scroller inside is `flex-1`, and `flex-1` in a column with no height
         to divide up does not scroll — it grows. So the room grew a page under
         itself, the dock went wherever the content ended, and the only reason
         it looked right was that the content was usually short.

         `audit/editor.mjs` found it the moment the copilot sheet gave the
         column something tall to hold: the dock measured 3,642 pixels down a
         900-pixel window. The bar she works from was off the bottom of the
         screen, and with it the play button and the way back out of the sheet.

         ── And a constant is not a measurement, which was the second ──────

         `calc(100dvh - 7.5rem)` then put the dock 93 pixels below the bottom
         of a 390x844 phone. See `tall` above: the allowance is read off this
         element rather than assumed. The `calc` stays as the value before the
         first measurement lands, so the room is the right shape on the frame
         it is painted rather than snapping a moment later. */
      style={{
        height: tall === null ? 'calc(100dvh - 7.5rem)' : tall,
        maxHeight: tall === null ? 'calc(100dvh - 7.5rem)' : tall,
      }}
    >
      {/* ── The one press that spends, where every editor puts it ─────────

          Top right, above the picture. Carli's screenshots all have it there
          and so does every editor she sent: the thing that finishes the work
          is the thing you reach for last, and it is the one control that
          should never be behind a drawer.

          It was on the film bench until now, which meant the only way to
          finish was to remember which of seven icons the finishing lived
          behind. The bench still holds the shape, the fades and the bill; this
          is the way in to them. */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-2">
          {/* ── The copilot, as a button ────────────────────────────────

              Opposite the one that spends, which is the only pair of controls
              in this room that are not about the film itself: one asks, one
              finishes. Everything between them is the work.

              A button and not a pane, because this room is a screen. See the
              `copilot` prop. When nothing is handed in — a desktop, where the
              third column is drawn properly — nothing is drawn here either,
              rather than a button that opens an empty sheet. */}
          {copilot ? (
            <button
              type="button"
              data-editorask
              /* `aria-pressed`, not `aria-expanded`, and the difference is not
                 pedantry. Every bench button on the bar below uses pressed,
                 because this is a panel you toggle rather than a fold that
                 discloses the next part of a page — and `unfold()` in
                 `audit/enter.mjs` presses every `aria-expanded="false"`
                 button with a label on its way into a room. With expanded on
                 it, the copilot was open over the room on arrival, every
                 time, in every probe and in every screenshot. */
              aria-pressed={asking2}
              onClick={() => setAsking2(true)}
              className="min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 active:translate-y-px"
              /* Depth, because Carli asked for it in those words: *"'n button
                 moet diepte hê en lyk soos 'n knoppie wat 'n mens druk."* On a
                 near-black panel a drop shadow is invisible, so it is a light
                 edge along the top and a dark one along the bottom — the way a
                 real key catches a room light — and the pair reversed on
                 `:active` so the button actually moves. See `RAISE`/`PRESS`. */
              style={{
                background: 'rgba(52,211,153,0.14)',
                borderColor: 'rgba(16,185,129,0.45)',
                color: LIT,
                boxShadow: RAISE,
              }}
              onPointerDown={(e) => { e.currentTarget.style.boxShadow = PRESS; }}
              onPointerUp={(e) => { e.currentTarget.style.boxShadow = RAISE; }}
              onPointerLeave={(e) => { e.currentTarget.style.boxShadow = RAISE; }}
            >
              <Sparkles className="w-4 h-4" />
              {t('edit.ask', 'Ask')}
            </button>
          ) : <span />}
          <button
            type="button"
            disabled={!edit.pieces.length || busy !== null || !canStitch()}
            data-editormake
            /* Opens the bill rather than starting the render. Everything before
               this button is free and stays free; this is the one press that
               spends, so it asks first. */
            onClick={() => {
            setProblem('');
            /* The bill lives on the film bench, so pressing this opens it.
               A confirm screen that appears somewhere she is not looking is
               a confirm screen nobody confirms. */
            setBench('film');
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
      </div>

      {/* ── The picture, and the clock right under it ──────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {piece ? (
          <section data-editorpiece className="space-y-3">
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
                /* ── Capped, so the picture always fits the room ─────────────

                   Carli, 4 October 2026, with screenshots of a phone editor
                   open: the picture sits in a band at the top and the clock and
                   the controls get the rest of the screen.

                   Ours was full width, which on a tall film is 693 pixels of a
                   727-pixel screen. That was fine while the room was a scrolling
                   page and wrong the moment it became a screen with a bar at the
                   bottom and a bench above it.

                   `check:editor` found it before she did: with the Words bench
                   open, the corner handle for resizing a caption was below the
                   bottom of the room, and the probe reported a resize handle
                   that does not resize.

                   Height-led rather than width-led, so a wide film and a tall
                   one land inside the same band instead of one of them deciding
                   how tall the room is. */
                ...(zoom > 1
                  ? { width: `${zoom * 100}%` }
                  : { maxHeight: '38dvh', width: 'auto', margin: '0 auto' }),
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
                /* And the song under it, on the same clock. Hidden because it
                   is not a player — it is the bed, following the playhead so
                   the preview sounds like the film. See the effect beside
                   `songSecond` for why it is corrected rather than driven. */
                /* Through `gradeCss`, which is the same function `cutFrom`
                   runs — so a dial moved here changes the picture she is
                   judging and the film that comes out, in that order and by
                   the same string. */
                style={{ filter: gradeCss(filterCss(piece.look), piece.adjust) || undefined }}
                /* `contain` or `cover`, from the same flag the renderer reads, so
                   the bars she sees are the bars she gets. */
                className={`absolute inset-0 h-full w-full ${
                  piece.fill ? 'object-cover' : 'object-contain'
                }`}
              />
              {bedUrl && (
                <audio ref={bed} data-editorbedsound src={bedUrl} preload="auto" className="hidden" />
              )}
              {wordsNow.said && (
                <div
                  data-editorwordsdrag
                  data-editorwordsghost={wordsNow.ghost ? 'true' : undefined}
                  /* Through `holding`/`held` and `slide`, not `tweak`: a drag
                     across the frame is a few hundred pointermoves, and one of
                     them per history step was the other half of the fault the
                     note beside `beforeDrag` describes. One drag, one Back. */
                  onPointerDown={(event) => {
                    holding();
                    dragOnFrame(event, (spot) => slide({ wordsAt: spot }, wordsNow.said.id), held);
                  }}
                  style={{
                    left: `${(wordsNow.said.wordsAt?.x ?? WORDS_AT.x) * 100}%`,
                    top: `${(wordsNow.said.wordsAt?.y ?? WORDS_AT.y) * 100}%`,
                    fontFamily: fontFor(wordsNow.said.wordsFont).stack,
                    fontWeight: fontFor(wordsNow.said.wordsFont).weight,
                    fontSize: Math.max(9, (wordsNow.said.wordsSize ?? 0.048) * frameHeight),
                    maxWidth: '86%',
                    /* The centring is in the transform rather than in a
                       `-translate-x-1/2` class, because an inline `transform`
                       replaces the whole property and would have thrown the
                       Tailwind translate away — the words would have hung off to
                       the right of where they land in the film, which is the
                       quiet kind of wrong this preview exists to prevent. */
                    transform: `translate(-50%, -50%) rotate(${wordsNow.said.wordsTurn ?? 0}deg)`,
                    /* Ghosted, not solid, when the playhead is past the
                       caption's own stretch — see `wordsNow`. */
                    opacity: wordsNow.ghost ? 0.3 : (wordsNow.said.wordsSolid ?? 1),
                    outline: wordsNow.ghost ? `1px dashed ${LIT}` : undefined,
                    outlineOffset: wordsNow.ghost ? 3 : undefined,
                    /* Approximate, and said so rather than implied: the renderer
                       rounds against the band's MEASURED height, and the band
                       here is a div that has not been measured. It moves the
                       right way and lands within a pixel or two of the film. */
                    borderRadius: (wordsNow.said.wordsBox ?? BOX_DEFAULT) === 'brush'
                      /* The brush is a painted path on the canvas and cannot be
                         a border radius. A lozenge is the closest an element
                         gets, and the preview says "a shape, not a box" rather
                         than pretending to be the stroke. The film draws the
                         real one; `check:videopaint` holds that they agree on
                         everything a radius CAN carry. */
                      ? '48% 44% 46% 50% / 60% 56% 58% 54%'
                      : (wordsNow.said.wordsRound ?? roundFor(wordsNow.said.wordsBox ?? BOX_DEFAULT))
                        * Math.max(9, (wordsNow.said.wordsSize ?? 0.048) * frameHeight),
                    /* The same 62% the renderer paints the box at, so the
                       preview shows the picture through it exactly as the film
                       will. `none` draws nothing, which is a title card. */
                    background: (wordsNow.said.wordsBox ?? BOX_DEFAULT) === 'none'
                      ? 'transparent'
                      : tintOf(paintFor(wordsNow.said.wordsBack ?? 'black')?.hex ?? BACK_DEFAULT, 0.62),
                    color: paintFor(wordsNow.said.wordsInk ?? 'white')?.hex ?? INK_DEFAULT,
                    zIndex: 2,
                  }}
                  className="absolute cursor-move touch-none select-none px-2 py-1 text-center leading-tight outline-dashed outline-1 outline-emerald-400/50"
                >
                  {wordsNow.said.words}
                  {/* The corner. Sits half outside the band so the whole of it is
                      grabbable without covering a letter, and `touch-none` so a
                      phone does not scroll the page instead. */}
                  <span
                    data-editorwordsgrip
                    onPointerDown={(event) => {
                      holding();
                      grip(
                        event, wordsNow.said.wordsSize ?? 0.048,
                        (size) => slide({ wordsSize: size }, wordsNow.said.id),
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
          </section>
        ) : (
          <Note>
            {t(
              'edit.what',
              'Bring your own clips in, cut them on the clock, and take the film out. Everything on this page happens on your own device — no credits, no queue, no waiting.',
            )}
          </Note>
        )}

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
        {opening && edit.pieces.length === 0 ? (
          /* Reading the kept project off the disk. Nothing is drawn here on
             purpose: the explanation page flashing up over a film that is
             about to appear looks exactly like the fault this was built to
             end. It is one round trip and it is over in a blink. */
          <div className="h-24" data-editoropeningwait />
        ) : edit.pieces.length === 0 ? (
          /* ── What this room is, and the two ways in ────────────────────

              Carli, 4 October 2026: *"Die probooth se opening page het half 'n
              verduideliking wat hierdie funksie doen. Kan die video editor
              dieselfde hê en dan die button wat sê bring it in, or choose from
              channel."*

              The same shape as `Booth.tsx`'s opening, and for the reason
              written there: what the room can do is the reason to press, so
              the press comes first and reads as the answer to it. On an empty
              film there is nothing else on this screen worth the room.

              Two ways in, because there are two: a clip off the phone, and
              something already in her channel. The second needed a signed link
              on the listing before it could exist — see `app/api/video/kept`. */
          <div className="space-y-3" data-editoropening>
            <div className="flex items-start gap-3">
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(52,211,153,0.16)', color: LIT, boxShadow: `0 0 0 1px rgba(16,185,129,0.35)` }}
              >
                <Scissors className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h4 className="text-2xl font-black leading-tight tracking-tight" style={{ color: INK }}>
                  {t('rail.videoedit', 'Video Editor')}
                </h4>
                <p className="max-w-2xl pt-1 text-sm leading-snug sm:text-base" style={{ color: INK }}>
                  {t('edit.room.sub', 'Your own footage, on a clock. Bring clips in, cut them where you want, put words and a look and your logo on them, and lay a song underneath — all of it on this device, free, as many times as you like. Only putting the finished film together costs anything, and it shows the bill first.')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                data-editoropenbring
                className="min-h-[48px] w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
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

              <button
                type="button"
                data-editoropenchannel
                onClick={() => { setBench('folder'); void loadChannel(); }}
                className="min-h-[48px] w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2"
                style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
              >
                <Film className="w-4 h-4" />
                {t('edit.fromChannel', 'Choose from your channel')}
              </button>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: INK_DIM }} data-editorempty>
              {t('edit.nothing', 'Nothing on the clock yet. Bring a clip in and it appears here as a block you can cut.')}
            </p>
          </div>
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
                {/* ── The ruler ───────────────────────────────────────────

                    Carli, 4 October 2026: *"die tydlyn moet mooi en netjies lyk
                    nes in probooth."*

                    So it is drawn the way the booth's is, and the booth's shape
                    is three rules rather than a palette:

                    A tall tick where a number is and a short one halfway
                    between. A number every `step` seconds is a number every
                    forty-four pixels at best, which on a long film is a wall of
                    figures; a minor tick between them keeps the scale readable
                    without adding anything to read.

                    The label sits beside its tick and never on it, which is why
                    the ticks are drawn first.

                    And `pointer-events-none` on all of it. The whole strip is
                    one scrub target, and a mark that swallowed a press would
                    make the ruler dead in exactly the places a thumb aims at.
                    The booth learnt that one the hard way. */}
                <div
                  className="relative h-6 border-b"
                  style={{ borderColor: 'rgba(16,185,129,0.22)' }}
                  data-editorruler
                >
                  {Array.from(
                    { length: Math.floor(total / (step / 2)) + 1 },
                    (_, i) => (i * step) / 2,
                  ).map((mark) => {
                    const major = Math.abs(mark / step - Math.round(mark / step)) < 1e-6;
                    return (
                      <span
                        key={`t${mark}`}
                        data-tick={major ? 'major' : 'minor'}
                        aria-hidden
                        className="pointer-events-none absolute bottom-0 w-px"
                        style={{
                          left: mark * perSecond,
                          height: major ? 9 : 4,
                          background: major
                            ? 'rgba(236,253,245,0.42)'
                            : 'rgba(236,253,245,0.18)',
                        }}
                      />
                    );
                  })}
                  {Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step).map((mark) => (
                    <span
                      key={mark}
                      style={{ left: mark * perSecond + 3, color: 'rgba(236,253,245,0.5)' }}
                      className="pointer-events-none absolute top-0 text-[10px] leading-4 tabular-nums"
                    >
                      {seconds(mark)}
                    </span>
                  ))}
                </div>

                {/* ── The words, on a lane above the picture ────────────

                    Carli, 4 October 2026: *"Video editor se teks moet ook sy
                    eie tydlyn hê. Dit moet bo op die video tydlyn kom en dan
                    ook gedrag kan word om die lengte van die teks oor die
                    video te bepaal. Dit kan nie die hele video bar vol wees
                    nie, want teks is gewoonlik net daar vir gedeeltes van 'n
                    video."*

                    Above, because that is where she asked for it and where
                    every editor puts it: the picture is the thing, and what is
                    laid over the picture is drawn over it here too.

                    A block per piece that has words, at that caption's own
                    stretch rather than its piece's — which is the whole point.
                    Always drawn, even with nothing on it. It used to appear
                    only once a piece had words, which is tidier and is why
                    Carli said on 4 October — after it was built and pushed —
                    that the text still had no lane of its own: with no caption
                    typed there was no lane to see, so nothing told her the
                    lane existed or that a caption could be timed at all.

                    The music lane has said "No track under it yet" since it
                    was built, for exactly that reason. An empty lane with its
                    name on it is how somebody learns a room has one. */}
                <div
                  className="relative mb-1"
                  style={{ height: Math.max(22, Math.round(laneTall * 0.34)) }}
                  data-editorwordslane
                >
                  <span className="pointer-events-none absolute left-2 top-0 z-10 text-[10px] font-bold uppercase tracking-wide" style={{ color: INK_DIM }}>
                    {t('edit.wordsLane', 'The words')}
                  </span>
                  {!edit.pieces.some((one) => (one.words ?? '').trim()) && (
                    <span className="absolute inset-y-0 right-2 flex items-center text-[11px]" style={{ color: INK_DIM }}>
                      {t('edit.noWords', 'No words on it yet')}
                    </span>
                  )}
                  <>
                    {edit.pieces.map((one) => {
                      const said = (one.words ?? '').trim();
                      if (!said) return null;
                      const long = lengthOfPiece(one);
                      const when = wordsSpan(one, long, wordsReach(edit, one.id));
                      const left = (startsAt(edit, one.id) + when.from) * perSecond;
                      const wide = Math.max(6, (when.to - when.from) * perSecond);
                      return (
                        <div
                          key={one.id}
                          data-editorwordsblock={one.id}
                          onPointerDown={(event) => { holding(); takeWords(null, one.id, event); }}
                          title={said}
                          style={{ left, width: wide, background: 'rgba(52,211,153,0.28)' }}
                          className="absolute inset-y-0 cursor-move touch-none overflow-hidden rounded-md"
                        >
                          <span
                            className="pointer-events-none block truncate px-2 text-[10px] font-bold leading-[18px]"
                            style={{ color: INK }}
                          >
                            {said}
                          </span>
                          {/* Both ends, each its own grab. Wider than they
                              look, because a two-pixel target is a target
                              nobody hits with a thumb. */}
                          {/* ── The grips leave a middle to grab ────────

                              Twelve pixels each, until the block is narrower
                              than about forty — then a third of it each, so
                              there is always a middle third that moves the
                              caption rather than resizing it.

                              Found by `audit/editor.mjs`: a caption dragged
                              down to its shortest was twenty pixels wide, and
                              twenty pixels is two twelve-pixel grips with a
                              negative gap between them. The centre of the
                              block — which is where a hand aims to MOVE a
                              thing — was inside the left grip, so the only
                              gesture a short caption had was resizing. */}
                          <span
                            data-editorwordsfrom={one.id}
                            onPointerDown={(event) => { holding(); takeWords('from', one.id, event); }}
                            style={{ width: Math.max(6, Math.min(12, wide / 3)) }}
                            className="absolute inset-y-0 left-0 cursor-ew-resize touch-none"
                          >
                            <span className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-full" style={{ background: LIT }} />
                          </span>
                          <span
                            data-editorwordsto={one.id}
                            onPointerDown={(event) => { holding(); takeWords('to', one.id, event); }}
                            style={{ width: Math.max(6, Math.min(12, wide / 3)) }}
                            className="absolute inset-y-0 right-0 cursor-ew-resize touch-none"
                          >
                            <span className="pointer-events-none absolute inset-y-0 right-0 w-1 rounded-full" style={{ background: LIT }} />
                          </span>
                        </div>
                      );
                    })}
                  </>
                </div>

                {/* The blocks, at their real place in time. */}
                <div
                  className="relative"
                  style={{ height: laneTall }}
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
                        onClick={() => { setPicked(one.id); setLane('film'); }}
                        className="absolute top-1 bottom-1 overflow-hidden rounded-lg px-2 py-1 text-left"
                        style={{
                          left: from * perSecond,
                          width: Math.max(THINNEST, wide),
                          /* The booth's own shape for a picked block: a filled
                             inset ring rather than a border that moves the
                             contents by two pixels when it thickens. A block
                             that shifts when you select it is a block that looks
                             like it moved on the clock. */
                          background: on ? 'rgba(52,211,153,0.18)' : 'rgba(236,253,245,0.07)',
                          boxShadow: on
                            ? '0 0 0 2px rgba(52,211,153,0.85) inset'
                            : '0 0 0 1px rgba(16,185,129,0.22) inset',
                        }}
                      >
                        <span
                          className="block truncate text-[11px] font-semibold"
                          style={{ color: on ? '#ecfdf5' : 'rgba(236,253,245,0.8)' }}
                        >
                          {one.name}
                        </span>
                        <span className="block text-[11px] tabular-nums" style={{ color: 'rgba(236,253,245,0.45)' }}>
                          {seconds(lengthOfPiece(one))}
                        </span>
                      </button>
                    );
                  })}

                  {/* ── The way to more material, at the end of what there is ──

                      Carli's screenshots all carry one: a square with a plus on
                      it, sitting after the last clip on the strip.

                      It is the same door the Bring-it-in bench is, and that is
                      the point of it being here as well. Somebody who has just
                      watched their film end is looking at the end of the strip,
                      not at a bar five controls away — so the thing they want
                      next is under their thumb rather than two presses off.

                      Inside the scrolling strip, after the last block, so it
                      moves with the film instead of floating over it. */}
                  <button
                    type="button"
                    data-editoradd
                    aria-label={t('cut.folder', 'Bring it in')}
                    onClick={() => setBench('folder')}
                    style={{ left: total * perSecond + 6 }}
                    title={t('cut.folder', 'Bring it in')}
                    className="absolute top-1 bottom-1 w-11 rounded-lg inline-flex items-center justify-center"
                  >
                    <span
                      className="flex h-full w-full items-center justify-center rounded-lg"
                      style={{
                        background: 'rgba(236,253,245,0.07)',
                        boxShadow: '0 0 0 1px rgba(16,185,129,0.22) inset',
                        color: 'rgba(236,253,245,0.7)',
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>

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

                </div>
                </div>

                {/* ── The grip that makes the clock taller ──────────────

                    Under the picture lane, which is the one it resizes: a
                    handle above the ruler is a handle between her and the thing
                    she is reading, and the gesture is "pull the bottom of the
                    clock down", which is where the bottom is.

                    `touch-none` so a phone drags the clock instead of
                    scrolling the room, and a real 44-pixel target with a
                    hairline drawn inside it — the handle has to be a thumb
                    tall even though it looks like a line. */}
                <div
                  data-editorlanegrip
                  role="separator"
                  aria-label={t('edit.laneTall', 'How tall the clock is')}
                  aria-valuenow={laneTall}
                  aria-valuemin={SHORTEST_LANE}
                  aria-valuemax={TALLEST_LANE}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    const by = event.key === 'ArrowUp' ? -8 : event.key === 'ArrowDown' ? 8 : 0;
                    if (!by) return;
                    event.preventDefault();
                    setLaneTall((was) => Math.max(SHORTEST_LANE, Math.min(TALLEST_LANE, was + by)));
                  }}
                  /* ── Listened for on the window, not on the grip ──────

                     Every other drag in this room holds the pointer on the
                     thing being dragged: a caption block stays under the
                     finger, so listeners on the node see the whole gesture.
                     This one is different in a way that is easy to miss — the
                     grip MOVES as the clock changes height, by exactly the
                     amount of the drag, so the pointer is off it after the
                     first few pixels.

                     `setPointerCapture` is meant to cover that and did not:
                     `audit/editor.mjs` measured a drag of a hundred and forty
                     pixels moving the clock eighteen, and a trace of it
                     showed the height changing on the FIRST pointermove and
                     never again.

                     The window hears every move there is. It costs two
                     listeners for the length of a gesture and it cannot lose
                     one. */
                  onPointerDown={(event) => {
                    /* Stops the browser starting its own gesture on this press.
                       Without it Chromium began one after the first move and
                       fired `pointercancel` at the window, which ended the
                       resize eighteen pixels into a hundred-and-forty-pixel
                       drag — once, every time, measured. */
                    event.preventDefault();
                    const startY = event.clientY;
                    const startTall = laneTall;
                    const move = (m: PointerEvent) => {
                      setLaneTall(Math.max(SHORTEST_LANE, Math.min(
                        TALLEST_LANE, startTall + (m.clientY - startY),
                      )));
                    };
                    const done = () => {
                      window.removeEventListener('pointermove', move);
                      window.removeEventListener('pointerup', done);
                      window.removeEventListener('pointercancel', done);
                    };
                    window.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', done);
                    window.addEventListener('pointercancel', done);
                  }}
                  className="mt-1 flex h-9 cursor-ns-resize touch-none items-center justify-center gap-2 rounded-lg"
                  style={{ background: 'rgba(52,211,153,0.10)' }}
                >
                  {/* ── It says what it is ──────────────────────────────

                      This was a bare ten-pixel line. It worked — the probe
                      drags it and the clock really changes height — and Carli
                      said on 4 October, after it was built and pushed, that
                      the timeline still could not be stretched. She was not
                      wrong about anything except the cause: a handle nobody
                      can see is a handle that is not there.

                      So it carries its own name and two arrows. A grip in a
                      room full of green blocks has to look like a control
                      rather than like a divider between two of them. */}
                  <ChevronsUpDown aria-hidden className="h-3.5 w-3.5" style={{ color: LIT }} />
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK_DIM }}>
                    {t('edit.laneDrag', 'Drag to resize the clock')}
                  </span>
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
                {/* ── The shots' own sound, on a lane of its own ─────────

                    Carli, 4 October 2026: *"Die eie video se klank moet sy eie
                    klankbaan hê, en die musiek wat in gebring word moet nog 'n
                    tydlyn wees onder die video se klankbaan. Elke klankbaan
                    moet golwe hê, sodat golwe gematch kan word wanneer
                    nodig."*

                    Two lanes, in that order, because that is the order they
                    are mixed in: the shot is the thing and the music is under
                    it. This was one lane with the music in it and a
                    one-pixel line per talking shot — which said THAT a shot
                    had sound and nothing about what the sound was.

                    "Sodat golwe gematch kan word" is the specification. Every
                    wave here is read from the file it sits under, by the same
                    reader the Pro Booth's lanes use. A drawn squiggle would be
                    a picture of nothing and you could not line a drum hit up
                    against a cut with it. */}
                <div
                  className="relative border-t border-zinc-800"
                  style={{ height: soundTall }}
                  data-editorshotlane
                >
                  <span className="pointer-events-none absolute left-2 top-0.5 z-10 text-[10px] font-bold uppercase tracking-wide" style={{ color: INK_DIM }}>
                    {t('edit.shotSound', 'The shots')}
                  </span>
                  {edit.pieces.filter((one) => one.sound).map((one) => (
                    <button
                      type="button"
                      key={one.id}
                      data-editorownsound={one.id}
                      aria-pressed={lane === 'shots' && picked === one.id}
                      /* Picks the SHOT, not a lane of its own. A shot's sound
                         is that shot: splitting one without the other would be
                         two clips claiming the same seconds. So tapping a wave
                         puts every control that acts on a shot — Split in two
                         among them — on the shot it belongs to. */
                      onClick={() => { setPicked(one.id); setLane('shots'); }}
                      style={{
                        left: startsAt(edit, one.id) * perSecond,
                        width: Math.max(THINNEST, lengthOfPiece(one) * perSecond),
                        ...(lane === 'shots' && picked === one.id
                          ? { boxShadow: `inset 0 0 0 2px ${LIT}` } : {}),
                      }}
                      className="absolute inset-y-1 overflow-hidden rounded-md"
                    >
                      <WaveBlock
                        sound={one.clip}
                        wide={Math.max(THINNEST, lengthOfPiece(one) * perSecond)}
                        tall={Math.max(8, soundTall - 8)}
                        colour="rgba(52,211,153,0.9)"
                        /* The trim, so the wave is the part of the clip that is
                           actually in the film — a wave of the whole file under
                           a block showing four seconds of it is a wave of
                           something nobody hears. */
                        from={one.from}
                        long={Math.max(0.01, one.to - one.from)}
                      />
                    </button>
                  ))}
                  {!edit.pieces.some((one) => one.sound) && (
                    <span className="absolute inset-y-0 right-2 flex items-center text-[11px]" style={{ color: INK_DIM }}>
                      {t('edit.noShotSound', 'No shot is speaking yet')}
                    </span>
                  )}
                </div>

                {/* ── And the music, under it ────────────────────────────── */}
                <div
                  className="relative border-t border-zinc-800"
                  style={{ height: soundTall }}
                  data-editorsoundlane
                >
                  <span className="pointer-events-none absolute left-2 top-0.5 z-10 text-[10px] font-bold uppercase tracking-wide" style={{ color: INK_DIM }}>
                    {t('edit.musicLane', 'The music')}
                  </span>
                  {edit.under ? (
                    <div
                      data-editorbed
                      aria-pressed={lane === 'music'}
                      /* Picked on the way down, before the drag: the bed has
                         always been scrubbable and that gesture stays exactly
                         as it was — what it did not do was tell the room that
                         the song is what she is working on. */
                      onPointerDown={(event) => { setLane('music'); scrubBed(event); }}
                      style={{
                        width: Math.max(0, total * perSecond),
                        ...(lane === 'music' ? { boxShadow: 'inset 0 0 0 2px #38bdf8' } : {}),
                      }}
                      className="absolute inset-y-1 left-0 cursor-ew-resize touch-none overflow-hidden rounded-lg border border-sky-500/40 bg-sky-500/10"
                    >
                      <WaveBlock
                        sound={edit.under}
                        wide={Math.max(0, total * perSecond)}
                        tall={Math.max(8, soundTall - 8)}
                        colour="rgba(125,211,252,0.9)"
                        /* From wherever she dragged it to, for as long as the
                           film runs: the bed is scrubbed rather than moved, so
                           what changes is WHICH PART of the song is under the
                           film. A wave drawn from the top of the file would be
                           the shape of a part nobody is hearing. */
                        from={edit.underFrom ?? 0}
                        long={total}
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-2 text-[10px] font-semibold text-sky-200">
                        {t('edit.bedFrom', 'From')} {seconds(edit.underFrom ?? 0)}
                        {underLength > 0 ? ` / ${seconds(underLength)}` : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="absolute inset-y-0 right-2 flex items-center text-[11px]" style={{ color: INK_DIM }}>
                      {t('edit.noBed', 'No track under it yet')}
                    </span>
                  )}
                </div>

                {/* ── The cursor, over every lane ─────────────────────────

                    Carli, 5 October 2026: *"Daai cursor moet oor die hele
                    tydlyn strek en ook die klankbane vang en speel."*

                    It was drawn inside the picture lane, so it stopped at the
                    bottom of the blocks and said nothing about where the words
                    or the music were at that second — which is most of what a
                    person is reading a stack of lanes FOR. Lining a drum hit
                    up against a cut needs one line through both.

                    Up here instead of in the track, because this is the
                    element every lane is measured against: they all start at
                    its left edge and are drawn at the same `perSecond`, so one
                    line across it is in the right place on all of them by
                    construction rather than by three sums agreeing.

                    Still `pointer-events-none`, and that matters more now than
                    it did: the line crosses every lane, and one that swallowed
                    a press would make a vertical stripe of the whole clock
                    dead to the touch. */}
                {/* ── The two red lines ─────────────────────────────

                    Carli, 4 October 2026: *"Dit sal goed wees dat daar twee
                    ekstra rooi lyne is waar mens 'n stuk kan uit cut."*

                    Red, and the only red in this room, because they are the
                    only thing in it that deletes. Everything else here is
                    green or amber and reversible.

                    Drawn under the playhead and over the blocks, with the
                    span between them shaded so what will go is a shape
                    rather than two lines somebody has to read as a pair.
                    `pointer-events-none` like the playhead: tapping "on the
                    line" has to reach the block underneath, and the lines
                    are moved from the bench rather than dragged, so there is
                    nothing to grab. */}
                {span && (
                  <>
                    <div
                      data-editorspan
                      aria-hidden
                      style={{
                        left: Math.min(span.from, total) * perSecond,
                        width: Math.max(0, Math.min(span.to, total) - span.from) * perSecond,
                      }}
                      className="pointer-events-none absolute inset-y-0 bg-red-500/20"
                    />
                    <div
                      data-editorspanin
                      aria-hidden
                      style={{ left: Math.min(span.from, total) * perSecond }}
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-500"
                    >
                      <span className="absolute -top-1 -left-1 block h-2.5 w-2.5 rounded-full bg-red-500" />
                    </div>
                    <div
                      data-editorspanout
                      aria-hidden
                      style={{ left: Math.min(span.to, total) * perSecond }}
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-500"
                    >
                      <span className="absolute -top-1 -left-1 block h-2.5 w-2.5 rounded-full bg-red-500" />
                    </div>
                  </>
                )}

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

        {/* ── Taking it back, always on the screen ────────────────────────

            Not behind a bench, and that is the one thing in this room that
            must not be. Undo is reached for in the half second AFTER a mistake,
            and a mistake made with the Looks bench open is undone with the
            Looks bench open — so a pair of arrows that first need a bench
            closed and another opened is a pair of arrows nobody reaches in
            time. Every editor keeps them on the surface.

            Under the clock rather than over the picture, because the picture is
            the thing being judged and the clock is the thing being changed. */}
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

        {problem && (
          <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
            {problem}
          </p>
        )}

        {/* A save that could not happen. Said out loud and not swallowed:
            this room keeps her project on the device, and the one moment she
            has to know it is NOT keeping it is while there is still a film on
            the clock to export. */}
        {kept === 'full' && (
          <p role="alert" data-editorkeptfull className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
            {t(
              'edit.keptFull',
              'This device has no room left to keep the project, so it will not be here when you come back. Put the film together and save it now, or clear some space first.',
            )}
          </p>
        )}

        {/* The finished film, outside the benches on purpose: a film that
            arrived behind a panel somebody has to reopen is a film they are
            not sure they got. */}
        {made && (
          <div className="space-y-2" data-editormade>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={made.url}
              /* The cover, where a cover belongs: the picture a player shows in
                 the film's place before it has loaded. */
              poster={coverUrl ?? undefined}
              controls
              className="w-full rounded-xl border border-zinc-800 bg-black"
            />
            <button
              type="button"
              data-editorsave
              onClick={() => {
                const name = safeFilename(edit.pieces[0]?.name ?? 'film', made.ext);
                downloadBlob(made.blob, name);
                /* And the cover beside it. "Wanneer die video ge-export word"
                   is the whole request — a cover that is only ever on screen
                   is a feature that exists nowhere else. Named off the film's
                   own name so the two sit together in a downloads folder. */
                if (edit.cover) downloadBlob(edit.cover, coverName(name));
              }}
              className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('edit.save', 'Save it')}
            </button>
          </div>
        )}
      </div>

      {/* ── The copilot, over the room ──────────────────────────────────

          The same sheet the benches use, so it opens the way everything else
          in this room opens and closes with the same word. Taller than a
          bench — it is a conversation, not five sliders — and still capped,
          because the bar underneath it has to stay reachable: a chat panel
          that covers the transport is a chat panel you have to close to press
          play. */}
      {copilot && asking2 && (
        <div className="flex min-h-0 max-h-[72dvh] flex-col">
          <DeskSheet
            icon={<Sparkles className="w-4 h-4" />}
            title={t('edit.ask.title', 'Ask the copilot')}
            what={t(
              'edit.ask.what',
              'It knows which room you are in and what is on the clock. Ask it what a tool does, or what to try next.',
            )}
            closeSays={t('edit.ask.shut', 'Close the copilot')}
            look={CUT_LOOK}
            plain
            onClose={() => setAsking2(false)}
          >
            {/* Filling the sheet. `Copilot.tsx`'s root is `h-full min-h-0`,
                which needs a parent with a height to be full of — without
                this it sizes to its content and the box she types into ends
                up wherever the last message left it. */}
            <div className="flex min-h-0 flex-1 flex-col">{copilot}</div>
          </DeskSheet>
        </div>
      )}

      {/* ── The bar, and what comes out from behind it ──────────────────── */}
      <CutDock
        open={bench}
        onOpen={setBench}
        playing={running}
        onPlay={() => setRunning((was) => !was)}
        onSkip={(by) => scrubTo(at + by)}
        place={total > 0 ? `${seconds(at)} / ${seconds(total)}` : undefined}
        noClip={!piece}
      >
        {bench === 'folder' && (
          <div className="space-y-3">
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

          {/* ── And putting this one down ──────────────────────────────

              Beside the way in, because that is where somebody stands when
              they have finished one thing and want to start the next.

              Through `commit`, so it is a history step like everything else:
              one press of Back brings the whole project back. The material is
              still in memory on the pieces, so the save that follows puts it
              straight back on the disk — which is the difference between a
              button that is safe to press and one that is not. */}
          {edit.pieces.length > 0 && (
            <button
              type="button"
              data-editornewproject
              onClick={() => {
                if (!starting) { setStarting(true); return; }
                setStarting(false);
                commit(() => NOTHING);
                setMark(null);
                setMarkName('');
                setMade(null);
                setPicked('');
                setAt(0);
                setRunning(false);
                setBench(null);
              }}
              onBlur={() => setStarting(false)}
              className="min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
              style={starting
                ? { borderColor: '#ef4444', background: 'rgba(239,68,68,0.22)', color: '#fecaca' }
                : { borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.12)', color: INK }}
            >
              <Trash2 className="w-4 h-4" />
              {starting
                ? t('edit.newSure', 'Really — put this film down')
                : t('edit.newProject', 'New project')}
            </button>
          )}

          {/* ── Or something already in her channel ──────────────────────

              Carli, 4 October 2026: *"die button wat sê bring it in, or
              choose from channel"*.

              The opening page sends her here with the list already loading.
              It is the same bench either way, so there is one copy of the
              cards and not a second set behind the opening. */}
          <div className="space-y-2" data-editorchannel>
            <div className="flex items-baseline justify-between gap-2">
              <span className="block text-sm text-zinc-400">
                {t('edit.channel', 'From your channel')}
              </span>
              <button
                type="button"
                data-editorchannelload
                onClick={() => { void loadChannel(); }}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 hover:border-zinc-600"
              >
                {busy === 'channel'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                {channel === null
                  ? t('edit.channelLook', 'Look')
                  : t('edit.channelAgain', 'Again')}
              </button>
            </div>

            {channel !== null && channel.length === 0 && (
              <p className="text-sm text-zinc-400" data-editorchannelnone>
                {t(
                  'edit.channelNone',
                  'Nothing in your channel yet. Film something in Pro Booth, or bring a clip in from this device.',
                )}
              </p>
            )}

            {channel !== null && channel.length > 0 && (
              <ul className="space-y-2">
                {channel.map((one) => (
                  <li key={one.id}>
                    <button
                      type="button"
                      data-editorchannelpick
                      disabled={!!pulling}
                      onClick={() => { void bringFromChannel(one); }}
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-200 inline-flex items-center gap-2 hover:border-zinc-600 disabled:opacity-60"
                    >
                      {pulling === one.id
                        ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                        : <Film className="w-4 h-4 flex-shrink-0" />}
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {one.title || t('edit.channelUntitled', 'Untitled')}
                      </span>
                      <span className="flex-shrink-0 text-zinc-400">{seconds(one.seconds)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          </div>
        )}

        {bench === 'clip' && piece && (
          <div className="space-y-4">

          {/* ── Cutting: the playhead, the two lines, and what goes ─────

              Carli, 4 October 2026: *"Dit sal goed wees dat daar twee ekstra
              rooi lyne is waar mens 'n stuk kan uit cut, en 'n funksie om bloot
              net waar die curser is te split. Dan ook die oomblik wanneer 'n
              mens 'n stuk uit cut moet die video wat verder is die gaping toe
              maak en terug spring."*

              Four buttons and two switches, in the order somebody works: put a
              line down, put the other down, take what is between them out. The
              split is beside them because it is the same gesture with one line
              instead of two. */}
          <div className="space-y-2">
            <span className="block text-sm text-zinc-400">
              {t('edit.cutting', 'Cutting')}
            </span>
            {/* ── Which lane the lines are cutting ─────────────────────

                Carli, 5 October 2026: *"Die sound tracks onder videos moet ook
                geselect kan word, sodat mens daardie tyd lyne ook kan split."*

                Said on the panel and not only shown by a ring on the lane:
                these are the buttons that take something out, and "out of
                what" is the one thing somebody must not have to guess at. */}
            <p className="text-sm" style={{ color: INK_DIM }} data-editorlanesays>
              {lane === 'music'
                ? t('edit.cuttingMusic', 'The lines are cutting the music. The picture stays where it is.')
                : t('edit.cuttingFilm', 'The lines are cutting the film. Tap the music lane to cut the song instead.')}
            </p>

            <div className="flex flex-wrap gap-2">
              {lane !== 'music' && (
              <button
                type="button"
                data-editorsplithere
                onClick={() => commit((was) => splitHere(was, at))}
                className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
                style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
              >
                <Scissors className="w-3.5 h-3.5" />
                {t('edit.splitHere', 'Split here')}
              </button>
              )}
              <button
                type="button"
                data-editormarkin
                onClick={() => commit((was) => ({
                  ...was,
                  span: tidy(stick(at), was.span?.to ?? stick(at) + 1),
                }))}
                className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold"
                style={{ borderColor: 'rgba(239,68,68,0.55)', background: 'rgba(239,68,68,0.16)', color: '#fca5a5', boxShadow: RAISE }}
              >
                {t('edit.markIn', 'Line in')}
              </button>
              <button
                type="button"
                data-editormarkout
                onClick={() => commit((was) => ({
                  ...was,
                  span: tidy(was.span?.from ?? 0, stick(at)),
                }))}
                className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold"
                style={{ borderColor: 'rgba(239,68,68,0.55)', background: 'rgba(239,68,68,0.16)', color: '#fca5a5', boxShadow: RAISE }}
              >
                {t('edit.markOut', 'Line out')}
              </button>
            </div>

            {spanReady(span) ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-editorcutspan
                  /* The same two lines, on whichever lane is picked. `cutSong`
                     is the half of `cutOut` that the interlock has been doing
                     since the lines were built — one answer to "what does the
                     song do when something comes out of it", rather than a
                     second mechanism beside it. */
                  onClick={() => commit((was) => (lane === 'music'
                    ? cutSong(was, span)
                    : cutOut(was, span)))}
                  disabled={lane === 'music' && !edit.under}
                  className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-bold disabled:opacity-40"
                  style={{ borderColor: '#ef4444', background: 'rgba(239,68,68,0.3)', color: '#fee2e2', boxShadow: RAISE }}
                >
                  {lane === 'music'
                    ? t('edit.cutSong', 'Cut it out of the song')
                    : t('edit.cutSpan', 'Cut this out')}
                  {' · '}
                  {(span.to - span.from).toFixed(1)}s
                </button>
                <button
                  type="button"
                  data-editorclearspan
                  onClick={() => commit((was) => ({ ...was, span: null }))}
                  className="min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold"
                  style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
                >
                  {t('edit.clearSpan', 'Take the lines off')}
                </button>
              </div>
            ) : (
              <p className="text-sm" style={{ color: INK_DIM }} data-editorspanhint>
                {t('edit.spanHint', 'Put a line in and a line out, and what is between them comes out. The film closes up behind it.')}
              </p>
            )}

            {/* The magnet and the interlock, named the way the booth names
                them because they are the booth's own two ideas. */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={magnetOn}
                data-editormagnet
                onClick={() => commit((was) => ({ ...was, magnet: !(was.magnet ?? true) }))}
                className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold"
                style={magnetOn ? {
                  borderColor: LIT, background: 'rgba(52,211,153,0.16)', color: LIT, boxShadow: PRESS,
                } : {
                  borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE,
                }}
              >
                {t('edit.magnet', 'Magnet')}
              </button>
              <button
                type="button"
                aria-pressed={edit.locked ?? true}
                data-editorinterlock
                onClick={() => commit((was) => ({ ...was, locked: !(was.locked ?? true) }))}
                title={t('edit.interlock.what', 'The song is cut where the picture is, so every shot keeps the music it was cut to.')}
                className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold"
                style={(edit.locked ?? true) ? {
                  borderColor: LIT, background: 'rgba(52,211,153,0.16)', color: LIT, boxShadow: PRESS,
                } : {
                  borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE,
                }}
              >
                {t('edit.interlock', 'Interlock')}
              </button>
            </div>
          </div>

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
        )}

        {bench === 'looks' && piece && (
          <div className="space-y-4">
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

          {/* ── The dials, under the looks ──────────────────────────────

              Carli, 4 October 2026, after sending seven more screenshots:
              *"Om seker te maak al die video editing tools is daar."*

              Her Adjust sheet carries about twenty of these. Five of them are
              a `filter` string the browser applies for free, in real time, on
              the preview and on the render alike — these five. The other
              fifteen are a tone map or a second pass over the pixels, and
              `videoadjust.ts` names every one of them and says why it is not
              here, rather than leaving somebody to find out by moving a dial
              that does nothing.

              In the same bench as the looks because they are one decision seen
              twice: the look is the choice, the dials are the correction, and
              judging either without the other is judging half a picture. */}
          <div className="space-y-2" data-editoradjust>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-zinc-400">{t('adj.title', 'Adjust')}</span>
              {adjusted(piece.adjust) && (
                <button
                  type="button"
                  data-editoradjustreset
                  onClick={() => tweak({ adjust: { ...NO_ADJUST } })}
                  className="min-h-[44px] rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 inline-flex items-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {t('adj.reset', 'Put them all back')}
                </button>
              )}
            </div>

            {DIALS.map((dial) => {
              const at = piece.adjust?.[dial.id] ?? dial.rest;
              return (
                <label key={dial.id} className="block space-y-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm text-zinc-400">
                    <span>{t(dial.label[0], dial.label[1])}</span>
                    {/* The number beside the name, because a slider at two
                        thirds of its track is not a value anybody can report
                        back to me down a phone line. */}
                    <span
                      data-editordialnow={dial.id}
                      className="tabular-nums text-zinc-500"
                    >
                      {dial.id === 'warm' ? `${Math.round(at)}°` : at.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={dial.least}
                    max={dial.most}
                    step={dial.step}
                    value={at}
                    data-editordial={dial.id}
                    {...gesture}
                    onChange={(e) => slide({
                      adjust: { ...NO_ADJUST, ...piece.adjust, [dial.id]: Number(e.target.value) },
                    })}
                    className="w-full accent-emerald-500"
                  />
                </label>
              );
            })}
          </div>

          </div>
        )}

        {bench === 'words' && piece && (
          <div className="space-y-3">
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
              {/* ── The colour of the words, and what sits behind them ────

                  Carli, 4 October 2026: *"Onthou dat die teks 'n kleur keuse
                  ook moet hê, en 'n keuse van agtergrond vir woorde, 'n
                  square, 'n square met ronde punte, 'n verfkwas. Die
                  agtergrond moet ook kleur keuse hê. Daar moet 'n goeie
                  variety van kleur keuses wees."*

                  The shape first, because it decides whether the second row of
                  swatches means anything: with no box there is no background to
                  colour, so that row is not drawn rather than drawn dead. */}
              <div className="space-y-1.5">
                <span className="block text-sm text-zinc-400">
                  {t('edit.wordsBox', 'Behind the words')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {BOXES.map((one) => {
                    const on = (piece.wordsBox ?? BOX_DEFAULT) === one.id;
                    return (
                      <button
                        key={one.id}
                        type="button"
                        aria-pressed={on}
                        data-editorwordsbox={one.id}
                        /* `wordsRound: undefined` with it: the shape sets the
                           corner radius, and a number left over from the last
                           shape would make a square with rounded corners. */
                        onClick={() => tweak({ wordsBox: one.id, wordsRound: undefined })}
                        className="min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold"
                        style={on ? {
                          borderColor: LIT, background: 'rgba(52,211,153,0.16)', color: LIT, boxShadow: PRESS,
                        } : {
                          borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE,
                        }}
                      >
                        {t(one.name[0], one.name[1])}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Swatches
                label={t('edit.wordsInk', 'The words')}
                mark="ink"
                chosen={piece.wordsInk ?? 'white'}
                onPick={(id) => tweak({ wordsInk: id })}
                t={t}
              />

              {(piece.wordsBox ?? BOX_DEFAULT) !== 'none' && (
                <Swatches
                  label={t('edit.wordsBack', 'What is behind them')}
                  mark="back"
                  chosen={piece.wordsBack ?? 'black'}
                  onPick={(id) => tweak({ wordsBack: id })}
                  t={t}
                />
              )}

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
          </div>
        )}

        {bench === 'sound' && (
          <div className="space-y-3">
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
        )}

        {bench === 'mark' && (
          <div className="space-y-3">
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
              {/* ── And off again ───────────────────────────────────────

                  Carli, 5 October 2026: *"Daar is nie 'n knoppie om 'n logo
                  uit te haal en te delete nie."*

                  A one-way door: the picker put a logo on and nothing took it
                  off, so a mark chosen by mistake was on the film until the
                  page was reloaded — which, since 5 October, no longer loses
                  the project and therefore no longer clears it either. The two
                  changes together turned a nuisance into a trap.

                  The size, the turn and the fade are left where they are. She
                  set those by eye and a second logo almost always wants the
                  same treatment; clearing them would make every replacement
                  start from the defaults. */}
              <button
                type="button"
                data-editormarkoff
                onClick={() => { setMark(null); setMarkName(''); }}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-300 inline-flex items-center gap-2 hover:border-rose-500 hover:text-rose-300"
              >
                <Trash2 className="w-4 h-4" />
                {t('edit.markOff', 'Take the logo off')}
              </button>

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
          </div>
        )}

        {bench === 'film' && (
          <div className="space-y-4">
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
                      className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold"
                      /* The chosen one painted from the room's own palette
                         rather than `text-emerald-300`.
 
                         `emerald` maps onto the app's primary ramp, and the
                         theme this app ships is light — so `emerald-300` is a
                         mid green meant to sit on a pale card. On this room's
                         near-black panel, under a ten-per-cent green fill, it
                         measured 2.06:1. `audit/contrast.mjs` named it the
                         moment it learnt to open a bench, and it was the one
                         thing left below AA in the whole room.
 
                         It is also why this cannot be fixed by the room's
                         button rule in `globals.css`: that rule excludes
                         anything carrying `bg-emerald`, on purpose, because a
                         button that already declares an intent must keep it.
                         A selected chip declares one, so it paints itself. */
                      style={on ? {
                        borderColor: LIT,
                        background: 'rgba(52,211,153,0.16)',
                        color: LIT,
                        boxShadow: PRESS,
                      } : {
                        borderColor: 'rgba(16,185,129,0.45)',
                        background: 'rgba(52,211,153,0.18)',
                        color: INK,
                        boxShadow: RAISE,
                      }}
                    >
                      {one === 'tall' ? t('edit.tall', 'Tall') : one === 'wide' ? t('edit.wide', 'Wide') : t('edit.square', 'Square')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── The cover ──────────────────────────────────────────────

                Carli, 4 October 2026: *"Daar moet ook 'n opsie wees om 'n
                cover foto vir die video te screen shot uit die video, of een in
                te bring wat dan die video se voorblad foto word ook wanneer die
                video ge-export word."*

                Both ways, side by side, because neither is the obvious one: a
                frame out of the film is quicker, a picture brought in is what
                somebody with a designed thumbnail wants, and there is no
                guessing which. See `videocover.ts` for why a cover cannot live
                inside the film file and what it is instead. */}
            <div className="space-y-2">
              <span className="block text-sm text-zinc-400">
                {t('edit.cover', 'The cover')}
              </span>

              {coverUrl ? (
                <div className="flex items-start gap-3">
                  <img
                    src={coverUrl}
                    alt={t('edit.coverShown', 'The film\u2019s cover')}
                    data-editorcovershown
                    className="h-24 w-auto rounded-lg border"
                    style={{ borderColor: 'rgba(16,185,129,0.45)', background: '#000' }}
                  />
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: INK_DIM }}>
                      {edit.coverFrom === 'brought'
                        ? t('edit.coverBrought', 'A picture you brought in.')
                        : t('edit.coverShot', 'A frame out of the film.')}
                    </p>
                    <button
                      type="button"
                      data-editorcoverclear
                      onClick={() => commit((was) => ({ ...was, cover: null, coverFrom: undefined }))}
                      className="min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold"
                      style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
                    >
                      {t('edit.coverClear', 'Take it off')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: INK_DIM }}>
                  {t('edit.coverHint', 'The picture shown in the film\u2019s place before it plays. It is saved beside the film.')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-editorcovershot
                  disabled={!piece}
                  onClick={() => { void takeCover(); }}
                  className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
                  style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {t('edit.coverTake', 'Take this frame')}
                </button>
                <label
                  data-editorcoverbring
                  className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('edit.coverBring', 'Bring one in')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = '';
                      /* Asked here rather than trusted to `accept`, which is a
                         filter on a picker and not a rule. */
                      if (!isPicture(file)) {
                        setProblem(t('edit.coverNotPicture', 'That is not a picture.'));
                        return;
                      }
                      setProblem('');
                      commit((was) => ({ ...was, cover: file, coverFrom: 'brought' }));
                    }}
                  />
                </label>
              </div>
            </div>

            {/* ── What the file is written at ────────────────────────────

                Carli, 4 October 2026: *"Die export moet ook 'n keuse van
                kwaliteit hê waarin dit export."*

                Two choices, not three. The bitrate is the number that actually
                governs how a compressed picture looks, and it is the one
                nobody can set sensibly without knowing the frame and the rate
                — so it is worked out from those two in `videoquality.ts` and
                shown as the size of the file, which is the thing she can act
                on. See `bitsFor`. */}
            <div className="space-y-1.5">
              <span className="block text-sm text-zinc-400">
                {t('edit.grade', 'How big a picture')}
              </span>
              <div className="flex flex-wrap gap-2">
                {GRADES.map((one) => {
                  const on = (edit.grade ?? GRADE_DEFAULT) === one.id;
                  return (
                    <button
                      key={one.id}
                      type="button"
                      aria-pressed={on}
                      data-editorgrade={one.id}
                      title={t(one.what[0], one.what[1])}
                      onClick={() => commit((was) => ({ ...was, grade: one.id }))}
                      className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold"
                      style={on ? {
                        borderColor: LIT, background: 'rgba(52,211,153,0.16)', color: LIT, boxShadow: PRESS,
                      } : {
                        borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE,
                      }}
                    >
                      {t(one.name[0], one.name[1])}
                    </button>
                  );
                })}
              </div>
              <span className="block text-sm" style={{ color: INK_DIM }}>
                {t(gradeFor(edit.grade).what[0], gradeFor(edit.grade).what[1])}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm text-zinc-400">
                {t('edit.fps', 'Frames a second')}
              </span>
              <div className="flex flex-wrap gap-2">
                {RATES.map((one) => {
                  const on = rateFor(edit.fps) === one;
                  return (
                    <button
                      key={one}
                      type="button"
                      aria-pressed={on}
                      data-editorfps={one}
                      onClick={() => commit((was) => ({ ...was, fps: one }))}
                      className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold tabular-nums"
                      style={on ? {
                        borderColor: LIT, background: 'rgba(52,211,153,0.16)', color: LIT, boxShadow: PRESS,
                      } : {
                        borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE,
                      }}
                    >
                      {one}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* The size, before the press rather than after it.

                A number afterwards is a surprise, and on a metered connection
                a surprise about size is the same kind of problem as a surprise
                about money. "About" because the bitrate is a target the
                encoder is free to miss, and claiming a tenth of a megabyte
                would be claiming precision this does not have. */}
            <p className="text-sm" style={{ color: INK_DIM }} data-editorweight>
              {(() => {
                const frame = sizeFor(SHAPES[edit.shape ?? 'tall'] ?? SHAPES.tall, edit.grade);
                const mb = weighs(total, bitsFor(frame.width, frame.height, rateFor(edit.fps)));
                return t('edit.weighs', 'About {mb} MB, at {w}×{h}')
                  .replace('{mb}', String(mb))
                  .replace('{w}', String(frame.width))
                  .replace('{h}', String(frame.height));
              })()}
            </p>

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

              {/* What a function costs is said once, under the rows, because
                  it is the thing somebody will ask: why is one caption the same
                  price as six? Because it is the TEXT TOOL that is charged for,
                  not each caption — and that is worth saying where the number
                  is, not only in a file nobody reads. */}
              {bill.functions > 0 && (
                <p data-editorperfunction className="text-sm text-emerald-400">
                  {t(
                    'edit.billPerFunction',
                    '{n} credits for each function you used, however many shots it is on.',
                  ).replace('{n}', String(CREDITS.filmWords))}
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
          </div>
        )}
      </CutDock>
    </div>
  );
}
