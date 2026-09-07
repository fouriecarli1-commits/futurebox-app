'use client';

/**
 * Asking what a piece of audio actually is.
 *
 * Chords, key, tempo, where the sections are. Started as a job and polled,
 * because that is what the service does and a page that waited on one request
 * would time out on a long song.
 *
 * Everything that decides anything is on the server. What is here is the two
 * calls and the waiting.
 */

import { accessToken } from './cloud';
import { TOO_BIG_TO_SEND, attach, dropWork } from './workfile';

export type Reading =
  | {
      readonly ok: true;
      readonly result: Record<string, string>;
      readonly data: Record<string, unknown>;
      /** Outputs that are audio. Fetched one at a time, not in the answer. */
      readonly parts: readonly string[];
      /** The job's own id, which is the handle those parts are fetched by. */
      readonly id: string;
    }
  | { readonly ok: false; readonly message: string };

/** Two seconds between asks. A reading takes tens of seconds, not hundreds. */
const EVERY = 2000;
const GIVE_UP_AFTER = 5 * 60 * 1000;

export async function read(
  audio: Blob,
  seconds: number,
  which: 'read' | 'stems' = 'read',
): Promise<Reading> {
  const form = new FormData();
  form.append('seconds', String(Math.round(seconds)));
  form.append('which', which);

  /* Over the wall, the file goes to storage first and only its key is posted.

     `lane.wav` is uncompressed: 88 kB a second at 44.1 kHz mono, and Vercel
     refuses a request body over about four and a half megabytes at the edge —
     before the route runs, so nothing this app writes gets said. That made
     fifty-one seconds the real ceiling on reading a song, while the route
     claimed sixty megabytes. Everything past it came back as "(413)". */
  const put = await attach(form, audio, 'audio', 'lane.wav');
  if (!put.ok) return { ok: false, message: TOO_BIG_TO_SEND };
  const key = put.key;

  const token = await accessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  let started: Response;
  try {
    started = await fetch('/api/analyse', { method: 'POST', headers, body: form });
  } catch {
    return { ok: false, message: 'Could not reach the app’s server.' };
  }
  const opened = (await started.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!started.ok || !opened.id) {
    /* The scratch file, if the job never started. The route takes it back out
       once it has the bytes; this is the other end, where it never got them. */
    if (key) void dropWork(key);
    /* A 413 with no body is the platform, not the route: nothing this app
       wrote reached her, so it says what it means here instead of showing a
       number. */
    return {
      ok: false,
      message:
        opened.message ??
        (started.status === 413
          ? 'That file is too big to send. Try a shorter piece of it.'
          : 'That could not be read.'),
    };
  }

  const deadline = Date.now() + GIVE_UP_AFTER;
  while (Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, EVERY));
    let asked: Response;
    try {
      asked = await fetch(`/api/analyse?id=${encodeURIComponent(opened.id)}`, { headers });
    } catch {
      continue; // A dropped poll is not a failed job.
    }
    const said = (await asked.json().catch(() => ({}))) as {
      state?: string;
      message?: string;
      result?: Record<string, string>;
      data?: Record<string, unknown>;
      parts?: string[];
    };
    if (said.state === 'failed') {
      return { ok: false, message: said.message ?? 'That recording could not be read.' };
    }
    if (said.state === 'done') {
      return {
        ok: true,
        id: opened.id,
        result: said.result ?? {},
        data: said.data ?? {},
        parts: said.parts ?? [],
      };
    }
  }
  return { ok: false, message: 'That is taking much longer than usual. Try a shorter piece.' };
}

/**
 * One audio output, through this app's own origin.
 *
 * Never the supplier's URL directly: the browser is not allowed to fetch it
 * and widening the Content-Security-Policy for a file that can be streamed
 * here instead is a policy that stops being one.
 */
export async function partOf(id: string, name: string): Promise<Blob | null> {
  try {
    const token = await accessToken();
    const response = await fetch(
      `/api/analyse/part?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    );
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

/**
 * Tell the service the parts have been collected.
 *
 * A job with audio outputs is kept until this is called — it is the handle each
 * part is fetched by — so not calling it leaves somebody's song sitting on a
 * third party's storage for no reason.
 */
export async function done(id: string): Promise<void> {
  try {
    const token = await accessToken();
    await fetch(`/api/analyse?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    // Their job expires on its own. Worth trying, not worth failing over.
  }
}

/* ── Making sense of whatever came back ───────────────────────────────────

   A workflow's outputs are named by whoever built it, so this app cannot know
   in advance that the tempo will be under "bpm" rather than "tempo" — and a
   screen that only understood one spelling would show nothing for the other.

   So nothing here insists on a shape. These read whatever is there, and the
   screen falls back to showing the raw answer when it recognises none of it.
   That is the difference between a room that works with the workflow somebody
   actually set up and one that works with the one we imagined. */

const TEMPO_WORDS = ['bpm', 'tempo'];
const KEY_WORDS = ['key', 'rootkey', 'root', 'tonic'];

function walk(value: unknown, visit: (key: string, value: unknown) => void, depth = 0): void {
  if (depth > 4 || !value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.slice(0, 50).forEach((one) => walk(one, visit, depth + 1));
    return;
  }
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    visit(key.toLowerCase(), inner);
    walk(inner, visit, depth + 1);
  }
}

/** A tempo, wherever in the answer it turned out to live. */
export function tempoIn(data: Record<string, unknown>): number | null {
  let found: number | null = null;
  walk(data, (key, value) => {
    if (found !== null) return;
    if (!TEMPO_WORDS.includes(key)) return;
    const n = typeof value === 'number' ? value : Number(value);
    /* A plausible tempo, not any number that happened to sit under the word.
       Some workflows report a per-beat array under the same name, and taking
       its first element as the tempo would put the metronome at 0.5. */
    if (Number.isFinite(n) && n >= 20 && n <= 300) found = Math.round(n);
  });
  return found;
}

/** And a key, if one is in there. */
export function keyIn(data: Record<string, unknown>): string | null {
  let found: string | null = null;
  walk(data, (key, value) => {
    if (found !== null) return;
    if (!KEY_WORDS.includes(key)) return;
    if (typeof value === 'string' && value.length <= 24 && /[A-G]/i.test(value)) found = value;
  });
  return found;
}

export interface Span {
  readonly label: string;
  readonly at: number;
}

/**
 * Anything that looks like a list of moments with a name on each: chords,
 * sections, beats. Flattened to a label and a time so one component can draw
 * all of them.
 */
export function spansIn(data: Record<string, unknown>): Span[] {
  const out: Span[] = [];
  const take = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    for (const one of value) {
      if (!one || typeof one !== 'object') continue;
      const row = one as Record<string, unknown>;
      const at = ['start', 'startTime', 'time', 'at', 'begin']
        .map((name) => row[name])
        .find((v) => typeof v === 'number');
      const label = ['chord', 'label', 'name', 'section', 'value']
        .map((name) => row[name])
        .find((v) => typeof v === 'string' && v.length <= 40);
      if (typeof at === 'number' && typeof label === 'string') {
        out.push({ label, at });
      }
    }
  };
  for (const value of Object.values(data)) {
    take(value);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const inner of Object.values(value as Record<string, unknown>)) take(inner);
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, 400);
}
