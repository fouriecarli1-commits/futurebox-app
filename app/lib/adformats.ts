/**
 * What an advert can actually BE, in this studio.
 *
 * ── Why the desk needed this ─────────────────────────────────────────────
 *
 * The advert desk wrote adverts: a headline, a body line, a button, a line to
 * say aloud, a shot to film. Good ones. And it never once asked the question
 * that comes before all of that — should this be a filmed advert at all?
 *
 * For a lot of small businesses it should not. A one-person leather workshop
 * is better served by forty seconds of somebody's own voice over three
 * photographs than by a generated clip of a bag. A church group wants a song.
 * A consultancy wants an episode. A bakery wants fifteen vertical seconds and
 * nothing else. The desk had one answer to a question with eight.
 *
 * Carli, 11 September 2026: "dalk is 'n podcast styl soms die voordeel, ander
 * kere weer kort videos, dalk 'n explainer video, dalk net 'n liedjie met 'n
 * foto... Die advert funksie dink ek gaan baie mense attract as dit diepte
 * het en die moeite werd is."
 *
 * ── Why a catalogue and not a free answer ────────────────────────────────
 *
 * Because a model asked "what should this business make?" writes a beautiful
 * paragraph about a billboard campaign. Every entry here is something this
 * app can make, in a room that exists, today. The route hands the model this
 * list and it picks from it by id — it recommends, it does not invent. An id
 * that is not in this file is dropped before it reaches the screen.
 *
 * That is the whole difference between advice and a studio. A recommendation
 * you cannot act on is worth less than no recommendation, because it costs
 * the reader the time to find out.
 *
 * ── What is deliberately not here ────────────────────────────────────────
 *
 * Prices. Every room says what it charges, at its own button, from one
 * function. A second copy of a number in this file would be a number that
 * drifts, and this codebase has paid for that twice. `effort` is about the
 * person's time, which no other file knows.
 */

import type { SurfaceId } from './surfaces';

export interface AdFormat {
  readonly id: string;
  /** The room that makes it. Must be a room that exists — see check:adformats. */
  readonly room: SurfaceId;
  /**
   * The operation that sets that room up on arrival, where there is one.
   *
   * Must be an operation the room actually registers. A format that lands
   * somebody in an empty room having just been told exactly what to make is
   * the fault this whole week has been about.
   */
  readonly op?: string;
  readonly en: string;
  readonly af: string;
  /** One line, on the card. */
  readonly whatEn: string;
  readonly whatAf: string;
  /** How much of the person's own time it takes. Not money. */
  readonly effort: 'low' | 'medium' | 'high';
  /**
   * When this is the right answer — written for the model, not for the screen.
   *
   * Specific enough to rule itself out. "Good for engagement" fits everything
   * and therefore chooses nothing.
   */
  readonly fits: string;
  /** What makes it the wrong answer. Every entry has one; that is the point. */
  readonly fails: string;
}

