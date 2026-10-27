'use client';

/**
 * Bring it to life: the Photo Editor's bench for what a photo can become.
 *
 * The owner, 27 October 2026: *"as dit soos 'n sticker afhaal, moet die
 * sticker effect in gebou word en afgetrek word wanneer hulle op dit click"*,
 * and *"daar moet dalk notifications op kom wat vra, make it come alive, of
 * pull the sticker and make a 3d model"*. Three presses, each with its price
 * on it (`lib/becomes.ts`):
 *
 *  - **Pull it out.** Tap a thing in the photo; the engine finds it, the phone
 *    cuts it out with a white die-cut edge (`lib/stickerize.ts`), and it sits
 *    on the photo shimmering until it is tapped, when it peels off and lands
 *    as a layer of its own (`PeelOverlay`, below).
 *  - **Wake it up.** The whole photo moves for six seconds, with its own
 *    sound.
 *  - **Make it 3D.** The last thing pulled out becomes a model that turns
 *    under a finger. A whole photo makes a poor model, so with nothing pulled
 *    out yet it says so and starts Pull it out instead.
 *
 * Both yeses (the picture goes to fal.ai abroad; the person is 18 or older)
 * are asked once on this device, kept, and sent with every press; the
 * route refuses without them (`app/api/become`).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box as BoxIcon, Hand, Loader2, Sparkles, X } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { creditsSaid } from '../lib/credits';
import { BECOMES, BECOME_SIDE, type BecomeId } from '../lib/becomes';
import { cutOut, loadPicture, sendable, type Cut } from '../lib/stickerize';
import ModelView from './ModelView';

type Say = (key: string, fallback: string) => string;

const KNOP = 'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl'
  + ' border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-300 text-center';
const VUL = 'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl'
  + ' bg-emerald-500 px-4 text-sm font-bold text-black disabled:opacity-40';
const GEKIES = 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]';

/* ── The two yeses, asked once on this device ─────────────────────────── */

const YES_KEY = 'fb.engine.yes.v1';

/* Read when the bench first draws, not in an effect after it: a press asked
   for by a suggestion runs in the same moment, and would otherwise ask the
   two questions again of somebody who has already answered them. The bench
   is only ever drawn on the phone, never on the server. */
function saidYes(): boolean {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(YES_KEY) === '1'; } catch { return false; }
}

export function useEngineYes(): readonly [boolean, () => void] {
  const [yes, setYes] = useState(saidYes);
  const give = useCallback(() => {
    setYes(true);
    try { window.localStorage.setItem(YES_KEY, '1'); } catch { /* kept for this visit only */ }
  }, []);
  return [yes, give];
}

function YesSheet({ t, onYes, onNo }: { readonly t: Say; readonly onYes: () => void; readonly onNo: () => void }): React.ReactElement {
  const [abroad, setAbroad] = useState(false);
  const [adult, setAdult] = useState(false);
  const tick = 'flex min-h-[44px] items-start gap-3 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 cursor-pointer';
  return (
    <div className="space-y-2.5 rounded-2xl border border-emerald-500/40 bg-zinc-950/95 p-3" data-becomeyes>
      <p className="text-sm font-bold text-zinc-100">{t('become.yesTitle', 'Before the first one')}</p>
      <label className={tick}>
        <input type="checkbox" checked={abroad} onChange={(event) => setAbroad(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-becomeabroad />
        <span>{t('become.yesAbroad', 'My photo may go to fal.ai, outside South Africa, to be worked on. Nothing is kept there: it is deleted within the hour.')}</span>
      </label>
      <label className={tick}>
        <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-becomeadult />
        <span>{t('become.yesAdult', 'I am 18 or older.')}</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onNo} className={KNOP}>{t('become.yesNo', 'Not now')}</button>
        <button type="button" disabled={!(abroad && adult)} onClick={onYes} className={VUL} data-becomeyesgo>{t('become.yesGo', 'Carry on')}</button>
      </div>
    </div>
  );
}

/* ── Asking the engine ────────────────────────────────────────────────── */

interface Answer {
  readonly state?: string;
  readonly url?: string;
  readonly ticket?: string;
  readonly message?: string;
}

async function ask(body: Record<string, unknown>): Promise<Answer & { readonly ok: boolean }> {
  /* Signed out goes as well, and the route answers "sign in first" in its
     own words, the same as every other paid press. */
  const token = await accessToken();
  const answer = await fetch('/api/become', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ ...body, abroad: true, adult: true }),
  });
  const got = await answer.json().catch(() => ({})) as Answer;
  return { ok: answer.ok, ...got };
}

