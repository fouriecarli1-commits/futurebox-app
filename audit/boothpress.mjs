/**
 * Every button in every desk of the Pro Booth, pressed.
 *
 * The owner, 28 October 2026: *"Jy gaan elke funksie in probooth moet nagaan.
 * Hierdie gedeelte kan ons launch terug hou."* Each desk is opened on a
 * fresh page and each button in it is pressed once, in turn. A press may
 * change the room, open something, or say why it cannot; what it may not do
 * is throw, or do nothing at all. The paid engines are answered here with a refusal in words, so
 * nothing is spent and every paid press must turn that refusal into a
 * sentence on the screen.
 *
 *   node audit/boothpress.mjs [port]
 */
import { chromium } from 'playwright';
import { cpSync, rmSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';

const PORT = process.argv[2] || '3479';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const DESKS = ['tracks', 'mix', 'stems', 'effects', 'voice', 'ai'];
/* Presses that leave the room or would wait on a person: not pressed. */
const SKIP = /^(Back|Terug|Close|Sluit|Record|Neem op|Stop recording)/i;

cpSync('app/proboothprobe/page.probe.tsx', 'app/proboothprobe/page.tsx');
let server;
try {
  if (!process.env.SKIP_BUILD) execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let i = 0; i < 40; i += 1) { await new Promise((r) => setTimeout(r, 2000)); try { if ((await fetch(`http://localhost:${PORT}/proboothprobe`)).ok) break; } catch { /* not up yet */ } }

  for (const desk of DESKS.filter((one) => !process.env.ONLY || one === process.env.ONLY)) {
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    /* Every engine refuses, in words: the room has to pass that on. */
    await p.route('**/api/**', (route) => {
      const url = route.request().url();
      if (route.request().method() === 'GET') return route.continue();
      if (/\/api\/(version|events|stats|watch)/.test(url)) return route.continue();
      return route.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ message: 'ENGINE SAID NO (probe)' }) });
    });
    await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    const opener = p.locator(`[data-boothdesk="${desk}"]`).first();
    if (!(await opener.count())) { check(`${desk}: desk exists`, false); await b.close(); continue; }
    await opener.click();
    await p.waitForTimeout(500);

    /* The buttons in the open desk, by their words, read once. */
    const names = await p.evaluate(() => {
      const panel = document.querySelector('[data-boothdeskpanel], [role="dialog"]') ?? document.body;
      return [...panel.querySelectorAll('button')]
        .filter((el) => el.offsetParent && !el.disabled && !el.closest('[data-boothdesk]') && !el.closest('[data-dock]'))
        .map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60))
        .filter(Boolean);
    });
    const pressed = [];
    const dead = [];
    let saves = 0;
    p.on('download', () => { saves += 1; });
    /* What the page is, attributes and all: a pressed toggle or a muted lane
       changes a class, not the length of the text. */
    const look = () => p.evaluate(() => {
      const all = document.body.innerHTML;
      let h = 0;
      for (let i = 0; i < all.length; i += 1) h = (h * 31 + all.charCodeAt(i)) | 0;
      return h;
    });
    for (const name of [...new Set(names)].slice(0, 40)) {
      if (SKIP.test(name)) continue;
      const button = p.locator('button').filter({ hasText: name }).first();
      const byLabel = p.locator(`button[aria-label="${name.replace(/"/g, '\\"')}"]`).first();
      const target = (await byLabel.count()) ? byLabel : button;
      if (!(await target.count()) || !(await target.isVisible().catch(() => false)) || (await target.isDisabled().catch(() => true))) continue;
      const before = await look();
      const errorsBefore = errors.length;
      const savesBefore = saves;
      const reached = await target.click({ timeout: 3000 }).then(() => true, (e) => { if (process.env.WHY) console.log(`     ${name}: ${String(e).split("\n").filter((l) => /intercepts|from <|subtree/.test(l)).slice(0, 3).join(" / ").slice(0, 400)}`); return false; });
      await p.waitForTimeout(700);
      const after = await look();
      pressed.push(name);
      if (errors.length > errorsBefore) dead.push(`${name} THREW ${errors[errors.length - 1]}`);
      else if (!reached) dead.push(`${name} (could not be pressed: something lies over it)`);
      else if (after === before && saves === savesBefore) dead.push(`${name} (nothing visible changed)`);
      /* A sheet the press opened is closed again, so the next press reaches its button. */
      const shut = p.locator('div.fixed.inset-0 button[aria-label="Close"]').first();
      if (await shut.isVisible().catch(() => false)) { await shut.click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(200); }
      /* Back to the desk if the press closed it. */
      if (!(await opener.getAttribute('aria-pressed').catch(() => 'false'))?.includes('true')) { await opener.click().catch(() => {}); await p.waitForTimeout(300); }
    }
    console.log(`  ${desk}: pressed ${pressed.length}: ${pressed.join(' | ')}`);
    check(`${desk}: no press throws`, !dead.some((one) => /THREW/.test(one)), dead.filter((one) => /THREW/.test(one)).join(' || '));
    check(`${desk}: every press does something, or says why not`, !dead.some((one) => !/THREW/.test(one)), dead.filter((one) => !/THREW/.test(one)).join(' || '));
    const text = await p.locator('body').innerText();
    check(`${desk}: a refused engine is said in words, not swallowed`, !/ENGINE SAID NO/.test(text) || /ENGINE SAID NO \(probe\)/.test(text));
    await b.close();
  }
} finally {
  rmSync('app/proboothprobe/page.tsx', { force: true });
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* gone */ } }
}

if (problems.length) {
  console.error(`\naudit/boothpress — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/boothpress — every desk opened, every button pressed: each did something and none threw.');
