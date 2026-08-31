/**
 * A sound of your own — training one, watching it train, deleting it.
 *
 * ElevenLabs will train a music model on a handful of finished tracks and then
 * generate in that sound. Two things about that need saying out loud, because
 * they are the whole reason this route is more than a proxy.
 *
 * **Whose music.** Training a model on somebody else's records is the thing
 * that gets a music app taken down. ElevenLabs block it on their side too —
 * their failure reasons include `copyright_violation` — but a refusal after
 * the fact is not a policy. So the request must say where the audio came
 * from, and say it in a word this route understands: `channel`, meaning every
 * file was a song FutureBox generated in this account, or `brought`, meaning
 * the person uploaded their own recordings and confirmed in words that the
 * music is theirs. The confirmation is stored with the finetune. A claim of
 * ownership that cannot be produced afterwards is not a claim of anything.
 *
 * **Whose finetune.** The ElevenLabs account behind this app is one account.
 * Without a row tying each finetune to a person, everybody's trained sound
 * would be listed and usable by everybody, exactly as with cloned voices.
 * Their API has no notion of our users, so that ownership is ours to keep.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, createFinetune, dropFinetune, finetuneStatus } from '@/app/lib/server/eleven';
import { SOUND_CAPS } from '@/app/lib/plans';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Uploading several finished songs is not a quick call. */
export const maxDuration = 300;

/** The music model a finetune is trained on. The same one songs are made with. */
const MODEL_ID = 'music_v2';

/**
 * Our own floor, not theirs.
 *
 * A model trained on one song has learned that song, not a sound, and the
 * person has spent one of very few training slots finding that out.
 */
const FEWEST_FILES = 3;
const MOST_FILES = 30;
/** Roughly thirty finished songs at a sane bitrate. */
const MOST_BYTES = 100 * 1024 * 1024;

/** Statuses that will never change again, so they are never asked about twice. */
const SETTLED = new Set(['completed', 'failed', 'blocked']);

interface Row {
  id: string;
  name: string;
  genre: string;
  origin: string;
  tracks: number;
  status: string;
  why: string | null;
  created_at: string;
}

/**
 * What has been trained, and where each one has got to.
 *
 * Only the unfinished ones are asked about upstream: a finished finetune stays
 * finished, and a screen that polls should not cost a call per row per refresh
 * for the rest of the account's life.
 */
