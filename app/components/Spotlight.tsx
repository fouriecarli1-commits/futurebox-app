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
import { Check } from 'lucide-react';
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
          {/* ── Seven ticks, where four paragraphs used to be ──────────────

              What was here: a lead paragraph of four sentences, then four
              boxes with a heading and three or four lines of body each.
              Roughly two phone screens of prose before the first button,
              and Carli photographed all of it scrolling past.

              "Take it out and the description. You can keep the headings
               etc, just take out this explenations and boxes. Replace the
               explenation with ticked unique features."

              A paragraph argues; a tick claims. Somebody deciding in the
              first second whether this app does the thing they came for is
              scanning for their own word — "adverts", "collab", "video" —
              and a box whose heading is "Nothing here pretends" hides that
              word inside the body where scanning will not find it. Seven
              short lines put every one of them on the surface.

              These are also the eight that no other app in this space
              has all of, which is the only reason to lead with them. Every
              one is built and reachable from the bar below: the Booth and
              the Pro Booth, the adverts desk, voice cloning, the Sound
              trainer, the live room, the Collab Radar, and the video desk.
              A landing page that promises a feature is a landing page that
              gets found out on the second click, and this is the first.

              The eighth is the one that is hardest to copy and was the
              last to be said out loud. Carli: "Maak alles in Afrikaans,
              musiek, videos, podcasts." It is true of all three and each
              was checked before it was printed — the song routes write
              Afrikaans and are warned off Dutch, the podcast channel takes
              `af` from the same language list the dubbing uses, and a
              video speaks Afrikaans because the app lays an Afrikaans
              reading over the footage rather than asking the video model
              for words it has no Afrikaans for.

              It is in the English list too, not only the Afrikaans one. A
              differentiator hidden behind the language switch is a
              differentiator the person it would have won over never
              reads. */}
          <ul className="grid gap-x-6 gap-y-2.5 pt-1 sm:grid-cols-2">
            {[
              t('hero.f1', 'The Booth, for professional musicians'),
              t('hero.f2', 'Advert planning, for marketers'),
              t('hero.f3', 'Clone your voice'),
              t('hero.f4', 'Train your own unique sound'),
              t('hero.f5', 'A live music room'),
              t('hero.f6', 'Collab Radar, to create with like-minded artists'),
              t('hero.f7', 'Video generation'),
              t('hero.f8', 'Everything in Afrikaans \u2014 music, videos, podcasts'),
            ].map((one) => (
              <li key={one} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span className="text-base leading-snug text-zinc-200">{one}</span>
              </li>
            ))}
          </ul>

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
