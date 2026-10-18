/**
 * A product link read into an advert brief.
 *
 * Carli, 18 October 2026: yes to Google's AI reading a product page for
 * three credits. `lib/adlink.ts` carries the why; the short of it is that
 * this route never fetches the link — Gemini's URL-context tool reads the
 * page on Google's side, and what comes back is cleaned like any other
 * answer. Charged before the call, refunded when the page could not be read
 * or was not about anything for sale.
 */
import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { enough, note } from '@/app/lib/server/googlespend';
import { askGemini, isGeminiConfigured } from '@/app/lib/server/gemini';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { cleanFound, cleanLink, linkAsk } from '@/app/lib/adlink';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

/* What a page read and a short answer cost us, in the units `enough` keeps. */
const PER_LINK = 6_000;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('campaign-link', request, GENERATION);
  if (flood) return flood;

  if (!isGeminiConfigured()) {
    return Response.json({ message: 'The AI is not switched on for this app yet.' }, { status: 503 });
  }

  let body: { url?: unknown; lang?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'That request could not be read.' }, { status: 400 });
  }
  const url = cleanLink(body.url);
  const lang = body.lang === 'af' ? 'af' : 'en';
  if (!url) {
    return Response.json({ message: 'That is not a web page address. Paste the link to the product page.' }, { status: 400 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const room = await enough('image', PER_LINK, caller?.id ?? null);
  if (room) {
    return Response.json({ error: room.code, message: room.message, left: room.left }, { status: 429 });
  }

  const paid = await charge(request, CREDITS.adLink, 'adlink');
  if (!paid.ok) return paid.response;

  const answer = await askGemini({
    prompt: linkAsk(url, lang),
    temperature: 0.1,
    maxOutputTokens: 1024,
    jsonOutput: true,
    urlContext: true,
  });
  const found = answer.ok && answer.fetched !== false ? cleanFound(answer.json) : null;
  if (!found) {
    await paid.refund();
    return Response.json(
      {
        message: !answer.ok
          ? `${answer.error ?? 'The AI could not be reached.'} Nothing was charged.`
          : answer.fetched === false
            ? 'That page could not be read — it may need a login, or block readers. Nothing was charged.'
            : 'That page does not seem to be about something for sale. Nothing was charged.',
      },
      { status: 502 },
    );
  }

  void note('image', PER_LINK, 'gemini-flash', caller?.id);

  return Response.json({ found }, { headers: { 'Cache-Control': 'no-store' } });
}
