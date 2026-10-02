/**
 * The cover: one frame out of the film, or a picture brought in, and it
 * travels with the film.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Daar moet ook 'n opsie wees om 'n cover foto vir die
 * video te screen shot uit die video, of een in te bring wat dan die video se
 * voorblad foto word ook wanneer die video ge-export word."*
 *
 * ── The thing this check is really for ───────────────────────────────────
 *
 * "Wanneer die video ge-export word" is the half that can quietly not happen.
 * A cover that can be set, is shown in the room, and then is not there when she
 * saves is a feature that exists on screen and nowhere else — and nothing about
 * the room would look wrong. So most of what follows is about the cover
 * reaching the player and the download, not about making one.
 */
import {
  COVER_QUALITY, COVER_TYPE, coverName, isPicture,
} from '../app/lib/videocover';
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── What a cover is ───────────────────────────────────────────────────── */

ok('a cover is written as a picture every card and player can show',
  COVER_TYPE === 'image/jpeg',
  `${COVER_TYPE}`);

ok('  and squeezed, because it is looked at small',
  COVER_QUALITY > 0.5 && COVER_QUALITY < 1,
  `${COVER_QUALITY} — the last tenth of quality is invisible on a card and is`
  + ' most of the bytes');

ok('a brought-in file has to actually be a picture',
  isPicture({ type: 'image/png' } as File)
  && isPicture({ type: 'image/jpeg' } as File)
  && !isPicture({ type: 'video/mp4' } as File)
  && !isPicture({ type: '' } as File)
  && !isPicture(null),
  'the input’s `accept` is a filter on a picker, not a rule — a file dragged'
  + ' in or chosen through "all files" ignores it entirely');

ok('the cover is named after the film it belongs to',
  coverName('my-advert.webm') === 'my-advert-cover.jpg'
  && coverName('film') === 'film-cover.jpg',
  `${coverName('my-advert.webm')} — same stem, so the two sit next to each`
  + ' other in a downloads folder sorted by name rather than at opposite ends');

/* ── Drawn into the FILM's frame, not the clip's ───────────────────────── */

const cover = withoutComments(readFileSync('app/lib/videocover.ts', 'utf8'));

ok('a grabbed frame is framed the way the film frames that second',
  /fill \? covering\(/.test(cover) && /fitted\(/.test(cover),
  'a shot might be wide inside a tall film, and a cover grabbed at the clip’s'
  + ' own shape would be a different picture from the one the film shows —'
  + ' the same fault the preview had before it was given the film’s aspect');

ok('  with black behind it, for the bars',
  /fillStyle = '#000'/.test(cover),
  'a cover with transparent bars goes white on half the cards it is shown on');

ok('  and a frame that cannot be read gives no cover rather than no film',
  /catch \{[\s\S]{0,200}return null;/.test(cover),
  'a film that failed to export because a poster could not be grabbed would be'
  + ' the tail wagging the dog');

/* ── And it reaches the film, which is the half that can silently not ──── */

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the room offers both ways she asked for',
  /data-editorcovershot/.test(room) && /data-editorcoverbring/.test(room),
  'a frame out of the film, or a picture brought in');

ok('  and shows her the one she has',
  /data-editorcovershown/.test(room),
  'a cover somebody set and cannot see is a cover they will set twice');

ok('  and lets her take it off again',
  /data-editorcoverclear/.test(room),
  'every other choice in this room can be undone from where it was made');

ok('the finished film carries the cover as its poster',
  /poster=\{/.test(room),
  'which is what a cover IS in a player: the picture shown in the film’s'
  + ' place before it has loaded');

ok('  and saving the film saves the cover beside it',
  /coverName\(/.test(room) && /data-editorsavecover|downloadBlob\([\s\S]{0,80}coverName/.test(room),
  '"wanneer die video ge-export word" is the whole request — a cover that is'
  + ' only ever on screen is a feature that exists nowhere else');

/* ── And it is not smuggled into the film file ─────────────────────────── */

const edit = withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'));

ok('the cover is not handed to the renderer as part of the cut',
  !/cover/.test(edit.split('export function cutFrom')[1]?.split('\n}')[0] ?? ''),
  'MediaRecorder writes a stream and cannot attach cover art; making the cover'
  + ' the first FRAME would turn a twenty-second advert into a twenty-one-second'
  + ' advert with a freeze on it');

if (bad) {
  console.error(`\ncheck:filmcover — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmcover — a cover is a frame out of the film or a picture brought'
  + ' in, framed the way the film frames it, shown as the player’s poster, and'
  + ' saved beside the film.',
);