export const AD_FORMATS: readonly AdFormat[] = [
  {
    id: 'short_vertical',
    room: 'canvas',
    op: 'set_prompt',
    en: 'A short vertical clip',
    af: '’n Kort staande snit',
    whatEn: 'Five to ten seconds, one idea, made by the video engine.',
    whatAf: 'Vyf tot tien sekondes, een gedagte, deur die video-enjin gemaak.',
    effort: 'low',
    fits:
      'Something you can show rather than explain — food, a place, an object, a before and after. ' +
      'The buyer is scrolling and has not asked a question yet.',
    fails:
      'Anything that needs a reason, a price comparison or trust. Ten seconds cannot argue, ' +
      'and a generated clip of a person is still the fastest way to look like everybody else.',
  },
  {
    id: 'explainer_voice_over_stills',
    room: 'voice_studio',
    op: 'set_script',
    en: 'Your own voice over your own pictures',
    af: 'Jou eie stem oor jou eie foto’s',
    whatEn:
      'Thirty to sixty seconds: you read the script, your real photographs carry the picture. ' +
      'Cut together on the video desk.',
    whatAf:
      'Dertig tot sestig sekondes: jy lees die teks, jou regte foto’s dra die beeld. ' +
      'Op die videolessenaar aanmekaar gesny.',
    effort: 'medium',
    fits:
      'A service, a craft, anything where the person IS the product, and anything that needs ' +
      'explaining before it can be wanted. Real photographs of real work beat a generated clip ' +
      'at this every time, and a real voice is the cheapest trust there is.',
    fails:
      'Somebody with no photographs of their own work yet, and anybody who will not record ' +
      'their own voice — a cloned read of a script nobody wrote in their own words sounds like it.',
  },
  {
    id: 'explainer_film',
    room: 'canvas',
    op: 'write_scenes',
    en: 'A longer explainer, cut from several shots',
    af: '’n Langer verduideliker, uit verskeie skote gesny',
    whatEn: 'Under two minutes, built shot by shot, with subtitles burnt in.',
    whatAf: 'Onder twee minute, skoot vir skoot gebou, met onderskrifte ingebrand.',
    effort: 'high',
    fits:
      'Something genuinely new that has to be understood before it can be bought, or a process ' +
      'whose steps are the selling point. Worth it when one video will be used for a year.',
    fails:
      'A product people already understand. A two-minute explanation of a bakery is two minutes ' +
      'nobody watches, and it costs several generations to find that out.',
  },
  {
    id: 'song_with_a_photo',
    room: 'make',
    en: 'A song, over one photograph',
    af: '’n Liedjie, oor een foto',
    whatEn: 'Written here, sung here. One still image, and the song does the work.',
    whatAf: 'Hier geskryf, hier gesing. Een stilbeeld, en die liedjie doen die werk.',
    effort: 'low',
    fits:
      'A launch, a season, a place, a feeling — anything sold on mood rather than on facts. ' +
      'Also the only format on this list somebody will play twice, which is worth more than ' +
      'any single view. Strongest in Afrikaans, where almost nobody is doing it.',
    fails:
      'Anything with a number, a deadline or a condition in it. A song cannot say "R199 a ' +
      'month, cancel any time" and be taken seriously.',
  },
  {
    id: 'jingle',
    room: 'make',
    en: 'A jingle you use on everything',
    af: '’n Deuntjie wat jy oral gebruik',
    whatEn: 'Five to fifteen seconds. The same sound at the end of every clip you ever post.',
    whatAf: 'Vyf tot vyftien sekondes. Dieselfde klank aan die einde van elke snit wat jy plaas.',
    effort: 'low',
    fits:
      'Anybody who is going to post more than a dozen times. It is the cheapest thing on this ' +
      'list that compounds — the twentieth clip is recognised before the name is read.',
    fails:
      'A one-off campaign. A sound nobody hears repeatedly is a sound nobody remembers, so ' +
      'this is worth nothing to somebody making one advert.',
  },
  {
    id: 'podcast_episode',
    room: 'podcast',
    op: 'set_title',
    en: 'An episode, with its own feed',
    af: '’n Episode, met sy eie voer',
    whatEn: 'A real show on Apple and Spotify, not a clip. Can be dubbed into other languages.',
    whatAf: '’n Regte program op Apple en Spotify, nie ’n snit nie. Kan na ander tale oorgeklank word.',
    effort: 'high',
    fits:
      'Expertise that is worth more the longer somebody listens — consultants, coaches, anybody ' +
      'whose buyer is deciding slowly and wants to know who they would be dealing with. It is ' +
      'the only format here that builds an audience that comes back on its own.',
    fails:
      'Anything bought on impulse, and anybody who will not keep it up. Two episodes and silence ' +
      'is worse than none: it tells a listener the business stopped.',
  },
  {
    id: 'spoken_read',
    room: 'voice_studio',
    op: 'set_script',
    en: 'A spoken read, for radio or a voice note',
    af: '’n Gesproke lees, vir radio of ’n stemboodskap',
    whatEn: 'Thirty seconds of audio and nothing else. Community radio, WhatsApp, a shop speaker.',
    whatAf: 'Dertig sekondes klank en niks anders nie. Gemeenskapsradio, WhatsApp, ’n winkelluidspreker.',
    effort: 'low',
    fits:
      'Local businesses, where community radio still reaches more of the actual buyers than a ' +
      'feed does, and where a voice note forwarded between people is the real distribution.',
    fails:
      'Anything visual, and anything sold to people who are not local. Audio alone on a social ' +
      'feed is watched with the sound off, which is to say not watched.',
  },
  {
    id: 'written_posts',
    room: 'campaign',
    en: 'The written adverts, posted as they are',
    af: 'Die geskrewe advertensies, net so geplaas',
    whatEn: 'No video at all. The headline, the words and the caption, posted as text or over a photo.',
    whatAf: 'Geen video nie. Die opskrif, die woorde en die byskrif, as teks of oor ’n foto geplaas.',
    effort: 'low',
    fits:
      'Testing which promise works before spending a credit on filming the wrong one. Also the ' +
      'right answer on its own for anything sold in a group or a marketplace, where a video ' +
      'reads as an advert and a sentence reads as a person.',
    fails:
      'Somewhere the feed is video-first. A text post on TikTok is not shown to anybody.',
  },
];

export function formatById(id: string): AdFormat | null {
  return AD_FORMATS.find((one) => one.id === id) ?? null;
}

/** The ids, for a schema that must not accept anything else. */
export const FORMAT_IDS = AD_FORMATS.map((one) => one.id);

/**
 * The catalogue, written out for the model.
 *
 * Includes what each one is bad at, which is the part that makes the choice
 * mean something: a list of eight things that are all good for everything
 * chooses nothing, and a model given one will pick the first.
 */
export function describeFormats(): string {
  return AD_FORMATS.map(
    (one) =>
      `- ${one.id} — ${one.en}. ${one.whatEn}\n` +
      `    right when: ${one.fits}\n` +
      `    wrong when: ${one.fails}\n` +
      `    the person's own effort: ${one.effort}`,
  ).join('\n');
}
