/**
 * check:kidstory — the story engine's rules, held without a browser.
 *
 * The owner, 19 October 2026: *"Die story mode moet 'n ander AI engine
 * gebruik, die voorlesing moet so mooi wees soos die podcast. Dalk 'n paar
 * avatar stemme opstel, en storie generasie moet meer motion en meer visual
 * wees."* The walk (`audit/kidstory.mjs`) drives the room; this holds the
 * parts that decide what a child hears and what a parent pays.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { KID_VOICES, STORYTELLERS, bare, castVoices } from '../app/lib/kidsvoices.ts';
import {
  ENGINE_PAGES, PAGE_MOST_CHARS, READ_MOST_CHARS, cleanStory, lineShares, pageArt, spokenLines, wordAt,
} from '../app/lib/kidstory.ts';
import { VISUAL_STYLES } from '../app/lib/kidsstoryboard.ts';
import { STORY_PAGES, STORY_PAGE_CHARS, priceOf } from '../app/lib/kidsallowance.ts';
import { CREDITS, readCost } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};
const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

/* ── The voices ───────────────────────────────────────────────────────── */

ok('four storytellers to choose from, and character voices beside them',
  STORYTELLERS.length === 4 && KID_VOICES.length > STORYTELLERS.length);
const stock = ['George', 'Lily', 'Charlie', 'Jessica', 'Bill', 'Laura', 'Adam']
  .map((name, i) => ({ id: `v${i}`, name: `${name} - narration` }));
const cast = castVoices(stock);
ok('every persona gets a stock voice of its own',
  new Set(Object.values(cast)).size === KID_VOICES.length && Object.values(cast).every((id) => /^v\d$/.test(id)),
  JSON.stringify(cast));
ok('  the one it asks for first, where the list has it', cast.owl === 'v0' && cast.fairy === 'v1' && cast.comet === 'v2');
const few = castVoices(stock.slice(0, 2));
ok('  and a short list never leaves a persona without a voice',
  KID_VOICES.every((one) => Boolean(few[one.id])), JSON.stringify(few));

const read = code('app/api/kids/read/route.ts');
ok('the reading route takes personas, never a voice id from the page',
  /castVoices\(/.test(read) && !/one\?\.voiceId|body\.voiceId/.test(read));
ok('  and is paid from the kids room', /kidsCovers\(/.test(read) && /charge\(/.test(read));
ok('  and holds a page to one reading', /READ_MOST_CHARS/.test(read));

ok('stage directions come off for a model that would say them',
  bare('[giggles] Look at that! [whispers] Shh.') === 'Look at that! Shh.');
ok('  and the dialogue sends them only to eleven_v3',
  /modelId === 'eleven_v3' \? turn\.text : bare\(turn\.text\)/.test(code('app/lib/server/eleven.ts')));

/* ── The story ────────────────────────────────────────────────────────── */

const long = 'A very long line that goes on and on. '.repeat(20);
const made = cleanStory({
  title: 'Test',
  cast: [{ name: 'Mia', voice: 'pip', looks: 'a mouse' }, { name: 'X', voice: 'somebody-else', looks: '' }],
  pages: [
    { lines: [{ who: 'owl', name: '', text: 'Once upon a time.' }, { who: 'nobody', name: 'Mia', text: 'Hello!' }], scene: 'a', motion: 'spin-wildly', sparkle: 'lava', wonder: 'Can you find the cheese?' },
    { lines: [{ who: 'owl', name: '', text: long }, { who: 'pip', name: 'Mia', text: 'Me too.' }], scene: 'b', motion: 'pan-left', sparkle: 'snow', wonder: 'x'.repeat(400) },
    { lines: [], scene: 'empty', motion: 'float', sparkle: 'stars', wonder: '' },
    { lines: [{ who: 'pip', name: 'Mia', text: '[giggles] The end.' }], scene: 'c', motion: 'tilt', sparkle: 'hearts', wonder: 'Did you like it?' },
  ],
}, 'owl');
ok('a story the engine sends is made safe to play', made !== null && made.pages.length === 3, JSON.stringify(made?.pages.length));
if (made) {
  ok('  a voice nobody has is the storyteller’s', made.pages[0].lines[1].who === 'owl' && made.cast[1].voice === 'owl');
  ok('  a motion or sparkle that is not one is the default', made.pages[0].motion === 'zoom-in' && made.pages[0].sparkle === 'stars');
  ok('  a page that says nothing is dropped', made.pages.every((one) => one.lines.length > 0));
  ok('  and no page is longer than one reading',
    made.pages.every((one) => one.lines.reduce((all, line) => all + line.text.length, 0) <= PAGE_MOST_CHARS));
  ok('  and the question is kept short', made.pages[1].wonder.length <= READ_MOST_CHARS - PAGE_MOST_CHARS);
  const spoken = spokenLines(made.pages[0]);
  ok('the question is read at the end, in the storyteller’s voice',
    spoken.length === 3 && spoken[2].who === 'owl' && spoken[2].text === 'Can you find the cheese?');
}
ok('a reply with too few pages is not a book', cleanStory({ pages: [{ lines: [{ who: 'owl', text: 'Hi' }] }] }, 'owl') === null);

const shares = lineShares([{ text: 'One two three.' }, { text: '[giggles] Four!' }]);
ok('the speakers share the reading in order, end to end',
  shares[0].start === 0 && shares[1].end === 1 && shares[0].end === shares[1].start);
ok('  and the lit word walks from the first to the last',
  wordAt([{ text: 'a bb ccc' }], 0) === 0 && wordAt([{ text: 'a bb ccc' }], 1) === 2);

/* ── The pictures ─────────────────────────────────────────────────────── */

const book = { title: 'T', cast: [{ name: 'Mia', voice: 'pip' as const, looks: 'a small grey mouse in a yellow scarf' }], pages: [] };
const art = pageArt(book, { lines: [], scene: 'Mia on the moon', motion: 'float', sparkle: 'stars', wonder: '' }, 'crayon', true);
ok('every page carries the cast’s looks and matches the first', /yellow scarf/.test(art) && /same picture book/.test(art));
ok('  and asks for no words in the picture', /No words, letters or numbers/.test(art));
ok('no style sends a studio’s or an illustrator’s name to the picture engine',
  VISUAL_STYLES.every((one) => !/pixar|disney|potter|ghibli|dreamworks/i.test(one.stylePrompt)));

/* ── What it costs ────────────────────────────────────────────────────── */

ok('the parent’s price list counts the book the engine makes',
  STORY_PAGES === ENGINE_PAGES && STORY_PAGE_CHARS === READ_MOST_CHARS);
ok('  and the price is every page’s picture and its longest reading',
  priceOf('story') === (readCost(READ_MOST_CHARS) + CREDITS.repaint) * ENGINE_PAGES, String(priceOf('story')));
ok('  and the button shows it', /priceOf\('story'\)/.test(code('app/components/KidsStoryboard.tsx')));

const story = code('app/api/kids/story/route.ts');
ok('the engine writes from the cards, not from anything typed',
  /STORY_SECTIONS\[section\]/.test(story) && !/body\.(idea|words|prompt)/.test(story));
ok('a book played again costs nothing: the player and the shelf ask no route',
  !/fetch\(/.test(code('app/components/KidsStoryPlayer.tsx')) && !/fetch\(/.test(code('app/components/StoryShelf.tsx')));

if (bad) {
  console.error(`\ncheck:kidstory — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:kidstory — the storyteller and the characters each have a voice of their own, the story is made safe to play, every page is drawn to match, and the price is the book.');
