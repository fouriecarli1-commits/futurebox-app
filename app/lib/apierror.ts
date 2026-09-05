/**
 * What a refusal says, in the reader's own language.
 *
 * ── The bug this fixes ───────────────────────────────────────────────────
 *
 * Every visible string in the advert room is translated — twenty-two of them,
 * checked. Then you press the button, the writer is not switched on, and the
 * room answers:
 *
 *     "Ad writing is switched off for this app."
 *
 * In English, in a room that is otherwise entirely Afrikaans. Found by testing
 * the room in Afrikaans rather than by reading it in English.
 *
 * The cause is structural rather than an oversight in one file. Client strings
 * go through the dictionary; a sentence the *server* writes does not, and it
 * cannot — the server has no idea which language the person reading it chose.
 * Twenty-eight routes write English messages, and the components print them
 * straight out with `data.message ?? t('some.fallback', …)`. The fallback is
 * translated and is almost never reached, because the route nearly always
 * sends a message.
 *
 * ── Why this needs no change on the server ───────────────────────────────
 *
 * The routes already send a code beside the sentence — `no_key`,
 * `rate_limited`, `refused`, twenty-five of them. Nobody was reading it.
 *
 * So: translate on the code, and fall back to the server's own sentence when
 * the code is one this app has no words for. That keeps two properties worth
 * keeping. A refusal never comes back empty, because the English sentence is
 * always there underneath. And a new code added on the server needs no change
 * here to keep working — it degrades to English rather than to nothing, and
 * `check:afrikaans` will not catch that, so the list below is worth extending
 * when a route grows a new one.
 *
 * ── What is deliberately not translated ──────────────────────────────────
 *
 * `refused` — the moderation gate's own reason. That sentence is written per
 * refusal and says what specifically was wrong, which is more useful than a
 * generic Afrikaans line saying the same thing less precisely. It comes
 * through as the server wrote it.
 */

import type { Lang } from './i18n';

interface Refusal {
  readonly error?: string;
  readonly message?: string;
  readonly detail?: string;
}

/**
 * Codes this app has its own words for.
 *
 * Only the ones a member can actually cause. `bad_request` and `unparsed` are
 * here because a member sees them when something goes wrong mid-flow; codes
 * that only fire on a malformed request nobody could make by hand are left to
 * the server's sentence.
 */
const SAID: Record<string, { en: string; af: string }> = {
  no_key: {
    en: 'That is not switched on for this app yet.',
    af: 'Dit is nog nie vir hierdie app aangeskakel nie.',
  },
  no_accounts: {
    en: 'This app has no accounts set up yet.',
    af: 'Hierdie app het nog geen rekeninge opgestel nie.',
  },
  live_not_set_up: {
    en: 'The live room is not switched on for this app yet.',
    af: 'Die lewendige kamer is nog nie vir hierdie app aangeskakel nie.',
  },
  /* A paywall, not a fault. The distinction matters on the screen: "that
     broke" sends somebody to the help desk, "you have not bought this" sends
     them to the thing that sells it. */
  locked: {
    en: 'That is part of the marketing add-on, which is not on this account yet.',
    af: 'Dit is deel van die bemarkingsbyvoeging, wat nog nie op hierdie rekening is nie.',
  },
  no_provider: {
    en: 'Nothing is connected that can make that.',
    af: 'Niks wat dit kan maak is gekoppel nie.',
  },
  not_metered: {
    en: 'Accounts are not set up for this app.',
    af: 'Rekeninge is nie vir hierdie app opgestel nie.',
  },
  signed_out: {
    en: 'Sign in first.',
    af: 'Teken eers in.',
  },
  not_owned: {
    en: 'That is not yours.',
    af: 'Dit is nie joune nie.',
  },
  empty: {
    en: 'Say what you want first.',
    af: 'Sê eers wat jy wil hê.',
  },
  too_big: {
    en: 'That file is too big.',
    af: 'Daardie lêer is te groot.',
  },
  rate_limited: {
    en: 'Too many at once. Try again in a moment.',
    af: 'Te veel op een slag. Probeer weer oor ’n oomblik.',
  },
  engine_full: {
    en: "This month's allowance is used up. Nothing has been charged.",
    af: 'Hierdie maand se toelaag is op. Niks is gehef nie.',
  },
  bad_key: {
    en: 'The key this app uses was rejected. Nothing has been charged.',
    af: 'Die sleutel wat hierdie app gebruik is verwerp. Niks is gehef nie.',
  },
  unreachable: {
    en: 'That service could not be reached. Try again in a moment.',
    af: 'Daardie diens kon nie bereik word nie. Probeer weer oor ’n oomblik.',
  },
  upstream: {
    en: 'That service answered with an error.',
    af: 'Daardie diens het met ’n fout geantwoord.',
  },
  api_error: {
    en: 'That service could not be reached.',
    af: 'Daardie diens kon nie bereik word nie.',
  },
  unparsed: {
    en: 'That came back in a form this app could not read.',
    af: 'Dit het teruggekom in ’n vorm wat hierdie app nie kon lees nie.',
  },
  unreadable: {
    en: 'That came back in a form this app could not read.',
    af: 'Dit het teruggekom in ’n vorm wat hierdie app nie kon lees nie.',
  },
  nothing_heard: {
    en: 'Nothing could be heard in that.',
    af: 'Niks kon daarin gehoor word nie.',
  },
  bad_request: {
    en: 'That request could not be read.',
    af: 'Daardie versoek kon nie gelees word nie.',
  },
  unknown: {
    en: 'Something went wrong there.',
    af: 'Iets het daar verkeerd geloop.',
  },
};

/**
 * The sentence to put on screen for a refusal.
 *
 * In order: our own words for the code, then the server's sentence, then the
 * caller's fallback. Never empty — a refusal with nothing on screen is the
 * failure mode this whole file exists to avoid, and it would be an easy one to
 * introduce while fixing the language.
 */
export function refusalText(said: Refusal | null | undefined, lang: Lang, fallback: string): string {
  const code = said?.error;
  const known = code ? SAID[code] : undefined;
  if (known) return lang === 'af' ? known.af : known.en;
  return said?.message || said?.detail || fallback;
}
