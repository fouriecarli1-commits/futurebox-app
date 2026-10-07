/**
 * Proof that the Android app and this website are the same people.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Registrasie op playstore."* The app that
 * goes on Google Play is this website in a wrapper — a Trusted Web Activity —
 * and the one thing that makes it feel like an app rather than a browser is
 * this file. Android fetches it before opening the wrapper. If the
 * fingerprint of the certificate the app was signed with is listed here, the
 * app opens with no address bar and no browser chrome. If it is not, every
 * screen has a URL bar across the top saying which website you are really
 * looking at, which is both ugly and, in a store listing, suspicious.
 *
 * ── Why it is a route and not a file ─────────────────────────────────────
 *
 * Two reasons, and the second is the one that matters.
 *
 * A directory whose name begins with a dot is not reliably copied into the
 * build output, which is why `vibefycode-challenge.txt` is a route too.
 *
 * And the fingerprint is not ours to invent. It is the SHA-256 of the
 * certificate Google signs her app with, and it does not exist until she has
 * created the app in the Play Console. Typed into the code, it would be a
 * commit every time Play rotates a key; read from the environment, it is a
 * variable she sets once in Vercel.
 *
 * ── What it serves before she has set it ─────────────────────────────────
 *
 * An empty list, with a 200. Not a 404: the absence of this file and an
 * empty one mean different things to the verifier, and an empty list is the
 * honest statement "no Android app is allowed to claim this site yet". A 404
 * reads as a site that has not thought about it.
 *
 *   ANDROID_PACKAGE      za.co.futurebox.studio (say)
 *   ANDROID_CERT_SHA256  the fingerprint, with or without colons,
 *                        several separated by commas if a key is being rotated
 *
 * `check:privateinfo` holds that neither is typed into the code.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Several, because a key rotation has two live fingerprints for a while. */
const prints = (): string[] =>
  (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((one) => one.trim().toUpperCase())
    .filter((one) => one.length > 0);

export function GET(): Response {
  const app = (process.env.ANDROID_PACKAGE ?? '').trim();
  const fingerprints = prints();
  const body = app && fingerprints.length
    ? [{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: app,
        sha256_cert_fingerprints: fingerprints,
      },
    }]
    : [];
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      /* Short, because the day she sets the variable she wants the verifier
         to see it rather than a copy from an hour ago. Android caches its
         own answer for longer, but that is Android's business and not a
         reason for this to be stale as well. */
      'cache-control': 'public, max-age=300',
    },
  });
}
