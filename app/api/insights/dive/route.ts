/**
 * Future Insights Deep Dive powered by Google Gemini.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Provides instant, deep-dive frontier analysis on any technology article,
 * emerging AI concept, vibecoding trend, or visionary podcast in FutureInsightsHub.
 *
 * Returns structured executive takeaways, African & global creator impact,
 * and tangible builder opportunities.
 */

import { callerFrom } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';
import { askGemini, isGeminiConfigured } from '@/app/lib/server/gemini';
import { screen } from '@/app/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const LIMITS = { perMinute: 15, perHour: 100 };

interface InsightsDiveRequestBody {
  articleId?: string;
  title?: string;
  category?: string;
  summary?: string;
  language?: 'af' | 'en';
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('insights_dive', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' },
      { status: 429 },
    );
  }

  if (!isGeminiConfigured()) {
    return Response.json(
      { error: 'no_key', message: 'Google Gemini API is not configured on this server.' },
      { status: 503 },
    );
  }

  let body: InsightsDiveRequestBody;
  try {
    body = (await request.json()) as InsightsDiveRequestBody;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Invalid JSON body.' }, { status: 400 });
  }

  const title = (body.title || 'Frontier AI & Technology Insights').trim();
  const caller = await callerFrom(request);

  // Moderate topic
  const screened = screen(title, 'room');
  if (screened) {
    return Response.json({ error: 'moderation_refusal', message: screened.message }, { status: 400 });
  }

  const lang = body.language === 'af' ? 'af' : 'en';
  const category = body.category || 'tech';
  const summary = (body.summary || '').trim();

  const systemPrompt = `You are the Lead Frontier Technology Analyst and Strategist for FutureBox.
FutureBox is a sovereign creator and AI studio platform based in South Africa with global reach.
You deliver high-impact, ad-free, visionary thought leadership.
Format your answer strictly as a valid JSON object with the following schema:
{
  "headline": "A punchy, visionary 1-sentence insight",
  "takeaways": [
    "Key strategic takeaway 1",
    "Key strategic takeaway 2",
    "Key strategic takeaway 3"
  ],
  "creatorImpact": "How this shifts the ground for creators, developers, and creative businesses",
  "actionItem": "What a visionary builder should do or build today"
}
Language: ${lang === 'af' ? 'Afrikaans (clear, professional, modern vocabulary, correct kappies/deeltekens)' : 'English'}.
Do not wrap in markdown or add explanatory text outside the JSON.`;

  const userPrompt = `Perform a high-level strategic deep dive on this insight topic:
Title: "${title}"
Category: "${category}"
Context: "${summary}"`;

  const geminiRes = await askGemini({
    systemInstruction: systemPrompt,
    prompt: userPrompt,
    jsonOutput: true,
    temperature: 0.7,
    maxOutputTokens: 1000,
  });

  if (!geminiRes.ok) {
    return Response.json(
      { error: 'gemini_error', message: geminiRes.error || 'Failed to generate insight analysis.' },
      { status: geminiRes.status || 500 },
    );
  }

  let outputData = geminiRes.json;
  if (!outputData && geminiRes.text) {
    try {
      const clean = geminiRes.text.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1').trim();
      outputData = JSON.parse(clean);
    } catch {
      outputData = {
        headline: title,
        takeaways: [geminiRes.text.slice(0, 150)],
        creatorImpact: 'Advancing autonomous tools for creator sovereignty.',
        actionItem: 'Explore integrating frontier models into creative workflows.',
      };
    }
  }

  return Response.json({
    ok: true,
    data: outputData,
    title,
    language: lang,
  });
}
