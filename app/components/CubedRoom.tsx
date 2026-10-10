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
 * *"Ons moet dit ook so uit stipuleer vir ons gaste. Ons gaan 'n 60/40
 * winsverdeling doen."* A guest who reads the split before the conversation
 * arrives at the conversation already knowing the shape. Every number on this
 * page comes out of `lib/cubed.ts`, so the page and the agreement cannot
 * drift apart, and `check:cubed` holds them together.
 */

import React from 'react';
import Link from 'next/link';
import {
  CLASSES_IN_A_SERIES, GUEST_TERMS, GUEST_SHARE, HOUSE_SHARE, SERIES,
  minutesOf, splitAsSaid,
} from '../lib/cubed';
import { useLang } from '../lib/i18n';
import CubedMark from './CubedMark';

/**
 * The room's own black, for the one thing that cannot be a class: the mark's
 * erasing pass, which has to be painted in the literal colour behind it.
 *
 * It is the same number `--fb-page` holds under `[data-cubed]` in
 * `globals.css`, and `check:cubed` holds the two together — a mark drawn
 * with the wrong background has black gashes through it, and nothing on a
 * screen says which of the two numbers moved.
 */
const INK = '#07080a';

export default function CubedRoom(): React.ReactElement {
  const { lang, t } = useLang();
  const said = (pair: readonly [string, string]): string => (lang === 'af' ? pair[1] : pair[0]);

  return (
    /* `data-cubed` and not an inline background. `white` in this app is
       `--fb-ink`, which follows the theme — so the first version of this
       room, which painted its own black and wrote `text-white` on top, drew
       every heading near-black on near-black under the default light theme.
       It compiled, it read correctly in the source, and it was invisible.
       The room declares its darkness to the theme now, the way the Pro Booth
       does. See `[data-cubed]` in `globals.css`.

       `bg-zinc-950` and not `bg-page`: there is no `bg-page` utility. The
       second version of this line used one, which compiled, produced
       `rgba(0,0,0,0)` and let the body's light background through — so the
       light heading this block exists to produce was invisible for a
       different reason. `zinc` maps onto `--fb-surface-*`, which is what the
       Pro Booth paints its own black with. */
    <main data-cubed className="min-h-screen bg-zinc-950">
      {/* ── The one source of light ──────────────────────────────────────

          A single soft wash from the top left, which is where the mark's own
          gradient is lit from. Two light sources on one page is the thing
          that makes a dark page look assembled rather than designed. */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 90% at 12% 0%, rgba(173,186,200,0.13) 0%, rgba(173,186,200,0.04) 38%, transparent 68%)',
        }}
      >
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← FutureBox
          </Link>

          <div className="pt-10 sm:pt-14">
            <CubedMark size={132} back={INK} title={t('cubed.markAlt', 'Two cubes, threaded through each other')} />
          </div>

          <h1
            data-cubedtitle
            className="pt-8 text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl"
          >
            {t('cubed.title', 'Cubed')}
          </h1>

          {/* The name explained in one line, because a name that means a rule
              is worth nothing if nobody is told the rule. */}
          <p className="max-w-xl pt-5 text-lg leading-relaxed text-zinc-400 sm:text-xl">
            {t(
              'cubed.what',
              'Three classes to a masterclass. What it is, how it is done, and what goes wrong — taught by somebody who has actually done it.',
            )}
          </p>

          <div
            className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-zinc-800 pt-6 text-sm"
          >
            <span className="text-zinc-500">
              <span data-cubedthree className="pr-2 text-2xl font-black text-zinc-200">
                {CLASSES_IN_A_SERIES}
              </span>
              {t('cubed.perSeries', 'classes to a masterclass')}
            </span>
            <span className="text-zinc-500">
              <span data-cubedsplit className="pr-2 text-2xl font-black text-zinc-200">
                {splitAsSaid()}
              </span>
              {t('cubed.split', 'to the guest')}
            </span>
          </div>
        </div>
      </div>

      {/* ── What is on ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
          {t('cubed.theSeries', 'The series')}
        </h2>

        <ul className="pt-6" data-cubedlist>
          {SERIES.map((series) => (
            <li
              key={series.id}
              id={series.id}
              data-cubedseries={series.id}
              className="border-t border-zinc-800 py-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  {said(series.title)}
                </h3>
                <span className="text-xs uppercase tracking-widest text-zinc-600">
                  {series.stage === 'open'
                    ? t('cubed.open', 'Open')
                    : series.stage === 'recording'
                      ? t('cubed.recording', 'Being recorded')
                      : t('cubed.planned', 'Being arranged')}
                </span>
              </div>
              <p className="pt-1 text-sm text-zinc-500">
                {series.guest} — {said(series.guestIs)}
              </p>

              <ol className="grid gap-px pt-6 sm:grid-cols-3">
                {series.parts.map((part) => (
                  <li
                    key={part.part}
                    data-cubedpart={part.part}
                    className="bg-zinc-900/60 p-5"
                  >
                    <span className="block text-4xl font-black leading-none text-zinc-700">
                      {part.part}
                    </span>
                    <span className="block pt-3 text-base font-bold text-zinc-100">
                      {said(part.title)}
                    </span>
                    <span className="block pt-2 text-sm leading-relaxed text-zinc-500">
                      {said(part.outcome)}
                    </span>
                    <span className="block pt-3 text-xs text-zinc-600">
                      {part.minutes} {t('cubed.min', 'min')}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="pt-4 text-xs text-zinc-600">
                {minutesOf(series)} {t('cubed.minTotal', 'minutes in all')}
              </p>
            </li>
          ))}
        </ul>

        {/* Said rather than implied. A room listing one series while she
            arranges the rest should say so: a page that looks finished and
            is nearly empty reads as abandoned, and a page that says what is
            coming reads as early. */}
        <p
          data-cubedmore
          className="border-t border-zinc-800 pt-8 text-sm leading-relaxed text-zinc-500"
        >
          {t(
            'cubed.more',
            'More are being arranged. They are not listed here until the guest has agreed and a date exists — a name on a page before that is a promise somebody else has not made.',
          )}
        </p>
      </section>

      {/* ── For a guest ─────────────────────────────────────────────────── */}
      <section
        className="border-t border-zinc-800 bg-zinc-900/40"
      >
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
            {t('cubed.forGuests', 'If you are asked to teach one')}
          </h2>
          <p className="max-w-2xl pt-6 text-lg leading-relaxed text-zinc-300">
            {t(
              'cubed.guestLead',
              'Here are the terms, in public, before the conversation. Nothing below is negotiated afterwards.',
            )}
          </p>
          <ol className="max-w-2xl space-y-5 pt-8" data-cubedterms>
            {GUEST_TERMS.map((term, at) => (
              <li key={term[0]} className="flex gap-4">
                <span className="w-6 flex-shrink-0 text-sm font-black tabular-nums text-zinc-700">
                  {String(at + 1).padStart(2, '0')}
                </span>
                <span className="text-base leading-relaxed text-zinc-400">{said(term)}</span>
              </li>
            ))}
          </ol>
          <p className="max-w-2xl pt-8 text-sm leading-relaxed text-zinc-600">
            {t('cubed.splitSaid', 'The split is')} {Math.round(GUEST_SHARE * 100)}/
            {Math.round(HOUSE_SHARE * 100)}
            {t('cubed.splitSaidEnd', ' — yours first, because the audience and the name are yours.')}
          </p>
          <a
            href="/help"
            data-cubedask
            className="mt-10 inline-flex min-h-[44px] items-center gap-2 border border-zinc-700 px-6 py-3 text-sm font-bold text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            {t('cubed.talk', 'Talk to us about teaching one')}
          </a>
        </div>
      </section>
    </main>
  );
}
