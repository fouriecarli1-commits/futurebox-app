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
import { configured, listWorkflows, looksLikeVoiceConversion, slugFor, whoAmI } from '@/app/lib/server/musicai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    /* What is set now, beside what exists — so the difference between "not
       configured" and "configured wrongly" is visible in one screen rather
       than being worked out from a failing job. */
    using: {
      MUSIC_AI_WORKFLOW_READ: slugFor('read') || null,
      MUSIC_AI_WORKFLOW_STEMS: slugFor('stems') || null,
    },
    yourWorkflows: workflows.map((one) => ({ slug: one.slug, name: one.name })),
    next:
      workflows.length === 0
        ? 'This account has no workflows yet. Make one in the Music.ai dashboard first.'
        : 'Copy a slug into MUSIC_AI_WORKFLOW_READ in Vercel, then redeploy.',
  });
}
