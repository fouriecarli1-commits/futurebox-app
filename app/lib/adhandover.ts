/**
 * What travels when the advert desk sends you to another room.
 *
 * ── The fault this fixes ─────────────────────────────────────────────────
 *
 * Carli, 11 September 2026, on the desk as a product she is selling:
 *
 *   "When you push the buttons to take you to podcast, to video, to music
 *    making, the text and shots and scripts don't carry over to the next
 *    room. That is a real problem… It is supposed to copy and paste the
 *    information to the next page."
 *
 * She is right, and the code said so plainly. `AdFormats.tsx` sent exactly
 * one operation with exactly one value:
 *
 *     if (format.op) onSetUp(format.room, format.op, pick.first);
 *     onGoTo(format.room);
 *
 * One field. The brief — what they sell, who it is for, the offer, the tone,
 * the town, where it is going — stayed behind. So did the three adverts the
 * desk had just written, and the look it had just recommended. And two of
 * the eight formats had no `op` at all: "a song, over one photograph" and
 * "a jingle" both opened Make a song completely empty, because the song
 * form registered no operations for anything to arrive in.
 *
 * Somebody is told, in specific terms, exactly what to make — and then put
 * in an empty room and asked to type it in again from memory.
 *
 * ── Why this is a module and not a longer `onClick` ──────────────────────
 *
 * Because what should travel is a question about each destination, and the
 * answers are the product. A video desk wants a shot description, a shape
 * and a length. The voice studio wants a script somebody can read out loud
 * — not a note describing a script. The podcast wants a title AND notes.
 * Make a song wants words with section markers and a sound.
 *
 * Keeping that in a component would put eight formats' worth of judgement
 * inside a button handler, where nothing can test it. Here it is a pure
 * function over plain data, so `check:adhandover` can ask what actually
 * comes out for every format in the catalogue.
 *
 * ── The one rule that governs all of it ──────────────────────────────────
 *
 * **Never invent a fact about them.** The offer, the price, the deadline,
 * the address, what they sell — only what they typed. An advert that says
 * "R199 a month" because a model liked the rhythm is worse than no advert.
 *
 * But the craft is ours: how a shot is framed, how long it runs, what shape
 * it is, where the chorus goes. Somebody who wanted to make those decisions
 * would not be here. So every builder below reads the brief for facts and
 * decides the form itself.
 */

import type { SurfaceId } from './surfaces';
import { formatById } from './adformats';
import { styleById } from './adstyles';
import { withSpoken } from './videoscenes';

/** One thing to put in one room. */
export interface Wire {
  readonly room: SurfaceId;
  readonly op: string;
  readonly value: string;
}

/** What the desk knows about them. Only `what` is ever required. */
export interface HandoverBrief {
  readonly what: string;
  readonly who?: string;
  readonly offer?: string;
  readonly tone?: string;
  readonly market?: string;
  /** Where it will be seen, in words — the placement, not the platform. */
  readonly place?: string;
  /** Their brand kit as one line, when they have filled one in. */
  readonly brand?: string;
}

/** The adviser's recommendation for this format. */
export interface HandoverPick {
  /** The concrete first thing to make. The most valuable sentence here. */
  readonly first: string;
  readonly watchOut?: string;
  /** A look from `lib/adstyles.ts`. */
  readonly style?: string;
}

/**
 * One of the three adverts the desk wrote, when it has written them.
 *
 * The field names are `Campaign.tsx`'s own, not a translation of them: a
 * second vocabulary for the same five strings is a mapping to get wrong.
 */
export interface HandoverAd {
  readonly angle?: string;
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  /** The line written to be said out loud, if there is one. */
  readonly spoken?: string;
  /** The shot the writer described for this advert. */
  readonly shot?: string;
  readonly caption?: string;
}

export interface HandoverInput {
  readonly formatId: string;
  readonly brief: HandoverBrief;
  readonly pick: HandoverPick;
  /** The ad they chose to carry over, when they pressed one. */
  readonly ad?: HandoverAd | null;
  /** The ticked destinations, by id, which decide the shape. */
  readonly going?: readonly string[];
}

