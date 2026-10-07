import type { MetadataRoute } from 'next';
import { BAR_COLOUR, APP_LINE, APP_NAME, APP_SHORT } from './lib/brand';

/**
 * What a phone reads when somebody adds this to their home screen.
 *
 * There was none, and there was no icon either: `/favicon.ico` answered 404 on
 * every single page load, which is how it was found — a 404 in the console of
 * every audit run, on every screen, for weeks. A browser asks for that file
 * whether or not anybody wrote one.
 *
 * The cost of not having it is not the console line. It is a blank square in
 * the tab, a blank square in somebody's bookmarks, and — for an app whose whole
 * point is that it works on a phone — a nameless grey box on the home screen of
 * anybody who installs it.
 *
 * The icon is the mark the app already draws — `Landing.tsx` puts a chip glyph
 * on an emerald-to-cyan tile at the top of the page and again in the hero. An
 * app icon that is a different drawing is a second brand: the thing in the
 * browser tab would not be the thing on the landing page.
 *
 * `background_color` is the app's own default ground rather than white, so the
 * splash while it starts is the app rather than a flash of paper. The theme is
 * chooseable inside the app; this is only what the operating system paints
 * before any of our CSS has run, so it takes the default and does not try to
 * follow.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    /* A third name for one app lived here — "FutureBox — write it, sing it,
       film it" — beside the tab's and the Open Graph one. All three are read
       from `brand.ts` now, because the one an installed app shows under its
       icon is the one nobody looks at again after the day it was installed. */
    name: `${APP_NAME} — ${APP_LINE}`,
    short_name: APP_SHORT,
    description:
      'The whole studio in one place: write a song with AI and sing on it yourself, clone your voice for the show, and put a video to it.',
    /* ── The fields a store asks for, which a browser does not ───────
 
        Carli's list, 7 October 2026: *"Registrasie op playstore."* An app
        on Google Play that is this web app in a wrapper reads this file at
        build time, and four of these are things it needs and a browser
        shrugs at:
 
          · `id` is the app's identity across reinstalls and renames. Left
            out, it defaults to `start_url` — so the day the start page
            moves, every installed copy becomes a second, different app.
          · `scope` says which pages are IN the app. Without it a link to a
            supplier opens inside the installed window with no address bar
            and no way back, which is the worst screen this app can show.
          · `orientation` is `any` and not `portrait`, deliberately: the
            cutting room and the booth both rebuild themselves for a phone
            held sideways, and locking the app upright would throw that
            away.
          · `categories` and `lang` are what a store lists it under, and
            this app is bilingual with Afrikaans first in its own country. */
    id: '/',
    scope: '/',
    lang: 'en-ZA',
    dir: 'ltr',
    orientation: 'any',
    categories: ['music', 'video', 'photo', 'productivity'],
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: BAR_COLOUR,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
