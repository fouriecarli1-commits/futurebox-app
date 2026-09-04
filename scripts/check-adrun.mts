/**
 * The UTM tags are right, because nothing downstream can be built without them.
 *
 * Everything past Stage 1 in `docs/ADS_AS_A_SERVICE.md` is reading numbers back
 * from a platform and telling somebody which advert did the work. A link that
 * goes out untagged is a row in their analytics that says "direct", and no
 * amount of later engineering recovers it: the click has happened.
 *
 * So the tagging is the load-bearing part of a feature that otherwise looks
 * like a checklist, and it is exactly the kind of string handling that breaks
 * quietly. Every case below is one somebody will actually hit.
 */
import { slug, tagged, standingOf, sorted, progress, type Run } from '../app/lib/adrun.ts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const TAGS = { source: 'TikTok', medium: 'social', campaign: 'Winter Sale' };

// ── The slug ─────────────────────────────────────────────────────────────
ok('a name becomes one campaign, not three', slug('Winter Sale') === 'winter-sale', slug('Winter Sale'));
ok('accents are folded rather than dropped into nothing', slug('Wêreldwyd Aksie') === 'wereldwyd-aksie', slug('Wêreldwyd Aksie'));
ok('punctuation collapses to single dashes', slug('50% off — this week!!') === '50-off-this-week', slug('50% off — this week!!'));
ok('it does not start or end with a dash', !/^-|-$/.test(slug('  --hello--  ')), slug('  --hello--  '));
ok('an empty name is empty, not a dash', slug('') === '', slug(''));

// ── The link ─────────────────────────────────────────────────────────────
const plain = tagged('https://shop.example.com/boots', TAGS);
ok('the tags are on it', /utm_source=tiktok/.test(plain) && /utm_campaign=winter-sale/.test(plain), plain);
ok('and the path is untouched', plain.startsWith('https://shop.example.com/boots?'), plain);

ok(
  'a link typed without a scheme still works',
  tagged('shop.example.com/boots', TAGS).startsWith('https://shop.example.com/boots?'),
  tagged('shop.example.com/boots', TAGS),
);

const existing = tagged('https://shop.example.com/boots?ref=news&size=9', TAGS);
ok(
  'existing parameters are kept',
  /ref=news/.test(existing) && /size=9/.test(existing),
  existing,
);

/* The one somebody actually does: tag for one platform, then tag the same
   link for another. Two utm_source values is a row analytics drops. */
const twice = tagged(tagged('https://shop.example.com/boots', TAGS), { ...TAGS, source: 'Instagram' });
ok(
  'tagging an already-tagged link replaces rather than repeats',
  (twice.match(/utm_source=/g) || []).length === 1 && /utm_source=instagram/.test(twice),
  twice,
);

const hashed = tagged('https://shop.example.com/boots#reviews', TAGS);
ok('a hash survives, and stays at the end', /#reviews$/.test(hashed) && /utm_source/.test(hashed), hashed);

ok(
  'utm_term from somebody else’s link is cleared',
  !/utm_term/.test(tagged('https://shop.example.com/b?utm_term=boots', TAGS)),
  tagged('https://shop.example.com/b?utm_term=boots', TAGS),
);

ok('content is left off when there is none', !/utm_content/.test(plain), plain);
ok(
  'and put on when there is',
  /utm_content=angle-two/.test(tagged('https://a.test/', { ...TAGS, content: 'Angle Two' })),
  tagged('https://a.test/', { ...TAGS, content: 'Angle Two' }),
);

ok('an empty link stays empty rather than becoming a bare query', tagged('', TAGS) === '', tagged('', TAGS));
ok(
  'something that is not a link comes back untouched rather than throwing',
  tagged('not a link at all', TAGS) === 'not a link at all',
  tagged('not a link at all', TAGS),
);

// ── The schedule ─────────────────────────────────────────────────────────
const TODAY = new Date('2026-09-15T09:00:00Z');
const run = (when: string, done: number, of = 3): Run => ({
  id: when + done,
  campaign: 'c',
  headline: 'h',
  link: 'https://a.test/',
  when,
  createdAt: '2026-09-01T00:00:00Z',
  steps: Array.from({ length: of }, (_, at) => ({ platform: `p${at}`, done: at < done })),
});

ok('a run due today reads as today', standingOf(run('2026-09-15', 0), TODAY) === 'today');
ok('a run whose day has passed is overdue', standingOf(run('2026-09-10', 1), TODAY) === 'overdue');
ok('a run still to come is soon', standingOf(run('2026-09-20', 0), TODAY) === 'soon');
ok('a run with no day is unscheduled', standingOf(run('', 0), TODAY) === 'unscheduled');
/* Finished beats late. A run that went out in full last week is done, not
   overdue — colouring it red teaches somebody to ignore the colour. */
ok('a finished run is done even though its day has passed',
  standingOf(run('2026-09-10', 3), TODAY) === 'done');

ok('progress counts what is posted', progress(run('', 2)).done === 2 && progress(run('', 2)).of === 3);

const order = sorted(
  [run('2026-09-20', 0), run('2026-09-10', 3), run('', 0), run('2026-09-10', 1), run('2026-09-15', 0)],
  TODAY,
).map((one) => standingOf(one, TODAY));
ok(
  'late first, then due, then coming, then undated, then finished',
  order.join(',') === 'overdue,today,soon,unscheduled,done',
  order.join(','),
);

if (failures) {
  console.error(`\ncheck:adrun — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:adrun — every link is traceable and the schedule reads in the right order.');
