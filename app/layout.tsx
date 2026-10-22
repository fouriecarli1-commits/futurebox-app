import Script from 'next/script';
import './globals.css';
import localFont from 'next/font/local';
import type { Metadata, Viewport } from 'next';
import { APP_LINE, APP_NAME, APP_SHORT, BAR_COLOUR } from './lib/brand';
import { LanguageProvider } from './lib/i18n';
import { SiteFooter } from './components/SiteFooter';
import WorkingBar from './components/WorkingBar';
import Watchdog from './components/Watchdog';
import BlankGuard from './components/BlankGuard';
import Blankscreen from './components/Blankscreen';
import LaunchMark from './components/LaunchMark';
import SpaceFull from './components/SpaceFull';
import TapGlow from './components/TapGlow';
import { startupImages } from './lib/splash';
import { SITE_URL } from './lib/brand';
import DeskStage from './components/DeskStage';

/**
 * The child's room's own face.
 *
 * The owner, 10 October 2026, having taken the question to Google herself and
 * come back with its answer: a playful rounded face, not the system one.
 *
 * Loaded through `next/font` rather than a stylesheet link, which means it is
 * fetched once at BUILD time and served from this origin — so there is no
 * request to another company's server on a page a six-year-old is looking at,
 * and nothing to be slow or blocked on a phone in Mokopane.
 *
 * It is a variable and not a default: only `[data-kidsroom]` picks it up. A
 * rounded face on the cutting room would be a different app.
 */
/* From `app/fonts/` and not from Google at build time. Twice on 11 and 12
   October 2026 a CI build died on the runner's fetch of this very face —
   "next/font/google queries have exactly one entry", which is their server
   answering something other than a font — and a Vercel build can die the
   same way on a bad minute. The files are the same woff2 Google serves,
   under the SIL Open Font Licence (`app/fonts/OFL.txt`), and a build now
   needs nothing from outside the repository. */
const fredoka = localFont({
  src: [
    { path: './fonts/fredoka-latin.woff2', weight: '300 700', style: 'normal' },
    { path: './fonts/fredoka-latin-ext.woff2', weight: '300 700', style: 'normal' },
  ],
  variable: '--fb-font-round',
  display: 'swap',
});

/* The headline face of the kids room — the owner, 13 October 2026, with the
   "Kids Dream Studio" page Google drew: its headings were Bubblegum Sans, a
   fat rounded display face a child reads as a toy. Local for the same reason
   as Fredoka, and a variable for the same reason: only `.fb-kids-bubble`
   inside `[data-kidsroom]` picks it up. */
