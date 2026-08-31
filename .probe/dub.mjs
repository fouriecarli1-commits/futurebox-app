// What goes on the wire to dubbing, and what comes back off it.
//
//   node --experimental-strip-types .probe/dub.mjs
//
// Same reasoning as `.probe/converse.mjs`: none of this can be tried against
// the real endpoint from here without spending the owner's credits, and a
// wrong multipart field name is a 422 that somebody reads as "the dub could
// not be started". So the real functions run against a fake ElevenLabs and the
// requests they make are read.
//
// The refund path is *not* checked here — it lives in Postgres, in
// `claim_dub_refund`, and was proven there against a real database: a failed
// dub refunds once and returns what was actually charged, a second poll gets
// nothing, another account claims nothing, and a dub still running or already
// finished refunds nothing.

import { dub, dubState, dubbed } from '../app/lib/server/eleven.ts';
import { dubCost, CREDITS } from '../app/lib/credits.ts';

process.env.ELEVENLABS_API_KEY = 'test-key';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

/** A fake upstream that records what it was asked. */
function fake(answer) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const call = { url: String(url), method: init?.method ?? 'GET', headers: init?.headers, fields: {} };
    if (init?.body instanceof FormData) {
      for (const [key, value] of init.body.entries()) {
        call.fields[key] = value instanceof Blob ? `<blob ${value.size}>` : value;
      }
    }
    calls.push(call);
    return answer(call);
  };
  return calls;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// ── Starting one ───────────────────────────────────────────────────────
{
  const calls = fake(() => json({ dubbing_id: 'dub-1', expected_duration_sec: 240 }));
  const started = await dub(new Blob([new Uint8Array(2048)]), 'af', 'en', 0);

  say(started.ok, `starting a dub failed: ${started.ok ? '' : started.message}`);
  say(started.ok && started.dub.id === 'dub-1', 'the id did not come back');
  say(started.ok && started.dub.expected === 240, 'their estimate was dropped');

  const [call] = calls;
  say(call.url === 'https://api.elevenlabs.io/v1/dubbing', `the URL was ${call.url}`);
  say(call.method === 'POST', `method was ${call.method}`);
  say(call.headers['xi-api-key'] === 'test-key', 'the key is not on the request');

  // Their multipart names, from the SDK's own serialisers rather than memory.
  say('file' in call.fields, 'the audio did not go out as `file`');
  say(call.fields.target_lang === 'en', `target_lang was ${call.fields.target_lang}`);
  say(call.fields.source_lang === 'af', `source_lang was ${call.fields.source_lang}`);
  say(call.fields.num_speakers === '0', 'the "work it out" speaker count did not go as 0');
  // A watermark belongs on a video somebody might pass off as filmed. This is
  // the host's own show in their own voice, and they are publishing it.
  say(call.fields.watermark === 'false', 'a watermark was asked for on somebody\'s own show');
  say(!('targetLang' in call.fields), 'a camelCase name leaked onto the wire');
}

// ── An unknown source is left out, not sent empty ──────────────────────
// An empty string is not "work it out" — it is a language code of nothing, and
// it is the sort of thing that comes back as a validation error.
{
  const calls = fake(() => json({ dubbing_id: 'dub-2', expected_duration_sec: 10 }));
  await dub(new Blob([new Uint8Array(16)]), '', 'af', 2);
  say(!('source_lang' in calls[0].fields), 'an unknown source language was sent as an empty string');
  say(calls[0].fields.num_speakers === '2', 'the speaker count did not go out');
}

// ── Accepted without an id is not accepted ─────────────────────────────
{
  fake(() => json({ expected_duration_sec: 10 }));
  const started = await dub(new Blob([new Uint8Array(16)]), 'af', 'en', 0);
  say(!started.ok, 'a dub with no id came back as a started job that can never be polled');
}

// ── Their refusal, in their words ──────────────────────────────────────
{
  fake(() => json({ detail: 'This language is not supported for dubbing' }, 400));
  const started = await dub(new Blob([new Uint8Array(16)]), 'af', 'xx', 0);
  say(!started.ok, 'a refusal came back as a started job');
  say(!started.ok && /not supported/i.test(started.message), `their words were lost: ${started.ok ? '' : started.message}`);
}

// ── Polling ────────────────────────────────────────────────────────────
{
  const calls = fake(() => json({ status: 'dubbing', target_languages: ['en'] }));
  const state = await dubState('dub-1');
  say(calls[0].url === 'https://api.elevenlabs.io/v1/dubbing/dub-1', `polled ${calls[0].url}`);
  say(calls[0].method === 'GET', 'polling is not a GET');
  say(state.ok && state.state.status === 'dubbing', 'the status was lost');
  say(state.ok && !state.state.done && !state.state.failed, 'a job still running reads as finished');
}
{
  fake(() => json({ status: 'dubbed', target_languages: ['en'] }));
  const state = await dubState('dub-1');
  say(state.ok && state.state.done, "'dubbed' is not read as done");
  say(state.ok && state.state.languages[0] === 'en', 'the languages it was made in were dropped');
}
{
  fake(() => json({ status: 'failed', error: 'the audio had no speech in it' }));
  const state = await dubState('dub-1');
  say(state.ok && state.state.failed, "'failed' is not read as failed");
  say(state.ok && /no speech/.test(state.state.error ?? ''), 'their reason was dropped, and it is the only useful sentence');
  say(state.ok && !state.state.done, 'a failed dub reads as done, which would try to collect it');
}
{
  // A status nobody has seen before must not read as finished or failed.
  fake(() => json({ status: 'something_new' }));
  const state = await dubState('dub-1');
  say(state.ok && !state.state.done && !state.state.failed, 'an unfamiliar status was treated as final');
}

