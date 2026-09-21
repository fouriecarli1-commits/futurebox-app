'use client';

/**
 * A section of the front page, shut until somebody opens it.
 *
 * ── Why the front page needed one ────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Ek dink alles moet drop down menus wees
 * behalwe die maker se advertensie. En die 1 featured masterclass moet ook
 * groot wees, en die res van die masterclasses in 'n drop down."*
 *
 * The Spotlight tab was five full sections stacked one under the other —
 * podcasts, classes, creations, the radar, the counters — each with its own
 * heading, its own grid and its own picks bar. On a phone that is a long
 * scroll past four things you did not come for to reach the one you did,
 * and the way she described it was *"die buttons is randomely oor al"*: not
 * that any single button is in the wrong place, but that there are so many
 * on screen at once that none of them reads as the next thing to press.
 *
 * Shut, the page is a short list of what is here. Open, it is the section
 * she chose. The two things that are never shut are the one big class and
 * the maker's advert — the first because it is the offer, and the second
 * because somebody paid for it.
 *
 * ── Why this is not `Card`, and why it looks exactly like one ───────────
 *
 * `components/Card.tsx` is the rooms' fold and carries what a room needs: a
 * help mark, a magic wand, a tools row, and the arrival behaviour that opens
 * a card when the copilot fills it in. None of that belongs on a page a
 * stranger sees before signing in, and none of these sections can be filled
 * in by anything.
 *
 * What it does need to share is the LOOK. Carli's words about this page were
 * *"die buttons is randomely oor al. Dit is nie netjies nie."* A second kind
 * of fold, six pixels from the Top 10 ones, is exactly that complaint: the
 * first version of this had its chevron on the right and a grey line of
 * explanation under every title, beside house folds with the chevron on the
 * left and no explanation at all. So the header here is Card's header —
 * chevron left, turned a quarter when shut, then the icon, then the title —
 * and nothing else.
 *
 * ── The open state lasts the visit and no longer ─────────────────────────
 *
 * Not in storage: a front page that comes back tomorrow with four sections
 * open is the page she asked to be rid of. Within one visit, though,
 * opening the classes, reading one and coming back to a shut section reads
 * as the page undoing what you did.
 */

import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Fold({
  title,
  icon,
  /** True on that section's own tab, where folding it would be absurd. */
  always = false,
  children,
}: {
  readonly title: string;
  readonly icon?: React.ReactNode;
  readonly always?: boolean;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const panel = useId();

  if (always) return <section className="space-y-6">{children}</section>;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls={panel}
        /* 56 high and the whole width, because a heading that is also a
           control has to be reachable by a thumb aimed anywhere on it. */
        className="flex min-h-[56px] w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-zinc-900/60 active:translate-y-px"
      >
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${open ? '' : '-rotate-90'}`}
          aria-hidden
        />
        {icon && <span className="flex-shrink-0 text-emerald-400">{icon}</span>}
        <span className="truncate text-sm font-semibold text-zinc-200">{title}</span>
      </button>
      {/* Unmounted rather than hidden. A shut section that is still in the
          document is still fetching its pictures and still running its
          counters, which is the cost this was meant to avoid. */}
      {open && (
        <div id={panel} className="space-y-6 border-t border-zinc-800 p-4">
          {children}
        </div>
      )}
    </section>
  );
}
