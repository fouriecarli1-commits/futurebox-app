/**
 * Google Gemini API integration for FutureBox.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Provides a unified, resilient interface to Google's Gemini models
 * (Gemini 2.5 Flash, Gemini 1.5 Flash, Gemini 2.5 Pro) for:
 *   - Dialogue & podcast script generation (TwoHosts / PodcastStudio)
 *   - Frontier AI deep dives & executive analysis (FutureInsightsHub)
 *   - Multimodal video enhancements (VideoEditor)
 *   - Intelligent songwriting, rhyming, and copilot reasoning
 *
 * ── Dual Google Authentication ───────────────────────────────────────────
 *
 * Works with BOTH:
 *   1. Vertex AI via `GOOGLE_VERTEX_KEY` + `GOOGLE_PROJECT`
 *   2. Gemini API via `GEMINI_API_KEY` or `GOOGLE_API_KEY`
 *
 * Never leaks keys to the client. Uses native fetch and zero external runtime SDKs.
 */

import { addressOf, flashCall, project as googleProject } from './google';

export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

/** The active key, checked without NEXT_PUBLIC prefix. */
export const geminiKey = (): string =>
  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_VERTEX_KEY ?? '';

/** Whether Google Gemini is configured and ready to be used. */
export const isGeminiConfigured = (): boolean => {
  const k = geminiKey();
  if (!k) return false;
  // If Vertex key is used, project is required; if direct Gemini key, it is self-sufficient
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return true;
  return Boolean(googleProject());
};

/** Build the appropriate Google endpoint URL. */
function geminiEndpoint(model: string, verb = 'generateContent'): string {
  const k = geminiKey();
  // Direct Gemini Developer API
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${verb}`;
  }
  // Vertex AI publisher model endpoint
  return addressOf(model, verb);
}

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

export interface GeminiGenerateOptions {
  model?: string;
  systemInstruction?: string;
  prompt: string;
  parts?: readonly GeminiContentPart[];
  temperature?: number;
  maxOutputTokens?: number;
  jsonOutput?: boolean;
}

export interface GeminiResponse {
  ok: boolean;
  status: number;
  text: string;
  json?: unknown;
  error?: string;
}

/**
 * Generate content using Google's Gemini API.
 */
export async function askGemini(options: GeminiGenerateOptions): Promise<GeminiResponse> {
  const key = geminiKey();
  if (!key) {
    return {
      ok: false,
      status: 503,
      text: '',
      error: 'Google Gemini API is not configured (missing GEMINI_API_KEY or GOOGLE_VERTEX_KEY).',
    };
  }

  const model = options.model || GEMINI_FLASH_MODEL;

  const contentParts: GeminiContentPart[] = [];
  if (options.parts && options.parts.length > 0) {
    contentParts.push(...options.parts);
  }
  if (options.prompt) {
    contentParts.push({ text: options.prompt });
  }

  const bodyPayload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: contentParts,
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.jsonOutput ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (options.systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  try {
    /* Walks on to a later Flash once 2.5 is switched off (`flashCall`). */
    const { response: res } = await flashCall((one) => fetch(geminiEndpoint(one, 'generateContent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(bodyPayload),
    }), model);

    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      let msg = `Gemini answered with status ${res.status}`;
      try {
        const errJson = JSON.parse(raw);
        msg = errJson.error?.message || msg;
      } catch {
        if (raw) msg = raw.slice(0, 200);
      }
      return { ok: false, status: res.status, text: '', error: msg };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, status: 500, text: '', error: 'Could not parse response from Gemini.' };
    }

    const firstCandidate = parsed?.candidates?.[0];
    const textParts = firstCandidate?.content?.parts || [];
    const textOutput = textParts
      .map((p: { text?: string }) => p.text || '')
      .filter(Boolean)
      .join('\n');

    let jsonParsed: unknown = undefined;
    if (options.jsonOutput) {
      // Strip markdown code fences if present
      const clean = textOutput.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1').trim();
      try {
        jsonParsed = JSON.parse(clean);
      } catch {
        jsonParsed = undefined;
      }
    }

    return {
      ok: true,
      status: 200,
      text: textOutput,
      json: jsonParsed,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 502,
      text: '',
      error: err?.message || 'Network error reaching Google Gemini.',
    };
  }
}
