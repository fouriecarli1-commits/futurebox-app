'use client';

/**
 * Starting points for a film, drawn as a picker in the cutting room.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"Wat ek ook wil in sit by video desk is templates vir
 * videos? ... AS mens kyk na nano banana, en veo ens. is daar templates wat help
 * om keuses te maak. Ek wil dit in die app integrate op 'n moderne stylish manier
 * vir kliente om van te kies."*
 *
 * The starting points themselves are `lib/filmstart.ts` — the shape, one look
 * across every shot, how the shots join, a title and a sign-off. This only
 * draws them. Pressing one hands it to the cutting room, which dresses the
 * clips that are already there; it cannot film anything, and the note under
 * the grid says so.
 *
 * ── Painted with the room's own palette ──────────────────────────────────
 *
 * The cutting room is `[data-cutroom]` and paints itself from `lib/cutlook.ts`
 * rather than from the zinc classes, because inside that room the surface
 * tokens are the room's own dark ones and zinc-800 on zinc-300 lands at
 * 1.5:1. The first version of this picker used the classes and
 * `check:contrast` found thirty-five labels below AA in one bench. Every
 * colour here is INK, INK_DIM, PANEL or RAISED now, the way the rest of the
 * room does it.
 *
 * A section that offered three "Veo prompts" to copy and take to Google's own
 * site was taken out: the video desk already runs Veo inside the app, and a
 * button whose job is to send a member elsewhere is not a feature.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Captions, Clapperboard, Film, Frame, Play, Shapes, Smartphone, Sparkles, Square, Tv, Type, X } from 'lucide-react';
import { CAPTION_STYLES, type CaptionStyle } from '../lib/captionstyles';
import { paintFor, previewFor, roundFor } from '../lib/videopaint';
import { STARTS, type FilmStart } from '../lib/filmstart';
import { meerkatPhotoUrl } from '../lib/meerkatphoto';
import { filterCss } from '../lib/videofilters';
import { useLang } from '../lib/i18n';
import { EDGE, INK, INK_DIM, LIT, PANEL, RAISED } from '../lib/cutlook';
import { TITLE_STYLES, type TitleStyle } from '../lib/posttitles';
import { glowOf, haloPasses } from '../lib/postglow';
import { MARK_SPECS, NEON_INKS, STICKER_EMOJI, type Mark, type MarkKind } from '../lib/postshapes';
import { fit } from '../lib/imagefile';
import { fontFor } from '../lib/videofonts';
import {
  FRAMES, FRAME_INKS, WORD_MOTIONS, drawFrame, motionAt, motionCss, shownWords, wordsStyleOf,
  type FrameId, type MotionId,
} from '../lib/videoextras';

interface VideoTemplatesPickerProps {
  onSelectStart: (start: FilmStart) => void;
  piecesCount: number;
  currentShape?: string;
  /* The four kinds of template beside the recipes — the owner, 14 October 2026:
     "Dan moet ons seker maak dat die cool text templates in die photo editor
     ook hierdie kant kom. Ons kort shapes, frames, en motion templates." */
  readonly wordsMotion?: string;
  readonly onTextStyle: (style: TitleStyle) => void;
  /** A subtitle look or a lower third — `lib/captionstyles.ts`. */
  readonly onCaption: (style: CaptionStyle) => void;
  readonly onMotion: (id: MotionId) => void;
  readonly frame?: string;
  readonly frameInk?: string;
  readonly onFrame: (id: FrameId, ink: string) => void;
  readonly shapesCount: number;
  readonly onShape: (kind: MarkKind, ink: string) => void;
  readonly onClearShapes: () => void;
  /** The stickers on the film (shapes of the kind 'sticker'), and how to add, change and take one off. */
  readonly stickers?: readonly Mark[];
  readonly onSticker?: (sticker: { readonly picture?: string; readonly emoji?: string }, ink: string) => void;
  readonly onStickerSet?: (id: string, patch: Partial<Mark>) => void;
  readonly onStickerOff?: (id: string) => void;
  /** The editor's hold on a slide, so one slide of a sticker's dial is one step of Back. */
  readonly stickerGesture?: React.HTMLAttributes<HTMLInputElement>;
}

