/**
 * Gemini Omni Flash: the reader, driven by the answer she actually pasted.
 *
 * ── Why this exists before anything calls it ─────────────────────────────
 *
 * Because the expensive failure with a Google engine is never the request.
 * It is a 200 with a paid result in it that this app cannot find: `check:veo`
 * exists because the video reader was guessed at, and `check:prent` because
 * the picture one was. Both were written after the near-miss.
 *
 * This time the answer arrived first. Carli pasted her own documentation page
 * on 10 October 2026 — the endpoint, the request and a complete response —
 * so the reader can be settled against the real shape before a cent is
 * spent, rather than after.
 *
 * ── The shape, and the trap in it ────────────────────────────────────────
 *
 * The video is three levels down, in a list whose other row is the model's
 * THINKING:
 *
 *   steps: [ { type: 'thought',       summary: [ { type: 'text', text: … } ] },
 *            { type: 'model_output',  content: [ { type: 'video', data, mime_type } ] } ]
 *
 * A reader that took the longest string would hand somebody an .mp4 full of
 * the model's reasoning — 453 thought tokens against a 26-token prompt in her
 * own sample. So the row is picked by `type`, and this drives that.
 *
 * And the same endpoint answers in two different envelopes: Lyria 3 Pro, on
 * `interactions`, uses `outputs: [ … ]`. Both are read.
 *
 * ── Nothing is charged through it, and that is asserted ──────────────────
 *
 * Her sample bills by TOKEN, and the thinking is 95% of it. The rate is
 * unread, so `googlespend.ts` cannot hold a ceiling — and an engine with no
 * ceiling is one this app does not run. Carli, 10 October 2026, on seeing the
 * price: *"Gemini omni flash is baie duur."* So the check below holds that no
 * route calls it, which is a thing that would otherwise be undone quietly by
 * somebody wiring a button.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import {
  OMNI_MODEL, inputFor, isWaiting, requestFor, spentOn, videoIn, wordsIn,
} from '../app/lib/server/omni.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** Long enough to pass the reader's own floor, which is 512 characters. */
const CLIP = 'A'.repeat(2048);

/**
 * Her response, verbatim but for the video data and the thought text.
 *
 * Kept as the literal shape rather than built by a helper, because the whole
 * value of this file is that it drives what Google actually sent.
 */
const HERS = {
  id: 'INTERACTION_ID',
  model: 'gemini-omni-flash-preview',
  status: 'completed',
  usage: {
    total_tokens: 479,
    total_input_tokens: 26,
    input_tokens_by_modality: [{ modality: 'text', tokens: 26 }],
    total_output_tokens: 0,
    total_thought_tokens: 453,
  },
  steps: [
    { type: 'thought', summary: [{ type: 'text', text: 'MODEL THOUGHTS' }] },
    {
      type: 'model_output',
      content: [{ type: 'video', data: CLIP, mime_type: 'video/mp4' }],
    },
  ],
  object: 'interaction',
  role: 'model',
  created: '2026-06-25T02:17:56Z',
  updated: '2026-06-25T02:17:56Z',
};

/* ── 1. The video is found where she said it is ────────────────────────── */

ok('the video is found in her own answer',
  videoIn(HERS)?.base64 === CLIP,
  'the shape this was written from is the shape it cannot read, which would'
  + ' be a paid clip on the floor on the first press');

ok('  and its type comes off the answer rather than being assumed',
  videoIn(HERS)?.mime === 'video/mp4',
  '`mime_type`, snake_case, as her page spells it');

ok('  and where it was found is reported, so the guessing can stop',
  videoIn(HERS)?.under === 'steps[1].content[0].data',
  'the first real press settles the shape without anybody reading a log');

ok('  and the THINKING is not mistaken for the video',
  (() => {
    const thinking = {
      ...HERS,
      steps: [
        { type: 'thought', summary: [{ type: 'text', text: 'B'.repeat(9000) }] },
        {
          type: 'model_output',
          content: [{ type: 'video', data: CLIP, mime_type: 'video/mp4' }],
        },
      ],
    };
    return videoIn(thinking)?.base64 === CLIP;
  })(),
  'a reader that took the longest string would hand somebody an .mp4 full of'
  + ' the model’s reasoning — 453 thought tokens against a 26-token prompt in'
  + ' her own sample, so the reasoning is usually the longest thing there');

ok('  and a video in Lyria’s envelope is read too',
  videoIn({
    status: 'completed',
    outputs: [
      { type: 'text', text: 'a description' },
      { type: 'video', data: CLIP, mime_type: 'video/mp4' },
    ],
  })?.base64 === CLIP,
  'the same endpoint answers the song engine in `outputs` and this one in'
  + ' `steps`. Guessing one would throw away a paid clip that arrived in the'
  + ' other');

ok('  and nothing is found where there is nothing',
  videoIn({}) === null && videoIn(null) === null
  && videoIn({ steps: [{ type: 'model_output', content: [{ type: 'text', text: CLIP }] }] }) === null,
  'a text row read as a video is an .mp4 that will not play, which is the'
  + ' hardest kind of wrong to trace');

ok('  and a stub of a string is not taken for a video',
  videoIn({ steps: [{ type: 'model_output', content: [{ type: 'video', data: 'AA' }] }] }) === null,
  'two characters is not an mp4; a floor under the length is what stops an'
  + ' empty field being handed on as a file');

