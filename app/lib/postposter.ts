/**
 * A poster, drawn whole with its words in it, from the photo editor.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 16 October 2026, a poster maker open on her phone with three ways
 * in: describe it, pick what kind of poster it is, or fill in its lines.
 * Planned on the 17th as one sheet in the photo editor, drawn by the same
 * engine and the same route as the magic touch — so the same price, said
 * on the button.
 *
 * ── The three ways ───────────────────────────────────────────────────────
 *
 *   · **Describe** — her own sentence. Words she puts in quotation marks are
 *     drawn exactly as typed; the rest is what the poster is of.
 *   · **Kind** — a product, a sale, an opening, an event… each with a look
 *     of its own. She says what it is about and the engine writes a short
 *     headline and a call to action into the picture, in her language.
 *   · **Lines** — headline, second line, a sentence, contact and a button,
 *     each drawn exactly as typed, biggest to smallest.
 *
 * A photo can go up with any of them as the subject — her product, her
 * shop front, her face — and it is sent as a reference to copy from, not as
 * a picture to be changed, so the poster gets its own frame.
 *
 * ── Why the words go in quotation marks ──────────────────────────────────
 *
 * `adposter.ts` found it first: an image model told to "add a headline"
 * invents one. Spelled out in quotes, with the instruction to render them
 * exactly, is how what she typed is what is on the wall. A quotation mark
 * inside her own words would end the quote early, so it is turned into an
 * apostrophe before it goes.
 *
 * Pure strings — `check:postposter` reads every sentence this sends.
 */
import { logoWords } from './adposter';

export type PosterWay = 'describe' | 'kind' | 'lines';

export interface PosterKind {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  /** The look the engine is asked for. */
  readonly look: string;
  /** An example of what to say, shown in the box before she types. */
  readonly hintEn: string;
  readonly hintAf: string;
  /** Two colours for its tile, so the grid reads as kinds at a glance. */
  readonly tile: readonly [string, string];
}

export const POSTER_KINDS: readonly PosterKind[] = [
  { id: 'product', en: 'Product', af: 'Produk', tile: ['#0ea5e9', '#1e293b'],
    look: 'a clean product showcase: the product large and sharp as the hero, soft studio light, a simple backdrop in colours taken from the product, generous space for type',
    hintEn: 'Handmade soy candles in amber jars', hintAf: 'Handgemaakte sojakerse in amber flesse' },
  { id: 'sale', en: 'Sale', af: 'Uitverkoping', tile: ['#ef4444', '#facc15'],
    look: 'a bold promotional sale poster: strong contrasting colours, a big price or percentage as the loudest thing, energetic shapes, made to be read from across a street',
    hintEn: '30% off all winter jackets this weekend', hintAf: '30% af alle winterbaadjies hierdie naweek' },
  { id: 'brand', en: 'Brand', af: 'Handelsmerk', tile: ['#111827', '#d4af37'],
    look: 'a refined brand poster: restrained palette, elegant typography, lots of quiet space, one strong image, feels premium and confident',
    hintEn: 'A barber shop in Stellenbosch, classic cuts', hintAf: '’n Haarkapper in Stellenbosch, klassieke snitte' },
  { id: 'announce', en: 'Announcement', af: 'Aankondiging', tile: ['#6366f1', '#e0e7ff'],
    look: 'a clear announcement poster: one big message, friendly modern layout, calm colours, the news is the first thing anyone reads',
    hintEn: 'Our studio is moving to a new address in March', hintAf: 'Ons ateljee trek in Maart na ’n nuwe adres' },
  { id: 'event', en: 'Event', af: 'Geleentheid', tile: ['#a855f7', '#f472b6'],
    look: 'an event poster: atmospheric scene of the event, dramatic light, the name of the event large, date and place clearly set below',
    hintEn: 'Live jazz night, Friday 7 November, 19:00', hintAf: 'Lewendige jazz-aand, Vrydag 7 November, 19:00' },
  { id: 'opening', en: 'Grand opening', af: 'Groot opening', tile: ['#f59e0b', '#ffffff'],
    look: 'a grand opening poster: festive, ribbons or confetti, warm welcoming light, the shop or place itself shown inviting',
    hintEn: 'A new coffee shop opening on Main Road', hintAf: '’n Nuwe koffiewinkel wat in Hoofweg oopmaak' },
  { id: 'food', en: 'Food & menu', af: 'Kos & spyskaart', tile: ['#ea580c', '#fef3c7'],
    look: 'a mouth-watering food poster: the dish close up and glistening, warm appetising light, rustic or fresh setting, a menu-board feel',
    hintEn: 'Sunday roast lunch, R189 a plate', hintAf: 'Sondag-braaivleis middagete, R189 ’n bord' },
  { id: 'hiring', en: 'We’re hiring', af: 'Ons soek mense', tile: ['#10b981', '#ecfdf5'],
    look: 'a hiring poster: optimistic, people at work in the place, clean layout with a clear role title, approachable and professional',
    hintEn: 'Looking for a weekend barista', hintAf: 'Soek ’n naweek-barista' },
  { id: 'celebrate', en: 'Celebration', af: 'Viering', tile: ['#ec4899', '#fde68a'],
    look: 'a celebration poster: joyful, balloons or sparkles, bright happy colours, the occasion in big decorative lettering',
    hintEn: 'Happy 40th birthday, Marlene!', hintAf: 'Veels geluk met jou 40ste, Marlene!' },
  { id: 'property', en: 'Property', af: 'Eiendom', tile: ['#0f766e', '#f1f5f9'],
    look: 'a property listing poster: the home shown at its best in golden light, clean real-estate layout, price and key details in a tidy band',
    hintEn: '3-bedroom house with a garden in Durbanville', hintAf: '3-slaapkamerhuis met ’n tuin in Durbanville' },
  { id: 'class', en: 'Class or workshop', af: 'Klas of werkswinkel', tile: ['#2563eb', '#fef9c3'],
    look: 'a workshop or class poster: hands-on scene of the activity, friendly and encouraging, what you will learn and when, clearly organised',
    hintEn: 'Beginner pottery class, Saturdays 9 to 12', hintAf: 'Pottebakkery vir beginners, Saterdae 9 tot 12' },
  { id: 'music', en: 'Music & gig', af: 'Musiek & optrede', tile: ['#18181b', '#22d3ee'],
    look: 'a gig poster: moody stage light, the artist or instrument as a striking silhouette, bold expressive lettering, the feel of the music',
    hintEn: 'Album launch at the Baxter, 21 November', hintAf: 'Albumbekendstelling by die Baxter, 21 November' },
];

