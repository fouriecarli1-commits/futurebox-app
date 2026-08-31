// The scenes on the desk, and the quotation-mark rule.
//
//   node .probe/videoscenes.mjs

import { SCENES, sceneById, spokenLines, looksUnquoted } from '../app/lib/videoscenes.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── Every tile has to be usable as it stands ───────────────────────────
for (const scene of SCENES) {
  say(scene.label.length <= 14, `"${scene.label}" is too long for a tile`);
  say(scene.note.length <= 44, `"${scene.id}" note is ${scene.note.length} characters`);
  say(scene.scaffold.length > 80, `"${scene.id}" scaffold is too thin to edit`);
  say(scene.seconds === 5 || scene.seconds === 10, `"${scene.id}" asks for ${scene.seconds}s — Kling takes 5 or 10`);
  say(['9:16', '16:9', '1:1'].includes(scene.aspect), `"${scene.id}" aspect ${scene.aspect}`);
  say(sceneById(scene.id) === scene, `"${scene.id}" cannot be looked up`);

  // The scaffold has to teach the shape it claims to teach.
  const lower = scene.scaffold.toLowerCase();
  const hasShot = /(shot|dolly|push|macro|handheld|static|overhead|focus)/.test(lower);
  const hasLight = /(light|lit|glow|shadow|haze|sun|lamp|backlit|dark)/.test(lower);
  say(hasShot, `"${scene.id}" scaffold never says what the camera does`);
  say(hasLight, `"${scene.id}" scaffold never says what the light does`);

  // And `speaks` has to be true exactly when there is a quoted line.
  const spoken = spokenLines(scene.scaffold);
  say(
    scene.speaks === spoken.length > 0,
    `"${scene.id}" says speaks=${scene.speaks} but has ${spoken.length} quoted lines`,
  );
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

console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : `PASS — ${SCENES.length} scenes, all usable, and the quote rule holds`);
process.exit(problems.length ? 1 : 0);
