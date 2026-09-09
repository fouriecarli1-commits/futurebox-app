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

/* ── The shape hunt, and the answer it once invented ───────────────────────

   `blenderShape()` sends a small ordered set of plausible bodies and watches
   for the complaint to change. The first version counted **any** status other
   than E_VALIDATION_FAILURE as a hit, and the first time Carli ran it against
   the live account it reported, confidently, that `voiceModelIds` was the
   shape — on the strength of a 429. Kits had rate-limited the sixth POST in a
   row to one address, which says nothing at all about the body.

   That is a worse failure than a crash. It does not look broken: it produces
   a plausible field name, and a room gets built on it.

   So the rule is now positive rather than "not the thing I expected" — a hit
   is a *validation-shaped* refusal carrying a different code — and everything
   that means "could not ask" stops the hunt and says so. These assertions
   drive the classifier over the answers a live service actually gives. */
const { blenderShape } = await import('../app/lib/server/kits');

const answers: Record<string, { status: number; body: string }> = {};
const realFetch = globalThis.fetch;
let asked = 0;
globalThis.fetch = (async (url: unknown) => {
  const step = Object.keys(answers)[Math.min(asked, Object.keys(answers).length - 1)];
  asked += 1;
  const said = answers[step];
  void url;
  return new Response(said.body, { status: said.status });
}) as typeof globalThis.fetch;

const run = async (
  label: string,
  replies: { status: number; body: string }[],
  want: { found: string | null; stopped: string | null },
): Promise<void> => {
  for (const key of Object.keys(answers)) delete answers[key];
  replies.forEach((one, i) => { answers[`r${i}`] = one; });
  asked = 0;
  const out = await blenderShape();
  ok(
    label,
    out.found === want.found && out.stopped === want.stopped,
    `found ${JSON.stringify(out.found)}, stopped ${JSON.stringify(out.stopped)}`,
  );
};

const SAME = { status: 422, body: '{"error":"E_VALIDATION_FAILURE","code":"E_VALIDATION_FAILURE"}' };
const LIMITED = { status: 429, body: '{"error":"Too many requests","code":"E_TOO_MANY_REQUESTS"}' };

await run('a rate limit is not the shape — the bug Carli found', [LIMITED], {
  found: null, stopped: 'rate-limited',
});
await run('nor is a server error', [{ status: 502, body: 'bad gateway' }], {
  found: null, stopped: 'their side',
});
await run('nor is a refused key', [{ status: 403, body: '{"code":"E_FORBIDDEN"}' }], {
  found: null, stopped: 'not allowed',
});
await run('the same complaint on every guess finds nothing, and says so', [SAME], {
  found: null, stopped: null,
});
await run(
  'a different validation complaint IS the shape',
  [{ status: 400, body: '{"error":"name is required","code":"E_MISSING_NAME"}' }],
  { found: 'voiceModelIds as a list', stopped: null },
);

globalThis.fetch = realFetch;

console.log(
  failures
    ? `\ncheck:blender — ${failures} assertion(s) failed.`
    : '\ncheck:blender — the complaint can be read in all three shapes, and nothing is created to read it.',
);
process.exit(failures ? 1 : 0);
