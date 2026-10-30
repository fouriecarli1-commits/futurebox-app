/**
 * A shape for the Photo Editor, drawn by the AI from a sentence.
 *
 * The owner, 30 October 2026: *"Dat photo editor dalk ook 'n ai engine het
 * waar jy sekere shapes vra."* One Flash call answers an outline — SVG path
 * data — which `lib/shapeai.ts` reads, checks and fits into a 100 by 100 box
 * before it leaves here. The editor lays it down as an ordinary shape.
 *
 * Charged `CREDITS.shapeAi`; refunded if no outline comes back. Gates in the
 * order `api/vector/draw` keeps: caller, our ceiling on Google, then credits.
 * Nothing is stored.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { enough, note } from '@/app/lib/server/googlespend';
import { askGemini, isGeminiConfigured } from '@/app/lib/server/gemini';
import { screen } from '@/app/lib/moderation';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { fitShapePath, shapeAsk } from '@/app/lib/shapeai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** How long the AI is waited for before the credits go back, inside `maxDuration`. */
const WAIT_MS = 45_000;

/**
 * What one outline costs Google, in millionths of a dollar: a short question
 * and up to four thousand tokens of path data back from Flash, rounded up.
 */
const PER_SHAPE = 12_000;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('shape-ai', request, GENERATION);
  if (flood) return flood;

  if (!isGeminiConfigured()) {
    return Response.json({ message: 'The AI is not switched on for this app yet.' }, { status: 503 });
  }

  let body: { words?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'That request could not be read.' }, { status: 400 });
  }
  const words = typeof body.words === 'string' ? body.words.trim().slice(0, 300) : '';
  if (!words) {
    return Response.json({ message: 'Say what shape you want first.' }, { status: 400 });
  }

  const refused = screen(words, 'video');
  if (refused) {
    return Response.json({ message: refused.message }, { status: 400 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const room = await enough('image', PER_SHAPE, caller?.id ?? null);
  if (room) {
    return Response.json({ error: room.code, message: room.message, left: room.left }, { status: 429 });
  }

  const paid = await charge(request, CREDITS.shapeAi, 'shape-ai');
  if (!paid.ok) return paid.response;

  const answer = await Promise.race([
    askGemini({ prompt: shapeAsk(words), temperature: 0.5, maxOutputTokens: 4096, noThinking: true }),
    new Promise<null>((done) => setTimeout(() => done(null), WAIT_MS)),
  ]);
  if (!answer) {
    await paid.refund();
    return Response.json({ message: 'The AI took too long. Try a simpler shape. Nothing was charged.' }, { status: 504 });
  }
  const path = answer.ok ? fitShapePath(answer.text) : null;
  if (!path) {
    await paid.refund();
    return Response.json(
      { message: answer.ok ? 'The AI answered, but not with a shape. Try saying it another way. Nothing was charged.' : `${answer.error ?? 'The AI could not be reached.'} Nothing was charged.` },
      { status: 502 },
    );
  }

  void note('image', PER_SHAPE, 'gemini-flash', caller?.id);
  return Response.json({ path }, { headers: { 'Cache-Control': 'no-store' } });
}
