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
  Crop as CropIcon, Download, FlipHorizontal, Image as ImageIcon, Lasso, Loader2, Maximize2, Plus, Redo2, RotateCcw, RotateCw, ScanText, SlidersHorizontal, Sparkles, Trash2, Type, Undo2, X,
} from 'lucide-react';
import {
  POST_SIZES, clashes, fitText, moveInside, sizeById,
  type Box, type Measure, type PostSize,
} from '../lib/posttext';
import { ALL, boxOf } from '../lib/safezones';
import { CREDITS, creditsSaid } from '../lib/credits';
import { ACCEPTS, fit } from '../lib/imagefile';
import { useBackLayer } from '../lib/backstack';
import RoomDock, { type Bench, type BenchSpec } from './CutDock';
import DeskSheet from './BoothCard';
import { CUT_LOOK } from '../lib/cutlook';
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
  FORMATS, SCALES, formatOf, holdsClear, nameFor, type FileKind, type Scale,
} from '../lib/postfile';
import {
  cutAlong, trace, whyNot, worthCutting, type Path as Traced,
} from '../lib/lasso';
import { makeBack } from '../lib/postback';
import {
  BIGGER, SHARPEN, bigger, nextQuarter, sharpened, sizeOf, tooBig, turned,
  type Sharpness, type Times,
} from '../lib/postwork';
import {
  BEHIND, EDGES, behindOf, blurBehind, cutOut, edgeOf, maskOnto,
  type BehindId, type EdgeId,
} from '../lib/cutout';
import { TOO_MUCH, erase, shareOf, stroke } from '../lib/erase';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';

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

const VUL = 'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl'
  + ' bg-emerald-500 px-4 text-sm font-bold text-black disabled:opacity-40';
const LEEG = KNOP;
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
const SPOTS = [
  { id: 'top', y: 0.08 },
  { id: 'middle', y: 0.42 },
  { id: 'bottom', y: 0.74 },
] as const;

interface Words {
  readonly id: string;
  readonly text: string;
  readonly face: FaceId;
  readonly spot: (typeof SPOTS)[number]['id'];
  readonly ink: string;
}

