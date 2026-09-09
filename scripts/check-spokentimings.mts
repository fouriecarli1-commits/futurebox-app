/**
 * The read already knew where the words fell.
 *
 * ── What #112 was about ──────────────────────────────────────────────────
 *
 * This app generates speech from a script it already holds, and then, to show
 * those words on screen at the moment they are spoken, used to send the audio
 * to `/api/transcribe` and pay a second time to be told what it had just said.
 *
 * `/v1/text-to-speech/{voice}/with-timestamps` is the same read at the same
 * price with the alignment on the answer. `wordsFromAlignment` turns their
 * per-character timings into words.
 *
 * ── Why this file is mostly about refusing ───────────────────────────────
 *
 * The shape below is from ElevenLabs' documentation and has never been seen
 * from the live API from this machine, which cannot reach it. That is exactly
 * the situation in which a parser invents things: a field renamed, a length
 * off by one, and out come confident timings built out of whatever was there.
 *
 * So most of what is asserted here is that it says **null** — meaning "this
 * could not be read" — rather than producing something. Null and an empty
 * list are two different answers and the difference is the whole point; see
 * `check:couldnotask`, which exists because this app kept collapsing them.
 */
import { readFileSync } from 'node:fs';
import { linesFromWords, wordsFromAlignment } from '../app/lib/spokenwords';

let failures = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/** "Hi there" as they would send it: one entry per character. */
const HI = {
  characters: ['H', 'i', ' ', 't', 'h', 'e', 'r', 'e'],
  character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
  character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9],
};

const hi = wordsFromAlignment(HI);
check('a read comes back as words', hi !== null && hi.length === 2, JSON.stringify(hi));
check('each word carries the text it was typed as',
  hi?.[0]?.text === 'Hi' && hi?.[1]?.text === 'there',
  (hi ?? []).map((one) => one.text).join(' | '));
check('a word starts when its first character does', hi?.[1]?.start === 0.3, String(hi?.[1]?.start));
check('and ends when its last one does', hi?.[1]?.end === 0.9, String(hi?.[1]?.end));
check('the space between them is not a word',
  (hi ?? []).every((one) => one.text.trim() === one.text && one.text.length > 0));

/* Punctuation stays attached. "don't" is one thing to light up on a screen,
   and a reader following along sees the apostrophe. */
const DONT = {
  characters: ["d", "o", "n", "'", "t", ' ', 'g', 'o', '.'],
  character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
};
const dont = wordsFromAlignment(DONT);
check('an apostrophe stays inside the word', dont?.[0]?.text === "don't", dont?.[0]?.text);
check('and a full stop stays on the one it was typed against', dont?.[1]?.text === 'go.', dont?.[1]?.text);

/* ── The refusals, which are the reason this file exists ───────────────── */
const REFUSED: ReadonlyArray<readonly [string, unknown]> = [
  ['nothing at all', null],
  ['a string where an object belongs', 'characters'],
  ['no characters field', { character_start_times_seconds: [0], character_end_times_seconds: [1] }],
  ['characters that are not strings', { ...HI, characters: [1, 2, 3, 4, 5, 6, 7, 8] }],
  ['no start times', { characters: HI.characters, character_end_times_seconds: HI.character_end_times_seconds }],
  ['no end times', { characters: HI.characters, character_start_times_seconds: HI.character_start_times_seconds }],
  ['start times one short', { ...HI, character_start_times_seconds: HI.character_start_times_seconds.slice(1) }],
  ['end times one long', { ...HI, character_end_times_seconds: [...HI.character_end_times_seconds, 1] }],
  ['a null among the times', { ...HI, character_start_times_seconds: [0, null, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7] }],
  ['a NaN among the times', { ...HI, character_end_times_seconds: [0.1, NaN, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9] }],
  ['times as strings', { ...HI, character_start_times_seconds: HI.character_start_times_seconds.map(String) }],
  ['an empty character list', { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] }],
];
for (const [how, given] of REFUSED) {
  check(`refused, and says so with null: ${how}`, wordsFromAlignment(given) === null);
}

