/**
 * Deleting an account, and everything in it.
 *
 * ── The order is the whole design ────────────────────────────────────────
 *
 * 1. **Stop the money first.** An account deleted while a subscription is live
 *    is somebody who keeps being charged for a thing that no longer exists,
 *    and who no longer has a login to cancel it from. Everything else here is
 *    recoverable by asking; that is not.
 * 2. **Then what lives elsewhere.** Cloned voices and trained sounds sit on
 *    ElevenLabs' account, not ours. Deleting only our rows would leave a copy
 *    of somebody's voice on a service they cannot see — that is hiding it, not
 *    deleting it.
 * 3. **Then the audio.** Every file is under `<owner>/`, so the folder goes.
 * 4. **Then the account.** Seventeen tables reference `auth.users` with
 *    `on delete cascade`, so removing the user takes the songs, the credits,
 *    the memberships, the collaborations and the messages with it in one
 *    transaction the database performs itself.
 *
 * Backwards would be worse in a specific way: delete the user first and the
 * rows naming the voices are gone, so nothing is left to say what to remove
 * from ElevenLabs, and the voice stays there forever with nobody able to point
 * at it.
 *
 * ── It asks twice, and the second time is not a checkbox ─────────────────
 *
 * The body must carry the account's own email address, typed. A confirmation
 * that can be given by clicking twice quickly is not one, and this cannot be
 * undone: there is no soft delete and no thirty-day grace, because holding
 * somebody's voice recordings for thirty days after they asked you to stop is
 * the opposite of what they asked for.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { dropFinetune, forgetVoice } from '@/app/lib/server/eleven';
import { stopRenewing } from '@/app/lib/server/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'tracks';

export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) {
    return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  }
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: { confirm?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  // Typed, and matched against the address on the token rather than anything
  // the request claims about itself.
  const typed = String(body.confirm ?? '').trim().toLowerCase();
  if (!typed || typed !== caller.email.toLowerCase()) {
    return Response.json(
      { message: 'Type your email address exactly to confirm.' },
      { status: 400 },
    );
  }

  // What could not be finished, told plainly at the end rather than swallowed.
  const left: string[] = [];

  // ── 1. Stop the money ───────────────────────────────────────────────
  const { data: sub } = await client
    .from('subscriptions')
    .select('subscription_code, email_token')
    .eq('owner', caller.id)
    .maybeSingle();
  const row = sub as { subscription_code: string | null; email_token: string | null } | null;
  if (row?.subscription_code && row.email_token) {
    const stopped = await stopRenewing(row.subscription_code, row.email_token);
    if (!stopped.ok) {
      // Refused here rather than pressed on with. Deleting the account now
      // would leave somebody being charged with no way to stop it.
      return Response.json(
        {
          message:
            'Your subscription could not be cancelled, so nothing was deleted. ' +
            'Try again in a moment, or cancel it first from the billing screen.',
        },
        { status: 502 },
      );
    }
  }

  // ── 2. What lives on ElevenLabs ─────────────────────────────────────
  const { data: voices } = await client.from('voices').select('id').eq('owner', caller.id);
  for (const one of (voices ?? []) as Array<{ id: string }>) {
    if (!(await forgetVoice(one.id))) left.push(`voice ${one.id}`);
  }

  const { data: sounds } = await client.from('finetunes').select('id').eq('owner', caller.id);
  for (const one of (sounds ?? []) as Array<{ id: string }>) {
    if (!(await dropFinetune(one.id))) left.push(`trained sound ${one.id}`);
  }

  // ── 3. The audio ────────────────────────────────────────────────────
  const { data: files } = await client.storage.from(BUCKET).list(caller.id, { limit: 1000 });
  const paths = ((files ?? []) as Array<{ name: string }>).map((one) => `${caller.id}/${one.name}`);
  if (paths.length) {
    const { error } = await client.storage.from(BUCKET).remove(paths);
    if (error) left.push(`${paths.length} audio files`);
  }

  // ── 4. The account, and everything cascading off it ─────────────────
  const { error } = await client.auth.admin.deleteUser(caller.id);
  if (error) {
    return Response.json(
      {
        message:
          'Your data was removed but the account itself could not be deleted. ' +
          'Write to admin@futurebox.app and it will be finished by hand.',
        left,
      },
      { status: 502 },
    );
  }

  return Response.json({ deleted: true, left });
}
