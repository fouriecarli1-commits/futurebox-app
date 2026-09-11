/**
 * The whole plan as one page you can keep.
 *
 * ── Why this exists next to the calendar file ────────────────────────────
 *
 * `icsOf` exports the week, and only the week. That was the right first
 * export — a reminder on Tuesday at six is worth more than a document — but
 * it quietly drops six of the plan's seven parts: what the category is, who
 * buys it, what they are deciding between, which angles are tired, where the
 * buyers are that is not a feed, and which numbers to watch. All of that is
 * on the screen and none of it leaves the app.
 *
 * Carli, 11 September 2026: "Ek dink daar moet waarskynlik ook 'n schedule
 * afgelaai kan word met 'n hele uitleg met die bemarkingsplan." She is right,
 * and it is the same fault as the calendar: the work was done and most of it
 * could not be taken anywhere. A plan you cannot hand to somebody is a plan
 * only one person has.
 *
 * ── Why HTML and not PDF or Word ─────────────────────────────────────────
 *
 * One file, no library, no server round trip, and it opens on everything:
 * double-click it and a browser shows it, print it and you have the PDF. A
 * PDF would need a renderer in the bundle and would come out worse; a .docx
 * would need a zip writer to produce something Word opens grudgingly. The
 * print rules below are what make it a document rather than a screenshot —
 * page breaks that do not split a section, and black text on white.
 *
 * ── Why the words are passed in ──────────────────────────────────────────
 *
 * Every heading comes from the caller, which reads them from the dictionary.
 * A second copy of the English in here is a second copy to translate, and the
 * one that gets forgotten. `Words` is exhaustive so the compiler says which
 * are missing rather than a heading coming out blank.
 *
 * See `scripts/check-planpaper.mts`: it walks the plan and fails if any part
 * of it is missing from the page, so a part added later cannot be left out.
 */

import { DAY_IDS, sortedWeek, type DayId, type Plan } from './marketplan';

export interface PaperBrief {
  readonly what: string;
  readonly who?: string;
  readonly offer?: string;
  readonly tone?: string;
  readonly market?: string;
  readonly place?: string;
}

/** Every word on the page that is not the plan itself. */
export interface Words {
  readonly title: string;
  readonly brief: string;
  readonly what: string;
  readonly who: string;
  readonly offer: string;
  readonly tone: string;
  readonly market: string;
  readonly place: string;
  readonly category: string;
  readonly buyers: string;
  readonly wants: string;
  readonly doubt: string;
  readonly angles: string;
  readonly against: string;
  readonly platforms: string;
  readonly effortLow: string;
  readonly effortMedium: string;
  readonly effortHigh: string;
  readonly week: string;
  readonly beyond: string;
  readonly watch: string;
  readonly healthy: string;
  readonly days: Readonly<Record<DayId, string>>;
  /** The line at the foot: this is a starting point, argue with it. */
  readonly argue: string;
  /** "Nothing is planned for these days" — followed by the day names. */
  readonly quiet: string;
  /** Where the week's days came from — the account's own report, or the category. */
  readonly source: string;
  readonly made: string;
}

export interface PaperOptions {
  readonly words: Words;
  /**
   * Which language the page is written in.
   *
   * Not decoration. A browser opening an Afrikaans document tagged `en`
   * offers to translate it into English, hyphenates it wrongly, and a screen
   * reader says every word in an English accent.
   */
  readonly lang: 'en' | 'af';
  /** Passed in rather than read here, so the same plan makes the same file. */
  readonly at?: Date;
}

