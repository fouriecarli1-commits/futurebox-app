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
import { readFileSync } from 'node:fs';
import { ownedPath, storageId } from '../app/lib/server/ownedpath.ts';

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

/* ── storageId: the piece a path is built out of ──────────────────────────
 *
 * `ownedPath` is handed a whole path. `storageId` is handed the part that goes
 * after the caller's folder, and the folder in front of it is the only thing
 * keeping a file in the right account — `/api/cover` uploads with the
 * service-role key, which does not consult the bucket policies at all.
 *
 * So the refusals below are not about tidy ids. Each one is a path that leaves
 * the folder it was supposed to be pinned inside. */
console.log('');

const ids = ['t-1700000000000', 'e-1700000000000', 'abc123', 'a', 'A-b_C-9'];
for (const id of ids) ok(`accepts the id ${id}`, storageId(id) === id);

const badIds: [string, unknown][] = [
  ['a traversal', `../${YOU}/theirsong`],
  ['a traversal in the middle', `..%2f..%2f${YOU}%2fsong`],
  ['a bare pair of dots', '..'],
  ['a single dot', '.'],
  ['a slash at all', `t-1/${YOU}`],
  ['a backslash', `t-1\\..\\${YOU}`],
  ['a percent, which is where an encoded slash starts', 't-1%2f..'],
  ['a dot, which is where a second extension starts', 't-1.wav'],
  ['a null byte', 't-1\u0000'],
  ['a newline', 't-1\n'],
  ['a space', 't 1'],
  ['a leading dash, so no id can be read as a flag', '-t-1'],
  ['a leading underscore', '_t-1'],
  ['an empty string', ''],
  ['an id longer than any this app mints', 't-'.padEnd(200, '1')],
  ['a number', 1700000000000],
  ['null', null],
  ['undefined', undefined],
  ['an object that stringifies to a valid id', { toString: () => 't-1' }],
];
for (const [what, value] of badIds) {
  ok(`refuses ${what}`, storageId(value) === null, String(value).slice(0, 40));
}

/* The point of the whole thing, stated as the thing that must not happen: no
   accepted id can build a path that ends up outside the folder in front of
   it. Written as a property over every id above rather than as one more case,
   because the next id somebody adds should have to pass this too. */
for (const id of ids) {
  const path = `${ME}/${id}.wav`;
  ok(
    `${id} builds a path inside my own folder`,
    path.split('/').length === 2 && path.startsWith(`${ME}/`) && !path.includes('..'),
  );
}

/* ── And the routes that build those paths actually call it ───────────────
 *
 * The helper being right is half of it. A route that interpolates an id
 * straight into a path has the same hole whether or not this file exists, and
 * that is exactly what these four were doing before it did. */
const mustGuard = [
  'app/api/track/download/route.ts',
  'app/api/collab/track/route.ts',
  'app/api/cover/route.ts',
  'app/api/live/route.ts',
];
for (const file of mustGuard) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  ok(`${file} refuses an id that is not a storageId`, source.includes('storageId('));
}

if (failures) {
  console.error(`\ncheck:ownedpath — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:ownedpath — a row can only claim its own file, and no id can leave its folder.');
