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
import { Download, Image as ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  POST_SIZES, clashes, fitText, moveInside, sizeById,
  type Box, type Measure, type PostSize,
} from '../lib/posttext';
import { ALL, boxOf } from '../lib/safezones';
import { CREDITS, creditsSaid } from '../lib/credits';
import { ACCEPTS, fit } from '../lib/imagefile';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { FACES, faceOf, faceReady, type FaceId } from '../lib/postfaces';
import {
  MIDDLE, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP,
  canMove, moveBy, place, showsThrough, zoomTo, type Crop,
} from '../lib/postcrop';
import {
  AUTO, PLAIN, RANGES, filterFor, touched, warmWash, type Look,
} from '../lib/postlook';
import { canRead, readWords, tidy, type Readable } from '../lib/ocr';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';

const MIKRO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';
const VUL = 'w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black disabled:opacity-40';
const LEEG = 'rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-300';
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

const freshId = (): string => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function PostStudio({ onClose, onIntoFilm, asRoom = false }: {
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
  const draw = (to: HTMLCanvasElement, guides: boolean): void => {
    const ctx = to.getContext('2d');
    if (!ctx) return;
    const want = guides
      ? Math.min(1, PREVIEW_LONGEST / Math.max(size.width, size.height))
      : 1;
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
         spot and offer a drag that means another. */
      const at = place(picture, size, crop);
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

    /* The guides last, over everything, and never on the exported file —
       `draw(…, false)` is what the download uses. */
    if (guides && size.furniture) {
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
  }, [facesIn, size, picture, words, back, crop, look]);

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

  const grab = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!movable) return;
    lastAt.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLCanvasElement>): void => {
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
    img.onload = () => { setPicture(img); setCrop(MIDDLE); setLook(PLAIN); URL.revokeObjectURL(img.src); };
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
    draw(sheet, false);
    const blob = await new Promise<Blob | null>((done) => sheet.toBlob(done, 'image/png'));
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
      a.download = `futurebox-${size.id}.png`;
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
      setGrabbed(tidy(got.text));
    } finally {
      setReading(null);
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

  const SKIN = asRoom
    ? 'min-h-screen overflow-y-auto'
    : 'fixed inset-0 z-[60] overflow-y-auto bg-zinc-950';

  return (
    <div
      className={`${SKIN} text-zinc-100`}
      data-poststudio
      data-postroom={asRoom ? 'yes' : 'no'}
      style={asRoom ? { background: FLOOR, color: INK } : undefined}
    >
      {/* ── Room under the last thing, for the bar ────────────────────────
 
          This sheet scrolls, and the app's tab bar sits over the bottom of
          whatever is behind it. A plain `env(safe-area-inset-bottom)` is the
          phone's chin and not the bar, so the last control in a long post —
          the Save button — ended under it. `barClearance` is the bar's own
          height plus that inset, exported from the file that draws the bar,
          so the two cannot drift. `check:belowtabs` refused this screen
          without it. */}
      <div className="mx-auto max-w-2xl space-y-5 p-4" style={{ paddingBottom: barClearance(16) }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {asRoom ? t('rail.photo', 'Photo Editor') : t('post.title', 'Make a post')}
          </h2>
          {/* A room is left by the menu, like every other room. A close
              button here would be a second way out that only this room has,
              and the one it leads back to depends on how you arrived. */}
          {!asRoom && (
            <button type="button" onClick={onClose} data-backout aria-label={t('post.close', 'Close')} className={LEEG}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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
          {t('post.priceTwo', '\u2014 the same one credit whether you save it to your phone or put it on a film, and the same post is only ever charged once.')}
        </p>

        {/* ── The shape, first, because it changes everything under it ───── */}
        <div>
          <p className={MIKRO}>{t('post.shape', 'Shape')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
            touchAction: movable ? 'none' : 'auto',
            cursor: movable ? 'grab' : 'default',
          }}
        />

        {covered && (
          <p data-postclash className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] leading-relaxed text-amber-300">
            {t('post.covered', 'Some of your words are where the app prints its own caption and buttons. They are moved clear in the saved file; the shaded bands show where.')}
          </p>
        )}

        {/* ── The picture ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
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
            <button type="button" onClick={() => setPicture(null)} className={LEEG}>
              {t('post.takeOut', 'Take it out')}
            </button>
          )}
          <label className="inline-flex items-center gap-2">
            <span className={MIKRO}>{t('post.behind', 'Behind')}</span>
            <input
              type="color"
              data-postbehind
              value={back ?? lastColour}
              onChange={(event) => {
                setLastColour(event.target.value);
                setBack(event.target.value);
              }}
              className="h-9 w-12 rounded border border-zinc-700 bg-zinc-950"
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

            <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={MIKRO}>{t('post.look', 'How it reads')}</p>
              <div className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={MIKRO}>{t('post.grab', 'Words in the picture')}</p>
              <div className="flex flex-wrap gap-2">
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-postgrabuse
                    onClick={() => {
                      setWords((was) => [...was, {
                        id: freshId(), text: grabbed, face: FACES[0].id,
                        spot: was.length === 0 ? 'bottom' : 'top', ink: '#ffffff',
                      }]);
                      setGrabbed(null);
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
              <div className="flex flex-wrap items-center gap-2">
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

        {said && <p data-postsaid className="text-[13px] leading-relaxed text-emerald-400">{said}</p>}

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
            onClick={() => { setPost(freshId()); setWords([]); setPicture(null); setSaid(''); }}
            className={LEEG}
          >
            {t('post.startFresh', 'Start a new post')}
          </button>
        </div>
      </div>
    </div>
  );
}
