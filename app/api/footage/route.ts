/**
 * Taking the background out of a clip, or an item out of it, through fal.ai.
 *
 * Three steps, because the clip is the member's own footage and is too large
 * to pass through a server function:
 *
 *   POST { step: 'upload', type }  → a one-time link to upload the clip
 *        straight into our private `videos` bucket, under the member's own
 *        folder.
 *   POST { step: 'start', job, path, seconds, words, abroad, adult }
 *        → checked, charged, and handed to fal.ai as a fifteen-minute link
 *        to that file. Answers with a sealed ticket for the job.
 *   GET  ?ticket=…  → where the job is. When it is done or has failed, our
 *        copy of the clip is deleted; a failure gives the credits back once.
 *
 * What is decided in `docs/FAL-TERME.md` and held here:
 *
 *  - **Both questions answered yes, every time.** The clip leaves South
 *    Africa (POPIA s72(1)(b), on top of the DPA) and fal.ai's terms need the
 *    person pressing to be 18. The route refuses without both.
 *  - **The words are screened** on the `footage` surface, strict: refused
 *    when the classifier cannot be reached (`check:footage`).
 *  - **Twenty seconds at most.** fal.ai bills by the length of the clip, and
 *    this caps what one press can cost us while a member's own length is
 *    taken on trust.
 *  - **A refusal from fal.ai's moderation is a refusal**: credits back and a
 *    plain sentence, not an error.
 */
import crypto from 'node:crypto';
import { admin, callerFrom } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { CREDITS, filterCost } from '@/app/lib/credits';
import { charge, refund } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { wrote } from '@/app/lib/server/wrote';
import { FAL_MODELS, falProgress, falReady, falSubmit, inputFor, type FalJob } from '@/app/lib/server/fal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'videos';
const MOST_SECONDS = 20;
const LINK_SECONDS = 15 * 60;
const TYPES: Readonly<Record<string, string>> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
const JOBS: readonly FalJob[] = ['cutout', 'erase'];

interface Ticket {
  readonly id: string;
  readonly job: FalJob;
  readonly owner: string;
  readonly path: string;
  readonly credits: number;
  readonly charged: boolean;
  readonly status: string;
  readonly result: string;
}

function secret(): string {
  return process.env.FAL_TICKET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.FAL_KEY || '';
}

