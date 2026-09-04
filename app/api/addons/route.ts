/**
 * What this person has unlocked.
 *
 * A convenience for the screen and nothing more. Every route behind the lock
 * asks `hasAddon` for itself, on the server, with the caller's own id — this
 * one exists so the room can show the sales page or the desk without waiting
 * to be refused.
 *
 * Answers "nothing, and the question worked" for somebody signed out. That is
 * the correct answer, not a failure.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { ownedBy } from '@/app/lib/server/addons';
import { ADDONS } from '@/app/lib/addons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  /* `sells` goes out either way: the sales page has to be able to name a price
     to somebody who is not signed in yet, which is most of the people who will
     ever read it. */
  const sells = ADDONS.map((one) => ({ id: one.id, rand: one.rand }));

  if (!metered()) return Response.json({ owns: {}, ready: false, sells });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ owns: {}, ready: true, sells });

  const owned = await ownedBy(caller.id);
  return Response.json({ owns: owned.owns, ready: owned.ready, sells });
}
