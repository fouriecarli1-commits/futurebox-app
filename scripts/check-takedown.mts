/**
 * The owner's takedown: what one press does, and what it must never do.
 *
 * `docs/CHILD-SAFETY-REPORTING.md` steps 2 and 3 — out of public view at
 * once, the evidence kept, the account stopped — were a row deleted by hand
 * in the database until 26 October 2026. `PATCH /api/report` does them in
 * one press from the owner's report list. This holds the shape of it,
 * because the dangerous mistakes here are quiet ones: a takedown that also
 * deletes the evidence, or a route that answers somebody who is not the
 * owner.
 */
import { readFileSync } from 'node:fs';
import { before, from } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const route = readFileSync('app/api/report/route.ts', 'utf8');
const patch = from(route, 'export async function PATCH');
const feed = readFileSync('app/rss/[show]/route.ts', 'utf8');
const panel = readFileSync('app/components/OwnerReports.tsx', 'utf8');
const account = readFileSync('app/components/Account.tsx', 'utf8');

ok('the takedown is behind the owner\'s door, before anything is read',
  before(patch, 'await opened(request)', ".from('reports')"),
  'a route that removes posts and suspends accounts, open to anybody, is the worst route this app could have');

ok('the row is read before it is deleted, and the deletion is only from the Live room',
  /\.select\('\*'\)\.eq\('id', report\.ref\)/.test(patch)
  && before(patch, ".select('*')", '.delete()')
  && /'live_says' : 'live_posts'/.test(patch),
  'what the post said goes into the record; once the row is gone it can only come from there');

ok('nothing behind the post is deleted: no song, no episode, no file',
  !/from\('(tracks|episodes|shows|cast_members)'\)[^;]*\.delete/.test(patch) && !/storage\s*\.\s*from\([^)]*\)\s*\.\s*remove/.test(patch),
  'it is the evidence, and deleting it can destroy the case (step 3)');

ok('the account is stopped at the sign-in, not only in this app',
  /updateUserById\([^)]*ban_duration/.test(patch),
  'a ban on the auth user holds whichever route somebody tries');

ok('the report is closed, and the record goes to the owner with the SAPS step',
  /handled_at/.test(patch) && /tellOwner\(/.test(patch) && /SAPS/.test(patch) && /08600 10111/.test(patch),
  'the letter is step 6\'s record, and the police report is the one step no button takes');

ok('a suspended member\'s podcast feed stops answering',
  /banned_until/.test(feed) && /getUserById/.test(feed),
  'a feed keeps handing its episodes to every podcast app that asks, whatever happened to the account');

ok('the owner sees the list in the You tab, urgent first, and takedown asks twice',
  /<OwnerReports \/>/.test(account) && /urgent\(/.test(panel) && /arming === one\.id/.test(panel)
  && /Press again/.test(panel),
  'suspending somebody is not a thing to do by a slip of the thumb');

console.log(bad === 0
  ? '\ncheck:takedown — one press takes a post out of the Live room, stops the account and records it, behind the owner\'s door, and deletes no evidence.'
  : `\ncheck:takedown — ${bad} failing.`);
process.exit(bad === 0 ? 0 : 1);
