/**
 * Every advert recommendation arrives in the next room with its work in it.
 *
 * ── What was found, 11 September 2026 ────────────────────────────────────
 *
 * Carli, on the advert desk as a product she is selling:
 *
 *   "When you push the buttons to take you to podcast, to video, to music
 *    making, the text and shots and scripts don't carry over to the next
 *    room. That is a real problem."
 *
 * `AdFormats.tsx` sent one operation with one value:
 *
 *     if (format.op) onSetUp(format.room, format.op, pick.first);
 *
 * One field. The brief stayed behind — what they sell, who it is for, the
 * offer, the tone, the town, the shape decided by the tick boxes above. So
 * did the three adverts the desk had just written and the look it had just
 * recommended. And two of the eight formats had no `op` at all, so "a song,
 * over one photograph" and "a jingle" opened Make a song empty: the song
 * form registered no operations, so there was nothing to hand anything to.
 *
 * ── What this holds, and why each one ───────────────────────────────────
 *
 * The failure mode is silence in every direction. An operation a room does
 * not register is dropped without a word. A value the room parses and
 * rejects — a length that is not on the list, an aspect spelled "vertical" —
 * is also dropped without a word. Both look identical from the advert desk:
 * the button worked, the room opened, the box is empty.
 *
 * So this asks the real function for real output and checks where it lands.
 */
import { readFileSync } from 'node:fs';
import { AD_FORMATS } from '../app/lib/adformats';
import { SURFACES } from '../app/lib/surfaces';
import { LENGTHS } from '../app/lib/videoscenes';
import { filmThisAd, handoverFor, readThisAd, shapeFor } from '../app/lib/adhandover';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** A brief with every box filled, as somebody who used the desk properly. */
const BRIEF = {
  what: 'handmade leather bags',
  who: 'women who buy one good thing rather than three cheap ones',
  offer: 'free repairs for life',
  tone: 'quiet and confident',
  market: 'Stellenbosch',
  place: 'in a feed, sound off',
  brand: 'The workshop is called Leer & Lig.',
};

const PICK = {
  first: 'One bag on a workbench, the maker’s hands stitching the last seam',
  watchOut: 'Do not show a shop; there is not one',
  style: 'hands_working',
};

const AD = {
  angle: 'The last one you buy',
  headline: 'A bag you will still be carrying in ten years',
  body: 'Cut, stitched and finished by one person in Stellenbosch. Repaired free, for as long as you own it.',
  cta: 'See this week’s three',
  spoken: 'Buy one good thing',
  shot: 'A bag on a workbench in low afternoon light',
  caption: 'Made here. Repaired here.',
};

/**
 * The operations whose value is meant to be something somebody reads.
 *
 * `set_aspect` and `set_seconds` are not here: their correct values are
 * "9:16" and "8", and they are held to a different rule below — that the
 * room will actually accept them.
 */
const PROSE = new Set([
  'set_prompt', 'write_scenes', 'set_script', 'set_notes', 'set_words', 'set_sound', 'set_look',
]);

/* ── Which operations a room can actually take ───────────────────────── */
const registered = new Map<string, Set<string>>();
for (const [room, surface] of Object.entries(SURFACES)) {
  registered.set(room, new Set(Object.keys(surface.ops ?? {})));
}

