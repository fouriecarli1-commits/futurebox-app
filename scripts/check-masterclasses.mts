/**
 * Nobody's name on a talk they did not give, and no charge for a class that
 * does not exist.
 *
 * ── What this is guarding against, because it had already happened ───────
 *
 *   "Sif ook deur die masterclass, kyk na regtige sinvolle goed."
 *
 * Hard-coded into `app/page.tsx`, under a badge reading "Verified
 * Masterclasses", were three cards:
 *
 *   · "Building & Scaling a $50k/MRR AI Micro-SaaS Solo" — Garry Tan, CEO of
 *     Y Combinator.
 *   · "Autonomous Multi-Agent AI Systems & Tool Calling" — Harrison Chase of
 *     LangChain. Pro only.
 *   · "Generative AI Cinema" by "Kaelen Voss (AI Filmmaker)", a person who
 *     does not appear to exist. Pro only, linking to runwayml.com.
 *
 * Two real people under titles they never gave a talk under, one invented
 * instructor, and two of the three behind a paywall. `data/masterclasses.ts`
 * had the rule written at the top of it the whole time; the page ignored the
 * file and drew its own cards underneath.
 *
 * A rule in a comment is a rule until somebody is in a hurry. This is the
 * same rule as assertions.
 */
import { readFileSync } from 'node:fs';
import {
  MASTERCLASSES, PROVENANCE_LABELS, TRACK_LABELS, LEVEL_LABELS, featuredClass, youTubeId,
} from '../app/data/masterclasses';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/**
 * Who this app may put its own name on.
 *
 * An `original` is FutureBox's own, so its instructor is somebody here. A
 * `curated` is somebody else's, so its instructor is not. Getting that
 * backwards in either direction is the fault above: our name on their work,
 * or their name on ours.
 */
const OURS = ['futurebox', 'anre fourie', 'anré fourie', 'carli'];
const isOurs = (who: string) => OURS.some((one) => who.trim().toLowerCase().includes(one));

check('there is a shelf at all', MASTERCLASSES.length > 0, `${MASTERCLASSES.length} entries`);

for (const one of MASTERCLASSES) {
  const at = `${one.id} — “${one.title.slice(0, 44)}”`;

  /* Every entry says what kind of thing it is. The card prints it. */
  check(`${at}: says where it came from`,
    Boolean(PROVENANCE_LABELS[one.provenance]), one.provenance);
  check(`${at}: is on a real track and level`,
    Boolean(TRACK_LABELS[one.track] && LEVEL_LABELS[one.level]), `${one.track} / ${one.level}`);
  check(`${at}: names somebody`, one.instructor.trim().length > 0);

  /* Somebody else's work is pointed at, never re-hosted and never unsourced.
     A curated entry with no link is a claim that a lecture exists with no way
     for anybody to check. */
  if (one.provenance === 'curated') {
    check(`${at}: curated, so it links to the real thing`, Boolean(one.url?.trim()), one.url || '(none)');
    check(`${at}: curated, so it says whose it is`, Boolean(one.source?.trim()), one.source ?? '(none)');
    check(`${at}: curated, so the instructor is not us`,
      !isOurs(one.instructor), one.instructor);
    check(`${at}: curated, so it is not marked as ours to produce`,
      one.status === undefined || one.status === 'published', one.status ?? '(none)');
  }

  /* And our own work carries our own name. An `original` credited to a
     stranger is the same lie pointing the other way. */
  if (one.provenance === 'original') {
    check(`${at}: an original is by somebody here`, isOurs(one.instructor), one.instructor);
  }

  /* A generated class never borrows a person's authority. That is the rule at
     the top of the data file, in its own words: it may explain a method,
     never assert a finding, and it is never a synthesised expert. */
  if (one.provenance === 'ai_video') {
    check(`${at}: generated, so no person is named as its author`,
      one.instructor.trim().toLowerCase() === 'futurebox', one.instructor);
  }

  /* Nothing that does not exist may be presented as watchable, and nothing
     that does not exist may be charged for. The second one is the important
     half: two of the three cards that were deleted were Pro-only. */
  if (!one.url?.trim()) {
    check(`${at}: has no link, so it says it is not made yet`,
      one.status === 'planned' || one.status === 'in-production', one.status ?? '(none)');
    check(`${at}: has no link, so it is not sold`, one.proOnly !== true);
  } else {
    check(`${at}: has a link, so it is not also marked as planned`,
      one.status !== 'planned', one.status ?? '(none)');
    check(`${at}: links somewhere real`, /^https?:\/\/\S+$/.test(one.url), one.url);
  }

  /* An outcome, because "what you can do afterwards that you could not do
     before" is the only thing that makes a shelf worth opening — and because
     a class with no outcome is usually a title somebody liked the sound of. */
  check(`${at}: says what you can do afterwards`, one.outcome.trim().length >= 20,
    one.outcome.slice(0, 40));
  check(`${at}: has a length on it`, one.minutes > 0, `${one.minutes}m`);
}

