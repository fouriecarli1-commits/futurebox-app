// Cover art: the prompt, and what it refuses to put on a sleeve.
//
//   node .probe/cover.mjs
//
// No network. What is checked is the thing most likely to be got wrong: a
// cover built from a lyric sheet, or one with letters on it.

process.env.ELEVENLABS_API_KEY = 'xi-test';

const { coverPrompt, startCover, checkCover, configured, COVER_MODEL } =
  await import('../app/lib/server/cover.ts');
const { CREDITS } = await import('../app/lib/credits.ts');

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

say(configured(), 'a key is set and it says it is not configured');
say(CREDITS.cover > 0, 'a cover is free, and a free button gets pressed forty times while somebody decides');
say(CREDITS.cover < CREDITS.song, 'a cover costs as much as a whole song');

// ── The prompt is made of mood, not of words ───────────────────────────
const prompt = coverPrompt({
  title: 'Fall Forward',
  genre: 'Amapiano',
  style: 'warm analogue keys, log drum, late afternoon',
});
say(/no text|no letters|no words/i.test(prompt), 'the prompt does not forbid text — every model writes almost-words');
say(/amapiano/i.test(prompt), 'the genre never reached the prompt');
say(/log drum/i.test(prompt), 'the style words never reached the prompt');
say(/light|shadow/i.test(prompt), 'the prompt says nothing about light, which is what a sleeve is made of');
say(!/no people/i.test(prompt) === false, 'faces are not excluded — a generated face on a sleeve is a likeness problem');
say(prompt.length < 1500, `the prompt is ${prompt.length} characters`);

// The title must not be drawn. A sleeve with almost-words where the title
// should be is unusable, and asking for the title invites exactly that.
say(!prompt.includes('Fall Forward'), 'the song title is in the prompt — it will be drawn as letters');

// ── What goes on the wire ──────────────────────────────────────────────
const seen = [];
let reply = { id: 'img-1', status: 'pending' };
globalThis.fetch = async (url, init) => {
  seen.push({ url, init });
  return { json: async () => reply };
};

const started = await startCover(prompt);
say(started.ok && started.id === 'img-1', 'the generation id did not come back');
say(seen[0].url === 'https://api.elevenlabs.io/v1/flows/image', `posted to ${seen[0].url}`);
say(seen[0].init.headers['xi-api-key'] === 'xi-test', 'the key was not sent as xi-api-key');

const body = JSON.parse(seen[0].init.body);
say(body.model_id === COVER_MODEL, `model_id is ${body.model_id}`);
say(body.aspect_ratio === '1:1', `a sleeve was asked for as ${body.aspect_ratio}`);
say(body.resolution === '1K', `resolution is ${body.resolution}`);

// ── Reading it back ────────────────────────────────────────────────────
reply = { id: 'g', status: 'generating' };
say((await checkCover('g')).state === 'running', 'generating did not read as running');
reply = { id: 'g', status: 'completed', content_url: 'https://cdn/x.png' };
const done = await checkCover('g');
say(done.state === 'done' && done.url === 'https://cdn/x.png', 'a finished cover did not come back');
reply = { id: 'g', status: 'completed' };
say((await checkCover('g')).state === 'failed', 'completing with no image did not read as a failure');
reply = { id: 'g', status: 'failed', error_message: 'refused' };
say((await checkCover('g')).state === 'failed', 'a failure did not read as one');

// Unreachable must read as still running: guessing failure would charge for a
// cover that was about to arrive.
globalThis.fetch = async () => { throw new Error('down'); };
say((await checkCover('g')).state === 'running', 'an unreachable engine read as a failure');

console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : 'PASS — the sleeve is made of mood, carries no text, and costs 2');
process.exit(problems.length ? 1 : 0);
