// The scenes on the desk, and the quotation-mark rule.
//
//   node .probe/videoscenes.mjs

import { SCENES, sceneById, spokenLines, looksUnquoted, LENGTHS, lengthNote } from '../app/lib/videoscenes.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── Every tile has to be usable as it stands ───────────────────────────
for (const scene of SCENES) {
  say(scene.label.length <= 14, `"${scene.label}" is too long for a tile`);
  say(scene.note.length <= 44, `"${scene.id}" note is ${scene.note.length} characters`);
  say(scene.scaffolds.length >= 2, `"${scene.id}" has one idea — a tile with one is a template, not inspiration`);
  say(
    LENGTHS.some((one) => one.seconds === scene.seconds),
    `"${scene.id}" opens on ${scene.seconds}s, which is not a length the desk offers`,
  );
  say(['9:16', '16:9', '1:1'].includes(scene.aspect), `"${scene.id}" aspect ${scene.aspect}`);
  say(sceneById(scene.id) === scene, `"${scene.id}" cannot be looked up`);

  // Every scaffold — not just the first — has to teach the shape it claims to,
  // or pressing "another" quietly drops the lesson.
  for (const [index, scaffold] of scene.scaffolds.entries()) {
    const where = `"${scene.id}" scaffold ${index + 1}`;
    say(scaffold.length > 80, `${where} is too thin to edit`);
    const lower = scaffold.toLowerCase();
    say(
      /(shot|dolly|push|macro|handheld|static|overhead|focus|pan|track|drift)/.test(lower),
      `${where} never says what the camera does`,
    );
    say(
      /(light|lit|glow|shadow|haze|sun|lamp|backlit|dark|neon|flare)/.test(lower),
      `${where} never says what the light does`,
    );
    // `speaks` has to hold for every one of them, or a tile marked as having a
    // voice hands out a silent idea on the second press.
    say(
      scene.speaks === spokenLines(scaffold).length > 0,
      `${where} disagrees with speaks=${scene.speaks}`,
    );
  }

  // Two ideas that are nearly the same are one idea.
  const unique = new Set(scene.scaffolds.map((one) => one.slice(0, 40)));
  say(unique.size === scene.scaffolds.length, `"${scene.id}" repeats itself across its ideas`);
}

say(SCENES.length >= 5 && SCENES.length <= 8, `${SCENES.length} tiles — a desk, not a menu`);
say(new Set(SCENES.map((s) => s.id)).size === SCENES.length, 'two scenes share an id');
say(SCENES.some((s) => s.speaks), 'no scene shows the quotation-mark rule at all');
say(SCENES.some((s) => s.id === 'marketing'), 'there is no marketing scene');
say(SCENES.some((s) => s.id === 'podcast'), 'there is no podcast scene');
say(sceneById('nonsense') === undefined, 'an unknown id returned something');

// ── Pulling the spoken lines out ───────────────────────────────────────
say(spokenLines('She says, "hello there."')[0] === 'hello there.', 'a straight-quoted line was not found');
say(spokenLines('He says, “welcome back.”')[0] === 'welcome back.', 'a curly-quoted line was not found — phones type those');
say(spokenLines('two lines: "one" and "two"').length === 2, 'two quoted lines did not both come back');
say(spokenLines('nothing quoted here').length === 0, 'a quote was invented');
say(spokenLines('a 5" pipe').length === 0, 'an inch mark read as dialogue');

// ── The mistake worth warning about ────────────────────────────────────
say(looksUnquoted('A host says welcome back to the show'), 'an unquoted spoken line drew no warning');
say(looksUnquoted('sy sê welkom terug'), 'the Afrikaans case drew no warning');
say(!looksUnquoted('A host says, "welcome back."'), 'a correctly quoted line was warned about');
say(!looksUnquoted('An empty road at first light'), 'a prompt with no speech was warned about');

// ── Every length says what it is for ───────────────────────────────────
for (const one of LENGTHS) {
  say(one.note.length > 20, `${one.label} has nothing to say for itself`);
  say(lengthNote(one.seconds) === one.note, `${one.label} cannot be looked up`);
}
say(lengthNote(999) === '', 'an unknown length invented a description');
say(new Set(LENGTHS.map((one) => one.seconds)).size === LENGTHS.length, 'two lengths share a number');
say(
  LENGTHS.every((one, i) => i === 0 || one.seconds > LENGTHS[i - 1].seconds),
  'the lengths are not in order',
);

const ideas = SCENES.reduce((sum, one) => sum + one.scaffolds.length, 0);
console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : `PASS — ${SCENES.length} kinds, ${ideas} ideas, ${LENGTHS.length} lengths that each say what they are for`,
);
process.exit(problems.length ? 1 : 0);
