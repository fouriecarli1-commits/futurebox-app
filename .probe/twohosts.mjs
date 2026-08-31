// Two people talking: what the screen promises before the button is pressed.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/twohosts.mjs
//
// The upstream call is mocked. That is deliberate and it is not the interesting
// half — `.probe/converse.mjs` runs the real function against a fake ElevenLabs
// and reads the requests it makes. What this checks is the half a person sees:
// that the counts are true, that a speaker nobody was cast for is *named* and
// their lines left out rather than handed to the first voice, and that what
// arrives back becomes the episode draft.

import { chromium } from 'playwright';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));

let sent = null;
await page.route('**/api/dialogue', async (route) => {
  sent = JSON.parse(route.request().postData() ?? '{}');
  // A tiny but real WAV, so the player is exercised rather than a fixture.
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + 480, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(24000, 24); head.writeUInt32LE(48000, 28); head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(480, 40);
  await route.fulfill({ contentType: 'audio/wav', body: Buffer.concat([head, Buffer.alloc(480)]) });
});

await page.goto('http://127.0.0.1:3111/hostscheck', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#mounted')?.dataset.ready === 'yes');

const button = page.getByRole('button', { name: /make the conversation/i });
const script = page.locator('textarea');

// ── Nothing to say, nothing to press ───────────────────────────────────
say(await button.isDisabled(), 'the button is live with an empty script');

// ── Casting, then a script ─────────────────────────────────────────────
const pickers = page.locator('select');
say(await pickers.count() === 2, `expected two voice pickers, saw ${await pickers.count()}`);
await pickers.nth(0).selectOption('v-anre');
await pickers.nth(1).selectOption('v-carli');

await script.fill([
  'Anre: So what changed this year?',
  'Carli: Everything, and none of it at once.',
  '  And that is the part nobody expected.',
  'Anre: Say more.',
].join('\n'));

const body = () => page.locator('body').innerText();
{
  const text = await body();
  say(/Turns[^0-9]*3\b/.test(text), `the turn count is wrong: ${/Turns[^\n]*/.exec(text)?.[0]}`);
  // Three turns, the middle one being two lines joined into one paragraph.
  const chars = 'So what changed this year?'.length
    + 'Everything, and none of it at once. And that is the part nobody expected.'.length
    + 'Say more.'.length;
  say(new RegExp(`Characters[^0-9]*${chars}\\b`).test(text), `the character count is wrong: ${/Characters[^\n]*/.exec(text)?.[0]}`);
  say(/\/\s*6000/.test(text), 'the plan\'s limit is not shown beside what the script costs');
  say(!/Passes/.test(text), 'a short script claims to need more than one pass');
  say(!/Nobody is cast/i.test(text), 'a fully cast script reports somebody uncast');
  say(await button.isEnabled(), 'a cast script with turns in it cannot be made');
}

// ── A speaker nobody was cast for is named, not guessed at ─────────────
await script.fill('Anre: Hello.\nGuest: Hello back.\nAnre: Goodbye.');
{
  const text = await body();
  say(/Nobody is cast as/i.test(text), 'an uncast speaker passed without a word said about it');
  say(/Guest/.test(text), 'the uncast speaker is not named, so nobody knows what to fix');
  say(/left out/i.test(text), 'it does not say what happens to those lines');
  say(/Turns[^0-9]*2\b/.test(text), 'the uncast line was counted as a turn, so it went to somebody else\'s voice');
}

// ── A long script says how many passes it takes ────────────────────────
await script.fill(`Anre: ${'A sentence about the future. '.repeat(90)}\nCarli: And another.`);
{
  const text = await body();
  say(/Passes[^0-9]*[2-9]/.test(text), `a script well over their cap claims one pass: ${/Passes[^\n]*/.exec(text)?.[0]}`);
  say(/Characters[^0-9]*2[0-9]{3}/.test(text), 'the character count does not reflect a long script');
}

// ── Over the plan is refused here rather than upstream ─────────────────
await script.fill(`Anre: ${'word '.repeat(1400)}`);
{
  say(await button.isDisabled(), 'a script over the plan\'s limit can still be sent, to be refused upstream');
}

// ── And a real one goes, and comes back as the draft ───────────────────
await script.fill('Anre: So what changed this year?\nCarli: Everything, and none of it at once.');
await button.click();
await page.waitForFunction(() => Number(document.querySelector('#mounted')?.dataset.got) > 0, { timeout: 10000 })
  .catch(() => say(false, 'the finished conversation never reached the episode draft'));

say(sent !== null, 'nothing was sent');
say(Array.isArray(sent?.turns) && sent.turns.length === 2, `sent ${sent?.turns?.length} turns for two lines`);
say(sent?.turns?.[0]?.voiceId === 'v-anre', 'the first turn went in the wrong voice');
say(sent?.turns?.[1]?.voiceId === 'v-carli', 'the second turn went in the wrong voice');
say(!/Anre:/.test(sent?.turns?.[0]?.text ?? ''), 'the speaker\'s name was sent as part of what they say');

const player = page.locator('audio');
say(await player.count() === 1, 'there is nothing to listen to afterwards');
say(await page.locator('#mounted').getAttribute('data-upgrades') === '0', 'a successful run asked somebody to upgrade');

await browser.close();

if (problems.length) {
  console.error(`twohosts: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('twohosts: the counts are true, an uncast speaker is named rather than given a voice, and the result becomes the draft');
