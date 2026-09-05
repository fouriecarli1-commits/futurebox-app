/**
 * The room this app is for, checked where it actually broke.
 *
 * Carli: "Die make a song generate glad nie reg nie. iets is ernstig fout. Ek
 * het nou 'n afrikaanse liedjie probeer generate en net klank het uitgekom."
 *
 * She was right, and the fault was not in the engine or in Afrikaans. A free
 * account's request had its `sections` stripped on the server before it was
 * built, and without sections the request takes the plain-prompt path — music,
 * with nobody singing the words that were typed. The room still showed those
 * words, the release still carried them, and the audio did not have them.
 *
 * Every assertion below was negative-tested: broken on purpose to confirm it
 * fails. A check that cannot fail is decoration.
 */
import { buildRequest, forPreview, type Body } from '../app/lib/server/musicplan';
import { looksAfrikaans, singDirection } from '../app/lib/lyriclang';
import { shapeSong, planLength } from '../app/lib/songshape';
import { timelineOf } from '../app/lib/timeline';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const AFRIKAANS: Body = {
  style: 'Afrikaanse pop, akoestiese kitaar',
  seconds: 90,
  sections: [
    { name: 'Verse', lines: ['Ek ry alleen deur die Karoo', 'Die pad is lank en stil'], seconds: 30 },
    { name: 'Chorus', lines: ['En ek sing vir jou', 'Al die pad terug huis toe'], seconds: 30 },
  ],
  finetuneId: 'ft-abc',
};

/* ── 1. A preview keeps the words ─────────────────────────────────────── */
const preview = forPreview(AFRIKAANS, 60);
check('a free preview still carries the words somebody wrote',
  (preview.sections ?? []).length === 2,
  `${(preview.sections ?? []).length} sections`);
check('and the words themselves, not just the shape',
  (preview.sections ?? [])[0]?.lines.join(' ').includes('Karoo') === true);
check('the length is the preview length, whatever was asked for',
  preview.seconds === 60, String(preview.seconds));
check('and a trained sound is not, because that is what a plan buys',
  preview.finetuneId === undefined);

/* ── 2. The words reach the engine ────────────────────────────────────── */
const sung = buildRequest(preview) as {
  composition_plan?: { chunks: { text: string; duration_ms: number }[] };
  prompt?: string;
  force_instrumental?: boolean;
};
check('a request with words becomes a composition plan, not a prompt',
  Boolean(sung.composition_plan) && sung.prompt === undefined);
const text = (sung.composition_plan?.chunks ?? []).map((chunk) => chunk.text).join('\n');
for (const line of ['Ek ry alleen deur die Karoo', 'Al die pad terug huis toe']) {
  check(`"${line}" is in what is sent`, text.includes(line));
}
check('and each part is named, so the words land in the right place',
  text.includes('[Verse]') && text.includes('[Chorus]'));

/* ── 3. What was actually broken, stated as a test ────────────────────── */
const stripped = buildRequest({ ...preview, sections: undefined }) as {
  composition_plan?: unknown;
  prompt?: string;
};
check('dropping the sections is what made it come back as sound only',
  stripped.composition_plan === undefined && typeof stripped.prompt === 'string',
  'this is the shape the free tier used to send');

/* ── 4. An instrumental is still an instrumental ──────────────────────── */
const backing = buildRequest({ ...AFRIKAANS, instrumental: true }) as {
  composition_plan?: { chunks: { text: string; negative_styles: string[] }[] };
};
const backingText = (backing.composition_plan?.chunks ?? []).map((one) => one.text).join('\n');
check('asking for a backing track keeps the shape and drops the singing',
  backingText.includes('[Verse]') && !backingText.includes('Karoo'));
check('and says so to the engine rather than hoping',
  (backing.composition_plan?.chunks ?? [])[0]?.negative_styles.includes('vocals') === true);


/* ── 5. The language the words are in, told to the engine ─────────────── */
const AF = ['[Verse]', 'Ek ry alleen deur die Karoo', 'Die pad is lank en stil'].join('\n');
const EN = ['[Verse]', 'I drive alone through the desert', 'The road is long and still'].join('\n');
check('Afrikaans words are recognised as Afrikaans', looksAfrikaans(AF));
check('and English words are not', !looksAfrikaans(EN));
check('one Afrikaans word in an English lyric is not enough',
  !looksAfrikaans(['I said nie to that', 'and walked away'].join('\n')));
