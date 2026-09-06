/**
 * Where a screenshot goes.
 *
 * Every run wrote `audit/whatever.png`, which is relative to whatever
 * directory the process happened to start in. That is fine when a run is
 * launched from the project root and silently wrong when it is not: two
 * screenshots from these probes ended up inside an unrelated repository
 * checked out beside this one, where they were noticed only because a git
 * hook complained about untracked files.
 *
 * Resolved against this file instead, so a run writes next to its own probe
 * no matter where it was started from.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/** An absolute path inside `audit/`, whatever the working directory is. */
export function shot(name) {
  return join(HERE, name);
}

/**
 * How to launch the browser, wherever this is running.
 *
 * ── Why this is not a constant ───────────────────────────────────────────
 *
 * Sixty-one probes carried the same line:
 *
 *     executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
 *
 * That is where the browser lives on the machine these were written on, and
 * it is nowhere on a CI runner. It was the single reason none of these
 * fourteen click-through probes could run anywhere but here — every one of
 * them would have failed on the first line with a path error, which reads
 * like the app being broken rather than like the browser being missing.
 *
 * Resolved rather than pinned: use the path if a browser is actually at it,
 * and otherwise say nothing and let Playwright find the one it installed.
 * `PLAYWRIGHT_BROWSERS_PATH` is honoured first, because a machine that has
 * set it has said where it keeps them.
 */
import { existsSync } from 'node:fs';

/** Where a browser might be, best guess first. */
export function candidates(env = process.env) {
  return [
    env.PLAYWRIGHT_CHROMIUM,
    env.PLAYWRIGHT_BROWSERS_PATH
      ? join(env.PLAYWRIGHT_BROWSERS_PATH, 'chromium-1194/chrome-linux/chrome')
      : null,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome',
  ].filter(Boolean);
}

/**
 * What to hand `chromium.launch`.
 *
 * Merged with whatever else a probe wants, so a probe that needs
 * `--autoplay-policy=no-user-gesture-required` still says so itself.
 *
 * Named `launchOptions` rather than `browser` because sixty-one probes
 * already hold the instance in a variable called `browser`, and the first
 * version of this shadowed it in every one of them.
 *
 * `look` and `env` are arguments so the case this exists for can be tested.
 * The behaviour that matters — no browser at any known path, so say nothing
 * and let Playwright use the one it installed — is by definition the one that
 * never happens on the machine where this was written, and it is the one the
 * whole change is for.
 */
export function launchOptions(extra = {}, look = existsSync, env = process.env) {
  const found = candidates(env).find((one) => look(one));
  return { ...(found ? { executablePath: found } : {}), ...extra };
}
