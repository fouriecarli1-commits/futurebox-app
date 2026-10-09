/**
 * An advert as a still, with its words in the picture.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, twice. First the capability: *"onthou nano banana
 * kan woorde in foto sit"* — remember Nano Banana can put words in a photo.
 * Then: *"gaan aan met die advert desk."*
 *
 * The desk writes an advert — an angle, a headline, a line of body, a call
 * to action, a shot to film — and then hands it to the video desk or the
 * voice room. Which is right for a clip, and leaves the commonest advert
 * there is unmade: a still with the words on it.
 *
 * ── Why the words go INTO the prompt rather than onto the picture after ──
 *
 * Because the app can already put words on a picture — `PostStudio` has a
 * real text tool, with a face, a size, a place and a safe zone. That is the
 * better tool when somebody wants to set type.
 *
 * What it cannot do is make the picture and the words one thing: lettering
 * that follows a surface, sits in the composition, takes the light of the
 * scene. That is the thing an image model does and a text layer cannot, and
 * it is the thing she noticed Nano Banana could do.
 *
 * So this asks for both, and the room says plainly what to do when the
 * lettering comes out wrong — which it sometimes will, because rendering
 * text is the thing image models are worst at. A fallback that is named is
 * a fallback somebody uses; an unnamed one is a feature that looks broken.
 *
 * ── Why the headline and the call, and nothing else ──────────────────────
 *
 * An image model given four strings renders four strings badly. Two is what
 * a poster actually carries: the line that stops the scroll, and what to do
 * about it. The body copy belongs in the caption, where it is real text that
 * can be read by a screen reader and copied by a person.
 */

/** What a poster needs from an advert. */
export interface AdLike {
  readonly headline: string;
  readonly cta: string;
  /** What the camera sees. Written for a video desk, and just as good here. */
  readonly shot: string;
}

/** How long a line may be before an image model stops rendering it well. */
export const MOST_HEADLINE = 48;
export const MOST_CTA = 24;

/**
 * Is there enough here to be worth drawing?
 *
 * A poster with no headline is a picture, and a picture is what the photo
 * editor is for. Said as a question rather than enforced silently, so the
 * room can grey the button out with a reason rather than fail after paying.
 */
export function worthDrawing(ad: AdLike): boolean {
  return ad.headline.trim().length > 0 && ad.shot.trim().length > 0;
}

/**
 * The words to send.
 *
 * `look` is the campaign's own look where there is one, so three posters
 * from one brief are one campaign rather than three unrelated pictures —
 * the same reasoning as the storybook's look in `storypages.ts`.
 */
export function posterWords(ad: AdLike, look = ''): string {
  const headline = ad.headline.trim().slice(0, MOST_HEADLINE);
  const cta = ad.cta.trim().slice(0, MOST_CTA);
  const style = look.trim();

  return [
    'A single advertising poster, as one finished image.',
    style ? `Overall look: ${style}.` : '',
    `The scene: ${ad.shot.trim()}`,
    /* Spelled out, in quotes, with the instruction to render them exactly.
       An image model told to "add a headline" invents one. */
    `Render this headline in the picture, spelled exactly: "${headline}".`,
    cta ? `And this call to action, smaller, spelled exactly: "${cta}".` : '',
    'The lettering must be part of the image — on a surface, a wall, a sign,'
    + ' a screen or clean space in the composition — lit by the same light as'
    + ' the scene, not pasted on top.',
    'No other words anywhere. No logos, no watermarks, no invented brand'
    + ' names, no lorem ipsum, no captions outside the frame.',
    /* The margin is not decoration: a feed crops, and a headline against the
       edge is a headline with its first letter missing. */
    'Keep all lettering well inside the frame, away from every edge.',
  ].filter(Boolean).join(' ');
}
