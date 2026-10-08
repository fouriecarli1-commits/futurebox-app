/**
 * Giving a trained singing voice to the member it was made for.
 *
 * ── Why this is the owner's to do and not the member's ───────────────────
 *
 * Kits cannot create a voice over its API — measured 9 September 2026,
 * `POST /voice-models` answers 404 — so a singing voice is an afternoon of
 * Carli's own work on kits.ai: a dataset gathered, uploaded, trained,
 * listened to. The app is not in that loop and cannot be.
 *
 * So the app cannot know who a new voice was made for. Only she does, and
 * this is where she says so. If a member could claim one themselves, the
 * first person to guess a number would own somebody else's voice — which is
 * the exact fault `lib/server/ownvoices.ts` exists to stop, re-introduced by
 * the thing meant to stop it.
 *
 * ── Only voices trained on this account ──────────────────────────────────
 *
 * Never a stock voice. Kits' catalogue is a hundred-odd voices anybody may
 * sing in, and one of them locked away because somebody was given it would
 * be a mistake nothing inside this app could undo. So the id has to appear
 * in `listModels(myModels=true)` before it can be given to anybody, and that
 * is checked here rather than in the library, because here is where the list
 * is already in hand.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { configured, listModels, safeModelId } from '@/app/lib/server/kits';
import { isOwnerEmail } from '@/app/lib/server/owners';
import { claim, mine, release } from '@/app/lib/server/ownvoices';
import { TIERS, type Tier } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const asTier = (value: unknown): Tier =>
  (TIERS as readonly string[]).includes(String(value)) ? String(value) as Tier : 'free';

/** Signed in, running the place, and the engine switched on. */
async function gate(request: Request): Promise<Response | null> {
  if (!configured()) {
    return Response.json({ message: 'Singing is not switched on for this app yet.' }, { status: 503 });
  }
  if (!metered()) {
    return Response.json({ message: 'Accounts are not configured, so a voice cannot belong to anybody.' }, { status: 503 });
  }
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  if (!isOwnerEmail(caller.email)) {
    /* 404 rather than 403. A 403 confirms the address exists and is worth
       pushing at; the same answer as a wrong path tells somebody nothing. */
    return Response.json({ message: 'Not found.' }, { status: 404 });
  }
  return null;
}

/** What one member holds, so the page can draw it. */
export async function GET(request: Request): Promise<Response> {
  const stop = await gate(request);
  if (stop) return stop;

  const who = new URL(request.url).searchParams.get('member') ?? '';
  if (!who) return Response.json({ message: 'Which member?' }, { status: 400 });

  const held = await mine(who);
  if (held === null) {
    return Response.json(
      { message: 'Could not read who holds which voice. Try again in a moment.' },
      { status: 503 },
    );
  }
  return Response.json({ voices: held });
}

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('voice-own', request, GENERATION);
  if (flood) return flood;
  const stop = await gate(request);
  if (stop) return stop;

  let said: { voice?: unknown; member?: unknown; tier?: unknown };
  try {
    said = await request.json() as typeof said;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const voice = safeModelId(said.voice);
  const member = String(said.member ?? '').trim();
  if (!voice || !member) {
    return Response.json({ message: 'A voice number and a member are both needed.' }, { status: 400 });
  }

  /* On this account, or not at all. */
  const trained = await listModels();
  const found = trained.find((one) => one.id === voice);
  if (!found) {
    return Response.json(
      {
        message: 'That number is not one of the voices trained on this account.'
          + ' A voice from the catalogue belongs to everybody and is not given out.',
      },
      { status: 400 },
    );
  }

  const refusal = await claim(voice, member, asTier(said.tier), found.name);
  if (refusal) {
    return Response.json(
      { error: refusal.code, message: refusal.message },
      { status: refusal.code === 'voice_cap' ? 402 : 409 },
    );
  }
  return Response.json({ ok: true, voice, name: found.name });
}

/** Take it back, so the slot can be used again. */
export async function DELETE(request: Request): Promise<Response> {
  const stop = await gate(request);
  if (stop) return stop;

  const url = new URL(request.url);
  const voice = safeModelId(url.searchParams.get('voice'));
  const member = (url.searchParams.get('member') ?? '').trim();
  if (!voice || !member) {
    return Response.json({ message: 'A voice number and a member are both needed.' }, { status: 400 });
  }
  const gone = await release(voice, member);
  if (!gone) {
    return Response.json({ message: 'That could not be taken back.' }, { status: 503 });
  }
  return Response.json({ ok: true });
}
