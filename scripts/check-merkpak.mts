/**
 * A brand pack is a folder, and nothing in it is ever thrown away.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek dink ook daar moet 'n brand pack wees. Iemand
 * moet 'n folder kan hê met hulle brand goed op."*
 *
 * There was one. It held a name, a line about the voice, **one** picture and
 * **one** colour — and a business has a logo, a wordmark, a white version of
 * the logo for a dark poster and a photograph of the shop front. "Whichever
 * one of those you last chose" is not a brand pack, and one colour cannot set
 * a title card AND the text on it.
 *
 * ── But the fault that matters is not the shape ───────────────────────────
 *
 * The pictures are references into `assets.ts`, which keeps **twenty** and
 * drops the oldest when a twenty-first arrives. The only thing it spared was
 * an asset somebody had starred — and **nothing starred a picture when it was
 * chosen as the brand logo.**
 *
 * So a logo set in September was being deleted in October by twenty ordinary
 * presses in the photo room. The pack then pointed at a file that did not
 * exist; the advert desk and the video desk each draw the logo only if they
 * find it, so both of them silently drew nothing. There was no error, no
 * warning, and no way for anybody to know it had happened except by noticing
 * their logo had stopped appearing on their adverts.
 *
 * That is why `droppable` was pulled out of `rememberAsset` and exported: the
 * decision that deletes somebody's logo is not a decision to hold with a
 * comment. This check hands it twenty-five pictures with a brand logo among
 * them and watches what survives.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { KEEP, droppable, type Asset } from '../app/lib/assets.ts';
import {
  EMPTY, MOST_COLOURS, MOST_PICTURES, heldIds, paletteOf, type BrandKit,
} from '../app/lib/brandkit.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const pic = (n: number, extra: Partial<Asset> = {}): Asset => ({
  id: `asset:${n}`,
  kind: 'picture',
  name: `picture ${n}`,
  mime: 'image/png',
  bytes: 1000,
  /* Oldest first by number, so "the oldest goes" is a thing this check can
     state rather than hope for. */
  createdAt: new Date(2026, 0, 1 + n).toISOString(),
  thumb: '',
  ...extra,
});

/* ── 1. The eviction, driven ──────────────────────────────────────────── */

const many = Array.from({ length: KEEP + 5 }, (_, n) => pic(n));

ok('a library over its ceiling drops exactly the overflow',
  droppable(many, []).length === 5,
  `${KEEP} is the ceiling and there are ${many.length}, so five have to go`
  + ` — answered ${droppable(many, []).length}`);

ok('  and it drops the oldest',
  (() => {
    const gone = droppable(many, []).map((one) => one.id);
    return gone.includes('asset:0') && !gone.includes(`asset:${KEEP + 4}`);
  })(),
  'dropping the newest would delete the picture somebody has just this second'
  + ' brought in');

ok('a picture the brand pack holds is never dropped',
  (() => {
    /* The oldest one of all, which is exactly the one that would go. */
    const gone = droppable(many, ['asset:0']).map((one) => one.id);
    return !gone.includes('asset:0') && gone.length === 5;
  })(),
  'a logo set in September was being deleted in October by twenty ordinary'
  + ' presses in the photo room, and both desks that read the pack drew'
  + ' nothing with no sign that anything had gone');

ok('  and holding one does not stop the library making room',
  droppable(many, ['asset:0']).length === 5,
  'sparing the logo by keeping one picture too many is a store that grows'
  + ' without limit, which is a promise about somebody else’s disk');

ok('  and a whole pack full of held pictures still cannot be evicted',
  (() => {
    const held = Array.from({ length: MOST_PICTURES }, (_, n) => `asset:${n}`);
    const gone = droppable(many, held).map((one) => one.id);
    return held.every((one) => !gone.includes(one));
  })(),
  'the folder holds up to eight and all eight are the brand');

ok('  and a starred picture is still spared as well',
  (() => {
    const starred = many.map((one) => (one.id === 'asset:1' ? { ...one, favourite: true } : one));
    return !droppable(starred, []).some((one) => one.id === 'asset:1');
  })(),
  'the star is a person’s own answer to the same question and it worked'
  + ' before this change');

