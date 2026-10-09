/**
 * The child's room has two presses in it and no way out.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink die child funksie is net om met liedjie
 * maak te speel - en dalk om die liedjie 'n video te maak."* And: *"Gaan aan
 * met die kids kamer."*
 *
 * ── Why a check and not a careful afternoon ──────────────────────────────
 *
 * Because every way this room goes wrong is invisible from inside it.
 *
 * `check:kidsafe` measured in October which rooms a child could be left
 * alone in, and the finding was that the FREE rooms are not the SAFE rooms:
 * the collab room costs nothing and puts a child in a conversation with
 * strangers, the art market costs nothing and is a shop. So the room's whole
 * premise is that nothing else is reachable from it — and one `<Link>` added
 * next month to be helpful undoes that without breaking anything, without
 * failing a build, and without looking wrong in a screenshot.
 *
 * The four things held here are each like that.
 *
 * **Nothing navigates.** Read off the file, so a link is a red check rather
 * than a discovery.
 *
 * **Nothing is typed.** A text box in here is a child typing into a prompt
 * that reaches a music model and a video model. The moderation gate would
 * catch the worst of it, and "the gate caught it" is not a thing to design a
 * child's room around.
 *
 * **The song asks for singing.** This is the one that would have shipped
 * quietly. `engines.ts` sends `instrumental: sections.length === 0` — no
 * words, no voice — which is right for the studio and wrong here, because a
 * child has written no words and still wants somebody to sing. A child's
 * song coming back as a backing track is the entire feature failing with
 * nothing anywhere saying so.
 *
 * **The video costs what the parent was told.** The opening page prices a
 * video from `videoCost` at one length and one grade. The room sends a
 * length and a grade. Two numbers in two files about one button is how a
 * parent comes to be shown a price the press does not charge.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { videoCost } from '../app/lib/credits.ts';
import { KID_PRICES, VIDEO_SECONDS } from '../app/lib/kidsallowance.ts';
import { KID_SOUNDS, KID_TOPICS } from '../app/lib/kidsong.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe child\'s room has two presses in it and no way out\n');

const room = withoutComments(readFileSync('app/components/KidsRoom.tsx', 'utf8'));
const songs = withoutComments(readFileSync('app/lib/kidsong.ts', 'utf8'));

/* ── 1. Nothing navigates ───────────────────────────────────────────── */

const ways = [
  /from 'next\/link'/.test(room) && 'next/link',
  /\shref=/.test(room) && 'an href',
  /useRouter|router\.(push|replace)/.test(room) && 'the router',
  /window\.location/.test(room) && 'window.location',
].filter(Boolean);
ok('nothing in the room goes anywhere else',
  ways.length === 0,
  `${ways.join(', ')} — the room's premise is that a child cannot reach the`
  + ' shop, the strangers or the paid doors from it, and one helpful link'
  + ' undoes that without breaking a build or looking wrong in a screenshot');

ok('  and the only way out is the grown-up\'s own page',
  /data-kidsgrownup/.test(room) && /setAtDoor\(true\)/.test(room),
  'there is no deliberate way back to the grown-up, so ending kids mode means'
  + ' closing the app — and a parent who cannot find the way out turns the'
  + ' whole thing off instead');

/* ── 2. Nothing is typed ────────────────────────────────────────────── */

const typed = [
  /<input/.test(room) && 'an input',
  /<textarea/.test(room) && 'a textarea',
  /contentEditable/i.test(room) && 'a contenteditable',
].filter(Boolean);
ok('nothing in the room can be typed into',
  typed.length === 0,
  `${typed.join(', ')} — that is a child typing into a prompt that reaches a`
  + ' music model and a video model, and a moderation gate is not a design');

ok('  and every choice is a closed list somebody wrote',
  KID_TOPICS.length >= 4 && KID_SOUNDS.length >= 3
  && KID_TOPICS.every((one) => one.words.trim().length > 10)
  && KID_SOUNDS.every((one) => one.words.trim().length > 10),
  `${KID_TOPICS.length} topics and ${KID_SOUNDS.length} sounds — a list this`
  + ' short is a room with nothing in it, and an entry with no words behind'
  + ' it sends an empty prompt');

/* ── 3. The song asks for singing ───────────────────────────────────── */

ok('a child\'s song asks for somebody to sing it',
  /instrumental:\s*false/.test(songs),
  '`instrumental` is not sent as false, so the plain-prompt path decides —'
  + ' and `engines.ts` sends true whenever there are no written words, which'
  + ' is exactly the case a child is in. A backing track instead of a song is'
  + ' the whole feature failing with nothing saying so');

ok('  and asks for a song, not a prompt with no length',
  /seconds:\s*KID_SECONDS/.test(songs),
  'the length is not the one constant this file declares, so two numbers'
  + ' decide how long a song is');

/* ── 4. The video costs what the parent was told ─────────────────────── */

const seconds = songs.match(/seconds:\s*(\d+)/g) ?? [];
const videoSeconds = Number((songs.match(/seconds:\s*(\d+),\s*grade/) ?? [])[1]);
const grade = (songs.match(/grade:\s*'([a-z]+)'/) ?? [])[1];
const framework = KID_PRICES.find((one) => one.id === 'video')?.credits ?? -1;

ok('the room asks for the length the parent page priced',
  videoSeconds === VIDEO_SECONDS,
  `the room sends ${videoSeconds || 'nothing readable'} seconds and the page`
  + ` priced ${VIDEO_SECONDS} — the parent is shown one number and charged`
  + ' another');

ok('  and at the grade it priced',
  grade === 'standard',
  `the room sends the \`${grade ?? 'unreadable'}\` grade and the page priced`
  + " the plain one, which costs a quarter of premium — so a parent's whole"
  + ' allowance goes on one video');

ok('  so the two agree on what a video costs',
  framework === videoCost('standard', videoSeconds || 0),
  `the page says ${framework} and the room's own request works out to`
  + ` ${videoCost('standard', videoSeconds || 0)}`);

/* ── 5. What is left is re-asked, not guessed ───────────────────────── */

ok('the room asks the server again after every press',
  (room.match(/kidsNow\(\)/g) ?? []).length >= 3,
  `${(room.match(/kidsNow\(\)/g) ?? []).length} call(s) — the room subtracts`
  + ' its own guess instead of asking, so it goes on offering a song after'
  + ' the allowance is gone and the child is refused at the press');

ok('  and both presses are shut when there is not enough left',
  /left >= songPrice/.test(room) && /left >= videoPrice/.test(room),
  'a press is offered that cannot be paid for — the charge refuses it, which'
  + ' is correct and is also a child being told no by a machine instead of'
  + ' by a button that was never lit');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
