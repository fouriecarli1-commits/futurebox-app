import './globals.css';
import type { Metadata, Viewport } from 'next';
import { APP_LINE, APP_NAME, APP_SHORT, BAR_COLOUR } from './lib/brand';
import { LanguageProvider } from './lib/i18n';
import { SiteFooter } from './components/SiteFooter';
import Watchdog from './components/Watchdog';
import BlankGuard from './components/BlankGuard';
import Blankscreen from './components/Blankscreen';
import { SITE_URL } from './lib/brand';

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
  appleWebApp: { capable: true, title: APP_SHORT, statusBarStyle: 'black-translucent' },
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
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-emerald-500 selection:text-onAccent">
        <LanguageProvider>
          {/* Listening before any room draws. See the note in the component:
              this catches the two failures no error boundary can, and writes
              them to the device so `/oops` can read them back. */}
          <Watchdog />
          <BlankGuard />
          {/* The one thing the watchdog cannot do: be seen. */}
          <Blankscreen />
          {children}
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
