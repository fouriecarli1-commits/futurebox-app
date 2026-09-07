/**
 * What this Kits.AI account actually has, asked rather than guessed.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli: "maak gebruik van al die features en intergrate dit in ons app."
 * One endpoint is known — the voice conversion she sent — and the rest of
 * Kits' product is behind addresses nobody here has seen. arpeggi.io is
 * blocked from the machine this app is written on, so there is no way to find
 * out from here, and inventing them would ship buttons that fail against a
 * service that is billing her. That is worse than not shipping them.
 *
 * So this asks with her key and reports what answers. Open it in a browser
 * once, send me what it says, and every guess in `lib/server/kits.ts` becomes
 * a fact. The same shape as `/api/analyse/setup`, which is a page she has
 * already used for the same reason.
 *
 * ── Guarded, and not by accident ─────────────────────────────────────────
 *
 * It confirms whether a paid key works and lists what the account carries, so
 * it refuses without `POST_SECRET` rather than defaulting to open. Compared in
 * constant time, like the others.
 *
 * It reports shapes, never content: how many of a thing there are and what the
 * fields of one are called. Nothing that comes back is somebody's audio, and
 * the key never appears in the answer.
 */

import crypto from 'node:crypto';
import { CANDIDATES, configured, namedModels, probe } from '@/app/lib/server/kits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Thirteen requests to somebody else's API, one after another. */
export const maxDuration = 60;

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set POST_SECRET before using this.' },
      { status: 503 },
    );
  }
  const given =
    new URL(request.url).searchParams.get('key') ??
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!given || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  if (!configured()) {
    return Response.json({
      ready: false,
      why: 'The singing key is not set on this deployment. See docs/SWITCH-ON.md §11.',
    });
  }

  const found = [];
  for (const path of CANDIDATES) found.push(await probe(path));

  /* The control. If the one endpoint that is known to exist does not answer,
     the key is the problem and nothing else in this report means anything. */
  const control = found.find((one) => one.path === 'voice-conversions');
  const keyWorks = Boolean(control && control.status > 0 && control.status !== 401 && control.status !== 403);

  return Response.json({
    ready: keyWorks,
    why: keyWorks
      ? 'The key answers. Everything below with a 200 is real and can be wired.'
      : 'The known endpoint refused this key — check it, and check the plan carries API access.',
    namedModels: namedModels().map((one) => one.name),
    found,
  });
}
