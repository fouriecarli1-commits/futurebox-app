/**
 * Social platforms, their real URLs, and what "connect" honestly means.
 *
 * Posting to somebody's account on their behalf is not a link — it is OAuth
 * against each platform's API, which every one of these gates behind an
 * approved developer app, a review, and in several cases a business entity.
 * That is a backend and a queue of applications, not a button.
 *
 * So this module does the part that is real today and says so: it holds the
 * creator's handles, turns them into working profile links, and opens each
 * platform's own composer with the caption ready to paste. `shareIntent` marks
 * the one platform that genuinely supports a pre-filled web share; the rest
 * open their composer, because no public URL can attach a video for you.
 */

export interface Platform {
  readonly id: string;
  readonly name: string;
  /** `{handle}` is substituted. */
  readonly profileUrl: string;
  /** Where the creator goes to post. Real URLs, not invented endpoints. */
  readonly composerUrl: string;
  /** A public URL that can carry the text for you. Only X has one. */
  readonly shareIntent: string | null;
  readonly bestFormat: string;
  readonly hookWindow: string;
  readonly maxHashtags: number;
  /** What connecting the account for real would require. */
  readonly connectRequires: string;
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    profileUrl: 'https://www.tiktok.com/@{handle}',
    composerUrl: 'https://www.tiktok.com/upload',
    shareIntent: null,
    bestFormat: '9:16 vertical, 15–34s',
    hookWindow: 'the first 1.5 seconds',
    maxHashtags: 5,
    connectRequires: 'TikTok Content Posting API — an approved developer app, and posting scopes are granted case by case.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    profileUrl: 'https://www.youtube.com/@{handle}',
    composerUrl: 'https://studio.youtube.com/channel/upload',
    shareIntent: null,
    bestFormat: '9:16 Shorts up to 60s, or 16:9 long form',
    hookWindow: 'the first 3 seconds',
    maxHashtags: 3,
    connectRequires: 'YouTube Data API v3 with OAuth and the upload scope, plus a quota increase for anything regular.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    profileUrl: 'https://www.instagram.com/{handle}/',
    composerUrl: 'https://www.instagram.com/',
    shareIntent: null,
    bestFormat: '9:16 Reels, 15–30s',
    hookWindow: 'the first 2 seconds',
    maxHashtags: 5,
    connectRequires: 'Instagram Graph API through a Facebook app, a Business or Creator account, and app review.',
  },
  {
    id: 'x',
    name: 'X',
    profileUrl: 'https://x.com/{handle}',
    composerUrl: 'https://x.com/compose/post',
    shareIntent: 'https://x.com/intent/post?text={text}',
    bestFormat: 'Native video, under 2:20',
    hookWindow: 'the first line of text',
    maxHashtags: 2,
    connectRequires: 'X API v2 with OAuth 2.0 and media upload — a paid tier for anything beyond a trickle.',
  },
  {
    id: 'suno',
    name: 'Suno',
    profileUrl: 'https://suno.com/@{handle}',
    composerUrl: 'https://suno.com/create',
    shareIntent: null,
    bestFormat: 'The track itself',
    hookWindow: 'the first bar',
    maxHashtags: 0,
    connectRequires: 'No public posting API. This one stays a link.',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    profileUrl: 'https://open.spotify.com/artist/{handle}',
    composerUrl: 'https://artists.spotify.com/',
    shareIntent: null,
    bestFormat: 'Released track',
    hookWindow: 'the first 30 seconds — that is when a stream counts',
    maxHashtags: 0,
    connectRequires: 'Distribution through a distributor; Spotify has no upload API for artists.',
  },
  /* The three she added: "youtube, tiktok, facebook, vimeo, spotify, apple
     music, soundcloud, alles sal kan connect."

     `connectRequires` stays as honest here as it is above. None of the seven
     can be posted to from this app today and saying otherwise on a page of
     connection buttons would be the exact lie `ShareRow` was written to
     avoid — what a handle does is make the link right and put the name on a
     post, which is real and is all that is claimed. */
  {
    id: 'facebook',
    name: 'Facebook',
    profileUrl: 'https://www.facebook.com/{handle}',
    composerUrl: 'https://www.facebook.com/',
    shareIntent: null,
    bestFormat: '9:16 Reels, or 1:1 in feed',
    hookWindow: 'the first 3 seconds',
    maxHashtags: 3,
    connectRequires: 'Facebook Graph API through a reviewed app, a Page rather than a profile, and pages_manage_posts.',
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    profileUrl: 'https://vimeo.com/{handle}',
    composerUrl: 'https://vimeo.com/upload',
    shareIntent: null,
    bestFormat: '16:9, any length',
    hookWindow: 'the first 10 seconds',
    maxHashtags: 3,
    connectRequires: 'Vimeo API with the upload scope, which needs a paid plan and an approved app.',
  },
  {
    id: 'applemusic',
    name: 'Apple Music',
    profileUrl: 'https://music.apple.com/profile/{handle}',
    composerUrl: 'https://artists.apple.com/',
    shareIntent: null,
    bestFormat: 'Released track',
    hookWindow: 'the first 30 seconds',
    maxHashtags: 0,
    connectRequires: 'Distribution through a distributor; there is no upload API for artists.',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    profileUrl: 'https://soundcloud.com/{handle}',
    composerUrl: 'https://soundcloud.com/upload',
    shareIntent: null,
    bestFormat: 'The track itself',
    hookWindow: 'the first bar',
    maxHashtags: 3,
    connectRequires: 'Their upload API has been closed to new applications for years.',
  },
];

