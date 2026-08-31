import { chromium } from 'playwright';
const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };

let threads = [
  { id: 't-1', state: 'asked', because: 'same tempo, one step apart in key', mine: false, name: 'Thabo', handle: '@thabo', createdAt: new Date().toISOString() },
  { id: 't-2', state: 'asked', because: '', mine: true, name: 'Lerato', handle: '@lerato', createdAt: new Date().toISOString() },
];
let messages = [];
let posted = [];
let answered = null;
let askedWith = null;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
await page.addInitScript(() => window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([
  { id: 'song-1', title: 'Rooi Aand', genre: 'afro house', bpm: 112, key: 'A Minor', lyrics: '', style: '', models: [], source: 'engine', seconds: 60, createdAt: new Date().toISOString(), seed: 1 },
])));

await page.route('**/api/collab/messages**', async (route) => {
  const r = route.request();
  if (r.method() === 'POST') {
    const sent = JSON.parse(r.postData() ?? '{}');
    posted.push(sent);
    const said = { id: messages.length + 1, mine: true, body: sent.body ?? '', trackId: sent.trackId, at: new Date().toISOString() };
    messages.push(said);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(said) });
  }
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ messages }) });
});
await page.route('**/api/collab', async (route) => {
  const r = route.request();
  if (r.method() === 'PATCH') {
    answered = JSON.parse(r.postData() ?? '{}');
    threads = threads.map((t) => (t.id === answered.id ? { ...t, state: answered.answer } : t));
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: answered.id, state: answered.answer }) });
  }
  if (r.method() === 'POST') {
    askedWith = JSON.parse(r.postData() ?? '{}');
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 't-3', state: 'asked' }) });
  }
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ signedIn: true, threads }) });
});

await page.goto(`${base}/probe-collab`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

let text = await page.locator('body').innerText();
say(/Somebody wants to work with you/.test(text), 'a request waiting on me was not shown first');
say(text.includes('same tempo'), 'the reason for the match was not carried into the request');
say(/Asked, waiting/.test(text) && text.includes('Lerato'), 'a request I sent was not shown as waiting');
// The note under the heading says "drop a song into it", so a substring is no
// test. The writing box only exists inside an open room.
say(await page.getByPlaceholder('Write something…').count() === 0,
  'the room was open before anything was accepted');

// Accept it.
await page.getByRole('button', { name: 'Accept' }).click();
await page.waitForTimeout(800);
say(answered?.answer === 'accepted', `accepting sent ${JSON.stringify(answered)}`);

text = await page.locator('body').innerText();
say(await page.getByPlaceholder('Write something…').count() === 1,
  'the room did not open after accepting');

// Say something.
await page.getByPlaceholder('Write something…').fill('hello, want to try a remix?');
await page.getByRole('button', { name: 'Send' }).click();
await page.waitForTimeout(600);
say(posted.some((p) => p.body === 'hello, want to try a remix?'), 'the message did not send');
text = await page.locator('body').innerText();
say(text.includes('want to try a remix'), 'a sent message did not appear at once');

// Drop a song in.
await page.getByRole('button', { name: /Rooi Aand/ }).click();
await page.waitForTimeout(600);
const withTrack = posted.find((p) => p.trackId);
say(withTrack?.trackId === 'song-1', `dropping a song sent ${JSON.stringify(withTrack)}`);
say(!('audio' in (withTrack ?? {})) && !('file' in (withTrack ?? {})), 'audio travelled with the message');

// Ask somebody new.
await page.getByRole('button', { name: 'Ask to work together' }).first().click();
await page.waitForTimeout(600);
say(askedWith?.handle === '@thabo', `asking sent ${JSON.stringify(askedWith)}`);
say(typeof askedWith?.because === 'string' && askedWith.because.length > 0, 'the request carried no reason');

// Somebody with no handle cannot be asked, so no button is drawn for them.
say(await page.getByRole('button', { name: 'Ask to work together' }).count() === 1,
  'a button was drawn for somebody with no handle to send it to');

await page.screenshot({ path: '/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad/collab.png' });
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
