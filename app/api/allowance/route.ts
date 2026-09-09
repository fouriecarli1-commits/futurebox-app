/**
 * Where both allowances stand, right now, on a page she can open.
 *
 * ── Why a page as well as a letter ───────────────────────────────────────
 *
 * `spendwatch.ts` writes to her when half, three quarters, ninety percent and
 * all of an allowance are gone. That is the alert she asked for, and it is the
 * right shape: it arrives without being asked.
 *
 * It also cannot send yet. `MAIL_FROM` needs a domain whose DNS we control —
 * docs/GOING_LIVE.md §2, still open — and until it is set `email.ts` refuses
 * every letter. Shipping only the letter would be shipping a warning system
 * that is switched off, and the way that is discovered is an invoice.
 *
 * So: the letter for when it can send, and this for any moment in between.
 * `canWrite` says plainly whether the letter can go out at all, because a
 * quiet no is the failure this whole piece exists to avoid.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * It reports money and how close the app is to stopping. `POST_SECRET`, in
 * constant time, the same as `/api/kits/setup`. No key of any supplier appears
 * in the answer.
 */

import crypto from 'node:crypto';
import { PLAN_CREDITS, USD_PER_CREDIT } from '@/app/lib/server/elevenceiling';
import { RAND_PER_CREDIT, STEPS, standing } from '@/app/lib/server/spendwatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function percent(part: number): string {
  return `${Math.round(part * 100)}%`;
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set POST_SECRET before using this.' },
      { status: 503 },
    );
  }
  const given = new URL(request.url).searchParams.get('key') ?? '';
  if (!sameSecret(given, wanted)) {
    return Response.json({ error: 'not_allowed' }, { status: 403 });
  }

  const now = await standing();

  return Response.json({
    eleven: {
      ...now.eleven,
      part: percent(now.eleven.part),
      minutesOfMusicLeft: Math.floor(now.eleven.left / 900),
      /* What the ceiling authorises beyond the plan. Zero unless she has
         raised ELEVEN_MONTHLY_CREDITS, which is the point of the default. */
      randAuthorisedOverPlan: Number(now.randToTopUpEleven.toFixed(2)),
      planCredits: PLAN_CREDITS,
      usdPerCredit: USD_PER_CREDIT,
      randPerThousandCredits: Number((RAND_PER_CREDIT * 1000).toFixed(2)),
      note:
        now.eleven.ceiling === PLAN_CREDITS
          ? 'The ceiling is the plan itself, so no top-up is authorised. Raising ELEVEN_MONTHLY_CREDITS is what authorises spending past it — buying credits at ElevenLabs alone will not.'
          : 'The ceiling is above the plan, so the difference will be bought as top-up credits if it is used.',
    },
    kits: {
      used: Number(now.kits.used.toFixed(1)),
      ceiling: now.kits.ceiling,
      left: Number(now.kits.left.toFixed(1)),
      part: percent(now.kits.part),
      step: now.kits.step,
      note: 'A real roof: it stops on its own and the card is not charged past the monthly fee. Minutes burn on what comes back, not what is sent.',
    },
    warnings: {
      at: STEPS.map((step) => percent(step)),
      to: now.to,
      canWrite: now.canWrite,
      note: now.canWrite
        ? 'Letters can be sent. One per step, per supplier, per calendar month.'
        : 'MAIL_FROM is not set, so no letter can be sent and this page is the only warning there is. See docs/GOING_LIVE.md §2.',
    },
  });
}