/** Trimmed, empty dropped. Saves every builder below the same four lines. */
const joined = (parts: readonly (string | undefined)[], by = ' '): string =>
  parts.map((one) => (one ?? '').trim()).filter(Boolean).join(by);

/** A sentence, ended. Nothing here should arrive mid-thought. */
const sentence = (text: string): string => {
  const said = text.trim();
  if (!said) return '';
  return /[.!?…]$/.test(said) ? said : `${said}.`;
};

/**
 * The shape, decided by where it is actually going.
 *
 * Not by the format. "A short vertical clip" is named vertical and the rest
 * are not, and somebody who ticked only their own website and YouTube wants
 * 16:9 from every one of them. The tick boxes are the answer to this
 * question and they are already on the screen above.
 *
 * Ticking both is the common case and vertical wins: a 9:16 clip on a
 * website is a tall video in a wide space, which is ugly. A 16:9 clip in a
 * feed is cropped to nothing, which is unusable.
 */
export function shapeFor(going: readonly string[] = []): '9:16' | '16:9' | '1:1' {
  const TALL = ['tiktok', 'instagram', 'youtube_shorts', 'shorts', 'reels', 'snapchat'];
  const WIDE = ['web', 'youtube', 'vimeo', 'facebook'];
  if (going.some((one) => TALL.includes(one))) return '9:16';
  if (going.some((one) => WIDE.includes(one))) return '16:9';
  return '9:16';
}

/**
 * The look, as words a video engine can use.
 *
 * `adstyles.ts` holds the catalogue, and every entry's `looks` line is
 * written to exactly this standard — its own comment sets the test: could
 * somebody who has never seen an advert build the prompt from this line
 * alone? So it goes across as written.
 *
 * An unknown id sends nothing rather than the id itself: "sonic_signature"
 * dropped into a prompt is a word the engine will try to draw.
 */
function lookOf(styleId?: string): string {
  if (!styleId) return '';
  const style = styleById(styleId);
  return style ? style.looks.trim() : '';
}

/**
 * A shot description, built to the standard the video desk already asks for.
 *
 * `surfaces.ts` tells the copilot a shot names the subject, the setting, the
 * light, what the camera does, the framing and the mood, in three or four
 * sentences, with spoken words in quotation marks. A hand-off that arrives
 * thinner than that is the desk holding its own rooms to a lower bar than it
 * holds the copilot — and it was: one sentence, every time.
 */
function shotFrom(input: HandoverInput): string {
  const { brief, pick, ad } = input;
  const look = lookOf(pick.style);
  /* Their own words, spoken, when there is a hook to speak. Quoted because
     that is how this desk marks a line as SAID rather than described — the
     storyboard reads the quotes to fill the subtitle in. */
  const line = ad?.headline?.trim();
  return joined([
    sentence(pick.first),
    look ? sentence(`Shot in this look: ${look}`) : '',
    brief.tone ? sentence(`The mood is ${brief.tone}`) : '',
    line ? `A voice says “${line.replace(/["“”]/g, '')}”.` : '',
    brief.brand ? sentence(brief.brand) : '',
    'No text or lettering in the picture — the words go on as subtitles afterwards.',
  ], ' ');
}

/**
 * Several shots, one per line, because that is how `shotsFrom` splits them.
 *
 * Four beats rather than a paragraph: something is wrong, here is the thing,
 * here is it working, here is what to do. That is the shape of every
 * explainer that holds, and somebody can cut or reorder them on the board.
 */
function scenesFrom(input: HandoverInput): string {
  const { brief, pick, ad } = input;
  const look = lookOf(pick.style);
  const tail = joined([look ? `In this look: ${look}` : '', brief.tone ? `Mood: ${brief.tone}` : ''], ' ');
  const withLook = (one: string): string => joined([sentence(one), tail], ' ');
  return [
    withLook(
      brief.who
        ? `Open on ${brief.who} in the moment before they need this — the problem, shown rather than said`
        : 'Open on the problem this solves, shown rather than said',
    ),
    withLook(sentence(pick.first)),
    withLook(`${brief.what.trim()} in use, close, with hands in the frame`),
    withLook(
      joined([
        'End on the thing itself, still and unhurried',
        ad?.cta ? `A voice says “${ad.cta.replace(/["“”]/g, '').trim()}”` : '',
      ], '. '),
    ),
  ].join('\n');
}

