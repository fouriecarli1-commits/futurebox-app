/**
 * Video from whichever engine should make it.
 *
 * Three verbs, because a generation is a job rather than a call:
 *
 *   GET  /api/video            what is switched on, and what is left
 *   POST /api/video            start one; answers with an id, not a video
 *   GET  /api/video?id=…       how is it going; a link when it is done
 *
 * A video is charged before an engine is asked and refunded if every engine
 * gives up, the same as music. What is different is the wait: a clip takes
 * minutes, so the request that starts it does not hold the line. The row in
 * `videos` is what makes that safe — close the tab and the video is still
 * there to be collected, and the credits still come back if it failed.
 *
 * The finished file is fetched from the engine and put in our own bucket
 * before the link is handed over. Their URLs expire; a video a member cannot
 * open next week is not a video they were sold.
 *
 * ── More than one engine ─────────────────────────────────────────────────
 *
 * The member picks a **grade** and the app picks the engine, because the two
 * cheapest and dearest engines differ by thirteen times the money and nobody
 * buying a video has any way to know that. Inside a grade the list is tried
 * cheapest first and falls through — not configured, month spent, request
 * refused — and one charge covers however many were tried.
 *
 * Falling *down* a grade never happens. Somebody who paid for premium and
 * quietly got the cheap engine has been sold something, so when a grade has
 * nothing available the request is refused and nothing is charged.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';
import { charge, refund } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { CREDITS, videoCost } from '@/app/lib/credits';
import { TIER_SPECS } from '@/app/lib/plans';
import {
  candidates,
  configured,
  gradesAvailable,
  nearestLength,
  providerById,
  PROVIDERS,
  scheme,
  type Aspect,
  type Grade,
  type Provider,
} from '@/app/lib/server/video';

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
  /** What the member paid for. Never an engine name. */
  grade?: string;
  /**
   * Whether a quoted line should be spoken by the engine.
   *
   * Off by default, and that is the cheap and multilingual path: silent
   * footage with the voice laid over it afterwards costs a hundredth of what
   * the picture costs, keeps one voice across every clip, and is the only way
   * this app speaks Afrikaans — the video models are English-first.
   */
  speak?: boolean;
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
    const grades = gradesAvailable();

    // The operator gets every engine and what each has spent. Everybody else
    // gets what the desk needs to draw itself and nothing about the bill.
    let engines:
      | { id: string; name: string; grade: string; model: string; used: number; ceiling: number }[]
      | undefined;

    if (callerIsOwner(caller)) {
      const client = admin();
      engines = [];
      for (const one of PROVIDERS) {
        if (!one.configured()) continue;
        const { data, error } = client
          ? await client.rpc('video_spend_this_month', { p_provider: one.id })
          : { data: null, error: true };
        // Left out rather than reported as zero: a migration that has not been
        // run and an allowance nobody has touched look identical from here,
        // and only one of them is fine.
        if (error || typeof data !== 'number') continue;
        engines.push({
          id: one.id,
          name: one.name,
          grade: one.grade,
          model: one.model,
          used: data,
          ceiling: one.ceiling(),
        });
      }
    }

    // What each grade can actually make, so the desk offers lengths and shapes
    // that exist rather than ones it will later refuse.
    const can: Record<string, { seconds: number[]; aspects: string[]; speaks: boolean }> = {};
    for (const one of PROVIDERS) {
      if (!one.configured()) continue;
      const found = can[one.grade];
      can[one.grade] = found
        ? {
            seconds: Array.from(new Set([...found.seconds, ...one.can.seconds])).sort((a, b) => a - b),
            aspects: Array.from(new Set([...found.aspects, ...one.can.aspects])),
            speaks: found.speaks || one.can.speaks,
          }
        : { seconds: [...one.can.seconds], aspects: [...one.can.aspects], speaks: one.can.speaks };
    }

    return Response.json({
      available: configured(),
      auth: scheme(),
      grades,
      can,
      // Whether any available engine can speak a quoted line. The desk teaches
      // quotation marks, so it has to know whether they will do anything —
      // and on the cheap rung, deliberately, they will not.
      sound: PROVIDERS.some((one) => one.configured() && one.can.speaks),
      ...(engines ? { engines } : {}),
    });
  }

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const { data: row } = await client
    .from('videos')
    .select('id, task_id, status, path, error, credits, seconds, aspect, provider')
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

  // The engine that started it is the only one that knows about it. A row
  // written before there was more than one engine has no provider, and those
  // were all Kling.
  const engine = providerById(row.provider ?? 'kling');
  if (!engine) {
    return Response.json({ state: 'failed', message: 'The engine that made this is no longer connected.' });
  }

  const progress = await engine.check(row.task_id);

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
    .update({
      status: 'done',
      path,
      finished_at: new Date().toISOString(),
      // What it really cost, where the engine says so. This is the number that
      // eventually replaces every estimate read off a pricing page.
      ...(progress.state === 'done' && typeof progress.units === 'number'
        ? { provider_units: progress.units }
        : {}),
    })
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

  const wanted = body.seconds === 10 ? 10 : 5;
  const aspect: Aspect = body.aspect === '9:16' ? '9:16' : body.aspect === '1:1' ? '1:1' : '16:9';
  const speak = body.speak === true;
  const grade: Grade =
    body.grade === 'premium' ? 'premium' : body.grade === 'better' ? 'better' : 'standard';

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  // What each engine has already spent this month, asked once. Over the
  // ceiling the answer is immediate and free rather than a two-minute wait
  // ending in a billing error somebody has already paid for.
  const spent = new Map<string, number>();
  for (const one of PROVIDERS) {
    if (!one.configured()) continue;
    const { data, error } = await client.rpc('video_spend_this_month', { p_provider: one.id });
    if (error || typeof data !== 'number') {
      return Response.json(
        { message: 'The video engines cannot be metered just now, so nothing is being started.' },
        { status: 503 },
      );
    }
    spent.set(one.id, data);
  }

  const queue = candidates(grade, { prompt, aspect, seconds: wanted, speak }, (one) => spent.get(one.id) ?? 0);

  if (queue.length === 0) {
    // Said precisely, because the three reasons need three different actions:
    // buy more, wait for the first, or ask for something the engines can do.
    const inGrade = PROVIDERS.filter((one) => one.grade === grade && one.configured());
    const message = !inGrade.length
      ? 'That grade of video is not switched on for this app yet.'
      : speak && !inGrade.some((one) => one.can.speaks)
        ? 'Nothing on this grade can speak a line aloud. Take the quotation marks out and record the voice separately — it sounds better and costs a fraction.'
        : `This grade's allowance for this month is used up. Nothing has been charged, and browser-drawn videos still work.`;
    return Response.json({ error: 'engine_full', message }, { status: 503 });
  }

  // One charge, however many engines get tried. A member sees one price, and
  // it is the one the desk put on the button — `videoCost` is the only place
  // that number lives.
  const price = videoCost(grade);
  const paid = await charge(request, price, 'video');
  if (!paid.ok) return paid.response;

  let engine: Provider | null = null;
  let taskId = '';
  let seconds = wanted;
  let refused = '';

  for (const one of queue) {
    // Each engine makes its own lengths; asking for six from a model that
    // makes five and ten is how a request gets refused for no good reason.
    const length = nearestLength(one.can, wanted);
    const started = await one.start({
      prompt: prompt.slice(0, one.can.maxPromptChars),
      aspect,
      seconds: length,
      speak,
    });
    if (started.ok) {
      engine = one;
      taskId = started.taskId;
      seconds = length;
      break;
    }
    // Kept so the last refusal can be reported if every engine says no.
    refused = started.message;
  }

  if (!engine) {
    await paid.refund();
    return Response.json(
      { message: refused || 'No video engine would take that one.' },
      { status: 502 },
    );
  }

  const { data: row, error } = await client
    .from('videos')
    .insert({
      owner: caller.id,
      task_id: taskId,
      prompt: prompt.slice(0, 2500),
      aspect,
      seconds,
      credits: price,
      provider: engine.id,
      grade,
      // The estimate, until the engine tells us better. See supabase/video2.sql
      // for why this column exists at all.
      provider_units: engine.cost(seconds),
      // Kept in step for the older column, so the first ceiling still reads.
      kling_credits: engine.id === 'kling' ? engine.cost(seconds) : 0,
      model: engine.model,
      status: 'running',
    })
    .select('id')
    .single();

  if (error || !row) {
    // An engine is making a video nobody has a row for. Give the credits back
    // rather than keep them for something that cannot now be collected, and
    // say what happened instead of pretending it started.
    await paid.refund();
    return Response.json(
      { message: 'The video was started but could not be recorded, so it has been cancelled and refunded.' },
      { status: 500 },
    );
  }

  // `model` is deliberately absent from what the browser is told. A member
  // buys a grade; which engine served it is ours to know and ours to change.
  return Response.json({ id: row.id, state: 'running', seconds, aspect, grade });
}
