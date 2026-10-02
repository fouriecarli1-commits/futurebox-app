/**
 * The Video Editor's opening page: what the room is for, and two ways in.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Die probooth se opening page het half 'n
 * verduideliking wat hierdie funksie doen. Kan die video editor dieselfde hê
 * en dan die button wat sê bring it in, or choose from channel"*.
 *
 * ── The thing this check is really for ───────────────────────────────────
 *
 * The easy half is a heading, a sentence and two buttons. That half is
 * cosmetic and would look finished the moment it was drawn.
 *
 * The half that can quietly not work is the second button. "Choose from
 * channel" has to end with a clip ON THE CLOCK, and this room does not work
 * on titles — it decodes a Blob, paints its frames onto a canvas and records
 * them. Until 4 October the listing at `/api/video/kept` returned ids,
 * titles and seconds and no file link at all, so a button saying "choose from
 * channel" could have been drawn, pressed, and have nothing to hand over.
 *
 * Nothing on screen would have looked wrong. That is the exact shape of a
 * check that is green because it measures something ADJACENT to the real
 * thing — a button that exists is not a clip that arrives — so most of what
 * follows is about the link travelling from the route to the Blob, and not
 * about the page being pretty.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before, from, upTo } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const route = withoutComments(readFileSync('app/api/video/kept/route.ts', 'utf8'));
const filmed = withoutComments(readFileSync('app/lib/filmed.ts', 'utf8'));
const dict = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── There is an opening, and it says what the room does ───────────────── */

ok('the room opens with an explanation and not with an empty clock',
  /data-editoropening/.test(room),
  'the Pro Booth earned its opening page the same way: a room whose first'
  + ' screen is its controls is a room nobody knows the use of');

const opening = upTo(from(room, 'data-editoropening'), 'data-editoropenchannel');

ok('  headed with the room’s own name',
  /rail\.videoedit/.test(opening),
  'the name on the rail card she pressed to get here, so the two cannot drift'
  + ' apart — she has already had to ask twice for this room to be renamed');

ok('  and a sentence drawn from the dictionary, not hard-coded',
  /edit\.room\.sub/.test(opening),
  'an explanation an Afrikaans reader gets in English is not an explanation');

const sub = dict.split('"edit.room.sub"')[1]?.split('},')[0] ?? '';

ok('the explanation is long enough to actually explain',
  sub.length > 400 && /\baf:/.test(sub),
  `${sub.length} characters across both languages — "half 'n verduideliking"`
  + ' is a paragraph, not a label');

ok('  and says the cutting is free, because the plan cards sell this room',
  /free|gratis/.test(sub),
  'somebody arriving from a plan card needs to know what the meter does here;'
  + ' every frame is painted in this browser and costs nothing to serve');

/* ── Two ways in, and both of them are on the opening ──────────────────── */

ok('one button brings a clip in off the device',
  /data-editoropenbring/.test(room) && /data-editoropenbring[\s\S]{0,900}type="file"/.test(room),
  'a label wrapping the real file input, so the press opens the picker rather'
  + ' than a button that opens nothing');

ok('  and it is the same bringIn the bench uses',
  /data-editoropenbring[\s\S]{0,900}bringIn\(event\.target\.files\)/.test(room),
  'two copies of "what a clip is" is two answers to how long it is and what'
  + ' it holds');

ok('the other button goes to her channel',
  /data-editoropenchannel/.test(room) && /edit\.fromChannel/.test(room),
  'her words: "bring it in, or choose from channel"');

ok('  and presses it, rather than only pointing at the bench',
  /data-editoropenchannel[\s\S]{0,400}loadChannel\(\)/.test(room),
  'opening the drawer and leaving the list unasked makes her press twice for'
  + ' one intention');

ok('  landing on the bench that holds the cards',
  /data-editoropenchannel[\s\S]{0,400}setBench\('folder'\)/.test(room),
  'the list lives in one place and the opening sends her to it — a second set'
  + ' of cards behind the opening is a second thing to keep in step');

/* ── The channel listing has a FILE, not a title ───────────────────────── */

ok('the kept-video listing signs a link per row',
  /createSignedUrls\(/.test(route),
  'this is the assertion the whole feature rests on: before 4 October the'
  + ' route returned titles only, and "choose from channel" had nothing to'
  + ' hand the clock');

ok('  in one call for the whole page, not one call per row',
  !/for \([\s\S]{0,120}createSignedUrl\(/.test(route),
  'a signing round trip per video turns a twenty-video channel into twenty'
  + ' serial requests before the first card is drawn');

ok('  and a video says so in its type',
  /readonly url: string \| null/.test(filmed),
  'null is a real answer — a row can outlive its file — and a type that says'
  + ' `string` would make that a crash instead of a dropped card');

ok('rows whose file is gone are dropped before they are drawn',
  /setChannel\([\s\S]{0,120}filter\([\s\S]{0,60}\.url\)/.test(room),
  'a card that cannot be opened is worse than no card: she presses it,'
  + ' nothing happens, and the room reads as broken rather than as empty');

ok('nothing-asked-yet and nothing-there are different sentences',
  /useState<MyVideo\[\] \| null>\(null\)/.test(room) && /edit\.channelNone/.test(room),
  'one state cannot say both, and "you have nothing" shown before the request'
  + ' has even gone out is a lie about her own channel');

ok('the listing is fetched on the press and not on mount',
  !/useEffect\([\s\S]{0,200}loadChannel/.test(room),
  'the room opens for signed-out visitors too, and a 401 nobody asked for is'
  + ' a wasted round trip on a phone');

/* ── Pressing a card ends with a clip on the clock ─────────────────────── */

ok('picking one fetches the file itself',
  /bringFromChannel[\s\S]{0,700}await fetch\(one\.url\)/.test(room),
  'the room decodes and paints frames; a title and an id are not a video');

ok('  turns it into a File the room already knows how to read',
  /new File\(\[blob\]/.test(room) && /bringIn\(\[new File/.test(room),
  'so the length, the `holds` ceiling and the history step all come from the'
  + ' one path, and a clip from the channel cannot be trimmed differently'
  + ' from a clip off the phone');

ok('  and says so when the link has gone stale',
  /edit\.channelfailed/.test(room),
  'a signed link expires; a press that silently does nothing is how she ends'
  + ' up reporting the room as broken');

ok('  while the card itself shows it is working',
  /pulling === one\.id/.test(room),
  'a spinner on the row she pressed, not somewhere else on the page — a'
  + ' second press during the fetch brings the same clip in twice');

/* ── And the opening is only there when there is nothing to cut ────────── */

ok('the opening gives way to the clock the moment a clip lands',
  before(room, 'edit.pieces.length === 0', 'data-editoropening'),
  'an explanation that stays up over a film she is already cutting is in the'
  + ' way, and this room has the whole screen');

if (bad) {
  console.error(`\ncheck:editoropen — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:editoropen — the Video Editor opens by saying what it is for and'
  + ' offering two ways in, and the channel way ends with a real file on the'
  + ' clock rather than a button that has nothing to hand over.',
);