/* Two entries with the same id means one of them never renders and nobody
   can tell which. */
const ids = MASTERCLASSES.map((one) => one.id);
check('no two entries share an id', new Set(ids).size === ids.length);

const watchable = MASTERCLASSES.filter((one) => one.url?.trim());
console.log(
  `\n  ${watchable.length} of ${MASTERCLASSES.length} can actually be watched today;` +
    ` the rest say so on their own cards.\n`,
);

/* ── The one on the front page ────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Die 1 featured masterclass moet ook groot
 * wees, en die res van die masterclasses in 'n drop down… Daar kan nie goed
 * op wees wat random is nie."*
 *
 * It was big and it was also typed out by hand: the title, the instructor,
 * the length, the YouTube id and the thumbnail seed, four times over in
 * `page.tsx`, beside an entry here that already said all five. Two copies of
 * a fact is one fact and one thing that will eventually be wrong, and the
 * front page is the copy nobody re-reads — change a lecture's link here and
 * the biggest thing on the home page keeps pointing at the old one.
 */
{
  const picked = MASTERCLASSES.filter((one) => one.featured);
  check('exactly one class is the front page\u2019s big one', picked.length === 1,
    picked.length === 0
      ? 'none — the biggest thing on the home page would draw nothing'
      : `${picked.length}: ${picked.map((one) => one.id).join(', ')}`);

  const hero = featuredClass();
  check('  and it is one somebody can watch today', Boolean(hero?.url?.trim()),
    hero ? hero.id : 'none');
  check('  and it is free, because the front page says it is free',
    hero ? hero.proOnly !== true : false,
    hero?.proOnly ? `${hero.id} is Pro, and the badge beside it says free` : '');
  check('  and it says where it came from',
    hero ? hero.provenance !== 'curated' || Boolean(hero.source?.trim()) : false,
    'a curated class with no source is a claim with nothing behind it, on the one card everybody sees');
  check('  and its link is one an embed can be built from',
    Boolean(hero && youTubeId(hero.url)), hero?.url ?? 'none');

  /* And the page reads it rather than keeping its own copy. */
  const page = readFileSync('app/page.tsx', 'utf8');
  check('the front page reads the featured class instead of retyping it',
    /const featured = featuredClass\(\);/.test(page) && /\{featured\.title\}/.test(page),
    'a hard-coded hero drifts from the data the first time a link changes');
  check('  and no lecture id is typed into the page any more',
    !/zjkBMFhNj_g/.test(page),
    'the YouTube id was in this file four times');

  /* ── And the reload is not theatre ─────────────────────────────────
 
     Carli: *"Die reload button moet actually nuwes generate."* It did move
     the window — after waiting two seconds behind a spinner that said
     "Finding different ones…", for a change that was already decided and
     takes no time. Nothing was being found. A wait invented to make a
     local array index feel like a search is what makes a real button read
     as a fake one. */
  check('the picks button does not pretend to search',
    !/setTimeout\([\s\S]{0,200}setShownFrom/.test(page),
    'a spinner in front of a decision that is already made is the app lying about what it does');
  check('  and it still moves the window along',
    /setShownFrom\(\(prev\) => prev \+ 1\)/.test(page),
    'the honest half: pressing it has to actually show different ones');
  check('  and says which set she is looking at',
    /home\.setNo/.test(page) && /shownFrom \+ 1/.test(page),
    'a number is the true thing the spinner was pretending');
  check('  and the window slides rather than drawing at random',
    /const start = \(shownFrom \* many\) % all\.length;/.test(page),
    'a random draw repeats, which reads as a broken button');
}

if (failures) {
  console.error(`\ncheck:masterclasses — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('check:masterclasses — nobody’s name is on a talk they did not give, and nothing unmade is sold.');
