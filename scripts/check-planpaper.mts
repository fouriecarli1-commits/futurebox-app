/**
 * Nothing in the plan may be missing from the downloaded plan.
 *
 * The calendar export already showed how this goes wrong. `icsOf` carries the
 * week and nothing else, and that was a deliberate first step — but it read,
 * on the screen, as "download the plan". Six of the plan's seven parts never
 * left the app and nobody could tell from the button.
 *
 * So this check does not read what `paperOf` looks like. It builds a plan in
 * which every single string is a distinct marker, walks the whole object, and
 * requires every one of those markers to appear in the page. Add a field to
 * `Plan` and forget to print it and this fails, without anybody remembering
 * to come back here — which is the only kind of coverage check worth having,
 * because the ones you have to remember to extend are the ones that rot.
 *
 * It also proves the escaping, because a document built by joining strings
 * will eventually be handed a product name with an ampersand in it.
 *
 *   npm run check:planpaper
 */
import { DAY_IDS, type Plan } from '../app/lib/marketplan';
import { paperOf, type PaperBrief, type Words } from '../app/lib/planpaper';

const problems: string[] = [];

/* Every value is a marker that appears nowhere else, so finding it in the
   page can only mean it was printed. */
const plan: Plan = {
  category: 'MARK-category',
  demand: 'MARK-demand',
  buyers: [
    { who: 'MARK-buyer-who', wants: 'MARK-buyer-wants', doubt: 'MARK-buyer-doubt' },
    { who: 'MARK-buyer2-who', wants: 'MARK-buyer2-wants', doubt: 'MARK-buyer2-doubt' },
  ],
  angles: [{ angle: 'MARK-angle', why: 'MARK-angle-why', against: 'MARK-angle-against' }],
  platforms: [
    { platform: 'MARK-platform', why: 'MARK-platform-why', format: 'MARK-platform-format', effort: 'high' },
    { platform: 'MARK-platform2', why: 'MARK-platform2-why', format: 'MARK-platform2-format', effort: 'medium' },
  ],
  week: [
    { day: 'wednesday', at: '18:00', platform: 'MARK-slot2-platform', what: 'MARK-slot2-what', why: 'MARK-slot2-why' },
    { day: 'monday', at: '07:30', platform: 'MARK-slot1-platform', what: 'MARK-slot1-what', why: 'MARK-slot1-why' },
  ],
  beyondSocial: [{ what: 'MARK-beyond', why: 'MARK-beyond-why', effort: 'low' }],
  watch: [{ number: 'MARK-watch', why: 'MARK-watch-why', healthy: 'MARK-watch-healthy' }],
};

const brief: PaperBrief = {
  what: 'MARK-brief-what',
  who: 'MARK-brief-who',
  offer: 'MARK-brief-offer',
  tone: 'MARK-brief-tone',
  market: 'MARK-brief-market',
  place: 'MARK-brief-place',
};

const words: Words = {
  title: 'WORD-title',
  brief: 'WORD-brief',
  what: 'WORD-what',
  who: 'WORD-who',
  offer: 'WORD-offer',
  tone: 'WORD-tone',
  market: 'WORD-market',
  place: 'WORD-place',
  category: 'WORD-category',
  buyers: 'WORD-buyers',
  wants: 'WORD-wants',
  doubt: 'WORD-doubt',
  angles: 'WORD-angles',
  against: 'WORD-against',
  platforms: 'WORD-platforms',
  effortLow: 'WORD-low',
  effortMedium: 'WORD-medium',
  effortHigh: 'WORD-high',
  week: 'WORD-week',
  beyond: 'WORD-beyond',
  watch: 'WORD-watch',
  healthy: 'WORD-healthy',
  days: Object.fromEntries(DAY_IDS.map((day) => [day, `WORD-day-${day}`])) as Words['days'],
  argue: 'WORD-argue',
  quiet: 'WORD-quiet',
  source: 'WORD-source',
  made: 'WORD-made',
};

const page = paperOf(plan, brief, { words, lang: 'en', at: new Date(2026, 8, 11) });

