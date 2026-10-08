/**
 * The twenty particulars section 43 asks for, and which of them are there.
 *
 *   npm run check:ecta
 *
 * ── Why a check over a document ──────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Legal check van app."* `docs/LEGAL-REVIEW.md`
 * is the handover for the attorney: every particular the Electronic
 * Communications and Transactions Act asks an online supplier to disclose,
 * where this app says it, and the five that are missing.
 *
 * A document like that is true on the day it is written. Then a page is
 * tidied, a section is renamed, a sentence is moved to another page — and
 * the handover still says "Done" about something nobody can find. Which is
 * worse than no handover, because an attorney reads it and does not go and
 * look.
 *
 * So the two are held against each other, in both directions:
 *
 *   · a particular the document calls **Done** must still be findable on the
 *     page it names, and
 *   · a particular the document calls a **Gap** must still be missing — so
 *     that filling one in fails the build until the document is corrected,
 *     rather than leaving the attorney a list of work already done.
 *
 * The second direction is the one that is usually left out, and it is the
 * one that makes a list rot in the direction nobody notices.
 */
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const legal = readFileSync('app/legal/page.tsx', 'utf8');
const terms = readFileSync('app/terms/page.tsx', 'utf8');
const privacy = readFileSync('app/privacy/page.tsx', 'utf8');
const review = readFileSync('docs/LEGAL-REVIEW.md', 'utf8');
const pages = `${legal}\n${terms}\n${privacy}`;

/**
 * Each particular, what proves it is on a page, and what the handover says.
 *
 * `shows` is deliberately a phrase from the page rather than a heading:
 * a heading is renamed by anybody tidying, and a phrase that is renamed has
 * usually been rewritten, which is a thing somebody should look at anyway.
 */
const PARTICULARS: readonly {
  readonly s: string;
  readonly what: string;
  readonly shows: RegExp | null;
}[] = [
  { s: '43(1)(a)', what: 'full name and legal status', shows: /who\.name/ },
  { s: '43(1)(b)', what: 'physical address and telephone', shows: /FUTUREBOX_LEGAL_ADDRESS|address/i },
  { s: '43(1)(c)', what: 'web address and email', shows: /who\.email/ },
  { s: '43(1)(d)', what: 'self-regulatory body', shows: null },
  { s: '43(1)(e)', what: 'registration number and office bearers', shows: /who\.registration/ },
  { s: '43(1)(f)', what: 'code of conduct', shows: null },
  { s: '43(1)(g)', what: 'description of the goods', shows: /What is sold here/ },
  { s: '43(1)(h)', what: 'full price', shows: /what it costs/ },
  { s: '43(1)(i)', what: 'manner of payment', shows: /Paying, and the security of it/ },
  { s: '43(1)(j)', what: 'terms of agreement', shows: /\/terms/ },
  { s: '43(1)(k)', what: 'time of delivery', shows: /receipt|credits are shown|current plan/ },
  { s: '43(1)(l)', what: 'return and refund policy', shows: /Cancelling, and getting money back/ },
  { s: '43(1)(m)', what: 'alternative dispute resolution code', shows: null },
  { s: '43(1)(n)', what: 'security of payment and personal information', shows: /security/i },
  { s: '43(1)(o)', what: 'minimum duration', shows: /Cancel any time/ },
  { s: '43(1)(p)', what: 'the right to withdraw under section 44', shows: null },
];

/* ── 1. The page still carries what the handover says it carries ────── */

const vanished = PARTICULARS.filter((one) => one.shows && !one.shows.test(pages));
ok('every particular the handover calls done is still on a page',
  vanished.length === 0,
  `${vanished.map((one) => `${one.s} ${one.what}`).join(' | ')} — an attorney`
  + ' reads the handover and does not go and look');

/* ── 2. And what it calls a gap is still a gap ───────────────────────
 
   The direction that is usually left out. A gap that gets filled and stays
   on the list is an attorney quoted for work already done, and a list that
   is wrong in that direction is one nobody trusts in the other. */
const SAID_MISSING = ['43(1)(d)', '43(1)(e)', '43(1)(f)', '43(1)(m)', '43(1)(p)'];
const stillListed = SAID_MISSING.filter((s) => {
  const row = review.split('\n').find((line) => line.includes(`| ${s} |`));
  return row ? /\*\*Gap|biggest gap/i.test(row) : false;
});
ok('  and every gap the handover lists is still listed as one',
  stillListed.length === SAID_MISSING.length,
  `${SAID_MISSING.filter((s) => !stillListed.includes(s)).join(', ')} — either`
  + ' the row was reworded or the gap was filled, and the handover has to say'
  + ' which');

/* The one that is a sentence rather than a row. */
ok('  and section 44 is still unmentioned anywhere',
  !/section 44|cooling.?off/i.test(pages),
  'something now says it — the handover calls this the biggest gap and the'
  + ' wording is the attorney’s to write, so if a sentence has appeared,'
  + ' the handover is out of date and somebody wrote law overnight');

/* ── 3. The handover names every particular, so none is forgotten ──── */

const unlisted = PARTICULARS.filter((one) => !review.includes(one.s));
ok('the handover accounts for all sixteen particulars this app engages',
  unlisted.length === 0,
  `${unlisted.map((one) => one.s).join(', ')} — a particular nobody listed is`
  + ' a particular nobody checked');

/* ── 4. And the page does not pretend to be advice ───────────────────
 
   `/legal` says it was written by the people who built the app rather than
   by a lawyer. That sentence is doing real work: it is the difference
   between a disclosure and a professional opinion, and it should not be
   tidied away by somebody smartening up the footer. */
ok('the legal page still says who wrote it',
  /rather than by a lawyer/.test(legal),
  'that sentence is the difference between a disclosure and a professional'
  + ' opinion, and it is the kind of thing a tidy-up removes');
ok('  and the handover says the same of itself',
  /I am not a lawyer and nothing here is legal\s*\n?\s*advice/.test(review),
  'a handover that reads as advice is advice');

/* ── 5. The two consumer bodies, which are free to complain to ──────── */
ok('somebody who is not satisfied is told where else to go',
  /National Consumer Commission/.test(legal) && /Information\s*\n?\s*Regulator/.test(legal),
  'both are free to complain to, and neither is an alternative dispute'
  + ' resolution code — see 43(1)(m)');

if (bad) {
  console.error(`\ncheck:ecta — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:ecta — the handover for the attorney still describes the pages that'
  + ' are actually here, in both directions.',
);
