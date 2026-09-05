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

if (failures) {
  console.error(`\ncheck:makesong — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:makesong — the words somebody writes are the words that get sung.');
