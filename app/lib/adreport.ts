'use client';

/**
 * What the money did, read out of the platform's own export.
 *
 * ── Why this shape and not an API ────────────────────────────────────────
 *
 * `docs/ADS_AS_A_SERVICE.md` puts the report at Stage 2 and is right that it
 * is the half clients re-buy for: "here is what your R2 000 did last month,
 * and which of the three angles worked" is a monthly invoice, where "we wrote
 * you some ads" is a one-off.
 *
 * It also assumed the numbers would arrive over an API. Those are read-only
 * scopes, which is the easier ask — and it is still App Review, a verified
 * business, and a company that exists to be verified. None of that is true
 * today, and the report is worth having today.
 *
 * Every one of these platforms exports a CSV from its own reporting screen.
 * Somebody who can see their Ads Manager can already get the numbers; what
 * they cannot do is put them next to the advert that produced them and see
 * which angle worked. That part needs no permission from anybody.
 *
 * And it is not throwaway work. The API version, when it comes, is another
 * importer writing the same rows into the same store behind the same screen.
 *
 * ── Why the headers are matched and not declared ─────────────────────────
 *
 * Meta calls it "Amount spent", Google calls it "Cost", TikTok calls it
 * "Cost". Meta has "Link clicks" where Google has "Clicks". And on every one
 * of them the column set is *chosen by the person exporting* — they pick their
 * columns in the UI and the export follows.
 *
 * A table of per-platform schemas would be wrong for half of them on the first
 * try and out of date by the second. So headers are normalised and matched on
 * what they contain, most specific first, and a column that matches nothing is
 * carried through untouched rather than dropped: a file this cannot fully read
 * should still show somebody their numbers.
 */

/** One row of a platform's export, after it has been understood. */
export interface Result {
  /** Whatever the export called the campaign. Matched to a run by its slug. */
  readonly campaign: string;
  /** In cents, so nothing is ever a float being added up. */
  readonly spentCents: number;
  readonly impressions: number;
  readonly clicks: number;
  /** Conversions, purchases, leads — whatever that account calls a result. */
  readonly results: number;
  /** As the export wrote it. Not parsed: the formats are not worth guessing. */
  readonly when?: string;
}

/**
 * A CSV line reader that copes with what a spreadsheet actually exports.
 *
 * Quoted fields containing commas, doubled quotes inside a quoted field, and
 * both line endings. Written rather than pulled in because it is thirty lines
 * and the alternative is a dependency in the client bundle for one screen.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let at = 0; at < text.length; at += 1) {
    const ch = text[at];
    if (quoted) {
      if (ch === '"') {
        if (text[at + 1] === '"') {
          field += '"';
          at += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === '\t' || ch === ';') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((one) => one.some((cell) => cell.trim()));
}

const flat = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Which column is which, most specific first.
 *
 * Order matters and it is the whole trick. "Cost per result" contains "cost",
 * so a naive match on `cost` claims it as the spend column and reports a
 * campaign that spent four rand. The specific phrases are ruled out before the
 * general ones are tried.
 */
const NOT_SPEND = ['cost per', 'cpc', 'cpm', 'cost per result', 'avg cost'];
const WANTED: { field: keyof Result; any: string[]; not?: string[] }[] = [
  { field: 'campaign', any: ['campaign name', 'campaign'] },
  {
    field: 'spentCents',
    any: ['amount spent', 'spend', 'cost', 'amount'],
    not: NOT_SPEND,
  },
  { field: 'impressions', any: ['impressions', 'impr'], not: ['cost per'] },
  { field: 'clicks', any: ['link clicks', 'clicks all', 'clicks'], not: ['cost per', 'click through', 'ctr'] },
  {
    field: 'results',
    any: ['results', 'conversions', 'conv', 'purchases', 'leads'],
    not: ['cost per', 'rate', 'value'],
  },
  { field: 'when', any: ['reporting starts', 'date', 'day', 'week', 'month'] },
];

export function columnsOf(headers: readonly string[]): Partial<Record<keyof Result, number>> {
  const flatten = headers.map(flat);
  const found: Partial<Record<keyof Result, number>> = {};
  for (const want of WANTED) {
    for (const phrase of want.any) {
      const at = flatten.findIndex(
        (one, index) =>
          !Object.values(found).includes(index) &&
          one.includes(phrase) &&
          !(want.not ?? []).some((no) => one.includes(no)),
      );
      if (at !== -1) {
        found[want.field] = at;
        break;
      }
    }
  }
  return found;
}

/**
 * Money out of a cell, in cents.
 *
 * The hard part is not the currency symbol, it is that the world does not
 * agree which of `,` and `.` is the decimal point. `R 2 000,00` and
 * `$2,000.00` are the same amount written by two spreadsheets, and reading
 * either one wrongly is out by a hundred.
 *
 * The rule: whichever separator appears **last** is the decimal one. That is
 * true of every locale that uses both, and where only one appears it is a
 * decimal point only if exactly two digits follow it at the end — `1,234` is a
 * thousand and something, `1,23` is one and a bit.
 */
