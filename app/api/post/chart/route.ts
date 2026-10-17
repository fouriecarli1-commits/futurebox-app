/**
 * A chart's data, from words.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 17 October 2026: *"Wat cool sal wees as dit AI verstelbaar is dat
 * data ingevoer kan word en AI die data in die grafiek verstel."* The photo
 * editor's chart (`lib/postcharts.ts`) is sent with what she typed — numbers,
 * a pasted report, or a change like "add July at 90" — and comes back as the
 * whole chart again, read through `cleanChart` on both sides.
 *
 * Charged `CREDITS.chart`, because nothing is free. The order of the gates is
 * the one `api/picture/objects` keeps and explains: caller, our ceiling on
 * Google, then credits last, and the credits go back if the engine fails.
 *
 * Nothing is stored. The words arrive, are read, and are gone.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { enough, note } from '@/app/lib/server/googlespend';
import { askGemini, isGeminiConfigured } from '@/app/lib/server/gemini';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { chartAsk, cleanChart } from '@/app/lib/postcharts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** One short read. Seconds, not minutes. */
export const maxDuration = 30;

/**
 * What one read costs Google, in millionths of a dollar: a few thousand
 * tokens of Flash in and a few hundred out, rounded well up so our ceiling
 * is never fooled by a long paste.
 */
const PER_CHART = 4_000;

/** The most words that may arrive. A pasted report, not a book. */
const MOST_WORDS = 6000;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('post-chart', request, GENERATION);
  if (flood) return flood;

  if (!isGeminiConfigured()) {
    return Response.json({ message: 'The AI is not switched on for this app yet.' }, { status: 503 });
  }

  let body: { chart?: unknown; words?: unknown; lang?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'That request could not be read.' }, { status: 400 });
  }

  const current = cleanChart(body.chart);
  const words = typeof body.words === 'string' ? body.words.trim() : '';
  const lang = body.lang === 'af' ? 'af' : 'en';
  if (!current) {
    return Response.json({ message: 'That chart could not be read.' }, { status: 400 });
  }
  if (!words) {
    return Response.json({ message: 'Type the numbers, or what to change, first.' }, { status: 400 });
  }
  if (words.length > MOST_WORDS) {
    return Response.json({ message: `That is more than ${MOST_WORDS} letters. Paste the part with the numbers.` }, { status: 413 });
  }

  const caller = metered() ? await callerFrom(request) : null;

  const room = await enough('image', PER_CHART, caller?.id ?? null);
  if (room) {
    return Response.json({ error: room.code, message: room.message, left: room.left }, { status: 429 });
  }

  const paid = await charge(request, CREDITS.chart, 'chart');
  if (!paid.ok) return paid.response;

  const answer = await askGemini({
    prompt: chartAsk(current, words, lang),
    /* Low: this is reading numbers, not writing. */
    temperature: 0.1,
    maxOutputTokens: 4096,
    jsonOutput: true,
  });
  const chart = answer.ok ? cleanChart(answer.json, current) : null;
  if (!chart) {
    await paid.refund();
    return Response.json(
      { message: answer.ok ? 'The AI answered, but not with chart data. Nothing was charged.' : `${answer.error ?? 'The AI could not be reached.'} Nothing was charged.` },
      { status: 502 },
    );
  }

  void note('image', PER_CHART, 'gemini-flash', caller?.id);

  return Response.json({ chart }, { headers: { 'Cache-Control': 'no-store' } });
}