check('nor is an empty box', !looksAfrikaans('') && !looksAfrikaans('[Chorus]'));
/* Four ordinary English lyrics, because the cost of a false positive is an
   English song asked for in Afrikaans — the exact fault this was built to
   avoid, arriving from the other direction. */
for (const english of [
  'Standing on the road at night\nI still hear you calling out my name',
  'Give me one more day of this\nI can hold on for a while',
  'The world keeps turning, love keeps burning\nAnd my heart is on the line',
  'We ride at dawn through the desert air\nNothing left behind us there',
]) {
  check(`English stays English — "${english.split('\n')[0].slice(0, 34)}…"`, !looksAfrikaans(english));
}
check('asking for Afrikaans adds a direction the model can read',
  singDirection('af').includes('sung in Afrikaans'));
check('and "let it decide" adds nothing, which is what it means',
  singDirection('auto').length === 0);


/* ── 6. The shape of the song, which is what was making them bad ──────── */
const FOUR_LINES = [{ name: 'Verse', lines: ['one', 'two', 'three', 'four'] }];

/* The exact case Carli paid for: four lines, three minutes. The old rule made
   one part of a hundred and twenty seconds holding four lines, and asked the
   model to stretch one verse over two minutes. */
const long = shapeSong(FOUR_LINES, 180);
const sungParts = long.filter((one) => one.lines.length > 0);
check('four lines and three minutes is not one part of two minutes',
  sungParts.every((one) => one.seconds <= 45),
  long.map((one) => `${one.name} ${one.seconds}s`).join(' · '));
/* The length is made up by singing the words again, which is what a song
   does. The first version of this spent it on solos instead and put the only
   verse at two minutes eight — it passed every assertion and no musician
   would have called it a song. */
check('the length is made up by singing the words again',
  sungParts.length >= 3, `${sungParts.length} sung parts`);
check('and the wordless parts stay under a third of it',
  long.filter((one) => one.lines.length === 0).reduce((sum, one) => sum + one.seconds, 0) <= 60,
  long.filter((one) => one.lines.length === 0).map((one) => `${one.name} ${one.seconds}s`).join(' · '));
check('the plan still adds up to what was asked for',
  Math.abs(planLength(long) - 180) <= 2, `${planLength(long)}s`);
check('it starts with an intro and ends with an outro',
  long[0].name === 'Intro' && long[long.length - 1].name === 'Outro',
  long.map((one) => one.name).join(' · '));

/* Words that need more room than the length allows: scaled down, never
   gabbled below what can be sung. */
const many = shapeSong(
  [
    { name: 'Verse', lines: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
    { name: 'Chorus', lines: ['i', 'j', 'k', 'l'] },
  ],
  40,
);
check('too many words for the length is scaled, not truncated',
  many.length === 2 && many.every((one) => one.lines.length > 0));
check('and no part is squeezed under six seconds',
  many.every((one) => one.seconds >= 6), many.map((one) => one.seconds).join(', '));

/* And the timeline reads the same plan. */
const clock = timelineOf(long, 180);
check('the first line does not start on top of the intro',
  clock[0].start >= long[0].seconds - 1,
  `first line at ${clock[0].start.toFixed(1)}s, intro is ${long[0].seconds}s`);
check('and the last line ends before the outro does',
  clock[clock.length - 1].end <= 180 - long[long.length - 1].seconds + 1,
  `last line ends at ${clock[clock.length - 1].end.toFixed(1)}s`);

/* ── 7. The style list is the person's, not ours ──────────────────────── */
const mine = buildRequest({
  style: 'Afrikaanse boeremusiek, konsertina',
  sections: [{ name: 'Verse', lines: ['Ek ry alleen'], seconds: 20 }],
}) as { composition_plan?: { chunks: { positive_styles: string[]; negative_styles: string[] }[] } };
const first = mine.composition_plan?.chunks[0];
check('a two-word style is sent as two words, not padded to seven',
  first?.positive_styles.length === 2, (first?.positive_styles ?? []).join(', '));
check('and what it is asked to avoid is asked on every part, not only the first',
  (mine.composition_plan?.chunks ?? []).every((one) => one.negative_styles.length > 0));

if (failures) {
  console.error(`\ncheck:makesong — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:makesong — the words somebody writes are the words that get sung.');