/* The one case that is NOT a refusal. A read of nothing but spaces aligned
   perfectly well and holds no words — that is an answer, and it must not be
   returned as null, because null means the app could not ask. */
const SPACES = {
  characters: [' ', ' '],
  character_start_times_seconds: [0, 0.1],
  character_end_times_seconds: [0.1, 0.2],
};
const spaces = wordsFromAlignment(SPACES);
check('an alignment that read cleanly and holds no words is an empty list, not null',
  Array.isArray(spaces) && spaces.length === 0,
  spaces === null ? 'it said null, which means something else' : JSON.stringify(spaces));

/* ── Lines ─────────────────────────────────────────────────────────────── */
const many = wordsFromAlignment({
  characters: [...'One two. Three four five six seven eight nine ten eleven twelve.'],
  character_start_times_seconds: [...'One two. Three four five six seven eight nine ten eleven twelve.'].map((_, i) => i * 0.1),
  character_end_times_seconds: [...'One two. Three four five six seven eight nine ten eleven twelve.'].map((_, i) => (i + 1) * 0.1),
})!;
const lines = linesFromWords(many);
check('a sentence end breaks a line', lines[0]?.text === 'One two.', lines[0]?.text);
check('and a long sentence is broken before it becomes a wall',
  lines.every((one) => one.text.length <= 60), lines.map((one) => one.text.length).join('/'));
check('a line starts when its first word does', lines[0]?.start === many[0]?.start);
check('and no line ends before it starts', lines.every((one) => one.end >= one.start));

/* ── The route ─────────────────────────────────────────────────────────── */
const route = readFileSync('app/api/voice/speak/route.ts', 'utf8');

check('the ordinary read still streams, and is still the default',
  /speakStream\(/.test(route) && /body\.timings === true/.test(route),
  'the default path was changed, and every caller reads a blob today');
check('the streamed answer is still audio/mpeg',
  /'Content-Type': 'audio\/mpeg'/.test(route));
check('a script too long for the buffered read is refused rather than downgraded',
  /too_long_for_timings/.test(route) && /TIMED_LIMIT/.test(route),
  'a caller that asked for timings would get audio with none and no way to tell');
check('the refusal names the limit and the length, so it can be acted on',
  /\$\{TIMED_LIMIT\}[\s\S]{0,120}\$\{text\.length\}/.test(route));
check('a failed timed read is refunded, like every other paid call here',
  /if \(!timed\.ok\) \{[\s\S]{0,120}paid\.refund\(\)/.test(route));
check('an unreadable alignment answers null and says why, rather than an empty list',
  /words: null|words,[\s\S]{0,200}why:/.test(route) && /why: 'The reading came back without timings/.test(route));
check('the read is still counted against the day, on both paths',
  (route.match(/speech_runs/g) ?? []).length === 2,
  `${(route.match(/speech_runs/g) ?? []).length} insert(s)`);

/* The library side: audio missing is a failure, alignment missing is not. */
const lib = readFileSync('app/lib/server/eleven.ts', 'utf8');
const timed = lib.slice(lib.indexOf('export async function speakTimed'));
check('a read with no audio in it is a failure',
  /without any audio in it/.test(timed.slice(0, 3000)));
check('but a read with no alignment is handed on as null, not refused',
  /said\.alignment \?\? said\.normalized_alignment \?\? null/.test(timed.slice(0, 3000)),
  'a missing alignment must drop a rung, not fail a read somebody paid for');
check('the plain alignment is preferred over the normalised one',
  timed.indexOf('said.alignment') < timed.indexOf('said.normalized_alignment'),
  'the normalised text is theirs, not what the member typed');

if (failures) {
  console.error(`\ncheck:spokentimings — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:spokentimings — the read hands back its own timings, and says null when it cannot.');
