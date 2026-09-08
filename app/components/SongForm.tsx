'use client';

/**
 * A song drawn as its own shape.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 *   "ek het nodig dat hierdie program ook mense silently leer hoe om musiek
 *    te verstaan … en om soos hulle te dink."
 *
 * `docs/MUSIEKDENKE.md` §3.1, and the first thing built out of it. A listener
 * hears a song. A musician hears verse, chorus, verse, chorus, bridge, chorus,
 * and knows the chorus should have landed by forty-five seconds. This is that
 * second way of hearing, drawn on somebody's own record, for nothing — the
 * app already knows the answer, it simply never said it.
 *
 * ── The rule the whole idea rests on ─────────────────────────────────────
 *
 * Nothing here is a lesson. There is no quiz, no badge, no tab to open, and
 * nothing sits between anybody and their song. It is a strip under a song
 * saying what the song is made of, in the words a musician would use. Someone
 * who never reads it loses nothing; someone who makes twenty songs sees the
 * chorus land at 0:45 in the good ones and works out why on their own.
 *
 * ── Why the blocks are to scale ──────────────────────────────────────────
 *
 * Because the length is half of what is being shown. Equal blocks would say a
 * song is verse-chorus-verse-chorus and leave out that the second chorus is
 * twice the first, which is the sort of thing somebody notices in their own
 * work and then starts doing on purpose.
 *
 * A part under about four per cent of the song still gets a sliver rather
 * than nothing — a two-second intro is real and a strip that silently drops
 * it is drawing a different song.
 */

import React from 'react';
import { formOf, type Part } from '../lib/form';
import { useLang } from '../lib/i18n';

/** A colour per role, so the eye learns the shape before the words do. */
const COLOURS: Record<string, string> = {
  verse: 'bg-emerald-500/70',
  chorus: 'bg-teal-400/80',
  prechorus: 'bg-emerald-400/45',
  bridge: 'bg-violet-500/60',
  intro: 'bg-zinc-700',
  break: 'bg-zinc-600',
  outro: 'bg-zinc-700',
  other: 'bg-cyan-500/60',
};

/**
 * And a colour per letter, for a song whose sections this app has never heard
 * of.
 *
 * Every one of those is the role `other`, so a strictly role-coloured strip
 * drew a song of three genuinely different sections as three identical
 * blocks — the letters said ABA and the picture said AAA, and the picture is
 * the half people read. Looked at rather than reasoned about: it is plain in
 * `audit/songform.png` and invisible in `check:form`.
 *
 * One family at four strengths, and not four families. `tailwind.config.js`
 * folds every colour onto the theme — cyan and violet are both `secondary`
 * and `tertiary` of whatever theme is loaded, and in the light theme the app
 * ships they arrive as two blue-greys a few per cent apart. The second try
 * at this fixed the colouring and the picture still read AAA. Lightness is
 * the one difference no theme can collapse.
 */
const BY_LETTER: Record<string, string> = {
  A: 'bg-cyan-500/75',
  B: 'bg-cyan-500/30',
  C: 'bg-cyan-500/95',
  D: 'bg-cyan-500/50',
};

function colourFor(role: string, letter: string): string {
  if (role === 'other') return BY_LETTER[letter] ?? COLOURS.other;
  return COLOURS[role] ?? COLOURS.other;
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function SongForm({
  parts,
  className = '',
}: {
  readonly parts: readonly Part[] | undefined;
  readonly className?: string;
}): React.ReactElement | null {
  const { t } = useLang();
  const form = formOf(parts ?? []);
  /* No plan, no shape. A song brought in from a file has never had one, and a
     strip that invented parts for it would be the app making something up
     about somebody else's recording. */
  if (!form.parts.length || form.seconds <= 0) return null;

  const named =
    form.shape === 'verse-chorus' ? t('form.verseChorus', 'verse–chorus')
      : form.shape === 'aaba' ? t('form.aaba', 'AABA — the thirty-two bar song form')
        : form.shape === 'strophic' ? t('form.strophic', 'strophic — one section, new words each time')
          : '';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-zinc-300">{t('form.title', 'The shape of it')}</span>
        {form.letters && (
          <span className="rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-xs tracking-widest text-emerald-300">
            {form.letters}
          </span>
        )}
        {named && <span className="text-xs text-zinc-500">{named}</span>}
      </div>

      {/* The strip. `title` on each block rather than a label inside it: at a
          phone's width a twenty-second part is forty pixels, and text in it
          would be a truncated word that names nothing. The list underneath is
          where the names actually are. */}
      <div className="flex h-7 w-full overflow-hidden rounded-lg border border-zinc-800" role="img"
        aria-label={form.parts.map((one) => one.name).join(', ')}>
        {form.parts.map((one, index) => (
          <div
            key={`${one.name}-${index}`}
            title={`${one.name} · ${clock(one.at)}`}
            className={`${colourFor(one.role, one.letter)} h-full border-r border-zinc-950/40 last:border-r-0 flex items-center justify-center`}
            style={{ width: `${Math.max(4, (one.seconds / form.seconds) * 100)}%` }}
          >
            {/* The letter carries its own dark ground.

                A shadow was not enough. These blocks are the theme's own
                families at four strengths, so their lightness is not knowable
                from here — the pale `B` above is the same white ink as the
                saturated `A` beside it, and on that block it nearly
                disappeared. A `bg-scrim` pill is dark in every theme (see
                `check:scrim`), which makes white on it correct on every block
                without this file having to know what colour any of them
                came out. */}
            {one.letter && (
              <span className="rounded bg-scrim/45 px-1 text-[10px] font-bold leading-tight text-white">
                {one.letter}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        {form.parts.map((one, index) => (
          <span key={`${one.name}-${index}-name`} className="tabular-nums">
            <span className="text-zinc-400">{one.name}</span> {clock(one.at)}
          </span>
        ))}
      </div>

      {/* The one piece of craft worth saying out loud, and only when there is
          something to say it about. Not advice and not a score — the number,
          and what it is usually near. Somebody who sees "1:20" under four of
          their own songs draws the conclusion themselves. */}
      {form.chorusAt >= 0 && (
        <p className="text-xs leading-snug text-zinc-500">
          {t('form.chorusAt', 'The chorus first lands at')} <span className="text-zinc-300">{clock(form.chorusAt)}</span>
          {'. '}
          {t('form.chorusWhy', 'On most records people finish, it is there inside the first forty-five seconds.')}
        </p>
      )}
    </div>
  );
}