type Tab = 'film' | 'text' | 'captions' | 'motion' | 'shapes' | 'frames';

/** A glow as CSS, from the same passes the film paints it with. */
const glowCss = (glow: string, px: number): string | undefined => {
  const passes = haloPasses(glowOf(glow), px);
  return passes.length ? passes.map((one) => `0 0 ${Math.round(one.blur)}px ${one.colour}`).join(', ') : undefined;
};

/**
 * The simulator: sample words running a motion on a loop.
 *
 * The owner, 14 October 2026: *"Die motion templates moet 'n simulator hê
 * wanneer mens op dit kliek."* Driven by `motionAt`, the function the film
 * is rendered with, so what plays here is what the film does.
 */
function MotionSimulator({ motion, words }: { readonly motion: string; readonly words: string }): React.ReactElement {
  const [age, setAge] = useState(0);
  const started = useRef(0);
  useEffect(() => {
    started.current = performance.now();
    let frame = 0;
    const tick = (): void => {
      /* Two and a half seconds round: the entrance, a moment at rest, again. */
      setAge(((performance.now() - started.current) / 1000) % 2.5);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion]);
  const now = motionAt(motion, age);
  const tall = 150;
  return (
    <div
      data-editormotionsim={motion}
      className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-xl border"
      style={{ borderColor: EDGE, background: 'linear-gradient(135deg, #0b1020, #000 60%, #052e2b)' }}
    >
      <span
        data-editormotionsample
        className="px-3 text-center text-2xl font-black"
        style={{
          color: '#ffffff',
          opacity: now.alpha,
          transform: motionCss(now, tall),
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {shownWords(words, now) || '\u00a0'}
      </span>
    </div>
  );
}

/** A frame drawn small, by the same function that draws it on the film. */
function FrameTile({ id, ink }: { readonly id: string; readonly ink: string }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext('2d');
    if (!node || !ctx) return;
    ctx.clearRect(0, 0, node.width, node.height);
    const sky = ctx.createLinearGradient(0, 0, node.width, node.height);
    sky.addColorStop(0, '#1e3a5f');
    sky.addColorStop(1, '#0f172a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, node.width, node.height);
    drawFrame(ctx, id, node.width, node.height, ink);
  }, [id, ink]);
  return <canvas ref={canvas} width={96} height={128} className="h-16 w-12 rounded" aria-hidden="true" />;
}

const SHAPE_ICONS: Record<string, React.ReactElement> = {
  tall: <Smartphone className="h-3.5 w-3.5" />,
  wide: <Tv className="h-3.5 w-3.5" />,
  square: <Square className="h-3.5 w-3.5" />,
};

/** Ratios rather than words, so the chip reads the same in both languages. */
const SHAPE_LABELS: Record<string, string> = {
  tall: '9:16',
  wide: '16:9',
  square: '1:1',
};

const CHIP = { background: 'rgba(255,255,255,0.07)', color: INK_DIM } as const;

/** A start as a little film frame: its shape, its look, its title. */
function StartThumb({ start, title }: { readonly start: FilmStart; readonly title: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { setSrc(meerkatPhotoUrl('day')); }, []);
  const shape = start.shape === 'wide' ? { w: 96, h: 54 } : start.shape === 'square' ? { w: 72, h: 72 } : { w: 54, h: 96 };
  const ink = start.title ? paintFor(start.title.ink)?.hex ?? '#ffffff' : '#ffffff';
  const back = start.title ? paintFor(start.title.back)?.hex ?? '#000000' : '#000000';
  const look = start.title ? previewFor(start.title.box, roundFor(start.title.box), 8) : null;
  const filled = start.title && start.title.box !== 'none' && start.title.box !== 'line' && start.title.box !== 'outline';
  return (
    <span aria-hidden data-editorstartthumb className="relative block shrink-0 self-center overflow-hidden rounded-md" style={{ width: shape.w, height: shape.h, background: '#111' }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" style={{ filter: filterCss(start.look) || undefined }} /> : null}
      {title ? (
        <span
          className="absolute left-1/2 max-w-[92%] truncate px-1 text-[8px] font-black leading-tight"
          style={{
            top: `${(start.title?.at.y ?? 0.2) * 100}%`,
            transform: 'translate(-50%, -50%)',
            color: ink,
            background: filled ? `${back}d9` : 'transparent',
            borderRadius: look?.borderRadius,
            clipPath: look?.clipPath,
            textShadow: '0 0 2px #000',
          }}
        >
          {title}
        </span>
      ) : null}
    </span>
  );
}

export default function VideoTemplatesPicker({
  onSelectStart,
  piecesCount,
  currentShape,
  wordsMotion,
  onTextStyle,
  onCaption,
  onMotion,
  frame,
  frameInk,
  onFrame,
  shapesCount,
  onShape,
  onClearShapes,
  stickers = [],
  onSticker,
  onStickerSet,
  onStickerOff,
  stickerGesture,
}: VideoTemplatesPickerProps): React.ReactElement {
  const { t } = useLang();
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('film');
  const [trying, setTrying] = useState<MotionId>((wordsMotion as MotionId | undefined) ?? 'pop');
  const [shapeInk, setShapeInk] = useState<string>(NEON_INKS[1]);
  const [stickerSaid, setStickerSaid] = useState('');
  const [ink, setInk] = useState<string>(frameInk ?? FRAME_INKS[0]);
  const TABS: readonly { id: Tab; icon: React.ReactElement; label: string }[] = [
    { id: 'film', icon: <Film className="h-3.5 w-3.5" />, label: t('edit.tplFilm', 'Whole film') },
    { id: 'text', icon: <Type className="h-3.5 w-3.5" />, label: t('edit.tplText', 'Text styles') },
    { id: 'captions', icon: <Captions className="h-3.5 w-3.5" />, label: t('edit.tplCaptions', 'Subtitles') },
    { id: 'motion', icon: <Sparkles className="h-3.5 w-3.5" />, label: t('edit.tplMotion', 'Motion') },
    { id: 'shapes', icon: <Shapes className="h-3.5 w-3.5" />, label: t('edit.tplShapes', 'Shapes') },
    { id: 'frames', icon: <Frame className="h-3.5 w-3.5" />, label: t('edit.tplFrames', 'Frames') },
  ];
  const noClip = piecesCount === 0;

  const handleApplyStart = (start: FilmStart) => {
    setSelectedStartId(start.id);
    onSelectStart(start);
  };

  return (
    <div
      className="space-y-4 rounded-2xl border p-4 shadow-xl"
      style={{ background: PANEL, borderColor: EDGE, color: INK }}
    >
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: EDGE }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border"
          style={{ borderColor: EDGE, background: 'rgba(52,211,153,0.12)', color: LIT }}
        >
          <Film className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight" style={{ color: INK }}>
            {t('edit.tplTitle', 'Templates')}
          </h3>
          <p className="text-[11px]" style={{ color: INK_DIM }}>
            {t('edit.tplWhy', 'Ready-made looks for your film. Press one to put it on — then change anything.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5" role="tablist" aria-label={t('edit.tplTitle', 'Templates')}>
        {TABS.map((one) => (
          <button
            key={one.id}
            type="button"
            role="tab"
            aria-selected={tab === one.id}
            data-editortpltab={one.id}
            onClick={() => setTab(one.id)}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold"
            style={{
              background: tab === one.id ? 'rgba(52,211,153,0.16)' : RAISED,
              borderColor: tab === one.id ? LIT : EDGE,
              color: INK,
            }}
          >
            {one.icon}
            {one.label}
          </button>
        ))}
      </div>

      {tab === 'film' && (
      <>
      <p className="text-[11px]" style={{ color: INK_DIM }}>
        {t(
          'edit.startWhy',
          'Each one sets the shape, one look across every shot, transitions, a title and sign-off.',
        )}
      </p>
      {/* As many columns as the BENCH has room for, not the screen: on a
          computer the bench is a side panel, and three columns sized by the
          window squeezed every card to one word a line (the owner's
          screenshot, 22 October 2026). */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))' }} data-editorstartgrid>
        {STARTS.map((start) => {
          const isSelected = selectedStartId === start.id;
          const sameShape = currentShape === start.shape;
          return (
            <button
              key={start.id}
              type="button"
              data-editorstart={start.id}
              /* A card, not a bar: a name, a line on what it does and three chips.
                 `audit/tidybars.mjs` holds every control in a bench to one
                 height and lets a card declare itself. */
              data-tidycard=""
              onClick={() => handleApplyStart(start)}
              className="group flex min-h-[44px] flex-col justify-between rounded-xl border p-3 text-left transition-all"
              style={{
                background: isSelected ? RAISED : PANEL,
                borderColor: isSelected ? LIT : EDGE,
                boxShadow: isSelected ? `0 0 0 1px ${LIT}` : undefined,
                color: INK,
              }}
            >
              <div className="flex gap-2.5">
                {/* The film as a picture: the meerkat photograph in the start's
                    shape, under its look, with its title where it goes. The owner,
                    17 October 2026: every template visual. */}
                <StartThumb start={start} title={start.title ? t(start.title.says[0], start.title.says[1]) : ''} />
                <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-black" style={{ color: INK }}>
                    <Clapperboard className="h-3.5 w-3.5" style={{ color: LIT }} />
                    <span>{t(start.name[0], start.name[1])}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                    style={sameShape ? { background: 'rgba(52,211,153,0.18)', color: INK } : CHIP}
                    title={sameShape ? t('edit.startSameShape', 'The shape your film is in now') : undefined}
                  >
                    {SHAPE_ICONS[start.shape]}
                    <span>{SHAPE_LABELS[start.shape] ?? start.shape}</span>
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-snug" style={{ color: INK_DIM }}>
                  {t(start.what[0], start.what[1])}
                </p>
                </div>
              </div>

              <div
                className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2 text-[10px]"
                style={{ borderColor: EDGE }}
              >
                <span className="rounded px-1.5 py-0.5 font-semibold" style={CHIP}>
                  {t('edit.startLook', 'Look')}: <span className="font-bold" style={{ color: INK }}>{start.look}</span>
                </span>
                <span className="rounded px-1.5 py-0.5 font-semibold" style={CHIP}>
                  {t('edit.startJoin', 'Join')}: <span className="font-bold" style={{ color: INK }}>{start.join}</span>
                </span>
                {start.title && (
                  <span className="max-w-[130px] truncate rounded px-1.5 py-0.5 font-semibold" style={{ ...CHIP, color: INK }}>
                    &quot;{t(start.title.says[0], start.title.says[1])}&quot;
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {piecesCount === 0 && (
        <p className="text-[11px] italic" style={{ color: INK_DIM }}>
          {t(
            'edit.startEmpty',
            'Bring a clip in first. A starting point dresses your own film — one look across every shot, how they come in after one another, a title and a sign-off — it cannot film it for you.',
          )}
        </p>
      )}
      </>
      )}

      {noClip && tab !== 'film' && (
        <p className="text-[11px] italic" style={{ color: INK_DIM }} data-editortplneedsclip>
          {t('edit.tplNeedsClip', 'Bring a clip in first — these go on top of your own film.')}
        </p>
      )}

      {/* ── Text styles: the photo room's titles, on the film ─────────── */}
      {tab === 'text' && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {TITLE_STYLES.map((style) => {
            const look = wordsStyleOf(style.title);
            return (
              <button
                key={style.id}
                type="button"
                data-editortextstyle={style.id}
                data-tidycard=""
                disabled={noClip}
                onClick={() => onTextStyle(style)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center disabled:opacity-40"
                style={{ borderColor: EDGE, background: `linear-gradient(135deg, ${style.tile[0]}33, #000 60%, ${style.tile[1]}33)` }}
              >
                <span
                  className="text-base leading-tight"
                  style={{
                    fontFamily: fontFor(look.wordsFont).stack,
                    fontWeight: fontFor(look.wordsFont).weight,
                    color: look.wordsInk,
                    textShadow: glowCss(look.wordsGlow, 14),
                  }}
                >
                  {t(style.title.says[0], style.title.says[1])}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: INK_DIM }}>{t(style.name[0], style.name[1])}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Subtitles and lower thirds ────────────────────────────────────
          The owner, 16 October 2026, screenshots of a title library: subtitle
          looks and lower thirds, each a picture of what it does. Every one is
          settings the Words bench already has, so all of it stays editable. */}
      {tab === 'captions' && (
        <div className="space-y-4" data-editorcaptions>
          {(['subtitle', 'lower'] as const).map((group) => (
            <section key={group} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: INK_DIM }}>
                {group === 'subtitle' ? t('edit.capSubtitles', 'Subtitles') : t('edit.capLower', 'Lower thirds')}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CAPTION_STYLES.filter((one) => one.group === group).map((style) => {
                  const ink = paintFor(style.ink)?.hex ?? '#ffffff';
                  const back = paintFor(style.back)?.hex ?? '#000000';
                  const look = previewFor(style.box, roundFor(style.box), 11);
                  const filled = style.box !== 'none' && style.box !== 'line' && style.box !== 'outline';
                  const alpha = Math.round(style.backSolid * 255).toString(16).padStart(2, '0');
                  return (
                    <button
                      key={style.id}
                      type="button"
                      data-editorcaption={style.id}
                      data-tidycard=""
                      disabled={noClip}
                      onClick={() => onCaption(style)}
                      className="flex min-h-[88px] flex-col items-stretch gap-1.5 rounded-xl border p-2 text-left disabled:opacity-40"
                      style={{ borderColor: EDGE, background: RAISED }}
                    >
                      <span
                        aria-hidden
                        className="relative block h-12 w-full overflow-hidden rounded-lg"
                        style={{ background: 'linear-gradient(135deg, #1f2937, #0b1020 55%, #3f2a14)' }}
                      >
                        <span
                          className="absolute whitespace-nowrap px-1.5 py-0.5 text-[11px] font-bold leading-tight"
                          style={{
                            left: `${(style.at?.x ?? 0.5) * 100}%`,
                            top: `${(style.at?.y ?? 0.86) * 100}%`,
                            transform: 'translate(-50%, -60%)',
                            color: ink,
                            background: filled ? `${back}${alpha}` : 'transparent',
                            borderRadius: look.borderRadius,
                            clipPath: look.clipPath,
                            borderBottom: style.box === 'line' ? `2px solid ${back}` : undefined,
                            outline: style.box === 'outline' ? `1.5px solid ${back}` : undefined,
                            textShadow: style.edge === 'shadow' || style.edge === 'both'
                              ? `${style.edge === 'both' ? '2px 2px 0' : '0 2px 4px'} rgba(0,0,0,0.9)`
                              : style.edge === 'outline' ? '0 0 2px #000, 0 0 2px #000' : undefined,
                          }}
                        >
                          {group === 'subtitle' ? t('edit.capSample', 'Subtitle') : t('edit.capName', 'Name · Role')}
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold leading-tight" style={{ color: INK }}>{t(style.name[0], style.name[1])}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Motion, with its simulator ─────────────────────────────────── */}
      {tab === 'motion' && (
        <div className="space-y-2.5">
          <MotionSimulator motion={trying} words={t('edit.motionSample', 'Your words here')} />
          <p className="text-[11px]" style={{ color: INK_DIM }} data-editormotionwhat>
            {(() => {
              const one = WORD_MOTIONS.find((m) => m.id === trying);
              return one ? `${t(one.name[0], one.name[1])} — ${t(one.what[0], one.what[1])}` : '';
            })()}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WORD_MOTIONS.map((one) => (
              <button
                key={one.id}
                type="button"
                data-editormotion={one.id}
                aria-pressed={trying === one.id}
                onClick={() => setTrying(one.id)}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold"
                style={{
                  background: trying === one.id ? 'rgba(52,211,153,0.16)' : RAISED,
                  borderColor: wordsMotion === one.id ? LIT : trying === one.id ? 'rgba(52,211,153,0.5)' : EDGE,
                  color: INK,
                }}
              >
                <Play className="h-3 w-3" />
                {t(one.name[0], one.name[1])}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-editormotionuse
            disabled={noClip}
            onClick={() => onMotion(trying)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black disabled:opacity-40"
            style={{ background: LIT, borderColor: LIT, color: '#04130d' }}
          >
            {t('edit.motionUse', 'Put this motion on the words')}
          </button>
        </div>
      )}

      {/* ── Shapes, from the photo room ─────────────────────────────────── */}
      {tab === 'shapes' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('edit.shapeInk', 'Shape colour')}>
            {NEON_INKS.slice(0, 8).map((one) => (
              <button
                key={one}
                type="button"
                data-editorshapeink={one}
                aria-pressed={shapeInk === one}
                aria-label={one}
                onClick={() => setShapeInk(one)}
                className="h-11 w-11 rounded-full border-2"
                style={{ background: one, borderColor: shapeInk === one ? '#ffffff' : 'rgba(255,255,255,0.25)' }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {MARK_SPECS.map((one) => (
              <button
                key={one.id}
                type="button"
                data-editoraddshape={one.id}
                disabled={noClip}
                onClick={() => onShape(one.id, shapeInk)}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] font-semibold disabled:opacity-40"
                style={{ borderColor: EDGE, background: RAISED, color: INK }}
              >
                <span className="text-xl" aria-hidden="true">{one.icon}</span>
                {t(one.name[0], one.name[1])}
              </button>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: INK_DIM }}>
            {t('edit.shapesHow', 'A shape lands in the middle of the picture. Drag it there to move it; it stays for the whole film.')}
          </p>
          {/* ── Stickers ─────────────────────────────────────────────────
              The owner, 30 October 2026: the photo tools on video, a sticker
              among them, across the whole clip. A sticker is a shape of its
              own kind (`lib/postshapes.ts`), so it is dragged on the film,
              burned into the cut and kept on the edit the way a shape is;
              its own picture or a lit emoji, and every setting a shape has. */}
          {onSticker && (
            <div className="space-y-2 pt-1" data-editorstickers>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: INK_DIM }}>{t('edit.stickersTitle', 'Stickers')}</p>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {STICKER_EMOJI.map((one) => (
                  <button
                    key={one}
                    type="button"
                    data-editoraddsticker={one}
                    disabled={noClip}
                    aria-label={t('edit.stickerAdd', 'Put this sticker on the film')}
                    onClick={() => onSticker({ emoji: one }, shapeInk)}
                    className="grid min-h-[44px] place-items-center rounded-xl border text-xl disabled:opacity-40"
                    style={{ borderColor: EDGE, background: RAISED }}
                  >
                    {one}
                  </button>
                ))}
              </div>
              <label
                className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${noClip ? 'pointer-events-none opacity-40' : ''}`}
                style={{ borderColor: LIT, background: 'rgba(52,211,153,0.12)', color: INK }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t('edit.stickerOwn', 'Your own picture as a sticker')}
                <input
                  type="file"
                  accept="image/*"
                  data-editorstickerfile
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setStickerSaid('');
                    /* Through `fit`, as every picture in the app is: a big
                       phone photo decoded whole would close the tab. 512 is
                       more than a sticker on a film can use. */
                    void fit(file, 512).then((made) => {
                      if (!made.ok) { setStickerSaid(t('edit.markBad', 'That picture could not be read.')); return; }
                      onSticker({ picture: made.preview }, shapeInk);
                    });
                  }}
                />
              </label>
              <p className="text-[11px]" style={{ color: INK_DIM }}>
                {t('edit.stickerHow', 'A PNG with a see-through background works best. Drag it on the film to move it; it stays for the whole film. No credits.')}
              </p>
              {stickerSaid && <p className="text-[11px]" role="status" style={{ color: '#fca5a5' }}>{stickerSaid}</p>}
              {stickers.map((one, at) => (
                <div key={one.id} data-editorsticker={one.id} className="space-y-1.5 rounded-xl border p-2" style={{ borderColor: EDGE, background: RAISED }}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg text-xl" style={{ background: 'rgba(0,0,0,0.35)' }}>
                      {one.sticker?.picture
                        ? <img src={one.sticker.picture} alt="" className="h-full w-full object-contain" />
                        : one.sticker?.emoji}
                    </span>
                    <span className="flex-1 text-xs font-bold" style={{ color: INK }}>{t('edit.stickerN', 'Sticker {n}').replace('{n}', String(at + 1))}</span>
                    <button
                      type="button"
                      data-editorstickerflip
                      onClick={() => onStickerSet?.(one.id, { flipX: !one.flipX })}
                      className="min-h-[36px] rounded-lg border px-2 text-[11px] font-bold"
                      style={{ borderColor: EDGE, color: INK }}
                    >
                      {t('post.markFlipX', 'Flip sideways')}
                    </button>
                    <button
                      type="button"
                      data-editorstickeroff
                      aria-label={t('edit.stickerOff', 'Take this sticker off')}
                      onClick={() => onStickerOff?.(one.id)}
                      className="grid h-9 w-9 place-items-center rounded-lg border"
                      style={{ borderColor: EDGE, color: INK }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {([
                    ['size', t('edit.stickerSize', 'Size'), 0.08, 0.9, 0.01, one.size],
                    ['turn', t('post.markTurn', 'Turn'), -180, 180, 1, one.turn ?? 0],
                    ['glowPower', t('edit.stickerGlow', 'Glow'), 0, 1.5, 0.05, one.glowPower ?? 0],
                    ['shadow', t('post.markShadow', 'Shadow'), 0, 1, 0.05, one.shadow ?? 0],
                    ['opacity', t('edit.stickerSolid', 'How solid'), 0.1, 1, 0.05, one.opacity ?? 1],
                  ] as const).map(([key, label, low, high, step, value]) => (
                    <label key={key} className="grid grid-cols-[84px_1fr] items-center gap-2 text-[11px]" style={{ color: INK_DIM }}>
                      {label}
                      <input
                        type="range"
                        data-editorstickerdial={key}
                        {...stickerGesture}
                        min={low}
                        max={high}
                        step={step}
                        value={value}
                        onChange={(event) => onStickerSet?.(one.id, { [key]: Number(event.target.value) } as Partial<Mark>)}
                        className="w-full accent-emerald-400"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
          {shapesCount > 0 && (
            <button
              type="button"
              data-editorclearshapes
              onClick={onClearShapes}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold"
              style={{ borderColor: EDGE, background: RAISED, color: INK }}
            >
              <X className="h-3.5 w-3.5" />
              {t('edit.shapesClear', 'Take the shapes off')} ({shapesCount})
            </button>
          )}
        </div>
      )}

      {/* ── Frames round the picture ─────────────────────────────────────── */}
      {tab === 'frames' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('edit.frameInk', 'Frame colour')}>
            {FRAME_INKS.map((one) => (
              <button
                key={one}
                type="button"
                data-editorframeink={one}
                aria-pressed={ink === one}
                aria-label={one}
                onClick={() => { setInk(one); if (frame && frame !== 'none') onFrame(frame as FrameId, one); }}
                className="h-11 w-11 rounded-full border-2"
                style={{ background: one, borderColor: ink === one ? LIT : 'rgba(255,255,255,0.25)' }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {FRAMES.map((one) => (
              <button
                key={one.id}
                type="button"
                data-editorframe={one.id}
                aria-pressed={(frame ?? 'none') === one.id}
                disabled={noClip}
                onClick={() => onFrame(one.id, ink)}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-[11px] font-semibold disabled:opacity-40"
                style={{
                  borderColor: (frame ?? 'none') === one.id ? LIT : EDGE,
                  background: (frame ?? 'none') === one.id ? 'rgba(52,211,153,0.12)' : RAISED,
                  color: INK,
                }}
              >
                <FrameTile id={one.id} ink={ink} />
                {t(one.name[0], one.name[1])}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
