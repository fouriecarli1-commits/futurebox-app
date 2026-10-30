/**
 * Make a picture: the studio's table, its engines, its prices, and what
 * crosses from the phone.
 */
import { readFileSync } from 'node:fs';
import {
  DRAFT_CREDITS, DRAFT_MODEL, DRAFTS, FINAL_CREDITS, FINAL_MODEL, KINDS, LOOKS, MOODS,
  choiceOf, draftInput, finalInput, promptOf, readBack,
} from '../app/lib/picturemake.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('both engines are fal.ai\'s own models', DRAFT_MODEL.startsWith('fal-ai/') && FINAL_MODEL.startsWith('fal-ai/'));
ok('  and neither is a partner or not cleared (read 29 October 2026)', DRAFT_MODEL === 'fal-ai/flux/schnell' && FINAL_MODEL === 'fal-ai/flux-2/edit');
ok('priced by her rule, never under two', DRAFT_CREDITS >= 2 && FINAL_CREDITS >= 2);
ok('six things to make, eight looks, five moods', KINDS.length === 6 && LOOKS.length === 8 && MOODS.length === 5);
ok('no look names a studio or a living artist', LOOKS.every((one) => !/ghibli|disney|pixar|banksy|in the style of/i.test(one.says)));

const choice = choiceOf({ kind: 'cover', look: 'neon', mood: 'dark', idea: '  a fox on a rooftop  ' });
ok('only known ids cross from the phone, and the idea is trimmed', choice !== null && choice.idea === 'a fox on a rooftop'
  && choiceOf({ kind: 'nope', look: 'neon', mood: 'dark', idea: 'x' }) === null && choiceOf({ kind: 'cover', look: 'neon', mood: 'dark', idea: '  ' }) === null);
if (choice) {
  const draft = draftInput(choice);
  ok('four drafts in the shape of what is being made, answered in the call',
    draft.num_images === DRAFTS && DRAFTS === 4 && (draft.image_size as { width: number }).width === 1024 && draft.sync_mode === true && draft.enable_safety_checker === true);
  const final = finalInput(choice, 'data:image/png;base64,AAAA');
  ok('the final starts from the chosen draft, at about twice the pixels, within the model\'s 2048',
    Array.isArray(final.image_urls) && (final.image_urls as string[])[0] === 'data:image/png;base64,AAAA'
    && (final.image_size as { width: number }).width > 1024 && (final.image_size as { width: number }).width <= 2048);
  ok('the idea leads what the engine reads', promptOf(choice).startsWith('a fox on a rooftop'));
  ok('the read-back says the choices and the idea', /Album cover/.test(readBack(choice, (_k, f) => f)) && /a fox on a rooftop/.test(readBack(choice, (_k, f) => f)));
}

const route = withoutComments(readFileSync('app/api/picturemake/route.ts', 'utf8'));
ok('the route asks both yeses and screens the idea before anything is charged',
  /body\?\.abroad !== true \|\| body\?\.adult !== true/.test(route) && /guard\(request, choice\.idea, 'picture', caller\)[\s\S]*await charge\(/.test(route));
ok('  a draft sent back for finishing is looked at first', /screenPicture\(draft[\s\S]{0,200}await charge\(request, FINAL_CREDITS/.test(route));
ok('  and given back when the engine fails or sends nothing', (route.match(/paid\.refund\(\)/g) ?? []).length >= 2);
const studio = readFileSync('app/components/MakeStudio.tsx', 'utf8');
ok('the studio says each price on its button, and asks the yeses first',
  /creditsSaid\(DRAFT_CREDITS/.test(studio) && /creditsSaid\(FINAL_CREDITS/.test(studio) && /if \(!yes && !agreed\) \{ setAsking\(step\)/.test(studio));
ok('  and reads back what will be made before the press', /data-makereadback/.test(studio));
const kept = withoutComments(readFileSync('app/lib/madekeep.ts', 'utf8'));
ok('what was paid for outlives the sheet: the asking runs through startMaking, owned by the page', /await startMaking\(step,/.test(studio));
ok('  it is kept on the device before it is shown, and a finished picture is handed to the editor', /if \(outcome\.made\) await keepMade\(outcome\.made\);\s*if \(step === 'final' && outcome\.made\?\.final && deliver\) deliver\(outcome\.made\.final\)/.test(kept));
ok('  opened again, the sheet shows the last drafts and the finished one, or the making still under way', /underWay\(\)/.test(studio) && /lastMade\(\)\.then/.test(studio));

if (bad) {
  console.error(`\ncheck:picturemake — ${bad} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:picturemake — what to make, a look, a mood and an idea; read back; four drafts and a final, priced and screened.');
