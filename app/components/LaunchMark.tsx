import { Cpu } from 'lucide-react';

/**
 * What an installed app paints the instant it is opened.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"wanneer mens die app icon druk, dan launch hy
 * huidiglik net met die app icon, maar ek sal wil hê die woorde futurebox moet
 * saam met die icon/logo launch. Dus die futurebox woorde logo moet saam
 * launch"*.
 *
 * She is right about what happens, and the reason is not ours to set. An
 * installed app's opening screen is drawn by the OPERATING SYSTEM out of the
 * manifest, before a line of our HTML exists: iOS paints the icon on
 * `background_color` and nothing else, and Chrome paints the icon with the
 * manifest `name` under it. Neither will draw the wordmark, because neither
 * has it.
 *
 * Two answers, and both are needed:
 *
 *  1. `appleWebApp.startupImage` in `app/layout.tsx` — real startup images
 *     with the mark AND the words on them, which iOS paints in place of its
 *     own generated screen. `scripts/splash.mjs` draws them.
 *  2. This file, which is the first thing OUR code paints, for the moment
 *     between the system screen going and the app being ready, and on every
 *     platform whose system screen we cannot replace.
 *
 * ── Why there is no JavaScript in it ─────────────────────────────────────
 *
 * It is in the server-rendered HTML, so it is on the screen in the first
 * paint — before React has loaded, let alone hydrated. A splash that waits
 * for JavaScript appears after the thing it was meant to cover.
 *
 * It takes itself away with a CSS animation for the same reason: a splash
 * that needs JavaScript to leave is a splash that stays forever on the one
 * device where the bundle failed, which is exactly the device somebody is
 * already having trouble on. `pointer-events: none` throughout, so even
 * while it is visible a tap goes straight through to the app underneath.
 *
 * ── Why it is only there when the app was launched from an icon ──────────
 *
 * The rule lives behind `@media (display-mode: standalone)` in
 * `globals.css`. In a browser tab there is no system splash to cover and no
 * launch to brand — the landing page draws this same mark at four times the
 * size — so a tab gets nothing. `audit/launchmark.mjs` reads that rule out of
 * the shipped stylesheet and fails if it is gone, and `check:launchmark`
 * holds the markup and the words.
 *
 * ── Why the word is markup and not part of the picture ──────────────────
 *
 * Same split as `scripts/brand-mark.mjs` made for the email signature, for a
 * different reason: as text it is the app's own colours, at the device's own
 * pixel density, in one shape on every screen there will ever be. A picture
 * of the word would need a file per size and would be soft on half of them.
 */
export default function LaunchMark() {
  return (
    /* `aria-hidden` because it says nothing a screen reader has not already
       been told by the page title — and it is gone before anybody could reach
       it with a swipe. */
    <div data-launchmark aria-hidden="true">
      <span data-launchmarktile>
        <Cpu />
      </span>
      <p data-launchmarkword>
        FUTURE<span>BOX</span>
      </p>
    </div>
  );
}
