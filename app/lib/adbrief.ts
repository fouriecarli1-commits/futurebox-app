'use client';

/**
 * The advert desk's own work, remembered between visits.
 *
 * ── The fault this fixes ─────────────────────────────────────────────────
 *
 * Everything the desk PRODUCES was already remembered — the recommended
 * formats in `chosenformat.ts`, the weekly plan in `marketplan.ts`, the
 * imported report in `adreport.ts`. The brief that produced all three lived
 * in component state and nowhere else.
 *
 * Rooms unmount when you leave them. So: fill in five boxes, write three
 * adverts, press "Film this one", land on the video desk, come back — and
 * the desk is empty. The plan and the recommendations are still there,
 * sitting above five blank boxes, describing a business the screen no
 * longer knows anything about.
 *
 * That was survivable while the only way out of the room was a link. It is
 * not survivable now: the whole point of tonight's work is that the desk
 * sends you to five other rooms, and every one of those trips was throwing
 * the brief away. Making the exits work without this would have made the
 * app worse.
 *
 * ── What is kept, and what is not ────────────────────────────────────────
 *
 * The brief, the ticked destinations, and the three adverts once they are
 * written — everything somebody typed or paid for. Not the busy flags, not
 * the error messages, and not the brand kit, which has its own store.
 *
 * Per device and in this browser, like everything else on this desk. There
 * is no account behind it, and the room says so where it matters.
 *
 * ── Why it is capped ─────────────────────────────────────────────────────
 *
 * Three adverts with bodies, captions and hashtags is a few kilobytes, and
 * quota is not ours to spend freely. A brief that has grown past the cap is
 * a brief somebody pasted a document into; the cap trims rather than
 * refusing, so the fields they can see still come back.
 */

const KEY = 'futurebox.adbrief.v1';

/** What a written advert is, as `Campaign.tsx` holds it. */
export interface KeptAd {
  readonly angle: string;
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  readonly spoken: string;
  readonly shot: string;
  readonly caption: string;
  readonly hashtags: readonly string[];
}

export interface KeptBrief {
  readonly what: string;
  readonly who: string;
  readonly offer: string;
  readonly tone: string;
  readonly market: string;
  readonly placement: string;
  /** The ticked platforms and destinations, by id. */
  readonly going: readonly string[];
  readonly ads: readonly KeptAd[];
}

export const NOTHING_KEPT: KeptBrief = {
  what: '', who: '', offer: '', tone: '', market: '', placement: '', going: [], ads: [],
};

/** A field, trimmed to something a box can hold. */
const short = (value: unknown, most: number): string =>
  typeof value === 'string' ? value.slice(0, most) : '';

export function saveBrief(brief: KeptBrief): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        what: short(brief.what, 600),
        who: short(brief.who, 400),
        offer: short(brief.offer, 400),
        tone: short(brief.tone, 200),
        market: short(brief.market, 120),
        placement: short(brief.placement, 60),
        going: brief.going.slice(0, 20).map((one) => short(one, 40)),
        /* Three is what the room writes. More than that is not a longer
           list, it is a bug somewhere upstream filling storage. */
        ads: brief.ads.slice(0, 6).map((one) => ({
          angle: short(one.angle, 200),
          headline: short(one.headline, 300),
          body: short(one.body, 1200),
          cta: short(one.cta, 200),
          spoken: short(one.spoken, 400),
          shot: short(one.shot, 1200),
          caption: short(one.caption, 1200),
          hashtags: (one.hashtags ?? []).slice(0, 12).map((tag) => short(tag, 60)),
        })),
      }),
    );
  } catch {
    /* Storage off or full. The desk still works for this visit, which is
       what it did before any of this existed. */
  }
}

/**
 * What was left here last time, or nothing.
 *
 * Every field is read defensively rather than trusted: this is JSON from a
 * browser store that a person, an extension or an older version of this app
 * can have written, and a missing array here would be a room that throws on
 * mount instead of one that opens empty.
 */
export function loadBrief(): KeptBrief {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return NOTHING_KEPT;
    const said = JSON.parse(raw) as Partial<KeptBrief>;
    if (!said || typeof said !== 'object') return NOTHING_KEPT;
    return {
      what: short(said.what, 600),
      who: short(said.who, 400),
      offer: short(said.offer, 400),
      tone: short(said.tone, 200),
      market: short(said.market, 120),
      placement: short(said.placement, 60),
      going: Array.isArray(said.going) ? said.going.map((one) => short(one, 40)).filter(Boolean) : [],
      ads: Array.isArray(said.ads)
        ? said.ads.slice(0, 6).map((one) => ({
            angle: short(one?.angle, 200),
            headline: short(one?.headline, 300),
            body: short(one?.body, 1200),
            cta: short(one?.cta, 200),
            spoken: short(one?.spoken, 400),
            shot: short(one?.shot, 1200),
            caption: short(one?.caption, 1200),
            hashtags: Array.isArray(one?.hashtags)
              ? (one.hashtags as unknown[]).map((tag) => short(tag, 60)).filter(Boolean)
              : [],
          }))
        : [],
    };
  } catch {
    return NOTHING_KEPT;
  }
}

/** Everything this desk remembers, gone. */
export function forgetBrief(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing to do and nothing to say. */
  }
}
