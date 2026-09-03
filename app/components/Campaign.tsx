'use client';

/**
 * The advert desk.
 *
 * The loop a marketer actually runs is: brief, creative, localise, publish,
 * read the numbers back, scale the winner. The product this was measured
 * against puts all of it behind Contact Sales, so nobody without a salesperson
 * has any of it.
 *
 * This is the first three, self-serve, for somebody with one product and no
 * agency. It is deliberately not the last two: we cannot publish to Meta or
 * Google without those connections built, and a button that looks like it
 * publishes and does not is worse than no button. The room says so, in the
 * room, rather than leaving somebody to find out.
 *
 * ── What it does ─────────────────────────────────────────────────────────
 *
 * A brief in — what you sell, who for, the offer, the tone, the market — and a
 * set of ads out. Each carries its own angle, headline, body, call to action,
 * the line to be read aloud, and the shot to film.
 *
 * Then it hands off rather than duplicating. Filming belongs to the video desk
 * and reading belongs to the voice studio, both of which already exist, already
 * price themselves, and are already better than a second copy of them here.
 * "Film this one" fills the desk's shot and moves you there; "Read this line"
 * does the same for the voice studio.
 *
 * ── Why the copy is written per market, not translated ───────────────────
 *
 * Asking for Afrikaans returns Afrikaans written by somebody thinking in
 * Afrikaans. English idiom carried across is the clearest possible sign of an
 * imported ad, and an ad that reads imported has already lost the room.
 */

import React, { useEffect, useState } from 'react';
import { Megaphone, Loader2, Sparkles, Video as VideoIcon, Mic2, Copy, Check, AlertTriangle, Link2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useCopilotOps } from '../lib/copilotactions';
import type { SurfaceId } from '../lib/surfaces';
import { PLATFORMS } from '../data/social';
import { loadHandles, type Handles } from '../lib/social';
import ShareRow from './ShareRow';
import Steps, { type Step } from './Steps';
import BrandKit from './BrandKit';
import { EMPTY as EMPTY_KIT, brandLine, type BrandKit as Kit } from '../lib/brandkit';
import History from './History';
import { makeId, rememberMake } from '../lib/makes';

interface Ad {
  angle: string;
  headline: string;
  body: string;
  cta: string;
  spoken: string;
  shot: string;
  caption: string;
  hashtags: string[];
}

/* What happens here, in order, before any of it happens.

   The room opened on a form, and a form with no visible end reads as one that
   will want more from you than you have. These four lines are the whole of it:
   nothing forces the sequence and you can work in any order — it is a map, not
   a wizard. */
const STEPS: readonly Step[] = [
  {
    en: 'Say what you sell',
    af: 'Sê wat jy verkoop',
    noteEn: 'And who for. One box is enough to start.',
    noteAf: 'En vir wie. Een blokkie is genoeg om te begin.',
  },
  {
    en: 'It writes the adverts',
    af: 'Dit skryf die advertensies',
    noteEn: 'Several, each doing something different. Free.',
    noteAf: 'Verskeie, elk wat iets anders doen. Gratis.',
  },
  {
    en: 'Film it, and read the line',
    af: 'Verfilm dit, en lees die lyn',
    noteEn: 'Handed to the video desk and the voice studio.',
    noteAf: 'Oorhandig aan die videolessenaar en die stemstudio.',
  },
  {
    en: 'Put it out',
    af: 'Sit dit uit',
    noteEn: 'Caption and hashtags ready, one composer per platform.',
    noteAf: 'Byskrif en hutsmerke gereed, een komponeerder per platform.',
  },
];

/** The markets the copy can be written in. Names, not codes: this list is read. */
const MARKETS = ['English', 'Afrikaans', 'isiZulu', 'Sesotho', 'Portuguese', 'French', 'Spanish'] as const;