const boxFor = (one: Words): Box => ({
  x: 0.08,
  y: SPOTS.find((s) => s.id === one.spot)?.y ?? 0.42,
  w: 0.84,
  h: 0.18,
});

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
const FLOOR = '#05180f';
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
    label: ['post.benchRead', 'Grab the words'],
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
  /* Cutting the background out. `whole` holds the picture as it was brought
     in, so the cut is never a one-way door — a member who cuts a photograph
     and does not like it has nothing to go back to otherwise but the camera
     roll, and the file they picked may have been a crop they made elsewhere. */
  const [cutting, setCutting] = useState<number | null>(null);
  const [whole, setWhole] = useState<HTMLImageElement | null>(null);
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
  const [said, setSaid] = useState('');
  /** Which bench is open on the bar. */
  const [bench, setBench] = useState<Bench>(null);
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
  const [kind, setKind] = useState<FileKind>('png');
  const [scale, setScale] = useState<Scale>(1);
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
      const at = place(picture, size, cropBox || traced ? WHOLE_VIEW : crop);
      /* The look goes on the PICTURE and comes off again before anything is
         written. Words under a blur are not a style, they are a mistake, and
         a filter left set would put every one of them through it. */
      ctx.filter = filterFor(look, to.width / size.width);
      ctx.drawImage(picture, at.left, at.top, at.width, at.height);
      ctx.filter = 'none';

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

    for (const one of words) {
      if (!one.text.trim()) continue;
      const chosen = faceOf(one.face);
      const box = moveInside(boxFor(one), size);
      const fit = fitText(one.text, box, size, measureWith(ctx, chosen.css, chosen.weight));
      ctx.font = `${chosen.weight} ${fit.px}px ${chosen.css}`;
      ctx.fillStyle = one.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      /* A soft shadow under every line. Light text on a light photograph is
         unreadable and it is not a thing somebody notices while typing — the
         picture behind the words is whatever they chose, not a background
         somebody designed for them. */
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.max(2, fit.px * 0.12);
      let y = box.y * size.height;
      for (const line of fit.lines) {
        ctx.fillText(line, size.width / 2, y);
        y += fit.px * 1.2;
      }
      ctx.shadowBlur = 0;
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
  }, [facesIn, size, picture, words, back, crop, look, cropBox, traced]);

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

  const grab = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (traced) {
      const put = shareAt(event);
      if (!put) return;
      tracingNow.current = true;
      /* A new stroke starts the shape again rather than joining on to the
         last one. Lifting a thumb and putting it down somewhere else would
         draw a straight line across everything in between — the same
         decision the eraser made, for the same reason. */
      setTraced([{ x: put.x, y: put.y }]);
      event.currentTarget.setPointerCapture(event.pointerId);
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
    if (traced) {
      if (!tracingNow.current) return;
      const put = shareAt(event);
      if (!put) return;
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** Whether anything she has written lands under the platform's furniture. */
  const covered = useMemo(
    () => words.some((one) => one.text.trim() && clashes(boxFor(one), size)),
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
    /* Asked again here even though the screen already asked on mount.

       The credit is already spent by this line. A race between the font
       download and a quick press would hand her a file in the fallback
       face and charge her for it, and `document.fonts.load` on something
       already loaded returns immediately — so this costs nothing in the
       case that is not the bug. */
    await faceReady();
    const sheet = document.createElement('canvas');
    const how = formatOf(kind);
    draw(sheet, false, scale);
    /* ── A JPEG is written onto something, because it cannot be written onto
           nothing ─────────────────────────────────────────────────────────
 
       The canvas is transparent where she took the background off, and
       `toBlob` with `image/jpeg` composites that onto BLACK — not white, and
       not the colour she last had behind it. A post of a person cut out,
       saved as a JPG, comes back on a black rectangle with no warning.
 
       So the flattening is done here, visibly and in a colour that was
       chosen: whatever she last had behind the picture, or white if she never
       set one. The screen says this will happen before she presses, but the
       press has to be right whether or not she read it. */
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
    const blob = await new Promise<Blob | null>((done) => sheet.toBlob(done, how.type, how.quality));
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
      a.download = nameFor(size.id, kind, scale);
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
        setSaid(keep
          ? t('post.drewKept', 'Kept what you drew round. Put a colour behind it, or leave it see-through.')
          : t('post.drewGone', 'Taken out. There is nothing behind it \u2014 put a colour behind the picture if you want one.'));
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

  const cutBackground = async (): Promise<void> => {
    if (!picture || cutting !== null) return;
    setSaid('');
    setCutting(0);
    try {
      const cut = await cutOut(picture, (part) => setCutting(part), edgeOf(edge));
      if (!cut.ok) {
        setSaid(cut.why === 'nobody'
          ? t('post.cutNobody', 'No person could be found in this picture. This looks for people, and knows nothing about objects.')
          : t('post.cutFailed', 'The background could not be taken out of that picture.'));
        return;
      }
      lastMask.current = { mask: cut.mask, of: picture };
      before(t('post.stepCut', 'taking the background out'));
      asPicture(cut.canvas, (one) => {
        setWhole(picture);
        setPicture(one);
        setSaid(t('post.cutDone', 'The background is out. Take the background colour off as well for a see-through picture.'));
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
          ? t('post.cutNobody', 'No person could be found in this picture. This looks for people, and knows nothing about objects.')
          : t('post.behindFailed', 'That could not be put out of focus.'));
        return;
      }
      lastMask.current = { mask: cut.mask, of: picture };
      put(blurBehind(picture, cut.mask, wide, tall, behindOf(how, { width: wide, height: tall }), edgeOf(edge)));
    } finally {
      setCutting(null);
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

  const SKIN = asRoom
    ? 'flex flex-col overflow-hidden'
    : 'fixed inset-0 z-[60] flex flex-col overflow-hidden bg-zinc-950';


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
  /** The way into the free-hand cut, on the picture's own bench. */
  const traceStart = picture ? (
    <div className="space-y-2">
      <p className={MIKRO}>{t('post.drawRound', 'Draw around something')}</p>
      <p className="text-[12px] leading-relaxed text-zinc-500">
        {t(
          'post.drawRoundWhy',
          'Trace round anything with your finger and keep it, or take it out. Slower than the other two, and it works on anything \u2014 a guitar, a dog, a bottle \u2014 not only on people.',
        )}
      </p>
      <button
        type="button"
        data-postdrawstart
        onClick={() => { setTraced([]); setBench(null); setSaid(''); }}
        className={LEEG}
      >
        <Lasso className="h-3.5 w-3.5" />
        {t('post.drawRoundStart', 'Start drawing')}
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
      <p className="text-[12px] leading-relaxed" style={asRoom ? { color: INK_DIM } : { color: 'rgb(161,161,170)' }}>
        {worthCutting(traced)
          ? t('post.drawReady', 'Now keep what you drew round, or take it out. Draw again to start the shape over.')
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
      <div className={RY3}>
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
        <p className={MIKRO}>{t('post.cut', 'Background')}</p>
        <button
          type="button"
          data-postcutgo
          disabled={cutting !== null}
          onClick={() => void cutBackground()}
          className={`${LEEG} disabled:opacity-40`}
        >
          {cutting !== null
            ? `${Math.round(cutting * 100)}%`
            : t('post.cutGo', 'Take the background out')}
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
        {EDGES.map((one) => (
          <button
            key={one.id}
            type="button"
            data-postedge={one.id}
            aria-pressed={edge === one.id}
            onClick={() => cutAgain(one.id)}
            className={`${LEEG} ${edge === one.id ? 'border-emerald-500/60 text-emerald-400' : ''}`}
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
          {t('post.cutWhat', 'This looks for people. It runs on your own device and costs nothing; the first time takes a moment while it downloads.')}
        </span>
        {/* ── And the other thing to do with the same mask ──────────────
 
            Carli's list, 7 October 2026: *"auto focus, blur"*. Beside taking
            the background OUT, because it is the same model, the same mask
            and the same edge — and because somebody standing here looking at
            a photograph of a person is already thinking about what to do
            with what is behind them.
 
            Instant when she has already cut one out of this picture: the
            answer is in hand and nothing is downloaded twice. */}
        <p className={`${MIKRO} pt-1`}>{t('post.behind2', 'Or put it out of focus')}</p>
        <div className={RY3}>
          {BEHIND.map((one) => (
            <button
              key={one.id}
              type="button"
              data-postbehindblur={one.id}
              disabled={cutting !== null}
              onClick={() => void blurTheBack(one.id)}
              className={`${LEEG} disabled:opacity-40`}
            >
              {one.id === 'soft'
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
            'Keeps the person sharp and puts the room behind them out of focus \u2014 what a phone\u2019s portrait mode does. Same model as taking the background out, so it looks for people.',
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
                : t('post.rubHow', 'Drag over the thing you want gone. It is good at something small against a plain background, and it smears where there was a pattern behind it.')}
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
          <div className={RY3}>
            {BIGGER.map((times) => (
              <button
                key={times}
                type="button"
                data-postbigger={times}
                disabled={tooBig(of, times)}
                onClick={() => enlargeIt(times)}
                className={`${LEEG} disabled:opacity-40`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {`${times}\u00d7`}
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
            onClick={() => setSize(one)}
            className={`${LEEG} ${one.id === size.id ? 'border-emerald-500/60 text-emerald-400' : ''}`}
          >
            {one.name} · {one.width}×{one.height}
          </button>
        ))}
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
              className={`${LEEG} ${crop.basis === one ? 'border-emerald-500/60 text-emerald-400' : ''}`}
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
          <div className={RY3}>
            {(Object.keys(SHARPEN) as Sharpness[]).map((how) => (
              <button
                key={how}
                type="button"
                data-postsharpen={how}
                onClick={() => sharpenIt(how)}
                className={LEEG}
              >
                {how === 'gentle'
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
          {t('post.lookFree', 'All of this happens on your own device and costs nothing, however many times you change it.')}
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
                onClick={() => {
                  setWords((was) => [...was, {
                    id: freshId(), text: grabbed, face: FACES[0].id,
                    spot: was.length === 0 ? 'bottom' : 'top', ink: '#ffffff',
                  }]);
                  setGrabbed(null);
                  /* And open the bench the words landed on.
 
                     The room is benches rather than one scroll now, so "Put
                     it on the picture" put them somewhere she was not
                     looking: the words appear on the canvas, and the box to
                     fix what the reader got wrong is behind a different tab.
                     A read nobody can edit is a read nobody wanted. */
                  setBench('text');
                }}
                className={LEEG}
              >
                {t('post.grabUse', 'Put it on the picture')}
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
          {t('post.grabFree', 'The reading happens on your own device and costs nothing. The first time takes a moment while the reader downloads.')}
        </p>
      </div>
    )}
    </div>
  );

  const textBench = (
    <div className="space-y-4">
    {/* ── The words ─────────────────────────────────────────────────── */}
    <div className="space-y-3">
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
                className={`${LEEG} ${one.face === face.id ? 'border-emerald-500/60 text-emerald-400' : ''}`}
              >
                {t(`post.face.${face.id}`, face.name)}
              </button>
            ))}
            {SPOTS.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => setWords((was) => was.map((w) => (
                  w.id === one.id ? { ...w, spot: spot.id } : w)))}
                className={`${LEEG} ${one.spot === spot.id ? 'border-emerald-500/60 text-emerald-400' : ''}`}
              >
                {t(`post.spot.${spot.id}`, spot.id)}
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
        </div>
      ))}
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
      {t('post.price', 'Building a picture here costs nothing. Taking one out costs')}
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
        {FORMATS.map((one) => (
          <button
            key={one.id}
            type="button"
            data-postkind={one.id}
            aria-pressed={kind === one.id}
            onClick={() => setKind(one.id)}
            className={`${LEEG} ${kind === one.id ? 'border-emerald-500/60 text-emerald-400' : ''}`}
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
            className={`${LEEG} ${scale === one ? 'border-emerald-500/60 text-emerald-400' : ''}`}
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

    <div className="space-y-2">
      <button type="button" onClick={() => void take()} disabled={busy} data-postexport className={VUL}>
        {busy
          ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          : <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />
              {t('post.save', 'Save the picture')} · {creditsSaid(CREDITS.postOut, t)}
            </span>}
      </button>
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
        {t('post.freeUntil', 'Making it costs nothing. The credit is for taking it off the device, and the same post saved twice is charged once.')}
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

  const benchFor: Record<string, React.ReactNode> = {
    pic: picBench,
    frame: frameBench,
    tone: toneBench,
    read: readBench,
    text: textBench,
    save: saveBench,
  };

  return (
    <div
      ref={shell}
      className={`${SKIN} text-zinc-100`}
      data-poststudio
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
      {/* ── The picture, which never leaves the glass ──────────────────
 
          The one thing a photo editor must not do is hide the photograph
          behind the control you are using on it. The cutting room already
          knows this — its sheet is capped so the frame stays visible — and
          this room now works the same way. */}
      <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {asRoom ? t('rail.photo', 'Photo Editor') : t('post.title', 'Make a post')}
          </h2>
          {/* ── One step back, where it can always be reached ───────────
 
              In the room's header rather than on a bench, because the tools
              it undoes are on five different benches and a button you have
              to go and find is a button you find after you have decided to
              live with the mistake.
 
              It says what it undoes, in the title and to a screen reader:
              "Put back taking the background out" is a different promise
              from "Undo", and the difference matters when four destructive
              things have happened in a row. */}
          {picture !== null || told > 0 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-postundo
                disabled={history.current.undoable() === null}
                onClick={stepBack}
                title={history.current.undoable()
                  ? `${t('post.undo', 'Put back')} \u2014 ${history.current.undoable()}`
                  : t('post.undoNone', 'Nothing to put back yet')}
                aria-label={history.current.undoable()
                  ? `${t('post.undo', 'Put back')} \u2014 ${history.current.undoable()}`
                  : t('post.undoNone', 'Nothing to put back yet')}
                className={`${LEEG} w-auto px-3 disabled:opacity-35`}
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-postredo
                disabled={history.current.redoable() === null}
                onClick={stepOn}
                title={history.current.redoable()
                  ? `${t('post.redo', 'Do it again')} \u2014 ${history.current.redoable()}`
                  : t('post.redoNone', 'Nothing to do again')}
                aria-label={history.current.redoable()
                  ? `${t('post.redo', 'Do it again')} \u2014 ${history.current.redoable()}`
                  : t('post.redoNone', 'Nothing to do again')}
                className={`${LEEG} w-auto px-3 disabled:opacity-35`}
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {/* ── The copilot, as a button ─────────────────────────────
 
              Carli asked for this shape in the cutting room — *"Die copilot
              kan ook net 'n button wees wat uit pop"* — and the reason is the
              same here: in a room that is a screen with a bar at its foot,
              a column underneath is a screenful nobody scrolls to. */}
          {copilot ? (
            <button
              type="button"
              data-postask
              aria-pressed={asking}
              onClick={() => setAsking(true)}
              className={`${LEEG} w-auto px-3`}
            >
              <Sparkles className="h-4 w-4" />
              {t('post.ask', 'Ask')}
            </button>
          ) : null}
          {/* A room is left by the menu, like every other room. A close
              button here would be a second way out that only this room has,
              and the one it leads back to depends on how you arrived. */}
          {!asRoom && (
            <button type="button" onClick={onClose} data-backout aria-label={t('post.close', 'Close')} className={LEEG}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <canvas
          ref={canvas}
          data-postcanvas
          data-postmovable={movable ? 'yes' : 'no'}
          onPointerDown={grab}
          onPointerMove={drag}
          onPointerUp={letGo}
          onPointerCancel={letGo}
          className="w-full rounded-xl border border-zinc-800"
          style={{
            aspectRatio: `${size.width} / ${size.height}`,
            /* Only while there is something to pan.
 
               `touch-action: none` on this canvas permanently would be a
               tall dead zone in the middle of a sheet that scrolls — she
               puts her thumb on the picture, pulls, and the page refuses to
               move, which reads as the app being frozen. With no slack
               there is nothing to drag, so the page gets the gesture. */
            /* `none` while cropping as well as while panning. A corner drag
               that the page treats as a scroll moves the room instead of the
               box, and on a phone that reads as the handle not working. */
            touchAction: movable || cropBox || traced ? 'none' : 'auto',
            cursor: cropBox || traced ? 'crosshair' : movable ? 'grab' : 'default',
          }}
        />

        {/* ── The photograph's own size, for a probe to read ────────────
 
            The canvas is the FRAME and stays 1080x1920 whatever is cut away,
            so nothing on the screen says how big the photograph itself is —
            and "did Cut really cut it" is exactly that question.
 
            A hidden span rather than an attribute on the canvas, because the
            canvas's own `width` and `height` mean something else already and
            a second meaning on the same element is how a probe comes to
            measure the wrong one. */}
        {picture && (
          <span
            hidden
            data-postpicturesize
            data-w={picture.naturalWidth || picture.width}
            data-h={picture.naturalHeight || picture.height}
          />
        )}

        {covered && (
          <p data-postclash className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] leading-relaxed text-amber-300">
            {t('post.covered', 'Some of your words are where the app prints its own caption and buttons. They are moved clear in the saved file; the shaded bands show where.')}
          </p>
        )}

        {said && <p data-postsaid className="text-[13px] leading-relaxed text-emerald-400">{said}</p>}
      </div>

      {cropStrip}
      {traceStrip}

      {/* ── The copilot, over the room ────────────────────────────────
 
          The same sheet the benches use, so it opens and closes with the same
          word as everything else in the room, and capped so the bar
          underneath it stays reachable. */}
      {copilot && asking && (
        <div className="flex min-h-0 max-h-[72dvh] flex-col">
          <DeskSheet
            icon={<Sparkles className="h-4 w-4" />}
            title={t('post.ask.title', 'Ask the copilot')}
            what={t(
              'post.ask.what',
              'It knows which room you are in. Ask it what a tool does, or what to try next on this picture.',
            )}
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
      )}

      <RoomDock
        open={bench}
        onOpen={setBench}
        playing={false}
        onPlay={() => undefined}
        onSkip={() => undefined}
        transport={false}
        upper={POST_UPPER}
        lower={POST_LOWER}
        paidLine={t('post.paidHere', 'Everything here is free. Taking the picture out is the one press that spends, and it says the price before it does.')}
      >
        {bench ? benchFor[bench] : null}
      </RoomDock>
    </div>
  );
}
