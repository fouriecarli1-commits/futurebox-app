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

import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Loader2, Sparkles, Video as VideoIcon, Mic2, Copy, Check, AlertTriangle, Link2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import { useCopilotOps } from '../lib/copilotactions';
import type { SurfaceId } from '../lib/surfaces';
import { DESTINATIONS, PLATFORMS } from '../data/social';
import { filmThisAd, readThisAd } from '../lib/adhandover';
import { NOTHING_KEPT, forgetBrief, loadBrief, saveBrief } from '../lib/adbrief';
import { clearPicks, loadPicks, putPicks } from '../lib/chosenformat';
import { loadPlan, savePlan } from '../lib/marketplan';
import {
  EMPTY_SHELF, dropWork, keepWork, loadShelf, nameOf, newWorkId, openWork, workById,
  type Shelf,
} from '../lib/adwork';
import { loadChosen } from '../lib/chosenformat';
import { loadHandles, type Handles } from '../lib/social';
import ShareRow from './ShareRow';
import AdRuns from './AdRuns';
import AdReport from './AdReport';
import Queue from './Queue';
import MarketPlan from './MarketPlan';
import AddOn from './AddOn';
import AdFormats from './AdFormats';
import { MARKETING } from '../lib/addons';
import { NOTHING_UNLOCKED, owns, unlocked, type Unlocked } from '../lib/unlocked';
import Steps, { type Step } from './Steps';
import BrandKit from './BrandKit';
import { EMPTY as EMPTY_KIT, brandLine, type BrandKit as Kit } from '../lib/brandkit';
import History from './History';
import Note from './Note';
import Card from './Card';
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
  { id: 'story', en: 'Story or reel, sound on', af: 'Storie of reel, klank aan' },
  { id: 'preroll', en: 'Before a video', af: 'Voor ’n video' },
  { id: 'display', en: 'A banner, no sound', af: '’n Banier, geen klank' },
] as const;

