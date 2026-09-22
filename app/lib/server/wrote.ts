/**
 * Say so when a write did not happen.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The supabase client does not throw. A failed insert comes back as
 * `{ error }`, so `await client.from('x').insert({…});` written as a bare
 * statement is a write that can fail forever and never say a word.
 *
 * Fifteen of them were written that way. Two had already gone wrong:
 *
 *   `writeGeneration` named two columns that `abuse.sql` adds, and abuse.sql
 *   had never been run. Postgres refuses the whole insert when a named
 *   column is missing, so every generation this app made failed to record,
 *   for weeks. Found by `supabase/WATKORT.sql` on 22 September 2026 — by
 *   asking the database, not by anything watching the app.
 *
 *   `setMembership`, in the payments webhook, sat three functions below an
 *   art-market write that DOES check and says so. That one is money.
 *
 * The rest were the same shape and simply had not failed yet: the credit
 * ledger, what ElevenLabs charged for every read, the moderation trail, a
 * second subscriptions upsert.
 *
 * ── Why a helper rather than fifteen hand-written blocks ─────────────────
 *
 * One line at the call site, so adding it is never the thing somebody skips
 * because it is three lines of noise around a one-line write. And one
 * wording, so a search for `[db]` finds all of them.
 *
 * It returns whether the write landed, for the callers that care. Most do
 * not — recording a statistic is not worth failing a request over — and for
 * those the value is simply that the failure is now on the record instead of
 * nowhere. `check:writes` keeps it that way.
 */

/** What the supabase client hands back from a write. */
interface Written {
  readonly error: { readonly message: string } | null;
}

/**
 * `wrote(await client.from('x').insert({…}), 'the credit entry')`
 *
 * `what` is the thing in plain words, because the line is read by whoever is
 * working out why a number is wrong, and "the credit entry did not save" is
 * a sentence. It is not the table name: the table is in the error.
 */
export function wrote(result: Written, what: string): boolean {
  if (!result?.error) return true;
  console.error(`[db] ${what} did not save: ${result.error.message}`);
  return false;
}