export function cents(value: string): number {
  const raw = String(value ?? '').replace(/[^\d,.\-]/g, '').trim();
  if (!raw) return 0;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normal = raw;
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalAt = Math.max(lastComma, lastDot);
    normal = raw.slice(0, decimalAt).replace(/[,.]/g, '') + '.' + raw.slice(decimalAt + 1);
  } else if (lastComma !== -1 || lastDot !== -1) {
    const at = Math.max(lastComma, lastDot);
    const after = raw.length - at - 1;
    normal = after === 2 ? raw.slice(0, at) + '.' + raw.slice(at + 1) : raw.replace(/[,.]/g, '');
  }
  const number = Number(normal);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

/** A count out of a cell: separators dropped, decimals ignored. */
export function count(value: string): number {
  const raw = String(value ?? '').replace(/[^\d]/g, '');
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

export interface Read {
  readonly rows: readonly Result[];
  /** Which columns were understood, so the screen can say what it could not. */
  readonly found: readonly (keyof Result)[];
  readonly missed: readonly string[];
}

/**
 * A whole export, understood.
 *
 * A file with no recognisable spend column is not read at all: a report of
 * impressions with no money in it is not the thing anybody is buying, and
 * showing one would suggest the import worked.
 */
export function read(text: string): Read {
  const rows = parseCsv(text);
  if (rows.length < 2) return { rows: [], found: [], missed: [] };

  /* Meta puts a title and a date range above the header on some exports, so
     the header is the first row that looks like one rather than row zero. */
  let headerAt = 0;
  let columns = columnsOf(rows[0]);
  for (let at = 0; at < Math.min(6, rows.length); at += 1) {
    const tried = columnsOf(rows[at]);
    if (Object.keys(tried).length > Object.keys(columns).length) {
      columns = tried;
      headerAt = at;
    }
  }
  if (columns.spentCents === undefined) return { rows: [], found: [], missed: rows[headerAt] };

  const out: Result[] = [];
  for (const row of rows.slice(headerAt + 1)) {
    const at = (field: keyof Result) =>
      columns[field] === undefined ? '' : (row[columns[field] as number] ?? '');
    const campaign = at('campaign').trim();
    const spentCents = cents(at('spentCents'));
    /* The totals row at the foot of an export.

       It has every number and no campaign name, which is exactly its
       signature — and counting it doubles the spend on the one line a client
       reads first. Skipping "no name and no spend" was not enough: a totals
       row has a spend, that is the whole point of it.

       Only where the file names campaigns at all. An export of one campaign
       broken down by day has no campaign column and every row is real. */
    if (columns.campaign !== undefined && !campaign) continue;
    if (!campaign && !spentCents) continue;
    out.push({
      campaign,
      spentCents,
      impressions: count(at('impressions')),
      clicks: count(at('clicks')),
      results: count(at('results')),
      ...(at('when') ? { when: at('when').trim() } : {}),
    });
  }

  const found = Object.keys(columns) as (keyof Result)[];
  const missed = rows[headerAt].filter(
    (_, index) => !Object.values(columns).includes(index) && rows[headerAt][index]?.trim(),
  );
  return { rows: out, found, missed };
}

/** Everything added up, which is the line a client reads first. */
export function totals(rows: readonly Result[]): Result & { campaign: string } {
  return rows.reduce<Result>(
    (sum, one) => ({
      campaign: '',
      spentCents: sum.spentCents + one.spentCents,
      impressions: sum.impressions + one.impressions,
      clicks: sum.clicks + one.clicks,
      results: sum.results + one.results,
    }),
    { campaign: '', spentCents: 0, impressions: 0, clicks: 0, results: 0 },
  );
}

/**
 * The three numbers worth saying out loud, and null where they cannot be.
 *
 * Null rather than zero, because a campaign with no clicks has no cost per
 * click — and printing `R0.00` there reads as free rather than as unanswerable.
 */
export function rates(one: Result): {
  ctr: number | null;
  cpcCents: number | null;
  cprCents: number | null;
} {
  return {
    ctr: one.impressions > 0 ? one.clicks / one.impressions : null,
    cpcCents: one.clicks > 0 ? Math.round(one.spentCents / one.clicks) : null,
    cprCents: one.results > 0 ? Math.round(one.spentCents / one.results) : null,
  };
}

const KEY = 'futurebox.adreport.v1';

export interface Report {
  readonly rows: readonly Result[];
  /** When it was imported, so a screen can say how old the numbers are. */
  readonly at: string;
}

export function loadReport(): Report | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const said = JSON.parse(raw) as Report;
    return Array.isArray(said?.rows) ? said : null;
  } catch {
    return null;
  }
}

export function saveReport(report: Report | null): void {
  try {
    if (report) window.localStorage.setItem(KEY, JSON.stringify(report));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked. The numbers are on screen for this session.
  }
}
