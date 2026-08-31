// Posting a track: what is offered, and what it honestly claims.
//
//   node .probe/share.mjs
//
// The failure mode worth preventing is a button labelled "Post to TikTok" that
// opens a tab and does nothing else. Every platform here has a real URL, and
// only the one that can carry text is told to.

import { PLATFORMS, FUTUREBOX_TAG } from '../app/data/social.ts';
import { buildCaption, shareUrlFor, platformById } from '../app/lib/social.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');

// ── Every platform points somewhere real ───────────────────────────────
say(PLATFORMS.length >= 4, `${PLATFORMS.length} platforms`);
for (const one of PLATFORMS) {
  say(/^https:\/\//.test(one.composerUrl), `${one.name}'s composer is not a real URL: ${one.composerUrl}`);
  say(/\{handle\}/.test(one.profileUrl), `${one.name}'s profile URL has nowhere to put a handle`);
  say(platformById(one.id) === one, `${one.name} cannot be looked up by id`);
  say(
    one.shareIntent === null || /\{text\}/.test(one.shareIntent),
    `${one.name} claims a share intent with nowhere to put the text`,
  );
}

// Exactly one can carry the text. If that ever changes, the tick beside it in
// the UI is a promise the others do not keep.
const carriers = PLATFORMS.filter((one) => one.shareIntent);
say(carriers.length === 1, `${carriers.length} platforms claim to carry text — the UI marks one`);
say(carriers[0]?.id === 'x', `the carrier is ${carriers[0]?.id}, not X`);

// ── The caption is built, credits FutureBox, and carries the tags ──────
const caption = buildCaption('Fall Forward\nA song I made on FutureBox.', ['newmusic', 'amapiano'], {
  creditFuturebox: true,
});
say(caption.includes('Fall Forward'), 'the title is not in the caption');
say(caption.includes(FUTUREBOX_TAG), 'the caption does not credit FutureBox');
say(caption.includes('#newmusic') && caption.includes('#amapiano'), 'the hashtags did not make it');

// The carrier's URL has to actually contain the caption, encoded.
const url = shareUrlFor(carriers[0], caption);
say(url.includes(encodeURIComponent('Fall Forward')), 'the share URL does not carry the caption');
// And a non-carrier must fall back to its composer rather than pretending.
const other = PLATFORMS.find((one) => !one.shareIntent);
say(shareUrlFor(other, caption) === other.composerUrl, `${other.name} pretends to carry the text`);

// ── The screen says what it does not do ────────────────────────────────
const row = await read('../app/components/ShareRow.tsx');
say(/uploads for you|uploads anything/i.test(row), 'the row never says it does not upload');
// Comments stripped: the file warns against exactly this phrasing, and a grep
// that cannot tell a warning from the thing it warns about fails on its own
// documentation. Second time this has come up in this repo, so it is now the
// default shape for a source check.
const rowCode = row.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
say(!/Post to (TikTok|Instagram|YouTube)/i.test(rowCode), 'a button claims to post to a platform directly');

// ── And it is where a finished thing is, not only in one panel ─────────
for (const [file, where] of [
  ['../app/components/Hooks.tsx', 'hooks'],
  ['../app/components/Channel.tsx', 'your channel'],
]) {
  say(/ShareRow/.test(await read(file)), `nothing to post from in ${where}`);
}

console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : `PASS — ${PLATFORMS.length} platforms, one that carries the text and says so, and nothing claiming to upload`,
);
process.exit(problems.length ? 1 : 0);
