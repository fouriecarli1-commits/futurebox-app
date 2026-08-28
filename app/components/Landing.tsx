'use client';

/**
 * The welcome page.
 *
 * Written on one bet: for a channel whose entire claim is "here you get
 * quality", the persuasive thing is not adjectives — it is showing the
 * machinery. So this page runs the real scorer over the real sample feed in
 * front of the visitor, shows the actual rejects, and labels the generated
 * masterclasses as generated. A landing page that oversells a product built
 * around honesty is the one thing that would undermine it.
 *
 * The free tier is described from the same table the app enforces, so nobody
 * signs up for something the code will not give them.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, ShieldCheck, Layers, Sliders, Check, Play, Sparkles, Cpu,
} from 'lucide-react';
import { FEED_ITEMS } from '../data/feed';
import { assess, BAR } from '../lib/curation';
import { MASTERCLASSES, PROVENANCE_LABELS, type Provenance } from '../data/masterclasses';
import { TRACK_FLAVOURS } from '../data/studio';
import { byArea, describe } from '../lib/entitlements';
import { BASE_PRICES, guessRegion, priceFor, REGIONS, type Region } from '../lib/pricing';
import { useLang } from '../lib/i18n';
import LanguagePicker from './LanguagePicker';

const PROVENANCE_STYLE: Record<Provenance, string> = {
  curated: 'text-cyan-300',
  original: 'text-emerald-300',
  ai_video: 'text-amber-300',
};

export default function Landing({ onStart }: { onStart: () => void }) {
  const toPricing = () => document.getElementById('pro')?.scrollIntoView({ behavior: 'smooth' });
  const { t } = useLang();
  const [now, setNow] = useState<number | null>(null);
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  useEffect(() => {
    setNow(Date.now());
    setRegion(guessRegion().region);
  }, []);

  const scored = useMemo(() => {
    if (now === null) return { passed: [], rejected: [] };
    const all = FEED_ITEMS.map((item) => ({ item, verdict: assess(item, now) }));
    return {
      passed: all.filter((s) => s.verdict.band !== 'noise').sort((a, b) => b.verdict.score - a.verdict.score),
      rejected: all.filter((s) => s.verdict.band === 'noise'),
    };
  }, [now]);

  const price = priceFor(BASE_PRICES.proMonthly, region);
  const teaserClasses = MASTERCLASSES.slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between gap-4 pb-8 flex-wrap">
          <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-onAccent" />
          </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              FUTURE<span className="text-emerald-400">BOX</span>
            </span>
          </div>
          <LanguagePicker />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          {t('landing.hero1')}
          <br />
          <span className="text-zinc-500">{t('landing.hero2')}</span>
        </h1>

        <p className="text-lg text-zinc-400 leading-relaxed pt-6 max-w-2xl">
          {t('landing.sub')}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-8">
          <button
            type="button"
            onClick={onStart}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {t('landing.startFree')}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={toPricing} className="px-4 py-3 text-zinc-400 hover:text-white font-semibold">
            {t('landing.whatPro')} — {price.display}/month
          </button>
        </div>

        <p className="text-sm text-zinc-600 pt-4">
          {t('landing.noCard')}
        </p>
      </header>

      {/* What it actually does */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 border-t border-zinc-800/70">
        {[
          {
            icon: ShieldCheck,
            title: t('landing.col1.title'),
            body: t('landing.col1.body'),
          },
          {
            icon: Layers,
            title: t('landing.col2.title'),
            body: t('landing.col2.body'),
          },
          {
            icon: Sliders,
            title: t('landing.col3.title'),
            body: t('landing.col3.body'),
          },
        ].map((col) => {
          const Icon = col.icon;
          return (
            <div key={col.title} className="space-y-2">
              <Icon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">{col.title}</h2>
              <p className="text-base text-zinc-400 leading-relaxed">{col.body}</p>
            </div>
          );
        })}
      </section>

      {/* The gate, running */}
      <section className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-800/70">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('landing.today')}</h2>
        <p className="text-base text-zinc-400 pt-2">
          {now === null ? (
            'Scoring…'
          ) : (
            <>
              <strong className="text-zinc-200">{scored.passed.length} passed</strong>, {scored.rejected.length} did not.
              This is the real scorer on the real sample feed — nothing about this section is a mockup.
            </>
          )}
        </p>

        <div className="divide-y divide-zinc-800/70 border-y border-zinc-800/70 mt-6">
          {scored.passed.slice(0, 3).map(({ item, verdict }) => (
            <div key={item.id} className="py-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-white leading-snug">{item.title}</p>
                <p className="text-sm text-zinc-500 pt-1">{item.source} · {item.minutes} min</p>
              </div>
              <span className="text-sm font-bold text-emerald-400 tabular-nums flex-shrink-0">{verdict.score}</span>
            </div>
          ))}
        </div>

        {scored.rejected.length > 0 && (
          <div className="pt-6">
            <p className="text-sm text-zinc-500 pb-2">{t('landing.leftOut')}</p>
            {scored.rejected.slice(0, 2).map(({ item, verdict }) => {
              const worst = [...verdict.signals].sort((a, b) => a.delta - b.delta)[0];
              return (
                <p key={item.id} className="text-base text-zinc-600 py-1">
                  <span className="line-through">{item.title}</span>{' '}
                  <span className="text-rose-400/80">— {worst.label.toLowerCase()}</span>
                </p>
              );
            })}
          </div>
        )}
      </section>

      {/* Masterclasses */}
      <section className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-800/70">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('landing.classes')}</h2>
        <p className="text-base text-zinc-400 pt-2 max-w-2xl">
          Curated lectures from people who did the work, FutureBox originals, and generated explainers — each labelled
          before you click. A generated class may explain a method; it never asserts a finding.
        </p>
        <div className="divide-y divide-zinc-800/70 border-y border-zinc-800/70 mt-6">
          {teaserClasses.map((m) => (
            <div key={m.id} className="py-3.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-bold text-white">{m.title}</span>
                <span className={`text-sm ${PROVENANCE_STYLE[m.provenance]}`}>
                  {PROVENANCE_LABELS[m.provenance].split(' —')[0]}
                </span>
              </div>
              <p className="text-sm text-zinc-500 pt-0.5">{m.instructor} · {m.minutes} min</p>
            </div>
          ))}
        </div>
      </section>

      {/* Releases */}
      <section className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-800/70">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('landing.onChannel')}</h2>
        <div className="grid sm:grid-cols-3 gap-4 pt-6">
          {TRACK_FLAVOURS.filter((t) => t.onChannel).map((t) => (
            <div key={t.id} className="space-y-1.5">
              <div className="aspect-video rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Play className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-base font-bold text-white leading-snug">{t.title}</p>
              <p className="text-sm text-zinc-500">{t.genre} · {t.bpm} BPM · {t.key}</p>
              <p className="text-sm text-cyan-400">{t.models.join(' + ')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs Pro */}
      <section id="pro" className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-800/70 scroll-mt-8">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('landing.freeTitle')}</h2>
        <p className="text-base text-zinc-400 pt-2 max-w-2xl">
          Not a trial and not a demo. You can write a song, score the feed, find a collaborator, use the timeline, take
          every theme, and enter competitions on exactly the same terms as Pro. What Pro buys is volume and
          distribution — the daily caps come off, and posting to your own channels turns on.
        </p>

        <div className="pt-6 space-y-4">
          {byArea().map((group) => (
            <div key={group.area}>
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-600 pb-1.5">{group.area}</p>
              {group.rows.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_auto_auto] gap-3 items-baseline py-1 text-base">
                  <span className="text-zinc-300">{row.label}</span>
                  <span className={`text-right w-24 text-sm ${row.caps.free === 0 ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {describe(row.caps.free, row.unit)}
                  </span>
                  <span className="text-right w-24 text-sm font-semibold text-amber-300">
                    {describe(row.caps.studio, row.unit)}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm pt-2 border-t border-zinc-800">
            <span className="text-zinc-600">Columns</span>
            <span className="text-right w-24 text-zinc-500">Free</span>
            <span className="text-right w-24 text-amber-300 font-semibold">Pro</span>
          </div>
        </div>
      </section>

      {/* The objection, answered */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-zinc-800/70">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          &ldquo;Isn&apos;t this just more AI slop?&rdquo;
        </h2>
        <div className="space-y-3 pt-4 text-base text-zinc-400 leading-relaxed">
          <p>
            Fair question, and the honest answer is that most of it is. That is exactly what the scoring is for: the
            same generative tools that make a good track make a hundred thin ones, and a feed with no bar fills up with
            the hundred.
          </p>
          <p>
            So the bar is arithmetic you can inspect, every item shows the signals that produced its score, and the
            rejects are counted in the open. A gate whose rejections you never see is the same as no gate.
          </p>
          <p>
            The same rule runs through the rest of it: every release prints the models that made it, generated
            classes are labelled generated, and nothing gets posted to your accounts without you.
          </p>
        </div>
      </section>

      {/* Close */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-zinc-800/70 text-center">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">{t('landing.close')}</h2>
        <p className="text-base text-zinc-400 pt-3">
          Three AI writing rolls, two releases and the whole soundboard, free, from now.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
          <button
            type="button"
            onClick={onStart}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center gap-2 hover:opacity-90"
          >
            <Sparkles className="w-4 h-4" />
            {t('landing.startFree')}
          </button>
          <button type="button" onClick={toPricing} className="px-4 py-3.5 text-zinc-400 hover:text-white font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            See Pro
          </button>
        </div>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-zinc-800/70">
        <p className="text-sm text-zinc-600">
          © 2026 FutureBox. Prices shown for {region.name} and adjusted for local purchasing power; what you are
          charged is set at checkout by the country of your payment method.
        </p>
      </footer>
    </div>
  );
}