/** Where it runs, which is really a question about length and shape. */
const PLACEMENTS = [
  { id: 'feed', en: 'Social feed, sound off', af: 'Sosiale voer, klank af' },
  { id: 'story', en: 'Story or reel, sound on', af: 'Story of reel, klank aan' },
  { id: 'preroll', en: 'Before a video', af: 'Voor ’n video' },
  { id: 'display', en: 'A banner, no sound', af: '’n Banier, geen klank' },
] as const;

export default function Campaign({
  onGoTo,
  onUseShot,
  onUseScript,
}: {
  onGoTo: (surface: SurfaceId) => void;
  /** Put a shot on the video desk. */
  onUseShot: (shot: string) => void;
  /** Put a line in the voice studio. */
  onUseScript: (line: string) => void;
}): React.ReactElement {
  const { t, lang } = useLang();

  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [offer, setOffer] = useState('');
  const [tone, setTone] = useState('');
  const [market, setMarket] = useState<string>('English');
  const [placement, setPlacement] = useState<string>('feed');

  /* Which platforms this is going to. The handles come from the same store the
     share row reads, so a platform you have already set up here is already set
     up there — this room does not ask for anything twice. */
  const [handles, setHandles] = useState<Handles>({});
  /**
   * Who these adverts are for, kept between visits.
   *
   * Sent alongside the brief rather than merged into it: the brief is what is
   * different about today, and this is what is the same every time. One field
   * holding both would mean retyping the constant part to change the variable
   * one, which is the whole thing the kit exists to stop.
   */
  const [kit, setKit] = useState<Kit>(EMPTY_KIT);
  const [going, setGoing] = useState<string[]>(['tiktok', 'instagram']);
  useEffect(() => setHandles(loadHandles()), []);
  const chosen = PLATFORMS.filter((one) => going.indexOf(one.id) !== -1);

  const [ads, setAds] = useState<Ad[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [kept, setKept] = useState(0);

  /* The copilot fills the brief rather than replacing it. Somebody who would
     rather say "an advert for my bakery in Bellville, aimed at people driving
     past" than fill five boxes gets to, and the boxes then show what it
     understood — which is also how they correct it. */
  useCopilotOps('campaign', {
    set_what: (value) => setWhat(value),
    set_who: (value) => setWho(value),
    set_offer: (value) => setOffer(value),
    set_tone: (value) => setTone(value),
    set_market: (value) => {
      const found = MARKETS.find((one) => one.toLowerCase() === value.trim().toLowerCase());
      if (found) setMarket(found);
    },
  });

  const write = async (again: boolean) => {
    if (!what.trim() || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          what,
          who,
          offer,
          tone,
          market,
          placement: PLACEMENTS.find((one) => one.id === placement)?.en,
          // The platforms' own requirements, from `data/social.ts`. Sent so the
          // copy is written to the length and the hook window that actually
          // exist, rather than written and then found not to fit.
          fit: chosen
            .map((one) => `${one.name}: ${one.bestFormat}, hook in ${one.hookWindow}, at most ${one.maxHashtags} hashtags`)
            .join('; '),
          // Who it is for, when they have said. An empty kit sends nothing
          // rather than an empty sentence for the writer to work around.
          ...(brandLine(kit) ? { brand: brandLine(kit) } : {}),
          count: 3,
          // Asking again should not return the same three with the commas moved.
          seen: again ? ads.map((one) => one.angle) : [],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { ads?: Ad[]; message?: string };
      if (!response.ok || data.message) {
        setProblem(data.message ?? t('ads.failed', 'The ad writer could not be reached.'));
        return;
      }
      const written = data.ads ?? [];
      setAds(again ? [...ads, ...written] : written);

      /* Kept as text, which needs no file. An advert somebody liked and had not
         yet filmed was gone on a reload, and the writing is the part they will
         have redone six times before they liked it. */
      for (const one of written) {
        void rememberMake({
          id: makeId('campaign'),
          surface: 'campaign',
          kind: 'text',
          title: one.headline,
          note: `${one.angle} · ${market}`,
          createdAt: new Date().toISOString(),
          text: [one.body, one.cta, '', one.shot].filter(Boolean).join('\n'),
        });
      }
      setKept((n) => n + 1);
    } catch {
      setProblem(t('ads.failed', 'The ad writer could not be reached.'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (ad: Ad, index: number) => {
    const text = [ad.headline, ad.body, ad.cta].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // A clipboard a browser refuses is not worth an error message; the text
      // is on screen and can be selected.
    }
  };

  const field =
    'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-400" />
          {t('ads.title', 'Adverts')}
        </h2>
        <p className="text-sm text-zinc-400 pt-1 max-w-2xl leading-relaxed">
          {t(
            'ads.what',
            'Say what you are selling and it writes the adverts — the line, the words under it, the button, and the shot to film. Then it hands each one to the desk that makes it.',
          )}
        </p>
      </div>

      <Steps steps={STEPS} at={ads.length ? 3 : what.trim() ? 1 : 0} />

      {/* Who it is all for. Above the platforms because it is the thing that
          is true of every advert this desk will ever write for this person,
          and folded shut once it has been filled in. */}
      <BrandKit onChange={setKit} />

      {/* Where it is going, before it is written rather than after.
          The platforms decide the shape, the length and the hook window, and a
          shape decided after the copy is a rewrite. */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-200">{t('ads.whereTitle', 'Where is it going?')}</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t('ads.whereNote', 'This decides the shape, the length and how fast the hook has to land — so it is asked before the writing, not after.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((one) => {
            const on = going.indexOf(one.id) !== -1;
            const known = Boolean(handles[one.id]);
            return (
              <button
                key={one.id}
                type="button"
                onClick={() => setGoing(on ? going.filter((id) => id !== one.id) : [...going, one.id])}
                aria-pressed={on}
                title={one.bestFormat}
                className={`text-left rounded-xl border px-3 py-2 transition-all ${
                  on ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span className={`block text-sm font-semibold ${on ? 'text-emerald-300' : 'text-zinc-300'}`}>
                  {one.name}
                  {known && <span className="text-xs font-normal text-zinc-500"> · @{handles[one.id]}</span>}
                </span>
                <span className="block text-xs text-zinc-500">{one.bestFormat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The brief. Only the first box is required: an ad for "my bakery in
          Bellville" is a worse ad than one with an audience and an offer, but
          it is a real one, and making somebody fill five boxes before they see
          anything is how a room gets abandoned. */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm text-zinc-400" htmlFor="ads-what">
            {t('ads.whatLabel', 'What are you advertising?')}
          </label>
          <input
            id="ads-what"
            value={what}
            onChange={(event) => setWhat(event.target.value)}
            placeholder={t('ads.whatHint', 'A bakery in Bellville. Sourdough, open six days.')}
            className={field}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="ads-who">
              {t('ads.whoLabel', 'Who is it for?')}
            </label>
            <input
              id="ads-who"
              value={who}
              onChange={(event) => setWho(event.target.value)}
              placeholder={t('ads.whoHint', 'People who drive past on the way to work')}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="ads-offer">
              {t('ads.offerLabel', 'Is there an offer?')}
            </label>
            <input
              id="ads-offer"
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              placeholder={t('ads.offerHint', 'Leave it empty if there is not — it will not invent one')}
              className={field}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="ads-tone">
              {t('ads.toneLabel', 'How should it sound?')}
            </label>
            <input
              id="ads-tone"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder={t('ads.toneHint', 'Warm, no hype')}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="ads-market">
              {t('ads.marketLabel', 'Written in')}
            </label>
            <select
              id="ads-market"
              value={market}
              onChange={(event) => setMarket(event.target.value)}
              className={field}
            >
              {MARKETS.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="ads-placement">
              {t('ads.placementLabel', 'Where does it run?')}
            </label>
            <select
              id="ads-placement"
              value={placement}
              onChange={(event) => setPlacement(event.target.value)}
              className={field}
            >
              {PLACEMENTS.map((one) => (
                <option key={one.id} value={one.id}>
                  {lang === 'af' ? one.af : one.en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">
          {t(
            'ads.marketNote',
            'The copy is written in that language, not translated into it. Carried-over English idiom is the clearest sign of an imported advert.',
          )}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => void write(false)}
            disabled={!what.trim() || busy}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent font-bold text-sm disabled:opacity-40 flex items-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {ads.length ? t('ads.again', 'Write three more') : t('ads.write', 'Write the adverts')}
          </button>
          {/* Writing is text, and text is not what makes the bill. The video
              and the voice are, and each says its own price at its own button. */}
          <span className="text-xs text-zinc-500">{t('ads.free', 'Writing these is free.')}</span>
        </div>

        {problem && (
          <p className="text-sm text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{problem}</span>
          </p>
        )}
      </div>

      {ads.map((ad, index) => (
        <div key={`${ad.angle}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              {ad.angle}
            </span>
            <button
              type="button"
              onClick={() => void copy(ad, index)}
              aria-label={t('ads.copy', 'Copy the words')}
              className="text-zinc-500 hover:text-white flex-shrink-0"
            >
              {copied === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-lg font-bold text-white leading-snug">{ad.headline}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{ad.body}</p>
            <p className="text-sm font-semibold text-emerald-300 pt-1">{ad.cta}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              {t('ads.shot', 'The shot')}
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{ad.shot}</p>
          </div>

          {ad.spoken && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {t('ads.spoken', 'Said aloud')}
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">{ad.spoken}</p>
            </div>
          )}

          {/* What each platform wants for this one. Not advice in general - the
              shape, the hook window and the hashtag ceiling for the platforms
              actually chosen above, so the clip is cut right the first time. */}
          {chosen.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {t('ads.fit', 'Cut it for')}
              </p>
              <ul className="space-y-1">
                {chosen.map((one) => (
                  <li key={one.id} className="text-sm text-zinc-300 leading-relaxed">
                    <span className="font-semibold text-zinc-200">{one.name}</span> — {one.bestFormat},{' '}
                    {t('ads.hookIn', 'hook in')} {one.hookWindow}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The caption and the real composers. Reused rather than rebuilt:
              this row already copies the caption, saves the handles and opens
              each platform's own upload page, and a second copy of it here
              would drift from the first. */}
          <ShareRow title={ad.headline} what={ad.caption || ad.body} hashtags={ad.hashtags ?? []} />

          {/* Handing off rather than repeating. Both desks price themselves. */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                onUseShot(ad.shot);
                onGoTo('canvas');
              }}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3.5 py-2 transition-colors"
            >
              <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
              {t('ads.film', 'Film this one')}
            </button>
            {ad.spoken && (
              <button
                type="button"
                onClick={() => {
                  onUseScript(ad.spoken);
                  onGoTo('voice_studio');
                }}
                className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3.5 py-2 transition-colors"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                {t('ads.read', 'Read this line')}
              </button>
            )}
          </div>
        </div>
      ))}

      <History surface="campaign" reloadKey={kept} />

      {/* Said in the room, not discovered later — and said specifically.
          "Not connected yet" is a shrug; naming what each platform requires is
          the difference between a limitation and an excuse. The sentences come
          from `data/social.ts`, where they are kept next to the URLs they are
          about. */}
      <details className="border-t border-zinc-800 pt-4">
        <summary className="text-xs text-zinc-500 leading-relaxed cursor-pointer flex items-start gap-2">
          <Link2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {t(
              'ads.notPublishing',
              'This writes the advert, makes it, and opens each platform ready to post. It does not upload for you — what that would take, per platform.',
            )}
          </span>
        </summary>
        <ul className="pt-3 space-y-2">
          {PLATFORMS.map((one) => (
            <li key={one.id} className="text-xs text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-400">{one.name}</span> — {one.connectRequires}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
