/**
 * A member, as a key a browser may hold without holding their account id.
 *
 * Blocking needs the browser to know "these two posts are the same person's",
 * and the feed deliberately never sends the account id (the radar drops it
 * for the same reason). This is a one-way key: the same member always gives
 * the same `who`, and a `who` gives nothing back. A block is still written
 * against the real account, resolved on the server from the post itself.
 */
import { createHash } from 'node:crypto';
import type { admin } from './account';

export function whoOf(owner: string): string {
  return createHash('sha256').update(`futurebox-member:${owner}`).digest('hex').slice(0, 20);
}

/** Who this member has blocked, by account id. Empty when the table is not there. */
export async function blockedBy(
  client: NonNullable<ReturnType<typeof admin>>,
  blocker: string,
): Promise<Set<string>> {
  try {
    const { data, error } = await client.from('blocks').select('blocked').eq('blocker', blocker).limit(500);
    if (error) return new Set();
    return new Set(((data ?? []) as { blocked: string }[]).map((row) => row.blocked));
  } catch {
    return new Set();
  }
}
