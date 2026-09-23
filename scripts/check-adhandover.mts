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
import { readFileSync, readdirSync } from 'node:fs';
import { AD_FORMATS } from '../app/lib/adformats';
import { SURFACES } from '../app/lib/surfaces';
import { LENGTHS } from '../app/lib/videoscenes';
import { carryWords, filmThisAd, handoverFor, readThisAd, shapeFor, shapeForNamed } from '../app/lib/adhandover';

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

/**
 * `brief` is in every room and in no room's registry, and both are correct.
 *
 * The registry is the list handed to the MODEL — what it may ask a room to
 * do. `brief` is the other direction: the room's copilot being told what was
 * carried into it, which is nothing a model should ever request. So it is
 * registered by `Copilot.tsx` against whatever surface the panel is showing,
 * which makes it an operation of all thirteen rooms and of none of them.
 *
 * Added here on the evidence rather than on my word for it. Delete that
 * registration and the file below stops matching, this rule goes red, and
 * every hand-off's brief is reported as landing nowhere — which is exactly
 * what would then be happening.
 */
const copilot = readFileSync('app/components/Copilot.tsx', 'utf8');
const REGISTERS_BRIEF = /useCopilotOps\(\s*context\.surface\s*,\s*\{[\s\S]{0,200}?\bbrief:/.test(copilot);
ok('the copilot registers `brief` in whatever room it is drawn in', REGISTERS_BRIEF,
  'nothing takes the conversation the adverts desk hands over, in any room');
if (REGISTERS_BRIEF) for (const set of registered.values()) set.add('brief');

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
const script = read.find((one) => one.op === 'set_script');
ok('"read this one" carries the whole advert, not one line',
  Boolean(script) && script!.value.includes(AD.body) && script!.value.includes(AD.cta),
  script?.value.replace(/\n/g, ' / ') ?? 'nothing');

/* ── And the next room's copilot is handed it too ────────────────────────

   Carli, 20 September 2026: *"Die advert room se prompts spring nogsteeds
   nie oor na die nuwe kamer toe se copilot nie. Die voorstelle in adverts
   is puntloos as dit nie dit doen nie."*

   The fields have arrived for a while — `check:adcarry` presses the button
   and reads them on the other side. The copilot in the destination room is
   a different address, and it had none: it read what the room could do and
   registered nothing, so there was nothing to hand it. It opened empty,
   and changing one line of an advert meant describing the whole advert
   again to the thing that had just written it.

   This held `read.length === 1`, which was the old rule written as a
   count — so adding the second wire failed a check that was not about
   counts at all. Named by op now, which is what it was always testing. */
for (const [what, wires] of [['film', film], ['read', read]] as const) {
  const brief = wires.find((one) => one.op === 'brief');
  ok(`  and "${what} this one" hands the advert to that room's copilot`,
    Boolean(brief),
    'the copilot opens empty, so the suggestion cannot be carried on from');
  ok('    with the words she is looking at, not a summary of them',
    Boolean(brief) && brief!.value.includes(AD.body),
    "the copilot is told an advert arrived but not which one");
}

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

/* ── The week is seven buttons, not seven sentences ─────────────────
 
   The plan panel said "Tuesday 18:00 · TikTok" and described what to post,
   and there was nothing to press. Seven specific instructions and a walk
   back up the page to start over — the same fault as the format cards, one
   panel further down, on the panel she asked for by name.
 
   A slot carries a format id now. The three things that can go wrong with
   that are each checked: the model naming something that does not exist
   (dropped by the route), the shape coming from the campaign's tick boxes
   rather than from the slot's own platform, and the slot's sentence not
   actually reaching the room. */
const planRoute = readFileSync('app/api/plan/route.ts', 'utf8');
ok('the plan asks which format each slot is', /format: z\n?\s*\.enum\(FORMAT_IDS/.test(planRoute),
  'a week row has nothing to open, so it stays a sentence');
ok('  and drops an id the catalogue does not have',
  /slot\.format && formatById\(slot\.format\)/.test(planRoute),
  '`z.enum` is a description and not a constraint here — see check:adschema — so an invented id would draw a button that opens nothing');

const planPanel = readFileSync('app/components/MarketPlan.tsx', 'utf8');
ok('  and the week row opens the room that makes it',
  /handoverFor\(\{/.test(planPanel) && /formatId: makes\.id/.test(planPanel),
  'the panel has the format and still does not use it');
ok('  taking its shape from the slot\'s own platform, not the campaign\'s tick boxes',
  /shapeForNamed\(slot\.platform\)/.test(planPanel),
  'Tuesday is one platform; the tick boxes are about the whole campaign');

/* The slot's own sentence is the thing to make. It is written to be
   "specific enough to make on the day" — the same job `pick.first` does on
   a format card — so it has to be what lands in the room. */
const fromSlot = handoverFor({
  formatId: 'short_vertical',
  brief: { what: 'handmade leather bags' },
  pick: { first: 'The winter range on the bench, one shot, no words' },
  going: [],
});
ok('  and the slot\'s own sentence is what lands in the room',
  fromSlot.some((one) => one.op === 'set_prompt' && /winter range/i.test(one.value)),
  fromSlot.find((one) => one.op === 'set_prompt')?.value.slice(0, 90) ?? 'no prompt at all');

/* A platform named in words, from a plan a model wrote — there is no id on
   a slot, and the name arrives in whatever case and language it likes. */
ok('a slot for TikTok is vertical', shapeForNamed('TikTok') === '9:16', shapeForNamed('TikTok'));
ok('  a slot for their own website is wide',
  shapeForNamed('Your own website or landing page') === '16:9',
  shapeForNamed('Your own website or landing page'));
ok('  and an Afrikaans plan says the same thing',
  shapeForNamed('Jou eie webwerf of bestemmingsblad') === '16:9',
  shapeForNamed('Jou eie webwerf of bestemmingsblad'));
ok('  and a platform nobody recognises still gives a usable shape',
  ['9:16', '16:9', '1:1'].includes(shapeForNamed('a shop window')),
  shapeForNamed('a shop window'));

/* ── The brief survives leaving the room ────────────────────────────
 
   Everything this desk PRODUCES was already remembered — the recommended
   formats, the weekly plan, the imported report. The brief that produced
   all three lived in component state, and rooms unmount when you leave
   them. So five boxes, three adverts, "Film this one", come back, and the
   desk is empty with the plan still sitting above it describing a business
   the screen no longer knows anything about.
 
   That was survivable while the only way out was a link. Every button
   added tonight is a way out, so making the exits work without this would
   have made the room worse, not better. */
const desk = readFileSync('app/components/Campaign.tsx', 'utf8');

ok('the advert brief is written down', /saveBrief\(/.test(desk),
  'leaving the room throws away everything somebody typed');
ok('  and read back when the room opens', /loadBrief\(\)/.test(desk),
  'it is saved and never restored, which is the same thing with extra steps');

/* Read as the initial value, not filled in by an effect afterwards. An
   effect that sets six boxes after the first paint lands on top of whatever
   somebody has already started typing. */
ok('  as the boxes\' first value, not dropped in after the first paint',
  /useState\(before\.what\)/.test(desk),
  'an effect filling the boxes lands on top of what somebody is already typing');

/* Everything typed, not only the first box.
 
   Read out of the call and matched as SHORTHAND — `{ what, who, … ads }` —
   rather than as the word appearing nearby. The first version of this rule
   allowed `ads: []`, which contains the word `ads`, saves nothing, and
   passed. Sixth time this week that the answer was to match the thing
   rather than the word for it. */
/* The argument, whether it is written inline or named first.
 
   It was `saveBrief({ what, who, … })` and became `const brief = { … };
   saveBrief(brief)` when the shelf needed the same object twice. The
   property did not change and this rule went red, which is the rule
   matching the spelling rather than the thing — twice now in one file. So
   it follows an identifier back to its declaration. */
function objectPassedTo(call: string, source: string): string {
  const inline = new RegExp(`${call}\\(\\s*\\{([^}]*)\\}`).exec(source);
  if (inline) return inline[1];
  const named = new RegExp(`${call}\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\)`).exec(source);
  if (!named) return '';
  const declared = new RegExp(`const ${named[1]} = \\{([^}]*)\\}`).exec(source);
  return declared ? declared[1] : '';
}

const passed = new Set(
  objectPassedTo('saveBrief', desk)
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one && !one.includes(':')),
);
const fields = ['what', 'who', 'offer', 'tone', 'market', 'placement', 'going', 'ads'];
const dropped = fields.filter((one) => !passed.has(one));
ok('  and every part of it, not only the boxes with a button under them',
  dropped.length === 0,
  `${dropped.join(', ')} is typed and not kept — a literal in its place saves nothing and reads like it does`);

/* And a way to stop. A brief kept for ever is a second campaign spent
   clearing six boxes by hand. */
ok('  with one press that forgets it again', /forgetBrief\(\)/.test(desk),
  'the only way to start a second campaign is to clear every box by hand');

/* Said out loud. The house rule for everything kept per device: the room
   says so rather than letting somebody find out on their other phone. */
const words = readFileSync('app/lib/i18n.tsx', 'utf8');
ok('  and the room says it is this browser only, in both languages',
  /"ads\.keptHere": \{ en: "[^"]{40,}", af: "[^"]{40,}" \}/.test(words),
  'kept per device and never mentioned, which is how somebody discovers it on their phone');

/* ── More than one, each a button ───────────────────────────────────
 
   Carli, 11 September 2026: "The ones that I have worked on should be able
   to be a button to push on and then everything opens as it was. Currently
   I cannot go back to our previous ad generation and find it as it was."
 
   Three things were wrong and only the first had been fixed. The brief did
   not survive leaving the room — fixed. The recommendation cards did not
   survive either: the reasons, the thing to watch out for and the format
   named as the wrong answer were written, shown once, and dropped. And
   there had only ever been ONE of everything, so a second campaign
   replaced the first silently, with no list and nothing to press. */
const shelf = readFileSync('app/lib/adwork.ts', 'utf8');
const shape = readFileSync('app/components/AdFormats.tsx', 'utf8');

ok('the recommendation cards come back when the room reopens',
  /loadPicks\(\)/.test(shape),
  'the panel writes its cards down and never reads them, so every exit loses the advice');

/* The reasons, not only the ids. `loadChosen` answers the week's narrower
   question — which formats, and the first thing to make — and a card
   rebuilt from that alone is a heading with no advice under it. */
const store = readFileSync('app/lib/chosenformat.ts', 'utf8');
for (const part of ['why', 'watchOut', 'styleWhy']) {
  ok(`  including its ${part}`, new RegExp(`readonly ${part}\\?:`).test(store),
    'the card comes back as a heading with the advice missing');
}
ok('  and the format it named as the wrong answer',
  /INSTEAD_KEY/.test(store) && /instead/.test(shape),
  'the most useful line on the screen is the one that does not come back');

/* A campaign is all of it, not a brief with two gaps. */
for (const part of ['brief', 'picks', 'instead', 'plan']) {
  ok(`a saved campaign carries its ${part}`, new RegExp(`readonly ${part}:`).test(shelf),
    'it opens as a brief with the work missing');
}

ok('there can be more than one', /MOST_WORKS/.test(shelf) && /works: readonly Work\[\]/.test(shelf),
  'a second campaign replaces the first, silently');
ok('  and they are saved without being asked for',
  /keepWork\(\{/.test(desk) && !/Save this one|Save campaign/.test(desk),
  'a Save button is a thing to forget, and what it loses is the work done before anybody knew it was there');
ok('  and opening one puts the cards and the week back too',
  /putPicks\(work\.picks, work\.instead\)/.test(desk) && /savePlan\(work\.plan\)/.test(desk),
  'the brief comes back and the advice does not, which is half an answer');
ok('  before the panels are told to read again',
  desk.indexOf('putPicks(work.picks') < desk.indexOf('setOpenedAt((was) => was + 1)'),
  'the panels remount first and read the previous campaign for one paint');
ok('  and a new one clears them rather than inheriting them',
  /clearPicks\(\)/.test(desk) && /savePlan\(null\)/.test(desk),
  'a new campaign opens with the last one\'s recommendations on screen');
ok('and one that is finished can be forgotten', /dropWork\(/.test(desk),
  'twelve campaigns and no way to remove one');

/* ── The conversation, not only the boxes ─────────────────────────────
 
   Carli, 22 September 2026: *"adverts sit nogsteeds nie die prompt in die
   nuwe kamers nie."* The third report of the same thing, and each earlier
   answer fixed a different path: first the fields themselves, then the two
   buttons under a written advert. This is the path she presses first — a
   recommendation card — and it carried the fields and nothing else, so the
   room filled in and the copilot beside it opened empty.
 
   Every rule below is about the value NOBODY was reading. `check:adcarry`
   presses the card and reads the boxes; it was green through all three
   reports, because a rule about boxes is a rule about boxes. */
const noBrief: string[] = [];
const notLast: string[] = [];
const missing: string[] = [];
for (const format of AD_FORMATS) {
  if (format.room === 'campaign') continue;
  const wires = handoverFor({ formatId: format.id, brief: BRIEF, pick: PICK, ad: AD, going: ['tiktok'] });
  const at = wires.findIndex((one) => one.op === 'brief');
  if (at === -1) { noBrief.push(format.id); continue; }
  /* Last, because the panel opens on a room that is already set up. A
     conversation that arrives before the fields describes a room that is
     still empty, which reads as if the hand-off had failed. */
  if (at !== wires.length - 1) notLast.push(format.id);
  const said = wires[at].value;
  /* Their subject and the desk's own recommendation. Both, because a brief
     with only the subject in it is the room's own heading, and one with only
     the recommendation in it is advice about nobody. */
  for (const [part, wanted] of [
    ['what they sell', BRIEF.what],
    ['the recommendation', PICK.first],
    ['the thing to watch out for', PICK.watchOut],
  ] as const) {
    if (!said.includes(wanted)) missing.push(`${format.id} carries no ${part}`);
  }
}
ok('every hand-off opens the next room\u2019s copilot as well as its boxes',
  noBrief.length === 0,
  `${noBrief.join(', ')} fill the room and leave the copilot empty \u2014 this is the report`);
ok('  with the conversation last, after the fields it is about', notLast.length === 0,
  notLast.join(', '));
ok('  and her own words in it, not a summary of them', missing.length === 0,
  missing.join('; '));

/* Nothing added. The one rule the whole module is built on, and a seeded
   turn is the easiest place to break it: a paragraph written around a brief
   reads as fact and is the first thing the model will repeat back. */
const invented = handoverFor({
  formatId: 'short_vertical',
  brief: { what: 'handmade leather bags' },
  pick: { first: PICK.first },
  going: ['tiktok'],
}).find((one) => one.op === 'brief');
ok('  and nothing they did not type', Boolean(invented)
  && !/free repairs|R\d|per month|quiet and confident/i.test(invented!.value),
  invented?.value.slice(0, 160) ?? 'no brief at all');

/* The words around their words come from the room, so an Afrikaans app does
   not open its copilot in English. Proved by sending one through rather than
   by reading the call site: a label that is accepted and dropped looks
   identical from outside. */
const inHer = handoverFor({
  formatId: 'short_vertical', brief: BRIEF, pick: PICK, going: ['tiktok'],
  words: { sell: 'Wat hulle verkoop', from: 'Hulle kom van die advertensietafel af' },
}).find((one) => one.op === 'brief');
ok('  in the language the room is being used in',
  Boolean(inHer) && inHer!.value.includes('Wat hulle verkoop')
  && inHer!.value.includes('Hulle kom van die advertensietafel af'),
  'the caller\u2019s own words were taken and the English used anyway');

/* And the call sites actually send them. The function defaulting to English
   is right — it is a pure function with no `t` — and is also exactly how
   this would ship looking correct while every panel opened in English. */
/* ── Every door that uses this module, not the one I was looking at ───
 
   The rule below used to read `AdFormats.tsx` and ask whether IT sent the
   room's words. `handoverFor` has two call sites: the recommendation card
   and the weekly plan's "Make this one". The second was written by copying
   the first and would have opened its copilot in English, with a rule about
   the hand-off sitting green beside it — which is the same mistake as
   `check:handover` reading only `page.tsx`, one module further down.
 
   So the files are found rather than named. A third call site added
   tomorrow is held to this the moment it exists. */
const USERS = readdirSync('app/components')
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => [`app/components/${name}`, readFileSync(`app/components/${name}`, 'utf8')] as const)
  .filter(([, body]) => /handoverFor\(\{/.test(body));

const wordless = USERS.flatMap(([name, body]) =>
  [...body.matchAll(/handoverFor\(\{[\s\S]*?\n\s*\}\)/g)]
    .filter((call) => !/words:\s*carryWords\(t\)/.test(call[0]))
    .map(() => name));
ok(`  and every door that uses it sends the room\u2019s words \u2014 ${USERS.length} files`,
  USERS.length >= 2 && wordless.length === 0,
  USERS.length < 2
    ? `only ${USERS.length} file(s) found calling handoverFor; the card and the weekly plan both do`
    : `${[...new Set(wordless)].join(', ')} hand over with no words, so that copilot opens in English`);

for (const [button, fn] of [['film', 'filmThisAd'], ['read', 'readThisAd']] as const) {
  const calls = [...desk.matchAll(new RegExp(`${fn}\\(\\{[^}]*\\}`, 'g'))].map((one) => one[0]);
  ok(`  and so does \u201C${button} this one\u201D, at every press that leads to it`,
    calls.length >= 2 && calls.every((call) => /[,{]\s*said:\s*t\(/.test(call)),
    calls.length < 2
      ? `${calls.length} call site(s) found; the button and the copilot both reach ${fn}`
      : `${calls.filter((call) => !/[,{]\s*said:\s*t\(/.test(call)).length} of ${calls.length} `
        + `call ${fn} with no sentence of their own, so that brief opens in English`);
}

/* ── The keys, asked of the builder rather than grepped for ───────────
 
   `carryWords` is handed a `t` that records what it asks for and answers
   with a marker. That gives the real list — a thirteenth label added to the
   module appears here the moment it exists — and it also proves the
   builder's answers are the ones that come out the other end, which a scan
   of the call site cannot show. */
const askedFor: string[] = [];
const marked = carryWords((key) => {
  askedFor.push(key);
  return `«${key}»`;
});
const throughIt = handoverFor({
  formatId: 'short_vertical', brief: BRIEF, pick: PICK, going: ['tiktok'], words: marked,
}).find((one) => one.op === 'brief')?.value ?? '';
ok(`  built from one place \u2014 ${askedFor.length} labels`, askedFor.length >= 12,
  `${askedFor.join(', ')} — fewer labels than the brief has lines`);
ok('  and every one of them reaches the panel',
  askedFor.every((key) => throughIt.includes(`«${key}»`)),
  askedFor.filter((key) => !throughIt.includes(`«${key}»`)).join(', ')
    + ' — asked for and then dropped, which is how a translated label ships untranslated');

/* Both languages, for those and for the two button sentences. A key with no
   Afrikaans falls back to the English default, which is the same bug wearing
   a dictionary. */
const CARRY = [...askedFor, 'carry.filmed', 'carry.read'];
const hasAf = (key: string): boolean =>
  new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words);
ok(`  under ${CARRY.length} keys that exist in Afrikaans too`, CARRY.every(hasAf),
  CARRY.filter((key) => !hasAf(key)).join(', '));

if (failures) {
  console.error(`\ncheck:adhandover — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:adhandover — all ${AD_FORMATS.length} recommendations arrive with the brief in them.`);
