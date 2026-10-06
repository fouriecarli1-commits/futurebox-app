/**
 * What this account's Music.ai workflows are actually called.
 *
 * ── Why this exists at all ───────────────────────────────────────────────
 *
 * A job names its workflow by slug, and a slug is something the account holder
 * makes in the Music.ai dashboard. This repository cannot know what theirs is
 * called, and guessing means a job that fails against a bill under a name
 * nobody created.
 *
 * So rather than a page of instructions saying "go and find your slug", this
 * asks their account and lists them. Open it in a browser with the key on the
 * end, copy the slug, paste it into Vercel. The same shape as `/api/watch` and
 * `/api/post`, which is a shape the owner already knows how to use.
 *
 * ── Guarded, and not by accident ─────────────────────────────────────────
 *
 * It reports the account's own configuration and confirms whether a paid key
 * works, so it refuses without `POST_SECRET` rather than defaulting to open.
 * Compared in constant time, like the others.
 */

import crypto from 'node:crypto';
import {
  configured, listWorkflows, looksLikeVoiceConversion, whatIsSet, whoAmI, wrongSlugs,
} from '@/app/lib/server/musicai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * The one line she reads off this page.
 *
 * A wrong slug is named first because it is the only one of these that costs
 * money: the room charges, starts a job, names a workflow the account does
 * not have, and the failure comes back from their end with the credits
 * already taken.
 */
function nextStep(have: number, wrong: readonly string[], unset: readonly string[]): string {
  if (have === 0) {
    return 'This account has no workflows yet. Make one in the Music.ai dashboard first.';
  }
  if (wrong.length > 0) {
    return `${wrong.join(', ')} holds a slug that is not on this account.`
      + ' Copy the slug from `yourWorkflows` below — exactly, with no spaces'
      + ' around it — into that variable in Vercel and redeploy. Until then'
      + ' the room charges for the job and the job fails at their end.';
  }
  if (unset.length > 0) {
    return `${unset.join(', ')} is empty. Copy the matching slug from`
      + ' `yourWorkflows` below into it in Vercel, then redeploy.';
  }
  /* The answer this page did not have on 6 October 2026, which is the day
     Carli got everything right and was told to go and do it.

     Three branches were written — no workflows, a wrong slug, and a default
     that assumed something was still missing — and the state where nothing
     is left to do was the one nobody wrote. So the page that exists to say
     how the supplier is configured answered a correct configuration with an
     instruction. Being told to do work you have already done is worse than
     silence: it reads as the work not having taken. */
  return 'Every slug is set and every one of them is a workflow on this'
    + ' account. There is nothing left to do here — open the analyse controls'
    + ' in the Pro Booth and read a lane.';
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
      why: 'MUSIC_AI_API_KEY is not set.',
    });
  }

  const account = await whoAmI();
  if (!account) {
    return Response.json({
      ready: false,
      why: 'The key was refused. Check MUSIC_AI_API_KEY.',
    });
  }

  const workflows = await listWorkflows();
  /* And the one question this app has been unable to answer from the outside.
     See `looksLikeVoiceConversion` — it is a guess about somebody else's
     naming, reported as one. */
  const singing = workflows.filter(looksLikeVoiceConversion);
  const set = whatIsSet(workflows);
  const wrong = wrongSlugs(set);
  const unset = Object.entries(set).filter(([, one]) => one.slug === null).map(([name]) => name);
  return Response.json({
    ready: true,
    account: account.name,
    singingVoiceConversion: {
      looksAvailable: singing.length > 0,
      candidates: singing.map((one) => ({ slug: one.slug, name: one.name })),
      what:
        singing.length > 0
          ? 'One or more workflows on this account look like singing voice conversion — the one step between a song made here and a song in your own voice. Open one in the Music.ai dashboard and check what it takes in and gives back; if it is conversion, that is the gap closed.'
          : 'Nothing on this account looks like singing voice conversion. It may still exist under a name this cannot recognise — the check matches on what you called the workflow. If it genuinely is not offered over the API, the alternative is an RVC service such as Kits.AI. See docs/OPEN-QUESTIONS.md section A1.',
    },
    /* What is set now, joined to what the account actually has — so "not
       configured", "configured" and "configured wrongly" are three different
       answers in one screen instead of one of them arriving later as a job
       that failed against a bill. The join lives in the seam, where a check
       can run it on inputs this page will never see. */
    using: set,
    yourWorkflows: workflows.map((one) => ({ slug: one.slug, name: one.name })),
    next: nextStep(workflows.length, wrong, unset),
  });
}
