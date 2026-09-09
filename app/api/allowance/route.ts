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
import { voiceRoom, whichVoiceList } from '@/app/lib/server/eleven';
import { CREDITS_A_MEMBER, RAND_PER_CREDIT, STEPS, standing } from '@/app/lib/server/spendwatch';

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
  /* One read, after the guard and before the answer is assembled. Behind the
     secret on purpose: it is a fact about her ElevenLabs account. */
  const slots = await voiceRoom();

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
    /* What the ceiling should be, worked out rather than guessed.
 
       Carli asked where the roof ought to sit. The honest answer is that it
       depends on how many people are paying, so this reports it from the real
       count instead of naming a figure that goes stale. It is deliberately a
       recommendation: a ceiling that raised itself would be raised by the very
       runaway it exists to stop. */
    ceiling: {
      payingMembers: now.members,
      creditsAMember: CREDITS_A_MEMBER,
      recommended: now.recommend,
      setTo: now.eleven.ceiling,
      randOfTopUpAtRecommended:
        now.recommend === null
          ? null
          : Number((Math.max(0, now.recommend - PLAN_CREDITS) * RAND_PER_CREDIT).toFixed(2)),
      note:
        now.members === null
          ? 'The member count could not be read, so no ceiling is recommended. A recommendation on an unknown count is a number that looks authoritative and is not.'
          : now.recommend !== null && now.recommend > now.eleven.ceiling
            ? `There are more members than the ceiling covers. Raise ELEVEN_MONTHLY_CREDITS to ${now.recommend} and top up to match — each member past the plan costs about R62 of credits and pays at least R149, so this is growth rather than a leak.`
            : 'The ceiling covers the members who are paying. Nothing to do.',
    },
    kits: {
      used: Number(now.kits.used.toFixed(1)),
      ceiling: now.kits.ceiling,
      left: Number(now.kits.left.toFixed(1)),
      part: percent(now.kits.part),
      step: now.kits.step,
      note: 'A real roof: it stops on its own and the card is not charged past the monthly fee. Minutes burn on what comes back, not what is sent.',
    },
    /* Which voice listing answers, because the fix for the 500-voice wall
       rests on a request shape nobody here could test.
 
       `/v1/voices` returns every voice on the account, and everything in this
       app is made on one account, so it grows with the membership — their own
       guidance is that it stops being usable past about five hundred. The code
       now asks the paginated v2 listing first and keeps v1 as a fallback.
 
       If this says `v1` on a live account, the v2 request is being refused and
       the wall is still ahead. If it says `v2`, it is gone. One page, one
       word, and a guess becomes a fact. */
    voiceList: {
      ...whichVoiceList(),
      note:
        whichVoiceList().way === 'v1'
          ? 'The paginated listing was refused and the old unbounded one answered. That one returns every voice on the account and stops working at around five hundred — which is five hundred members. Send me this and I will fix the request.'
          : whichVoiceList().way === 'v2'
            ? 'The paginated listing answered. The request no longer grows with the membership.'
            : 'Nothing has asked for the voices yet since this instance started. Open a room that lists them, then look again.',
    },
    /* The other half of the same wall.

       Above is whether the *listing* still works. This is whether there is
       room for the next voice at all: every member's clone holds a slot on
       the one workspace until it is deleted, and when the slots run out
       cloning stops for everybody at once.

       `null` means the two fields could not be read, which is reported as
       exactly that. It is the one number on this page that must never be
       shown as a confident zero — see `voiceRoom()`. */
    voiceSlots: slots
      ? {
          used: slots.used,
          limit: slots.limit,
          left: slots.left,
          part: percent(slots.used / slots.limit),
          note:
            slots.left <= 0
              ? 'Full. Nobody can clone a voice until slots are freed or the ElevenLabs plan is bigger. Look for voices belonging to members who cloned once and never used it before paying for more.'
              : `Room for about ${slots.left} more members to clone a voice. Buying credits does not add slots — a bigger ElevenLabs plan does.`,
        }
      : {
          used: null,
          limit: null,
          left: null,
          part: null,
          note:
            'The voice slots could not be read from ElevenLabs. Not the same as none left: cloning is allowed through while this is unknown, on purpose. If it stays unknown, `voice_limit` and `voice_slots_used` are not the field names their subscription answer actually uses.',
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
