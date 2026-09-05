'use client';

/**
 * The five tabs, at the bottom, on every screen.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 *
 * Nothing, and that is the point. Thirteen rooms, a feed, a search, a channel
 * and an account were all reachable before — through a header, a rail, a
 * dropdown that has since gone, a modal, and a front door that only appears
 * when you are already inside. Somebody standing on any one screen could not
 * see the other four parts of the app, so the way to a room was to remember
 * where it was.
 *
 * A permanent bar answers "where am I and what else is there" without being
 * asked. It is the one piece of furniture that never moves, and everything
 * else — the door, the rail, the room chips — hangs off it.
 *
 * ── Five, and why these five ─────────────────────────────────────────────
 *
 * Not thirteen. A tab per room would be the dropdown problem in a new shape:
 * a wall of equal choices with no sense of what this app is for. So the tabs
 * are the five *modes* — listening, looking for something, making something,
 * your own work, and you — and the rooms are chips inside **Make**, which is
 * where all thirteen already live.
 *
 * Make sits in the middle and is drawn larger, because it is what this app is
 * for and a thumb finds the middle without looking.
 *
 * ── Where the truth lives ────────────────────────────────────────────────
 *
 * Not here. Which tab is lit is derived by the page from the state it already
 * keeps — is the studio open, is the account panel open, which room is
 * showing — rather than stored a second time in this component. Two records
 * of one fact is how a bar ends up lighting "Make" while somebody is reading
 * their channel.
 *
 * ── The safe area ────────────────────────────────────────────────────────
 *
 * `env(safe-area-inset-bottom)` in the padding, because a bar flush to the
 * bottom of an iPhone sits under the home indicator and the outer two tabs
 * become the hardest things in the app to press.
 *
 * ── Above almost everything ──────────────────────────────────────────────
 *
 * `z-95`: over the studio, the front door, the account panel and the search
 * spotlight, all of which are places you should be able to leave by pressing
 * a tab. Under nothing except the true modals — a sign-up form, a price list,
 * a media viewer — and the page hides it for those rather than layering under
 * them, because a bar over a half-finished form that lets somebody navigate
 * away mid-way is worse than no bar.
 */

import React from 'react';
import { Compass, Library, Search, Sparkles, UserRound } from 'lucide-react';
import { useLang } from '../lib/i18n';

export type TabId = 'listen' | 'find' | 'make' | 'library' | 'you';

/** How tall the bar is, so a scrolling page can leave room for it. */
export const BAR_HEIGHT = 64;

const TABS: readonly {
  readonly id: TabId;
  readonly icon: typeof Compass;
  readonly key: string;
  readonly fallback: string;
}[] = [
  { id: 'listen', icon: Compass, key: 'tab.listen', fallback: 'Listen' },
  { id: 'find', icon: Search, key: 'tab.find', fallback: 'Find' },
  { id: 'make', icon: Sparkles, key: 'tab.make', fallback: 'Make' },
  { id: 'library', icon: Library, key: 'tab.library', fallback: 'Library' },
  { id: 'you', icon: UserRound, key: 'tab.you', fallback: 'You' },
];

export default function TabBar({
  active,
  onGo,
}: {
  readonly active: TabId;
  /** Pressing the tab you are already on is a request to go to its start. */
  readonly onGo: (tab: TabId, again: boolean) => void;
}): React.ReactElement {
  const { t } = useLang();

  return (
    <nav
      aria-label={t('tab.nav', 'The five parts of the app')}
      className="fixed bottom-0 inset-x-0 z-[95] border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1">
        {TABS.map((tab) => {
          const on = active === tab.id;
          const Icon = tab.icon;
          const middle = tab.id === 'make';
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onGo(tab.id, on)}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                on ? 'text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {/* The middle one carries a filled pill even when it is not the
                  tab you are on. It is the thing this app is for, and a row of
                  five identical icons says the opposite. */}
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  middle
                    ? on
                      ? 'bg-emerald-500 text-onAccent'
                      : 'bg-zinc-800 text-zinc-300'
                    : on
                      ? 'bg-emerald-500/15'
                      : ''
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold leading-none">
                {t(tab.key, tab.fallback)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
