/**
 * The artist agreement's numbers are the app's numbers.
 *
 * ── Why this needs a check ───────────────────────────────────────────────
 *
 * Carli asked for a signed agreement between her and each artist, with the
 * split table in it. That table is now in two documents that real people
 * put their names to, and it is also computed in `app/data/artmarket.ts`
 * every time a piece sells.
 *
 * Two copies of one sum, one of them signed. If the app's arithmetic ever
 * moves — a different gateway fee, a different share, a rounding change —
 * the signed table silently becomes a promise the app does not keep, and
 * the first person to notice is an artist doing their own sums against a
 * bank statement. That is the worst possible way for this to be found.
 *
 * So the documents do not get to hold their own numbers. They hold the
 * app's, and this re-derives them and compares, to the cent, in both
 * languages.
 *
 * ── What it deliberately does not check ──────────────────────────────────
 *
 * The prose. A contract has to be editable by the person who signs it, and
 * a check that fails when a clause is reworded is a check somebody deletes.
 * It holds the figures, the two floors, and the three promises that came
 * from her in so many words — monthly at the end of a calendar month, an
 * invoice after payment, and both parties signing.
 */
import { readFileSync } from 'node:fs';
import { split, START_RAND, UNIQUE_RAND, ARTIST_SHARE } from '../app/data/artmarket';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const PAPERS = [
  { file: 'docs/KUNSTENAAR-OOREENKOMS.md', lang: 'Afrikaans' },
  { file: 'docs/ARTIST-AGREEMENT.md', lang: 'English' },
] as const;

for (const paper of PAPERS) {
  const text = readFileSync(paper.file, 'utf8');

  /* ── The split table, row by row, to the cent ──────────────────────────
     Every row of the form `| R200 | R9.00 | R191.00 | **R133.70** | R57.30 |`
     is found and re-derived. A row the check cannot parse is not skipped —
     a table that has been reformatted past recognition is a table nobody
     is checking any more, so the count is asserted too. */
  const rows = [
    ...text.matchAll(
      /^\|\s*R(\d+)\s*\|\s*R([\d.]+)\s*\|\s*R([\d.]+)\s*\|\s*\*\*R([\d.]+)\*\*\s*\|\s*R([\d.]+)\s*\|/gm,
    ),
  ];
  ok(`${paper.lang}: the split table is there and readable`, rows.length >= 6,
    `${rows.length} row(s) parsed — the table has been reformatted past recognition`);

  let wrong = 0;
  const said: string[] = [];
  for (const row of rows) {
    const paid = Number(row[1]);
    const real = split(paid);
    const same =
      row[2] === real.gateway.toFixed(2)
      && row[3] === real.profit.toFixed(2)
      && row[4] === real.artist.toFixed(2)
      && row[5] === real.house.toFixed(2);
    if (!same) {
      wrong += 1;
      said.push(
        `R${paid}: the paper says fee R${row[2]} / profit R${row[3]} / artist R${row[4]} / studio R${row[5]},`
        + ` the app pays fee R${real.gateway.toFixed(2)} / profit R${real.profit.toFixed(2)}`
        + ` / artist R${real.artist.toFixed(2)} / studio R${real.house.toFixed(2)}`,
      );
    }
  }
  ok(`  and every row matches what the app actually pays`, wrong === 0, said.join(' ;; '));

  /* ── The two floors ───────────────────────────────────────────────────── */
  ok(`  and the floor in it is R${START_RAND}`, new RegExp(`R${START_RAND}\\b`).test(text),
    'the agreement names a different starting price from the app');
  ok(`  and the commission guide is R${UNIQUE_RAND}`, new RegExp(`R${UNIQUE_RAND}\\b`).test(text),
    'the agreement names a different commission price from the app');
  ok('  and the share is stated as 70/30', /70%/.test(text) && /30%/.test(text),
    `the app splits ${ARTIST_SHARE * 100}/${100 - ARTIST_SHARE * 100} and the paper does not say so`);

  /* ── The three things she asked for in so many words ────────────────────
     *"betalings maandelliks aan die einde van 'n kalender maand"*, *"die
     vereiste van 'n invoice nadat die wins aan die kunstenaar gestuur is"*,
     and *"waar ons albei moet teken"*. Each one is a clause a later edit
     could tidy away, and each one is the reason the document exists. */
  ok('  and it pays at the end of a calendar month',
    /kalendermaand|calendar month/i.test(text),
    'the monthly payment clause has gone');
  ok('  and it requires an invoice AFTER the payment',
    /(Nadat|After)\b[\s\S]{0,400}?(faktuur|invoice)/i.test(text),
    'the invoice clause no longer says it comes after the money');
  ok('  and both parties sign it',
    /FUTUREBOXSTUDIO/.test(text) && /(Handtekening|Signature)[\s\S]*(Handtekening|Signature)/.test(text),
    'there are not two signature blocks any more');

  /* ── And nothing from the CIPC certificate is in the repository ─────────
     Her standing rule. The agreement needs a registration number and an
     address to be signed, and neither may be typed into a file that is
     pushed: they are placeholders, filled in on the copy she prints. */
  ok('  and the registration number and address are still placeholders',
    /\[REGISTRASIENOMMER\]|\[REGISTRATION NUMBER\]/.test(text) && /\[ADRES\]|\[ADDRESS\]/.test(text),
    'a real registration number or address has been typed into the repository');
}

if (failures) {
  console.error(
    `\ncheck:ooreenkoms — ${failures} wrong. This table is in a document real people sign.`
    + ' A copy that drifts from the app is a promise the app does not keep, and the first'
    + ' person to find it is an artist doing their own sums against a bank statement.\n',
  );
  process.exit(1);
}
console.log(
  '\ncheck:ooreenkoms — both agreements pay exactly what the app pays, name the same two floors,'
  + ' pay at the end of a calendar month, ask for the invoice after the money, and carry nothing'
  + ' off the CIPC certificate.',
);
