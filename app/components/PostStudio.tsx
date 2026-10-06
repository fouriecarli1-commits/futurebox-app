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
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';

const MIKRO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';
const VUL = 'w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black disabled:opacity-40';
const LEEG = 'rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-300';
const VELD = 'mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100';


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
const freshId = (): string => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function PostStudio({ onClose }: { readonly onClose: () => void }): React.ReactElement {
  const { t, lang } = useLang();
  const [size, setSize] = useState<PostSize>(POST_SIZES[0]);
  const [picture, setPicture] = useState<HTMLImageElement | null>(null);
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
  useBackLayer(true, onClose);

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

  /** Everything that is drawn, in the order it is drawn. */
  const draw = (to: HTMLCanvasElement, guides: boolean): void => {
    const ctx = to.getContext('2d');
    if (!ctx) return;
    to.width = size.width;
    to.height = size.height;
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
      const step = Math.round(size.width / 24);
      for (let y = 0; y < size.height; y += step) {
        for (let x = 0; x < size.width; x += step) {
          ctx.fillStyle = ((x / step) + (y / step)) % 2 === 0 ? '#3f3f46' : '#27272a';
          ctx.fillRect(x, y, step, step);
        }
      }
    }

    if (picture) {
      /* Covered, not stretched. A photograph squashed into a square is the
         one thing that makes a post look like a mistake rather than a
         choice, and cropping is what every app does with the same picture. */
      const scale = Math.max(size.width / picture.width, size.height / picture.height);
      const w = picture.width * scale;
      const h = picture.height * scale;
      ctx.drawImage(picture, (size.width - w) / 2, (size.height - h) / 2, w, h);
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

  useEffect(() => {
    if (canvas.current) draw(canvas.current, true);
  }, [facesIn, size, picture, words, back]);

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
    img.onload = () => { setPicture(img); URL.revokeObjectURL(img.src); };
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
  const take = async (): Promise<void> => {
    setBusy(true);
    setSaid('');
    try {
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
        return;
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
      if (!blob) {
        setSaid(t('post.noExport', 'That could not be exported.'));
        return;
      }
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

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-zinc-950 text-zinc-100" data-poststudio>
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
          <h2 className="text-lg font-bold">{t('post.title', 'Make a post')}</h2>
          <button type="button" onClick={onClose} data-backout aria-label={t('post.close', 'Close')} className={LEEG}>
            <X className="h-4 w-4" />
          </button>
        </div>

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
          className="w-full rounded-xl border border-zinc-800"
          style={{ aspectRatio: `${size.width} / ${size.height}` }}
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