// ── Collecting ─────────────────────────────────────────────────────────
{
  const calls = fake(() => new Response(new Uint8Array(4096), { status: 200 }));
  const audio = await dubbed('dub-1', 'en');
  say(
    calls[0].url === 'https://api.elevenlabs.io/v1/dubbing/dub-1/audio/en',
    `collected from ${calls[0].url}`,
  );
  say(audio.ok && audio.audio.byteLength === 4096, 'the audio did not come back whole');
}
{
  // An id with a slash in it must not walk up the path.
  const calls = fake(() => new Response(new Uint8Array(1), { status: 200 }));
  await dubbed('../voices', 'en');
  say(!calls[0].url.includes('/v1/voices'), `an id escaped its path: ${calls[0].url}`);
  say(calls[0].url.includes('%2F') || calls[0].url.includes('..%2F'), 'the id was not encoded into the path');
}

// ── What it costs, by the minute ───────────────────────────────────────
say(dubCost(0) === CREDITS.dub, 'a zero-length episode costs nothing');
say(dubCost(1) === CREDITS.dub, 'a one-second clip does not reach the floor');
say(dubCost(60) === CREDITS.dub, 'a minute costs more than a minute');
say(dubCost(61) === CREDITS.dub * 2, 'a minute and a second is not rounded up to two');
say(dubCost(1800) === CREDITS.dub * 30, 'a half-hour episode is mispriced');
say(dubCost(-5) === CREDITS.dub, 'a negative length produced something other than the floor');

// ── The route's charging discipline ────────────────────────────────────
//
// The wire test above cannot see this and the database test cannot either: it
// is the seam between them. A dub is the only thing in this app that takes
// money in one request and can fail in a different one, so the four rules that
// make that honest are asserted over the source.
{
  const read = async (path) =>
    (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
  const bare = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const route = bare(await read('../app/api/dub/route.ts'));

  // 1. The money is taken when the job starts, because that is when the vendor
  //    is billed — whether anybody ever collects it.
  say(/charge\(request, cost, 'dub'\)/.test(route), 'the dub is never charged for');
  say(
    route.indexOf('charge(request, cost') < route.indexOf('await dub('),
    'the job is started before the credits are taken, so a refusal costs nothing but bills upstream',
  );

  // 2. A start that cannot be filed is a start nobody can collect. Give it back.
  say(/paid\.refund\(\)/.test(route), 'nothing is ever given back');
  // Two paths, not three: `dub()` folds "accepted without an id" into its own
  // refusal, so the route sees upstream failing and the row not filing.
  say(
    (route.match(/await paid\.refund\(\)/g) ?? []).length === 2,
    `${(route.match(/await paid\.refund\(\)/g) ?? []).length} refund sites after the charge \u2014 expected two: upstream refusing, and the row not filing`,
  );
  say(
    /if \(!started\.ok\) \{\s*await paid\.refund\(\)/.test(route),
    'an upstream refusal keeps the credits',
  );
  say(
    route.lastIndexOf('await paid.refund()') > route.indexOf('.insert({'),
    'a job that started but could not be filed keeps the credits, and nothing can ever collect it',
  );

  // 3. The refund on a failure is claimed, not decided. Deciding in the route
  //    and refunding after it is the shape that pays twice when two polls
  //    arrive together.
  say(/claim_dub_refund/.test(route), 'a failed dub is never refunded');
  say(
    route.indexOf('claim_dub_refund') < route.indexOf('await refund(caller.id'),
    'the refund happens before the claim, so every poll would pay again',
  );
  say(
    /if \(give > 0\) await refund/.test(route),
    'a claim that returned nothing still pays out',
  );

  // 4. Ownership is checked before anything is said about the dub at all —
  //    including whether it exists.
  say(/data\.owner !== caller\.id/.test(route), 'a dub id is a bearer token: anybody holding it can poll it');
  say(
    route.indexOf('data.owner !== caller.id') < route.indexOf('await dubState(id)'),
    'the upstream is polled before the owner is checked, which answers for somebody else\'s dub',
  );
  say(
    /not yours.*status: 404|404/.test(route.slice(route.indexOf('data.owner !== caller.id'), route.indexOf('data.owner !== caller.id') + 300)),
    'a dub that is not yours answers differently from one that does not exist, which says it exists',
  );

  // And the migration is named, rather than the feature looking merely broken.
  say(/dubs\.sql/.test(route), 'a missing table does not name the file somebody has to run');

  const sql = await read('../supabase/dubs.sql');
  say(/enable row level security/.test(sql), 'the table is readable by anything holding an anon key');
  say(!/create policy/.test(sql), 'a policy was added, and every read here goes through the server instead');
  say(/refunded_at is null/.test(sql), 'the claim does not exclude an already-refunded dub');
  say(/and status = 'failed'/.test(sql), 'a dub that is still running could be claimed as a refund');
  say(/returning charged/.test(sql), 'the claim does not say what to give back');
  say(/on delete cascade/.test(sql), 'a deleted account leaves its dubs behind');
}

if (problems.length) {
  console.error(`dub: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('dub: their multipart names go out, an unfamiliar status is never final, an id cannot escape its path, and the price is by the minute');
