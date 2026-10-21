/**
 * Hear the backup voice on purpose, before a member hears it by accident.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 *
 * The owner, 21 October 2026: *"Ja, bou die toets knoppie vir die
 * rugsteunstem."*
 *
 * Google reads aloud only when ElevenLabs cannot (`lib/server/googlevoice.ts`),
 * so the first time anybody would hear it is the day ElevenLabs is busy — in
 * front of a member, in Afrikaans, which is not on Google's first published
 * language list for these voices. This reads one line through exactly the same
 * code a member's busy read goes through, and then hands that audio straight
 * back to the backup listener, so one press answers both halves: does it SOUND
 * right, and does the transcriber HEAR it right.
 *
 * ── What it costs, and the ceiling on it ─────────────────────────────────
 *
 * A line of up to 400 characters: under 10 cents for the read and the listen
 * together, at Google's published rates. Counted against Google's sound
 * ceiling like any backup read, so it cannot run away.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * Behind the owner's own sign-in, or POST_SECRET — see `ownerdoor.ts`. It
 * spends money. Nothing of a member's is read or kept.
 */

import { opened } from '@/app/lib/server/ownerdoor';
import { backupReady, BACKUP_VOICES, hearBackup, speakBackup } from '@/app/lib/server/googlevoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** The longest line this reads. A test, not a podcast. */
export const MOST = 400;

export async function POST(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;

  if (!backupReady()) {
    return Response.json(
      { error: 'no_google', message: 'GOOGLE_VERTEX_KEY or GOOGLE_PROJECT is not set on this deployment, so there is no backup voice to hear. See docs/GOOGLE-OPSTEL.md.' },
      { status: 503 },
    );
  }

  let body: { text?: unknown; language?: unknown; voice?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return Response.json({ message: 'Type a line to read.' }, { status: 400 });
  if (text.length > MOST) {
    return Response.json({ message: `Keep the test to ${MOST} characters; this one is ${text.length}.` }, { status: 413 });
  }
  const language = body.language === 'en' ? 'en' : 'af';
  const voice = BACKUP_VOICES.includes(String(body.voice)) ? String(body.voice) : BACKUP_VOICES[0];

  const made = await speakBackup(text, { voice, language });
  if (!made.ok) {
    /* Google's own refusal, not the member's sentence: on this page the
       reason IS the answer, and "busy" would hide a wrong model name. */
    return Response.json({ step: 'read', message: made.message, status: made.status }, { status: 502 });
  }

  /* The same audio, back through the backup listener. Seconds from the WAV
     itself: 16-bit mono, so two bytes a sample. */
  const rate = new DataView(made.audio).getUint32(24, true) || 24000;
  const seconds = Math.max(1, Math.round((made.audio.byteLength - 44) / 2 / rate));
  const heard = await hearBackup(new Blob([made.audio], { type: 'audio/wav' }), { seconds, speakers: false });

  return Response.json({
    audio: Buffer.from(made.audio).toString('base64'),
    type: 'audio/wav',
    model: made.model,
    voice,
    language,
    seconds,
    heard: heard.ok ? heard.text : null,
    heardModel: heard.ok ? heard.model : null,
    ...(heard.ok ? {} : { heardProblem: heard.message }),
  });
}
