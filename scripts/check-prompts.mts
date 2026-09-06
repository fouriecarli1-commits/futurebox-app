/**
 * The prompt cards, held to what makes them worth pressing.
 *
 * ── Why these need a check of their own ──────────────────────────────────
 *
 * A card has two halves and only one of them is ever read by a person. The
 * label is on the screen, so a mistake in it is found the first time somebody
 * looks. The `idea` is sent to the model and shown to nobody, so a mistake in
 * it is found by a person getting a bad song and concluding the engine is no
 * good — which is exactly the complaint these cards exist to answer.
 *
 * So the invisible half is the half that is asserted.
 */
import { PROMPTS, promptsFor } from '../app/data/prompts';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

check('there are cards at all', PROMPTS.length >= 20, `${PROMPTS.length}`);

const ids = PROMPTS.map((one) => one.id);
check('no two cards share an id', new Set(ids).size === ids.length);

/* An Afrikaans *photo* card whose idea does not say so produces an English
   song under an Afrikaans label, which is the single worst outcome here: the
   person who pressed "Ouma se kombuis" gets a song about a grandmother's
   kitchen in a language she did not ask for, and nothing on the screen
   explains why. The label never reaches the model — only the idea does.

   Photo cards only, and the reason is not a technicality. A talking card is
   given a recording, so the language is whatever the person spoke, and
   pinning it to Afrikaans would hand an English speaker who pressed "Vertel
   my van jou dag" a song in a language they did not use. This rule was
   written before the talking cards existed and failed all three of the South
   African ones the moment they arrived — correctly, in the sense that it was
   doing what it said, and wrongly, in the sense that what it said was only
   ever true of half the cards. */
for (const card of PROMPTS.filter((one) => one.local && one.kind === 'photo')) {
  check(`${card.id}: a South African card says which language to write in`,
    /in Afrikaans/i.test(card.idea), card.idea.slice(0, 60));
}

for (const card of PROMPTS) {
  const at = `${card.id}`;
  check(`${at}: is readable in both languages`,
    card.en.trim().length > 0 && card.af.trim().length > 0 && card.en !== card.af,
    `${card.en} / ${card.af}`);
  /* Long enough to actually steer the model. A one-word idea is the blank box
     with extra steps. */
  check(`${at}: the instruction is specific enough to steer anything`,
    card.idea.trim().length >= 60, `${card.idea.trim().length} characters`);
  /* Written in English whatever the label says, because it is read by a model
     trained on English instructions and never by a person. */
  check(`${at}: the instruction is in English`,
    !/\b(die|jou|wat|nie|met|van|hierdie|liedjie)\b/.test(card.idea.toLowerCase()),
    card.idea.slice(0, 50));
  /* The label is what a thumb presses on a phone. */
  /* What fits on a card at 390 pixels. Measured off the widest one that
     still reads as two lines rather than four. */
  check(`${at}: the labels fit on a card`,
    card.en.length <= 52 && card.af.length <= 52,
    `${card.en.length} / ${card.af.length}`);
}

/* ── The two rules that keep this out of trouble ────────────────────────
 
   Neither is decoration. A card that told the model to describe the person in
   a selfie would be an app that writes about somebody's body from their
   photograph; a card that named a real artist or club would be an app asking
   a generator to imitate one. Both are one careless line away and neither
   would be visible on any screen. */
const NAMES = /\b(taylor|drake|beyonc|adele|kanye|rihanna|ed sheeran|coldplay|kaizer|orlando|pirates|springbok|bafana)\b/i;
for (const card of PROMPTS) {
  check(`${card.id}: names no real artist or club`, !NAMES.test(card.idea), card.idea.slice(0, 50));
}
for (const card of PROMPTS.filter((one) => /selfie|person|child|kind/i.test(`${one.en} ${one.af} ${one.idea}`))) {
  check(`${card.id}: a card about a person forbids describing them`,
    /never describe|do not describe/i.test(card.idea),
    card.idea.slice(0, 70));
}

/* ── The ordering ───────────────────────────────────────────────────────
 
   What is at the front of a row is what gets pressed. An Afrikaans reader
   meets the South African cards first; an English reader gets them in the
   order they were written. Nothing is filtered out either way — an Afrikaans
   reader may well want "your plate, as a song". */
const af = promptsFor('af');
const en = promptsFor('en');
check('an Afrikaans reader meets a South African card first', Boolean(af[0]?.local), af[0]?.id);
check('and still gets every one of them', af.length === en.length, `${af.length} / ${en.length}`);
check('an English reader gets them unshuffled', en[0]?.id === PROMPTS[0].id, en[0]?.id);
const talking = promptsFor('en', 'talk');
check('there are talking cards too', talking.length >= 5, `${talking.length}`);
check('and they are kept apart from the camera ones',
  promptsFor('en', 'photo').every((one) => one.kind === 'photo')
    && talking.every((one) => one.kind === 'talk'));
check('an Afrikaans reader meets a South African talking card first',
  Boolean(promptsFor('af', 'talk')[0]?.local), promptsFor('af', 'talk')[0]?.id);

if (failures) {
  console.error(`\ncheck:prompts — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:prompts — ${PROMPTS.length} cards, and the half nobody reads is the half that is checked.`);
