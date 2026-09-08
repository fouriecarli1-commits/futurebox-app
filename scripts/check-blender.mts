/**
 * Reading what a service says it wants.
 *
 * `/voice-blender` is one of the five real Kits APIs — proven to exist and to
 * accept our key — and nothing in this app has ever called it, because their
 * documentation names the address and not the body. `docs/KITS-KAART.md` §3
 * puts the blender in the Sound trainer: two voices, one new, "a thing nobody
 * else in South Africa offers".
 *
 * `blenderNeeds` asks it with an empty body, which cannot become a blend, and
 * reports the complaint. This checks the part of that which is not a network
 * call: whether the field names can actually be read out of the shapes a
 * complaint arrives in. A parser only ever exercised against a live service
 * is a parser nobody has tested against the case it was written for — and
 * this one has exactly one chance to work, on the day she opens the report.
 *
 *   npm run check:blender
 */
import { fieldsIn } from '../app/lib/server/kits';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── The three shapes a validation complaint arrives in ────────────────── */

/* Zod, and everything built on it: a list of issues with a `path` array. */
const zod = JSON.stringify({
  error: {
    issues: [
      { code: 'invalid_type', path: ['voiceModelIds'], message: 'Required' },
      { code: 'invalid_type', path: ['weight'], message: 'Required' },
    ],
  },
});
ok('a path-list complaint names its fields',
  fieldsIn(zod).includes('voiceModelIds') && fieldsIn(zod).includes('weight'),
  fieldsIn(zod).join(', '));

/* Express-validator and friends: a `param` per problem. */
const params = JSON.stringify({
  errors: [
    { msg: 'Invalid value', param: 'firstVoiceId', location: 'body' },
    { msg: 'Invalid value', param: 'secondVoiceId', location: 'body' },
  ],
});
ok('a param-per-error complaint names its fields',
  fieldsIn(params).includes('firstVoiceId') && fieldsIn(params).includes('secondVoiceId'),
  fieldsIn(params).join(', '));

/* And plain English, which is what a hand-written API usually says. */
ok('a sentence naming the field is read too',
  fieldsIn('{"message":"voiceModelId is required"}').includes('voiceModelId'),
  fieldsIn('{"message":"voiceModelId is required"}').join(', '));
ok('and a "missing" phrasing', fieldsIn('{"error":"missing field \\"blendRatio\\""}').includes('blendRatio'),
  fieldsIn('{"error":"missing field \\"blendRatio\\""}').join(', '));

/* ── And what it must not do ───────────────────────────────────────────── */
/* Nothing found is an honest empty list. A parser that invents a plausible
   field name would send somebody off to build a room against it. */
ok('a complaint that names nothing yields nothing', fieldsIn('{"message":"Bad Request"}').length === 0,
  fieldsIn('{"message":"Bad Request"}').join(', '));
ok('and so does an empty body', fieldsIn('').length === 0);
ok('and so does a page of HTML', fieldsIn('<!doctype html><html><body>Not found</body></html>').length === 0,
  fieldsIn('<!doctype html><html><body>Not found</body></html>').join(', '));
/* A hundred issues is a service having a bad day, not a hundred fields to
   build a form out of. */
const many = JSON.stringify({ issues: Array.from({ length: 40 }, (_, i) => ({ path: [`f${i}`] })) });
ok('a flood of fields is capped', fieldsIn(many).length === 12, String(fieldsIn(many).length));
ok('and the same field twice is one field',
  fieldsIn('{"issues":[{"path":["weight"]},{"path":["weight"]}]}').length === 1);

/* ── The route hands it to her ─────────────────────────────────────────── */
import { readFileSync } from 'node:fs';
const setup = readFileSync('app/api/kits/setup/route.ts', 'utf8');
ok('the setup report asks the blender', /blenderNeeds\(\)/.test(setup));
/* Sent with `{}` and nothing else. A body with a voice id in it would be a
   blend attempt, and this must never make anything on her account. */
const kits = readFileSync('app/lib/server/kits.ts', 'utf8');
const call = kits.slice(kits.indexOf('export async function blenderNeeds'));
ok('and asks with a body that cannot become a blend', /body: '\{\}'/.test(call.slice(0, 1200)));
ok('and says so plainly if one is ever made anyway', /UNEXPECTED/.test(call.slice(0, 3000)));

console.log(
  failures
    ? `\ncheck:blender — ${failures} assertion(s) failed.`
    : '\ncheck:blender — the complaint can be read in all three shapes, and nothing is created to read it.',
);
process.exit(failures ? 1 : 0);
