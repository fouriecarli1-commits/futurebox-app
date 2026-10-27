'use client';

/**
 * A post: a picture, and words on it that are actually words.
 *
 * ── What she asked for, and the one part that is a refusal ───────────────
 *
 * The owner, 6 October 2026: *"Kan ons 'n image generator kry, asook 'n image
 * editor? Dit moet al die goeie funksies hê om teks op te kan sit, mooi teks
 * formate …"* — and then, about where it is for: *"Dit is vir plasings vir
 * sosiale media en kan ook in die video editor ingesit word."*
 *
 * The tempting way to put words on a picture is to ask the image model for
 * them. It is the wrong way and it fails where it costs: these models draw
 * something letter-SHAPED, so a name comes back misspelt on the one post
 * that carries it. So the picture is a picture and the words are words,
 * drawn over it as real text — perfectly spelt, any face, movable
 * afterwards, and free, because nothing leaves the device to put a caption
 * on a post.
 *
 * ── The wall is not this room ────────────────────────────────────────────
 *
 * The owner, same message: *"'n Album art kan net op die spot generate word, of
 * kuns kan gekoop word. Ons blok mense om hulle eie prente in te sit,
 * andersins gaan hulle nooit album art koop nie."*
 *
 * So what is made here goes to a post or into the video editor, and cannot
 * become a song's cover. `check:coverwall` is what holds that: one route
 * writes a cover, its bytes come off the generator, and nothing else may
 * even spell the path. Her own picture is welcome HERE — she said so when
 * asked — and a social post without a photograph of a show is not a tool.
 *
 * ── The safe zones, borrowed from the video desk ─────────────────────────
 *
 * A story is posted into an app that prints its own things over it: a
 * caption along the bottom, buttons up the right. `lib/safezones.ts` already
 * knows where, for video. The same knowledge, one room over, is the
 * difference between finding that out here and finding it out after posting.
 *
 * Only the STORY carries it. A square in a feed has nothing drawn over it,
 * and an overlay on a shape that does not need one teaches somebody to
 * ignore it on the shape that does.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Aperture,
  ArrowLeft,
  Bookmark,
  Check, ChartColumn, Circle, PenTool, Megaphone, ShoppingBag, Shirt, Columns2, FileText, Paintbrush, Copy, Sun, ClipboardPaste, Crop as CropIcon, Scissors, Download, FlipHorizontal, Image as ImageIcon, Lasso, LayoutTemplate, Loader2, Maximize2, Move, Pencil, Plus, Redo2, RotateCcw, RotateCw, ScanText, SlidersHorizontal, Sparkles, Spline, Square, Trash2, Type, Undo2, Wand2, Eraser, Eye, EyeOff, Layers, LayoutGrid, ChevronUp, ChevronDown, Replace, ZoomIn, ZoomOut, Frame, X,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import CropSheet from './CropSheet';
import { assetId, rememberAsset, thumbnailOf } from '../lib/assets';
import { probeVideoEngine } from '../lib/videograde';
import { GLOWS, glowOf, haloPasses, NEON_WORDS, type GlowId } from '../lib/postglow';
import { TITLE_STYLES } from '../lib/posttitles';
import {
  ART_READY, MARK_SPECS, NEON_INKS, drawMark, isFilled, markBox, newMark, type Mark,
} from '../lib/postshapes';
import {
  fromFrame, maskFor as maskOfLine, middleOf, ontoFrame, pickAt, picksFrom,
  shareOf as shareOfLine, type Pick,
} from '../lib/textpick';
import {
  BACKDROPS, LETTER_GAP, LINE_GAP, POST_SIZES, SPOTS, atInside, atOf, behindWords,
  blockAt, boxFor as boxOfSpot, fitText, measureWithGap, moveInside,
  sizeById,
  type At, type Backdrop, type Measure, type PostSize, type SpotId,
} from '../lib/posttext';
import { ALL, boxOf } from '../lib/safezones';
import { CREDITS, creditsSaid } from '../lib/credits';
import { ACCEPTS, fit } from '../lib/imagefile';
import { useBackLayer } from '../lib/backstack';
import RoomDock, { type Bench, type BenchSpec } from './CutDock';
import CompareLine from './CompareLine';
import { useSideways } from '../lib/sideways';
import { useAtDesk } from '../lib/atdesk';
import DeskSheet from './BoothCard';
import BecomeBench, { BecomeNudge, IdeaPrompt, PeelOverlay, type PullTap, type StartBecome } from './BecomeBench';
import { IDEAS, offerIf, saidNotNow, saidYes, type IdeaMoment } from '../lib/ideas';
import { ambientOf } from '../lib/ambient';
import type { BecomeId } from '../lib/becomes';
import type { Cut } from '../lib/stickerize';
import CanvasSizeModal from './CanvasSizeModal';
import Darkroom from './Darkroom';
import VectorStudio from './VectorStudio';
import PosterMaker from './PosterMaker';
import { MeerkatThumb } from './MeerkatTile';
import type { MeerkatMood } from '../lib/meerkatphoto';
import ProductShots from './ProductShots';
import TryOn from './TryOn';
import type { VectorDoc } from '../lib/vectordoc';
import StudioTemplatesModal from './StudioTemplatesModal';
import { type StudioTemplateItem } from '../lib/studiotemplates';
import { CUT_LOOK } from '../lib/cutlook';
import { PHOTO } from '../lib/photolook';
import { ROOM_HEIGHT_GUESS, useOwnScreen, useRoomHeight } from '../lib/fullroom';
import { FACES, faceOf, faceReady, type FaceId } from '../lib/postfaces';
import { fitUnder, type Limit } from '../lib/squeeze';
import { GRID, bestCrop, interestOf, windowOf } from '../lib/smartcrop';
import FileSize, { type Estimate } from './FileSize';
import {
  MIDDLE, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP,
  canMove, moveBy, place, showsThrough, zoomAbout, zoomTo, type Crop,
} from '../lib/postcrop';
import {
  AUTO, PLAIN, RANGES, filterFor, lightnessOf, paintWashes, smartLight, touched, towards, washesOf, type Look,
} from '../lib/postlook';
import { canRead, readWords, tidy, wordsAtAll, type Readable } from '../lib/ocr';
import {
  LEAST as CROP_LEAST, WHOLE as ALL_OF_IT, cropped, cutTo, gripAt, moveBox,
  pullCorner, toShape, type Box as CropBox, type Grip,
} from '../lib/cropbox';
import {
  FORMATS, SCALES, canWebp, formatOf, holdsClear, nameFor, type FileKind, type Scale,
} from '../lib/postfile';
import {
  SHAPES, cutAlong, dragged, shapePath, trace, whyNot, worthCutting,
  type Path as Traced, type Shape as CutShape,
} from '../lib/lasso';
import { makeBack } from '../lib/postback';
import ShareRow from './ShareRow';
import { LADDER, REFERENCE_SIDE, packLed, packOne, roomForRefs } from '../lib/packpicture';
import { BUDGET } from '../lib/picturelimit';
import {
  LIVE_SECONDS, MOTIONS, MOTION_DEFAULT, motionWords,
} from '../lib/livingphoto';
/* `SHAPES` is already taken in this room by the pen's shapes — pencil,
   circle, square, line. These are the ratios a picture can be asked for. */
import { SHAPES as RATIOS, SHAPE_DEFAULT, type ShapeId } from '../lib/pictureshapes';
import { usePlain, useSetPlain } from '../lib/plainmode';
import { TEMPLATES, type Template } from '../lib/posttemplates';
import { templateStill } from '../lib/templatevideo';
import {
  BIGGER, SHARPEN, bigger, nextQuarter, sharpened, sizeOf, tooBig, turned,
  type Sharpness, type Times,
} from '../lib/postwork';
import {
  BEHIND, EDGES, behindOf, blurBehind, cutOut, edgeOf, maskOnto,
  type BehindId, type EdgeId,
} from '../lib/cutout';
import { NEARLY_ALL, takeGround } from '../lib/flatcut';
import { MOST_COLOURS, repaint } from '../lib/repaint';
import { liftWith, type Found } from '../lib/grabobject';
import { TOO_MUCH, erase, shareOf, stroke } from '../lib/erase';
import { useLang } from '../lib/i18n';
import { OPEN_PANEL_EVENT, takePanel } from '../lib/alltools';
import { askPdf } from '../lib/pdftools';
import { CHART_KINDS, CHART_TEMPLATES, LOOKS, MOST_POINTS, MOST_SERIES, cleanChart, drawChart, parseTable, type ChartSpec } from '../lib/postcharts';
import { canTouch, frontZ, movedOne, stackOf, type LayerOn } from '../lib/postlayers';
import { GAPS, LAYOUTS, cellHas, cellsOf, frameOf, type Cell, type CellLook } from '../lib/postcells';
import {
  FILTER_GROUPS, POST_FILTERS, drawFilterTile, drawSample, filterById, filterLabel, thumbOf, type FilterGroup,
} from '../lib/postfilters';
import {
  ART_BUCKET, ART_MAX_BYTES, DESIGNS, DESIGN_CATEGORIES, artUrl, cleanDesign, designLabel, drawDesign, sizeForArt,
  type Design, type DesignCategory, type DesignMark,
} from '../lib/postdesigns';
import { drawToolTile } from '../lib/posttooltiles';
import { withSaid } from '../lib/speak';
import { lookThrough, maskFromBox, maskFromGrey, maskFromStrokes, shareSelected, type SelectWhat, type Selection } from '../lib/postselect';
import { STYLE_GROUPS, drawStyleTile, styleAsk, styleById, styleLabel, stylesIn, type StyleGroup } from '../lib/magicstyles';
import { MAGIC_ASKS, brushRect, cropOf, laidIn, padded, type Brush, type Rect } from '../lib/magicedit';
import SpeakButton from './SpeakButton';
import { accessToken, getStorageClient } from '../lib/cloud';
import { stillWorthWaiting } from '../lib/jobwait';
import { FEED_PLATFORMS, cutOff, nearestKind, type FeedKind, type FeedPlatform } from '../lib/feedshapes';
import { ReportFlag } from './ReportSheet';
import { notify } from '../lib/notify';

const MIKRO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';

/* ── One control, one row ─────────────────────────────────────────────────
 
   The owner, 7 October 2026: *"bars binne pop outs moet ewe groot en lank wees,
   en alles moet baie eenvoudig en maklik wees."*
 
   Measured before changing anything, the picture bench held controls 34, 36
   and 44 pixels tall and 48, 106, 145 and 164 wide — six controls, six sizes.
   Every one had been written on its own, and each was reasonable on its own.
 
   So there is one control now and one row. The row is a GRID rather than a
   wrapping flex, which is the whole of "ewe lank": a flex row sizes every
   button to its own text, so four buttons are four widths and the ragged
   right-hand edge is what reads as untidy. A grid gives each one the same
   column whatever it says.
 
   44 is the floor the rest of the app already uses for a thumb — see
   `globals.css` under `pointer: coarse`. */
const KNOP = 'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl'
  + ' border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-300 text-center';
const RY = 'grid grid-cols-2 gap-2';
const RY3 = 'grid grid-cols-3 gap-2';
const RY4 = 'grid grid-cols-4 gap-2';

const VUL = 'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl'
  + ' bg-emerald-500 px-4 text-sm font-bold text-black disabled:opacity-40';
const LEEG = KNOP;
/**
 * What a chosen chip looks like.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * The owner, 8 October 2026: *"Die export se png en jpg buttons moet highlight
 * wanneer mens dit kies."*
 *
 * They already did, in the DOM: every chip in this room carries
 * `aria-pressed` and the chosen one got `border-emerald-500/60
 * text-emerald-400`. What it did NOT get was a fill — so on this room's
 * near-black panel the whole difference between chosen and not chosen was a
 * grey border going half-strength green and the text going from zinc-300 to
 * emerald-400. Two small changes, both of them in colour alone, on a dark
 * card.
 *
 * It was not just the two she named. Nine chip sets in this file were written
 * the same way: the shape, the format, the size, the fit, the face, the spot,
 * the backdrop, the cut shape and the edge. She noticed it on the one where
 * getting it wrong costs her something — a JPEG cannot hold a see-through
 * background, so a format she could not tell she had chosen is a transparent
 * post downloaded onto black.
 *
 * ── What it is now ───────────────────────────────────────────────────────
 *
 * A fill, a full-strength border and the room's own raised shadow, which is
 * what the cutting room's shape chips already do and what she has not
 * complained about. Three changes rather than two, and one of them is not a
 * colour — which is what makes it readable on a dark panel and to anybody
 * who cannot separate a grey border from a green one.
 *
 * `check:chosen` holds that every `aria-pressed` chip in this room says so
 * with more than a colour.
 */
const GEKIES = 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]';
const VELD = 'mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100';


/**
 * The longest edge the on-screen preview is drawn at.
 *
 * Small enough that a saved preview is not the product, large enough that it
 * is sharp on a phone: 540 across a 390-point screen is still more than two
 * device pixels per point on everything made here.
 */
const PREVIEW_LONGEST = 540;
/**
 * The most the glass is ever drawn at, whatever the screen. A 4K desk at
 * two device pixels per point would otherwise ask for a canvas redrawn on
 * every keystroke at the size of the file itself.
 */
const GLASS_LONGEST = 2560;

/**
 * The longest edge a picture is sent at to have the things in it found.
 * Plenty for an engine to see a guitar or a face, and small enough that a
 * JPEG of it fits the route's body on the first rung of the ladder.
 */
const THINGS_SIDE = 1600;

/**
 * The checkerboard under a see-through post, on screen only.
 *
 * Light, the way every editor shows see-through. It was two dark greys, and
 * on the dark room a transparent post looked like a black one — the owner, 16
 * October 2026: *"Ek sien ook nog nerens transparent en dat dit werk nie."*
 * Two greys that nothing else in a post is likely to be exactly, so the
 * probe can tell the guide from the picture.
 */
const CHECK_LIGHT = '#e7e7ea';
const CHECK_DARK = '#c8c8ce';

/** The least height a tool's controls get under the photo on a phone. */

/** The least height a bar that acts on the photograph gets on a phone. */
const STRIP_LEAST = 170;

/**
 * A post's shape in two small numbers, for the size button on a phone.
 *
 * "1080×1350 ▾" needed more room than a 360-pixel bar had left, and the bar
 * squeezed it to nothing; "4:5 ▾" fits beside every other button.
 */
function shapeOf(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  const across = width / d;
  const down = height / d;
  return across <= 32 && down <= 32 ? `${across}:${down}` : `${width}×${height}`;
}

/** Where a block of words sits, as three choices rather than a drag. */
/* The spots and the box both live in `lib/posttext.ts` now, beside
   `clashes`, because a box drawn here and a rule about it there is two
   places to be wrong about one rectangle — and they were. Every line of
   words on a story was over the safe right margin, so the room's own
   warning was on for every story that had any words at all. */

interface Words {
  readonly id: string;
  readonly text: string;
  readonly face: FaceId;
  readonly spot: SpotId;
  readonly ink: string;
  /**
   * Where it actually sits, as a share of the picture.
   *
   * The owner, 8 October 2026: *"Die woord op die screen kan nog nie geskuif en
   * gecrop word nie."* The four spots stay — they are quick and they are
   * where a caption usually goes — and this is underneath them. Absent
   * means "wherever the spot says", which is every line written before
   * today.
   */
  readonly at?: At;
  /** How far apart the lines are, as a multiple of the type size. */
  readonly lineGap?: number;
  /** How far apart the letters are, as a share of the type size. */
  readonly letterGap?: number;
  /**
   * What goes behind the line so it can be read.
   *
   * Optional, and absent means `none` — which is what every line written
   * before tonight is, and is the shadow alone that the room has always
   * drawn. `posttext.ts` carries why a shadow is not enough.
   */
  readonly behind?: Backdrop;
  /**
   * The light the line gives off — the owner, 13 October 2026: "Neon,
   * futuristic, phantasm". Absent is none. `lib/postglow.ts` says how it
   * is drawn so that it exports.
   */
  readonly glow?: GlowId;
  /**
   * How big, against the size the room fits it at. The owner, 15 October 2026:
   * *"When I touch the text box … a cropping ring so that we can adjust the
   * size of the text on screen."* Pulled by the ring's corners; absent is 1.
   */
  readonly size?: number;
  /** Which edge a paragraph's lines line up on. Absent is the middle. */
  readonly align?: TextAlign;
  /** Its place in the layer stack — `lib/postlayers.ts`. Absent is over every shape, as it always was. */
  readonly z?: number;
  /** Switched off in the layer list: not drawn, not saved, not taken hold of. */
  readonly hidden?: boolean;
  /** How see-through, 0.1 to 1, from the layer list. Absent is solid. */
  readonly alpha?: number;
}

/** Where a paragraph's lines line up: "center text or put it to the left, or right". */
type TextAlign = 'left' | 'center' | 'right';
/** How far the ring's corners can pull a line, smaller and bigger. */
const WORDS_SIZE = { min: 0.3, max: 3 } as const;

/**
 * One step of the room's history, in the order it happened.
 *
 * The owner, 15 October 2026: *"Kyk mooi of elke funksie in ... photo editor
 * werk."* Undo only knew pictures, so a line of words or a shape thrown away
 * by a stray Delete was gone for good while Put back sat there lit for some
 * earlier crop. Words and shapes are a few hundred bytes, so a step of theirs
 * is simply a copy of both lists; the picture itself stays in `postback.ts`,
 * which is where its weight is counted. `pic` says whether the picture
 * history holds this step's photograph too.
 */
interface Step {
  readonly pic: boolean;
  readonly what: string;
  readonly words?: readonly Words[];
  readonly marks?: readonly Mark[];
  /** The photo grid's frames and photographs — `lib/postcells.ts`. */
  readonly cells?: readonly Cell[];
}
/** Steps beyond this many are forgotten, oldest first. */
const KEEP_STEPS = 40;

/**
 * How hard a JPG or WebP is squeezed, against the format's own quality.
 *
 * ── Why this replaced "Draft (720p)" and "Ultra (4K)" ────────────────────
 *
 * The owner, 15 October 2026: *"Kyk mooi of elke funksie in ... photo editor
 * werk."* The old row promised a resolution it never set — the draft came
 * out at full size, the "4K" was twice the post (2160 across on a square),
 * and choosing it quietly overrode How big. A label that is not what the file
 * is, is a lie at the till. The size is How big's job, so this row only does
 * what it can honestly do: squeeze harder or less. A PNG is lossless and the
 * row says so instead of offering a choice that changes nothing.
 */
const SQUEEZE = { small: 0.8, standard: 1, best: 1.06 } as const;
type Squeeze = keyof typeof SQUEEZE;

/**
 * The biggest canvas the browsers this app is used on will really draw.
 * Past either number the canvas comes back empty without an error — iOS
 * Safari stops at 16.7 million pixels, every browser at 16384 a side.
 */
const CANVAS_MOST = { side: 16384, pixels: 16_777_216 } as const;

/**
 * The longest side a photograph is kept at when it comes in.
 *
 * The owner, 18 October 2026: *"Die photo editor laat nie groter foto's toe
 * nie."* It did not: a photo was shrunk to the canvas's own longest side —
 * 1080 — as it came in, then cut to the canvas's shape, so a wide picture on
 * the square that every post starts on lost both its ends. Now a photo is
 * kept at up to 4096 a side, which is the most a phone will draw at the
 * export's full size (4096 × 4096 is the 16.7-megapixel line above), and on
 * an empty canvas the canvas takes the photo's own shape.
 */
const OWN_MOST = 4096;
/** The longest side a canvas of a photo's own shape is given at least. */
const POST_LEAST = 1080;
/** How many cells across its longest side a photo is read at for smart crop. */
const SMART_GRID = GRID;
/** How far the view goes in. Out is the whole picture on the screen. */
const VIEW_MOST = 5;

/**
 * The first free row for a new line of words, so lines added one after
 * another land under each other instead of in one pile on the same spot.
 */
function freeRow(was: readonly Words[], from: number): At {
  const used = was.map((one) => (one.at ?? atOf(one.spot)).y);
  for (let step = 0; step < 8; step += 1) {
    /* Down a row at a time, and round to the top again past the foot. */
    const y = 0.12 + ((from - 0.12 + step * 0.12) % 0.78 + 0.78) % 0.78;
    if (!used.some((one) => Math.abs(one - y) < 0.08)) return { x: 0.5, y };
  }
  return { x: 0.5, y: from };
}

/**
 * One post, one id, for as long as it is open.
 *
 * `spend_credits` charges once per reference, so exporting the same post
 * twice is one charge. Changing the words is the same post; starting a new
 * one is not.
 */
/* ── The cutting room's colours ───────────────────────────────────────────
 
   Taken from `VideoEditor.tsx` rather than guessed at, so the two rooms are
   the same room with different work in them. The floor is the one the owner
   picked for the cutting room; INK and INK_DIM are its text, and RAISE is
   what lifts a control off the floor instead of a border drawn round it. */
const FLOOR = '#0A0C10';
const INK = '#d7f5e4';
const INK_DIM = 'rgba(215,245,228,0.62)';
const RAISE = '0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.35)';

/**
 * The photo editor's benches, in the shape the cutting room's bar takes.
 *
 * Six, not nine. Taking a thing out and painting a thing out are both things
 * you do to the picture; the shape and which part of it shows are both the
 * frame. Nine tabs on a bar is a menu, which is the thing a bar is for
 * avoiding.
 *
 * The order is the order of the work: get a picture, set the frame, set how
 * it reads, read what is on it, write on it, take it away.
 */
const POST_UPPER: readonly BenchSpec[] = [
  {
    id: 'pic',
    icon: <ImageIcon className="h-5 w-5" />,
    label: ['post.benchPic', 'The picture'],
    what: [
      'post.benchPicWhat',
      'Bring one in, take the background out, or paint over something small to take it away. All of it on your own device, for nothing.',
    ],
  },
  {
    id: 'frame',
    icon: <CropIcon className="h-5 w-5" />,
    label: ['post.benchFrame', 'The frame'],
    what: [
      'post.benchFrameWhat',
      'The shape it comes out in, and which part of the picture shows: drag it, go closer, fill the frame or fit the whole thing.',
    ],
  },
  {
    id: 'tone',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    label: ['post.benchTone', 'How it reads'],
    what: [
      'post.benchToneWhat',
      'Brightness, contrast, colour, warmth and blur, with one press that lifts a flat photograph and one that puts it back exactly as it came.',
    ],
  },
] as const;

const POST_LOWER: readonly BenchSpec[] = [
  {
    id: 'read',
    icon: <ScanText className="h-5 w-5" />,
    /* ── Not "Read it", which nobody could work out ──────────────────
 
       The owner, 7 October 2026: *"Ek weet nogsteeds nie wat is die read it
       funksie in die photo editor nie."* — the second time she had asked.
 
       "Read" is the wrong word in an app with three rooms that read things
       ALOUD: it sounds like a voice, not like a camera. What it does is take
       the words that are printed inside a photograph — a poster, a sign, a
       label, a page — and hand them back as text. "Grab the words" says
       that, and it says it in two words a thumb can read on a bar. */
    /* ── "Grab", once it really grabs more than words ────────────────
 
       The owner, 11 October 2026: *"Ek dink hierdie funksie by photo editor
       moet net sê grab, dan moet die objekte en woorde gehighlight word."*
 
       The rename waited for the second half to exist. A bench called
       "Grab" that can only take the writing is a promise the button does
       not keep: somebody presses it on a logo, nothing happens that they
       wanted, and they report the feature as broken — correctly. */
    label: ['post.benchRead', 'Extract items'],
    what: [
      'post.benchReadWhat',
      'Words printed inside the photograph \u2014 a poster, a sign, a label, a page \u2014 turned into text you can use, on your own device. Put them on the post or copy them out.',
    ],
  },
  {
    id: 'text',
    icon: <Type className="h-5 w-5" />,
    label: ['post.benchText', 'Words'],
    what: [
      'post.benchTextWhat',
      'What it says, in one of three faces, in a colour, at the top, the middle or the bottom.',
    ],
  },
  {
    id: 'save',
    icon: <Download className="h-5 w-5" />,
    label: ['post.benchSave', 'Take it out'],
    what: [
      'post.benchSaveWhat',
      'Save the picture to your device, or send it next door as a film\u2019s cover. The same price either way, on the button, and only once per post.',
    ],
    paid: true,
  },
] as const;

/* ── The eight tools ───────────────────────────────────────────────────
   The owner, 14 October 2026: *"Ek dink daar moet funksie buttons onder aan die
   page wees, modern en klein, dit pop dan die editing tools uit."* The six
   benches, with templates and shapes lifted out of the words bench to be
   buttons of their own, in the order work is done. `POST_SHORT` is what
   fits under an icon on a phone. */
const POST_STARTS: BenchSpec = {
  id: 'starts',
  icon: <LayoutTemplate className="h-5 w-5" />,
  label: ['post.benchStarts', 'Templates'],
  what: ['post.benchStartsWhat', 'Finished designs to start from: the neon, synthwave, hologram and gold packs, and the starter pack of posters, flyers and covers.'],
};
const POST_SHAPES: BenchSpec = {
  id: 'shapes',
  icon: <Square className="h-5 w-5" />,
  label: ['post.benchShapes', 'Shapes'],
  what: ['post.benchShapesWhat', 'A cube, a ring, a grid or a frame, lit with the same glow as the words, in one of five places at one of three sizes.'],
};
/* The owner, 14 October 2026: *"Ek dink ook daar moet 'n magic mouse tool wees
   wat op dele kliek en Ai kan dan die gedeelte verbeter (daar moet dan seker
   opsies wees)."* `lib/magicedit.ts` carries how only the tapped part is
   sent and laid back in. */
const POST_MAGIC: BenchSpec = {
  id: 'magic',
  icon: <Wand2 className="h-5 w-5" />,
  label: ['post.benchMagic', 'Magic touch'],
  what: ['post.benchMagicWhat', 'Tap a part of the photo and the AI improves it, changes it into something else, or takes it away. Only that part changes.'],
  paid: true,
};
/* The owner, 27 October 2026: *"daar moet dalk notifications op kom wat vra,
   make it come alive, of pull the sticker and make a 3d model"*. What the
   photo can become, beside the magic touch: `BecomeBench.tsx`. */
const POST_ALIVE: BenchSpec = {
  id: 'alive',
  icon: <Sparkles className="h-5 w-5" />,
  label: ['post.benchAlive', 'Bring to life'],
  what: ['post.benchAliveWhat', 'Pull a thing out of the photo as a sticker, wake the whole photo up for six seconds with its own sound, or make what you pulled out into a 3D model. Each one shows its price.'],
  paid: true,
};
/* The owner, 16 October 2026: *"Die photo editor sal moet layers kry."* Beside
   the shapes, because the layers are the words and shapes she has put on. */
const POST_LAYERS: BenchSpec = {
  id: 'layers',
  icon: <Layers className="h-5 w-5" />,
  label: ['post.benchLayers', 'Layers'],
  what: ['post.benchLayersWhat', 'Every layer on the picture, front to back: choose the one you are editing, or All for everything together. Hide one, move it forward or back, or make it see-through.'],
};
/* The owner, 16 October 2026: photos in a grid, each one tapped and edited on
   its own — `lib/postcells.ts`. */
const POST_GRID: BenchSpec = {
  id: 'grid',
  icon: <LayoutGrid className="h-5 w-5" />,
  label: ['post.benchGrid', 'Photo grids'],
  what: ['post.benchGridWhat', 'Two, three, four or nine photos on one post. Tap a frame to put a photo in it, then tap a photo to change just that one.'],
};
/* The owner, 16 October 2026: *"Ek soek ook ... sulke oulike filters."* Their
   own tool rather than a row in Adjust: a filter is chosen by looking, and
   looking needs the room the pictures take. `lib/postfilters.ts`. */
const POST_FILTER_BENCH: BenchSpec = {
  id: 'filters',
  icon: <Aperture className="h-5 w-5" />,
  label: ['post.benchFilters', 'Filters'],
  what: ['post.benchFiltersWhat', 'A look for the whole photo in one tap, each one shown on your own picture. Choose how strong, then fine-tune it in Adjust.'],
};
/** The tools of one photo in the grid — opened by tapping it, not on the bar. */
const POST_CELL: BenchSpec = {
  id: 'cell',
  icon: <ImageIcon className="h-5 w-5" />,
  label: ['post.benchCell', 'This photo'],
  what: ['post.benchCellWhat', 'Replace it, move it about in its frame, zoom in, or open it on its own with every tool in the room.'],
};
/* The owner, 17 October 2026: *"In photo editor sal daar ook graph templates
   moet wees, en verskillende verskeidenheid van graphs."* `lib/postcharts.ts`. */
const POST_CHARTS: BenchSpec = {
  id: 'charts',
  icon: <ChartColumn className="h-5 w-5" />,
  label: ['post.benchCharts', 'Charts'],
  what: ['post.benchChartsWhat', 'A chart from a design: type or paste the numbers, or let AI set them from your words.'],
};
/* Photo first, at the far left. The owner, 17 October 2026: *"Maak die photo tab
   heel links en heel eerste van al die tabs."* */
/* Bring to life second, right after the photo, where a phone shows it
   without a swipe. The owner, 27 October 2026, looking for the sticker:
   *"Waar in watter funtion le dit"* — seventh in the bar, it was off the
   right edge of the screen. */
const POST_TOOLS: readonly BenchSpec[] = [
  POST_UPPER[0], POST_ALIVE, POST_STARTS, POST_GRID, POST_UPPER[1], POST_UPPER[2], POST_FILTER_BENCH, POST_MAGIC, POST_LOWER[0], POST_LOWER[1], POST_SHAPES, POST_CHARTS, POST_LAYERS, POST_LOWER[2],
];
const POST_SHORT: Record<string, readonly [string, string]> = {
  starts: ['post.toolStarts', 'Designs'],
  pic: ['post.toolPic', 'Photo'],
  frame: ['post.toolFrame', 'Crop'],
  tone: ['post.toolTone', 'Adjust'],
  filters: ['post.toolFilters', 'Filters'],
  magic: ['post.toolMagic', 'Magic'],
  alive: ['post.toolAlive', 'Alive'],
  read: ['post.toolRead', 'Grab'],
  text: ['post.toolText', 'Text'],
  shapes: ['post.toolShapes', 'Shapes'],
  charts: ['post.toolCharts', 'Charts'],
  layers: ['post.toolLayers', 'Layers'],
  grid: ['post.toolGrid', 'Grids'],
  cell: ['post.toolCell', 'Photo'],
  save: ['post.toolSave', 'Export'],
};
/** A tool along the foot on a phone: an icon over a word, small. */
/* No border class: any button with one wears the room's glass ring
   (globals.css), and a row of eight rings is not the Video Editor's quiet
   glass bar the owner asked for on 27 October 2026. The open tool keeps its
   ring (\`GEKIES\`). */
const TOOL_FOOT = 'flex min-h-[56px] w-[58px] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg px-0 text-[9px] font-bold leading-tight';
/** A tool down the rail at a desk. */
const TOOL_RAIL = 'flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-transparent px-0.5 text-[10px] font-bold leading-tight';

/* ── Tools and filters as pictures ────────────────────────────────────
   The owner, 16 October 2026: *"onthou mense is visueel"*. Both are drawn
   from one small square of her photograph (`thumbOf`), so a whole row of
   them is a row of draws of a tiny canvas. */

/** A tool's picture, or its icon until the picture is drawn. */
function ToolTile({ id, from, icon, size }: {
  readonly id: string;
  readonly from: HTMLCanvasElement | null;
  readonly icon: React.ReactNode;
  readonly size: number;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (canvas.current && from) setDrawn(drawToolTile(canvas.current, id, from));
  }, [id, from]);
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <canvas
        ref={canvas}
        width={size * 2}
        height={size * 2}
        aria-hidden
        data-posttooltile={id}
        className="absolute inset-0 h-full w-full rounded-[9px]"
        style={{ opacity: drawn ? 1 : 0 }}
      />
      {!drawn && <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
    </span>
  );
}

/* ── A template's picture ─────────────────────────────────────────────
   Drawn from the design itself, with our own drawn evening in each frame,
   turned a different colour per frame so a collage reads as several photos. */
const designPhoto = (ctx: CanvasRenderingContext2D, w: number, h: number, at: number): void => {
  ctx.save();
  if (at) ctx.filter = `hue-rotate(${(at * 67) % 360}deg)`;
  drawSample(ctx, w, h);
  ctx.restore();
};
const designMark = (ctx: CanvasRenderingContext2D, one: DesignMark, w: number, h: number): void => {
  drawMark(ctx, {
    ...newMark(one.kind, 'preview'),
    x: one.x, y: one.y, size: one.size, ink: one.ink,
    glow: (GLOWS.find((g) => g.id === one.glow)?.id ?? 'none'),
    ...(one.opacity !== undefined ? { opacity: one.opacity } : {}),
    ...(one.stretch !== undefined ? { stretch: one.stretch } : {}),
  }, w, h);
};
/** A chart design, drawn small from its own data. */
function ChartTile({ spec, lang }: { readonly spec: ChartSpec; readonly lang: string }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    drawChart(ctx, spec, 0, 0, el.width, el.height, lang);
  }, [spec, lang]);
  return <canvas ref={canvas} width={240} height={180} aria-hidden className="h-full w-full rounded-lg" />;
}

function DesignTile({ design, lang }: { readonly design: Design; readonly lang: string }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const tall = design.size === 'story' ? 16 / 9 : design.size === 'portrait' ? 1.25 : 1;
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return undefined;
    let art: HTMLImageElement | null = null;
    let gone = false;
    const paint = (): void => {
      if (!gone) drawDesign(ctx, design, el.width, el.height, lang, designPhoto, (id) => faceOf(id), designMark, art);
    };
    paint();
    /* Again once the faces have loaded, so the words are in their own type. */
    void faceReady().then(paint).catch(() => undefined);
    /* And once her uploaded artwork has arrived. */
    const url = artUrl(design.art);
    if (url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { art = img; paint(); };
      img.src = url;
    }
    return () => { gone = true; };
  }, [design, lang]);
  return <canvas ref={canvas} width={180} height={Math.round(180 * tall)} aria-hidden className="w-full rounded-lg" style={{ aspectRatio: `1 / ${tall}` }} />;
}

/**
 * One shape as a block over her photograph: the photo small, the part the
 * shape would keep bright and outlined, the rest dimmed — `lib/smartcrop.ts`.
 */
function SmartTile({ picture, window: part, tall }: {
  readonly picture: HTMLImageElement;
  readonly window: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly tall: number;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(picture, 0, 0, el.width, el.height);
    const x = part.x * el.width;
    const y = part.y * el.height;
    const w = part.w * el.width;
    const h = part.h * el.height;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, el.width, y);
    ctx.fillRect(0, y + h, el.width, el.height - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, el.width - x - w, h);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }, [picture, part.x, part.y, part.w, part.h]);
  return <canvas ref={canvas} width={160} height={Math.max(40, Math.round(160 * tall))} aria-hidden className="w-full rounded-lg" />;
}

/** One filter's picture: her photograph with it on. */
function FilterTile({ from, look }: { readonly from: HTMLCanvasElement | null; readonly look: Look }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (canvas.current && from) drawFilterTile(canvas.current, from, look);
  }, [from, look]);
  return <canvas ref={canvas} width={144} height={144} aria-hidden className="aspect-square w-full rounded-xl" />;
}

/** A style's sample, drawn once — `lib/magicstyles.ts`. */
function StyleTile({ id }: { readonly id: string }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (canvas.current) drawStyleTile(canvas.current, id);
  }, [id]);
  return <canvas ref={canvas} width={144} height={144} aria-hidden className="aspect-square w-full rounded-xl" />;
}

const freshId = (): string => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ── A template's own lettering, taken out of its picture ─────────────────

   The owner, 15 October 2026: *"Kyk mooi of elke funksie in ... photo editor
   werk."* The older starter templates draw their headline and subtitle into
   the picture as SVG <text>, and the room then put the same headline on top
   as editable words — so every one of them came in with the title twice, the
   painted one underneath that no tool could change. Those two lines are cut
   out of the SVG before it becomes the picture; any other lettering in it (a
   date, a venue) stays, because nothing re-adds it. What was cut tells the
   new words how to look: its colour, its kind of face, its height. */

/** Letters and digits only, in capitals, so "NEON • CLUB" and "Neon club" match. */
const lettersOf = (text: string): string => text
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'')
  .toUpperCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

/** What one cut-out <text> looked like. */
interface CutLettering {
  readonly ink?: string;
  readonly family?: string;
  /** Its baseline, as a share of the picture's height. */
  readonly y?: number;
}

/**
 * The SVG data URL with the <text> that says any of `says` removed, and how
 * the first one cut for each looked. Anything that is not an SVG data URL —
 * a moving template's still, a picture — comes back as it went in.
 */
function withoutLettering(
  url: string,
  says: readonly (readonly (string | undefined)[])[],
  tall: number,
): { readonly url: string; readonly cut: readonly (CutLettering | null)[] } {
  const none = { url, cut: says.map(() => null) };
  const comma = url.indexOf(',');
  if (!url.startsWith('data:image/svg+xml') || comma < 0) return none;
  const head = url.slice(0, comma);
  let svg: string;
  try {
    svg = /;base64$/i.test(head)
      ? new TextDecoder().decode(Uint8Array.from(atob(url.slice(comma + 1)), (c) => c.charCodeAt(0)))
      : decodeURIComponent(url.slice(comma + 1));
  } catch {
    return none;
  }
  /* Each group is one line that goes back on as words, in every wording
     the picture might have been drawn with. */
  const wanted = says.map((group) => group.map((one) => (one ? lettersOf(one) : '')).filter(Boolean));
  const cut: (CutLettering | null)[] = says.map(() => null);
  const kept = svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (whole: string, attrs: string, inner: string) => {
    const said = lettersOf(inner);
    if (!said) return whole;
    /* The whole line, or a run of its words — "NEON" and "CLUB" drawn as two
       <text> for a headline that says NEON CLUB NIGHT. */
    const which = wanted.findIndex((group) => group.some((one) => one === said
      || (said.length >= 3 && ` ${one} `.includes(` ${said} `))));
    if (which < 0) return whole;
    if (!cut[which]) {
      const y = Number(/\by="([\d.]+)"/.exec(attrs)?.[1]);
      const px = Number(/\bfont-size="([\d.]+)"/.exec(attrs)?.[1]);
      cut[which] = {
        ink: /\bfill="(#[0-9a-fA-F]{3,8})"/.exec(attrs)?.[1],
        family: /\bfont-family="([^"]*)"/.exec(attrs)?.[1],
        /* The baseline less about a third of the type, which is near the
           middle of the letters — where a line of words is placed from. */
        y: Number.isFinite(y) && tall > 0
          ? Math.min(0.92, Math.max(0.06, (y - (Number.isFinite(px) ? px * 0.35 : 0)) / tall))
          : undefined,
      };
    }
    return '';
  });
  return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(kept)}`, cut };
}

/** The nearest face this room has to an SVG `font-family`. */
const faceFromFamily = (family: string | undefined, otherwise: FaceId): FaceId => {
  const said = (family ?? '').toLowerCase();
  if (!said) return otherwise;
  if (/impact|anton|bebas|oswald/.test(said)) return 'poster';
  if (/mono/.test(said)) return 'type';
  if (/cursive|script/.test(said)) return 'script';
  if (/serif/.test(said) && !/sans/.test(said)) return 'book';
  return 'plain';
};

/** How each living-photo motion is pictured: the meerkat photo in its weather. */
const MOTION_PICTURE: Readonly<Record<string, { readonly mood: MeerkatMood; readonly filter?: string; readonly over?: string; readonly pulse?: boolean }>> = {
  clouds: { mood: 'day', over: 'radial-gradient(ellipse at 25% 18%, rgba(255,255,255,0.85), transparent 28%), radial-gradient(ellipse at 70% 12%, rgba(255,255,255,0.7), transparent 24%)' },
  breeze: { mood: 'day', over: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.18) 45%, transparent 60%)', pulse: true },
  light: { mood: 'golden', over: 'radial-gradient(circle at 20% 50%, rgba(255,220,140,0.55), transparent 45%)', pulse: true },
  water: { mood: 'day', filter: 'hue-rotate(-12deg) saturate(1.2)', over: 'linear-gradient(to top, rgba(56,189,248,0.55), transparent 35%)' },
  rain: { mood: 'film', over: 'repeating-linear-gradient(105deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 6px)' },
  steam: { mood: 'mist', over: 'radial-gradient(ellipse at 50% 85%, rgba(255,255,255,0.6), transparent 45%)', pulse: true },
  fire: { mood: 'night', over: 'radial-gradient(ellipse at 50% 100%, rgba(251,146,60,0.75), rgba(239,68,68,0.3) 35%, transparent 60%)', pulse: true },
  blink: { mood: 'day', over: 'radial-gradient(circle at 50% 33%, rgba(255,255,255,0.45), transparent 18%)', pulse: true },
  traffic: { mood: 'night', over: 'linear-gradient(transparent 78%, rgba(248,113,113,0.7) 80%, transparent 82%, transparent 86%, rgba(253,224,71,0.7) 88%, transparent 90%)' },
  neon: { mood: 'neon', pulse: true, over: 'radial-gradient(circle at 80% 30%, rgba(236,72,153,0.4), transparent 40%)' },
  dust: { mood: 'golden', over: 'radial-gradient(circle at 30% 40%, rgba(255,240,200,0.5) 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(255,240,200,0.5) 0 1px, transparent 2px)', pulse: true },
  cloth: { mood: 'day', over: 'linear-gradient(80deg, transparent 40%, rgba(244,114,182,0.35) 50%, transparent 60%)', pulse: true },
};

export default function PostStudio({
  onClose, onIntoFilm, asRoom = false, copilot, atDoor = false,
}: {
  readonly onClose: () => void;
  /**
   * Drawn as a room of its own rather than a sheet over whatever was behind.
   *
   * The owner, 7 October 2026: *"Make hooks the same shape as video desk and add
   * next to it Photo Editor. Then make the photo editor the same look as the
   * video editor."* A sheet off the video desk is not a room: it is absent
   * from the menu, nothing points at it, and the only way to find it was to
   * already know it was there. As a room it takes the cutting room's colours
   * — the dark green floor, the raised controls, the same ink — because the
   * two are the same kind of work on two kinds of material.
   */
  /**
   * The copilot, brought inside instead of drawn in a column below.
   *
   * The same decision the cutting room made on 4 October, and it had to be
   * made here the moment this became a room with a bar at its foot. A room
   * that is a fixed-height column with a bar under it has a page that does
   * not scroll — so a 22rem pane underneath it is a second screenful nobody
   * reaches, AND it makes the page scroll again, which means the room (bar
   * and all) can be scrolled off the bottom of the screen.
   *
   * `audit/underbar.mjs` is what said so: it scrolls everything that scrolls
   * to the end before it looks, and found this room's bar 621 pixels above
   * where it had just been measured. `copilotInside` in `app/page.tsx` keeps
   * the column from being drawn twice.
   */
  /**
   * Whether something is drawn over this room.
   *
   * The room claims the whole screen while it is open, which is what sends
   * the app's own bar away. It stays MOUNTED when the room list is opened
   * over it, so without this it goes on holding the screen while she is
   * looking at a different thing entirely — and the bar is missing from the
   * door and from every tab she reaches through it.
   *
   * The owner reported exactly that about the cutting room on 4 October: *"Die
   * res van die app se harde buttons onder het verdwyn."* Written in here on
   * the day this room started claiming the screen, rather than waiting to be
   * told about it a second time. `audit/underbar.mjs` walks out of the room
   * and looks.
   *
   * Named `atDoor` rather than the cutting room's `covered`, because this
   * room already has a `covered` of its own and it means something else
   * entirely: whether her words land under the platform's furniture.
   */
  readonly atDoor?: boolean;
  readonly copilot?: React.ReactNode;
  readonly asRoom?: boolean;
  /**
   * Hand the finished picture to the film being cut on the desk below.
   *
   * Optional, and the button only appears when it is there, because the
   * studio should still work anywhere it is mounted without a film to put
   * anything into.
   */
  readonly onIntoFilm?: (png: File) => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [size, setSize] = useState<PostSize>(POST_SIZES[0]);
  /* Whether she picked the shape herself — a shape button, a size of her
     own, a template. Then a photo brought in keeps to it; otherwise the
     first photo on an empty canvas gives the canvas its own shape. */
  const shapeChosen = useRef(false);
  const [picture, setPicture] = useState<HTMLImageElement | null>(null);
  /* Which part of it shows, and how close. `lib/postcrop.ts` holds the
     maths and the reason the pan is a fraction rather than a number of
     pixels. Reset with every new picture: the spot that was right for the
     last photograph means nothing on this one. */
  const [crop, setCrop] = useState<Crop>(MIDDLE);
  /* What the picture looks like. Free, on the device, and separate from the
     crop because the two are different questions: which part, and how it
     reads. Reset with the picture, like the crop. */
  const [look, setLook] = useState<Look>(PLAIN);
  /* Reading the words out of the picture. `part` is nought to one while the
     engine loads — the first press fetches megabytes and a screen with no
     progress on it looks broken rather than busy. */
  const [reading, setReading] = useState<number | null>(null);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  /**
   * The lines the reader found, with a box round each, and the one she tapped.
   *
   * ── What she asked for ───────────────────────────────────
   *
   * The owner, 8 October 2026: *"dat die masjien self objekte en text
   * identifiseer wat dan highlight en dan kan die klient op die objekte of
   * text click wat hulle graag wil grab, rondskuif, of delete."*
   *
   * The reader has always found these. It found them in the same pass that
   * makes the text she already gets, and this file took the text and threw
   * the boxes away — see the note on `Found` in `lib/ocr.ts`. So none of
   * this is a new engine, and none of it costs anything: it is the part of
   * the old one that was being discarded.
   */
  /* Which language the reader was last asked for, so the tappable read does
     not need a third and fourth button beside the two that are already
     there. Afrikaans and English find different words in the same sign. */
  const [grabLang, setGrabLang] = useState<Readable>('eng');
  const [picking, setPicking] = useState(false);
  const [found, setFound] = useState<readonly Pick[] | null>(null);
  const [liveSound, setLiveSound] = useState(false);
  /* The line of words last touched on the photo — what Delete, Ctrl+C and
     the right-click menu act on, the way `markOn` is for a shape. */
  const [wordOn, setWordOn] = useState<string | null>(null);
  const copiedThing = useRef<{ kind: 'words'; item: Words } | { kind: 'mark'; item: Mark } | null>(null);
  const [rightMenu, setRightMenu] = useState<{ x: number; y: number } | null>(null);
  /* The magic touch: where she tapped, how big a part, and what it becomes. */
  const [magicSpot, setMagicSpot] = useState<{ readonly x: number; readonly y: number } | null>(null);
  /* ── Bring to life — `BecomeBench.tsx` ──────────────────────────────
     While `pulling` is on, a tap on the photo means "pull this out", and
     the cut-out waits on the photo (`peel`) until it is tapped and peeled
     off into a layer of its own. `nudge` is the suggestion over the photo;
     `idea` the bigger card after a save. How often either may come is
     `lib/ideas.ts`. */
  const [pulling, setPulling] = useState(false);
  const [pullTap, setPullTap] = useState<PullTap | null>(null);
  const [becomeStart, setBecomeStart] = useState<StartBecome | null>(null);
  const [lastCut, setLastCut] = useState<Cut | null>(null);
  const [peel, setPeel] = useState<{
    readonly cut: Cut;
    readonly src: string;
    readonly rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  } | null>(null);
  const [nudge, setNudge] = useState<IdeaMoment | null>(null);
  const [idea, setIdea] = useState<{ readonly moment: IdeaMoment; readonly thumb: string } | null>(null);
  const [becomeBusy, setBecomeBusy] = useState(false);
  /* What the bench said, shown over the photo too: on a phone the bench
     is below the photo, and a press that seemed to do nothing was a press
     whose answer was out of sight. */
  const [photoSay, setPhotoSay] = useState('');
  /* A tool's panel tucked down to its handle: the tool stays on, the photo
     gets the screen. The owner, 27 October 2026: *"Ek kan nie 'n tool grab
     en dit gebruik nie, dit verdwyn as ek die kruisie druk om plek te maak
     om die prent te sien."* The cross ends the tool; this only moves it
     out of the way. */
  const [tucked, setTucked] = useState(false);
  /* What a tool is, said for a moment when it is picked. The owner, 27
     October 2026: *"wanneer mens op dit kliek om te sien wat dit is moet
     dit met 'n pop out notification gee om te sê wat dit is."* */
  const [toolSay, setToolSay] = useState<{ readonly name: string; readonly what: string; readonly n: number } | null>(null);
  useEffect(() => {
    if (!toolSay) return undefined;
    const gone = window.setTimeout(() => setToolSay(null), 2800);
    return () => window.clearTimeout(gone);
  }, [toolSay]);
  /* The photo's colours, blurred, behind the room on a phone (`lib/ambient.ts`). */
  const ambient = useMemo(() => ambientOf(picture), [picture]);
  const nudgedFor = useRef('');
  const [magicSize, setMagicSize] = useState(0.06);
  /* What her finger painted over, stroke by stroke, as shares of the photograph. */
  const [magicStrokes, setMagicStrokes] = useState<Brush['strokes']>([]);
  const brushing = useRef(false);
  /* The fingers on the photograph, and a pinch while there are two. */
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number; mid: { x: number; y: number }; x: number; y: number } | null>(null);
  /* How close the glass is looked at — a magnifier, not the post's own crop,
     so it works in every tool and changes nothing that is saved. */
  const [view, setView] = useState<{ scale: number; x: number; y: number }>({ scale: 1, x: 0, y: 0 });
  /* How big the glass is on the screen, in CSS pixels — measured by the
     ResizeObserver beside the stage, and read by `draw` so the glass is
     drawn at the size it is shown. Declared here, above `draw`, because
     the draw effect lists it. */
  const [fitted, setFitted] = useState<{ w: number; h: number; room: number } | null>(null);
  /* Whether the zoom bar is unfolded — see `data-postview`. */
  const [viewOpen, setViewOpen] = useState(false);
  /* The brush is a switch of its own: on, a finger paints; off, the photo can
     be moved as usual. The owner, 17 October 2026: *"Daar moet dan 'n brush
     button wees."* */
  const [brushOn, setBrushOn] = useState(true);
  const [styleGroup, setStyleGroup] = useState<StyleGroup>('featured');
  /* The part of the photograph Adjust and Filters change — `lib/postselect.ts`. */
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selecting, setSelecting] = useState(false);
  /* The photograph as it was before a whole-photo change, for the
     before-and-after line — only while the photo is the one that change made. */
  const [compareFrom, setCompareFrom] = useState<{ readonly of: HTMLImageElement; readonly from: HTMLImageElement } | null>(null);
  /* The glow over the photograph while a tool works on it — a long one for
     taking the background out, a short flash for a one-press change. The owner,
     17 October 2026: *"asof hy besig is om te werk, en na so 3 sekondes moet
     die glow stop en dan is dit eweskielik transparent"*. */
  const [working, setWorking] = useState<'long' | 'flash' | null>(null);
  const flash = (): void => {
    setWorking((was) => was ?? 'flash');
    window.setTimeout(() => setWorking((was) => (was === 'flash' ? null : was)), 650);
  };
  const [magicInto, setMagicInto] = useState('');
  const [magicBusy, setMagicBusy] = useState('');
  const [picked, setPicked] = useState<Pick | null>(null);
  /* ── The things in the picture, beside the words in it ────────────────
 
     The owner, 11 October 2026: *"dan moet die objekte en woorde gehighlight
     word, en dit moet dan rondgeskuif kan word en ge-edit word."*
 
     They go into the SAME `found` list the reader fills, so a thing and a
     line of writing get the same box and are tapped the same way — which is
     what she described, and which means none of the drawing or the tapping
     below had to learn a second shape.
 
     What differs is what a tap DOES, and that is the only reason this map
     exists: a word is lifted as text, a thing is lifted as pixels, and the
     mask that makes the second possible has nowhere to live on a `Pick`. */
  const things = useRef<Map<string, Found>>(new Map());
  const [looking, setLooking] = useState(false);
  /* Cutting the background out. `whole` holds the picture as it was brought
     in, so the cut is never a one-way door — a member who cuts a photograph
     and does not like it has nothing to go back to otherwise but the camera
     roll, and the file they picked may have been a crop they made elsewhere. */
  const [cutting, setCutting] = useState<number | null>(null);
  const [whole, setWhole] = useState<HTMLImageElement | null>(null);
  /* Which plain-ground cut to make. 'everywhere' for a drawing, where the
     gaps inside the mark are background too; 'edges' for a photograph, where
     a white shirt in the middle of it is not. The pixels cannot tell which,
     so it is a choice and not a guess. See `lib/flatcut.ts`. */
  const [groundReach, setGroundReach] = useState<'everywhere' | 'edges'>('everywhere');
  /* ── Giving a cut-out shape a new colour ──────────────────────────────
 
     The owner, 11 October 2026: *"om 'n logo, of 'n objek se kleur te kan
     verander ... die pearlescent funksie ... waar twee na 3 kleure saam
     blend vir 'n kleur skakering."*
 
     She reached this with her own mark within the hour: navy line work, cut
     out, that cannot be read on a dark page. `lib/repaint.ts` carries the
     reasoning; what matters here is that it paints only where the picture
     is not transparent, so it is the tool for after the background has come
     off rather than a tint over a photograph. */
  const [paintColours, setPaintColours] = useState<string[]>(['#ffffff']);
  const [paintAngle, setPaintAngle] = useState(0);
  const [paintShade, setPaintShade] = useState(true);
  /* The model's answer and the picture it was asked about, kept so the edge
     can be changed without six megabytes and a second of waiting. */
  const lastMask = useRef<{
    readonly mask: HTMLCanvasElement;
    readonly of: HTMLImageElement;
    /** The cut-out this mask made, while it is the one on the glass. */
    readonly made?: HTMLImageElement;
  } | null>(null);
  const [edge, setEdge] = useState<EdgeId>('normal');
  /* Painting over the thing to take out.
 
     `rubbing` is the mode; `smear` is one byte per pixel OF THE PICTURE, not
     of the frame. The brush is painted on a view of the whole photograph
     rather than on the cropped preview, so the mapping from thumb to pixel
     is one uniform scale instead of the inverse of a crop — and she can see
     what she is erasing, which a crop by definition hides part of. */
  const [rubbing, setRubbing] = useState(false);
  const smear = useRef<Uint8Array | null>(null);
  const [smeared, setSmeared] = useState(0);
  const rubCanvas = useRef<HTMLCanvasElement | null>(null);
  /* `null` is nothing behind it, and not a colour that happens to be dark.
 
     Her words: *"transparency"*, in the list beside text and nice fonts. A
     post with no background is what gets layered over somebody else's video
     or dropped onto a story with the platform's own picture showing through,
     and a black square is the one thing it must not quietly become. */
  const [back, setBack] = useState<string | null>('#111113');
  const [lastColour, setLastColour] = useState('#111113');
  const [words, setWords] = useState<Words[]>([]);
  const [post, setPost] = useState(freshId);
  const [busy, setBusy] = useState(false);
  /* What she typed to change the picture, and whether Google is drawing it.
     Its own busy flag rather than `busy`: that one gates the things that
     happen on this device, and a spinner on the background remover while a
     picture is being drawn somewhere else says the wrong thing.

     `redrawing` rather than `asking` — that name is already the copilot's
     sheet, two hundred lines down, and two states called asking in one
     component is a bug that typechecks. */
  const [askWords, setAskWords] = useState('');
  const [redrawing, setRedrawing] = useState(false);
  /* Only used when drawing from nothing — a picture being changed keeps its
     own shape. Square first because that is what a post is.

     All five the engine takes, not the three that were here. The two that
     were missing are the ordinary photograph shapes — 4:3 and 3:4 — which is
     to say the shapes most pictures in the world actually are, left out of a
     list of three for no reason beyond the list having been written quickly.
     The owner, 9 October 2026: *"daar moet van alles wat opsies is, 'n
     verskeidenheid wees."* */
  const [askShape, setAskShape] = useState<ShapeId>(SHAPE_DEFAULT);
  /* ── Pictures to copy from, which is the capability that was sitting idle ─

     Gemini reads several pictures in a turn. Until now this room sent one:
     the picture on the bench, or nothing. So "put this person into that
     scene", "put my logo on this", "make it look like that photograph" were
     all impossible, and the reason was a list that only ever had one thing
     put in it.

     Object URLs, so they are revoked when they go. */
  const [refs, setRefs] = useState<{ url: string; image: HTMLImageElement }[]>([]);
  /* Whether this browser can really write a WebP. Asked once, on the client
     only — `canWebp` makes a one-pixel canvas, and asking it on every render
     would make a canvas for every keystroke. */
  const [webpWorks, setWebpWorks] = useState(false);
  useEffect(() => { setWebpWorks(canWebp()); }, []);

  /* ── A photograph given a little motion ───────────────────────────────

     The owner, 10 October 2026: *"Ek wonder ook of google se modelle net bietjie
     motion kan gee aan foto's? Dit kan baie van ons photo editing tools
     verbeter, en vir al ook vir foto's wat vir bemarking gebruik word en
     social media."*

     Yes, and with no new engine: Veo has taken a start frame since the day it
     was wired, and the whole trick is the prompt — "almost nothing moves".
     `lib/livingphoto.ts` carries the twelve motions and why each is worded
     the way it is.

     The photograph goes up as the opening frame AND as the closing one, so
     the clip has to come back to it and therefore LOOPS. That is only
     possible because of the closing frame added earlier the same day. */
  const [motion, setMotion] = useState<string>(MOTION_DEFAULT);
  const [liveJob, setLiveJob] = useState<string | null>(null);
  /** When the current wait began, so a stalled job cannot wait for ever. */
  const liveSince = useRef<number>(0);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  /* ── Which engine can bring a photo to life, asked before the press ────
     The owner, 15 October 2026: *"Give it a little motion werk ook nie."* Two
     faults, both silent until pressed. The photo goes up as the opening and
     the closing frame, and only Google's own Veo reads either — the
     ElevenLabs engines take no picture at all. And a square post asked for a
     square video, which no Veo makes, so the server found no engine and
     answered that the month's allowance was used up. So the room asks which
     grade starts from a picture, uses a shape that grade makes, and sends
     the closing frame only where it is read. `none` says so on the bench. */
  const [liveCan, setLiveCan] = useState<
    { grade: string; aspects: readonly string[]; end: boolean } | 'none' | null
  >(null);
  useEffect(() => {
    let alive = true;
    void probeVideoEngine().then((found) => {
      if (!alive) return;
      const order = ['standard', 'better', 'premium'];
      const grade = order.find((one) => {
        const can = found.can?.[one];
        return can && can.startFrame && can.seconds.includes(LIVE_SECONDS);
      });
      const can = grade ? found.can?.[grade] : undefined;
      setLiveCan(grade && can ? { grade, aspects: can.aspects, end: Boolean(can.endFrame) } : 'none');
    });
    return () => { alive = false; };
  }, []);
  const [liveSaid, setLiveSaid] = useState('');

  /* The same five-second poll the cutting room uses, and for the same
     reason: a clip is a job that takes a minute or two, and the route
     refunds on a real failure — so a blip must not be read as one. */
  useEffect(() => {
    if (!liveJob) return undefined;
    /* Started once per job, not once per run of this effect: `t` is a
       dependency, so choosing a language re-runs it, and a clock restarted by
       picking Afrikaans is a wait that never ends. */
    if (liveSince.current === 0) liveSince.current = Date.now();
    let stopped = false;
    const ask = async (): Promise<void> => {
      /* "No answer yet" and "this is never coming" look identical from here,
         and the press that started this is disabled while the job is live —
         so waiting for ever locks the room until somebody reloads the page.
         Eight minutes, shared with every other room that polls a job. It
         claims less than a failure would, because the job may well still be
         running on the engine and a stall is not refunded. */
      if (!stillWorthWaiting(liveSince.current, Date.now())) {
        setLiveJob(null);
        liveSince.current = 0;
        setLiveSaid(t('post.liveSlow', 'It is taking longer than usual. It has not been lost — have a look in a little while.'));
        return;
      }
      try {
        const token = await accessToken();
        const answer = await fetch(`/api/video?id=${encodeURIComponent(liveJob)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const said = (await answer.json().catch(() => ({}))) as
          { state?: string; url?: string; message?: string };
        if (stopped) return;
        if (said.state === 'done' && said.url) {
          setLiveUrl(said.url);
          setLiveJob(null);
          liveSince.current = 0;
          setLiveSaid(t('post.liveDone', 'Ready. It loops, so it plays over and over.'));
          notify({ id: `video-${liveJob}`, kind: 'video', room: 'photo', title: t('notice.videoReady', 'Your video is ready') });
        } else if (said.state === 'done') {
          /* Finished with no clip to show. Asking again for eight minutes
             would not make one appear, so it stops and says so. */
          setLiveJob(null);
          liveSince.current = 0;
          setLiveSaid(said.message
            ?? t('post.liveNoClip', 'The engine finished but sent no clip back. Try it once more in a little while.'));
        } else if (said.state === 'failed') {
          setLiveJob(null);
          liveSince.current = 0;
          setLiveSaid(said.message
            ?? t('post.liveFailed', 'The engine could not make that one. The credits have been given back.'));
        }
      } catch {
        /* A blip is not a failure. */
      }
    };
    void ask();
    const every = window.setInterval(() => { void ask(); }, 5_000);
    return () => { stopped = true; window.clearInterval(every); };
  }, [liveJob, t]);

  /**
   * Bring the photograph to life.
   *
   * The picture on the bench, up twice — opening frame and closing frame —
   * with a prompt that says what moves and, at length, what must not.
   */
  const bringToLife = async (): Promise<void> => {
    if (!picture || liveBusy || liveJob) return;
    if (!liveCan || liveCan === 'none') {
      setLiveSaid(t('post.liveOff', 'Bringing a photo to life needs a video engine that starts from a picture, and none is switched on for this app yet. Nothing was charged.'));
      return;
    }
    setLiveBusy(true);
    setLiveSaid('');
    try {
      /* Shrunk, and shrunk the same way the cutting room shrinks its frame:
         the engine renders its own output at its own size, so 768 across is
         as useful as 2048 and a fraction of the bytes — and TWO frames
         travel on this request, counted together by the route. */
      const packed = packOne(picture, REFERENCE_SIDE, Math.floor(BUDGET / 2));
      if (!packed) {
        setLiveSaid(t('post.liveTooBig', 'That picture is too big to send. Crop it or bring in a smaller one.'));
        return;
      }
      const frame = `data:${packed.mime};base64,${packed.data}`;
      const token = await accessToken();
      const answer = await fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: motionWords(motion),
          grade: liveCan.grade,
          /* The post's own shape where it is wide or tall, so a story comes
             back story-shaped; a square post takes the photograph's own
             shape, because Veo makes wide and tall and no square. */
          aspect: ((): string => {
            const tall = size.height !== size.width
              ? size.height > size.width
              : (picture.naturalHeight || picture.height) > (picture.naturalWidth || picture.width);
            const want = tall ? '9:16' : '16:9';
            return liveCan.aspects.includes(want) ? want : (liveCan.aspects[0] ?? want);
          })(),
          seconds: LIVE_SECONDS,
          speak: false,
          image: frame,
          /* The same photograph again, where the engine reads a closing
             frame. This is what makes it loop. */
          ...(liveCan.end ? { endImage: frame } : {}),
        }),
      });
      const said = (await answer.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!answer.ok || !said.id) {
        setLiveSaid(said.message
          ?? `${t('post.liveNoStart', 'That could not be started.')} (${answer.status})`);
        return;
      }
      setLiveJob(said.id);
      setLiveSaid(t('post.liveMaking', 'Making it. A minute or two — you can carry on in here while it runs.'));
    } catch {
      setLiveSaid(t('post.liveOffline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setLiveBusy(false);
    }
  };
  const [said, setSaid] = useState('');
  /* The owner, 14 October 2026, over a photograph with two notes on it: "Al
     daai woorde is te veel. Ek dink nie mense hoef dit te sien nie." What
     the room says now goes again by itself, after long enough to read it. */
  useEffect(() => {
    if (!said) return undefined;
    const gone = window.setTimeout(() => setSaid(''), Math.min(9000, 3000 + said.length * 35));
    return () => window.clearTimeout(gone);
  }, [said]);
  /** Which bench is open on the bar. */
  const [bench, setBench] = useState<Bench>(null);
  /** The darkroom open over the room — `Darkroom.tsx`. */
  const [darkroom, setDarkroom] = useState(false);
  /** The vector studio open over the room — `VectorStudio.tsx` — and the art layer it is changing, if any. */
  const [vector, setVector] = useState<{ readonly editing: string | null } | null>(null);
  /* The poster maker, over the room — `PosterMaker.tsx`. */
  const [poster, setPoster] = useState(false);
  /* Product photos, over the room — `ProductShots.tsx`. */
  const [product, setProduct] = useState(false);
  /* Clothes on a model, over the room — `TryOn.tsx`. */
  const [tryOn, setTryOn] = useState(false);
  /* Vector art draws once its picture has loaded; this draws the post again then. */
  const [artTick, setArtTick] = useState(0);
  useEffect(() => {
    const ready = (): void => setArtTick((was) => was + 1);
    window.addEventListener(ART_READY, ready);
    return () => window.removeEventListener(ART_READY, ready);
  }, []);
  /* Opened from All tools onto one of its panels — `lib/alltools.ts`. On
     arriving, and at once when the room is already open. */
  useEffect(() => {
    const openAsked = (): void => {
      const panel = takePanel('photo');
      /* The darkroom is a room of its own over this one, not a bench. */
      if (panel === 'darkroom') setDarkroom(true);
      else if (panel === 'vector') setVector({ editing: null });
      else if (panel === 'poster') setPoster(true);
      else if (panel === 'product') setProduct(true);
      else if (panel === 'tryon') setTryOn(true);
      else if (panel) setBench(panel as Bench);
    };
    openAsked();
    window.addEventListener(OPEN_PANEL_EVENT, openAsked);
    return () => window.removeEventListener(OPEN_PANEL_EVENT, openAsked);
  }, []);
  /* The shapes on the picture — `lib/postshapes.ts`. Drawn under the words
     and over the photograph, and exported with both. */
  const [marks, setMarks] = useState<Mark[]>([]);
  /** The shape whose handles are showing, picked by a tap or by adding it. */
  const [markOn, setMarkOn] = useState<string | null>(null);
  /* ── Layers — `lib/postlayers.ts` ─────────────────────────────────────
     The owner, 16 October 2026: *"As mens op die layers click moet mens kan
     kies op watter layer jy nou edit, en natuurlik 'n all layer wat alles
     by mekaar het."* Which layer a thumb on the glass means; the photo's
     and the background's switches and the photo's opacity, which have no
     item of their own to live on; and the look over the whole picture,
     which How it reads changes while `toneAll` is on. */
  const [layerOn, setLayerOn] = useState<LayerOn>('all');
  const [photoHidden, setPhotoHidden] = useState(false);
  const [photoAlpha, setPhotoAlpha] = useState(1);
  /* How many layers sit under the photo: nought is the photo at the back,
     as it always was. The owner, 17 October 2026: *"Met die layers wil die foto
     wat 1ste daar was nie vorentoe kom nie."* */
  const [photoAt, setPhotoAt] = useState(0);
  const [backHidden, setBackHidden] = useState(false);
  const [allLook, setAllLook] = useState<Look>(PLAIN);
  const [toneAll, setToneAll] = useState(false);
  /** Where the before-and-after line is, as a share across the post; null when it is not shown. */
  const [compare, setCompare] = useState<number | null>(null);
  /* ── The photo grid — `lib/postcells.ts` ─────────────────────────────
     The owner, 16 October 2026: *"wanneer foto's in so grid is dan moet mens op
     een foto kan kliek en dit kan ge-edit word."* The frames and their
     photographs, the one tapped, the gap between them, and a photo held by
     the thumb while it is dragged about inside its frame. */
  const [cells, setCells] = useState<Cell[]>([]);
  const [cellOn, setCellOn] = useState<string | null>(null);
  /** The frame whose photo is open in the crop sheet (`CropSheet.tsx`). */
  const [cellCrop, setCellCrop] = useState<string | null>(null);
  const [gap, setGap] = useState<number>(GAPS[1]);
  const cellHeld = useRef<{ id: string; x: number; y: number; mode?: 'move' | 'size' } | null>(null);
  /* One photo of the grid opened on its own, with every tool in the room
     on it — `editCell` and `finishCell` below. */
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const changeCell = (id: string, how: Partial<Cell>): void =>
    setCells((was) => was.map((one) => (one.id === id ? { ...one, ...how } : one)));
  /* What How it reads is changing right now. */
  const lookNow = toneAll ? allLook : look;
  const setLookNow = toneAll ? setAllLook : setLook;
  /* A small square of the photograph — or of the drawn evening before there
     is one — that the tool pictures and the filter pictures are drawn from. */
  const [thumb, setThumb] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => { setThumb(thumbOf(picture)); }, [picture]);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('natural');
  /* ── Photo templates: the starting set, and the ones she has saved ── */
  const [designGroup, setDesignGroup] = useState<DesignCategory | 'all' | 'saved'>('all');
  const [savedDesigns, setSavedDesigns] = useState<Design[]>([]);
  const [designOwner, setDesignOwner] = useState(false);
  const [designSaid, setDesignSaid] = useState('');
  const [keeping, setKeeping] = useState<{ en: string; af: string; category: DesignCategory }>({ en: '', af: '', category: 'event' });
  const [designBusy, setDesignBusy] = useState(false);
  /** Keep the photo on the post as the template's artwork, when saving one. */
  const [keepArt, setKeepArt] = useState(true);
  /** A picked frame is being moved and sized rather than its photo panned. */
  const [framing, setFraming] = useState(false);
  /** The filter on, how strong, and whether it is on the photo or on all of it. */
  const [filterOn, setFilterOn] = useState<{ readonly id: string; readonly share: number; readonly all: boolean } | null>(null);
  const filterHere = filterOn && filterOn.all === toneAll ? filterOn : null;
  const putFilter = (id: string | null, share = 1): void => {
    const one = id ? filterById(id) : undefined;
    if (!one) {
      setLookNow(PLAIN);
      setFilterOn(null);
      return;
    }
    setLookNow(towards(one.look, share));
    setFilterOn({ id: one.id, share, all: toneAll });
  };
  /* With no photograph there is only the whole picture to change — a
     template, a grid, words on a colour — so Adjust and Filters change that
     rather than a photo that is not there; when one comes in, the photo
     again, as it always started. */
  const hadPicture = useRef(true);
  useEffect(() => {
    const has = Boolean(picture);
    if (has === hadPicture.current) return;
    hadPicture.current = has;
    setToneAll(!has);
  }, [picture]);
  /* Put back as it came — by Adjust, a new photograph, an undo — and no
     filter is on any more, so none is shown as chosen. */
  useEffect(() => {
    if (filterOn && !touched(filterOn.all ? allLook : look)) setFilterOn(null);
  }, [filterOn, look, allLook]);
  /* The before-and-after line belongs to the looks: it goes when there is
     nothing to compare, or when another tool is opened. */
  useEffect(() => {
    if (compare === null) return;
    /* Or to a whole photograph the magic touch changed, while it is open. */
    if (bench === 'magic' && compareFrom && compareFrom.of === picture) return;
    if (!touched(lookNow) || (bench !== 'tone' && bench !== 'filters')) setCompare(null);
  }, [compare, lookNow, bench, compareFrom, picture]);
  /** A shape being carried or stretched by the thumb. */
  const markHeld = useRef<{ id: string; dx: number; dy: number; resize: boolean } | null>(null);
  const changeMark = (id: string, how: Partial<Mark>): void =>
    setMarks((was) => was.map((m) => (m.id === id ? { ...m, ...how } : m)));
  /* ── Cutting the photograph down, which is not the same as framing it ───
 
     The owner, 7 October 2026: *"Ek sien nie goeie cropping en cutting tools
     nie."* `postcrop.ts` chooses which part of a photograph shows through a
     frame; this cuts the rest of the photograph away for good. `cropbox.ts`
     carries the difference and why both belong here.
 
     `null` is not cropping. A box is, and while there is one the glass shows
     the WHOLE photograph with the box over it — which is what every editor
     does, and the only way to drag a corner you cannot see. */
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  /* Typed dimensions for the cut (the owner, 20 October 2026: *"om dimensies
     in 'n bar in te vul is ook belangrik"*): the box keeps that shape while
     it is dragged, and the cut comes out at exactly that many pixels. */
  const [cropExact, setCropExact] = useState<{ w: number; h: number } | null>(null);
  const [cropDraft, setCropDraft] = useState<{ w: string; h: string } | null>(null);
  useEffect(() => { if (!cropBox) { setCropExact(null); setCropDraft(null); } }, [cropBox]);

  /* ── What kind of file, and how big ────────────────────────────────────
 
     The owner, 7 October 2026: *"Ook die formaat van export?"* It was a PNG at
     the post's own size, always, with no choice. `lib/postfile.ts` carries
     the two formats, why the other four were left out, and the one thing
     about JPEG that has to be said out loud. */
  /* ── Simple, or every choice there is ────────────────────────────────
 
     The owner's list, 7 October 2026: *"Simple en advances opsies."* Every tool
     is in both; what simple hides is the rungs. `lib/plainmode.ts` carries
     why that distinction is the whole design. */
  const plain = usePlain();
  const setPlain = useSetPlain();

  const [kind, setKind] = useState<FileKind>('png');
  const [scale, setScale] = useState<Scale>(1);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [squeeze, setSqueeze] = useState<Squeeze>('standard');
  /* ── At most so big — `lib/squeeze.ts`, and `FileSize` for the row. */
  const [limit, setLimit] = useState<Limit>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const grip = useRef<Grip>(null);

  /* ── Drawing round a thing, which is the third way to cut one out ──────
 
     The owner, 7 October 2026: *"Gaan aan met die free-hand cut."*
 
     `cutout.ts` finds a person and knows nothing about a guitar; `erase.ts`
     grows the picture over something small and cannot invent what was behind
     something big. This one works on anything, because the person holding
     the phone already knows where the edges are. `lib/lasso.ts` carries the
     comparison and the arithmetic.
 
     `null` is not tracing. A path is — and it is held in shares of the
     picture, like the crop box, so it still means the same thing if the
     picture is replaced underneath it. */
  /* ── One step back, from anything that destroys the photograph ────────
 
     Five of this room's tools replace the picture outright, on purpose —
     the crop, the background remover, the eraser, and both directions of
     the free-hand cut. Until tonight the only way back was `Start a new
     post` and bringing the file in again, which makes every one of them a
     thing you think twice about pressing. A tool you think twice about
     pressing is a tool that does not get used.
 
     `lib/postback.ts` carries the ceiling and why it is bytes rather than
     steps: a decoded phone photograph is 48 MB of pixels, and eight of them
     is the tab being killed with no message at all.
 
     A ref, not state: the history is not drawn, and putting it in state
     would redraw the whole room on every remembered step. What IS drawn is
     the sentence on the button, and that comes out of `told`, which is
     bumped whenever the history moves. */
  const history = useRef(makeBack<HTMLImageElement>());
  const [told, setTold] = useState(0);

  /* The order of every step, pictures and words alike — see `Step`. */
  const steps = useRef<{ back: Step[]; forward: Step[] }>({ back: [], forward: [] });
  const pushStep = (step: Step): void => {
    const all = steps.current;
    all.back.push(step);
    while (all.back.length > KEEP_STEPS) all.back.shift();
    /* A new change abandons the way forward, the way every editor does. */
    all.forward = [];
    setTold((n) => n + 1);
  };

  /**
   * Remember the picture as it is, then let the caller replace it. `andWords`
   * when the same press also replaces the words and shapes — a template —
   * so one Put back takes the whole press back.
   */
  const before = (what: string, andWords = false): void => {
    history.current.remember(what, picture);
    pushStep(andWords ? { pic: true, what, words, marks, cells } : { pic: true, what });
  };

  /** Remember the words and shapes as they are, before one is thrown away. */
  const beforeLayers = (what: string): void => {
    pushStep({ pic: false, what, words, marks, cells });
  };

  /** What Put back would undo, or null when there is nothing. */
  const undoSays = (): string | null => {
    const back = steps.current.back;
    for (let at = back.length - 1; at >= 0; at -= 1) {
      const one = back[at];
      if (!one.pic) return one.what;
      /* A picture step the picture history has already let go of (its
         ceiling is bytes) is skipped, exactly as `stepBack` skips it. */
      if (history.current.undoable() !== null) return one.what;
    }
    return null;
  };
  const redoSays = (): string | null => {
    const forward = steps.current.forward;
    for (let at = forward.length - 1; at >= 0; at -= 1) {
      const one = forward[at];
      if (!one.pic || history.current.redoable() !== null) return one.what;
    }
    return null;
  };

  /** Put the words and shapes of a step back on, and let go of the rings. */
  const layersFrom = (step: Step): void => {
    if (!step.words || !step.marks) return;
    setWords([...step.words]);
    setMarks([...step.marks]);
    setCells([...(step.cells ?? [])]);
    setWordOn(null);
    setMarkOn(null);
    setCellOn(null);
  };

  const stepBack = (): void => {
    const all = steps.current;
    while (all.back.length) {
      const step = all.back.pop()!;
      let shot: ReturnType<typeof history.current.undo> = null;
      if (step.pic) {
        shot = history.current.undo(picture);
        if (!shot) continue;
      }
      all.forward.push(step.words ? { ...step, words, marks, cells } : step);
      layersFrom(step);
      if (shot) {
        setPicture(shot.picture);
        /* The mask belongs to a picture that is no longer on the glass, and
           changing the cut edge after stepping back would put the old cut on
           the new picture. */
        lastMask.current = null;
        setTraced(null);
        setCropBox(null);
      }
      setTold((n) => n + 1);
      setSaid(t('post.undone', 'Put back.'));
      return;
    }
  };

  const stepOn = (): void => {
    const all = steps.current;
    while (all.forward.length) {
      const step = all.forward.pop()!;
      let shot: ReturnType<typeof history.current.redo> = null;
      if (step.pic) {
        shot = history.current.redo(picture);
        if (!shot) continue;
      }
      all.back.push(step.words ? { ...step, words, marks, cells } : step);
      layersFrom(step);
      if (shot) {
        setPicture(shot.picture);
        lastMask.current = null;
      }
      setTold((n) => n + 1);
      setSaid('');
      return;
    }
  };

  const [traced, setTraced] = useState<Traced | null>(null);
  const tracingNow = useRef(false);
  /* ── Which of the four, and where the drag started ────────────────────
 
     The owner, 8 October 2026: *"'N circle, 'n vierkand, 'n lyn, 'n pencil waar
     jy totale vryheid het om mooi om elke edge te sny."* Four answers to
     "how hard is this edge", and `lib/lasso.ts` carries which is for what.
 
     The start of a drag is a ref and not state: a circle is REBUILT from
     its two corners on every pointermove, so the first corner has to
     survive a render without causing one. */
  /* Whether the room is in "move the words" — the bench shut, the glass
     clear, and a strip over the bar. The same shape as the crop and the
     shape cut, and for the same reason: the bench covers the middle of the
     picture, so a word under it cannot be taken hold of. */
  const [movingWords, setMovingWords] = useState(false);
  /* Shutting the tools lets go of the touched line too, so its ring goes
     with the panel that was about it (15 October 2026). Not while moving
     words: that mode shuts the panel on purpose so the lines can be held. */
  useEffect(() => {
    if (bench === null && !movingWords) setWordOn(null);
  }, [bench, movingWords]);

  const [cutShape, setCutShape] = useState<CutShape>('pencil');
  const cutFrom = useRef<{ readonly x: number; readonly y: number } | null>(null);

  /* Where each block of words landed last time it was drawn, as shares of
     the frame, so a thumb can find the one it is on. */
  const laidOut = useRef(new Map<string, {
    readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  }>());
  /** The line a thumb is currently carrying, and where it took hold. */
  /* A corner of the ring round the whole picture, taken: the distance from
     the picture's middle when it was taken, and the zoom it had, so the
     pull is a ratio and not a sum of jittery moves. */
  const photoPull = useRef<{ readonly cx: number; readonly cy: number; readonly from: number; readonly zoom: number } | null>(null);
  const carrying = useRef<{
    readonly id: string;
    readonly dx: number;
    readonly dy: number;
    /** Set when a corner of the ring was taken: the block's middle in frame
        pixels, how far from it the thumb started, and the size it started at. */
    readonly pull?: { readonly cx: number; readonly cy: number; readonly from: number; readonly size: number };
  } | null>(null);
  /* The copilot's sheet. `aria-pressed` rather than `aria-expanded` on the
     button that opens it — see the note on the cutting room's. */
  const [asking, setAsking] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  /* ── The phone's own back button ──────────────────────────────────────
 
     This paints over the whole app, and `app/page.tsx` only knows about the
     room, the front door, the search and the account panel. Without a layer
     of its own, one press of the hardware button unwinds past this sheet and
     closes the room behind it — which reads as the app throwing somebody out
     of what they were doing.
 
     `check:backlayers` refused this screen on its first sweep, which is the
     second time today a check has caught something in it that only a person
     holding a phone would have found. */
  useBackLayer(!asRoom, onClose);

  /* A ruler the layout can use, from the canvas that will do the drawing.
     `lib/posttext.ts` takes this rather than guessing an average glyph
     width — which is what makes its answers the same as what appears. */
  const measureWith = (ctx: CanvasRenderingContext2D, face: string, weight: number): Measure => (text, px) => {
    /* The same weight the draw will use, and not a hard 700.
 
       A poster face has one weight, 400. Measuring it at 700 and drawing it
       at 400 asks the canvas for a face that does not exist, gets a
       synthesised bold back for the measurement only, and the two answers
       differ by a few per cent — which is a line that fitted while being
       measured and overflows once drawn. */
    ctx.font = `${weight} ${px}px ${face}`;
    return ctx.measureText(text).width;
  };

  /**
   * Everything that is drawn, in the order it is drawn.
   *
   * ── Why the preview is small and the file is not ──────────────────────
   *
   * Both come out of here, and they differ in exactly two ways: the guides,
   * and the number of pixels.
   *
   * The preview used to be the full 1080x1920, scaled down by CSS. It looked
   * right and it was a hole: right-click on a canvas offers "Save image
   * as…", and what that hands over is not a screenshot of a phone screen —
   * it is the exact file, at full size, for nothing. The credit on the way
   * out was the whole reason there is no watermark, so a free road out is
   * that decision reversed without anybody deciding it.
   *
   * `PREVIEW_LONGEST` is drawn in frame coordinates through `ctx.scale`, so
   * every measurement below stays in frame units and the picture is the same
   * picture — just not a deliverable one. `measureText` ignores the
   * transform, which is what makes the text fit identically at both sizes.
   */
  /* The whole photograph, centred, at its own proportions — what the glass
     shows while a crop is being dragged. A constant rather than a literal at
     each of the three places that need it, because the draw and the two
     gesture handlers have to agree about where the picture is to the pixel. */
  const WHOLE_VIEW = { basis: 'whole', zoom: 1, x: 0, y: 0 } as const;

  const draw = (to: HTMLCanvasElement, guides: boolean, times = 1): void => {
    const ctx = to.getContext('2d');
    if (!ctx) return;
    /* On the screen, small enough to be quick. On the way out, the post's own
       size — or twice it, when she has asked for twice it.
 
       `times` is only ever read on the export path: the preview is drawn at
       whatever fits and a 2x preview would be two megapixels redrawn on every
       keystroke for a picture nobody is looking at closely. */
    /* On the screen: as many pixels as the screen shows, and no more.

       The owner, 25 October 2026, with the 1024 x 500 feature graphic on
       a desk screen: *"Kyk hoe verswak die prent wanneer mens dit in ons
       photo booth in bring."* The glass was drawn 540 across and stretched
       by CSS to 1700, three times over, and on a phone at three device
       pixels per point it was stretched too. It is now drawn at the width
       it is shown, times the device pixel ratio, times the pinch zoom —
       never more than the post's own size, never more than
       `GLASS_LONGEST`, and never less than `PREVIEW_LONGEST`. The picture
       is still not a free road out: the canvas suppresses the browser's
       own menu, so there is no "Save image as…" on it, and it is never
       drawn past the size the file comes out at. */
    const longest = Math.max(size.width, size.height);
    const shown = fitted && typeof window !== 'undefined'
      ? (fitted.w * Math.min(3, window.devicePixelRatio || 1) * Math.max(1, view.scale)) / size.width
      : PREVIEW_LONGEST / longest;
    const want = guides
      ? Math.min(1, Math.max(PREVIEW_LONGEST / longest, Math.min(GLASS_LONGEST / longest, shown)))
      : times;
    /* The canvas is sized first and the scale read back OUT of it.
 
       Taking the scale as given and rounding the canvas to it leaves the
       frame a fraction of a pixel short of the edge — 1080 x 0.28125 is
       303.75 in a canvas 304 across — and that quarter-pixel strip is
       never painted. On a transparent post it is a see-through line down
       one side of the picture, which is both a visible flaw and enough to
       fail the probe's own "nothing shows through the preview" reading of
       it. */
    to.width = Math.ceil(size.width * want);
    to.height = Math.ceil(size.height * want);
    ctx.setTransform(to.width / size.width, 0, 0, to.height / size.height, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    /* Setting width or height clears the canvas to transparent, so "nothing
       behind it" is the absence of this fill rather than a colour. */
    /* The background layer can be switched off in the layer list, which is
       the same as nothing behind it — `lib/postlayers.ts`. */
    if (back && !backHidden) {
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, size.width, size.height);
    } else if (guides) {
      /* A checkerboard, and only on screen — `draw(sheet, false)` is what the
         download uses, exactly as the safe-zone bands are.
 
         Without it there is no way to tell a transparent post from a black
         one: both preview as a dark square, the export differs, and she would
         find out when a layered post came back with a black box behind it.
         The feature would have worked and been unusable, which is worse than
         it not being there. */
      /* Drawn in DEVICE pixels, with the frame transform set aside.
 
         Drawn in frame units it lands on fractional pixels once the preview
         is scaled down, so the canvas antialiases every single block
         boundary — twelve per cent of the preview came back part
         see-through, and on screen that is a faint grid of seams over a
         picture meant to show that there is nothing there. Integer steps on
         an identity transform have no boundaries to soften. */
      const had = ctx.getTransform();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const step = Math.max(6, Math.round(to.width / 12));
      for (let y = 0; y < to.height; y += step) {
        for (let x = 0; x < to.width; x += step) {
          ctx.fillStyle = ((x / step) + (y / step)) % 2 === 0 ? CHECK_LIGHT : CHECK_DARK;
          ctx.fillRect(x, y, step, step);
        }
      }
      ctx.setTransform(had);
    }

    if (picture && !photoHidden) {
      /* Placed, not stretched, and placed by the one function that also
         reports how far it can move — so the screen cannot draw it in one
         spot and offer a drag that means another.
 
         While she is cropping, the whole photograph instead: `basis: 'whole'`
         at zoom 1 is contain, so every edge of it is on the glass and every
         corner of the box can be reached. A crop dragged over a picture whose
         edges are off the screen is a crop you cannot see the result of. */
      /* ── And the whole photograph while she is picking words out of it ─

         The same reasoning as cropping and tracing, one line up: a line of
         writing off the edge of the frame is a line she cannot tap. It also
         makes the arithmetic one thing instead of two — `shareAt` already
         converts a thumb against `WHOLE_VIEW`, so the box that is drawn and
         the box that is tapped come out of the same placement by
         construction rather than by two call sites agreeing. */
      /* ── And the whole photograph while the magic touch is aimed ─────

         The owner, 15 October 2026: *"Kyk mooi of elke funksie ... werk."* A
         tap is turned into a spot by `shareAt`, which reads it against the
         whole photograph — and the glass was showing her crop, so the ring
         and the part the AI changed landed away from her finger, and a tap
         near a cropped-off edge did nothing. Drawn whole, the tap, the ring
         and `spotRect` are one placement.

         Only on the glass (`guides`). The file always goes out in her own
         framing, whatever tool happens to be open when she presses Save. */
      const allOfIt = guides && Boolean(cropBox || traced || picking || bench === 'magic');
      const at = place(picture, size, allOfIt ? WHOLE_VIEW : crop);
      /* The look goes on the PICTURE and comes off again before anything is
         written. Words under a blur are not a style, they are a mistake, and
         a filter left set would put every one of them through it. */
      /* A part selected: the photograph as it came, and the look over only
         that part — `lib/postselect.ts`. */
      const chosenPart = selection && selection.of === picture && touched(look) ? selection : null;
      if (chosenPart) {
        ctx.globalAlpha = photoAlpha;
        ctx.drawImage(picture, at.left, at.top, at.width, at.height);
        ctx.drawImage(lookThrough(picture, at.width, at.height, look, to.width / size.width, chosenPart.mask), at.left, at.top, at.width, at.height);
        ctx.globalAlpha = 1;
      } else {
        ctx.filter = filterFor(look, to.width / size.width);
        /* The photo layer's own opacity, from the layer list. */
        ctx.globalAlpha = photoAlpha;
        ctx.drawImage(picture, at.left, at.top, at.width, at.height);
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
      }

      /* ── A box round every line the reader found ─────────────────

         On the glass only. `guides` is false for the download and for the
         shelf, exactly as the checkerboard and the safe-zone bands are: a
         rectangle round the writing is drawn to help her aim, not to be
         part of the post.

         Before the warm wash and before the words, so a highlight is not
         tinted by a look she has on and is not drawn over by her own
         caption. */
      if (guides && picking && found) {
        ctx.save();
        ctx.lineWidth = Math.max(1, size.width / 220);
        for (const one of found) {
          const box = ontoFrame(one, at);
          const chosen = picked?.id === one.id;
          ctx.strokeStyle = chosen ? 'rgba(52,211,153,0.95)' : 'rgba(52,211,153,0.5)';
          ctx.fillStyle = chosen ? 'rgba(52,211,153,0.28)' : 'rgba(52,211,153,0.10)';
          ctx.fillRect(box.left, box.top, box.width, box.height);
          ctx.strokeRect(box.left, box.top, box.width, box.height);
          /* Its name on it (The owner, 14 October 2026: the grabs must be
             visible), so a box is a thing she can choose by what it is. */
          const name = one.text.length > 22 ? `${one.text.slice(0, 21)}\u2026` : one.text;
          if (name) {
            const tall = Math.max(11, Math.round(size.width / 42));
            ctx.font = `700 ${tall}px system-ui, sans-serif`;
            const wide = ctx.measureText(name).width + tall * 0.8;
            const top = box.top - tall * 1.5 >= 0 ? box.top - tall * 1.5 : box.top;
            ctx.fillStyle = chosen ? 'rgba(52,211,153,0.95)' : 'rgba(2,6,4,0.78)';
            ctx.fillRect(box.left, top, wide, tall * 1.4);
            ctx.fillStyle = chosen ? '#02130b' : '#a7f3d0';
            ctx.fillText(name, box.left + tall * 0.4, top + tall * 1.05);
          }
        }
        ctx.restore();
      }

      /* What the magic touch will send: the paint she laid on, see-through
         neon so the photo shows under it, and a ring the size of the brush
         where her finger last was. Guides only. */
      if (guides && bench === 'magic' && magicSpot) {
        const r = magicSize * Math.min(at.width, at.height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(at.left, at.top, at.width, at.height);
        ctx.clip();
        ctx.beginPath();
        for (const stroke of magicStrokes) {
          stroke.forEach((p, i) => {
            const x = at.left + p.x * at.width;
            const y = at.top + p.y * at.height;
            if (i === 0) { ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y); } else ctx.lineTo(x, y);
          });
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = r * 2;
        ctx.strokeStyle = 'rgba(57,255,20,0.38)';
        ctx.stroke();
        ctx.lineWidth = Math.max(2, size.width / 260);
        ctx.strokeStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(at.left + magicSpot.x * at.width, at.top + magicSpot.y * at.height, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (washesOf(look).length && !chosenPart) {
        /* Clipped to the picture, not the frame. A warm wash over the
           background as well would tint the colour she chose behind it,
           which is a control reaching past what it says it does. A
           filter's tint, fade and darkened corners go on the same way. */
        const seen = {
          x: Math.max(0, at.left),
          y: Math.max(0, at.top),
          w: Math.min(at.left + at.width, size.width) - Math.max(0, at.left),
          h: Math.min(at.top + at.height, size.height) - Math.max(0, at.top),
        };
        ctx.save();
        ctx.beginPath();
        ctx.rect(seen.x, seen.y, seen.w, seen.h);
        ctx.clip();
        ctx.globalAlpha = photoAlpha;
        paintWashes(ctx, look, seen.x, seen.y, seen.w, seen.h);
        ctx.restore();
      }
      /* ── Before and after ─────────────────────────────────────────
         The owner, 16 October 2026: *"met die auto enhance moet daar 'n ruler
         wees wat oor die prent slide om te wys hoe dit gelyk het."* Left
         of the line, the photograph as it came; right of it, as it is
         now. On the glass only — the file is always the whole of it. */
      /* The before side: the photograph without its look, or — after the
         AI changed the whole photograph — the photograph it was. */
      const was = compareFrom && compareFrom.of === picture ? compareFrom.from : null;
      if (guides && compare !== null && !toneAll && (touched(look) || was)) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, size.width * compare, size.height);
        ctx.clip();
        ctx.globalAlpha = photoAlpha;
        ctx.drawImage(was ?? picture, at.left, at.top, at.width, at.height);
        ctx.restore();
      }
    }

    /* ── The layers, back to front ─────────────────────────────────────
       The owner, 16 October 2026: *"Die photo editor sal moet layers kry."*
       Every shape and every line of words in one stack, in the order the
       layer list shows — `lib/postlayers.ts`. Before there was an order,
       every shape sat under every line of words; a layer that was never
       moved keeps that place. A layer switched off is not drawn, here or
       in the file. */
    /* A line emptied or taken away leaves no place behind: a stale entry
       here is a ring round nothing that a thumb can still catch. */
    for (const id of [...laidOut.current.keys()]) {
      if (!words.some((one) => one.id === id && one.text.trim() && !one.hidden)) laidOut.current.delete(id);
    }
    /* Drawn onto whichever surface it is handed — the glass itself, or a
       layer of its own when the layer list has made it see-through. */
    const drawWords = (one: Words, ctx: CanvasRenderingContext2D): void => {
      if (!one.text.trim()) return;
      const chosen = faceOf(one.face);
      /* The ring's corners scale the box the words are fitted into, and the
         ceiling with it — a fifth of the height is the most a caption is,
         and somebody pulling a corner out is asking for more than a caption. */
      const scale = one.size ?? 1;
      const base = moveInside(boxOfSpot(one.spot, size), size);
      const box = { ...base, w: Math.min(1, base.w * scale), h: Math.min(1, base.h * scale) };
      /* ── Measured with the letter spacing in it ──────────────────────
 
          A gap applied at the drawing and not at the measuring gives text
          that overflows the box it was fitted to, which is the whole job
          `fitText` exists to do. */
      const letterGap = one.letterGap ?? LETTER_GAP.normal;
      const lineGap = one.lineGap ?? LINE_GAP.normal;
      const measure = measureWithGap(
        measureWith(ctx, chosen.css, chosen.weight), letterGap,
      );
      const fit = fitText(one.text, box, size, measure, {
        lineHeight: lineGap, most: Math.round(size.height * 0.2 * scale),
      });
      ctx.font = `${chosen.weight} ${fit.px}px ${chosen.css}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      /* Where the block goes: wherever she put it, or where the spot says
         if she has not moved it. Centred on the point, because that is
         what dragging a thing to a place means. */
      const laid = blockAt(
        one.at ?? atOf(one.spot), fit.lines.length, fit.px, lineGap, size,
      );
      const put = { x: laid.x, y: laid.y };
      /* ── Moved clear of the platform's furniture, in the file ────────

          The ⚠ on the glass says words under the app's caption and buttons
          are moved clear in the saved file, and `moveInside` above only
          ever kept the BOX inside — the block itself was drawn wherever she
          had dragged it. So the file now does what the sign says: the block,
          measured as it is drawn, is shifted the shortest way into the safe
          band. On the glass it stays where she put it, with the bands
          showing why it will move. */
      if (!guides && size.furniture) {
        const safe = boxOf(ALL);
        const halfW = fit.lines.reduce(
          (most, line) => Math.max(most, measure(line, fit.px)), 0,
        ) / 2;
        const tall = fit.lines.length * fit.px * lineGap;
        const [left, right] = [safe.left * size.width, (safe.left + safe.width) * size.width];
        const [top, foot] = [safe.top * size.height, (safe.top + safe.height) * size.height];
        if (halfW * 2 <= right - left) {
          put.x = Math.min(Math.max(put.x, left + halfW), right - halfW);
        }
        if (tall <= foot - top) {
          put.y = Math.min(Math.max(put.y, top), foot - tall);
        }
      }

      /** One line, with the letters spaced by hand.
 
          `ctx.letterSpacing` exists and is not used: it adds a gap after
          the LAST letter as well, so a centred line comes out off-centre by
          half a gap — and it is missing from enough browsers that the
          export and the preview could disagree on one and not the other.
          Drawn letter by letter, the arithmetic is ours and is the same
          everywhere. */
      const gapPx = letterGap * fit.px;
      const lineWide = (line: string): number =>
        ctx.measureText(line).width + Math.max(0, line.length - 1) * gapPx;
      /* One width for the whole block, so a left- or right-aligned paragraph
         lines up on an edge of the block rather than each line on its own. */
      const blockWide = fit.lines.reduce((most, line) => Math.max(most, lineWide(line)), 0);
      const align = one.align ?? 'center';
      const writeLine = (line: string, atX: number, atY: number): void => {
        const wide = lineWide(line);
        let x = align === 'left'
          ? atX - blockWide / 2
          : align === 'right'
            ? atX + blockWide / 2 - wide
            : atX - wide / 2;
        const was = ctx.textAlign;
        ctx.textAlign = 'left';
        if (letterGap === 0) {
          ctx.fillText(line, x, atY);
        } else {
          for (const letter of line) {
            ctx.fillText(letter, x, atY);
            x += ctx.measureText(letter).width + gapPx;
          }
        }
        ctx.textAlign = was;
      };

      /* ── Something solid behind the words, where she asked for it ──────
 
          Under the shadow and under the letters, measured from the WORDS
          and not from the box: a bar as wide as the box round a two-word
          line is a stripe across the picture with a word in the middle of
          it. One width for the whole block, from its widest line, so a
          two-line caption does not step in and out. */
      if (one.behind && one.behind !== 'none') {
        const widest = fit.lines.reduce(
          (most, line) => Math.max(most, ctx.measureText(line).width),
          0,
        );
        const back = behindWords(
          widest + Math.max(0, fit.lines.reduce((most, line) => Math.max(most, line.length), 0) - 1)
            * letterGap * fit.px,
          fit.px, fit.lines.length, { x: put.x, y: put.y }, size,
        );
        ctx.save();
        if (one.behind === 'bar') {
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          ctx.fillRect(back.x, back.y, back.w, back.h);
        } else {
          /* Fading at the ends, so it reads as part of the photograph
             rather than as a box somebody drew on it. */
          const wash = ctx.createLinearGradient(back.x, 0, back.x + back.w, 0);
          wash.addColorStop(0, 'rgba(0,0,0,0)');
          wash.addColorStop(0.18, 'rgba(0,0,0,0.55)');
          wash.addColorStop(0.82, 'rgba(0,0,0,0.55)');
          wash.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wash;
          ctx.fillRect(back.x, back.y, back.w, back.h);
        }
        ctx.restore();
      }

      ctx.fillStyle = one.ink;
      /* A soft shadow under every line. Light text on a light photograph is
         unreadable and it is not a thing somebody notices while typing — the
         picture behind the words is whatever they chose, not a background
         somebody designed for them. */
      /* ── Where this block landed, so a thumb can take hold of it ────
 
          Written down at the moment it is drawn, because the drawing is
          the only place that knows: the size the type fitted at, how many
          lines it wrapped to and how far apart they are all come out of
          `fitText`, and none of them is state anybody else holds.
 
          A ref and not state: a render writes it and a gesture reads it,
          and putting it in state would make every draw cause another.

          Only from the glass: the file, the shelf and the feed preview are
          drawn too, and in the file a line may have been moved clear of the
          furniture — the thumb has to find it where the GLASS shows it. */
      if (guides) laidOut.current.set(one.id, {
        x: put.x / size.width,
        y: (put.y + (fit.lines.length * fit.px * lineGap) / 2) / size.height,
        w: Math.min(1, (fit.lines.reduce(
          (most, line) => Math.max(most, measure(line, fit.px)), 0,
        ) + fit.px * 0.6) / size.width),
        h: (fit.lines.length * fit.px * lineGap + fit.px * 0.3) / size.height,
      });

      /* ── The glow, if the line has one ─────────────────────────────
          Written three times over with a widening, changing shadow — far
          halo, near halo, core — and then once crisp on top with no shadow
          at all. A canvas has one shadow per fill, and a neon tube is not
          one shadow. The same passes light the shapes, so a lit word and a
          lit ring beside it are the same light. */
      const glow = glowOf(one.glow);
      const passes = haloPasses(glow, fit.px);
      const writeBlock = (): void => {
        let y = put.y;
        for (const line of fit.lines) {
          writeLine(line, put.x, y);
          y += fit.px * lineGap;
        }
      };
      if (passes.length) {
        for (const pass of passes) {
          ctx.shadowColor = pass.colour;
          ctx.shadowBlur = pass.blur;
          writeBlock();
        }
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;
        writeBlock();
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.max(2, fit.px * 0.12);
        writeBlock();
        ctx.shadowBlur = 0;
      }
    };

    /* A photo in the grid: in its frame, placed by the same `place()` as the
       main photograph, and clipped to the frame — rounded, or on a polaroid.
       An empty frame says "add a photo" on the glass and is nothing in the
       file. */
    const drawCell = (cell: Cell, onto: CanvasRenderingContext2D): void => {
      const f = frameOf(cell, size.width, size.height);
      onto.save();
      onto.translate(f.x + f.w / 2, f.y + f.h / 2);
      if (cell.turn) onto.rotate((cell.turn * Math.PI) / 180);
      let inner = { x: -f.w / 2, y: -f.h / 2, w: f.w, h: f.h };
      if (cell.look === 'polaroid') {
        const side = Math.min(f.w, f.h) * 0.05;
        onto.save();
        onto.shadowColor = 'rgba(0,0,0,0.35)';
        onto.shadowBlur = side * 1.5;
        onto.shadowOffsetY = side * 0.4;
        onto.fillStyle = '#fbfaf6';
        onto.fillRect(inner.x, inner.y, inner.w, inner.h);
        onto.restore();
        inner = { x: inner.x + side, y: inner.y + side, w: inner.w - side * 2, h: inner.h - side * 4.2 };
      }
      onto.beginPath();
      if (cell.look === 'round' && typeof onto.roundRect === 'function') {
        onto.roundRect(inner.x, inner.y, inner.w, inner.h, Math.min(inner.w, inner.h) * 0.06);
      } else {
        onto.rect(inner.x, inner.y, inner.w, inner.h);
      }
      onto.clip();
      if (cell.image) {
        const at = place(cell.image, { width: inner.w, height: inner.h }, cell.crop);
        onto.drawImage(cell.image, inner.x + at.left, inner.y + at.top, at.width, at.height);
      } else if (guides) {
        onto.fillStyle = 'rgba(255,255,255,0.10)';
        onto.fillRect(inner.x, inner.y, inner.w, inner.h);
        const line = Math.max(2, size.width * 0.003);
        onto.strokeStyle = 'rgba(255,255,255,0.55)';
        onto.lineWidth = line;
        onto.setLineDash([line * 4, line * 3]);
        onto.strokeRect(inner.x + line, inner.y + line, inner.w - line * 2, inner.h - line * 2);
        onto.setLineDash([]);
        const plus = Math.min(inner.w, inner.h) * 0.16;
        onto.lineWidth = Math.max(3, plus * 0.14);
        onto.lineCap = 'round';
        onto.beginPath();
        onto.moveTo(inner.x + inner.w / 2 - plus / 2, inner.y + inner.h / 2);
        onto.lineTo(inner.x + inner.w / 2 + plus / 2, inner.y + inner.h / 2);
        onto.moveTo(inner.x + inner.w / 2, inner.y + inner.h / 2 - plus / 2);
        onto.lineTo(inner.x + inner.w / 2, inner.y + inner.h / 2 + plus / 2);
        onto.stroke();
      }
      onto.restore();
    };

    /* The photograph again, over the layers below it, when it has been
       moved forward in the layer list. */
    const photoOnTop = (): void => {
      if (!picture || photoHidden) return;
      const view = guides && Boolean(cropBox || traced || picking || bench === 'magic');
      const on = place(picture, size, view ? WHOLE_VIEW : crop);
      const part = selection && selection.of === picture && touched(look) ? selection : null;
      ctx.save();
      ctx.globalAlpha = photoAlpha;
      if (part) {
        ctx.drawImage(picture, on.left, on.top, on.width, on.height);
        ctx.drawImage(lookThrough(picture, on.width, on.height, look, to.width / size.width, part.mask), on.left, on.top, on.width, on.height);
      } else {
        ctx.filter = filterFor(look, to.width / size.width);
        ctx.drawImage(picture, on.left, on.top, on.width, on.height);
      }
      ctx.restore();
    };
    const layered = editingCell ? [] : stackOf(marks, words, cells);
    for (const [at, layer] of layered.entries()) {
      if (photoAt > 0 && at === photoAt) photoOnTop();
      if (layer.item.hidden) continue;
      const paint = (onto: CanvasRenderingContext2D): void => {
        if (layer.kind === 'mark') drawMark(onto, layer.item as Mark, size.width, size.height, lang);
        else if (layer.kind === 'cell') drawCell(layer.item as Cell, onto);
        else drawWords(layer.item as Words, onto);
      };
      /* ── A see-through layer is faded ONCE, as a whole ─────────────
         A shape is painted several times over for its glow and words
         are written once per halo, so turning the canvas's alpha down
         while drawing them stacks the passes back up to nearly solid —
         twenty per cent came out at about eighty. Drawn whole on a sheet
         of its own and laid down at the opacity chosen, it is exactly as
         see-through as the slider says. */
      const alpha = Math.max(0.1, Math.min(1, layer.item.alpha ?? 1));
      const sheet = alpha < 0.999 ? document.createElement('canvas') : null;
      const sctx = sheet?.getContext('2d') ?? null;
      if (!sheet || !sctx) {
        paint(ctx);
        continue;
      }
      sheet.width = to.width;
      sheet.height = to.height;
      sctx.setTransform(ctx.getTransform());
      paint(sctx);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.drawImage(sheet, 0, 0);
      ctx.restore();
    }
    if (photoAt > 0 && photoAt >= layered.length) photoOnTop();

    /* ── How it reads, over everything, when the All layer is chosen ────
       The photo's own look stays on the photo. This one is for the
       finished picture — words and shapes as well — and goes on before the
       rings, so the rings stay the bright green that says "this one". The
       warm wash keeps to what is drawn: on a see-through post it must not
       tint the nothing behind it. */
    if (touched(allLook)) {
      const flat = document.createElement('canvas');
      flat.width = to.width;
      flat.height = to.height;
      const fctx = flat.getContext('2d');
      if (fctx) {
        fctx.drawImage(to, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, to.width, to.height);
        ctx.filter = filterFor(allLook, to.width / size.width);
        ctx.drawImage(flat, 0, 0);
        ctx.filter = 'none';
        if (washesOf(allLook).length) {
          const tint = document.createElement('canvas');
          tint.width = to.width;
          tint.height = to.height;
          const tctx = tint.getContext('2d');
          if (tctx) {
            tctx.drawImage(to, 0, 0);
            paintWashes(tctx, allLook, 0, 0, to.width, to.height);
            tctx.globalCompositeOperation = 'destination-in';
            tctx.drawImage(to, 0, 0);
            ctx.clearRect(0, 0, to.width, to.height);
            ctx.drawImage(tint, 0, 0);
          }
        }
        /* Before and after, for the look over everything: left of the
           line, the whole post as it was before the look. Glass only. */
        if (guides && compare !== null && toneAll) {
          ctx.beginPath();
          ctx.rect(0, 0, to.width * compare, to.height);
          ctx.clip();
          ctx.clearRect(0, 0, to.width, to.height);
          ctx.drawImage(flat, 0, 0);
        }
        ctx.restore();
      }
    }

    /* The tapped photo in the grid: a bright frame with handles, on the
       screen only — the selection she pointed at in her screenshots. */
    if (guides && cellOn && !editingCell) {
      const cell = cells.find((one) => one.id === cellOn);
      if (cell) {
        const f = frameOf(cell, size.width, size.height);
        const line = Math.max(2, size.width * 0.004);
        const knob = Math.max(8, size.width * 0.016);
        ctx.save();
        ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
        if (cell.turn) ctx.rotate((cell.turn * Math.PI) / 180);
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = line;
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = line * 3;
        ctx.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          ctx.beginPath();
          ctx.arc((cx * f.w) / 2, (cy * f.h) / 2, knob, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = line * 0.8;
          ctx.stroke();
        }
        /* Placing the frame: a bigger square at the corner that sizes it. */
        if (framing) {
          const grip = knob * 2.2;
          ctx.fillStyle = '#a78bfa';
          ctx.fillRect(f.w / 2 - grip / 2, f.h / 2 - grip / 2, grip, grip);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = line;
          ctx.strokeRect(f.w / 2 - grip / 2, f.h / 2 - grip / 2, grip, grip);
        }
        ctx.restore();
      }
    }

    /* The picked shape, on the screen only: a bright dashed edge and the
       corner a thumb pulls to make it bigger or smaller. */
    if (guides && markOn) {
      const mark = marks.find((one) => one.id === markOn);
      if (mark) {
        const box = markBox(mark, size.width, size.height);
        const line = Math.max(2, size.width * 0.004);
        ctx.save();
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = line;
        ctx.setLineDash([line * 4, line * 3]);
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = line * 4;
        ctx.strokeRect(box.cx - box.w / 2, box.cy - box.h / 2, box.w, box.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.arc(box.cx + box.w / 2, box.cy + box.h / 2, Math.max(10, size.width * 0.022), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* ── The ring round the line she touched ──────────────────────────────
       The owner, 15 October 2026: *"When I touch the text box on photo editor I
       have to see that I am touching it by making a cropping ring so that we
       can adjust the size of the text on screen."* The crop box's look — a
       bright edge and a handle at each corner — on the screen only. A corner
       is pulled to make the words bigger or smaller (`grab` below). */
    if (guides && wordOn) {
      const line = words.find((one) => one.id === wordOn);
      const was = line && line.text.trim() ? laidOut.current.get(wordOn) : undefined;
      if (was) {
        const line = Math.max(2, size.width * 0.004);
        const left = (was.x - was.w / 2) * size.width;
        const top = (was.y - was.h / 2) * size.height;
        const wide = was.w * size.width;
        const tall = was.h * size.height;
        const arm = Math.min(wide, tall, size.width * 0.06);
        const knob = Math.max(9, size.width * 0.018);
        ctx.save();
        ctx.strokeStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = line * 4;
        ctx.lineWidth = line;
        ctx.setLineDash([line * 4, line * 3]);
        ctx.strokeRect(left, top, wide, tall);
        ctx.setLineDash([]);
        ctx.lineWidth = line * 2.5;
        for (const [cx, cy, dx, dy] of [
          [left, top, 1, 1], [left + wide, top, -1, 1],
          [left, top + tall, 1, -1], [left + wide, top + tall, -1, -1],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + dy * arm);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + dx * arm, cy);
          ctx.stroke();
          ctx.fillStyle = '#39ff14';
          ctx.beginPath();
          ctx.arc(cx, cy, knob, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* ── The ring round the whole picture ─────────────────────────────────
       The owner, 25 October 2026: *"die crop wat jy nog nie het nie, is om 'n
       raam om die hele prent te kan trek, en die hele prent manually te
       shrink na 'n size wat mens verkies."* While the picture is loose (The
       whole picture) and is the layer being edited, the same ring the words
       get stands round it: pull a corner and it grows or shrinks about its
       middle; drag the body and it moves. Never in the exported file. */
    if (guides && picture && !cropBox && !photoHidden && crop.basis === 'whole' && (layerOn === 'all' || layerOn === 'photo')) {
      const ring = place(picture, size, crop);
      const line = Math.max(2, size.width * 0.004);
      const arm = Math.min(ring.width, ring.height, size.width * 0.06);
      const knob = Math.max(9, size.width * 0.018);
      ctx.save();
      ctx.strokeStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = line * 4;
      ctx.lineWidth = line;
      ctx.setLineDash([line * 4, line * 3]);
      ctx.strokeRect(ring.left, ring.top, ring.width, ring.height);
      ctx.setLineDash([]);
      ctx.lineWidth = line * 2.5;
      for (const [cx, cy, dx, dy] of [
        [ring.left, ring.top, 1, 1], [ring.left + ring.width, ring.top, -1, 1],
        [ring.left, ring.top + ring.height, 1, -1], [ring.left + ring.width, ring.top + ring.height, -1, -1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * arm);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * arm, cy);
        ctx.stroke();
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.arc(cx, cy, knob, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ── The crop box, over everything, and never on the exported file ───
 
        Drawn here rather than as HTML over the canvas, for the same reason
        the words are drawn here: one surface. An overlay in HTML has to be
        positioned against a canvas whose size on screen is whatever the
        phone gives it, and the two then disagree by a pixel or two at every
        width — which on a corner handle is the difference between grabbing it
        and grabbing the picture.
 
        Dimmed outside rather than outlined inside. What somebody needs to see
        is what they are THROWING AWAY, and a thin line asks them to work out
        which side of it they are keeping. */
    if (guides && picture && cropBox) {
      const at = place(picture, size, WHOLE_VIEW);
      const box = {
        left: at.left + cropBox.left * at.width,
        top: at.top + cropBox.top * at.height,
        width: (cropBox.right - cropBox.left) * at.width,
        height: (cropBox.bottom - cropBox.top) * at.height,
      };
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath();
      ctx.rect(0, 0, size.width, size.height);
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.fill('evenodd');
      ctx.restore();

      /* Thirds, because a crop is a composition and the one thing a grid
         actually helps with is putting a horizon or a face off centre. */
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = Math.max(1, size.width / 540);
      for (let n = 1; n <= 2; n += 1) {
        ctx.beginPath();
        ctx.moveTo(box.left + (box.width * n) / 3, box.top);
        ctx.lineTo(box.left + (box.width * n) / 3, box.top + box.height);
        ctx.moveTo(box.left, box.top + (box.height * n) / 3);
        ctx.lineTo(box.left + box.width, box.top + (box.height * n) / 3);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(2, size.width / 270);
      ctx.strokeRect(box.left, box.top, box.width, box.height);

      /* The corners, drawn as a thumb's worth of bracket rather than a dot.
         A dot says "there is something here"; a bracket says which corner it
         belongs to, and it is the shape every phone's own cropper uses. */
      const arm = Math.max(14, Math.min(box.width, box.height) / 4);
      const thick = Math.max(4, size.width / 135);
      ctx.lineWidth = thick;
      ctx.lineCap = 'butt';
      const corners: readonly (readonly [number, number, number, number])[] = [
        [box.left, box.top, 1, 1],
        [box.left + box.width, box.top, -1, 1],
        [box.left, box.top + box.height, 1, -1],
        [box.left + box.width, box.top + box.height, -1, -1],
      ];
      for (const [x, y, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x + dx * arm, y + (dy * thick) / 2);
        ctx.lineTo(x + (dx * thick) / 2, y + (dy * thick) / 2);
        ctx.lineTo(x + (dx * thick) / 2, y + dy * arm);
        ctx.stroke();
      }
      /* And a short bar at the middle of each side, because each side can be
         taken on its own now (`gripAt`) and a handle nobody can see is a
         handle nobody uses. */
      const bar = Math.max(12, Math.min(box.width, box.height) / 6);
      ctx.beginPath();
      ctx.moveTo(box.left + box.width / 2 - bar / 2, box.top + thick / 2);
      ctx.lineTo(box.left + box.width / 2 + bar / 2, box.top + thick / 2);
      ctx.moveTo(box.left + box.width / 2 - bar / 2, box.top + box.height - thick / 2);
      ctx.lineTo(box.left + box.width / 2 + bar / 2, box.top + box.height - thick / 2);
      ctx.moveTo(box.left + thick / 2, box.top + box.height / 2 - bar / 2);
      ctx.lineTo(box.left + thick / 2, box.top + box.height / 2 + bar / 2);
      ctx.moveTo(box.left + box.width - thick / 2, box.top + box.height / 2 - bar / 2);
      ctx.lineTo(box.left + box.width - thick / 2, box.top + box.height / 2 + bar / 2);
      ctx.stroke();
    }

    /* ── The traced path, over everything, and never on the file ───────
 
        Drawn on the one surface for the same reason the crop box is: an
        overlay in HTML has to be positioned against a canvas whose size on
        screen is whatever the phone gives it, and the two disagree by a pixel
        or two at every width — which on a line somebody is following with a
        finger is the line not being where the finger is.
 
        Shaded once there is a shape, so what is being thrown away is visible
        while she is still drawing it rather than after she has pressed. */
    if (guides && picture && traced && traced.length > 0) {
      const at = place(picture, size, WHOLE_VIEW);
      const on = (dot: { readonly x: number; readonly y: number }) => ({
        x: at.left + dot.x * at.width,
        y: at.top + dot.y * at.height,
      });
      const line = () => {
        ctx.beginPath();
        const head = on(traced[0]);
        ctx.moveTo(head.x, head.y);
        for (const dot of traced.slice(1)) {
          const put = on(dot);
          ctx.lineTo(put.x, put.y);
        }
      };

      if (traced.length >= 3) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.58)';
        ctx.beginPath();
        ctx.rect(0, 0, size.width, size.height);
        line();
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.restore();
      }

      /* Two strokes, dark under light, so the line is visible on a white
         wall and on a black jacket. One colour is a line that disappears
         over half the photographs anybody owns. */
      line();
      if (traced.length >= 3) ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = Math.max(4, size.width / 150);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(2, size.width / 300);
      ctx.stroke();

      /* Where it started, so she can see what she is coming back to. */
      const head = on(traced[0]);
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(5, size.width / 120), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
    }

    /* The guides last, over everything, and never on the exported file —
       `draw(…, false)` is what the download uses. */
    if (guides && size.furniture && !cropBox && !traced) {
      const safe = boxOf(ALL);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, size.width, safe.top * size.height);
      ctx.fillRect(0, (safe.top + safe.height) * size.height, size.width, size.height);
      ctx.strokeStyle = 'rgba(16,185,129,0.9)';
      ctx.lineWidth = 4;
      ctx.strokeRect(
        safe.left * size.width, safe.top * size.height,
        safe.width * size.width, safe.height * size.height,
      );
    }
  };

  /* Downloaded, then drawn again.
 
     A canvas asked for a face the browser does not have yet substitutes one
     without a word — so the first picture she sees, and the first she could
     export, would be in the fallback. `facesIn` exists only to force the
     frame again once they are really in; the draw effect below has no
     dependency list and runs on every render, so a state change is the
     redraw. */
  const [facesIn, setFacesIn] = useState(false);
  useEffect(() => {
    let left = false;
    void faceReady().then(() => { if (!left) setFacesIn(true); });
    return () => { left = true; };
  }, []);

  /* Every piece of state the draw reads, listed.
 
     `crop` was missing from this list and nothing said so: the sliders moved,
     their labels updated, the state was right, and the picture never
     changed. A dependency list is a promise about what `draw` reads, and the
     compiler does not check it — `audit/postwalk.mjs` does, by counting red
     and blue pixels before and after a drag. That is why the fixture is half
     one colour and half another rather than a photograph. */
  useEffect(() => {
    if (canvas.current) draw(canvas.current, true);
    /* `picking`, `found` and `picked` are in here because the highlights are
       drawn, and a drawing whose state is not in the list is a drawing that
       never happens. The probe caught it exactly: the tap named the right
       line — the arithmetic was fine — and the glass stayed empty, because
       nothing had repainted since the boxes arrived. */
  }, [facesIn, size, picture, words, back, crop, look, cropBox, traced,
    picking, found, picked, compareFrom, selection, photoAt,
    /* The shapes and the one picked: drawn by `draw`, so they repaint it.
       A shape dragged with these missing moved in the state and stayed put
       on the glass until something else happened to repaint. */
    /* The ring round the touched line is drawn by `draw` as well. */
    wordOn,
    /* The layer list's switches and the look over everything. */
    photoHidden, photoAlpha, backHidden, allLook,
    /* The before-and-after line, and which look it compares. */
    compare, toneAll,
    /* The photo grid, and a frame being placed. */
    cells, cellOn, editingCell, framing,
    /* Vector art arriving after its picture loads. */
    artTick,
    /* The size the glass is shown at and the pinch zoom: `draw` picks its
       pixel size from them, so a bigger screen is a sharper picture. */
    fitted, view.scale,
    marks, markOn, magicStrokes, bench, magicSpot, magicSize]);

  /* ── Where the picture sits, and whether it can be moved ──────────── */

  const at = useMemo(
    () => (picture ? place(picture, size, crop) : null),
    [picture, size, crop],
  );
  const movable = at !== null && canMove(at);
  const gaps = at !== null && showsThrough(at, size);

  /* The last point the thumb was at, not the point it started from.
 
     Measuring from the start of the gesture and re-applying the whole
     distance each time works only while nothing clamps; the moment the
     picture reaches an edge, the stored total keeps growing and the picture
     jumps when the thumb turns back. Each move is applied as a step from the
     previous one, so an edge simply stops it. */
  const lastAt = useRef<{ readonly x: number; readonly y: number } | null>(null);

  /**
   * A point on the glass, as a share of the photograph.
   *
   * Three conversions, and the middle one is the one that gets forgotten: the
   * canvas is drawn at 540 on its longest edge and SHOWN at whatever width the
   * phone gives it, so neither of those is the number to divide by — the box
   * on screen is. Then frame units into the placed picture, then into shares.
   */
  /* ── Delete, copy, paste, undo: the keyboard and the right-click ────────

     The owner, 14 October 2026: "in al die editor plekke moet daar 'n right
     click wees wat funksies vinniger kry … as ek 'n text wil delete, dan
     moet ek die delete knoppie kan druk, of ctrl c en ctrl v." */
  /* A shape or a line thrown away is a step, so Put back brings it back. */
  const dropMark = (id: string): void => {
    beforeLayers(t('post.stepDropShape', 'taking a shape away'));
    setMarks((was) => was.filter((one) => one.id !== id));
    setMarkOn(null);
  };
  const dropWords = (id: string): void => {
    beforeLayers(t('post.stepDropWords', 'taking words away'));
    setWords((was) => was.filter((one) => one.id !== id));
    setWordOn(null);
  };
  /* A frame of the grid taken away, photograph and all. */
  const dropCell = (id: string): void => {
    beforeLayers(t('post.stepDropCell', 'taking a photo frame away'));
    setCells((was) => was.filter((one) => one.id !== id));
    setCellOn(null);
  };
  const dropChosen = (): boolean => {
    if (cellOn) { dropCell(cellOn); return true; }
    if (markOn) { dropMark(markOn); return true; }
    if (wordOn) { dropWords(wordOn); return true; }
    return false;
  };
  const copyChosen = (): boolean => {
    const mark = markOn ? marks.find((one) => one.id === markOn) : undefined;
    if (mark) { copiedThing.current = { kind: 'mark', item: mark }; return true; }
    const line = wordOn ? words.find((one) => one.id === wordOn) : undefined;
    if (line) { copiedThing.current = { kind: 'words', item: line }; return true; }
    return false;
  };
  const pasteCopied = (): boolean => {
    const held = copiedThing.current;
    if (!held) return false;
    const id = freshId();
    if (held.kind === 'mark') {
      const item = { ...held.item, id, x: Math.min(0.95, held.item.x + 0.04), y: Math.min(0.95, held.item.y + 0.04), z: frontZ(marks, words) };
      setMarks((was) => [...was, item]);
      setMarkOn(id);
    } else {
      /* A step down and across, so the copy is not hidden under the one it
         was copied from. */
      const from = held.item.at ?? atOf(held.item.spot);
      setWords((was) => [...was, { ...held.item, id, z: frontZ(marks, was), at: { x: Math.min(0.95, from.x + 0.04), y: Math.min(0.95, from.y + 0.04) } }]);
      setWordOn(id);
    }
    return true;
  };
  useEffect(() => {
    const press = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      /* Throwing a line or a shape away only when nothing else has the keys —
         the page itself or the photograph. With a button or a chip focused
         (the last thing pressed), Backspace belongs to that and not to the
         picked line, which used to vanish under it. */
      const onGlass = !target || target === document.body
        || target === document.documentElement || target.tagName === 'CANVAS';
      if (mod && key === 'z') { event.preventDefault(); if (event.shiftKey) stepOn(); else stepBack(); return; }
      if (mod && key === 'y') { event.preventDefault(); stepOn(); return; }
      if (key === 'delete' || key === 'backspace') { if (onGlass && dropChosen()) event.preventDefault(); return; }
      if (mod && key === 'c') { copyChosen(); return; }
      if (mod && key === 'x') { if (onGlass && copyChosen()) { event.preventDefault(); dropChosen(); } return; }
      if (mod && key === 'v') { if (pasteCopied()) event.preventDefault(); return; }
      if (mod && key === 'd') { if (copyChosen()) { event.preventDefault(); pasteCopied(); } }
    };
    window.addEventListener('keydown', press);
    return () => window.removeEventListener('keydown', press);
  });
  useEffect(() => {
    if (!rightMenu) return undefined;
    const shut = (event: PointerEvent): void => {
      if ((event.target as Element | null)?.closest('[data-postrightmenu]')) return;
      setRightMenu(null);
    };
    document.addEventListener('pointerdown', shut);
    return () => document.removeEventListener('pointerdown', shut);
  }, [rightMenu]);

  const shareAt = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): { readonly x: number; readonly y: number } | null => {
    if (!picture) return null;
    const on = event.currentTarget.getBoundingClientRect();
    if (on.width <= 0) return null;
    const per = size.width / on.width;
    const where = place(picture, size, WHOLE_VIEW);
    if (where.width <= 0 || where.height <= 0) return null;
    return {
      x: ((event.clientX - on.left) * per - where.left) / where.width,
      y: ((event.clientY - on.top) * per - where.top) / where.height,
    };
  };

  /** The same point, as a share of the FRAME rather than of the picture. */
  const frameAt = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): { readonly x: number; readonly y: number } | null => {
    const on = event.currentTarget.getBoundingClientRect();
    if (on.width <= 0 || on.height <= 0) return null;
    return {
      x: (event.clientX - on.left) / on.width,
      y: (event.clientY - on.top) / on.height,
    };
  };

  const grab = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    /* ── Two fingers: the photograph zooms, not the screen ────────────
       The owner, 17 October 2026: *"Wanneer mens met twee vingers op die foto
       zoom, dan moet die foto zoom en nie die app se screen nie."* The
       second finger down turns whatever the first one started into a
       pinch, and the pinch is the photograph's own zoom. */
    /* The first finger of a gesture starts it clean: a finger the phone
       never reported lifting must not turn the next touch into a pinch. */
    if (event.isPrimary) {
      fingers.current.clear();
      pinch.current = null;
    }
    fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (fingers.current.size === 2 && picture) {
      const [a, b] = [...fingers.current.values()];
      pinch.current = {
        dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        scale: view.scale,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        x: view.x,
        y: view.y,
      };
      if (brushing.current) setMagicStrokes((was) => was.slice(0, -1));
      brushing.current = false;
      lastAt.current = null;
      grip.current = null;
      carrying.current = null;
      markHeld.current = null;
      cellHeld.current = null;
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (pinch.current) return;
    /* ── Picking a line out of the photograph, before anything else ────

        A mode she turned on, so a thumb means one thing while it is on and
        there is nothing to guess at. Same shape as cropping and tracing. */
    if (picking) {
      const put = shareAt(event);
      if (!put || !found) return;
      setPicked(pickAt(found, put.x, put.y));
      return;
    }
    /* Pulling a thing out is a mode as well: one tap is one thing. */
    if (pulling && picture) {
      const put = shareAt(event);
      if (put && put.x >= 0 && put.x <= 1 && put.y >= 0 && put.y <= 1) {
        setPullTap((was) => ({ x: put.x, y: put.y, n: (was?.n ?? 0) + 1 }));
      }
      return;
    }
    /* The magic touch is a mode too: while its bench is out, a finger
       paints over the part the AI will work on, and does nothing else. */
    if (bench === 'magic' && picture && brushOn) {
      const put = shareAt(event);
      if (put && put.x >= 0 && put.x <= 1 && put.y >= 0 && put.y <= 1) {
        brushing.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setMagicStrokes((was) => [...was, [put]]);
        setMagicSpot(put);
      }
      return;
    }
    /* ── The words next, because a thumb on a word means the word ─────
 
        The owner, 8 October 2026: *"Die woord op die screen kan nog nie
        geskuif en gecrop word nie."* Before this, a drag on the glass
        could only ever mean the picture, and the caption went where the
        spot said and stayed there.
 
        Checked before panning and after cropping: a crop or a trace is a
        mode somebody turned on and is unambiguous, and a thumb that lands
        on a word while neither is on means the word. */
    /* ── The layers, front first ───────────────────────────────────────
       The owner, 16 October 2026: one layer chosen in the layer list is the only
       one a thumb takes hold of; with All, whichever is in FRONT at that
       spot — the order the layer list shows, not words-before-shapes. A
       layer switched off cannot be caught. `lib/postlayers.ts`. */
    if (!cropBox && !traced && !editingCell && (words.length > 0 || marks.length > 0 || cells.length > 0)) {
      const put = frameAt(event);
      if (put) {
        /* A corner of the ring round the line already touched: pulled, it
           makes the words bigger or smaller about their middle. Checked
           first, because a corner sits on the edge of the block and the
           block's own test below would take it as a move. */
        const ringed = wordOn ? laidOut.current.get(wordOn) : undefined;
        const line = wordOn ? words.find((one) => one.id === wordOn) : undefined;
        if (ringed && line && canTouch(layerOn, line)) {
          const px = put.x * size.width;
          const py = put.y * size.height;
          const cx = ringed.x * size.width;
          const cy = ringed.y * size.height;
          const halfW = (ringed.w * size.width) / 2;
          const halfH = (ringed.h * size.height) / 2;
          const reach = Math.max(22, size.width * 0.05);
          const corner = [[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([sx, sy]) =>
            Math.hypot(px - (cx + sx * halfW), py - (cy + sy * halfH)) <= reach);
          if (corner) {
            carrying.current = {
              id: line.id, dx: 0, dy: 0,
              pull: { cx, cy, from: Math.max(1, Math.hypot(px - cx, py - cy)), size: line.size ?? 1 },
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
        }
        const px = put.x * size.width;
        const py = put.y * size.height;
        const reachMark = Math.max(18, size.width * 0.04);
        for (const layer of [...stackOf(marks, words, cells)].reverse()) {
          if (!canTouch(layerOn, layer.item)) continue;
          if (layer.kind === 'cell') {
            /* A photo in the grid. The first tap picks it and opens its own
               tools; once picked, a drag moves the photograph about inside
               its frame. An empty frame asks for a photograph. */
            const cell = layer.item as Cell;
            /* A picked frame being placed: its bottom-right corner sizes it,
               anywhere else inside moves it. One step back for the whole drag. */
            if (framing && cellOn === cell.id) {
              const f = frameOf(cell, size.width, size.height);
              const reach = Math.max(28, size.width * 0.06);
              const corner = Math.hypot(put.x * size.width - (f.x + f.w), put.y * size.height - (f.y + f.h)) <= reach;
              if (corner || cellHas(cell, put.x, put.y, size.width, size.height)) {
                beforeLayers(t('post.stepFrame', 'moving a photo frame'));
                cellHeld.current = { id: cell.id, x: event.clientX, y: event.clientY, mode: corner ? 'size' : 'move' };
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
              }
            }
            if (!cellHas(cell, put.x, put.y, size.width, size.height)) continue;
            setWordOn(null);
            setMarkOn(null);
            if (cellOn === cell.id && cell.image) {
              cellHeld.current = { id: cell.id, x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            setCellOn(cell.id);
            /* Its tools come up as a small bar over the foot of the photo —
               a panel would cover the very photo she just tapped. */
            if (bench !== 'layers') setBench(null);
            if (!cell.image) askOnLift.current = cell.id;
            return;
          }
          if (layer.kind === 'words') {
            const one = layer.item as Words;
            if (!one.text.trim()) continue;
            const was = laidOut.current.get(one.id);
            if (!was) continue;
            if (Math.abs(put.x - was.x) > was.w / 2 || Math.abs(put.y - was.y) > was.h / 2) continue;
            carrying.current = { id: one.id, dx: put.x - was.x, dy: put.y - was.y };
            setWordOn(one.id);
            setMarkOn(null);
            /* Its controls open under the picture — alignment, spacing, size —
               the way touching a shape opens the shapes. */
            if (!movingWords && bench !== 'text' && bench !== 'layers') setBench('text');
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          /* A shape: picked up and carried, or pulled bigger by its corner.
             The owner, 14 October 2026: "Objects wat in gesit word kan nie
             geskuif word nie sien ek, die shapes bedoel ek." */
          const mark = layer.item as Mark;
          const box = markBox(mark, size.width, size.height);
          const corner = Math.hypot(px - (box.cx + box.w / 2), py - (box.cy + box.h / 2)) <= reachMark;
          const inside = Math.abs(px - box.cx) <= box.w / 2 && Math.abs(py - box.cy) <= box.h / 2;
          if (!corner && !inside) continue;
          setMarkOn(mark.id);
          setWordOn(null);
          if (mark.kind === 'chart') { if (bench !== 'charts' && bench !== 'layers') setBench('charts'); } else if (bench !== 'shapes' && bench !== 'layers') setBench('shapes');
          markHeld.current = { id: mark.id, dx: put.x - mark.x, dy: put.y - mark.y, resize: corner && mark.id === markOn };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        if (cellOn) setCellOn(null);
        /* Missed every line: the ring lets go. The owner, 15 October 2026 —
           "Dit voel of daar nie 'n manier is om hierdie raam weg te kry
           nie." Tapping the photo anywhere else is how a selection ends in
           every editor she has used. */
        if (wordOn) setWordOn(null);
      }
    }
    if (traced) {
      const put = shareAt(event);
      if (!put) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      /* ── A line is tapped, not dragged ───────────────────────────────
 
          Each press puts one corner down and the edge to the last one is
          exactly straight, which is the one thing a finger cannot do and
          the whole reason this shape exists. So it ADDS rather than
          starting again. */
      if (cutShape === 'line') {
        tracingNow.current = false;
        setTraced((now) => [...(now ?? []), { x: put.x, y: put.y }]);
        return;
      }
      tracingNow.current = true;
      cutFrom.current = put;
      /* A new stroke starts the shape again rather than joining on to the
         last one. Lifting a thumb and putting it down somewhere else would
         draw a straight line across everything in between — the same
         decision the eraser made, for the same reason. */
      setTraced([{ x: put.x, y: put.y }]);
      return;
    }
    if (cropBox) {
      const put = shareAt(event);
      if (!put) return;
      /* `reach` in shares, worked out from how big the picture is drawn, so a
         corner is as easy to grab on a 390-pixel phone as on a desk screen.
         Twenty-two frame units is about a fingertip at this preview size. */
      const where = place(picture!, size, WHOLE_VIEW);
      grip.current = gripAt(cropBox, put.x, put.y, 22 / Math.max(1, Math.min(where.width, where.height)));
      if (grip.current === null) return;
      lastAt.current = { x: put.x, y: put.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    /* The photograph is dragged only while it is a layer being edited: with
       one shape or one line chosen, a thumb that misses it does nothing
       rather than moving the picture underneath. */
    /* A corner of the ring round the loose picture: pulled, the picture
       grows or shrinks about its middle (`zoomAbout`). Checked before the
       move, because a corner sits on the picture's edge and the move below
       would take it as a drag. */
    if (picture && at && !cropBox && !photoHidden && crop.basis === 'whole' && (layerOn === 'all' || layerOn === 'photo')) {
      const put = frameAt(event);
      if (put) {
        const px = put.x * size.width;
        const py = put.y * size.height;
        const reach = Math.max(22, size.width * 0.05);
        const corner = [[0, 0], [1, 0], [0, 1], [1, 1]].some(([sx, sy]) =>
          Math.hypot(px - (at.left + sx * at.width), py - (at.top + sy * at.height)) <= reach);
        if (corner) {
          const cx = at.left + at.width / 2;
          const cy = at.top + at.height / 2;
          photoPull.current = { cx, cy, from: Math.max(1, Math.hypot(px - cx, py - cy)), zoom: crop.zoom };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
      }
    }
    if (!movable || photoHidden || (layerOn !== 'all' && layerOn !== 'photo')) return;
    lastAt.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (fingers.current.has(event.pointerId)) fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current) {
      if (fingers.current.size >= 2) {
        const [a, b] = [...fingers.current.values()];
        const was = pinch.current;
        const scale = Math.min(5, Math.max(1, was.scale * (Math.hypot(a.x - b.x, a.y - b.y) / was.dist)));
        /* The two fingers' middle moves the view with it, so the part
           between them stays between them. */
        setView(scale === 1
          ? { scale: 1, x: 0, y: 0 }
          : { scale, x: was.x + ((a.x + b.x) / 2 - was.mid.x), y: was.y + ((a.y + b.y) / 2 - was.mid.y) });
      }
      return;
    }
    /* The brush, while her finger is down on the magic touch. */
    if (brushing.current) {
      /* Every point the finger went through, not only the ones a frame
         happened to catch — a quick sweep is a line, not a row of dabs. */
      const native = event.nativeEvent;
      const passes = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
      const points: { x: number; y: number }[] = [];
      for (const one of passes.length ? passes : [native]) {
        const put = shareAt({ ...event, clientX: one.clientX, clientY: one.clientY } as React.PointerEvent<HTMLCanvasElement>);
        if (put) points.push({ x: Math.min(1, Math.max(0, put.x)), y: Math.min(1, Math.max(0, put.y)) });
      }
      if (!points.length) return;
      setMagicStrokes((was) => (was.length ? [...was.slice(0, -1), [...was[was.length - 1], ...points]] : [points]));
      setMagicSpot(points[points.length - 1]);
      return;
    }
    /* A grid photo being moved about inside its frame: the same `moveBy`
       as the main photograph, against the frame instead of the post. */
    const holding = cellHeld.current;
    if (holding?.mode) {
      const cell = cells.find((one) => one.id === holding.id);
      const box = event.currentTarget.getBoundingClientRect();
      if (!cell || box.width <= 0) return;
      const byX = (event.clientX - holding.x) / box.width;
      const byY = (event.clientY - holding.y) / box.height;
      cellHeld.current = { ...holding, x: event.clientX, y: event.clientY };
      const clamp = (n: number, low: number, high: number): number => Math.min(high, Math.max(low, n));
      changeCell(cell.id, holding.mode === 'move'
        ? { x: clamp(cell.x + byX, -cell.w * 0.5, 1 - cell.w * 0.5), y: clamp(cell.y + byY, -cell.h * 0.5, 1 - cell.h * 0.5) }
        : { w: clamp(cell.w + byX, 0.08, 1.2), h: clamp(cell.h + byY, 0.08, 1.2) });
      return;
    }
    if (holding) {
      const cell = cells.find((one) => one.id === holding.id);
      const box = event.currentTarget.getBoundingClientRect();
      if (!cell?.image || box.width <= 0) return;
      const per = size.width / box.width;
      const byX = (event.clientX - holding.x) * per;
      const byY = (event.clientY - holding.y) * per;
      cellHeld.current = { ...holding, x: event.clientX, y: event.clientY };
      const f = frameOf(cell, size.width, size.height);
      const placed = place(cell.image, { width: f.w, height: f.h }, cell.crop);
      changeCell(cell.id, { crop: moveBy(cell.crop, placed, byX, byY) });
      return;
    }
    const shape = markHeld.current;
    if (shape) {
      const put = frameAt(event);
      if (!put) return;
      if (shape.resize) {
        setMarks((was) => was.map((m) => {
          if (m.id !== shape.id) return m;
          const short = Math.min(size.width, size.height);
          const halfW = Math.abs(put.x * size.width - m.x * size.width);
          const halfH = Math.abs(put.y * size.height - m.y * size.height);
          if (!isFilled(m.kind)) return { ...m, size: Math.max(0.06, Math.min(1.6, (Math.max(halfW, halfH) * 2) / short)) };
          const w = Math.max(short * 0.04, halfW * 2);
          const h = Math.max(short * 0.04, halfH * 2);
          return { ...m, size: Math.max(0.04, Math.min(2, Math.sqrt(w * h) / short)), stretch: Math.max(0.2, Math.min(5, w / h)) };
        }));
        return;
      }
      changeMark(shape.id, {
        x: Math.max(0, Math.min(1, put.x - shape.dx)),
        y: Math.max(0, Math.min(1, put.y - shape.dy)),
      });
      return;
    }
    const held = carrying.current;
    if (held?.pull) {
      const put = frameAt(event);
      if (!put) return;
      const { cx, cy, from, size: was } = held.pull;
      const now = Math.hypot(put.x * size.width - cx, put.y * size.height - cy);
      const next = Math.max(WORDS_SIZE.min, Math.min(WORDS_SIZE.max, was * (now / from)));
      setWords((all) => all.map((one) => (one.id === held.id ? { ...one, size: Math.round(next * 100) / 100 } : one)));
      return;
    }
    if (held) {
      const put = frameAt(event);
      if (!put) return;
      setWords((was) => was.map((one) => (one.id === held.id
        ? { ...one, at: atInside({ x: put.x - held.dx, y: put.y - held.dy }) }
        : one)));
      return;
    }
    if (traced) {
      if (!tracingNow.current) return;
      const put = shareAt(event);
      if (!put) return;
      /* A dragged shape is rebuilt from its two corners rather than
         appended to: appending would grow a new circle on top of the last
         one at every pointermove. */
      if (dragged(cutShape)) {
        setTraced((now) => shapePath(cutShape, cutFrom.current, put, now ?? []));
        return;
      }
      setTraced((now) => (now ? trace(now, put) : now));
      return;
    }
    if (cropBox) {
      const put = shareAt(event);
      const held = grip.current;
      if (!put || !held) return;
      if (held === 'inside') {
        const was = lastAt.current;
        if (!was) return;
        lastAt.current = put;
        setCropBox((now) => (now ? moveBox(now, put.x - was.x, put.y - was.y) : now));
        return;
      }
      setCropBox((now) => {
        if (!now) return now;
        const pulled = pullCorner(now, held, put.x, put.y);
        return cropExact && picture
          ? toShape(pulled, { width: picture.naturalWidth || picture.width, height: picture.naturalHeight || picture.height }, cropExact.w / cropExact.h)
          : pulled;
      });
      return;
    }
    const pull = photoPull.current;
    if (pull && picture) {
      const put = frameAt(event);
      if (!put) return;
      const dist = Math.hypot(put.x * size.width - pull.cx, put.y * size.height - pull.cy);
      setCrop((now) => zoomAbout(now, picture, size, pull.zoom * (dist / pull.from)));
      return;
    }
    const was = lastAt.current;
    if (!was || !at) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    /* Screen pixels into frame units. The canvas is drawn at 540 on its
       longest edge and shown at whatever width the phone gives it, so
       neither of those numbers is the one to divide by — the box on screen
       is. */
    const per = size.width / box.width;
    const byX = (event.clientX - was.x) * per;
    const byY = (event.clientY - was.y) * per;
    lastAt.current = { x: event.clientX, y: event.clientY };
    setCrop((now) => moveBy(now, at, byX, byY));
  };

  /* An empty frame asks for a photo when the finger LIFTS. A phone only
     lets a page open its picker on a touch's end, not its start, so the
     picker asked for on the way down never came up (20 October 2026). */
  const askOnLift = useRef<string | null>(null);
  const letGo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const asking = event.type === 'pointerup' ? askOnLift.current : null;
    askOnLift.current = null;
    if (asking) askForCell(asking);
    fingers.current.delete(event.pointerId);
    if (fingers.current.size === 0) pinch.current = null;
    brushing.current = false;
    cellHeld.current = null;
    lastAt.current = null;
    grip.current = null;
    tracingNow.current = false;
    cutFrom.current = null;
    carrying.current = null;
    markHeld.current = null;
    photoPull.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };


  /**
   * A canvas the photograph's own shape — and its own size, unless that is
   * smaller than a post: a 400-pixel picture would make a 400-pixel post,
   * which every platform shows soft. So the longest side is at least 1080,
   * the size the platforms ask for, and the shape is the photo's.
   */
  /* ── Smart crop: where each shape would stand over this photo ────────
     Read once per photograph, small, on the phone — `lib/smartcrop.ts`. A
     picture the browser will not let us read (one from another site) is
     simply cut in the middle, as it always was. */
  const interest = useMemo(() => {
    if (!picture) return null;
    try {
      const k = SMART_GRID / Math.max(picture.naturalWidth, picture.naturalHeight, 1);
      const w = Math.max(1, Math.round(picture.naturalWidth * k));
      const h = Math.max(1, Math.round(picture.naturalHeight * k));
      const sheet = document.createElement('canvas');
      sheet.width = w;
      sheet.height = h;
      const ctx = sheet.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(picture, 0, 0, w, h);
      return interestOf(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch {
      return null;
    }
  }, [picture]);

  const ownSizeOf = (photoW: number, photoH: number): PostSize => {
    const up = Math.max(1, POST_LEAST / Math.max(photoW, photoH));
    const w = Math.round(photoW * up);
    const h = Math.round(photoH * up);
    return {
      id: `own_${w}x${h}`,
      name: t('post.ownSize', 'Its own size'),
      width: w,
      height: h,
      furniture: false,
      what: {
        en: `The photo's own shape, ${w}×${h}. Nothing is cut off it.`,
        af: `Die foto se eie vorm, ${w}×${h}. Niks word afgesny nie.`,
      },
    };
  };

  /**
   * In and out, about a point that stays where it is.
   *
   * The owner, 18 October 2026: *"as die dimensies sukkel om in die skerm te
   * pas moet die photo editor sommer self die foto kleiner zoom dat dit in
   * pas, en die gebruiker moet dan in en uit kan zoom."* Out — 1× — is the
   * whole picture fitted to the screen, which is where every picture starts
   * whatever its size; in goes to 5×. `about` is a point on the screen,
   * from the middle of the photograph's space, that stays under the finger
   * or the mouse; the buttons and the slider zoom about the middle.
   */
  const viewTo = (next: number, about: { readonly x: number; readonly y: number } = { x: 0, y: 0 }): void => {
    setView((was) => {
      const scale = Math.min(VIEW_MOST, Math.max(1, next));
      if (scale === 1) return { scale: 1, x: 0, y: 0 };
      const by = scale / was.scale;
      return { scale, x: about.x - (about.x - was.x) * by, y: about.y - (about.y - was.y) * by };
    });
  };

  /**
   * A picture off her phone, through the guard that reads pixels.
   *
   * The first version of this handed the file straight to `new Image()`.
   * `check:photopath` refused it, and it was right: a modern phone writes a
   * 200-megapixel JPEG that is ten megabytes on disk, so any guard written
   * in BYTES waves it through — and the browser is then asked for eight
   * hundred megabytes in one allocation. The tab is not thrown from, it is
   * killed, and a killed tab is a white screen with nothing in the console.
   *
   * `lib/imagefile.ts` reads the dimensions out of the file's own header
   * before any decoder is asked for anything, and scales DURING the decode.
   * `fit` to the longest side this canvas can use: a picture larger than the
   * frame is detail nobody will see, at a cost everybody pays.
   */
  const bringIn = async (file: File | null): Promise<void> => {
    if (!file) return;
    setSaid('');
    /* Nothing on the canvas yet: the canvas becomes the photo's own size,
       rather than the photo being cut to a square nobody chose. With work
       already there, the canvas stays and "Its own size" is one press. */
    const fresh = picture === null && words.length === 0 && marks.length === 0 && !shapeChosen.current;
    const made = await fit(file, OWN_MOST, true);
    if (!made.ok) {
      setSaid(made.why === 'too_many_pixels'
        ? t('post.tooMany', 'That picture is too large to open on a phone. A photo straight off a camera often is.')
        : t('post.badFile', 'That file could not be read as a picture.'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      /* A step like any other, so bringing the wrong one in on top of work
         already done is one press to take back rather than a lost evening. */
      before(t('post.stepBring', 'bringing a picture in'));
      if (fresh) setSize(ownSizeOf(img.naturalWidth, img.naturalHeight));
      setView({ scale: 1, x: 0, y: 0 });
      setPicture(img);
      setCrop(MIDDLE);
      setLook(PLAIN);
      /* A new photograph is seen: a photo layer left switched off would
         bring it in invisible. */
      setPhotoHidden(false);
      setPhotoAlpha(1);
      setWhole(null);
      /* Everything that was about the last photograph: its cut-out mask,
         the boxes found in it and the spot marked on it. */
      lastMask.current = null;
      setFound(null);
      setPicking(false);
      setPicked(null);
      setMagicSpot(null);
      setMagicStrokes([]);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => setSaid(t('post.badFile', 'That file could not be read as a picture.'));
    img.src = made.preview;
  };

  /* A whole new picture made for the post — a poster, a product photo — at
     a post size of its own. A step like bringing one in, so Undo takes it
     back, and everything that was about the last photograph goes. */
  const madeWhole = (img: HTMLImageElement, shape: string, step: string): void => {
    before(step);
    const fits = POST_SIZES.find((one) => one.id === shape);
    if (fits) setSize(fits);
    setPicture(img);
    setCrop(MIDDLE);
    setLook(PLAIN);
    setPhotoHidden(false);
    setPhotoAlpha(1);
    setWhole(null);
    lastMask.current = null;
    setFound(null);
    setPicking(false);
    setPicked(null);
    setMagicSpot(null);
    setMagicStrokes([]);
  };

  /* ── The photo grid ───────────────────────────────────────────────────
     `lib/postcells.ts` holds the frames; this is putting photographs in
     them, choosing a layout, and opening one photo on its own. */
  const cellInput = useRef<HTMLInputElement | null>(null);
  const fillingCell = useRef<string | null>(null);
  /** A photograph off the phone into the frame being filled. */
  const fillCell = async (file: File | null): Promise<void> => {
    const id = fillingCell.current;
    fillingCell.current = null;
    if (!file || !id) return;
    const made = await fit(file, Math.max(size.width, size.height), true);
    if (!made.ok) {
      setSaid(made.why === 'too_many_pixels'
        ? t('post.tooMany', 'That picture is too large to open on a phone. A photo straight off a camera often is.')
        : t('post.badFile', 'That file could not be read as a picture.'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      beforeLayers(t('post.stepFillCell', 'putting a photo in the grid'));
      changeCell(id, { image: img, crop: MIDDLE });
      setCellOn(id);
    };
    img.onerror = () => setSaid(t('post.badFile', 'That file could not be read as a picture.'));
    img.src = made.preview;
  };
  /** Ask for a photograph for this frame — the phone's own picker. */
  const askForCell = (id: string): void => {
    fillingCell.current = id;
    cellInput.current?.click();
  };
  /** A layout, keeping the photographs already in the grid in order. */
  const applyLayout = (id: string, nextGap = gap): void => {
    const layout = LAYOUTS.find((one) => one.id === id);
    if (!layout) return;
    beforeLayers(t('post.stepLayout', 'choosing a photo grid'));
    setCells((was) => cellsOf(layout, nextGap, size.width / size.height, freshId, was));
    setCellOn(null);
  };
  /* The frames follow the layout's own shape when the gap changes. */
  const layoutNow = useRef<string | null>(null);

  /* ── One photo of the grid, on its own ────────────────────────────────
     The owner's screenshots: tap a photo in the grid and its tools come up —
     background off, adjust, the magic tools. Rather than teach every tool
     in this room about frames, the photo is opened ALONE: the post steps
     aside, the photo becomes the picture every tool already works on, and
     Done puts the edited photo back in its frame. The post, its words, its
     shapes and its own photograph are kept and come back exactly. */
  const cellSession = useRef<{
    readonly id: string;
    readonly size: PostSize;
    readonly picture: HTMLImageElement | null;
    readonly crop: Crop;
    readonly look: Look;
    readonly whole: HTMLImageElement | null;
    readonly history: ReturnType<typeof makeBack<HTMLImageElement>>;
    readonly steps: { back: Step[]; forward: Step[] };
  } | null>(null);
  const editCell = (id: string): void => {
    const cell = cells.find((one) => one.id === id);
    if (!cell?.image) return;
    const img = cell.image;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, 1350 / Math.max(w, h));
    cellSession.current = {
      id, size, picture, crop, look, whole,
      history: history.current, steps: steps.current,
    };
    /* A history of its own, so Put back inside the photo cannot reach back
       into the post's — and the post's comes back untouched. */
    history.current = makeBack<HTMLImageElement>();
    steps.current = { back: [], forward: [] };
    setSize({ id: 'cell', name: 'Photo', width: Math.round(w * scale), height: Math.round(h * scale), furniture: false, what: { en: '', af: '' } });
    setPicture(img);
    setCrop(MIDDLE);
    setLook(PLAIN);
    setWhole(null);
    lastMask.current = null;
    setCellOn(null);
    setEditingCell(id);
    setBench('pic');
  };
  /** Done (`keep`) or Cancel: the photo back in its frame, the post back as it was. */
  const finishCell = (keep: boolean): void => {
    const was = cellSession.current;
    if (!was) return;
    const restore = (): void => {
      history.current = was.history;
      steps.current = was.steps;
      setSize(was.size);
      setPicture(was.picture);
      setCrop(was.crop);
      setLook(was.look);
      setWhole(was.whole);
      lastMask.current = null;
      setEditingCell(null);
      setCellOn(was.id);
      /* Back to the photo's own small bar, not a panel over the grid. */
      setBench(null);
      cellSession.current = null;
      setTold((n) => n + 1);
    };
    if (!keep || !picture) { restore(); return; }
    /* The edited photograph, with its look baked in, at its own size. */
    const baked = document.createElement('canvas');
    baked.width = picture.naturalWidth || picture.width;
    baked.height = picture.naturalHeight || picture.height;
    const bctx = baked.getContext('2d');
    if (!bctx) { restore(); return; }
    if (selection && selection.of === picture && touched(look)) {
      /* Only the part chosen in Adjust or Filters, as on the glass. */
      bctx.drawImage(picture, 0, 0, baked.width, baked.height);
      bctx.drawImage(lookThrough(picture, baked.width, baked.height, look, 1, selection.mask), 0, 0, baked.width, baked.height);
    } else {
      bctx.filter = filterFor(look, 1);
      bctx.drawImage(picture, 0, 0, baked.width, baked.height);
      bctx.filter = 'none';
      if (washesOf(look).length) {
        paintWashes(bctx, look, 0, 0, baked.width, baked.height);
        bctx.globalCompositeOperation = 'destination-in';
        bctx.drawImage(picture, 0, 0, baked.width, baked.height);
        bctx.globalCompositeOperation = 'source-over';
      }
    }
    const done = new Image();
    done.onload = () => {
      restore();
      /* One step on the post's own history: the whole photo edit, undone in one. */
      steps.current.back.push({ pic: false, what: t('post.stepEditCell', 'editing a photo in the grid'), words, marks, cells });
      steps.current.forward = [];
      changeCell(was.id, { image: done });
    };
    done.onerror = () => restore();
    done.src = baked.toDataURL('image/png');
  };

  /**
   * Bring in pictures for the engine to copy FROM.
   *
   * ── What this is, said plainly ────────────────────────────────────────
   *
   * Not pictures to edit. Pictures to look at while it draws something
   * else: this person's face, this logo, this palette, this costume. The
   * words say what to do with them — "put the man from the second picture
   * into the first", "put this logo on the shirt", "make it look like that
   * photograph".
   *
   * Gemini has always read several pictures in a turn. This room sent one,
   * because the list that carried them was built to hold a list and only
   * ever had one thing put in it.
   *
   * ── Why they are read at `REFERENCE_SIDE` and not full size ───────────
   *
   * `lib/packpicture.ts` has the arithmetic. In short: a reference is never
   * handed back to anybody, so all it has to survive is being looked at,
   * and the request body is the thing that cannot grow. They are read in at
   * a modest size here as well as shrunk there, because the memory ceiling
   * in `lib/imagefile.ts` is about THIS tab and applies either way.
   */
  const bringRefs = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    setSaid('');
    const room = roomForRefs(Boolean(picture)) - refs.length;
    if (room <= 0) {
      setSaid(t('post.refsFull', 'That is as many pictures as can go up at once.'));
      return;
    }
    const taking = Array.from(files).slice(0, room);
    for (const file of taking) {
      /* eslint-disable no-await-in-loop -- one at a time on purpose: three
         decodes at once on a phone is the memory spike `lib/imagefile.ts`
         exists to avoid, and three is the most there will ever be. */
      const made = await fit(file, REFERENCE_SIDE);
      if (!made.ok) {
        setSaid(made.why === 'too_many_pixels'
          ? t('post.tooMany', 'That picture is too large to open on a phone. A photo straight off a camera often is.')
          : t('post.badFile', 'That file could not be read as a picture.'));
        continue;
      }
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = made.preview;
      });
      /* eslint-enable no-await-in-loop */
      if (!img.naturalWidth) {
        setSaid(t('post.badFile', 'That file could not be read as a picture.'));
        continue;
      }
      setRefs((was) => [...was, { url: made.preview, image: img }]);
    }
    if (files.length > taking.length) {
      setSaid(t('post.refsSome', 'Only the first few went up — that is as many as fit at once.'));
    }
  };

  /* Every reference still held when the room closes.
     An object URL is a handle the browser keeps alive until it is told
     otherwise, so leaving the room with three up would hold three
     photographs in memory for as long as the tab lives. A ref rather than a
     dependency on `refs`, because an effect that re-runs on every change
     would revoke the URL the thumbnail is still drawing from. */
  const refsNow = useRef(refs);
  refsNow.current = refs;
  useEffect(() => () => {
    for (const one of refsNow.current) URL.revokeObjectURL(one.url);
  }, []);

  /** Take one back out, and let go of its object URL. */
  const dropRef = (at: number): void => {
    setRefs((was) => {
      const going = was[at];
      if (going) URL.revokeObjectURL(going.url);
      return was.filter((_, index) => index !== at);
    });
  };

  /**
   * Charged first, saved second.
   *
   * A save that happens and is sometimes not paid for is a price nobody can
   * reason about, so the browser asks before it draws the file. The route
   * refuses in its own words — signed out, no credits — and those sentences
   * are better than any invented here.
   */
  /** How hard a JPG or WebP is squeezed; a PNG has nothing to squeeze, and
      `toBlob` is not handed a number that would do nothing. */
  const squeezedQuality = (): number | undefined => {
    const how = formatOf(kind);
    return typeof how.quality === 'number' ? Math.min(1, how.quality * SQUEEZE[squeeze]) : undefined;
  };

  /**
   * The file itself, at `times` the post's size and a quality, in the kind
   * chosen. Drawn fresh each time: the compressor asks for it several times
   * over while it looks for the best file under a limit, and the size
   * readout asks for it while nothing is being charged.
   */
  const makeFile = async (times: number, quality: number | undefined, type = formatOf(kind).type): Promise<Blob | null> => {
    const sheet = document.createElement('canvas');
    const how = formatOf(kind);
    draw(sheet, false, times);
    if (!how.clear && !back && type === how.type) {
      const onto = document.createElement('canvas');
      onto.width = sheet.width;
      onto.height = sheet.height;
      const ctx = onto.getContext('2d');
      if (ctx) {
        ctx.fillStyle = lastColour || '#ffffff';
        ctx.fillRect(0, 0, onto.width, onto.height);
        ctx.drawImage(sheet, 0, 0);
        sheet.width = onto.width;
        sheet.height = onto.height;
        sheet.getContext('2d')?.drawImage(onto, 0, 0);
      }
    }
    return new Promise<Blob | null>((done) => sheet.toBlob(done, type, quality));
  };

  /* ── The size readout, while the way out is open ───────────────────────
     The owner: *"dit wys soos jy verstel die file size."* The file is made
     here exactly as Save would make it — nothing is charged for making it,
     only for taking it — and measured against the same picture as a PNG,
     which is the file with nothing squeezed. Only while the save tools are
     open: nothing else on the screen can change while they cover it, and a
     full-size picture drawn on every keystroke would be work for nothing.
     The makers are read through a ref, so the readout follows what can
     change and not every render. */
  const maker = useRef({ makeFile, squeezedQuality });
  maker.current = { makeFile, squeezedQuality };
  useEffect(() => {
    if (bench !== 'save') return undefined;
    let gone = false;
    setEstimating(true);
    const soon = window.setTimeout(() => {
      void (async () => {
        try {
          await faceReady();
          const { makeFile: make, squeezedQuality: quality } = maker.current;
          const plain = await make(scale, undefined, 'image/png');
          const fitted = await fitUnder((q, share) => make(scale * share, q), quality(), limit);
          if (gone) return;
          setEstimate(fitted
            ? { before: Math.max(plain?.size ?? 0, fitted.blob.size), after: fitted.blob.size, scale: fitted.scale, fits: fitted.fits }
            : null);
        } finally {
          if (!gone) setEstimating(false);
        }
      })();
    }, 350);
    return () => {
      gone = true;
      window.clearTimeout(soon);
    };
  }, [bench, kind, scale, squeeze, limit]);

  /**
   * Paid for, then drawn. One road for both ways out.
   *
   * ── Why the film has to come through here too ────────────────────────
   *
   * The owner: *"Dit is vir plasings vir sosiale media en kan ook in die video
   * editor ingesit word."* So a post can go next door as the film's cover —
   * and the video editor charges nothing, because it cuts and exports
   * entirely on the device: *"no credits, no queue, no waiting."*
   *
   * Which means post → cover → film would have been a free way to take a
   * post off the phone, and it would have undone the reason there is no
   * watermark: *"elke keer wanneer iets afgelaai word kos dit krediete ...
   * hulle sal nie kan export sonder krediete nie."* A second road out that
   * nobody is charged for is the watermark decision reversed by accident.
   *
   * `spend_credits` takes a charge once per reference and the reference is
   * the post's own id, so the honest case is also the kind one: a post she
   * already saved costs nothing to put into a film, and a post that goes
   * straight into a film costs the one charge it would have cost to save.
   */
  const paidPicture = async (): Promise<Blob | null> => {
    /* ── Drawable, before anybody is charged ───────────────────────────
       A custom size goes to 8000 a side and How big doubles it, and a
       canvas past what the browser will draw comes back EMPTY, with no
       error — after the credits were taken. So the size is asked first,
       and refused in a sentence while it costs nothing. */
    const outWide = Math.ceil(size.width * scale);
    const outTall = Math.ceil(size.height * scale);
    if (outWide > CANVAS_MOST.side || outTall > CANVAS_MOST.side
      || outWide * outTall > CANVAS_MOST.pixels) {
      setSaid(t(
        'post.tooBigOut',
        'At {w}×{h} that is too big for a phone to draw as one picture. Choose 1× under How big, or a smaller canvas size. Nothing was charged.',
      ).replace('{w}', String(outWide)).replace('{h}', String(outTall)));
      return null;
    }
    const token = await accessToken();
    const answer = await fetch('/api/post/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ post }),
    });
    if (!answer.ok) {
      const why = (await answer.json().catch(() => ({}))) as { message?: string };
      setSaid(why.message ?? `${t('post.noExport', 'That could not be exported.')} (${answer.status})`);
      return null;
    }
    await faceReady();
    /* Under the limit she chose, if she chose one — `lib/squeeze.ts`. */
    const fitted = await fitUnder(
      (quality, share) => makeFile(scale * share, quality),
      squeezedQuality(),
      limit,
    );
    if (!fitted) setSaid(t('post.noExport', 'That could not be exported.'));
    return fitted?.blob ?? null;
  };

  /**
   * Off the device, charged before it is drawn.
   *
   * A save that happens and is sometimes not paid for is a price nobody can
   * reason about, so the browser asks before it draws the file. The route
   * refuses in its own words — signed out, no credits — and those sentences
   * are better than any invented here.
   */
  const take = async (): Promise<void> => {
    setBusy(true);
    setSaid('');
    try {
      const blob = await paidPicture();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nameFor(size.id, kind, scale);
      a.click();
      /* Let go a little later, not on the same tick: some browsers start
         the download after `click` returns, and a URL revoked under them is
         a paid picture that never arrives. */
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setSaid(t('post.saved', 'Saved to your device.'));
      /* Saved is when they are most open to more: what it can become. */
      if (picture && offerIf('postSaved')) window.setTimeout(() => setIdea({ moment: 'postSaved', thumb: url }), 900);
    } catch {
      setSaid(t('post.noExport', 'That could not be exported.'));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Read the words in the picture she brought in.
   *
   * The PICTURE, not the canvas. The canvas carries her own words, her crop
   * and her blur — handing that to an engine that reads letters would have
   * it read her captions back to her, and a blurred picture would read as
   * nothing at all. `picture` is the file as it arrived.
   */
  const grabText = async (lang: Readable): Promise<void> => {
    if (!picture) return;
    setSaid('');
    setGrabbed(null);
    setGrabLang(lang);
    if (!canRead()) {
      setSaid(t('post.grabOld', 'This browser is too old to read words out of a picture.'));
      return;
    }
    setReading(0);
    try {
      const got = await readWords(picture, lang, (part) => setReading(part));
      if (!got.ok) {
        setSaid(got.why === 'unsupported'
          ? t('post.grabOld', 'This browser is too old to read words out of a picture.')
          : t('post.grabFailed', 'The words could not be read out of that picture.'));
        return;
      }
      /* Nothing, rather than nonsense.
 
         A reader that invents text is worse than one that finds none: nobody
         can tell a bad read of a real sign from a photograph with nothing to
         read, so the only safe thing to do with the nonsense is retype the
         sign by hand — which is what the button was for. */
      const words = tidy(got.text);
      setGrabbed(wordsAtAll(words, got.sure) ? words : '');
    } finally {
      setReading(null);
    }
  };

  /**
   * The same reading, kept as boxes so a line can be tapped.
   *
   * The engine call is identical — one pass, on the device, for nothing.
   * What differs is which half of the answer is used: `grabText` takes the
   * text and this takes the boxes that came with it.
   */
  const findLines = async (lang: Readable): Promise<void> => {
    if (!picture) return;
    setSaid('');
    setPicked(null);
    if (!canRead()) {
      setSaid(t('post.grabOld', 'This browser is too old to read words out of a picture.'));
      return;
    }
    setReading(0);
    try {
      const got = await readWords(picture, lang, (part) => setReading(part));
      if (!got.ok) {
        setSaid(got.why === 'unsupported'
          ? t('post.grabOld', 'This browser is too old to read words out of a picture.')
          : t('post.grabFailed', 'The words could not be read out of that picture.'));
        return;
      }
      const lines = picksFrom(
        got.lines,
        picture.naturalWidth || picture.width,
        picture.naturalHeight || picture.height,
      );
      if (!lines.length) {
        setFound(null);
        setPicking(false);
        setSaid(t(
          'post.findNone',
          'No lines of writing could be made out in this picture. It reads printed text well and handwriting badly.',
        ));
        return;
      }
      setFound(lines);
      setPicking(true);
      /* The bench closes, the same way it does for cropping, for cutting a
         shape and for moving words — it sits over the middle of the
         picture, and a line she cannot reach is a line she cannot tap. */
      setBench(null);
      setSaid('');
    } finally {
      setReading(null);
    }
  };

  /**
   * Take the background out, leaving the person.
   *
   * The result replaces the picture as an `<img>` so that everything already
   * built — the crop, the zoom, the look, the export — goes on working
   * without knowing anything happened. A separate "cut-out layer" would have
   * meant every one of those learning about it.
   */
  /**
   * A canvas handed back as the picture.
   *
   * Three places needed this — the background remover, changing its edge, and
   * the eraser — and each had its own `toDataURL`. `check:postpaid` counts
   * every way the studio turns a canvas into a file, because every one of
   * them is a possible road off the device, and it had grown an exception
   * for each. Three exceptions with the same reason is a helper that has not
   * been written yet.
   *
   * Nothing here leaves the page: the data URL becomes an `<img>` which
   * becomes the picture, so the crop, the look and the paid export all go on
   * working without knowing anything happened.
   */
  const asPicture = (made: HTMLCanvasElement, then: (one: HTMLImageElement) => void, failed: () => void): void => {
    const img = new Image();
    img.onload = () => then(img);
    img.onerror = failed;
    img.src = made.toDataURL('image/png');
  };

  /**
   * The crop, applied: the picture becomes the part inside the box.
   *
   * ── Why it replaces the picture rather than being remembered ──────────
   *
   * A crop held as state alongside the picture would have to be applied by
   * every other thing in this room — the background remover, the eraser, the
   * reader, the export, the hand-over to the cutting room — and the one that
   * forgot would quietly work on the uncropped photograph. Six places to get
   * right instead of one.
   *
   * So the cut is taken once, here, and what comes out is an ordinary
   * picture. Everything downstream is already written to work on whatever
   * picture it is given, and the undo is `Start again` with the file, which
   * is honest about what it is rather than pretending to a history this room
   * does not keep.
   *
   * The pan and zoom go back to the middle with it. They were chosen against
   * the old edges of the photograph, and keeping them would move the framing
   * she had just set by exactly the amount she cropped.
   */
  const cutItDown = (): void => {
    const box = cropBox;
    if (!picture || !box) return;
    if (!cropped(box)) {
      setCropBox(null);
      return;
    }
    const of = { width: picture.naturalWidth || picture.width, height: picture.naturalHeight || picture.height };
    const cut = cutTo(box, of);
    const made = document.createElement('canvas');
    made.width = cropExact ? cropExact.w : cut.width;
    made.height = cropExact ? cropExact.h : cut.height;
    const ctx = made.getContext('2d');
    if (!ctx) return;
    /* A one-to-one copy of a rectangle of pixels — unless a size was typed,
       when it is drawn to exactly that size, smoothly. */
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(picture, cut.x, cut.y, cut.width, cut.height, 0, 0, made.width, made.height);
    before(t('post.stepCrop', 'cutting it down'));
    asPicture(
      made,
      (one) => {
        /* A post that was the photograph's own shape stays the photograph's
           own shape: cut to 4:5, the post becomes 4:5, rather than the new
           picture being cropped a second time by the old frame. */
        if (size.id.startsWith('own_')) setSize(ownSizeOf(one.naturalWidth || one.width, one.naturalHeight || one.height));
        setPicture(one);
        setCropBox(null);
        if (bench === 'frame') setBench(null);
        setCrop(MIDDLE);
        lastMask.current = null;
        setSaid(t('post.cutDownDone', 'Cut down. The rest of the photograph is gone — bring it in again to start over.'));
      },
      () => setSaid(t('post.cutDownFailed', 'That could not be cut down.')),
    );
  };

  /**
   * The picture cut along what she drew: keep what is inside, or lose it.
   *
   * Replaces the picture, for the same reason the crop does — a selection
   * held beside the picture would have to be applied by the export, the
   * reader, the hand-over and both other cutting tools, and the one that
   * forgot would work on the uncut photograph.
   *
   * The mask and the compositing are in `lib/lasso.ts`; what is here is the
   * sentence she reads when the shape is not one.
   */
  const cutRound = (keep: boolean): void => {
    const path = traced;
    if (!picture || !path) return;
    const why = whyNot(path);
    if (why !== null) {
      setSaid(why === 'all'
        ? t('post.drewAll', 'That is the whole picture. Draw round the part you want.')
        : t('post.drewLittle', 'Draw right round the thing, with your finger on the picture. A tap is not a shape.'));
      return;
    }
    const of = {
      width: picture.naturalWidth || picture.width,
      height: picture.naturalHeight || picture.height,
    };
    const made = cutAlong(picture, path, keep, of);
    if (!made) {
      setSaid(t('post.drewLittle', 'Draw right round the thing, with your finger on the picture. A tap is not a shape.'));
      return;
    }
    before(keep ? t('post.stepKeep', 'keeping what you drew round') : t('post.stepDrop', 'taking out what you drew round'));
    asPicture(
      made,
      (one) => {
        setPicture(one);
        setTraced(null);
        /* Not the mask from the background remover: that one belongs to a
           picture that no longer exists, and changing the edge after this
           would put the old cut back. */
        lastMask.current = null;
        nothingBehind();
        setSaid(keep
          ? t('post.drewKept', 'Kept what you drew round, with nothing behind it — the squares are how the picture shows you that. Save it as PNG to keep it see-through. Put a colour behind it below if you want one.')
          : t('post.drewGone', 'Taken out, and there is nothing behind it — the squares are how the picture shows you that. Save it as PNG to keep it see-through. Put a colour behind it below if you want one.'));
      },
      () => setSaid(t('post.drewFailed', 'That could not be cut out.')),
    );
  };

  /* ── Straightening, sharpening and enlarging ───────────────────────────
 
     The owner's list, 7 October 2026: *"Prent editor om nog canva funksies in te
     bring."* These three are the ones every editor has and this one did not,
     and all three run on the phone for nothing. `lib/postwork.ts` carries
     why the enlarger is not called an upscaler.
 
     One shape for all three, because they are the same shape: take the
     picture, make a new canvas from it, remember the old one so it can be
     put back, and say in her words what the step was. */
  const insteadOf = (
    what: string,
    made: HTMLCanvasElement | null,
    failed: string,
    done = '',
  ): void => {
    if (!made) {
      setSaid(failed);
      return;
    }
    before(what);
    asPicture(
      made,
      (one) => {
        setPicture(one);
        /* The mask belongs to the picture that was there a moment ago, and
           every one of these three makes a new one. Changing the cut edge
           afterwards would put the old cut on the new picture. */
        lastMask.current = null;
        setSaid(done);
        flash();
      },
      () => setSaid(failed),
    );
  };

  /**
   * A whole post, in one press, for the thing she is actually making.
   *
   * The owner's list, 7 October 2026: *"Video, etc templates."* The empty room is
   * the hardest screen in this app — a picture, a shape, three fonts and a
   * blank text box is twenty decisions before the first word. This is a
   * shape, a look and the words already in place; everything in it is hers
   * the moment she touches it. `lib/posttemplates.ts` has the six.
   *
   * The picture is left exactly as it is. Somebody who has brought one in and
   * spent two minutes cutting a person out of it does not want a template to
   * take it away, and somebody who has not can bring one in afterwards.
   */
  /* ── A photo template put on the post ──────────────────────────────
     Its shape, its colour, its frames, its words and its shapes — every one
     still hers to change. A photograph already in the room goes into the
     first frame rather than being thrown away, and the whole change is one
     step back. */
  const startDesign = (design: Design): void => {
    const url = artUrl(design.art);
    if (!url) { putDesign(design, null); return; }
    /* Her uploaded artwork first, so the whole template lands at once and is
       one step back. Asked for without credentials, so the post can still be
       saved — a picture from another address otherwise locks the canvas. */
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => putDesign(design, img);
    img.onerror = () => setSaid(t('post.designArtFail', 'That template\u2019s picture could not be fetched just now. Try it again in a moment.'));
    img.src = url;
  };
  const putDesign = (design: Design, art: HTMLImageElement | null): void => {
    before(t('post.stepDesign', 'putting a photo template on'), true);
    const shape = POST_SIZES.find((one) => one.id === design.size);
    if (shape) setSize(shape);
    setBack(design.back);
    if (design.back) setLastColour(design.back);
    const carried = picture;
    setCells(design.slots.map((slot, at) => ({
      id: freshId(),
      x: slot.x, y: slot.y, w: slot.w, h: slot.h,
      ...(slot.turn ? { turn: slot.turn } : {}),
      ...(slot.look ? { look: slot.look } : {}),
      image: at === 0 ? carried : null,
      crop: MIDDLE,
      z: -500 + at,
    })));
    if (art) {
      /* The artwork is the post's own picture now, under the frames. */
      setPicture(art);
      setCrop(MIDDLE);
      setWhole(null);
      setPhotoHidden(false);
      setPhotoAlpha(1);
      lastMask.current = null;
    } else if (carried && design.slots.length) {
      setPicture(null);
    }
    setWords(design.words.map((one) => ({
      id: freshId(),
      text: lang === 'af' ? one.af : one.en,
      face: FACES.find((face) => face.id === one.face)?.id ?? 'plain',
      spot: 'middle' as SpotId,
      ink: one.ink,
      at: { x: one.x, y: one.y },
      ...(one.size !== undefined ? { size: one.size } : {}),
      ...(one.glow ? { glow: one.glow as GlowId } : {}),
      ...(one.behind ? { behind: one.behind as Backdrop } : {}),
      ...(one.align ? { align: one.align } : {}),
      ...(one.letterGap !== undefined ? { letterGap: one.letterGap } : {}),
    })));
    setMarks(design.marks.map((one) => ({
      ...newMark(one.kind, freshId()),
      x: one.x, y: one.y, size: one.size, ink: one.ink,
      glow: (GLOWS.find((g) => g.id === one.glow)?.id ?? 'none'),
      ...(one.opacity !== undefined ? { opacity: one.opacity } : {}),
      ...(one.stretch !== undefined ? { stretch: one.stretch } : {}),
    })));
    setLook(PLAIN);
    setAllLook(PLAIN);
    setCellOn(null);
    setFraming(false);
    setWordOn(null);
    setMarkOn(null);
    setBench(null);
    setSaid(t('post.designDone', 'There it is. Tap a frame to put your photo in it, and tap any words to change them.'));
  };

  /** The post as it is now, as a template: frames kept empty, never her photos. */
  const designFromPost = (): unknown => ({
    en: keeping.en.trim(),
    af: keeping.af.trim() || keeping.en.trim(),
    category: keeping.category,
    size: size.id === 'story' || size.id === 'portrait' ? size.id : 'square',
    back,
    /* A post with a photo and no frames keeps the photo's place as one frame. */
    slots: cells.length
      ? cells.filter((one) => !one.hidden).map((one) => ({ x: one.x, y: one.y, w: one.w, h: one.h, turn: one.turn, look: one.look }))
      : picture && !(keepArt && designOwner) ? [{ x: 0, y: 0, w: 1, h: 1 }] : [],
    words: words.filter((one) => !one.hidden && one.text.trim()).map((one) => {
      const at = one.at ?? atOf(one.spot);
      return {
        en: one.text, af: one.text, face: one.face, x: at.x, y: at.y, size: one.size, ink: one.ink,
        glow: one.glow, behind: one.behind, align: one.align, letterGap: one.letterGap,
      };
    }),
    marks: marks.filter((one) => !one.hidden).map((one) => ({
      kind: one.kind, x: one.x, y: one.y, size: one.size, ink: one.ink, glow: one.glow, opacity: one.opacity, stretch: one.stretch,
    })),
  });

  const loadDesigns = async (): Promise<void> => {
    try {
      const token = await accessToken();
      const answer = await fetch('/api/designs', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const got = (await answer.json().catch(() => null)) as { designs?: unknown[]; owner?: boolean } | null;
      setDesignOwner(Boolean(got?.owner));
      setSavedDesigns((got?.designs ?? []).flatMap((raw) => {
        const clean = cleanDesign(raw);
        const id = (raw as { id?: unknown }).id;
        return clean && typeof id === 'string' ? [{ ...clean, id, saved: true }] : [];
      }));
    } catch {
      /* Offline or signed out: the starting set is still all here. */
    }
  };

  /* Placing a frame ends when no frame is picked. */
  useEffect(() => {
    if (!cellOn && framing) setFraming(false);
  }, [cellOn, framing]);
  /* The saved templates are read each time the Templates tool opens —
     through a ref, so the effect runs on the tool opening and nothing else. */
  const loadDesignsNow = useRef(loadDesigns);
  loadDesignsNow.current = loadDesigns;
  useEffect(() => {
    if (bench === 'starts') void loadDesignsNow.current();
  }, [bench]);

  /* ── A picture into the templates bucket, by the server's signed upload ── */
  const uploadArt = async (blob: Blob): Promise<string | null> => {
    if (blob.size > ART_MAX_BYTES) return null;
    const token = await accessToken();
    const opened = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ for: 'art', type: blob.type }),
    }).catch(() => null);
    const said = (await opened?.json().catch(() => null)) as { path?: string; token?: string; message?: string } | null;
    if (!opened?.ok || !said?.path || !said.token) {
      setDesignSaid(said?.message || t('post.designArtNoUpload', 'The picture could not be uploaded just now.'));
      return null;
    }
    const storage = getStorageClient();
    if (!storage) return null;
    const put = await storage.from(ART_BUCKET).uploadToSignedUrl(said.path, said.token, blob, { contentType: blob.type || 'image/webp' });
    return put.error ? null : said.path;
  };

  /** The post's own picture as it shows — placed, with its look — as artwork. */
  const artOfPicture = async (): Promise<Blob | null> => {
    if (!picture) return null;
    const k = Math.min(1, 1350 / Math.max(size.width, size.height));
    const artwork = document.createElement('canvas');
    artwork.width = Math.round(size.width * k);
    artwork.height = Math.round(size.height * k);
    const actx = artwork.getContext('2d');
    if (!actx) return null;
    actx.scale(k, k);
    if (back) { actx.fillStyle = back; actx.fillRect(0, 0, size.width, size.height); }
    const at = place(picture, size, crop);
    actx.filter = filterFor(look, 1);
    actx.drawImage(picture, at.left, at.top, at.width, at.height);
    actx.filter = 'none';
    paintWashes(actx, look, Math.max(0, at.left), Math.max(0, at.top), Math.min(at.width, size.width), Math.min(at.height, size.height));
    return new Promise((done) => artwork.toBlob(done, 'image/webp', 0.9));
  };

  /* ── Templates from her device: each picture its own template ──
     The owner, 16 October 2026: *"Ek wonder of ek templates ook van my device
     af kan oplaai?"* Each picture is made the right size, uploaded, and
     saved as a template of the group chosen above, named after its file.
     She can open any of them afterwards, add frames and words, and save it
     again. */
  const uploadTemplates = async (files: FileList | null): Promise<void> => {
    const list = Array.from(files ?? []).filter((one) => one.type.startsWith('image/'));
    if (!list.length) return;
    setDesignBusy(true);
    let kept = 0;
    try {
      for (const [at, file] of list.entries()) {
        setDesignSaid(t('post.designUploading', 'Uploading {n} of {m}\u2026').replace('{n}', String(at + 1)).replace('{m}', String(list.length)));
        const made = await fit(file, 1350);
        if (!made.ok) continue;
        const path = await uploadArt(made.blob);
        if (!path) continue;
        const name = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 60) || t('post.designs', 'Photo templates');
        const token = await accessToken();
        const saved = await fetch('/api/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            en: name, af: name, category: keeping.category, size: sizeForArt(made.width, made.height),
            back: '#111113', art: path, slots: [], words: [], marks: [],
          }),
        }).catch(() => null);
        if (saved?.ok) kept += 1;
      }
      setDesignSaid(kept === list.length
        ? t('post.designUploaded', '{n} uploaded. Open one, add frames and words if you like, and save it again.').replace('{n}', String(kept))
        : t('post.designUploadedSome', '{n} of {m} uploaded. The rest could not be read or sent.').replace('{n}', String(kept)).replace('{m}', String(list.length)));
      setDesignGroup('saved');
      void loadDesigns();
    } finally {
      setDesignBusy(false);
    }
  };

  const keepDesign = async (): Promise<void> => {
    setDesignSaid('');
    if (!keeping.en.trim()) { setDesignSaid(t('post.designNeedsName', 'Give it a name first.')); return; }
    let art: string | undefined;
    if (picture && keepArt) {
      setDesignBusy(true);
      const blob = await artOfPicture();
      const path = blob ? await uploadArt(blob) : null;
      setDesignBusy(false);
      if (!path) { setDesignSaid(t('post.designArtNoUpload', 'The picture could not be uploaded just now.')); return; }
      art = path;
    }
    const design = cleanDesign({ ...(designFromPost() as object), ...(art ? { art } : {}) });
    if (!design || (!design.art && !design.slots.length && !design.words.length && !design.marks.length)) {
      setDesignSaid(t('post.designEmpty', 'There is nothing on this post to keep as a template yet.'));
      return;
    }
    setDesignBusy(true);
    try {
      const token = await accessToken();
      const answer = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(design),
      });
      const got = (await answer.json().catch(() => null)) as { message?: string } | null;
      if (!answer.ok) { setDesignSaid(got?.message || t('post.designFail', 'That could not be saved just now.')); return; }
      setDesignSaid(t('post.designKept', 'Saved. Every member sees it under From FutureBox.'));
      setKeeping((was) => ({ ...was, en: '', af: '' }));
      setDesignGroup('saved');
      void loadDesigns();
    } finally {
      setDesignBusy(false);
    }
  };

  const dropDesign = async (id: string): Promise<void> => {
    const token = await accessToken();
    const answer = await fetch(`/api/designs?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null);
    if (answer?.ok) setSavedDesigns((was) => was.filter((one) => one.id !== id));
  };

  const startFrom = (one: Template): void => {
    /* It replaces the words, so the words it replaces can come back. */
    beforeLayers(t('post.stepTemplate', 'putting a template on'));
    const shape = POST_SIZES.find((size) => size.id === one.size);
    if (shape) setSize(shape);
    if (one.look) setLook((was) => ({ ...was, ...one.look }));
    setWords(one.words.map((word) => ({
      id: freshId(),
      text: t(word.says[0], word.says[1]),
      face: word.face,
      spot: word.spot,
      ink: word.ink,
      ...(word.glow ? { glow: word.glow } : {}),
      ...(word.letterGap !== undefined ? { letterGap: word.letterGap } : {}),
    })));
    setBench('text');
    setSaid(t('post.tplDone', 'There it is. Change any of it \u2014 the words, the shape, where they sit.'));
  };

  const handleSelectStudioTemplate = (tpl: StudioTemplateItem): void => {
    const shape = POST_SIZES.find((s) => s.width === tpl.width && s.height === tpl.height)
      ?? {
        id: tpl.id,
        name: tpl.ratioLabel || `${tpl.width}×${tpl.height}`,
        width: tpl.width,
        height: tpl.height,
        furniture: tpl.width === 1080 && tpl.height === 1920,
        what: { en: tpl.nameEn, af: tpl.nameAf },
      };
    const headlineText = tpl.sampleHeadline || (lang === 'af' ? tpl.nameAf : tpl.nameEn);
    const subText = tpl.sampleSubtext || (lang === 'af' ? tpl.subAf : tpl.subEn);

    /* A moving template lands as the frame its motion comes to rest on —
       drawn by `drawTemplateFrame`, the function the preview played — so
       the still is the thing she just watched, not a different drawing.
       Asked for with no headline in it (a space draws nothing), because the
       headline goes on top as words she can change; written into the still
       as well it would be there twice. */
    const moving = templateStill({ ...tpl, sampleHeadline: ' ' });
    /* A still template's own <text> lines that say the headline or the line
       under it are cut out of its SVG — see `withoutLettering`. Every
       language's wording is looked for, since the picture is drawn in one. */
    const stripped = moving
      ? null
      : withoutLettering(tpl.previewSvg, [
        [tpl.sampleHeadline, tpl.nameEn, tpl.nameAf],
        subText ? [tpl.sampleSubtext, tpl.subEn, tpl.subAf] : [],
      ], tpl.height);
    const still = moving ?? stripped?.url ?? tpl.previewSvg;
    const [headCut, subCut] = stripped?.cut ?? [null, null];
    const headGlow = GLOWS.find((one) => one.id === tpl.headGlow)?.id;

    const newWords: Words[] = [
      {
        id: freshId(),
        text: headlineText,
        /* The template's own dressing where it carries one (the music
           templates of 15 October 2026), else what the cut-out lettering
           looked like, else the room's poster face in white. */
        face: FACES.find((one) => one.id === tpl.headFace)?.id ?? faceFromFamily(headCut?.family, 'poster'),
        spot: 'top',
        ...(headCut?.y !== undefined ? { at: { x: 0.5, y: headCut.y } } : {}),
        ink: tpl.headInk ?? headCut?.ink ?? '#ffffff',
        ...(headGlow ? { glow: headGlow } : {}),
        behind: 'none',
      },
    ];
    if (subText) {
      newWords.push({
        id: freshId(),
        text: subText,
        face: FACES.find((one) => one.id === tpl.subFace)?.id ?? faceFromFamily(subCut?.family, 'plain'),
        spot: 'bottom',
        ...(subCut?.y !== undefined ? { at: { x: 0.5, y: subCut.y } } : {}),
        ink: tpl.subInk ?? subCut?.ink ?? '#93c5fd',
        behind: 'none',
      });
    }

    setShowTemplatesModal(false);
    const img = new Image();
    img.onload = () => {
      /* A step like any other, and one step for the whole press: Put back
         returns the photograph AND the words that were here before. */
      before(t('post.stepTemplate', 'putting a template on'), true);
      shapeChosen.current = true;
      setSize(shape);
      if (tpl.bgGradient?.includes('#')) {
        const match = tpl.bgGradient.match(/#[a-fA-F0-9]{6}/);
        if (match) {
          setBack(match[0]);
          setLastColour(match[0]);
        }
      }
      /* Not `whole`. That is what "Put it back" restores after a cut, and a
         template is not a cut of anything: pointing it at the template made
         the button put the template back on top of itself. The photograph
         that was here is in the history, one Put back away. */
      setWhole(null);
      setPicture(img);
      setCrop(MIDDLE);
      lastMask.current = null;
      setFound(null);
      setPicking(false);
      setPicked(null);
      setMagicSpot(null);
      setMagicStrokes([]);
      setWords(newWords);
      setWordOn(null);
      setBench('text');
      setSaid(t('stpl.applied', 'Template applied. You can edit any element, text or canvas size.'));
    };
    img.onerror = () => setSaid(t('stpl.failed', 'That template could not be opened. Nothing was changed \u2014 try another one.'));
    img.src = still;
  };

  const handleApplyCanvasSize = (w: number, h: number, label: string): void => {
    shapeChosen.current = true;
    const existing = POST_SIZES.find((s) => s.width === w && s.height === h);
    if (existing) {
      setSize(existing);
    } else {
      setSize({
        id: `custom_${w}x${h}`,
        name: label || `${w}×${h}`,
        width: w,
        height: h,
        furniture: w === 1080 && h === 1920,
        what: {
          en: `Custom size ${w}×${h}`,
          af: `Pasgemaakte grootte ${w}×${h}`,
        },
      });
    }
    /* ── And the photo lands in the new shape by the smart crop ──────────
       The owner, 25 October 2026: *"wanneer mens ook aan die begin die hele
       working space resize, dan moet die hele foto, outomaties en slim crop
       tot in die nuwe size en shape."* The same placement the Smart crop
       blocks make, done for her: the part of the photo worth keeping stands
       in the new frame, rather than whatever the middle happens to be. She
       can still drag it after. */
    if (picture) {
      const pictureAspect = picture.naturalWidth / Math.max(1, picture.naturalHeight);
      setCrop(interest ? bestCrop(interest, pictureAspect, w / Math.max(1, h)) : MIDDLE);
      setView({ scale: 1, x: 0, y: 0 });
    }
    setShowSizeModal(false);
    setSaid(t('size.applied', 'Canvas dimensions updated.'));
  };

  const turnIt = (by: number): void => {
    if (!picture) return;
    insteadOf(
      t('post.stepTurn', 'turning it'),
      turned(picture, nextQuarter(0, by)),
      t('post.turnFailed', 'That could not be turned.'),
    );
  };

  const flipIt = (): void => {
    if (!picture) return;
    insteadOf(
      t('post.stepFlip', 'flipping it'),
      turned(picture, 0, true),
      t('post.turnFailed', 'That could not be turned.'),
    );
  };

  const sharpenIt = (how: Sharpness): void => {
    if (!picture) return;
    insteadOf(
      t('post.stepSharpen', 'sharpening it'),
      sharpened(picture, how),
      t('post.sharpenFailed', 'That could not be sharpened.'),
      t('post.sharpenDone', 'Sharper. Press Put it back to see it as it was.'),
    );
  };

  const enlargeIt = (times: Times): void => {
    if (!picture) return;
    insteadOf(
      t('post.stepBigger', 'making it bigger'),
      bigger(picture, times),
      t('post.biggerFailed', 'That is already as big as a phone can hold.'),
    );
  };

  /**
   * The same cut, with a different edge.
   *
   * From the mask that is already in hand, so it is instant. Asking the model
   * again would be six megabytes of engine and a second of waiting to change
   * a number it has no opinion about.
   */
  const cutAgain = (how: EdgeId): void => {
    setEdge(how);
    const had = lastMask.current;
    /* Only while the picture on the glass is the cut-out this mask made
       (`made`), so the press is the same cut with another edge. After anything
       else (a new photograph, a template, a crop, a magic touch) the mask is
       somebody else's, and re-applying it put an OLD cut-out back over the
       new picture. Then the edge is only remembered for the next cut — and
       for the blur behind, which reads it too. */
    if (!had || !had.made || picture !== had.made) return;
    const wide = had.of.naturalWidth || had.of.width;
    const tall = had.of.naturalHeight || had.of.height;
    before(t('post.stepEdge', 'changing the cut edge'));
    asPicture(
      maskOnto(had.of, had.mask, wide, tall, edgeOf(how)),
      (one) => {
        lastMask.current = { ...had, made: one };
        setPicture(one);
      },
      () => setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.')),
    );
  };

  /* ── Painting over the thing to take out ───────────────────────────── */

  /** The picture drawn whole, with whatever has been painted over it in red. */
  const drawRub = (): void => {
    const to = rubCanvas.current;
    if (!to || !picture) return;
    const ctx = to.getContext('2d');
    if (!ctx) return;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    /* Shown at most 540 across, like the preview and for the same reason:
       what is on screen is never the deliverable. */
    const scale = Math.min(1, 540 / Math.max(wide, tall));
    to.width = Math.max(1, Math.round(wide * scale));
    to.height = Math.max(1, Math.round(tall * scale));
    ctx.drawImage(picture, 0, 0, to.width, to.height);

    const mask = smear.current;
    if (!mask) return;
    /* The mask is in PICTURE pixels and this canvas is a fraction of that, so
       it is drawn through a small canvas of its own at full picture size and
       scaled down in one go — a per-pixel loop at this size would be slow on
       every single stroke. */
    const paint = document.createElement('canvas');
    paint.width = wide;
    paint.height = tall;
    const over = paint.getContext('2d');
    if (!over) return;
    const sheet = over.createImageData(wide, tall);
    for (let i = 0; i < mask.length; i += 1) {
      if (!mask[i]) continue;
      const p = i * 4;
      sheet.data[p] = 255;
      sheet.data[p + 1] = 60;
      sheet.data[p + 2] = 60;
      sheet.data[p + 3] = 150;
    }
    over.putImageData(sheet, 0, 0);
    ctx.drawImage(paint, 0, 0, to.width, to.height);
  };

  /* Drawn when painting starts, when the picture changes under it and when
     the bench comes back with the canvas on it — and not on every render of
     the room: each draw walks every pixel of the photograph, and a slider
     moved anywhere else was paying for it. A stroke draws its own (`rubAt`). */
  useEffect(() => { if (rubbing) drawRub(); }, [rubbing, picture, bench]);

  const rubAt = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!picture) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    if (!smear.current || smear.current.length !== wide * tall) {
      smear.current = new Uint8Array(wide * tall);
    }
    /* Screen to picture in one step, because the whole photograph is on
       screen: no crop to invert and no zoom to undo. */
    const x = ((event.clientX - box.left) / box.width) * wide;
    const y = ((event.clientY - box.top) / box.height) * tall;
    /* The brush is a share of the picture rather than a number of pixels, so
       it covers the same amount of a photograph whatever size it came at. */
    const radius = Math.max(6, Math.max(wide, tall) * 0.025);
    /* FROM the last point, not just AT this one.
 
       One disc per pointer event leaves unmasked specks between the discs —
       twenty pixels apart at any ordinary speed — and those specks are
       pixels of the thing being removed. `erase` then grows them back over
       the hole, faithfully, and the feature appears to do nothing at all. */
    const was = lastRub.current;
    if (was) stroke(smear.current, wide, tall, was.x, was.y, x, y, radius);
    else stroke(smear.current, wide, tall, x, y, x, y, radius);
    lastRub.current = { x, y };
    setSmeared(shareOf(smear.current));
    drawRub();
  };

  const rubbingNow = useRef(false);

  /* ── The pixel eraser ─────────────────────────────────────────────────
     The owner, 17 October 2026, a screenshot of another editor's Pixel Eraser
     with Erase and Restore and a size: wipe the last bits of background off
     a cut-out by hand, or paint back what the cut took by mistake. It works
     on a copy of the photograph and becomes the photograph on Done. */
  const [pixelOn, setPixelOn] = useState(false);
  const [pixelMode, setPixelMode] = useState<'erase' | 'restore'>('erase');
  const [pixelSize, setPixelSize] = useState(0.035);
  const pixelSheet = useRef<HTMLCanvasElement | null>(null);
  const pixelFrom = useRef<HTMLImageElement | null>(null);
  const pixelView = useRef<HTMLCanvasElement | null>(null);
  const pixelLast = useRef<{ x: number; y: number } | null>(null);
  const pixelDown = useRef(false);
  const drawPixelView = (): void => {
    const view = pixelView.current;
    const sheet = pixelSheet.current;
    if (!view || !sheet) return;
    const wide = Math.min(900, sheet.width);
    view.width = wide;
    view.height = Math.max(1, Math.round(wide * (sheet.height / sheet.width)));
    const v = view.getContext('2d');
    if (!v) return;
    const step = Math.max(6, Math.round(view.width / 16));
    for (let y = 0; y < view.height; y += step) {
      for (let x = 0; x < view.width; x += step) {
        v.fillStyle = ((x / step) + (y / step)) % 2 === 0 ? CHECK_LIGHT : CHECK_DARK;
        v.fillRect(x, y, step, step);
      }
    }
    v.drawImage(sheet, 0, 0, view.width, view.height);
  };
  const startPixel = (): void => {
    if (!picture) return;
    const sheet = document.createElement('canvas');
    sheet.width = picture.naturalWidth || picture.width;
    sheet.height = picture.naturalHeight || picture.height;
    sheet.getContext('2d')?.drawImage(picture, 0, 0);
    pixelSheet.current = sheet;
    /* What Restore paints back: the photograph before its background was
       taken out, when that is the one this came from; otherwise this one. */
    pixelFrom.current = whole && (whole.naturalWidth || whole.width) === sheet.width
      && (whole.naturalHeight || whole.height) === sheet.height ? whole : picture;
    setPixelOn(true);
    window.requestAnimationFrame(drawPixelView);
  };
  const pixelAt = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const sheet = pixelSheet.current;
    if (!sheet) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const x = ((event.clientX - box.left) / box.width) * sheet.width;
    const y = ((event.clientY - box.top) / box.height) * sheet.height;
    const r = Math.max(2, pixelSize * Math.max(sheet.width, sheet.height));
    const from = pixelLast.current ?? { x, y };
    pixelLast.current = { x, y };
    const ctx = sheet.getContext('2d');
    if (!ctx) return;
    const line = (on: CanvasRenderingContext2D, dx = 0, dy = 0): void => {
      on.lineCap = 'round';
      on.lineWidth = r * 2;
      on.beginPath();
      on.moveTo(from.x - dx, from.y - dy);
      on.lineTo(x - dx + 0.01, y - dy);
      on.stroke();
    };
    if (pixelMode === 'erase') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000';
      line(ctx);
      ctx.restore();
    } else if (pixelFrom.current) {
      /* Only the box the stroke covers, so a big photograph stays quick. */
      const left = Math.max(0, Math.floor(Math.min(from.x, x) - r));
      const top = Math.max(0, Math.floor(Math.min(from.y, y) - r));
      const right = Math.min(sheet.width, Math.ceil(Math.max(from.x, x) + r));
      const bottom = Math.min(sheet.height, Math.ceil(Math.max(from.y, y) + r));
      if (right <= left || bottom <= top) return;
      const patch = document.createElement('canvas');
      patch.width = right - left;
      patch.height = bottom - top;
      const p = patch.getContext('2d');
      if (!p) return;
      p.strokeStyle = '#fff';
      line(p, left, top);
      p.globalCompositeOperation = 'source-in';
      p.drawImage(pixelFrom.current, left, top, patch.width, patch.height, 0, 0, patch.width, patch.height);
      ctx.drawImage(patch, left, top);
    }
    drawPixelView();
  };
  const finishPixel = (keep: boolean): void => {
    const sheet = pixelSheet.current;
    setPixelOn(false);
    pixelSheet.current = null;
    pixelLast.current = null;
    if (!keep || !sheet || !picture) return;
    const from = picture;
    before(t('post.stepPixel', 'erasing by hand'));
    asPicture(sheet, (made) => {
      setWhole(from);
      setPicture(made);
      nothingBehind();
      setSaid(t('post.pixelDone', 'Done. Press Put it back if you liked it better before.'));
    }, () => setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.')));
  };
  /** Where the thumb was a moment ago, so a stroke is a line and not a dot. */
  const lastRub = useRef<{ readonly x: number; readonly y: number } | null>(null);

  /* ── The three things she can do with a line she tapped ───────────

      The owner, 8 October 2026: *"dan kan die klient op die objekte of text
      click wat hulle graag wil grab, rondskuif, of delete."*

      Three actions, two primitives, and both primitives were already here:
      put words on the picture, and erase a patch of it. Grabbing is the
      first; taking out is the second; moving is both, which is why it is
      one press rather than two — a line left in the photograph AND added
      as text reads as the app having duplicated it. */

  /** Put the line on the picture as real, editable words, where it was. */
  /**
   * Every line it read, each as its own words.
   *
   * ── Why not one block ───────────────────────────────────────────────
   *
   * The owner, 8 October 2026: *"Find the words kry die woorde, maar van daar af
   * moet mens die woorde kan edit en rond skuif, of delete."*
   *
   * All three of those already worked — on the Words bench, where every line
   * has a box to retype it, a handle to drag it and a bin to throw it away.
   * What did not work is the thing in the middle of her sentence: **rond
   * skuif.** "Put it on the picture" joined every line with a newline and
   * added ONE block, so a poster whose heading and date were read as two
   * lines came back as one lump that could only move as a lump.
   *
   * One line, one words. Each lands where it was in the photograph, which is
   * what tapping a single line already did — this is that, for all of them
   * at once, rather than a different behaviour for the button beside it.
   */
  const grabEvery = (): void => {
    const lines = found ?? [];
    const made: Words[] = lines.length
      ? lines.map((one) => ({
        id: freshId(),
        text: one.text,
        face: FACES[0].id,
        spot: 'middle' as const,
        ink: '#ffffff',
        at: middleOf(one),
      }))
      /* No boxes, only text: a read that found words without finding where
         they were. Stacked rather than placed, because a made-up position is
         worse than an obvious default she can drag. */
      : (grabbed ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
        .reduce<Words[]>((all, line, n) => [...all, {
          id: freshId(),
          text: line,
          face: FACES[0].id,
          spot: 'top' as SpotId,
          ink: '#ffffff',
          /* One under the other, each clear of the lines already on the
             picture and of the ones just put down before it. */
          at: freeRow([...words, ...all], n === 0 ? atOf('top').y : (all[all.length - 1].at?.y ?? 0.17) + 0.12),
        }], []);
    if (!made.length) return;
    /* New layers go in front of everything already there. */
    setWords((was) => [...was, ...made.map((one, n) => ({ ...one, z: frontZ(marks, was) + n }))]);
    setGrabbed(null);
    setPicking(false);
    setFound(null);
    setPicked(null);
    /* And open the bench they landed on. The room is benches rather than one
       scroll, so leaving her on this one puts the words on the canvas and the
       box to fix what the reader got wrong behind a different tab. */
    setBench('text');
    setSaid(made.length === 1
      ? t('post.grabbedOne', 'On the picture. Change it, drag it or throw it away under Words.')
      : t('post.grabbedMany', '{n} lines on the picture, each one its own. Change, drag or throw away any of them under Words.')
        .replace('{n}', String(made.length)));
  };

  const grabLine = (one: Pick): void => {
    const at = middleOf(one);
    const id = freshId();
    setWords((was) => [...was, {
      id,
      z: frontZ(marks, was),
      text: one.text,
      face: FACES[0].id,
      spot: 'middle',
      ink: '#ffffff',
      /* Where they were, not where the room would have put them. Words that
         jump to the default spot when she grabs them are words she has to
         put back by hand, and she asked for them to be grabbable precisely
         so she would not have to. */
      at,
    }]);
    setPicking(false);
    setFound(null);
    setPicked(null);
    /* Chosen, so its ring shows. White words lifted exactly onto the same
       words in the photograph look like nothing happened — the owner, 16
       October 2026: *"huidiglik lyk dit of niks gegrab word nie"*. */
    setWordOn(id);
    setMarkOn(null);
    setBench('text');
    setSaid(t(
      'post.lineGrabbed',
      'Those words are on the picture now and you can change them — the face, the colour, the spacing, and dragging them where you want. The ones in the photograph are still underneath; take them out if you want only yours.',
    ));
  };

  /**
   * Take a plain background off — the cut that is not a person.
   *
   * The owner, 10 October 2026, of a logo this app had just made her: *"Well this
   * was done on our own app. How are we going to get transparency?"*
   *
   * An image model cannot make transparency. It hands back opaque pixels, and
   * asked for a transparent background it draws a PICTURE of a checkerboard —
   * hers arrived as a 35-pixel grid of grey and white squares. So the
   * checkerboard is what the answer looks like, and the transparency is made
   * here instead.
   *
   * On the phone and free. There is no model in this one: it learns what the
   * background is from the edge of the frame and takes that away, which is
   * why it works on a drawing and the other remover does not.
   */
  const flatGround = (afterNobody: boolean): boolean => {
    if (!picture) return false;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    const sheet = document.createElement('canvas');
    sheet.width = wide;
    sheet.height = tall;
    const ctx = sheet.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(picture, 0, 0);
    const was = ctx.getImageData(0, 0, wide, tall);
    const done = takeGround(
      { data: was.data, width: wide, height: tall },
      groundReach,
    );
    /* Run after the person model found nobody, a cut that takes nearly
       everything has found no subject either — a plain sheet, a sky. The
       picture is left exactly as it was, and she is told why. */
    if (afterNobody && (done.grounds.length === 0 || done.removed < 0.004 || done.removed > NEARLY_ALL)) {
      setSaid(t('post.cutNothingToKeep', 'No person found, and no plain background round anything either \u2014 so nothing was taken out. Use Cut out a shape and draw round what you want to keep.'));
      return false;
    }
    if (done.grounds.length === 0 || done.removed < 0.004) {
      setSaid(t(
        'post.groundNone',
        'There is no plain background in this picture to take away. This one looks at the edges of the frame and removes what it finds there — it works on a logo, a drawing, or something photographed on a plain sheet. For a person, use Remove the background above.',
      ));
      return false;
    }
    was.data.set(done.pixels.data);
    ctx.putImageData(was, 0, 0);
    before(t('post.stepGround', 'taking a plain background out'));
    asPicture(sheet, (made) => {
      setWhole(picture);
      setPicture(made);
      nothingBehind();
      setSaid(done.removed > NEARLY_ALL
        ? t(
          'post.groundMost',
          'That took nearly the whole picture away, which is right for a small mark on a big empty sheet and wrong if the subject has gone with it. Look at it, and press Put it back if it has.',
        )
        : t('post.cutDoneShort', 'Background removed. Save as PNG to keep it see-through.'));
    }, () => setSaid(t('post.groundFailed', 'That background could not be taken out.')));
    return true;
  };

  const takeFlatGround = (): void => { flatGround(false); };

  /**
   * Paint what is left after the background came off.
   *
   * One colour is a flat change; two or three are her pearlescent blend. The
   * alpha is never touched — see `lib/repaint.ts` — so this cannot undo the
   * cut she has just made, which is the expensive part of the picture.
   */
  const paintShape = (): void => {
    if (!picture) return;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    const sheet = document.createElement('canvas');
    sheet.width = wide;
    sheet.height = tall;
    const ctx = sheet.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(picture, 0, 0);
    const was = ctx.getImageData(0, 0, wide, tall);
    const done = repaint(
      { data: was.data, width: wide, height: tall },
      { colours: paintColours, angle: paintAngle, keepShading: paintShade },
    );
    if (!done) {
      /* Nothing to paint means nothing has been cut out yet. Said plainly,
         because the button looks exactly as able as it does on a picture
         that HAS been cut, and "nothing happened" is the worst answer. */
      setSaid(t(
        'post.paintNothing',
        'There is nothing cut out to paint. Take the background off first — this paints the shape that is left and leaves the see-through part alone.',
      ));
      return;
    }
    was.data.set(done.data);
    ctx.putImageData(was, 0, 0);
    before(t('post.stepPaint', 'changing its colour'));
    asPicture(sheet, (made) => {
      setWhole(picture);
      setPicture(made);
      setSaid(paintColours.length > 1
        ? t('post.paintBlended', 'Painted, with the colours blended across it. Turn the dial to run the blend another way, or press Put it back.')
        : t('post.paintDone', 'Painted. The see-through part is untouched — press Put it back if you would rather have it as it was.'));
    }, () => setSaid(t('post.paintFailed', 'That could not be painted.')));
  };

  /**
   * Ask the engine what is in the picture.
   *
   * Charged `CREDITS.grab` (fifteen, her price), once per press however
   * much is in the picture — `credits.ts` carries why. The boxes land in the same list the reader
   * fills, so they are drawn and tapped by the code that already existed.
   */
  const findThings = async (want: 'all' | 'subjects' = 'all'): Promise<Found[] | null> => {
    if (!picture || looking) return null;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    /* `looked` and not `sheet`, deliberately. The paid export's canvas is
       called `sheet`, and `check:postpaid` allows a maker through by the
       name in front of the dot — so naming `sheet.toDataURL` to let this
       request body through would have excused the paid road out with it.
       The shelf's canvas is named `shelved` for the same reason. */
    /* ── Shrunk to fit the route, the way the magic touch is ───────────
       The route takes four megabytes and a full-size PNG of a phone
       photograph is several times that, so every large picture came back
       "too large to send" — after the press, with nothing found. It goes
       up as a JPEG no longer than `THINGS_SIDE` and inside `BUDGET`, the
       quality walked down until it fits; the engine finds a guitar as well
       at 1600 across as at 4000. The boxes come back in the SENT size and
       are scaled up to this picture below, so lifting a thing out still
       cuts the full-size photograph. White under it, because a JPEG has no
       see-through and a cut-out on black reads as a black shape. */
    const looked = document.createElement('canvas');
    const shrink = Math.min(1, THINGS_SIDE / Math.max(wide, tall));
    looked.width = Math.max(1, Math.round(wide * shrink));
    looked.height = Math.max(1, Math.round(tall * shrink));
    const lctx = looked.getContext('2d');
    if (lctx) {
      lctx.fillStyle = '#ffffff';
      lctx.fillRect(0, 0, looked.width, looked.height);
      lctx.drawImage(picture, 0, 0, looked.width, looked.height);
    }
    let sent = '';
    for (const quality of LADDER) {
      /* Not a road out: this string is the request body, sent to our own
         route and never handed to the person. `check:postpaid` counts
         every `toDataURL` in this file because each one COULD be a way to
         take a picture off the device without paying, and this one is
         named in its allowlist for that reason. */
      const url = looked.toDataURL('image/jpeg', quality);
      sent = url.slice(url.indexOf(',') + 1);
      if (sent.length <= BUDGET) break;
    }
    if (!sent || sent.length > BUDGET) {
      setSaid(t('post.thingsTooBig', 'That picture is too big to send. Crop it or bring in a smaller one. Nothing was charged.'));
      return null;
    }
    const upX = wide / looked.width;
    const upY = tall / looked.height;
    setLooking(true);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/picture/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          /* Who is spending. A redirect carries no cookie session in this
             app — there is none — so the token IS how the route learns who
             to charge, and without it the press is refused as signed out.
             `check:paidcall` and `check:signed` both hold it. */
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          picture: sent,
          mime: 'image/jpeg',
          /* The size of what was SENT: every box comes back in its terms. */
          wide: looked.width,
          tall: looked.height,
          want,
        }),
      });
      const body = (await answer.json().catch(() => ({}))) as {
        found?: Found[]; message?: string;
      };
      if (!answer.ok) {
        setSaid(body.message ?? t('post.thingsNo', 'The things in this picture could not be found.'));
        return null;
      }
      const rows = body.found ?? [];
      if (!rows.length) {
        setSaid(t('post.thingsNone', 'Nothing in this picture came back as a separate thing. A photograph of one subject on a plain ground usually does better with Take a plain background off.'));
        return null;
      }
      /* For a cut-out of the main subjects: their shapes, in this picture's
         own pixels, handed back rather than offered to tap. */
      if (want === 'subjects') {
        return rows.map((sentRow) => ({
          ...sentRow,
          box: {
            left: Math.max(0, Math.min(wide, Math.round(sentRow.box.left * upX))),
            top: Math.max(0, Math.min(tall, Math.round(sentRow.box.top * upY))),
            right: Math.max(0, Math.min(wide, Math.round(sentRow.box.right * upX))),
            bottom: Math.max(0, Math.min(tall, Math.round(sentRow.box.bottom * upY))),
          },
        }));
      }
      /* Shares, because that is the space `pickAt` and the highlights work
         in — and a box handed over in pixels would land in the corner. */
      const picks: Pick[] = rows.map((sentRow) => {
        const id = freshId();
        /* Into this picture's own pixels, whole numbers and inside it —
           `liftWith` walks the box over the full-size photograph. */
        const one: Found = {
          ...sentRow,
          box: {
            left: Math.max(0, Math.min(wide, Math.round(sentRow.box.left * upX))),
            top: Math.max(0, Math.min(tall, Math.round(sentRow.box.top * upY))),
            right: Math.max(0, Math.min(wide, Math.round(sentRow.box.right * upX))),
            bottom: Math.max(0, Math.min(tall, Math.round(sentRow.box.bottom * upY))),
          },
        };
        /* Writing is taken as words (Make it text, Take it out); only a thing
           is cut by its shape. */
        if (one.kind === 'object') things.current.set(id, one);
        return {
          id,
          text: one.label,
          sure: 100,
          x: one.box.left / wide,
          y: one.box.top / tall,
          w: (one.box.right - one.box.left) / wide,
          h: (one.box.bottom - one.box.top) / tall,
        };
      });
      /* These instead of anything read on the phone before: the engine's
         reading of the writing is the one worth tapping. */
      setFound(picks);
      setPicked(null);
      setPicking(true);
      setBench(null);
      setSaid(t('post.thingsFoundAll', 'Tap one: cut it out, move it, or say what it should become. {n} found.')
        .replace('{n}', String(picks.length)));
    } catch {
      setSaid(t('post.thingsNo', 'The things in this picture could not be found.'));
    } finally {
      setLooking(false);
    }
    return null;
  };

  /**
   * Lift a found thing out of the photograph, with its mask as its edge.
   *
   * What comes back is the thing on nothing — so it can be moved, painted
   * with the colours above, or saved as a PNG. `Put it back` restores the
   * photograph, exactly as it does after the background remover.
   */
  const liftThing = (one: Pick, onCut?: (piece: HTMLCanvasElement) => void): void => {
    const thing = things.current.get(one.id);
    if (!thing || !picture) return;
    if (!thing.mask) {
      /* A box with no mask is a box. Cutting a rectangle out and calling it
         the thing would look like the engine being bad at edges, so it is
         said instead. */
      setSaid(t('post.thingNoMask', 'The engine found that one but did not send its shape, so it cannot be lifted out cleanly. Try Find objects and text again, or use Cut out a shape and draw round it.'));
      return;
    }
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    const whole = document.createElement('canvas');
    whole.width = wide;
    whole.height = tall;
    const ctx = whole.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(picture, 0, 0);
    const pixels = ctx.getImageData(0, 0, wide, tall);

    const maskImg = new Image();
    maskImg.onload = () => {
      const maskSheet = document.createElement('canvas');
      maskSheet.width = maskImg.naturalWidth || 1;
      maskSheet.height = maskImg.naturalHeight || 1;
      const mctx = maskSheet.getContext('2d', { willReadFrequently: true });
      if (!mctx) return;
      mctx.drawImage(maskImg, 0, 0);
      const mask = mctx.getImageData(0, 0, maskSheet.width, maskSheet.height);
      const cut = liftWith(
        { data: pixels.data, width: wide, height: tall },
        thing.box,
        { data: mask.data, width: maskSheet.width, height: maskSheet.height },
      );
      if (!cut) {
        setSaid(t('post.thingFailed', 'That one could not be lifted out.'));
        return;
      }
      const out = document.createElement('canvas');
      out.width = cut.width;
      out.height = cut.height;
      const octx = out.getContext('2d');
      if (!octx) return;
      const made = octx.createImageData(cut.width, cut.height);
      made.data.set(cut.data);
      octx.putImageData(made, 0, 0);
      if (onCut) { onCut(out); return; }
      before(t('post.stepThing', 'lifting a thing out'));
      asPicture(out, (img) => {
        setWhole(picture);
        setPicture(img);
        setPicking(false);
        setPicked(null);
        setFound(null);
        nothingBehind();
        setSaid(t('post.thingLifted', 'Lifted out on its own, on nothing \u2014 it is the whole picture now. Paint it with Its colour, or save it as a PNG. Press Put it back for the photograph.'));
      }, () => setSaid(t('post.thingFailed', 'That one could not be lifted out.')));
    };
    maskImg.onerror = () => setSaid(t('post.thingFailed', 'That one could not be lifted out.'));
    maskImg.src = `data:image/png;base64,${thing.mask}`;
  };

  /**
   * Grab it: the thing or the line itself — its own pixels — lifted out of
   * the photograph onto a layer of its own, exactly where it was and ready to
   * drag, and the place it came from filled in from what is around it.
   *
   * The owner, 17 October 2026: *"Die woord copy hy eerder as grab."* Make it text
   * put new words on top and left the old ones in the photo, which reads as a
   * copy. This is the grab: the same letters, the same look, moved. A thing is
   * cut by its own shape; a line by its box. Where the hole is too big to fill
   * from its edges, the photo keeps it and says so — Magic's Take it away can
   * fill a big one, and says its price first.
   */
  const moveThing = (one: Pick): void => {
    if (!picture) return;
    const from = picture;
    const wide = from.naturalWidth || from.width;
    const tall = from.naturalHeight || from.height;
    const placed = (piece: HTMLCanvasElement, where: Pick = one): void => {
      /* The hole, filled from its edges — the same eraser as Take it out. */
      const rubbed = document.createElement('canvas');
      rubbed.width = wide;
      rubbed.height = tall;
      const rctx = rubbed.getContext('2d', { willReadFrequently: true });
      let filled = false;
      if (rctx) {
        rctx.drawImage(from, 0, 0);
        const done = erase(rctx.getImageData(0, 0, wide, tall), maskOfLine(one, wide, tall));
        if (done.ok) { rctx.putImageData(done.pixels, 0, 0); filled = true; }
      }
      asPicture(piece, (img) => {
        const lay = (): void => {
          const at = place(from, size, crop);
          const box = ontoFrame(where, at);
          const id = freshId();
          setCells((was) => [...was, {
            id,
            x: box.left / size.width,
            y: box.top / size.height,
            w: box.width / size.width,
            h: box.height / size.height,
            image: img,
            crop: MIDDLE,
            z: frontZ(marks, words, was),
          }]);
          setCellOn(id);
          setFraming(true);
          setPicking(false);
          setPicked(null);
          setFound(null);
          setBench(null);
          setSaid(filled
            ? t('post.thingGrabbed', 'Grabbed \u2014 it is on a layer of its own now, so drag it where you want it. Where it was has been filled in.')
            : t('post.thingMoved', 'It is on a layer of its own now \u2014 drag it where you want it. The original is still in the photo underneath; Magic can take it away.'));
        };
        before(t('post.stepMoveThing', 'moving a thing'), true);
        if (!filled) { lay(); return; }
        asPicture(rubbed, (made) => {
          setWhole(from);
          setPicture(made);
          lay();
        }, () => lay());
      }, () => setSaid(t('post.thingFailed', 'That one could not be lifted out.')));
    };
    if (things.current.has(one.id)) {
      liftThing(one, placed);
      return;
    }
    /* A line of writing: its box, a little wider so no letter is cut. */
    const left = Math.max(0, Math.floor((one.x - one.w * 0.03) * wide));
    const top = Math.max(0, Math.floor((one.y - one.h * 0.12) * tall));
    const right = Math.min(wide, Math.ceil((one.x + one.w * 1.03) * wide));
    const bottom = Math.min(tall, Math.ceil((one.y + one.h * 1.12) * tall));
    const piece = cropOf(from, { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) });
    placed(piece, { ...one, x: left / wide, y: top / tall, w: (right - left) / wide, h: (bottom - top) / tall });
  };

  /** Erase the line out of the photograph. */
  const dropLine = (one: Pick): boolean => {
    if (!picture) return false;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    const rubbed = document.createElement('canvas');
    rubbed.width = wide;
    rubbed.height = tall;
    const ctx = rubbed.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(picture, 0, 0);
    const done = erase(ctx.getImageData(0, 0, wide, tall), maskOfLine(one, wide, tall));
    if (!done.ok) {
      /* The same refusal the painted eraser gives, in the same words: this
         grows the edges of a gap inwards and cannot invent what was behind
         something large. A line of writing across a whole poster is exactly
         that case. */
      setSaid(done.why === 'toomuch'
        ? t('post.lineTooMuch', 'That line covers too much of the picture to take out this way. It fills the gap with what is around it, which works for something small.')
        : t('post.lineNothing', 'There is nothing to take out there.'));
      return false;
    }
    ctx.putImageData(done.pixels, 0, 0);
    before(t('post.stepLine', 'taking a line of words out'));
    asPicture(rubbed, (made) => {
      setWhole(picture);
      setPicture(made);
      /* The boxes belonged to a picture that no longer exists. Keeping them
         would offer her a tap on writing that has been erased — the same
         reason the shape cut drops the background remover's mask. */
      /* The boxes belonged to a picture that no longer exists. Keeping them
         would offer her a tap on writing that has been erased — the same
         reason the shape cut drops the background remover's mask.

         Picking STAYS ON, though, and that is deliberate twice over.
         Somebody taking one line off a poster usually wants the next one,
         and making her press Find again between them is a room getting in
         the way. It also keeps the photograph drawn whole rather than
         snapping back to the crop, which is the difference between seeing
         what the erase did and seeing the picture jump. */
      setFound(null);
      setPicked(null);
      setSaid(t(
        'post.lineGone',
        'Taken out. Press “Find the words” again to pick another one, or Done when you have finished.',
      ));
    }, () => setSaid(t('post.lineFailed', 'That could not be taken out.')));
    return true;
  };

  /**
   * Make a picture from words, or change the one that is here.
   *
   * ── One control, two jobs, and why it is not two ──────────────────────
   *
   * The owner, 9 October 2026: *"Ek sien nie veranderinge met ons nuwe tools in
   * photo en video editor nie... daar moet seker ook 'n AI in wees en daar
   * moet generate an image ook wees, asook die funksie waar jy 'n image vir
   * die generator gee wat hy ook kan verander."*
   *
   * Two faults in one sentence, both mine. The first version only did the
   * CHANGING half, and it was drawn only `{picture && …}` — so somebody
   * opening the room with nothing in it saw no new tool at all, which is
   * exactly what she reported. And it sat below the eraser, two screens
   * down, which is the other reason it was invisible.
   *
   * So it is one panel at the TOP of the bench, beside "Bring a picture in",
   * because "make one instead" belongs next to "bring one in" and nowhere
   * else. With a picture it changes that picture; without one it draws a new
   * one. The same engine, the same route, the same price — and one box to
   * type into either way, because "generate" and "edit" being two different
   * screens is a distinction that matters to the engine and not to a person.
   *
   * ── The shape is only asked for when there is nothing to inherit ──────
   *
   * Changing a photograph keeps the photograph's shape: forcing a ratio onto
   * somebody's own picture crops it. Drawing from nothing has no shape to
   * keep, so that is the one case where it has to be asked.
   *
   * ── Still not album art ───────────────────────────────────────────────
   *
   * A cover is made in the booth or bought from an artist. That is a
   * decision about paying artists and this does not change it.
   *
   * ── It runs on a press, and only on a press ───────────────────────────
   *
   * No effect watches these words. `check:onlyonpress` is the rule, and a
   * redraw fired by a `useEffect` on a text field would charge a credit for
   * every letter typed.
   */
  /**
   * The magic touch: one part of the photograph to the AI, laid back in.
   *
   * A tapped spot, or a thing the Grab bench found. Only that part (and a
   * little round it, so it fits) is sent; what comes back is laid into the
   * same place with a soft edge. Same route and price as asking for the
   * whole picture to change.
   */
  const magicPart = async (how: 'better' | 'change' | 'fill' | 'style', thing?: Pick, styleId = ''): Promise<void> => {
    if (!picture || magicBusy) return;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    let rect: Rect;
    let shape: 'box' | Brush;
    /* Nothing painted and no thing picked: the whole photograph. The owner, 17
       October 2026: *"change it moet 'n object kan prompt, of die tema van
       die hele foto verander (dan moet daar ook 'n ruler wees vir before en
       after)"*. Taking a part away needs a part, so that one still asks. */
    const whole = !thing && magicStrokes.length === 0 && how !== 'fill';
    if (whole) {
      rect = { left: 0, top: 0, width: wide, height: tall };
      shape = 'box';
    } else if (thing) {
      rect = padded({
        left: Math.round(thing.x * wide),
        top: Math.round(thing.y * tall),
        width: Math.max(1, Math.round(thing.w * wide)),
        height: Math.max(1, Math.round(thing.h * tall)),
      }, wide, tall, 0.25);
      shape = 'box';
    } else {
      const brush: Brush = { strokes: magicStrokes, r: magicSize };
      const reach = brushRect(brush, wide, tall);
      if (!reach) { setSaid(t('post.magicPaintFirst', 'Paint over the part of the photo first.')); return; }
      rect = padded(reach, wide, tall, 0.2);
      shape = brush;
    }
    const style = how === 'style' ? styleById(styleId) : undefined;
    if (how === 'style' && !style) return;
    const into = magicInto.trim();
    if (how === 'change' && !into) {
      setSaid(t('post.magicSayWhat', 'Say what it should become first.'));
      return;
    }
    const words = style
      ? styleAsk(style, whole)
      : whole
      ? (how === 'better' ? MAGIC_ASKS.wholeBetter : MAGIC_ASKS.theme(into))
      : how === 'better'
        ? MAGIC_ASKS.better
        : how === 'fill'
          ? MAGIC_ASKS.fill
          : thing ? MAGIC_ASKS.replace(thing.text || 'thing', into) : MAGIC_ASKS.change(into);
    const from = packLed(cropOf(picture, rect), []);
    if (!from.length) {
      setSaid(t('post.askTooBig', 'Those pictures are too big to send together. Take one out, or use a smaller one.'));
      return;
    }
    setMagicBusy(style ? `style:${style.id}` : how);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ words, from }),
      });
      if (!answer.ok) {
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setSaid(why.message ?? `${t('post.askFailed', 'That could not be made.')} (${answer.status})`);
        return;
      }
      const blob = await answer.blob();
      const came = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(came);
        /* The whole photograph is replaced, at its own size; a part is laid
           back into its place with a soft edge. */
        let out: HTMLCanvasElement;
        if (whole) {
          out = document.createElement('canvas');
          out.width = wide;
          out.height = tall;
          out.getContext('2d')?.drawImage(img, 0, 0, wide, tall);
        } else {
          out = laidIn(picture, wide, tall, img, rect, shape);
        }
        before(t('post.stepMagic', 'a magic touch'));
        asPicture(out, (made) => {
          setWhole(picture);
          setPicture(made);
          if (whole) {
            setCompareFrom({ of: made, from: picture });
            setToneAll(false);
            setCompare(0.5);
          }
          setMagicSpot(null);
          setMagicStrokes([]);
          if (thing) { setFound(null); setPicked(null); setPicking(false); }
          setSaid(t('post.magicDone', 'Done. Only that part changed \u2014 press Put it back if you liked it better before.'));
        }, () => setSaid(t('post.askUnreadable', 'What came back could not be read as a picture.')));
      };
      img.onerror = () => {
        URL.revokeObjectURL(came);
        setSaid(t('post.askUnreadable', 'What came back could not be read as a picture.'));
      };
      img.src = came;
    } catch {
      setSaid(t('post.askOffline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setMagicBusy('');
    }
  };

  /** What the AI options say and do, for a spot or a found thing. */
  const magicButtons = (thing?: Pick): React.ReactNode => (
    <div className="space-y-2" data-postmagicasks>
      <span className="relative block">
        <input
          type="text"
          value={magicInto}
          onChange={(event) => setMagicInto(event.target.value.slice(0, 300))}
          data-postmagicinto
          placeholder={thing
            ? t('post.magicIntoThing', 'Change it into… a red sports car')
            : t('post.magicInto', 'A sunflower… or a theme for the whole photo')}
          className="w-full rounded-lg border border-zinc-700 bg-black/40 py-2 pl-3 pr-11 text-[13px] text-zinc-100 placeholder:text-zinc-500"
        />
        <SpeakButton onHeard={(said) => setMagicInto((was) => withSaid(was, said))} className="absolute right-1 top-1/2 -translate-y-1/2" />
      </span>
      <div className={RY3}>
        <button type="button" data-postmagicbetter disabled={Boolean(magicBusy)} onClick={() => void magicPart('better', thing)} className={LEEG}>
          {magicBusy === 'better' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t('post.magicBetter', 'Make it better')}
        </button>
        <button type="button" data-postmagicchange disabled={Boolean(magicBusy) || !magicInto.trim()} onClick={() => void magicPart('change', thing)} className={LEEG}>
          {magicBusy === 'change' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {t('post.magicChange', 'Change it')}
        </button>
        <button type="button" data-postmagicfill disabled={Boolean(magicBusy)} onClick={() => void magicPart('fill', thing)} className={LEEG}>
          {magicBusy === 'fill' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
          {t('post.magicFill', 'Take it away')}
        </button>
      </div>
      <p className="text-[11px]" style={{ color: INK_DIM }}>
        {t('post.magicPrice', '{n} credits a press. Only this part is sent and only this part changes.').replace('{n}', String(CREDITS.repaint))}
      </p>
    </div>
  );

  const askForPicture = async (): Promise<void> => {
    const words = askWords.trim();
    if (!words || redrawing) return;
    const changing = Boolean(picture);
    setRedrawing(true);
    setSaid('');
    try {
      /* ── The pictures going up ───────────────────────────────────────

         The one on the bench leads, and the ones brought in to copy from
         follow. `packLed` does the shrinking and the arithmetic: the lead
         keeps most of the budget because its detail comes back in the
         answer, and a reference only has to carry "this person" or "this
         logo". One picture and no references is still sent whole, as PNG,
         unshrunk — the see-through background from the remover below would
         fill with black in a JPEG, and a photograph going up to be changed
         must not arrive already damaged.

         `packLed`, not a canvas here. The paid export's canvas is `sheet`
         and `check:postpaid` keys its list of sanctioned ways-to-make-a-file
         on the variable name, so a canvas written inline in this room is a
         thing that has to be excused every time. One library doing it is
         one place to look. */
      const from = packLed(picture ?? null, refs.map((one) => one.image));
      if ((picture || refs.length) && from.length === 0) {
        setSaid(t('post.askTooBig',
          'Those pictures are too big to send together. Take one out, or use a smaller one.'));
        return;
      }
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          words,
          ...(from.length ? { from } : {}),
          /* The shape goes whenever there is no picture on the bench to
             inherit one from — references included. A reference is being
             looked at, not resized, so it hands down a style and not a
             frame; left to itself the engine picks the first reference's
             shape, which is how a square poster came back wide.

             With a picture on the bench the ratio is left off entirely:
             forcing one onto somebody's own photograph crops it. */
          ...(picture ? {} : { aspect: askShape }),
        }),
      });
      if (!answer.ok) {
        /* Their sentence where there is one. The engine says things worth
           reading — that it will not draw a named person, that it could not
           tell what to change — and replacing those with "that did not
           work" is how somebody presses the same button four times. */
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setSaid(why.message
          ?? `${t('post.askFailed', 'That could not be made.')} (${answer.status})`);
        return;
      }
      const blob = await answer.blob();
      const came = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        before(changing
          ? t('post.stepAsk', 'changing the picture')
          : t('post.stepMake', 'making a picture'));
        /* `whole` is what "Put it back" restores. Drawing from nothing has
           nothing to go back TO, so it is cleared rather than left pointing
           at whatever was there before this room was opened. */
        setWhole(changing ? picture : null);
        setPicture(img);
        setAskWords('');
        setSaid(changing
          ? t('post.askDone', 'Changed. Press “Put it back” if you would rather have the one you had.')
          : t('post.madeDone', 'Made. Say what to change about it and press again, or carry on with the tools below.'));
        /* Revoked after the load, never before: the picture is decoded from
           this url and letting it go early is a blank image on a slow
           phone. */
        URL.revokeObjectURL(came);
      };
      img.onerror = () => {
        URL.revokeObjectURL(came);
        setSaid(t('post.askUnreadable', 'What came back could not be read as a picture.'));
      };
      img.src = came;
    } catch {
      setSaid(t('post.askOffline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setRedrawing(false);
    }
  };

  /** Take out what has been painted over. */
  const rubOut = (): void => {
    const mask = smear.current;
    if (!picture || !mask) return;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    /* `rubbed`, not `sheet`. The export's canvas is called `sheet` and that
       one IS the road out of this app; two canvases with one name, one of
       which leaves, is a thing the next reader has to guess at. */
    const rubbed = document.createElement('canvas');
    rubbed.width = wide;
    rubbed.height = tall;
    const ctx = rubbed.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(picture, 0, 0);
    const pixels = ctx.getImageData(0, 0, wide, tall);
    const done = erase(pixels, mask);
    if (!done.ok) {
      setSaid(done.why === 'toomuch'
        ? t('post.rubTooMuch', 'That is too much of the picture to take out this way. This grows the edges of a gap inwards, which works for something small.')
        : t('post.rubNothing', 'Paint over the thing you want gone first.'));
      return;
    }
    ctx.putImageData(done.pixels, 0, 0);
    before(t('post.stepRub', 'rubbing something out'));
    asPicture(rubbed, (one) => {
      setWhole(picture);
      setPicture(one);
      smear.current = null;
      setSmeared(0);
      setRubbing(false);
      setSaid(t('post.rubDone', 'Taken out. If it smeared, the thing behind it had a pattern \u2014 put it back and try a smaller patch.'));
    }, () => setSaid(t('post.rubFailed', 'That could not be taken out.')));
  };

  /**
   * A cut has made the picture see-through, so take the colour off behind it.
   *
   * ── The fault this exists for ───────────────────────────────
   *
   * The owner, 8 October 2026: *"Take the background out gee die ilusie dat dit
   * transparent is, maar dit is nog nie."*
   *
   * She was exactly right, and the reason was one default. `back` opens at
   * `#111113` — a near-black. So the whole sequence was: she presses Remove
   * the background, the person is cut out, and the room fills the space
   * behind them with a colour that on a dark screen reads as nothing at all.
   * The picture LOOKS see-through. The file is a near-black rectangle with a
   * person on it.
   *
   * And the room's own answer to that was a sentence under the button asking
   * her to press "Nothing behind it" as well — a second step she had to
   * notice, in order to undo a default that was lying to her. The shape cut
   * was worse: it said *"leave it see-through"* while the colour was still
   * on.
   *
   * ── Why clearing it, rather than wording it better ──────────────
   *
   * Because taking the background out should take the background out. That
   * is what the button says. A colour behind a cut-out is a real thing to
   * want — it is how a profile picture or a poster is made — and it is still
   * one press away on the same bench; what it may not be is what happens by
   * itself to somebody who asked for the opposite.
   *
   * The preview then shows the checkerboard, which has been there all along
   * and is the honest picture of nothing behind it.
   */
  /**
   * Make it transparent: take the photograph's own background out, under a
   * glow for three seconds, then nothing behind it at all.
   *
   * The owner, 17 October 2026, with her photograph filling the frame: *"Niks
   * gebeur wanneer ek op transparent kliek nie."* The button only took off
   * the colour BEHIND the photograph, and hers covered all of it. What she
   * means by transparent is the background IN the photograph, so that is
   * what it does now; on a picture already cut, or with no photograph, it is
   * the colour behind that goes.
   */
  const makeTransparent = async (): Promise<void> => {
    if (!picture || lastMask.current?.made === picture) {
      nothingBehind();
      flash();
      return;
    }
    setWorking('long');
    try {
      /* Nothing in the photograph could be cut: the colour behind it still
         goes, which is what the button promised at the least. */
      if (!(await cutBackground(Date.now() + 3000))) nothingBehind();
    } finally {
      setWorking(null);
    }
  };

  /**
   * Every main subject cut out cleanly — all of them, not only a person.
   *
   * The owner, 17 October 2026, a woman beside an owl, where the phone's person
   * model kept the woman and lost the owl: *"Die twee hoof objekte op die
   * prent moes netjies uitgehaal word."* The engine is asked for the main
   * subjects and their shapes (one paid look, `CREDITS.grab`); the person
   * model, which is free and finer at hair, adds its edge where it has one.
   * Both are laid together into one mask, and the photograph keeps only that.
   */
  const cutSubjects = async (): Promise<void> => {
    if (!picture || looking || working === 'long') return;
    const from = picture;
    const wide = from.naturalWidth || from.width;
    const tall = from.naturalHeight || from.height;
    const until = Date.now() + 3000;
    setWorking('long');
    try {
      const [rows, person] = await Promise.all([
        findThings('subjects'),
        cutOut(from, undefined, edgeOf(edge)).catch(() => null),
      ]);
      const shapes = (rows ?? []).filter((one) => one.mask);
      if (!shapes.length && !(person && person.ok)) return;
      const union = document.createElement('canvas');
      union.width = wide;
      union.height = tall;
      const uctx = union.getContext('2d');
      if (!uctx) return;
      for (const one of shapes) {
        const img = await new Promise<HTMLImageElement | null>((done) => {
          const shape = new Image();
          shape.onload = () => done(shape);
          shape.onerror = () => done(null);
          shape.src = `data:image/png;base64,${one.mask}`;
        });
        if (img) uctx.drawImage(maskFromBox(img, one.box, wide, tall), 0, 0);
      }
      if (person && person.ok) uctx.drawImage(maskFromGrey(person.mask, wide, tall), 0, 0);
      const cut = document.createElement('canvas');
      cut.width = wide;
      cut.height = tall;
      const cctx = cut.getContext('2d');
      if (!cctx) return;
      cctx.drawImage(from, 0, 0, wide, tall);
      cctx.globalCompositeOperation = 'destination-in';
      cctx.drawImage(union, 0, 0);
      cctx.globalCompositeOperation = 'source-over';
      const left = until - Date.now();
      if (left > 0) await new Promise((done) => { window.setTimeout(done, left); });
      before(t('post.stepSubjects', 'cutting out the main subjects'));
      await new Promise<void>((done) => {
        asPicture(cut, (made) => {
          setWhole(from);
          setPicture(made);
          nothingBehind();
          setSaid(t('post.subjectsDone', 'Cut out: {n} main subjects kept, nothing behind them. Press Put it back if you liked it better before.')
            .replace('{n}', String(Math.max(shapes.length, 1))));
          done();
        }, () => { setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.')); done(); });
      });
    } finally {
      setWorking(null);
    }
  };

  const nothingBehind = (): void => {
    setBack(null);
    /* And a file that can hold it. The owner, 17 October 2026: *"Die skaakbord
       moet net nie saam aflaai en mens dit in die prent sien nie."* The
       squares are never in the file (`draw(…, false)`); a JPG would put a
       solid colour there instead, so the format moves to PNG with it. */
    if (!holdsClear(kind, true)) setKind('png');
  };

  const cutBackground = async (holdUntil = 0): Promise<boolean> => {
    if (!picture || cutting !== null) return false;
    setSaid('');
    setCutting(0);
    try {
      const cut = await cutOut(picture, (part) => setCutting(part), edgeOf(edge));
      /* The answer waits for the glow to finish, so it lands all at once. */
      const left = holdUntil - Date.now();
      if (left > 0) await new Promise((done) => { window.setTimeout(done, left); });
      if (!cut.ok) {
        /* One button for both kinds of picture (The owner, 14 October 2026:
           "Die transparency en background remover werk alweer nie reg
           nie"). She had pressed the plain-background one on a photograph
           of a person, which takes only what matches the edge of the frame.
           So the person model goes first, and only when it finds nobody —
           a logo, a drawing, a product on a sheet — does the plain one run. */
        if (cut.why === 'nobody') return flatGround(true);
        setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.'));
        return false;
      }
      lastMask.current = { mask: cut.mask, of: picture };
      before(t('post.stepCut', 'taking the background out'));
      asPicture(cut.canvas, (one) => {
        lastMask.current = { mask: cut.mask, of: picture, made: one };
        setWhole(picture);
        setPicture(one);
        nothingBehind();
        setSaid(t('post.cutDoneShort', 'Background removed. Save as PNG to keep it see-through.'));
      }, () => setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.')));
      return true;
    } finally {
      setCutting(null);
    }
  };

  /**
   * The person kept sharp, and the room behind them put out of focus.
   *
   * The owner's list of modern tools, 7 October 2026: *"auto focus, blur"*. The
   * blur the room already had is the whole picture, which is a mood; this is
   * the one people mean by it — what a phone's portrait mode does.
   *
   * The same model as the background remover, and the same mask: if she has
   * already taken a background out of this picture the answer is in hand and
   * this is instant, and if she has not it is the one download either tool
   * would have made. `blurBehind` in `lib/cutout.ts` carries why it is built
   * out of pieces that already exist rather than out of a new filter.
   */
  const blurTheBack = async (how: BehindId): Promise<void> => {
    if (!picture || cutting !== null) return;
    setSaid('');
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    const had = lastMask.current;
    /* Only when it is this very picture's mask. A mask kept from before a
       crop, a turn or an enlargement is the right shape for a photograph
       that is no longer on the glass. */
    const mask = had && had.of === picture ? had.mask : null;
    const put = (from: HTMLCanvasElement): void => {
      before(t('post.stepBehind', 'blurring what is behind'));
      asPicture(
        from,
        (one) => {
          setWhole(picture);
          setPicture(one);
          setSaid(t('post.behindDone', 'The room behind you is out of focus. Everything in front of it is as sharp as it was.'));
        },
        () => setSaid(t('post.behindFailed', 'That could not be put out of focus.')),
      );
    };

    if (mask) {
      put(blurBehind(picture, mask, wide, tall, behindOf(how, { width: wide, height: tall }), edgeOf(edge)));
      return;
    }
    setCutting(0);
    try {
      const cut = await cutOut(picture, (part) => setCutting(part), edgeOf(edge));
      if (!cut.ok) {
        setSaid(cut.why === 'nobody'
          ? t('post.cutNobody', 'No person found in this picture. This one only knows people \u2014 a face and shoulders, not a close-up of hair or an object. Use Cut out a shape below and draw round what you want instead.')
          : t('post.behindFailed', 'That could not be put out of focus.'));
        return;
      }
      lastMask.current = { mask: cut.mask, of: picture };
      put(blurBehind(picture, cut.mask, wide, tall, behindOf(how, { width: wide, height: tall }), edgeOf(edge)));
    } finally {
      setCutting(null);
    }
  };

  /**
   * Kept in the app, rather than taken out of it.
   *
   * ── What she asked for ───────────────────────────────────
   *
   * The owner, 8 October 2026: *"Daar moet ook ’n opsie wees om ’n foto binne
   * die app te bêrge. Daar moet dalk ’n gallery in channel gestoor word.
   * Dan wanneer mens video editor gebruik is dit een van die plekke wat
   * geroep word waaruit mens kan kies."*
   *
   * ── Why it is free, and why that is not a hole ─────────────────
   *
   * Everything in this room is free and the one press that spends is taking
   * the picture OFF the device. This does not take it off anything: the
   * shelf is `lib/assets.ts`, the same twenty-picture shelf the brand kit
   * and the start frame already use, and it lives in this browser.
   *
   * What makes that safe rather than a free download is that the shelf has
   * no way out. `Pictures.tsx` chooses, renames, stars and deletes; it does
   * not download, and `check:shelf` holds that it never learns to — because
   * a shelf that could hand the file back would be the paid export with an
   * extra step.
   *
   * Charging for it would also charge twice for one picture: once to put it
   * on the shelf and again to use it next door. That is the fault the
   * hand-over to the film was already written to avoid.
   */
  const keepInApp = async (): Promise<void> => {
    if (busy) return;
    setSaid('');
    try {
      await faceReady();
      const shelved = document.createElement('canvas');
      /* `false` for the guides, exactly as the download does: the
         checkerboard and the safe-zone bands are drawn to help her see, not
         to be part of the picture. And at 1, because a shelf is a working
         copy — twice the size is for printing, which is what the paid
         export is for. */
      draw(shelved, false, 1);
      const url = shelved.toDataURL('image/png');
      const thumb = await thumbnailOf(url);
      const blob = await new Promise<Blob | null>((done) => shelved.toBlob(done, 'image/png'));
      await rememberAsset({
        id: assetId(),
        kind: 'picture',
        name: nameFor(size.id, 'png', 1).replace(/\.png$/, ''),
        mime: 'image/png',
        bytes: blob?.size ?? 0,
        createdAt: new Date().toISOString(),
        thumb,
        from: 'photo',
      }, url);
      setSaid(t(
        'post.keptHere',
        'Kept in the app. It is on your Channel under “Your pictures”, and the cutting room can pick it from there — no credits, because it has not left this device.',
      ));
    } catch {
      setSaid(t('post.keptFailed', 'That could not be kept. This device may be out of room.'));
    }
  };

  /** The same picture, handed next door instead of onto the device. */
  const intoFilm = async (): Promise<void> => {
    if (!onIntoFilm) return;
    setBusy(true);
    setSaid('');
    try {
      const blob = await paidPicture();
      if (!blob) return;
      /* A `File` and not the bare blob: `isPicture` in `lib/videocover.ts`
         reads the type, which a blob carries, but the editor also shows the
         cover's name and a nameless one reads as a missing one. */
      onIntoFilm(new File([blob], `post-${size.id}.png`, { type: 'image/png' }));
      /* The room is NAMED, and it is named correctly.
 
         This first said "the editor is below this desk" — which is where
         the button to it is, not where it is. The cutting room is its own
         room reached from that button, so the sentence sent her scrolling
         down a desk looking for something that was never there. A small
         lie about where a thing went costs the same as a missing feature:
         she goes looking, does not find it, and stops believing the
         sentence. */
      setSaid(t('post.intoFilmDone', 'It is the film\u2019s cover now. Open the cutting room to see it on the film.'));
    } catch {
      setSaid(t('post.noExport', 'That could not be exported.'));
    } finally {
      setBusy(false);
    }
  };

  /* ── This room is the screen while it is open ───────────────────────────
 
     The owner asked for the tools along the bottom, and the app's own tab bar is
     along the bottom too. Two bars stacked is the fault the booth had in
     September — *"daai buttons vervang die harde buttons van die hele app"* —
     and here it was worse than untidy: the app's bar is `fixed bottom-0
     z-[95]` and this room's bar was under it, so the lower three benches
     (Words, Read and Save) were behind it.
 
     So the room claims the screen and `app/page.tsx` stops drawing the tab bar
     for as long as it is open. The way out is the header the rail draws above
     every room — a back arrow and "All rooms" — which is why this room has no
     close button of its own when it IS a room.
 
     `check:belowtabs` holds this to the same three conditions as the Pro
     Booth's exemption, and `audit/underbar.mjs` asks a browser — both while
     she is in the room and after she has walked out of it, which is what
     `atDoor` is for. */
  useOwnScreen(!atDoor);

  /* ── And it is a column of a measured height ────────────────────────────
 
     A scroller that takes what is left, with the bar under it. `min-h-screen`
     was the first version and it is wrong by exactly the height of the header
     above the room: the column was a screen tall STARTING 155 pixels down, so
     its last 155 pixels — the bar — hung below the bottom of the phone.
 
     The same arithmetic the cutting room needs, so it is the same hook. */
  const { shell, tall } = useRoomHeight();

  /* ── A row when the bar is on an edge ───────────────────────────────────

     The owner, 9 October 2026: *"Die website moet nie lyk soos 'n foon app
     nie."* A desk and a turned phone want the same thing from this room —
     the bench down the side instead of across the foot — and until now it
     asked for neither. `lib/atdesk.ts` carries why they are two questions.

     Note that `onEdge` changes the DIRECTION and nothing else. The body below
     is already one column, so there is no second layout here; there is one
     room with its bar on a different side of it. */
  const sideways = useSideways();
  const atDesk = useAtDesk();
  const onEdge = sideways || atDesk;
  const SKIN = asRoom
    ? `flex ${onEdge ? 'flex-row' : 'flex-col'} overflow-hidden`
    : `fixed inset-0 z-[60] flex ${onEdge ? 'flex-row' : 'flex-col'} overflow-hidden bg-zinc-950`;


  /* ── The benches ──────────────────────────────────────────────────────
 
     The owner, 7 October 2026: *"Die photo editor moet ook netjies wees. Die
     editing tools moet ook onder in 'n bar wees ... en alles moet baie
     eenvoudig en maklik wees."*
 
     It was one scroll of nine panels, seven hundred lines of it, and the
     picture she was working on slid off the top the moment she opened
     anything. Now the picture stays on the glass and every tool is behind
     the same bar the cutting room uses — the same component, so the two
     rooms cannot space their bars differently.
 
     Six benches rather than nine panels. Taking a thing out and painting a
     thing out are both "the picture"; the shape and which part of it shows
     are both "the frame". */
  /* ── Cutting it down ───────────────────────────────────────────────────
 
     The owner, 7 October 2026: *"Ek sien nie goeie cropping en cutting tools
     nie."*
 
     On the picture's own bench rather than the frame's, because what it
     changes is the photograph and not how the photograph is shown. A crop
     next to "Fill the frame" would read as a third way of framing; next to
     "Take the background out" and "Rub something out" it reads as what it is
     — one of the things you do TO a picture.
 
     While it is open the bench closes itself, so the glass is the whole
     photograph with the box over it. There is nothing to set in a panel: the
     tool is the gesture, and the two buttons are "do it" and "don't". */
  /**
   * The way into cutting a shape out, on the picture's own bench.
   *
   * The owner, 8 October 2026: *"Daai moet eerder 'n ander naam kry.
   * Free-hand-cut."* She is right — "draw around something" says how it
   * works rather than what it does, and it had stopped being true anyway
   * the moment there were four shapes to do it with.
   */
  const traceStart = picture ? (
    <div className="space-y-2">
      <p className={MIKRO}>{t('post.cutShape', 'Cut out a shape')}</p>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t(
          'post.cutShapeWhy',
          'Choose a circle, a square, straight lines or the pencil, draw it over the picture, and keep what is inside or take it out. It works on anything \u2014 a guitar, a dog, a bottle \u2014 not only on people.',
        )}
      </p>
      <button
        type="button"
        data-postdrawstart
        onClick={() => { setTraced([]); setBench(null); setSaid(''); }}
        className={LEEG}
      >
        <Lasso className="h-3.5 w-3.5" />
        {t('post.cutShapeStart', 'Choose a shape')}
      </button>
    </div>
  ) : null;

  /**
   * And the part over the bar, for the length of one gesture.
   *
   * The same shape as the crop's strip and for the same reason: the gesture
   * is on the picture, a bench open over the bottom of the glass covers the
   * part she is tracing, so starting closes it — and a panel somebody cannot
   * see is a button somebody cannot press.
   */
  const traceStrip = picture && traced ? (
    <div
      data-postdrawbar
      className="shrink-0 space-y-2 border-t px-4 py-3"
      style={asRoom
        ? { borderColor: 'rgba(16,185,129,0.25)', background: FLOOR }
        : { borderColor: 'rgb(39,39,42)', background: 'rgb(9,9,11)' }}
    >
      {/* ── Which shape, before how to use it ──────────────────────────
 
          Four answers to "how hard is this edge", and the one somebody
          reaches for says what kind of picture it is. The pencil last,
          because it is the slow one and the other three are what most
          pictures want. */}
      <div className={RY4}>
        {SHAPES.map((how) => (
          <button
            key={how}
            type="button"
            data-postcutshapepick={how}
            aria-pressed={cutShape === how}
            onClick={() => { setCutShape(how); setTraced([]); setSaid(''); }}
            className={`${LEEG} ${cutShape === how ? GEKIES : ''}`}
          >
            {how === 'circle' ? <Circle className="h-3.5 w-3.5" />
              : how === 'square' ? <Square className="h-3.5 w-3.5" />
                : how === 'line' ? <Spline className="h-3.5 w-3.5" />
                  : <Pencil className="h-3.5 w-3.5" />}
            {how === 'circle' ? t('post.cutCircle', 'Circle')
              : how === 'square' ? t('post.cutSquareShape', 'Square')
                : how === 'line' ? t('post.cutLine', 'Lines')
                  : t('post.cutPencil', 'Pencil')}
          </button>
        ))}
      </div>
      <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
        {worthCutting(traced)
          ? t('post.drawReady', 'Now keep what you drew round, or take it out. Draw again to start the shape over.')
          : cutShape === 'line'
            ? t('post.cutLineHow', 'Tap each corner of the thing. The edges between them come out exactly straight \u2014 good for a sign, a building, a screen.')
            : dragged(cutShape)
              ? t('post.cutDragHow', 'Put your finger down at one corner and drag to the other. The shape follows as you go.')
              : t('post.drawHow', 'Put your finger on the picture and trace right round the thing. Lift it when you get back to where you started.')}
      </p>
      <div className={RY}>
        <button
          type="button"
          data-postdrawkeep
          disabled={!worthCutting(traced)}
          onClick={() => cutRound(true)}
          className={`${VUL} disabled:opacity-40`}
        >
          {t('post.drawKeep', 'Keep this')}
        </button>
        <button
          type="button"
          data-postdrawdrop
          disabled={!worthCutting(traced)}
          onClick={() => cutRound(false)}
          className={`${LEEG} disabled:opacity-40`}
        >
          {t('post.drawDrop', 'Take this out')}
        </button>
      </div>
      <div className={RY}>
        <button
          type="button"
          data-postdrawagain
          disabled={traced.length === 0}
          onClick={() => { setTraced([]); setSaid(''); }}
          className={`${LEEG} disabled:opacity-40`}
        >
          {t('post.drawAgain', 'Start the shape over')}
        </button>
        <button
          type="button"
          data-postdrawstop
          onClick={() => { setTraced(null); setSaid(''); }}
          className={LEEG}
        >
          {t('post.drawStop', 'Leave it')}
        </button>
      </div>
    </div>
  ) : null;

  /** The part that lives on the bench: the way in, and what it is for. */
  const cropStart = picture ? (
    <div className="space-y-2">
      <p className={MIKRO}>{t('post.cutDown', 'Cut it down')}</p>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t(
          'post.cutDownWhy',
          'Keep part of the photograph and throw the rest away for good. Different from the frame: this changes the picture itself, so what you cut off is gone.',
        )}
      </p>
      <button
        type="button"
        data-postcropstart
        onClick={() => setCropBox(ALL_OF_IT)}
        className={LEEG}
      >
        <CropIcon className="h-3.5 w-3.5" />
        {t('post.cutDownStart', 'Start cutting')}
      </button>
    </div>
  ) : null;

  /**
   * And the part that lives in the room, over the bar.
   *
   * ── Why not on the bench with everything else ─────────────────────────
   *
   * Because the gesture is on the picture. A bench open over the bottom of
   * the glass covers the two lower corners of the box — the two you reach for
   * first — so starting a crop closes the bench, and a panel somebody cannot
   * see is a Cut button somebody cannot press. The strip is the one piece of
   * this room that is not behind a tab, for the length of one gesture.
   *
   * Above the bar rather than over the picture, so it covers nothing it is
   * about.
   */
  const cropStrip = picture && cropBox ? (
    <div
      data-postcropbar
      className="shrink-0 space-y-2 border-t px-4 py-3"
      style={asRoom
        ? { borderColor: 'rgba(16,185,129,0.25)', background: FLOOR }
        : { borderColor: 'rgb(39,39,42)', background: 'rgb(9,9,11)' }}
    >
      <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
        {t(
          'post.cutDownHow',
          'Drag the corners or the sides of the box to say how much you are keeping. Everything shaded is cut away.',
        )}
      </p>
      {/* The three shapes a post actually goes out in, so somebody who knows
          what they are posting does not have to get 9:16 right with a thumb.
          Snapped around the middle of the box she has already set, and never
          growing it — see `toShape`. */}
      <div className={plain ? 'hidden' : RY3}>
        {([
          ['square', 1, t('post.cutSquare', 'Square')],
          ['tall', 9 / 16, t('post.cutTall', 'Tall')],
          ['wide', 16 / 9, t('post.cutWide', 'Wide')],
        ] as const).map(([id, want, says]) => (
          <button
            key={id}
            type="button"
            data-postcropshape={id}
            onClick={() => { setCropExact(null); setCropDraft(null); setCropBox((now) => (now && picture
              ? toShape(now, {
                width: picture.naturalWidth || picture.width,
                height: picture.naturalHeight || picture.height,
              }, want)
              : now)); }}
            className={LEEG}
          >
            {says}
          </button>
        ))}
      </div>
      {(() => {
        const of = { width: picture.naturalWidth || picture.width, height: picture.naturalHeight || picture.height };
        const now = cutTo(cropBox, of);
        const shown = cropDraft ?? { w: String(cropExact ? cropExact.w : now.width), h: String(cropExact ? cropExact.h : now.height) };
        const use = (): void => {
          const w = Math.round(Number(shown.w));
          const h = Math.round(Number(shown.h));
          if (!Number.isFinite(w) || !Number.isFinite(h) || w < 16 || h < 16 || w > 8000 || h > 8000) return;
          setCropExact({ w, h });
          setCropDraft(null);
          setCropBox(toShape(ALL_OF_IT, of, w / h));
        };
        return (
          <form data-postcropsize className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2" onSubmit={(event) => { event.preventDefault(); use(); }}>
            <input type="number" inputMode="numeric" min={16} max={8000} data-postcropwidth
              aria-label={t('crop.width', 'Width in pixels')} value={shown.w}
              onChange={(event) => setCropDraft({ ...shown, w: event.target.value })}
              className="h-11 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-center text-base tabular-nums text-zinc-100" />
            <span className="text-sm text-zinc-500">×</span>
            <input type="number" inputMode="numeric" min={16} max={8000} data-postcropheight
              aria-label={t('crop.height', 'Height in pixels')} value={shown.h}
              onChange={(event) => setCropDraft({ ...shown, h: event.target.value })}
              className="h-11 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-center text-base tabular-nums text-zinc-100" />
            <span className="text-xs text-zinc-500">px</span>
            <button type="submit" data-postcropsizeuse className={`${LEEG} col-span-4`}>{t('crop.sizeUse', 'Use this size')}</button>
          </form>
        );
      })()}
      {cropExact ? (
        <p className="text-[12px] text-emerald-300">{`${t('crop.comesOut', 'Comes out at exactly')} ${cropExact.w} × ${cropExact.h} px`}</p>
      ) : null}
      <div className={RY}>
        <button type="button" data-postcropdo onClick={cutItDown} className={VUL}>
          <CropIcon className="h-4 w-4" />
          {t('post.cutDownDo', 'Cut to this')}
        </button>
        <button
          type="button"
          data-postcropstop
          onClick={() => { setCropBox(null); if (bench === 'frame') setBench(null); }}
          className={LEEG}
        >
          {t('post.cutDownStop', 'Leave it')}
        </button>
      </div>
      {/* The rest of the frame — the post's shape, smart crop, the photo's
          own size, fill or fit — without cutting anything off the photo. */}
      <button
        type="button"
        data-postcropframing
        onClick={() => { setCropBox(null); setBench('frame'); }}
        className={LEEG}
      >
        <Frame className="h-3.5 w-3.5" />
        {t('post.cutFraming', 'Shape & framing instead')}
      </button>
    </div>
  ) : null;

  const picBench = (
    <div className="space-y-4">
    {/* ── The picture ───────────────────────────────────────────────── */}
    <div className={RY}>
      <label className={`${LEEG} cursor-pointer inline-flex items-center gap-1.5`}>
        <ImageIcon className="h-3.5 w-3.5" />
        {t('post.bringIn', 'Bring a picture in')}
        <input
          type="file"
          accept={ACCEPTS}
          data-postpicture
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = '';
            void bringIn(file);
          }}
        />
      </label>
      {/* The way into the darkroom, dressed to be noticed. The owner, 17 October
          2026: *"by bring a photo in … 'n fancy looking button … wat mense
          na die lightroom toe vat."* */}
      <button
        type="button"
        data-postdarkroom
        onClick={() => setDarkroom(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-white shadow-lg"
        style={{ background: 'linear-gradient(120deg, #f59e0b, #ec4899 55%, #8b5cf6)', boxShadow: '0 0 18px rgba(236,72,153,0.45)' }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t('post.darkroom', 'Develop like a pro')}
      </button>
      {/* And the way into the document room, beside it. The owner, 17 October
          2026: *"PDF editor sal dan ook 'n fancy button binne photo shop hê,
          daar by bring in a photo."* */}
      <button
        type="button"
        data-postpdf
        onClick={() => askPdf(null)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-white shadow-lg"
      >
        <FileText className="h-3.5 w-3.5" />
        {t('post.pdfRoom', 'PDF studio')}
      </button>
      {/* And the vector studio. The owner, 17 October 2026: *"Ek hou van daai
          vector illustration."* */}
      <button
        type="button"
        data-postvector
        onClick={() => setVector({ editing: null })}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-white shadow-lg"
      >
        <PenTool className="h-3.5 w-3.5" />
        {t('post.vectorRoom', 'Vector studio')}
      </button>
      {/* And the poster maker. The owner, 16 October 2026: a poster maker with
          three ways in — describe it, pick a kind, or fill in its lines. */}
      <button
        type="button"
        data-postposter
        onClick={() => setPoster(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-white shadow-lg"
        style={{ background: 'linear-gradient(120deg, #d946ef, #f43f5e 55%, #f59e0b)', boxShadow: '0 0 18px rgba(217,70,239,0.4)' }}
      >
        <Megaphone className="h-3.5 w-3.5" />
        {t('post.posterRoom', 'Poster')}
      </button>
      {/* And product photos. The owner, 16 October 2026: *"Generate product
          photos in seconds."* */}
      <button
        type="button"
        data-postproduct
        onClick={() => setProduct(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-white shadow-lg"
        style={{ background: 'linear-gradient(120deg, #f59e0b, #f97316 55%, #e11d48)', boxShadow: '0 0 18px rgba(249,115,22,0.4)' }}
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        {t('post.productRoom', 'Product photos')}
      </button>
      {/* And clothes on a model. The owner, 16 October 2026: *"Show clothes on
          models."* */}
      <button
        type="button"
        data-posttryon
        onClick={() => setTryOn(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-white shadow-lg"
        style={{ background: 'linear-gradient(120deg, #0ea5e9, #6366f1 55%, #c026d3)', boxShadow: '0 0 18px rgba(99,102,241,0.4)' }}
      >
        <Shirt className="h-3.5 w-3.5" />
        {t('post.tryOnRoom', 'Clothes on a model')}
      </button>
      {picture && (
        <button
          type="button"
          onClick={() => { before(t('post.stepOut', 'taking the picture out')); setPicture(null); }}
          className={LEEG}
        >
          {t('post.takeOut', 'Take it out')}
        </button>
      )}
      {/* The swatch fills its column like everything else.
 
          It was a 48-pixel chip beside a caption — 36 tall where every other
          control in the bench is 44 — which made it the one thing in the row
          that did not read as a control. */}
      <label className={`${KNOP} cursor-pointer`}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {t('post.behind', 'Behind')}
        </span>
        <input
          type="color"
          data-postbehind
          value={back ?? lastColour}
          onChange={(event) => {
            setLastColour(event.target.value);
            setBack(event.target.value);
          }}
          className="h-6 w-8 rounded border border-zinc-700 bg-zinc-950"
          aria-label={t('post.behind', 'Behind')}
        />
      </label>
      {/* Turning it off remembers the colour, so coming back is one press
          and not a hunt for the same dark grey again. */}
      <button
        type="button"
        data-postclear
        aria-pressed={back === null}
        disabled={working === 'long'}
        onClick={() => { if (back === null) setBack(lastColour); else void makeTransparent(); }}
        className={back === null ? VUL.replace('w-full ', '') : LEEG}
      >
        {back === null
          ? t('post.clearOn', 'Transparent \u2014 nothing behind it')
          : t('post.clearOff', 'Make it transparent')}
      </button>
      {picture && (
        <button
          type="button"
          data-postsubjects
          disabled={working === 'long' || looking}
          onClick={() => void cutSubjects()}
          className={`${LEEG} col-span-2 disabled:opacity-50`}
        >
          <Scissors className="h-3.5 w-3.5" />
          {t('post.subjectsGo', 'Cut out every main thing \u00b7 {n} credits').replace('{n}', String(CREDITS.grab))}
        </button>
      )}
      {back === null && (
        <p data-postcheckernote className="col-span-2 text-[12px] leading-relaxed" style={{ color: INK_DIM }}>
          {t('post.checkerOnlyHere', 'The squares only show you it is see-through. They are not in the picture you save.')}
        </p>
      )}
    </div>

    {/* ── A photograph given a little motion ─────────────────────────

        The owner, 10 October 2026: *"Ek wonder ook of google se modelle net
        bietjie motion kan gee aan foto's? Dit kan baie van ons photo editing
        tools verbeter, en vir al ook vir foto's wat vir bemarking gebruik
        word en social media."*

        No new engine: Veo takes a start frame and the trick is the prompt.
        The photograph goes up as the opening frame AND the closing one, so
        the clip returns to it and loops — which is what makes it postable
        rather than a four-second clip that stops.

        Only drawn when there is a photograph, because that is the whole
        input. And it is a paid press, so the price is on the button. */}
    {picture && (
      <div data-postlive className="flex flex-col gap-2">
        <div className={MIKRO}>{t('post.liveTitle', 'Give it a little motion')}</div>
        <div className="flex flex-wrap gap-1.5">
          {MOTIONS.map((one) => (
            <button
              key={one.id}
              type="button"
              data-postmotion={one.id}
              aria-pressed={motion === one.id}
              onClick={() => setMotion(one.id)}
              title={lang === 'af' ? t(one.what[0], one.what[1]) : one.what[1]}
              className={`${LEEG} !h-auto flex-col gap-1 p-1.5 ${motion === one.id ? GEKIES : ''}`}
            >
              {/* The meerkat photo in that motion's weather, moving a little —
                  every choice a picture. */}
              <span className="relative block h-14 w-full overflow-hidden rounded-lg">
                <MeerkatThumb className="absolute inset-0 h-full w-full !rounded-none" mood={MOTION_PICTURE[one.id]?.mood ?? 'day'} filter={MOTION_PICTURE[one.id]?.filter} />
                {MOTION_PICTURE[one.id]?.over ? (
                  <span aria-hidden className={`absolute inset-0 ${MOTION_PICTURE[one.id]?.pulse ? 'animate-pulse' : ''}`} style={{ background: MOTION_PICTURE[one.id]?.over }} />
                ) : null}
              </span>
              <span className="text-[11px]">{t(one.says[0], one.says[1])}</span>
            </button>
          ))}
        </div>
        <span className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
          {t(
            MOTIONS.find((one) => one.id === motion)?.what[0] ?? 'post.liveWhat',
            MOTIONS.find((one) => one.id === motion)?.what[1] ?? 'Any photograph',
          )}
        </span>
        {liveCan === 'none' && (
          <p data-postliveoff className="text-[12px] leading-relaxed text-amber-300">
            {t('post.liveOff', 'Bringing a photo to life needs a video engine that starts from a picture, and none is switched on for this app yet. Nothing was charged.')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-postlivego
            disabled={liveBusy || Boolean(liveJob) || liveCan === 'none'}
            onClick={() => { void bringToLife(); }}
            className={`${LEEG} disabled:opacity-40`}
          >
            {liveJob
              ? t('post.liveBusy', 'Making it…')
              : `${t('post.liveGo', 'Bring it to life')} · ${creditsSaid(CREDITS.video * LIVE_SECONDS / 5, t)}`}
          </button>
          {/* In a tab of its own. The clip lives on another origin, where a
              browser ignores `download` and simply goes there — and as a
              plain link that was out of the room, with the post she was
              making gone with it. In a new tab the clip opens to be saved
              and the post stays exactly where it was. Not fetched and handed
              over as a file from here: this room has one way to put a file
              on a phone, the paid one (`check:onlyonpress`). */}
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="futurebox-live.mp4"
              data-postlivesave
              className={LEEG}
            >
              <Download className="h-4 w-4" />
              {t('post.liveSave', 'Save the video')}
            </a>
          )}
        </div>
        {liveUrl && (
          <>
            {/* Muted, looping and autoplaying, because that is what the clip
                IS: a photograph with a little motion in it. A player with a
                play button on a four-second loop is a player nobody presses.
                `playsInline` so a phone does not take it full screen. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a
                photograph with motion and no speech in it; there is nothing
                to caption. */}
            <video
              src={liveUrl}
              data-postliveout
              autoPlay
              loop
              muted={!liveSound}
              playsInline
              className="w-full rounded-xl border border-zinc-800"
            />
            {/* Its sound, on a press. The engine makes sound with the motion
                (Veo 3.1 does), and the clip was always muted here, so it
                looked as if the photo editor brought no sound in (The owner,
                14 October 2026). Starts silent because a phone will not
                autoplay sound; one press and it is heard. */}
            <button
              type="button"
              data-postlivesound
              onClick={() => setLiveSound((was) => !was)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-200"
            >
              {liveSound ? t('post.liveSoundOff', 'Sound off') : t('post.liveSoundOn', 'Sound on')}
            </button>
            {/* The row that already exists, in the room where the thing
                was finished. It copies the caption, hands the file to the
                phone's own share sheet and opens the platform's composer —
                it does not upload, and `ShareRow` says so in its own words.

                `file` is a function and not a URL on purpose: building a
                File nobody asked for is work for nothing, so it is only
                fetched when somebody presses share. */}
            <ShareRow
              title={t('post.liveShare', 'A photo with a little motion')}
              what={t('post.liveCaption', 'Made on FutureBox')}
              file={async () => {
                try {
                  const got = await fetch(liveUrl);
                  if (!got.ok) return null;
                  return new File([await got.blob()], 'futurebox-live.mp4', { type: 'video/mp4' });
                } catch {
                  return null;
                }
              }}
            />
          </>
        )}
        {liveSaid && (
          <span className="text-[12px] leading-relaxed" style={asRoom ? { color: INK } : undefined}>
            {liveSaid}
          </span>
        )}
      </div>
    )}

    {/* ── Make a picture, or change this one, by saying it ───────────

        The owner, 9 October 2026: *"Ek sien nie veranderinge met ons nuwe tools
        in photo en video editor nie... daar moet seker ook 'n AI in wees en
        daar moet generate an image ook wees, asook die funksie waar jy 'n
        image vir die generator gee wat hy ook kan verander."*

        It was there and she could not see it, which is the same thing as it
        not being there. Two reasons, both mine: it was drawn only when a
        picture was already loaded, so an empty room showed nothing; and it
        sat below the eraser, two screens down.

        So it is here, directly under "Bring a picture in", and it works
        either way round — with a picture it changes that picture, without
        one it draws a new one. Nano Banana, on her own Google project.

        It is the ONE thing in this room that is not free and does not happen
        on the device, so the button carries its price and the sentence under
        it says so. */}
    {/* `data-postmake`, not `data-postask`: that name is the copilot's
        button in the bar, which the app's own "ask" shortcut finds by it. */}
    <div data-postmake className="flex flex-col gap-2">
      <div className={MIKRO}>
        {picture
          ? t('post.askTitle', 'Change it by saying what to change')
          : t('post.makeTitle', 'Make a picture by saying what you want')}
      </div>
      <span className="relative block">
        <textarea
          data-postaskwords
          value={askWords}
          onChange={(event) => setAskWords(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder={picture
            ? t('post.askHint', 'Take the car out of the background. Make it evening. Write SALE on the window.')
            : t('post.makeHint', 'A konsertina on a stoep at sunset, warm light, film grain.')}
          className="w-full rounded-xl border border-zinc-800 bg-black/30 p-3 text-[14px] leading-relaxed outline-hidden focus:border-emerald-500/60 pr-11"
          style={asRoom ? { color: INK } : undefined}
        />
        <SpeakButton onHeard={(said) => setAskWords((was) => withSaid(was, said).slice(0, 500))} className="absolute bottom-2 right-2" />
      </span>
      {/* ── Pictures to copy from ──────────────────────────────────────

          The capability that was sitting unused. The engine reads several
          pictures in a turn: this person's face, this logo, this palette.
          The words then say what to do with them.

          Shown always, with or without a picture on the bench, because both
          are real: with one it is "put this logo on that shirt", without one
          it is "draw a poster in the style of these two". */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          data-postaskrefs
          className={`${LEEG} cursor-pointer ${refs.length >= roomForRefs(Boolean(picture)) ? 'opacity-40' : ''}`}
        >
          {t('post.refsAdd', 'Pictures to copy from')}
          <input
            type="file"
            accept={ACCEPTS}
            multiple
            disabled={refs.length >= roomForRefs(Boolean(picture))}
            className="hidden"
            onChange={(event) => {
              void bringRefs(event.target.files);
              /* Cleared so choosing the same file twice still fires. */
              event.target.value = '';
            }}
          />
        </label>
        {refs.map((one, at) => (
          <button
            key={one.url}
            type="button"
            data-postaskref={at}
            onClick={() => dropRef(at)}
            title={t('post.refsDrop', 'Take this one out')}
            className="relative h-11 w-10 overflow-hidden rounded-xl border border-zinc-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- an
                object URL for a picture chosen a second ago; the image
                component wants a path it can measure and optimise, and
                there is nothing on a server to optimise. */}
            <img src={one.url} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[11px]">×</span>
          </button>
        ))}
      </div>

      {/* The shape, only when there is nothing to inherit one from. Forcing
          a ratio onto somebody's own photograph crops it. */}
      {!picture && (
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((shape) => (
            <button
              key={shape.id}
              type="button"
              data-postaskshape={shape.id}
              aria-pressed={askShape === shape.id}
              onClick={() => setAskShape(shape.id)}
              title={lang === 'af' ? shape.forAf : shape.forEn}
              className={`${LEEG} ${askShape === shape.id ? GEKIES : ''}`}
            >
              {lang === 'af' ? shape.af : shape.en}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-postaskgo
          disabled={redrawing || !askWords.trim()}
          onClick={() => { void askForPicture(); }}
          className={`${LEEG} disabled:opacity-40`}
        >
          {redrawing
            ? t('post.askBusy', 'Drawing it…')
            : `${picture ? t('post.askGo', 'Change it') : t('post.makeGo', 'Make it')} · ${creditsSaid(CREDITS.repaint, t)}`}
        </button>
        {whole && (
          <button
            type="button"
            data-postaskback
            onClick={() => { setPicture(whole); setWhole(null); setSaid(''); }}
            className={LEEG}
          >
            {t('post.cutBack', 'Put it back')}
          </button>
        )}
      </div>
      <span className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
        {t(
          'post.askWhat',
          'Say what you want and it is drawn; bring a picture in first and it changes that one instead. This is the only thing in this room that uses credits and does not happen on your phone — the picture is drawn somewhere else, so it costs credits and takes a few seconds. It can write words INTO the picture, on a window or along a wall; for words on top in a real font, use Words below, which uses no credits and can be moved afterwards. It will not put a real person into a picture, and it cannot make album art: a cover is made in the booth or bought from an artist.',
        )}
      </span>
    </div>
    {/* ── The background, taken out ──────────────────────────────────
 
        The owner, 7 October 2026: *"BG remover"*. It looks for a PERSON —
        the model is very good at somebody against anything and knows
        nothing about a guitar — so it refuses with a reason rather than
        handing back an empty frame. A fully transparent picture and a
        deleted picture look the same on a phone.
 
        Beside the background colour on purpose: cut the person out, take
        the colour off, and the post is a person on nothing. */}
    {picture && (
      <div
        data-postcut
        className="flex flex-wrap items-center gap-2 rounded-xl border p-3"
        style={asRoom
          ? { borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(52,211,153,0.06)', boxShadow: RAISE }
          : { borderColor: 'rgb(39,39,42)', background: 'rgba(24,24,27,0.5)' }}
      >
        <p className={MIKRO}>{t('post.cut', 'BG remover')}</p>
        <button
          type="button"
          data-postcutgo
          disabled={cutting !== null}
          onClick={() => {
            setWorking('long');
            void cutBackground(Date.now() + 3000).finally(() => setWorking(null));
          }}
          className={`${LEEG} disabled:opacity-40`}
        >
          {cutting !== null
            ? `${Math.round(cutting * 100)}%`
            : t('post.cutGo', 'Remove the background')}
        </button>
        {/* How hard the cut edge is.
 
            The owner, 7 October 2026, with a photograph of herself cut out:
            *"Its not looking perfect."* The model answers at 256 square
            whatever it is given, so on a phone photograph one mask pixel
            is a block ten or more across and the edge comes out as a
            staircase.
 
            A choice rather than a number I picked, because how an edge
            reads depends on the picture, on how much of the frame the
            person fills and on their hair — and one value chosen from one
            screenshot is a guess that costs her a day to disprove. */}
        {/* Not in simple: the middle edge is right on most photographs,
            and somebody who has just pressed one button does not want to be
            asked a question about hair. `Everything` brings them back. */}
        {!plain && EDGES.map((one) => (
          <button
            key={one.id}
            type="button"
            data-postedge={one.id}
            aria-pressed={edge === one.id}
            onClick={() => cutAgain(one.id)}
            className={`${LEEG} ${edge === one.id ? GEKIES : ''}`}
          >
            {one.id === 'tight'
              ? t('post.edgeTight', 'Hard edge')
              : one.id === 'soft'
                ? t('post.edgeSoft', 'Soft edge')
                : t('post.edgeNormal', 'Normal edge')}
          </button>
        ))}
        {whole && (
          <button
            type="button"
            data-postcutback
            onClick={() => { setPicture(whole); setWhole(null); setSaid(''); }}
            className={LEEG}
          >
            {t('post.cutBack', 'Put it back')}
          </button>
        )}
        <span className="w-full text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
          {t('post.cutWhatOne', 'One press: a person is cut out cleanly; a logo or drawing loses its plain background. On your phone, no credits.')}
        </span>
        {/* ── And the one for everything that is not a person ───────────
 
            The owner, 10 October 2026, of a logo this app had just made her:
            *"Well this was done on our own app. How are we going to get
            transparency?"*
 
            An image model cannot make transparency. It returns opaque
            pixels, and asked for a transparent background it draws a
            PICTURE of a checkerboard — hers came back as a 35-pixel grid of
            grey and white squares. No wording fixes that, so the
            transparency is made here afterwards.
 
            Beside the person one and not instead of it: that one runs a
            model trained on people and finds nobody in a logo, which is
            correct and useless. This one knows nothing about what is in the
            picture — it learns the background off the edge of the frame.
            Two tools, each honest about what it does. */}
        {!plain && (
        <div data-postground className="flex w-full flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: asRoom ? 'rgba(16,185,129,0.18)' : 'rgb(39,39,42)' }}>
          <p className={MIKRO}>{t('post.ground', 'Plain background')}</p>
          <button
            type="button"
            data-postgroundgo
            onClick={takeFlatGround}
            className={LEEG}
          >
            {t('post.groundOnly', 'Only a plain background (logos, drawings)')}
          </button>
          {/* The pixels cannot say which of these is wanted, so it is asked
              rather than guessed: a logo's own holes ARE background, and a
              white shirt in the middle of a photograph is not. */}
          {!plain && (
            <>
              <button
                type="button"
                data-postgroundreach="everywhere"
                aria-pressed={groundReach === 'everywhere'}
                onClick={() => setGroundReach('everywhere')}
                className={`${LEEG} ${groundReach === 'everywhere' ? GEKIES : ''}`}
              >
                {t('post.groundAll', 'A logo or drawing')}
              </button>
              <button
                type="button"
                data-postgroundreach="edges"
                aria-pressed={groundReach === 'edges'}
                onClick={() => setGroundReach('edges')}
                className={`${LEEG} ${groundReach === 'edges' ? GEKIES : ''}`}
              >
                {t('post.groundEdge', 'Around the outside only')}
              </button>
            </>
          )}
          <span className="w-full text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
            {t('post.groundWhat', 'For a logo, a drawing, or anything photographed on a plain sheet — including the grey-and-white squares a picture comes back with when it was asked for a see-through background. It works out what the background is from the edges of the frame. Included in your plan, and it happens on your own phone, so it uses no credits.')}
          </span>
        </div>
        )}
        {/* ── And what colour the thing that is left should be ──────────
 
            The owner, 11 October 2026: *"om 'n logo, of 'n objek se kleur te kan
            verander. Ek dink ook wanneer dit kom by kleur, moet mens ook die
            pearlescent funksie in sit waar twee na 3 kleure saam blend vir
            'n kleur skakering."*
 
            Under the remover and not beside it, because it only means
            anything once something has been cut out: it paints what is left
            and leaves the see-through part alone. `lib/repaint.ts` carries
            why the alpha is never touched. */}
        <div data-postpaint className="flex w-full flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: asRoom ? 'rgba(16,185,129,0.18)' : 'rgb(39,39,42)' }}>
          <p className={MIKRO}>{t('post.paint', 'Its colour')}</p>

          {paintColours.map((one, at) => (
            <input
              key={`paint-${at}`}
              type="color"
              value={one}
              data-postpaintcolour={at}
              aria-label={t('post.paintColour', 'Colour {n}').replace('{n}', String(at + 1))}
              onChange={(e) => setPaintColours(
                paintColours.map((was, which) => (which === at ? e.target.value : was)),
              )}
              className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-zinc-700 bg-transparent p-1"
            />
          ))}

          {paintColours.length < MOST_COLOURS && (
            <button
              type="button"
              data-postpaintmore
              onClick={() => setPaintColours([...paintColours, '#9ad5ff'])}
              className={LEEG}
            >
              {paintColours.length === 1
                ? t('post.paintBlend', 'Blend a second colour in')
                : t('post.paintThird', 'And a third')}
            </button>
          )}
          {paintColours.length > 1 && (
            <button
              type="button"
              data-postpaintfewer
              onClick={() => setPaintColours(paintColours.slice(0, -1))}
              className={LEEG}
            >
              {t('post.paintOneLess', 'One colour less')}
            </button>
          )}

          {/* The dial only means something once there are two colours to run
              between, so it is not offered for a flat change. */}
          {paintColours.length > 1 && (
            <label className="flex flex-1 items-center gap-2 text-[12px]" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
              {t('post.paintAngle', 'Which way it runs')}
              <input
                type="range"
                min={0}
                max={359}
                step={15}
                value={paintAngle}
                data-postpaintangle
                onChange={(e) => setPaintAngle(Number(e.target.value))}
                className="h-11 min-w-[120px] flex-1"
              />
            </label>
          )}

          <button
            type="button"
            data-postpaintgo
            onClick={paintShape}
            className={LEEG}
          >
            {paintColours.length > 1
              ? t('post.paintGoBlend', 'Paint it with the blend')
              : t('post.paintGo', 'Paint it this colour')}
          </button>

          <label className="flex items-center gap-2 text-[12px]" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
            <input
              type="checkbox"
              checked={paintShade}
              data-postpaintshade
              onChange={(e) => setPaintShade(e.target.checked)}
              className="h-5 w-5"
            />
            {t('post.paintKeep', 'Keep its light and shade')}
          </label>

          <span className="w-full text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
            {t('post.paintWhat', 'Paints whatever is left after the background came off, and never the see-through part. One colour changes it flat; two or three blend across the shape for a pearlescent sheen. Keeping its light and shade matters for a photographed object and makes no difference to a flat logo. Included in your plan, and it happens on your own phone, so it uses no credits.')}
          </span>
        </div>
        {/* ── And the other thing to do with the same mask ──────────────
 
            The owner's list, 7 October 2026: *"auto focus, blur"*. Beside taking
            the background OUT, because it is the same model, the same mask
            and the same edge — and because somebody standing here looking at
            a photograph of a person is already thinking about what to do
            with what is behind them.
 
            Instant when she has already cut one out of this picture: the
            answer is in hand and nothing is downloaded twice. */}
        <p className={`${MIKRO} pt-1`}>{t('post.behind2', 'Or blur the background')}</p>
        <div className={plain ? RY : RY3}>
          {(plain ? BEHIND.filter((one) => one.id === 'misty') : BEHIND).map((one) => (
            <button
              key={one.id}
              type="button"
              data-postbehindblur={one.id}
              disabled={cutting !== null}
              onClick={() => void blurTheBack(one.id)}
              className={`${LEEG} disabled:opacity-40`}
            >
              {plain
                ? t('post.behindPlain', 'Blur behind me')
                : one.id === 'soft'
                  ? t('post.behindSoft', 'A little')
                  : one.id === 'misty'
                    ? t('post.behindMisty', 'Misty')
                    : t('post.behindGone', 'Gone')}
            </button>
          ))}
        </div>
        <p className="text-[12px] leading-relaxed text-zinc-500">
          {t(
            'post.behindWhy',
            'Instead of removing the background, blur it. You stay sharp and everything behind you goes soft \u2014 the portrait look. It finds people, same as the button above.',
          )}
        </p>
        {/* ── And the other blur, pointed at from where she looked ─────

            The owner, 8 October 2026: *"Daar is nou ’n blur behind a person, dit
            is goed. Ons benodig wel ook ’n blur funksie vir die hele foto."*

            It is there, and has been: a Blur slider on the Looks bench that
            runs to twenty. She asked for it anyway, which means it may as
            well not be — she came looking for a blur HERE, at the blur that
            needs a person in the picture, and nothing here said where the
            other one was.

            A line rather than a second slider. Two blurs on one bench, one
            of which quietly fails on a photograph with no person in it, is
            worse than one of each in the place it belongs. */}
        <p data-postwholeblur className="text-[12px] leading-relaxed text-zinc-500">
          {t(
            'post.behindWhole',
            'To blur the WHOLE picture instead — no person needed — use the Blur slider under “How it reads”.',
          )}
        </p>

      </div>
    )}
    {/* ── The pixel eraser: by hand, Erase or Restore ─────────────── */}
    {picture && (
      <div data-postpixel className="space-y-2 rounded-xl border p-3" style={asRoom
        ? { borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(52,211,153,0.06)', boxShadow: RAISE }
        : { borderColor: 'rgb(39,39,42)', background: 'rgba(24,24,27,0.5)' }}>
        <p className={MIKRO}>{t('post.pixelTitle', 'Pixel eraser')}</p>
        {!pixelOn ? (
          <button type="button" data-postpixelstart onClick={startPixel} className={LEEG}>
            <Eraser className="h-3.5 w-3.5" />
            {t('post.pixelStart', 'Erase or restore by hand')}
          </button>
        ) : (
          <>
            <div className={RY}>
              {(['erase', 'restore'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-postpixelmode={mode}
                  aria-pressed={pixelMode === mode}
                  onClick={() => setPixelMode(mode)}
                  className={`${LEEG} ${pixelMode === mode ? GEKIES : ''}`}
                >
                  {mode === 'erase' ? <Eraser className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {mode === 'erase' ? t('post.pixelErase', 'Erase') : t('post.pixelRestore', 'Restore')}
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-[11px]" style={{ color: INK_DIM }}>{t('post.pixelSize', 'Size')}</span>
              <input
                type="range" min={0.008} max={0.12} step={0.002}
                value={pixelSize}
                data-postpixelsize
                onChange={(event) => setPixelSize(Number(event.target.value))}
                className="h-11 w-full accent-emerald-400"
              />
            </label>
            <canvas
              ref={pixelView}
              data-postpixelcanvas
              onPointerDown={(event) => {
                pixelDown.current = true;
                pixelLast.current = null;
                event.currentTarget.setPointerCapture(event.pointerId);
                pixelAt(event);
              }}
              onPointerMove={(event) => { if (pixelDown.current) pixelAt(event); }}
              onPointerUp={(event) => {
                pixelDown.current = false;
                pixelLast.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { pixelDown.current = false; pixelLast.current = null; }}
              /* Fits the docked panel's height (23 October 2026) rather than
                 the column's width: a square pad as wide as the column was
                 taller than the panel, and the half under its edge could not
                 be rubbed. Width follows from the height, so the pad keeps
                 the picture's shape and every part of it is in reach. */
              className="mx-auto max-w-full rounded-xl border border-zinc-800"
              style={{ touchAction: 'none', cursor: 'crosshair', maxHeight: 'min(30dvh, 240px)', width: 'auto' }}
            />
            <div className={RY}>
              <button type="button" data-postpixelreset onClick={() => { finishPixel(false); startPixel(); }} className={LEEG}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t('post.pixelReset', 'Start again')}
              </button>
              <button type="button" data-postpixeldone onClick={() => finishPixel(true)} className={VUL}>
                <Check className="h-4 w-4" />
                {t('post.pixelKeep', 'Done')}
              </button>
            </div>
          </>
        )}
      </div>
    )}

    {/* ── Taking something small out ─────────────────────────────────
 
        The owner, 7 October 2026: *"magic eraser"*. This grows the pixels
        around a gap inwards over it, which is arithmetic and costs us
        nothing. It is not *"magic grab"* — nothing here imagines what
        was behind — and the sentence under the button says so, because
        the difference is the whole of what somebody should expect.
 
        The painting happens on the WHOLE picture rather than on the
        cropped preview: she can see what she is covering, and the map
        from thumb to pixel is one scale instead of the inverse of a
        crop. */}
    {picture && (
      <div
        data-postrub
        className="space-y-2 rounded-xl border p-3"
        style={asRoom
          ? { borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(52,211,153,0.06)', boxShadow: RAISE }
          : { borderColor: 'rgb(39,39,42)', background: 'rgba(24,24,27,0.5)' }}
      >
        <div className="space-y-2">
          <p className={MIKRO}>{t('post.rub', 'Take something out')}</p>
          <div className={RY3}>
            <button
              type="button"
              data-postrubmode
              aria-pressed={rubbing}
              onClick={() => {
                setSaid('');
                smear.current = null;
                setSmeared(0);
                setRubbing((was) => !was);
              }}
              className={rubbing ? VUL.replace('w-full ', '') : LEEG}
            >
              {rubbing ? t('post.rubStop', 'Done painting') : t('post.rubStart', 'Paint over it')}
            </button>
            {/* Always drawn while painting, disabled until there is
                something to do.
 
                They appeared when the first stroke landed, which pushed
                the canvas down the page — so the second stroke went
                somewhere other than where the thumb was aimed. A control
                that moves the thing you are working on, the moment you
                start working on it, is the worst kind of layout shift:
                it only happens once you are committed. */}
            {rubbing && (
              <>
                <button
                  type="button"
                  data-postrubgo
                  disabled={smeared <= 0}
                  onClick={rubOut}
                  className={`${LEEG} disabled:opacity-40`}
                >
                  {t('post.rubGo', 'Take it out')}
                </button>
                <button
                  type="button"
                  data-postrubclear
                  disabled={smeared <= 0}
                  onClick={() => { smear.current = null; setSmeared(0); drawRub(); }}
                  className={`${LEEG} disabled:opacity-40`}
                >
                  {t('post.rubClear', 'Start the painting again')}
                </button>
              </>
            )}
            {whole && !rubbing && (
              <button
                type="button"
                data-postrubback
                onClick={() => { setPicture(whole); setWhole(null); setSaid(''); }}
                className={LEEG}
              >
                {t('post.cutBack', 'Put it back')}
              </button>
            )}
          </div>
        </div>

        {rubbing && (
          <>
            <canvas
              ref={rubCanvas}
              data-postrubcanvas
              onPointerDown={(event) => {
                rubbingNow.current = true;
                /* A new stroke starts from nowhere, or lifting the thumb
                   and putting it down somewhere else would paint a line
                   across everything in between. */
                lastRub.current = null;
                event.currentTarget.setPointerCapture(event.pointerId);
                rubAt(event);
              }}
              onPointerMove={(event) => { if (rubbingNow.current) rubAt(event); }}
              onPointerUp={(event) => {
                rubbingNow.current = false;
                lastRub.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerCancel={() => { rubbingNow.current = false; lastRub.current = null; }}
              className="w-full rounded-xl border border-zinc-800"
              style={{ touchAction: 'none', cursor: 'crosshair' }}
            />
            <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
              {smeared > TOO_MUCH
                ? t('post.rubTooMuch', 'That is too much of the picture to take out this way. This grows the edges of a gap inwards, which works for something small.')
                : t('post.rubHow', 'Paint over the whole thing you want gone \u2014 every bit of it, or the parts you miss grow back. It works best against a plain wall, the sky or grass. Against a pattern it smudges.')}
            </p>
          </>
        )}

        {!rubbing && (
          <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
            {t('post.rubWhat', 'Grows the picture around a gap inwards over it. Good for a bin, a sign or a stranger at the edge; it cannot imagine what was behind something.')}
          </p>
        )}
      </div>
    )}

    {/* ── The third way, under the two that are quicker ─────────────────
 
        Order on purpose: the model first because it is one press, the
        eraser second because it is two, and this last because it is the
        slow one. Somebody who reaches the bottom of this bench is somebody
        the first two could not help, which is exactly who this is for. */}
    {traceStart}

    {/* ── Making a small picture bigger ────────────────────────────────
 
        Only when it IS small, which is the whole reason this exists. A
        photograph off a phone is already four times the size of any post,
        and offering to enlarge it would be offering to make a file four
        times larger for nothing. A picture smaller than the post is the
        case somebody actually has — something saved off a message, a logo,
        an old photograph — and it is the case where the post comes out
        soft and nobody can say why. */}
    {picture && (() => {
      const of = sizeOf(picture);
      if (of.width >= size.width && of.height >= size.height) return null;
      return (
        <div className="space-y-2">
          <p className={MIKRO}>{t('post.makeBigger', 'Make it bigger')}</p>
          <p className="text-[12px] leading-relaxed text-zinc-500">
            {t('post.makeBiggerWhy', 'This picture is')}
            {` ${of.width}\u00d7${of.height}, `}
            {t(
              'post.makeBiggerThan',
              'which is smaller than the post. Enlarging it stops it coming out soft \u2014 it cannot add detail that was never there, and nothing here calls that an upscaler.',
            )}
          </p>
          <div className={plain ? RY : RY3}>
            {(plain ? BIGGER.filter((times) => times === 2) : BIGGER).map((times) => (
              <button
                key={times}
                type="button"
                data-postbigger={times}
                disabled={tooBig(of, times)}
                onClick={() => enlargeIt(times)}
                className={`${LEEG} disabled:opacity-40`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {plain ? t('post.biggerPlain', 'Bigger') : `${times}\u00d7`}
              </button>
            ))}
          </div>
        </div>
      );
    })()}
    </div>
  );

  const frameBench = (
    <div className="space-y-4">
    {/* ── The shape, first, because it changes everything under it ───── */}
    <div>
      <p className={MIKRO}>{t('post.shape', 'Shape')}</p>
      <div className={`mt-2 ${RY}`}>
        {POST_SIZES.map((one) => (
          <button
            key={one.id}
            type="button"
            /* Named for the walks. The shape is the one thing in this room
               that can be read straight off the canvas, so it is what a
               probe checks a template really set — and it could only find
               the button by the words on it, which are translated. */
            data-postshape={one.id}
            aria-pressed={one.id === size.id}
            onClick={() => {
              shapeChosen.current = true;
              setSize(one);
            }}
            className={`${LEEG} ${one.id === size.id ? GEKIES : ''}`}
          >
            {one.name} · {one.width}×{one.height}
          </button>
        ))}
        {/* The photograph's own size — the canvas it would have had if it
            had come in on an empty one. Wide or tall, nothing cut off. */}
        {picture && (
          <button
            type="button"
            data-postshape="own"
            aria-pressed={size.id === ownSizeOf(picture.naturalWidth, picture.naturalHeight).id}
            onClick={() => {
              setSize(ownSizeOf(picture.naturalWidth, picture.naturalHeight));
              setCrop(MIDDLE);
              setView({ scale: 1, x: 0, y: 0 });
            }}
            className={`${LEEG} ${size.id === ownSizeOf(picture.naturalWidth, picture.naturalHeight).id ? GEKIES : ''}`}
          >
            {t('post.ownSize', 'Its own size')} · {ownSizeOf(picture.naturalWidth, picture.naturalHeight).width}×{ownSizeOf(picture.naturalWidth, picture.naturalHeight).height}
          </button>
        )}
      </div>
      {/* ── Smart crop ───────────────────────────────────────────────────
          The owner, 18 October 2026: *"'n dimensions blokke vir smart
          cropping."* Every shape as a block over her photo, already standing
          over the part worth keeping; one press makes the post that shape
          with the photo placed there, and she can still drag it after. */}
      {picture && (
        <div className="mt-3" data-postsmart>
          <p className={MIKRO}>{t('post.smartCrop', 'Smart crop')}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
            {t('post.smartCropWhat', 'Each shape, placed over the part of your photo worth keeping. Tap one to use it — you can still drag the photo after.')}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {POST_SIZES.map((one) => {
              const pictureAspect = picture.naturalWidth / Math.max(1, picture.naturalHeight);
              const frameAspect = one.width / one.height;
              const smart = interest ? bestCrop(interest, pictureAspect, frameAspect) : MIDDLE;
              const on = size.id === one.id && crop.basis === 'fill' && crop.zoom === 1 && crop.x === smart.x && crop.y === smart.y;
              return (
                <button
                  key={one.id}
                  type="button"
                  data-postsmartcrop={one.id}
                  aria-pressed={on}
                  onClick={() => {
                    shapeChosen.current = true;
                    setSize(one);
                    setCrop(smart);
                    setView({ scale: 1, x: 0, y: 0 });
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-[10px] font-bold ${on ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
                >
                  <SmartTile picture={picture} window={windowOf(smart, pictureAspect, frameAspect)} tall={picture.naturalHeight / Math.max(1, picture.naturalWidth)} />
                  <span className="leading-tight">{one.name}</span>
                  <span className="font-mono text-[9px] text-zinc-500">{one.width}×{one.height}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className={`mt-2 ${RY}`}>
        <button
          type="button"
          onClick={() => setShowSizeModal(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-teal-500/50 bg-teal-500/10 px-3 text-sm font-bold text-teal-300 hover:brightness-110 active:scale-95 transition-all text-center"
        >
          <Maximize2 className="h-4 w-4 text-teal-400" />
          {t('size.customOrStandard', 'Standard & Custom Sizes')}
        </button>
        <button
          type="button"
          onClick={() => setShowTemplatesModal(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-500/10 px-3 text-sm font-bold text-purple-300 hover:brightness-110 active:scale-95 transition-all text-center"
        >
          <LayoutTemplate className="h-4 w-4 text-purple-400" />
          {t('stpl.openTemplates', 'Templates & Starter Packs')}
        </button>
      </div>
      <p className="pt-2 text-[13px] leading-relaxed text-zinc-500">{size.what[lang]}</p>
    </div>

    {/* ── Cutting it down, with the frame and not with the picture ──────
 
        The owner, 7 October 2026: *"Ek dink wel cutting moet by The frame wees
        nie picture nie. Jy moet prakties dink oor waar funksies hoort."*
 
        It was on the picture's bench, on the reasoning that a crop changes
        the photograph itself while the frame only chooses what shows through
        — which is true, and is the wrong way to decide. Somebody looking for
        a crop looks where the shapes and the framing are, because that is
        what they are thinking about. The picture's bench is where you go to
        bring one in or take something out of it.
 
        The reasoning that put it in the wrong place was about what the code
        does. Where a tool goes is about what the person is doing. */}
    {/* ── Straightening it, which is a framing question ────────────────
 
        With the shape and the crop, because somebody whose photograph came
        out of the camera sideways is thinking about how it SITS in the
        frame — the same thought as choosing a shape. It changes the
        photograph, as the crop does, and it is one press to take back. */}
    {picture && (
      <div className="space-y-2">
        <p className={MIKRO}>{t('post.turn', 'Turn it')}</p>
        <div className={RY3}>
          <button type="button" data-postturnleft onClick={() => turnIt(-1)} className={LEEG}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t('post.turnLeft', 'Left')}
          </button>
          <button type="button" data-postturnright onClick={() => turnIt(1)} className={LEEG}>
            <RotateCw className="h-3.5 w-3.5" />
            {t('post.turnRight', 'Right')}
          </button>
          <button type="button" data-postflip onClick={flipIt} className={LEEG}>
            <FlipHorizontal className="h-3.5 w-3.5" />
            {t('post.flip', 'Mirror')}
          </button>
        </div>
      </div>
    )}

    {cropStart}
    {/* ── Which part of it shows ─────────────────────────────────────
 
        The owner, 7 October 2026, having found the screen: *"Waar edit ek 'n
        foto?"* This is the half that was missing. A phone photograph is
        4:3 and a story is 9:16, so something always falls off — and
        until now the app chose what, every time, with no way to argue.
 
        Only drawn when there is a picture. A zoom slider over an empty
        frame is a control for nothing. */}
    {picture && at && (
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <p className={MIKRO}>{t('post.framing', 'What shows')}</p>

        <div className={RY3}>
          {(['fill', 'whole'] as const).map((one) => (
            <button
              key={one}
              type="button"
              data-postbasis={one}
              aria-pressed={crop.basis === one}
              onClick={() => setCrop((was) => ({ ...was, basis: one, x: 0, y: 0 }))}
              className={`${LEEG} ${crop.basis === one ? GEKIES : ''}`}
            >
              {one === 'fill'
                ? t('post.fill', 'Fill the frame')
                : t('post.whole', 'The whole picture')}
            </button>
          ))}
          {/* Back to the middle, at the basis. Everything a drag and a
              slider can get wrong, in one press — which is what somebody
              wants after pushing a picture somewhere they did not mean. */}
          <button
            type="button"
            data-postcentre
            /* At one, not at the floor: this said `ZOOM_MIN`, which was one
               until shrinking was allowed and then quietly became a fifth —
               so "Centre it" shrank the picture to a stamp. */
            onClick={() => setCrop((was) => ({ ...was, zoom: 1, x: 0, y: 0 }))}
            className={LEEG}
          >
            {t('post.centre', 'Centre it')}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[12px] text-zinc-400">
            {t('post.closer', 'How close')}
            {' · '}
            <span data-postzoomnow>{`${crop.zoom.toFixed(2)}x`}</span>
          </span>
          <input
            type="range"
            data-postzoom
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={crop.zoom}
            onChange={(event) => setCrop((was) => zoomTo(was, Number(event.target.value)))}
            className="w-full"
            aria-label={t('post.closer', 'How close')}
          />
        </label>

        <p className="text-[12px] leading-relaxed text-zinc-500">
          {crop.basis === 'whole'
            ? t('post.dragLoose', 'The whole picture is loose: drag it anywhere in the frame, pull a corner of its ring to make it bigger or smaller, or slide How close.')
            : movable
              ? t('post.dragIt', 'Drag the picture above to choose what shows.')
              : t('post.noDrag', 'The whole picture fits, so there is nothing to move. Go closer to choose a part of it.')}
        </p>

        {gaps && (
          <p data-postgap className="text-[12px] leading-relaxed text-amber-300">
            {t('post.gap', 'Some of the frame is background rather than photograph. That is what “the whole picture” does — with the background off, it is the picture on nothing.')}
          </p>
        )}
      </div>
    )}
    </div>
  );

  /* ── Smart lighting: measured, not guessed ──────────────────────────
     A small copy of the photograph is read for how dark it is, and the
     look that lights it goes on — then the line, so she sees what it did. */
  const lightUp = (): void => {
    if (!picture) return;
    const probe = document.createElement('canvas');
    probe.width = 96;
    probe.height = 96;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return;
    pctx.drawImage(picture, 0, 0, 96, 96);
    setLookNow(smartLight(lightnessOf(pctx.getImageData(0, 0, 96, 96).data)));
    setCompare(0.5);
  };

  /* Show the line, or take it away. Only when there is a look to compare. */
  /**
   * Choose the part Adjust and Filters change: all of it, the person, the
   * background behind them, what was painted in Magic, or a thing Grab
   * found. The person comes from the same on-phone model as Remove the
   * background, asked once and kept for this photograph.
   */
  const selectPart = async (what: SelectWhat | null, thing?: Pick): Promise<void> => {
    if (!what || !picture) { setSelection(null); return; }
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    const of = picture;
    setToneAll(false);
    setLayerOn('photo');
    if (what === 'painted') {
      if (!magicStrokes.length) {
        setSaid(t('post.selectPaintFirst', 'Paint the part with the Magic brush first, then choose it here.'));
        return;
      }
      setSelection({ of, mask: maskFromStrokes(magicStrokes, magicSize, wide, tall), what });
      setSaid('');
      return;
    }
    if (what === 'thing') {
      const one = thing ? things.current.get(thing.id) : undefined;
      if (!one?.mask) {
        setSaid(t('post.thingNoMask', 'The engine found that one but did not send its shape, so it cannot be lifted out cleanly. Try Find objects and text again, or use Cut out a shape and draw round it.'));
        return;
      }
      const shape = new Image();
      shape.onload = () => {
        setSelection({ of, mask: maskFromBox(shape, one.box, wide, tall), what });
        setPicking(false);
        setPicked(null);
        setFound(null);
        setBench('tone');
        setSaid(t('post.selectThingDone', 'Only that thing changes now — move the sliders, or pick a filter.'));
      };
      shape.src = `data:image/png;base64,${one.mask}`;
      return;
    }
    let grey = lastMask.current?.of === picture ? lastMask.current.mask : null;
    if (!grey) {
      setSelecting(true);
      setWorking('long');
      try {
        const cut = await cutOut(picture, undefined, edgeOf(edge));
        if (!cut.ok) {
          setSaid(t('post.selectNobody', 'No person could be found in this photo to choose. Paint the part with the Magic brush instead.'));
          return;
        }
        grey = cut.mask;
        lastMask.current = { mask: cut.mask, of: picture };
      } finally {
        setSelecting(false);
        setWorking(null);
      }
    }
    const mask = maskFromGrey(grey, wide, tall, what === 'background');
    if (shareSelected(mask) < 0.005) {
      setSaid(t('post.selectNothing', 'Nothing of the photo is in that part, so nothing would change.'));
      return;
    }
    setSelection({ of, mask, what });
    setSaid('');
  };
  const chosenNow: SelectWhat | null = selection && selection.of === picture ? selection.what : null;
  /* The row in Adjust and Filters that says what changes. */
  const selectRow = picture ? (
    <div className="space-y-1.5" data-postselect={chosenNow ?? 'all'}>
      <p className={MIKRO}>{t('post.selectTitle', 'What it changes')}</p>
      <div className="flex flex-wrap gap-1.5">
        {([
          [null, t('post.selectAll', 'The whole photo')],
          ['person', t('post.selectPerson', 'The person')],
          ['background', t('post.selectBehind', 'The background')],
          ['painted', t('post.selectPainted', 'What I painted')],
        ] as const).map(([what, label]) => (
          <button
            key={what ?? 'all'}
            type="button"
            data-postselectpart={what ?? 'all'}
            aria-pressed={chosenNow === what}
            disabled={selecting}
            onClick={() => void selectPart(what)}
            className={`min-h-[44px] rounded-full border px-3 text-xs font-bold disabled:opacity-50 ${chosenNow === what ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
          >
            {label}
          </button>
        ))}
        {chosenNow === 'thing' && (
          <span className={`inline-flex min-h-[44px] items-center rounded-full border px-3 text-xs font-bold ${GEKIES}`}>
            {t('post.selectThing', 'The thing from Grab')}
          </span>
        )}
      </div>
    </div>
  ) : null;

  const compareButton = (
    <button
      type="button"
      data-postcompare
      aria-pressed={compare !== null}
      disabled={!touched(lookNow)}
      onClick={() => setCompare((was) => (was === null ? 0.5 : null))}
      className={`${LEEG} ${compare !== null ? GEKIES : ''} disabled:opacity-40`}
    >
      <Columns2 className="h-3.5 w-3.5" />
      {t('post.compare', 'Before | after')}
    </button>
  );

  const toneBench = (
    <div className="space-y-4">
    {/* ── Solid, or see-through ──────────────────────────────────────
        The owner, 21 October 2026: "video en photo editor kort 'n
        transparency slider om 'n foto solied of ligter te maak." The photo's
        opacity was already there — in Layers, once the photo layer was
        picked — which is two presses from where anybody looks for it. The
        same value, here at the top of Adjust. */}
    {picture && (
      <label data-postphotoalpha className="block space-y-1.5 rounded-xl border border-zinc-800 p-3">
        <span className="flex items-center justify-between text-xs font-bold text-zinc-200">
          {t('post.photoAlpha', 'Transparency')}
          <span className="tabular-nums text-zinc-400">
            {photoAlpha >= 0.995 ? t('post.photoSolid', 'Solid') : `${Math.round((1 - photoAlpha) * 100)}% ${t('post.photoSeeThrough', 'see-through')}`}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={Math.round((1 - photoAlpha) * 100)}
          onChange={(event) => setPhotoAlpha(1 - Number(event.target.value) / 100)}
          aria-label={t('post.photoAlpha', 'Transparency')}
          className="h-11 w-full accent-emerald-400"
        />
        <span className="flex justify-between text-[11px] text-zinc-500">
          <span>{t('post.photoSolid', 'Solid')}</span>
          <span>{t('post.photoLighter', 'Lighter')}</span>
        </span>
      </label>
    )}
    {/* ── How it reads ───────────────────────────────────────────────
 
        The owner, 7 October 2026, listing what a modern editor has: *"auto
        focus, blur ... Dit is alles code wat ons oor tyd kan develop om
        ons editing tools te upgrade."*
 
        This is the half of that list which runs on the phone for
        nothing. The other half — taking an item out and putting another
        in, a real upscaler, motion on a still — needs an engine and a
        price per use, and the price is hers.
 
        No "sharpen". A canvas filter has none, and raising contrast and
        calling it focus would be a control that lies about what it did:
        nothing recovers a photograph that was soft when it was taken.
        `AUTO` is honest about being a lift.

        Shown with no photograph too. The owner, 16 October 2026: *"Adjust se
        funksies kom nie uit nie"* — on a template or a grid there is no one
        photograph, the panel was empty, and the tool looked broken. Then it
        changes the whole picture, which is all there is to change. */}
    {(
      <div
        data-postlook
        className="space-y-3 rounded-xl border p-3"
        style={asRoom
          ? { borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(52,211,153,0.06)', boxShadow: RAISE }
          : { borderColor: 'rgb(39,39,42)', background: 'rgba(24,24,27,0.5)' }}
      >
        {/* Which layer this changes — the photo alone, or the whole
            picture with its words and shapes. Chosen here or in Layers. */}
        <div className={RY} data-postlooktarget={toneAll ? 'all' : 'photo'}>
          {picture && <button
            type="button"
            data-postlookon="photo"
            aria-pressed={!toneAll}
            onClick={() => { setToneAll(false); setLayerOn('photo'); }}
            className={`${LEEG} ${!toneAll ? GEKIES : ''}`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {t('post.lookOnPhoto', 'The photo')}
          </button>}
          <button
            type="button"
            data-postlookon="all"
            aria-pressed={toneAll}
            onClick={() => { setToneAll(true); setLayerOn('all'); }}
            className={`${LEEG} ${toneAll ? GEKIES : ''}`}
          >
            <Layers className="h-3.5 w-3.5" />
            {t('post.lookOnAll', 'All layers')}
          </button>
        </div>
        {selectRow}
        <div className="space-y-2">
          <p className={MIKRO}>{t('post.look', 'How it reads')}</p>
          <div className={RY}>
            <button
              type="button"
              data-postauto
              onClick={() => { setLookNow(AUTO); setCompare(0.5); }}
              className={LEEG}
            >
              {t('post.auto', 'Lift it')}
            </button>
            <button
              type="button"
              data-postsmartlight
              disabled={!picture}
              onClick={lightUp}
              className={`${LEEG} disabled:opacity-40`}
            >
              <Sun className="h-3.5 w-3.5" />
              {t('post.smartLight', 'Smart light')}
            </button>
            <button
              type="button"
              data-postplain
              disabled={!touched(lookNow)}
              onClick={() => setLookNow(PLAIN)}
              className={`${LEEG} disabled:opacity-40`}
            >
              {t('post.asShot', 'As it came')}
            </button>
            {compareButton}
          </div>
        </div>

        {/* ── Sharpening, which is not one of the sliders ───────────────
 
            With the looks, because somebody who thinks a photograph is a
            bit soft is thinking about how it READS — the same thought as
            brightness and contrast. Not a slider beside them, though: the
            sliders are live and free, redrawn on every drag, and this one
            writes a new photograph and costs a step of history. Three
            rungs and a press, so it is clear which kind of thing it is. */}
        <div className="space-y-2">
          <p className={MIKRO}>{t('post.sharpen', 'Sharper')}</p>
          <div className={plain ? RY : RY3}>
            {(plain ? ['normal'] as Sharpness[] : Object.keys(SHARPEN) as Sharpness[]).map((how) => (
              <button
                key={how}
                type="button"
                data-postsharpen={how}
                onClick={() => sharpenIt(how)}
                className={LEEG}
              >
                {plain
                  ? t('post.sharpPlain', 'Sharpen it')
                  : how === 'gentle'
                    ? t('post.sharpGentle', 'A little')
                    : how === 'normal'
                      ? t('post.sharpNormal', 'Normal')
                      : t('post.sharpStrong', 'A lot')}
              </button>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-zinc-500">
            {t(
              'post.sharpenWhy',
              'Brings out edges that came out soft. It cannot put back detail that was never in the photograph \u2014 too much turns grain into speckle, and the way back is one press.',
            )}
          </p>
        </div>

        {([
          ['bright', t('post.bright', 'Brightness')],
          ['contrast', t('post.contrast', 'Contrast')],
          ['colour', t('post.colour', 'Colour')],
          ['warmth', t('post.warmth', 'Warmth')],
          ['blur', t('post.blur', 'Blur')],
        ] as const).map(([key, name]) => (
          <label key={key} className="block space-y-1">
            <span className="text-[12px]" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
              {name}
            </span>
            <input
              type="range"
              data-postlookslider={key}
              min={RANGES[key].min}
              max={RANGES[key].max}
              step={RANGES[key].step}
              value={lookNow[key]}
              onChange={(event) => setLookNow((was) => ({ ...was, [key]: Number(event.target.value) }))}
              className="h-11 w-full"
              aria-label={name}
            />
          </label>
        ))}

        <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
          {t('post.lookFree', 'All of this happens on your own device and uses no credits, however many times you change it.')}
        </p>
      </div>
    )}
    </div>
  );

  const readBench = (
    <div className="space-y-4">
    {/* ── The words already in the picture ───────────────────────────
 
        The owner, 7 October 2026: *"grab text"*, in the list of what a
        modern editor has. The engine is Tesseract compiled to
        WebAssembly and it runs on her own phone — it calls nobody, needs
        no key, and costs us nothing however many times it is pressed.
        See `lib/ocr.ts` for why every file is served from this app and
        not a CDN.
 
        It reads the PICTURE as it was brought in, not the canvas: the
        canvas carries her words, her crop and her blur, and feeding
        those back to an engine that reads letters would have it read its
        own output. */}
    {picture && (
      <div
        data-postgrab
        className="space-y-2 rounded-xl border p-3"
        style={asRoom
          ? { borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(52,211,153,0.06)', boxShadow: RAISE }
          : { borderColor: 'rgb(39,39,42)', background: 'rgba(24,24,27,0.5)' }}
      >
        <div className="space-y-2">
          <p className={MIKRO}>{t('post.grab', 'Words in the picture')}</p>
          {/* ── Said on the screen, not behind the mark ──────────────────
 
              The owner asked what this was twice — *"Ek weet nogsteeds nie wat is
              die read it funksie in die photo editor nie"* — and both times
              the answer was sitting behind the question mark on the bar. A
              tool nobody can name is a tool nobody presses, so the sentence
              is printed. One line, above the two buttons, where somebody
              deciding whether to press is already looking. */}
          <p
            className="text-[12px] leading-relaxed"
            style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}
          >
            {t(
              'post.grabWhy',
              'Photograph a poster, a sign, a label or a page, and this turns the words printed in it into text — to put on the picture, or to copy out. It all happens on your own phone.',
            )}
          </p>
          <div className="grid grid-flow-col auto-cols-fr gap-2">
            {(['eng', 'afr'] as const).map((one) => (
              <button
                key={one}
                type="button"
                data-postgrablang={one}
                disabled={reading !== null}
                onClick={() => void grabText(one)}
                className={`${LEEG} disabled:opacity-40`}
              >
                {reading !== null
                  ? `${Math.round(reading * 100)}%`
                  : one === 'eng'
                    ? t('post.grabEn', 'Read English')
                    : t('post.grabAf', 'Read Afrikaans')}
              </button>
            ))}
          </div>
          {/* ── And the things in it, which is the other half of "Grab" ──
 
              Charged, unlike the reader above it, and the button says so
              before it is pressed. The engine draws nothing — it reads the
              picture and answers where things are — and one press finds
              everything rather than charging per thing. The price is
              `CREDITS.grab`, read onto the button, never typed here. */}
          <button
            type="button"
            data-postthingsgo
            disabled={!picture || looking}
            onClick={() => { void findThings(); }}
            className={`${VUL} disabled:opacity-60`}
          >
            {looking
              ? t('post.thingsLooking', 'Looking…')
              : t('post.thingsGoAll', 'Find objects and text \u00b7 {n} credits')
                .replace('{n}', String(CREDITS.grab))}
          </button>
          {/* ── And the same reading, tappable ────────────────────

              The owner, 8 October 2026: *"dat die masjien self objekte en text
              identifiseer wat dan highlight en dan kan die klient op die
              objekte of text click wat hulle graag wil grab, rondskuif, of
              delete."*

              Beside the two reading buttons and not instead of them. They
              answer a different question: those two hand back the whole
              reading as text to copy, this one puts a box round each line
              so she can take one. Somebody photographing a page wants the
              first; somebody fixing a poster wants the second. */}
          <button
            type="button"
            data-postfindwords
            disabled={reading !== null}
            onClick={() => void findLines(grabLang)}
            className={`${LEEG} disabled:opacity-40`}
          >
            <ScanText className="h-3.5 w-3.5" />
            {reading !== null
              ? `${Math.round(reading * 100)}%`
              : t('post.findWordsPhone', 'Or find words on my phone (less exact)')}
          </button>

          <p
            className="text-[12px] leading-relaxed"
            style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}
          >
            {t(
              'post.findWordsWhy',
              'Puts a box round every line it can read. Tap one to take it out of the photograph, or lift it onto the picture. Whatever you lift lands under Words as real text — each line on its own, so you can retype it, drag it anywhere, or throw it away.',
            )}
          </p>
        </div>

        {grabbed !== null && grabbed.length > 0 && (
          <>
            <textarea
              data-postgrabbed
              readOnly
              rows={Math.min(6, grabbed.split('\n').length + 1)}
              value={grabbed}
              className={`${VELD} font-mono text-[12px]`}
            />
            <div className={RY3}>
              <button
                type="button"
                data-postgrabuse
                onClick={grabEvery}
                className={LEEG}
              >
                {t('post.grabUse', 'Put them on, each on its own')}
              </button>
              <button
                type="button"
                data-postgrabcopy
                onClick={() => {
                  /* Said either way: a copy press with no answer looks like a
                     press that did nothing, and a refused clipboard (an older
                     browser, a page without permission) is exactly that. */
                  const failed = (): void => setSaid(t('post.copyFailed', 'That could not be copied. Hold your finger on the words above and copy them from there.'));
                  if (!navigator.clipboard) { failed(); return; }
                  navigator.clipboard.writeText(grabbed)
                    .then(() => setSaid(t('post.copied', 'Copied.')))
                    .catch(failed);
                }}
                className={LEEG}
              >
                {t('post.grabCopy', 'Copy it')}
              </button>
            </div>
          </>
        )}

        {grabbed !== null && grabbed.length === 0 && (
          <p className="text-[12px] leading-relaxed text-amber-300" data-postgrabnone>
            {t('post.grabNone', 'No words could be made out in this picture. It reads printed text well and handwriting badly.')}
          </p>
        )}

        <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
          {t('post.grabFree', 'The reading happens on your own device, so it uses no credits. The first time takes a moment while the reader downloads.')}
        </p>
      </div>
    )}
    </div>
  );

  const textBench = (
    <div className="space-y-4">
    {/* ── Somewhere to start ────────────────────────────────────────────
 
        The owner's list, 7 October 2026: *"Video, etc templates."* On the words'
        bench, because a template is mostly words in the right places, and
        because this is the bench somebody opens when they have a picture and
        no idea what to put on it.
 
        First on it, above the empty text box, since the whole point is to be
        met before the blank page is. */}
    <div className="space-y-2">
      {/* ── The neon words: one press, one lit line ─────────────────────
          The owner, 13 October 2026: "amazing futuristic text … Neon,
          futuristic, phantasm". Each chip is drawn in its own face, ink
          and glow, so the chip is a sample of the line it adds. */}
      {/* ── Title styles: album art's six looks, as type ──────────────
          The owner, 14 October 2026: *"ons kort goeie text templates, vat
          dieselfde in album art se ai art."* A title and the line under it,
          in one press, in the look the cover can be drawn in. */}
      <p className={MIKRO}>{t('post.titleStyles', 'Title styles')}</p>
      <div className={RY} data-posttitlestyles>
        {TITLE_STYLES.map((one) => {
          const face = faceOf(one.title.face);
          const halo = glowOf(one.title.glow).halo;
          return (
            <button
              key={one.id}
              type="button"
              data-posttitlestyle={one.id}
              onClick={() => setWords((was) => {
                /* A second title style goes under the first, not on it. */
                const title: Words = {
                  id: freshId(), text: t(one.title.says[0], one.title.says[1]), face: one.title.face,
                  spot: 'middle', ink: one.title.ink, glow: one.title.glow, letterGap: one.title.letterGap,
                  ...(was.length ? { at: freeRow(was, atOf('middle').y) } : {}),
                };
                const under: Words = {
                  id: freshId(), text: t(one.under.says[0], one.under.says[1]), face: one.under.face,
                  spot: 'bottom', ink: one.under.ink, glow: one.under.glow, letterGap: one.under.letterGap,
                  ...(was.length ? { at: freeRow([...was, title], (title.at ?? atOf('middle')).y + 0.12) } : {}),
                };
                return [...was, title, under];
              })}
              title={t(one.name[0], one.name[1])}
              aria-label={`${t(one.title.says[0], one.title.says[1])} \u2014 ${t(one.name[0], one.name[1])}`}
              className={`${LEEG} border-white/15`}
              style={{ background: `linear-gradient(135deg, ${one.tile[0]}33, #000 60%, ${one.tile[1]}33)` }}
            >
              <span
                className="truncate text-sm"
                style={{
                  fontFamily: face.css, fontWeight: face.weight, color: one.title.ink, letterSpacing: `${one.title.letterGap * 0.4}em`,
                  textShadow: halo.length ? `0 0 8px ${halo[2]}, 0 0 16px ${halo[1]}` : undefined,
                }}
              >
                {t(one.title.says[0], one.title.says[1])}
              </span>
            </button>
          );
        })}
      </div>
      <p className={MIKRO}>{t('post.neonWords', 'Neon words')}</p>
      <div className={RY} data-postneonwords>
        {NEON_WORDS.map((one) => {
          const face = faceOf(one.face);
          const halo = glowOf(one.glow).halo;
          return (
            <button
              key={one.id}
              type="button"
              data-postneonword={one.id}
              onClick={() => setWords((was) => [...was, {
                id: freshId(), z: frontZ(marks, was), text: t(one.says[0], one.says[1]), face: one.face,
                spot: was.length === 0 ? 'middle' : 'top', ink: one.ink, glow: one.glow, letterGap: one.letterGap,
                /* Under the last line rather than on top of it (`freeRow`). */
                at: freeRow(was, atOf(was.length === 0 ? 'middle' : 'top').y),
              }])}
              className={`${LEEG} !bg-black border-white/15`}
              style={{
                fontFamily: face.css, fontWeight: face.weight, color: one.ink, letterSpacing: `${one.letterGap * 0.4}em`,
                textShadow: halo.length ? `0 0 8px ${halo[2]}, 0 0 16px ${halo[1]}, 0 0 28px ${halo[0]}` : undefined,
              }}
            >
              {t(one.says[0], one.says[1])}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t(
          'post.templatesWhy',
          'A shape, a look and the words already in place, for the thing you are actually posting. Change every part of it afterwards \u2014 none of it is locked.',
        )}
      </p>
    </div>

    {/* ── The words ─────────────────────────────────────────────────── */}
    {/* First of the columns under the photo once a line is touched: its
        controls are what she reached for. */}
    <div className="space-y-3" data-postwordsdesk style={wordOn ? { order: -1 } : undefined}>
      {words.length > 0 && (
        <>
          <button
            type="button"
            data-postmovewords
            onClick={() => { setMovingWords(true); setBench(null); setSaid(''); }}
            className={LEEG}
          >
            <Move className="h-3.5 w-3.5" />
            {t('post.moveWords', 'Move them on the picture')}
          </button>
          <p className="text-[12px] leading-relaxed text-zinc-500">
            {t(
              'post.dragWords',
              'This closes the panel so you can reach the words, then drag any line where you want it. The four buttons on each line are quick places to start.',
            )}
          </p>
        </>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className={MIKRO}>{t('post.words', 'Words')}</p>
        <button
          type="button"
          data-addwords
          onClick={() => setWords((was) => [...was, {
            id: freshId(), z: frontZ(marks, was), text: '', face: FACES[0].id, spot: was.length === 0 ? 'bottom' : 'top', ink: '#ffffff',
            /* A second, third and fourth line each get a row of their own,
               instead of all landing on the top spot in one pile. */
            at: freeRow(was, atOf(was.length === 0 ? 'bottom' : 'top').y),
          }])}
          className={`${LEEG} inline-flex items-center gap-1.5`}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('post.addWords', 'Add words')}
        </button>
      </div>

      {words.length === 0 && (
        <p className="text-[13px] leading-relaxed text-zinc-500">
          {t('post.noWordsYet', 'Nothing written yet. The words are drawn as real text, so they are spelt exactly as you type them.')}
        </p>
      )}

      {/* The line touched on the picture first, and marked: its controls are
          what she reached for (The owner, 15 October 2026). Pressing a card picks
          its line, so the ring shows which one these sliders move. */}
      {[...words].sort((a, b) => (a.id === wordOn ? -1 : b.id === wordOn ? 1 : 0)).map((one) => (
        <div
          key={one.id}
          data-postwordcard={one.id}
          data-postwordon={one.id === wordOn ? 'yes' : undefined}
          onPointerDown={() => { if (wordOn !== one.id) { setWordOn(one.id); setMarkOn(null); } }}
          className={`space-y-2 rounded-xl border p-3 ${one.id === wordOn ? 'border-emerald-400' : 'border-zinc-800'}`}
        >
          <label className="block">
            <span className={MIKRO}>{t('post.theWords', 'The words')}</span>
            <textarea
              rows={2}
              data-postthewords={one.id}
              value={one.text}
              onChange={(event) => setWords((was) => was.map((w) => (
                w.id === one.id ? { ...w, text: event.target.value } : w)))}
              className={VELD}
            />
          </label>
          <div className={RY}>
            {FACES.map((face) => (
              <button
                key={face.id}
                type="button"
                onClick={() => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, face: face.id } : w)))}
                /* At its own weight, so the chip is a sample and not a
                   label. A poster face shown at 700 is synthesised bold
                   in the button and drawn at 400 on the canvas — two
                   different shapes for one choice. */
                style={{ fontFamily: face.css, fontWeight: face.weight }}
                data-postface={face.id}
                aria-pressed={one.face === face.id}
                className={`${LEEG} ${one.face === face.id ? GEKIES : ''}`}
              >
                {t(`post.face.${face.id}`, face.name)}
              </button>
            ))}
            {SPOTS.map((spot) => (
              <button
                key={spot.id}
                type="button"
                data-postspot={spot.id}
                aria-pressed={one.spot === spot.id}
                /* And the position with it. The spots are presets for the
                   thing she can now drag, so pressing one has to MOVE the
                   line — a spot that changed a label and left the words
                   where a thumb had put them is a button that does
                   nothing. */
                onClick={() => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, spot: spot.id, at: atOf(spot.id) } : w)))}
                className={`${LEEG} ${one.spot === spot.id ? GEKIES : ''}`}
              >
                {t(`post.spot.${spot.id}`, spot.id)}
              </button>
            ))}
            {/* ── Something behind the line, so it can be read ───────────
 
                Every line is drawn with a soft shadow under it and a shadow
                loses to a bright sky and to a patterned wall, which is two
                of the three photographs anybody owns. `posttext.ts` carries
                the three. */}
            {BACKDROPS.map((how) => (
              <button
                key={how}
                type="button"
                data-postbehindwords={how}
                aria-pressed={(one.behind ?? 'none') === how}
                onClick={() => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, behind: how } : w)))}
                className={`${LEEG} ${(one.behind ?? 'none') === how ? GEKIES : ''}`}
              >
                {how === 'none'
                  ? t('post.backNone', 'Shadow only')
                  : how === 'shade'
                    ? t('post.backShade', 'Shade behind')
                    : t('post.backBar', 'Solid bar')}
              </button>
            ))}
            {/* ── The light it gives off ───────────────────────────────── */}
            {GLOWS.map((glow) => (
              <button
                key={glow.id}
                type="button"
                data-postglow={glow.id}
                aria-pressed={(one.glow ?? 'none') === glow.id}
                onClick={() => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, glow: glow.id } : w)))}
                className={`${LEEG} ${(one.glow ?? 'none') === glow.id ? GEKIES : ''}`}
                style={glow.halo.length ? { textShadow: `0 0 6px ${glow.halo[2]}, 0 0 14px ${glow.halo[1]}` } : undefined}
              >
                {t(glow.name[0], glow.name[1])}
              </button>
            ))}
            <input
              type="color"
              value={one.ink}
              onChange={(event) => setWords((was) => was.map((w) => (
                w.id === one.id ? { ...w, ink: event.target.value } : w)))}
              className="h-9 w-12 rounded border border-zinc-700 bg-zinc-950"
              aria-label={t('post.ink', 'Colour')}
            />
            <button
              type="button"
              onClick={() => dropWords(one.id)}
              aria-label={t('post.removeWords', 'Remove these words')}
              className={LEEG}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── The two spacings ──────────────────────────────────────
 
              The owner, 8 October 2026: *"Daar moet 'n ook 'n line spacing
              scroll bar wees, en spacing tussen die woorde self. Dus moet
              daar twee spacing bars wees."*
 
              Both are live sliders rather than presses, because both are
              things somebody nudges while looking at the picture — and
              neither costs anything, since both are drawn rather than
              written. The letter one is measured as well as drawn, so the
              type still fits the box it was fitted to. */}
          {/* ── Where the lines line up, and how big ───────────────────
              The owner, 15 October 2026: *"If I type a paragraph, it has to
              have the functions of center text or put it to the left, or
              right, or adjust the letter spacing, and line spacing."* Shown
              in simple mode too, with the two spacings, because she asked
              for them by name. The size is the same number the ring's
              corners pull. */}
          <div className="flex gap-1.5" data-postalign={one.id}>
            {(['left', 'center', 'right'] as const).map((side) => {
              const Icon = side === 'left' ? AlignLeft : side === 'right' ? AlignRight : AlignCenter;
              const label = side === 'left'
                ? t('post.alignLeft', 'Left')
                : side === 'right' ? t('post.alignRight', 'Right') : t('post.alignCenter', 'Centre');
              return (
                <button
                  key={side}
                  type="button"
                  data-postalignpick={side}
                  aria-pressed={(one.align ?? 'center') === side}
                  aria-label={label}
                  title={label}
                  onClick={() => setWords((was) => was.map((w) => (
                    w.id === one.id ? { ...w, align: side } : w)))}
                  className={`${LEEG} flex-1 justify-center ${(one.align ?? 'center') === side ? GEKIES : ''}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <div className={RY} data-postspacing={one.id}>
            <label className={`${KNOP} cursor-pointer flex-col !items-stretch !justify-center gap-1 py-1`}>
              <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {t('post.wordsSize', 'Size')}
                <span data-postwordssizenow className="tabular-nums">{Math.round((one.size ?? 1) * 100)}%</span>
              </span>
              <input
                type="range"
                data-postwordssize={one.id}
                min={WORDS_SIZE.min}
                max={WORDS_SIZE.max}
                step={0.05}
                value={one.size ?? 1}
                onChange={(event) => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, size: Number(event.target.value) } : w)))}
                className="h-5 w-full cursor-pointer accent-emerald-500"
                aria-label={t('post.wordsSize', 'Size')}
              />
            </label>
            <label className={`${KNOP} cursor-pointer flex-col !items-stretch !justify-center gap-1 py-1`}>
              <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {t('post.lineGap', 'Line spacing')}
                <span data-postlinegapnow className="tabular-nums">
                  {(one.lineGap ?? LINE_GAP.normal).toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                data-postlinegap={one.id}
                min={LINE_GAP.min}
                max={LINE_GAP.max}
                step={LINE_GAP.step}
                value={one.lineGap ?? LINE_GAP.normal}
                onChange={(event) => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, lineGap: Number(event.target.value) } : w)))}
                className="h-5 w-full cursor-pointer accent-emerald-500"
                aria-label={t('post.lineGap', 'Line spacing')}
              />
            </label>
            <label className={`${KNOP} cursor-pointer flex-col !items-stretch !justify-center gap-1 py-1`}>
              <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {t('post.letterGap', 'Letter spacing')}
                <span data-postlettergapnow className="tabular-nums">
                  {(one.letterGap ?? LETTER_GAP.normal).toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                data-postlettergap={one.id}
                min={LETTER_GAP.min}
                max={LETTER_GAP.max}
                step={LETTER_GAP.step}
                value={one.letterGap ?? LETTER_GAP.normal}
                onChange={(event) => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, letterGap: Number(event.target.value) } : w)))}
                className="h-5 w-full cursor-pointer accent-emerald-500"
                aria-label={t('post.letterGap', 'Letter spacing')}
              />
            </label>
          </div>
        </div>
      ))}
    </div>

    </div>
  );

  /* ── Templates, as a tool of their own ─────────────────────────────────
     The owner, 14 October 2026: *"die template pack wat gegee word moet actual
     templates kry"*. The room's own designs — the neon, synthwave, hologram
     and gold packs — were the first thing on the words bench, behind a
     button called Words. They are a button now, with the starter pack of
     posters, flyers and covers one press further. */
  const shownDesigns = designGroup === 'saved'
    ? savedDesigns
    : [...savedDesigns, ...DESIGNS].filter((one) => designGroup === 'all' || one.category === designGroup);
  const startsBench = (
    <div className="space-y-3" data-poststarts>
    {/* ── Photo templates ───────────────────────────────────────────────
        The owner, 16 October 2026: *"Hoe hou ons sulke cool templates?"* Whole
        designs with frames for her photos — `lib/postdesigns.ts` — and the
        ones she saves for everybody, under From FutureBox. */}
    <div className="space-y-2" data-postdesigns>
      <p className={MIKRO}>{t('post.designs', 'Photo templates')}</p>
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {([['all', t('post.designAll', 'All')], ...(savedDesigns.length ? [['saved', t('post.designSaved', 'From FutureBox')]] : []), ...DESIGN_CATEGORIES.map((one) => [one.id, designLabel(one, lang)])] as [string, string][]).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-postdesigngroup={id}
            aria-selected={designGroup === id}
            onClick={() => setDesignGroup(id as DesignCategory | 'all' | 'saved')}
            className={`h-11 rounded-full border px-3 text-xs font-bold ${designGroup === id ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 items-start gap-2 sm:grid-cols-4">
        {shownDesigns.map((one) => (
          <div key={one.id} className="relative">
            <button
              type="button"
              data-postdesign={one.id}
              onClick={() => startDesign(one)}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-950 p-1 text-[10px] font-bold text-zinc-300"
            >
              <DesignTile design={one} lang={lang} />
              <span className="w-full truncate text-center">{designLabel(one, lang)}</span>
            </button>
            {designOwner && one.saved && (
              <button
                type="button"
                data-postdesigndrop={one.id}
                aria-label={t('post.designDrop', 'Take this template out')}
                onClick={() => { void dropDesign(one.id); }}
                className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full border border-zinc-600 bg-black/70 text-zinc-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* ── The owner's half: this post, kept as a template for everybody ── */}
    {designOwner && (
      <div className="space-y-2 rounded-xl border border-emerald-700/50 p-2" data-postdesignkeep>
        <p className={MIKRO}>{t('post.designKeep', 'Save this post as a template')}</p>
        <input
          type="text"
          value={keeping.en}
          maxLength={60}
          data-postdesignname="en"
          onChange={(event) => setKeeping((was) => ({ ...was, en: event.target.value }))}
          placeholder={t('post.designNameEn', 'Name in English')}
          className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
        />
        <input
          type="text"
          value={keeping.af}
          maxLength={60}
          data-postdesignname="af"
          onChange={(event) => setKeeping((was) => ({ ...was, af: event.target.value }))}
          placeholder={t('post.designNameAf', 'Name in Afrikaans')}
          className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
        />
        <select
          value={keeping.category}
          data-postdesigncategory
          onChange={(event) => setKeeping((was) => ({ ...was, category: event.target.value as DesignCategory }))}
          className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
        >
          {DESIGN_CATEGORIES.map((one) => <option key={one.id} value={one.id}>{designLabel(one, lang)}</option>)}
        </select>
        {picture && (
          <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold text-zinc-300">
            <input
              type="checkbox"
              data-postdesignkeepart
              checked={keepArt}
              onChange={(event) => setKeepArt(event.target.checked)}
              className="h-5 w-5 accent-emerald-500"
            />
            {t('post.designKeepArt', 'Keep the picture on this post as the template\u2019s background')}
          </label>
        )}
        <button type="button" data-postdesignsave disabled={designBusy} onClick={() => { void keepDesign(); }} className={VUL}>
          {designBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
          {t('post.designSave', 'Save as a template for everyone')}
        </button>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {t('post.designKeepWhy', 'The frames are saved empty — your photos are never kept. Words, shapes, colours and the shape of the post are.')}
        </p>
        {/* ── Templates from her device ── */}
        <label className={`${LEEG} cursor-pointer`} data-postdesignupload>
          {designBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('post.designUpload', 'Upload templates from this device')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            disabled={designBusy}
            onChange={(event) => { void uploadTemplates(event.target.files); event.target.value = ''; }}
          />
        </label>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {t('post.designUploadWhy', 'Choose one or many pictures (PNG, JPG or WebP). Each becomes a template in the group chosen above, named after its file. Open one afterwards to add photo frames and words, then save it again. Only upload designs that are yours to share.')}
        </p>
        {designSaid && <p className="text-xs font-semibold text-emerald-300" data-postdesignsaid>{designSaid}</p>}
      </div>
    )}

    <div className="space-y-2">
      <p className={MIKRO}>{t('post.templates', 'Start from something')}</p>
      <div className={RY}>
        {TEMPLATES.map((one) => (
          <button
            key={one.id}
            type="button"
            data-posttemplate={one.id}
            onClick={() => startFrom(one)}
            title={t(one.what[0], one.what[1])}
            /* A starter pack wears its own look on the button — the owner, 13
               October 2026, with Google's tiles. The plain ones stay plain. */
            className={one.tile ? `${LEEG} !h-auto !items-start flex-col gap-1 py-3 text-left border-white/15` : `${LEEG} !h-auto flex-col gap-1 p-1.5`}
            style={one.tile ? { background: `linear-gradient(135deg, ${one.tile[0]}, #000 55%, ${one.tile[1]})` } : undefined}
          >
            {one.tile ? (
              <>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300">{t(one.what[0], one.what[1]).split(':')[0]}</span>
                <span
                  className="text-sm font-black tracking-tight text-white"
                  style={{ textShadow: `0 0 10px ${one.words[0]?.ink ?? '#fff'}, 0 0 22px ${one.tile[1]}` }}
                >
                  {t(one.words[0]?.says[0] ?? one.name[0], one.words[0]?.says[1] ?? one.name[1])}
                </span>
                <span className="text-[10px] text-zinc-300">{t(one.name[0], one.name[1])}</span>
              </>
            ) : (
              /* The plain ones as a picture too — the owner, 17 October 2026:
                 every template visual. The meerkat photo in the template's
                 light, its lines where they go, its name under it. */
              <>
                <span className="relative block h-16 w-full overflow-hidden rounded-lg">
                  <MeerkatThumb
                    className="absolute inset-0 h-full w-full !rounded-none"
                    filter={`brightness(${one.look?.bright ?? 1}) contrast(${one.look?.contrast ?? 1}) saturate(${one.look?.colour ?? 1})`}
                  />
                  {one.words.slice(0, 2).map((line, k) => (
                    <span
                      key={k}
                      className="absolute left-1/2 max-w-[94%] -translate-x-1/2 -translate-y-1/2 truncate text-center font-black leading-none"
                      style={{
                        top: line.spot === 'top' ? '18%' : line.spot === 'middle' ? '48%' : line.spot === 'lower' ? '70%' : '86%',
                        fontSize: k === 0 ? 11 : 8,
                        color: line.ink,
                        textShadow: line.glow ? `0 0 6px ${line.ink}, 0 0 1px #000` : '0 1px 2px rgba(0,0,0,0.9)',
                      }}
                    >
                      {t(line.says[0], line.says[1])}
                    </span>
                  ))}
                </span>
                <span className="text-[11px] font-semibold text-zinc-200">{t(one.name[0], one.name[1])}</span>
              </>
            )}
          </button>
        ))}
      </div>
      <button type="button" data-poststarterpack onClick={() => setShowTemplatesModal(true)} className={VUL}>
        <LayoutTemplate className="h-4 w-4" />
        {t('stpl.openTemplates', 'Templates & Starter Packs')}
      </button>
    </div>
    </div>
  );

  /* ── Shapes, as a tool of their own ────────────────────────────────── */
  /* ── Bring to life ─────────────────────────────────────────────────
     A thing cut out (`lib/stickerize.ts`) is shown where it sat, over the
     photograph, ready to peel. Where that is on the screen comes from the
     same placement the drawing uses, so it lands exactly on the thing. */
  const boxOnFrame = (cut: Cut): { left: number; top: number; width: number; height: number } => {
    const at = place(picture ?? { width: 1, height: 1 }, size, crop);
    return {
      left: at.left + cut.box.x * at.width,
      top: at.top + cut.box.y * at.height,
      width: cut.box.w * at.width,
      height: cut.box.h * at.height,
    };
  };
  const showCut = (cut: Cut): void => {
    const on = canvas.current;
    const room = stage.current;
    if (!picture || !on || !room) return;
    const frame = boxOnFrame(cut);
    const box = on.getBoundingClientRect();
    const roomBox = room.getBoundingClientRect();
    const per = box.width / size.width;
    /* The sticker is bigger than the thing by its white edge. */
    const w = (frame.width * per) / (1 - cut.edge.x * 2);
    const h = (frame.height * per) / (1 - cut.edge.y * 2);
    setLastCut(cut);
    /* Shown on the photo while it waits to be peeled, and nothing else: it
       leaves the device only as a layer, through the paid export. */
    const peelFace = cut.sticker;
    setPeel({
      cut,
      src: peelFace.toDataURL('image/png'),
      rect: {
        left: box.left - roomBox.left + frame.left * per - w * cut.edge.x,
        top: box.top - roomBox.top + frame.top * per - h * cut.edge.y,
        width: w,
        height: h,
      },
    });
  };

  /* Peeled: the sticker becomes a layer of its own, a little up and to the
     side of where it was, and the suggestion offers what it can become. */
  const peeled = (): void => {
    const now = peel;
    if (!now || !picture) { setPeel(null); return; }
    asPicture(now.cut.sticker, (img) => {
      const frame = boxOnFrame(now.cut);
      const w = frame.width / (1 - now.cut.edge.x * 2);
      const h = frame.height / (1 - now.cut.edge.y * 2);
      const id = freshId();
      setCells((was) => [...was, {
        id,
        x: Math.max(0, (frame.left - w * now.cut.edge.x) / size.width - 0.03),
        y: Math.max(0, (frame.top - h * now.cut.edge.y) / size.height - 0.03),
        w: w / size.width,
        h: h / size.height,
        image: img,
        crop: MIDDLE,
        z: frontZ(marks, words, was),
      }]);
      setCellOn(id);
      setPeel(null);
      if (offerIf('stickerPeeled')) setNudge('stickerPeeled');
    }, () => setPeel(null));
  };

  const pickNudge = (id: BecomeId, moment: IdeaMoment): void => {
    saidYes(moment);
    setNudge(null);
    setIdea(null);
    if (bench !== 'alive') openBench('alive');
    setBecomeStart((was) => ({ id, n: (was?.n ?? 0) + 1 }));
  };

  /* A new photo is offered what it can become, once, a moment after it
     opens; nothing is offered while another tool is out. */
  useEffect(() => {
    if (!picture || bench !== null) return undefined;
    const key = picture.src.slice(0, 120) + picture.naturalWidth;
    if (nudgedFor.current === key) return undefined;
    const soon = window.setTimeout(() => {
      nudgedFor.current = key;
      if (offerIf('photoOpened')) setNudge('photoOpened');
    }, 1600);
    return () => window.clearTimeout(soon);
  }, [picture, bench]);
  useEffect(() => {
    /* Pulling stays on with the bench shut: that is the point of it (see
       `aliveBench`). Another tool opened turns it off. */
    if (bench !== null && bench !== 'alive') setPulling(false);
    /* A tool opened opens its panel, even if the last one was tucked away. */
    setTucked(false);
  }, [bench]);
  useEffect(() => {
    if (!photoSay) return undefined;
    const gone = window.setTimeout(() => setPhotoSay(''), becomeBusy ? 60_000 : 6000);
    return () => window.clearTimeout(gone);
  }, [photoSay, becomeBusy]);

  const aliveBench = (
    <BecomeBench
      picture={picture}
      t={t}
      pulling={pulling}
      /* Pull it out is a tool you pick, and then the photo is yours: the
         bench shuts so the whole photograph shows, a line over it says
         what to do, and a tap on the thing pulls it out. The owner, 27
         October 2026: *"mens moet die window kan toe maak en die volle
         foto sien en dan kan click."* */
      onPulling={(on) => { setPulling(on); if (on) { setBench(null); setNudge(null); setIdea(null); } else setPhotoSay(''); }}
      tap={pullTap}
      start={becomeStart}
      onStarted={() => setBecomeStart(null)}
      lastCut={lastCut}
      onCut={showCut}
      onBusy={setBecomeBusy}
      onSay={setPhotoSay}
    />
  );

  const magicBench = (
    <div className="space-y-3" data-postmagic>
      {!picture ? (
        <p className="text-[13px]" style={{ color: INK_DIM }}>{t('post.magicNone', 'Bring a photo in first.')}</p>
      ) : (
        /* One column, not three. Under the photo on a phone each section of
           a tool is a column of its own, and the instruction, the size and
           the buttons were three — the buttons landed off the right edge of
           the screen, and the owner read it as the magic touch not working
           (15 October 2026). */
        <div className="space-y-3">
          <p className="text-[13px] font-semibold" style={{ color: magicStrokes.length ? '#39ff14' : INK }} data-postmagicsays>
            {magicStrokes.length
              ? t('post.magicReady', 'That part is painted. Paint more, or choose what the AI does.')
              : t('post.magicPaintOrAll', 'Brush over a part to change only that — or paint nothing, and the AI changes the whole photo.')}
          </p>
          <button
            type="button"
            data-postmagicbrush
            aria-pressed={brushOn}
            onClick={() => setBrushOn((was) => !was)}
            className={`${LEEG} ${brushOn ? GEKIES : ''}`}
          >
            <Paintbrush className="h-4 w-4" />
            {brushOn ? t('post.magicBrushOn', 'Brush on — sweep over the photo') : t('post.magicBrushOff', 'Brush')}
          </button>
          <label className="block space-y-1">
            <span className="text-[11px]" style={{ color: INK_DIM }}>{t('post.magicSize', 'Brush size')}</span>
            <input
              type="range" min={0.015} max={0.2} step={0.005}
              value={magicSize}
              data-postmagicsize
              onChange={(event) => setMagicSize(Number(event.target.value))}
              className="h-11 w-full accent-emerald-400"
            />
          </label>
          {magicStrokes.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                data-postmagicundo
                onClick={() => {
                  const left = magicStrokes.slice(0, -1);
                  setMagicStrokes(left);
                  const last = left[left.length - 1];
                  setMagicSpot(last ? last[last.length - 1] : null);
                }}
                className={`${LEEG} flex-1`}
              >
                {t('post.magicUndo', 'Take back a stroke')}
              </button>
              <button
                type="button"
                data-postmagicclear
                onClick={() => { setMagicStrokes([]); setMagicSpot(null); }}
                className={`${LEEG} flex-1`}
              >
                {t('post.magicAgain', 'Start over')}
              </button>
            </div>
          )}
          {magicButtons()}
        </div>
      )}
      {/* ── Style match ──────────────────────────────────────────────
          The owner, 17 October 2026: the styles another app shows as a row of
          sample tiles under tabs — ours, drawn here (`lib/magicstyles.ts`).
          A press restyles what is painted, or the whole photograph when
          nothing is, with the before-and-after line after. */}
      {picture && (
        <div className="space-y-2" data-postmagicstyles>
          <p className={MIKRO}>{t('post.styleTitle', 'Style match')}</p>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {STYLE_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                data-poststylegroup={group.id}
                aria-selected={styleGroup === group.id}
                onClick={() => setStyleGroup(group.id)}
                className={`min-h-[36px] rounded-full border px-3 text-xs font-bold ${styleGroup === group.id ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
              >
                {styleLabel(group, lang)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {stylesIn(styleGroup).map((one) => (
              <button
                key={one.id}
                type="button"
                data-poststyle={one.id}
                disabled={Boolean(magicBusy)}
                onClick={() => void magicPart('style', undefined, one.id)}
                className="relative flex flex-col items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-950 p-1 text-[10px] font-bold text-zinc-300 disabled:opacity-50"
              >
                <StyleTile id={one.id} />
                {magicBusy === `style:${one.id}` && (
                  <span className="absolute inset-1 grid place-items-center rounded-xl bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                  </span>
                )}
                <span className="w-full truncate text-center">{styleLabel(one, lang)}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: INK_DIM }}>
            {t('post.stylePrice', '{n} credits a style. On what you painted, or on the whole photo when nothing is painted.').replace('{n}', String(CREDITS.repaint))}
          </p>
        </div>
      )}
    </div>
  );

  const shapesBench = (
    <div className="space-y-3">
    {/* ── The shapes ───────────────────────────────────────────────────
        The owner, 13 October 2026: "ons kort amazing … shape templates." The
        four Google's page drew — a cube, a ring, a grid, a frame — as real
        layers in `lib/postshapes.ts`: drawn, lit with the same glow the
        words use, put in one of five places at one of three sizes, and
        exported with the picture. Dragged on the photo to move, and by the
        corner to resize (14 October 2026). */}
    <div className="space-y-3" data-postmarks>
      <div className="flex flex-wrap gap-2 pb-1" data-postmarkkinds>
        {MARK_SPECS.map((spec) => (
          <button
            key={spec.id}
            type="button"
            data-postaddmark={spec.id}
            onClick={() => {
              const id = freshId();
              setMarks((was) => [...was, { ...newMark(spec.id, id), z: frontZ(was, words) }]);
              setMarkOn(id);
            }}
            className={`${LEEG} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
          >
            <span aria-hidden>{spec.icon}</span>
            {t(spec.name[0], spec.name[1])}
          </button>
        ))}
      </div>
      {(() => {
        const shapesOnly = marks.filter((one) => one.kind !== 'chart');
        const mark = shapesOnly.find((one) => one.id === markOn) ?? shapesOnly[shapesOnly.length - 1];
        if (!mark) {
          return <p className="text-xs" style={{ color: INK_DIM }}>{t('post.shapesStart', 'Pick a shape. Then drag it on the photo, and pull its corner to size it.')}</p>;
        }
        if (mark.kind === 'art') {
          /* Vector art: sized and faded here like a shape, changed in the studio it came from. */
          const artSlider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, id: string) => (
            <label className="flex items-center gap-2 text-xs font-bold" data-postmarkslider={id}>
              <span className="w-24 shrink-0">{label}</span>
              <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="h-11 min-w-0 flex-1 accent-emerald-400" />
            </label>
          );
          return (
            <div key={mark.id} data-postmark="art" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">🎨 {t('post.layerArt', 'Vector art')}</span>
                <button type="button" onClick={() => dropMark(mark.id)} aria-label={t('post.removeArt', 'Remove this vector art')} className={`${LEEG} w-auto px-3`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" data-postvectoredit onClick={() => setVector({ editing: mark.id })} className={`${LEEG} inline-flex w-full items-center justify-center gap-1.5`}>
                <PenTool className="h-3.5 w-3.5" />{t('post.vectorEdit', 'Change it in the vector studio')}
              </button>
              {artSlider(t('post.markSizeSlide', 'Size'), mark.size, 0.05, 1.6, 0.01, (v) => changeMark(mark.id, { size: v }), 'size')}
              {artSlider(t('post.markSeeThrough', 'See-through'), 1 - (mark.opacity ?? 1), 0, 0.9, 0.05, (v) => changeMark(mark.id, { opacity: 1 - v }), 'opacity')}
            </div>
          );
        }
        const spec = MARK_SPECS.find((one) => one.id === mark.kind) ?? MARK_SPECS[0];
        const slider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, id: string) => (
          <label className="flex items-center gap-2 text-xs font-bold" data-postmarkslider={id}>
            <span className="w-24 shrink-0">{label}</span>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="h-9 min-w-0 flex-1 accent-emerald-400" />
          </label>
        );
        return (
          <div key={mark.id} data-postmark={mark.kind} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold"><span aria-hidden>{spec.icon}</span> {t(spec.name[0], spec.name[1])}</span>
              <button
                type="button"
                onClick={() => dropMark(mark.id)}
                aria-label={t('post.removeShape', 'Remove this shape')}
                className={`${LEEG} w-auto px-3`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {slider(t('post.markSizeSlide', 'Size'), mark.size, 0.04, 1.6, 0.01, (v) => changeMark(mark.id, { size: v }), 'size')}
            {isFilled(mark.kind) && slider(t('post.markStretch', 'Wide or tall'), mark.stretch ?? 1, 0.2, 5, 0.05, (v) => changeMark(mark.id, { stretch: v }), 'stretch')}
            {isFilled(mark.kind) && slider(t('post.markSeeThrough', 'See-through'), 1 - (mark.opacity ?? 1), 0, 0.9, 0.05, (v) => changeMark(mark.id, { opacity: 1 - v }), 'opacity')}
            <div className="flex flex-wrap items-center gap-2 pb-1" data-postmarkinks>
              {NEON_INKS.map((ink) => (
                <button
                  key={ink}
                  type="button"
                  data-postmarkink={ink}
                  aria-pressed={mark.ink === ink}
                  aria-label={ink}
                  onClick={() => changeMark(mark.id, { ink })}
                  className={`h-9 w-9 shrink-0 rounded-full border-2 ${mark.ink === ink ? 'border-white' : 'border-zinc-700'}`}
                  style={{ background: ink, boxShadow: mark.ink === ink ? `0 0 14px ${ink}` : `0 0 6px ${ink}` }}
                />
              ))}
              <label className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-zinc-500" title={t('post.markOwnColour', 'Any colour')}>
                <input
                  type="color"
                  value={mark.ink.length === 7 ? mark.ink : '#ffffff'}
                  onChange={(e) => changeMark(mark.id, { ink: e.target.value })}
                  aria-label={t('post.markOwnColour', 'Any colour')}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span aria-hidden className="grid h-full w-full place-items-center text-xs">+</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {GLOWS.map((glow) => (
                <button
                  key={glow.id}
                  type="button"
                  data-postmarkglow={glow.id}
                  aria-pressed={mark.glow === glow.id}
                  onClick={() => changeMark(mark.id, { glow: glow.id })}
                  className={`${LEEG} w-auto shrink-0 px-3 ${mark.glow === glow.id ? GEKIES : ''}`}
                  style={glow.halo.length ? { textShadow: `0 0 6px ${glow.halo[2]}, 0 0 14px ${glow.halo[1]}` } : undefined}
                >
                  {t(glow.name[0], glow.name[1])}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
    </div>
  );

  const saveBench = (
    <div className="space-y-4">
    {/* ── What it costs, before the work and not only on the button ──
 
        The owner, 7 October 2026: *"Remember to monetize and nothing is free
        in this app."*
 
        Nothing here is free to take away: a picture off this screen
        costs a credit whether it goes to the phone or next door onto a
        film, and `check:postpaid` holds that there is no third road. But
        the price lived only on the Save button at the foot, which is the
        cutting room's fault in reverse — that room shows an itemised
        bill before it charges, and this one let somebody build a post
        and meet the price at the end.
 
        Said once, at the top, in the room's own words. */}
    <p
      data-postprice
      className="rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed"
      style={asRoom
        ? { borderColor: 'rgba(16,185,129,0.35)', background: 'rgba(52,211,153,0.10)', color: INK_DIM, boxShadow: RAISE }
        : { borderColor: 'rgb(39,39,42)', background: 'rgb(24,24,27)' }}
    >
      {t('post.price', 'Building a picture here uses no credits. Taking one out costs')}
      {' '}
      <strong style={asRoom ? { color: INK } : undefined}>{creditsSaid(CREDITS.postOut, t)}</strong>
      {' '}
      {t('post.priceTwo', '\u2014 the same whether you save it to your phone or put it on a film, whichever kind of file you choose, and the same post is only ever charged once.')}
    </p>
    {/* ── What kind of file, and how big ────────────────────────────────
 
        The owner, 7 October 2026: *"Ook die formaat van export?"* — and, of the
        four that were offered back: *"los PDF en SVG uit."* `lib/postfile.ts`
        carries why those four are out.
 
        Above the button and not behind it. A choice that only appears once
        you have pressed Save is a choice made after the credit is spent. */}
    <div className="space-y-2">
      <p className={MIKRO}>{t('post.kind', 'What kind of file')}</p>
      <div className={RY}>
        {/* WebP only where this browser can really write one. An older
            Safari answers `toBlob('image/webp')` with a PNG and says
            nothing, so the button would save a PNG called `.webp` — which
            is found out when a platform refuses the upload. */}
        {FORMATS.filter((one) => one.id !== 'webp' || webpWorks).map((one) => (
          <button
            key={one.id}
            type="button"
            data-postkind={one.id}
            aria-pressed={kind === one.id}
            onClick={() => setKind(one.id)}
            className={`${LEEG} ${kind === one.id ? GEKIES : ''}`}
          >
            {t(one.name[0], one.name[1])}
          </button>
        ))}
      </div>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t(formatOf(kind).what[0], formatOf(kind).what[1])}
      </p>
      {/* ── The one that catches people ────────────────────────────────
 
          JPEG has three channels. There is no flag and no quality that
          brings the fourth back, so a see-through post saved as a JPG comes
          out on a solid colour — and `toBlob` picks BLACK for it, not white.
          The export flattens onto a colour that was chosen rather than
          letting the browser decide; this says so before the press. */}
      {!holdsClear(kind, back === null) && (
        <p
          data-postkindwarn
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] leading-relaxed text-amber-300"
        >
          {t(
            'post.kindNoClear',
            'This picture has nothing behind it, and a JPG cannot hold that. It will come out on a solid colour. Save it as a PNG to keep it see-through.',
          )}
        </p>
      )}
    </div>

    <div className="space-y-2">
      <p className={MIKRO}>{t('post.howBig', 'How big')}</p>
      <div className={RY}>
        {SCALES.map((one) => (
          <button
            key={one}
            type="button"
            data-postscale={one}
            aria-pressed={scale === one}
            onClick={() => setScale(one)}
            className={`${LEEG} ${scale === one ? GEKIES : ''}`}
          >
            {one}× · {size.width * one}×{size.height * one}
          </button>
        ))}
      </div>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {scale === 1
          ? t('post.howBigOne', 'The size the platforms ask for. This is the one you want nearly every time.')
          : t('post.howBigTwo', 'Twice the size, for printing it or for a screen bigger than a phone. A much bigger file.')}
      </p>
    </div>

    {/* ── How hard the file is squeezed — `SQUEEZE` says why this is all
        the row does now. The price is the same whichever is chosen. */}
    <div className="space-y-2" data-postsqueeze>
      <div className="flex items-center justify-between">
        <p className={MIKRO}>{t('post.exportQuality', 'Export quality')}</p>
        <span className="text-[11px] font-bold text-emerald-400">
          {creditsSaid(CREDITS.postOut, t)}
        </span>
      </div>
      {formatOf(kind).quality === undefined ? (
        <p className="text-[12px] leading-relaxed text-zinc-500">
          {t('post.squeezePng', 'A PNG keeps every pixel, so there is no quality to choose. How big above is what changes the file.')}
        </p>
      ) : (
        <>
          <div className={RY3}>
            {(['small', 'standard', 'best'] as const).map((one) => (
              <button
                key={one}
                type="button"
                data-postsqueezepick={one}
                aria-pressed={squeeze === one}
                onClick={() => setSqueeze(one)}
                className={`${LEEG} ${squeeze === one ? GEKIES : ''}`}
              >
                {one === 'small'
                  ? t('post.squeezeSmall', 'Smaller file')
                  : one === 'standard'
                    ? t('post.squeezeStandard', 'Standard')
                    : t('post.squeezeBest', 'Best quality')}
              </button>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-zinc-500">
            {squeeze === 'small'
              ? t('post.squeezeSmallNote', 'Squeezed harder: a much smaller file that loads fast, a little soft in fine detail. Same size in pixels.')
              : squeeze === 'standard'
                ? t('post.squeezeStandardNote', 'The balance the platforms expect: sharp, at a sensible file size.')
                : t('post.squeezeBestNote', 'Hardly squeezed at all: the sharpest file, and a bigger one. Same size in pixels.')}
          </p>
        </>
      )}
    </div>

    {/* ── At most so big, and how big it will be ─────────────────────
        The owner, 18 October 2026: *"menend 1mb ens."* */}
    <FileSize limit={limit} onLimit={setLimit} estimate={estimate} busy={estimating} kind="picture" />

    {/* Report what the AI made, from where the finished picture is seen —
        the studio's bar, which has the same flag, is hidden over this room
        and this room's own bar is full on a small phone (`lib/reports.ts`). */}
    <ReportFlag target={{ kind: 'ai', ref: 'photo', where: 'photo' }} label />

    <div className="space-y-2">
      <button type="button" onClick={() => void take()} disabled={busy} data-postexport className={VUL}>
        {busy
          ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          : <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />
              {t('post.save', 'Save the picture')} · {creditsSaid(CREDITS.postOut, t)}
            </span>}
      </button>
      {/* ── Kept, rather than taken out ───────────────────────

          Free, and the line under it says why — a free button beside a paid
          one with nothing between them reads as a mistake. `keepInApp` says
          why a shelf with no way out is not a free download. */}
      <button
        type="button"
        onClick={() => void keepInApp()}
        disabled={busy || (picture === null && words.length === 0)}
        data-postkeep
        className={LEEG}
      >
        <Bookmark className="h-3.5 w-3.5" />
        {t('post.keepHere', 'Keep it in the app')}
      </button>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t(
          'post.keepHereWhy',
          'Puts it on your Channel and makes it pickable in the cutting room. No credits, because it stays on this device — saving it to your phone is the press above.',
        )}
      </p>

      {/* ── And into the film next door ─────────────────────────────
 
          The owner: *"kan ook in die video editor ingesit word."* The editor
          is the room under this desk, so this is a hand-over and not a
          download — but it goes through the same charge, because the
          editor cuts and exports on the device for nothing and a free
          road out would undo the reason there is no watermark.
 
          Charged once per post, so a post she already saved is free to
          put into a film. The button says so rather than making her
          find out. */}
      {onIntoFilm && (
        <button
          type="button"
          onClick={() => void intoFilm()}
          disabled={busy}
          data-postintofilm
          className={LEEG}
        >
          {t('post.intoFilm', 'Use it as the film\u2019s cover')}
          {' · '}
          {creditsSaid(CREDITS.postOut, t)}
        </button>
      )}
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t('post.freeUntil', 'Every tool in this room is included in your plan — they all run on your own phone. The credits are for taking the picture off the device, and the same post saved twice is charged once.')}
      </p>
      <button
        type="button"
        onClick={() => {
          /* A new post is a new photograph, so the steps that were about the
             old one are not steps she could sensibly take back. */
          history.current.clear();
          steps.current = { back: [], forward: [] };
          setTold((n) => n + 1);
          setPost(freshId());
          shapeChosen.current = false;
          setWords([]);
          setWordOn(null);
          setPicture(null);
          setTraced(null);
          setCropBox(null);
          /* And everything else that belonged to the last post, so "new"
             means new: the shapes, the look, the framing, the colour behind
             it, the original kept for Put it back, the pictures to copy
             from, what Grab found, the magic spot, the cut-out mask, and the
             moving clip with its wait. */
          setMarks([]);
          setMarkOn(null);
          setLook(PLAIN);
          /* And the layers start over: all of them, all showing. */
          setAllLook(PLAIN);
          setToneAll(false);
          setLayerOn('all');
          setPhotoHidden(false);
          setPhotoAlpha(1);
          setBackHidden(false);
          setCrop(MIDDLE);
          setBack('#111113');
          setLastColour('#111113');
          setWhole(null);
          for (const one of refs) URL.revokeObjectURL(one.url);
          setRefs([]);
          setFound(null);
          setPicking(false);
          setPicked(null);
          things.current.clear();
          setGrabbed(null);
          setMagicSpot(null);
          setMagicStrokes([]);
          lastMask.current = null;
          smear.current = null;
          setSmeared(0);
          setRubbing(false);
          setLiveJob(null);
          liveSince.current = 0;
          setLiveUrl(null);
          setLiveSaid('');
          setSaid('');
        }}
        className={LEEG}
      >
        {t('post.startFresh', 'Start a new post')}
      </button>
    </div>
    </div>
  );

  /* The feed preview: the canvas drawn at its own size, as a picture. */
  /* Open or shut. The preview is the post drawn again at preview size, into
     a canvas in the card — never a file: a full-size image in an <img>
     is a picture somebody can long-press and save, which is a way out that
     skips the one paid press (`check:postpaid`). */
  /* The owner, 15 October 2026: "Die pers ogie moet vir jou opsies gee van tipe
     posts. Elke platform se size lyk anders." So it opens on the kind of post
     nearest the post's own shape, and every other kind is a press away,
     drawn in its own shape with the picture filling it the way that place
     fills it (`app/lib/feedshapes.ts`). */
  const [social, setSocial] = useState<true | null>(null);
  const [feedKindId, setFeedKindId] = useState<string | null>(null);
  const socialCanvas = useRef<HTMLCanvasElement | null>(null);
  useBackLayer(social !== null, () => setSocial(null));
  const showSocial = (): void => {
    setFeedKindId(nearestKind(size.width, size.height).kind.id);
    setSocial(true);
  };
  const feedNow = ((): { platform: FeedPlatform; kind: FeedKind } => {
    for (const platform of FEED_PLATFORMS) {
      const kind = platform.kinds.find((one) => one.id === feedKindId);
      if (kind) return { platform, kind };
    }
    return nearestKind(size.width, size.height);
  })();
  useEffect(() => {
    if (!social) return undefined;
    /* A frame later, so a shape just applied has been drawn on the canvas
       before it is copied. */
    const id = window.requestAnimationFrame(() => {
      /* Drawn afresh without the guides, at the preview's own size — not
         copied off the glass, which carries the safe-zone bands, the rings,
         the crop box and the checkerboard. A feed preview with those in it
         is a preview of something nobody will post. */
      const from = document.createElement('canvas');
      draw(from, false, Math.min(1, PREVIEW_LONGEST / Math.max(size.width, size.height)));
      const to = socialCanvas.current;
      if (!to || from.width === 0 || from.height === 0) return;
      const shape = feedNow.kind;
      const scale = Math.min(1, PREVIEW_LONGEST / Math.max(shape.width, shape.height));
      to.width = Math.round(shape.width * scale);
      to.height = Math.round(shape.height * scale);
      /* The picture fills the shape: what falls outside it is cut off,
         which is what the place does and what the line under it says. */
      const fill = Math.max(to.width / from.width, to.height / from.height);
      const sw = to.width / fill;
      const sh = to.height / fill;
      to.getContext('2d')?.drawImage(from, (from.width - sw) / 2, (from.height - sh) / 2, sw, sh, 0, 0, to.width, to.height);
    });
    return () => window.cancelAnimationFrame(id);
  }, [social, feedNow.kind, size.width, size.height]);
  /* When the tools step aside — a bench shut, or moving, cropping or tracing
     started — the picture comes back into view. On a phone the open bench is
     under the picture and the page was scrolled down to it; without this the
     glass a drag is meant for was above the screen, and the drag landed on
     nothing — `audit/postwalk.mjs` dragged the words and they did not move. */
  const toolsAside = bench === null || movingWords || cropBox !== null || traced !== null;
  useEffect(() => {
    if (!toolsAside || atDesk) return;
    canvas.current?.scrollIntoView({ block: 'nearest' });
  }, [toolsAside, movingWords, cropBox !== null, traced !== null, atDesk]);
  /* Escape shuts the open bench, as the bar's own sheet did, so the way out
     of a bench is the same whichever layout drew it. */
  useEffect(() => {
    if (!bench) return undefined;
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.stopPropagation(); setBench(null); }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [bench]);
  /* ── The layer list ────────────────────────────────────────────────────
     The owner, 16 October 2026: *"Die photo editor sal moet layers kry. As mens
     op die layers click moet mens kan kies op watter layer jy nou edit, en
     natuurlik 'n all layer wat alles by mekaar het."* Front at the top, the
     way every editor lists them; All above that. `lib/postlayers.ts` holds
     the order and what "chosen" means to a thumb. */
  const stackNow = stackOf(marks, words, cells);
  const chooseLayer = (on: LayerOn): void => {
    setLayerOn(on);
    const line = words.find((one) => one.id === on);
    const mark = marks.find((one) => one.id === on);
    const cell = cells.find((one) => one.id === on);
    setWordOn(line && line.text.trim() ? line.id : null);
    setMarkOn(mark ? mark.id : null);
    setCellOn(cell ? cell.id : null);
    /* How it reads follows the layer: the photograph's own look for the
       photo, the look over everything for All. */
    if (on === 'all') setToneAll(true);
    if (on === 'photo') setToneAll(false);
  };
  const hideLayer = (id: string, kind: 'mark' | 'words' | 'cell', hidden: boolean): void => {
    beforeLayers(hidden
      ? t('post.stepHideLayer', 'switching a layer off')
      : t('post.stepShowLayer', 'switching a layer on'));
    if (kind === 'cell') {
      changeCell(id, { hidden });
      if (hidden && cellOn === id) setCellOn(null);
    } else if (kind === 'mark') {
      setMarks((was) => was.map((one) => (one.id === id ? { ...one, hidden } : one)));
      if (hidden && markOn === id) setMarkOn(null);
    } else {
      setWords((was) => was.map((one) => (one.id === id ? { ...one, hidden } : one)));
      if (hidden && wordOn === id) setWordOn(null);
    }
  };
  const moveLayer = (id: string, by: 1 | -1): void => {
    beforeLayers(by > 0
      ? t('post.stepLayerUp', 'moving a layer forward')
      : t('post.stepLayerDown', 'moving a layer back'));
    const z = movedOne(marks, words, id, by, cells);
    setMarks((was) => was.map((one) => ({ ...one, z: z.get(one.id) ?? one.z })));
    setWords((was) => was.map((one) => ({ ...one, z: z.get(one.id) ?? one.z })));
    setCells((was) => was.map((one) => ({ ...one, z: z.get(one.id) ?? one.z })));
  };
  const layerNameOf = (kind: 'mark' | 'words' | 'cell', item: Mark | Words | Cell): string => {
    if (kind === 'cell') {
      const at = cells.findIndex((one) => one.id === item.id);
      return `${t('post.layerCell', 'Photo')} ${at + 1}${(item as Cell).image ? '' : ` · ${t('post.layerCellEmpty', 'empty')}`}`;
    }
    if (kind === 'mark' && (item as Mark).kind === 'art') return `🎨 ${t('post.layerArt', 'Vector art')}`;
    if (kind === 'mark' && (item as Mark).kind === 'chart') {
      return `📊 ${(item as Mark).chart?.title || t('post.layerChart', 'Chart')}`;
    }
    if (kind === 'mark') {
      const spec = MARK_SPECS.find((one) => one.id === (item as Mark).kind) ?? MARK_SPECS[0];
      return `${spec.icon} ${t(spec.name[0], spec.name[1])}`;
    }
    const text = (item as Words).text.trim().replace(/\s+/g, ' ');
    if (!text) return t('post.layerEmptyWords', 'Words (empty)');
    return `“${text.length > 24 ? `${text.slice(0, 23)}…` : text}”`;
  };
  const layerRow = (
    id: LayerOn,
    name: string,
    icon: React.ReactNode,
    extra: React.ReactNode,
  ): React.ReactElement => (
    <div
      key={id}
      data-postlayer={id}
      data-postlayeron={layerOn === id ? 'yes' : 'no'}
      className={`flex items-center gap-1.5 rounded-xl border p-1 ${layerOn === id ? GEKIES : 'border-zinc-700 bg-zinc-950'}`}
    >
      <button
        type="button"
        data-postlayerpick={id}
        aria-pressed={layerOn === id}
        onClick={() => chooseLayer(id)}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs font-bold text-zinc-200"
      >
        <span aria-hidden className="shrink-0">{icon}</span>
        <span className="truncate">{name}</span>
      </button>
      {extra}
    </div>
  );
  const eyeButton = (hidden: boolean, flip: () => void, id: string): React.ReactElement => (
    <button
      type="button"
      data-postlayereye={id}
      aria-pressed={!hidden}
      aria-label={hidden ? t('post.layerShow', 'Show this layer') : t('post.layerHide', 'Hide this layer')}
      onClick={flip}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-zinc-300"
    >
      {hidden ? <EyeOff className="h-4 w-4 opacity-60" /> : <Eye className="h-4 w-4" />}
    </button>
  );
  const chosenItem = stackNow.find((one) => one.id === layerOn);
  const layersBench = (
    /* One column, even under the photo on a phone: the list and what the
       chosen layer can do belong together, and as two sideways columns the
       names were cut off at the edge (the owner, 22 October 2026: the layers
       did not work professionally). */
    <div className="space-y-3" data-postlayers data-postnosideways="">
      <div className="space-y-1.5">
        {layerRow('all', t('post.layerAll', 'All layers'), <Layers className="h-4 w-4" />, null)}
        {/* Front to back, with the photograph at its own place among
            them — it can come forward over words and shapes now. */}
        {(() => {
          const under = Math.min(photoAt, stackNow.length);
          const order: ({ readonly layer: (typeof stackNow)[number] } | { readonly photo: true })[] = [
            ...stackNow.slice(under).reverse().map((layer) => ({ layer })),
            ...(picture ? [{ photo: true as const }] : []),
            ...stackNow.slice(0, under).reverse().map((layer) => ({ layer })),
          ];
          const arrows = (at: number, up: () => void, down: () => void, id: string): React.ReactElement => (
            <>
              <button
                type="button"
                data-postlayerup={id}
                disabled={at === 0}
                aria-label={t('post.layerUp', 'Move forward')}
                onClick={up}
                className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-zinc-300 disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-postlayerdown={id}
                disabled={at === order.length - 1}
                aria-label={t('post.layerDown', 'Move back')}
                onClick={down}
                className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-zinc-300 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </>
          );
          const isPhoto = (one: (typeof order)[number] | undefined): boolean => Boolean(one && 'photo' in one);
          return order.map((one, at) => {
            if ('photo' in one) {
              return layerRow(
                'photo',
                t('post.layerPhoto', 'Photo'),
                <ImageIcon className="h-4 w-4" />,
                <>
                  {arrows(
                    at,
                    () => { beforeLayers(t('post.stepLayerUp', 'moving a layer forward')); setPhotoAt(under + 1); },
                    () => { beforeLayers(t('post.stepLayerDown', 'moving a layer back')); setPhotoAt(Math.max(0, under - 1)); },
                    'photo',
                  )}
                  {eyeButton(photoHidden, () => setPhotoHidden((was) => !was), 'photo')}
                </>,
              );
            }
            const { layer } = one;
            return layerRow(
              layer.id,
              layerNameOf(layer.kind, layer.item),
              layer.kind === 'mark' ? <Square className="h-4 w-4" /> : layer.kind === 'cell' ? <LayoutGrid className="h-4 w-4" /> : <Type className="h-4 w-4" />,
              <>
                {arrows(
                  at,
                  () => (isPhoto(order[at - 1]) ? setPhotoAt(Math.max(0, under - 1)) : moveLayer(layer.id, 1)),
                  () => (isPhoto(order[at + 1]) ? setPhotoAt(under + 1) : moveLayer(layer.id, -1)),
                  layer.id,
                )}
                {eyeButton(Boolean(layer.item.hidden), () => hideLayer(layer.id, layer.kind, !layer.item.hidden), layer.id)}
              </>,
            );
          });
        })()}
        {layerRow(
          'back',
          back ? t('post.layerBack', 'Background') : t('post.layerBackNone', 'Background (see-through)'),
          <span className="block h-4 w-4 rounded border border-zinc-500" style={{ background: back ?? 'transparent' }} />,
          back ? eyeButton(backHidden, () => setBackHidden((was) => !was), 'back') : null,
        )}
      </div>

      {/* What the chosen layer can do, under the list. */}
      <div className="space-y-2 rounded-xl border border-zinc-800 p-3" data-postlayertools={layerOn}>
        <p className="text-xs leading-relaxed text-zinc-400">
          {layerOn === 'all'
            ? t('post.layerAllSays', 'Everything together: tap anything on the photo to move it, and Adjust changes the whole picture.')
            : layerOn === 'photo'
              ? t('post.layerPhotoSays', 'Only the photo: drag to move it, and Adjust changes the photo alone. Words and shapes stay put.')
              : layerOn === 'back'
                ? t('post.layerBackSays', 'The colour behind everything. Change it under Crop, or hide it to make the post see-through.')
                : t('post.layerOneSays', 'Only this layer answers when you touch the photo, so nothing in front of it gets in the way.')}
        </p>
        {(chosenItem || layerOn === 'photo') && (
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-300" data-postlayeralpha>
            <span className="w-24 shrink-0">{t('post.layerOpacity', 'Opacity')}</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={layerOn === 'photo'
                ? photoAlpha
                : chosenItem?.item.alpha ?? 1}
              onChange={(event) => {
                const v = Number(event.target.value);
                if (layerOn === 'photo') setPhotoAlpha(v);
                else if (chosenItem?.kind === 'mark') changeMark(chosenItem.id, { alpha: v });
                else if (chosenItem?.kind === 'cell') changeCell(chosenItem.id, { alpha: v });
                else if (chosenItem) setWords((was) => was.map((one) => (one.id === chosenItem.id ? { ...one, alpha: v } : one)));
              }}
              aria-label={t('post.layerOpacity', 'Opacity')}
              className="h-9 min-w-0 flex-1 accent-emerald-400"
            />
          </label>
        )}
        <div className={RY}>
          <button
            type="button"
            data-postlayeredit
            onClick={() => setBench(
              layerOn === 'all' || layerOn === 'photo'
                ? 'tone'
                : layerOn === 'back'
                  ? 'frame'
                  : chosenItem?.kind === 'mark' ? ((chosenItem.item as Mark).kind === 'chart' ? 'charts' : 'shapes') : chosenItem?.kind === 'cell' ? 'cell' : 'text',
            )}
            className={LEEG}
          >
            {layerOn === 'all' || layerOn === 'photo'
              ? t('post.layerEditLook', 'Adjust')
              : t('post.layerEdit', 'Edit this layer')}
          </button>
          {chosenItem ? (
            <button
              type="button"
              data-postlayerdrop
              onClick={() => {
                if (chosenItem.kind === 'mark') dropMark(chosenItem.id);
                else if (chosenItem.kind === 'cell') dropCell(chosenItem.id);
                else dropWords(chosenItem.id);
                setLayerOn('all');
              }}
              className={LEEG}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('post.layerDrop', 'Delete layer')}
            </button>
          ) : layerOn !== 'all' ? (
            <button type="button" data-postlayerall onClick={() => chooseLayer('all')} className={LEEG}>
              <Layers className="h-3.5 w-3.5" />
              {t('post.layerBackToAll', 'All layers')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
  /* A chosen layer that has gone — deleted, undone, a new post — lets go,
     so the room is never stuck answering to something that is not there. */
  useEffect(() => {
    if (layerOn === 'all' || layerOn === 'photo' || layerOn === 'back') return;
    if (!marks.some((one) => one.id === layerOn) && !words.some((one) => one.id === layerOn)
      && !cells.some((one) => one.id === layerOn)) setLayerOn('all');
  }, [marks, words, cells, layerOn]);
  useEffect(() => {
    if (layerOn === 'photo' && !picture) setLayerOn('all');
  }, [picture, layerOn]);

  /* ── Photo grids ─────────────────────────────────────────────────────── */
  const tile = 'flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border p-2 text-[11px] font-bold';

  /* ── Filters: grouped, each one shown on her own photograph ─────────── */
  const filterTile = 'flex flex-col items-center gap-1 rounded-xl border p-1 text-[10px] font-bold';
  const filtersBench = (
    <div className="space-y-3" data-postfilters>
      {/* Two sections, which a phone lays side by side: the filters
          first, because they are what the tool is for. */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {FILTER_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              role="tab"
              data-postfiltergroup={group.id}
              aria-selected={filterGroup === group.id}
              onClick={() => setFilterGroup(group.id)}
              className={`min-h-[36px] rounded-full border px-3 text-xs font-bold ${filterGroup === group.id ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
            >
              {filterLabel(group, lang)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          <button
            type="button"
            data-postfilter="none"
            aria-pressed={!filterHere}
            onClick={() => putFilter(null)}
            className={`${filterTile} ${!filterHere ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
          >
            <FilterTile from={thumb} look={PLAIN} />
            <span className="w-full truncate text-center">{t('post.filterNone', 'Original')}</span>
          </button>
          {POST_FILTERS.filter((one) => one.group === filterGroup).map((one) => (
            <button
              key={one.id}
              type="button"
              data-postfilter={one.id}
              aria-pressed={filterHere?.id === one.id}
              onClick={() => putFilter(one.id, filterHere?.id === one.id ? filterHere.share : 1)}
              className={`${filterTile} ${filterHere?.id === one.id ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
            >
              <FilterTile from={thumb} look={one.look} />
              <span className="w-full truncate text-center">{filterLabel(one, lang)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filterHere && (
          <label className="block space-y-1" data-postfilterstrength>
            <span className="flex justify-between text-xs font-bold text-zinc-300">
              <span>{t('post.filterStrength', 'How strong')}</span>
              <span className="font-mono">{Math.round(filterHere.share * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={filterHere.share}
              onChange={(event) => putFilter(filterHere.id, Number(event.target.value))}
              className="h-11 w-full accent-emerald-400"
            />
          </label>
        )}
        {compareButton}
        <div className={RY} data-postlooktarget={toneAll ? 'all' : 'photo'}>
          {picture && <button
            type="button"
            data-postfilteron="photo"
            aria-pressed={!toneAll}
            onClick={() => { setToneAll(false); setLayerOn('photo'); }}
            className={`${LEEG} ${!toneAll ? GEKIES : ''}`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {t('post.lookOnPhoto', 'The photo')}
          </button>}
          <button
            type="button"
            data-postfilteron="all"
            aria-pressed={toneAll}
            onClick={() => { setToneAll(true); setLayerOn('all'); }}
            className={`${LEEG} ${toneAll ? GEKIES : ''}`}
          >
            <Layers className="h-3.5 w-3.5" />
            {t('post.lookOnAll', 'All layers')}
          </button>
        </div>
        {selectRow}
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {t('post.filterHint', 'Every filter is shown on your own photo. Fine-tune it afterwards in Adjust.')}
        </p>
      </div>
    </div>
  );
  const gridBench = (
    <div className="space-y-3" data-postgrids>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            type="button"
            data-postlayout={layout.id}
            onClick={() => { layoutNow.current = layout.id; applyLayout(layout.id); }}
            className={`${tile} ${layoutNow.current === layout.id && cells.length ? GEKIES : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
          >
            {/* The layout drawn as itself: its frames, small. */}
            <span aria-hidden className="relative block aspect-square w-full overflow-hidden rounded-lg bg-zinc-800">
              {layout.frames.map((f, at) => (
                <span
                  key={at}
                  className={`absolute block ${layout.look === 'polaroid' ? 'border-2 border-b-[6px] border-zinc-100 bg-violet-400/70' : layout.look === 'round' ? 'rounded-md bg-violet-400/70' : 'bg-violet-400/70'}`}
                  style={{
                    left: `${(f.x + 0.02) * 100}%`, top: `${(f.y + 0.02) * 100}%`,
                    width: `${(f.w - 0.04) * 100}%`, height: `${(f.h - 0.04) * 100}%`,
                    transform: f.turn ? `rotate(${f.turn}deg)` : undefined,
                  }}
                />
              ))}
            </span>
            {/* Two lines rather than cut: "One big, three small" lost its
                first letter and its last on a phone (20 October 2026). */}
            <span className="block w-full text-center leading-tight">{t(layout.name[0], layout.name[1])}</span>
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <p className={MIKRO}>{t('post.gridGap', 'Space between')}</p>
        <div className={RY4}>
          {GAPS.map((one, at) => (
            <button
              key={one}
              type="button"
              data-postgap={at}
              aria-pressed={gap === one}
              onClick={() => { setGap(one); if (layoutNow.current && cells.length) applyLayout(layoutNow.current, one); }}
              className={`${LEEG} ${gap === one ? GEKIES : ''}`}
            >
              {[t('post.gapNone', 'None'), t('post.gapSmall', 'Small'), t('post.gapMedium', 'Medium'), t('post.gapLarge', 'Large')][at]}
            </button>
          ))}
        </div>
      </div>
      {/* One frame of her own, anywhere: picked and ready to move and size —
          for a photo slot on a template's artwork. */}
      <button
        type="button"
        data-postaddframe
        onClick={() => {
          beforeLayers(t('post.stepAddFrame', 'adding a photo frame'));
          const id = freshId();
          setCells((was) => [...was, { id, x: 0.3, y: 0.3, w: 0.4, h: 0.4, image: null, crop: MIDDLE, z: -500 + was.length }]);
          setCellOn(id);
          setFraming(true);
          setBench(null);
          setSaid(t('post.frameHow', 'Drag the frame where the photo goes, and pull its corner to size it. Press Move again when it is right.'));
        }}
        className={LEEG}
      >
        <Plus className="h-3.5 w-3.5" />
        {t('post.addFrame', 'Add a photo frame')}
      </button>
      {cells.length > 0 && (
        <button
          type="button"
          data-postgridclear
          onClick={() => { beforeLayers(t('post.stepGridClear', 'taking the photo grid away')); setCells([]); setCellOn(null); layoutNow.current = null; }}
          className={LEEG}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('post.gridClear', 'Take the grid away')}
        </button>
      )}
      <p className="text-xs leading-relaxed text-zinc-400">
        {t('post.gridHow', 'Tap an empty frame to put a photo in it. Tap a photo to pick it; drag it to move it about in its frame.')}
      </p>
    </div>
  );

  /* ── One photo in the grid: its own tools, as pictures ──────────────── */
  const cellNow = cells.find((one) => one.id === cellOn) ?? null;
  const cellTool = (id: string, icon: React.ReactNode, label: string, run: () => void, disabled = false): React.ReactElement => (
    <button
      key={id}
      type="button"
      data-postcelltool={id}
      disabled={disabled}
      onClick={run}
      className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-[11px] font-bold text-zinc-200 disabled:opacity-40"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full border border-violet-400/40 bg-linear-to-br from-violet-500/30 via-zinc-900 to-cyan-500/20 text-violet-200 shadow-[0_0_16px_rgba(167,139,250,0.25)]">
        {icon}
      </span>
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
  const cellBench = cellNow ? (
    <div className="space-y-3" data-postcell={cellNow.id}>
      {/* Sideways on purpose: the photo's tools in one row, swiped, as her
          screenshots have them. */}
      <div data-sideways className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1">
        {cellTool('replace', <Replace className="h-6 w-6" />, cellNow.image ? t('post.cellReplace', 'Replace') : t('post.cellAdd', 'Add a photo'), () => askForCell(cellNow.id))}
        {cellTool('edit', <Wand2 className="h-6 w-6" />, t('post.cellEdit', 'Edit this photo'), () => editCell(cellNow.id), !cellNow.image)}
        {cellTool('clear', <ImageIcon className="h-6 w-6" />, t('post.cellClear', 'Empty the frame'), () => { beforeLayers(t('post.stepClearCell', 'taking a photo out of the grid')); changeCell(cellNow.id, { image: null, crop: MIDDLE }); }, !cellNow.image)}
        {cellTool('drop', <Trash2 className="h-6 w-6" />, t('post.cellDrop', 'Delete the frame'), () => dropCell(cellNow.id))}
      </div>
      {cellNow.image && (
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-300" data-postcellzoom>
          <ZoomIn className="h-4 w-4 shrink-0" />
          <span className="w-16 shrink-0">{t('post.cellZoom', 'Closer')}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={cellNow.crop.zoom}
            onChange={(event) => changeCell(cellNow.id, { crop: { ...cellNow.crop, zoom: Number(event.target.value) } })}
            aria-label={t('post.cellZoom', 'Closer')}
            className="h-9 min-w-0 flex-1 accent-violet-400"
          />
        </label>
      )}
      <div className={RY3}>
        {(['plain', 'round', 'polaroid'] as CellLook[]).map((one) => (
          <button
            key={one}
            type="button"
            data-postcelllook={one}
            aria-pressed={(cellNow.look ?? 'plain') === one}
            onClick={() => changeCell(cellNow.id, { look: one })}
            className={`${LEEG} ${(cellNow.look ?? 'plain') === one ? GEKIES : ''}`}
          >
            {one === 'plain' ? t('post.cellPlain', 'Straight') : one === 'round' ? t('post.cellRound', 'Rounded') : t('post.cellPolaroid', 'Polaroid')}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">
        {t('post.cellHow', 'Drag the photo to move it about in its frame. Edit this photo opens it on its own with every tool — background off, magic touch, adjust — and Done puts it back.')}
      </p>
    </div>
  ) : (
    <p className="text-sm text-zinc-400" data-postcell="none">{t('post.cellNone', 'Tap a photo in the grid to change just that one.')}</p>
  );

  /* ── Charts ─────────────────────────────────────────────────────────
     The owner, 17 October 2026: *"graph templates … en verskillende
     verskeidenheid van graphs. Wat cool sal wees as dit AI verstelbaar is
     dat data ingevoer kan word en AI die data in die grafiek verstel."* A
     chart is a mark (`postshapes.ts`) carrying its data (`postcharts.ts`):
     moved and sized on the photo like a shape, changed here by hand, by a
     pasted table, or by the AI from her own words. */
  const [chartPaste, setChartPaste] = useState('');
  const [chartWords, setChartWords] = useState('');
  const [chartBusy, setChartBusy] = useState(false);
  const chartOn = marks.find((one) => one.id === markOn && one.kind === 'chart')
    ?? (bench === 'charts' ? [...marks].reverse().find((one) => one.kind === 'chart') : undefined)
    ?? null;
  const setChart = (id: string, next: ChartSpec): void => changeMark(id, { chart: next });
  const addChart = (spec: ChartSpec, name: string): void => {
    beforeLayers(t('post.stepAddChart', 'putting a chart in'));
    const id = freshId();
    const chart: ChartSpec = { ...spec, title: lang === 'af' ? name : spec.title };
    setMarks((was) => [...was, { ...newMark('chart', id), ink: '#ffffff', glow: 'none', size: 0.78, stretch: 1.3, chart, z: frontZ(was, words) }]);
    setMarkOn(id);
    setWordOn(null);
  };
  const chartAi = async (mark: Mark): Promise<void> => {
    if (!mark.chart || !chartWords.trim() || chartBusy) return;
    setChartBusy(true);
    setWorking('long');
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/post/chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          /* Who is spending — the same token every paid press carries. */
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ chart: mark.chart, words: chartWords, lang }),
      });
      const body = (await answer.json().catch(() => ({}))) as { chart?: unknown; message?: string };
      const next = answer.ok ? cleanChart(body.chart, mark.chart) : null;
      if (!next) {
        setSaid(body.message ?? t('post.chartAiNo', 'The AI could not turn that into chart data. Nothing was charged.'));
        return;
      }
      beforeLayers(t('post.stepChartAi', 'letting AI set a chart'));
      setChart(mark.id, next);
      setChartWords('');
      flash();
    } catch {
      setSaid(t('post.chartAiNo', 'The AI could not turn that into chart data. Nothing was charged.'));
    } finally {
      setChartBusy(false);
      setWorking((was) => (was === 'long' ? null : was));
    }
  };
  const chartField = 'h-11 min-w-0 rounded-lg border border-zinc-700 bg-black/30 px-2 text-sm';
  const chartsBench = (
    <div className="space-y-4" data-postcharts>
      <div className="space-y-2">
        <p className="text-xs font-bold" style={{ color: INK_DIM }}>{t('post.chartPick', 'Add a chart: pick a design')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-postcharttemplates>
          {CHART_TEMPLATES.map((one) => (
            <button
              key={one.id}
              type="button"
              data-postcharttemplate={one.id}
              onClick={() => addChart(one.spec, lang === 'af' ? one.af : one.en)}
              className="flex flex-col gap-1 rounded-xl border border-zinc-700 bg-black/30 p-1.5 text-left"
            >
              <span className="block aspect-[4/3] w-full"><ChartTile spec={one.spec} lang={lang} /></span>
              <span className="px-1 text-[11px] font-bold">{lang === 'af' ? one.af : one.en}</span>
            </button>
          ))}
        </div>
      </div>
      {chartOn?.chart && (() => {
        const mark = chartOn;
        const spec = chartOn.chart;
        const edit = (next: Partial<ChartSpec>): void => setChart(mark.id, { ...spec, ...next });
        const setCell = (row: number, col: number, raw: string): void => {
          const v = Number(raw.replace(',', '.'));
          edit({ series: spec.series.map((one, k) => (k === col ? { ...one, values: one.values.map((x, r) => (r === row ? (Number.isFinite(v) ? v : 0) : x)) } : one)) });
        };
        return (
          <div className="space-y-3" data-postchart={spec.kind}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">📊 {spec.title || t('post.layerChart', 'Chart')}</span>
              <button type="button" onClick={() => dropMark(mark.id)} aria-label={t('post.removeChart', 'Remove this chart')} className={`${LEEG} w-auto px-3`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* ── The AI, first: it is the quickest way to real numbers ── */}
            <div className="space-y-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/5 p-2" data-postchartaibox>
              <textarea
                value={chartWords}
                onChange={(e) => setChartWords(e.target.value.slice(0, 6000))}
                rows={3}
                data-postchartai
                placeholder={t('post.chartAiHint', 'Type or paste your numbers, a report, or a change — "sales were 40, 52 and 61 in Jan to Mar", "add July at 90", "make it a pie".')}
                className="w-full rounded-lg border border-zinc-700 bg-black/30 p-2 text-sm"
              />
              <button
                type="button"
                data-postchartaigo
                disabled={!chartWords.trim() || chartBusy}
                onClick={() => { void chartAi(mark); }}
                className={`${LEEG} inline-flex w-full items-center justify-center gap-1.5 disabled:opacity-40`}
              >
                {chartBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t('post.chartAiGo', 'Let AI set the data · {n} credits').replace('{n}', String(CREDITS.chart))}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5" data-postchartkinds>
              {/* Each kind drawn with her own numbers — every choice a picture. */}
              {CHART_KINDS.map((one) => (
                <button key={one.id} type="button" data-postchartkind={one.id} aria-pressed={spec.kind === one.id} onClick={() => edit({ kind: one.id })} className={`flex w-[88px] flex-col gap-1 rounded-xl border border-zinc-700 bg-black/30 p-1 text-[11px] font-bold ${spec.kind === one.id ? 'ring-2 ring-emerald-400' : ''}`}>
                  <span className="block aspect-[4/3] w-full"><ChartTile spec={{ ...spec, kind: one.id, title: '' }} lang={lang} /></span>
                  {lang === 'af' ? one.af : one.en}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" data-postchartlooks>
              {LOOKS.map((one) => (
                <button key={one.id} type="button" data-postchartlook={one.id} aria-pressed={spec.look === one.id} onClick={() => edit({ look: one.id })} className={`flex w-[88px] flex-col gap-1 rounded-xl border border-zinc-700 bg-black/30 p-1 text-[11px] font-bold ${spec.look === one.id ? 'ring-2 ring-emerald-400' : ''}`}>
                  <span className="block aspect-[4/3] w-full"><ChartTile spec={{ ...spec, look: one.id, title: '' }} lang={lang} /></span>
                  {lang === 'af' ? one.af : one.en}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold">{t('post.chartTitle', 'Title')}
              <input value={spec.title} onChange={(e) => edit({ title: e.target.value.slice(0, 80) })} data-postcharttitle className={`${chartField} mt-1 w-full`} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold">{t('post.chartNote', 'Small line under it')}
                <input value={spec.note ?? ''} onChange={(e) => edit({ note: e.target.value.slice(0, 120) })} className={`${chartField} mt-1 w-full`} />
              </label>
              <label className="block text-xs font-bold">{t('post.chartUnit', 'Unit (R, %, kg)')}
                <input
                  value={spec.unit ?? ''}
                  onChange={(e) => { const unit = e.target.value.slice(0, 6); edit({ unit, unitAfter: /^[%a-z]/i.test(unit) && !/^[R$€£]/.test(unit) }); }}
                  className={`${chartField} mt-1 w-full`}
                />
              </label>
            </div>

            {/* ── The numbers, by hand ── */}
            <div className="overflow-hidden rounded-xl border border-zinc-700" data-postcharttable>
              <div className="grid gap-px bg-zinc-700" style={{ gridTemplateColumns: `minmax(0,1.3fr) repeat(${spec.series.length}, minmax(0,1fr)) 44px` }}>
                <span className="bg-zinc-900 px-2 py-1 text-[11px] font-bold text-zinc-400">{t('post.chartLabel', 'Label')}</span>
                {spec.series.map((one, col) => (
                  <input key={col} value={one.name} aria-label={t('post.chartSeries', 'Series name')} onChange={(e) => edit({ series: spec.series.map((x, k) => (k === col ? { ...x, name: e.target.value.slice(0, 40) } : x)) })} className="h-11 min-w-0 bg-zinc-900 px-2 text-[11px] font-bold" />
                ))}
                <span className="bg-zinc-900" />
                {spec.labels.map((label, row) => (
                  <React.Fragment key={row}>
                    <input value={label} aria-label={t('post.chartLabel', 'Label')} onChange={(e) => edit({ labels: spec.labels.map((x, r) => (r === row ? e.target.value.slice(0, 40) : x)) })} className="h-11 min-w-0 bg-black/40 px-2 text-sm" data-postchartlabel={row} />
                    {spec.series.map((one, col) => (
                      <input key={col} inputMode="decimal" value={String(one.values[row] ?? 0)} aria-label={`${label} ${one.name}`} onChange={(e) => setCell(row, col, e.target.value)} className="h-11 min-w-0 bg-black/40 px-2 text-right text-sm tabular-nums" data-postchartcell={`${row}-${col}`} />
                    ))}
                    <button type="button" aria-label={t('post.chartDropRow', 'Take this row away')} disabled={spec.labels.length < 2} onClick={() => edit({ labels: spec.labels.filter((_, r) => r !== row), series: spec.series.map((one) => ({ ...one, values: one.values.filter((_, r) => r !== row) })) })} className="grid h-11 place-items-center bg-black/40 text-zinc-400 disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-postchartaddrow disabled={spec.labels.length >= MOST_POINTS} onClick={() => edit({ labels: [...spec.labels, `${spec.labels.length + 1}`], series: spec.series.map((one) => ({ ...one, values: [...one.values, 0] })) })} className={LEEG}>
                <Plus className="h-3.5 w-3.5" /> {t('post.chartAddRow', 'A row')}
              </button>
              <button type="button" data-postchartaddseries disabled={spec.series.length >= MOST_SERIES} onClick={() => edit({ series: [...spec.series, { name: `${t('post.chartSeries', 'Series name')} ${spec.series.length + 1}`, values: spec.labels.map(() => 0) }] })} className={LEEG}>
                <Plus className="h-3.5 w-3.5" /> {t('post.chartAddSeries', 'A series')}
              </button>
            </div>
            {spec.series.length > 1 && (
              <button type="button" onClick={() => edit({ series: spec.series.slice(0, -1) })} className={LEEG}>{t('post.chartDropSeries', 'Take the last series away')}</button>
            )}

            {/* ── Or pasted from a spreadsheet ── */}
            <details className="rounded-xl border border-zinc-700 p-2" data-postchartpastebox>
              <summary className="min-h-[44px] cursor-pointer py-3 text-xs font-bold">{t('post.chartPaste', 'Paste a table')}</summary>
              <textarea value={chartPaste} onChange={(e) => setChartPaste(e.target.value.slice(0, 20000))} rows={4} data-postchartpaste placeholder={'Jan\t42\nFeb\t51\nMar\t48'} className="w-full rounded-lg border border-zinc-700 bg-black/30 p-2 font-mono text-xs" />
              <button
                type="button"
                data-postchartpastego
                disabled={!chartPaste.trim()}
                onClick={() => {
                  const table = parseTable(chartPaste);
                  if (!table) { setSaid(t('post.chartPasteNo', 'No numbers were found in that. Put a label and a number on each line.')); return; }
                  beforeLayers(t('post.stepChartPaste', 'pasting a table into a chart'));
                  edit(table);
                  setChartPaste('');
                }}
                className={`${LEEG} mt-2 w-full disabled:opacity-40`}
              >
                {t('post.chartPasteGo', 'Use this table')}
              </button>
            </details>

            <label className="flex items-center gap-2 text-xs font-bold" data-postmarkslider="size">
              <span className="w-24 shrink-0">{t('post.markSizeSlide', 'Size')}</span>
              <input type="range" min={0.2} max={1.4} step={0.01} value={mark.size} onChange={(e) => changeMark(mark.id, { size: Number(e.target.value) })} className="h-11 min-w-0 flex-1 accent-emerald-400" />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold" data-postmarkslider="stretch">
              <span className="w-24 shrink-0">{t('post.markStretch', 'Wide or tall')}</span>
              <input type="range" min={0.5} max={2.6} step={0.05} value={mark.stretch ?? 1} onChange={(e) => changeMark(mark.id, { stretch: Number(e.target.value) })} className="h-11 min-w-0 flex-1 accent-emerald-400" />
            </label>
          </div>
        );
      })()}
    </div>
  );

  const benchFor: Record<string, React.ReactNode> = {
    starts: startsBench,
    grid: gridBench,
    cell: cellBench,
    shapes: shapesBench,
    charts: chartsBench,
    layers: layersBench,
    magic: magicBench,
    alive: aliveBench,
    pic: picBench,
    frame: frameBench,
    tone: toneBench,
    filters: filtersBench,
    read: readBench,
    text: textBench,
    save: saveBench,
  };

  /* ── Her picture of the room, 14 October 2026 ───────────────────────────

     The owner, with a photograph of a desktop photo editor: *"Photo editor se
     page moet ook hersien word, die harde gedeelte op die page vat al die
     plek … Die buttons moet min plek vat, sodat die foto die hele skerm vol
     maak. En wanneer editing funksies op kom dan moet die background van die
     funksies lig wees sodat mens die foto kan sien, of elke funksie moet 'n
     button wees, wat dan verstelbare enkel funksie pop out gee wat dan heel
     bo op die skerm verskyn buite die foto."*

     So the photograph is the room. At a desk, as in her picture: a slim bar
     across the top, a narrow rail of tools down the left, the photograph
     filling the middle, and the inspector on the right holding whichever
     tool is open. On a phone: the same slim bar, the photograph filling the
     screen, eight small buttons along the foot, and a tool's controls
     popping out at the TOP of the screen, above the photograph and outside
     it, on see-through glass — so the photograph is always in view while a
     slider moves.

     Nothing behind a button is new and nothing was taken away: the six
     benches keep their `data-cutbench` ids, with templates and shapes lifted
     out of the words bench to be buttons of their own. The canvas is sized
     to the space it has, measured, so it is as big as the screen allows. */
  const upright = !onEdge;
  const ALL_BENCHES = POST_TOOLS;
  const here = [...ALL_BENCHES, POST_CELL].find((one) => one.id === bench) ?? null;
  const chipStyle: React.CSSProperties = { background: PHOTO.chip, border: `1px solid ${PHOTO.edge}` };
  const openBench = (next: Exclude<Bench, null>): void => {
    /* ── Crop on a design's or a grid's photo ────────────────────────────
       The owner, 19 October 2026, a design's photo frame chosen: *"Hierdie
       cropping werk nie."* The crop box is for the post's own photograph;
       with none, Crop opened the frame's settings and cut nothing. A photo
       in a frame now opens in the crop sheet instead — the chosen frame's,
       or the first frame with a photo in it. */
    if (next === 'frame' && !picture) {
      const target = cellNow?.image ? cellNow : cells.find((one) => one.image) ?? null;
      if (target) { setCellCrop(target.id); return; }
    }
    setBench(bench === next ? null : next);
    if (bench !== next) setAsking(false);
    /* ── Crop draws its box at once ────────────────────────────────────
       The owner, 19 October 2026: *"Die crop op photo editor moet ook dadelik
       'n resizeble box om die prent trek dat mens self kan crop en gedeeltes
       uit 'n foto kan sny."* It used to open the frame's tools and wait for
       "Start cutting". Now the box is round the photograph the moment the
       tool is pressed — corners and sides to drag — and the frame's tools
       are one press away in the same strip. Pressed again, it goes. */
    if (next === 'frame') setCropBox(bench !== 'frame' && picture ? ALL_OF_IT : null);
    else if (cropBox) setCropBox(null);
  };
  const stripsUp = Boolean((picture && (cropBox || traced)) || picking || movingWords);
  /* The magic brush paints ON the photograph, so its panel keeps to the space
     under it like the bars do — a panel up to the middle of the photo left
     half of it out of the brush's reach. */
  const brushUp = bench === 'magic' && picture !== null;
  /* ── On a phone, a tool opens UNDER the photograph ─────────────────────
     The owner, 15 October 2026, a red ring drawn round the empty black under a
     square photo: *"Kan die funksies in plaas van dat dit oor die prent op
     kom, eerder in daai swart gedeelte … op kom en in 'n side scroll in
     gaan. Daar is genoeg plek as dit side scroll."* So the photograph moves
     to the top of its space — still its full size, it never shrinks (14
     October) — and the tool fills the space it leaves, its sections in
     columns that scroll sideways. Only where there is almost no space (a
     story is as tall as the screen) does it lie over the foot of the photo. */
  const panelUp = upright && (stripsUp || here !== null || Boolean(copilot && asking));
  const saveFull = upright && bench === 'save' && !stripsUp && !(copilot && asking);

  /* The space the photograph has, measured, so the canvas fills it. */
  const stage = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = (): void => {
      const box = el.getBoundingClientRect();
      const ratio = size.width / size.height;
      /* While a bar acts on the photograph on a phone, the photograph makes
         room for it, so none of it is under the bar — a story is as tall as
         the screen, and the bar lay over its foot. */
      /* Nothing lies over the photograph any more (23 October 2026): the
         panel is docked under it, so the stage's own box is all photo. */
      const keep = 0;
      const room = { w: Math.max(0, box.width - 16), h: Math.max(0, box.height - 16 - keep) };
      const w = Math.max(80, Math.floor(Math.min(room.w, room.h * ratio)));
      setFitted({ w, h: Math.floor(w / ratio), room: box.height });
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [size.width, size.height, upright, stripsUp, brushUp]);

  const undoRedo = (picture !== null || told > 0) ? (
    <>
      <button
        type="button"
        data-postundo
        disabled={undoSays() === null}
        onClick={stepBack}
        title={undoSays()
          ? `${t('post.undo', 'Put back')} — ${undoSays()}`
          : t('post.undoNone', 'Nothing to put back yet')}
        aria-label={undoSays()
          ? `${t('post.undo', 'Put back')} — ${undoSays()}`
          : t('post.undoNone', 'Nothing to put back yet')}
        className="flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-35"
        style={chipStyle}
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-postredo
        disabled={redoSays() === null}
        onClick={stepOn}
        title={redoSays()
          ? `${t('post.redo', 'Do it again')} — ${redoSays()}`
          : t('post.redoNone', 'Nothing to do again')}
        aria-label={redoSays()
          ? `${t('post.redo', 'Do it again')} — ${redoSays()}`
          : t('post.redoNone', 'Nothing to do again')}
        className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-35"
        style={chipStyle}
      >
        <Redo2 className="h-4 w-4" />
      </button>
    </>
  ) : null;

  /* ── The slim bar across the top ─────────────────────────────────── */
  const header = (
    <header
      data-postbar
      className={`flex shrink-0 items-center px-2 py-1.5 ${upright ? 'gap-1' : 'gap-1.5'}`}
      style={{ background: PHOTO.floorGlass, borderBottom: `1px solid ${PHOTO.edge}` }}
    >
      {asRoom ? (
        <button
          type="button"
          onClick={onClose}
          data-roomback
          aria-label={t('room.backToAll', 'Alle Kamers')}
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ ...chipStyle, color: PHOTO.accent }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <button type="button" onClick={onClose} data-backout aria-label={t('post.close', 'Close')} className="flex h-9 w-9 items-center justify-center rounded-xl" style={chipStyle}>
          <X className="h-4 w-4" />
        </button>
      )}
      <div className={upright ? 'shrink-0' : 'min-w-0 flex-1 overflow-hidden'}>
        {/* The name of the room refuses to shrink to nothing: on a 1512-wide
            screen a heading with no width of its own was squeezed to 52
            pixels and read "noto / ditor". */}
        <h2 className={upright ? 'sr-only' : 'whitespace-nowrap text-sm font-extrabold leading-tight'}>
          {onEdge ? <>FutureBox Pro <span style={{ color: PHOTO.accent }}>·</span> </> : null}
          {asRoom ? t('rail.photo', 'Photo Editor') : t('post.title', 'Make a post')}
        </h2>
        <button
          type="button"
          data-postcustomsize
          onClick={() => setShowSizeModal(true)}
          title={t('size.customOrStandard', 'Standard & Custom Sizes')}
          className="block min-h-[44px] max-w-full truncate rounded-xl border px-2 text-left font-mono text-[11px] leading-tight"
          style={{ color: INK_DIM, borderColor: PHOTO.edge }}
        >
          {/* The name only where there is room for it: on a phone the
              numbers and the arrow, so nothing runs under the buttons. */}
          {upright ? `${shapeOf(size.width, size.height)} ▾` : `${size.width}×${size.height} · ${size.name} ▾`}
        </button>
      </div>
      {onEdge && (
        <span className="ml-3 hidden truncate text-[11px] lg:inline" style={{ color: INK_DIM }}>
          {t('post.aiEngine', 'AI tools')}: <span style={{ color: PHOTO.accent }}>{t('post.aiEngineWho', 'Google picture engine')}</span>
        </span>
      )}
      <span className="flex-1" />
      {upright ? null : undoRedo}
      <button
        type="button"
        data-postsimple
        aria-pressed={!plain}
        onClick={() => setPlain(!plain)}
        title={plain
          ? t('post.showAllWhat', 'Show every setting there is')
          : t('post.showLessWhat', 'One button per tool, at the setting that is right most of the time')}
        className="flex h-9 shrink-0 items-center rounded-xl px-1.5 text-[11px] font-bold sm:px-2 sm:text-xs"
        style={chipStyle}
      >
        {plain ? t('post.showAll', 'Everything') : t('post.showLess', 'Simple')}
      </button>
      <button
        type="button"
        data-postsocial
        onClick={showSocial}
        aria-label={t('post.social', 'How it looks on social')}
        title={t('post.social', 'How it looks on social')}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
        style={{ background: PHOTO.social }}
      >
        <Eye className="h-4 w-4" />
      </button>
      {copilot ? (
        <button
          type="button"
          data-postask
          aria-pressed={asking}
          onClick={() => { setAsking(!asking); setBench(null); }}
          aria-label={t('post.ask', 'Ask')}
          className="flex h-9 items-center gap-1 rounded-xl px-2 text-[11px] font-bold sm:text-xs"
          style={chipStyle}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">{t('post.ask', 'Ask')}</span>
        </button>
      ) : null}
      <button
        type="button"
        data-postexportopen
        aria-pressed={bench === 'save'}
        onClick={() => openBench('save')}
        className="flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-extrabold sm:text-xs"
        style={{ background: PHOTO.accent, color: PHOTO.floor }}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden min-[400px]:inline">{t('post.exportNow', 'Export')}</span>
      </button>
    </header>
  );

  /* Every tool that takes a while — anything the AI does, reading the
     words, cutting the background out — glows over the photograph until it
     is done. The owner, 17 October 2026: *"Die hele foto moet so glow effect hê
     wat oor die skerm pulse soos 'n neon ruler pulse wat oor die skerm
     beweeg oor en oor totdat die funksie geapply is."* */
  const glowing: 'long' | 'flash' | null = working === 'long' || reading !== null || looking
    || Boolean(magicBusy) || redrawing || cutting !== null || liveBusy
    ? 'long'
    : working;

  /* ── The photograph, as big as the space allows ───────────────────── */
  const photo = (
    <div
      ref={stage}
      data-poststage
      /* Whole, always: a tool's strip floats over the foot of the room, so
         while it is out the photo rises to the top of its space (the owner's
         15 October rule: it moves, it never shrinks) and sits clear above
         the strip; tucked or shut, it sits in the middle. */
      className={`relative flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden ${panelUp && !tucked && !saveFull ? 'items-start pt-2' : 'items-center'}`}
      onWheel={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        viewTo(view.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), {
          x: event.clientX - (box.left + box.width / 2),
          y: event.clientY - (box.top + box.height / 2),
        });
      }}
    >
      <canvas
        ref={canvas}
        data-postcanvas
        data-postmovable={movable ? 'yes' : 'no'}
        onPointerDown={grab}
        onContextMenu={(event) => {
          event.preventDefault();
          setRightMenu({ x: event.clientX, y: event.clientY });
        }}
        onPointerMove={drag}
        onPointerUp={letGo}
        onPointerCancel={letGo}
        className="rounded-md"
        style={{
          transform: view.scale > 1 ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})` : undefined,
          transformOrigin: 'center',
          width: fitted ? fitted.w : '100%',
          height: fitted ? fitted.h : undefined,
          aspectRatio: `${size.width} / ${size.height}`,
          boxShadow: `0 0 0 1px ${PHOTO.accentDim}, ${PHOTO.glowEmerald}`,
          background: PHOTO.black,
          /* Only while there is something to pan, crop, trace or move: a
             permanent `touch-action: none` is a dead zone in a page that
             scrolls, which reads as the app being frozen. */
          /* And while the brush is out: with `auto` the phone took a sweep
             of the finger for a scroll and cancelled it after the first
             touch, so the brush left dabs (The owner, 17 October 2026: "Die
             brush werk nie met 'n vee nie"). */
          touchAction: movable || cropBox || traced || words.length > 0 || marks.length > 0 || cells.length > 0
            || (bench === 'magic' && picture && brushOn)
            /* And whenever there is a photograph, so two fingers zoom it
               rather than the page. */
            || picture !== null ? 'none' : 'auto',
          cursor: cropBox || traced ? 'crosshair' : movable ? 'grab' : 'default',
        }}
      />
      {/* ── Bring to life, over the photograph ──────────────────────────
          The sticker waiting to be peeled, and the suggestion of what the
          photo or the sticker can become next (`BecomeBench.tsx`). */}
      {peel && (
        <PeelOverlay
          src={peel.src}
          rect={peel.rect}
          t={t}
          onPeeled={peeled}
          onDismiss={() => setPeel(null)}
        />
      )}
      {nudge && !peel && !becomeBusy && (
        <BecomeNudge
          ids={IDEAS[nudge].offers}
          t={t}
          onPick={(id) => pickNudge(id, nudge)}
          onClose={() => setNudge(null)}
          onNotNow={() => { saidNotNow(nudge); setNudge(null); }}
        />
      )}
      {toolSay && (
        <div key={toolSay.n} className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4" style={{ bottom: 'calc(34dvh + 10px)' }} data-posttoolsay>
          <p role="status" className="fb-nudge max-w-sm rounded-2xl border border-emerald-400/50 bg-zinc-950/90 px-4 py-2 text-center shadow-lg backdrop-blur">
            <span className="block text-[13px] font-bold text-emerald-100">{toolSay.name}</span>
            <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-zinc-300">{toolSay.what}</span>
          </p>
        </div>
      )}
      {(photoSay || pulling) && !peel && !nudge && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-4" data-becomephotosay>
          <p role="status" className="fb-nudge pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-400/60 bg-zinc-950/90 py-1.5 pl-4 pr-1.5 text-center text-xs font-bold text-emerald-100 shadow-lg">
            {becomeBusy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
            <span>{photoSay || t('become.tapThing', 'Tap the thing you want to pull out.')}</span>
            {pulling && !becomeBusy && (
              <button
                type="button"
                data-becomepullstop
                onClick={() => { setPulling(false); setPhotoSay(''); }}
                className="ml-1 inline-flex min-h-[36px] items-center rounded-full bg-zinc-800 px-3 text-xs font-bold text-zinc-200"
              >
                {t('become.pullStop', 'Done')}
              </button>
            )}
          </p>
        </div>
      )}
      {/* With the bench shut, the bench's work goes on unseen: the tap on
          the photo still reaches it, and what it says comes up in the line
          above. */}
      {pulling && bench !== 'alive' && <div hidden data-becomehidden>{aliveBench}</div>}
      {idea && !becomeBusy && (
        <IdeaPrompt
          floating
          moment={idea.moment}
          thumb={idea.thumb}
          t={t}
          onPick={(id) => pickNudge(id, idea.moment)}
          onClose={() => setIdea(null)}
          onNotNow={() => { saidNotNow(idea.moment); setIdea(null); }}
        />
      )}
      {/* ── In and out ──────────────────────────────────────────────────
          The owner: *"in en uit kan zoom, met 'n easy scroll button."* A
          slider and a step either side, and "Fit" for the whole picture.
          The mouse wheel does the same over the photograph, about the
          mouse; two fingers already did on a phone. */}
      {viewOpen ? (
      <div
        data-postview
        /* Top right: the tools pop up over the lower half of the photograph
           and would cover a bar at its foot, and undo sits top left. Folded
           to one button until it is wanted, because open it covers the top
           of the photograph, where a finger may want to draw or drag. */
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-xl px-1 py-1"
        style={{ background: PHOTO.chip, border: `1px solid ${PHOTO.edge}` }}
      >
        <button
          type="button"
          data-postviewout
          onClick={() => viewTo(view.scale / 1.25)}
          disabled={view.scale <= 1}
          aria-label={t('post.zoomOut', 'Zoom out')}
          className="flex h-11 w-11 items-center justify-center rounded-lg disabled:opacity-40"
          style={{ color: PHOTO.ink }}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <input
          type="range"
          data-postviewslider
          min={1}
          max={VIEW_MOST}
          step={0.05}
          value={view.scale}
          onChange={(event) => viewTo(Number(event.target.value))}
          aria-label={t('post.zoomHow', 'How close')}
          className="w-20 sm:w-28"
          style={{ accentColor: PHOTO.accent }}
        />
        <button
          type="button"
          data-postviewin
          onClick={() => viewTo(view.scale * 1.25)}
          disabled={view.scale >= VIEW_MOST}
          aria-label={t('post.zoomIn', 'Zoom in')}
          className="flex h-11 w-11 items-center justify-center rounded-lg disabled:opacity-40"
          style={{ color: PHOTO.ink }}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          data-postviewfit
          onClick={() => viewTo(1)}
          className="flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums"
          style={{ color: PHOTO.ink }}
          aria-label={t('post.viewReset', 'See the whole photo again')}
        >
          {view.scale > 1 ? `${view.scale.toFixed(1)}×` : t('post.zoomFit', 'Fit')}
        </button>
        <button
          type="button"
          data-postviewshut
          onClick={() => setViewOpen(false)}
          aria-label={t('post.zoomShut', 'Put the zoom away')}
          className="flex h-11 w-9 items-center justify-center rounded-lg"
          style={{ color: PHOTO.ink }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      ) : (
        <button
          type="button"
          data-postviewopen
          onClick={() => setViewOpen(true)}
          aria-label={t('post.zoomOpen', 'Zoom in and out')}
          className="absolute right-2 top-2 z-10 flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold tabular-nums"
          style={{ background: PHOTO.chip, border: `1px solid ${PHOTO.edge}`, color: PHOTO.ink }}
        >
          <ZoomIn className="h-4 w-4" />
          {view.scale > 1 ? `${view.scale.toFixed(1)}×` : null}
        </button>
      )}
      {/* ── The before-and-after line, over the photograph ─────────────
          Dragged sideways: left of it the photograph as it came, right of
          it as it is now (drawn by `draw`). Placed from the canvas's own
          box, so it sits on the picture wherever the picture sits. */}
      {glowing && canvas.current && (
        <div
          data-postworking={glowing}
          aria-hidden
          className={`pointer-events-none absolute z-10 ${glowing === 'long' ? 'fb-working' : 'fb-workflash'}`}
          style={{
            transform: view.scale > 1 ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})` : undefined,
            transformOrigin: 'center',
            left: canvas.current.offsetLeft,
            top: canvas.current.offsetTop,
            width: canvas.current.offsetWidth,
            height: canvas.current.offsetHeight,
          }}
        />
      )}
      {compare !== null && canvas.current && (
        <CompareLine
          mark="postcompare"
          at={compare}
          onAt={setCompare}
          before={t('post.compareBefore', 'Before')}
          after={t('post.compareAfter', 'After')}
          how={t('post.compareHow', 'Drag to compare before and after')}
          accent={PHOTO.accent}
          ink={PHOTO.floor}
          style={{
            left: canvas.current.offsetLeft,
            top: canvas.current.offsetTop,
            width: canvas.current.offsetWidth,
            height: canvas.current.offsetHeight,
          }}
        />
      )}
      {/* The phone's picker for a frame of the grid — there only when the
          post has frames, so a plain post has one picker, the photo's own. */}
      {cells.length > 0 && (
        <input
          ref={cellInput}
          type="file"
          accept={ACCEPTS}
          data-postcellinput
          className="hidden"
          onChange={(event) => { void fillCell(event.target.files?.[0] ?? null); event.target.value = ''; }}
        />
      )}
      {/* ── The tapped photo's own bar ─────────────────────────────────
          Her screenshots: tap a photo in the grid and a small row of its
          tools comes up — not a panel over the photo. Placed with flex, not
          centred by a translate (a pressed button is given a transform of
          its own, which moved the layer chip from under the thumb). */}
      {cellCrop && (() => {
        const frame = cells.find((one) => one.id === cellCrop);
        if (!frame?.image) return null;
        return (
          <CropSheet
            image={frame.image}
            onClose={() => setCellCrop(null)}
            onCut={(made) => asPicture(
              made,
              (one) => {
                beforeLayers(t('post.stepCropCell', 'cropping a photo in a frame'));
                changeCell(frame.id, { image: one, crop: MIDDLE });
                setCellCrop(null);
                setSaid(t('post.cellCropped', 'Cropped. Undo brings the whole photo back.'));
              },
              () => setSaid(t('post.cutDownFailed', 'That could not be cut down.')),
            )}
          />
        );
      })()}
      {cellNow && !editingCell && bench === null && (
        <div data-postcellbar className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex justify-center">
          <div
            className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-2xl px-1 py-1"
            style={{ background: PHOTO.popGlass, border: `1px solid ${PHOTO.accentDim}`, boxShadow: PHOTO.glowEmerald }}
          >
            {([
              ['replace', <Replace key="r" className="h-5 w-5" />, cellNow.image ? t('post.cellReplace', 'Replace') : t('post.cellAddShort', 'Add'), () => askForCell(cellNow.id), false],
              ['edit', <Wand2 key="e" className="h-5 w-5" />, t('post.cellEditShort', 'Edit'), () => editCell(cellNow.id), !cellNow.image],
              ['closer', <ZoomIn key="z" className="h-5 w-5" />, t('post.cellZoom', 'Closer'), () => changeCell(cellNow.id, { crop: { ...cellNow.crop, zoom: Math.min(3, cellNow.crop.zoom + 0.25) } }), !cellNow.image],
              ['further', <ZoomOut key="o" className="h-5 w-5" />, t('post.cellFurther', 'Further'), () => changeCell(cellNow.id, { crop: { ...cellNow.crop, zoom: Math.max(1, cellNow.crop.zoom - 0.25) } }), !cellNow.image || cellNow.crop.zoom <= 1],
              ['crop', <CropIcon key="c" className="h-5 w-5" />, t('post.cellCrop', 'Crop'), () => setCellCrop(cellNow.id), !cellNow.image],
              ['look', <Frame key="f" className="h-5 w-5" />, t('post.cellFrame', 'Frame'), () => {
                const order: CellLook[] = ['plain', 'round', 'polaroid'];
                changeCell(cellNow.id, { look: order[(order.indexOf(cellNow.look ?? 'plain') + 1) % order.length] });
              }, false],
              /* Move the frame itself, and size it by its corner — for placing
                 frames on a template's artwork. */
              ['place', <Move key="m" className="h-5 w-5" />, t('post.cellPlace', 'Move'), () => setFraming((was) => !was), false],
              ['drop', <Trash2 key="d" className="h-5 w-5" />, t('post.cellDropShort', 'Delete'), () => dropCell(cellNow.id), false],
            ] as const).map(([id, icon, label, run, off]) => (
              <button
                key={id}
                type="button"
                data-postcellbarbutton={id}
                disabled={off}
                aria-pressed={id === 'place' ? framing : undefined}
                onClick={run}
                className={`flex min-h-[48px] min-w-[40px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[9px] font-bold disabled:opacity-35 ${id === 'place' && framing ? 'ring-2 ring-violet-400' : ''}`}
                style={{ color: PHOTO.ink }}
              >
                {icon}
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* One photo of the grid open on its own: say so, and the two ways back. */}
      {editingCell && (
        <div
          data-postcellsession
          className="absolute inset-x-2 top-2 z-20 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-bold"
          style={{ background: PHOTO.popGlass, color: PHOTO.ink, border: `1px solid ${PHOTO.accentDim}` }}
        >
          <span className="truncate">{t('post.cellEditing', 'Editing one photo of your grid')}</span>
          <span className="flex shrink-0 gap-1.5">
            <button type="button" data-postcellcancel onClick={() => finishCell(false)} className="min-h-[36px] rounded-xl border border-zinc-600 px-3">
              {t('post.cellCancel', 'Cancel')}
            </button>
            <button type="button" data-postcelldone onClick={() => finishCell(true)} className="min-h-[36px] rounded-xl px-3 text-onAccent" style={{ background: PHOTO.accent }}>
              {t('post.cellDone', 'Done')}
            </button>
          </span>
        </div>
      )}
      {/* Which layer a thumb means, while it is not All — so a drag that
          moves nothing is never a mystery. One press goes back to All.
          Top right: Put back and Do again hold the top-left corner. And
          not centred with a translate — a pressed button is given a
          transform of its own, which replaced the centring mid-tap and
          moved the chip from under the thumb, so the press never landed. */}
      {layerOn !== 'all' && !editingCell && (
        <button
          type="button"
          data-postlayerchip={layerOn}
          onClick={() => { setLayerOn('all'); setToneAll(true); }}
          className="absolute right-2 top-2 z-10 flex min-h-[32px] max-w-[55%] items-center gap-1.5 rounded-full px-3 text-[11px] font-bold"
          style={{ background: PHOTO.popGlass, color: PHOTO.ink, border: `1px solid ${PHOTO.accentDim}` }}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {layerOn === 'photo'
              ? t('post.layerPhoto', 'Photo')
              : layerOn === 'back'
                ? t('post.layerBack', 'Background')
                : (() => {
                  const one = stackNow.find((layer) => layer.id === layerOn);
                  return one ? layerNameOf(one.kind, one.item) : '';
                })()}
          </span>
          <X className="h-3.5 w-3.5 shrink-0" aria-label={t('post.layerBackToAll', 'All layers')} />
        </button>
      )}
      {/* The right-click menu. The owner, 14 October 2026: "in al die editor
          plekke moet daar 'n right click wees wat funksies vinniger kry soos
          cut". A right press chooses what is under it first (the same grab a
          left press does), so the menu acts on that. Drawn on the page so the
          photo's frame cannot clip it. */}
      {rightMenu && typeof document !== 'undefined' && createPortal(
        <div
          role="menu"
          data-postrightmenu
          className="fixed z-[80] flex w-48 flex-col gap-1 rounded-2xl border border-zinc-700 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-sm"
          style={{
            left: Math.max(8, Math.min(rightMenu.x, (typeof window === 'undefined' ? 400 : window.innerWidth) - 200)),
            top: Math.max(8, Math.min(rightMenu.y, (typeof window === 'undefined' ? 400 : window.innerHeight) - 260)),
          }}
        >
          {([
            { id: 'cut', icon: Scissors, label: t('post.menuCut', 'Cut'), keys: 'Ctrl+X', can: Boolean(markOn || wordOn), run: () => { if (copyChosen()) dropChosen(); } },
            { id: 'copy', icon: Copy, label: t('post.menuCopy', 'Copy'), keys: 'Ctrl+C', can: Boolean(markOn || wordOn), run: () => { copyChosen(); } },
            { id: 'paste', icon: ClipboardPaste, label: t('post.menuPaste', 'Paste'), keys: 'Ctrl+V', can: Boolean(copiedThing.current), run: () => { pasteCopied(); } },
            { id: 'delete', icon: Trash2, label: t('post.menuDelete', 'Delete'), keys: 'Del', can: Boolean(markOn || wordOn), run: () => { dropChosen(); } },
            { id: 'undo', icon: Undo2, label: t('post.menuUndo', 'Undo'), keys: 'Ctrl+Z', can: undoSays() !== null, run: () => { stepBack(); } },
          ] as const).map((one) => (
            <button
              key={one.id}
              type="button"
              role="menuitem"
              disabled={!one.can}
              data-postrightmenuitem={one.id}
              onClick={() => { one.run(); setRightMenu(null); }}
              className="flex min-h-[44px] items-center gap-2.5 rounded-xl border border-transparent px-3 text-left text-sm text-zinc-100 hover:border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-40"
            >
              <one.icon className="h-4 w-4 text-emerald-300" />
              <span className="flex-1">{one.label}</span>
              <span className="text-[11px] text-zinc-400">{one.keys}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
      {/* Gone the moment a tool is open. The owner, 14 October 2026, with the
          templates open over it: "Die oomblik wanneer mens op templates
          kliek dan moet daai hele bar verdwyn anders is dit in die pad." */}
      {/* And gone when there is a photo grid: its empty frames are the start,
          and this card over them would catch the tap meant for a frame. */}
      {/* And gone when anything is on the picture at all. The owner, 17 October
          2026, a chart on an empty post: *"Die chart wil nie op die skerm
          agter bly nie. Die oomblik as ek kruisie druk dan gaan die chart
          ook weg."* It had not gone — this card sat over it, as it sat over
          a lone shape, because it only asked about words and grids. */}
      {!picture && words.length === 0 && marks.length === 0 && cells.length === 0 && bench === null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
          <div
            /* The facelift's glass in the photo room's own green and cyan
               (the owner, 20 October 2026: the rooms with colours of their
               own get the same look in that colour): a light-line edge from
               the green to the cyan, and a line of light along the top. */
            className="pointer-events-auto relative flex max-w-sm flex-col items-center gap-3 rounded-2xl p-5 shadow-2xl backdrop-blur-md"
            style={{
              border: '1px solid transparent',
              background: `linear-gradient(${PHOTO.floorGlass}, ${PHOTO.floorGlass}) padding-box, linear-gradient(135deg, rgba(15,157,110,0.8), rgba(34,211,238,0.12) 40%, rgba(15,157,110,0.06) 65%, rgba(34,211,238,0.8)) border-box`,
              boxShadow: `${PHOTO.glowCyan}, ${PHOTO.glowEmerald}`,
            }}
          >
            <span aria-hidden className="pointer-events-none absolute left-6 right-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${PHOTO.cyan}, transparent)` }} />
            <h4 className="text-sm font-bold text-white">{t('stpl.starterTitle', 'Start with a Design or Photo')}</h4>
            <p className="text-xs text-zinc-400">{t('stpl.starterDesc', 'Choose a starter pack or upload your image to begin creating.')}</p>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => openBench('starts')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold"
                style={{ background: PHOTO.accent, color: PHOTO.floor }}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {t('post.benchStarts', 'Templates')}
              </button>
              <button
                type="button"
                onClick={() => openBench('pic')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold"
                style={chipStyle}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {t('post.bringIn', 'Bring a picture in')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* What the room just said, over the foot of the photograph — or, on a
          phone with a tool open, over the top of it: the tool covers the
          foot, and Grab's answers ("Tap one to lift it out", or why the
          engine said no) were printed behind it. The owner, 15 October 2026:
          "Die grab funksie werk ook nie." */}
      {said && (
        /* Above a tapped frame's own bar, not on it: "Cropped. Undo brings
           the whole photo back." sat over Replace and Delete. */
        <div className={`pointer-events-none absolute inset-x-2 z-30 flex flex-col items-center gap-1 ${panelUp ? 'top-14' : cellNow && !editingCell && bench === null ? 'bottom-[68px]' : 'bottom-2'}`}>
          {/* No warning sign for words under a platform's bars. The owner, 17
              October 2026: *"Daai groen sirkel wat elke keer by die photo
              app op kom daar onder moet weg gaan. Dit is 'n weird
              notification wat niemand hoef te sien nie."* The words are moved
              clear in the saved file by themselves, and the shaded bands on
              the glass already show where the bars are. */}
          {said && <p data-postsaid className="pointer-events-auto rounded-xl bg-black/70 px-3 py-1.5 text-[12px] leading-snug text-emerald-300 backdrop-blur-sm">{said}</p>}
        </div>
      )}
      {/* The photograph's own size, for a probe to read: the canvas is the
          FRAME and stays its size whatever is cut away. */}
      {picture && (
        <span
          hidden
          data-postpicturesize
          data-w={picture.naturalWidth || picture.width}
          data-h={picture.naturalHeight || picture.height}
        />
      )}
    </div>
  );

  /* ── The bars that act on the photograph: crop, cut, a line, moving ── */
  const strips = (
    <>
      {cropStrip}
      {traceStrip}
      {picking && (
        /* Small, so the photograph stays in sight above it. The owner, 16
           October 2026: *"Mens kan nie die prent sien tydens die grab nie"*
           and *"Daai funksies wat op gepop het wil ook nie weg gaan nie"* —
           a tall bar over the foot of a story, and a Done that opened the
           Grab panel again. One line of what was tapped with Done beside
           it, then the buttons for it; Done closes everything. */
        <div data-postlinebar className="shrink-0 space-y-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <p data-postlinesaid className="min-w-0 flex-1 truncate text-[12px]" style={{ color: picked ? '#39ff14' : INK_DIM }}>
              {picked ? `“${picked.text}”` : t('post.tapALine', 'Tap a line of writing on the picture.')}
            </p>
            <button
              type="button"
              data-postlinedone
              onClick={() => { setPicking(false); setFound(null); setPicked(null); setBench(null); }}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-black"
            >
              <Check className="h-4 w-4" />
              {t('post.lineDone', 'Done')}
            </button>
          </div>
          {picked && things.current.has(picked.id) && (
            <div className={RY}>
              <button type="button" data-postthinglift onClick={() => liftThing(picked)} className={LEEG}>
                <Scissors className="h-3.5 w-3.5" />
                {t('post.thingCut', 'Cut it out')}
              </button>
              <button type="button" data-postthingmove onClick={() => moveThing(picked)} className={LEEG}>
                <Move className="h-3.5 w-3.5" />
                {t('post.thingGrab', 'Grab it')}
              </button>
              <button type="button" data-postthingselect onClick={() => void selectPart('thing', picked)} className={`${LEEG} col-span-2`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('post.thingAdjust', 'Adjust just this')}
              </button>
            </div>
          )}
          {picked && things.current.has(picked.id) && magicButtons(picked)}
          {picked && !things.current.has(picked.id) && (
            <div className={RY3}>
              <button type="button" data-postlinegrab onClick={() => grabLine(picked)} className={LEEG}>
                {t('post.lineGrab', 'Make it text')}
              </button>
              <button type="button" data-postlinedrop onClick={() => dropLine(picked)} className={LEEG}>
                {t('post.lineDrop', 'Take it out')}
              </button>
              <button
                type="button"
                data-postlinemove
                onClick={() => moveThing(picked)}
                className={LEEG}
              >
                {t('post.lineGrabIt', 'Grab it')}
              </button>
            </div>
          )}
        </div>
      )}
      {(picture !== null || words.length > 0) && movingWords ? (
        <div data-postmovebar className="shrink-0 space-y-2 px-3 py-2">
          <p className="text-[12px] leading-relaxed" style={{ color: INK_DIM }}>
            {t('post.moveWordsHow', 'Put your finger on a line of words and drag it where you want it.')}
          </p>
          <button
            type="button"
            data-postmovedone
            onClick={() => { setMovingWords(false); setBench('text'); }}
            className={VUL}
          >
            {t('post.moveWordsDone', 'Done moving')}
          </button>
        </div>
      ) : null}
    </>
  );

  /* ── A tool's controls ────────────────────────────────────────────── */
  const toolSheet = here ? (
    <div
      data-postbenchpanel
      /* Sideways on purpose on a phone: under the photo its sections are
         columns that scroll left and right (globals.css, 15 October 2026). */
      data-sideways={upright ? '' : undefined}
      className="flex min-h-0 flex-col"
    >
      <DeskSheet
        icon={here.icon}
        title={t(here.label[0], here.label[1])}
        what={t(here.what[0], here.what[1])}
        paid={here.paid}
        paidSays={t('dock.paidSays', 'Some of this costs credits.')}
        /* Not on the magic touch: it is an AI press with its price under its
           own buttons, and this sentence would say it was free. */
        paidLine={here.id === 'magic' || here.id === 'alive' ? undefined : t('post.paidHere', 'Every tool in this room is included in your plan. Taking the picture out is the one press that spends, and it says the price before it does.')}
        closeSays={t('cut.shut', 'Close this bench')}
        look={CUT_LOOK}
        single
        onClose={() => setBench(null)}
      >
        {benchFor[here.id]}
      </DeskSheet>
    </div>
  ) : null;

  const copilotSheet = copilot && asking ? (
    <div data-postcopilot className="flex min-h-0 flex-col" style={{ height: upright ? '40dvh' : '100%' }}>
      <DeskSheet
        icon={<Sparkles className="h-4 w-4" />}
        title={t('post.ask.title', 'Ask the copilot')}
        what={t('post.ask.what', 'It knows which room you are in. Ask it what a tool does, or what to try next on this picture.')}
        closeSays={t('post.ask.shut', 'Close the copilot')}
        look={CUT_LOOK}
        plain
        onClose={() => setAsking(false)}
      >
        {/* `Copilot.tsx`'s root is `h-full min-h-0`, so it needs a parent
            with a height to be full of. */}
        <div className="flex min-h-0 flex-1 flex-col">{copilot}</div>
      </DeskSheet>
    </div>
  ) : null;

  /* ── The eight tools ──────────────────────────────────────────────── */
  const toolButton = (spec: BenchSpec, rail: boolean): React.ReactElement => (
    <button
      key={spec.id}
      type="button"
      data-cutbench={spec.id}
      aria-pressed={bench === spec.id}
      title={t(spec.what[0], spec.what[1])}
      onClick={() => {
        /* Picked: it says what it is. Pressed again: it is put down. */
        if (bench !== spec.id) setToolSay((was) => ({ name: t(spec.label[0], spec.label[1]), what: t(spec.what[0], spec.what[1]), n: (was?.n ?? 0) + 1 }));
        else setToolSay(null);
        openBench(spec.id);
      }}
      className={`${rail ? TOOL_RAIL : TOOL_FOOT} ${bench === spec.id ? GEKIES : ''}`}
      style={bench === spec.id ? undefined : { color: INK_DIM }}
    >
      <ToolTile id={spec.id} from={thumb} icon={spec.icon} size={rail ? 38 : 34} />
      <span className="w-full truncate text-center">{t(POST_SHORT[spec.id][0], POST_SHORT[spec.id][1])}</span>
    </button>
  );

  /* ── The layers, when no tool is open at a desk ─────────────────────
     The same list as the Layers tool on a phone — one list, so choosing a
     layer at a desk and on a phone is the same press. */
  const inspector = (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between border-b pb-2 text-xs font-bold uppercase" style={{ borderColor: PHOTO.edge }}>
        <span>{t('post.inspector', 'Inspector')}</span>
        <span className="font-mono text-[10px] normal-case" style={{ color: PHOTO.accent }}>{t('post.layers', 'Layers')}</span>
      </div>
      {layersBench}
      <p className="text-[11px] leading-relaxed" style={{ color: INK_DIM }}>
        {t('post.toolkitHint', 'Pick a tool on the left and its controls open here, beside the picture rather than over it.')}
      </p>
    </div>
  );

  /* ── The feed preview: the real canvas, in the shape each place shows ── */
  const feedCut = cutOff(size, feedNow.kind);
  const feedSays = feedCut.sides === 'none'
    ? t('post.socialFits', 'Your post fits this shape exactly.')
    : (feedCut.sides === 'topBottom'
      ? t('post.socialCutTopBottom', '{n}% of your post is cut off the top and bottom here.')
      : t('post.socialCutSides', '{n}% of your post is cut off the sides here.')).replace('{n}', String(Math.max(1, Math.round(feedCut.share * 100))));
  const feedLook = feedNow.kind.look;
  const socialModal = social ? (
    <div
      data-postsocialmodal
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 backdrop-blur-md"
      style={{ background: PHOTO.scrim }}
      onClick={() => setSocial(null)}
    >
      <div
        className="relative flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-2xl p-4"
        style={{ background: PHOTO.surface, border: `1px solid ${PHOTO.purple}`, boxShadow: PHOTO.glowEmerald }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          data-postsocialclose
          onClick={() => setSocial(null)}
          aria-label={t('post.socialClose', 'Close the preview')}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl"
          style={chipStyle}
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="pr-12 text-lg font-bold text-white">{t('post.socialTitle', 'How it looks where it goes')}</h3>
        <p className="mb-3 pr-12 font-mono text-xs" style={{ color: PHOTO.purple }}>{t('post.socialWhat', 'Pick a place and a kind of post. Each one is a different shape.')}</p>
        {/* Sideways on purpose: eight places in one row of chips, swiped. */}
        <div data-sideways data-postsocialplaces className="-mx-1 mb-2 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1">
          {FEED_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              data-postsocialplace={platform.id}
              aria-pressed={platform.id === feedNow.platform.id}
              onClick={() => setFeedKindId(platform.kinds[0].id)}
              className="min-h-[44px] shrink-0 rounded-xl px-3 text-xs font-bold"
              style={platform.id === feedNow.platform.id
                ? { background: PHOTO.purple, color: PHOTO.floor }
                : { ...chipStyle, color: INK }}
            >
              {platform.name}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {feedNow.platform.kinds.map((kind) => (
            <button
              key={kind.id}
              type="button"
              data-postsocialkind={kind.id}
              aria-pressed={kind.id === feedNow.kind.id}
              onClick={() => setFeedKindId(kind.id)}
              className="min-h-[44px] rounded-xl border px-3 text-left text-xs font-bold"
              style={kind.id === feedNow.kind.id
                ? { borderColor: PHOTO.accent, color: PHOTO.accent, background: PHOTO.chip }
                : { borderColor: PHOTO.edge, color: INK_DIM, background: 'transparent' }}
            >
              {lang === 'af' ? kind.af : kind.en}
              <span className="block font-mono text-[10px] font-normal">{kind.width}×{kind.height}</span>
            </button>
          ))}
        </div>
        <div className="mb-3 overflow-hidden rounded-xl p-3" style={{ background: PHOTO.black, border: `1px solid ${PHOTO.edge}` }}>
          {feedLook === 'feed' ? (
            <div className="mb-2 flex items-center gap-2">
              <span className="h-7 w-7 rounded-full" style={{ background: PHOTO.accent }} aria-hidden />
              <div>
                <div className="text-xs font-bold text-white">{t('post.socialYou', 'Your page')}</div>
                <div className="text-[9px]" style={{ color: INK_DIM }}>{t('post.socialNow', 'Just now')}</div>
              </div>
            </div>
          ) : null}
          <div
            data-postsocialframe={feedLook}
            className="relative mx-auto overflow-hidden rounded-lg"
            style={{
              /* As wide as the card, but never so tall a story pushes the
                 rest of the card off a phone. */
              width: `min(100%, calc(50dvh * ${feedNow.kind.width} / ${feedNow.kind.height}))`,
              aspectRatio: `${feedNow.kind.width} / ${feedNow.kind.height}`,
              border: `1px solid ${PHOTO.edge}`,
            }}
          >
            <canvas ref={socialCanvas} data-postsocialpicture className="block h-full w-full" />
            {feedLook === 'full' ? (
              /* What the app prints over a full screen: a bar at the top,
                 a name and caption at the foot, buttons up the right. */
              <div aria-hidden className="pointer-events-none absolute inset-0 text-white">
                <div className="absolute inset-x-2 top-2 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.6)' }} />
                <div className="absolute bottom-3 left-3 right-12 space-y-1">
                  <div className="text-[11px] font-bold" style={{ textShadow: '0 1px 2px #000' }}>@{t('post.socialYou', 'Your page')}</div>
                  <div className="h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                  <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                </div>
                <div className="absolute bottom-10 right-2 flex flex-col items-center gap-3 text-base" style={{ textShadow: '0 1px 2px #000' }}>
                  <span>♡</span><span>💬</span><span>↗</span>
                </div>
              </div>
            ) : null}
            {feedLook === 'thumb' ? (
              <span aria-hidden className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 font-mono text-[10px] text-white">3:42</span>
            ) : null}
          </div>
          {feedLook === 'feed' ? (
            <div className="flex items-center gap-4 pt-2 text-base" style={{ color: INK_DIM }} aria-hidden>
              <span>♡</span><span>💬</span><span>↗</span>
            </div>
          ) : null}
          {feedLook === 'thumb' ? (
            <div className="flex items-start gap-2 pt-2" aria-hidden>
              <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: PHOTO.accent }} />
              <div className="flex-1 space-y-1 pt-1">
                <div className="h-2 w-5/6 rounded-full" style={{ background: INK_DIM }} />
                <div className="h-1.5 w-1/2 rounded-full" style={{ background: PHOTO.edge }} />
              </div>
            </div>
          ) : null}
        </div>
        <p data-postsocialfit={feedCut.sides} className="mb-3 text-xs" style={{ color: feedCut.sides === 'none' ? PHOTO.accent : INK }}>
          {feedSays}
        </p>
        {feedCut.sides !== 'none' ? (
          <button
            type="button"
            data-postsocialuse
            onClick={() => handleApplyCanvasSize(feedNow.kind.width, feedNow.kind.height, `${feedNow.platform.name} ${lang === 'af' ? feedNow.kind.af : feedNow.kind.en}`)}
            className="mb-2 min-h-[44px] w-full rounded-xl border text-sm font-bold"
            style={{ borderColor: PHOTO.purple, color: PHOTO.purple, background: 'transparent' }}
          >
            {t('post.socialUse', 'Make my post this shape')} · {feedNow.kind.width}×{feedNow.kind.height}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setSocial(null)}
          className="min-h-[44px] w-full rounded-xl text-xs font-bold"
          style={{ background: PHOTO.accent, color: PHOTO.floor }}
        >
          {t('post.socialDone', 'Looks right, close it')}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={shell}
      className={`${SKIN} text-zinc-100`}
      data-poststudio
      /* The marker `check:lessenaar` finds the wrapper by. The direction
         lives in `SKIN` above, which is where the reasoning is. */
      data-cutroom
      data-postroom={asRoom ? 'yes' : 'no'}
      style={{
        ...(asRoom ? { background: FLOOR, color: INK } : {}),
        /* Only as a room: the overlay form is `fixed inset-0` and already
           has the screen. */
        ...(asRoom
          ? {
            height: tall === null ? ROOM_HEIGHT_GUESS : tall,
            maxHeight: tall === null ? ROOM_HEIGHT_GUESS : tall,
          }
          : {}),
      }}
    >
      {upright ? (
        <div className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col">
          {/* The glow behind the glass: the photo itself, blurred to colour.
              The owner, 27 October 2026, of the black under the panel. */}
          {ambient && (
            /* Clipped to the room: scaled up past its edges (so the blur
               has no dark rim) it made the whole page scroll by a tenth. */
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div
                data-postambient
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${ambient})`, filter: 'blur(32px) saturate(1.7) brightness(0.85)', transform: 'scale(1.2)' }}
              />
            </div>
          )}
          {header}
          {/* The controls pop out at the top, above the photograph and
              outside it, on glass she can see the photograph through the
              edges of. */}
          {/* ── The photograph never shrinks ─────────────────────────────
              The owner, 14 October 2026: "Die prent moet nooit kleiner gemaak
              word wanneer funksie bars oopgemaak word nie ... alles moet
              klein en heel onder bly, die opsies kan eerder links en regs
              scroll, en as jy op een van daardie funksies kliek, dan pop
              dit uit bo op die foto sonder 'n background en very bright
              neon en highlighted dat mens dit bo op die prent kan sien."
              So the photograph has all the room between the header and
              the tools, always; a tool's controls float over the top of it
              with no panel behind them, drawn in bright neon with a dark
              edge on every letter so they read over any picture
              (`[data-neon]` in globals.css). */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {photo}
            {/* Undo and redo ride on the photograph's corner on a phone: in
                the bar they pushed "Take it out" off the right edge of a
                360-pixel screen (The owner, 15 October 2026: "Daai take it out
                button daar regs bo is afgesny"). */}
            {undoRedo ? <div data-postundorow className="absolute left-2 top-2 z-10 flex gap-1">{undoRedo}</div> : null}
            {view.scale > 1 && (
              <button
                type="button"
                data-postviewreset
                onClick={() => setView({ scale: 1, x: 0, y: 0 })}
                className="absolute bottom-2 left-2 z-10 flex h-11 items-center gap-1 rounded-lg px-3 text-xs font-bold"
                style={{ background: PHOTO.chip, border: `1px solid ${PHOTO.edge}`, color: PHOTO.ink }}
                aria-label={t('post.viewReset', 'See the whole photo again')}
              >
                <ZoomOut className="h-4 w-4" />
                {`${view.scale.toFixed(1)}×`}
              </button>
            )}
            {saveFull && toolSheet ? (
              /* The owner, 15 October 2026: "Take it out se pop out kan oor die
                 hele skerm gaan." So it does: the whole space between the
                 bar and the tools, on a solid floor, scrolling down. The bar
                 and the tools stay, so the green button shuts it again and
                 any other tool is one press away. */
              <div
                data-postsavefull
                className="absolute inset-0 z-20 flex min-h-0 flex-col overflow-y-auto"
                style={{ background: PHOTO.floor }}
              >
                {toolSheet}
              </div>
            ) : null}
              {/* ── The tool's controls: a small glass strip over the photo's foot ──
                  The owner, 27 October 2026, with a screenshot of a tool open:
                  *"Die oomblik wanneer mens 'n funksie oop maak dan maak dit
                  die prent klein, en die funksie is lewensgroot."* So the
                  photograph never shrinks for a tool any more: it keeps the
                  whole room, and the tool's controls float over its lower
                  third on glass, small, scrolling inside themselves, with a
                  handle to tuck them down to one button when the whole photo
                  is wanted. (Docked under the photo, from 23 October, it
                  shrank the photo to a stamp on a phone with large text.) */}
            {panelUp && !(saveFull && toolSheet) && (stripsUp || toolSheet || copilotSheet) && (
              <div
                data-postpop
                data-postunder
                data-neon
                className="absolute inset-x-0 bottom-0 z-30 flex min-h-0 flex-col"
                /* Up to the middle of the page. The owner, 23 October 2026,
                   looking at the docked panel: "die pop out van die funksies
                   moet bietjie groter wees, dalk tot die middel van die
                   bladsy." Half the screen for the tool, half for the picture. */
                /* And a little higher since 27 October 2026, as high as the
                   Video Editor's panels reach: "bietjie hoer op gaan in die
                   editor". */
                /* And over the photograph's foot since the same evening —
                   "nogsteeds solid oor 'n groot gedeelte van die skerm met 'n
                   swart agtergrond": the top of the glass rides 14% of the
                   screen up over the photo, which shows through it, so the
                   panel reads as glass over the picture rather than a black
                   floor under it. The middle of the photo stays clear. */
                style={stripsUp
                  ? { height: STRIP_LEAST + 4 }
                  : tucked ? { height: 40, overflow: 'hidden' } : { height: '34dvh' }}
              >
                {!stripsUp && (
                  <button
                    type="button"
                    data-posttuck={tucked ? 'down' : 'up'}
                    aria-expanded={!tucked}
                    onClick={() => setTucked((was) => !was)}
                    className="mx-auto mb-1 inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[12px] font-bold"
                  >
                    {tucked ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {tucked ? t('post.tuckShow', 'Show the tool') : t('post.tuckHide', 'Hide, to see the photo')}
                  </button>
                )}
                {stripsUp
                  ? <div className="min-h-0 flex-1 overflow-y-auto">{strips}</div>
                  : copilotSheet ?? toolSheet}
              </div>
            )}
          </div>
          <nav
            data-cutdock=""
            data-cutbenchrow=""
            data-postfoot
            data-sideways
            /* Sideways on purpose: the owner, 14 October 2026 — the tools stay
               small along the foot and scroll left and right, so the photo
               keeps the whole screen above them. */
            className="flex shrink-0 snap-x flex-nowrap gap-1 overflow-x-auto px-1 pb-1.5 pt-1 backdrop-blur-md"
            style={{ background: 'rgba(10,12,16,0.72)', borderTop: `1px solid ${PHOTO.edge}` }}
          >
            {ALL_BENCHES.map((spec) => toolButton(spec, false))}
          </nav>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {header}
          <div className="flex min-h-0 flex-1">
            <nav
              data-cutdock=""
              data-cutbenchrow=""
              data-postrail
              className="flex w-[68px] shrink-0 flex-col gap-1 overflow-y-auto p-1.5"
              style={{ background: PHOTO.floorGlass, borderRight: `1px solid ${PHOTO.edge}` }}
            >
              {ALL_BENCHES.map((spec) => toolButton(spec, true))}
            </nav>
            {photo}
            <aside
              data-postinspector
              className="flex w-[340px] shrink-0 min-h-0 flex-col overflow-y-auto 2xl:w-[400px]"
              style={{ background: PHOTO.surface, borderLeft: `1px solid ${PHOTO.edge}` }}
            >
              {stripsUp ? <div className="border-b" style={{ borderColor: PHOTO.edge }}>{strips}</div> : null}
              {copilotSheet ?? toolSheet ?? inspector}
            </aside>
          </div>
        </div>
      )}
      {socialModal}
      {showTemplatesModal && (
        <StudioTemplatesModal
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={handleSelectStudioTemplate}
          stillOnly
        />
      )}
      {vector && (
        <VectorStudio
          initial={(() => {
            const was = vector.editing ? marks.find((one) => one.id === vector.editing)?.art?.doc : null;
            return was && typeof was === 'object' && Array.isArray((was as VectorDoc).items) ? was as VectorDoc : null;
          })()}
          onClose={() => setVector(null)}
          onDone={({ svg, doc }) => {
            const aspect = Math.max(0.2, Math.min(5, doc.w / doc.h));
            beforeLayers(t('post.stepVector', 'putting vector art in'));
            if (vector.editing && marks.some((one) => one.id === vector.editing)) {
              changeMark(vector.editing, { art: { svg, doc }, stretch: aspect });
            } else {
              const id = freshId();
              setMarks((was) => [...was, { ...newMark('art', id), ink: '#ffffff', glow: 'none', size: 0.7, stretch: aspect, art: { svg, doc }, z: frontZ(was, words) }]);
              setMarkOn(id);
            }
            setVector(null);
            setBench('shapes');
          }}
        />
      )}
      {poster && (
        <PosterMaker
          photo={picture}
          onClose={() => setPoster(false)}
          onMade={(img, shape) => {
            madeWhole(img, shape, t('post.stepPoster', 'making a poster'));
            setPoster(false);
            setSaid(t('post.posterDone', 'Your poster is on the post. Change anything with the tools below, or press Undo to take it back.'));
          }}
        />
      )}
      {tryOn && (
        <TryOn
          photo={picture}
          onClose={() => setTryOn(false)}
          onMade={(img, shape) => {
            madeWhole(img, shape, t('post.stepTryOn', 'putting the clothes on a model'));
            setTryOn(false);
            setSaid(t('post.tryOnDone', 'The model is wearing it, on the post. Press Undo to go back to the photo you had.'));
          }}
        />
      )}
      {product && (
        <ProductShots
          photo={picture}
          onClose={() => setProduct(false)}
          onMade={(img, shape) => {
            madeWhole(img, shape, t('post.stepProduct', 'making a product photo'));
            setProduct(false);
            setSaid(t('post.productDone', 'Your product photo is on the post. Press Undo to go back to the photo you had.'));
          }}
        />
      )}
      {darkroom && (
        <Darkroom
          picture={picture}
          onClose={() => setDarkroom(false)}
          onDone={(developed) => {
            before(t('post.stepDevelop', 'developing it'));
            asPicture(developed, (made) => {
              setWhole(picture);
              setPicture(made);
              setDarkroom(false);
              flash();
            }, () => setSaid(t('post.developFailed', 'The developed photograph could not be made.')));
          }}
        />
      )}
      {showSizeModal && (
        <CanvasSizeModal
          currentWidth={size.width}
          currentHeight={size.height}
          onClose={() => setShowSizeModal(false)}
          onApplySize={handleApplyCanvasSize}
        />
      )}
    </div>
  );
}
