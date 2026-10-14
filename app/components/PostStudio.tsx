'use client';

/**
 * A post: a picture, and words on it that are actually words.
 *
 * ── What she asked for, and the one part that is a refusal ───────────────
 *
 * Carli, 6 October 2026: *"Kan ons 'n image generator kry, asook 'n image
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
 * Carli, same message: *"'n Album art kan net op die spot generate word, of
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
import {
  ArrowLeft,
  Bookmark,
  Circle, Crop as CropIcon, Download, FlipHorizontal, Image as ImageIcon, Lasso, LayoutTemplate, Loader2, Maximize2, Move, Pencil, Plus, Redo2, RotateCcw, RotateCw, ScanText, SlidersHorizontal, Sparkles, Spline, Square, Trash2, Type, Undo2, X,
} from 'lucide-react';
import { assetId, rememberAsset, thumbnailOf } from '../lib/assets';
import { GLOWS, glowOf, haloPasses, NEON_WORDS, type GlowId } from '../lib/postglow';
import { TITLE_STYLES } from '../lib/posttitles';
import {
  MARK_INKS, MARK_SIZES, MARK_SPECS, MARK_SPOTS, drawMark, newMark, type Mark,
} from '../lib/postshapes';
import {
  fromFrame, maskFor as maskOfLine, middleOf, ontoFrame, pickAt, picksFrom,
  shareOf as shareOfLine, type Pick,
} from '../lib/textpick';
import {
  BACKDROPS, LETTER_GAP, LINE_GAP, POST_SIZES, SPOTS, atInside, atOf, behindWords,
  blockAt, boxAround, boxFor as boxOfSpot, clashes, fitText, measureWithGap, moveInside,
  sizeById,
  type At, type Backdrop, type Measure, type PostSize, type SpotId,
} from '../lib/posttext';
import { ALL, boxOf } from '../lib/safezones';
import { CREDITS, creditsSaid } from '../lib/credits';
import { ACCEPTS, fit } from '../lib/imagefile';
import { useBackLayer } from '../lib/backstack';
import RoomDock, { type Bench, type BenchSpec } from './CutDock';
import { useSideways } from '../lib/sideways';
import { useAtDesk } from '../lib/atdesk';
import DeskSheet from './BoothCard';
import CanvasSizeModal from './CanvasSizeModal';
import StudioTemplatesModal from './StudioTemplatesModal';
import { type StudioTemplateItem } from '../lib/studiotemplates';
import { CUT_LOOK } from '../lib/cutlook';
import { PHOTO } from '../lib/photolook';
import { ROOM_HEIGHT_GUESS, useOwnScreen, useRoomHeight } from '../lib/fullroom';
import { FACES, faceOf, faceReady, type FaceId } from '../lib/postfaces';
import {
  MIDDLE, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP,
  canMove, moveBy, place, showsThrough, zoomTo, type Crop,
} from '../lib/postcrop';
import {
  AUTO, PLAIN, RANGES, filterFor, touched, warmWash, type Look,
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
import { REFERENCE_SIDE, packLed, packOne, roomForRefs } from '../lib/packpicture';
import { BUDGET } from '../lib/picturelimit';
import {
  LIVE_SECONDS, MOTIONS, MOTION_DEFAULT, motionWords,
} from '../lib/livingphoto';
/* `SHAPES` is already taken in this room by the pen's shapes — pencil,
   circle, square, line. These are the ratios a picture can be asked for. */
import { SHAPES as RATIOS, SHAPE_DEFAULT, type ShapeId } from '../lib/pictureshapes';
import { usePlain, useSetPlain } from '../lib/plainmode';
import { TEMPLATES, type Template } from '../lib/posttemplates';
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
import { accessToken } from '../lib/cloud';
import { stillWorthWaiting } from '../lib/jobwait';

const MIKRO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';

/* ── One control, one row ─────────────────────────────────────────────────
 
   Carli, 7 October 2026: *"bars binne pop outs moet ewe groot en lank wees,
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
 * Carli, 8 October 2026: *"Die export se png en jpg buttons moet highlight
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
   * Carli, 8 October 2026: *"Die woord op die screen kan nog nie geskuif en
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
   * The light the line gives off — Carli, 13 October 2026: "Neon,
   * futuristic, phantasm". Absent is none. `lib/postglow.ts` says how it
   * is drawn so that it exports.
   */
  readonly glow?: GlowId;
}

/**
 * One post, one id, for as long as it is open.
 *
 * `spend_credits` charges once per reference, so exporting the same post
 * twice is one credit. Changing the words is the same post; starting a new
 * one is not.
 */
/* ── The cutting room's colours ───────────────────────────────────────────
 
   Taken from `VideoEditor.tsx` rather than guessed at, so the two rooms are
   the same room with different work in them. The floor is the one Carli
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
 
       Carli, 7 October 2026: *"Ek weet nogsteeds nie wat is die read it
       funksie in die photo editor nie."* — the second time she had asked.
 
       "Read" is the wrong word in an app with three rooms that read things
       ALOUD: it sounds like a voice, not like a camera. What it does is take
       the words that are printed inside a photograph — a poster, a sign, a
       label, a page — and hand them back as text. "Grab the words" says
       that, and it says it in two words a thumb can read on a bar. */
    /* ── "Grab", once it really grabs more than words ────────────────
 
       Carli, 11 October 2026: *"Ek dink hierdie funksie by photo editor
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
      'Save the picture to your device, or send it next door as a film\u2019s cover. The same one credit either way, and only once per post.',
    ],
    paid: true,
  },
] as const;

/* ── The eight tools ───────────────────────────────────────────────────
   Carli, 14 October 2026: *"Ek dink daar moet funksie buttons onder aan die
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
const POST_TOOLS: readonly BenchSpec[] = [
  POST_STARTS, POST_UPPER[0], POST_UPPER[1], POST_UPPER[2], POST_LOWER[0], POST_LOWER[1], POST_SHAPES, POST_LOWER[2],
];
const POST_SHORT: Record<string, readonly [string, string]> = {
  starts: ['post.toolStarts', 'Designs'],
  pic: ['post.toolPic', 'Photo'],
  frame: ['post.toolFrame', 'Crop'],
  tone: ['post.toolTone', 'Adjust'],
  read: ['post.toolRead', 'Grab'],
  text: ['post.toolText', 'Text'],
  shapes: ['post.toolShapes', 'Shapes'],
  save: ['post.toolSave', 'Export'],
};
/** A tool along the foot on a phone: an icon over a word, small. */
const TOOL_FOOT = 'flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-0 text-[9px] font-bold leading-tight';
/** A tool down the rail at a desk. */
const TOOL_RAIL = 'flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-transparent px-0.5 text-[10px] font-bold leading-tight';

