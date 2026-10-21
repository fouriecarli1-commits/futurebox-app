/**
 * May this person make the song in this pair room right now?
 *
 * The owner, 21 October 2026: in a collab, *"Beide moet kan goedkeuring gee
 * om uiteindelik die liedjie te generate."* So a song asked for from a pair
 * room is refused — before anything is charged — unless the caller holds the
 * pen and both of them have said yes. Making it clears both ticks, so the
 * next song needs two new ones.
 *
 * A project where `supabase/pairs.sql` has not been re-run has no tick
 * columns; there the gate stands open rather than stopping every song in
 * every pair room, and the strip says the approvals are not switched on.
 */

import { admin } from './account';
import type { Share } from './credits';
import { filterSafe } from './filtersafe';

/** Postgres and PostgREST's ways of saying a column is not there. */
const NO_COLUMN = /42703|PGRST204|column .* does not exist|could not find .* column/i;

export type Gate =
  | {
    readonly ok: true;
    readonly made: () => Promise<void>;
    /** Who pays, and who the other person is — `chargeTogether` in `credits.ts`. */
    readonly share: Share;
    readonly other: string | null;
  }
  | { readonly ok: false; readonly status: number; readonly message: string };

const OPEN: Gate = { ok: true, made: async () => undefined, share: 'caller', other: null };

export async function pairMayMake(caller: string, pair: string): Promise<Gate> {
  const client = admin();
  if (!client || !filterSafe(pair)) return { ok: false, status: 400, message: 'Which room?' };
  /* With who pays when that column is there (`pairs.sql`, re-run); the
     person pressing Make pays it all where it is not, as before. */
  let read = await client
    .from('pairs').select('id, a, b, pen, ok_a, ok_b, pays').eq('id', pair).maybeSingle();
  if (read.error && NO_COLUMN.test(`${read.error.code ?? ''} ${read.error.message ?? ''}`)) {
    read = await client
      .from('pairs').select('id, a, b, pen, ok_a, ok_b').eq('id', pair).maybeSingle() as typeof read;
  }
  const { data: row, error } = read;
  if (error) {
    if (NO_COLUMN.test(`${error.code ?? ''} ${error.message ?? ''}`)) return OPEN;
    return { ok: false, status: 503, message: 'Could not check the room. Try again in a moment.' };
  }
  if (!row || (row.a !== caller && row.b !== caller)) {
    return { ok: false, status: 403, message: 'That room is not yours.' };
  }
  if (row.pen !== caller) {
    return { ok: false, status: 409, message: 'It is the other person’s turn. Ask for the turn first.' };
  }
  if (!row.ok_a || !row.ok_b) {
    return { ok: false, status: 409, message: 'Both of you approve the song first — then it can be made.' };
  }
  const other = row.a === caller ? row.b : row.a;
  const mySide = row.a === caller ? 'a' : 'b';
  const pays = (row as { pays?: unknown }).pays;
  const share: Share = pays === 'a' || pays === 'b' ? (pays === mySide ? 'caller' : 'other') : pays === 'half' ? 'half' : 'caller';
  return {
    ok: true,
    share,
    other,
    made: async () => {
      const { error: cleared } = await client.from('pairs').update({ ok_a: false, ok_b: false }).eq('id', pair);
      if (cleared) console.error(`[pairs] the approvals could not be cleared after a song: ${cleared.message}`);
    },
  };
}
