// What actually goes on the wire to text-to-dialogue, and what comes back.
//
//   node --experimental-strip-types .probe/converse.mjs
//
// A grep over the source would assert that the string "voice_id" appears in a
// file. This runs the real function against a fake ElevenLabs and reads the
// requests it makes, which is the difference between the field name being
// present somewhere and the field name being sent.
//
// It matters because none of this can be tried against the real endpoint from
// here without spending the owner's credits, and a wrong field name upstream is
// a 422 that a person sees as "the conversation could not be made".

import { converse, DIALOGUE_RATE } from '../app/lib/server/eleven.ts';
import { CAP } from '../app/lib/dialogue.ts';
import { secondsOf, wavOf } from '../app/lib/pcmwav.ts';

process.env.ELEVENLABS_API_KEY = 'test-key';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

/** A fake upstream that records what it was asked and answers with PCM. */
function fake({ bytesPerCall = 480, fail = null } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method: init?.method, headers: init?.headers, body });
    if (fail && calls.length >= fail.onCall) {
      return new Response(JSON.stringify({ detail: fail.detail }), { status: fail.status });
    }
    return new Response(new Uint8Array(bytesPerCall), { status: 200 });
  };
  return calls;
}

// ── One short conversation: one request, and the right one ─────────────
{
  const calls = fake();
  const result = await converse([
    { voiceId: 'v-anre', text: 'So what changed this year?' },
    { voiceId: 'v-carli', text: 'Everything, and none of it at once.' },
  ]);
  say(result.ok, `a two-turn conversation failed: ${result.ok ? '' : result.message}`);
  say(calls.length === 1, `expected one request, saw ${calls.length}`);

  const [call] = calls;
  say(call.method === 'POST', `method was ${call.method}`);
  say(
    call.url === `https://api.elevenlabs.io/v1/text-to-dialogue?output_format=pcm_${DIALOGUE_RATE}`,
    `the URL was ${call.url}`,
  );
  say(call.headers['xi-api-key'] === 'test-key', 'the key is not on the request');
  say(call.headers['Content-Type'] === 'application/json', 'the body is not declared as JSON');

  // Their field names, snake_case on the wire, from the SDK's serialisers.
  say(Array.isArray(call.body.inputs), 'the turns did not go out as `inputs`');
  say(call.body.inputs.length === 2, `sent ${call.body.inputs.length} inputs for two turns`);
  say('voice_id' in call.body.inputs[0], 'a turn carries voiceId rather than voice_id');
  say(!('voiceId' in call.body.inputs[0]), 'the camelCase name leaked onto the wire');
  say(call.body.inputs[0].voice_id === 'v-anre', 'the first turn went out in the wrong voice');
  say(call.body.inputs[0].text === 'So what changed this year?', 'the words changed on the way out');
  say(typeof call.body.model_id === 'string' && call.body.model_id, 'no model was named');
  say(call.body.apply_text_normalization === 'auto', 'text normalisation was not set');
  say(!('language_code' in call.body), 'a language was sent when none was asked for');
}

// ── A language, when one is asked for ──────────────────────────────────
{
  const calls = fake();
  await converse([{ voiceId: 'v1', text: 'Goeiemôre.' }], 'af');
  say(calls[0].body.language_code === 'af', 'the language did not go out as language_code');
}

