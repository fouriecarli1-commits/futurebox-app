/**
 * The video editor's three asks of 14 October 2026, held.
 *
 * Carli: a clip tapped pops its options — cut, undo, and an AI wand that
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
  /const wandFrame[\s\S]{0,400}frameFrom\(node/.test(editor) && /setShotPic\(String\(reader\.result\)\)/.test(editor));
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

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
