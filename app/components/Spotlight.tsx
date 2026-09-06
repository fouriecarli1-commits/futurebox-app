'use client';

/**
 * The first thing anybody sees.
 *
 * Somebody arriving here has about a second to work out what they can do, and
 * a feed of picks does not tell them. So: what they will walk away with, then
 * the four things this app does that the other ones do not, then a door into
 * each of them.
 *
 * Every claim below is a thing that is actually built. A landing page that
 * promises a feature is a landing page that gets found out on the second
 * click, and this is the first click.
 *
 * It lives in its own file rather than inline in the page for the ordinary
 * reason: it is the piece most often rewritten, and the page it was buried in
 * is two thousand lines long.
 */

import React from 'react';
import { useLang } from '../lib/i18n';
import HereNow from './HereNow';
import Charts from './Charts';

export default function Spotlight({
  onGo,
  onAppearance,
  onOpenRadar,
  onOpenLive,
}: {
  /** Open the studio on one of its screens. */
  onGo: (tab: 'make' | 'voice_studio' | 'podcast') => void;
  onAppearance: () => void;
  /** The radar bar is a door to the radar tab, which is a page of its own. */
  onOpenRadar: () => void;
  /** Where a charting song actually is. See the note in `Charts`. */
  onOpenLive: () => void;
}): React.ReactElement {
  const { t } = useLang();

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 to-zinc-950/80 p-8 md:p-12 shadow-2xl">
        <div className="max-w-4xl space-y-6">
          <HereNow />
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]">
            {t('hero.yourVoice', 'Your voice.')}{' '}
            <span className="text-emerald-400">{t('hero.yourSongs', 'Your songs.')}</span>{' '}
            {t('hero.yourShow', 'Your show.')}
          </h2>
          <p className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-2xl">
            {t(
              'hero.lead',
              'Write a song with AI and then sing on it yourself. Clone your voice and let it read a whole podcast. Put a video to it. One app, from the first line to the finished release.',
            )}
          </p>

          {/* The four things that are actually different, not a feature list. */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {[
              {
                head: t('hero.p1', 'You are on the record'),
                body: t(
                  'hero.p1b',
                  'Other apps hand you a song a model sang. Here you get the backing track and a booth that shows you the notes and the words as they come, holds your timing, and tunes the take.',
                ),
              },
              {
                head: t('hero.p2', 'A sound of your own'),
                body: t(
                  'hero.p2b',
                  'Train on the songs you have already made and the next ones come out sounding like them — like you, not like everybody else’s prompt.',
                ),
              },
              {
                head: t('hero.p3', 'Podcasts in your own voice'),
                body: t(
                  'hero.p3b',
                  'Clone your voice once, then have it read a script, say a recording again in somebody else’s voice, and publish a feed Apple and Spotify will take.',
                ),
              },
              {
                head: t('hero.p4', 'Nothing here pretends'),
                body: t(
                  'hero.p4b',
                  'Everything made here says what made it, printed on the release. And you choose how the whole app looks.',
                ),
              },
            ].map((point) => (
              <div
                key={point.head}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3.5"
              >
                <p className="text-sm font-extrabold text-white">{point.head}</p>
                <p className="text-sm text-zinc-400 leading-snug pt-1">{point.body}</p>
              </div>
            ))}
          </div>

          <p className="text-base text-zinc-400 leading-relaxed">
            {t('hero.style', 'This is the app that lets you choose your own style.')}{' '}
            <button
              type="button"
              onClick={onAppearance}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 font-semibold"
            >
              {t('hero.appearance', 'Click on appearance')}
            </button>
            .
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onGo('make')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent text-sm font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {t('hero.start', 'Make a song')}
            </button>
            <button
              type="button"
              onClick={() => onGo('voice_studio')}
              className="px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-bold hover:border-emerald-500 hover:text-emerald-300"
            >
              {t('hero.sing', 'Record your voice')}
            </button>
            <button
              type="button"
              onClick={() => onGo('podcast')}
              className="px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-bold hover:border-emerald-500 hover:text-emerald-300"
            >
              {t('hero.podcast', 'Start a podcast')}
            </button>
          </div>
        </div>
      </section>

      {/* ── What is actually happening here, as bars you press ──────────

          "net 'n bar waarop mens kliek en dan oop maak en opsies gee wat op
           gekliek kan word."

          Under the hero rather than above it: the hero says what this app is
          for, which is what somebody arriving needs first. These say what is
          on it, which is what brings them back. Shut to start with, so four
          bars are four lines rather than four screens. */}
      <Charts onOpenRadar={onOpenRadar} onOpenLive={onOpenLive} />
    </div>
  );
}
