/**
 * The song's shape, read off its own plan.
 *
 *   "wat is Ai musiek en so program werd as niemand werklik leer om soos 'n
 *    musikant te dink nie."
 *
 * `docs/MUSIEKDENKE.md` §3.1. A listener hears a song; a musician hears verse,
 * chorus, verse, chorus, bridge, chorus. This is the file that turns the plan
 * a song was made from into that second thing, so it is the file where getting
 * it wrong teaches somebody something untrue.
 *
 * ── The three ways it could lie ──────────────────────────────────────────
 *
 * 1. **Lettering by label instead of by role.** "Verse 1" and "Verse 2" are
 *    the same section with different words. Give them different letters and
 *    every song looks like it has six distinct sections, which is the opposite
 *    of the thing being taught.
 * 2. **Naming a shape that is not one.** An arbitrary sequence handed a
 *    genre-sounding label is the app teaching a word that does not exist.
 * 3. **Lettering the seasoning.** An intro and an outro are around the form,
 *    not in it. AABA is four letters for a song with six parts on the page,
 *    and a version that counted the intro would call it BAABC and be wrong
 *    about the one thing anybody would look it up for.
 *
 *   npm run check:form
 */
import { formOf, roleOf, type Part } from '../app/lib/form';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const sung = (name: string, seconds = 20): Part => ({ name, lines: ['la'], seconds });
const played = (name: string, seconds = 8): Part => ({ name, lines: [], seconds });

/* ── What a part is called, and what it is ─────────────────────────────── */
ok('a verse is a verse', roleOf('Verse 2') === 'verse');
ok('and so is a "vers"', roleOf('Vers 1') === 'verse');
ok('a chorus is a chorus', roleOf('Chorus 1') === 'chorus');
ok('and so are koor, refrein and hook',
  roleOf('Koor') === 'chorus' && roleOf('Refrein') === 'chorus' && roleOf('Hook') === 'chorus');
/* "pre-chorus" contains "chorus". A file that tested for the shorter word
   first would call the build-up a chorus, and then every song would look like
   it had its chorus twice as often as it does. */
ok('a pre-chorus is not a chorus', roleOf('Pre-Chorus') === 'prechorus');
ok('and a voorkoor is not either', roleOf('Voorkoor') === 'prechorus');
ok('a breakdown is a break, not a bridge', roleOf('Breakdown') === 'break');
ok('a brug is a bridge', roleOf('Brug') === 'bridge');
ok('something nobody has heard of is "other"', roleOf('Kwaito section') === 'other');

/* ── The letters ───────────────────────────────────────────────────────── */
const pop = formOf([
  played('Intro', 4), sung('Verse 1'), sung('Chorus 1'), sung('Verse 2'),
  sung('Chorus 2'), sung('Bridge'), sung('Final chorus'), played('Outro', 4),
]);
ok('two verses share a letter', pop.letters === 'ABABCB', pop.letters);
ok('the intro and outro are not lettered', pop.letters.length === 6, pop.letters);
ok('and a normal pop song is named verse–chorus', pop.shape === 'verse-chorus', pop.shape);
ok('the chorus lands after the intro and the first verse', pop.chorusAt === 24, String(pop.chorusAt));
ok('and the whole thing adds up', pop.seconds === 128, String(pop.seconds));

const standard = formOf([sung('Verse 1'), sung('Verse 2'), sung('Bridge'), sung('Verse 3')]);
ok('AABA is AABA', standard.letters === 'AABA' && standard.shape === 'aaba', standard.letters);

const folk = formOf([sung('Verse 1'), sung('Verse 2'), sung('Verse 3')]);
ok('one section over and over is strophic', folk.shape === 'strophic', folk.letters);

/* ── And what it refuses to name ───────────────────────────────────────── */
const odd = formOf([sung('Kwaito section'), sung('Sax bit'), sung('Chant'), sung('Kwaito section 2')]);
ok('an unheard-of shape still gets letters', odd.letters === 'ABCA', odd.letters);
ok('and is not given a name it does not have', odd.shape === '', odd.shape);
/* The last part is "Kwaito section 2" — the same section, numbered. A file
   that lettered by exact name would call this ABCD and say the song never
   comes back to anything. */
ok('a numbered repeat of an unknown section is the same section', odd.letters.endsWith('A'), odd.letters);

const noChorus = formOf([sung('Verse 1'), sung('Bridge'), sung('Verse 2'), sung('Bridge 2')]);
ok('alternating without a chorus is not verse–chorus', noChorus.shape === '', noChorus.shape);

/* ── Nothing ───────────────────────────────────────────────────────────── */
const nothing = formOf([]);
ok('a song with no plan has no shape', nothing.letters === '' && nothing.shape === '' && nothing.chorusAt === -1);
const instrumental = formOf([played('Intro'), played('Break'), played('Outro')]);
ok('and one nobody sings on has no letters', instrumental.letters === '', instrumental.letters);
ok('but still has its parts', instrumental.parts.length === 3);

console.log(
  failures
    ? `\ncheck:form — ${failures} assertion(s) failed.`
    : '\ncheck:form — the letters say what comes back, and a shape with no name is given none.',
);
process.exit(failures ? 1 : 0);