/**
 * A script somebody can read aloud, in the order they will read it.
 *
 * Written as speech rather than as copy: the voice studio reads exactly what
 * is in the box, so a heading, a bullet or the word "CTA" is a word somebody
 * will hear. When the desk has written the adverts, the hook, body and call
 * are already the right three parts and they go over whole.
 */
function scriptFrom(input: HandoverInput): string {
  const { brief, pick, ad } = input;
  if (ad) {
    return joined([sentence(ad.headline), sentence(ad.body), sentence(ad.cta)], '\n\n');
  }
  return joined([
    sentence(pick.first),
    joined([
      brief.who ? `For ${brief.who.trim()}` : '',
      sentence(brief.what),
    ], ': '),
    brief.offer ? sentence(brief.offer) : '',
    brief.market ? sentence(`In and around ${brief.market}`) : '',
  ], '\n\n');
}

/** An episode's title: theirs if the desk wrote one, else the plainest true thing. */
function titleFrom(input: HandoverInput): string {
  const { brief, ad } = input;
  const hook = ad?.headline?.trim();
  if (hook && hook.length <= 70) return hook.replace(/[.!?]+$/, '');
  return brief.what.trim().replace(/[.!?]+$/, '');
}

/** The notes under an episode — the brief, laid out as somebody would read it. */
function notesFrom(input: HandoverInput): string {
  const { brief, pick } = input;
  return joined([
    sentence(pick.first),
    brief.who ? sentence(`Who it is for: ${brief.who}`) : '',
    brief.offer ? sentence(`The offer: ${brief.offer}`) : '',
    brief.tone ? sentence(`How it should sound: ${brief.tone}`) : '',
    brief.market ? sentence(`Where: ${brief.market}`) : '',
    brief.place ? sentence(`Where it will be heard: ${brief.place}`) : '',
  ], '\n');
}

/**
 * Words for a song, with the section markers the engine reads.
 *
 * A first draft that scans, not a finished lyric — the point is that the box
 * is not empty and every line is about their actual thing. `splitSections`
 * needs the markers, so they are here from the start rather than being
 * something somebody has to know to add.
 *
 * A jingle gets one line repeated, because that is what a jingle is.
 */
function wordsFrom(input: HandoverInput): string {
  const { brief, pick, ad, formatId } = input;
  const thing = brief.what.trim().replace(/[.!?]+$/, '');
  const call = (ad?.cta ?? '').trim().replace(/[.!?]+$/, '');
  if (formatId === 'jingle') {
    const line = call || thing;
    return `[Hook]\n${line}\n${line}`;
  }
  const hook = (ad?.headline ?? '').trim().replace(/[.!?]+$/, '');
  return joined([
    '[Verse]',
    brief.who ? `For ${brief.who.trim()}` : `For everyone who needs ${thing}`,
    brief.market ? `Here in ${brief.market.trim()}` : '',
    '',
    '[Chorus]',
    hook || thing,
    call || thing,
    '',
    '[Verse]',
    sentence(pick.first).replace(/[.!?]+$/, ''),
    brief.offer ? brief.offer.trim().replace(/[.!?]+$/, '') : '',
  ], '\n');
}

/**
 * The sound, as free text — the style box takes anything.
 *
 * The look is deliberately NOT poured in here. `adstyles.ts` describes what
 * a thing looks like — "one hand, daylight from a window" — and handing that
 * to a music engine as a style is asking it to play a window. Only the tone,
 * which is the one thing in the brief that is about how it should feel.
 */
function soundFrom(input: HandoverInput): string {
  const { brief, formatId } = input;
  return joined([
    formatId === 'jingle' ? 'a short bright hook, one phrase, nothing after it' : '',
    brief.tone ? brief.tone.trim() : '',
    'clean vocal, nothing crowded behind it',
  ], ', ');
}

