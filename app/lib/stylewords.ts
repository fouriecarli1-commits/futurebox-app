/**
 * Lyrics that landed in the sound box, taken back out.
 *
 * The owner, 22 October 2026, in a collab: *"Ek het nou 2 keer 'n liedjie
 * probeer maak en elke keer kom dit sonder lyrics uit. Die tweede keer het
 * ek vir copilot gevra en hy het gesê hy sit die lirieke bo die styl."* The
 * style is a description the engine reads; it is never sung. Words written
 * into it — by the copilot, or pasted by hand — went to the engine as a
 * description of a sound, and the song came back with nobody singing them.
 *
 * A sheet is recognised by its section markers on their own lines, the
 * shape every lyric in this app is written in: `[Verse]`, `[Chorus 2]`,
 * `[Brug]`. Everything from the first marker on is the words; what stands
 * before it is the sound. No marker, no lyrics: a long style with line
 * breaks is still a style.
 */
const MARKER = /^\s*\[(?:verse|vers|chorus|koor|refrein|pre-?chorus|bridge|brug|hook|intro|outro|slot)\b[^\]]*\]\s*$/im;

export interface Parted {
  /** What is left of the style: the description of the sound. */
  readonly style: string;
  /** The words found in it, from the first marker on, or '' when there were none. */
  readonly lyrics: string;
}

export function wordsOutOfStyle(style: string): Parted {
  const found = MARKER.exec(style);
  if (!found) return { style, lyrics: '' };
  const lyrics = style.slice(found.index).trim();
  /* A sheet with no words under its markers is not lyrics either. */
  const sung = lyrics.split('\n').some((line) => line.trim() && !/^\s*\[[^\]]*\]\s*$/.test(line));
  if (!sung) return { style, lyrics: '' };
  const left = style.slice(0, found.index)
    .split('\n').map((line) => line.trim()).filter(Boolean).join(', ')
    .replace(/^(style|styl|sound|klank)\s*:\s*/i, '');
  return { style: left, lyrics };
}
