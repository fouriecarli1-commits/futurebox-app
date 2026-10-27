/**
 * Which build the server is running, so an open tab can tell it is behind.
 *
 * The owner, 27 October 2026, testing a fix that had been live for hours:
 * the sticker answered with the new server's words while the screen around
 * it was still the old one. A tab keeps the code it loaded until it is
 * reloaded, so a phone left open on the app can run yesterday's screens
 * against today's server. `NewVersion.tsx` asks this every few minutes and
 * offers a reload when the two differ.
 *
 * The commit id only: it is in the repository already and says nothing
 * else (`lib/whichbuild.ts`).
 */
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    { sha: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
