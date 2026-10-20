/**
 * Apple Music's top 20 is read the way Apple write it, and only ever opens on
 * Apple.
 *
 * ── Why a check rather than a look ───────────────────────────────────────
 *
 * The outbound call to Apple is blocked where this is built, so the reader in
 * `lib/server/applemusic.ts` has never seen a live answer here. What it can be
 * held to is the shape Apple publish, and the two things that matter most
 * about a chart of someone else's links on a page of ours:
 *
 *   · every row it keeps opens on music.apple.com and every cover comes from
 *     Apple's own image host — a feed is somebody else's text, and a row
 *     pointing anywhere else is a row we would be vouching for;
 *   · it stops at twenty, and a broken or empty feed is an empty chart rather
 *     than a crash or a half-drawn one.
 *
 * And one quirk worth pinning: the feed spells the rating "Explict". A reader
 * written against the dictionary flags nothing.
 */
import { appleRowsOf } from '../app/lib/server/applemusic';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const song = (i: number, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  artistName: `Artist ${i}`,
  id: String(i),
  name: `Song ${i}`,
  kind: 'songs',
  artworkUrl100: `https://is1-ssl.mzstatic.com/image/thumb/${i}/100x100bb.jpg`,
  url: `https://music.apple.com/za/album/song/${i}?i=${i}`,
  ...extra,
});

const feed = {
  feed: {
    title: 'Top Songs',
    country: 'za',
    updated: 'Tue, 20 Oct 2026 12:00:00 +0000',
    results: [
      song(1, { contentAdvisoryRating: 'Explict' }),
      song(2, { url: 'https://evil.example.com/song', name: 'Elsewhere' }),
      song(3, { artworkUrl100: 'javascript:alert(1)' }),
      song(4, { url: 'http://music.apple.com/za/album/x/4' }),
      song(5, { name: '' }),
      song(6, { contentAdvisoryRating: 'Explicit' }),
      ...Array.from({ length: 30 }, (_, i) => song(100 + i)),
    ],
  },
};

const { rows, updated } = appleRowsOf(feed);
ok('it stops at twenty', rows.length === 20, `${rows.length}`);
ok('Apple’s own date is kept', updated === 'Tue, 20 Oct 2026 12:00:00 +0000');
ok('every row opens on music.apple.com, over https',
  rows.every((row) => row.ref.startsWith('https://music.apple.com/')),
  rows.map((row) => row.ref).filter((ref) => !ref.startsWith('https://music.apple.com/')).join(', '));
ok('a row pointing anywhere else is dropped', !rows.some((row) => row.title === 'Elsewhere'));
ok('a plain-http link is dropped', !rows.some((row) => row.title === 'Song 4'));
ok('a row with no title is dropped', !rows.some((row) => row.title === ''));
ok('every cover is Apple’s or none at all',
  rows.every((row) => row.art === '' || row.art.startsWith('https://is1-ssl.mzstatic.com/')));
ok('a cover that is not a picture link is blanked, the song kept',
  rows.some((row) => row.title === 'Song 3' && row.art === ''));
ok('"Explict", Apple’s own spelling, is flagged',
  rows.find((row) => row.title === 'Song 1')?.explicit === true);
ok('"Explicit" is flagged too', rows.find((row) => row.title === 'Song 6')?.explicit === true);
ok('a song with no rating is not', rows.find((row) => row.title === 'Song 100')?.explicit === false);

for (const [what, broken] of [
  ['nothing', null],
  ['no feed', {}],
  ['results that are not a list', { feed: { results: 'x' } }],
  ['a list of nonsense', { feed: { results: [1, 'two', null, []] } }],
] as const) {
  const read = appleRowsOf(broken);
  ok(`${what} reads as an empty chart`, read.rows.length === 0 && read.updated === null);
}

if (failures) {
  console.error(
    '\ncheck:applechart — Apple Music’s chart must be read as Apple publish it, stop at\n' +
      'twenty, and keep only rows that open on Apple Music with Apple’s own covers.\n',
  );
  process.exit(1);
}
console.log('\ncheck:applechart — the top 20 is read as Apple write it, and opens only on Apple.');
