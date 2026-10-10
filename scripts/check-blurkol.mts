/**
 * The blur patch hides the thing it is put over, and hides it in the file too.
 *
 * ── What she asked, twice ────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Dit laat my dink dat video editor ook 'n blur
 * funksie nodig het."* The answer then was to rename the `sharp` dial Blur and
 * raise its ceiling from three pixels to twenty.
 *
 * Carli, 10 October 2026: *"Ek sien ook nogsteeds nie 'n blur funksie nie."*
 *
 * She was right and the first answer was the wrong feature. A dial blurs the
 * WHOLE FRAME, which is a mood. A blur tool is a patch over one thing — a face
 * somebody did not agree to, a number plate, a name on a parcel, a phone screen
 * with a message on it — and a dial that softens everything cannot do any of
 * them.
 *
 * ── Why this one is checked harder than most ─────────────────────────────
 *
 * Because of what it is for. Every other control in that room is taste: a look
 * that is slightly off is a film somebody re-renders. This one is the only
 * control in the app whose failure is **somebody else's privacy**, and all
 * three ways it can fail are invisible on the screen where it is used:
 *
 *   **The blur is too weak.** A face softened a little is a face. On the glass
 *   it looks hidden because you already know what is under it.
 *
 *   **The blurred copy is drawn in the wrong place.** Blur the picture and draw
 *   it at the frame's origin instead of the picture's, and the patch covers one
 *   piece of the shot while showing the thing it was meant to hide, shifted. The
 *   viewer sees both.
 *
 *   **The preview and the render disagree.** `blur()` is in device pixels, the
 *   glass is about 300 wide and the film is 1080, so an unscaled radius is three
 *   times as strong on screen as in the file — the exact fault
 *   `videoadjust.ts` had to fix when the dial's ceiling went up. The picture she
 *   approves would not be the picture she sends.
 *
 * ── There is no canvas in node, so the context is driven ────────────────
 *
 * This cannot render a frame and count pixels. What it can do is hand
 * `drawPatch` a context that writes down every call, and then read the
 * sequence: clipped to the patch, clipped to the picture, a blur set, the
 * source drawn at the PICTURE's geometry, and the state put back so the filter
 * does not reach the caption. Every one of those is a claim the file makes, and
 * each of them is checked by making it false.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  MOST_PATCHES, PATCH_LARGEST, PATCH_SMALLEST, STRENGTHS, STRENGTH_DEFAULT,
  blurRadius, drawPatch, drawPatches, newPatch, patchBox, type Patch,
} from '../app/lib/videoblur.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const FILM = { width: 1920, height: 1080 };

/* ── 1. Where a patch lands ───────────────────────────────────────────── */

const middle = patchBox(
  { id: 'a', at: { x: 0.5, y: 0.5 }, wide: 0.2, tall: 0.2, strength: 'misty' },
  FILM,
);
ok('a patch is centred on the point it was dragged to',
  Math.abs(middle.left + middle.width / 2 - FILM.width / 2) < 0.5
  && Math.abs(middle.top + middle.height / 2 - FILM.height / 2) < 0.5,
  'a patch drawn somewhere other than where it was dropped is a patch over the'
  + ` wrong thing — answered ${JSON.stringify(middle)}`);

ok('  and its size is the share it was given',
  Math.abs(middle.width - 0.2 * FILM.width) < 0.5
  && Math.abs(middle.height - 0.2 * FILM.height) < 0.5,
  'shares, never pixels: the glass is 300 wide and the film is 1920');

const offEdge = patchBox(
  { id: 'a', at: { x: 1.4, y: -0.3 }, wide: 0.2, tall: 0.2, strength: 'misty' },
  FILM,
);
ok('  and a patch pushed off the frame slides back fully onto it',
  offEdge.left >= 0 && offEdge.top >= 0
  && offEdge.left + offEdge.width <= FILM.width + 0.5
  && offEdge.top + offEdge.height <= FILM.height + 0.5,
  'a patch half off the frame covers half of what it was put there to cover'
  + ` — answered ${JSON.stringify(offEdge)}`);

