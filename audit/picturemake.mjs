/**
 * Make a picture, walked: open it from the Photo Editor, choose, read back,
 * agree, four drafts, pick one, make it final, and put it in the editor.
 *
 * fal.ai is not called: `/api/picturemake` answers with four coloured
 * squares and then a finished one, the way it answers.
 *
 *   node audit/picturemake.mjs [port] [shot-folder]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3495');
const folder = process.argv[3] || '';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
const snap = async (name) => { if (folder) await page.screenshot({ path: `${folder}/${name}.png`, fullPage: false }); };

try {
  const asked = [];
  await page.route('**/api/picturemake', async (route) => {
    const body = route.request().postDataJSON();
    asked.push(body);
    const square = (colour) => page.evaluate((c) => {
      const el = document.createElement('canvas');
      el.width = 256; el.height = 256;
      const x = el.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 256, 256);
      return el.toDataURL('image/png');
    }, colour);
    if (body.step === 'draft') {
      const urls = [await square('#e74c3c'), await square('#3498db'), await square('#2ecc71'), await square('#f1c40f')];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', urls, credits: 2 }) });
    }
    /* Slow on purpose: the sheet is shut while this is under way. */
    const url = await square('#9b59b6');
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url, credits: 3 }) });
  });

  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  const open = page.locator('[data-postmakeopen]');
  check('the first card offers to make one with AI, with its price', (await open.count()) === 1 && /credits/.test(await open.innerText()), await open.innerText().catch(() => ''));
  await open.click();
  await page.waitForTimeout(500);
  check('  and opens the studio', (await page.locator('[data-makestudio]').count()) === 1);
  check('six things to make, eight looks, five moods',
    (await page.locator('[data-makekind]').count()) === 6 && (await page.locator('[data-makelook]').count()) === 8 && (await page.locator('[data-makemood]').count()) === 5);
  await page.locator('[data-makekind="poster"]').click();
  await page.locator('[data-makelook="neon"]').click();
  await page.locator('[data-makemood="dark"]').click();
  check('  nothing can be made without an idea', await page.locator('[data-makedraft]').isDisabled());
  const firstIdeas = await page.locator('[data-ideachip]').allInnerTexts();
  await page.locator('[data-idearefresh]').click();
  await page.waitForTimeout(200);
  const nextIdeas = await page.locator('[data-ideachip]').allInnerTexts();
  check('the round button deals new ideas, none of the ones shown before',
    nextIdeas.length === firstIdeas.length && nextIdeas.every((one) => !firstIdeas.includes(one)), `${firstIdeas} → ${nextIdeas}`);
  await page.locator('[data-ideachip]').first().click();
  await page.waitForTimeout(200);
  const back = await page.locator('[data-makereadback]').innerText().catch(() => '');
  check('a tapped idea fills the box, and the studio says back what will be made', /Poster/.test(back) && /Neon/.test(back) && /Dark/.test(back), back.replace(/\s+/g, ' '));
  await snap('make-choose');
  const draftLabel = await page.locator('[data-makedraft]').innerText();
  check('  the drafts button says its price', /four drafts/i.test(draftLabel) && /2 credits/.test(draftLabel), draftLabel);
  await page.locator('[data-makedraft]').click();
  await page.waitForTimeout(400);
  check('  the first time, it asks the two yeses and sends nothing', (await page.locator('[data-becomeyes]').count()) === 1 && asked.length === 0);
  await page.locator('[data-becomeabroad]').check();
  await page.locator('[data-becomeadult]').check();
  await page.locator('[data-becomeyesgo]').click();
  await page.waitForTimeout(1500);
  check('four drafts come back to pick from', (await page.locator('[data-makedraftpick]').count()) === 4);
  check('  asked with the choices, both yeses and the idea',
    asked[0]?.step === 'draft' && asked[0]?.kind === 'poster' && asked[0]?.look === 'neon' && asked[0]?.mood === 'dark' && asked[0]?.idea?.length > 5 && asked[0]?.abroad === true,
    JSON.stringify(asked[0]));
  await page.locator('[data-makedraftpick="2"]').click();
  await snap('make-drafts');
  const finalLabel = await page.locator('[data-makefinal]').innerText();
  check('  picking one offers to make it final, with its price', /final/i.test(finalLabel) && /3 credits/.test(finalLabel), finalLabel);
  await page.locator('[data-makefinal]').click();
  await page.waitForTimeout(300);
  check('  while it is made, the sheet says it can be shut', (await page.locator('[data-makeaway]').count()) === 1);
  /* The owner's walk: shut the sheet while it is still making. */
  await page.locator('[data-makestudio] button[aria-label="Close"]').click();
  await page.waitForTimeout(400);
  check('  and shutting it is allowed', (await page.locator('[data-makestudio]').count()) === 0);
  await page.waitForTimeout(3500);
  check('the final is made from the chosen draft', asked[1]?.step === 'final' && /^data:image\//.test(asked[1]?.draft ?? ''));
  const colour = await page.evaluate(() => {
    const c = document.querySelector('[data-postcanvas]');
    const d = c.getContext('2d').getImageData(Math.round(c.width / 2), Math.round(c.height / 2), 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  check('  and lands in the editor by itself, with the sheet shut', colour[2] > 150 && colour[0] > 120 && colour[1] < 110, String(colour));
  await snap('make-landed');
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-postmakebench]').click();
  await page.waitForTimeout(1200);
  check('opened again, the drafts and the finished picture are still there',
    (await page.locator('[data-makedraftpick]').count()) === 4 && (await page.locator('[data-makefinalshown]').count()) === 1
      && /poster/i.test(await page.locator('[data-makekind][aria-pressed="true"]').innerText().catch(() => '')));
  await snap('make-kept');
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/picturemake — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/picturemake — chosen from pictures, read back, four drafts, one finished, and in the editor.');
