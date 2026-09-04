/**
 * The exports are read correctly, because the numbers are the product.
 *
 * "Here is what your R2 000 did last month" is what a client re-buys. A report
 * that is out by a factor of a hundred because a comma was read as a decimal
 * point, or that shows a campaign spending four rand because "Cost per result"
 * was mistaken for "Cost", is worse than no report — it is a number somebody
 * will repeat to their accountant.
 *
 * Every header below is one of these platforms' own, and the two column sets
 * differ because the person exporting picks their own columns.
 */
import { cents, columnsOf, count, parseCsv, rates, read, totals } from '../app/lib/adreport.ts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

// ── Money, which is where a report goes wrong by a hundred ───────────────
ok('plain rands and cents', cents('1234.56') === 123456, String(cents('1234.56')));
ok('a thousands comma is not a decimal point', cents('2,000') === 200000, String(cents('2,000')));
ok('a South African export: R 2 000,00', cents('R 2 000,00') === 200000, String(cents('R 2 000,00')));
ok('an American one: $2,000.00', cents('$2,000.00') === 200000, String(cents('$2,000.00')));
ok('a European one: 2.000,00', cents('2.000,00') === 200000, String(cents('2.000,00')));
ok('two decimal places after a comma is a decimal', cents('1,23') === 123, String(cents('1,23')));
ok('three digits after a comma is thousands', cents('1,234') === 123400, String(cents('1,234')));
ok('an empty cell is nothing, not NaN', cents('') === 0 && cents('—') === 0);
ok('counts drop their separators', count('1,234,567') === 1234567, String(count('1,234,567')));

// ── The trap that reports a campaign spending four rand ───────────────────
const METa = ['Campaign name', 'Amount spent (ZAR)', 'Impressions', 'Link clicks', 'Results', 'Cost per result'];
const cols = columnsOf(METa);
ok('"Amount spent" is the spend, not "Cost per result"', cols.spentCents === 1, String(cols.spentCents));
ok('and "Cost per result" is claimed by nothing', !Object.values(cols).includes(5), JSON.stringify(cols));
ok('"Link clicks" is the clicks column', cols.clicks === 3, String(cols.clicks));

const google = columnsOf(['Campaign', 'Day', 'Cost', 'Impr.', 'Clicks', 'CTR', 'Avg. CPC', 'Conversions']);
ok('Google calls spend "Cost" and it is found', google.spentCents === 2, String(google.spentCents));
ok('"Avg. CPC" is not mistaken for spend', google.spentCents !== 6, String(google.spentCents));
ok('"CTR" is not mistaken for clicks', google.clicks === 4, String(google.clicks));
ok('"Impr." is the impressions column', google.impressions === 3, String(google.impressions));
ok('"Conversions" is the results column', google.results === 7, String(google.results));

// ── A whole file, as a spreadsheet writes one ─────────────────────────────
const meta = [
  'Campaign name,Amount spent (ZAR),Impressions,Link clicks,Results,Cost per result',
  '"Winter Sale, angle one","R 1 200,00","24,310","412","18","R 66,67"',
  'Winter Sale angle two,"R 800,00","15,004","210","6","R 133,33"',
  ',"R 2 000,00","39,314","622","24",',
].join('\n');
const got = read(meta);
ok('the totals row at the foot is not counted as a campaign', got.rows.length === 2, String(got.rows.length));
ok('a campaign name containing a comma survives its quotes',
  got.rows[0].campaign === 'Winter Sale, angle one', got.rows[0].campaign);
ok('the money is right', got.rows[0].spentCents === 120000, String(got.rows[0].spentCents));
ok('the counts are right', got.rows[0].impressions === 24310 && got.rows[0].clicks === 412,
  `${got.rows[0].impressions}/${got.rows[0].clicks}`);

const sum = totals(got.rows);
ok('the two rows add up to what the export said', sum.spentCents === 200000, String(sum.spentCents));
ok('and so do the clicks', sum.clicks === 622, String(sum.clicks));

// ── Meta writes a title above the header on some exports ─────────────────
const withPreamble = ['Ad performance report', '1 Aug 2026 - 31 Aug 2026', '', meta].join('\n');
ok('a header below a title block is still found',
  read(withPreamble).rows.length === 2, String(read(withPreamble).rows.length));

// ── Tabs and semicolons, which is what a European Excel writes ────────────
const semi = 'Campaign;Cost;Impressions;Clicks\nWinter;2.000,00;39.314;622';
ok('a semicolon-separated export is read',
  read(semi).rows.length === 1 && read(semi).rows[0].spentCents === 200000,
  JSON.stringify(read(semi).rows[0]));

// ── A file with no money in it is not a report ───────────────────────────
const noSpend = read('Campaign,Impressions,Clicks\nWinter,100,10');
ok('a file with no spend column is refused rather than half-shown',
  noSpend.rows.length === 0 && noSpend.missed.length > 0, JSON.stringify(noSpend.missed));

// ── The rates ────────────────────────────────────────────────────────────
const one = { campaign: 'a', spentCents: 120000, impressions: 24310, clicks: 412, results: 18 };
const r = rates(one);
ok('cost per click is the spend over the clicks', r.cpcCents === Math.round(120000 / 412), String(r.cpcCents));
ok('cost per result likewise', r.cprCents === Math.round(120000 / 18), String(r.cprCents));
ok('the click-through rate is a fraction', Math.abs((r.ctr ?? 0) - 412 / 24310) < 1e-9, String(r.ctr));
const none = rates({ campaign: 'a', spentCents: 5000, impressions: 0, clicks: 0, results: 0 });
ok('no clicks means no cost per click, not free',
  none.cpcCents === null && none.cprCents === null && none.ctr === null,
  JSON.stringify(none));

// ── The parser itself ────────────────────────────────────────────────────
ok('a doubled quote inside a quoted field is one quote',
  parseCsv('a,"say ""hi""",b')[0][1] === 'say "hi"', JSON.stringify(parseCsv('a,"say ""hi""",b')));
ok('windows line endings do not leave a stray return',
  parseCsv('a,b\r\nc,d')[1][1] === 'd', JSON.stringify(parseCsv('a,b\r\nc,d')));

if (failures) {
  console.error(`\ncheck:adreport — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:adreport — every export reads back at the amount it says.');
