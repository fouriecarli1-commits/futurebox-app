/**
 * Our own ceilings under Google's, one per engine.
 *
 * ── Why ours has to exist at all ─────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Ek sal my budget in google verhoog soos wat ons
 * wins maak."* Correct, and in the right order — spend what has been earned
 * rather than what is hoped for.
 *
 * But Google's spend cap hangs on one **service**, and Lyria, Nano Banana
 * and Veo are all that one service. So the month Veo runs hot, **the music
 * and the pictures stop with it** — not because anything is wrong with them,
 * but because they share a ceiling with the expensive one.
 *
 * Nobody chose that. It is the cost of putting all three behind one project,
 * and it is worth paying for the simplicity — provided there is something
 * underneath it that stops one engine eating the other two. That is this.
 *
 * **Google's cap is the last line, not the budget.**
 *
 * ── Micro-dollars, and why not cents ─────────────────────────────────────
 *
 * Google's prices are smaller than a cent: a picture is about $0.039, a
 * second of Veo Lite is $0.03. Rounded to cents those are 4 and 3 — ten per
 * cent out on every single row, always in the same direction. Over ten
 * thousand calls that is not a rounding, it is a wrong number.
 *
 * A micro-dollar is a millionth of a dollar, as an integer. $0.039 is 39000.
 * Nothing is lost and nothing drifts.
 *
 * ── Dollars, and why not rand ────────────────────────────────────────────
 *
 * Google invoices in dollars. The rand rate moves; storing rand would mean
 * the history changes every time the rate does, and then nobody knows what
 * was actually paid. The rate belongs on the screen, not in the row.
 *
 * ── A failed read refuses ────────────────────────────────────────────────
 *
 * The same trade `kitsminutes.ts` makes, for the same reason: the thing
 * standing between one member and everybody else's month is this read. A
 * failed read reported as "nothing used" takes the ceiling off at exactly
 * the moment it stops working.
 */

import { admin } from './account';
import { wrote } from './wrote';

export type Kind = 'music' | 'video' | 'image';
export const KINDS: readonly Kind[] = ['music', 'video', 'image'];

/** A dollar, in the unit everything here counts in. */
export const DOLLAR = 1_000_000;

/**
 * What each engine may spend in a month, in dollars.
 *
 * ── Why these three numbers and not one ──────────────────────────────────
 *
 * They are deliberately NOT equal shares. Video is the one that can empty a
 * month in an afternoon — a single Veo Standard shot is 160 000 micro-dollars
 * against a picture's 39 000 — so it gets a ceiling that hurts first. Music
 * is the cheapest per press and the thing the app is for, so it gets the
 * most room.
 *
 * ── Why they add up to less than Google's cap ────────────────────────────
 *
 * $40 + $40 + $10 is $90 against her $100. The gap is deliberate: if ours
 * summed to exactly hers, the first engine to reach its own ceiling would be
 * the one that had already taken everything, and Google's cap would never be
 * the thing that stopped it. Ours must bind first, or they are decoration.
 *
 * Every one is overridable, because the whole point is that they move as the
 * budget moves. Raising Google's cap without raising these does nothing.
 */
export const CEILINGS: Readonly<Record<Kind, number>> = {
  music: 40,
  video: 40,
  image: 10,
};

/**
 * Each one read by its own literal name.
 *
 * `process.env[\`GOOGLE_CAP_${kind}\`]` was shorter and is the wrong thing:
 * a variable assembled at runtime is invisible to everything that looks for
 * variables — the switch-on page, a search of the repository, and
 * `check:envdoc`, which caught this within a minute of it being written.
 * A setting nothing can find is a setting nobody can be told about.
 */
const SAID: Readonly<Record<Kind, () => string | undefined>> = {
  music: () => process.env.GOOGLE_CAP_MUSIC,
  video: () => process.env.GOOGLE_CAP_VIDEO,
  image: () => process.env.GOOGLE_CAP_IMAGE,
};

const named = (kind: Kind): number => {
  const said = Number(SAID[kind]());
  return Number.isFinite(said) && said >= 0 ? said : CEILINGS[kind];
};

/** The month's ceiling for one engine, in micro-dollars. */
export const ceilingFor = (kind: Kind): number => Math.round(named(kind) * DOLLAR);

/**
 * How much of an engine's month one member may take.
 *
 * A share rather than a number, so it moves when the ceiling moves. A tenth
 * means ten members can each have a full share before the engine is empty,
 * which on a few hundred members is strict and is meant to be: the first
 * month will say whether it is too strict, and a ceiling that was too tight
 * is a complaint, while one that was too loose is an invoice.
 */
export const SHARE = 0.1;