const huge = patchBox(
  { id: 'a', at: { x: 0.5, y: 0.5 }, wide: 9, tall: 9, strength: 'misty' },
  FILM,
);
ok('  and one bigger than the frame is the frame',
  huge.width <= FILM.width + 0.5 && huge.height <= FILM.height + 0.5
  && huge.left >= -0.5 && huge.top >= -0.5,
  `answered ${JSON.stringify(huge)}`);

ok('  and nonsense for a position does not make a nonsense box',
  (() => {
    const box = patchBox(
      { id: 'a', at: { x: NaN, y: Infinity }, wide: NaN, tall: 0.2, strength: 'misty' },
      FILM,
    );
    return Number.isFinite(box.left) && Number.isFinite(box.top)
      && box.width > 0 && box.height > 0;
  })(),
  'a drag interrupted by a lost pointer can leave a NaN, and a patch at NaN is'
  + ' a patch that is not drawn at all — which is a face in the clear');

/* ── 2. The blur is strong enough to be the point ─────────────────────── */

ok('the blur is a share of the frame, so it survives the resolution',
  (() => {
    const big = blurRadius('misty', FILM);
    const small = blurRadius('misty', { width: 640, height: 360 });
    /* 1080 over 360 is three. Within a hair, because the share is a float. */
    return Math.abs(big / small - 3) < 0.05;
  })(),
  'eight pixels is a smear on a thumbnail and nothing at all on a 1080 frame,'
  + ' and a patch that works on the glass and not in the film is the failure'
  + ' nobody sees');

ok('  and it reads the SHORTER side, not the width',
  (() => {
    const wide = blurRadius('misty', { width: 1920, height: 1080 });
    const tall = blurRadius('misty', { width: 1080, height: 1920 });
    return Math.abs(wide - tall) < 0.01;
  })(),
  'a tall film and a wide one of the same quality must blur the same, or a'
  + ' reel is softer than the same cut posted wide');

ok('  and even the weakest rung is past recognisable on a 1080 frame',
  (() => {
    const weakest = Math.min(...STRENGTHS.map((one) => blurRadius(one.id, FILM)));
    return weakest >= 10;
  })(),
  'a face softened a little is a face, and on this one control the cost of'
  + ' being too gentle is somebody’s privacy'
  + ` — weakest is ${Math.min(...STRENGTHS.map((one) => blurRadius(one.id, FILM))).toFixed(1)}px`);

ok('  and the rungs really are three different strengths',
  (() => {
    const all = STRENGTHS.map((one) => blurRadius(one.id, FILM));
    return all.length === 3 && all[0] < all[1] && all[1] < all[2];
  })(),
  'three buttons that do the same thing are two buttons too many');

ok('  and a new patch starts on a rung that hides something',
  STRENGTH_DEFAULT !== STRENGTHS[0].id,
  'the first thing somebody does is add one and look, so the default has to'
  + ' be the answer rather than the gentlest guess');

/* ── 3. The draw itself, through a context that writes it down ────────── */

interface Said { readonly what: string; readonly with?: unknown[] }

function spy(): { calls: Said[]; context: CanvasRenderingContext2D } {
  const calls: Said[] = [];
  const say = (what: string) => (...args: unknown[]) => { calls.push({ what, with: args }); };
  const context = {
    save: say('save'),
    restore: say('restore'),
    beginPath: say('beginPath'),
    rect: say('rect'),
    ellipse: say('ellipse'),
    clip: say('clip'),
    drawImage: say('drawImage'),
    set filter(value: string) { calls.push({ what: 'filter', with: [value] }); },
    get filter() { return ''; },
  } as unknown as CanvasRenderingContext2D;
  return { calls, context };
}

const PICTURE = { x: 160, y: 0, w: 1600, h: 1080 };
const SOURCE = { nodeName: 'VIDEO' } as unknown as CanvasImageSource;
const ONE: Patch = { id: 'a', at: { x: 0.5, y: 0.5 }, wide: 0.2, tall: 0.2, strength: 'misty' };

const run = (patch: Patch) => {
  const { calls, context } = spy();
  drawPatch(context, SOURCE, patch, FILM, PICTURE);
  return calls;
};

const drew = run(ONE);

