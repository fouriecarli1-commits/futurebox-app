/**
 * The grown-up's door to the kids room.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."*
 *
 * So: `GET` to ask where the allowance stands, `POST` to set one, `PUT` to
 * start or end a sitting, `DELETE` to shut the room. Four verbs rather than
 * four routes, because they are four things to do with one row.
 *
 * ── The clock is the grown-up's, and only the grown-up's ─────────────────
 *
 * Carli, 10 October 2026: *"Wanneer screen time op is moet dit die kind
 * uitskop."*
 *
 * `PUT` is the only thing that moves the clock, and it is reached from the
 * grown-up's page. Nothing the child's room can call starts a new sitting —
 * it reads how much is left and draws a countdown. That is the whole security
 * model of screen time: a sitting a page could restart is a sitting a reload
 * restarts, and the one person certain to reload is the child whose time has
 * just run out.
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
import { kidsRoom, openKids, shutKids, sitAgain, standUp } from '@/app/lib/server/kidsmode';
import {
  ALLOWANCE_MAX, MINUTES_LEAST, MINUTES_MOST, sane, saneMinutes,
} from '@/app/lib/kidsallowance';

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

  const body = (await request.json().catch(() => null)) as {
    allowance?: unknown;
    minutes?: unknown;
  } | null;
  const allowance = Number(body?.allowance);
  /* Absent and null are both "no clock". Absent is what a page written
     before screen time existed sends, and taking it as no clock is the
     direction that leaves that page working. */
  const minutes = body?.minutes === undefined || body.minutes === null
    ? null
    : Number(body.minutes);

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

  if (!saneMinutes(minutes)) {
    return Response.json(
      {
        message: `A sitting is a whole number of minutes, from ${MINUTES_LEAST}`
          + ` to ${MINUTES_MOST} — or nothing at all for a budget with no clock.`,
        least: MINUTES_LEAST,
        most: MINUTES_MOST,
      },
      { status: 400 },
    );
  }

  if (!(await openKids(caller.id, allowance, minutes))) {
    return Response.json({ message: 'That could not be saved. Try again.' }, { status: 503 });
  }

  const room = await kidsRoom(caller.id);
  return Response.json(room ? { open: true, ...room } : { open: false });
}

/**
 * Start another sitting, or end this one.
 *
 * `{ sit: true }` is "another twenty minutes"; `{ sit: false }` is the
 * grown-up taking the phone back early. Neither touches the allowance: more
 * time is not more money, and a parent who meant both presses both.
 */
export async function PUT(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return mustSignIn;

  const body = (await request.json().catch(() => null)) as { sit?: unknown } | null;
  const sitting = body?.sit !== false;

  const done = sitting ? await sitAgain(caller.id) : await standUp(caller.id);
  if (!done) {
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
