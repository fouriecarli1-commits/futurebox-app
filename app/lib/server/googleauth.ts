/**
 * Signing in to Google as the app, for the one API that refuses an API key.
 *
 * ── What was measured ────────────────────────────────────────────────────
 *
 * The owner pressed "Make one song" on `/google`, 21 October 2026, and Lyria
 * answered:
 *
 *   401 — API keys are not supported by this API. Expected OAuth2 access
 *   token or other authentication credentials that assert a principal.
 *
 * That is the `interactions` API — Lyria 3 and Gemini Omni Flash live there
 * (see `google.ts`). Veo and the Gemini models answer to the key; this one
 * wants a signed-in principal. `lyria.ts` had a note waiting for exactly this
 * answer.
 *
 * ── How ──────────────────────────────────────────────────────────────────
 *
 * A service account: a key file made once in her Cloud console, pasted whole
 * into `GOOGLE_SERVICE_ACCOUNT` on Vercel (`docs/SWITCH-ON.md` has the
 * steps). From it this signs a short JWT and trades it at Google's token
 * address for an access token that lasts an hour, kept and reused until five
 * minutes before it runs out. Node's own crypto does the signing; no library.
 *
 * Without the variable nothing changes: the API key goes out as before, and
 * Lyria's 401 is passed on in words that name the missing variable.
 */

import crypto from 'node:crypto';

interface Account {
  readonly client_email: string;
  readonly private_key: string;
  readonly token_uri?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';

/**
 * The key file, as pasted. Plain JSON, or the same JSON in base64 for a
 * dashboard that mangles the private key's line breaks.
 */
export function serviceAccount(): Account | null {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT ?? '').trim();
  if (!raw) return null;
  const tries = [raw];
  if (!raw.startsWith('{')) {
    try { tries.push(Buffer.from(raw, 'base64').toString('utf8')); } catch { /* not base64 */ }
  }
  for (const one of tries) {
    try {
      const parsed = JSON.parse(one) as Partial<Account>;
      if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
        return {
          client_email: parsed.client_email,
          /* A key pasted through a form sometimes arrives with its line
             breaks as the two characters "\n". The PEM reader needs real ones. */
          private_key: parsed.private_key.replace(/\\n/g, '\n'),
          token_uri: typeof parsed.token_uri === 'string' ? parsed.token_uri : undefined,
        };
      }
    } catch { /* try the next reading */ }
  }
  return null;
}

const base64url = (data: Buffer | string): string =>
  Buffer.from(data).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** The signed request for a token. Exported so the check can verify the signature offline. */
export function assertionFor(account: Account, now = Math.floor(Date.now() / 1000)): string {
  const head = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: account.token_uri ?? TOKEN_URI,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${head}.${claims}`);
  return `${head}.${claims}.${base64url(signer.sign(account.private_key))}`;
}

let held: { token: string; until: number } | null = null;

/** An access token for the app's service account, or null when there is none or it was refused. */
export async function accessToken(): Promise<string | null> {
  const account = serviceAccount();
  if (!account) return null;
  if (held && Date.now() < held.until) return held.token;
  try {
    const answer = await fetch(account.token_uri ?? TOKEN_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: assertionFor(account),
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const said = (await answer.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null;
    if (!answer.ok || typeof said?.access_token !== 'string') {
      console.error(`[google] the service account was refused a token (${answer.status})`);
      return null;
    }
    const seconds = typeof said.expires_in === 'number' ? said.expires_in : 3600;
    held = { token: said.access_token, until: Date.now() + Math.max(60, seconds - 300) * 1000 };
    return held.token;
  } catch {
    return null;
  }
}

/**
 * How to authenticate a call to the `interactions` API: the signed-in
 * account when there is one, the API key otherwise.
 */
export async function interactionsAuth(): Promise<Record<string, string>> {
  const token = await accessToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return { 'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '' };
}

/** What to say when Google refuses the key and no account is set. */
export const NEEDS_ACCOUNT = 'Google needs the app to sign in for this engine, and GOOGLE_SERVICE_ACCOUNT is not set on this deployment. See docs/SWITCH-ON.md, "Google: signing in for Lyria".';
