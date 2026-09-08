/**
 * A part asked for the way a session player is asked for one.
 *
 *   "dit moet super maklik wees om … 'n lys van ekstra instrumente in te voeg,
 *    ai klanke te generate en dan te mix … dit moet absoluut sin maak vir 'n
 *    professional."
 *
 * The room already knows the key, the tempo and the time signature. So the
 * three things that would stop this making sense to a professional:
 *
 * 1. **Asking for a mood instead of a part.** "Eight bars of Rhodes in A minor
 *    at 96, in four" is a request. "Chill vibes" is not, and it cannot be
 *    mixed with anything.
 * 2. **A length the engine will refuse.** Two bars at 160 is three seconds,
 *    which is shorter than it will make; sixteen bars at 60 is over a minute.
 *    Both ends discovered as a refusal after the credits are taken is the
 *    worst way to find out.
 * 3. **A part that comes back as a whole arrangement.** A pad with a drum kit
 *    under it is not a pad, it is a second song, and it cannot sit in a mix
 *    with the first.
 *
 *   npm run check:parts
 */
import { readFileSync } from 'node:fs';
import {
  BAR_CHOICES, INSTRUMENTS, LONGEST, SHORTEST, asked, instrumentBy, secondsFor, styleFor,
} from '../app/lib/parts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── The list ──────────────────────────────────────────────────────────── */
ok('there is a list worth calling a list', INSTRUMENTS.length >= 20, String(INSTRUMENTS.length));
ok('every instrument has its own id', new Set(INSTRUMENTS.map((one) => one.id)).size === INSTRUMENTS.length);
ok('and its own name key', new Set(INSTRUMENTS.map((one) => one.name)).size === INSTRUMENTS.length);
/* A mixer's channel list is grouped, and so is this: drums, bass, keys,
   guitars, winds, texture. A flat list of twenty-three is a wall. */
const families = new Set(INSTRUMENTS.map((one) => one.family));
ok('and they are grouped the way a channel list is', families.size === 6, [...families].join(', '));
ok('every family has something in it',
  [...families].every((family) => INSTRUMENTS.filter((one) => one.family === family).length >= 3));

/* ── The words the engine gets ─────────────────────────────────────────── */
const rhodes = instrumentBy('rhodes');
ok('an instrument can be found by id', Boolean(rhodes) && rhodes?.english === 'Electric piano');
ok('and an unknown one is null, not a guess', instrumentBy('kazoo') === null);

const style = styleFor({ bars: 8, beats: 4, bpm: 96, key: 'A minor', instrument: rhodes! });
ok('the key is in the words', /A minor/.test(style), style);
ok('the tempo is in the words', /96 BPM/.test(style), style);
ok('the time signature is in the words', /4\/4/.test(style), style);
ok('and the instrument is', /Rhodes/.test(style), style);
/* The two things that make a part unmixable. */
ok('it asks for one instrument and no others', /no other instruments/.test(style), style);
ok('and for nobody singing', /no vocals/.test(style), style);

/* A song with no worked-out key still gets a part, described without one —
   rather than "in " trailing off, or an invented key. */
const noKey = styleFor({ bars: 4, beats: 4, bpm: 120, key: '   ', instrument: rhodes! });
ok('a session with no key asks for no key', !/\bin\s*,/.test(noKey) && !/in $/.test(noKey), noKey);

/* ── The length ────────────────────────────────────────────────────────── */
ok('eight bars at 96 in four is twenty seconds', secondsFor(8, 96, 4) === 20, String(secondsFor(8, 96, 4)));
ok('a waltz counts three to the bar', secondsFor(8, 96, 3) === 15, String(secondsFor(8, 96, 3)));
/* Two bars at 160 is three seconds. The engine will not make three seconds,
   and finding that out as a refusal after the credits are taken is the worst
   way to learn it. */
ok('a very short ask is raised to what the engine will make',
  secondsFor(2, 160, 4) === SHORTEST, String(secondsFor(2, 160, 4)));
ok('and a very long one is capped', secondsFor(16, 20, 8) === LONGEST, String(secondsFor(16, 20, 8)));
ok('every offered bar count lands inside the engine',
  BAR_CHOICES.every((bars) => {
    const seconds = secondsFor(bars, 96, 4);
    return seconds >= SHORTEST && seconds <= LONGEST;
  }));
/* Nonsense in the meter still produces a length rather than NaN, which would
   travel all the way to the engine as `duration_ms: null`. */
ok('a nonsense tempo still has a length', secondsFor(8, 0, 4) > 0, String(secondsFor(8, 0, 4)));
ok('and a nonsense meter does too', secondsFor(8, 96, 0) > 0, String(secondsFor(8, 96, 0)));

/* ── The sentence a person reads ───────────────────────────────────────── */
const said = asked({ bars: 8, beats: 4, bpm: 96, key: 'A minor', instrument: rhodes! });
ok('the request reads back in a musician\'s terms',
  said.bars === '8' && said.key === 'A minor' && said.tempo === '96 BPM · 4/4',
  JSON.stringify(said));
ok('and it names the instrument by its i18n key, not its English',
  said.instrument === 'part.rhodes', said.instrument);

/* ── The body the existing route already understands ──────────────────── */
/* There is no `/api/part`, and there must not be one: `/api/music` already
   charges by length, guards the text before spending, handles the free
   allowance and refunds a refusal. A second route would be a second copy of a
   money path, which is exactly how two copies stop agreeing. */
import { bodyFor } from '../app/lib/parts';
const body = bodyFor({ bars: 8, beats: 4, bpm: 96, key: 'A minor', instrument: rhodes! });
ok('the body carries one section, not a bare prompt', body.sections.length === 1);
ok('and that section has no words in it', body.sections[0].lines.length === 0);
ok('and it is named after the instrument', body.sections[0].name === 'Electric piano', body.sections[0].name);
/* The section length and the request length are the same number. They are
   read by different halves of `buildRequest`, and a request that asks for
   twenty seconds in one place and sixty in the other gets whichever the
   engine happens to prefer. */
ok('the section and the request agree on the length',
  body.sections[0].seconds === body.seconds && body.seconds === 20,
  `${body.sections[0].seconds} vs ${body.seconds}`);
ok('and it is flagged instrumental', body.instrumental === true);
ok('so nothing sings on it', /no vocals/.test(body.style));

/* There is no route, and the check says so out loud rather than leaving it to
   somebody to notice the file is missing. */
import { existsSync } from 'node:fs';
ok('there is no second money path', !existsSync('app/api/part/route.ts'));

/* ── Every name is in the dictionary, in both ──────────────────────────── */
/* `check:afrikaans` only sees keys that are in the dictionary. This sees the
   keys this file can emit — which is the half that catches a new instrument
   added without its Afrikaans. */
const dictionary = readFileSync('app/lib/i18n.tsx', 'utf8');
const missing = INSTRUMENTS.filter((one) => !dictionary.includes(`"${one.name}"`)).map((one) => one.name);
ok('every instrument is named in both languages', missing.length === 0, missing.join(', '));

console.log(
  failures
    ? `\ncheck:parts — ${failures} assertion(s) failed.`
    : '\ncheck:parts — a part is asked for in bars, a key and a tempo, and the length always lands.',
);
process.exit(failures ? 1 : 0);
