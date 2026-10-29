/**
 * The two-hosts script writer.
 *
 * Writes a conversation between the member's two named hosts on the topic
 * they give, in the tone and length they pick, laid out the way
 * `TwoHosts.tsx` reads a script ("Name: line"). When the plan reads a
 * limited number of characters at a time, the script is asked to fit it, so
 * what comes back can be made as it stands. Afrikaans and English.
 */

import { callerFrom } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';
import { askGemini, isGeminiConfigured } from '@/app/lib/server/gemini';
import { screen } from '@/app/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const LIMITS = { perMinute: 10, perHour: 60 };

interface ScriptRequestBody {
  topic?: string;
  language?: 'af' | 'en';
  tone?: 'visionary' | 'casual' | 'debate' | 'deeptech';
  turns?: number;
  maxChars?: number;
  host1Name?: string;
  host2Name?: string;
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('podcast_script', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' },
      { status: 429 },
    );
  }

  if (!isGeminiConfigured()) {
    return Response.json(
      { error: 'no_key', message: 'The script writer is not switched on yet.' },
      { status: 503 },
    );
  }

  let body: ScriptRequestBody;
  try {
    body = (await request.json()) as ScriptRequestBody;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Invalid JSON body.' }, { status: 400 });
  }

  const topic = (body.topic || 'The Future of AI and Creator Sovereignty').trim();
  const caller = await callerFrom(request);

  // Content moderation check
  const screened = screen(topic, 'room');
  if (screened) {
    return Response.json({ error: 'moderation_refusal', message: screened.message }, { status: 400 });
  }

  const lang = body.language === 'af' ? 'af' : 'en';
  const h1 = (body.host1Name || 'Host 1').trim().slice(0, 40);
  const h2 = (body.host2Name || 'Host 2').trim().slice(0, 40);
  const turnsCount = Math.min(16, Math.max(4, body.turns || 10));
  const tone = (['visionary', 'casual', 'debate', 'deeptech'] as const).find((one) => one === body.tone) ?? 'casual';
  const fit = Number.isFinite(body.maxChars) && (body.maxChars as number) > 0 ? Math.round(body.maxChars as number) : 0;

  const systemPrompt = `You are a world-class podcast producer and scriptwriter for FutureBox.
You write realistic, dynamic, thoughtful conversation between two co-hosts.
Rules:
1. Output format MUST be plain text with each turn starting strictly with the speaker name followed by a colon:
"${h1}: [dialogue line]"
"${h2}: [dialogue line]"
2. Keep each turn natural, concise (1 to 3 sentences), and responsive to what the previous speaker just said.
3. No stage directions, no sound effects, no parentheticals (like [laughs] or (excited)). Only the spoken dialogue.
4. Language: ${lang === 'af' ? 'Afrikaans (authentic South African Afrikaans, natural flow, correct kappies/deeltekens)' : 'English'}.
5. Tone: ${tone} (insightful, forward-looking, conversational).
6. Generate exactly ${turnsCount} alternating dialogue turns.${fit ? `
7. The whole spoken dialogue, not counting the names, must stay under ${Math.round(fit * 0.9)} characters. Shorter turns rather than fewer.` : ''}`;

  const userPrompt = `Write a dual-host podcast dialogue script about: "${topic}".
Speakers: ${h1} and ${h2}.
Output only the script.`;

  const geminiRes = await askGemini({
    systemInstruction: systemPrompt,
    prompt: userPrompt,
    temperature: 0.75,
    maxOutputTokens: 1200,
  });

  if (!geminiRes.ok) {
    return Response.json(
      { error: 'writer_error', message: 'The script could not be written. Try again.' },
      { status: geminiRes.status || 500 },
    );
  }

  return Response.json({
    ok: true,
    script: geminiRes.text.trim(),
    topic,
    language: lang,
    speakers: [h1, h2],
  });
}