function safe(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function effortWord(words: Words, effort: 'low' | 'medium' | 'high'): string {
  if (effort === 'low') return words.effortLow;
  if (effort === 'high') return words.effortHigh;
  return words.effortMedium;
}

function dated(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/* Printed rather than screen colours: this is meant to come out of a printer
   and to be readable on a phone, and the app's dark palette does neither on
   paper. `break-inside: avoid` on a section is the difference between a plan
   and a plan with a buyer split across two pages. */
const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 20px 56px; background: #fff; color: #18181b;
    font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  main { max-width: 760px; margin: 0 auto; }
  h1 { font-size: 26px; line-height: 1.2; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 {
    font-size: 12px; letter-spacing: 0.09em; text-transform: uppercase; color: #71717a;
    margin: 30px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e4e4e7;
  }
  p { margin: 0 0 6px; }
  .made { color: #71717a; font-size: 13px; margin: 0 0 4px; }
  .item {
    break-inside: avoid; page-break-inside: avoid;
    border: 1px solid #e4e4e7; border-radius: 10px; padding: 11px 13px; margin: 0 0 9px;
  }
  .name { font-weight: 700; }
  .sub { color: #52525b; }
  .quiet { color: #71717a; font-size: 13.5px; }
  .row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .effort { font-size: 12px; font-weight: 700; white-space: nowrap; }
  .low { color: #047857; } .medium { color: #b45309; } .high { color: #be123c; }
  .slot .when { font-weight: 700; font-variant-numeric: tabular-nums; }
  .slot .where { color: #047857; font-weight: 600; }
  dl { margin: 0; display: grid; grid-template-columns: 150px 1fr; gap: 5px 14px; }
  dt { color: #71717a; font-size: 13px; }
  dd { margin: 0; }
  footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e4e4e7; color: #71717a; font-size: 13px; }
  @media (max-width: 520px) { dl { grid-template-columns: 1fr; gap: 0 0; } dt { margin-top: 7px; } }
  @media print {
    body { padding: 0; font-size: 11pt; }
    h2 { break-after: avoid; page-break-after: avoid; }
    .item { border-color: #d4d4d8; }
  }
`;

/**
 * The plan as a standalone HTML document.
 *
 * Everything the screen shows, in the same order, plus the brief it was built
 * from — because a plan read a month later without the brief beside it is a
 * set of assertions nobody can check.
 */
export function paperOf(plan: Plan, brief: PaperBrief, options: PaperOptions): string {
  const { words } = options;
  const at = options.at ?? new Date();
  const quiet = DAY_IDS.filter((day) => !plan.week.some((slot) => slot.day === day));
  const out: string[] = [];

  const section = (heading: string, body: string) => {
    if (!body) return;
    out.push(`<h2>${safe(heading)}</h2>`, body);
  };

  /* The brief. Only the lines that were actually filled in — an empty row
     labelled "The offer" reads as an offer of nothing. */
  const briefRows = (
    [
      [words.what, brief.what],
      [words.who, brief.who],
      [words.offer, brief.offer],
      [words.tone, brief.tone],
      [words.market, brief.market],
      [words.place, brief.place],
    ] as const
  )
    .filter(([, value]) => Boolean(value && String(value).trim()))
    .map(([label, value]) => `<dt>${safe(label)}</dt><dd>${safe(String(value))}</dd>`)
    .join('');
  section(words.brief, briefRows ? `<dl>${briefRows}</dl>` : '');

  section(
    words.category,
    `<div class="item"><p class="name">${safe(plan.category)}</p><p class="sub">${safe(plan.demand)}</p></div>`,
  );

  section(
    words.buyers,
    plan.buyers
      .map(
        (one) =>
          `<div class="item"><p class="name">${safe(one.who)}</p>` +
          `<p class="sub">${safe(words.wants)}: ${safe(one.wants)}</p>` +
          `<p class="quiet">${safe(words.doubt)}: ${safe(one.doubt)}</p></div>`,
      )
      .join(''),
  );

  section(
    words.angles,
    plan.angles
      .map(
        (one) =>
          `<div class="item"><p class="name">${safe(one.angle)}</p>` +
          `<p class="sub">${safe(one.why)}</p>` +
          `<p class="quiet">${safe(words.against)}: ${safe(one.against)}</p></div>`,
      )
      .join(''),
  );

  section(
    words.platforms,
    plan.platforms
      .map(
        (one) =>
          `<div class="item"><div class="row"><p class="name">${safe(one.platform)}</p>` +
          `<span class="effort ${one.effort}">${safe(effortWord(words, one.effort))}</span></div>` +
          `<p class="sub">${safe(one.why)}</p><p class="quiet">${safe(one.format)}</p></div>`,
      )
      .join(''),
  );

  /* The week in week order and clock order — the same `sortedWeek` the screen
     uses, so the document and the screen cannot disagree about Tuesday. */
  section(
    words.week,
    sortedWeek(plan.week)
      .map((slot) => {
        const day = words.days[slot.day] ?? slot.day;
        return (
          `<div class="item slot"><p><span class="when">${safe(day)} ${safe(slot.at)}</span> · ` +
          `<span class="where">${safe(slot.platform)}</span></p>` +
          `<p class="sub">${safe(slot.what)}</p><p class="quiet">${safe(slot.why)}</p></div>`
        );
      })
      .join('') +
      /* The days with nothing on them, named. A reader who sees Monday,
         Wednesday and Friday cannot tell whether Tuesday was considered and
         left clear on purpose or simply never thought about — and this plan
         leaves days clear on purpose. */
      (quiet.length
        ? `<p class="quiet">${safe(words.quiet)}: ${quiet.map((day) => safe(words.days[day] ?? day)).join(' · ')}</p>`
        : '') +
      `<p class="quiet">${safe(words.source)}</p>`,
  );

  section(
    words.beyond,
    plan.beyondSocial
      .map(
        (one) =>
          `<div class="item"><div class="row"><p class="name">${safe(one.what)}</p>` +
          `<span class="effort ${one.effort}">${safe(effortWord(words, one.effort))}</span></div>` +
          `<p class="sub">${safe(one.why)}</p></div>`,
      )
      .join(''),
  );

  section(
    words.watch,
    plan.watch
      .map(
        (one) =>
          `<div class="item"><p class="name">${safe(one.number)}</p>` +
          `<p class="sub">${safe(one.why)}</p>` +
          `<p class="quiet">${safe(words.healthy)}: ${safe(one.healthy)}</p></div>`,
      )
      .join(''),
  );

  return [
    '<!doctype html>',
    `<html lang="${options.lang === 'af' ? 'af' : 'en'}"><head><meta charset="utf-8">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${safe(words.title)}${brief.what ? ` — ${safe(brief.what)}` : ''}</title>`,
    `<style>${STYLE}</style></head><body><main>`,
    `<h1>${safe(words.title)}</h1>`,
    `<p class="made">${safe(words.made)} ${safe(dated(at))}</p>`,
    out.join(''),
    `<footer>${safe(words.argue)}</footer>`,
    '</main></body></html>',
  ].join('\n');
}
