import './globals.css';
import type { Metadata } from 'next';

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
      <body className="bg-[#07080c] min-h-screen text-zinc-100 antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
