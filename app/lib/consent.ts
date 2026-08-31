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
export const VOICE_CONSENT =
  'This is my own voice. I am the person speaking on the recording, it is not ' +
  'an imitation of anybody else, and I am giving FutureBox permission to make a ' +
  'model of it. A copy is kept until I delete it.';