/** A slow one, asked every five seconds until it is done, for up to ten minutes. */
async function waitFor(ticket: string): Promise<Answer> {
  const token = await accessToken();
  for (let tries = 0; tries < 120; tries += 1) {
    await new Promise((done) => { setTimeout(done, 5000); });
    const now = await fetch(`/api/become?ticket=${encodeURIComponent(ticket)}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
    const at = await now.json().catch(() => ({})) as Answer;
    if (at.state !== 'waiting') return at;
  }
  return { state: 'slow' };
}

/** A finished file, brought onto the phone: fal.ai deletes its copy within the hour. */
async function keep(url: string): Promise<string | null> {
  try {
    const got = await fetch(url);
    if (!got.ok) return null;
    return URL.createObjectURL(await got.blob());
  } catch {
    return null;
  }
}

/* ── The bench ────────────────────────────────────────────────────────── */

export interface PullTap {
  /** Where, as shares of the photo. */
  readonly x: number;
  readonly y: number;
  /** A new number for every tap, so the same spot twice is two taps. */
  readonly n: number;
}

export interface StartBecome {
  readonly id: BecomeId;
  readonly n: number;
}

export default function BecomeBench({
  picture,
  t,
  pulling,
  onPulling,
  tap,
  start,
  lastCut,
  onCut,
  onBusy,
}: {
  readonly picture: HTMLImageElement | null;
  readonly t: Say;
  /** Whether a tap on the photo means "pull this out". */
  readonly pulling: boolean;
  readonly onPulling: (on: boolean) => void;
  /** The latest tap on the photo while pulling. */
  readonly tap: PullTap | null;
  /** A press asked for from outside: a suggestion that was tapped. */
  readonly start: StartBecome | null;
  /** The last thing pulled out, which Make it 3D is made from. */
  readonly lastCut: Cut | null;
  /** A thing has been cut out: the room shows it ready to peel. */
  readonly onCut: (cut: Cut) => void;
  readonly onBusy: (busy: boolean) => void;
}): React.ReactElement {
  const [yes, giveYes] = useEngineYes();
  const [asking, setAsking] = useState<BecomeId | null>(null);
  const [busy, setBusy] = useState<BecomeId | null>(null);
  const [said, setSaid] = useState('');
  const [words, setWords] = useState('');
  const [video, setVideo] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const seenTap = useRef(0);
  const seenStart = useRef(0);

  useEffect(() => { onBusy(busy !== null); }, [busy, onBusy]);
  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video);
    if (model) URL.revokeObjectURL(model);
  }, [video, model]);

  const pull = useCallback(async (at: PullTap): Promise<void> => {
    if (!picture) return;
    const sent = sendable(picture, BECOME_SIDE);
    if (!sent) return;
    setBusy('sticker');
    setSaid(t('become.finding', 'Finding it…'));
    try {
      const got = await ask({ become: 'sticker', picture: sent.data, tap: { x: at.x * sent.width, y: at.y * sent.height } });
      if (!got.ok || !got.url) { setSaid(got.message ?? t('become.failed', 'That did not work this time. Your credits are back.')); return; }
      const mask = await loadPicture(got.url);
      const cut = cutOut(picture, mask);
      if (!cut) { setSaid(t('become.nothing', 'Nothing was found there. Tap the middle of the thing.')); return; }
      onCut(cut);
      onPulling(false);
      setSaid(t('become.peelNow', 'There it is. Tap it to peel it off.'));
    } catch {
      setSaid(t('become.failed', 'That did not work this time. Your credits are back.'));
    } finally {
      setBusy(null);
    }
  }, [picture, onCut, onPulling, t]);

  const wake = useCallback(async (): Promise<void> => {
    if (!picture) return;
    const sent = sendable(picture, BECOME_SIDE);
    if (!sent) return;
    setBusy('alive');
    setSaid(t('become.waking', 'Waking it up. This takes about a minute.'));
    try {
      const got = await ask({ become: 'alive', picture: sent.data, words: words.trim() });
      if (!got.ok || !got.ticket) { setSaid(got.message ?? t('become.noStart', 'That did not start. Nothing was charged.')); return; }
      const done = await waitFor(got.ticket);
      if (done.state !== 'done' || !done.url) {
        setSaid(done.state === 'slow' ? t('become.slow', 'This is taking longer than ten minutes. If it does not arrive, your credits come back.') : done.message ?? t('become.failed', 'That did not work this time. Your credits are back.'));
        return;
      }
      const kept = await keep(done.url);
      if (!kept) { setSaid(t('become.noFetch', 'It was made but could not be brought onto this phone. Try again in a moment.')); return; }
      setVideo(kept);
      setSaid(t('become.awake', 'It is alive. Press play for the sound, and Keep it to save it.'));
    } finally {
      setBusy(null);
    }
  }, [picture, words, t]);

  const make3d = useCallback(async (): Promise<void> => {
    if (!lastCut) {
      /* A whole photo makes a poor model: a thing on its own makes a good one. */
      setSaid(t('become.pullFirst', 'Pull one thing out first: tap it in the photo. That thing becomes the 3D model.'));
      onPulling(true);
      return;
    }
    setBusy('model3d');
    setSaid(t('become.building', 'Building it in 3D. This takes about two minutes.'));
    try {
      const got = await ask({ become: 'model3d', picture: lastCut.bare.toDataURL('image/png') });
      if (!got.ok || !got.ticket) { setSaid(got.message ?? t('become.noStart', 'That did not start. Nothing was charged.')); return; }
      const done = await waitFor(got.ticket);
      if (done.state !== 'done' || !done.url) {
        setSaid(done.state === 'slow' ? t('become.slow', 'This is taking longer than ten minutes. If it does not arrive, your credits come back.') : done.message ?? t('become.failed', 'That did not work this time. Your credits are back.'));
        return;
      }
      const kept = await keep(done.url);
      if (!kept) { setSaid(t('become.noFetch', 'It was made but could not be brought onto this phone. Try again in a moment.')); return; }
      setModel(kept);
      setSaid(t('become.built', 'Here it is. Turn it with a finger, and Keep it to save the 3D file.'));
    } finally {
      setBusy(null);
    }
  }, [lastCut, onPulling, t]);

  /* Every press first checks the two yeses, and asks them once if needed. */
  const go = useCallback((id: BecomeId): void => {
    if (!yes) { setAsking(id); return; }
    if (id === 'sticker') { onPulling(!pulling); setSaid(pulling ? '' : t('become.tapThing', 'Tap the thing you want to pull out.')); return; }
    if (id === 'alive') void wake();
    else void make3d();
  }, [yes, pulling, onPulling, wake, make3d, t]);

  useEffect(() => {
    if (!tap || tap.n === seenTap.current || busy) return;
    seenTap.current = tap.n;
    if (!yes) { setAsking('sticker'); return; }
    void pull(tap);
  }, [tap, busy, yes, pull]);

  useEffect(() => {
    if (!start || start.n === seenStart.current) return;
    seenStart.current = start.n;
    go(start.id);
  }, [start, go]);

  if (!picture) {
    return <p className="text-[13px] text-zinc-400" data-becomenone>{t('become.none', 'Bring a photo in first.')}</p>;
  }

  const price = (id: BecomeId): string => creditsSaid(BECOMES[id].credits, t);

  /* One column, not several: under the photo on a phone each child of a
     bench becomes a column of its own that scrolls sideways, and the words
     for Wake it up landed off the edge of the screen. */
  return (
    <div data-becomebench>
    <div className="space-y-3">
      {asking && (
        <YesSheet
          t={t}
          onNo={() => setAsking(null)}
          onYes={() => { giveYes(); const id = asking; setAsking(null); window.setTimeout(() => go(id), 0); }}
        />
      )}
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          data-become="sticker"
          aria-pressed={pulling}
          disabled={busy !== null}
          onClick={() => go('sticker')}
          className={`${KNOP} ${pulling ? GEKIES : ''}`}
        >
          {busy === 'sticker' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}
          {pulling ? t('become.stickerOn', 'Tap the thing in the photo') : t(BECOMES.sticker.name[0], BECOMES.sticker.name[1])}
          <span className="font-semibold text-zinc-400">· {price('sticker')}</span>
        </button>
        <button type="button" data-become="alive" disabled={busy !== null} onClick={() => go('alive')} className={KNOP}>
          {busy === 'alive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t(BECOMES.alive.name[0], BECOMES.alive.name[1])}
          <span className="font-semibold text-zinc-400">· {price('alive')}</span>
        </button>
        <button type="button" data-become="model3d" disabled={busy !== null} onClick={() => go('model3d')} className={KNOP}>
          {busy === 'model3d' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BoxIcon className="h-4 w-4" />}
          {t(BECOMES.model3d.name[0], BECOMES.model3d.name[1])}
          <span className="font-semibold text-zinc-400">· {price('model3d')}</span>
        </button>
      </div>
      <input
        type="text"
        value={words}
        maxLength={200}
        onChange={(event) => setWords(event.target.value)}
        placeholder={t('become.aliveWords', 'What should move? (you can leave this empty)')}
        aria-label={t('become.aliveWords', 'What should move? (you can leave this empty)')}
        className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
        data-becomewords
      />
      {said && <p role="status" className="text-[13px] text-zinc-300" data-becomesaid>{said}</p>}
      {video && (
        <div className="space-y-2" data-becomevideo>
          <video src={video} controls loop playsInline className="w-full rounded-2xl border border-zinc-700" />
          <a href={video} download="living-photo.mp4" className={VUL}>{t('become.keep', 'Keep it')}</a>
        </div>
      )}
      {model && (
        <div className="space-y-2" data-becomemodel>
          <ModelView src={model} label={t('become.modelLabel', 'Your 3D model. Turn it with a finger.')} />
          <a href={model} download="model.glb" className={VUL}>{t('become.keep', 'Keep it')}</a>
        </div>
      )}
    </div>
    </div>
  );
}

/* ── The sticker, waiting to be peeled ────────────────────────────────── */

/**
 * The cut-out sits exactly where the thing was, shimmering along its edge,
 * until it is tapped. Then it peels: it lifts at a corner, tilts towards the
 * finger, its shadow grows, a light runs across it, and it settles a little
 * up and to the side, where it becomes a layer of its own (`onPeeled`).
 * The animation is `fb-peel` and `fb-peel-sheen` in `globals.css`.
 */
export function PeelOverlay({ src, rect, t, onPeeled, onDismiss }: {
  readonly src: string;
  /** Where the sticker sits over the photo, in pixels inside the stage. */
  readonly rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly t: Say;
  readonly onPeeled: () => void;
  readonly onDismiss: () => void;
}): React.ReactElement {
  const [peeling, setPeeling] = useState(false);
  const peelIt = (): void => {
    if (peeling) return;
    setPeeling(true);
    window.setTimeout(onPeeled, 950);
  };
  return (
    <>
      {/* A div with a button's role rather than a <button>: the room rings
          every button in glass and a green edge, and this one is only the
          sticker. Enter and Space peel it as a tap does. */}
      <div
        role="button"
        tabIndex={0}
        data-peel
        data-peeling={peeling ? 'yes' : 'no'}
        aria-label={t('become.peelIt', 'Peel the sticker off')}
        onClick={peelIt}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); peelIt(); } }}
        className="absolute z-40 cursor-pointer outline-none"
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      >
        <span
          aria-hidden
          className={`fb-sticker block h-full w-full select-none bg-contain bg-center bg-no-repeat ${peeling ? 'fb-peel' : 'fb-sticker-ready'}`}
          style={{ backgroundImage: `url(${src})` }}
        />
        {/* The light runs across the sticker only, not its box: masked by the
            sticker's own shape. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${peeling ? 'fb-peel fb-peel-sheen' : ''}`}
          style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
        />
      </div>
      {!peeling && (
        <div className="absolute inset-x-0 bottom-3 z-40 flex justify-center px-4" data-peelhint>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-zinc-950/90 px-4 py-2 text-xs font-bold text-emerald-100 shadow-lg">
            {t('become.peelHint', 'Tap the sticker to peel it off')}
            <button type="button" onClick={onDismiss} aria-label={t('become.peelLeave', 'Leave it')} className="grid h-6 w-6 place-items-center rounded-full text-zinc-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </p>
        </div>
      )}
    </>
  );
}