/**
 * FutureBox's own channels.
 *
 * `live: false` is the truthful state for most of these — the accounts do not
 * exist yet, and a boost cannot be promised from a channel nobody has created.
 */
export interface FutureboxChannel {
  readonly platformId: string;
  readonly handle: string;
  readonly live: boolean;
  readonly role: string;
}

export const FUTUREBOX_CHANNELS: readonly FutureboxChannel[] = [
  { platformId: 'youtube', handle: 'futurebox', live: true, role: 'Long-form releases and the masterclass cuts.' },
  { platformId: 'tiktok', handle: 'futurebox', live: false, role: 'Vertical hooks, live build rooms, collab duets.' },
  { platformId: 'instagram', handle: 'futurebox', live: false, role: 'Reels and the visual side of releases.' },
  { platformId: 'x', handle: 'futurebox', live: false, role: 'Prompts, stacks, and what the Radar surfaced.' },
];

export const FUTUREBOX_TAG = '@futurebox';

/**
 * Places an advert goes that are not somebody's social account.
 *
 * ── Why this is not in PLATFORMS ─────────────────────────────────────────
 *
 * Carli, 11 September 2026: "Ek wil ook vra dat ons die web ook 'n opsie moet
 * maak waar advertensies gepost gaan word. Dit moet ook daar wees om te kan
 * tick."
 *
 * She is right that it belongs on the tick list. It does not belong in
 * `PLATFORMS`, and the difference is not tidiness — that list is read by six
 * other screens. Adding a row to it would put "the web" in the connect panel
 * asking for a handle it cannot have, in the posting queue as somewhere a
 * clip can be scheduled to, and in the campaign tracker as a step to tick
 * off. Three places quietly made wrong to save a file.
 *
 * What the advert desk actually needs from a destination is narrow: a name,
 * and what the writing has to fit. So that is what a destination is.
 *
 * ── Why the guidance is genuinely different ──────────────────────────────
 *
 * This is the reason it is worth having at all rather than being a tick that
 * changes nothing. A web page is not a feed: it autoplays muted if it plays
 * at all, the reader arrived on purpose rather than by scrolling, nothing
 * competes for the next swipe, and a hashtag on a website is noise. Copy
 * written for TikTok and pasted onto a landing page reads as an advert that
 * wandered in.
 */
export interface Destination {
  readonly id: string;
  readonly name: string;
  /** The shape and length that works there. */
  readonly bestFormat: string;
  /** How long there is before somebody leaves. */
  readonly hookWindow: string;
  /** Hashtags, where they mean anything. Zero is an answer. */
  readonly maxHashtags: number;
  /** One line on the tick, so nobody has to guess what they are choosing. */
  readonly en: string;
  readonly af: string;
}

export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'web',
    name: 'Your own website',
    bestFormat: '16:9 or square, muted autoplay, any length the page earns',
    hookWindow: 'the first line of text, before anybody scrolls past it',
    /* Zero, and stated rather than left out. A hashtag on a landing page is
       a link to somebody else's feed on the one page you own. */
    maxHashtags: 0,
    en: 'Your own website or landing page',
    af: 'Jou eie webwerf of bestemmingsblad',
  },
];
