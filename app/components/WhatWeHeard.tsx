'use client';

/**
 * The measurements, with what each one means.
 *
 * ── What changed, and why it is worth a component ────────────────────────
 *
 * `docs/MUSIEKDENKE.md` §3.2. Pointing the app at a song you like has always
 * come back with a line like:
 *
 *   112 BPM · A minor · brightness 62% · low end 24%
 *
 * Four numbers, and nothing to do with any of them. The same four numbers
 * with one clause each are four things a musician knows:
 *
 *   112 BPM     walking pace, where most pop sits
 *   A minor     the same seven notes as C major, a different home
 *   62%         the energy is up top, where a voice has to compete
 *   24%         enough bottom to feel, not enough to cover anything
 *
 * Nothing is added to the screen but a sentence under a number that was
 * already there, and nobody is taught anything. It is theory delivered as a
 * fact about a song somebody chose themselves, which is the only form of it
 * that gets absorbed.
 *
 * ── Why the words are not in here ────────────────────────────────────────
 *
 * `lib/musictalk.ts` decides *which* reading and hands back an i18n key; this
 * says it. That split is what lets the bands be tested without a browser, and
 * it is what stops an English clause appearing on an Afrikaans screen —
 * `check:musictalk` asserts every key the library can emit is in the
 * dictionary, which `check:afrikaans` then holds to both languages.
 */

import React from 'react';
import { readingsOf, type Measured } from '../lib/musictalk';
import { useLang } from '../lib/i18n';

export default function WhatWeHeard({
  heard,
  className = '',
}: {
  readonly heard: Measured | null;
  readonly className?: string;
}): React.ReactElement | null {
  const { t } = useLang();
  if (!heard) return null;
  const readings = readingsOf(heard);
  if (!readings.length) return null;

  /* `lib/listen.ts` names a key in English — "E♭ major" — because that is
     what the notation is called; the *word* is not notation and belongs in
     the reader's language. `musictalk` leaves it as a token for exactly this.
     Found by `audit/heard.mjs` on the Afrikaans page, where the clause was
     Afrikaans and the key above it said "major". */
  const say = (text: string): string => text
    .replace('{major}', t('talk.major', 'major'))
    .replace('{minor}', t('talk.minor', 'minor'));

  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-sm font-semibold text-zinc-300">{t('talk.title', 'What that means')}</p>
      <dl className="space-y-1.5">
        {readings.map((one) => (
          <div key={one.of} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt className="text-xs uppercase tracking-wide text-zinc-600 w-24 flex-shrink-0">
              {t(`talk.of.${one.of}`, one.of)}
            </dt>
            <dd className="text-sm font-semibold text-zinc-200 tabular-nums flex-shrink-0">{say(one.value)}</dd>
            {/* The clause, on the same row where there is room and wrapping
                under the number where there is not. It is the whole point of
                the block, so it is not hidden behind anything. */}
            <dd className="min-w-0 flex-1 text-xs leading-snug text-zinc-500">
              {t(one.note, one.english)}
              {one.then && <span className="text-zinc-300"> {say(one.then)}</span>}
              {one.then && '.'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
