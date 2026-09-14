/**
 * The Pro Booth, pressed.
 *
 * `check:tempo`, `check:mix` and `check:tone` pin the arithmetic and
 * `audit/mixdown.mjs` pins the audio. None of them can tell you that the room
 * renders, that its controls are reachable, that changing a lane marks the
 * master reading stale, or that a count-in with the click switched off says so
 * — which is the difference between a feature and a screen somebody can use.
 *
 * It owns its loop: copies the probe page in, builds, presses, removes.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium, devices } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3057';
const af = process.argv[3] === 'af';
const PROBE = 'app/proboothprobe/page.probe.tsx';
const LIVE = 'app/proboothprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

let server = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(`http://localhost:${PORT}/proboothprobe`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  const b = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 160)));
  await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

  /* Music.ai, stood up here. The real thing is a paid job against somebody's
     account and takes tens of seconds; what is being tested is the half that
     lives in this app — that a reading reaches the screen, that saying yes to
     it moves the session's tempo, and that named parts arrive as lanes.

     One handler, keyed off the job id. Three overlapping patterns is how a
     stub answers the wrong question: Playwright hands a request to the last
     matching route that was registered, not to the most specific one. */
  await p.route('**/api/analyse?**', async (route) => {
    const request = route.request();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'DELETE') return json({ gone: true });
    const id = new URL(request.url()).searchParams.get('id');
    if (id === 'job-stems') {
      return json({
        state: 'done',
        result: { drums: 'https://x/1.wav', bass: 'https://x/2.wav' },
        data: {},
        parts: ['drums', 'bass'],
        keep: true,
      });
    }
    /* Deliberately different words from the ones the reader looks for first,
       because workflow outputs are named by whoever built them. */
    return json({
      state: 'done',
      result: {},
      parts: [],
      data: {
        analysis: { tempo: 96, rootKey: 'F# minor' },
        segments: [
          { time: 0, label: 'intro' },
          { time: 8, label: 'verse' },
          { time: 24, label: 'chorus' },
        ],
      },
    });
  });

  await p.route('**/api/analyse', async (route) => {
    const body = route.request().postData() ?? '';
    const stems = /name="which"[\s\S]{0,40}stems/.test(body);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: stems ? 'job-stems' : 'job-1' }),
    });
  });

  /* Registered last so it wins for the part URLs. A real wav, so the room
     decodes it rather than being handed something it quietly drops. */
  await p.route('**/api/analyse/part*', (route) => {
    const rate = 8000;
    const frames = rate / 2;
    const bytes = Buffer.alloc(44 + frames * 2);
    bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + frames * 2, 4); bytes.write('WAVE', 8);
    bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
    bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36); bytes.writeUInt32LE(frames * 2, 40);
    for (let i = 0; i < frames; i += 1) {
      bytes.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 12000), 44 + i * 2);
    }
    return route.fulfill({ status: 200, contentType: 'audio/wav', body: bytes });
  });

  await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const words = () => p.locator('body').innerText();

  // ── The room, and the song in it as a lane ──────────────────────────
  check('the room opens with the song already in it',
    /A test song/.test(await words()), (await words()).slice(0, 120).replace(/\n/g, ' / '));

  /* ── The clock reads in bars ─────────────────────────────────────────

     Not seconds. A musician setting up a take reads bars, and the whole
     tempo strip is pointless if the transport does not.

     It moved on 14 September and this caught it, which is the check doing
     its job rather than a rule that expired. The rebuild put the tempo strip
     behind the Track-controls icon, so `displayOf`'s "001 01" is no longer
     on the screen when the room opens — and a reading a musician has to
     press an icon to see is not a transport reading.

     What replaced it is the timeline's own readout, right above the lanes
     and always there: the time, the length, and `sayPlace` — "1.1", bar and
     beat, in the notation the rest of the room already uses for a position.
     Same property, asked of where it now lives. Both spellings are accepted
     so the check does not have to change again if the strip comes back. */
  const clockNow = await words();
  check(
    'the transport reads in bars and beats, without pressing anything',
    /\b\d+\.\d+\b/.test(clockNow) || /001 01/.test(clockNow),
    clockNow.match(/\d{3} \d{2}|\b\d+\.\d+\b/)?.[0] ?? 'no bar reading',
  );

  /* ── Open the desk the clock is on ──────────────────────────────────

     The tempo, the time signature, the key, the click, the count-in and the
     grid were a strip across the top of the room. Since the rebuild they are
     behind the Track-controls icon on the lower bar, with everything else
     that sets up a take.

     So the probe presses it, because a person does. It failed here first
     with a thirty-second wait for a tempo field that was not on the screen,
     which is the right failure to get: a control reachable only by knowing
     it is there is a control nobody reaches, and pressing the icon is that
     knowledge written down. */
  /**
   * Open one of the six desks, the way a person does.
   *
   * Since the rebuild the room is a timeline with two bars of icons under
   * it, and every panel that used to be a strip down the page is behind one
   * of them. A probe that reaches straight for a control inside a closed
   * panel is not testing the room somebody uses — and it fails with a
   * thirty-second wait rather than a sentence, which is how this section
   * announced itself.
   *
   * Opens if shut, and does nothing if it is already open — which is the
   * whole point. Pressing the icon of the desk that is out SHUTS it, by
   * design ("as jy weer op buttons druk pop dit terug"), so a helper that
   * always pressed would close the panel for any caller whose group follows
   * another on the same desk. It did, and the run died waiting thirty
   * seconds for a button inside a panel it had just shut.
   *
   * `aria-pressed` is what the icon already publishes for a screen reader,
   * so this asks the same question a screen reader does rather than
   * inventing a second way to know.
   */
  const openDesk = async (en, afr) => {
    const icon = p.getByRole('button', { name: new RegExp(af ? afr : en) }).first();
    if ((await icon.getAttribute('aria-pressed')) === 'true') return;
    await icon.click();
    await p.waitForTimeout(300);
  };

  await openDesk('Track controls', 'Baankontroles');
  check(
    'the track-controls icon opens the clock',
    (await p.locator('input[type="number"]').count()) > 0,
    'the tempo strip is behind this icon now, so the icon has to be the way in',
  );

  // ── Tempo and time signature are there and settable ─────────────────
  const bpm = p.locator('input[type="number"]').first();
  await bpm.fill('90');
  await p.waitForTimeout(300);
  check('the tempo can be set', (await bpm.inputValue()) === '90', await bpm.inputValue());

  /* A tempo of zero must not divide by zero into a frozen page. The field
     is clamped on its way in rather than trusted. */
  await bpm.fill('0');
  await bpm.blur();
  await p.waitForTimeout(300);
  const afterZero = Number(await bpm.inputValue());
  check('a tempo of zero is refused rather than dividing by nothing',
    afterZero >= 20, String(afterZero));
  await bpm.fill('120');
  await p.waitForTimeout(200);

  /* ── The count-in that cannot be heard ───────────────────────────────
     Two bars of silence and then a recording that has already started reads
     as the button not working. The room says so instead. */
  const countIn = p.locator(`select[aria-label="${af ? 'Tel in' : 'Count in'}"]`);
  await countIn.selectOption('2');
  await p.waitForTimeout(400);
  check('a count-in with no click says so rather than being silent',
    af ? /Die intel het niks om mee te tel nie/.test(await words())
       : /nothing to count with/.test(await words()),
    'somebody gets two bars of silence and no explanation');

  // Switching the click on takes the warning away and offers the division.
  await p.locator(`button:has-text("${af ? 'Klik' : 'Click'}")`).first().click();
  await p.waitForTimeout(400);
  check('switching the click on clears the warning',
    !(af ? /niks om mee te tel/ : /nothing to count with/).test(await words()));
  check('and offers how often it should click',
    await p.locator(`select[aria-label="${af ? 'Hoe dikwels dit klik' : 'How often it clicks'}"]`).isVisible());

  /* ── The master says when its reading is out of date ─────────────────

     A measurement about a mix that no longer exists is worse than none.

     On its own desk since the rebuild — Mix & master, to the right of the
     transport — so the icon is pressed first. Track controls closes as this
     opens, which is the room's own rule and not something to work around. */
  await openDesk('Mix & master', 'Meng & meester');
  check('before it is measured the master says it is doing nothing',
    af ? /doen die meester niks nie/.test(await words()) : /the master does nothing at all/.test(await words()));

  await p.locator(`button:has-text("${af ? 'Meet die mengsel' : 'Measure the mix'}")`).first().click();
  await p.waitForTimeout(2500);
  const measured = await words();
  check('measuring gives a peak and an average in decibels',
    /-?\d+\.\d dB/.test(measured), (measured.match(/-?\d+\.\d dB/g) || ['none']).join(' | '));
  check('and the "not measured yet" line is gone',
    !(af ? /doen die meester niks nie/ : /the master does nothing at all/).test(measured));

  /* ── Open a lane before reaching for its controls ──────────────────

     Until 14 September the room stacked every lane's full set of controls
     down the page. It does not any more: the timeline holds the screen, and
     a lane's controls come out when its name is tapped in the gutter —
     Carli's rebuild, and the direction the rest of it is going in (four
     icons at the foot, everything behind them).

     So this probe has to do what a person does. It failed here first, with
     a thirty-second wait for a pan slider that was not on the screen because
     nobody had asked for it — which is the right failure: a control reachable
     only by knowing it is there is a control nobody reaches. Tapping the
     first non-backing lane's name is that knowledge, made explicit. */
  /* Back to Track controls, which is the desk a lane's own faders are on.
     The gutter tap below picks WHICH lane; the desk decides whether its
     controls are drawn at all. */
  await openDesk('Track controls', 'Baankontroles');
  const gutter = p.locator('div[style*="grid-template-columns"] > button');
  await gutter.nth(Math.min(1, (await gutter.count()) - 1)).click();
  await p.waitForTimeout(300);
  check('tapping a lane in the timeline opens its controls',
    (await p.locator(`input[aria-label="${af ? 'Waar dit sit, links na regs' : 'Where it sits, left to right'}"]`).count()) > 0,
    'the gutter name is the only way in now, so it has to be the way in');

  // Now move something, and the reading has to admit it is stale.
  const pan = p.locator(`input[aria-label="${af ? 'Waar dit sit, links na regs' : 'Where it sits, left to right'}"]`).first();
  await pan.fill('40');
  await p.waitForTimeout(500);
  /* The staleness line is on the master's own desk, so look at it there. */
  await openDesk('Mix & master', 'Meng & meester');
  check('changing a lane marks the reading out of date',
    af ? /meet dit weer/.test(await words()) : /measure it again/.test(await words()),
    'a stale number is left on screen as though it were current');

  /* ── Reading a lane ──────────────────────────────────────────────────
     The payoff of the whole integration: a service says what the song is,
     and the session can be set to match in one press.

     Back on the lane's own desk: the read button belongs to a lane, and
     opening the master's desk closed it. */
  await openDesk('Track controls', 'Baankontroles');
  await p.locator(`button[aria-label="${af ? 'Lees die akkoorde, toonsoort en tempo' : 'Read the chords, key and tempo'}"]`).first().click();
  await p.waitForTimeout(3500);
  const readOut = await words();
  check('a reading comes back and lands on the lane', /96/.test(readOut) && /F# minor/.test(readOut),
    readOut.slice(0, 200).replace(/\n/g, ' / '));
  check('and the sections come with it', /chorus/.test(readOut),
    'the chord and section list did not render');

  /* The tempo is offered, not applied. Moving it on its own would move the
     grid under work somebody has already done, so the button has to exist and
     it has to work. */
  const before = await p.locator('input[type="number"]').first().inputValue();
  await p.locator(`button:has-text("${af ? 'Stel die sessie hierop' : 'Set the session to this'}")`).first().click();
  await p.waitForTimeout(500);
  const after = await p.locator('input[type="number"]').first().inputValue();
  check('the session was not moved without being asked', before === '120', before);
  check('and saying yes sets the tempo to what was read', after === '96', `${before} → ${after}`);
  check('the transport follows it', /001 01/.test(await words()));

  await openDesk('Track controls', 'Baankontroles');

  /* ── Splitting into named parts ──────────────────────────────────────
     The half of the integration that produces audio rather than an answer.
     Each part must arrive as a lane of its own, at the source's own start,
     with the source muted rather than thrown away. */
  {
    const before = await p.locator('canvas').count();
    await p.locator(`button[aria-label="${af ? 'Verdeel in benoemde dele' : 'Split into named parts'}"]`).first().click();
    await p.waitForTimeout(6000);
    const after = await p.locator('canvas').count();
    check('splitting into named parts adds a lane per part', after >= before + 2,
      `${before} → ${after}`);
    /* Read the names off the timeline's gutter.

       They used to be read off the name INPUTS, with a note explaining that
       `innerText` does not include an input's value — true, and it stopped
       being the right place on 14 September: only the picked lane has its
       controls on screen now, so there is exactly one name input and this
       read back "A test song", the lane that happened to be open.

       The gutter is where every lane's name is, which is also where a person
       reads them. Same property, asked of the screen it is now on. */
    const names = await p
      .locator('div[style*="grid-template-columns"] > button')
      .evaluateAll((nodes) => nodes.map((node) => node.innerText));
    check('and each lane carries the part’s own name',
      names.some((one) => /drums/.test(one)) && names.some((one) => /bass/.test(one)),
      names.join(' | '));
  }

  /* ── Tone ────────────────────────────────────────────────────────────
     And the sentence that keeps it honest: a guitarist reading "amp
     modeller" and hearing a tone stack would be right to be annoyed. */
  await p.locator(`button[aria-label="${af ? 'Toon' : 'Tone'}"]`).first().click();
  await p.waitForTimeout(400);
  const tone = await words();
  check('the tone drawer opens', af ? /Dryf/.test(tone) : /Drive/.test(tone));
  check('and says it is not a model of a named amplifier',
    af ? /nie ’n model van ’n benoemde versterker nie/.test(tone)
       : /not a model of a named amplifier/.test(tone),
    'the room implies it is modelling somebody else’s amp');

  // ── Nothing costs anything unless it says so ────────────────────────
  check('the split control names its price',
    Boolean(await p.locator('[aria-label*="plit"], [aria-label*="kei"]').first().getAttribute('title')),
    'a paid button with no price on it');

  await p.screenshot({ path: shot(`probooth-${af ? 'af' : 'en'}.png`), fullPage: false });

  /* ── Generating a part ───────────────────────────────────────────────

     The thing that makes this room worth opening for somebody who does this
     for a living: a part asked for the way a session player is asked for one.
     `check:parts` proves the arithmetic and the words that reach the engine;
     what only a browser settles is whether the room actually says the four
     things a musician says, in the reader's own language, before the press.

     On the Stems desk since the rebuild. It used to sit in the strip at the
     foot of the effects desk, which put the button on one desk and the sheet
     it opens on another — so it drew nothing, and this probe is what found
     that. Taking an existing lane apart stays on the lane's own row. */
  await openDesk('Stems', 'Stamme');
  const openPart = p.locator('button').filter({ hasText: af ? /Genereer ’n party/ : /Generate a part/ }).first();
  check('the room can generate a part', (await openPart.count()) > 0);
  await openPart.click();
  await p.waitForTimeout(600);
  /* The panel's own text, not the whole page. The room behind it is two
     hundred characters of tempo and key controls, so a failure that printed
     the page printed the room and never reached the panel. */
  const panel = await p.locator('[role="dialog"], .fixed.inset-0').last().innerText().catch(() => '');

  /* Grouped like a channel list rather than one flat run of twenty-three. */
  /* Case-insensitive: the family headings are uppercased in CSS, so
     `innerText` hands back DRUMS AND PERCUSSION and a case-sensitive test
     fails on a panel that is completely correct. The second time that has
     caught me this session. */
  check('the instruments are grouped',
    af ? /tromme en slagwerk/i.test(panel) && /klawers/i.test(panel)
       : /drums and percussion/i.test(panel) && /keys/i.test(panel),
    panel.replace(/\n/g, ' · ').slice(0, 400));

  /* The request, read back in the four terms. The session in this probe is
     96 BPM in 4/4 with a key on it, and every one of those has to be on the
     screen — a panel that showed only an instrument and a length would be a
     genre picker with extra steps. */
  check('the request names the bars', af ? /8 mate/.test(panel) : /8 bars/.test(panel));
  check('and the tempo and the time signature', /96 BPM/.test(panel) && /4\/4/.test(panel));
  check('and how long it will be', /0:20/.test(panel), 'no length on the panel');
  check('and what it costs', af ? /krediet/i.test(panel) : /credit/i.test(panel));

  /* The limit, in front of the button and not behind a mark. The engine reads
     words and cannot hear the session; a professional needs that before the
     press, not after a part that will not sit in time. */
  check('the panel says the engine cannot hear the session',
    af ? /lees woorde, nie die sessie nie/.test(panel) : /reads words, not the session/.test(panel),
    'the room implies a generated part is locked to the click');

  await p.screenshot({ path: shot(`propart-${af ? 'af' : 'en'}.png`), fullPage: false });
  await p.keyboard.press('Escape');
  await p.locator('button').filter({ hasText: af ? /^Maak toe$/ : /^Close$/ }).first().click().catch(() => {});
  await p.locator('[aria-label="Close"], [aria-label="Maak toe"]').first().click().catch(() => {});
  await p.waitForTimeout(400);

  /* ── Nothing overlaps, at either size ────────────────────────────────
     The first version of this row fitted on a desktop and had the pan
     slider sitting on top of the start-time field at 1280 px — which is
     not a narrow screen, and which no assertion about text would ever
     have caught. Boxes are compared, not looked at. */
  /* 360 as well as 390. A great many Android phones report 360 CSS pixels —
     Carli's own screenshots are one — and a row that fits at 390 and overflows
     at 360 is a row that overflows for a large share of the people using this.
     The phone-only assertions below run at both. */
  for (const width of [1280, 390, 360]) {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(500);
    /* Only controls somebody can actually reach.
       `getBoundingClientRect` reports where an element would be even when it
       is clipped out of a scrolling list or covered by a pinned bar — so a
       naive comparison flags a slider scrolled out of view as sitting on top
       of the master's, which is both true and completely fine. Asking what is
       painted at the centre of each control is the question that was meant:
       if the top element there is the control itself, a person can hit it. */
    const boxes = await p.locator('input[type="range"], input[type="number"]').evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const box = node.getBoundingClientRect();
          if (box.width < 2 || box.height < 2) return null;
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return null;
          const top = document.elementFromPoint(x, y);
          if (top !== node && !node.contains(top)) return null;
          return { x: box.x, y: box.y, w: box.width, h: box.height };
        })
        .filter(Boolean),
    );
    let overlap = null;
    for (let i = 0; i < boxes.length && !overlap; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const c = boxes[j];
        /* Four pixels, not one. Two controls sitting flush against each
           other come back overlapping by a tenth of a pixel — sub-pixel
           layout, invisible to anybody. A threshold of one reported that as
           a defect, which is the kind of false alarm that gets a check
           switched off. */
        const across = a.x < c.x + c.w - 4 && c.x < a.x + a.w - 4;
        const down = a.y < c.y + c.h - 4 && c.y < a.y + a.h - 4;
        if (across && down) { overlap = `${JSON.stringify(a)} over ${JSON.stringify(c)}`; break; }
      }
    }
    check(`at ${width}px no two controls sit on top of each other`, !overlap, overlap ?? '');

    const wide = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`at ${width}px the room does not run off the side`, wide <= 1, `${wide}px over`);

    /* Big enough to hit with a thumb.

       This room was built at desk size and it showed: at 390 px twenty of its
       twenty-nine controls were under 32 pixels — selects at 28, mute and solo
       at 23, four lane actions at 16 square, and sliders 16 pixels tall, which
       under a mouse is a target and under a thumb is a coin flip. A control
       nobody can hit is a control that is not there.

       Only checked on the phone. A mouse is precise and a desk that copies the
       phone's padding is a desk with half the density it should have. */
    if (width <= 390) {
      /* ── This rule was retired on purpose, and what replaced it ─────

         It read: "One page, not four strips around a sliver." The room was
         built as a desk — header and clock nailed to the top, master and
         transport to the foot, lanes scrolling between them — and on a
         390-pixel screen those four strips were most of the height, leaving
         the lanes a few lines. So below `sm` it became one column that
         scrolled, and this asserted nothing inside it scrolled on its own.

         Carli, 14 September 2026, with four pictures of what she wants
         instead: *"Die booth moet heeltemal verander."* The timeline is the
         room now — it holds the screen and scrolls its own lanes, and the
         controls come out from behind icons rather than standing in strips
         around it. A rule that forbids anything inside the room from
         scrolling forbids exactly that.

         Retired rather than deleted, because the fault it was written for is
         real and has not gone away: the room must not end up as strips of
         chrome around a sliver of work. What is asserted now is that
         property directly — the timeline gets the bulk of the height — which
         is what the old rule was a proxy for under the old layout. */
      const shape = await p.evaluate(() => {
        const room = document.querySelector('div.fixed.inset-0.z-\\[70\\]');
        if (!room) return null;
        const inner = Array.from(room.querySelectorAll('div')).filter((el) => {
          const s = getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4;
        });
        return {
          roomScrolls: room.scrollHeight > room.clientHeight + 4,
          innerScrollers: inner.length,
          height: room.scrollHeight,
        };
      });
      const room390 = await p.evaluate(() => {
        const room = document.querySelector('div.fixed.inset-0.z-\\[70\\]');
        const grid = document.querySelector('[style*="grid-template-columns"]');
        if (!room || !grid) return null;
        return {
          room: room.clientHeight,
          /* The timeline's own scroller, which is the box between the readout
             and the lane controls. */
          line: (grid.closest('[class*="overflow-y-auto"]') ?? grid).clientHeight,
        };
      });
      check(
        'at 390px the timeline gets the room, not a sliver between strips of chrome',
        !!room390 && room390.line >= room390.room * 0.3,
        room390 ? `${room390.line}px of ${room390.room}px` : 'no timeline found',
      );
      void shape;
    }

    if (width <= 390) {
      const small = await p.evaluate(() => {
        const out = [];
        for (const el of Array.from(document.querySelectorAll('button, [role="button"], a, input, select'))) {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          // A full-width backdrop is not a target anybody aims at.
          if (r.width >= window.innerWidth) continue;
          if (r.height < 32 || r.width < 32) {
            out.push(`${Math.round(r.width)}×${Math.round(r.height)} "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.type || '').replace(/\s+/g, ' ').trim().slice(0, 24)}" .${String(el.className).slice(0, 46)}`);
          }
        }
        return out;
      });
      check('at 390px every control is big enough for a thumb', small.length === 0, small.slice(0, 6).join(', '));

      /* ── Nothing the room offers is painted over by the tab bar ────────
         The room is z-[70]; TabBar is fixed to the bottom at z-[95]. Every
         probe before this one rendered the room alone, so the bar was not
         there to cover anything, and the room's own "Mix it down" — the
         button that produces the file — sat underneath it on a phone with
         nothing to say so. Carli found it by using the app.

         Scrolled to the bottom, because that is where somebody looking for
         the finishing button goes, and it is where the bar bites. */
      await p.evaluate(() => {
        const room = document.querySelector('div.fixed.inset-0.z-\\[70\\]');
        if (room) room.scrollTop = room.scrollHeight;
      });
      await p.waitForTimeout(300);

      /* ── The bar is not there at all any more ──────────────────────

         This used to look for controls painted over by the tab bar, and it
         found a real one: "Mix it down", the button that produces the file,
         sat underneath it on a phone with nothing to say so, and Carli
         found that by using the app.

         The booth now claims the screen and the bar stands down while it is
         open — Carli: *"dan val daai hele bar van die app in die booth
         weg."* So the question changes from "does the bar cover anything"
         to "is the bar gone, and is there still a way out". Both halves,
         because the bar gone with no back button is a room a phone cannot
         leave. */
      const covered = await p.evaluate(() => {
        const bar = document.querySelector('nav.fixed.bottom-0');
        if (!bar) return [];
        const over = bar.getBoundingClientRect();
        const out = [];
        for (const el of Array.from(document.querySelectorAll('button, input, select'))) {
          if (bar.contains(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.bottom < 0 || r.top > window.innerHeight) continue;
          /* Any part of it under the bar is enough: half a button is not a
             button, and the half that is covered is the half a thumb lands on
             when somebody reaches for the bottom of the screen. */
          if (r.bottom > over.top && r.top < over.bottom) {
            out.push(`${(el.innerText || el.getAttribute('aria-label') || el.type || '?').replace(/\\s+/g, ' ').trim().slice(0, 28)}`);
          }
        }
        return out;
      });
      const wayOut = await p.evaluate(() =>
        Array.from(document.querySelectorAll('button')).some((el) =>
          /^(Back|Terug)$/.test((el.innerText || '').trim()),
        ),
      );
      check(
        'at 390px the app’s bar has stood down, and the room still has a way out',
        covered.length === 0 && wayOut,
        covered.length ? `covered: ${covered.slice(0, 4).join(', ')}` : 'no back button in the room',
      );

      /* ── Nothing is hidden sideways ────────────────────────────────

         "wat ek bedoel met swipe links. ek moes die bar links skuif om daai
          opname mic te sien. niemand gaan weet dit is daar nie."

         The page-width check above asks `documentElement.scrollWidth`, which
         is the *page*. A row inside the room that scrolls sideways on its own
         passes that happily, and the controls past its right edge — the mic
         that records into the lane, the bin that removes it — are reachable
         only by somebody who thinks to drag a row nothing says is draggable.

         Two questions, because the fault has two shapes. A box that scrolls
         is one. A box whose contents are simply wider than it is — fixed
         width, `flex-shrink-0`, more in it than fits — is the other, and that
         one does not scroll at all: it paints its overflow over the control
         beside it. Both were present here. */
      const sideways = await p.evaluate(() => {
        const room = document.querySelector('div.fixed.inset-0.z-\\[70\\]');
        if (!room) return ['no room'];
        const out = [];
        for (const el of Array.from(room.querySelectorAll('div'))) {
          /* Eight pixels, and the limit is stated rather than tuned until it
             passed. A control in this room is at least thirty-two pixels
             square, so nothing eight pixels over its box can be a control that
             is out of reach — and the assertion below, which asks whether any
             button actually falls outside its own card, is what catches that.
             Under eight is a text node a hair wider than the box that holds
             it, and chasing those turns a check that found four real faults
             into one nobody trusts. */
          if (el.scrollWidth > el.clientWidth + 8 && el.clientWidth > 40) {
            out.push(`${Math.round(el.clientWidth)} wide holding ${Math.round(el.scrollWidth)}: .${String(el.className).slice(0, 50)}`);
          }
        }
        return out;
      });
      check('at 390px nothing in the room is hidden off to the side',
        sideways.length === 0, sideways.slice(0, 4).join(' | '));

      /* And every control is inside the card it belongs to. Overflow that does
         not scroll still puts a button where nobody can see it. */
      const outside = await p.evaluate(() => {
        const out = [];
        for (const card of Array.from(document.querySelectorAll('div.rounded-xl.border'))) {
          const box = card.getBoundingClientRect();
          if (box.width < 100) continue;
          for (const el of Array.from(card.querySelectorAll('button, input'))) {
            const r = el.getBoundingClientRect();
            if (r.width < 2) continue;
            if (r.right > box.right + 1 || r.left < box.left - 1) {
              out.push(`${(el.getAttribute('aria-label') || el.type || '?')} sticks out`);
            }
          }
        }
        return out;
      });
      check('and no control sticks out of the lane it belongs to',
        outside.length === 0, [...new Set(outside)].slice(0, 5).join(', '));

      /* ── A hint near the foot opens upwards ─────────────────────────

         "hierdie onderste pop out window moet boontoe beweeg. ondertoe beweeg
          hy agter die buttons in."

         `Hint` chose a side and not a direction, so a mark low on the screen
         opened its panel down into the transport and then behind the tab bar,
         which is z-[95] against the panel's z-50. Two faults in one: the wrong
         direction and the wrong layer.

         Asserted by where the panel lands, not by the class that put it
         there — a rule that reads a class name passes a class that has been
         renamed and stopped working. */
      const marks = p.locator('button[aria-label="What this does"], button[aria-label="Wat dit doen"]');
      const low = await marks.count();
      if (low) {
        await marks.last().scrollIntoViewIfNeeded();
        /* Pressed through the DOM, because a real pointer press is a
           different question and is asked elsewhere.
 
           This reported "no panel" in two consecutive eighty-probe sweeps
           and passed every time on its own. Playwright retries a click it
           considers unstable, and a retry lands a second `pointerdown` —
           which `Hint` listens for and closes on. The first press opened the
           panel and the retry shut it. Under a sweep, retries are far more
           likely than on an idle machine.
 
           (The first explanation was that the mark had drifted under the
           bar. The next sweep printed it at the same position it prints
           idle, nowhere near the bar, which is the only reason that answer
           did not survive into the docs as the truth.)
 
           What this assertion is FOR is where the panel opens once it is
           open — up, and above the bar. Whether a thumb can reach the mark
           is `audit/underbar.mjs` and `audit/touch.mjs`, which measure it
           properly. The line below prints both rectangles either way. */
        const mark = await marks.last().elementHandle();
        await mark?.evaluate((el) => el.click());
        /* Waited for, not slept through.
 
           This was `waitForTimeout(300)`, and 300ms is long enough on an idle
           machine and not on a busy one: run back to back with eighty other
           probes it reported "no panel" once and passed twice on its own. A
           fixed sleep that is long enough here is the thing that makes a
           probe flake somewhere else — `buildon` has the same note. If the
           panel really never opens this still fails, and now for the reason
           it says. */
        await p.locator('[role="tooltip"]').first()
          .waitFor({ state: 'visible', timeout: 8000 })
          .catch(() => undefined);
        const where = await marks.last().boundingBox().catch(() => null);
        const barAt = await p.evaluate(() => {
          const bar = document.querySelector('nav.fixed.bottom-0');
          return bar ? Math.round(bar.getBoundingClientRect().top) : null;
        });
        /* Printed whether it passes or not. When this failed in a sweep the
           first question was "where was the mark", and the answer was not in
           the output — so the next two hours went on reproducing it. */
        console.log(`       mark at ${where ? Math.round(where.y) : '?'}..${where ? Math.round(where.y + where.height) : '?'}, bar top ${barAt}`);
        const panel = await p.evaluate(() => {
          const tip = document.querySelector('[role="tooltip"]');
          const bar = document.querySelector('nav.fixed.bottom-0');
          if (!tip || !bar) return null;
          const t = tip.getBoundingClientRect();
          const b = bar.getBoundingClientRect();
          return {
            clear: t.bottom <= b.top + 1,
            onTop: Number(getComputedStyle(tip).zIndex) > Number(getComputedStyle(bar).zIndex),
            top: Math.round(t.top), bottom: Math.round(t.bottom), bar: Math.round(b.top),
          };
        });
        check('a hint near the foot of the room does not open into the tab bar',
          !!panel && (panel.clear || panel.onTop),
          panel ? `panel ${panel.top}-${panel.bottom}, bar at ${panel.bar}` : 'no panel');
        await p.keyboard.press('Escape');
        await p.waitForTimeout(200);
      }

      await p.screenshot({ path: shot('probooth-phone.png'), fullPage: false });
    }
  }
  /* ── The pinned strips are not see-through ───────────────────────────

     The clock at the top and the master and transport at the bottom stay put
     while the lane list scrolls between them. A pinned bar with no background
     of its own is a bar you can read the lanes through, and on a phone —
     where the list is long and the bars are close — that looks exactly like
     the controls have collided.

     Asserted as a painted colour rather than as geometry, because geometry
     cannot tell the difference: content scrolled behind an opaque bar overlaps
     it in every measurement and is completely correct. Measuring that instead
     is a check that fails on working software, which is how a check gets
     switched off. */
  const seeThrough = await p.evaluate(() => {
    /* The room's own strips, not every `flex-shrink-0` in it — the lane rows
       are full of them and none of those is pinned over anything. */
    const room = document.querySelector('div.fixed.inset-0');
    const bars = room ? Array.from(room.children).filter((one) => one.classList.contains('flex-shrink-0')) : [];
    return bars
      .filter((bar) => bar.getBoundingClientRect().height > 20)
      .filter((bar) => {
        const paint = getComputedStyle(bar).backgroundColor;
        return paint === 'transparent' || paint === 'rgba(0, 0, 0, 0)';
      })
      .map((bar) => (bar.textContent || '').trim().slice(0, 30));
  });
  check('every pinned bar has a background of its own', seeThrough.length === 0,
    `see-through: ${seeThrough.join(' | ')}`);

  /* ── And that it wraps rather than squeezes ──────────────────────────
     The phone is the point. A row that stays one line on a 390 px screen has
     not fitted, it has crushed every control in it to something nobody can
     hit. Taller on a phone than on a desktop is the shape of having wrapped. */
  /* Found from the name input rather than from a canvas.

     It used to climb out of the lane's own waveform canvas to the row around
     it. The waveform moved to the shared timeline on 14 September, so the
     first canvas on the page is now a clip on the timeline and there is no
     control row above it — the row is under the timeline, opened by tapping
     a lane. The name field is inside that row and only inside that row. */
  /* And the row is only mounted while the Track-controls desk is open with a
     lane picked — the sweep above left the Stems desk open. */
  await openDesk('Track controls', 'Baankontroles');

  const heightAt = async (width) => {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(400);
    return p
      .locator('input[aria-label="Lane name"], input[aria-label="Baan se naam"]')
      .first()
      .evaluate((node) => {
        const row = node.closest('div.flex-wrap');
        return row ? row.getBoundingClientRect().height : 0;
      });
  };
  const onDesktop = await heightAt(1280);
  const onPhone = await heightAt(390);
  check('the lane row wraps on a phone instead of crushing itself',
    onPhone > onDesktop, `${onPhone}px on a phone, ${onDesktop}px on a desktop`);

  await p.setViewportSize({ width: 1280, height: 900 });

  /* ── Turned sideways ─────────────────────────────────────────────────

     Carli, 14 September 2026: *"Die booth moet asb op die dwars draai
     funksie van 'n foon en tablet getoets word. Want baie mense gaan die
     dwarsdraai wil gebruik, en dan gaan die buttons weer beter werk aan die
     kant van die skerm en nie onder nie."*

     Two questions, and only the second is about taste. The first is
     arithmetic: a phone turned sideways is 390 pixels tall, and two rows of
     controls plus a header plus a readout is 240 of them. Whatever is left
     is the timeline, which is the room. So the rail has to move to the edge
     or the work has nowhere to be.

     Real device profiles rather than `setViewportSize`, and that is the
     whole reason this section is here rather than folded into the width
     sweep above. `useSideways` asks for `(orientation: landscape) and
     (pointer: coarse)` — a resized desktop window is landscape and has a
     mouse, so it would answer no, and a sweep that resizes a desktop page
     would prove the rail never appears while reporting that it does. A
     device profile brings the coarse pointer with it. */
  for (const [what, profile, turned] of [
    ['a phone upright', devices['Pixel 5'], false],
    ['a phone sideways', devices['Pixel 5 landscape'], true],
    ['a tablet upright', devices['iPad Mini'], false],
    ['a tablet sideways', devices['iPad Mini landscape'], true],
  ]) {
    if (!profile) {
      check(`${what}: the device profile exists in this Playwright`, false, 'renamed between versions');
      continue;
    }
    const held = await b.newPage({ ...profile });
    try {
      await held.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
      /* Waited for by the one control that is in the room at both
         orientations — the play button — because it is also the thing the
         measurement below finds the dock by. `networkidle` is the page
         having loaded, not the room having drawn itself.

         Then a pause on top of it: `useSideways` answers no on the first
         paint by design (see the note in `app/lib/sideways.ts`), so a
         measurement taken the instant the dock appears measures the upright
         dock on a sideways phone — which is exactly the false pass this
         section exists to rule out. */
      await held.waitForSelector('[aria-label="Play"], [aria-label="Speel"], [aria-label="Pause"]');
      await held.waitForTimeout(1200);

      const shape = await held.evaluate(() => {
        const room = document.querySelector('div.fixed.inset-0.z-\\[70\\]');
        /* The timeline's own root, not the grid inside its scroller: that
           grid is content-sized, so it measured the same 98 pixels on a
           phone and on a tablet and would never have noticed the timeline
           being squeezed to nothing. */
        const line = document.querySelector('[data-timeline]');
        /* The dock names itself. It used to be found by climbing from the
           play button to the nearest `flex-shrink-0`, and when the rail's
           transport became a row of its own that climb stopped at the row:
           144×48, which is a bar, so the rail failed its own assertion
           while being exactly right on the screen. */
        const play =
          document.querySelector('[aria-label="Play"]') ||
          document.querySelector('[aria-label="Speel"]') ||
          document.querySelector('[aria-label="Pause"]');
        const dock = play?.closest('[data-dock]');
        if (!room || !dock) return null;
        const r = room.getBoundingClientRect();
        const d = dock.getBoundingClientRect();
        const l = line?.getBoundingClientRect();
        return {
          room: { w: Math.round(r.width), h: Math.round(r.height) },
          dock: { x: Math.round(d.x), y: Math.round(d.y), w: Math.round(d.width), h: Math.round(d.height) },
          lineH: l ? Math.round(l.height) : 0,
          wide: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
          small: Array.from(document.querySelectorAll('button')).filter((el) => {
            const box = el.getBoundingClientRect();
            return box.width > 0 && (box.width < 40 || box.height < 40);
          }).length,
          /* The six desks, and how many of them a person can see without
             finding a scroll in a narrow column. Counted by `aria-pressed`,
             which only the desk buttons carry. */
          desks: Array.from(dock.querySelectorAll('button[aria-pressed]')).length,
          desksSeen: Array.from(dock.querySelectorAll('button[aria-pressed]')).filter((el) => {
            const box = el.getBoundingClientRect();
            return box.top >= -1 && box.bottom <= window.innerHeight + 1;
          }).length,
        };
      });

      check(`${what}: the room and its controls are on the screen`, Boolean(shape), 'nothing found');
      if (!shape) continue;

      if (turned) {
        /* Beside the work, not under it. Both halves are asserted: a rail
           that is tall but at the left of the screen is still in the way of
           a right thumb, and one at the right that is short is a bar that
           happens to be floating. */
        check(
          `${what}: the controls are down the side, not across the bottom`,
          shape.dock.h > shape.dock.w && shape.dock.x > shape.room.w / 2,
          `${shape.dock.w}×${shape.dock.h} at x=${shape.dock.x} of ${shape.room.w}`,
        );
        check(
          `${what}: and the timeline gets the height that frees up`,
          shape.lineH >= shape.room.h * 0.35,
          `${shape.lineH}px of ${shape.room.h}px`,
        );
      } else {
        check(
          `${what}: the controls are across the bottom`,
          shape.dock.w > shape.dock.h && shape.dock.y > shape.room.h / 2,
          `${shape.dock.w}×${shape.dock.h} at y=${shape.dock.y} of ${shape.room.h}`,
        );
      }

      /* Every desk on the screen, not merely in the DOM.

         The rail's first version was one column 84 pixels wide, and on a
         phone held sideways it showed Track controls, Mix & master and
         Audio effects — with Stems, Voice and Copilot under the fold of a
         column nothing marks as scrolling. It scrolled, so nothing was
         unreachable and every assertion here passed; three of the six
         functions were invisible anyway. Reachable is not the bar. */
      check(
        `${what}: all six desks are on the screen at once`,
        shape.desks === 6 && shape.desksSeen === 6,
        `${shape.desksSeen} of ${shape.desks} in view`,
      );

      check(`${what}: nothing runs off the side`, shape.wide <= 1, `${shape.wide}px over`);
      check(`${what}: every button is big enough for a thumb`, shape.small === 0, `${shape.small} too small`);
      await held.screenshot({ path: shot(`booth-${what.replace(/\s+/g, '-')}.png`) });
    } finally {
      await held.close();
    }
  }

  /* ── The way to the words is in the room that has none ───────────────

     "wanneer mens record moet daar op 'n manier 'n baie meer duidelike
      riglyn wees hoe om te kom by die plek waar mens saam met die woorde kan
      record en dan die opsie om saam met die AI stem te record."

     Both of those live in The Booth. This room has a large green Record
     button, no words, no guide voice, and used to have nothing at all saying
     where either was — so somebody who came here to sing was in the wrong
     room with no way to find that out. */
  {
    /* The record strip — the way to the words, the guide voice, and "Mix it
       down" — is at the foot of the Audio effects desk. It kept its place
       there rather than becoming a seventh icon, because the one thing in
       it that is not a control is the button this whole room exists to
       press. */
    await openDesk('Audio effects', 'Klankeffekte');
    const said = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    check('the room offers the way to the words',
      await p.locator('button', { hasText: /Sing with the words|Sing saam met die woorde/ }).count() > 0);
    check('and says the AI voice is there too',
      /AI voice in your ear|AI-stem in jou oor/.test(said), said.slice(0, 160));
    /* Nobody presses a button that leaves a room holding four takes unless
       they are told the takes survive it. Since they now do, saying so is
       what makes the button usable rather than frightening. */
    check('and that the lanes are kept if you go',
      /lanes here are saved|bane hier is gestoor/i.test(said));
  }

  /* ── The session is still there after the room is closed ─────────────

     Carli, 9 September 2026: "toe ek terug swipe of back druk, dan gooi hy
     mens heeltemal uit na die home screen toe en jy verloor jou hele projek.
     'n projek waarmee mens besig is moet half kan stoor, en restart waar 'n
     mens is."

     A reload is the same event as everything that used to lose it — the back
     gesture, a tab, the browser reclaiming a backgrounded page — and it is the
     one this probe can actually cause. Asserted on what comes back rather than
     on the store being called, because a save that writes and a restore that
     never reads look identical from the outside and lose the same takes.

     Last, because it throws away the page every other assertion is standing
     on. The wait is for the debounce: the room writes two seconds after the
     last change, so reloading sooner would prove nothing but the timer. */
  await p.waitForTimeout(3000);
  /* Read off the timeline's gutter, which is where every lane's name is.

     This read the name INPUTS, and they moved: only the picked lane has its
     controls on screen now, so before the reload there was one input (the
     lane that happened to be open) and after it there were none, because a
     fresh room has nothing picked. It reported a working restore as a lost
     session — the exact failure this check exists to catch, produced by the
     check rather than by the room. The gutter lists every lane whether or
     not its controls are open, which is also what a person looks at. */
  const laneNames = async () =>
    p
      .locator('div[style*="grid-template-columns"] > button')
      .evaluateAll((nodes) => nodes.map((node) => (node.innerText || '').split('\n')[0].trim()).sort());
  const wasNamed = await laneNames();
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const nowNamed = await laneNames();
  check('a session survives the room being closed', nowNamed.length === wasNamed.length,
    `${wasNamed.length} lanes before, ${nowNamed.length} after`);
  check('and every lane comes back by name', nowNamed.join(' | ') === wasNamed.join(' | '),
    `${wasNamed.join(' | ')} → ${nowNamed.join(' | ')}`);
  const said = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('and the room says it picked the work back up',
    /Carried on from where you left off|Verder gegaan waar jy opgehou het/.test(said),
    said.slice(0, 120));
  /* Not resuming has to be one press away, or somebody starting something new
     is stuck with last night's takes. */
  check('with one press to start fresh instead',
    await p.locator('button', { hasText: /^(Start fresh|Begin oor)$/ }).count() > 0);

  await b.close();
} finally {
  if (server?.pid) {
    try { process.kill(-server.pid); } catch { /* already gone */ }
    try { server.kill('SIGKILL'); } catch { /* already gone */ }
  }
  if (existsSync(LIVE)) rmSync(LIVE);
}

if (problems.length) {
  console.error(`\ncheck:probooth — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:probooth — the room draws, its controls answer, and the master knows when it is stale.');
