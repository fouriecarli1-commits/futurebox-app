/**
 * Is this song somebody else's record? Asked of AudD's music recognition.
 *
 * The owner, 30 October 2026: *"Het google nie 'n produk wat ons kan gebruik om
 * te check vir plagiaat nie. As mense songs kan in bring kan dit legal issues
 * veroorsaak."* Google has no such service for apps; AudD listens to a short
 * piece of a song and says whether it is a known commercial recording, by
 * whom, with a link. That is what a platform's own copyright system would
 * also find, said here before anything is posted rather than after the
 * takedown.
 *
 * ── What is sent, and what is not ────────────────────────────────────────
 * Twenty seconds from inside the song, made small on the phone (one channel,
 * a low rate). Not the whole song, not the name the file had, not who sent it.
 * AudD is named on the privacy page as the company that hears it.
 *
 * ── What it can say ──────────────────────────────────────────────────────
 * "matched": a known recording, and which. "clear": nothing in the database
 * sounded like it, which is not a promise that it is anybody's own work, and
 * the screen does not say it is. "unchecked": no key on this deployment, or
 * the service did not answer; the phone says so and nothing is held up.
 *
 * No credits: the cost to us is about half a cent a song, and a check that
 * protects the people in the live room is not something a member should have
 * to decide to pay for.
 */
import { callerFrom, metered } from '@/app/lib/server/account';
import { refuseIfTooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Twenty seconds of one-channel 16 kHz audio is about 640 kB; this leaves room. */
const MOST_BYTES = 2_000_000;

export interface SongMatch {
  readonly title: string;
  readonly artist: string;
  readonly link?: string;
}

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('songcheck', request, { perMinute: 6, perHour: 60 });
  if (flood) return flood;

  const token = (process.env.AUDD_API_TOKEN ?? '').trim();
  if (!token) return Response.json({ state: 'unchecked', why: 'not-set-up' });

  if (!metered()) return Response.json({ state: 'unchecked', why: 'no-accounts' });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }
  const piece = form.get('piece');
  if (!(piece instanceof Blob) || piece.size === 0 || piece.size > MOST_BYTES) {
    return Response.json({ message: 'That piece of the song could not be used.' }, { status: 400 });
  }

  const ask = new FormData();
  ask.set('api_token', token);
  ask.set('file', piece, 'piece.wav');
  try {
    const answer = await fetch('https://api.audd.io/', { method: 'POST', body: ask, signal: AbortSignal.timeout(20_000) });
    const got = (await answer.json().catch(() => null)) as {
      status?: string;
      result?: { title?: unknown; artist?: unknown; song_link?: unknown } | null;
    } | null;
    if (!answer.ok || !got || got.status !== 'success') return Response.json({ state: 'unchecked', why: 'no-answer' });
    const found = got.result;
    if (!found || typeof found.title !== 'string' || typeof found.artist !== 'string') {
      return Response.json({ state: 'clear' });
    }
    const match: SongMatch = {
      title: found.title.slice(0, 200),
      artist: found.artist.slice(0, 200),
      ...(typeof found.song_link === 'string' && /^https:\/\//.test(found.song_link) ? { link: found.song_link.slice(0, 300) } : {}),
    };
    return Response.json({ state: 'matched', match });
  } catch {
    return Response.json({ state: 'unchecked', why: 'no-answer' });
  }
}
