/**
 * Where a published episode's audio actually lives.
 *
 * One function, because there were about to be two. The feed builds this
 * address for every podcast app in the world, and the dubbing panel needs the
 * same file back to send it away and have it said in another language. If the
 * two ever disagreed, the feed would work and the dub would silently fetch
 * nothing — and "nothing" arrives as a zero-byte file, not as an error.
 *
 * The bucket is public on purpose: podcast apps do not sign in, they fetch an
 * address on a schedule for years. That is said out loud on the publish
 * button, where somebody is deciding.
 */

const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');

export function episodeAudioUrl(path: string): string {
  return `${base}/storage/v1/object/public/episodes/${path}`;
}
