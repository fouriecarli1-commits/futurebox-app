'use client';

/**
 * The AI art studio in the album art room — download only.
 *
 * Carli, 13 October 2026: *"Album art, sien ook die ekstra kamer waar album
 * art gegenerate kan word, dit kan wel nie op die songs gebruik word nie,
 * maar kan afgelaai word."*
 *
 * So: a prompt and a style, the picture engine draws a square for credits,
 * the words go on it in a real face, the badge if she wants it, and the
 * whole thing leaves as a 3000×3000 file. There is no button that puts it
 * on a song, and the notice at the top says why: the pieces that go on a
 * release are the ones real artists painted, bought once, on the wall.
 *
 * Google's page had foil and chrome sliders over nothing, a sleeve shimmer
 * and a name for the engine. The sliders are not here; the engine is the
 * one the rest of the app draws with, and it is named as that.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { CREDITS, creditsSaid } from '../lib/credits';
import { FACES, type FaceId } from '../lib/postfaces';
import { useLang } from '../lib/i18n';
import { withSaid } from '../lib/speak';
import SpeakButton from './SpeakButton';

const SIDE = 3000;

const STYLES: ReadonlyArray<{ id: string; word: string; fallback: string; says: string; palette: [string, string, string] }> = [
  { id: 'cyber', word: 'art.make.cyber', fallback: 'Cyberpunk', says: 'cyberpunk, neon cyan and violet, chrome, rain-lit city', palette: ['#0A0C10', '#00F0FF', '#A855F7'] },
  { id: 'acid', word: 'art.make.acid', fallback: 'Acid graphics', says: 'acid graphics, warped type-free shapes, lime and gold on black', palette: ['#10B981', '#FFB800', '#0A0C10'] },
  { id: 'swiss', word: 'art.make.swiss', fallback: 'Minimalist Swiss', says: 'minimalist swiss design, flat colour fields, grid, one bold shape', palette: ['#E11D48', '#F5F5F4', '#0F172A'] },
  { id: 'vinyl', word: 'art.make.vinyl', fallback: 'Retro vinyl', says: 'retro 1970s vinyl sleeve, grain, warm orange and brown, sun', palette: ['#7C2D12', '#F59E0B', '#1E293B'] },
  { id: 'real', word: 'art.make.real', fallback: 'Hyper-realism', says: 'hyper-realistic photograph, shallow depth of field, cinematic light', palette: ['#111827', '#9CA3AF', '#F9FAFB'] },
  { id: 'ink', word: 'art.make.ink', fallback: 'Abstract ink', says: 'abstract ink wash, sumi-e brush, black and one colour on paper', palette: ['#F5F5F4', '#111111', '#2563EB'] },
];

const SWATCHES = ['#00F0FF', '#A855F7', '#FFB800', '#10B981', '#E11D48', '#3B82F6', '#F97316', '#0A0C10', '#F5F5F4'];

const MIKRO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--gedemp)]';
const KAART = 'rounded-2xl border border-[var(--lyn)] bg-[var(--blad)]';
const VUL = 'inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--aksent)] px-6 text-[15px] font-bold text-[color:var(--op-aksent)] transition active:translate-y-px active:opacity-90 disabled:opacity-35';
const LEEG = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--lyn)] bg-[var(--blad)] px-4 text-[14px] font-semibold text-[color:var(--ink)] transition active:translate-y-px active:bg-[var(--leeg)] disabled:opacity-40';
const VELD = 'mt-1.5 w-full rounded-xl border border-[var(--lyn)] bg-[var(--blad)] px-3.5 py-3 text-[16px] text-[color:var(--ink)] outline-none focus:border-[var(--aksent)] focus:ring-2 focus:ring-[var(--aksent-sag)]';

interface Look {
  readonly title: string;
  readonly artist: string;
  readonly face: FaceId;
  readonly advisory: boolean;
  readonly palette: [string, string, string];
}

/** Paint the cover at `side` pixels: picture or gradient, rings, the words, the badge. */
function paint(canvas: HTMLCanvasElement, side: number, look: Look, picture: HTMLImageElement | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = side;
  canvas.height = side;
  if (picture) {
    ctx.drawImage(picture, 0, 0, side, side);
    const shade = ctx.createLinearGradient(0, side * 0.45, 0, side);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, side, side);
  } else {
    const grad = ctx.createLinearGradient(0, 0, side, side);
    grad.addColorStop(0, look.palette[0]);
    grad.addColorStop(0.5, look.palette[1]);
    grad.addColorStop(1, look.palette[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, side, side);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = side * 0.004;
    for (let ring = 0; ring < 6; ring += 1) {
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side * (0.1 + ring * 0.06), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const face = FACES.find((one) => one.id === look.face) ?? FACES[0];
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = side * 0.02;
  if (look.title.trim()) {
    ctx.font = `${face.weight} ${Math.round(side * 0.07)}px ${face.css}`;
    ctx.fillText(look.title.trim().toUpperCase(), side / 2, side * 0.52, side * 0.9);
  }
  if (look.artist.trim()) {
    ctx.font = `600 ${Math.round(side * 0.032)}px ${face.css}`;
    ctx.fillText(look.artist.trim().toUpperCase(), side / 2, side * 0.59, side * 0.9);
  }
  ctx.shadowBlur = 0;
  if (look.advisory) {
    const w = side * 0.18;
    const h = side * 0.08;
    const x = side - w - side * 0.04;
    const y = side - h - side * 0.04;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(side * 0.018)}px Inter, system-ui, sans-serif`;
    ctx.fillText('PARENTAL', x + w / 2, y + h * 0.42);
    ctx.font = `700 ${Math.round(side * 0.014)}px Inter, system-ui, sans-serif`;
    ctx.fillText('ADVISORY', x + w / 2, y + h * 0.66);
    ctx.font = `500 ${Math.round(side * 0.01)}px Inter, system-ui, sans-serif`;
    ctx.fillText('EXPLICIT CONTENT', x + w / 2, y + h * 0.86);
  }
}

export default function ArtMaker(): React.ReactElement {
  const { t } = useLang();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(STYLES[0].id);
  const [look, setLook] = useState<Look>({ title: '', artist: '', face: 'future', advisory: false, palette: STYLES[0].palette });
  const [picture, setPicture] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const preview = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (preview.current) paint(preview.current, 1000, look, picture);
  }, [look, picture]);

  const chosen = STYLES.find((one) => one.id === style) ?? STYLES[0];

  const make = useCallback(async () => {
    const words = prompt.trim();
    if (!words) {
      setProblem(t('art.make.needWords', 'Say what to draw first.'));
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          words: `Album cover artwork, square. ${words}. Style: ${chosen.says}. No words or letters in the picture.`,
          aspect: '1:1',
        }),
      });
      if (!answer.ok) {
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setProblem(why.message ?? `${t('art.make.failed', 'That could not be drawn.')} (${answer.status})`);
        return;
      }
      const blob = await answer.blob();
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        setPicture((was) => {
          if (was) URL.revokeObjectURL(was.src);
          return image;
        });
      };
      image.src = url;
    } catch {
      setProblem(t('art.make.offline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  }, [chosen.says, prompt, t]);

  const download = useCallback(() => {
    const out = document.createElement('canvas');
    paint(out, SIDE, look, picture);
    const link = document.createElement('a');
    link.download = `futurebox-art-${SIDE}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  }, [look, picture]);

  return (
    <div className="space-y-4 px-4 pb-6 pt-4" data-artmaker>
      {/* ── The rule, before anything is drawn ──────────────────────── */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] leading-relaxed" data-artmakerrule>
        <p className="font-bold uppercase tracking-wider text-amber-300">{t('art.make.ruleTitle', 'Download only')}</p>
        <p className="pt-1 text-[color:var(--ink-2)]">
          {t('art.make.rule', 'What you draw here is yours to download. It cannot be put on a song in this app: the pieces that go on a release are the ones real artists made, bought once, from the wall.')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
        {/* ── The controls ─────────────────────────────────────────── */}
        <div className={`${KAART} space-y-4 p-4`}>
          <label className="block">
            <span className={MIKRO}>{t('art.make.prompt', 'What to draw')}</span>
            <span className="relative block">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                data-artmakerprompt
                placeholder={t('art.make.promptHint', 'A chrome landscape under a violet sky, neon rain, a lone figure')}
                className={`${VELD} resize-none pr-11`}
              />
              <SpeakButton onHeard={(said) => setPrompt((was) => withSaid(was, said))} className="absolute bottom-2 right-2" />
            </span>
          </label>
          <div>
            <p className={MIKRO}>{t('art.make.style', 'Style')}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {STYLES.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  data-artmakerstyle={one.id}
                  onClick={() => {
                    setStyle(one.id);
                    setLook((was) => ({ ...was, palette: one.palette }));
                  }}
                  aria-pressed={style === one.id}
                  className={`${LEEG} !justify-start truncate ${style === one.id ? '!border-[var(--aksent)] !text-[color:var(--aksent)]' : ''}`}
                >
                  {t(one.word, one.fallback)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={MIKRO}>{t('art.make.title', 'Album title')}</span>
              <input value={look.title} onChange={(event) => setLook({ ...look, title: event.target.value })} className={VELD} data-artmakertitle />
            </label>
            <label className="block">
              <span className={MIKRO}>{t('art.make.artist', 'Artist name')}</span>
              <input value={look.artist} onChange={(event) => setLook({ ...look, artist: event.target.value })} className={VELD} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={MIKRO}>{t('art.make.face', 'Face')}</span>
              <select value={look.face} onChange={(event) => setLook({ ...look, face: event.target.value as FaceId })} className={VELD}>
                {FACES.map((one) => <option key={one.id} value={one.id}>{one.name}</option>)}
              </select>
            </label>
            <div>
              <span className={MIKRO}>{t('art.make.advisory', 'Parental advisory')}</span>
              <button
                type="button"
                onClick={() => setLook({ ...look, advisory: !look.advisory })}
                aria-pressed={look.advisory}
                className={`${LEEG} mt-1.5 w-full ${look.advisory ? '!border-[var(--aksent)] !text-[color:var(--aksent)]' : ''}`}
              >
                {look.advisory ? t('art.make.advisoryOn', 'Badge on') : t('art.make.advisoryOff', 'Badge off')}
              </button>
            </div>
          </div>
          <div>
            <p className={MIKRO}>{t('art.make.palette', 'Ground, when there is no picture yet')}</p>
            {/* Three rows, one a colour of the ground, each nine swatches in a
                grid that is always the width of the card. It was three
                rows that could not wrap, of swatches the app's button rule
                grew to a thumb's width — Carli, 14 October 2026: *"die kleur
                skema op die mobile app, gaan langer as die kamer aan."* */}
            <div className="mt-1.5 space-y-2" data-artmakerpalette>
              {([
                [0, t('art.make.top', 'Top')],
                [1, t('art.make.middle', 'Middle')],
                [2, t('art.make.bottom', 'Bottom')],
              ] as const).map(([slot, says]) => (
                <div key={slot}>
                  <span className="mb-1 block text-[11px] text-[color:var(--gedemp)]">{says}</span>
                  <div className="grid grid-cols-9 gap-1.5">
                    {SWATCHES.map((colour) => (
                      <button
                        key={colour}
                        type="button"
                        aria-label={`${says}: ${colour}`}
                        aria-pressed={look.palette[slot] === colour}
                        onClick={() => {
                          const next = [...look.palette] as [string, string, string];
                          next[slot] = colour;
                          setLook({ ...look, palette: next });
                        }}
                        style={{
                          background: colour,
                          boxShadow: look.palette[slot] === colour
                            ? '0 0 0 2px var(--aksent), 0 0 10px var(--aksent)'
                            : 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                        }}
                        className="aspect-square !min-h-0 w-full min-w-0 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => void make()} disabled={busy} className={VUL} data-artmakermake>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? t('art.make.drawing', 'Drawing…') : `${t('art.make.draw', 'Draw it')} · ${creditsSaid(CREDITS.repaint, t)}`}
          </button>
          {problem && <p className="text-[13px] text-amber-300">{problem}</p>}
          <p className="text-[11px] text-[color:var(--gedemp)]">
            {t('art.make.engine', 'Drawn by the same picture engine the rest of the app uses. The words and the badge are put on here, on your own device, and go into the file you download.')}
          </p>
        </div>

        {/* ── The cover ────────────────────────────────────────────── */}
        <div className={`${KAART} space-y-3 p-4`}>
          <div className="flex items-center justify-between">
            <p className={MIKRO}>{t('art.make.preview', 'Cover, 3000 × 3000 master')}</p>
            <span className="rounded border border-[var(--lyn)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--gedemp)]">
              {t('art.make.local', 'Download only')}
            </span>
          </div>
          <canvas ref={preview} className="aspect-square w-full rounded-xl border border-[var(--lyn)] bg-black" data-artmakercanvas />
          <button type="button" onClick={download} className={VUL} data-artmakerdownload>
            <Download className="h-4 w-4" />
            {t('art.make.download', 'Download the 3000 × 3000 file')}
          </button>
          <p className="flex items-start gap-1.5 text-[11px] text-[color:var(--gedemp)]">
            <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
            {t('art.make.noSong', 'There is no “put it on a song” here, on purpose. That is what the wall is for.')}
          </p>
        </div>
      </div>
    </div>
  );
}