function seal(ticket: Ticket): string {
  const body = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  const mark = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mark}`;
}

function unseal(sealed: string): Ticket | null {
  const [body, mark] = sealed.split('.');
  if (!body || !mark || !secret()) return null;
  const want = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mark);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Ticket;
  } catch {
    return null;
  }
}

const off = (): Response => Response.json(
  { error: 'off', message: 'Taking a background or an item out of a clip is not switched on yet on this deployment.' },
  { status: 503 },
);

export async function POST(request: Request): Promise<Response> {
  if (!falReady()) return off();
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first — this uses credits.', signedIn: false }, { status: 401 });
  const client = admin();
  if (!client) return off();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  if (body.step === 'upload') {
    const flood = refuseIfTooMany('footage-upload', request, GENERATION);
    if (flood) return flood;
    const ext = TYPES[String(body.type)];
    if (!ext) return Response.json({ message: 'That is not a video this can send: MP4, WebM or MOV.' }, { status: 415 });
    const path = `${caller.id}/footage/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return Response.json({ message: 'The clip could not be sent just now. Try again.' }, { status: 503 });
    return Response.json({ path, token: data.token });
  }

  if (body.step !== 'start') return Response.json({ message: 'Say which step.' }, { status: 400 });

  const flood = refuseIfTooMany('footage', request, GENERATION);
  if (flood) return flood;

  const job = JOBS.find((one) => one === body.job);
  const path = typeof body.path === 'string' ? body.path : '';
  const seconds = Number(body.seconds);
  const words = typeof body.words === 'string' ? body.words.trim().slice(0, 200) : '';
  if (!job) return Response.json({ message: 'Say which job.' }, { status: 400 });
  if (!path.startsWith(`${caller.id}/footage/`) || path.includes('..')) {
    return Response.json({ message: 'That clip is not yours to send.' }, { status: 403 });
  }
  if (body.abroad !== true || body.adult !== true) {
    return Response.json({ message: 'Both boxes have to be ticked: the clip goes to fal.ai outside South Africa, and this is for people of 18 and older.' }, { status: 400 });
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return Response.json({ message: 'How long is the clip?' }, { status: 400 });
  if (seconds > MOST_SECONDS) {
    return Response.json({ message: `Clips of up to ${MOST_SECONDS} seconds can go. Trim it on your phone first, or split it into pieces.` }, { status: 413 });
  }
  if (job === 'erase' && !words) return Response.json({ message: 'Say what to take out of the clip.' }, { status: 400 });

  /* The words first, strictly: refused when the check cannot run. A
     background removal has no words, and fal.ai's own screening reads the
     footage itself (docs/FAL-TERME.md, Trust & Safety). */
  if (words) {
    const screened = await guard(request, words, 'footage', caller);
    if (!screened.ok) return screened.response;
  }

  const credits = filterCost(seconds, CREDITS[job]);
  const paid = await charge(request, credits, `footage:${job}`);
  if (!paid.ok) return paid.response;

  const { data: link } = await client.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
  if (!link?.signedUrl) {
    await paid.refund();
    return Response.json({ message: 'The clip did not arrive. Bring it in again and try once more.' }, { status: 404 });
  }

  const sent = await falSubmit(job, inputFor(job, link.signedUrl, words));
  if ('error' in sent) {
    await paid.refund();
    console.error(`[footage] ${FAL_MODELS[job]} would not take the job: ${sent.error}`);
    return Response.json({ message: 'The engine would not take that clip just now. Nothing was charged.' }, { status: 502 });
  }

  const ticket: Ticket = {
    id: sent.id,
    job,
    owner: caller.id,
    path,
    credits,
    charged: paid.owner !== null,
    status: sent.status,
    result: sent.result,
  };
  return Response.json({ ticket: seal(ticket), credits });
}

/** Give the credits back once for a job that did not happen. */
async function giveBack(ticket: Ticket): Promise<void> {
  if (!ticket.charged) return;
  const client = admin();
  const ref = `footage:${ticket.id}`;
  if (client) {
    const { data } = await client.from('credit_entries').select('id').eq('owner', ticket.owner).eq('ref', ref).eq('reason', 'refund').limit(1);
    if (data && data.length) return;
  }
  await refund(ticket.owner, ticket.credits, ref);
}

async function dropClip(path: string): Promise<void> {
  const client = admin();
  if (!client) return;
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) console.error(`[footage] our copy of ${path} was not deleted: ${error.message}`);
}

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  const ticket = unseal(new URL(request.url).searchParams.get('ticket') ?? '');
  if (!ticket || ticket.owner !== caller.id) return Response.json({ message: 'That is not a job of yours.' }, { status: 403 });

  const now = await falProgress(ticket.status, ticket.result);
  if (now.state === 'waiting') return Response.json({ state: 'waiting' });

  await dropClip(ticket.path);
  if (now.state === 'done') return Response.json({ state: 'done', url: now.url });

  await giveBack(ticket);
  console.error(`[footage] ${FAL_MODELS[ticket.job]} job ${ticket.id} failed: ${now.why}`);
  if (now.refused) {
    const client = admin();
    if (client) {
      /* Logged beside our own refusals so a pattern is visible, and not
         counted towards a suspension: fal.ai does not say which of its
         rules it was, and a strike for a reason nobody can name is not one. */
      wrote(await client.from('moderation_events').insert({
        owner: caller.id,
        surface: 'footage',
        rule: 'engine',
        counts: false,
        decided_by: 'engine',
        excerpt: null,
      }), 'the fal.ai refusal');
    }
    return Response.json({
      state: 'refused',
      message: 'The engine would not work on this clip: its own safety check stopped it. Your credits are back.',
    });
  }
  return Response.json({ state: 'failed', message: 'That did not work this time. Your credits are back — try again in a moment.' });
}
