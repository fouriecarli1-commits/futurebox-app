'use client';

/**
 * The search, as a small button in the top-right corner.
 *
 * ── Why it left the bar ──────────────────────────────────────────────────
 *
 * It had one of the five tabs, and a tab is worth what it is pressed. A search
 * is something somebody reaches for a few times a week; the live room is where
 * everybody else's work is, and that is what an app gets opened to scroll. So
 * Live took the place and this took a corner.
 *
 * ── Why the corner and not a header ──────────────────────────────────────
 *
 * Because there is no one header. The feed has its own, the studio has a back
 * bar, the front door has neither, and the channel is a room inside the
 * studio — a button put in "the header" would exist on some screens and not
 * others, which is the fault the tab bar was built to end. Fixed to the window
 * instead, like the bar at the bottom, so it is in the same place on every
 * screen or it is nowhere.
 *
 * ── The size ─────────────────────────────────────────────────────────────
 *
 * Small, as asked, and not smaller than a thumb. Forty-four pixels is the
 * floor a finger can reliably hit; the glass circle is drawn at forty-four and
 * the mark inside it at sixteen, so it reads as small without becoming a thing
 * you have to aim at.
 *
 * ── Above what ───────────────────────────────────────────────────────────
 *
 * `z-96`: one above the tab bar, for the same reason the bar is above the
 * studio — it is furniture. The page hides it for true modals rather than
 * layering it under them, and hides it while the search itself is open, where
 * it would sit on top of the panel it opened.
 */

import React from 'react';
import { Search } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function SearchCorner({
  onOpen,
}: {
  readonly onOpen: () => void;
}): React.ReactElement {
  const { t } = useLang();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('tab.search', 'Search')}
      className="fixed right-3 z-[96] flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/80 text-zinc-300 backdrop-blur-xl transition-colors hover:text-white hover:border-zinc-500"
      /* Clear of a notch and of a phone's own status bar. `env()` is zero on a
         desktop, so the twelve pixels are what it falls back to. */
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <Search className="h-4 w-4" />
    </button>
  );
}