export const shareFor = (kind: Kind): number => {
  const said = Number(process.env.GOOGLE_SHARE_EACH);
  const part = Number.isFinite(said) && said > 0 && said <= 1 ? said : SHARE;
  return Math.round(ceilingFor(kind) * part);
};

/** Spent this month on one engine. Null when it could not be read. */
export async function usedMicros(kind: Kind): Promise<number | null> {
  const db = admin();
  /* No database is a deployment with nothing to count and nobody to protect,
     so it answers nought rather than refusing everything. Written down here
     so it is a decision. */
  if (!db) return 0;
  const { data, error } = await db.rpc('google_micros_this_month', { p_kind: kind });
  if (error) return null;
  const micros = Number(data);
  return Number.isFinite(micros) ? micros : null;
}

/** And by one member. Null when it could not be read. */
export async function mineMicros(kind: Kind, owner: string): Promise<number | null> {
  const db = admin();
  if (!db) return 0;
  const { data, error } = await db.rpc('google_micros_this_month_for', { p_kind: kind, p_owner: owner });
  if (error) return null;
  const micros = Number(data);
  return Number.isFinite(micros) ? micros : null;
}

export interface Refusal {
  readonly code: 'google_kind_used' | 'google_yours_used' | 'google_unknown';
  readonly message: string;
  /** What is left on whichever ceiling refused, in micro-dollars. */
  readonly left: number;
}

const money = (micros: number): string => `$${(micros / DOLLAR).toFixed(2)}`;

/**
 * Null when there is room for this much, a refusal when there is not.
 *
 * Called BEFORE the credits are charged, so a member turned away by a
 * ceiling they cannot see has not also paid for the turn.
 *
 * The member's own share is checked first and the engine's month second.
 * Both refuse, but they are different sentences and send somebody to
 * different places: "you are out" is wait or upgrade, "everybody is out" is
 * wait or ask Carli to raise the budget.
 */
export async function enough(
  kind: Kind,
  micros: number,
  owner?: string | null,
): Promise<Refusal | null> {
  if (owner) {
    const mine = await mineMicros(kind, owner);
    if (mine === null) {
      return {
        code: 'google_unknown',
        message: 'We could not check how much of this month is left. Try again in a moment.',
        left: 0,
      };
    }
    const share = shareFor(kind);
    if (mine + micros > share) {
      return {
        code: 'google_yours_used',
        message: `You have used your share of ${kind} for this month. It comes back on the first.`,
        left: Math.max(0, share - mine),
      };
    }
  }

  const used = await usedMicros(kind);
  if (used === null) {
    return {
      code: 'google_unknown',
      message: 'We could not check how much of this month is left. Try again in a moment.',
      left: 0,
    };
  }
  const roof = ceilingFor(kind);
  if (used + micros > roof) {
    return {
      code: 'google_kind_used',
      message: `The ${kind} budget for this month is used up (${money(roof)}). It comes back on the first.`,
      left: Math.max(0, roof - used),
    };
  }
  return null;
}

/**
 * Write down that it was spent.
 *
 * After the work is in hand, never before: a call that failed cost nothing,
 * and a ceiling that counts failures is a ceiling that closes early for a
 * reason nobody can see. Never awaited by a caller — the member's file is
 * ready and the bookkeeping must not hold it.
 */
export async function note(
  kind: Kind,
  micros: number,
  model: string,
  owner?: string | null,
): Promise<void> {
  const db = admin();
  if (!db || micros <= 0) return;
  /* ── The answer is taken, and that matters more here than usual ────

     The supabase client does not THROW on a failed write; it hands back an
     error nobody has to look at. `check:writes` caught this one discarded,
     and it is the worst place in the app to discard one: a spend row that
     silently fails to save is a ceiling that never fills. Everything would
     look fine, all month, while the real number ran past it — and the first
     sign would be Google's own cap pausing all three engines at once. */
  /* Held in a const and then handed to `wrote`, rather than `wrote(await …)`
     across two lines. `check:writes` matches a line that BEGINS with `await`,
     which the two-line form does — it read this as discarded when it was
     not. Conforming is right: the shape it wants is the shape every other
     write in this app already has, and one file formatted its own way is how
     a rule stops being readable at a glance. */
  const saved = await db.from('google_spend').insert({
    kind,
    micros: Math.round(micros),
    model,
    owner: owner ?? null,
  });
  wrote(saved, `what ${kind} cost us`);
}

/** What is left on every engine, for a screen that has to say. */
export async function leftAll(): Promise<Record<Kind, number | null>> {
  const out = {} as Record<Kind, number | null>;
  for (const kind of KINDS) {
    const used = await usedMicros(kind);
    out[kind] = used === null ? null : Math.max(0, ceilingFor(kind) - used);
  }
  return out;
}
