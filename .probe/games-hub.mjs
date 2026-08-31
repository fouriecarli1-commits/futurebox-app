// The Games & Worlds hub on the Radar, scored by the app's own gate.
//
//   node .probe/games-hub.mjs
//
// The point is not that the entries exist — it is that the gate sorts them,
// including rejecting one in front of the reader. A category whose every item
// passes teaches a reader nothing about the bar.

import { CATEGORIES, FEED_ITEMS } from '../app/data/feed.ts';
import { assess, BAR } from '../app/lib/curation.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const now = new Date('2026-08-31').getTime();

say(CATEGORIES.includes('Games & Worlds'), 'there is no games category on the radar');

const games = FEED_ITEMS.filter((one) => one.category === 'Games & Worlds');
say(games.length >= 4, `only ${games.length} items in the games hub — too thin to sit in`);

const scored = games.map((one) => ({ item: one, verdict: assess(one, now) }));
const passed = scored.filter(({ verdict }) => verdict.score >= BAR);
const rejected = scored.filter(({ verdict }) => verdict.score < BAR);

say(passed.length >= 3, `${passed.length} games items clear the bar of ${BAR}`);
say(rejected.length >= 1, 'nothing in the games hub is rejected — a gate nobody sees reject anything is no gate');

// The one written as slop has to be the one that fails, and for the stated
// reasons rather than by accident.
const slop = scored.find(({ item }) => item.id === 'g4');
say(slop.verdict.score < BAR, `the deliberately bad entry scored ${slop.verdict.score} and passed`);
const labels = slop.verdict.signals.map((one) => one.label).join(' | ');
say(/bait/i.test(labels), `the clickbait title was not caught: ${labels}`);
say(/Filler/i.test(labels), `the filler summary was not caught: ${labels}`);
// Not the shouting signal: one capitalised word is under its threshold, and
// that is the gate being right rather than the entry being wrong. Two named
// reasons is what a reader needs to see, and two is what it gives.
say(
  slop.verdict.signals.filter((one) => one.delta < 0).length >= 2,
  `only ${slop.verdict.signals.filter((one) => one.delta < 0).length} reasons given for the rejection`,
);

// And the good ones have to pass for reasons, not by being recent.
const paper = scored.find(({ item }) => item.id === 'g1');
say(paper.verdict.score >= BAR, `the research entry scored ${paper.verdict.score}`);
const why = paper.verdict.signals.map((one) => one.label).join(' | ');
say(/Specific claims/.test(why), `the specific summary earned nothing: ${why}`);
say(/Primary research/.test(why), `a paper was not read as primary research: ${why}`);

// Nothing in the hub may point nowhere.
for (const { item } of scored) {
  say(/^https?:\/\//.test(item.url), `${item.id} has no real address`);
  say(item.summary.length > 40, `${item.id} has a summary too thin to judge`);
}

console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : `PASS — ${games.length} in the games hub, ${passed.length} through the gate and ${rejected.length} shown being refused`,
);
process.exit(problems.length ? 1 : 0);
