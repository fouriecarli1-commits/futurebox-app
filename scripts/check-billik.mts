/**
 * Fair use: what the terms say is what the code does.
 *
 * The owner, 14 October 2026: *"Onthou om 'n fair usage op te stel, en ek dink
 * daar moet 'n sterk limit wees op ai voice training."* The terms state the
 * numbers; these lines hold them to PODCAST_CAPS, and hold the clone route
 * to counting trainings rather than only voices kept.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import { PODCAST_CAPS } from '../app/lib/plans.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const terms = readFileSync('app/terms/page.tsx', 'utf8');
const clone = withoutComments(readFileSync('app/api/voice/clone/route.ts', 'utf8'));
const fair = terms.slice(terms.indexOf('title="Fair use"'), terms.indexOf('title="Paying, and stopping"'));

ok('the terms have a fair use section', fair.length > 200);
ok('  the training numbers are the code’s',
  fair.includes(`Maker trains ${PODCAST_CAPS.maker.trainsPerMonth} voice`)
  && fair.includes(`Studio ${PODCAST_CAPS.studio.trainsPerMonth} and Label ${PODCAST_CAPS.label.trainsPerMonth}`));
ok('  the keeping numbers are the code’s',
  fair.includes(`(${PODCAST_CAPS.maker.voices}, ${PODCAST_CAPS.studio.voices} and ${PODCAST_CAPS.label.voices})`));
ok('  the reading numbers are the code’s',
  fair.includes(`Maker ${PODCAST_CAPS.maker.speakPerDay} readings a day, Studio ${PODCAST_CAPS.studio.speakPerDay}, Label ${PODCAST_CAPS.label.speakPerDay}`));
ok('the free tier trains nothing', PODCAST_CAPS.free.trainsPerMonth === 0);
ok('training is strictly fewer than keeping on the big plans',
  PODCAST_CAPS.label.trainsPerMonth < PODCAST_CAPS.label.voices);

ok('the clone route counts trainings in the last 30 days, not only voices kept',
  /\.eq\('reason', 'clone'\)/.test(clone) && /trainsPerMonth/.test(clone) && /30 \* 24 \* 60 \* 60 \* 1000/.test(clone));
ok('  and takes failed trainings back out of the count',
  /\.eq\('reason', 'refund'\)\.eq\('ref', TRAINING_REF\)/.test(clone)
  && /charge\(request, CREDITS\.clone, 'clone', TRAINING_REF\)/.test(clone));
ok('  and a ledger it cannot read refuses rather than lets through',
  /trained\.error \|\| givenBack\.error/.test(clone));
ok('  and it asks before it charges',
  before(clone, 'trainsPerMonth', 'charge(request'));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
