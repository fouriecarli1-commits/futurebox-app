/**
 * The name somebody goes by in the live jam room, read on the server.
 *
 * Their creator name, or their handle with an @, or nothing — never what the
 * browser says it is called. The looper's room list and the stage of
 * characters both print it to everybody in the room, so both take it from the
 * account's own row rather than from the request (`api/live/loops`,
 * `api/live/jammers`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function jamNameOf(client: SupabaseClient, owner: string): Promise<string> {
  const { data } = await client.from('creators').select('name, handle').eq('owner', owner).maybeSingle();
  const row = data as { name?: string | null; handle?: string | null } | null;
  return (row?.name || (row?.handle ? `@${row.handle}` : '') || '').slice(0, 40);
}
