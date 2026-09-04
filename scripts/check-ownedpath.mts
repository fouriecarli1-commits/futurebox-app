/**
 * A row cannot claim a file that is not the caller's own.
 *
 * `lib/server/ownedpath.ts` is the only thing standing between an account and
 * a row pointing at somebody else's picture. The bucket policies do not cover
 * it — they guard the file, this guards the claim — so if this quietly starts
 * accepting things there is no second line.
 *
 * Every refusal below is a real attempt somebody would make: another account's
 * folder, traversal in every encoding it survives, a different extension, and
 * the shapes that fall out of a regex built by interpolation.
 */
import { ownedPath } from '../app/lib/server/ownedpath.ts';

const ME = '11111111-2222-3333-4444-555555555555';
const YOU = '99999999-8888-7777-6666-555555555555';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const mine = `${ME}/1700000000000.webp`;
ok('my own path is accepted', ownedPath(mine, ME, 'webp') === mine);

const refuse: [string, unknown][] = [
  ['another account\'s folder', `${YOU}/1700000000000.webp`],
  ['a bare filename', '1700000000000.webp'],
  ['traversal out of my folder', `${ME}/../${YOU}/1700000000000.webp`],
  ['traversal at the front', `../${YOU}/1700000000000.webp`],
  ['an encoded traversal', `${ME}%2f..%2f${YOU}%2f1.webp`],
  ['a backslash instead of a slash', `${ME}\\1700000000000.webp`],
  ['a second segment', `${ME}/nested/1700000000000.webp`],
  ['a different extension', `${ME}/1700000000000.svg`],
  ['no extension', `${ME}/1700000000000`],
  ['a non-numeric name', `${ME}/photo.webp`],
  ['a leading slash', `/${ME}/1700000000000.webp`],
  ['a trailing newline, which the `m` flag would let through', `${ME}/1700000000000.webp\n`],
  ['something after the extension', `${ME}/1700000000000.webp.php`],
  ['an empty string', ''],
  ['a number', 1700000000000],
  ['null', null],
  ['an object that stringifies to a valid path', { toString: () => mine }],
  ['a path longer than any real one', `${ME}/${'1'.repeat(300)}.webp`],
];
for (const [what, value] of refuse) {
  ok(`refuses ${what}`, ownedPath(value, ME, 'webp') === null, String(value).slice(0, 60));
}

/* The owner id is interpolated into a regex, so what happens when it is not a
   uuid matters. It always is — it comes off a verified token — and the guard
   is there because "always" is a property of today's code. */
ok(
  'refuses when the owner is not a uuid at all',
  ownedPath('anything/1.webp', 'anything', 'webp') === null,
);
ok(
  'a regex-shaped owner cannot match a foreign path',
  ownedPath(`${YOU}/1.webp`, '.*', 'webp') === null,
);

if (failures) {
  console.error(`\ncheck:ownedpath — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:ownedpath — a row can only claim its own file.');
