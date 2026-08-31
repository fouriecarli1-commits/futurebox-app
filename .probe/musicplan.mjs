import { buildRequest } from './lib/musicplan.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── With sections: a composition plan ───────────────────────────────────
const withParts = {
  style: 'afro house, warm',
  sections: [{ name: 'Verse', lines: ['one', 'two'], seconds: 20 }],
  finetuneId: 'ft-abc',
};
const plan = buildRequest(withParts);
say(plan.model_id === 'music_v2', `plan model_id was ${plan.model_id}`);
say(plan.finetune_id === 'ft-abc', `plan finetune_id was ${JSON.stringify(plan.finetune_id)}`);
say(Boolean(plan.composition_plan), 'plan had no composition_plan');

// ── Without sections: a plain prompt ────────────────────────────────────
const flat = buildRequest({ style: 'rock', prompt: 'A song', seconds: 60, finetuneId: 'ft-abc' });
say(flat.finetune_id === 'ft-abc', `prompt finetune_id was ${JSON.stringify(flat.finetune_id)}`);
say(typeof flat.prompt === 'string', 'prompt path lost its prompt');

// ── No trained sound: the field must not be there at all ────────────────
for (const [what, body] of [
  ['plan', { style: 'x', sections: [{ name: 'Verse', lines: ['a'], seconds: 20 }] }],
  ['prompt', { style: 'x', prompt: 'y', seconds: 30 }],
]) {
  const made = buildRequest(body);
  say(!('finetune_id' in made), `${what} carried finetune_id with nothing set`);
}

// An empty string is not an id, and must not be sent as one.
const empty = buildRequest({ style: 'x', prompt: 'y', seconds: 30, finetuneId: '' });
say(!('finetune_id' in empty), 'an empty finetuneId was sent as a field');

console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
