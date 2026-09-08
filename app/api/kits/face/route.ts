/**
 * The picture for a singing voice, passed through this app.
 *
 * ── Why a route and not the address itself ───────────────────────────────
 *
 * Kits keeps a picture for every voice model, and the singing picker was a
 * hundred rows of grey text without them — `docs/KITS-KAART.md` §5 called it
 * the emptiest screen in the app.
 *
 * The picture lives on Kits' storage host. Putting that address in an `<img>`
 * would mean adding the host to `img-src` in the Content-Security-Policy, and
 * a policy is a list of who this app trusts with a person's browser. The host
 * is also not known from here — it has never been observed, only documented —
 * so widening the policy would mean guessing a hostname, and a guess that is
 * wrong fails silently as a blocked image. The picture is fetched here and
 * passed through instead: same origin, no policy change, and nothing about
 * the reader reaches Kits.
 *
 * This is the same trade `/api/voice/preview` makes for ElevenLabs' samples,
 * and it is written the same way on purpose.
 *
 * ── What stops it being an open proxy ────────────────────────────────────
 *
 * The id has to be one this process has already seen in a voice-model
 * listing. Nothing arbitrary can be fetched through here: an id that is not
 * in that map is a 404, and the map only ever holds addresses that came back
 * from `GET /voice-models` under our own key.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not charge, and it does not touch the four hundred download minutes.
 * Those burn on audio; this is a thumbnail on Kits' own web host, the same
 * file their site serves to anybody who opens the catalogue.
 */

import { catalogue, configured, faceUrlFor, models } from '@/app/lib/server/kits';

/** A voice's picture does not change. Let the browser keep it. */
const CACHE = 'public, max-age=86400, immutable';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ message: 'Singing is not switched on.' }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get('model');
  if (!id) return Response.json({ message: 'Which voice?' }, { status: 400 });

  /* The map is filled by listing the models. A cold process — a new
     serverless instance, a redeploy — has an empty one, so fill it before
     giving up. Both listings, because a voice is either hers or Kits' and
     the picker draws from both. */
  let url = faceUrlFor(id);
  if (!url) {
    await Promise.all([models(), catalogue()]);
    url = faceUrlFor(id);
  }
  if (!url) return Response.json({ message: 'No picture for that voice.' }, { status: 404 });

  const picture = await fetch(url).catch(() => null);
  if (!picture?.ok || !picture.body) {
    return Response.json({ message: 'That picture could not be fetched.' }, { status: 502 });
  }

  /* An allow-list rather than whatever they send. A proxy that passes any
     content type back under our own origin will serve an HTML page as one,
     and same-origin HTML is a different and much worse thing than a picture. */
  const said = (picture.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const type = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(said)
    ? said
    : null;
  if (!type) return Response.json({ message: 'That was not a picture.' }, { status: 502 });

  return new Response(picture.body, {
    headers: { 'content-type': type, 'cache-control': CACHE },
  });
}
