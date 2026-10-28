/**
 * The Pro Booth's own tools: the charge, and nothing else.
 *
 * Like `app/api/post/export`, nothing reaches this server but the question.
 * The zip, the lane file, the notes, the marks, the smoothing and the reading
 * of a piece all run in the browser on samples the room already holds; this
 * route only takes the credits for them, before the result is handed over.
 *
 * The owner, 28 October 2026: *"Funksies wat sinvol is moet altyd 'n paar
 * krediete kos"*, and *"Niks 1 credit nie. Altyd 2."* The prices are in
 * `CREDITS`; the browser sends which tool and a reference, never a price.
 *
 * The reference is made in the browser from what is being taken (the lane,
 * its cut, the quality), so the same file saved twice is one charge:
 * `spend_credits` takes a charge once per reference.
 */
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { charge } from '@/app/lib/server/credits';
import { CREDITS } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* An unknown tool is refused rather than defaulted, for the reason
   `app/api/madehere` gives: a default charges whatever the first row is. */
const TOOLS: Readonly<Record<string, number>> = {
  zip: CREDITS.stemsZip,
  wav: CREDITS.laneWav,
  midi: CREDITS.laneMidi,
  hum: CREDITS.humPart,
  marks: CREDITS.findMarks,
  smooth: CREDITS.smoothJoin,
  heard: CREDITS.whatsIn,
};

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('boothtool', request, GENERATION);
  if (flood) return flood;
  const body = (await request.json().catch(() => null)) as { tool?: unknown; ref?: unknown } | null;
  const tool = typeof body?.tool === 'string' ? body.tool : '';
  const price = TOOLS[tool];
  if (!price) return Response.json({ error: 'bad_tool', message: 'Could not read that.' }, { status: 400 });
  const ref = typeof body?.ref === 'string' && body.ref.length > 0 && body.ref.length <= 80 ? body.ref : '';
  if (!ref) return Response.json({ error: 'no_ref', message: 'Could not read that.' }, { status: 400 });
  const paid = await charge(request, price, `boothtool.${tool}`, `boothtool:${tool}:${ref}`);
  if (!paid.ok) return paid.response;
  return Response.json({ ok: true, credits: price });
}
