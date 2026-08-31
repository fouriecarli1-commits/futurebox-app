/**
 * Video from the engine.
 *
 * Three verbs, because a Kling generation is a job rather than a call:
 *
 *   GET  /api/video            is the engine switched on, and what is left
 *   POST /api/video            start one; answers with an id, not a video
 *   GET  /api/video?id=…       how is it going; a link when it is done
 *
 * A video is charged before the engine is asked and refunded if the engine
 * gives up, the same as music. What is different is the wait: a ten-second
 * clip takes minutes, so the request that starts it does not hold the line.
 * The row in `videos` is what makes that safe — close the tab and the video is
 * still there to be collected, and the credits still get given back if it
 * failed.
 *
 * The finished file is fetched from Kling and put in our own bucket before the
 * link is handed over. Their URLs expire; a video a member cannot open next
 * week is not a video they were sold.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';
import { charge, refund } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { CREDITS } from '@/app/lib/credits';
import { TIER_SPECS } from '@/app/lib/plans';
import {
  checkVideo,
  configured,
  klingCost,
  MODEL_NAME,
  monthlyCeiling,
  scheme,
  speaks,
  startVideo,
  type Aspect,
} from '@/app/lib/server/kling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Starting a job is quick; collecting one downloads a file. Neither is long. */
export const maxDuration = 120;

/** A signed link lives an hour, which is longer than anybody watches for. */
const LINK_SECONDS = 3600;

