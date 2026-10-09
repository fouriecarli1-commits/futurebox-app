/**
 * The grown-up's door to the kids room.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."*
 *
 * So: `GET` to ask where the allowance stands, `POST` to set one, `DELETE`
 * to shut the room. Three verbs rather than three routes, because they are
 * three things to do with one row.
 *
 * ── Who may call it ──────────────────────────────────────────────────────
 *
 * The signed-in account holder, about their own account, and nobody else.
 * Not `ownerdoor.ts` — that gate is for routes only the operator may touch,
 * and this is a thing every member does for their own child. The account is
 * taken from the caller's token and never from the body, so there is no
 * request that sets somebody else's allowance.
 *
 * ── Why it does not charge ───────────────────────────────────────────────
 *
 * Setting an allowance moves no money and buys nothing: it writes down what
 * a child may spend of what the parent already has. The charging happens
 * later, in `charge()`, where the allowance is applied — see
 * `lib/server/kidsmode.ts`, which is the only place that limit is real.
 */

import { callerFrom } from '@/app/lib/server/account';
import { kidsRoom, openKids, shutKids } from '@/app/lib/server/kidsmode';
import { ALLOWANCE_MAX, sane } from '@/app/lib/kidsallowance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mustSignIn = Response.json(
  { message: 'Sign in first — an allowance belongs to an account.', signedIn: false },
  { status: 401 },
);

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return mustSignIn;
  const room = await kidsRoom(caller.id);
  /* `open: false` rather than a 404. "Is kids mode on" is a question with an
     answer, and the answer is no — a missing resource would make the page
     handle an error for a state that is normal. */
  return Response.json(room ? { open: true, ...room } : { open: false });
}

export async function POST(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return mustSignIn;

  const body = (await request.json().catch(() => null)) as { allowance?: unknown } | null;
  const allowance = Number(body?.allowance);

  /* Checked here as well as in `openKids`, because the page deserves a
     sentence and the helper only has a boolean to give. The rule itself
     lives in `kidsallowance.ts` so the page offering the steps and the server
     accepting them cannot disagree about what is allowed. */
  if (!sane(allowance)) {
    return Response.json(
      {
        message: `An allowance is a whole number of credits, from 0 to ${ALLOWANCE_MAX}.`,
        most: ALLOWANCE_MAX,
      },
      { status: 400 },
    );
  }

  if (!(await openKids(caller.id, allowance))) {
    return Response.json({ message: 'That could not be saved. Try again.' }, { status: 503 });
  }

  const room = await kidsRoom(caller.id);
  return Response.json(room ? { open: true, ...room } : { open: false });
}

export async function DELETE(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return mustSignIn;
  if (!(await shutKids(caller.id))) {
    return Response.json({ message: 'That could not be saved. Try again.' }, { status: 503 });
  }
  return Response.json({ open: false });
}
