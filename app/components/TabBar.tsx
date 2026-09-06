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
import { Compass, Library, Radio, Sparkles, UserRound } from 'lucide-react';
import { useLang } from '../lib/i18n';

export type TabId = 'spotlight' | 'live' | 'make' | 'library' | 'you';

/** How tall the bar's own content is. Not how tall the bar is — see below. */
export const BAR_HEIGHT = 64;

/**
 * How much room a scrolling page has to leave under itself, as CSS.
 *
 * ── The bug this exists to end ───────────────────────────────────────────
 *
 * Carli: "in make a video, die buttons heel onder sny copilot se prompt bar
 * af."
 *
 * The bar is `BAR_HEIGHT` of content *plus* `env(safe-area-inset-bottom)`,
 * because it pads itself away from the home indicator — the note above says
 * so. Every page that made room for it reserved the number instead, so on any
 * phone with an indicator the page was short by exactly the inset: 34 pixels
 * on an iPhone, which is most of a text field. The room whose last thing is
 * the copilot's input is the room where that shows, and it did.
 *
 * A number cannot express this, because the inset is only known to the
 * browser. So the clearance is a string, it is exported from the same file as
 * the bar, and `check:tabbar` fails on a `paddingBottom` that uses the bare
 * number — which is how it went wrong twice in one file.
 *
 * @param extra room above the bar, in pixels, for breathing space.
 */
export function barClearance(extra = 12): string {
  return `calc(${BAR_HEIGHT}px + env(safe-area-inset-bottom) + ${extra}px)`;
}

const TABS: readonly {
  readonly id: TabId;
  readonly icon: typeof Compass;
  readonly key: string;
  readonly fallback: string;
}[] = [
  /* Spotlight, not "Listen". It was renamed on the way into this bar and the
     name went with it; Spotlight is what the page has been called everywhere
     else — the filter inside it, the sponsorship rung, the robots file — and
     it says what the page is for. "Listen" said what you do with a song. */
  { id: 'spotlight', icon: Compass, key: 'tab.spotlight', fallback: 'Spotlight' },
  /* Live where Find was.

     Find was a search, and a search is something you reach for a few times a
     week; the live room is where everybody else's videos are, which is the
     thing a person opens an app to scroll. A tab is worth what it is pressed,
     so the search moved to a small button in the corner and this took the
     place it left. */
  { id: 'live', icon: Radio, key: 'tab.live', fallback: 'Live' },
  { id: 'make', icon: Sparkles, key: 'tab.make', fallback: 'Make' },
  { id: 'library', icon: Library, key: 'tab.library', fallback: 'Library' },
  { id: 'you', icon: UserRound, key: 'tab.you', fallback: 'You' },
];

export default function TabBar({
  active,
  onGo,
}: {
  readonly active: TabId;
  /**
   * Where to go.
   *
   * No "you pressed the one you are on" flag. Each tab goes to the same place
   * every time — Make is always the front door — so there is nothing for the
   * page to decide differently on a second press, and a parameter nobody
   * reads is a lie about the interface.
   */
  readonly onGo: (tab: TabId) => void;
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
              onClick={() => onGo(tab.id)}
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
