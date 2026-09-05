import './globals.css';
import type { Metadata, Viewport } from 'next';
import { BAR_COLOUR } from './lib/brand';
import { LanguageProvider } from './lib/i18n';
import { SiteFooter } from './components/SiteFooter';
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
  title: 'FutureBox — Digital Learning & Creative AI Platform',
  description: 'The Black Box for the Future: Masterclasses, Podcasts, Creative AI & Intelligence Radar',
  /* What a link to this app looks like when somebody sends it to somebody
     else. A launch that is shared by hand — which is every launch at the
     start — lives or dies on this being here. */
  openGraph: {
    type: 'website',
    siteName: 'FutureBox',
    title: 'FutureBox — Digital Learning & Creative AI Platform',
    description: 'Make a song, make the video, and put it out. In English or Afrikaans.',
    url: '/',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'FutureBox' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FutureBox',
    description: 'Make a song, make the video, and put it out.',
    images: ['/icon.png'],
  },
  alternates: { canonical: '/' },
  /* `app/icon.png` and `app/apple-icon.png` are picked up by the file
     convention and need no entry here. This is the rest of what a phone reads:
     the name it shows under the icon when the app is installed, and permission
     to run without the browser's own chrome around it. */
  appleWebApp: { capable: true, title: 'FutureBox', statusBarStyle: 'black-translucent' },
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
          {children}
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
