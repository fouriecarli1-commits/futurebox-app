/**
 * Read your song aloud, and get back how each line is to be spelled for the
 * engine to sing it the way you said it. See `lib/server/sayas.ts`.
 *
 * Signed in, screened like every other thing a member writes, braked like
 * every other model call, and nothing kept: the recording is read and
 * dropped, and the lines go back to the page.
 */
import { configured as googleOn } from '@/app/lib/server/google';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { callerFrom, metered } from '@/app/lib/server/account';
import { guard } from '@/app/lib/server/safety';
import { MOST_LINES, hearLines } from '@/app/lib/server/sayas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Base64 characters: about two and a half megabytes of audio, a few minutes of reading, under the platform's wall. */
const MOST_BYTES = 3_500_000;
const MIMES = new Set(['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac']);

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('sayas', request, GENERATION);
  if (flood) return flood;

  const caller = metered() ? await callerFrom(request) : null;
  if (metered() && !caller) {
    return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });
  }
  if (!googleOn()) {
    return Response.json({ message: 'The listening engine is not switched on yet.' }, { status: 503 });
  }

  let said: { audio?: unknown; mime?: unknown; lines?: unknown };
  try {
    said = await request.json() as typeof said;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }
  const audio = String(said.audio ?? '');
  const mime = String(said.mime ?? '').split(';')[0].trim().toLowerCase();
  const lines = (Array.isArray(said.lines) ? said.lines : [])
    .filter((one): one is string => typeof one === 'string')
    .map((one) => one.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MOST_LINES);

  if (!lines.length) return Response.json({ message: 'Write the words first, then read them aloud.' }, { status: 400 });
  if (!audio || !MIMES.has(mime)) return Response.json({ message: 'That recording is not a kind this can read.' }, { status: 400 });
  if (audio.length > MOST_BYTES) {
    return Response.json({ message: 'That reading is too long. Read the words once, at an easy pace — a few minutes at most.' }, { status: 413 });
  }

  const allowed = await guard(request, lines.join('\n'), 'song', caller);
  if (!allowed.ok) return allowed.response;

  const heard = await hearLines({ data: audio, mime }, lines);
  if (!heard.ok) return Response.json({ message: heard.message }, { status: heard.status });
  return Response.json({ lines: heard.lines });
}
