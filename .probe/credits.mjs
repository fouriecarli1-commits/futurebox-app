import { CREDITS, readCost, TIER_CREDITS, capFor, PACKS, packById, buys, monthKey }
  from '../app/lib/credits.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── The scale has to stay honest across songs and video ────────────────
const SONG_RAND = 2 * 900 * ((990 * 16) / 11_000_000);
const VIDEO_RAND = 70 * (159.99 / 26_000) * 16;
const perSong = SONG_RAND / CREDITS.song;
const perVideo = VIDEO_RAND / CREDITS.video;
const drift = Math.abs(perSong - perVideo) / perSong;
say(drift < 0.15, `a credit is worth ${(drift * 100).toFixed(0)}% more on one than the other`);
say(CREDITS.halfSong * 2 === CREDITS.song, 'half a song is not half the price of one');
say(CREDITS.browserVideo === 0, 'the browser video is not free');
say(CREDITS.finetune >= 200, 'training a sound is priced too low to be safe');

// ── Reading scales with length, and a short line still costs ───────────
say(readCost(0) === 2, `an empty read cost ${readCost(0)}`);
say(readCost(150) === 2, `150 characters cost ${readCost(150)}`);
say(readCost(3000) === 20, `3000 characters cost ${readCost(3000)}`);
say(readCost(6000) === 40, `6000 characters cost ${readCost(6000)}`);
say(readCost(6000) === readCost(3000) * 2, 'twice the script is not twice the cost');
say(readCost(-100) === 2, 'a negative length did not fall back to the minimum');

// ── The caps ───────────────────────────────────────────────────────────
say(capFor('free') === TIER_CREDITS.free, 'the free cap is not the free allowance');
say(TIER_CREDITS.free % CREDITS.halfSong === 0, 'the free allowance does not divide into whole half songs');
for (const tier of ['maker', 'studio', 'label']) {
  say(capFor(tier) === TIER_CREDITS[tier] * 3, `${tier}'s cap is not three months`);
}

// ── No pack may be cheap enough for the gateway to eat ─────────────────
for (const pack of PACKS) {
  const fee = pack.rand * 0.035 + 2;
  say(pack.rand >= 99, `pack ${pack.id} is R${pack.rand}, under the R99 floor`);
  say(fee / pack.rand < 0.07, `the gateway takes ${Math.round((fee / pack.rand) * 100)}% of ${pack.id}`);
  const cost = pack.credits * (SONG_RAND / CREDITS.song);
  say(pack.rand - cost - fee > 0, `pack ${pack.id} loses money`);
}
// Bigger packs must be better value, or nobody buys them.
for (let i = 1; i < PACKS.length; i += 1) {
  const before = PACKS[i - 1].rand / PACKS[i - 1].credits;
  const now = PACKS[i].rand / PACKS[i].credits;
  say(now < before, `${PACKS[i].id} costs more per credit than ${PACKS[i - 1].id}`);
}
say(packById('mid')?.credits === PACKS[1].credits, 'packById did not find the middle pack');
say(packById('nonsense') === null, 'packById invented a pack');

// ── Period keys: a month is a month, a week is a week ──────────────────
say(monthKey('maker', new Date('2026-08-30T12:00:00Z')) === 'maker-2026-08', monthKey('maker', new Date('2026-08-30T12:00:00Z')));
say(monthKey('free', new Date('2026-01-01T00:00:00Z')) === 'free-2026-01', 'January came out wrong');
say(
  monthKey('free', new Date('2026-08-01T00:00:00Z')) === monthKey('free', new Date('2026-08-31T23:59:00Z')),
  'the first and last of a month are different months',
);
say(
  monthKey('free', new Date('2026-08-31T23:59:00Z')) !== monthKey('free', new Date('2026-09-01T00:01:00Z')),
  'the month did not roll over',
);


console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);

// ── Every length the screen offers is one the server will really make ──
//
// The picker stopped at three minutes while the music API took ten, so two
// thirds of the engine was never on screen. Widening it is only safe if the
// price shown is the price charged, and if nothing offered exceeds what the
// route will accept.
const { LENGTH_CHOICES } = await import('../app/data/sound.ts');

// The music route clamps to these; a choice outside them is silently cut.
const API_MIN = 3;
const API_MAX = 600;

for (const choice of LENGTH_CHOICES) {
  say(
    choice.seconds >= API_MIN && choice.seconds <= API_MAX,
    `${choice.label} is ${choice.seconds}s, outside what the music API accepts`,
  );
  say(choice.note.length > 10, `${choice.label} does not say what it is for`);
  // The number beside it on screen comes from here, so it is the real one.
  say(songCost(choice.seconds) > 0, `${choice.label} costs nothing, which cannot be right`);
}
say(
  LENGTH_CHOICES.some((one) => one.seconds >= 300),
  'nothing longer than five minutes is offered, and the engine makes ten',
);
say(
  LENGTH_CHOICES.every((one, i) => i === 0 || one.seconds > LENGTH_CHOICES[i - 1].seconds),
  'the song lengths are not in order',
);
// Longer has to cost more, or the long one is the only rational choice.
say(
  LENGTH_CHOICES.every((one, i) => i === 0 || songCost(one.seconds) > songCost(LENGTH_CHOICES[i - 1].seconds)),
  'a longer song does not cost more than a shorter one',
);
