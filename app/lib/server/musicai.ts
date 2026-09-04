/**
 * Music.ai, for the things this app cannot work out on its own.
 *
 * ── What it is here for ──────────────────────────────────────────────────
 *
 * Chords, key, tempo, the sections of a song, and stems by name rather than
 * the two ElevenLabs gives. Every one of those is a machine-learning problem
 * that this app has no business trying to solve in a browser, and every one of
 * them is a control somebody expects to find in a studio.
 *
 * ── Every endpoint and field below is read off their own SDK ─────────────
 *
 * `@music.ai/sdk` v1.0.26, not from memory. Same rule as `paystack.ts` and for
 * the same reason: an invented field name fails at run time, in production, on
 * somebody's paid job.
 *
 *   GET    /upload          → { uploadUrl, downloadUrl }. PUT the bytes to the
 *                             first; hand the second to a job.
 *   POST   /job             { name, workflow, params, metadata } → { id }
 *   GET    /job/{id}        → the whole job, including `result`
 *   GET    /job/{id}/status → { id, status } and nothing else
 *   DELETE /job/{id}
 *   GET    /workflow        → { workflows: [{ id, name, slug, ... }] }
 *   GET    /application     → { id, name }
 *
 * Two things about their auth that are easy to get wrong. The header is
 * `Authorization: <key>` with **no** `Bearer` in front of it, and a failure
 * comes back as HTTP 200 with a status of FAILED as often as it comes back as
 * an HTTP error — so both have to be read.
 *
 * ── Workflows are theirs, not ours ───────────────────────────────────────
 *
 * A job names a workflow by slug, and a slug is something the account holder
 * creates in the Music.ai dashboard. This app cannot know what somebody called
 * theirs. So the slugs live in the environment, `listWorkflows` exists so the
 * owner can read the real ones off their own account, and a feature whose slug
 * is not set says it is not set up rather than guessing a name and failing
 * against a bill.
 */

const BASE = 'https://api.music.ai/v1';

function key(): string {
  return process.env.MUSIC_AI_API_KEY ?? '';
}

export function configured(): boolean {
  return Boolean(key());
}

export type JobStatus = 'QUEUED' | 'STARTED' | 'SUCCEEDED' | 'FAILED';

export interface Job {
  readonly id: string;
  readonly status: JobStatus;
  /** Output name → a URL, or a value. Shaped by whichever workflow ran. */
  readonly result?: Record<string, string>;
  readonly error?: { code?: string; title?: string; message?: string } | null;
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
}

/**
 * The slugs, from the environment.
 *
 * `music-ai/generate-chords` and `music-ai/isolate-drums` are the two their own
 * README uses, so they are the defaults — but a default is a guess about
 * somebody else's account and the route says so rather than letting a job fail
 * with a bill attached.
 */
export const WORKFLOWS = {
  read: () => process.env.MUSIC_AI_WORKFLOW_READ ?? '',
  stems: () => process.env.MUSIC_AI_WORKFLOW_STEMS ?? '',
} as const;

export type Which = keyof typeof WORKFLOWS;

export function slugFor(which: Which): string {
  return WORKFLOWS[which]();
}

async function call<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T | null> {
  const secret = key();
  if (!secret) return null;
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        // No "Bearer". Their SDK sends the key raw and their server refuses it
        // with one, which reads as a wrong key rather than a wrong header.
        Authorization: secret,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as T | null;
}

/**
 * Put a file on their temporary store and get back a URL a job can read.
 *
 * Two calls: they hand out a pair of signed URLs, the bytes go to the first
 * with a PUT, and the second is what the job is given. The file never passes
 * through anything of ours twice.
 */
export async function upload(audio: Blob): Promise<string | null> {
  const pair = await call<{ uploadUrl?: string; downloadUrl?: string }>('GET', '/upload');
  if (!pair?.uploadUrl || !pair.downloadUrl) return null;
  try {
    const put = await fetch(pair.uploadUrl, { method: 'PUT', body: audio });
    if (!put.ok) return null;
  } catch {
    return null;
  }
  return pair.downloadUrl;
}

export async function addJob(
  name: string,
  workflow: string,
  params: Record<string, unknown>,
): Promise<string | null> {
  const started = await call<{ id?: string }>('POST', '/job', { name, workflow, params });
  return started?.id ?? null;
}

export async function jobOf(id: string): Promise<Job | null> {
  return call<Job>('GET', `/job/${encodeURIComponent(id)}`);
}

/**
 * Their job store is not ours to fill.
 *
 * Every finished job sits on their account until it is deleted, and this app
 * creates one per analysis. Tidied up as soon as the result has been read, and
 * a failure to delete is not worth failing the request over — the result is
 * already in the caller's hands.
 */
export async function forget(id: string): Promise<void> {
  await call<unknown>('DELETE', `/job/${encodeURIComponent(id)}`);
}

/** The real slugs on this account, so the owner does not have to guess. */
export async function listWorkflows(): Promise<Workflow[]> {
  const said = await call<{ workflows?: Workflow[] }>('GET', '/workflow?size=100');
  return said?.workflows ?? [];
}

/** Whether the key works at all, for a setup screen to be able to say so. */
export async function whoAmI(): Promise<{ id: string; name: string } | null> {
  return call<{ id: string; name: string }>('GET', '/application');
}
