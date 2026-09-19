'use client';

/**
 * What a chorus is for, next to the box you write one in.
 *
 * ── The idea, and whose it is ────────────────────────────────────────────
 *
 * Carli, 19 September 2026, passing on a friend's suggestion and adding the
 * part that makes it worth building:
 *
 *   "Die AI prompt moet mens deur 'n liedjie se skryf begelei en word dan
 *    ook 'n prompter wat iemand leer hoe musiek werk. Om te verduidelik
 *    waarvoor is 'n bridge, dit help ons om oor te skakel na die chorus
 *    toe."
 *
 * And: *"dan leer dit ook mense sommer van liedjie skryf en van musiek."*
 *
 * An app that writes somebody a song leaves them where it found them. An app
 * that tells them why a chorus repeats and a bridge does not leaves them
 * able to write the next one without it. That is the difference between a
 * tool and a studio, and it is most of why this is worth the screen space.
 *
 * ── Why it is here and not in a help page ────────────────────────────────
 *
 * Because it is only useful at the moment somebody is stuck on a bridge, and
 * nobody stuck on a bridge goes looking for a help page. It sits under the
 * lyric sheet, folded, and opens on the part they ask about.
 *
 * ── Where the words come from ────────────────────────────────────────────
 *
 * `data/songcraft.ts`, written down, the same every time. Not the model —
 * the argument is in that file's own note and it is the whole reason this
 * teaches rather than improvises.
 */

import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { CRAFT, type Part } from '../data/songcraft';
import { useLang } from '../lib/i18n';

export default function SongParts(): React.ReactElement {
  const { t, lang } = useLang();
  const [open, setOpen] = useState<Part | null>(null);
  const say = (pair: { en: string; af: string }): string => (lang === 'af' ? pair.af : pair.en);

  return (
    <div data-parts className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
        <GraduationCap className="h-4 w-4 text-emerald-400" />
        {t('parts.title', 'What each part of a song is for')}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {CRAFT.map((one) => {
          const on = open === one.id;
          return (
            <button
              key={one.id}
              type="button"
              data-part={one.id}
              /* `aria-pressed`, not `aria-expanded`, and the difference is
                 not pedantry. Only one of these can be open at a time, so
                 each chip is a SELECTION out of six rather than six
                 independent disclosures — which is what `aria-pressed`
                 means and what the feeling chips above already use.

                 It is also what `audit/enter.mjs` reads. Its `unfold`
                 helper treats "a button with `aria-expanded` and a name on
                 it" as a card to open, which these are not: with them
                 marked as folds it spent its clicks here and left the
                 style card shut, and two assertions in `audit/makesong.mjs`
                 failed reporting that the room no longer offered to take a
                 style off a song. The room did; the text was behind a card
                 nothing had opened. */
              aria-pressed={on}
              onClick={() => setOpen(on ? null : one.id)}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                on
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-emerald-500 hover:text-white'
              }`}
            >
              {say(one.name)}
            </button>
          );
        })}
      </div>

      {CRAFT.filter((one) => one.id === open).map((one) => (
        <div key={one.id} data-partopen={one.id} className="space-y-2 pt-0.5">
          <p className="text-sm font-bold leading-snug text-white">{say(one.what)}</p>
          <p className="text-sm leading-relaxed text-zinc-400">{say(one.does)}</p>
          <p className="text-sm leading-relaxed text-zinc-300">
            <span className="font-semibold text-emerald-300">{t('parts.how', 'How')}: </span>
            {say(one.how)}
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            <span className="font-semibold text-amber-300">{t('parts.wrong', 'What goes wrong')}: </span>
            {say(one.wrong)}
          </p>
          {/* A structural observation, never a line of somebody's song. The
              rule is in `data/songcraft.ts` and `check:songcraft` holds it. */}
          <p className="text-sm leading-relaxed text-zinc-500">
            <span className="font-semibold">{t('parts.worth', 'Worth knowing')}: </span>
            {say(one.example)}
          </p>
        </div>
      ))}
    </div>
  );
}