export async function GET(request: Request): Promise<Response> {
  if (!configured()) return Response.json({ configured: false, mine: [] });
  if (!metered()) return Response.json({ configured: true, signedIn: false, mine: [] });

  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) {
    return Response.json({ configured: true, signedIn: false, mine: [] });
  }

  const { data } = await client
    .from('finetunes')
    .select('id, name, genre, origin, tracks, status, why, created_at')
    .eq('owner', caller.id)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];

  const fresh = await Promise.all(
    rows.map(async (row) => {
      if (SETTLED.has(row.status)) return row;
      const live = await finetuneStatus(row.id);
      if (!live || live.status === row.status) return row;
      await client
        .from('finetunes')
        .update({ status: live.status, why: live.why ?? null })
        .eq('id', row.id)
        .eq('owner', caller.id);
      return { ...row, status: live.status, why: live.why ?? null };
    }),
  );

  return Response.json({
    configured: true,
    signedIn: true,
    keep: SOUND_CAPS[caller.tier],
    mine: fresh.map((row) => ({
      id: row.id,
      name: row.name,
      genre: row.genre,
      origin: row.origin,
      tracks: row.tracks,
      status: row.status,
      why: row.why ?? undefined,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ message: 'Training is not switched on for this app yet.' }, { status: 503 });
  }
  if (!metered()) {
    return Response.json(
      { message: 'Accounts are not configured, so a trained sound cannot belong to anybody.' },
      { status: 503 },
    );
  }

  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const keep = SOUND_CAPS[caller.tier];
  if (keep < 1) {
    return Response.json(
      { message: 'Training a sound of your own needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the songs.' }, { status: 400 });
  }

  // Where the music came from, and the confirmation that goes with it.
  const origin = String(form.get('origin') ?? '');
  if (origin !== 'channel' && origin !== 'brought') {
    return Response.json({ message: 'Say where the music came from.' }, { status: 400 });
  }
  if (String(form.get('confirm') ?? '') !== 'my-music') {
    return Response.json(
      { message: 'A sound can only be trained on music the person owns, and that has to be confirmed.' },
      { status: 400 },
    );
  }

  const files = form
    .getAll('files')
    .filter((one): one is File => one instanceof File && one.size > 0)
    .slice(0, MOST_FILES);
  if (files.length < FEWEST_FILES) {
    return Response.json(
      { message: `Pick at least ${FEWEST_FILES} songs. Fewer than that teaches it one song, not a sound.` },
      { status: 400 },
    );
  }
  const bytes = files.reduce((sum, file) => sum + file.size, 0);
  if (bytes > MOST_BYTES) {
    return Response.json({ message: 'That is more audio than can go up at once.' }, { status: 413 });
  }

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const { count } = await client
    .from('finetunes')
    .select('id', { count: 'exact', head: true })
    .eq('owner', caller.id);
  if ((count ?? 0) >= keep) {
    return Response.json(
      { message: `Your plan keeps ${keep} trained ${keep === 1 ? 'sound' : 'sounds'}. Delete one first.` },
      { status: 402 },
    );
  }

  // Their own floor is five characters, so a one-word name would be refused
  // upstream with a validation error rather than here with a sentence.
  const name = String(form.get('name') ?? '').trim().slice(0, 120);
  if (name.length < 5) {
    return Response.json({ message: 'Give it a name of at least five characters.' }, { status: 400 });
  }
  const genre = String(form.get('genre') ?? '').trim().slice(0, 60);
  if (!genre) return Response.json({ message: 'Say what kind of music this is.' }, { status: 400 });

  // A trained sound named after a living artist is that artist's sound being
  // offered, whatever the uploaded songs were. Checked before the training is
  // paid for, because a refund does not get ten minutes of GPU time back.
  const allowed = await guard(request, `${name}\n${genre}`, 'finetune', caller);
  if (!allowed.ok) return allowed.response;

  // The most expensive thing this app can be asked to do — ten minutes of
  // somebody else's GPUs, and the model then sits on the account until it is
  // deleted. It is charged before a byte goes up, and there is no free route
  // to it at any tier: the plan gate above already refuses free accounts, and
  // this refuses anybody who has not got the credits.
  const paid = await charge(request, CREDITS.finetune, 'finetune');
  if (!paid.ok) return paid.response;

  const made = await createFinetune(
    // Prefixed with the account, so the owner is visible from the ElevenLabs
    // dashboard too and a support question does not need this database.
    `${name} · ${caller.id.slice(0, 8)}`,
    genre,
    files.map((file, index) => ({ blob: file, filename: file.name || `track-${index + 1}.mp3` })),
    MODEL_ID,
  );
  if (!made.ok) {
    await paid.refund();
    return Response.json({ message: made.message }, { status: made.status });
  }

  await client.from('finetunes').insert({
    id: made.finetune.id,
    owner: caller.id,
    name,
    genre,
    origin,
    tracks: files.length,
    status: made.finetune.status,
    why: made.finetune.why ?? null,
  });

  return Response.json({
    id: made.finetune.id,
    name,
    genre,
    origin,
    tracks: files.length,
    status: made.finetune.status,
  });
}

/**
 * Deleting one, from their account as well as from our table.
 *
 * Removing only the row would leave a model trained on somebody's music on an
 * account they cannot see, which is not deletion — it is hiding.
 */
export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id') ?? '';
  const client = admin();
  if (!id || !client) return Response.json({ message: 'Which sound?' }, { status: 400 });

  const { data: owned } = await client
    .from('finetunes')
    .select('id')
    .eq('id', id)
    .eq('owner', caller.id)
    .maybeSingle();
  if (!owned) return Response.json({ message: 'Not found.' }, { status: 404 });

  await dropFinetune(id);
  await client.from('finetunes').delete().eq('id', id).eq('owner', caller.id);
  return new Response(null, { status: 204 });
}
