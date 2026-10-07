/**
 * What may be done with a song made through somebody else's amp capture.
 *
 *   npm run check:amplicence
 *
 * ── The question this answers, and when it is asked ──────────────────────
 *
 * Carli, 7 October 2026: *"Didn't Tone3000 give us permission if we add their
 * name on products? That is how I understood it."*
 *
 * Partly. Three of the eight licences a tone can carry are NonCommercial, and
 * no amount of crediting makes one of those permit a paid product. The
 * difference between "free if you credit" and "not for selling" is the whole
 * of the risk, and it is one field.
 *
 * What makes it a check rather than care: the licence is asked once, when a
 * capture comes in, and the question it answers — may this song be sold — is
 * asked months later by somebody who was not there. Everything between those
 * two moments has to carry it faithfully, and nothing in between ever reads
 * it, which is the shape of a field that quietly stops being written.
 */
import {
  LICENCES, UNKNOWN, creditLine, creditsFor, licenceOf, mayBeSold, needsCredit,
} from '../app/lib/amplicence.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── The set is the set TONE3000 really uses ─────────────────────────── */

const FROM_THEM = ['t3k', 'cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa',
  'cc-by-nd', 'cc-by-nc-nd'];
const ids = LICENCES.map((one) => one.id);
const missing = FROM_THEM.filter((one) => !ids.includes(one as never));
ok('every licence a tone can carry is one this app knows',
  missing.length === 0,
  `${missing.join(', ')} — a licence the app does not know is a capture whose`
  + ' terms nobody recorded');
ok('  and there is one for a capture of her own', ids.includes('mine' as never));
ok('  and one for not knowing', ids.includes(UNKNOWN as never));

/* ── The three that forbid selling, which is the whole point ─────────── */

const NOT_FOR_SELLING = ['cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd'];
for (const one of NOT_FOR_SELLING) {
  ok(`a song made through a ${one} capture may not be sold`,
    mayBeSold(one) === false,
    'FutureBox is a paid product and some of its members sell what they make;'
    + ' no amount of crediting makes a NonCommercial licence permit that');
}
const FOR_SELLING = ['mine', 'cc0', 'cc-by', 'cc-by-sa', 'cc-by-nd'];
for (const one of FOR_SELLING) {
  ok(`  and a ${one} one may be`, mayBeSold(one) === true,
    'refusing what a licence allows is its own fault: it makes the app look'
    + ' broken and sends people round it');
}

/* ── Not knowing is not permission ───────────────────────────────────── */

ok('a capture with no licence recorded may not be sold through',
  mayBeSold(undefined) === false && mayBeSold('') === false,
  'somebody who does not know what a capture came under has not got'
  + ' permission; they have got a capture and a question');
ok('  and a licence nobody has heard of is treated the same way',
  mayBeSold('cc-by-maybe') === false && licenceOf('cc-by-maybe').id === UNKNOWN,
  'an unknown string falling through to the permissive end is how a typo'
  + ' becomes permission');
ok('  and TONE3000’s own is cautious until they answer',
  mayBeSold('t3k') === false,
  'what `t3k` permits is theirs to tell us, and the letter asking is in'
  + ' docs/EPOS-TONE3000.md — until there is an answer, the safe direction');

/* ── The credit goes to the maker, which is the half she had right ───── */

ok('a CC BY capture asks for a credit', needsCredit('cc-by'));
ok('  and CC0 does not', needsCredit('cc0') === false);
ok('  and a capture of her own does not', needsCredit('mine') === false);
ok('the credit names the maker, not the site',
  creditLine('Jan Harm', 'cc-by') === 'Jan Harm (cc-by)',
  `${creditLine('Jan Harm', 'cc-by')} — "attribute the person who made this"`
  + ' is not satisfied by naming where it was downloaded from');
ok('  and says so even when nobody was recorded',
  creditLine(undefined, 'cc-by') === 'cc-by',
  'a CC BY with nobody named is a visible hole rather than a silent one');
ok('  and nothing is owed where nothing is owed',
  creditLine('Jan Harm', 'cc0') === null);

ok('a piece of work names every capture in it, once each',
  creditsFor([
    { maker: 'Jan Harm', licence: 'cc-by' },
    { maker: 'Jan Harm', licence: 'cc-by' },
    { maker: 'Thandi', licence: 'cc-by-sa' },
    { maker: 'Nobody', licence: 'cc0' },
  ]) === 'Jan Harm (cc-by) · Thandi (cc-by-sa)',
  creditsFor([
    { maker: 'Jan Harm', licence: 'cc-by' },
    { maker: 'Jan Harm', licence: 'cc-by' },
    { maker: 'Thandi', licence: 'cc-by-sa' },
    { maker: 'Nobody', licence: 'cc0' },
  ]));

/* ── And it is actually stored with the capture ──────────────────────── */

const amps = readFileSync('app/lib/amps.ts', 'utf8');
ok('the shelf keeps the licence with the capture',
  /readonly licence\?: LicenceId;/.test(amps),
  'the licence is asked once and the question it answers is asked months'
  + ' later by somebody who was not there');
ok('  and the maker too', /readonly maker\?: string;/.test(amps));
const nam = readFileSync('app/lib/nam.ts', 'utf8');
ok('  and the maker is read out of the file where it says',
  /modeled_by/.test(nam),
  '`modeled_by` is the NAM field for it, and a good many captures carry it');

if (bad) {
  console.error(`\ncheck:amplicence — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:amplicence — the three licences that forbid selling forbid it, not'
  + ' knowing is not permission, and the credit names the maker.',
);