const freshId = (): string => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function PostStudio({
  onClose, onIntoFilm, asRoom = false, copilot, atDoor = false,
}: {
  readonly onClose: () => void;
  /**
   * Drawn as a room of its own rather than a sheet over whatever was behind.
   *
   * Carli, 7 October 2026: *"Make hooks the same shape as video desk and add
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
   * Carli reported exactly that about the cutting room on 4 October: *"Die
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
   * Carli, 8 October 2026: *"dat die masjien self objekte en text
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
  const [picked, setPicked] = useState<Pick | null>(null);
  /* ── The things in the picture, beside the words in it ────────────────
 
     Carli, 11 October 2026: *"dan moet die objekte en woorde gehighlight
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
 
     Carli, 11 October 2026: *"om 'n logo, of 'n objek se kleur te kan
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
  const lastMask = useRef<{ readonly mask: HTMLCanvasElement; readonly of: HTMLImageElement } | null>(null);
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
     Carli, 9 October 2026: *"daar moet van alles wat opsies is, 'n
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

     Carli, 10 October 2026: *"Ek wonder ook of google se modelle net bietjie
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
          /* The post's own shape, so a story-shaped post comes back
             story-shaped rather than needing a crop. */
          aspect: size.height > size.width ? '9:16' : size.width > size.height ? '16:9' : '1:1',
          seconds: LIVE_SECONDS,
          speak: false,
          image: frame,
          /* The same photograph again. This is what makes it loop. */
          endImage: frame,
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
  /** Which bench is open on the bar. */
  const [bench, setBench] = useState<Bench>(null);
  /* The shapes on the picture — `lib/postshapes.ts`. Drawn under the words
     and over the photograph, and exported with both. */
  const [marks, setMarks] = useState<Mark[]>([]);
  /* ── Cutting the photograph down, which is not the same as framing it ───
 
     Carli, 7 October 2026: *"Ek sien nie goeie cropping en cutting tools
     nie."* `postcrop.ts` chooses which part of a photograph shows through a
     frame; this cuts the rest of the photograph away for good. `cropbox.ts`
     carries the difference and why both belong here.
 
     `null` is not cropping. A box is, and while there is one the glass shows
     the WHOLE photograph with the box over it — which is what every editor
     does, and the only way to drag a corner you cannot see. */
  const [cropBox, setCropBox] = useState<CropBox | null>(null);

  /* ── What kind of file, and how big ────────────────────────────────────
 
     Carli, 7 October 2026: *"Ook die formaat van export?"* It was a PNG at
     the post's own size, always, with no choice. `lib/postfile.ts` carries
     the two formats, why the other four were left out, and the one thing
     about JPEG that has to be said out loud. */
  /* ── Simple, or every choice there is ────────────────────────────────
 
     Carli's list, 7 October 2026: *"Simple en advances opsies."* Every tool
     is in both; what simple hides is the rungs. `lib/plainmode.ts` carries
     why that distinction is the whole design. */
  const plain = usePlain();
  const setPlain = useSetPlain();

  const [kind, setKind] = useState<FileKind>('png');
  const [scale, setScale] = useState<Scale>(1);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [exportQuality, setExportQuality] = useState<'draft' | 'standard' | 'ultra'>('standard');
  const grip = useRef<Grip>(null);

  /* ── Drawing round a thing, which is the third way to cut one out ──────
 
     Carli, 7 October 2026: *"Gaan aan met die free-hand cut."*
 
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

  /** Remember the picture as it is, then let the caller replace it. */
  const before = (what: string): void => {
    history.current.remember(what, picture);
    setTold((n) => n + 1);
  };

  const stepBack = (): void => {
    const shot = history.current.undo(picture);
    if (!shot) return;
    setPicture(shot.picture);
    /* The mask belongs to a picture that is no longer on the glass, and
       changing the cut edge after stepping back would put the old cut on
       the new picture. */
    lastMask.current = null;
    setTraced(null);
    setCropBox(null);
    setTold((n) => n + 1);
    setSaid(t('post.undone', 'Put back.'));
  };

  const stepOn = (): void => {
    const shot = history.current.redo(picture);
    if (!shot) return;
    setPicture(shot.picture);
    lastMask.current = null;
    setTold((n) => n + 1);
    setSaid('');
  };

  const [traced, setTraced] = useState<Traced | null>(null);
  const tracingNow = useRef(false);
  /* ── Which of the four, and where the drag started ────────────────────
 
     Carli, 8 October 2026: *"'N circle, 'n vierkand, 'n lyn, 'n pencil waar
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

  const [cutShape, setCutShape] = useState<CutShape>('pencil');
  const cutFrom = useRef<{ readonly x: number; readonly y: number } | null>(null);

  /* Where each block of words landed last time it was drawn, as shares of
     the frame, so a thumb can find the one it is on. */
  const laidOut = useRef(new Map<string, {
    readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  }>());
  /** The line a thumb is currently carrying, and where it took hold. */
  const carrying = useRef<{ readonly id: string; readonly dx: number; readonly dy: number } | null>(null);
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
    const want = guides
      ? Math.min(1, PREVIEW_LONGEST / Math.max(size.width, size.height))
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
    /* Setting width or height clears the canvas to transparent, so "nothing
       behind it" is the absence of this fill rather than a colour. */
    if (back) {
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
          ctx.fillStyle = ((x / step) + (y / step)) % 2 === 0 ? '#3f3f46' : '#27272a';
          ctx.fillRect(x, y, step, step);
        }
      }
      ctx.setTransform(had);
    }

    if (picture) {
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
      const at = place(picture, size, cropBox || traced || picking ? WHOLE_VIEW : crop);
      /* The look goes on the PICTURE and comes off again before anything is
         written. Words under a blur are not a style, they are a mistake, and
         a filter left set would put every one of them through it. */
      ctx.filter = filterFor(look, to.width / size.width);
      ctx.drawImage(picture, at.left, at.top, at.width, at.height);
      ctx.filter = 'none';

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
        }
        ctx.restore();
      }

      const wash = warmWash(look);
      if (wash) {
        /* Clipped to the picture, not the frame. A warm wash over the
           background as well would tint the colour she chose behind it,
           which is a control reaching past what it says it does. */
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          Math.max(0, at.left), Math.max(0, at.top),
          Math.min(at.width, size.width), Math.min(at.height, size.height),
        );
        ctx.clip();
        ctx.globalCompositeOperation = wash.how;
        ctx.fillStyle = wash.ink;
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.restore();
      }
    }

    /* The shapes, under the words: a ring behind a word is a halo, a
       word behind a ring is a mistake. */
    for (const mark of marks) drawMark(ctx, mark, size.width, size.height);

    for (const one of words) {
      if (!one.text.trim()) continue;
      const chosen = faceOf(one.face);
      const box = moveInside(boxOfSpot(one.spot, size), size);
      /* ── Measured with the letter spacing in it ──────────────────────
 
          A gap applied at the drawing and not at the measuring gives text
          that overflows the box it was fitted to, which is the whole job
          `fitText` exists to do. */
      const letterGap = one.letterGap ?? LETTER_GAP.normal;
      const lineGap = one.lineGap ?? LINE_GAP.normal;
      const measure = measureWithGap(
        measureWith(ctx, chosen.css, chosen.weight), letterGap,
      );
      const fit = fitText(one.text, box, size, measure, { lineHeight: lineGap });
      ctx.font = `${chosen.weight} ${fit.px}px ${chosen.css}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      /* Where the block goes: wherever she put it, or where the spot says
         if she has not moved it. Centred on the point, because that is
         what dragging a thing to a place means. */
      const put = blockAt(
        one.at ?? atOf(one.spot), fit.lines.length, fit.px, lineGap, size,
      );

      /** One line, with the letters spaced by hand.
 
          `ctx.letterSpacing` exists and is not used: it adds a gap after
          the LAST letter as well, so a centred line comes out off-centre by
          half a gap — and it is missing from enough browsers that the
          export and the preview could disagree on one and not the other.
          Drawn letter by letter, the arithmetic is ours and is the same
          everywhere. */
      const writeLine = (line: string, atX: number, atY: number): void => {
        if (letterGap === 0) {
          ctx.fillText(line, atX, atY);
          return;
        }
        const gap = letterGap * fit.px;
        const wide = ctx.measureText(line).width + Math.max(0, line.length - 1) * gap;
        let x = atX - wide / 2;
        const was = ctx.textAlign;
        ctx.textAlign = 'left';
        for (const letter of line) {
          ctx.fillText(letter, x, atY);
          x += ctx.measureText(letter).width + gap;
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
          and putting it in state would make every draw cause another. */
      laidOut.current.set(one.id, {
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
    picking, found, picked]);

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
    /* ── Picking a line out of the photograph, before anything else ────

        A mode she turned on, so a thumb means one thing while it is on and
        there is nothing to guess at. Same shape as cropping and tracing. */
    if (picking) {
      const put = shareAt(event);
      if (!put || !found) return;
      setPicked(pickAt(found, put.x, put.y));
      return;
    }
    /* ── The words next, because a thumb on a word means the word ─────
 
        Carli, 8 October 2026: *"Die woord op die screen kan nog nie
        geskuif en gecrop word nie."* Before this, a drag on the glass
        could only ever mean the picture, and the caption went where the
        spot said and stayed there.
 
        Checked before panning and after cropping: a crop or a trace is a
        mode somebody turned on and is unambiguous, and a thumb that lands
        on a word while neither is on means the word. */
    if (!cropBox && !traced && words.length > 0) {
      const put = frameAt(event);
      if (put) {
        for (const one of words) {
          const was = laidOut.current.get(one.id);
          if (!was) continue;
          if (Math.abs(put.x - was.x) > was.w / 2 || Math.abs(put.y - was.y) > was.h / 2) continue;
          carrying.current = { id: one.id, dx: put.x - was.x, dy: put.y - was.y };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
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
    if (!movable) return;
    lastAt.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const held = carrying.current;
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
      setCropBox((now) => (now ? pullCorner(now, held, put.x, put.y) : now));
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

  const letGo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    lastAt.current = null;
    grip.current = null;
    tracingNow.current = false;
    cutFrom.current = null;
    carrying.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** Whether anything she has written lands under the platform's furniture. */
  const covered = useMemo(
    () => words.some((one) => one.text.trim()
      && clashes(boxAround(one.at ?? atOf(one.spot), size), size)),
    [words, size],
  );

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
    const made = await fit(file, Math.max(size.width, size.height));
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
      setPicture(img);
      setCrop(MIDDLE);
      setLook(PLAIN);
      setWhole(null);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => setSaid(t('post.badFile', 'That file could not be read as a picture.'));
    img.src = made.preview;
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
  /**
   * Paid for, then drawn. One road for both ways out.
   *
   * ── Why the film has to come through here too ────────────────────────
   *
   * Carli: *"Dit is vir plasings vir sosiale media en kan ook in die video
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
   * straight into a film costs the one credit it would have cost to save.
   */
  const paidPicture = async (): Promise<Blob | null> => {
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
    const sheet = document.createElement('canvas');
    const how = formatOf(kind);
    const exportScale: Scale = exportQuality === 'ultra' ? 2 : (scale === 2 ? 2 : 1);
    const qualityFactor = exportQuality === 'draft' ? 0.72 : exportQuality === 'ultra' ? 0.98 : 0.92;
    const baseQuality = typeof how.quality === 'number' ? how.quality : 0.92;
    const effectiveQuality = Math.min(1, Math.max(0.1, baseQuality * (qualityFactor / 0.92)));
    draw(sheet, false, exportScale);
    if (false as boolean) draw(sheet, false, scale);
    if (!how.clear && !back) {
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
    const blob = await new Promise<Blob | null>((done) => sheet.toBlob(done, how.type, effectiveQuality));
    if (!blob) setSaid(t('post.noExport', 'That could not be exported.'));
    return blob;
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
      const effectiveScale: Scale = exportQuality === 'ultra' ? 2 : (scale === 2 ? 2 : 1);
      a.download = nameFor(size.id, kind, effectiveScale);
      a.click();
      URL.revokeObjectURL(url);
      setSaid(t('post.saved', 'Saved to your device.'));
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
    made.width = cut.width;
    made.height = cut.height;
    const ctx = made.getContext('2d');
    if (!ctx) return;
    /* No smoothing to set and no filter: this is a one-to-one copy of a
       rectangle of pixels, not a resize, so there is nothing to interpolate
       and the cut is exactly what was on the glass. */
    ctx.drawImage(picture, cut.x, cut.y, cut.width, cut.height, 0, 0, cut.width, cut.height);
    before(t('post.stepCrop', 'cutting it down'));
    asPicture(
      made,
      (one) => {
        setPicture(one);
        setCropBox(null);
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
 
     Carli's list, 7 October 2026: *"Prent editor om nog canva funksies in te
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
        setSaid('');
      },
      () => setSaid(failed),
    );
  };

  /**
   * A whole post, in one press, for the thing she is actually making.
   *
   * Carli's list, 7 October 2026: *"Video, etc templates."* The empty room is
   * the hardest screen in this app — a picture, a shape, three fonts and a
   * blank text box is twenty decisions before the first word. This is a
   * shape, a look and the words already in place; everything in it is hers
   * the moment she touches it. `lib/posttemplates.ts` has the six.
   *
   * The picture is left exactly as it is. Somebody who has brought one in and
   * spent two minutes cutting a person out of it does not want a template to
   * take it away, and somebody who has not can bring one in afterwards.
   */
  const startFrom = (one: Template): void => {
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
    setSize(shape);

    if (tpl.bgGradient?.includes('#')) {
      const match = tpl.bgGradient.match(/#[a-fA-F0-9]{6}/);
      if (match) {
        setBack(match[0]);
        setLastColour(match[0]);
      }
    }

    if (tpl.previewSvg) {
      const img = new Image();
      img.onload = () => {
        setWhole(img);
        setPicture(img);
        setCrop(MIDDLE);
      };
      img.src = tpl.previewSvg;
    }

    const headlineText = lang === 'af' ? tpl.nameAf : tpl.nameEn;
    const subText = tpl.sampleSubtext || (lang === 'af' ? tpl.subAf : tpl.subEn);
    const newWords: Words[] = [
      {
        id: freshId(),
        text: tpl.sampleHeadline || headlineText,
        face: 'poster',
        spot: 'top',
        ink: '#ffffff',
        behind: 'none',
      },
    ];
    if (subText) {
      newWords.push({
        id: freshId(),
        text: subText,
        face: 'plain',
        spot: 'bottom',
        ink: '#93c5fd',
        behind: 'none',
      });
    }
    setWords(newWords);
    setShowTemplatesModal(false);
    setBench('text');
    setSaid(t('stpl.applied', 'Template applied. You can edit any element, text or canvas size.'));
  };

  const handleApplyCanvasSize = (w: number, h: number, label: string): void => {
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
    if (!had) return;
    const wide = had.of.naturalWidth || had.of.width;
    const tall = had.of.naturalHeight || had.of.height;
    asPicture(
      maskOnto(had.of, had.mask, wide, tall, edgeOf(how)),
      (one) => setPicture(one),
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

  useEffect(() => { if (rubbing) drawRub(); });

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
  /** Where the thumb was a moment ago, so a stroke is a line and not a dot. */
  const lastRub = useRef<{ readonly x: number; readonly y: number } | null>(null);

  /* ── The three things she can do with a line she tapped ───────────

      Carli, 8 October 2026: *"dan kan die klient op die objekte of text
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
   * Carli, 8 October 2026: *"Find the words kry die woorde, maar van daar af
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
        .map((line, n) => ({
          id: freshId(),
          text: line,
          face: FACES[0].id,
          spot: (n === 0 ? 'bottom' : 'top') as SpotId,
          ink: '#ffffff',
        }));
    if (!made.length) return;
    setWords((was) => [...was, ...made]);
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
    setWords((was) => [...was, {
      id: freshId(),
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
    setBench('text');
    setSaid(t(
      'post.lineGrabbed',
      'Those words are on the picture now and you can change them — the face, the colour, the spacing, and dragging them where you want. The ones in the photograph are still underneath; take them out if you want only yours.',
    ));
  };

  /**
   * Take a plain background off — the cut that is not a person.
   *
   * Carli, 10 October 2026, of a logo this app had just made her: *"Well this
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
  const takeFlatGround = (): void => {
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
    const done = takeGround(
      { data: was.data, width: wide, height: tall },
      groundReach,
    );
    if (done.grounds.length === 0 || done.removed < 0.004) {
      setSaid(t(
        'post.groundNone',
        'There is no plain background in this picture to take away. This one looks at the edges of the frame and removes what it finds there — it works on a logo, a drawing, or something photographed on a plain sheet. For a person, use Remove the background above.',
      ));
      return;
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
  };

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
   * Charged, two credits, once per press however much is in the picture —
   * `CREDITS.grab` carries why. The boxes land in the same list the reader
   * fills, so they are drawn and tapped by the code that already existed.
   */
  const findThings = async (): Promise<void> => {
    if (!picture || looking) return;
    const wide = picture.naturalWidth || picture.width;
    const tall = picture.naturalHeight || picture.height;
    /* `looked` and not `sheet`, deliberately. The paid export's canvas is
       called `sheet`, and `check:postpaid` allows a maker through by the
       name in front of the dot — so naming `sheet.toDataURL` to let this
       request body through would have excused the paid road out with it.
       The shelf's canvas is named `shelved` for the same reason. */
    const looked = document.createElement('canvas');
    looked.width = wide;
    looked.height = tall;
    looked.getContext('2d')?.drawImage(picture, 0, 0);
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
          /* Not a road out: this string is the request body, sent to our
             own route and never handed to the person. `check:postpaid`
             counts every `toDataURL` in this file because each one COULD
             be a way to take a picture off the device without paying, and
             this one is named in its allowlist for that reason. */
          picture: looked.toDataURL('image/png').split(',')[1] ?? '',
          mime: 'image/png',
          wide,
          tall,
        }),
      });
      const body = (await answer.json().catch(() => ({}))) as {
        found?: Found[]; message?: string;
      };
      if (!answer.ok) {
        setSaid(body.message ?? t('post.thingsNo', 'The things in this picture could not be found.'));
        return;
      }
      const rows = body.found ?? [];
      if (!rows.length) {
        setSaid(t('post.thingsNone', 'Nothing in this picture came back as a separate thing. A photograph of one subject on a plain ground usually does better with Take a plain background off.'));
        return;
      }
      /* Shares, because that is the space `pickAt` and the highlights work
         in — and a box handed over in pixels would land in the corner. */
      const picks: Pick[] = rows.map((one) => {
        const id = freshId();
        things.current.set(id, one);
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
      setFound([...(found ?? []), ...picks]);
      setPicking(true);
      setSaid(t('post.thingsFound', 'Tap one to lift it out. {n} found.')
        .replace('{n}', String(picks.length)));
    } catch {
      setSaid(t('post.thingsNo', 'The things in this picture could not be found.'));
    } finally {
      setLooking(false);
    }
  };

  /**
   * Lift a found thing out of the photograph, with its mask as its edge.
   *
   * What comes back is the thing on nothing — so it can be moved, painted
   * with the colours above, or saved as a PNG. `Put it back` restores the
   * photograph, exactly as it does after the background remover.
   */
  const liftThing = (one: Pick): void => {
    const thing = things.current.get(one.id);
    if (!thing || !picture) return;
    if (!thing.mask) {
      /* A box with no mask is a box. Cutting a rectangle out and calling it
         the thing would look like the engine being bad at edges, so it is
         said instead. */
      setSaid(t('post.thingNoMask', 'The engine found that one but did not send its shape, so it cannot be lifted out cleanly. Try Find the things again, or use Cut out a shape and draw round it.'));
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
      before(t('post.stepThing', 'lifting a thing out'));
      asPicture(out, (img) => {
        setWhole(picture);
        setPicture(img);
        setPicking(false);
        setPicked(null);
        setFound(null);
        nothingBehind();
        setSaid(t('post.thingDone', 'Lifted out, on nothing. Paint it, move it, or save it as a PNG — press Put it back for the photograph.'));
      }, () => setSaid(t('post.thingFailed', 'That one could not be lifted out.')));
    };
    maskImg.onerror = () => setSaid(t('post.thingFailed', 'That one could not be lifted out.'));
    maskImg.src = `data:image/png;base64,${thing.mask}`;
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
   * Carli, 9 October 2026: *"Ek sien nie veranderinge met ons nuwe tools in
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
   * Carli, 8 October 2026: *"Take the background out gee die ilusie dat dit
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
  const nothingBehind = (): void => setBack(null);

  const cutBackground = async (): Promise<void> => {
    if (!picture || cutting !== null) return;
    setSaid('');
    setCutting(0);
    try {
      const cut = await cutOut(picture, (part) => setCutting(part), edgeOf(edge));
      if (!cut.ok) {
        /* One button for both kinds of picture (Carli, 14 October 2026:
           "Die transparency en background remover werk alweer nie reg
           nie"). She had pressed the plain-background one on a photograph
           of a person, which takes only what matches the edge of the frame.
           So the person model goes first, and only when it finds nobody —
           a logo, a drawing, a product on a sheet — does the plain one run. */
        if (cut.why === 'nobody') { takeFlatGround(); return; }
        setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.'));
        return;
      }
      lastMask.current = { mask: cut.mask, of: picture };
      before(t('post.stepCut', 'taking the background out'));
      asPicture(cut.canvas, (one) => {
        setWhole(picture);
        setPicture(one);
        nothingBehind();
        setSaid(t('post.cutDoneShort', 'Background removed. Save as PNG to keep it see-through.'));
      }, () => setSaid(t('post.cutFailed', 'The background could not be taken out of that picture.')));
    } finally {
      setCutting(null);
    }
  };

  /**
   * The person kept sharp, and the room behind them put out of focus.
   *
   * Carli's list of modern tools, 7 October 2026: *"auto focus, blur"*. The
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
   * Carli, 8 October 2026: *"Daar moet ook ’n opsie wees om ’n foto binne
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
 
     Carli asked for the tools along the bottom, and the app's own tab bar is
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

     Carli, 9 October 2026: *"Die website moet nie lyk soos 'n foon app
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
 
     Carli, 7 October 2026: *"Die photo editor moet ook netjies wees. Die
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
 
     Carli, 7 October 2026: *"Ek sien nie goeie cropping en cutting tools
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
   * Carli, 8 October 2026: *"Daai moet eerder 'n ander naam kry.
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
      className="flex-shrink-0 space-y-2 border-t px-4 py-3"
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
        onClick={() => { setCropBox(ALL_OF_IT); setBench(null); }}
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
      className="flex-shrink-0 space-y-2 border-t px-4 py-3"
      style={asRoom
        ? { borderColor: 'rgba(16,185,129,0.25)', background: FLOOR }
        : { borderColor: 'rgb(39,39,42)', background: 'rgb(9,9,11)' }}
    >
      <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
        {t(
          'post.cutDownHow',
          'Drag the corners on the picture to say how much you are keeping. Everything shaded is thrown away.',
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
            onClick={() => setCropBox((now) => (now && picture
              ? toShape(now, {
                width: picture.naturalWidth || picture.width,
                height: picture.naturalHeight || picture.height,
              }, want)
              : now))}
            className={LEEG}
          >
            {says}
          </button>
        ))}
      </div>
      <div className={RY}>
        <button type="button" data-postcropdo onClick={cutItDown} className={VUL}>
          <CropIcon className="h-4 w-4" />
          {t('post.cutDownDo', 'Cut to this')}
        </button>
        <button
          type="button"
          data-postcropstop
          onClick={() => setCropBox(null)}
          className={LEEG}
        >
          {t('post.cutDownStop', 'Leave it')}
        </button>
      </div>
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
        onClick={() => setBack(back === null ? lastColour : null)}
        className={back === null ? VUL.replace('w-full ', '') : LEEG}
      >
        {back === null
          ? t('post.clearOn', 'Nothing behind it')
          : t('post.clearOff', 'Take the background off')}
      </button>
    </div>

    {/* ── A photograph given a little motion ─────────────────────────

        Carli, 10 October 2026: *"Ek wonder ook of google se modelle net
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
      <div data-postlive className={`${RY} flex-col items-stretch gap-2`}>
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
              className={`${LEEG} ${motion === one.id ? GEKIES : ''}`}
            >
              {t(one.says[0], one.says[1])}
            </button>
          ))}
        </div>
        <span className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(113,113,122)' }}>
          {t(
            MOTIONS.find((one) => one.id === motion)?.what[0] ?? 'post.liveWhat',
            MOTIONS.find((one) => one.id === motion)?.what[1] ?? 'Any photograph',
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-postlivego
            disabled={liveBusy || Boolean(liveJob)}
            onClick={() => { void bringToLife(); }}
            className={`${LEEG} disabled:opacity-40`}
          >
            {liveJob
              ? t('post.liveBusy', 'Making it…')
              : `${t('post.liveGo', 'Bring it to life')} · ${creditsSaid(CREDITS.video * LIVE_SECONDS / 5, t)}`}
          </button>
          {liveUrl && (
            <a
              href={liveUrl}
              download="futurebox-live.mp4"
              data-postlivesave
              className={LEEG}
            >
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
              muted
              playsInline
              className="w-full rounded-xl border border-zinc-800"
            />
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

        Carli, 9 October 2026: *"Ek sien nie veranderinge met ons nuwe tools
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
    <div data-postask className={`${RY} flex-col items-stretch gap-2`}>
      <div className={MIKRO}>
        {picture
          ? t('post.askTitle', 'Change it by saying what to change')
          : t('post.makeTitle', 'Make a picture by saying what you want')}
      </div>
      <textarea
        data-postaskwords
        value={askWords}
        onChange={(event) => setAskWords(event.target.value)}
        rows={2}
        maxLength={500}
        placeholder={picture
          ? t('post.askHint', 'Take the car out of the background. Make it evening. Write SALE on the window.')
          : t('post.makeHint', 'A konsertina on a stoep at sunset, warm light, film grain.')}
        className="w-full rounded-xl border border-zinc-800 bg-black/30 p-3 text-[14px] leading-relaxed outline-none focus:border-emerald-500/60"
        style={asRoom ? { color: INK } : undefined}
      />
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
            className="relative h-10 w-10 overflow-hidden rounded-lg border border-zinc-700"
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
 
        Carli, 7 October 2026: *"BG remover"*. It looks for a PERSON —
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
          onClick={() => void cutBackground()}
          className={`${LEEG} disabled:opacity-40`}
        >
          {cutting !== null
            ? `${Math.round(cutting * 100)}%`
            : t('post.cutGo', 'Remove the background')}
        </button>
        {/* How hard the cut edge is.
 
            Carli, 7 October 2026, with a photograph of herself cut out:
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
 
            Carli, 10 October 2026, of a logo this app had just made her:
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
 
            Carli, 11 October 2026: *"om 'n logo, of 'n objek se kleur te kan
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
              className="h-11 w-11 flex-shrink-0 cursor-pointer rounded-xl border border-zinc-700 bg-transparent p-1"
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
 
            Carli's list, 7 October 2026: *"auto focus, blur"*. Beside taking
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

            Carli, 8 October 2026: *"Daar is nou ’n blur behind a person, dit
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
    {/* ── Taking something small out ─────────────────────────────────
 
        Carli, 7 October 2026: *"magic eraser"*. This grows the pixels
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
        data-span={(() => { const m = smear.current; if (!m || !picture) return 'none';
          const w = picture.naturalWidth || picture.width; let a=1e9,b=-1,n=0;
          for (let i=0;i<m.length;i++) if (m[i]) { n++; const x=i%w; if(x<a)a=x; if(x>b)b=x; }
          return JSON.stringify({ w, n, a, b, smeared }); })()}
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
            onClick={() => setSize(one)}
            className={`${LEEG} ${one.id === size.id ? GEKIES : ''}`}
          >
            {one.name} · {one.width}×{one.height}
          </button>
        ))}
      </div>
      <div className={`mt-2 ${RY}`}>
        <button
          type="button"
          onClick={() => setShowSizeModal(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-teal-500/50 bg-teal-500/10 px-3 text-xs font-bold text-teal-300 hover:brightness-110 active:scale-95 transition-all text-center"
        >
          <Maximize2 className="h-4 w-4 text-teal-400" />
          {t('size.customOrStandard', 'Standard & Custom Sizes')}
        </button>
        <button
          type="button"
          onClick={() => setShowTemplatesModal(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-500/10 px-3 text-xs font-bold text-purple-300 hover:brightness-110 active:scale-95 transition-all text-center"
        >
          <LayoutTemplate className="h-4 w-4 text-purple-400" />
          {t('stpl.openTemplates', 'Templates & Starter Packs')}
        </button>
      </div>
      <p className="pt-2 text-[13px] leading-relaxed text-zinc-500">{size.what[lang]}</p>
    </div>

    {/* ── Cutting it down, with the frame and not with the picture ──────
 
        Carli, 7 October 2026: *"Ek dink wel cutting moet by The frame wees
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
 
        Carli, 7 October 2026, having found the screen: *"Waar edit ek 'n
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
            onClick={() => setCrop((was) => ({ ...was, zoom: ZOOM_MIN, x: 0, y: 0 }))}
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
          {movable
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

  const toneBench = (
    <div className="space-y-4">
    {/* ── How it reads ───────────────────────────────────────────────
 
        Carli, 7 October 2026, listing what a modern editor has: *"auto
        focus, blur ... Dit is alles code wat ons oor tyd kan develop om
        ons editing tools te upgrade."*
 
        This is the half of that list which runs on the phone for
        nothing. The other half — taking an item out and putting another
        in, a real upscaler, motion on a still — needs an engine and a
        price per use, and the price is hers.
 
        No "sharpen". A canvas filter has none, and raising contrast and
        calling it focus would be a control that lies about what it did:
        nothing recovers a photograph that was soft when it was taken.
        `AUTO` is honest about being a lift. */}
    {picture && (
      <div
        data-postlook
        className="space-y-3 rounded-xl border p-3"
        style={asRoom
          ? { borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(52,211,153,0.06)', boxShadow: RAISE }
          : { borderColor: 'rgb(39,39,42)', background: 'rgba(24,24,27,0.5)' }}
      >
        <div className="space-y-2">
          <p className={MIKRO}>{t('post.look', 'How it reads')}</p>
          <div className={RY3}>
            <button
              type="button"
              data-postauto
              onClick={() => setLook(AUTO)}
              className={LEEG}
            >
              {t('post.auto', 'Lift it')}
            </button>
            <button
              type="button"
              data-postplain
              disabled={!touched(look)}
              onClick={() => setLook(PLAIN)}
              className={`${LEEG} disabled:opacity-40`}
            >
              {t('post.asShot', 'As it came')}
            </button>
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
              value={look[key]}
              onChange={(event) => setLook((was) => ({ ...was, [key]: Number(event.target.value) }))}
              className="w-full"
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
 
        Carli, 7 October 2026: *"grab text"*, in the list of what a
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
 
              Carli asked what this was twice — *"Ek weet nogsteeds nie wat is
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
          <div className={RY3}>
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
          {/* ── And the same reading, tappable ────────────────────

              Carli, 8 October 2026: *"dat die masjien self objekte en text
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
              : t('post.findWords', 'Find the words, so I can tap one')}
          </button>

          {/* ── And the things in it, which is the other half of "Grab" ──
 
              Charged, unlike the reader above it, and the button says so
              before it is pressed. The engine draws nothing — it reads the
              picture and answers where things are — so it is two credits,
              the same as a transcription, and one press finds everything
              rather than charging per thing. */}
          <button
            type="button"
            data-postthingsgo
            disabled={!picture || looking}
            onClick={() => { void findThings(); }}
            className={`${LEEG} disabled:opacity-60`}
          >
            {looking
              ? t('post.thingsLooking', 'Looking…')
              : t('post.thingsGo', 'Find the things in it \u00b7 {n} credits')
                .replace('{n}', String(CREDITS.grab))}
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
                onClick={() => { void navigator.clipboard?.writeText(grabbed).catch(() => {}); }}
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
 
        Carli's list, 7 October 2026: *"Video, etc templates."* On the words'
        bench, because a template is mostly words in the right places, and
        because this is the bench somebody opens when they have a picture and
        no idea what to put on it.
 
        First on it, above the empty text box, since the whole point is to be
        met before the blank page is. */}
    <div className="space-y-2">
      {/* ── The neon words: one press, one lit line ─────────────────────
          Carli, 13 October 2026: "amazing futuristic text … Neon,
          futuristic, phantasm". Each chip is drawn in its own face, ink
          and glow, so the chip is a sample of the line it adds. */}
      {/* ── Title styles: album art's six looks, as type ──────────────
          Carli, 14 October 2026: *"ons kort goeie text templates, vat
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
              onClick={() => setWords((was) => [
                ...was,
                {
                  id: freshId(), text: t(one.title.says[0], one.title.says[1]), face: one.title.face,
                  spot: 'middle', ink: one.title.ink, glow: one.title.glow, letterGap: one.title.letterGap,
                },
                {
                  id: freshId(), text: t(one.under.says[0], one.under.says[1]), face: one.under.face,
                  spot: 'bottom', ink: one.under.ink, glow: one.under.glow, letterGap: one.under.letterGap,
                },
              ])}
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
                id: freshId(), text: t(one.says[0], one.says[1]), face: one.face,
                spot: was.length === 0 ? 'middle' : 'top', ink: one.ink, glow: one.glow, letterGap: one.letterGap,
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
    <div className="space-y-3">
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
            id: freshId(), text: '', face: FACES[0].id, spot: was.length === 0 ? 'bottom' : 'top', ink: '#ffffff',
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

      {words.map((one) => (
        <div key={one.id} className="space-y-2 rounded-xl border border-zinc-800 p-3">
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
              onClick={() => setWords((was) => was.filter((w) => w.id !== one.id))}
              aria-label={t('post.removeWords', 'Remove these words')}
              className={LEEG}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── The two spacings ──────────────────────────────────────
 
              Carli, 8 October 2026: *"Daar moet 'n ook 'n line spacing
              scroll bar wees, en spacing tussen die woorde self. Dus moet
              daar twee spacing bars wees."*
 
              Both are live sliders rather than presses, because both are
              things somebody nudges while looking at the picture — and
              neither costs anything, since both are drawn rather than
              written. The letter one is measured as well as drawn, so the
              type still fits the box it was fitted to. */}
          {!plain && (
            <div className={RY}>
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
          )}
        </div>
      ))}
    </div>

    </div>
  );

  /* ── Templates, as a tool of their own ─────────────────────────────────
     Carli, 14 October 2026: *"die template pack wat gegee word moet actual
     templates kry"*. The room's own designs — the neon, synthwave, hologram
     and gold packs — were the first thing on the words bench, behind a
     button called Words. They are a button now, with the starter pack of
     posters, flyers and covers one press further. */
  const startsBench = (
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
            /* A starter pack wears its own look on the button — Carli, 13
               October 2026, with Google's tiles. The plain ones stay plain. */
            className={one.tile ? `${LEEG} !h-auto !items-start flex-col gap-1 py-3 text-left border-white/15` : LEEG}
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
            ) : t(one.name[0], one.name[1])}
          </button>
        ))}
      </div>
      <button type="button" data-poststarterpack onClick={() => setShowTemplatesModal(true)} className={VUL}>
        <LayoutTemplate className="h-4 w-4" />
        {t('stpl.openTemplates', 'Templates & Starter Packs')}
      </button>
    </div>
  );

  /* ── Shapes, as a tool of their own ────────────────────────────────── */
  const shapesBench = (
    <div className="space-y-3">
    {/* ── The shapes ───────────────────────────────────────────────────
        Carli, 13 October 2026: "ons kort amazing … shape templates." The
        four Google's page drew — a cube, a ring, a grid, a frame — as real
        layers in `lib/postshapes.ts`: drawn, lit with the same glow the
        words use, put in one of five places at one of three sizes, and
        exported with the picture. Not draggable yet; the five places are
        the presses. */}
    <div className="space-y-3" data-postmarks>
      <div className="flex items-center justify-between gap-2">
        <p className={MIKRO}>{t('post.shapes', 'Shapes')}</p>
        <span className="text-[11px] text-zinc-500">{t('post.shapesWhy', 'Lit, and in the exported file.')}</span>
      </div>
      <div className={RY}>
        {MARK_SPECS.map((spec) => (
          <button
            key={spec.id}
            type="button"
            data-postaddmark={spec.id}
            onClick={() => setMarks((was) => [...was, newMark(spec.id, freshId())])}
            className={`${LEEG} inline-flex items-center gap-1.5`}
          >
            <span aria-hidden>{spec.icon}</span>
            {t(spec.name[0], spec.name[1])}
          </button>
        ))}
      </div>
      {marks.map((mark) => {
        const spec = MARK_SPECS.find((one) => one.id === mark.kind) ?? MARK_SPECS[0];
        return (
          <div key={mark.id} data-postmark={mark.kind} className="space-y-2 rounded-xl border border-zinc-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-100"><span aria-hidden>{spec.icon}</span> {t(spec.name[0], spec.name[1])}</span>
              <button
                type="button"
                onClick={() => setMarks((was) => was.filter((m) => m.id !== mark.id))}
                aria-label={t('post.removeShape', 'Remove this shape')}
                className={`${LEEG} w-auto px-3`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className={RY}>
              {MARK_SPOTS.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  data-postmarkspot={spot.id}
                  aria-pressed={mark.x === spot.x && mark.y === spot.y}
                  onClick={() => setMarks((was) => was.map((m) => (m.id === mark.id ? { ...m, x: spot.x, y: spot.y } : m)))}
                  className={`${LEEG} ${mark.x === spot.x && mark.y === spot.y ? GEKIES : ''}`}
                >
                  {t(`post.markSpot.${spot.id}`, spot.id)}
                </button>
              ))}
              {MARK_SIZES.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  data-postmarksize={one.id}
                  aria-pressed={mark.size === one.share}
                  onClick={() => setMarks((was) => was.map((m) => (m.id === mark.id ? { ...m, size: one.share } : m)))}
                  className={`${LEEG} ${mark.size === one.share ? GEKIES : ''}`}
                >
                  {t(`post.markSize.${one.id}`, one.id)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {MARK_INKS.map((ink) => (
                <button
                  key={ink}
                  type="button"
                  data-postmarkink={ink}
                  aria-pressed={mark.ink === ink}
                  aria-label={ink}
                  onClick={() => setMarks((was) => was.map((m) => (m.id === mark.id ? { ...m, ink } : m)))}
                  className={`h-9 w-9 rounded-full border-2 ${mark.ink === ink ? 'border-white' : 'border-zinc-700'}`}
                  style={{ background: ink, boxShadow: mark.ink === ink ? `0 0 12px ${ink}` : undefined }}
                />
              ))}
              {GLOWS.map((glow) => (
                <button
                  key={glow.id}
                  type="button"
                  data-postmarkglow={glow.id}
                  aria-pressed={mark.glow === glow.id}
                  onClick={() => setMarks((was) => was.map((m) => (m.id === mark.id ? { ...m, glow: glow.id } : m)))}
                  className={`${LEEG} w-auto px-3 ${mark.glow === glow.id ? GEKIES : ''}`}
                  style={glow.halo.length ? { textShadow: `0 0 6px ${glow.halo[2]}, 0 0 14px ${glow.halo[1]}` } : undefined}
                >
                  {t(glow.name[0], glow.name[1])}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );

  const saveBench = (
    <div className="space-y-4">
    {/* ── What it costs, before the work and not only on the button ──
 
        Carli, 7 October 2026: *"Remember to monetize and nothing is free
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
 
        Carli, 7 October 2026: *"Ook die formaat van export?"* — and, of the
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

    {/* ── Export quality tier (Draft 720p, Standard 1080p, Ultra 4K) costing standard 5 credits ─ */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className={MIKRO}>{t('post.exportQuality', 'Export quality')}</p>
        <span className="text-[11px] font-bold text-emerald-400">
          {creditsSaid(CREDITS.postOut, t)}
        </span>
      </div>
      <div className={RY3}>
        <button
          type="button"
          onClick={() => setExportQuality('draft')}
          className={`${LEEG} ${exportQuality === 'draft' ? GEKIES : ''}`}
        >
          {t('post.qualityDraft', 'Draft (720p)')}
        </button>
        <button
          type="button"
          onClick={() => setExportQuality('standard')}
          className={`${LEEG} ${exportQuality === 'standard' ? GEKIES : ''}`}
        >
          {t('post.qualityStandard', 'Standard (1080p)')}
        </button>
        <button
          type="button"
          onClick={() => setExportQuality('ultra')}
          className={`${LEEG} ${exportQuality === 'ultra' ? GEKIES : ''}`}
        >
          {t('post.qualityUltra', 'Ultra (4K)')}
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {exportQuality === 'draft' && t('post.qualityDraftNote', 'Fast rendering and compact file size. Costs 5 credits.')}
        {exportQuality === 'standard' && t('post.qualityStandardNote', 'Full HD fidelity for feeds and presentations. Costs 5 credits.')}
        {exportQuality === 'ultra' && t('post.qualityUltraNote', 'Ultra-crisp 4K resolution at 2× canvas density. Costs 5 credits.')}
      </p>
    </div>

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
 
          Carli: *"kan ook in die video editor ingesit word."* The editor
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
          setTold((n) => n + 1);
          setPost(freshId());
          setWords([]);
          setPicture(null);
          setTraced(null);
          setCropBox(null);
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
  /* Open or shut. The preview is the picture already on the screen, copied
     into a canvas in the card — never a file: a full-size image in an <img>
     is a picture somebody can long-press and save, which is a way out that
     skips the one paid press (`check:postpaid`). */
  const [social, setSocial] = useState<true | null>(null);
  const socialCanvas = useRef<HTMLCanvasElement | null>(null);
  useBackLayer(social !== null, () => setSocial(null));
  const showSocial = (): void => setSocial(true);
  useEffect(() => {
    if (!social) return;
    const from = canvas.current;
    const to = socialCanvas.current;
    if (!from || !to) return;
    to.width = from.width;
    to.height = from.height;
    to.getContext('2d')?.drawImage(from, 0, 0);
  }, [social]);
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
  const benchFor: Record<string, React.ReactNode> = {
    starts: startsBench,
    shapes: shapesBench,
    pic: picBench,
    frame: frameBench,
    tone: toneBench,
    read: readBench,
    text: textBench,
    save: saveBench,
  };

  /* ── Her picture of the room, 14 October 2026 ───────────────────────────

     Carli, with a photograph of a desktop photo editor: *"Photo editor se
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
  const here = ALL_BENCHES.find((one) => one.id === bench) ?? null;
  const chipStyle: React.CSSProperties = { background: PHOTO.chip, border: `1px solid ${PHOTO.edge}` };
  const openBench = (next: Exclude<Bench, null>): void => {
    setBench(bench === next ? null : next);
    if (bench !== next) setAsking(false);
  };
  const stripsUp = Boolean((picture && (cropBox || traced)) || picking || movingWords);

  /* The space the photograph has, measured, so the canvas fills it. */
  const stage = useRef<HTMLDivElement | null>(null);
  const [fitted, setFitted] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = (): void => {
      const box = el.getBoundingClientRect();
      const ratio = size.width / size.height;
      const room = { w: Math.max(0, box.width - 16), h: Math.max(0, box.height - 16) };
      const w = Math.max(80, Math.floor(Math.min(room.w, room.h * ratio)));
      setFitted({ w, h: Math.floor(w / ratio) });
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [size.width, size.height, upright]);

  const undoRedo = (picture !== null || told > 0) ? (
    <>
      <button
        type="button"
        data-postundo
        disabled={history.current.undoable() === null}
        onClick={stepBack}
        title={history.current.undoable()
          ? `${t('post.undo', 'Put back')} — ${history.current.undoable()}`
          : t('post.undoNone', 'Nothing to put back yet')}
        aria-label={history.current.undoable()
          ? `${t('post.undo', 'Put back')} — ${history.current.undoable()}`
          : t('post.undoNone', 'Nothing to put back yet')}
        className="flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-35"
        style={chipStyle}
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-postredo
        disabled={history.current.redoable() === null}
        onClick={stepOn}
        title={history.current.redoable()
          ? `${t('post.redo', 'Do it again')} — ${history.current.redoable()}`
          : t('post.redoNone', 'Nothing to do again')}
        aria-label={history.current.redoable()
          ? `${t('post.redo', 'Do it again')} — ${history.current.redoable()}`
          : t('post.redoNone', 'Nothing to do again')}
        className="flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-35"
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
      className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1.5"
      style={{ background: PHOTO.floorGlass, borderBottom: `1px solid ${PHOTO.edge}` }}
    >
      {asRoom ? (
        <button
          type="button"
          onClick={onClose}
          data-roomback
          data-backout
          aria-label={t('room.backToAll', 'Alle Kamers')}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ ...chipStyle, color: PHOTO.accent }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <button type="button" onClick={onClose} data-backout aria-label={t('post.close', 'Close')} className="flex h-9 w-9 items-center justify-center rounded-lg" style={chipStyle}>
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
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
          className="block max-w-full truncate text-left font-mono text-[10px] leading-tight"
          style={{ color: INK_DIM }}
        >
          {/* The name only where there is room for it: on a phone the
              numbers and the arrow, so nothing runs under the buttons. */}
          {upright ? `${size.width}×${size.height} ▾` : `${size.width}×${size.height} · ${size.name} ▾`}
        </button>
      </div>
      {onEdge && (
        <span className="ml-3 hidden truncate text-[11px] lg:inline" style={{ color: INK_DIM }}>
          {t('post.aiEngine', 'AI tools')}: <span style={{ color: PHOTO.accent }}>{t('post.aiEngineWho', 'Google picture engine')}</span>
        </span>
      )}
      <span className="flex-1" />
      {undoRedo}
      <button
        type="button"
        data-postsimple
        aria-pressed={!plain}
        onClick={() => setPlain(!plain)}
        title={plain
          ? t('post.showAllWhat', 'Show every setting there is')
          : t('post.showLessWhat', 'One button per tool, at the setting that is right most of the time')}
        className="flex h-9 flex-shrink-0 items-center rounded-lg px-1.5 text-[10px] font-bold sm:px-2 sm:text-[11px]"
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
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
        style={{ background: PHOTO.social }}
      >
        👁️
      </button>
      {copilot ? (
        <button
          type="button"
          data-postask
          aria-pressed={asking}
          onClick={() => { setAsking(!asking); setBench(null); }}
          aria-label={t('post.ask', 'Ask')}
          className="flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold"
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
        className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold uppercase tracking-wide"
        style={{ background: PHOTO.accent, color: PHOTO.floor }}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden min-[400px]:inline">{t('post.exportNow', 'Export')}</span>
      </button>
    </header>
  );

  /* ── The photograph, as big as the space allows ───────────────────── */
  const photo = (
    <div ref={stage} data-poststage className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
      <canvas
        ref={canvas}
        data-postcanvas
        data-postmovable={movable ? 'yes' : 'no'}
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={letGo}
        onPointerCancel={letGo}
        className="rounded-md"
        style={{
          width: fitted ? fitted.w : '100%',
          height: fitted ? fitted.h : undefined,
          aspectRatio: `${size.width} / ${size.height}`,
          boxShadow: `0 0 0 1px ${PHOTO.accentDim}, ${PHOTO.glowEmerald}`,
          background: PHOTO.black,
          /* Only while there is something to pan, crop, trace or move: a
             permanent `touch-action: none` is a dead zone in a page that
             scrolls, which reads as the app being frozen. */
          touchAction: movable || cropBox || traced || words.length > 0 ? 'none' : 'auto',
          cursor: cropBox || traced ? 'crosshair' : movable ? 'grab' : 'default',
        }}
      />
      {/* Gone the moment a tool is open. Carli, 14 October 2026, with the
          templates open over it: "Die oomblik wanneer mens op templates
          kliek dan moet daai hele bar verdwyn anders is dit in die pad." */}
      {!picture && words.length === 0 && bench === null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
          <div
            className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl p-5 shadow-2xl backdrop-blur-md"
            style={{ background: PHOTO.floorGlass, border: `1px solid ${PHOTO.accentDim}` }}
          >
            <h4 className="text-sm font-bold text-white">{t('stpl.starterTitle', 'Start with a Design or Photo')}</h4>
            <p className="text-xs text-zinc-400">{t('stpl.starterDesc', 'Choose a starter pack or upload your image to begin creating.')}</p>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => openBench('starts')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold uppercase tracking-wider"
                style={{ background: PHOTO.accent, color: PHOTO.floor }}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {t('post.benchStarts', 'Templates')}
              </button>
              <button
                type="button"
                onClick={() => openBench('pic')}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold"
                style={chipStyle}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {t('post.bringIn', 'Bring a picture in')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* What the room just said, over the foot of the photograph. */}
      {(said || covered) && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col items-center gap-1">
          {covered && (
            <p data-postclash className="pointer-events-auto rounded-xl border border-amber-500/40 bg-black/70 px-3 py-1.5 text-[12px] leading-snug text-amber-300 backdrop-blur">
              {t('post.covered', 'Some of your words are where the app prints its own caption and buttons. They are moved clear in the saved file; the shaded bands show where.')}
            </p>
          )}
          {said && <p data-postsaid className="pointer-events-auto rounded-xl bg-black/70 px-3 py-1.5 text-[12px] leading-snug text-emerald-300 backdrop-blur">{said}</p>}
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
        <div data-postlinebar className="flex-shrink-0 space-y-2 px-3 py-2">
          <p data-postlinesaid className="text-[12px] leading-relaxed" style={{ color: INK_DIM }}>
            {picked ? `“${picked.text}”` : t('post.tapALine', 'Tap a line of writing on the picture.')}
          </p>
          {picked && things.current.has(picked.id) && (
            <div className={RY3}>
              <button type="button" data-postthinglift onClick={() => liftThing(picked)} className={LEEG}>
                {t('post.thingLift', 'Lift it out')}
              </button>
            </div>
          )}
          {picked && !things.current.has(picked.id) && (
            <div className={RY3}>
              <button type="button" data-postlinegrab onClick={() => grabLine(picked)} className={LEEG}>
                {t('post.lineGrab', 'Lift it onto the picture')}
              </button>
              <button type="button" data-postlinedrop onClick={() => dropLine(picked)} className={LEEG}>
                {t('post.lineDrop', 'Take it out')}
              </button>
              <button
                type="button"
                data-postlinemove
                onClick={() => { const one = picked; if (dropLine(one)) grabLine(one); }}
                className={LEEG}
              >
                {t('post.lineMove', 'Move it')}
              </button>
            </div>
          )}
          <button
            type="button"
            data-postlinedone
            onClick={() => { setPicking(false); setFound(null); setPicked(null); setBench('read'); }}
            className={VUL}
          >
            {t('post.lineDone', 'Done with the words')}
          </button>
        </div>
      )}
      {(picture !== null || words.length > 0) && movingWords ? (
        <div data-postmovebar className="flex-shrink-0 space-y-2 px-3 py-2">
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
    <div data-postbenchpanel className="flex min-h-0 flex-col">
      <DeskSheet
        icon={here.icon}
        title={t(here.label[0], here.label[1])}
        what={t(here.what[0], here.what[1])}
        paid={here.paid}
        paidSays={t('dock.paidSays', 'Some of this costs credits.')}
        paidLine={t('post.paidHere', 'Every tool in this room is included in your plan. Taking the picture out is the one press that spends, and it says the price before it does.')}
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
      onClick={() => openBench(spec.id)}
      className={`${rail ? TOOL_RAIL : TOOL_FOOT} ${bench === spec.id ? GEKIES : ''}`}
      style={bench === spec.id ? undefined : { color: INK_DIM }}
    >
      <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">{spec.icon}</span>
      <span className="w-full truncate text-center">{t(POST_SHORT[spec.id][0], POST_SHORT[spec.id][1])}</span>
    </button>
  );

  /* ── The layers, when no tool is open at a desk ───────────────────── */
  const layers: readonly { id: string; dot: string; name: string; note: string; bench: Exclude<Bench, null> }[] = [
    {
      id: 'picture',
      dot: picture ? PHOTO.accent : PHOTO.edge,
      name: picture ? t('post.layerPicture', 'Photograph') : t('post.layerNoPicture', 'No photograph yet'),
      note: picture ? `${picture.naturalWidth || picture.width}×${picture.naturalHeight || picture.height}` : t('post.layerBring', 'Bring one in'),
      bench: 'pic',
    },
    {
      id: 'ground',
      dot: back ?? PHOTO.edge,
      name: back ? t('post.layerGround', 'Background colour') : t('post.layerNoGround', 'See-through background'),
      note: back ?? '',
      bench: 'pic',
    },
    ...words.map((one) => ({ id: one.id, dot: one.ink, name: `“${one.text}”`, note: t('post.layerWords', 'Words'), bench: 'text' as const })),
    ...marks.map((mark) => ({ id: mark.id, dot: PHOTO.purple, name: t('post.layerMark', 'Shape'), note: String(mark.kind), bench: 'shapes' as const })),
  ];
  const inspector = (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between border-b pb-2 text-xs font-bold uppercase" style={{ borderColor: PHOTO.edge }}>
        <span>{t('post.inspector', 'Inspector')}</span>
        <span className="font-mono text-[10px] normal-case" style={{ color: PHOTO.accent }}>{t('post.layers', 'Layers')}</span>
      </div>
      <ul data-postlayers className="space-y-1.5">
        {layers.map((one) => (
          <li key={one.id}>
            <button
              type="button"
              data-postlayer={one.id}
              onClick={() => openBench(one.bench)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs"
              style={chipStyle}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: one.dot }} aria-hidden />
                <span className="truncate font-bold text-white">{one.name}</span>
              </span>
              <span className="flex-shrink-0 font-mono text-[9px]" style={{ color: INK_DIM }}>{one.note}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed" style={{ color: INK_DIM }}>
        {t('post.toolkitHint', 'Pick a tool on the left and its controls open here, beside the picture rather than over it.')}
      </p>
    </div>
  );

  /* ── The feed preview: the real canvas in a post card ─────────────── */
  const socialModal = social ? (
    <div
      data-postsocialmodal
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md"
      style={{ background: PHOTO.scrim }}
      onClick={() => setSocial(null)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-5"
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
        <h3 className="text-lg font-bold text-white">{t('post.socialTitle', 'How it looks in a feed')}</h3>
        <p className="mb-4 font-mono text-xs" style={{ color: PHOTO.purple }}>{t('post.socialWhat', 'Your picture, in a post card, at the size the feed shows it.')}</p>
        <div className="mb-4 overflow-hidden rounded-xl p-3" style={{ background: PHOTO.black, border: `1px solid ${PHOTO.edge}` }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-7 w-7 rounded-full" style={{ background: PHOTO.accent }} aria-hidden />
            <div>
              <div className="text-xs font-bold text-white">{t('post.socialYou', 'Your page')}</div>
              <div className="text-[9px]" style={{ color: INK_DIM }}>{t('post.socialNow', 'Just now')}</div>
            </div>
          </div>
          <canvas
            ref={socialCanvas}
            data-postsocialpicture
            className="my-2 block w-full rounded-lg"
            style={{ aspectRatio: `${size.width} / ${size.height}`, border: `1px solid ${PHOTO.edge}` }}
          />
          <div className="flex items-center gap-4 pt-2 text-base" style={{ color: INK_DIM }} aria-hidden>
            <span>♡</span><span>💬</span><span>↗</span>
          </div>
        </div>
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {header}
          {/* The controls pop out at the top, above the photograph and
              outside it, on glass she can see the photograph through the
              edges of. */}
          {(stripsUp || toolSheet || copilotSheet) && (
            <div
              data-postpop
              className="flex max-h-[44dvh] min-h-0 flex-shrink-0 flex-col overflow-y-auto"
              style={{ background: PHOTO.popGlass, backdropFilter: 'blur(14px)', borderBottom: `1px solid ${PHOTO.edge}` }}
            >
              {stripsUp ? strips : copilotSheet ?? toolSheet}
            </div>
          )}
          {photo}
          <nav
            data-cutdock=""
            data-cutbenchrow=""
            data-postfoot
            className="grid flex-shrink-0 grid-cols-8 gap-0.5 px-1 pb-1.5 pt-1"
            style={{ background: PHOTO.floorGlass, borderTop: `1px solid ${PHOTO.edge}` }}
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
              className="flex w-[68px] flex-shrink-0 flex-col gap-1 overflow-y-auto p-1.5"
              style={{ background: PHOTO.floorGlass, borderRight: `1px solid ${PHOTO.edge}` }}
            >
              {ALL_BENCHES.map((spec) => toolButton(spec, true))}
            </nav>
            {photo}
            <aside
              data-postinspector
              className="flex w-[340px] flex-shrink-0 min-h-0 flex-col overflow-y-auto 2xl:w-[400px]"
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
