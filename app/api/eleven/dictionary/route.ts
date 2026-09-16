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

/**
 * The dictionary already on the account carrying our name, if there is one.
 *
 * A listing that fails is not "there is no dictionary" — it is a listing that
 * failed, and making a second dictionary on the strength of a question that
 * was never answered is how an account ends up with two of them, one
 * reachable and one not. So it returns `undefined` for both "none" and
 * "could not ask", and the caller says which path it took in the answer.
 */
async function byName(apiKey: string): Promise<string | undefined> {
  try {
    const listed = await fetch(`${BASE}/pronunciation-dictionaries?page_size=100`, {
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store',
    });
    if (!listed.ok) return undefined;
    const body = (await listed.json().catch(() => null)) as
      | { pronunciation_dictionaries?: { id?: unknown; name?: unknown }[] }
      | null;
    const mine = body?.pronunciation_dictionaries?.find(
      (one) => typeof one?.name === 'string' && one.name === NAME,
    );
    return mine && typeof mine.id === 'string' ? mine.id : undefined;
  } catch {
    return undefined;
  }
}

/** Their 404 for "that dictionary is not on this account". */
function isMissing(status: number, answer: unknown): boolean {
  if (status !== 404) return false;
  const detail = (answer as { detail?: { status?: unknown } } | null)?.detail;
  return typeof detail?.status === 'string' && detail.status === 'pronunciation_dictionary_not_found';
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

  /* ── Which dictionary, and why this is not just the env var ───────────
 
     With ELEVEN_DICT_ID set this replaces the rules in it. Without one it
     makes a new dictionary — and the first version of this route stopped
     there, which had a hole in it worth a paragraph.
 
     The sequence that breaks it is the ordinary one: she opens this page,
     it makes a dictionary, she does not paste the ids straight away, she
     opens it again the next day. Two dictionaries on the account with the
     same name, one of them reachable and one of them not, and no way to
     tell from here which id she eventually pasted. A setup page that is
     safe to open once and not twice is a setup page that will be opened
     twice.
 
     So it looks first. A dictionary already carrying this name is the one
     to update, whatever the env var says or does not say. */
  let existing = process.env.ELEVEN_DICT_ID;
  let staleId: string | undefined;
  if (!existing) existing = await byName(apiKey);

  /* Two paths, because they are different endpoints and confusing them is how
     a second dictionary appears on the account. With an id set we REPLACE the
     rules in it; without one we make it. `set-rules` rather than `add-rules`:
     a rule removed from the source file has to disappear from the dictionary
     too, and add-rules would leave it there for ever. */
  const ask = async (id: string | undefined) => {
    const to = id
      ? `${BASE}/pronunciation-dictionaries/${encodeURIComponent(id)}/set-rules`
      : `${BASE}/pronunciation-dictionaries/add-from-rules`;
    const response = await fetch(to, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { rules } : { name: NAME, rules }),
    });
    return { to, response, answer: await readBack(response) };
  };

  let got: { to: string; response: Response; answer: unknown };
  try {
    got = await ask(existing);

    /* ── A pasted id that points at nothing ────────────────────────────────
 
       Found on 16 September 2026, the first time this page was ever opened
       against a real account. `ELEVEN_DICT_ID` was set in Vercel to a
       dictionary that is not on the account — deleted, or made under another
       account, or simply never finished — and `set-rules` answered 404
       `pronunciation_dictionary_not_found`.
 
       The route reported that faithfully and stopped, which is the right
       half of the behaviour and useless as the whole of it: the env var is
       the very thing the page exists to produce, so a stale one left her
       with no way forward except deleting a variable she had just been told
       to set.
 
       A 404 on set-rules is the one refusal that is safe to recover from.
       It is ElevenLabs saying that id is not here, so looking again by name
       and then creating cannot produce a duplicate — the thing we would be
       duplicating does not exist. Any other refusal still stops.
 
       The name lookup comes first even so: the dictionary may be on the
       account under a different id, and updating it beats making a second
       one with the same name. */
    if (isMissing(got.response.status, got.answer) && existing) {
      staleId = existing;
      const found = await byName(apiKey);
      existing = found && found !== staleId ? found : undefined;
      got = await ask(existing);
    }
  } catch (problem) {
    return Response.json(
      {
        ok: false,
        why: 'The request never reached ElevenLabs.',
        what: problem instanceof Error ? problem.message : String(problem),
        sent: { rules: rules.length },
      },
      { status: 502 },
    );
  }

  const { to, response, answer } = got;
  if (!response.ok) {
    return Response.json(
      {
        ok: false,
        status: response.status,
        why: 'ElevenLabs refused.',
        answer,
        sent: { to },
        ...(staleId
          ? {
              note:
                `ELEVEN_DICT_ID was set to ${staleId}, which is not on this account. ` +
                'That one was skipped and this is what the retry said.',
            }
          : {}),
      },
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
    ...(staleId
      ? {
          replaced:
            `ELEVEN_DICT_ID was ${staleId}, which is not on this account any more. ` +
            'Both values below are new — paste BOTH into Vercel, do not keep the old id.',
        }
      : {}),
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
