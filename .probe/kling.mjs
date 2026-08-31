// Does the token this app signs verify the way Kling will verify it, and is
// the request shaped the way Kling documents?
//
//   node .probe/kling.mjs
//
// No network: the engine is replaced with something that records what it was
// asked. The point is the signature and the field names, and both can be
// checked exactly without spending a credit.

import crypto from 'node:crypto';

process.env.KLINGAI_ACCESS_KEY = 'AK-test-123';
process.env.KLINGAI_SECRET_KEY = 'SK-test-secret-456';

const { startVideo, checkVideo, klingCost, monthlyCeiling, configured, scheme } =
  await import('../app/lib/server/kling.ts');

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const seen = [];
let reply = { code: 0, data: { task_id: 'task-abc' } };
globalThis.fetch = async (url, init) => {
  seen.push({ url, init });
  return { json: async () => reply };
};

say(configured(), 'two keys are set and it says it is not configured');
say(scheme() === 'signed', `a key pair reported itself as ${scheme()}`);

// ── Starting one ───────────────────────────────────────────────────────
const started = await startVideo({ prompt: 'a lonely highway at night', aspect: '16:9', seconds: 10 });
say(started.ok && started.taskId === 'task-abc', 'the task id did not come back');

const { url, init } = seen[0];
say(url === 'https://api-singapore.klingai.com/v1/videos/text2video', `posted to ${url}`);
say(init.method === 'POST', `used ${init.method}`);

const body = JSON.parse(init.body);
say(body.model_name === 'kling-v3', `model_name is ${body.model_name}`);
// v3 is the one with native audio, which is the whole reason the panels teach
// quotation marks. If the default ever moves off it, `sound` must move too.
say(body.sound === 'on', `sound is ${JSON.stringify(body.sound)} — quoted lines would come back silent`);
say(/subtitles/.test(body.negative_prompt), 'burnt-in subtitles are not excluded');
say(body.duration === '10', `duration is ${JSON.stringify(body.duration)} — Kling wants a string`);
say(body.aspect_ratio === '16:9', `aspect_ratio is ${body.aspect_ratio}`);
say(body.mode === 'pro', `mode is ${body.mode}`);
say(typeof body.prompt === 'string' && body.prompt.length > 0, 'the prompt did not go');

// ── The token, verified the way the other side verifies it ─────────────
const jwt = init.headers.Authorization.replace('Bearer ', '');
const [head, payload, signature] = jwt.split('.');
const header = JSON.parse(Buffer.from(head, 'base64url').toString());
const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
const now = Math.floor(Date.now() / 1000);

say(header.alg === 'HS256' && header.typ === 'JWT', `header is ${JSON.stringify(header)}`);
say(claims.iss === 'AK-test-123', `iss is ${claims.iss}, not the access key`);
say(claims.nbf <= now, 'nbf is in the future — the token is not yet valid');
say(claims.exp > now + 1700 && claims.exp <= now + 1800, `exp is ${claims.exp - now}s out, not the documented 1800`);
say(
  crypto.createHmac('sha256', 'SK-test-secret-456').update(`${head}.${payload}`).digest('base64url') === signature,
  'the signature does not verify against the secret key',
);

// ── Reading a task back ────────────────────────────────────────────────
reply = { code: 0, data: { task_status: 'processing' } };
say((await checkVideo('t')).state === 'running', 'processing did not read as running');

reply = { code: 0, data: { task_status: 'submitted' } };
say((await checkVideo('t')).state === 'running', 'submitted did not read as running');

reply = { code: 0, data: { task_status: 'something-new' } };
say((await checkVideo('t')).state === 'running', 'an unknown state did not read as running — it would refund a video that is coming');

reply = { code: 0, data: { task_status: 'succeed', task_result: { videos: [{ url: 'https://cdn/x.mp4' }] } } };
const done = await checkVideo('t');
say(done.state === 'done' && done.url === 'https://cdn/x.mp4', 'a finished video did not come back');

reply = { code: 0, data: { task_status: 'succeed', task_result: { videos: [] } } };
say((await checkVideo('t')).state === 'failed', 'succeeding with no video did not read as a failure');

reply = { code: 0, data: { task_status: 'failed', task_status_msg: 'blocked by content policy' } };
const failed = await checkVideo('t');
say(failed.state === 'failed' && failed.message.includes('content policy'), "the engine's own reason was dropped");

// An error inside a 200, which is how Kling reports most of them.
reply = { code: 1101, message: 'account arrears' };
say((await checkVideo('t')).state === 'unknown', 'an error inside a 200 read as success');
const refused = await startVideo({ prompt: 'x'.repeat(20), aspect: '16:9', seconds: 5 });
say(!refused.ok && refused.message.includes('arrears'), "a refusal dropped the engine's reason");

// ── The single API key, which is what the console issues now ───────────
process.env.KLINGAI_API_KEY = 'plain-key-789';
say(scheme() === 'api-key', 'a single key did not win over the pair');
seen.length = 0;
reply = { code: 0, data: { task_id: 'task-def' } };
await startVideo({ prompt: 'a lonely highway at night', aspect: '16:9', seconds: 5 });
say(
  seen[0].init.headers.Authorization === 'Bearer plain-key-789',
  `a single key was not sent through untouched: ${seen[0].init.headers.Authorization}`,
);

// Half a pair is not a setup, and must not read as one.
delete process.env.KLINGAI_API_KEY;
delete process.env.KLINGAI_SECRET_KEY;
say(!configured(), 'an access key with no secret read as configured');
say(scheme() === 'none', `half a pair reported itself as ${scheme()}`);
process.env.KLINGAI_SECRET_KEY = 'SK-test-secret-456';

// ── The ceiling ────────────────────────────────────────────────────────
say(klingCost(10) === klingCost(5) * 2, 'ten seconds is not twice five');
// Small on purpose: a ceiling that never fires is worse than one that fires
// early, because the first is discovered by a member paying for a failure.
say(monthlyCeiling() === 1_000, `the default ceiling is ${monthlyCeiling()}`);
say(monthlyCeiling() < 26_000, 'the default ceiling is optimistic about somebody else"s package');
process.env.KLING_MONTHLY_CREDITS = '5000';
say(monthlyCeiling() === 5000, 'the ceiling cannot be set from the environment');

console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : 'PASS — the token verifies and every task state reads correctly');
process.exit(problems.length ? 1 : 0);
