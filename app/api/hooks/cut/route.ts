/**
 * Cutting a hook: the charge, before the clip is cut on the device.
 *
 * The owner, 18 October 2026: *"Hooks moet darem 3 krediete kos. En 6
 * krediete vir 30s."* The clip is made in the browser — the song or the
 * video never comes here — so, like `/api/post/export`, this route does one
 * thing: it charges, and the browser cuts only when the answer is yes.
 *
 * The reference is the moment itself (where it comes from, where it starts,
 * how long it runs), so cutting the same moment again — after a failed cut,
 * or to download it twice — is one charge, not two.
 */

import { charge } from '@/app/lib/server/credits';
import { hookCredits } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { moment?: unknown; seconds?: unknown } | null;
  const moment = String(body?.moment ?? '').slice(0, 160);
  const seconds = Number(body?.seconds);
  if (!moment || (seconds !== 15 && seconds !== 30)) {
    return Response.json(
      { message: 'That moment could not be read, so nothing was charged.' },
      { status: 400 },
    );
  }
  const credits = hookCredits(seconds);
  const paid = await charge(request, credits, 'hook', `hook:${moment}:${seconds}`);
  if (!paid.ok) return paid.response;
  return Response.json({ ok: true, credits });
}
