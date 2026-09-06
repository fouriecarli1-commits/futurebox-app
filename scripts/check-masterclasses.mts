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
import { MASTERCLASSES, PROVENANCE_LABELS, TRACK_LABELS, LEVEL_LABELS } from '../app/data/masterclasses';

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

if (failures) {
  console.error(`\ncheck:masterclasses — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('check:masterclasses — nobody’s name is on a talk they did not give, and nothing unmade is sold.');