/**
 * Everything that should travel, for one format.
 *
 * Returns an empty list for a format that stays in this room, and for one
 * whose brief is empty — a hand-off of blank fields would overwrite whatever
 * the destination already had with nothing, which is worse than not sending.
 */
export function handoverFor(input: HandoverInput): readonly Wire[] {
  const format = formatById(input.formatId);
  if (!format) return [];
  if (!input.brief.what.trim()) return [];

  const room = format.room;
  const at = (op: string, value: string): Wire[] =>
    value.trim() ? [{ room, op, value: value.trim() }] : [];

  switch (input.formatId) {
    case 'short_vertical':
      return [
        ...at('set_prompt', shotFrom(input)),
        ...at('set_aspect', shapeFor(input.going)),
        /* Eight seconds: long enough for a push in or a turn to camera,
           and one of the lengths the desk actually offers. `LENGTHS` is
           the list and `check:adhandover` holds this to it. */
        ...at('set_seconds', '8'),
        ...at('set_look', lookOf(input.pick.style)),
      ];
    case 'explainer_film':
      return [
        ...at('write_scenes', scenesFrom(input)),
        ...at('set_aspect', shapeFor(input.going)),
        ...at('set_seconds', '5'),
        ...at('set_look', lookOf(input.pick.style)),
      ];
    case 'explainer_voice_over_stills':
    case 'spoken_read':
      return at('set_script', scriptFrom(input));
    case 'podcast_episode':
      return [...at('set_title', titleFrom(input)), ...at('set_notes', notesFrom(input))];
    case 'song_with_a_photo':
    case 'jingle':
      return [
        ...at('set_song_title', titleFrom(input)),
        ...at('set_words', wordsFrom(input)),
        ...at('set_sound', soundFrom(input)),
      ];
    default:
      /* `written_posts` is this room. Nothing to carry anywhere. */
      return [];
  }
}


/**
 * "Film this one", from a written advert.
 *
 * The prompt was already right — `withSpoken` puts the quoted line into the
 * shot so the engine speaks it and the subtitle fills itself in. What went
 * with it was nothing: not the shape, not the length, not the look. So the
 * desk decided the advert was vertical and fifteen seconds, sent somebody to
 * the video desk, and the video desk opened on whatever it was last set to.
 */
export function filmThisAd(input: {
  readonly ad: HandoverAd;
  readonly going?: readonly string[];
  readonly style?: string;
}): readonly Wire[] {
  const prompt = withSpoken(input.ad.shot ?? '', input.ad.spoken ?? '');
  const look = lookOf(input.style);
  const wires: Wire[] = [];
  if (prompt.trim()) wires.push({ room: 'canvas', op: 'set_prompt', value: prompt.trim() });
  wires.push({ room: 'canvas', op: 'set_aspect', value: shapeFor(input.going) });
  /* Fifteen: the length a social platform runs whole, and one of the lengths
     the desk offers. `check:adhandover` holds every number here to
     `LENGTHS`, because a value the room quietly rejects is the same as
     sending nothing and looks like success from here. */
  wires.push({ room: 'canvas', op: 'set_seconds', value: '15' });
  if (look) wires.push({ room: 'canvas', op: 'set_look', value: look });
  return wires;
}

/**
 * "Read this one", from a written advert.
 *
 * This carried `ad.spoken` — one line — into a room whose whole purpose is
 * reading a script. A spoken advert is the hook, the reason and the call, in
 * that order; the single line is what the CLIP says, which is a different
 * job. So the whole thing goes, and the button says "this one" rather than
 * "this line".
 */
export function readThisAd(input: { readonly ad: HandoverAd }): readonly Wire[] {
  const { ad } = input;
  const script = joined([
    sentence(ad.spoken?.trim() || ad.headline),
    sentence(ad.body),
    sentence(ad.cta),
  ], '\n\n');
  return script.trim() ? [{ room: 'voice_studio', op: 'set_script', value: script }] : [];
}
