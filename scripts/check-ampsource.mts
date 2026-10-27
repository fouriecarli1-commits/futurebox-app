/**
 * Does every capture in the amp catalogue say where it came from, and is
 * nothing from TONE3000 handed to members without written permission?
 *
 * The owner, 27 October 2026: *"write a where did it come from check for
 * tone3000"*. TONE3000's API terms forbid keeping their tones on our
 * servers and giving them to people who did not ask for them through their
 * API, and their terms of service need written permission from the maker
 * and TONE3000 for commercial distribution (`docs/TONE3000-API-TERME.md`).
 * The catalogue does exactly that kind of handing out, so the rule is held
 * at every door: the rule itself, the route that adds and lists, the
 * owner's form, and the table.
 *
 *   npm run check:ampsource
 */
import { readFileSync } from 'node:fs';
import { fromTone3000, mayList, originRefusal } from '../app/lib/ampsource.ts';
import { before } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const T3K = 'https://www.tone3000.com/tones/fender-twin-1965-42';

/* ── The rule ─────────────────────────────────────────────────────────── */
ok('a TONE3000 page is known for one', fromTone3000(T3K) && fromTone3000('https://tone3000.com/x') && !fromTone3000('https://example.com/tone3000-fan'));
ok('a capture with no answer is not for members', !mayList('unknown') && !mayList('') && !mayList(null));
ok('  and one she captured herself, or has permission for, is', mayList('own') && mayList('permission'));
ok('no answer is refused', originRefusal('unknown', T3K, '') !== null);
ok('a TONE3000 tone "with permission" but no note of it is refused', originRefusal('permission', T3K, '') !== null);
ok('  and the refusal names TONE3000', /TONE3000/.test(originRefusal('permission', T3K, 'ok') ?? ''));
ok('  and with a note of who and when, it may go', originRefusal('permission', T3K, 'Maker by e-mail 20 Oct; TONE3000 support 27 Oct') === null);
ok('her own capture needs no note', originRefusal('own', '', '') === null);

/* ── The route ────────────────────────────────────────────────────────── */
const route = readFileSync('app/api/amps/route.ts', 'utf8');
ok('the route asks where it came from before anything is added',
  /originRefusal\(origin, source, permission\)/.test(route)
  && before(route, 'originRefusal(origin, source, permission)', ".from('amp_catalogue')\n    .insert"),
  'an add that skips the question puts a capture in front of every member with nothing said about its origin');
ok('members are listed only what says where it came from',
  /isOwner \|\| mayList\(row\.origin\)/.test(route));
ok('and one fetched by its id is refused to a member when it does not',
  /!mayList\(data\.origin\) && !callerIsOwner\(caller\)/.test(route),
  'a hidden row reachable by its id is not hidden');
ok('the note of permission goes to the owner alone',
  /amps\.map\(\(\{ permission: _note, \.\.\.row \}\) => row\)/.test(route),
  'who gave permission is a name and a date between her and them');
ok('an older one is marked through the same rule', /export async function PATCH/.test(route) && /originRefusal\(origin, row\.source/.test(route));

/* ── The owner's form ─────────────────────────────────────────────────── */
const screen = readFileSync('app/components/AmpCatalogue.tsx', 'utf8');
ok('the form asks before it sends', /originRefusal\(origin, source, permission\)/.test(screen) && /data-ampaddorigin/.test(screen));
ok('and an unmarked one is flagged for her, with a way to mark it', /data-ampunmarked/.test(screen) && /data-ampmark=/.test(screen));

/* ── The table ────────────────────────────────────────────────────────── */
const sql = readFileSync('supabase/amps.sql', 'utf8');
ok('the table holds where it came from, unknown until said',
  /add column if not exists origin text not null default 'unknown'/.test(sql)
  && /check \(origin in \('own', 'permission', 'unknown'\)\)/.test(sql));

console.log(bad === 0
  ? '\ncheck:ampsource — every capture says where it came from, and nothing from TONE3000 reaches a member without written permission noted.'
  : `\ncheck:ampsource — ${bad} failing.`);
process.exit(bad === 0 ? 0 : 1);
