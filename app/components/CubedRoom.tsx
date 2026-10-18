'use client';

/**
 * The Cubed room.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Die masterclass button moet ook sy eie button hê
 * en wanneer iemand daar op click vat dit jou ook na 'n futuristic kamer toe,
 * wat spectacular en modern is. Dit moet absolutely classy wees. Ek gaan baie
 * spesiale en high profile masterclasses reël."*
 *
 * ── What "classy" rules out, which is most of what looks futuristic ──────
 *
 * Neon, glow, chrome gradients on type, a grid floor, a spinning thing. Every
 * one of those is what a 2014 idea of the future looks like, and on a page
 * meant to persuade a high-profile guest to put their name on three classes
 * they read as a student project.
 *
 * What actually reads as expensive is restraint with one material in it:
 * black that is not quite black, a single hairline rule, type that is allowed
 * to be large and is not allowed to be loud, and ONE thing with a surface —
 * the iron mark. So the room is nearly empty, the mark is the only texture,
 * and the light comes from one place, which is the same decision the mark
 * itself makes about its gradient.
 *
 * ── And it says the terms, which is the part that is not decoration ──────
 *
 * *"Ons moet dit ook so uit stipuleer vir ons gaste."* A guest who reads the
 * terms before the conversation arrives at the conversation already knowing
 * the shape. The one thing the room does NOT say is the split — Carli, 12
 * October 2026: *"Die Cubed classes kan nie die winsverdeling wys tussen my
 * en die persoon wat die klas aanbied nie."* That number lives in the written
 * agreement, and `check:cubed` refuses this file if it quotes it.
 *
 * ── Obsidian, 13 October 2026 ────────────────────────────────────────────
 *
 * Carli, with the "Cubed room" page Google drew, and the rule for the whole
 * redesign: *"ons transform en totally redesign."* The room is obsidian
 * again, lit by one pool of emerald behind the mark, glass cards with a
 * hairline, and the fee and the format as two cards under the title. The
 * palette is in `globals.css` under `[data-cubed]`. Her navy lockup cannot
 * read on obsidian and her lines are not to be recoloured, so the hero sets
 * it on a pale plate — the one plate in the room, and `check:cubed`
 * measures her ink against it.
 *
 * ── Two languages, one dictionary ────────────────────────────────────────
 *
 * Every word on this page comes through `t()`. The first version had
 * Afrikaans typed straight into the English screen ("Winsverdeling",
 * "Klasfooi", "Katalogus van Masterclasses") — *"daar is afrikaans in die
 * engelse window by cubed class"* — and `check:taalvas` now reads every
 * room for that.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, GraduationCap, Layers, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CLASSES_IN_A_SERIES, GUEST_TERMS, SERIES, minutesOf, randSaid, seriesRand,
} from '../lib/cubed';
import { useLang } from '../lib/i18n';
import CubedMark from './CubedMark';
import LanguagePicker from './LanguagePicker';

export default function CubedRoom(): React.ReactElement {
  const { lang, t } = useLang();
  const said = (pair: readonly [string, string]): string => (lang === 'af' ? pair[1] : pair[0]);

  return (
    <main data-cubed className="min-h-screen bg-zinc-950">
      {/* ── Architectural Hero & Ambient Studio Light ───────────────────── */}
      {/* ── The bar across the top: back, the badge, the language ─────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-4 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180 text-emerald-400 transition-transform group-hover:-translate-x-0.5" />
            <span>{t('cubed.back', 'Back to FutureBox Studio')}</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-400 md:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>{t('cubed.exclusive', 'Cubed³ · VIP masterclasses · By invitation')}</span>
          </div>
          <LanguagePicker compact />
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          {/* ── The mark, the title, the line ─────────────────────────────
              Centred, as Google drew it, with one pool of emerald light
              behind the mark and nothing else lit. */}
          <div className="relative flex flex-col items-center text-center">
            <div className="pointer-events-none absolute inset-0 -top-10 rounded-full bg-emerald-500/10 blur-[120px]" aria-hidden />
            {/* Carli, 13 October 2026: *"Maak die cubed class se logo
                transparent, en maak die logo en woorde very neon en
                bright."* Her file is untouched; the light is a filter on
                the way to the screen (`[data-cubedneon]` in globals.css),
                which turns the navy lines bright and sets them glowing. */}
            <div
              data-cubedneon
              className="relative mb-6 flex w-full max-w-[460px] items-center justify-center p-4 transition-transform duration-500 hover:scale-[1.02]"
            >
              <CubedMark width={420} lang={lang} title={t('cubed.markAlt', 'Two cubes, threaded through each other')} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <h1
                data-cubedtitle
                className="flex items-start text-4xl font-extrabold tracking-tight text-white md:text-6xl"
                style={{ textShadow: '0 0 18px rgba(52,211,153,0.55), 0 0 40px rgba(16,185,129,0.35)' }}
              >
                <span>{t('cubed.title', 'Cubed')}</span>
                <sup
                  className="ml-0.5 select-none text-2xl font-extrabold text-emerald-400 md:text-4xl"
                  title={t('cubed.power3Title', 'To the power of 3: always 3 classes to a masterclass')}
                >
                  3
                </sup>
              </h1>
              <span className="inline-flex items-center gap-1.5 self-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span>{t('cubed.power3', 'To the power of 3 · Always 3 classes')}</span>
              </span>
            </div>

            {/* The opening line, hers: "iets soos dive into the future and
                attend a class curated by a professional". The lead is the
                invitation; the line under it is what the three classes are. */}
            <p data-cubedlead className="max-w-2xl pt-4 text-xl font-bold leading-snug text-zinc-100 md:text-2xl">
              {t('cubed.lead', 'Dive into the future and attend a class curated by a professional.')}
            </p>
            <p className="max-w-3xl pt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
              {t(
                'cubed.what',
                'Three classes to a masterclass: what it is, how it is done, and what is next — taught by somebody who has actually done it and knows where it is going.',
              )}
            </p>
          </div>

          {/* Executive Metrics Cards */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Metric 1: Format Rule */}
            <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <div>
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('cubed.format', 'Format (Cubed³)')}
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span data-cubedthree className="text-4xl font-black tracking-tight text-zinc-100">
                  {CLASSES_IN_A_SERIES}
                </span>
                <span className="text-lg font-semibold text-zinc-300">
                  {t('cubed.perSeries', 'classes to a masterclass')}
                </span>
              </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xl font-extrabold text-emerald-400">³</div>
            </div>

            {/* Metric 3: What the masterclass costs — all three classes */}
            <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <div>
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{t('cubed.fee', 'Masterclass fee')}</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span data-cubedprice className="text-4xl font-black tracking-tight text-zinc-100">
                  {randSaid(seriesRand())}
                </span>
                <span className="text-lg font-semibold text-zinc-300">
                  {t('cubed.aClass', 'for all three classes')}
                </span>
              </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"><GraduationCap className="h-5 w-5" /></div>
            </div>
          </div>

          {/* Pricing statement breakdown */}
          <div className="mt-5 rounded-xl border border-white/10 bg-zinc-900/60 px-5 py-3.5">
            <p className="text-sm leading-relaxed text-zinc-400" data-cubedpricewhat>
              {t(
                'cubed.priceWhat',
                'Three classes make one masterclass, and {s} buys all three. There is no price per class.',
              ).replace('{s}', randSaid(seriesRand()))}
            </p>
          </div>
        </div>
      </div>

      {/* ── Exploration Bar / Link to Listing ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <div>
            <h2 className="text-sm font-bold text-zinc-200">{t('cubed.listTitle', 'The masterclasses on offer')}</h2>
            <p className="text-xs text-zinc-500">{t('cubed.listHint', 'Every class and guest that has been arranged, in the studio.')}</p>
          </div>
          <Link
            href="/?tab=masterclasses"
            data-cubedlisting
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-onAccent shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            <span>{t('cubed.seeList', 'See the classes on offer')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ── Masterclass Series Showcase ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              {t('cubed.theSeries', 'The series')}
            </h2>
            <p className="pt-1 text-sm text-zinc-500">
              {t('cubed.eachThree', 'Each masterclass is exactly 3 classes (Cubed³), so it gets finished rather than watched once.')}
            </p>
          </div>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
            {t(SERIES.length === 1 ? 'cubed.oneSeries' : 'cubed.manySeries', '{n} series on offer').replace('{n}', String(SERIES.length))}
          </span>
        </div>

        <ul className="space-y-10 pt-8" data-cubedlist>
          {SERIES.map((series) => (
            <li
              key={series.id}
              id={series.id}
              data-cubedseries={series.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl transition-all sm:p-8 hover:border-emerald-500/40 hover:shadow-[0_0_35px_rgba(15,157,110,0.25)]"
            >
              {/* Series Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800/70 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md bg-zinc-800/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    <GraduationCap className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{t('cubed.seriesId', 'Series')}: {series.id}</span>
                  </div>
                  <h3 className="pt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {said(series.title)}
                  </h3>
                  <p className="pt-1.5 text-sm font-medium text-zinc-400">
                    <span className="font-bold text-zinc-200">{series.guest}</span> — {said(series.guestIs)}
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  {series.stage === 'open' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {t('cubed.open', 'Open')}
                    </span>
                  ) : series.stage === 'recording' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      {t('cubed.recording', 'Being recorded')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600/40 bg-zinc-800 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-zinc-400">
                      {t('cubed.planned', 'Being arranged')}
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Modules Grid */}
              <ol className="grid gap-4 pt-6 sm:grid-cols-3">
                {series.parts.map((part) => (
                  <li
                    key={part.part}
                    data-cubedpart={part.part}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 p-6 transition-all hover:border-emerald-500/40"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-black tracking-tighter text-emerald-500/60 transition-colors group-hover:text-emerald-400">
                          0{part.part}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          {part.minutes} {t('cubed.min', 'min')}
                        </span>
                      </div>

                      <h4 className="pt-4 text-lg font-black leading-snug text-zinc-100">
                        {said(part.title)}
                      </h4>

                      <p className="pt-2 text-sm leading-relaxed text-zinc-400">
                        {said(part.outcome)}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-zinc-800/60 pt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      {t('cubed.classOf', 'Class {n} of {m} · Cubed³').replace('{n}', String(part.part)).replace('{m}', String(CLASSES_IN_A_SERIES))}
                    </div>
                  </li>
                ))}
              </ol>

              {/* Total duration indicator */}
              <div className="mt-6 flex items-center justify-between rounded-xl bg-zinc-950/40 px-5 py-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{t('cubed.wholeSeries', 'The whole masterclass')}</span>
                </span>
                <span className="font-bold text-zinc-200">
                  {minutesOf(series)} {t('cubed.minTotal', 'minutes in all')}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Future Schedule Note */}
        <div
          data-cubedmore
          className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 text-sm leading-relaxed text-zinc-400 backdrop-blur-xs"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
            <p>
              {t(
                'cubed.more',
                'More are being arranged. They are not listed here until the guest has agreed and a date exists — a name on a page before that is a promise somebody else has not made.',
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Executive Guest Charter & Covenant ─────────────────────────── */}
      <section className="border-t border-white/10 bg-zinc-900/50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t('cubed.agreement', 'The agreement for guests')}</span>
            </div>

            <h2 className="pt-4 text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              {t('cubed.forGuests', 'If you are asked to teach one')}
            </h2>

            <p className="pt-4 text-xl font-bold leading-relaxed text-zinc-200 sm:text-2xl">
              {t(
                'cubed.guestLead',
                'Here are the terms, in public, before the conversation. Nothing below is negotiated afterwards.',
              )}
            </p>
          </div>

          {/* Terms Grid */}
          <ol className="grid gap-4 pt-10 sm:grid-cols-2" data-cubedterms>
            {GUEST_TERMS.map((term, at) => (
              <li
                key={term[0]}
                className="flex gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-xs transition-all hover:border-zinc-700"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-black tabular-nums text-zinc-400">
                  {String(at + 1).padStart(2, '0')}
                </span>
                <span className="text-sm leading-relaxed text-zinc-300 font-medium">
                  {said(term)}
                </span>
              </li>
            ))}
          </ol>

          {/* Contact Action */}
          <div className="pt-10">
            <a
              href="/help"
              data-cubedask
              className="group inline-flex min-h-[48px] items-center gap-3 rounded-2xl bg-emerald-500 px-8 py-3.5 text-sm font-black text-onAccent shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-[1.02]"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{t('cubed.talk', 'Talk to us about teaching one')}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
