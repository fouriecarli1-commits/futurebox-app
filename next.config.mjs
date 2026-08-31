/**
 * Headers, and nothing else.
 *
 * An outside assessment found four security headers missing. Each closes off a
 * class of browser-side attack that is otherwise simply available against
 * whoever uses this app, and none of them cost anything to set.
 *
 * ── The content policy, and why it is a list rather than a wildcard ──────
 *
 * The rule for adding to it: an origin belongs here only if the *browser*
 * fetches from it. ElevenLabs, Anthropic and Paystack's API are called from
 * route handlers with keys that never leave the server, so they are absent on
 * purpose — putting them in would suggest the browser talks to them, and one
 * day somebody would make that true.
 *
 * What is here, and what asked for it:
 *
 *   supabase.co        accounts, the database and the audio bucket
 *   img.youtube.com    thumbnails for real lectures, in Cover
 *   youtube.com        the embedded player for those lectures
 *   images.unsplash.com, assets.mixkit.co   sample imagery and audio
 *   blob:, data:       generated audio and artwork, made in the page itself
 *
 * `'unsafe-inline'` is on styles because Next inlines critical CSS, and on
 * scripts because its hydration bootstrap is an inline script. Removing either
 * needs per-request nonces through the whole app; that is worth doing and it
 * is not a header change, so it is not being pretended at here.
 *
 * Start it in report-only if you want to watch first — swap the key below for
 * `Content-Security-Policy-Report-Only`, read the console for a few days, then
 * put it back. The value stays the same either way.
 */

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  // No <form action> may leave this app. Anything taking a payment redirects
  // the whole page instead, which this does not prevent.
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.supabase.co https://img.youtube.com https://i.ytimg.com https://images.unsplash.com",
  "media-src 'self' blob: data: https://*.supabase.co https://assets.mixkit.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  // Nobody may put this app in a frame. The modern spelling of X-Frame-Options,
  // kept alongside it below for browsers that only read the old one.
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * Probe pages: in the repository, out of the build.
 *
 * The browser checks in `.probe/` need somewhere to mount a component. Until
 * now each one created a page, ran, and deleted it — which meant a check could
 * be run exactly once and never again, and re-running one silently read a 404
 * page instead of the app. A test that cannot be repeated is a test that told
 * you something on one afternoon.
 *
 * So they live as `*.probe.tsx` beside the code, and this extension is only a
 * page when PROBE=1. A production build cannot see them, and there is nothing
 * to remember to delete.
 */
const pageExtensions = ['tsx', 'ts', 'jsx', 'js'];
if (process.env.PROBE === '1') pageExtensions.push('probe.tsx');

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          // Stops a browser guessing that a text file is really a script.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // The path is never sent to another site; the origin is, so links
          // out still work as referrals.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Nothing here needs a camera, a microphone from another origin, or
          // a location. The microphone is ours, which is what 'self' says.
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
