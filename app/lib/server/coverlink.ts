/**
 * A link to a song's still cover, for reading only.
 *
 * The moving cover (`/api/cover/loop`) needs the cover to send to the
 * engine, and that route also uploads (the loop). `check:coverwall` holds
 * that only `/api/cover` both names a cover file and puts bytes anywhere,
 * so the name is spelled here, in a file that uploads nothing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function stillCoverLink(client: SupabaseClient, owner: string, track: string, seconds: number): Promise<string | null> {
  const { data } = await client.storage.from('tracks').createSignedUrl(`${owner}/${track}.cover.png`, seconds);
  return data?.signedUrl ?? null;
}
