/**
 * The artist line on a song two people made together in a pair room.
 *
 * The owner, 22 October 2026: *"Met die collab liedjies moet by artist staan,
 * Collab en die twee mense se handle name."* So the line is the word Collab
 * and both handles, the maker's first: "Collab · @zoe & @thabo". A handle is
 * what both people chose to be found by, and the one name in a collab that
 * is always there — a recording name is optional.
 *
 * Shared by the song room, which writes it onto the track, and the live
 * room, which builds it again from the pair itself rather than trusting a
 * line a browser sent: a post that could name anybody as its co-artist is a
 * post that can put words in a stranger's mouth.
 */
const at = (handle: string | null | undefined): string => {
  const bare = (handle ?? '').trim().replace(/^@+/, '');
  return bare ? `@${bare}` : '';
};

export function collabCredit(maker: string | null | undefined, other: string | null | undefined): string {
  const both = [at(maker), at(other)].filter(Boolean);
  return both.length ? `Collab · ${both.join(' & ')}` : 'Collab';
}
