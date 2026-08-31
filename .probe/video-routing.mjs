// Which engine gets a request, and what goes on the wire when it does.
//
//   node .probe/video-routing.mjs
//
// No network: fetch is replaced with something that records what it was asked
// and answers what it is told to. The point is the routing rules and the field
// names, both of which are exactly checkable without spending a credit.

process.env.ELEVENLABS_API_KEY = 'xi-test';
process.env.KLINGAI_API_KEY = 'kl-test';
process.env.ELEVEN_SEEDANCE_READY = '1';

const { PROVIDERS, candidates, gradesAvailable, nearestLength, providerById, suits } =
  await import('../app/lib/server/video/index.ts');
const { seedance, veo } = await import('../app/lib/server/video/eleven.ts');
const { kling } = await import('../app/lib/server/video/kling.ts');

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const shot = { prompt: 'a road at dusk', aspect: '16:9', seconds: 5, speak: false };
const free = () => 0;

// ── The three rungs exist and are in cost order ────────────────────────
say(PROVIDERS.length === 3, `${PROVIDERS.length} engines registered`);
say(
  PROVIDERS.map((one) => one.grade).join() === 'standard,better,premium',
  `engines are in the order ${PROVIDERS.map((one) => one.grade).join()}`,
);
say(gradesAvailable().length === 3, `${gradesAvailable().length} grades available with every key set`);
say(providerById('seedance') === seedance, 'seedance cannot be looked up');
say(providerById('nonsense') === undefined, 'an unknown engine id returned something');

// ── A grade gets its own engine, and never a cheaper one ───────────────
say(candidates('standard', shot, free)[0] === seedance, 'standard did not route to the cheap engine');
say(candidates('better', shot, free)[0] === veo, 'better did not route to Veo');
say(candidates('premium', shot, free)[0] === kling, 'premium did not route to Kling');
say(
  candidates('premium', shot, free).every((one) => one.grade === 'premium'),
  'a premium request could be served by a cheaper engine — that is selling somebody something',
);

// ── A spoken line only goes where it can be spoken ─────────────────────
const spoken = { ...shot, speak: true };
say(!suits(seedance, spoken), 'the cheap engine accepted a spoken line it cannot say');
say(suits(veo, spoken), 'Veo refused a spoken line it can say');
say(candidates('standard', spoken, free).length === 0, 'a spoken line routed to an engine that cannot speak');

// ── A full engine is skipped before it is asked, not after it refuses ──
const full = (one) => one.ceiling();
say(candidates('standard', shot, full).length === 0, 'a spent engine was still offered the work');
const nearlyFull = (one) => one.ceiling() - 1;
say(candidates('standard', shot, nearlyFull).length === 0, 'an engine one unit short of its ceiling was still used');

// ── Lengths are rounded to what the engine actually makes ──────────────
say(nearestLength(veo.can, 5) === 4 || nearestLength(veo.can, 5) === 6, `Veo rounded 5s to ${nearestLength(veo.can, 5)}`);
say(nearestLength(veo.can, 10) === 8, `Veo rounded 10s to ${nearestLength(veo.can, 8)}`);
say(nearestLength(kling.can, 7) === 5 || nearestLength(kling.can, 7) === 10, 'Kling rounded 7s to something it cannot make');
say(nearestLength(seedance.can, 10) === 10, 'Seedance would not make ten seconds');
say(nearestLength(seedance.can, 30) === 30, 'Seedance would not make thirty seconds');
say(nearestLength(seedance.can, 22) === 20, `22s rounded to ${nearestLength(seedance.can, 22)}`);
// Longer costs more, in step. A flat price per clip would make the long ones
// the only rational choice.
say(seedance.cost(30) === seedance.cost(5) * 6, 'thirty seconds is not six times five');
say(seedance.cost(5) === 20, `five seconds is ${seedance.cost(5)} units`);

// ── An engine with no key is never offered ─────────────────────────────
delete process.env.KLINGAI_API_KEY;
delete process.env.KLINGAI_ACCESS_KEY;
delete process.env.KLINGAI_SECRET_KEY;
say(!kling.configured(), 'Kling reports itself configured with no keys at all');
say(candidates('premium', shot, free).length === 0, 'an unconfigured engine was offered the work');
say(!gradesAvailable().includes('premium'), 'a grade with no working engine is still offered');
process.env.KLINGAI_API_KEY = 'kl-test';

// ── Seedance without its approval must not take the default grade ──────
//
// A key alone cannot tell whether ByteDance is enabled on the workspace. If
// this engine reported itself ready anyway it would take Standard — the
// default — charge, fail and refund, which is a worse first run than simply
// not being on the shelf yet.
delete process.env.ELEVEN_SEEDANCE_READY;
say(!seedance.configured(), 'Seedance reports itself ready without the approval flag');
say(!gradesAvailable().includes('standard'), 'Standard is offered with no engine that can serve it');
say(candidates('standard', shot, free).length === 0, 'an unapproved engine was still handed the work');
say(gradesAvailable().includes('better'), 'Better disappeared along with Standard');
process.env.ELEVEN_SEEDANCE_READY = '1';
say(seedance.configured(), 'Seedance stayed off after the approval flag was set');

