/**
 * Reading a song: chords, key, tempo, and where the sections are.
 *
 * ── Why this is a route and not a library ────────────────────────────────
 *
 * The key stays on the server, and so does the decision about what a job
 * costs. Everything else here is plumbing around one fact: Music.ai jobs are
 * asynchronous. A song is uploaded, a job is started, and the answer arrives
 * some seconds later — so this is a POST that starts and a GET that asks,
 * exactly as the cover route and the video route already work. A page that
 * waited on one request would be a page that times out on a long song.
 *
 * ── Where the money goes, and where it comes back ────────────────────────
 *
 * Charged at the start, refunded if the job never gets going. Once it has
 * started it is billed upstream whatever happens, so a job that comes back
 * FAILED is not refunded and says so — that is their bill, not a fault of the
 * member's, and pretending otherwise would mean this app pays for every
 * unreadable recording anybody uploads.
 *
 * ── What it refuses to guess ─────────────────────────────────────────────
 *
 * The workflow slug. A slug belongs to the account holder's own dashboard and
 * this repository cannot know what theirs is called, so an unset one is a 503
 * that names the variable rather than a job started against a bill under a
 * name nobody created.
 */

import { allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';
import { tooMany } from '@/app/lib/server/brake';
import {
  addJob, configured, forget, jobOf, slugFor, upload, type Which,
} from '@/app/lib/server/musicai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** A song, not an album. Past this something is wrong with the request. */
const MAX_BYTES = 60 * 1024 * 1024;
const MAX_SECONDS = 20 * 60;

const LIMITS = { perMinute: 6, perHour: 60 };

const COSTS: Record<Which, number> = { read: CREDITS.read, stems: CREDITS.parts };

function which(value: unknown): Which | null {
  return value === 'read' || value === 'stems' ? value : null;
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('analyse', request, LIMITS)) {
    return Response.json({ error: 'rate_limited', message: 'Too many at once.' }, { status: 429 });
  }
  if (!configured()) {
    return Response.json(
      { error: 'no_key', message: 'Reading a song is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the request.' }, { status: 400 });
  }

  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: 'bad_request', message: 'No audio was sent.' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: 'too_big', message: 'That file is too long to read here.' }, { status: 413 });
  }

  const job = which(form.get('which'));
  if (!job) {
    return Response.json({ error: 'bad_request', message: 'Say what to read.' }, { status: 400 });
  }

  /* The slug, before anything is spent. An unset one is not a failure of the
     member's and it must not cost them a job that cannot run. */
  const workflow = slugFor(job);
  if (!workflow) {
    return Response.json(
      {
        error: 'no_workflow',
        message:
          job === 'read'
            ? 'No reading workflow is set up for this app yet.'
            : 'No stem workflow is set up for this app yet.',
      },
      { status: 503 },
    );
  }

  let record: (() => Promise<void>) | null = null;
  if (metered()) {
    const caller = await callerFrom(request);
    const allowance = await allowanceFor(caller, request);
    if (!allowance.allowed) {
      return Response.json(
        {
          error: caller ? 'out_of_allowance' : 'signed_out',
          message: allowance.reason,
          usedToday: allowance.usedToday,
          limit: allowance.limit,
        },
        { status: caller ? 402 : 401 },
      );
    }
    if (caller) {
      const seconds = Number(form.get('seconds')) || 0;
      record = () => recordGeneration(caller, 'full', seconds, undefined, request, COSTS[job]);
    }
  }

  const billed = await billedSeconds(audio, Number(form.get('seconds')), MAX_SECONDS);
  const paid = await charge(request, perMinute(billed, COSTS[job]), 'analyse');
  if (!paid.ok) return paid.response;

  /* Their store, not ours. The bytes go straight from here to the signed URL
     they hand out — nothing of this app's holds a copy of somebody's song for
     longer than the request. */
  const url = await upload(audio);
  if (!url) {
    await paid.refund();
    return Response.json(
      { error: 'unreachable', message: 'The song could not be handed over for reading.' },
      { status: 502 },
    );
  }

  const id = await addJob(`futurebox-${job}-${Date.now()}`, workflow, { inputUrl: url });
  if (!id) {
    /* Refunded, because nothing was started and so nothing is billed upstream.
       Past this line it is their invoice whatever happens. */
    await paid.refund();
    return Response.json(
      { error: 'refused', message: 'That job would not start. Check the workflow name.' },
      { status: 502 },
    );
  }

  await record?.();
  return Response.json({ id });
}

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ state: 'failed', message: 'Not switched on.' }, { status: 503 });
  }
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id || id.length > 200) {
    return Response.json({ error: 'bad_request', message: 'Which job?' }, { status: 400 });
  }

  const job = await jobOf(id);
  if (!job) {
    return Response.json({ state: 'working' });
  }

  if (job.status === 'FAILED') {
    /* Not refunded: a job that ran and failed was billed upstream. Said plainly
       rather than dressed up, because the usual cause is a recording nothing
       could read and the member can act on that. */
    void forget(id);
    return Response.json({
      state: 'failed',
      message: job.error?.message || 'That recording could not be read.',
    });
  }

  if (job.status !== 'SUCCEEDED') return Response.json({ state: 'working' });

  /* ── The results, brought back here rather than left as links ──────────

     A workflow's outputs come back as signed URLs on their storage host. The
     browser cannot fetch those: this app's Content-Security-Policy allows
     `self` and Supabase and nothing else, which is deliberate and is not worth
     widening for a file that can be read here instead.

     So anything that is JSON — which is what a chord, key, tempo or section
     reading is — is fetched and inlined. Anything else stays a URL and the
     screen says it cannot show it yet, which is honest about where the line
     is rather than rendering a link that does nothing when pressed. */
  const result = job.result ?? {};
  const data: Record<string, unknown> = {};
  await Promise.all(
    Object.entries(result).map(async ([name, value]) => {
      if (typeof value !== 'string' || !/^https:\/\//.test(value)) return;
      try {
        const got = await fetch(value, { cache: 'no-store' });
        if (!got.ok) return;
        const type = got.headers.get('content-type') ?? '';
        const size = Number(got.headers.get('content-length') ?? 0);
        // A reading is kilobytes. Anything past this is a file, not an answer,
        // and pulling it into a JSON response would be a memory problem here
        // and an unreadable wall on the screen.
        if (size > 2 * 1024 * 1024) return;
        if (!/json/.test(type) && !/\.json($|\?)/.test(value)) return;
        data[name] = JSON.parse(await got.text());
      } catch {
        // Left as a URL. The screen says what it can and cannot show.
      }
    }),
  );

  /* ── What is audio, and therefore not for this response ────────────────

     A stem is a file, not an answer. Handing back fifty megabytes of them in
     one JSON body would be a response nobody can hold in memory and a request
     that times out on a phone, so the audio outputs are named here and fetched
     one at a time through `/api/analyse/part`.

     Which is why the job is not deleted when there are any: it is the handle
     those parts are fetched by. The browser says when it is done. */
  const parts = Object.entries(result)
    .filter(([name, value]) => typeof value === 'string' && /^https:\/\//.test(value) && !(name in data))
    .map(([name]) => name);

  if (parts.length === 0) {
    /* Nothing left to fetch, so tidied up now. Every finished job sits on their
       account until it is deleted and this app makes one per analysis. */
    void forget(id);
  }

  return Response.json({ state: 'done', result, data, parts, keep: parts.length > 0 });
}

/**
 * The browser saying it has everything it needs.
 *
 * A job with audio outputs is kept until this is called, because it is the
 * handle each part is fetched by. Answering "gone" for a job that was never
 * there is the honest answer to "make sure this is not there".
 */
export async function DELETE(request: Request): Promise<Response> {
  if (!configured()) return Response.json({ gone: true });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id || id.length > 200) {
    return Response.json({ error: 'bad_request', message: 'Which job?' }, { status: 400 });
  }
  await forget(id);
  return Response.json({ gone: true });
}
