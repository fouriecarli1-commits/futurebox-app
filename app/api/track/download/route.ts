/**
 * Handing over a song file.
 *
 * This is the boundary the product actually rests on. A watermark can be
 * stripped and a preview can be recorded off the speakers, but a file this
 * route refuses to sign is a file nobody gets.
 *
 * The rule is short: you may download a track when you own it, or when your
 * plan includes full songs. Everything else gets 402 with the price, which is
 * an invitation rather than a wall.
 *
 * It answers with a signed URL rather than the bytes. The bucket is private, so
 * that URL is the only way in, it expires, and Supabase serves the file instead
 * of this function streaming megabytes through Vercel for no reason.
 */

import { callerFrom, metered, purchaseLevel } from '@/app/lib/server/account';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'tracks';
/** Long enough to start a download on a slow line, short enough not to share. */
const VALID_SECONDS = 120;

export async function POST(request: Request): Promise<Response> {
  if (!metered()) {
    // Nothing to check against, and nothing stored server-side either — the
    // browser still holds its own copy, which is what it used before accounts.
    return Response.json({ error: 'not_metered', message: '' }, { status: 503 });
  }

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in to download.' }, { status: 401 });
  }

  let trackId = '';
  try {
    trackId = ((await request.json()) as { trackId?: string }).trackId ?? '';
  } catch {
    return Response.json({ error: 'bad_request', message: 'Which song?' }, { status: 400 });
  }
  if (!trackId) return Response.json({ error: 'bad_request', message: 'Which song?' }, { status: 400 });

  const owned = (await purchaseLevel(caller, trackId)) === 'owned';
  const onAPlan = caller.tier !== 'free';
  if (!owned && !onAPlan) {
    return Response.json(
      {
        error: 'not_owned',
        // No longer a price: the one-off purchases are retired, so the answer
        // to "how do I keep this" is a plan. Anyone who bought one before
        // still passes the check above.
        message: 'A plan downloads your songs clean, with the rights. Free songs keep their watermark.',
        needsPlan: true,
      },
      { status: 402 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const db = createClient(url, service, { auth: { persistSession: false } });

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(`${caller.id}/${trackId}.wav`, VALID_SECONDS);

  if (error || !data?.signedUrl) {
    return Response.json(
      { error: 'missing', message: 'That song is not on your account — it may only be on the device that made it.' },
      { status: 404 },
    );
  }

  return Response.json({ url: data.signedUrl, expiresIn: VALID_SECONDS });
}