/** Every format lands something, in a room that can take every bit of it. */
const empty: string[] = [];
const unknown: string[] = [];
const thin: string[] = [];
for (const format of AD_FORMATS) {
  const wires = handoverFor({ formatId: format.id, brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'] });
  /* `written_posts` is this room; there is nowhere to send anything, and a
     hand-off to yourself would be the desk clearing its own boxes. */
  if (format.room === 'campaign') {
    if (wires.length) unknown.push(`${format.id} sends ${wires.length} to its own room`);
    continue;
  }
  if (wires.length === 0) {
    empty.push(format.id);
    continue;
  }
  for (const wire of wires) {
    if (wire.room !== format.room) {
      unknown.push(`${format.id} → ${wire.room}, but the card opens ${format.room}`);
    }
    if (!registered.get(wire.room)?.has(wire.op)) {
      unknown.push(`${format.id} sends ${wire.room}.${wire.op}, which that room does not take`);
    }
    /* Only the fields that are meant to be prose. The first version of
       this rule flagged `set_aspect: "9:16"` and `set_seconds: "8"` as
       stubs — both correct, both four characters. A rule a correct value
       cannot pass is worse than no rule: the next person changes the value
       to suit the rule. */
    if (PROSE.has(wire.op) && wire.value.trim().length < 30) {
      thin.push(`${format.id}.${wire.op} = "${wire.value}"`);
    }
  }
}

ok(`every format carries its work over — ${AD_FORMATS.length}`, empty.length === 0,
  `${empty.join(', ')} open an empty room, which is being told what to make and then asked to retype it`);
ok('  into operations the destination actually registers', unknown.length === 0,
  unknown.join('; '));
ok('  and nothing arrives as a stub', thin.length === 0, thin.join('; '));

/* ── The brief must actually be in there ─────────────────────────────── */
/* The point of the whole change. A hand-off that names the room and carries
   none of the person's own words is the fault with extra steps. */
const missed: string[] = [];
for (const format of AD_FORMATS) {
  if (format.room === 'campaign') continue;
  const all = handoverFor({ formatId: format.id, brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'] })
    .map((one) => one.value)
    .join(' · ')
    .toLowerCase();
  /* Their subject, by their own word for it. Not the whole brief in every
     room — a jingle has no use for the placement — but the thing being sold
     has to survive every single hop. */
  if (!all.includes('leather') && !all.includes('bag')) missed.push(format.id);
}
ok('  and what they are selling survives every hop', missed.length === 0,
  `${missed.join(', ')} arrive without their own subject in them`);

/* ── The catalogue's own primary operation is one of them ───────────
 
   Every entry in `adformats.ts` names the `op` that sets its room up, and
   `check:adformats` holds that to an operation the room registers. Once the
   screen stopped reading that field, it became a fact nothing depended on —
   documentation that can quietly go wrong. So the hand-off is held to it:
   whatever else travels, the operation the catalogue names must be in there. */
const wrongPrimary: string[] = [];
for (const format of AD_FORMATS) {
  if (!format.op) continue;
  const ops = handoverFor({ formatId: format.id, brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'] })
    .map((one) => one.op);
  if (!ops.includes(format.op)) wrongPrimary.push(`${format.id} names ${format.op}, sends ${ops.join('/') || 'nothing'}`);
}
ok('the operation the catalogue names for each format is actually sent',
  wrongPrimary.length === 0, wrongPrimary.join('; '));

/* ── A filmed format arrives with its shape and its length ──────────
 
   Her words: "the text and shots, and scripts don't carry over". The shape
   and the length are the two the video desk cannot guess and will not ask
   for — it opens on whatever it was last left at, which for somebody who
   made a wide clip yesterday is a wide clip today, for an advert the desk
   has just decided is vertical.
 
   Asserted per format rather than once, because the first version of this
   file checked only the "film this one" button and a format card losing
   both would still have passed. */
const FILMED = ['short_vertical', 'explainer_film'];
const shapeless: string[] = [];
for (const id of FILMED) {
  const wires = handoverFor({ formatId: id, brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'] });
  const ops = new Set(wires.map((one) => one.op));
  const want = ['set_aspect', 'set_seconds'].filter((one) => !ops.has(one));
  if (want.length) shapeless.push(`${id} sends no ${want.join(' and no ')}`);
}
ok('a filmed recommendation carries its shape and its length', shapeless.length === 0,
  `${shapeless.join('; ')} — the desk opens on whatever it was last left at`);

/* ── The recommended look reaches the video desk ─────────────────────
 
   The adviser names a look on the card — "this is how it should look, and
   here is why" — and it lived in that component's own state. A hand-off
   that carries the shot and not the look sends somebody to make the shot a
   different way from the one they were just told to.
 
   Written as a real id from the catalogue, because an id that is NOT in it
   must send nothing: "hands_working" dropped raw into a prompt is two words
   an engine will try to draw. The first run of this file used a made-up id
   and every one of these assertions passed while `set_look` was silently
   absent — which is this week's lesson wearing a different hat. */
const filmed = handoverFor({
  formatId: 'short_vertical', brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'],
});
const look = filmed.find((one) => one.op === 'set_look');
ok('the look the adviser recommended goes with the shot',
  Boolean(look && look.value.length > 20),
  look ? `"${look.value}"` : 'no set_look at all — the shot is made a different way from the one on the card');

const unknownLook = handoverFor({
  formatId: 'short_vertical', brief: BRIEF, pick: { ...PICK, style: 'not_a_real_style' }, going: [],
});
ok('  and a look the catalogue does not have sends nothing at all',
  !unknownLook.some((one) => one.op === 'set_look'),
  'the raw id lands in the prompt, and the engine tries to draw the words');

/* ── Values the room will actually accept ────────────────────────────── */
/* A length off the list, or an aspect spelled any other way, is parsed,
   rejected and dropped in silence — indistinguishable from sending nothing
   and from the desk's side it looks like it worked. */
const seconds = new Set(LENGTHS.map((one) => String(one.seconds)));
const badSeconds: string[] = [];
const badAspect: string[] = [];
for (const format of AD_FORMATS) {
  for (const wire of handoverFor({ formatId: format.id, brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'] })) {
    if (wire.op === 'set_seconds' && !seconds.has(wire.value)) badSeconds.push(`${format.id}: ${wire.value}`);
    if (wire.op === 'set_aspect' && !['16:9', '9:16', '1:1'].includes(wire.value)) {
      badAspect.push(`${format.id}: ${wire.value}`);
    }
  }
}
ok('every length sent is one the video desk offers', badSeconds.length === 0,
  `${badSeconds.join(', ')} — parsed, rejected, and dropped without a word`);
ok('  and every shape is one it understands', badAspect.length === 0, badAspect.join(', '));

/* ── The shape follows the tick boxes, not the format's name ─────────── */
ok('ticking a feed gives a vertical shape', shapeFor(['tiktok']) === '9:16', shapeFor(['tiktok']));
ok('  ticking only the web gives a wide one', shapeFor(['web']) === '16:9', shapeFor(['web']));
ok('  and ticking both goes vertical, because a wide clip in a feed is unusable',
  shapeFor(['web', 'instagram']) === '9:16', shapeFor(['web', 'instagram']));

/* ── The two buttons on a written advert ─────────────────────────────── */
const film = filmThisAd({ ad: AD, going: ['web'], style: PICK.style });
ok('"film this one" carries the shape and the length, not just the shot',
  film.some((one) => one.op === 'set_aspect') && film.some((one) => one.op === 'set_seconds'),
  film.map((one) => one.op).join(', '));
ok('  and the spoken line is inside the shot, in quotation marks',
  film.some((one) => one.op === 'set_prompt' && /“[^”]+”/.test(one.value)),
  'the desk knows a line is SAID only by its quotation marks — without them the engine draws it');

const read = readThisAd({ ad: AD });
ok('"read this one" carries the whole advert, not one line',
  read.length === 1
    && read[0].value.includes(AD.body)
    && read[0].value.includes(AD.cta),
  read[0]?.value.replace(/\n/g, ' / ') ?? 'nothing');

/* ── Nothing is invented ─────────────────────────────────────────────── */
/* The rule the desk is built on. A model that adds "R199 a month" because it
   scans well has made a promise the business has to keep, and this function
   is the last place before it reaches a room. It copies; it does not write
   facts. So: an empty brief sends nothing at all rather than a plausible
   blank advert. */
const nothing = handoverFor({
  formatId: 'short_vertical',
  brief: { what: '   ' },
  pick: { first: 'Something' },
});
ok('an empty brief hands over nothing', nothing.length === 0,
  `${nothing.length} — blank fields would overwrite whatever the room already had`);

/* And no price, date or promise appears that the person did not type. */
const said = AD_FORMATS.flatMap((format) =>
  handoverFor({
    formatId: format.id,
    brief: { what: 'handmade leather bags' },
    pick: { first: 'One bag on a workbench' },
  }).map((one) => one.value),
).join(' ');
ok('  and a brief with no offer in it produces no offer',
  !/R\s?\d|%\s*off|free\b|discount|sale\b/i.test(said),
  (said.match(/R\s?\d+|free|discount|sale/gi) ?? []).join(', '));

/* ── The song form is actually wired ─────────────────────────────────── */
/* The two song formats had nowhere to land because this component
   registered nothing. The op check above would pass on a described-but-
   unregistered operation, since it reads the registry — so the component is
   read directly. */
const form = readFileSync('app/components/MakeMusic.tsx', 'utf8');
ok('the song form takes what the advert desk sends it',
  /useCopilotOps\('make',/.test(form)
    && /set_words:/.test(form)
    && /set_sound:/.test(form)
    && /set_song_title:/.test(form),
  'the room the two song recommendations open has nothing to receive them');

if (failures) {
  console.error(`\ncheck:adhandover — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:adhandover — all ${AD_FORMATS.length} recommendations arrive with the brief in them.`);
