/**
 * Where TONE3000 sends her back.
 *
 * This is the one route in the app that is reached by a BROWSER REDIRECT
 * rather than by the app calling it, and everything odd about it follows
 * from that.
 *
 * **It cannot know who she is.** A redirect carries no `Authorization`
 * header, and there is no cookie session anywhere. The `state` is the only
 * thread back to the person, which is why it is looked up first and why a
 * state we did not issue is refused before the code, the error or the tone
 * is read at all.
 *
 * **It must answer with a redirect, not JSON.** A person is looking at this
 * request in a browser window. A JSON body here is a white page with braces
 * on it, which is what a stranger sees if they poke at the address — fine
 * for them, useless for her. So every outcome, including every failure,
 * lands her back in the app with a word about what happened.
 *
 * **Nothing it says is detailed.** `?t3k=no&why=state` is as much as the
 * address carries. An error message that distinguishes "no such state" from
 * "state belongs to someone else" is a message written for whoever is
 * testing the lock.
 */

import { backTo, finish, intoApp, landing } from '@/app/lib/server/tone3000session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const landed = await finish(query, backTo(request));

  return Response.redirect(intoApp(request, landing(landed)), 303);
}
