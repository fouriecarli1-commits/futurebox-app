/**
 * A vector picture, drawn by the AI from a sentence.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 17 October 2026, with another app's vector illustration on screen:
 * *"Ek hou van daai vector illustration."* The vector studio
 * (`components/VectorStudio.tsx`) sends a description; Gemini answers with
 * one SVG document; the studio reads it through `cleanTree`
 * (`lib/vectordoc.ts`), which lets in shapes and nothing that runs or fetches.
 * The same cleaning happens here first, so what leaves this route is already
 * clean and a different client cannot be handed anything else.
 *
 * Charged `CREDITS.vector`; refunded if nothing drawable comes back. Gates in
 * the order `api/picture/objects` keeps: caller, our ceiling on Google, then
 * credits. Nothing is stored.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { enough, note } from '@/app/lib/server/googlespend';
import { askGemini, isGeminiConfigured } from '@/app/lib/server/gemini';
import { screen } from '@/app/lib/moderation';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { cleanTree, nodeToSvg, parseSvg, vectorAsk } from '@/app/lib/vectordoc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** One drawing. A long SVG takes a while to write. */
export const maxDuration = 120;

/**
 * How long the AI is waited for before the credits go back and the screen
 * is told — inside `maxDuration`, so the answer is ours and not the
 * platform's. Cut off by the platform, the function stopped after charging
 * and before refunding, and the studio was handed a page that was not JSON.
 */
const WAIT_MS = 100_000;

/**
 * What one drawing costs Google, in millionths of a dollar: a short question
 * and up to sixteen thousand tokens of SVG back from Flash, rounded up.
 */
const PER_VECTOR = 45_000;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('vector-draw', request, GENERATION);
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
  const words = typeof body.words === 'string' ? body.words.trim().slice(0, 1500) : '';
  if (!words) {
    return Response.json({ message: 'Say what to draw first.' }, { status: 400 });
  }

  /* The screen a picture-making prompt passes through — a named person's
     face, and the rest — before anything is spent. */
  const refused = screen(words, 'video');
  if (refused) {
    return Response.json({ message: refused.message }, { status: 400 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const room = await enough('image', PER_VECTOR, caller?.id ?? null);
  if (room) {
    return Response.json({ error: room.code, message: room.message, left: room.left }, { status: 429 });
  }

  const paid = await charge(request, CREDITS.vector, 'vector');
  if (!paid.ok) return paid.response;

  const answer = await Promise.race([
    askGemini({ prompt: vectorAsk(words), temperature: 0.6, maxOutputTokens: 16384, noThinking: true }),
    new Promise<null>((done) => setTimeout(() => done(null), WAIT_MS)),
  ]);
  if (!answer) {
    await paid.refund();
    return Response.json(
      { message: 'The AI took too long to draw that. Try something simpler. Nothing was charged.' },
      { status: 504 },
    );
  }
  const parsed = answer.ok ? parseSvg(answer.text) : null;
  const clean = parsed ? cleanTree(parsed) : null;
  if (!clean || clean.children.length === 0) {
    await paid.refund();
    return Response.json(
      { message: answer.ok ? 'The AI answered, but not with a drawing. Nothing was charged.' : `${answer.error ?? 'The AI could not be reached.'} Nothing was charged.` },
      { status: 502 },
    );
  }

  void note('image', PER_VECTOR, 'gemini-flash', caller?.id);
  return Response.json({ svg: nodeToSvg({ ...clean, attrs: { ...clean.attrs, xmlns: 'http://www.w3.org/2000/svg' } }) }, { headers: { 'Cache-Control': 'no-store' } });
}