interface Body {
  prompt?: string;
  aspect?: string;
  seconds?: number;
}

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    // The probe the studio asks before it offers the engine at all. `auth`
    // says which of the two key schemes was found, so somebody setting this up
    // can tell a missing key from a half-set pair without guessing.
    //
    // The month's spend is added for whoever runs the place, and only for
    // them. It is the answer to "is this actually connected and how much of
    // the allowance is gone", which is a question the operator should be able
    // to answer by opening the video desk rather than by reading JSON — but it
    // is also the size of somebody's bill, and that is nobody else's business.
    const caller = metered() ? await callerFrom(request) : null;
    let month: { used: number; ceiling: number } | undefined;

    if (callerIsOwner(caller)) {
      const client = admin();
      const { data, error } = client
        ? await client.rpc('kling_spend_this_month')
        : { data: null, error: true };
      // Left out rather than reported as zero: a migration that has not been
      // run and an allowance that has not been touched look identical from
      // here, and only one of them is fine.
      if (!error && typeof data === 'number') month = { used: data, ceiling: monthlyCeiling() };
    }

    return Response.json({
      available: configured(),
      model: MODEL_NAME,
      auth: scheme(),
      // Whether a quoted line will come back as audio. The desk teaches
      // quotation marks, so it has to know whether they will do anything.
      sound: speaks(),
      ...(month ? { month } : {}),
    });
  }

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const { data: row } = await client
    .from('videos')
    .select('id, task_id, status, path, error, credits, seconds, aspect')
    .eq('id', id)
    .eq('owner', caller.id)
    .maybeSingle();
  if (!row) return Response.json({ message: 'Not found.' }, { status: 404 });

  if (row.status === 'failed') {
    return Response.json({ state: 'failed', message: row.error ?? 'The engine could not make that one.' });
  }
  if (row.status === 'done' && row.path) {
    return Response.json({ state: 'done', url: await link(client, row.path) });
  }
  if (!row.task_id) {
    return Response.json({ state: 'failed', message: 'The engine never accepted that one.' });
  }

  const progress = await checkVideo(row.task_id);

  if (progress.state === 'running' || progress.state === 'unknown') {
    // Unknown is reported as still running on purpose: the engine being
    // unreachable for a moment is not the video having failed, and refunding
    // on a network blip would hand back credits for a video that then arrives.
    return Response.json({ state: 'running' });
  }

  if (progress.state === 'failed') {
    await client
      .from('videos')
      .update({ status: 'failed', error: progress.message, finished_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('owner', caller.id)
      .eq('status', 'running');
    // Only ever refunded once: the update above is conditional on the row
    // still being 'running', and this only follows a row that was.
    await refund(caller.id, row.credits, `video:${row.id}`);
    return Response.json({ state: 'failed', message: progress.message });
  }

  // Done. Fetch it once, keep it, and hand back a link to our copy.
  const path = `${caller.id}/${row.id}.mp4`;
  try {
    const file = await fetch(progress.url);
    if (!file.ok) throw new Error('download');
    const bytes = await file.arrayBuffer();
    const put = await client.storage
      .from('videos')
      .upload(path, bytes, { contentType: 'video/mp4', upsert: true });
    if (put.error) throw put.error;
  } catch {
    // The video exists at Kling and we could not keep a copy. Say so rather
    // than marking it failed and refunding something that was made: the next
    // poll tries again, and their URL is good for a while yet.
    return Response.json({ state: 'running' });
  }

  await client
    .from('videos')
    .update({ status: 'done', path, finished_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('owner', caller.id);

  return Response.json({ state: 'done', url: await link(client, path) });
}

async function link(client: ReturnType<typeof admin>, path: string): Promise<string | null> {
  if (!client) return null;
  const { data } = await client.storage.from('videos').createSignedUrl(path, LINK_SECONDS);
  return data?.signedUrl ?? null;
}

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const prompt = String(body.prompt ?? '').trim();
  if (prompt.length < 8) {
    return Response.json({ message: 'Describe the shot in a sentence or two.' }, { status: 400 });
  }

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  // Before the plan, before the ceiling, before the charge. A video of a real
  // person's face is the most expensive mistake this app can make, and it is
  // the one surface that refuses outright when the check cannot be run.
  const allowed = await guard(request, prompt, 'video', caller);
  if (!allowed.ok) return allowed.response;

  if (!configured()) {
    return Response.json(
      { message: 'The video engine is not switched on for this app yet.', engine: false },
      { status: 503 },
    );
  }

  if (TIER_SPECS[caller.tier].rand === 0) {
    return Response.json(
      {
        message:
          'The video engine starts on Maker. A free video is drawn in your own browser instead, which costs nothing and needs no engine.',
        needsPlan: true,
      },
      { status: 402 },
    );
  }

  const seconds = body.seconds === 10 ? 10 : 5;
  const aspect: Aspect = body.aspect === '9:16' ? '9:16' : body.aspect === '1:1' ? '1:1' : '16:9';
  const cost = klingCost(seconds);

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  // The month's allowance, asked before anything is spent. Over it, the answer
  // is immediate and free rather than a two-minute wait ending in an engine
  // error somebody has already paid for.
  const { data: spent, error: spentError } = await client.rpc('kling_spend_this_month');
  if (spentError || typeof spent !== 'number') {
    return Response.json(
      { message: 'The video engine cannot be metered just now, so nothing is being started.' },
      { status: 503 },
    );
  }
  if (spent + cost > monthlyCeiling()) {
    const first = new Date();
    first.setUTCMonth(first.getUTCMonth() + 1, 1);
    return Response.json(
      {
        error: 'engine_full',
        message: `The video engine's allowance for this month is used up. It comes back on ${first.toISOString().slice(0, 10)}. Nothing has been charged, and browser-drawn videos still work.`,
      },
      { status: 503 },
    );
  }

  const paid = await charge(request, CREDITS.video, 'video');
  if (!paid.ok) return paid.response;

  const started = await startVideo({ prompt, aspect, seconds });
  if (!started.ok) {
    await paid.refund();
    return Response.json({ message: started.message }, { status: started.status });
  }

  const { data: row, error } = await client
    .from('videos')
    .insert({
      owner: caller.id,
      task_id: started.taskId,
      prompt: prompt.slice(0, 2500),
      aspect,
      seconds,
      credits: CREDITS.video,
      kling_credits: cost,
      model: MODEL_NAME,
      status: 'running',
    })
    .select('id')
    .single();

  if (error || !row) {
    // The engine is making a video nobody has a row for. Give the credits back
    // rather than keep them for something that cannot now be collected, and
    // say what happened instead of pretending it started.
    await paid.refund();
    return Response.json(
      { message: 'The video was started but could not be recorded, so it has been cancelled and refunded.' },
      { status: 500 },
    );
  }

  return Response.json({ id: row.id, state: 'running', seconds, aspect, model: MODEL_NAME });
}
