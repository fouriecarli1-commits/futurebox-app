import './globals.css';
import type { Metadata } from 'next';
import { LanguageProvider } from './lib/i18n';

export const metadata: Metadata = {
  title: 'FutureBox — Digital Learning & Creative AI Platform',
  description: 'The Black Box for the Future: Masterclasses, Podcasts, Creative AI & Intelligence Radar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-emerald-500 selection:text-onAccent">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
