// The AI Game Creators track: does it exist, is it honest, and does it lead
// somewhere.
//
//   node .probe/games-track.mjs
//
// The load-bearing rule in this data file is `provenance`, and the load-bearing
// risk in adding a track is a card that claims something a member can click and
// not find. Both are checked here.

import {
  MASTERCLASSES, PATHS, TRACK_LABELS, BRIEF_SEEDS,
} from '../app/data/masterclasses.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

say(TRACK_LABELS['ai-games'] === 'AI Game Creators', `the track is called ${TRACK_LABELS['ai-games']}`);
say(Boolean(BRIEF_SEEDS['ai-games']), 'the track has no brief seeds, so the next class cannot be planned');
say(BRIEF_SEEDS['ai-games'].angle.length >= 3, 'too few angles to plan from');

const games = MASTERCLASSES.filter((one) => one.track === 'ai-games');
say(games.length >= 4, `${games.length} game classes — a track needs a few`);

// ── Nothing may claim to exist that does not ───────────────────────────
for (const one of games) {
  const real = one.provenance === 'curated';
  say(
    real ? Boolean(one.url) : one.status !== 'published' || Boolean(one.url),
    `${one.id} says it is published but has nowhere to go`,
  );
  say(
    !real || Boolean(one.source),
    `${one.id} is curated and does not say where it came from — that is the whole point of curated`,
  );
  say(
    real || one.status !== undefined,
    `${one.id} is ours and has no status, so a member cannot tell whether it exists`,
  );
  say(one.outcome.length > 40, `${one.id} does not say what you can do afterwards`);
  say(one.minutes >= 20, `${one.id} is ${one.minutes} minutes — too short to teach a craft`);
}

// A curated card with no address is the failure mode worth naming: it points
// at somebody else's work and has to actually point.
const curatedWithoutUrl = games.filter((one) => one.provenance === 'curated' && !one.url);
say(curatedWithoutUrl.length === 0, `${curatedWithoutUrl.length} curated game classes point nowhere`);

// ── The track climbs ───────────────────────────────────────────────────
const levels = new Set(games.map((one) => one.level));
say(levels.has('start-here'), 'nowhere to start');
say(levels.has('deep'), 'nowhere to end up');

// ── And there is a path through it ─────────────────────────────────────
const path = PATHS.find((one) => one.id === 'path-games');
say(Boolean(path), 'there is no path through the games track');
say(path.classIds.length >= 3, 'the games path is too short to be a path');
for (const id of path.classIds) {
  say(
    MASTERCLASSES.some((one) => one.id === id),
    `the games path lists ${id}, which is not a class`,
  );
}
// A path that wanders across tracks is a reading list, not a path.
say(
  path.classIds.every((id) => MASTERCLASSES.find((one) => one.id === id)?.track === 'ai-games'),
  'the games path leaves its own track',
);

// ── Ids stay unique, or two cards collide ──────────────────────────────
say(
  new Set(MASTERCLASSES.map((one) => one.id)).size === MASTERCLASSES.length,
  'two classes share an id',
);

const planned = games.filter((one) => one.status === 'planned').length;
console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : `PASS — ${games.length} game classes, ${planned} honestly marked unmade, and a path through them`,
);
process.exit(problems.length ? 1 : 0);