export default function Campaign({
  onGoTo,
  onSetUp,
}: {
  onGoTo: (surface: SurfaceId) => void;
  /**
   * Put something in a room on the way into it.
   *
   * The only way out of this room now. There used to be an `onUseShot` and
   * an `onUseScript` beside it, one string each, and that pair WAS the
   * fault: a button that can hand over one field hands over one field, and
   * nobody notices the other six are missing because there was never a
   * place to put them. Everything goes through `lib/adhandover.ts`, which
   * answers "what should travel" per destination and can be checked.
   */
  onSetUp: (room: SurfaceId, op: string, value: string) => void;
}): React.ReactElement {
  const { t, lang } = useLang();

  /* ── The brief, restored rather than re-typed ──────────────────────
 
     Everything this desk PRODUCES was already remembered — the recommended
     formats, the weekly plan, the imported report. The brief that produced
     all three lived in component state and nowhere else, and rooms unmount
     when you leave them.
 
     So: five boxes, three adverts, press "Film this one", come back — and
     the desk is empty, with the plan still sitting above it describing a
     business the screen no longer knows anything about. Survivable while
     the only way out was a link; not survivable now that the whole point
     of this room is that it sends you to five others.
 
     Read once, synchronously, as the initial value. An effect that fills
     the boxes after the first paint is a room somebody has already started
     typing into when their old brief lands on top of it. */
  /* ── Which piece of work is open ────────────────────────────────────
 
     There used to be one of everything — one brief, one set of
     recommendations, one plan — so a second campaign replaced the first
     silently, with no list and nothing to press. `lib/adwork.ts` holds them
     all; this is the one on screen. */
  const [shelf, setShelf] = useState<Shelf>(() =>
    typeof window === 'undefined' ? EMPTY_SHELF : loadShelf());
  const [workId, setWorkId] = useState<string>(() => shelf.open ?? newWorkId());
  /* Bumped when a saved campaign is opened, to remount the two panels below
     so they re-read the stores this has just rewritten. They already read
     their own stores, which is the seam; lifting three panels' state into
     here to do the same job would be a far larger change. */
  const [openedAt, setOpenedAt] = useState(0);

  const [before] = useState(() => {
    if (typeof window === 'undefined') return NOTHING_KEPT;
    /* The open piece of work wins over the loose brief: the loose one is
       what `adbrief.ts` keeps for the current visit, and the shelf is what
       survives choosing a different campaign. */
    const open = workById(shelf.open);
    return open ? open.brief : loadBrief();
  });
  const [what, setWhat] = useState(before.what);
  const [who, setWho] = useState(before.who);
  const [offer, setOffer] = useState(before.offer);
  const [tone, setTone] = useState(before.tone);
  const [market, setMarket] = useState<string>(before.market || 'English');
  const [placement, setPlacement] = useState<string>(before.placement || 'feed');

  /* Which platforms this is going to. The handles come from the same store the
     share row reads, so a platform you have already set up here is already set
     up there — this room does not ask for anything twice. */
  const [handles, setHandles] = useState<Handles>({});

  /* What is paid for on this account.

     Asked once when the room opens, and again after a checkout comes back.
     The server decides this — `/api/plan` and `/api/schedule` each ask for
     themselves — so this only chooses which screen to draw. A page that
     decides its own permissions decides them in the buyer's favour. */
  const [paid, setPaid] = useState<Unlocked>(NOTHING_UNLOCKED);
  const askAgain = useCallback(() => {
    void unlocked().then(setPaid);
  }, []);
  useEffect(() => {
    askAgain();
  }, [askAgain]);
  /**
   * Who these adverts are for, kept between visits.
   *
   * Sent alongside the brief rather than merged into it: the brief is what is
   * different about today, and this is what is the same every time. One field
   * holding both would mean retyping the constant part to change the variable
   * one, which is the whole thing the kit exists to stop.
   */
  const [kit, setKit] = useState<Kit>(EMPTY_KIT);
  const [going, setGoing] = useState<string[]>(
    before.going.length ? [...before.going] : ['tiktok', 'instagram'],
  );
  useEffect(() => setHandles(loadHandles()), []);

  const chosen = PLATFORMS.filter((one) => going.indexOf(one.id) !== -1);
  /* Ticked the same way and kept apart, because a destination is not an
     account: it has no handle to show, nothing to connect, and nothing the
     posting queue can schedule to. See `DESTINATIONS` in data/social.ts. */
  const places = DESTINATIONS.filter((one) => going.indexOf(one.id) !== -1);

  const [ads, setAds] = useState<Ad[]>(() => before.ads.map((one) => ({ ...one, hashtags: [...one.hashtags] })));
  /* ── And written down again whenever it changes ──────────────────────
 
     Every field, not only the ones with a button under them: somebody who
     types a tone and then leaves has typed a tone.
 
     Held for a moment rather than written on every keystroke. A write per
     character is a JSON serialise and a storage write per character, and
     the only visit that could lose anything is one that ends inside half a
     second of the last letter — which is a page being closed, where the
     browser is not going to run this either way. */
  useEffect(() => {
    const soon = window.setTimeout(() => {
      const brief = { what, who, offer, tone, market, placement, going, ads };
      saveBrief(brief);
      /* On the shelf too, from the moment there is something in the first
         box — "the ones that I have worked on", not the ones somebody
         remembered to press Save on. A Save button is a thing to forget,
         and what it loses is the work done before anybody knew it existed.
 
         The recommendations and the plan are read out of their own stores
         rather than held here: those two panels own them, they write them
         as they arrive, and reading them at this moment is what makes the
         saved campaign whole rather than a brief with two gaps in it. */
      if (!what.trim()) return;
      const said = loadPicks();
      setShelf(keepWork({
        id: workId,
        savedAt: new Date().toISOString(),
        brief,
        picks: said.picks,
        instead: said.instead,
        plan: loadPlan(),
      }));
    }, 400);
    return () => window.clearTimeout(soon);
  }, [what, who, offer, tone, market, placement, going, ads, workId]);

  /** Open a saved campaign: put all of it back, then let the panels re-read. */
  const openSaved = useCallback((id: string) => {
    const work = workById(id);
    if (!work) return;
    setWhat(work.brief.what);
    setWho(work.brief.who);
    setOffer(work.brief.offer);
    setTone(work.brief.tone);
    setMarket(work.brief.market || 'English');
    setPlacement(work.brief.placement || 'feed');
    setGoing([...work.brief.going]);
    setAds(work.brief.ads.map((one) => ({ ...one, hashtags: [...one.hashtags] })));
    setProblem(null);
    /* The two stores the panels below read, written before they remount.
       The other order would have them read the previous campaign's
       recommendations for one paint, which is the wrong advert on screen. */
    putPicks(work.picks, work.instead);
    savePlan(work.plan);
    saveBrief(work.brief);
    setWorkId(work.id);
    setShelf(openWork(work.id));
    setOpenedAt((was) => was + 1);
  }, []);

  /** A new one, beside the others rather than on top of them. */
  const startNew = useCallback(() => {
    setWhat('');
    setWho('');
    setOffer('');
    setTone('');
    setAds([]);
    setProblem(null);
    /* Cleared rather than carried over: a new campaign that opens with the
       last one's recommendations still on screen is the fault this whole
       change is about, inverted. */
    clearPicks();
    savePlan(null);
    forgetBrief();
    setWorkId(newWorkId());
    setShelf(openWork(null));
    setOpenedAt((was) => was + 1);
  }, []);
  /* ── The look the adviser above recommended ────────────────────────
 
     It lived in `AdFormats`'s own state and nowhere else, so the cards down
     here handed a shot to the video desk with no look on it while the panel
     two inches above said exactly how it should look. `chosenformat.ts`
     already exists to join these two panels — this is the third thing it
     carries. Re-read whenever the adviser runs, because it writes on the
     way out. */
  const [looks, setLooks] = useState<readonly { id: string; style?: string }[]>([]);
  const readLooks = useCallback(() => {
    setLooks(loadChosen().map((one) => ({ id: one.format.id, style: one.style })));
  }, []);
  useEffect(() => readLooks(), [readLooks]);
  /** The look for a video, when the adviser recommended a filmed format. */
  const lookFor = (_ad: Ad): string | undefined =>
    looks.find((one) => one.style && (one.id === 'short_vertical' || one.id === 'explainer_film'))?.style;
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
          fit: [...chosen, ...places]
            .map((one) =>
              `${one.name}: ${one.bestFormat}, hook in ${one.hookWindow}, ` +
              (one.maxHashtags > 0 ? `at most ${one.maxHashtags} hashtags` : 'no hashtags — they are noise there'))
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
        setProblem(refusalText(data, lang, t('ads.failed', 'The ad writer could not be reached.')));
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
        {/* The room's own sentence, on the same terms as every other
            explanation here: one clipped line and a mark on a phone, the whole
            thing on a desk. It was three lines of grey above the first
            control. */}
        <Note className="text-sm text-zinc-400 pt-1 max-w-2xl leading-relaxed">
          {t(
            'ads.what',
            'Say what you are selling and it writes the adverts — the line, the words under it, the button, and the shot to film. Then it hands each one to the desk that makes it.',
          )}
        </Note>
      </div>

      <Steps steps={STEPS} at={ads.length ? 3 : what.trim() ? 1 : 0} />

      {/* Who it is all for. Above the platforms because it is the thing that
          is true of every advert this desk will ever write for this person,
          and folded shut once it has been filled in. */}
      <BrandKit onChange={setKit} />

      {/* Where it is going, before it is written rather than after.
          The platforms decide the shape, the length and the hook window, and a
          shape decided after the copy is a rewrite. */}
      {/* ── What should this even be? ────────────────────────────────────

          Above the platform row and the brief's own fields, because it is
          the question that comes before both: the platform follows from the
          format, and half the formats this studio can make are not adverts
          at all. See `AdFormats.tsx`. */}
      <AdFormats
        key={`shape-${openedAt}`}
        brief={{
          what,
          who,
          offer,
          tone,
          market,
          place: PLACEMENTS.find((one) => one.id === placement)?.en,
          /* Who they are, when they have said. The one part of a brief that
             is the same on every advert, which is why it lives in the kit
             rather than in the boxes. */
          brand: brandLine(kit) || undefined,
        }}
        /* The first advert, once there are any, so a shot can quote a real
           line instead of describing one. Not a choice made here — the
           three cards below each have their own buttons; this is the
           adviser at the top of the room, and it carries what exists. */
        ad={ads[0] ?? null}
        going={going}
        onGoTo={onGoTo}
        onSetUp={onSetUp}
      />

      <Card title={t('ads.whereTitle', 'Where is it going?')}>
        <Note className="text-xs text-zinc-500 leading-relaxed">{t('ads.whereNote', 'This decides the shape, the length and how fast the hook has to land — so it is asked before the writing, not after.')}</Note>
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
                title={t(`social.format.${one.id}`, one.bestFormat)}
                className={`min-h-[44px] text-left rounded-xl border px-3 py-2 transition-all ${
                  on ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span className={`block text-sm font-semibold ${on ? 'text-emerald-300' : 'text-zinc-300'}`}>
                  {one.name}
                  {known && <span className="text-xs font-normal text-zinc-500"> · @{handles[one.id]}</span>}
                </span>
                <span className="block text-xs text-zinc-500">{t(`social.format.${one.id}`, one.bestFormat)}</span>
              </button>
            );
          })}

          {/* ── And the places that are not an account ──────────────────

              Ticked in the same row, because from where somebody is
              standing "where is this going" has one answer and it may
              include their own site. Kept as a separate list underneath in
              the code for the reason `DESTINATIONS` states: six other
              screens read PLATFORMS, and none of them can do anything
              sensible with a website. */}
          {DESTINATIONS.map((one) => {
            const on = going.indexOf(one.id) !== -1;
            return (
              <button
                key={one.id}
                type="button"
                onClick={() => setGoing(on ? going.filter((id) => id !== one.id) : [...going, one.id])}
                aria-pressed={on}
                title={t(`dest.format.${one.id}`, one.bestFormat)}
                className={`min-h-[44px] text-left rounded-xl border px-3 py-2 transition-all ${
                  on ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span className={`block text-sm font-semibold ${on ? 'text-emerald-300' : 'text-zinc-300'}`}>
                  {lang === 'af' ? one.af : one.en}
                </span>
                <span className="block text-xs text-zinc-500">
                  {t(`dest.format.${one.id}`, one.bestFormat)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* The brief. Only the first box is required: an ad for "my bakery in
          Bellville" is a worse ad than one with an audience and an offer, but
          it is a real one, and making somebody fill five boxes before they see
          anything is how a room gets abandoned. */}
      <Card title={t('ads.aboutTitle', 'What the advert is about')}>
        {/* ── Kept, and a way to stop keeping it ──────────────────────
 
            The brief comes back when you come back, which is the whole
            point — this room sends you to five others and every trip used
            to empty it. But a brief that is kept for ever is a second
            campaign spent clearing six boxes by hand, so there is one
            press that forgets it.
 
            Said out loud, and said as what it is: this browser, this
            device. There is no account behind it, and somebody who opens
            the app on their phone and finds an empty desk should have
            been told rather than left to guess. */}
        {/* ── The ones you have worked on ────────────────────────────
 
            "The ones that I have worked on should be able to be a button
            to push on and then everything opens as it was."
 
            One press puts the brief, the recommendations with their
            reasons, the written adverts and the week all back. Saved
            without being asked for, from the moment there is something in
            the first box — a Save button is a thing to forget, and what it
            loses is the work somebody did before they knew it was there.
 
            Said out loud that it is this browser: there is no account
            behind it, and finding an empty shelf on your phone is worse
            than being told. */}
        {(shelf.works.length > 0 || what || ads.length > 0) && (
          <div className="space-y-2 pb-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500 leading-snug">
                {t('ads.keptHere', 'These are kept in this browser, so they are still here when you come back from another room. They are not on your other devices.')}
              </p>
              <button
                type="button"
                onClick={startNew}
                className="min-h-[44px] flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                {t('ads.startOver', 'Start a new one')}
              </button>
            </div>
            {shelf.works.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {shelf.works.map((one) => {
                  const here = one.id === workId;
                  const name = nameOf(one);
                  if (!name) return null;
                  return (
                    <div
                      key={one.id}
                      className={`flex items-stretch rounded-xl border overflow-hidden ${
                        here ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openSaved(one.id)}
                        aria-current={here ? 'true' : undefined}
                        className="min-h-[44px] max-w-[15rem] text-left px-3 py-2"
                      >
                        <span className={`block truncate text-sm font-semibold ${here ? 'text-emerald-300' : 'text-zinc-300'}`}>
                          {name}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {/* What is in it, so a row is recognisable before
                              it is opened rather than after. */}
                          {[
                            one.picks.length
                              ? `${one.picks.length} ${t('ads.savedPicks', 'recommended')}`
                              : '',
                            one.brief.ads.length
                              ? `${one.brief.ads.length} ${t('ads.savedAds', 'written')}`
                              : '',
                            one.plan ? t('ads.savedPlan', 'a plan') : '',
                          ].filter(Boolean).join(' \u00b7 ') || t('ads.savedBrief', 'just the brief')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShelf(dropWork(one.id));
                          if (here) startNew();
                        }}
                        aria-label={`${t('ads.forget', 'Forget')} ${name}`}
                        className="min-h-[44px] px-2.5 border-l border-zinc-800 text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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

        <Note className="text-xs text-zinc-500 leading-relaxed">{t(
            'ads.marketNote',
            'The copy is written in that language, not translated into it. Carried-over English idiom is the clearest sign of an imported advert.',
          )}</Note>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => void write(false)}
            disabled={!what.trim() || busy}
            /* A greyed-out main button with no reason given reads as broken,
               and this is the main button of the room. It cannot write an
               advert for a product nobody has named. */
            title={!what.trim() ? t('ads.needWhat', 'Say what you are advertising first.') : undefined}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent font-bold text-sm disabled:opacity-40 flex items-center gap-2"
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
      </Card>

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
                    <span className="font-semibold text-zinc-200">{one.name}</span> —{' '}
                    {t(`social.format.${one.id}`, one.bestFormat)},{' '}
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
                /* Everything the video desk can take.
 
                   The spoken line still goes INTO the shot rather than
                   beside it — the desk knows a line is said only by its
                   quotation marks, and `filmThisAd` keeps that with
                   `withSpoken`. What is new is the rest: the shape, the
                   length and the look. This sent the prompt alone, so the
                   desk decided an advert was vertical and fifteen seconds
                   and then opened a room set to whatever it had last been
                   left on. */
                for (const wire of filmThisAd({ ad, going, style: lookFor(ad) })) {
                  onSetUp(wire.room, wire.op, wire.value);
                }
                onGoTo('canvas');
              }}
              className="min-h-[44px] flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3.5 py-2 transition-colors"
            >
              <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
              {t('ads.film', 'Film this one')}
            </button>
            {ad.spoken && (
              <button
                type="button"
                onClick={() => {
                  /* The whole advert, not the one line. A spoken advert is
                     the hook, the reason and the call; `ad.spoken` is what
                     the CLIP says, which is a different job — and this
                     button lands in the room whose entire purpose is
                     reading a script out loud. */
                  for (const wire of readThisAd({ ad })) {
                    onSetUp(wire.room, wire.op, wire.value);
                  }
                  onGoTo('voice_studio');
                }}
                className="min-h-[44px] flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3.5 py-2 transition-colors"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                {t('ads.read', 'Read this one')}
              </button>
            )}
          </div>
        </div>
      ))}

      {/* ── When it goes out, and where ─────────────────────────────────
          After the creative, because that is where the room used to stop. An
          advertising service is the creative plus two more things: when it
          goes out, and what it did. The second needs numbers read back from
          Meta and Google and cannot be built yet; the first needs nobody's
          permission and is this. */}
      <AdRuns headline={ads[0]?.headline} />

      {/* ── And what it did ─────────────────────────────────────────────
          The other half of an advertising service, and the half a client
          re-buys: "we wrote you some ads" is a one-off, "here is what your
          R2 000 did and which angle worked" is a monthly invoice. It takes the
          platform's own export rather than an API, because the API needs their
          app review and a verified company and the numbers are worth having
          before either exists. */}
      <AdReport />

      {/* ── The paid half ───────────────────────────────────────────────

          Everything above this line is open on every plan, including the free
          one: the brief, the advert writer, the runs, the report. Below it is
          the marketing add-on — the market read, the week, and the queue that
          makes the week happen.

          Selling by taking away something somebody was already using is how an
          app loses the customer it already has, so the line is drawn here and
          the sales screen says where it is. */}
      {owns(paid, MARKETING) ? (
        <>
          <MarketPlan
            key={`plan-${openedAt}`}
            brief={{ what, who, offer, tone, market }}
            onGoTo={onGoTo}
            onSetUp={onSetUp}
          />

          {/* The plan says Tuesday at six; this is what makes Tuesday at six
              happen rather than being read once and forgotten. It reminds
              rather than posts, and says so on its own face — see
              `components/Queue.tsx`. The caption from the first advert is
              carried in so the common case is two taps. */}
          <Queue caption={ads[0]?.caption || ads[0]?.body || ''} />
        </>
      ) : (
        <AddOn what={paid} onBought={askAgain} />
      )}

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
            {/* It ended "— what that would take, per platform", which is not a
                sentence: a summary line that trails off, on a `<details>`
                nobody knew was pressable. Carli: "daai een sin ... maak nie
                vir my sin nie."

                It says the reason now — every platform wants its own approved
                developer app — and asks to be pressed, which is the one thing
                a summary has to do. */}
            {t(
              'ads.notPublishing',
              'This writes the advert, makes it, and opens each platform with the post ready to go. It cannot upload for you: every platform wants its own approved developer app first. Press this line to see what each one asks for.',
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
