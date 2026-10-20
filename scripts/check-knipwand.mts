/**
 * The video editor's three asks of 14 October 2026, held.
 *
 * The owner: a clip tapped pops its options — cut, undo, and an AI wand that
 * changes the frame; "Generate a sound" makes sound effects and music, not
 * only speech; and Your mark opens the brand pack.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CREDITS } from '../app/lib/credits.ts';
import { CAPABILITIES, SUPPLIERS } from '../app/lib/server/suppliers.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

const editor = code('app/components/VideoEditor.tsx');

/* ── 1. A clip, tapped ────────────────────────────────────────────────── */
ok('tapping a clip opens its menu', /data-editorblock[\s\S]{0,200}setClipMenu\(/.test(editor));
ok('  with cut, back and the AI wand',
  /data-editorclipcut/.test(editor) && /data-editorclipundo/.test(editor) && /data-editorclipwand/.test(editor));
ok('  drawn on the page, not inside the strip that scrolls and would clip it',
  /createPortal\(/.test(editor) && /data-editorclipmenu/.test(editor));
ok('  and it shuts when she taps elsewhere or the strip moves',
  /addEventListener\('pointerdown', away\)/.test(editor) && /addEventListener\('scroll', shut, true\)/.test(editor));
ok('the wand takes the frame she is looking at onto the shot bench',
  /const wandFrame[\s\S]{0,900}frameFrom\(node/.test(editor) && /setShotPic\(String\(reader\.result\)\)/.test(editor));
/* The owner, 20 October 2026: "Daai AI wand in video editor maak niks oop
   nie." When no frame can be read it still opens, with the starting ideas. */
ok('  and opens even when no frame can be read, rather than doing nothing',
  /if \(!shot\) \{[\s\S]{0,1200}?setShotPic\(null\)[\s\S]{0,800}?setWandOpen\(true\)/.test(editor));
ok('  and the shot bench is one panel in two places, not a copy',
  (editor.match(/\{shotPanel\}/g) ?? []).length === 2 && (editor.match(/data-editorshot /g) ?? []).length === 1);

/* ── 2. Sounds and music, not only speech ─────────────────────────────── */
const sound = code('app/components/MakeSound.tsx');
const effect = code('app/api/voice/effect/route.ts');
ok('Generate a sound offers a voice, a sound effect and music',
  /const KINDS: readonly SoundKind\[\] = \['voice', 'effect', 'music'\]/.test(sound) && /data-makesoundkind/.test(sound));
ok('  an effect goes to its own route, music to the music route as an instrumental',
  /fetch\('\/api\/voice\/effect'/.test(sound) && /fetch\('\/api\/music'[\s\S]{0,400}instrumental: true/.test(sound));
ok('  and the button shows the price of the kind chosen',
  /kind === 'effect'\s*\?\s*CREDITS\.sfx/.test(sound) && /songCost\(musicSeconds, engine\)/.test(sound));
ok('a sound effect has a price', typeof CREDITS.sfx === 'number' && CREDITS.sfx > 0, String(CREDITS.sfx));
ok('  and a supplier that serves it',
  CAPABILITIES.includes('sfx') && SUPPLIERS.some((one) => one.serves.includes('sfx')));
ok('the effect route screens, charges, and gives the credits back when it fails',
  /guard\(request, text/.test(effect)
    && /charge\(request, CREDITS\.sfx/.test(effect)
    && (effect.match(/paid\.refund\(\)/g) ?? []).length >= 2);
ok('  and it is braked and asks whether the supplier has room',
  /refuseIfTooMany\('voice-effect'/.test(effect) && /roomFor\(/.test(effect));

/* ── 3. The brand pack at Your mark ───────────────────────────────────── */
ok('Your mark opens the brand pack', /data-editorbrandpack[\s\S]{0,80}<BrandKit onChange=\{setKit\} compact/.test(editor));
ok('  and its logo goes on in one press', /data-editormarkbrand[\s\S]{0,400}assetDataUrl\(id\)/.test(editor));

/* ── 4. Zoom that zooms gradually, and a bigger picture at a desk ──────── */
ok('the picture is one measured size times the zoom, not a jump to the full width',
  /Math\.round\(baseWide \* zoom\)/.test(editor) && /Math\.round\(baseTall \* zoom\)/.test(editor)
  && !/width: `\$\{zoom \* 100\}%`/.test(editor));
ok('  and the picture is bigger at a desk', /onEdge \? 0\.62 : 0\.38/.test(editor));
ok('  and the + and - buttons step by a quarter', /Math\.round\(\(was \+ 0\.25\) \* 4\) \/ 4/.test(editor));

/* ── 5. The box says to type in it, and what the AI can do ─────────────── */
ok('the shot box is labelled "Type here"', /edit\.shotTypeChange/.test(editor) && /htmlFor="editor-shot-words"/.test(editor));
ok('  with suggestions of what the AI can do that write themselves in', /data-editorshotidea/.test(editor) && /SHOT_CHANGES/.test(editor));
ok('  and a microphone', /data-editorshotwords[\s\S]{0,900}<SpeakButton/.test(editor));

/* ── 6. Right-click and the keyboard, in every editor ─────────────────── */
const post = code('app/components/PostStudio.tsx');
const booth = code('app/components/ProBooth.tsx');
ok('the video editor answers Delete, Ctrl+C/V/X/Z and S',
  /addEventListener\('keydown'/.test(editor) && /key === 'delete'/.test(editor) && /key === 'v'/.test(editor));
ok('  and a right press on a clip opens its menu', /onContextMenu/.test(editor) && /data-editorclipmenu/.test(editor));
ok('the photo editor answers Delete, Ctrl+C/V/X/Z',
  /addEventListener\('keydown'/.test(post) && /dropChosen\(\)/.test(post) && /pasteCopied\(\)/.test(post));
ok('  and a right press on the photo opens a menu with cut, copy, paste, delete and undo',
  /onContextMenu/.test(post) && /data-postrightmenu/.test(post)
  && ['cut', 'copy', 'paste', 'delete', 'undo'].every((id) => new RegExp(`id: '${id}'`).test(post)));
ok('the booth answers Ctrl+Z/Y, Space and S', /addEventListener\('keydown'/.test(booth) && /now\.cutHere\(\)/.test(booth));
ok('  and none of them steal a key from a box being typed in',
  [editor, post, booth].every((one) => /closest\('input, textarea, select/.test(one)));

/* ── 7. Templates: text styles, motion, shapes and frames ─────────────────
   The owner, 14 October 2026: "Dan moet ons seker maak dat die cool text
   templates in die photo editor ook hierdie kant kom. Ons kort shapes,
   frames, en motion templates." And: "Die motion templates moet 'n
   simulator hê wanneer mens op dit kliek." */
const picker = code('app/components/VideoTemplatesPicker.tsx');
const stitch = code('app/lib/stitch.ts');
const model = code('app/lib/videoedit.ts');
const modal = code('app/components/StudioTemplatesModal.tsx');
const recorder = code('app/lib/templatevideo.ts');
ok('the video templates have five kinds: whole film, text styles, motion, shapes, frames',
  ['film', 'text', 'motion', 'shapes', 'frames'].every((id) => new RegExp(`id: '${id}'`).test(picker))
  && /data-editortpltab/.test(picker));
ok('  the text styles are the photo room\'s own', /TITLE_STYLES\.map/.test(picker) && /wordsStyleOf\(style\.title\)/.test(picker));
ok('  the shapes are the photo room\'s own', /MARK_SPECS\.map/.test(picker));
ok('  and a motion plays in a simulator before it goes on, by the function the film uses',
  /function MotionSimulator/.test(picker) && /motionAt\(motion, age\)/.test(picker) && /data-editormotionuse/.test(picker));
ok('the film renders the motion, the glow, the shapes and the frame',
  /motionAt\(set\?\.motion/.test(stitch) && /haloPasses\(glowOf\(set\.glow\)/.test(stitch)
  && /drawShape\(context, one, cut\.width, cut\.height\)/.test(stitch) && /drawFrame\(context, cut\.frame/.test(stitch));
ok('  and the words are drawn with the edge she chose, which the film was leaving out', /edge: up\.edge/.test(stitch));
ok('  carried from the edit by cutFrom',
  /motion: one\.wordsMotion/.test(model) && /glow: one\.wordsGlow/.test(model) && /frame: edit\.frame/.test(model) && /shapes: edit\.shapes/.test(model));
ok('  and a style\'s own colour is kept rather than read as a palette name', /one\.wordsInk\.startsWith\('#'\)/.test(model));
ok('the preview moves the words by the same function, and draws shapes and frame by the film\'s',
  /motionAt\(said\.wordsMotion/.test(editor) && /function FilmFurniture/.test(editor)
  && /drawShape\(ctx, one, wide, tall\)/.test(editor) && /drawFrame\(ctx, frame, wide, tall, frameInk\)/.test(editor));
ok('  and a shape on the picture can be dragged', /data-editorshapedrag/.test(editor) && /dragOnFrame\(event, \(spot\) => setEdit/.test(editor));
ok('a motion template plays in a simulator before it is chosen, drawn by the function that records it',
  /if \(moves\(tpl\)\) \{ setPreviewing\(tpl\); return; \}/.test(modal) && /drawTemplateFrame\(ctx, tpl, width, height, progress\)/.test(modal)
  && /drawTemplateFrame\(ctx, tpl, width, height, progress\);/.test(recorder));
ok('  and its words really move', /motionAt\('pop', seconds\)/.test(recorder) && /motionAt\('rise'/.test(recorder));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
