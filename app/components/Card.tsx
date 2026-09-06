'use client';

/**
 * The shape every card in this app is meant to have.
 *
 * ── Where it comes from ──────────────────────────────────────────────────
 *
 * `docs/PACKAGING.md` §2, read off the screenshots Carli sent:
 *
 *     ┌──────────────────────────────────────┐
 *     │  ⌄  The words                   [✨] │   collapse, and fill it in
 *     │                                      │
 *     │  the one box                         │
 *     │                                      │
 *     │  [small]  [small]            [small] │   the options, underneath
 *     └──────────────────────────────────────┘
 *
 * "elke opsie is klein buttons onder." A heading you can fold, one thing to
 * fill in, a wand that fills it in for you, and everything else as small
 * buttons along the bottom rather than as controls stacked down the page.
 *
 * ── Why a component and not a convention ─────────────────────────────────
 *
 * Because there are thirteen rooms and the next person to add a field will
 * write it the fourteenth way. The same reasoning as `Note`, which replaced
 * sixty-six hand-written paragraphs with one.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not decide what is inside it, and it does not hide anything by
 * default unless it is told to. A card that opens shut is a control somebody
 * has to find; that is right for a sales panel and wrong for the box a room
 * is for. `open` is the caller's decision and the default is open.
 *
 * ── The two slots that were added when the rooms were converted ──────────
 *
 * `icon` and `aside`. Both exist because thirteen panels were already using
 * them and dropping them would have been a rebuild that quietly deleted
 * things — which is the failure this app has had twice before, where "too
 * much on the screen" was answered by removing working features.
 *
 * The icon is the little emerald mark half the rooms put beside a heading.
 * The aside is whatever sat *next to* the title and is pressable in its own
 * right — a `Hint`, most often. It cannot go inside the fold button, because
 * a button inside a button is not a thing a browser will render.
 */

import React, { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function Card({
  title,
  icon,
  aside,
  wand,
  tools,
  children,
  startShut = false,
}: {
  readonly title: string;
  /** The small mark beside the heading, where a room already had one. */
  readonly icon?: React.ReactNode;
  /**
   * Something pressable beside the title — a `Hint`, almost always.
   *
   * Outside the fold button rather than inside it: nesting a button in a
   * button is invalid HTML, and browsers resolve it by dropping one of them.
   */
  readonly aside?: React.ReactNode;
  /**
   * The magic wand: one press that fills this card in.
   *
   * On the header rather than under the box, because it belongs to the whole
   * card and because a thumb reaching for it should not have to scroll past
   * the thing it is going to change.
   */
  readonly wand?: { readonly label: string; readonly onPress: () => void; readonly busy?: boolean };
  /** The small buttons along the bottom. Whatever the card's options are. */
  readonly tools?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly startShut?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [open, setOpen] = useState(!startShut);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          {icon && <span className="flex-shrink-0 text-emerald-400">{icon}</span>}
          <span className="truncate text-sm font-semibold text-zinc-200">{title}</span>
        </button>

        {aside && <span className="flex-shrink-0">{aside}</span>}

        {wand && (
          <button
            type="button"
            onClick={wand.onPress}
            disabled={wand.busy}
            aria-label={wand.label}
            title={wand.label}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-emerald-300 hover:border-emerald-500 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${wand.busy ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 px-3.5 pb-3.5">
          {children}
          {/* Underneath, small, and wrapping rather than scrolling sideways —
              a row of options that runs off the right edge of a phone is a row
              of options nobody knows about. */}
          {tools && <div className="flex flex-wrap items-center gap-1.5 pt-0.5">{tools}</div>}
        </div>
      )}

      {!open && (
        <p className="px-3.5 pb-2.5 text-xs text-zinc-600">
          {t('card.shut', 'Folded away — press the heading to open it.')}
        </p>
      )}
    </section>
  );
}
