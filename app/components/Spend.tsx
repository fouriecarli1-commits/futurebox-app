'use client';

/**
 * What the engine actually costs you — from this account, not from a rate card.
 *
 * The question "is ElevenLabs too expensive" had no answer in the app. Every
 * generation since metering went in has been recorded, and none of it was ever
 * shown, so the only way to answer was to compare published rates found on the
 * web. Those are a starting point and they are not your bill.
 *
 * So: measured usage on one side, your actual monthly payment on the other,
 * and the division between them. Everything derived is labelled as derived,
 * and the comparison rates say out loud that they were read off the web rather
 * than quoted by anybody.
 *
 * Owner only. It is a spending report.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Coins, TrendingDown } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { ENGINE_RATES, SONG_MINUTES_FOR_COMPARISON } from '../data/engines';
import { useLang } from '../lib/i18n';

interface Spending {
  isOwner?: boolean;
  days?: number;
  totals?: {
    previews: number;
    songs: number;
    previewSeconds: number;
    songSeconds: number;
    credits: number;
  };
  byDay?: Array<{ day: string; count: number }>;
}

/** Remembered so the figure does not have to be retyped every visit. */
const BILL_KEY = 'fb.engineBill';
const RATE_KEY = 'fb.usdRate';

function rand(value: number): string {
  const whole = Math.round(value * 100) / 100;
  return whole >= 100 ? `R${Math.round(whole).toLocaleString('en-ZA').replace(/,/g, ' ')}` : `R${whole.toFixed(2)}`;
}

export default function Spend(): React.ReactElement | null {
  const { t } = useLang();
  const [data, setData] = useState<Spending | null>(null);
  const [bill, setBill] = useState('');
  const [rate, setRate] = useState('18');

  useEffect(() => {
    try {
      setBill(localStorage.getItem(BILL_KEY) ?? '');
      setRate(localStorage.getItem(RATE_KEY) ?? '18');
    } catch {
      // A remembered figure is a convenience, not the feature.
    }
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        // Asked without pre-judging the answer. The server decides who the
        // owner is, and a client that refuses to ask because it assumed the
        // answer is the third time that shape of bug has appeared here.
        const token = await accessToken();
        const response = await fetch('/api/spend', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const reply = (await response.json()) as Spending;
        if (live && reply.isOwner) setData(reply);
      } catch {
        // Not the owner, or not configured. The panel simply does not appear.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const monthly = Number(bill) || 0;
  const usdRate = Number(rate) || 18;

  const worked = useMemo(() => {
    if (!data?.totals) return null;
    const { previews, songs, previewSeconds, songSeconds } = data.totals;
    const minutes = (previewSeconds + songSeconds) / 60;
    // Weighted by length, so a fifteen-second preview is not charged as a song.
    // Without a bill there is nothing to divide and the panel says so instead
    // of showing a zero that looks like an answer.
    const perMinute = monthly > 0 && minutes > 0 ? monthly / minutes : 0;
    return {
      previews,
      songs,
      minutes,
      perMinute,
      perSong: perMinute * (songSeconds / 60 / Math.max(1, songs)),
      perPreview: perMinute * (previewSeconds / 60 / Math.max(1, previews)),
    };
  }, [data, monthly]);

  if (!data?.isOwner || !data.totals) return null;

  const busiest = (data.byDay ?? []).reduce((most, one) => Math.max(most, one.count), 0);

  return (
    <section className="rounded-3xl border border-amber-500/30 bg-zinc-950/70 p-5 md:p-6 space-y-4">
      <div>
        <p className="text-base font-bold text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          {t('spend.title', 'What the engine has cost you')}
        </p>
        <p className="text-sm text-zinc-500 leading-snug">
          {t('spend.sub', 'The last 30 days, counted from what was actually generated. Only you see this.')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('spend.previews', 'Free previews'), value: String(worked?.previews ?? 0) },
          { label: t('spend.songs', 'Full songs'), value: String(worked?.songs ?? 0) },
          { label: t('spend.minutes', 'Minutes of audio'), value: (worked?.minutes ?? 0).toFixed(1) },
          { label: t('spend.busiest', 'Busiest day'), value: String(busiest) },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
            <span className="block text-2xl font-extrabold text-white leading-none">{tile.value}</span>
            <span className="block text-sm text-zinc-500 leading-snug pt-1">{tile.label}</span>
          </div>
        ))}
      </div>

      {/* The one thing the app cannot know. */}
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-sm text-zinc-400">{t('spend.bill', 'What you pay the engine a month, in rand')}</span>
          <input
            value={bill}
            onChange={(event) => {
              setBill(event.target.value);
              try {
                localStorage.setItem(BILL_KEY, event.target.value);
              } catch {
                /* not important enough to fail over */
              }
            }}
            inputMode="decimal"
            placeholder="396"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-zinc-400">{t('spend.rate', 'Rand per dollar, for the comparison')}</span>
          <input
            value={rate}
            onChange={(event) => {
              setRate(event.target.value);
              try {
                localStorage.setItem(RATE_KEY, event.target.value);
              } catch {
                /* as above */
              }
            }}
            inputMode="decimal"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
          />
        </label>
      </div>

      {monthly <= 0 ? (
        <p className="text-sm text-zinc-500 leading-snug">
          {t('spend.needBill', 'Put in what you actually pay and this works out your real cost a song — which is the number the comparison below should be judged against.')}
        </p>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
          <p className="text-sm text-zinc-400">
            {t('spend.yours', 'Your real cost')}:{' '}
            <span className="text-white font-bold">{rand(worked?.perSong ?? 0)}</span>{' '}
            {t('spend.perSong', 'a full song')} ·{' '}
            <span className="text-white font-bold">{rand(worked?.perPreview ?? 0)}</span>{' '}
            {t('spend.perPreview', 'a preview')}
          </p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('spend.derived', 'Worked out from your bill divided by the minutes actually generated. It falls as you make more, which is why a quiet month looks expensive.')}
          </p>
        </div>
      )}

      {/* What else charges, said as what it is. */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          {t('spend.others', 'What the others charge, per full song')}
        </p>
        {ENGINE_RATES.map((engine) => {
          const perSong = engine.usdPerSong * usdRate;
          const preview = engine.perMinute ? perSong / (SONG_MINUTES_FOR_COMPARISON * 4) : perSong;
          const risky = engine.licence === 'not stated' || engine.licence === 'unclear — check';
          return (
            <div
              key={engine.name}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 flex items-start justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-200">
                  {engine.name}
                  {risky && (
                    <AlertTriangle className="w-3 h-3 text-amber-400 inline-block ml-1.5 -translate-y-px" />
                  )}
                </span>
                <span className="block text-sm text-zinc-500 leading-snug">{engine.note}</span>
                <span className={`block text-sm leading-snug ${risky ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {t('spend.licence', 'Licence')}: {engine.licence}
                </span>
              </span>
              <span className="text-right flex-shrink-0">
                <span className="block text-sm font-bold text-white tabular-nums">{rand(perSong)}</span>
                <span className="block text-sm text-zinc-600 tabular-nums">
                  {rand(preview)} {t('spend.prev', 'preview')}
                </span>
              </span>
            </div>
          );
        })}
        <p className="text-sm text-zinc-600 leading-snug pt-1">
          {t('spend.published', 'Published rates read off the web in August 2026 — not quotes, and not verified against these providers’ own APIs. Check the licence before moving anything you sell.')}
        </p>
      </div>
    </section>
  );
}
