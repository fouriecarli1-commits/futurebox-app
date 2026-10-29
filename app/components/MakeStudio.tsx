'use client';

/**
 * Make a picture: the first room of the "Make anything" studio
 * (`lib/picturemake.ts` says what and why).
 *
 * One sheet, top to bottom, the way the plan has it: what you are making,
 * the look, the mood (all pictures and taps), the idea in your own words with
 * ideas to start from, the read-back of what will be made, four drafts for
 * the price on the button, and the chosen one finished — or kept as it is.
 */
import React, { useState } from 'react';
import { Check, ImagePlus, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { creditsSaid } from '../lib/credits';
import {
  DRAFT_CREDITS, FINAL_CREDITS, KINDS, LOOKS, MOODS, readBack,
  type Choice, type KindId, type LookId, type MoodId,
} from '../lib/picturemake';
import { YesSheet, useEngineYes } from './BecomeBench';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';

/** A swatch for each look, so the choice is a picture and not a word. */
const SWATCH: Readonly<Record<LookId, string>> = {
  photo: 'linear-gradient(135deg,#6b8fae,#d9c7a3)',
  paint: 'linear-gradient(135deg,#8a3b12,#e0a33a,#2f5d8a)',
  watercolour: 'linear-gradient(135deg,#b9e3f5,#f7c6d9,#fdf3c4)',
  comic: 'repeating-linear-gradient(45deg,#ffd400 0 6px,#ff3b30 6px 12px)',
  '3d': 'radial-gradient(circle at 35% 30%,#ffffff,#7aa7ff 45%,#1b2a6b)',
  neon: 'linear-gradient(135deg,#0b0820,#ff2bd6 55%,#21f3ff)',
  film: 'linear-gradient(135deg,#7a5c3a,#d8b98a,#4a3a2a)',
  minimal: 'linear-gradient(90deg,#f4f4f4 60%,#111 60%)',
};

/** Ideas to start from, per thing being made: tapped, then changed. */
const IDEAS: Readonly<Record<KindId, readonly [string, string][]>> = {
  cover: [['make.ideaCover1', 'A lone figure on a rooftop above a city at night'], ['make.ideaCover2', 'A hand holding a glowing cassette tape'], ['make.ideaCover3', 'An old pickup truck on a Karoo road at sunset']],
  poster: [['make.ideaPoster1', 'A crowd with their hands up at an open-air concert'], ['make.ideaPoster2', 'A microphone on an empty stage under one spotlight']],
  post: [['make.ideaPost1', 'Headphones on a wooden table with morning coffee'], ['make.ideaPost2', 'A vinyl record melting into a sunset']],
  story: [['make.ideaStory1', 'A guitarist silhouetted against a huge moon'], ['make.ideaStory2', 'Confetti falling in slow motion']],
  banner: [['make.ideaBanner1', 'Sound waves rolling across a mountain range'], ['make.ideaBanner2', 'A long studio desk with glowing knobs']],
  wallpaper: [['make.ideaWallpaper1', 'Soft clouds over the ocean at dawn'], ['make.ideaWallpaper2', 'A field of sunflowers under stars']],
};

const CARD = 'flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[12px] font-bold';
const ON = 'border-emerald-400 bg-emerald-500/15 text-emerald-100';
const OFF = 'border-zinc-700 text-zinc-200';

export default function MakeStudio({ t, onClose, onPicture }: {
  readonly t: (key: string, fallback: string) => string;
  readonly onClose: () => void;
  /** The picture made, as a data URI, to put in the editor. */
  readonly onPicture: (url: string) => void;
}): React.ReactElement {
  const [kind, setKind] = useState<KindId>('cover');
  const [look, setLook] = useState<LookId>('photo');
  const [mood, setMood] = useState<MoodId>('warm');
  const [idea, setIdea] = useState('');
  const [yes, giveYes] = useEngineYes();
  const [asking, setAsking] = useState<'draft' | 'final' | null>(null);
  const [busy, setBusy] = useState<'draft' | 'final' | null>(null);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [final, setFinal] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  useBackLayer(true, onClose);

  const choice: Choice = { kind, look, mood, idea: idea.trim() };
  const ready = choice.idea.length > 0;

  const ask = async (step: 'draft' | 'final', agreed = false): Promise<void> => {
    if (!yes && !agreed) { setAsking(step); return; }
    setBusy(step);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/picturemake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ step, ...choice, abroad: true, adult: true, ...(step === 'final' && chosen !== null ? { draft: drafts[chosen] } : {}) }),
      });
      const got = (await answer.json().catch(() => ({}))) as { urls?: string[]; url?: string; message?: string };
      if (!answer.ok) { setSaid(got.message ?? t('make.failed', 'That did not work this time. Your credits are back.')); return; }
      if (step === 'draft' && got.urls?.length) { setDrafts(got.urls); setChosen(0); setFinal(null); return; }
      if (step === 'final' && got.url) { setFinal(got.url); return; }
      setSaid(t('make.failed', 'That did not work this time. Your credits are back.'));
    } catch {
      setSaid(t('make.offline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setBusy(null);
    }
  };

  const heading = (n: string, words: string): React.ReactElement => (
    <p data-keep className="text-[11px] font-black uppercase tracking-wider text-zinc-400">{n} · {words}</p>
  );

  return (
    <div role="dialog" aria-modal="true" data-makestudio className="fixed inset-0 z-[80] flex justify-center overflow-y-auto bg-zinc-950/95 p-3 backdrop-blur" style={{ paddingBottom: barClearance(12) }}>
      <div className="w-full max-w-xl space-y-4 pb-10">
        <div className="flex items-center justify-between">
          <p data-keep className="flex items-center gap-2 text-base font-black text-white"><Sparkles className="h-5 w-5 text-emerald-300" />{t('make.title', 'Make a picture')}</p>
          <button type="button" onClick={onClose} aria-label={t('share.close', 'Close')} className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-700 text-zinc-300"><X className="h-5 w-5" /></button>
        </div>

        {heading('1', t('make.stepWhat', 'What are you making?'))}
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((one) => (
            <button key={one.id} type="button" data-makekind={one.id} aria-pressed={kind === one.id} onClick={() => setKind(one.id)} className={`${CARD} ${kind === one.id ? ON : OFF}`}>
              <span aria-hidden className="block rounded-sm border border-current opacity-70" style={{ width: one.w / 48, height: one.h / 48 }} />
              {t(one.name[0], one.name[1])}
            </button>
          ))}
        </div>

        {heading('2', t('make.stepLook', 'The look'))}
        <div className="grid grid-cols-4 gap-2">
          {LOOKS.map((one) => (
            <button key={one.id} type="button" data-makelook={one.id} aria-pressed={look === one.id} onClick={() => setLook(one.id)} className={`${CARD} ${look === one.id ? ON : OFF}`}>
              <span aria-hidden className="block h-8 w-full rounded-lg" style={{ background: SWATCH[one.id] }} />
              {t(one.name[0], one.name[1])}
            </button>
          ))}
        </div>

        {heading('3', t('make.stepMood', 'The mood'))}
        <div className="flex flex-wrap gap-2">
          {MOODS.map((one) => (
            <button key={one.id} type="button" data-makemood={one.id} aria-pressed={mood === one.id} onClick={() => setMood(one.id)} className={`min-h-[44px] rounded-xl border px-3 text-[12px] font-bold ${mood === one.id ? ON : OFF}`}>
              {t(one.name[0], one.name[1])}
            </button>
          ))}
        </div>

        {heading('4', t('make.stepIdea', 'Your idea'))}
        <textarea
          value={idea}
          maxLength={400}
          rows={2}
          data-makeidea
          onChange={(event) => setIdea(event.target.value)}
          placeholder={t('make.ideaPlaceholder', 'What should be in it? Say it the way you see it.')}
          aria-label={t('make.stepIdea', 'Your idea')}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
        <div className="flex flex-wrap gap-1.5" data-makeideas>
          {IDEAS[kind].map(([key, words]) => (
            <button key={key} type="button" onClick={() => setIdea(t(key, words))} className="min-h-[36px] rounded-full border border-zinc-700 px-3 text-[11px] text-zinc-300">
              {t(key, words)}
            </button>
          ))}
        </div>

        {ready && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3" data-makereadback>
            <p data-keep className="text-[11px] font-black uppercase tracking-wider text-emerald-300">{t('make.readBack', 'What will be made')}</p>
            <p data-keep className="mt-1 text-sm text-emerald-50">{readBack(choice, t)}</p>
            <p data-keep className="mt-1 text-[11px] text-emerald-200/80">{t('make.readBackChange', 'Change any part above before you press.')}</p>
          </div>
        )}

        {asking && (
          <YesSheet t={t} onYes={() => { giveYes(); const step = asking; setAsking(null); void ask(step, true); }} onNo={() => setAsking(null)} />
        )}

        <button
          type="button"
          data-makedraft
          disabled={!ready || busy !== null}
          onClick={() => { void ask('draft'); }}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-zinc-950 disabled:opacity-40"
        >
          {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : drafts.length ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {busy === 'draft'
            ? t('make.drafting', 'Making four drafts…')
            : `${drafts.length ? t('make.draftAgain', 'Four new drafts') : t('make.draftGo', 'Make four drafts')} · ${creditsSaid(DRAFT_CREDITS, t)}`}
        </button>

        {drafts.length > 0 && (
          <div className="space-y-2" data-makedrafts>
            {heading('5', t('make.stepPick', 'Pick the one you like'))}
            <div className="grid grid-cols-2 gap-2">
              {drafts.map((url, n) => (
                <button key={url.slice(-24) + n} type="button" data-makedraftpick={n} aria-pressed={chosen === n} onClick={() => { setChosen(n); setFinal(null); }} className={`relative overflow-hidden rounded-xl border-2 ${chosen === n ? 'border-emerald-400' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a data URI the engine just drew; there is nothing on a server to optimise. */}
                  <img src={url} alt={`${t('make.draft', 'Draft')} ${n + 1}`} className="block w-full" />
                  {chosen === n && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-black"><Check className="h-4 w-4" /></span>}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-makefinal
                disabled={chosen === null || busy !== null}
                onClick={() => { void ask('final'); }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 text-sm font-black text-zinc-950 disabled:opacity-40"
              >
                {busy === 'final' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy === 'final' ? t('make.finishing', 'Finishing it…') : `${t('make.finalGo', 'Make it final')} · ${creditsSaid(FINAL_CREDITS, t)}`}
              </button>
              <button
                type="button"
                data-makeusedraft
                disabled={chosen === null || busy !== null}
                onClick={() => { if (chosen !== null) onPicture(drafts[chosen]); }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 text-sm font-bold text-zinc-200 disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4" />
                {t('make.useDraft', 'Use this draft')}
              </button>
            </div>
          </div>
        )}

        {final && (
          <div className="space-y-2" data-makefinalshown>
            {heading('6', t('make.stepFinal', 'Finished'))}
            {/* eslint-disable-next-line @next/next/no-img-element -- the finished picture, a data URI from the engine. */}
            <img src={final} alt={t('make.finalAlt', 'The finished picture')} className="block w-full rounded-xl" />
            <button type="button" data-makeuse onClick={() => onPicture(final)} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-zinc-950">
              <ImagePlus className="h-4 w-4" />
              {t('make.use', 'Put it in the editor')}
            </button>
          </div>
        )}

        {said && <p role="status" className="text-sm text-amber-300" data-makesaid>{said}</p>}
      </div>
    </div>
  );
}
