/**
 * How the probes find a browser, including where they cannot run it.
 *
 * ── Why this is worth a test of its own ──────────────────────────────────
 *
 * Sixty-one probes carried one line: the absolute path to Chromium on the
 * machine they were written on. It is nowhere on a CI runner, so every one of
 * them failed there on the first line — with a path error, which reads like
 * the app being broken rather than like the browser being missing. That is
 * the whole reason fourteen click-through probes had never run anywhere but
 * one laptop.
 *
 * The fix is small and its important half is unobservable from here: when no
 * browser is at any known path, say nothing and let Playwright use the one it
 * installed. On this machine a browser is always at the pinned path, so that
 * branch never runs — which is exactly why it is asserted rather than tried.
 */
import { candidates, launchOptions } from '../audit/where.mjs';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const nowhere = () => false;
const everywhere = () => true;

/* ── The case this whole change exists for ─────────────────────────────── */
const onCI = launchOptions({}, nowhere, {});
check('with no browser at any known path, no path is given at all',
  !('executablePath' in onCI), JSON.stringify(onCI));
check('and Playwright is left to find its own', Object.keys(onCI).length === 0, JSON.stringify(onCI));

/* ── And the case that runs every day here ─────────────────────────────── */
const here = launchOptions({}, (one: string) => one === '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', {});
check('a browser at the pinned path is used',
  here.executablePath === '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', here.executablePath ?? 'none');

/* ── The environment wins, because a machine that sets it has said so ──── */
const told = launchOptions({}, everywhere, { PLAYWRIGHT_CHROMIUM: '/somewhere/chrome' });
check('PLAYWRIGHT_CHROMIUM is preferred over anything guessed',
  told.executablePath === '/somewhere/chrome', told.executablePath ?? 'none');
const rooted = launchOptions({}, everywhere, { PLAYWRIGHT_BROWSERS_PATH: '/browsers' });
check('and PLAYWRIGHT_BROWSERS_PATH is looked inside',
  told.executablePath !== rooted.executablePath && String(rooted.executablePath).startsWith('/browsers'),
  rooted.executablePath ?? 'none');
/* Set but pointing at nothing is not a reason to give up: the guesses under
   it still get their turn, which is what makes this safe to set loosely. */
const wrong = launchOptions({}, (one: string) => one.startsWith('/opt/'), { PLAYWRIGHT_CHROMIUM: '/gone/chrome' });
check('a hint that points at nothing falls through to the guesses',
  String(wrong.executablePath).startsWith('/opt/'), wrong.executablePath ?? 'none');

/* ── What a probe adds is never lost ───────────────────────────────────── */
const withArgs = launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }, nowhere, {});
check('a probe’s own arguments survive when there is no path',
  Array.isArray(withArgs.args) && withArgs.args.length === 1, JSON.stringify(withArgs));
const both = launchOptions({ args: ['--x'] }, everywhere, {});
check('and when there is one', Boolean(both.executablePath) && Array.isArray(both.args));

check('there is more than one place looked at', candidates({}).length >= 2, `${candidates({}).length}`);

/* ── And nothing may go back to carrying the path by hand ──────────────── */
import { readFileSync, readdirSync } from 'node:fs';
const pinned = readdirSync('audit')
  .filter((one) => one.endsWith('.mjs') && one !== 'where.mjs')
  .filter((one) => /executablePath:\s*'/.test(readFileSync(`audit/${one}`, 'utf8')));
check('no probe carries a browser path of its own', pinned.length === 0, pinned.join(', ') || 'none');

if (failures) {
  console.error(`\ncheck:launch — ${failures} failure(s). The probes will not run off this machine.\n`);
  process.exit(1);
}
console.log('\ncheck:launch — the probes find a browser here, and ask for none where they must not.');
