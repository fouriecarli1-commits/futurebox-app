/**
 * check:reports — reporting and blocking, held without a browser.
 *
 * Google Play asks an app that makes things with AI, and shows members each
 * other's work, for two things: a way to report something offensive without
 * leaving the app, and a way to block the member who posted it.
 * `lib/reports.ts` has the why; `audit/reports.mjs` presses the buttons.
 */
import { readFileSync, existsSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { REPORT_REASONS, blockedList, cleanReport, urgent, withoutBlocked, MOST_BLOCKED, NOTE_MOST } from '../app/lib/reports.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};
const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

ok('a report is a reason, not an essay: one press each', REPORT_REASONS.length >= 6
  && REPORT_REASONS.some((one) => one.id === 'child') && REPORT_REASONS.some((one) => one.id === 'person'));
const fine = cleanReport({ kind: 'post', reason: 'hate', ref: 't1', about: 'u1', where: 'spotlight', note: 'x'.repeat(5000) });
ok('a report as sent is kept, cut to length', fine !== null && fine.note.length === NOTE_MOST && fine.about === 'u1');
ok('  an unknown kind or reason is not a report',
  cleanReport({ kind: 'nonsense', reason: 'hate' }) === null && cleanReport({ kind: 'ai', reason: 'boring' }) === null);
ok('  a report about a member says which member', cleanReport({ kind: 'user', reason: 'scam' }) === null);
ok('  and something the AI made needs no owner', cleanReport({ kind: 'ai', reason: 'violence', where: 'make' })?.about === null);
ok('a child’s safety is read first', urgent({ reason: 'child' }) && urgent({ reason: 'selfharm' }) && !urgent({ reason: 'scam' }));

ok('a blocked list is unique and bounded',
  blockedList(['a', 'a', '', 'b']).join() === 'a,b' && blockedList(Array.from({ length: 900 }, (_, i) => `u${i}`)).length === MOST_BLOCKED);
ok('  and a blocked member’s work is left out, nobody else’s',
  withoutBlocked([{ o: 'a' }, { o: 'b' }, { o: null }], (one) => one.o, ['a']).length === 2);

const report = code('app/api/report/route.ts');
ok('the report route checks what it is sent, and brakes', /cleanReport\(/.test(report) && /refuseIfTooMany\(/.test(report));
ok('  stores it, and tells the owner', /from\('reports'\)/.test(report) && /mail|send/i.test(report));
ok('  and only the owner reads the reports', /opened\(/.test(report));
const blocks = code('app/api/block/route.ts');
ok('a block needs an account and cannot be of yourself', /callerFrom\(/.test(blocks) && /owner === caller\.id/.test(blocks));
ok('the tables exist, and members cannot read the reports',
  existsSync('supabase/reports.sql') && !/policy[^;]*on public\.reports/i.test(readFileSync('supabase/reports.sql', 'utf8')));

ok('the flag is in every making room’s bar, the photo editor’s export, and the parents’ page',
  /ReportFlag[\s\S]{0,120}kind: 'ai'/.test(code('app/page.tsx'))
  && /ReportFlag[\s\S]{0,120}kind: 'ai'/.test(code('app/components/PostStudio.tsx'))
  && /ReportSheet[\s\S]{0,120}kind: 'ai'/.test(code('app/components/KidsDoor.tsx')));
const live = code('app/components/LiveChannel.tsx');
ok('  and on other members’ posts in the live room, which hides who is blocked',
  /!post\.mine && \(\s*<ReportFlag/.test(live) && /useBlocked\(/.test(live) && /withoutBlocked\(room\.posts/.test(live));
ok('  and in the full-screen room', /ReportFlag/.test(code('app/components/RoomScreen.tsx')));
const feed = code('app/api/live/route.ts');
ok('the feed sends a member key, never the account, and leaves out who the reader blocked',
  /who: whoOf\(post\.owner\)/.test(feed) && /!hidden\.has\(post\.owner\)/.test(feed) && !/owner: post\.owner/.test(feed));

if (bad) {
  console.error(`\ncheck:reports — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:reports — what the AI made and what members post can be reported from where it is seen, a member can be blocked, and only the owner reads the reports.');
