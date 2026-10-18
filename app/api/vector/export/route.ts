/**
 * Taking a vector drawing off the device, as an SVG or a PNG.
 *
 * The owner, 17 October 2026: *"SVG PNG ook 5 krediete."* The vector studio
 * draws on the phone and costs nothing to draw in; what is charged is the
 * drawing leaving it — the same rule, price and shape as a post's export
 * (`api/post/export`). Once per drawing: its id is the reference, so the SVG
 * and then the PNG of the same drawing are one charge.
 *
 * Nothing is sent but the id. The file is made on the phone after this says
 * yes; no drawing ever reaches the server.
 */

import { charge } from '@/app/lib/server/credits';
import { CREDITS } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { drawing?: unknown } | null;
  const drawing = String(body?.drawing ?? '').replace(/[^\w-]/g, '').slice(0, 80);
  if (!drawing) {
    return Response.json(
      { message: 'That drawing has no id, so it cannot be charged for once rather than twice.' },
      { status: 400 },
    );
  }
  const paid = await charge(request, CREDITS.vectorOut, 'vector-out', `vector:${drawing}`);
  if (!paid.ok) return paid.response;
  return Response.json({ ok: true, credits: CREDITS.vectorOut });
}