ok('the patch is clipped before anything is drawn',
  (() => {
    const clips = drew.filter((one) => one.what === 'clip').length;
    const drawn = drew.findIndex((one) => one.what === 'drawImage');
    const lastClip = drew.map((one) => one.what).lastIndexOf('clip');
    return clips === 2 && drawn > lastClip;
  })(),
  'a blurred copy drawn before the clip is a blurred copy of the WHOLE frame'
  + ` over the whole film — ${drew.map((one) => one.what).join(' ')}`);

ok('  and the second clip is the picture, so the bars are never blurred',
  (() => {
    const at = drew.findIndex((one) => one.what === 'rect'
      && Array.isArray(one.with)
      && one.with[0] === PICTURE.x && one.with[1] === PICTURE.y
      && one.with[2] === PICTURE.w && one.with[3] === PICTURE.h);
    return at > 0;
  })(),
  '`filter: blur()` samples outside what it is given and outside is'
  + ' transparent, so a patch at the edge of the picture draws a pale smear'
  + ' onto the black band');

ok('  and a blur is actually set',
  drew.some((one) => one.what === 'filter'
    && typeof one.with?.[0] === 'string'
    && /^blur\(\d+(\.\d+)?px\)$/.test(one.with[0] as string)),
  'a patch that clips and draws with no filter is a patch that redraws the'
  + ' picture over itself, which is invisible and does nothing');

ok('  and the blurred copy is drawn with the PICTURE’s own geometry',
  (() => {
    const drawn = drew.find((one) => one.what === 'drawImage');
    return Array.isArray(drawn?.with)
      && drawn.with[1] === PICTURE.x && drawn.with[2] === PICTURE.y
      && drawn.with[3] === PICTURE.w && drawn.with[4] === PICTURE.h;
  })(),
  'drawn at the frame origin instead, the blurred pixels land somewhere other'
  + ' than over the thing they are hiding — so the viewer sees the patch AND'
  + ' the face, shifted'
  + ` — answered ${JSON.stringify(drew.find((one) => one.what === 'drawImage')?.with)}`);

ok('  and the state is put back, so the filter never reaches the caption',
  (() => {
    const saved = drew.findIndex((one) => one.what === 'save');
    const back = drew.map((one) => one.what).lastIndexOf('restore');
    return saved === 0 && back === drew.length - 1;
  })(),
  'a filter left set puts the words and the logo through the blur as well, and'
  + ' the one thing a blur must not touch is the text somebody has to read');

ok('a round patch is drawn round and a square one square',
  (() => {
    const round = run({ ...ONE, round: true });
    const square = run({ ...ONE, round: false });
    return round.some((one) => one.what === 'ellipse')
      && !square.some((one) => one.what === 'ellipse');
  })(),
  'a face is round, and a square patch over a round thing is a square patch'
  + ' somebody has to make bigger than the thing to cover it');

ok('  and a patch with no size at all draws nothing',
  (() => {
    const { calls, context } = spy();
    drawPatch(context, SOURCE, ONE, { width: 0, height: 0 }, PICTURE);
    return calls.length === 0;
  })(),
  'a frame of no size is a frame before the first measurement, and a draw into'
  + ' it throws');

/* ── 4. Several patches, and none ─────────────────────────────────────── */

ok('every patch on a piece is drawn',
  (() => {
    const { calls, context } = spy();
    drawPatches(context, SOURCE, [ONE, { ...ONE, id: 'b' }, { ...ONE, id: 'c' }], FILM, PICTURE);
    return calls.filter((one) => one.what === 'drawImage').length === 3;
  })(),
  'two faces in a shot is the ordinary case');

ok('  and no patches is no work at all',
  (() => {
    const { calls, context } = spy();
    drawPatches(context, SOURCE, undefined, FILM, PICTURE);
    drawPatches(context, SOURCE, [], FILM, PICTURE);
    return calls.length === 0;
  })(),
  'this runs once per patch per FRAME, so a film with no patches must not pay'
  + ' anything for the feature existing');

