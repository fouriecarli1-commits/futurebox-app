/**
 * The picture a song wears when its cover was bought, not made.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The owner, 21 October 2026, with a photograph of a song still wearing its
 * drawn sleeve: *"Ek het 'n cover foto gekoop vir hierdie liedjie, maar dit
 * wys nie."*
 *
 * A bought piece never moves (`check:coverwall`): the song's row points at it
 * with `art_work`, and the artist's file stays in the art bucket. But every
 * screen that draws a sleeve looked only beside the audio, where a made cover
 * lives — so a bought one was paid for, credited, and never drawn. This is
 * the other half of the pointer: follow `art_work` to the piece and sign it,
 * for a piece the song's owner really bought and a song they really own.
 *
 * ── What it answers ──────────────────────────────────────────────────────
 *
 * A map from song id to a short-lived address, and whether every read
 * answered: a read that failed is not "nothing bought", and the caller says
 * so rather than drawing the pattern as though it were.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const ART_BUCKET = 'art';

export interface Bought {
  readonly urls: Record<string, string>;
  readonly unread: boolean;
}

/** Signed addresses for the bought pieces these songs wear, by song id. */
export async function boughtSleeves(
  client: SupabaseClient,
  songs: readonly { readonly owner: string; readonly track: string }[],
  seconds: number,
): Promise<Bought> {
  const ids = [...new Set(songs.map((one) => one.track).filter(Boolean))];
  if (!ids.length) return { urls: {}, unread: false };
  const ownerOf = new Map(songs.map((one) => [one.track, one.owner]));

  const { data: worn, error: rowsUnread } = await client
    .from('tracks')
    .select('id, owner, art_work')
    .in('id', ids)
    .not('art_work', 'is', null);
  if (rowsUnread) return { urls: {}, unread: true };
  /* The song has to be the one asked about, on the account asked about. */
  const wearing = (worn ?? []).filter((row) => ownerOf.get(String(row.id)) === String(row.owner));
  const pieces = [...new Set(wearing.map((row) => String(row.art_work)))];
  if (!pieces.length) return { urls: {}, unread: false };

  const { data: works, error: worksUnread } = await client
    .from('art_works')
    .select('id, path, sold_to')
    .in('id', pieces);
  if (worksUnread) return { urls: {}, unread: true };
  const work = new Map((works ?? []).map((row) => [String(row.id), row as { path: string; sold_to: string | null }]));

  /* Only a piece the song's owner bought: `sold_to` is the one fact that
     says the picture is theirs to wear. */
  const wanted = wearing.flatMap((row) => {
    const piece = work.get(String(row.art_work));
    return piece && piece.path && piece.sold_to === String(row.owner) ? [{ track: String(row.id), path: piece.path }] : [];
  });
  if (!wanted.length) return { urls: {}, unread: false };

  const { data: signed, error: signUnread } = await client.storage
    .from(ART_BUCKET)
    .createSignedUrls(wanted.map((one) => one.path), seconds);
  if (signUnread) return { urls: {}, unread: true };
  const urls: Record<string, string> = {};
  for (const row of signed ?? []) {
    if (row.error || !row.signedUrl) continue;
    for (const one of wanted) if (one.path === row.path) urls[one.track] = row.signedUrl;
  }
  return { urls, unread: false };
}
