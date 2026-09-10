/**
 * Puts the pronunciation rules onto her ElevenLabs account, from the repo.
 *
 * ── Why a route and not a console ────────────────────────────────────────
 *
 * The rules live in `app/lib/server/sayit.ts` as source, so a change to how
 * Afrikaans is said is reviewable in a diff like everything else. That is
 * only worth anything if the copy ElevenLabs holds comes FROM that file. A
 * dictionary built by typing into their web console is a second copy nobody
 * can see, and the two drift the first time either is touched.
 *
 * So: open this page, it creates the dictionary from `SAY_RULES`, and it
 * hands back the two ids to paste into Vercel. Open it again after changing
 * the rules and it replaces them and reports the NEW version id, which has to
 * be pasted too — a dictionary is addressed by id and version, and a locator
 * left on the old version reads the old way with nothing to show for it.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * It writes to her account, so it refuses without `POST_SECRET` rather than
 * defaulting to open, compared in constant time like the other owner pages.
 *
 * ── Not verified against the live API ────────────────────────────────────
 *
 * The proxy blocks elevenlabs.io from the machine this was written on, so the
 * endpoint shapes come off the pages Carli sent and nothing here has ever had
 * a real answer back. It is written to fail loudly rather than plausibly: an
 * answer whose shape it does not recognise is reported as such, with what
 * came back, instead of being mapped to an empty result. "Could not ask" is
 * not "the answer is none" — that distinction has now cost this app more
 * mornings than any other single mistake.
 */

import crypto from 'node:crypto';
import { SAY_RULES, asRules, locators } from '@/app/lib/server/sayit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://api.elevenlabs.io/v1';
const NAME = 'FutureBox Afrikaans';

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Their answer, whatever shape it is in. Never assumed. */
async function readBack(response: Response): Promise<unknown> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { notJson: raw.slice(0, 500) };
  }
}

const idsFrom = (answer: unknown): { id?: string; version?: string } => {
  if (!answer || typeof answer !== 'object') return {};
  const o = answer as Record<string, unknown>;
  return {
    id: typeof o.id === 'string' ? o.id : undefined,
    version: typeof o.version_id === 'string' ? o.version_id : undefined,
  };
};

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const url = new URL(request.url);
  if (!wanted || !sameSecret(url.searchParams.get('key') ?? '', wanted)) {
    return new Response('no', { status: 404 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  if (!apiKey) {
    return Response.json(
      { ok: false, why: 'ELEVENLABS_API_KEY is not set, so nothing can be asked.' },
      { status: 503 },
    );
  }

  const rules = asRules();
  const existing = process.env.ELEVEN_DICT_ID;

  /* Two paths, because they are different endpoints and confusing them is how
     a second dictionary appears on the account. With an id set we REPLACE the
     rules in it; without one we make it. `set-rules` rather than `add-rules`:
     a rule removed from the source file has to disappear from the dictionary
     too, and add-rules would leave it there for ever. */
  const to = existing
    ? `${BASE}/pronunciation-dictionaries/${encodeURIComponent(existing)}/set-rules`
    : `${BASE}/pronunciation-dictionaries/add-from-rules`;

  const body = existing ? { rules } : { name: NAME, rules };

  let response: Response;
  try {
    response = await fetch(to, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (problem) {
    return Response.json(
      {
        ok: false,
        why: 'The request never reached ElevenLabs.',
        what: problem instanceof Error ? problem.message : String(problem),
        sent: { to, rules: rules.length },
      },
      { status: 502 },
    );
  }

  const answer = await readBack(response);
  if (!response.ok) {
    return Response.json(
      { ok: false, status: response.status, why: 'ElevenLabs refused.', answer, sent: { to } },
      { status: 502 },
    );
  }

  const { id, version } = idsFrom(answer);
  if (!id || !version) {
    /* Reported as unreadable, never as done. An answer we cannot find the ids
       in might still have created the dictionary, and saying "ok" here would
       leave her pasting nothing while a dictionary sits on the account. */
    return Response.json({
      ok: false,
      why: 'It answered, but not in a shape with an id and a version_id in it. Send this back.',
      answer,
    });
  }

  return Response.json({
    ok: true,
    did: existing ? 'replaced the rules in the dictionary you already have' : 'made a new dictionary',
    name: NAME,
    rules: SAY_RULES.length,
    /* Both, every time, including when only the version changed — because
       only changing one of them is the mistake this is for. */
    setInVercel: { ELEVEN_DICT_ID: id, ELEVEN_DICT_VERSION: version },
    nowLive: locators().length > 0
      ? 'A dictionary is already being applied to every read. Paste these and redeploy so the new version is the one used.'
      : 'Nothing is being applied to reads yet. Paste both of these into Vercel and redeploy.',
    /* What went up, so the answer is checkable without opening the file. */
    sent: SAY_RULES.map((rule) => `${rule.string_to_replace} → ${rule.alias}`),
  });
}
