import './globals.css';
import type { Metadata, Viewport } from 'next';
import { LanguageProvider } from './lib/i18n';
import { SiteFooter } from './components/SiteFooter';

export const metadata: Metadata = {
  title: 'FutureBox — Digital Learning & Creative AI Platform',
  description: 'The Black Box for the Future: Masterclasses, Podcasts, Creative AI & Intelligence Radar',
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
  themeColor: '#fafaf9',
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
