'use client';

/**
 * A take you filmed, kept where the rest of your work is kept.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"die video nie in die channel save nie, sodat
 * dit later in die live channel gedeel kan word nie."*
 *
 * A take filmed against the words on screen was offered exactly one thing:
 * Download. It went into the phone's files and out of this app's knowledge —
 * so the room could not post it, the channel could not show it, and a second
 * device had never heard of it.
 *
 * ── Why the file does not go through a route ─────────────────────────────
 *
 * A minute of 1080p is tens of megabytes and the platform refuses a request
 * body over about four and a half, at the edge, before the route runs. Same
 * wall as `lib/workfile.ts`, same way round it: the browser writes the file
 * straight into the bucket with its own signed-in session, and the route is
 * handed the key.
 *
 * `supabase/livevideo.sql` grants that write narrowly — only inside
 * `<own id>/filmed/`, so it cannot land on `<own id>/<video id>.mp4`, where a
 * paid render lives. The ROW is still written on the server, which is the
 * rule `video.sql` set and this does not touch.
 */

import { currentAccount, getStorageClient, accessToken } from './cloud';

const BUCKET = 'videos';

export type Kept =
  | { readonly ok: true; readonly id: string; readonly url: string | null }
  | { readonly ok: false; readonly why: 'signed_out' | 'upload' | 'refused'; readonly message: string };

/** mp4 or webm, taken from what the recorder actually produced. */
function extensionOf(blob: Blob): 'mp4' | 'webm' {
  return blob.type.includes('mp4') ? 'mp4' : 'webm';
}

/**
 * Put the take in the bucket, then tell the server it is there.
 *
 * Two steps and not one, and the order matters: a row written before the file
 * exists is a video in a list that plays as an error, which is worse than no
 * video at all. The route checks the object is really there before it writes
 * anything, so a half-finished upload comes back as a sentence rather than as
 * a broken row.
 */
export async function keepFilmed(
  take: Blob,
  title: string,
  seconds: number,
): Promise<Kept> {
  const storage = getStorageClient();
  const account = await currentAccount();
  if (!storage || !account) {
    return {
      ok: false,
      why: 'signed_out',
      message: 'Sign in first, so the take is saved to your account.',
    };
  }

  /* A uuid, so nothing about the name is guessable and two takes kept in the
     same second cannot land on each other. The policy forbids replacing, so a
     collision would be a refusal rather than a silent overwrite. */
  const name =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const key = `${account.id}/filmed/${name}.${extensionOf(take)}`;

  const put = await storage.from(BUCKET).upload(key, take, {
    contentType: take.type || 'video/mp4',
    upsert: false,
  });
  if (put.error) {
    return { ok: false, why: 'upload', message: put.error.message };
  }

  const token = await accessToken();
  const response = await fetch('/api/video/kept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path: key, title, seconds }),
  });
  const said = (await response.json().catch(() => null)) as
    | { id?: string; url?: string | null; message?: string }
    | null;
  if (!response.ok || !said?.id) {
    return { ok: false, why: 'refused', message: said?.message ?? 'That take could not be kept.' };
  }
  return { ok: true, id: said.id, url: said.url ?? null };
}

/** One of your kept videos, as the room's composer needs it. */
export interface MyVideo {
  readonly id: string;
  readonly title: string;
  readonly seconds: number;
  readonly filmed: boolean;
  readonly createdAt: string;
}

/** Everything of yours that could go in the live room. Empty when signed out. */
export async function myVideos(): Promise<MyVideo[]> {
  const token = await accessToken();
  try {
    const response = await fetch('/api/video/kept', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return [];
    const said = (await response.json()) as { videos?: MyVideo[] };
    return Array.isArray(said.videos) ? said.videos : [];
  } catch {
    return [];
  }
}