/** Every string anywhere in a value, however deeply nested. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const one of value) strings(one, out);
  else if (value && typeof value === 'object') for (const one of Object.values(value)) strings(one, out);
  return out;
}

/* ── Every part of the plan is on the page ───────────────────────────── */
const missing = [...strings(plan), ...strings(brief)].filter((one) => !page.includes(one));
if (missing.length > 0) {
  problems.push(
    `  ${missing.length} value(s) in the plan never reach the page: ${missing.join(', ')}\n` +
      '      Every field of Plan and of the brief must be printed. Add it to paperOf.',
  );
}

/* ── Every heading is on the page ────────────────────────────────────── */
const unusedWords = strings(words).filter((one) => !page.includes(one));
if (unusedWords.length > 0) {
  problems.push(
    `  ${unusedWords.length} heading(s) are asked for and never used: ${unusedWords.join(', ')}\n` +
      '      A word in Words that paperOf does not print is one the dictionary translates for nothing.',
  );
}

/* ── The week is in week order, not the order it came back in ────────── */
const monday = page.indexOf('MARK-slot1-what');
const wednesday = page.indexOf('MARK-slot2-what');
if (!(monday >= 0 && wednesday >= 0 && monday < wednesday)) {
  problems.push('  the week is printed in the order it arrived, not in week order');
}

/* ── Days with nothing on them are still named ───────────────────────── */
const quiet = DAY_IDS.filter((day) => !plan.week.some((slot) => slot.day === day));
const unnamed = quiet.filter((day) => !page.includes(`WORD-day-${day}`));
if (unnamed.length > 0) {
  problems.push(
    `  ${unnamed.length} empty day(s) are not named anywhere: ${unnamed.join(', ')}\n` +
      '      A reader cannot tell a day that was left clear on purpose from one nobody thought about.',
  );
}

/* ── A brief with holes in it prints no empty rows ───────────────────── */
const thin = paperOf(plan, { what: 'MARK-brief-what' }, { words, lang: 'en', at: new Date(2026, 8, 11) });
for (const heading of ['WORD-offer', 'WORD-tone', 'WORD-market', 'WORD-place', 'WORD-who']) {
  if (thin.includes(heading)) {
    problems.push(`  a brief with no ${heading} still prints the row, which reads as an answer of nothing`);
  }
}

/* ── It is a real document, not a fragment ───────────────────────────── */
if (!/^<!doctype html>/i.test(page.trim())) problems.push('  the page is not a standalone document');
if (!/charset=["']?utf-8/i.test(page)) {
  problems.push('  the page declares no character set, so Afrikaans will come out broken when it is opened from disk');
}
if (!/@media print/.test(page)) problems.push('  the page has no print rules, so printing it gives a screenshot of a screen');

/* An Afrikaans plan must say so, or a browser offers to translate it into
   English and a screen reader reads it in an English accent. */
const afrikaans = paperOf(plan, brief, { words, lang: 'af', at: new Date(2026, 8, 11) });
if (!/<html lang="af"/.test(afrikaans)) problems.push('  an Afrikaans plan is not tagged as Afrikaans');
if (!/<html lang="en"/.test(page)) problems.push('  an English plan is not tagged as English');

/* ── Escaping ────────────────────────────────────────────────────────── */
const nasty = paperOf(
  { ...plan, category: 'Tom & Jerry\'s <script>alert(1)</script> "quotes"' },
  brief,
  { words, lang: 'en', at: new Date(2026, 8, 11) },
);
if (nasty.includes('<script>')) problems.push('  text from the plan is written into the page unescaped');
if (!nasty.includes('Tom &amp; Jerry')) problems.push('  an ampersand in the plan is not escaped, which breaks the text after it');

if (problems.length > 0) {
  console.error(`check:planpaper — the downloaded plan is not the whole plan:\n${problems.join('\n')}`);
  process.exit(1);
}

const counted = strings(plan).length;
console.log(
  `check:planpaper — all ${counted} values in the plan and every heading reach the page, ` +
    'the week is in week order, empty days are named, and the text is escaped.',
);