/* ── The suggestions ──────────────────────────────────────────────────── */

/**
 * What else it can become, offered at the moment it makes sense: when a
 * photo is opened ("Make it come alive"), and when a sticker is peeled
 * ("Make it 3D"). Small, over the photo, gone in nine seconds or at a tap,
 * and each with its price, because a suggestion that hides its price is a
 * trap.
 */
export function BecomeNudge({ ids, t, onPick, onClose }: {
  readonly ids: readonly BecomeId[];
  readonly t: Say;
  readonly onPick: (id: BecomeId) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  useEffect(() => {
    const gone = window.setTimeout(onClose, 9000);
    return () => window.clearTimeout(gone);
  }, [onClose]);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-4" data-becomenudge>
      {ids.map((id) => (
        <div key={id} className="fb-nudge pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-emerald-400/60 bg-zinc-950/90 pl-1 pr-1 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
          <button type="button" data-becomenudgego={id} onClick={() => onPick(id)} className="inline-flex min-h-[40px] min-w-0 items-center gap-2 rounded-full px-3 text-xs font-bold text-emerald-100">
            {id === 'model3d' ? <BoxIcon className="h-4 w-4 shrink-0" /> : id === 'alive' ? <Sparkles className="h-4 w-4 shrink-0" /> : <Hand className="h-4 w-4 shrink-0" />}
            <span className="truncate">{t(BECOMES[id].ask[0], BECOMES[id].ask[1])}</span>
            <span className="shrink-0 text-emerald-300/80">· {creditsSaid(BECOMES[id].credits, t)}</span>
          </button>
          <button type="button" onClick={onClose} aria-label={t('become.nudgeShut', 'Not now')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
