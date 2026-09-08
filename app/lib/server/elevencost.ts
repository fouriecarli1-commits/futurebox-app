/**
 * What ElevenLabs charged, written down next to what we charged for it.
 *
 * ── The question this exists to answer ───────────────────────────────────
 *
 * Every ElevenLabs response carries a `character-cost` header: exactly how
 * much of the month's allowance that one call took. Until now it went into the
 * log, where nobody reads it again.
 *
 * The question is one question: **are we charging enough?** This app charges
 * credits by the minute. ElevenLabs charges by the character. Those are not
 * the same thing, and a wrong conversion between them is money quietly gone
 * every month. Without a row per call, the first place that shows up is the
 * invoice — by which point it has been happening for weeks.
 *
 * ── What it deliberately does not hold ───────────────────────────────────
 *
 * No text, no audio, no name, no owner. What was done, what it cost them, what
 * it cost the member, and their request id so one row can be looked up against
 * ElevenLabs' own record. A table that answers a pricing question does not need
 * to know whose sentence it was.
 *
 * ── Never in the way ─────────────────────────────────────────────────────
 *
 * Every path here swallows its own failure. A generation that worked must not
 * be turned into an error because the bookkeeping did not land, and a cost
 * report is never a reason for a generation to fail.
 */

import { admin } from './account';

export interface Spend {
  /** Which piece of work: 'speak', 'voice-change', 'clone', 'dub', … */
  readonly what: string;
  /** Their `character-cost`. Null when the header was absent — not zero. */
  readonly characters: number | null;
  /** What this app took for it, where the caller knew. */
  readonly credits?: number | null;
  /** Their `request-id`, so a row can be matched against their dashboard. */
  readonly request?: string | null;
}

/** Files one call away. Fire and forget: the caller is already holding audio. */
export function noteSpend(spend: Spend): void {
  const db = admin();
  if (!db) return;

  /* Nothing to compare and nothing to look up is not worth a row. */
  if (spend.characters === null && !spend.request) return;

  try {
    void db
      .from('eleven_costs')
      .insert({
        what: spend.what,
        characters: spend.characters,
        credits: spend.credits ?? null,
        request_id: spend.request ?? null,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    // A table that is not there yet is not a reason to fail a generation.
  }
}