// ── What ElevenLabs is actually sent ───────────────────────────────────
const seen = [];
let reply = { id: 'gen-1', status: 'pending' };
globalThis.fetch = async (url, init) => {
  seen.push({ url, init });
  return { json: async () => reply };
};

const started = await seedance.start({ ...shot, seconds: 10 });
say(started.ok && started.taskId === 'gen-1', 'the generation id did not come back');

const { url, init } = seen[0];
say(url === 'https://api.elevenlabs.io/v1/flows/video', `posted to ${url}`);
say(init.headers['xi-api-key'] === 'xi-test', 'the ElevenLabs key was not sent as xi-api-key');

const body = JSON.parse(init.body);
// Their SDK serialises camelCase to snake_case; these are the wire names.
say(body.model_id === 'bytedance-seedance-v2-mini', `model_id is ${body.model_id}`);
say(body.duration_secs === 10, `duration_secs is ${JSON.stringify(body.duration_secs)}`);
say(body.aspect_ratio === '16:9', `aspect_ratio is ${body.aspect_ratio}`);
say(body.generate_audio === false, `generate_audio is ${body.generate_audio} on the silent rung`);
say(/subtitles/.test(body.negative_prompt), 'burnt-in subtitles are not excluded');

seen.length = 0;
await veo.start({ ...shot, speak: true, seconds: 8 });
say(JSON.parse(seen[0].init.body).generate_audio === true, 'Veo was not asked for audio on a spoken line');
say(JSON.parse(seen[0].init.body).model_id === 'veo-3.1-fast-generate-001', 'Veo model id is wrong');

// Square is real on one model and not on the other, and the app must not
// paper over the difference. Silently substituting a shape is worse than
// refusing one: the member cannot see it happen and has no idea why the crop
// is wrong.
seen.length = 0;
await seedance.start({ ...shot, aspect: '1:1' });
say(JSON.parse(seen[0].init.body).aspect_ratio === '1:1', 'Seedance takes square and was sent something else');
say(suits(seedance, { ...shot, aspect: '1:1' }), 'Seedance was refused a shape it supports');
say(!suits(veo, { ...shot, aspect: '1:1' }), 'Veo was offered square, which its request type refuses');
say(candidates('better', { ...shot, aspect: '1:1' }, free).length === 0, 'a square request routed to an engine that cannot make one');

// And each model is asked for the best it can give rather than the least.
seen.length = 0;
await seedance.start(shot);
say(JSON.parse(seen[0].init.body).resolution === '720p', 'the mini was asked for a resolution it does not have');
seen.length = 0;
await veo.start(shot);
say(JSON.parse(seen[0].init.body).resolution === '1080p', 'Veo was left at 720p when it goes to 4K');

// ── Reading a generation back ──────────────────────────────────────────
reply = { id: 'g', status: 'generating' };
say((await seedance.check('g')).state === 'running', 'generating did not read as running');
reply = { id: 'g', status: 'pending' };
say((await seedance.check('g')).state === 'running', 'pending did not read as running');
reply = { id: 'g', status: 'something-new' };
say((await seedance.check('g')).state === 'running', 'an unknown state did not read as running — it would refund a video that is coming');

reply = { id: 'g', status: 'completed', content_url: 'https://cdn/x.mp4', content_mime_type: 'video/mp4' };
const done = await seedance.check('g');
say(done.state === 'done' && done.url === 'https://cdn/x.mp4', 'a finished video did not come back');

reply = { id: 'g', status: 'completed' };
say((await seedance.check('g')).state === 'failed', 'completing with no URL did not read as a failure');

reply = { id: 'g', status: 'failed', failure_reason: 'moderated', error_message: 'prompt refused' };
const refused = await seedance.check('g');
say(refused.state === 'failed' && /Refused by the engine/.test(refused.message), 'a moderation refusal reads like an outage');

reply = { id: 'g', status: 'failed', failure_reason: 'model_error', error_message: 'the model fell over' };
say(/fell over/.test((await seedance.check('g')).message), "the engine's own reason was dropped");

reply = { detail: { message: 'ByteDance models require approval' } };
const denied = await seedance.start(shot);
say(!denied.ok && /approval/.test(denied.message), 'the approval message was swallowed — that is the one people hit first');

console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : 'PASS — grades route correctly, never downgrade, and the ElevenLabs wire format holds');
process.exit(problems.length ? 1 : 0);
