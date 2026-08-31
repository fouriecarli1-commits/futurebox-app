/** The ladder must climb across every capability, and name the right tier. */
import { ENTITLEMENTS, unlockedBy } from '../app/lib/entitlements.ts';

const LADDER = ['free', 'maker', 'studio', 'label'];
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };
const rank = (v) => (v === null ? Infinity : v);

// Nothing may ever get *less* as you pay more.
for (const [name, e] of Object.entries(ENTITLEMENTS)) {
  for (let i = 1; i < LADDER.length; i += 1) {
    say(rank(e.caps[LADDER[i]]) >= rank(e.caps[LADDER[i - 1]]),
      `${name}: ${LADDER[i]} gets less than ${LADDER[i - 1]}`);
  }
}

// Every paid rung must add something somewhere, or it is not a rung.
for (let i = 1; i < LADDER.length; i += 1) {
  const adds = Object.entries(ENTITLEMENTS).filter(
    ([, e]) => rank(e.caps[LADDER[i]]) > rank(e.caps[LADDER[i - 1]]));
  say(adds.length > 0, `${LADDER[i]} adds nothing over ${LADDER[i - 1]}`);
  console.log(`  ${LADDER[i - 1]} → ${LADDER[i]}: ${adds.length} things improve`);
}

// A refusal must name a tier that genuinely unlocks it, and never the one
// the person is already on.
for (const [name, e] of Object.entries(ENTITLEMENTS)) {
  for (const plan of LADDER) {
    const next = unlockedBy(name, plan);
    if (e.caps[plan] === null) { say(next === null, `${name}: ${plan} is unlimited but was told to upgrade to ${next}`); continue; }
    if (next === null) continue;
    const at = LADDER.indexOf(next.toLowerCase());
    say(at > LADDER.indexOf(plan), `${name}: ${plan} was pointed at ${next}, which is not above it`);
    say(rank(e.caps[LADDER[at]]) > rank(e.caps[plan]), `${name}: ${next} does not actually give ${plan} more`);
  }
}

// The things that must stay free everywhere.
for (const free of ['appearance', 'soundboard']) {
  say(ENTITLEMENTS[free].caps.free === null, `${free} is not free — that would read as mean, not limited`);
}

console.log('');
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
