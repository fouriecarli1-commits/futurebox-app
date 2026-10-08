/**
 * The record of a cover that was ordered, so one that was never collected
 * can be.
 *
 * ── The hole this fills ──────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Ek sien ek het een gegenerate en nou is dit weg."*
 *
 * It was. The copy from the engine into our storage happened inside
 * `GET /api/cover?id=…`, and that handler runs only because an open panel is
 * polling it. The panel unmounts when a song stops playing. A phone sleeps. A
 * tab gets closed. In every one of those the engine had drawn the picture,
 * two credits were gone, and the one piece of code that would have saved it
 * was never reached — and because the job id lived only in that component's
 * local variable, there was afterwards nothing anywhere that knew the picture
 * existed.
 *
 * So the id is written down before the credits are spent. That is the whole
 * idea: `pending` can then find an uncollected cover the next time that
 * song's panel opens, days later, on a different device.
 *
 * ── Why the seam, and not four lines in the route ────────────────────────
 *
 * Because `pending` has a rule in it that is worth testing and easy to get
 * wrong: it must ignore a job already kept, ignore a job that failed, and
 * take the NEWEST of what is left. Get the last part wrong and "Another"
 * followed by a closed tab collects the cover before the one she actually
 * asked for. That is a behaviour, it has three branches, and a route is not a
 * place a check can drive it. `check:coverkeep` drives it here.
 */

import { admin } from './account';
import { wrote } from './wrote';

/** The table, named once. */
const TABLE = 'cover_jobs';

/**
 * Write down an ordered cover, before anything is charged for it.
 *
 * Returns whether the row landed. The caller cares, and this is one of the
 * few writes in this app where it should: a job nobody recorded is a cover
 * that cannot be recovered, and the honest thing is to say so at the time
 * rather than discover it a week later when the picture is gone.
 */
export async function remember(
  owner: string,
  trackId: string,
  jobId: string,
  charged: number,
): Promise<boolean> {
  const db = admin();
  if (!db) return false;
  const saved = await db.from(TABLE).insert({
    id: jobId,
    owner,
    track_id: trackId,
    charged: Math.max(0, Math.round(charged)),
  });
  return wrote(saved, 'the cover job');
}

/* ── Just enough of the client for the one query below ──────────────────

   Narrow on purpose, and exported, because the whole behaviour worth testing
   in this file is which rows that query asks for: ignore the kept, ignore the
   failed, take the newest. That is three conditions, and a check that reads
   the source for the words `kept_at` is checking the spelling rather than the
   rule — the thing Carli objects to most in this repo, and rightly.

   So `pending` takes its client. `check:coverkeep` hands it a few rows and a
   fake that APPLIES the filters it is given, so a forgotten `.is` comes back
   as a kept cover being offered for collection again, which is what the bug
   would actually look like. */
interface Rows {
  readonly data: readonly { readonly id?: string }[] | null;
  readonly error: unknown;
}

interface Chain {
  select(columns: string): Chain;
  eq(column: string, value: string): Chain;
  is(column: string, value: null): Chain;
  order(column: string, options: { ascending: boolean }): Chain;
  limit(count: number): Promise<Rows>;
}

export interface Asked {
  from(table: string): Chain;
}

/**
 * The newest cover ordered for this song that was neither collected nor
 * failed, or null.
 *
 * A failed read answers null, which reads as "nothing to collect" — the
 * safe direction. The opposite mistake would offer a keep button that
 * collects nothing, every time, for a song that has no cover coming.
 */
export async function pending(
  owner: string,
  trackId: string,
  /* One cast, here, rather than a loose type spreading through the file. The
     real client has all four of these methods with these shapes; `Asked` is
     the subset this query uses. */
  db: Asked | null = admin() as Asked | null,
): Promise<string | null> {
  if (!db) return null;
  const { data, error } = await db
    .from(TABLE)
    .select('id')
    .eq('owner', owner)
    .eq('track_id', trackId)
    /* Both, and both matter. `kept_at` null is the point of the table.
       `failed_at` null keeps a cover the engine refused from being offered
       forever as something to go and fetch. */
    .is('kept_at', null)
    .is('failed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return null;
  const row = (data ?? [])[0] as { id?: string } | undefined;
  return typeof row?.id === 'string' && row.id ? row.id : null;
}

/** It is in our storage now. Nothing will offer to collect it again. */
export async function markKept(jobId: string): Promise<void> {
  const db = admin();
  if (!db) return;
  const now = new Date().toISOString();
  wrote(
    await db.from(TABLE).update({ kept_at: now, updated_at: now }).eq('id', jobId),
    'that the cover was kept',
  );
}

/** The engine could not make it. Their sentence is the one worth keeping. */
export async function markFailed(jobId: string, message: string): Promise<void> {
  const db = admin();
  if (!db) return;
  const now = new Date().toISOString();
  wrote(
    await db.from(TABLE).update({ failed_at: now, error: message.slice(0, 500), updated_at: now }).eq('id', jobId),
    'that the cover failed',
  );
}

/**
 * Credits owed back for a failed cover, claimed once.
 *
 * The same shape as the dub refund and for the same reason: a failure is only
 * ever discovered by a poll, and a poll happens as many times as a screen
 * asks. Deciding in the route and paying after it is the shape that pays
 * twice, so the claim IS the update — a second caller matches no row and is
 * told nothing is owed.
 */
export async function claimRefund(jobId: string, owner: string): Promise<number> {
  const db = admin();
  if (!db) return 0;
  const { data, error } = await db.rpc('claim_cover_refund', { p_cover: jobId, p_owner: owner });
  if (error) return 0;
  const give = typeof data === 'number' ? data : Number(data ?? 0);
  return Number.isFinite(give) && give > 0 ? give : 0;
}
