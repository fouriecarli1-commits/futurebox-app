/**
 * Proof that whoever deploys this site controls it.
 *
 * VibefyCode fetches this one path before it will run anything against
 * futurebox, and it refuses a redirect — a bystander who merely knows the
 * domain exists cannot put a file here, which is the whole point. The body is
 * the challenge token and nothing else; any extra character fails the check.
 *
 * Served from a route rather than `public/` because a directory whose name
 * begins with a dot is not reliably copied into the build output. Static, so
 * it costs a request to the CDN and nothing to this app.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const TOKEN = 'JCB3YkpwcArV99mjfu9lxO-d9wwV4ZxI';

export function GET(): Response {
  return new Response(TOKEN, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