export function kindById(id: string): PosterKind | undefined {
  return POSTER_KINDS.find((one) => one.id === id);
}

/** The shapes a poster is drawn in, each a post size in the editor and an aspect the engine knows. */
export const POSTER_SIZES = [
  { id: 'story', aspect: '9:16', en: 'Story 9:16', af: 'Storie 9:16' },
  { id: 'portrait', aspect: '3:4', en: 'Tall post', af: 'Hoë plasing' },
  { id: 'square', aspect: '1:1', en: 'Square', af: 'Vierkant' },
] as const;
export type PosterSize = (typeof POSTER_SIZES)[number]['id'];

export interface PosterLines {
  readonly headline: string;
  readonly sub: string;
  readonly body: string;
  readonly contact: string;
  readonly cta: string;
}

export const NO_LINES: PosterLines = { headline: '', sub: '', body: '', contact: '', cta: '' };

/** How long each line may be before a picture model stops drawing it well. */
export const MOST: Readonly<Record<keyof PosterLines, number>> = {
  headline: 48, sub: 70, body: 140, contact: 70, cta: 24,
};
export const MOST_DESCRIBE = 600;

/** Her words, safe to put inside quotation marks: no quote of her own ends ours early. */
export function inQuotes(text: string, most: number): string {
  return text.replace(/[“”"]/g, '’').replace(/\s+/g, ' ').trim().slice(0, most);
}

/** The words in quotation marks in a description — what will be drawn exactly. */
export function quotedIn(text: string): string[] {
  return [...text.matchAll(/["“]([^"“”]{1,80})["”]/g)].map((m) => m[1].trim()).filter(Boolean);
}

export interface PosterAsk {
  readonly way: PosterWay;
  readonly describe?: string;
  readonly kind?: string;
  readonly about?: string;
  readonly lines?: PosterLines;
  /** A photo going up as the subject. */
  readonly photo?: boolean;
  /** The language the engine writes in, for a kind poster. */
  readonly lang?: 'en' | 'af';
}

/** Is there enough to draw? Asked first, so the button can say why rather than spend. */
export function readyToDraw(ask: PosterAsk): boolean {
  if (ask.way === 'describe') return (ask.describe ?? '').trim().length >= 3;
  if (ask.way === 'kind') return Boolean(kindById(ask.kind ?? '')) && (ask.about ?? '').trim().length >= 3;
  return (ask.lines?.headline ?? '').trim().length > 0;
}

const SUBJECT = 'The attached picture is the subject of the poster: keep it exactly recognisable — the same shape, colours, label and details — and build the poster around it.';
const MARGIN = 'Keep all lettering well inside the frame, away from every edge, and spell every word correctly.';
const LETTERING = 'The lettering is part of the design — clean, legible, with clear hierarchy from biggest to smallest.';

/** The sentence sent to the picture route. */
export function posterAsk(ask: PosterAsk): string {
  const parts: string[] = ['A single finished poster, as one image.'];
  if (ask.way === 'describe') {
    const said = (ask.describe ?? '').replace(/\s+/g, ' ').trim().slice(0, MOST_DESCRIBE);
    parts.push(`The poster: ${said}`);
    const exact = quotedIn(said);
    if (exact.length) parts.push(`Render the words in quotation marks exactly as written, letter for letter: ${exact.map((one) => `"${inQuotes(one, 80)}"`).join(', ')}. No other words.`);
    else parts.push('Only short, correctly spelled words that belong on this poster.');
  } else if (ask.way === 'kind') {
    const kind = kindById(ask.kind ?? '') ?? POSTER_KINDS[0];
    const about = (ask.about ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const language = ask.lang === 'af' ? 'Afrikaans' : 'English';
    parts.push(`Style: ${kind.look}.`);
    parts.push(`What it is for: ${about}`);
    parts.push(`Write a short headline of at most six words and a short call to action that fit it, in ${language}, and render both in the poster. Keep any name, date, time, price or place from what it is for exactly as given.`);
  } else {
    const lines = ask.lines ?? NO_LINES;
    const kind = kindById(ask.kind ?? '');
    if (kind) parts.push(`Style: ${kind.look}.`);
    const about = (ask.about ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (about) parts.push(`The scene: ${about}`);
    const put = (what: keyof PosterLines, how: string): void => {
      const text = inQuotes(lines[what], MOST[what]);
      if (text) parts.push(`${how}, spelled exactly: "${text}".`);
    };
    put('headline', 'The headline, biggest');
    put('sub', 'Under it, smaller');
    put('body', 'A short line of text, smaller still');
    put('contact', 'Contact details, small and clear');
    put('cta', 'A call to action, like a button');
    parts.push('No other words.');
  }
  parts.push(LETTERING);
  if (ask.photo) parts.push(SUBJECT);
  parts.push(logoWords(0));
  parts.push(MARGIN);
  return parts.join(' ');
}