// ── A long script: several requests, none over the cap ─────────────────
{
  const calls = fake({ bytesPerCall: 1000 });
  const turns = Array.from({ length: 40 }, (_, i) => ({
    voiceId: i % 2 ? 'v-a' : 'v-b',
    text: `Turn number ${i}. ${'a sentence about the future. '.repeat(6)}`,
  }));
  const result = await converse(turns);
  say(result.ok, 'a long script failed');
  say(calls.length > 1, 'a script well over the cap went out as one request');
  for (const call of calls) {
    const chars = call.body.inputs.reduce((sum, one) => sum + one.text.length, 0);
    say(chars <= CAP, `a request carried ${chars} characters, over their cap of ${CAP}`);
  }

  // Nothing lost across the joins.
  const sent = calls.flatMap((c) => c.body.inputs).map((i) => i.text).join('');
  const meant = turns.map((t) => t.text).join('');
  say(sent.replace(/\s+/g, '') === meant.replace(/\s+/g, ''), 'words went missing between requests');

  // And the audio is every request's audio, joined.
  say(
    result.ok && result.spoken.pcm.length === calls.length * 1000,
    `joined ${result.ok ? result.spoken.pcm.length : 0} bytes from ${calls.length} requests of 1000`,
  );
  say(result.ok && result.spoken.requests === calls.length, 'the count of requests reported back is wrong');
  say(result.ok && result.spoken.rate === DIALOGUE_RATE, 'the rate reported back is not the rate asked for');
}

// ── The model falls back once, on the first request only ───────────────
// Switching model halfway through would change the voices halfway through.
{
  const calls = fake({ fail: { onCall: 1, status: 400, detail: 'model not available on your plan' } });
  let first = true;
  globalThis.fetch = (() => {
    const inner = globalThis.fetch;
    return async (url, init) => {
      const response = await inner(url, init);
      if (first) { first = false; return response; }
      return new Response(new Uint8Array(240), { status: 200 });
    };
  })();
  const result = await converse([{ voiceId: 'v1', text: 'Hello.' }]);
  say(result.ok, 'the fallback model was never tried after the first was refused');
  say(calls.length === 2, `expected a retry, saw ${calls.length} request(s)`);
  say(
    calls[0].body.model_id !== calls[1].body.model_id,
    'the retry asked for the same model that had just been refused',
  );
}

// ── A refusal partway through is a refusal, not half an episode ────────
{
  const calls = fake({ bytesPerCall: 600, fail: { onCall: 2, status: 401, detail: 'quota exceeded' } });
  const turns = Array.from({ length: 40 }, (_, i) => ({ voiceId: 'v1', text: `Turn ${i}. ${'word '.repeat(30)}` }));
  const result = await converse(turns);
  say(!result.ok, 'a failed request in the middle came back as a finished episode');
  say(!result.ok && /quota/i.test(result.message), `their words were lost: ${result.ok ? '' : result.message}`);
  say(calls.length >= 2, 'it gave up before the request that failed');
}

// ── Nothing to say is not a request ────────────────────────────────────
{
  const calls = fake();
  const result = await converse([{ voiceId: 'v1', text: '   ' }]);
  say(!result.ok, 'a script of nothing but spaces was sent upstream');
  say(calls.length === 0, 'an empty script still cost a request');
}

// ── The header on the joined audio says the right thing ────────────────
{
  const pcm = new Uint8Array(DIALOGUE_RATE * 2 * 3);          // three seconds
  const wav = wavOf(pcm, DIALOGUE_RATE);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const text = (at, len) => String.fromCharCode(...wav.slice(at, at + len));
  say(text(0, 4) === 'RIFF' && text(8, 4) === 'WAVE', 'the file does not begin as a WAV');
  say(view.getUint32(4, true) === 36 + pcm.length, 'the RIFF length is wrong, which plays and then stops early');
  say(view.getUint32(40, true) === pcm.length, 'the data length is wrong');
  say(view.getUint32(4, true) - view.getUint32(40, true) === 36, 'the two lengths are not 36 apart');
  say(view.getUint32(24, true) === DIALOGUE_RATE, 'the sample rate in the header is not the one it was made at');
  say(view.getUint16(22, true) === 1 && view.getUint16(34, true) === 16, 'not 16-bit mono');
  say(view.getUint32(28, true) === DIALOGUE_RATE * 2, 'the byte rate does not match the format');
  say(Math.abs(secondsOf(pcm.length, DIALOGUE_RATE) - 3) < 0.001, 'three seconds of audio does not measure three seconds');
}

if (problems.length) {
  console.error(`converse: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('converse: the wire carries their field names, the cap is respected across joins, and a refusal is never half an episode');