/* ── 2. Words, which are sometimes the refusal ─────────────────────────── */

ok('what it said in words is read as well',
  wordsIn(HERS).includes('MODEL THOUGHTS'),
  'a safety block comes back as a finished interaction with thoughts and no'
  + ' video, and reporting that as "the video was not where this app looked"'
  + ' sends somebody hunting a field-name bug that is not there');

ok('  including a plain text row in Lyria’s envelope',
  wordsIn({ outputs: [{ type: 'text', text: 'refused' }] }).includes('refused'));

/* ── 3. The bill, which is tokens and mostly thinking ─────────────────── */

const spent = spentOn(HERS);
ok('the tokens are read, all four numbers',
  spent.total === 479 && spent.input === 26 && spent.output === 0
  && spent.thought === 453,
  `${JSON.stringify(spent)} — her own sample`);

ok('  and the thinking is seen to be the bulk of it',
  spent.thought > spent.input * 10,
  `${spent.thought} thought against ${spent.input} in — a cost model built on`
  + ' the length of the prompt would be wrong by a factor of eighteen on her'
  + ' own example, which is the number that matters for a ceiling');

ok('  and a missing usage block is zeros rather than a throw',
  (() => {
    const none = spentOn({ status: 'completed' });
    return none.total === 0 && none.thought === 0;
  })(),
  'the video is already in hand by the time this is read, and bookkeeping'
  + ' must not be what loses it');

/* ── 4. An answer that is not finished is reported as itself ───────────── */

ok('a finished answer is not read as still working',
  !isWaiting(HERS));

ok('  and one that is still working is',
  isWaiting({ status: 'running' }) && isWaiting({ status: 'queued' }),
  'a field that says `completed` only has a reason to exist if it can say'
  + ' something else, and a reply that is not finished read as a missing'
  + ' video would send somebody looking for a bug in a reader that works');

ok('  and a failure is not read as still working either',
  !isWaiting({ status: 'failed' }),
  'waiting for a call that has already failed is a spinner that never stops');

/* ── 5. The request, which is the api the app already knows ────────────── */

ok('the model is spelled as her documentation spells it',
  OMNI_MODEL === 'gemini-omni-flash-preview',
  'the Gemini conversation on the 9th called it `gemini-omni-flash-1.1`. A'
  + ' name off a chat and a name off the documentation differed by a version'
  + ' number, and only one of them answers');

ok('  and the model is named in the BODY, as that api takes it',
  (() => {
    const asked = JSON.parse(requestFor('make it evening').body) as { model?: string };
    return asked.model === OMNI_MODEL;
  })(),
  'the publisher api puts the model in the path; this one puts it in the body');

ok('  and the words go in an `input` list, as her page shows',
  (() => {
    const asked = JSON.parse(requestFor('make it evening').body) as {
      input?: { type?: string; text?: string }[];
    };
    return asked.input?.length === 1 && asked.input[0].type === 'text'
      && asked.input[0].text === 'make it evening';
  })(),
  '"input": [ { "type": "text", "text": "TEXT_PROMPT" } ] — verbatim from her'
  + ' own page');

ok('  and a clip to be CHANGED goes before the instruction about it',
  (() => {
    const rows = inputFor('make it evening', [
      { kind: 'video', data: CLIP, mime: 'video/mp4' },
    ]) as { type?: string }[];
    return rows.length === 2 && rows[0].type === 'video' && rows[1].type === 'text';
  })(),
  'a model reads a turn in order, so an instruction that arrives before the'
  + ' thing it is about is an instruction about nothing — the same ordering'
  + ' `picture.ts` has a note about');

ok('  and several references go in the order they were given',
  (() => {
    const rows = inputFor('put the man in the room', [
      { kind: 'image', data: 'A', mime: 'image/png' },
      { kind: 'video', data: 'B', mime: 'video/mp4' },
    ]) as { type?: string; data?: string }[];
    return rows[0].data === 'A' && rows[1].data === 'B' && rows[2].type === 'text';
  })(),
  '"put the man from the first into the second" is a sentence about an order');

/* ── 6. Nothing is charged through it, because the rate is unread ──────── */

function routes(dir = 'app/api', found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routes(path, found);
    else if (name === 'route.ts') found.push(path);
  }
  return found;
}

const calling = routes().filter((path) =>
  /askOmni\(|OMNI_MODEL/.test(withoutComments(readFileSync(path, 'utf8'))));

ok('no route charges for it yet, because its rate is unread',
  calling.length === 0,
  `${calling.join(', ')} — it bills per TOKEN and the thinking is 95% of her`
  + ' own sample, so `googlespend.ts` cannot hold a ceiling for it. An engine'
  + ' with no ceiling is one this app does not run. Carli on the price:'
  + ' "Gemini omni flash is baie duur." Put the rate in'
  + ' docs/OPEN-QUESTIONS.md with a source, then wire it');

const open = readFileSync('docs/OPEN-QUESTIONS.md', 'utf8');
ok('  and the question is written down where it will be found',
  /omni/i.test(open),
  'an engine half-built and not written up is one somebody finds in six'
  + ' months and cannot tell whether it works');

console.log(bad === 0
  ? '\n  Gemini Omni Flash: the reader is settled against her own answer, and'
    + ' nothing spends through it.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
