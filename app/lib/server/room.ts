/**
 * Whether this account may open a room at all, asked on the server.
 *
 * ── Why this exists, and what it replaced ────────────────────────────────
 *
 * Carli, 24 September 2026: *"dit moenie 'n ekstra produk wees nie, eerder
 * dit monotise en krediete vra saam met die pakkette wat ons reeds het. Te
 * veel aankoop punte gaan mense afsit."*
 *
 * Before that, one room in this app — the marketing desk — was sold on its
 * own at R199 a month, with its own checkout, its own Paystack subscription
 * and its own table of who had bought it. Three files and a webhook branch
 * existed to answer one question that the membership row already answers:
 * *is this person paying us?*
 *
 * So the add-on is gone and this is what stands in its place. It asks the
 * same table the plan cards are drawn from, which is the whole point: the
 * card and the lock cannot say different things about the same room, because
 * they are reading the same row.
 *
 * ── It is a door, not a meter ────────────────────────────────────────────
 *
 * This answers "may you come in". It never takes anything — what is made
 * inside is charged by `charge()` in `credits.ts`, out of the one wallet, and
 * the two are deliberately separate calls. A gate that also spent money would
 * be a gate nobody could put in front of a free action, and every one of
 * these rooms has free actions in it.
 *
 * The order on a route is always: door, then screen, then charge. Refusing
 * somebody after taking their credits is the one mistake here that costs
 * somebody else money.
 *
 * ── Fails open where nothing is metered, closed where something is ───────
 *
 * With no account service configured nothing in this app is metered and this
 * is not the place to start — same rule as `charge()`. With one configured,
 * an unreadable membership reads as free, which is the safe direction for a
 * door and is `tierOf`'s own behaviour rather than a second opinion invented
 * here.
 */

import { ENTITLEMENTS, unlockedBy, type Capability } from '../entitlements';
import { callerFrom, metered, type Caller } from './account';

export interface Opened {
  readonly ok: true;
  /** Null where nothing is metered, so a route can still tell the difference. */
  readonly caller: Caller | null;
}

export interface Shut {
  readonly ok: false;
  readonly response: Response;
}

/**
 * The one question a plan-gated room asks, before it does anything else.
 *
 * `402` rather than `403`, and the body carries `needsPlan` — that is what
 * opens the plans panel in the browser, the same way `needsCredits` opens the
 * top-up one. A refusal that does not say what would fix it is a wall.
 */
export async function paidRoom(
  request: Request,
  capability: Capability,
): Promise<Opened | Shut> {
  if (!metered()) return { ok: true, caller: null };

  const caller = await callerFrom(request);
  if (!caller) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'signed_out',
          message: 'Sign in first — a room belongs to an account.',
          signedIn: false,
        },
        { status: 401 },
      ),
    };
  }

  /* Nought means shut. Anything else — a number or `null` for no ceiling — is
     open, and the per-day counting that some rooms do is not this function's
     business. Read as `=== 0` rather than as falsy, because `null` is the
     unlimited case and would fail a truthiness test. */
  if (ENTITLEMENTS[capability].caps[caller.tier] === 0) {
    const needs = unlockedBy(capability, caller.tier);
    return {
      ok: false,
      response: Response.json(
        {
          error: 'needs_plan',
          needsPlan: needs ?? 'Maker',
          message: `${ENTITLEMENTS[capability].label} is part of every paid plan${
            needs ? `, from ${needs} up` : ''
          }. Making things in it costs credits, the same as a song.`,
        },
        { status: 402 },
      ),
    };
  }

  return { ok: true, caller };
}
