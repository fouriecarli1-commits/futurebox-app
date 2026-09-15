/**
 * The words somebody agrees to before their voice is copied.
 *
 * One string, in one file, imported by the screen that shows it and by the
 * route that writes it down. A record that says "they accepted the terms" is
 * worth nothing once the terms have changed; a record that carries the exact
 * sentence they read is worth something years later, which is when it will be
 * asked for.
 *
 * If this ever changes, change it here and the record changes with it — and
 * the voices cloned under the old wording keep the old wording, because that
 * is what they agreed to.
 *
 * The screen can show this in Afrikaans, and does. What is written to the
 * record is this English sentence, because a record needs one wording rather
 * than one per language, and the terms say the English version governs. The
 * Afrikaans in `i18n.tsx` is a translation of this exact sentence and has to
 * stay one.
 */
/* Changed 15 September 2026: the age is now in the sentence.

   ElevenLabs' privacy policy 11 (20 May 2026) is flat about it -- "all users
   are strictly prohibited from uploading, transmitting, emailing, or
   otherwise making Voice Data from children under the age of 18 available to
   us or other users or using them for any of our Services". No
   parental-consent carve-out, unlike their use policy 9(r), which allows 13
   to 18 with a parent. Their reading app sets 16. Three numbers in three
   documents from one company, and for an app whose whole point is people
   singing, the strictest is the one to build to.

   It goes in this sentence rather than beside it because this sentence is
   what gets written down. A tick box somewhere else on the screen is a thing
   we would have to prove separately, years later; a clause in the recorded
   wording is proved by producing the record. Note what it does not say --
   "the person recording is 18" rather than "the account holder is 18". The
   terms already put the account in an adult's hands; this is about whose
   voice is on the tape, which is the thing the rule is actually about. */
export const VOICE_CONSENT =
  'This is my own voice, and I am 18 or older. I am the person speaking on the ' +
  'recording, it is not an imitation of anybody else, and I am giving FutureBox ' +
  'permission to make a model of it. A copy is kept until I delete it.';
