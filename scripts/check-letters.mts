import { welcomeLetter, receiptLetter, cancelledLetter, rands } from '../app/lib/server/letters.ts';

let bad = 0;
const ok = (cond: boolean, what: string) => {
  if (!cond) bad += 1;
  console.log(`  ${cond ? 'ok ' : '✗  '} ${what}`);
};

console.log('rands');
ok(rands(29900) === 'R299.00', 'R299.00 from 29900 cents');
ok(rands(0) === 'R0.00', 'R0.00 from nothing');
ok(rands(5) === 'R0.05', 'five cents');

console.log('\nwelcome');
for (const lang of ['en', 'af'] as const) {
  const l = welcomeLetter(lang);
  ok(l.subject.length > 0 && l.text.length > 200, `${lang}: has a subject and a body`);
  ok(!/undefined|NaN|\[object/.test(l.text), `${lang}: nothing unrendered`);
}
ok(welcomeLetter('af').text.includes('toestel'), 'af is actually Afrikaans');
ok(welcomeLetter('en').text.includes('device'), 'en is actually English');

console.log('\nreceipt');
const paid = { what: 'studio plan', cents: 29900, reference: 'ref_abc123', when: new Date('2026-09-04T10:00:00Z') };
for (const lang of ['en', 'af'] as const) {
  const l = receiptLetter(paid, lang);
  ok(l.subject.includes('R299.00'), `${lang}: amount in the subject`);
  ok(l.subject.includes('ref_abc123'), `${lang}: reference in the subject`);
  ok(l.text.includes('R299.00'), `${lang}: amount in the body`);
  ok(l.text.includes('ref_abc123'), `${lang}: reference in the body`);
  ok(l.text.includes('2026-09-04'), `${lang}: the date`);
  ok(!/undefined|NaN|\[object/.test(l.text), `${lang}: nothing unrendered`);
}
const renewal = receiptLetter({ ...paid, renewal: true }, 'af');
ok(renewal.text.includes('hernu'), 'af renewal says it renewed');
ok(renewal.text.includes('kanselleer'), 'af renewal says how to cancel');
ok(!receiptLetter(paid, 'af').text.includes('kanselleer'), 'a one-off does not talk about cancelling');

console.log('\ncancelled');
for (const lang of ['en', 'af'] as const) {
  const withDate = cancelledLetter(new Date('2026-10-01T00:00:00Z'), lang);
  ok(withDate.text.includes('2026-10-01'), `${lang}: says when access ends`);
  const noDate = cancelledLetter(null, lang);
  ok(!/undefined|null|NaN/.test(noDate.text), `${lang}: no date renders cleanly`);
  ok(!/discount|korting|% off|come back and get/i.test(withDate.text), `${lang}: no parting offer`);
}
ok(cancelledLetter(null, 'af').text.includes('beste'), 'af wishes them well');

console.log(bad === 0 ? '\nAll letters render.' : `\n${bad} problems.`);
process.exit(bad === 0 ? 0 : 1);
