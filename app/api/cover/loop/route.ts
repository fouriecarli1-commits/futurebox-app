/**
 * A song's cover, moving (`lib/coverloop.ts`).
 *
 *   POST   { trackId }        start one; answers with a sealed ticket
 *   GET    ?ticket=…          how is it going; kept beside the cover when done
 *   GET    ?track=…           the moving cover this song has, if any
 *   DELETE ?track=…           take the motion off; the still cover stays
 *
 * Charged before the engine is asked and given back once if it fails, the
 * way `/api/become` does it. The finished clip is copied into our own
 * storage on the poll that finds it done, because fal.ai lets its copy go
 * within the hour; a poll that never comes leaves the credits spent and the
 * clip on fal.ai, so the panel keeps asking until it is kept.
 */
import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { charge, refund } from '@/app/lib/server/credits';
import { falProgress, falQueue, falReady } from '@/app/lib/server/fal';
import { seal, unseal } from '@/app/lib/server/falticket';
import { storageId } from '@/app/lib/server/ownedpath';
import { boughtSleeves } from '@/app/lib/server/boughtcover';
import { stillCoverLink } from '@/app/lib/server/coverlink';
import { CREDITS } from '@/app/lib/credits';
import { LOOP_MODEL, loopInput, loopPath } from '@/app/lib/coverloop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'tracks';
const LINK_SECONDS = 3600;

interface Ticket {
  readonly id: string;
  readonly owner: string;
  readonly track: string;
  readonly credits: number;
  readonly charged: boolean;
  readonly status: string;
  readonly result: string;
}

const FAILED = 'The cover could not be made to move this time. Your credits are back.';

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('coverloop', request, GENERATION);
  if (flood) return flood;
  if (!metered()) return Response.json({ message: 'Moving covers are not switched on here.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  if (!falReady()) return Response.json({ message: 'Moving covers are not switched on yet. Nothing was charged.' }, { status: 503 });
  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { trackId?: unknown } | null;
  const track = String(body?.trackId ?? '');
  if (!track || !storageId(track)) return Response.json({ message: 'Which song?' }, { status: 400 });
  const { data: mine } = await client.from('tracks').select('id').eq('owner', caller.id).eq('id', track).maybeSingle();
  if (!mine) return Response.json({ message: 'That song is not yours.' }, { status: 404 });

  /* The cover the song wears: a bought piece over a made one, as everywhere. */
  const bought = await boughtSleeves(client, [{ owner: caller.id, track }], LINK_SECONDS);
  let cover: string | null = bought.urls[track] ?? null;
  if (!cover) cover = await stillCoverLink(client, caller.id, track, LINK_SECONDS);
  if (!cover) return Response.json({ message: 'Give the song a cover first, then make it move.' }, { status: 409 });

  const paid = await charge(request, CREDITS.coverLoop, 'coverloop');
  if (!paid.ok) return paid.response;
  const sent = await falQueue(LOOP_MODEL, loopInput(cover));
  if ('error' in sent) {
    await paid.refund();
    console.error(`[coverloop] ${LOOP_MODEL} would not take the job: ${sent.error}`);
    return Response.json({ message: 'The engine would not take that just now. Nothing was charged.' }, { status: 502 });
  }
  const ticket: Ticket = {
    id: sent.id, owner: caller.id, track, credits: CREDITS.coverLoop,
    charged: paid.owner !== null, status: sent.status, result: sent.result,
  };
  return Response.json({ ticket: seal(ticket), credits: CREDITS.coverLoop });
}

/** The credits back, once, for a job that did not happen. */
async function giveBack(ticket: Ticket): Promise<void> {
  if (!ticket.charged) return;
  const client = admin();
  const ref = `coverloop:${ticket.id}`;
  if (client) {
    const { data } = await client.from('credit_entries').select('id').eq('owner', ticket.owner).eq('ref', ref).eq('reason', 'refund').limit(1);
    if (data && data.length) return;
  }
  await refund(ticket.owner, ticket.credits, ref);
}

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  const client = admin();
  if (!client) return Response.json({ url: null });
  const asked = new URL(request.url).searchParams;

  const track = asked.get('track');
  if (track) {
    if (!storageId(track)) return Response.json({ url: null });
    const { data } = await client.storage.from(BUCKET).createSignedUrl(loopPath(caller.id, track), LINK_SECONDS);
    return Response.json({ url: data?.signedUrl ?? null });
  }

  const ticket = unseal<Ticket>(asked.get('ticket') ?? '');
  if (!ticket || ticket.owner !== caller.id) return Response.json({ message: 'That is not a job of yours.' }, { status: 403 });
  const now = await falProgress(ticket.status, ticket.result);
  if (now.state === 'waiting') return Response.json({ state: 'waiting' });
  if (now.state === 'done') {
    /* Kept in our storage before it is shown: fal.ai's copy goes within the hour. */
    try {
      const got = await fetch(now.url);
      if (!got.ok) throw new Error(`fetch ${got.status}`);
      const bytes = await got.arrayBuffer();
      const { error } = await client.storage.from(BUCKET)
        .upload(loopPath(caller.id, ticket.track), bytes, { contentType: 'video/mp4', upsert: true });
      if (error) throw new Error(error.message);
      const { data } = await client.storage.from(BUCKET).createSignedUrl(loopPath(caller.id, ticket.track), LINK_SECONDS);
      return Response.json({ state: 'done', url: data?.signedUrl ?? now.url });
    } catch (problem) {
      console.error(`[coverloop] could not keep ${ticket.id}: ${String(problem).slice(0, 200)}`);
      return Response.json({ state: 'waiting' });
    }
  }
  await giveBack(ticket);
  console.error(`[coverloop] ${LOOP_MODEL} job ${ticket.id} failed: ${now.why}`);
  return Response.json({ state: 'failed', message: FAILED });
}

export async function DELETE(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  const client = admin();
  const track = new URL(request.url).searchParams.get('track') ?? '';
  if (!client || !storageId(track)) return Response.json({ message: 'Which song?' }, { status: 400 });
  await client.storage.from(BUCKET).remove([loopPath(caller.id, track)]);
  return Response.json({ ok: true });
}
