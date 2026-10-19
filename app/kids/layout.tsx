/**
 * The kids' pages wear FutureBox Kids' own manifest and icon, so that "Add to
 * home screen" on a child's phone or tablet installs the kids' studio as an
 * app of its own — see `app/kids/manifest.webmanifest/route.ts`.
 */
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'FutureBox Kids',
  manifest: '/kids/manifest.webmanifest',
  icons: {
    icon: [{ url: '/kids-icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/kids-apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'FutureBox Kids', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function KidsLayout({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