const bubblegum = localFont({
  src: [
    { path: './fonts/bubblegum-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/bubblegum-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  variable: '--fb-font-bubble',
  display: 'swap',
});

/* The face of the whole app — the owner, 13 October 2026, with the home page
   Google drew for the overall look: Plus Jakarta Sans, a geometric
   humanist that reads warm at small sizes and sharp in a heading. Local for
   the same reason as the two above. The theme engine's `jakarta` font
   choice points at this variable, and the default preset chooses it. */
const jakarta = localFont({
  src: [
    { path: './fonts/jakarta-latin.woff2', weight: '200 800', style: 'normal' },
    { path: './fonts/jakarta-latin-ext.woff2', weight: '200 800', style: 'normal' },
  ],
  variable: '--fb-font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  /**
   * Where every relative link in this metadata is resolved from.
   *
   * Without it, an Open Graph image given as `/icon.png` resolves against
   * nothing and the tag is dropped — so a link shared on WhatsApp or X shows
   * a bare line of text with no picture, which is most of whether anybody
   * presses it. It reads `SITE_HOST`, so the day a real domain is set the
   * previews follow it without another edit.
   */
  metadataBase: new URL(SITE_URL),
  /* Google Search Console's ownership tag, for Google Play's website check
     (the owner, 18 October 2026). Hers, sent 19 October with Google's note
     "to stay verified, don't remove the meta tag, even after verification
     succeeds" — so it is written here and `check:googlesite` holds it. Not a
     secret: Google reads it off the public page. A setting in Vercel can
     still put another in its place. */
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || 'an-qhR7QCq85bGt34BF5QZQaY06FuyQt_86quoCfkp0' },
  /* ── The name, read from one place ───────────────────────────────────

     This said "FutureBox — Digital Learning & Creative AI Platform", and the
     description under it said "The Black Box for the Future: Masterclasses,
     Podcasts, Creative AI & Intelligence Radar" — both written before the app
     made a single song, and both typed here rather than read from anywhere.

     Four lines below, `openGraph` already carried a different and current
     description of the same product. Two answers to "what is this" in one
     file, and the stale one was the one on the tab and in search.

     The name carries "Studio" because `docs/GOING_LIVE.md` §2 settled it that
     way for a trademark reason — five other parties are serving the plain
     name — and because the company and the domain both already do. `brand.ts`
     holds all three strings and the reasoning; `check:brand` fails the build
     on any of them typed here again. */
  title: `${APP_NAME} — ${APP_LINE}`,
  description: APP_LINE,
  /* What a link to this app looks like when somebody sends it to somebody
     else. A launch that is shared by hand — which is every launch at the
     start — lives or dies on this being here. */
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_LINE}`,
    description: APP_LINE,
    url: '/',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_LINE,
    images: ['/icon.png'],
  },
  alternates: { canonical: '/' },
  /* `app/icon.png` and `app/apple-icon.png` are picked up by the file
     convention and need no entry here. This is the rest of what a phone reads:
     the name it shows under the icon when the app is installed, and permission
     to run without the browser's own chrome around it. */
  /* The short form here and only here: an icon on a home screen has room for
     about twelve characters, and a label that wraps or truncates is worse than
     the owner's own short form of their own name. */
  /* ── And the picture it opens with ───────────────────────────────────

     The owner, 4 October 2026: *"wanneer mens die app icon druk, dan launch hy
     huidiglik net met die app icon, maar ek sal wil hê die woorde futurebox
     moet saam launch."*

     She described iOS's own opening screen, which is the icon on
     `background_color` and nothing else — the operating system has the icon
     and the ground and has never had the wordmark. `startupImage` is the only
     way to hand it one, and the files are drawn by `scripts/splash.mts` with
     the mark and the words on them.

     The list comes from `app/lib/splash.ts` rather than being typed here: a
     query that misses the device by one pixel is not a slightly wrong splash,
     it is no splash at all, and nothing anywhere would report it. */
  appleWebApp: {
    capable: true,
    title: APP_SHORT,
    statusBarStyle: 'black-translucent',
    startupImage: startupImages(),
  },
};

/* Painted by the operating system before any of our CSS has run — the bar at
   the top of the browser on a phone, and the frame around an installed app.
   The default ground rather than white, so starting the app is not a flash of
   paper followed by the app. */
export const viewport: Viewport = {
  themeColor: BAR_COLOUR,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${bubblegum.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Before anything is painted: does this browser hold a sign-in? The
            owner, 22 October 2026, back from Help: the signed-out front page
            flashed up for a split second before the studio — the server
            sends the front page, and the app only learns who is here once it
            runs. With a sign-in on the device the front page waits hidden
            until the app has decided; `page.tsx` lifts it if the sign-in
            turns out to be gone. */}
        <Script src="/signedin.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen antialiased selection:bg-emerald-500 selection:text-onAccent">
        <LanguageProvider>
          {/* Listening before any room draws. See the note in the component:
              this catches the two failures no error boundary can, and writes
              them to the device so `/oops` can read them back. */}
          <Watchdog />
          <BlankGuard />
          {/* The neon ruler across the top whenever the app is waiting. */}
          <WorkingBar />
          {/* The one thing the watchdog cannot do: be seen. */}
          <Blankscreen />
          {/* First in the markup so it is painted first, and the only thing
              on the screen for the moment an app launched from its own icon
              has nothing else to show. It takes itself away with a CSS
              animation and never covers a tap — see the component. */}
          <LaunchMark />
          {/* A glow on every press that outlives the finger. */}
          <TapGlow />
          {/* The stage behind every page on a computer. */}
          <DeskStage />
          {children}
          {/* Says so when an upload was refused because the plan's cloud
              space is full — see `lib/space.ts`. */}
          <SpaceFull />
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