ok('  and there is a ceiling on how many one piece may carry',
  (() => {
    const many = Array.from({ length: MOST_PATCHES + 4 }, (_, n) => ({ ...ONE, id: `p${n}` }));
    const { calls, context } = spy();
    drawPatches(context, SOURCE, many, FILM, PICTURE);
    return calls.filter((one) => one.what === 'drawImage').length === MOST_PATCHES;
  })(),
  'each one is a full-frame blurred redraw every frame, and twenty of them is'
  + ' a render that never finishes on a phone');

/* ── 5. The order in the film, and one radius for both pictures ───────── */

const stitch = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));
const editor = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const edit = withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'));

ok('the film draws the patches over the picture and under the words',
  (() => {
    const picture = stitch.indexOf('context.drawImage(video, box.x, box.y, box.w, box.h);');
    const patches = stitch.indexOf('drawPatches(context, video');
    const caption = stitch.indexOf('const words = (): void =>');
    const badge = stitch.indexOf('const badge = (): void =>');
    return picture > 0 && patches > picture && caption > patches && badge > patches;
  })(),
  'a blur is hers and a caption is ours, and softening our own text would be'
  + ' this control reaching past what it says it does');

ok('  and the glass uses the same radius function as the film',
  /blurRadius\(patch\.strength, shapeOf\(edit\)\) \* previewScale/.test(editor)
  && /drawPatches\(context, video/.test(stitch),
  'two places working out a radius is two places to disagree, and the'
  + ' disagreement is invisible until the render comes back');

ok('  and the glass scales it, because `blur()` is in device pixels',
  /\* previewScale/.test(editor),
  'the preview is about 300 wide and the film is 1080, so an unscaled radius'
  + ' is three times as strong on screen as in the file — the picture she'
  + ' approves is not the picture she gets');

ok('  and a patch belongs to the piece rather than to the film',
  /readonly blurs\?: readonly Patch\[\]/.test(edit)
  && /\.\.\.\(one\.blurs\?\.length \? \{ blurs: one\.blurs \} : \{\}\)/.test(edit),
  'the thing being hidden is in one shot; on the film it would blur the same'
  + ' square of every other shot as well');

/* ── 6. The room offers it where somebody who failed with the dial is ─── */

ok('the room offers a patch beside the dial that could not do it',
  (() => {
    /* The bench section, named exactly: `data-editorblur` with the tag
       closing straight after it. Searching for the prefix finds
       `data-editorblurglass` first, which is the overlay up on the preview
       and sits EARLIER in the file than the dials — so the first version of
       this was red on correct code. */
    const dials = editor.indexOf('data-editoradjust>');
    const patch = editor.indexOf('data-editorblur>');
    return dials > 0 && patch > dials;
  })(),
  'somebody who has just tried to hide a face with the whole-frame dial is'
  + ' standing in front of it');

ok('  and it says what the two are for',
  /blur\.none/.test(editor) && /different job/.test(editor),
  'a room with two blurs in it and no sentence about the difference is a room'
  + ' where somebody uses the wrong one on a face');

ok('  and a patch can be dragged onto the thing and taken off again',
  /data-editorblurglass/.test(editor) && /data-editorblurdrop/.test(editor)
  && /dragOnFrame\(\s*event,/.test(editor),
  'a patch that cannot be moved is a patch in the middle of the frame');

ok('  and the corner handle keeps the shape rather than stretching it',
  /tall: Math\.max\(\s*PATCH_SMALLEST,/.test(editor) && /was\.tall \* ratio/.test(editor),
  '`grip` moves one number and the shape is two — scaling only the width'
  + ' turns a face into a letterbox on the first drag');

ok('  and a new patch is somewhere it can be seen and grabbed',
  (() => {
    const fresh = newPatch('x');
    const box = patchBox(fresh, FILM);
    return box.left > 0 && box.top > 0
      && box.left + box.width < FILM.width && box.top + box.height < FILM.height
      && fresh.wide >= PATCH_SMALLEST && fresh.wide <= PATCH_LARGEST;
  })(),
  'added in a corner it reads as nothing having happened');

console.log(bad === 0
  ? '\n  A patch is centred where it is dropped, blurs past recognisable at any\n'
    + '  resolution, covers exactly the pixels it is over, and the glass and the\n'
    + '  film work it out with one function.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
