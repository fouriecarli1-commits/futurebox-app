/**
 * One page of a child's story, read the way a podcast is.
 *
 * The owner, 19 October 2026: *"die voorlesing moet so mooi wees soos die
 * podcast. Dalk 'n paar avatar stemme opstel."* So a page goes through the
 * same ElevenLabs dialogue the podcast room uses — the storyteller and the
 * characters hearing each other — and not through the phone's own voice.
 *
 * Different from `api/dialogue` in the three ways a child's room is:
 *
 * **Personas, never voice ids.** The page names "owl" and "pip"; the voices
 * behind them are chosen here from the stock list (`lib/kidsvoices.ts`).
 * Nobody's own cloned voice can be asked for, because no id is taken.
 *
 * **Paid by the kids room.** A parent with a kids pack and no plan is who
 * this room is for, so the room's allowance lets it through (`kidsCovers`),
 * as it does for the room's songs and pictures. The podcast caps — a free
 * account's three readings a day — are a grown-up's limits, not a book's.
 *
 * **One page a request.** A page is a few hundred characters, priced as one
 * reading, so a book that stops halfway has only paid for the pages read.
 */
import { callerFrom, metered } from '@/app/lib/server/account';
import { refuseIfTooMany } from '@/app/lib/server/brake';
import { guard } from '@/app/lib/server/safety';
import { configured, converse, stockVoices } from '@/app/lib/server/eleven';
import { kidsCovers } from '@/app/lib/server/kidsmode';
import { wavOf } from '@/app/lib/pcmwav';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { readCost } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { bare, castVoices, kidVoice, STORYTELLERS, type KidVoiceId } from '@/app/lib/kidsvoices';
import { backupReady, fallsBack, speakTurnsBackup } from '@/app/lib/server/googlevoice';
import { READ_MOST_CHARS } from '@/app/lib/kidstory';
import type { Turn } from '@/app/lib/dialogue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Google's voice for each persona, when ElevenLabs cannot read the page.
 * Only the eight voices Google launched with, so a name cannot be one an
 * account does not have; matched to how each persona is described.
 */
const BACKUP_PERSONA: Readonly<Record<KidVoiceId, string>> = {
  owl: 'Charon', // warm and wise
  fairy: 'Leda', // soft and sparkly
  comet: 'Fenrir', // bold and excited
  ember: 'Zephyr', // playful and giggly
  bruno: 'Orus', // deep and cuddly
  pip: 'Puck', // tiny and quick
};

/** A book's six pages read a few at a time, and a few books an hour. */
const PAGES = { perMinute: 10, perHour: 80 };

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('kids-read', request, PAGES);
  if (flood) return flood;

  let body: { lines?: { who?: unknown; text?: unknown }[]; lang?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .map((one) => ({ who: kidVoice(one?.who), text: String(one?.text ?? '').trim() }))
    .filter((one) => one.text);
  if (!lines.length) return Response.json({ message: 'There is nothing on this page to read.' }, { status: 400 });
  if (lines.some((one) => !one.who)) return Response.json({ message: 'That is not one of the story voices.' }, { status: 400 });
  const characters = lines.reduce((all, one) => all + one.text.length, 0);
  if (characters > READ_MOST_CHARS) {
    return Response.json({ message: 'That page is longer than one reading.' }, { status: 413 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const allowed = await guard(request, lines.map((one) => one.text).join('\n'), 'speech', caller);
  if (!allowed.ok) return allowed.response;

  /* Google reads the page when ElevenLabs cannot — busy, down or not
     switched on — so a child's book is not silent on a busy evening. Each
     persona keeps a voice of its own (`BACKUP_PERSONA`). */
  const viaEleven = configured();
  if (!viaEleven && !backupReady()) {
    return Response.json({ message: 'The story voices are not switched on yet.' }, { status: 503 });
  }

  if (metered()) {
    const kidsPaid = caller !== null && (await kidsCovers(caller.id));
    if (!kidsPaid && !PODCAST_CAPS[caller?.tier ?? 'free'].publish) {
      return Response.json(
        { message: 'The story voices are paid from the kids room’s credits. Ask a grown-up to add some.', needsPlan: true },
        { status: 402 },
      );
    }
  }

  const lang = body.lang === 'af' ? 'af' : 'en';
  const paid = await charge(request, readCost(characters), 'read');
  if (!paid.ok) return paid.response;

  /** The same page, read by Google. Stage directions like `[giggles]` are
      taken out: only ElevenLabs' newest model performs them. */
  const backup = async (): Promise<Response> => {
    const made = await speakTurnsBackup(
      lines.map((one) => ({ voice: BACKUP_PERSONA[one.who!.id], text: bare(one.text) })),
      { language: lang, owner: caller?.id ?? null },
    );
    if (!made.ok) {
      await paid.refund();
      return Response.json({ message: made.message }, { status: made.status });
    }
    return new Response(made.audio, {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-Model': made.model, 'X-Read-Engine': 'backup' },
    });
  };
  if (!viaEleven) return backup();

  const voices = castVoices(await stockVoices());
  const turns: Turn[] = lines.map((one) => ({ voiceId: voices[one.who!.id], text: one.text }));

  const said = await converse(turns, lang).catch(() => ({ ok: false as const, status: 0, message: 'The story voices could not be reached.' }));
  if (!said.ok && fallsBack(said.status) && backupReady()) return backup();
  if (!said.ok) {
    await paid.refund();
    return Response.json({ message: said.message }, { status: said.status || 502 });
  }

  return new Response(new Uint8Array(wavOf(said.spoken.pcm, said.spoken.rate)), {
    headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-Model': said.spoken.model },
  });
}

/**
 * Whether the voices are on, and which stock voice each storyteller is, so
 * the picker can play a sample through `/api/voice/preview` before anything
 * is spent.
 */
export async function GET(): Promise<Response> {
  if (!configured()) return Response.json({ available: false, samples: {} });
  const voices = castVoices(await stockVoices());
  return Response.json({
    available: true,
    samples: Object.fromEntries(STORYTELLERS.map((one) => [one.id, voices[one.id]])),
  });
}