ok('  and a library under the ceiling drops nothing at all',
  (() => {
    /* WELL under, not exactly at it. The first version of this used exactly
       `KEEP`, which is `over === 0` — and `slice(0, 0)` is empty whether or
       not the guard above it is there, so it passed with the guard removed.
       Five under is `over === -5`, and `slice(0, -5)` is "all but the last
       five", which would delete ten of fifteen pictures. Found by taking the
       guard out and watching this stay green. */
    const few = many.slice(0, KEEP - 5);
    return droppable(few, ['asset:0']).length === 0
      && droppable(many.slice(0, KEEP), []).length === 0
      && droppable([], []).length === 0;
  })(),
  'a negative overflow handed to `slice` is not nothing, it is "all but the'
  + ' last few" — so the failure here is not a deletion that was not needed,'
  + ' it is most of somebody\u2019s pictures');

/* ── 2. What the pack is holding ──────────────────────────────────────── */

ok('the held list carries the folder and the logo both',
  (() => {
    const kit: BrandKit = {
      ...EMPTY, logoAssetId: 'a', pictureIds: ['b', 'c'],
    };
    const held = heldIds(kit);
    return held.includes('a') && held.includes('b') && held.includes('c');
  })(),
  'a kit saved before the folder existed has a logo and NO folder, and losing'
  + ' that logo to make the shapes tidy would be this change taking something'
  + ' away');

ok('  and names nothing twice',
  heldIds({ ...EMPTY, logoAssetId: 'a', pictureIds: ['a', 'a', 'b'] }).length === 2,
  'a duplicate is harmless here and a sign the two lists are not being'
  + ' reconciled anywhere else either');

ok('  and an empty pack holds nothing',
  heldIds(EMPTY).length === 0,
  'an empty pack that claimed to hold something would spare a picture at'
  + ' random forever');

/* ── 3. The folder and the palette are plural ─────────────────────────── */

ok('the folder holds more than one picture',
  MOST_PICTURES > 1,
  '"whichever one of those you last chose" is not a brand pack');

ok('  and is capped, because a reference list is not free to draw',
  MOST_PICTURES <= 12 && MOST_COLOURS <= 8,
  'a pack of two hundred references is a pack that cannot be drawn');

ok('  and the palette reads a kit of either shape, main colour first',
  (() => {
    const old = paletteOf({ ...EMPTY, colour: '#111111' });
    const now = paletteOf({ ...EMPTY, colour: '#111111', colours: ['#111111', '#222222'] });
    return old.length === 1 && old[0] === '#111111'
      && now.length === 2 && now[0] === '#111111';
  })(),
  'every pack saved before there were several colours has one, and a reader'
  + ' that only knows about the list would show those packs no colour at all');

ok('  and never more colours than it is allowed',
  paletteOf({
    ...EMPTY, colour: '#000000',
    colours: Array.from({ length: 20 }, (_, n) => `#0000${String(n % 10)}${String(n % 10)}`),
  }).length <= MOST_COLOURS,
  'a palette read out of storage is a palette somebody else may have written');

/* ── 4. The room, and the one thing it must say ───────────────────────── */

const panel = withoutComments(readFileSync('app/components/BrandKit.tsx', 'utf8'));
const store = withoutComments(readFileSync('app/lib/assets.ts', 'utf8'));

ok('the eviction asks the pack rather than a flag copied onto the asset',
  /droppable\(next, heldIds\(loadBrandKit\(\)\)\)/.test(store),
  'two places recording "this one matters" is two places to be wrong about'
  + ' it, and the pack is already the one place that knows');

ok('the folder can be added to, starred and emptied',
  /data-kitfolder/.test(panel) && /data-kitlogo=/.test(panel) && /data-kitdrop=/.test(panel),
  'a folder you cannot take a picture out of is a folder that fills up with'
  + ' the wrong logo');

ok('  and taking the logo out takes the star with it',
  /logoAssetId: undefined/.test(panel),
  'a pack holding a logo it no longer has in its folder is the dangling'
  + ' reference this whole change exists to stop');

ok('  and a reference whose file has gone says so',
  /data-kitgone/.test(panel) && /kit\.gone/.test(panel),
  'it should not happen any more, and a pack made before the eviction was'
  + ' fixed may still be carrying one — an empty square says nothing');

ok('  and the colours are a palette with an add and a remove',
  /data-kitcolouradd/.test(panel) && /data-kitcolourdrop=/.test(panel),
  'one colour was being asked to set a title card and the text on it');

ok('  and the room says the folder is never emptied to make room',
  /kit\.folderNote/.test(panel),
  'the whole repair is invisible, so the sentence is the only way anybody'
  + ' knows their logo is safe now');

console.log(bad === 0
  ? '\n  The brand pack is a folder with a palette, and the picture library can\n'
    + '  no longer throw away the logo to make room for a snapshot.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
