import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

/** Half a second of quiet 8-bit mono, as a WAV. Stands in for a finished song. */
function tone() {
  const rate = 8000;
  const count = rate / 2;
  const body = Buffer.alloc(count, 128);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + count, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate, 28);
  head.writeUInt16LE(1, 32); head.writeUInt16LE(8, 34);
  head.write('data', 36); head.writeUInt32LE(count, 40);
  return Buffer.concat([head, body]);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));

// Four songs in the channel, and no trained sound yet.
let mine = [];
let posted = null;
await page.route('**/api/finetunes**', async (route) => {
  const request = route.request();
  if (request.method() === 'POST') {
    posted = request.postData() ?? '';
    mine = [{ id: 'ft-1', name: 'My own sound', genre: 'afro house', origin: 'channel', tracks: 3, status: 'pending' }];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(mine[0]) });
    return;
  }
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ configured: true, signedIn: true, keep: 3, mine }),
  });
});

await page.addInitScript((wav) => {
  const songs = ['Rooi Aand', 'Sonop', 'Loop Saam', 'Vier'].map((title, index) => ({
    id: `t${index}`, title, genre: 'afro house', bpm: 112, key: 'A Minor',
    lyrics: '', style: 'afro house', models: [], source: 'engine',
    seconds: 60, createdAt: new Date().toISOString(), seed: index,
  }));
  window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify(songs));
  // The audio itself, so picking a song actually has a file behind it.
  window.__seedAudio = async () => {
    const db = await new Promise((resolve, reject) => {
      const open = indexedDB.open('futurebox', 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains('audio')) open.result.createObjectStore('audio');
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('audio', 'readwrite');
      const bytes = Uint8Array.from(atob(wav), (c) => c.charCodeAt(0));
      for (const song of songs) tx.objectStore('audio').put(new Blob([bytes], { type: 'audio/wav' }), song.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  };
}, tone().toString('base64'));

await page.goto(`${base}/probe-sound`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__seedAudio());

say(await page.getByText('A sound of your own').count() > 0, 'the panel is missing');

await page.getByRole('button', { name: 'Train a sound' }).click();
await page.waitForTimeout(300);

const songs = page.locator('input[type="checkbox"]');
// Four songs plus the confirmation tick.
say(await songs.count() === 5, `expected 5 checkboxes, saw ${await songs.count()}`);

const trainButton = page.getByRole('button', { name: /^Train on/ });
say(await trainButton.isDisabled(), 'training was allowed with nothing picked');

// Two songs is under the floor: still refused.
await songs.nth(0).check();
await songs.nth(1).check();
await page.getByPlaceholder('What to call this sound').fill('My own sound');
await page.getByPlaceholder(/What kind of music/).fill('afro house');
await page.locator('input[type="checkbox"]').last().check();
await page.waitForTimeout(200);
say(await trainButton.isDisabled(), 'training was allowed with only two songs');

// A third makes it a sound.
await songs.nth(2).check();
await page.waitForTimeout(200);
say(!(await trainButton.isDisabled()), 'training was still refused with three songs and everything filled in');

await trainButton.click();
await page.waitForTimeout(1500);

say(Boolean(posted), 'nothing was posted to /api/finetunes');
if (posted) {
  for (const field of ['name', 'genre', 'origin', 'confirm', 'files']) {
    say(posted.includes(`name="${field}"`), `the post carried no ${field}`);
  }
  say(posted.includes('my-music'), 'the post carried no confirmation');
  say(posted.includes('channel'), 'the post did not say the songs came from the channel');
  const files = posted.split('name="files"').length - 1;
  say(files === 3, `expected 3 files in the post, saw ${files}`);
}

// And it now shows as training.
say(await page.getByText(/training…/).count() > 0, 'the new sound did not show as training');

await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
