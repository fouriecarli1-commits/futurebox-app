/**
 * The same episode, in another language, in the same voice.
 *
 * This is the one thing ElevenLabs make that this app most obviously needs. An
 * Afrikaans episode reaching an English audience in the host's own voice, and
 * the other way round, is not a translation feature — it is the same show,
 * twice, and there is no version of doing it by hand.
 *
 * ── Why this route is shaped differently from every other one that costs ──
 *
 * Everything else here is a request that answers: you ask, you wait a few
 * seconds, and either audio comes back or a refusal does — and the refusal
 * refunds in the same handler that took the money.
 *
 * A dub takes minutes. The job outlives the request that started it, so the
 * money has to be handled across two:
 *
 *   **POST** starts it, takes the credits, and writes down who it belongs to.
 *   Charging at the start is not a convenience: the vendor is billed the
 *   moment the job is accepted, whether anybody ever collects it.
 *
 *   **GET** polls. When a poll first sees `failed`, the credits go back. That
 *   "first" is the whole difficulty — a screen polls as often as it likes, and
 *   refunding on every poll refunds forever. So the claim is a single
 *   statement in the database (`claim_dub_refund`), which returns what it took
 *   only to the caller that actually marked it, and nothing to everybody else.
 *
 * ── And why a table at all ───────────────────────────────────────────────
 *
 * The id ElevenLabs hands back would otherwise be a bearer token: anybody
 * holding it could poll the job and download the audio. Ids that come back
 * from an upstream end up in logs and screenshots. Every read here is checked
 * against the owner written down when the job started.
 *
 * See `supabase/dubs.sql`, which says the rest.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, dub, dubState, dubbed } from '@/app/lib/server/eleven';
import { dubCost } from '@/app/lib/credits';
import { charge, refund } from '@/app/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The biggest file this will take.
 *
 * Written for an episode — beyond this it is an audiobook, not a podcast — and
 * it holds for a film too: a minute of what this app's own stitcher makes is a
 * few megabytes, so a hundred is far more than a video desk can produce.
 */
const MAX_BYTES = 100 * 1024 * 1024;
/** iso639-1 or iso639-3, so two or three letters and nothing else. */
const LANG = /^[a-z]{2,3}$/;

const NOT_SET_UP = {
  message:
    'Dubbing is not set up on this app yet. The owner needs to run supabase/dubs.sql.',
  ready: false,
};

export async function POST(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ message: 'Nothing was sent to dub.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ message: 'That file is too long to dub in one go.' }, { status: 413 });
  }

  const target = String(form.get('to') ?? '').toLowerCase();
  const source = String(form.get('from') ?? '').toLowerCase();
  if (!LANG.test(target)) {
    return Response.json({ message: 'Pick a language to dub it into.' }, { status: 400 });
  }
  if (source && !LANG.test(source)) {
    return Response.json({ message: 'That is not a language code.' }, { status: 400 });
  }
  if (source && source === target) {
    return Response.json(
      { message: 'That is the language it is already in.' },
      { status: 400 },
    );
  }

  const seconds = Math.max(0, Math.round(Number(form.get('seconds')) || 0));
  const title = String(form.get('title') ?? '').slice(0, 200);
  const speakers = Math.min(10, Math.max(0, Math.round(Number(form.get('speakers')) || 0)));

  const caller = metered() ? await callerFrom(request) : null;
  const client = admin();

  // Before the money: without somewhere to write down who this belongs to,
  // starting the job would spend credits on something that can never be
  // collected — and the id would be a bearer token besides.
  if (metered() && (!caller || !client)) {
    return Response.json(
      { message: 'Sign in first — a dub belongs to an account.', signedIn: false },
      { status: 401 },
    );
  }
  if (client) {
    const { error } = await client.from('dubs').select('id').limit(1);
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
  }

  const cost = dubCost(seconds);
  const paid = await charge(request, cost, 'dub');
  if (!paid.ok) return paid.response;

  const started = await dub(file, source, target, speakers);
  if (!started.ok) {
    await paid.refund();
    return Response.json({ message: started.message }, { status: started.status });
  }

  if (caller && client) {
    const { error } = await client.from('dubs').insert({
      id: started.dub.id,
      owner: caller.id,
      source_lang: source,
      target_lang: target,
      title,
      seconds,
      // What was actually taken, so a refund gives back that and not a number
      // recomputed later against a price that may have changed. Zero for the
      // owner of the app, who is not metered by their own meter.
      charged: paid.owner ? cost : 0,
      status: 'dubbing',
    });
    if (error) {
      // The job is running and billing upstream, but nothing can ever collect
      // it. Give the credits back and say so rather than leave somebody
      // watching a spinner for a job with no owner.
      await paid.refund();
      return Response.json(
        { message: 'The dub started but could not be filed, so it was cancelled. Nothing was charged.' },
        { status: 500 },
      );
    }
  }

  return Response.json({
    id: started.dub.id,
    expected: started.dub.expected,
    charged: paid.owner ? cost : 0,
  });
}

/**
 * Where a dub has got to, and — once it is there — the audio itself.
 *
 * `?id=` reports. `?id=&collect=1` hands back the file. Both check the dub
 * belongs to whoever is asking before either says anything about it.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  if (!id) return Response.json({ message: 'Which dub?' }, { status: 400 });

  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const client = admin();
  if (metered() && (!caller || !client)) {
    return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });
  }

  interface Row { owner: string; target_lang: string; title: string | null; status: string }
  let row: Row | null = null;
  if (caller && client) {
    const { data, error } = await client
      .from('dubs')
      .select('owner, target_lang, title, status')
      .eq('id', id)
      .maybeSingle();
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    // Not theirs, and not there, answer the same way. Telling somebody a dub
    // exists but is not theirs tells them a dub exists.
    if (!data || data.owner !== caller.id) {
      return Response.json({ message: 'That dub is not yours.' }, { status: 404 });
    }
    row = data as unknown as Row;
  }

  const state = await dubState(id);
  if (!state.ok) return Response.json({ message: state.message }, { status: state.status });

  if (caller && client) {
    await client
      .from('dubs')
      .update({ status: state.state.status, error: state.state.error ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner', caller.id);

    // The refund, claimed rather than decided. Two polls can see the same
    // failure at the same moment; only one of them marks the row, and only
    // that one is told what to give back.
    if (state.state.failed) {
      const { data } = await client.rpc('claim_dub_refund', { p_dub: id, p_owner: caller.id });
      const give = typeof data === 'number' ? data : Number(data ?? 0);
      if (give > 0) await refund(caller.id, give, `dub:${id}`);
    }
  }

  if (!state.state.done || url.searchParams.get('collect') !== '1') {
    return Response.json({
      status: state.state.status,
      done: state.state.done,
      failed: state.state.failed,
      error: state.state.error ?? null,
      title: row?.title ?? null,
      language: row?.target_lang ?? state.state.languages[0] ?? null,
    });
  }

  const want = row?.target_lang || state.state.languages[0] || '';
  if (!want) {
    return Response.json({ message: 'The dub finished without saying which language it is in.' }, { status: 502 });
  }
  const audio = await dubbed(id, want);
  if (!audio.ok) return Response.json({ message: audio.message }, { status: audio.status });

  // Their type, not ours: a dubbed film is a film. See `dubbed` in eleven.ts.
  return new Response(audio.audio, {
    headers: { 'Content-Type': audio.type, 'Cache-Control': 'no-store' },
  });
}
