/**
 * The shape of a song, named.
 *
 * ── Why this is the first thing built out of `docs/MUSIEKDENKE.md` ───────
 *
 * A listener hears "a song". A musician hears verse, chorus, verse, chorus,
 * bridge, chorus. That single step — from one thing to a shape made of parts
 * that come back — is the biggest difference between the two, and it is the
 * one this app can hand somebody for nothing, because it already knows the
 * answer: `Track.parts` is the plan the song was actually made from.
 *
 * Nobody is taught anything here. The song is drawn as what it is, with the
 * parts named and the letters a musician would put under them, attached to
 * their own record. Somebody who makes twenty songs sees the chorus land at
 * 0:45 in the good ones and at 1:20 in the ones nobody finished, and works
 * out why without being told.
 *
 * ── Why letters, and why by role rather than by name ─────────────────────
 *
 * Form analysis letters distinct *sections*, not distinct labels. "Verse 1"
 * and "Verse 2" are the same music with different words, so both are A. That
 * is what makes AABA mean something: the letters say what comes back.
 *
 * Naming a part is deliberately generous — somebody typing their own lyric
 * sections writes `[Koor]`, `[Refrein]`, `[Chorus 2]` or `Hook`, and a
 * lettering that gave each of those its own letter would say a song had six
 * distinct sections when it has two.
 *
 * ── What it refuses to name ──────────────────────────────────────────────
 *
 * A shape that is not one of the ones with a name gets its letters and no
 * name. Inventing a genre-sounding label for an arbitrary sequence would be
 * the app teaching somebody a word that does not exist, which is worse than
 * teaching them nothing.
 */

/** One part of a song, as `Track.parts` and `lib/songshape.ts` carry it. */
export interface Part {
  readonly name: string;
  readonly lines: readonly string[];
  readonly seconds: number;
}

/** What a part is, whatever it happens to be called. */
export type Role = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'break' | 'outro' | 'other';

/* Afrikaans and English both, because the words people type into their own
   lyric sections are in whichever language they are writing in. Ordered:
   'prechorus' is tried before 'chorus' or "pre-chorus" matches "chorus", and
   'break' before 'bridge' for the same kind of reason. */
const WORDS: ReadonlyArray<readonly [Role, readonly string[]]> = [
  ['intro', ['intro', 'inleiding', 'aanhef']],
  ['outro', ['outro', 'slot', 'einde', 'uitro']],
  ['prechorus', ['prechorus', 'pre-chorus', 'pre chorus', 'voorkoor', 'aanloop', 'build', 'rise']],
  ['chorus', ['chorus', 'koor', 'refrein', 'hook', 'drop']],
  ['verse', ['verse', 'vers', 'couplet', 'strofe']],
  ['bridge', ['bridge', 'brug', 'middle eight', 'middel']],
  ['break', ['break', 'breakdown', 'solo', 'instrumental', 'instrumentaal', 'tussenspel']],
];

/** What a part is, from what it is called. */
export function roleOf(name: string): Role {
  const plain = name.toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [role, words] of WORDS) {
    if (words.some((word) => plain.includes(word))) return role;
  }
  return 'other';
}

/** A part, placed in the song and lettered. */
export interface Placed {
  readonly name: string;
  readonly role: Role;
  readonly seconds: number;
  /** Where it starts, in seconds from the top. */
  readonly at: number;
  /**
   * Its letter, or '' for a part nobody sings on.
   *
   * An intro, a break and an outro are not lettered: they are the seasoning
   * around the shape rather than part of it, which is why AABA is four
   * letters for a song that has six parts on the page.
   */
  readonly letter: string;
}

/** Not lettered: these sit around the form rather than in it. */
const AROUND: ReadonlySet<Role> = new Set<Role>(['intro', 'break', 'outro']);

export interface Form {
  readonly parts: readonly Placed[];
  /** "ABAB", or '' when nothing is sung. */
  readonly letters: string;
  /**
   * What this shape is called, or '' when it is not a shape with a name.
   *
   * A key rather than a sentence, so `lib/i18n.tsx` says it in her language.
   */
  readonly shape: 'verse-chorus' | 'aaba' | 'strophic' | '';
  /** When the chorus first lands, in seconds, or -1 if there is no chorus. */
  readonly chorusAt: number;
  readonly seconds: number;
}

export const NO_FORM: Form = { parts: [], letters: '', shape: '', chorusAt: -1, seconds: 0 };

/**
 * Read a song's shape off the plan it was made from.
 *
 * Lettering is by role first, and by name within `other` — so a song whose
 * sections are all called things this file has never heard of still gets
 * letters that say what comes back, rather than one letter per part.
 */
export function formOf(parts: readonly Part[]): Form {
  if (!parts.length) return NO_FORM;

  const letters = new Map<string, string>();
  const ALPHABET = 'ABCDEFGH';
  let at = 0;
  const placed: Placed[] = parts.map((part) => {
    const role = roleOf(part.name);
    let letter = '';
    if (!AROUND.has(role)) {
      const key = role === 'other' ? `other:${part.name.toLowerCase().replace(/\s*\d+\s*$/, '').trim()}` : role;
      if (!letters.has(key)) letters.set(key, ALPHABET[letters.size] ?? '·');
      letter = letters.get(key) as string;
    }
    const one: Placed = { name: part.name, role, seconds: part.seconds, at, letter };
    at += part.seconds;
    return one;
  });

  const word = placed.map((one) => one.letter).join('');
  const chorus = placed.find((one) => one.role === 'chorus');

  return {
    parts: placed,
    letters: word,
    shape: shapeOf(word, placed),
    chorusAt: chorus ? chorus.at : -1,
    seconds: at,
  };
}

/**
 * The name of a shape, when it has one.
 *
 * Three, and only three:
 *
 *   verse–chorus  the thing almost every record on the radio is. A verse and
 *                 a chorus that alternate — ABAB, ABABCB, ABABB.
 *   AABA          the thirty-two bar song form: two of the same, something
 *                 different, back to the first. Standards, and most of what
 *                 was written before 1960.
 *   strophic      one section, over and over, with new words each time. Folk
 *                 songs, hymns, most of what a guitar and a voice produces.
 *
 * Anything else keeps its letters and gets no name, on purpose — see the note
 * at the top of this file.
 */
function shapeOf(word: string, placed: readonly Placed[]): Form['shape'] {
  if (word.length < 2) return '';
  if (/^A+$/.test(word)) return 'strophic';
  if (word === 'AABA') return 'aaba';
  /* Alternating, and with a real chorus in it. The letters alone cannot tell
     verse–chorus from AABA'd anything, so the role is what decides: B has to
     actually be the chorus. */
  const hasChorus = placed.some((one) => one.role === 'chorus');
  const hasVerse = placed.some((one) => one.role === 'verse');
  if (hasChorus && hasVerse && /^(?:[AB]|C)+$/.test(word) && word.includes('AB')) return 'verse-chorus';
  return '';
}
