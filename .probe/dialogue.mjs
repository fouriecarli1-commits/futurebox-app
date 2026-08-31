// Cutting a podcast script into requests that fit, without losing a paragraph.
//
//   node --experimental-strip-types .probe/dialogue.mjs
//
// This is arithmetic over strings, so it imports the app's own module directly
// rather than a copy. The thing it is really guarding against is an episode
// that is quietly missing its ending: ElevenLabs' own note on text-to-dialogue
// says a request over 2,000 characters "can terminate early in streaming
// responses", and an episode that stops early looks exactly like an episode
// that finished.

import { CAP, VOICES, batches, readScript, spoken, splitTurn } from '../app/lib/dialogue.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const strip = (text) => text.replace(/\s+/g, '');

// ── Nothing is lost ────────────────────────────────────────────────────
// The property that matters. Every cut keeps the character it cuts after, so
// the pieces put back together are the original, character for character.
{
  const sentence = 'The thing about the future is that it arrives unevenly. ';
  const long = sentence.repeat(200);            // ~11,200 characters
  const pieces = splitTurn({ voiceId: 'v1', text: long });
  say(pieces.length > 1, 'a script five times the cap came back as one request');
  say(pieces.map((p) => p.text).join('') === long, 'putting the pieces back does not give the script back');
  say(pieces.every((p) => p.text.length <= CAP), 'a piece is still over the cap');
  say(pieces.every((p) => p.voiceId === 'v1'), 'a piece changed speaker');
}

// ── It cuts between sentences when it can ──────────────────────────────
{
  const text = `${'a'.repeat(1000)}. ${'b'.repeat(500)}. ${'c'.repeat(900)}.`;
  const pieces = splitTurn({ voiceId: 'v1', text });
  say(pieces.length === 2, `expected two requests, got ${pieces.length}`);
  say(/\.$/.test(pieces[0].text.trim()), 'the first request ends mid-sentence when a full stop was available');
}

// ── And falls back, in order, rather than looping ──────────────────────
{
  // No sentence ends at all: it must fall back to word ends.
  const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
  const pieces = splitTurn({ voiceId: 'v1', text: words });
  say(pieces.map((p) => p.text).join('') === words, 'a script with no full stops lost text');
  say(pieces.every((p) => p.text.length <= CAP), 'a word-cut piece is over the cap');
  say(pieces.every((p) => !/^\S/.test(p.text) || p.text.startsWith('word')), 'a cut landed inside a word');

  // One "word" longer than the cap: a URL, or somebody leaning on a key. It
  // must still terminate, and still not lose anything.
  const wall = 'x'.repeat(CAP * 3 + 7);
  const hard = splitTurn({ voiceId: 'v1', text: wall });
  say(hard.length === 4, `one enormous word came back as ${hard.length} pieces`);
  say(hard.map((p) => p.text).join('') === wall, 'cutting mid-word lost characters');
  say(hard.every((p) => p.text.length <= CAP), 'a mid-word piece is over the cap');
}

// ── Batching respects both limits at once ──────────────────────────────
{
  const turns = Array.from({ length: 60 }, (_, i) => ({ voiceId: `v${i % 3}`, text: `Line ${i}. ${'word '.repeat(20)}` }));
  const made = batches(turns);
  say(made.length > 1, 'sixty turns went out as one request');
  for (const batch of made) {
    const chars = batch.reduce((sum, t) => sum + t.text.length, 0);
    say(chars <= CAP, `a request carries ${chars} characters, over the cap of ${CAP}`);
    say(new Set(batch.map((t) => t.voiceId)).size <= VOICES, 'a request carries more voices than they allow');
  }
  const back = made.flat().map((t) => t.text).join('');
  say(strip(back) === strip(turns.map((t) => t.text).join('')), 'batching lost words');
}

// ── Eleven voices cannot ride in one request ───────────────────────────
{
  const turns = Array.from({ length: 12 }, (_, i) => ({ voiceId: `v${i}`, text: 'Hello.' }));
  const made = batches(turns);
  say(made.length >= 2, 'twelve speakers went out in one request, which they refuse');
  say(made.every((b) => new Set(b.map((t) => t.voiceId)).size <= VOICES), 'a request still has too many voices');
  say(made.flat().length === 12, 'a speaker was dropped to make the batch fit');
}

// ── Blank turns are not requests ───────────────────────────────────────
{
  const made = batches([
    { voiceId: 'v1', text: '  ' },
    { voiceId: 'v1', text: '' },
    { voiceId: 'v2', text: 'Only this.' },
  ]);
  say(made.length === 1 && made[0].length === 1, 'empty turns were sent as speech');
  say(spoken([{ voiceId: 'v1', text: '  hello  ' }]) === 5, 'costing counts the spaces around a word');
}

// ── Reading a script the way people write one ──────────────────────────
{
  const cast = [{ name: 'Anre', voiceId: 'v-anre' }, { name: 'Carli', voiceId: 'v-carli' }];
  const { turns, uncast } = readScript(
    [
      'Anre: So what changed this year?',
      'Carli: Everything, and none of it at once.',
      '  And that is the part nobody expected.',
      '',
      'Anre: Say more.',
    ].join('\n'),
    cast,
  );
  say(turns.length === 3, `expected three turns, got ${turns.length}`);
  say(turns[0].voiceId === 'v-anre' && turns[1].voiceId === 'v-carli', 'the speakers came out in the wrong voices');
  say(
    turns[1].text === 'Everything, and none of it at once. And that is the part nobody expected.',
    'a line with no name in front of it did not join the paragraph above it',
  );
  say(uncast.length === 0, 'a cast speaker was reported as uncast');

  // Case and spacing are how people actually type.
  const loose = readScript('  anre :  hello there  ', cast);
  say(loose.turns.length === 1 && loose.turns[0].voiceId === 'v-anre', 'a name typed in lower case was not recognised');
  say(loose.turns[0].text === 'hello there', 'the spacing around what was said was kept');
}

// ── A name nobody was cast for is reported, never guessed at ───────────
// Handing an unknown speaker to the first voice makes an episode in which two
// people are one person, and does it silently.
{
  const cast = [{ name: 'Anre', voiceId: 'v-anre' }];
  const { turns, uncast } = readScript('Anre: Hello.\nGuest: Hello back.\nGuest: Still me.', cast);
  say(turns.length === 1, 'an uncast speaker was given somebody else\'s voice');
  say(uncast.length === 1 && uncast[0] === 'Guest', `uncast came back as ${JSON.stringify(uncast)}`);
  say(turns.every((t) => t.voiceId === 'v-anre'), 'the cast speaker lost their voice');
}

// ── A stray line before anybody is named ───────────────────────────────
{
  const { turns } = readScript('An intro nobody attributed\nAnre: Now we start.', [{ name: 'Anre', voiceId: 'v1' }]);
  say(turns.length === 1 && turns[0].text === 'Now we start.', 'a line before the first speaker was put in somebody\'s mouth');
}

// ── A colon in the middle of a sentence is not a speaker ───────────────
{
  const cast = [{ name: 'Anre', voiceId: 'v1' }];
  const { turns, uncast } = readScript('Anre: Here is the thing: it works.', cast);
  say(turns.length === 1, 'a sentence with a colon in it was read as two turns');
  say(turns[0].text === 'Here is the thing: it works.', `the colon inside the sentence was eaten: ${JSON.stringify(turns[0]?.text)}`);
  say(uncast.length === 0, 'the words after a mid-sentence colon were reported as a speaker');
}

if (problems.length) {
  console.error(`dialogue: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('dialogue: a long script is cut inside both of their limits, at sentence ends, without losing a word');
