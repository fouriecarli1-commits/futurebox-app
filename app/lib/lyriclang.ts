/**
 * Which language the words are in, so the engine can be told.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Nothing in the request to ElevenLabs said what language the lyrics were in.
 * The style words went — "Afrikaanse pop" if somebody happened to write that —
 * and the words themselves went, and the model was left to work it out from
 * the spelling. It often does. When it does not, what comes back is Afrikaans
 * words sung as though they were English, which is worse than either.
 *
 * A direction costs nothing and is the one thing that can help: `positive_styles`
 * is how everything else about the performance is asked for, and this is the
 * same kind of ask.
 *
 * ── What this is honest about ────────────────────────────────────────────
 *
 * It is a direction, not a setting. There is no language parameter in the
 * Music API — this puts words into the style list and the model reads them
 * like the rest. It cannot be promised, and the room says "asked for" rather
 * than "in".
 *
 * ── Why the markers are the ones below ───────────────────────────────────
 *
 * Only words that are Afrikaans and are not also English. `is`, `my`, `was`,
 * `in`, `so` and `die` were all tried and all removed: "die" is English enough
 * to appear in half the lyrics anybody writes, and a detector that fires on an
 * English chorus and asks for Afrikaans singing has made the exact fault it
 * was built to prevent.
 *
 * Two markers, not one, because a single "nie" in an English lyric is somebody
 * quoting. Two is a sentence.
 *
 * `pad`, `hou` and `ry` are the borderline ones: each is a word in English
 * too. They stay because two are needed to fire and because an English lyric
 * that happens to carry two of exactly those three is rarer than an Afrikaans
 * one that carries them alone. If that ever bites, they are the first three
 * to remove — and the person can always press English themselves, which is
 * the reason the control exists rather than the guess deciding on its own.
 */

/** Words that are Afrikaans and are not English. Bounded, lowercase. */
const AFRIKAANS = [
  // the small words that carry a sentence
  'nie', 'jy', 'jou', 'ek', 'het', 'vir', 'wat', 'hulle', 'ons', 'julle',
  'deur', 'want', 'maar', 'omdat', 'nog', 'weer', 'saam', 'sonder', 'altyd',
  'nooit', 'niks', 'myne', 'joune', 'alleen', 'baie',
  // the words a song is made of
  'sê', 'môre', 'aand', 'nag', 'dae', 'vandag', 'gister', 'vanaand',
  'lekker', 'liefde', 'hart', 'oë', 'hande', 'wêreld', 'lewe', 'droom',
  'huis', 'terug', 'pad', 'lank', 'stil',
  // the verbs
  'kan', 'moet', 'gaan', 'kom', 'maak', 'wees', 'dink', 'weet', 'voel',
  'praat', 'staan', 'kyk', 'bly', 'hou', 'gee', 'vra', 'ry',
  // and the questions
  'hoekom', 'waarheen', 'wanneer', 'asseblief',
];

const SET = new Set(AFRIKAANS);

/**
 * Whether these words read as Afrikaans.
 *
 * Section markers are dropped first: `[Chorus]` is the app's own word and says
 * nothing about what is being sung.
 */
export function looksAfrikaans(lyrics: string): boolean {
  const words = lyrics
    .replace(/\[[^\]]*\]/g, ' ')
    .toLowerCase()
    .split(/[^a-zà-ÿ']+/)
    .filter(Boolean);
  if (words.length < 4) return false;
  let hits = 0;
  for (const word of words) {
    if (SET.has(word)) hits += 1;
    if (hits >= 2) return true;
  }
  return false;
}

/** The three answers the room offers. */
export type SingIn = 'af' | 'en' | 'auto';

/**
 * The direction to add to the style, or nothing.
 *
 * `auto` adds nothing on purpose: it means "you work it out", and a request
 * that says nothing is exactly what that is.
 */
export function singDirection(choice: SingIn): string[] {
  if (choice === 'af') return ['sung in Afrikaans', 'Afrikaans lyrics', 'South African vocal'];
  if (choice === 'en') return ['sung in English', 'English lyrics'];
  return [];
}
