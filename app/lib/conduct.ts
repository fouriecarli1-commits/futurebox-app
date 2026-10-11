/**
 * How somebody speaks to the assistant, counted and nothing else.
 *
 * ── What she asked, and what this is ─────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Fair social usage. Ek wil nie hê mense moet AI
 * robots vloek nie… maar ons moet 'n afsny punte hê."* And, in the same
 * breath, the thing that makes this fair: *"Mense verloor hulle humeur en dit
 * is te verstane."*
 *
 * So this measures and does nothing. No refusal, no cool-down, no strike, no
 * change to a single reply. It writes a row and gets out of the way, so that
 * in thirty days the cut-off is set from a real number instead of a guess at
 * one. A policy written before the measurement is a policy about an imagined
 * customer.
 *
 * `check:conduct` holds it to that: the rule is registered with
 * `counts: false`, and nothing in the app may act on what this returns.
 *
 * ── The distinction this file exists to make ─────────────────────────────
 *
 * Swearing is not abuse. This app is a music studio: its members write
 * lyrics, and plenty of good ones are filthy. Three different things use the
 * same words, and only the third is what she is asking about.
 *
 *   1. **Swearing about the thing.** "This is fucking broken", "hierdie kak
 *      werk nie". That is frustration with a product, and she said herself it
 *      is understandable. Counting it would turn her own customers into
 *      offenders for being annoyed, and the number would be meaningless.
 *   2. **Swearing in the work.** "Write a chorus that says fok jou". The
 *      words are the job. Counting this would mean the angriest songwriters
 *      look like the worst people, which is both wrong and a terrible thing
 *      to find out later from a suspension list.
 *   3. **Swearing AT the assistant.** "Fok jou", "you useless piece of shit".
 *      Directed at a second person. This is the only one counted.
 *
 * The test for the third is direction: a profanity with a second-person word
 * — you, your, jy, jou, julle — close to it. Not anywhere in the message:
 * *close* to it, because "can you write something about this fucking country"
 * has both words in it and is case 2 wearing case 3's clothes.
 *
 * ── Why it is a word list and not a model ────────────────────────────────
 *
 * Because it runs on the chat surfaces, which are the app's hot path, and
 * because a model asked "is this abusive?" answers a slightly different
 * question every time it is asked. A measurement whose definition drifts is
 * not a measurement. This one is blunt, written down, and the same in March
 * as in October — and it is reported as a count, which is all a count needs
 * to be.
 *
 * It will miss things. Someone can be cruel without a single listed word, and
 * this will not see it. That is an acceptable floor for a thirty-day count
 * and would not be acceptable for a punishment, which is the other reason
 * nothing is punished on it.
 */

/**
 * The words, English and Afrikaans.
 *
 * Afrikaans is not a translation of the English list and could not be: `kak`
 * and `bliksem` carry weight that no English word on this list carries, and
 * `moer` is a hardware shop's word for a nut as well as a threat. They earn
 * their place by being directed, not by appearing.
 */
const SWEARING = new RegExp(
  '\\b('
  + 'fuck|fucking|fucked|fucker|shit|shitty|bullshit|bitch|bastard|cunt|dick|'
  + 'prick|asshole|arsehole|idiot|idiots|stupid|moron|moronic|useless|pathetic|'
  + 'retard\\w*|dumb|garbage|trash|'
  + 'fok|fokken|fokkin|fokker|kak|kakker\\w*|poes|doos|dose|bliksem|donner|'
  + 'moer|naai|teef|gat|simpel|dom|onnosel|nutteloos|patetie\\w*'
  + ')\\b',
  'i',
);

/**
 * Second person, in both languages.
 *
 * `u` is deliberately absent. It is the formal "you", and somebody being
 * formal is not somebody swearing at a machine — but it is also a single
 * letter that appears inside nothing and beside everything, and a one-letter
 * token in a proximity rule is a false positive waiting to be counted.
 */
const SECOND_PERSON = /\b(you|your|you're|youre|yours|yourself|u r|jy|jou|joune|julle|jouself)\b/i;

/**
 * How close the two have to be, in words.
 *
 * Four either side. Wide enough for "you are a complete fucking waste", tight
 * enough that "can you write me something about this fucking country" does
 * not read as an insult — which it is not, and which was the first sentence
 * this was tested against.
 */
export const NEAR = 4;

/**
 * Being asked for, rather than said.
 *
 * A songwriter asking for a line is the single most likely false positive in
 * a music app, and the most damaging: it would put the people using the
 * product hardest at the top of a list of the worst behaved.
 *
 * Checked across the whole message rather than near the words, because the
 * ask and the words it asks for are usually at opposite ends of the sentence
 * — "write me a chorus that ends with fok jou".
 */
const ASKING_FOR_IT = new RegExp(
  '\\b('
  + 'write|writing|written|make|making|generate|lyric|lyrics|chorus|verse|line|'
  + 'song|rap|rhyme|say|sing|title|caption|script|put|add|include|about|'
  + 'skryf|skrywe|maak|liedjie|lirieke|woorde|vers|koor|reël|reels|sing|titel|'
  + 'oor|byvoeg|insit'
  + ')\\b',
  'i',
);

/** What a count is made of, so the number can be explained later. */
export interface Conduct {
  /** The word that matched, for a count by word rather than only a total. */
  readonly word: string;
  /** The second-person word it was aimed with. */
  readonly at: string;
}

/**
 * Whether this message swears AT whoever is reading it.
 *
 * `null` for everything else, which is almost everything.
 */
export function directedAt(text: string): Conduct | null {
  if (!text) return null;
  /* Asked for, not said. Checked first: it is the cheap one and it settles
     the whole message rather than one position in it. */
  if (ASKING_FOR_IT.test(text)) return null;

  const words = text.split(/\s+/);
  for (let at = 0; at < words.length; at += 1) {
    const swearing = SWEARING.exec(words[at]);
    if (!swearing) continue;
    const from = Math.max(0, at - NEAR);
    const to = Math.min(words.length, at + NEAR + 1);
    for (let near = from; near < to; near += 1) {
      if (near === at) continue;
      const person = SECOND_PERSON.exec(words[near]);
      if (person) return { word: swearing[1].toLowerCase(), at: person[1].toLowerCase() };
    }
  }
  return null;
}
