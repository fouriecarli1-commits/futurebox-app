/**
 * FutureBox Kids: the kids' studio as an app of its own.
 *
 * The owner, 19 October 2026: *"hoe moontlik is dit om 'n aparte web app vir
 * die kinders te maak, wat gelink is aan dieselfde github branch. Dit sal
 * soms vir ouers makliker wees as dit op 'n kind se foon of tablet is en die
 * kind kan net aan gaan om te speel."* — and then: *"Gaan aan met futurebox
 * kids."*
 *
 * The same app, the same branch, the same deployment. What makes it an app
 * of its own is this file: its own `id`, so a phone keeps it apart from the
 * grown-up app installed beside it; its own name and icon, so a child finds
 * it; `start_url` on the kids' studio, so it opens there; and `scope` held to
 * `/kids`, so the installed app is the kids' studio and nothing else — a
 * link out of it opens in the browser, not inside the child's window. The
 * lock in the room (`lib/kidslock.ts`) is still what keeps a child in it.
 *
 * A route and not `app/manifest.ts`, which Next allows once, for the whole
 * site; `app/kids/layout.tsx` points the kids' pages at this one.
 */

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(
    JSON.stringify({
      id: '/kids',
      name: 'FutureBox Kids',
      short_name: 'FutureBox Kids',
      description: 'Make music, stories, drawings and videos — the FutureBox studio for kids, with a grown-up in charge.',
      lang: 'en-ZA',
      dir: 'ltr',
      start_url: '/kids?app=kids',
      scope: '/kids',
      display: 'standalone',
      orientation: 'any',
      background_color: '#000000',
      theme_color: '#000000',
      categories: ['kids', 'music', 'education'],
      icons: [
        { src: '/kids-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/kids-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/kids-icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } },
  );
}
