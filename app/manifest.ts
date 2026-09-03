import type { MetadataRoute } from 'next';

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
    name: 'FutureBox — write it, sing it, film it',
    short_name: 'FutureBox',
    description:
      'The whole studio in one place: write a song with AI and sing on it yourself, clone your voice for the show, and put a video to it.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#10b981',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
