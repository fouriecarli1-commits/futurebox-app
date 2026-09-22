/**
 * Real art, offered where somebody is thinking about a cover.
 *
 * Carli, 22 September 2026: *"Kyk asb in make a song en channel dat daar by
 * cover art 'n opsie is vir real art."*
 *
 * ── Why this is walked and not read ──────────────────────────────────────
 *
 * `check:realart` reads the source and proves the parts are wired: the panel
 * draws a door, both rooms hand it somewhere to go, the studio sends the room
 * and the song, the gallery takes `for_song`. Every one of those can be true
 * while nothing happens, because what has to work is a sequence across a
 * room change — a button in a panel inside a card, a room that is swapped for
 * another one, and a value handed to a component that does not exist yet.
 *
 * That last step is exactly what failed for her twice this month, in the
 * adverts desk and again coming back from the till. Both times the source
 * read correctly. So this presses the button.
 *
 * ── What is stubbed ──────────────────────────────────────────────────────
 *
 * Two things, and nothing else:
 *
 *   · `/api/cover`, because whether a song already HAS a cover decides which
 *     half of the panel draws, and both halves have to offer this. Asking the
 *     real route would spend credits and answer the same way twice.
 *   · `/api/artmarket`, because an unattended project has nothing hanging and
 *     this has to land in a room with a wall in it.
 *
 * The library is seeded into the same localStorage key the app writes, which
 * is not a stub — it is the app's own storage with a song already in it.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = Number(process.argv[2] || 3161);

/* One song, made by the engine rather than brought in: the channel hides
   Cover art on an uploaded file on purpose, so a probe seeded with an upload
   would look for a button the app is right not to draw. */
const SONG = {
  id: 'realart-1',
  title: 'Stof oor die Karoo',
  genre: 'Amapiano',
  bpm: 112,
  key: 'A Minor',
  lyrics: '[Verse 1]\nDie eerste reël\n',
  style: 'warm, late night',
  models: ['Backing'],
  source: 'engine',
  seconds: 12,
  createdAt: '2026-09-01T10:00:00.000Z',
  seed: 7,
};

/* A one-pixel PNG. Enough for the panel to believe there is a cover and draw
   its other half, which is the half that had to be checked separately. */
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** Flipped between the two passes over the panel. */
let hasCover = false;

const server = await serve(PORT);
const { browser, page, problems } = await enter({
  at: server.url,
  width: 390,
  height: 844,
  touch: true,
  before: async (p) => {
    await p.addInitScript(
      ([key, song]) => {
        try {
          window.localStorage.setItem(key, JSON.stringify([song]));
        } catch {
          /* Storage off. The probe will find an empty channel and say so. */
        }
      },
      ['futurebox.tracks.v1', SONG],
    );
    await p.route('**/api/cover**', (route) => {
      const url = route.request().url();
      /* `tracks=` is the whole grid asking at once; `track=` is the one card
         with the panel open. Only the second decides which half draws. */
      const body = /[?&]tracks=/.test(url)
        ? '{"covers":{}}'
        : hasCover
          ? JSON.stringify({ state: 'done', url: PIXEL })
          : '{}';
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    });
    await p.route('**/api/artmarket**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          owing: null,
          artists: [],
          everyArtist: null,
          bidderRand: 50,
          noOwner: false,
          wall: [],
          bought: [],
          asBuyer: [],
          asArtist: [],
          asHouse: null,
          me: null,
        }),
      }),
    );
  },
});

const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok && !problems.includes(label)) problems.push(label);
};

/**
 * Stand in the channel with one song's cover panel open.
 *
 * ── The press that was already made ──────────────────────────────────────
 *
 * This read `await cover.click()` unconditionally, and reported the door
 * missing three times in a row against a build that had it.
 *
 * `toRoom` calls `unfold`, which opens every control on the screen carrying
 * `aria-expanded="false"` — and Cover art is one of them, because it opens a
 * panel and says so for a screen reader. So the panel was ALREADY open when
 * this arrived, and the click closed it. The probe pressed the button,
 * measured the room it had just shut, and called the button broken.
 *
 * Exactly the shape of `audit/paidback.mjs` taking the door down before
 * looking for it. A probe that changes the screen before measuring it is
 * measuring its own change, so this asks what state the panel is in and
 * presses only if it needs pressing.
 */
const openTheCoverPanel = async () => {
  /* Signing in lands on the feed, not in the studio, and `toRoom` reads the
     rail INSIDE the studio overlay. Going straight for it reports "no way
     into Channel", which reads like the room is gone and is only a probe
     standing in the wrong place. */
  await studio(page);
  await toRoom(page, 'Channel');
  await page.waitForTimeout(800);
  const cover = page.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ }).first();
  await cover.waitFor({ state: 'visible', timeout: 30000 });
  if ((await cover.getAttribute('aria-expanded')) !== 'true') {
    await cover.click();
    await page.waitForTimeout(1200);
  }
  /* Whichever way it got open, it has to BE open, or every rule below is
     measuring a card with no panel on it and would fail for the wrong
     reason. */
  await page.locator('[data-realart], img[alt*="over" i], img[alt*="mslag" i]').first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => undefined);
};

try {
  /* ── Pass one: a song with no cover yet ───────────────────────────────
     The state everybody is in the first time, and the one where the choice
     between a machine and a person is still open. */
  await openTheCoverPanel();
  const madeYet = await page.locator('[data-realart]').count();
  check('a song with no cover offers real art beside making one', madeYet > 0,
    'the panel offered only the machine, which is the whole of what she asked about');

  const says = await page.locator('[data-realart]').first().innerText().catch(() => '');
  check('  and it says who makes it and what it starts at',
    /artist|kunstenaar/i.test(says) && /R200/.test(says), says.replace(/\s+/g, ' '));

  /* ── Pass two: a song that already has one ────────────────────────────
     Somebody looking at a drawn cover they are not happy with is exactly who
     this is for, and this half of the panel is a separate branch of the JSX
     — which is how a door ends up on one state and not the other. */
  hasCover = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await openTheCoverPanel();
  const drawn = await page.locator('img[alt*="over" i], img[alt*="mslag" i]').count();
  check('the panel really is in its other state for the second pass', drawn > 0,
    'no artwork drew, so the branch below was never the one being measured');
  const afterOne = await page.locator('[data-realart]').count();
  check('a song that already has a drawn cover offers it too', afterOne > 0,
    'the door exists on one branch of the panel and not the other');

  /* ── And it actually goes somewhere ───────────────────────────────── */
  await page.locator('[data-realart]').first().click();
  await page.waitForTimeout(1800);

  const room = await page
    .locator('[data-copilot]')
    .first()
    .getAttribute('data-copilot')
    .catch(() => null);
  check('pressing it opens the album art room', room === 'albumart', String(room));

  const carried = await page.locator('[data-forsong]').first().getAttribute('data-forsong').catch(() => null);
  check('  and the song came with her', carried === SONG.id,
    `${String(carried)} — without it the room forgot why it was opened`);

  const words = await page.locator('body').innerText();
  check('  and the room names the song rather than an id',
    words.includes(SONG.title), words.replace(/\s+/g, ' ').slice(0, 200));

  await page.screenshot({ path: shot('realart.png') });
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:realart-walk — ${problems.length} problem(s):`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('\nWalked it: the cover panel offers real art in both of its states, and pressing it opens the gallery with the song already carried in.');
