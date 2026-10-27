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
import { IDEAS, type IdeaMoment } from '../lib/ideas';
import ModelView from './ModelView';
import { aboveBar } from './TabBar';

type Say = (key: string, fallback: string) => string;

const KNOP = 'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl'
  + ' border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-300 text-center';
const VUL = 'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl'
  + ' bg-emerald-500 px-4 text-sm font-bold text-black disabled:opacity-40';

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
  /* Brought into view: the bench can be below the fold on a phone, and two
     questions out of sight are a press that seems to do nothing. */
  const here = useRef<HTMLDivElement>(null);
  useEffect(() => { here.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, []);
  const tick = 'flex min-h-[44px] items-start gap-3 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 cursor-pointer';
  return (
    <div ref={here} className="space-y-2.5 rounded-2xl border border-emerald-500/40 bg-zinc-950/95 p-3" data-becomeyes>
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

/**
 * A slow one from start to finish: asked, waited for, and brought onto the
 * phone. Either the file (a blob address) or what to tell them.
 */
async function slowOne(body: Record<string, unknown>, t: Say): Promise<{ readonly file?: string; readonly said?: string }> {
  try {
    const got = await ask(body);
    if (!got.ok || !got.ticket) return { said: got.message ?? t('become.noStart', 'That did not start. Nothing was charged.') };
    const done = await waitFor(got.ticket);
    if (done.state !== 'done' || !done.url) {
      return { said: done.state === 'slow' ? t('become.slow', 'This is taking longer than ten minutes. If it does not arrive, your credits come back.') : done.message ?? t('become.failed', 'That did not work this time. Your credits are back.') };
    }
    const file = await keep(done.url);
    return file ? { file } : { said: t('become.noFetch', 'It was made but could not be brought onto this phone. Try again in a moment.') };
  } catch {
    return { said: t('become.failed', 'That did not work this time. Your credits are back.') };
  }
}

/* ── How each press looks ─────────────────────────────────────────────── */

const ICONS: Readonly<Record<BecomeId, React.ComponentType<{ className?: string }>>> = { sticker: Hand, alive: Sparkles, model3d: BoxIcon };

const WHAT: Readonly<Record<BecomeId, readonly [string, string]>> = {
  sticker: ['become.stickerWhat', 'Tap a thing in the photo. It peels off as a sticker.'],
  alive: ['become.aliveWhat', 'Six seconds of movement, with its own sound.'],
  model3d: ['become.model3dWhat', 'The thing you pulled out, as a model you can spin.'],
};

/** A press as a card: what it is, what it does, how long, and its price. */
function BecomeCard({ id, t, busy, on, disabled, onClick, title }: {
  readonly id: BecomeId;
  readonly t: Say;
  readonly busy: boolean;
  readonly on?: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly title?: string;
}): React.ReactElement {
  const Icon = ICONS[id];
  return (
    <button
      type="button"
      data-become={id}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[68px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-50 ${on ? 'border-emerald-400 bg-emerald-500/15' : 'border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950'}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-zinc-100">{title ?? t(BECOMES[id].name[0], BECOMES[id].name[1])}</span>
        <span className="block text-xs leading-snug text-zinc-400">
          {t(WHAT[id][0], WHAT[id][1])} {t(BECOMES[id].wait[0], BECOMES[id].wait[1])}.
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
        {creditsSaid(BECOMES[id].credits, t)}
      </span>
    </button>
  );
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
  onSay,
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
  /** What the bench just said, so the room can show it over the photo too:
      on a phone the bench is often below the fold. */
  readonly onSay?: (words: string) => void;
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
  useEffect(() => { if (said) onSay?.(said); }, [said, onSay]);
  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video);
    if (model) URL.revokeObjectURL(model);
  }, [video, model]);

  const pull = useCallback(async (at: PullTap): Promise<void> => {
    if (!picture) return;
    /* Every way this can end says so, in words, over the photo as well as
       here (`onSay`): the owner, 27 October 2026, *"As niks werk nie en
       daar is 'n rede moet dit vir die klient sê."* */
    let sent: ReturnType<typeof sendable> = null;
    try { sent = sendable(picture, BECOME_SIDE); } catch { sent = null; }
    if (!sent) { setSaid(t('become.noPicture', 'This picture could not be read. Nothing was charged.')); return; }
    setBusy('sticker');
    setSaid(t('become.finding', 'Finding it…'));
    let paid = false;
    try {
      const got = await ask({ become: 'sticker', picture: sent.data, tap: { x: at.x * sent.width, y: at.y * sent.height } });
      if (!got.ok || !got.url) { setSaid(got.message ?? t('become.failed', 'That did not work this time. Your credits are back.')); return; }
      paid = true;
      const mask = await loadPicture(got.url);
      const cut = cutOut(picture, mask);
      if (!cut) { setSaid(t('become.nothing', 'Nothing was found there. Tap the middle of the thing.')); return; }
      /* A "thing" as big as the whole photo is not a thing: it would sit
         over the photo as a copy of it and look as though nothing happened. */
      if (cut.box.w * cut.box.h > 0.9) { setSaid(t('become.allOfIt', 'That took the whole photo, not one thing. Tap the middle of one thing, close up.')); return; }
      onCut(cut);
      onPulling(false);
      setSaid(t('become.peelNow', 'There it is. Tap it to peel it off.'));
    } catch {
      setSaid(paid
        ? t('become.noFetchSticker', 'It was found, but could not be brought onto this phone. Check your connection and tap it again.')
        : t('become.failed', 'That did not work this time. Your credits are back.'));
    } finally {
      setBusy(null);
    }
  }, [picture, onCut, onPulling, t]);

  const wake = useCallback(async (): Promise<void> => {
    if (!picture) return;
    let sent: ReturnType<typeof sendable> = null;
    try { sent = sendable(picture, BECOME_SIDE); } catch { sent = null; }
    if (!sent) { setSaid(t('become.noPicture', 'This picture could not be read. Nothing was charged.')); return; }
    setBusy('alive');
    setSaid(t('become.waking', 'Waking it up. This takes about a minute.'));
    try {
      const got = await slowOne({ become: 'alive', picture: sent.data, words: words.trim() }, t);
      if (!got.file) { setSaid(got.said ?? ''); return; }
      setVideo(got.file);
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
      const got = await slowOne({ become: 'model3d', picture: lastCut.bare.toDataURL('image/png') }, t);
      if (!got.file) { setSaid(got.said ?? ''); return; }
      setModel(got.file);
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
      {said && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2 text-[13px] text-emerald-100" data-becomesaid>{said}</p>}
      <div className="grid grid-cols-1 gap-2">
        <BecomeCard
          id="sticker"
          t={t}
          busy={busy === 'sticker'}
          on={pulling}
          disabled={busy !== null}
          onClick={() => go('sticker')}
          title={pulling ? t('become.stickerOn', 'Tap the thing in the photo') : undefined}
        />
        <BecomeCard id="alive" t={t} busy={busy === 'alive'} disabled={busy !== null} onClick={() => go('alive')} />
        <input
          type="text"
          value={words}
          maxLength={200}
          onChange={(event) => setWords(event.target.value)}
          placeholder={t('become.aliveWords', 'What should move? (you can leave this empty)')}
          aria-label={t('become.aliveWords', 'What should move? (you can leave this empty)')}
          className="-mt-1 min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white"
          data-becomewords
        />
        <BecomeCard id="model3d" t={t} busy={busy === 'model3d'} disabled={busy !== null} onClick={() => go('model3d')} />
      </div>
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
 * trap. How often it may come is `lib/ideas.ts`.
 */
export function BecomeNudge({ ids, t, onPick, onClose, onNotNow }: {
  readonly ids: readonly BecomeId[];
  readonly t: Say;
  readonly onPick: (id: BecomeId) => void;
  /** Gone by itself, after nine seconds. */
  readonly onClose: () => void;
  /** Shut with the cross: counted, so it rests if it keeps being shut. */
  readonly onNotNow: () => void;
}): React.ReactElement {
  /* The room draws itself again many times a second while a photo is
     moved, each time with a new `onClose`: the clock is started once. */
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const gone = window.setTimeout(() => close.current(), 9000);
    return () => window.clearTimeout(gone);
  }, [ids]);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-4" data-becomenudge>
      {ids.map((id) => {
        const Icon = ICONS[id];
        return (
          <div key={id} className="fb-nudge pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-emerald-400/60 bg-zinc-950/90 pl-1 pr-1 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
            <button type="button" data-becomenudgego={id} onClick={() => onPick(id)} className="inline-flex min-h-[40px] min-w-0 items-center gap-2 rounded-full px-3 text-xs font-bold text-emerald-100">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(BECOMES[id].ask[0], BECOMES[id].ask[1])}</span>
              <span className="shrink-0 text-emerald-300/80">· {creditsSaid(BECOMES[id].credits, t)}</span>
            </button>
            <button type="button" onClick={onNotNow} aria-label={t('become.nudgeShut', 'Not now')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The bigger ask: a card with the picture on it, a heading, one line of
 * why, each offer with its price, and "Not now". Shown after something was
 * saved or kept, when a small chip over the photo would be out of sight.
 * The words and the offers are `IDEAS` in `lib/ideas.ts`.
 */
export function IdeaPrompt({ moment, thumb, t, onPick, onNotNow, onClose, floating = false }: {
  readonly moment: IdeaMoment;
  /** The picture it is about, shown small on the card. */
  readonly thumb: string | null;
  readonly t: Say;
  readonly onPick: (id: BecomeId) => void;
  readonly onNotNow: () => void;
  /** Gone by itself after fifteen seconds; only a floating card goes by itself. */
  readonly onClose: () => void;
  /** Over the page at the bottom, rather than in its place on the page. */
  readonly floating?: boolean;
}): React.ReactElement {
  const idea = IDEAS[moment];
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    if (!floating) return undefined;
    const gone = window.setTimeout(() => close.current(), 15000);
    return () => window.clearTimeout(gone);
  }, [floating, moment]);
  const card = (
    <div
      role="dialog"
      aria-label={t(idea.head[0], idea.head[1])}
      data-idea={moment}
      className="fb-idea pointer-events-auto w-full max-w-sm rounded-2xl border border-emerald-400/50 bg-zinc-950/95 p-3 shadow-[0_0_36px_rgba(52,211,153,0.28)] backdrop-blur"
    >
      <div className="flex items-start gap-3">
        {thumb ? (
          <span aria-hidden className="h-14 w-14 shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 bg-cover bg-center" style={{ backgroundImage: `url(${thumb})` }} />
        ) : (
          <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300"><Sparkles className="h-6 w-6" /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-100">{t(idea.head[0], idea.head[1])}</p>
          <p className="mt-0.5 text-xs leading-snug text-zinc-400">{t(idea.why[0], idea.why[1])}</p>
        </div>
        <button type="button" onClick={onNotNow} aria-label={t('become.nudgeShut', 'Not now')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {idea.offers.map((id) => {
          const Icon = ICONS[id];
          return (
            <button
              key={id}
              type="button"
              data-ideago={id}
              onClick={() => onPick(id)}
              className="flex min-h-[48px] w-full items-center gap-2.5 rounded-xl bg-emerald-500 px-3 text-left text-sm font-bold text-black"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{t(BECOMES[id].ask[0], BECOMES[id].ask[1])}</span>
              <span className="shrink-0 rounded-full bg-black/15 px-2 py-0.5 text-[11px]">{creditsSaid(BECOMES[id].credits, t)}</span>
            </button>
          );
        })}
        <button type="button" onClick={onNotNow} data-ideanot className="min-h-[40px] w-full rounded-xl text-xs font-bold text-zinc-400">
          {t('become.nudgeShut', 'Not now')}
        </button>
      </div>
    </div>
  );
  if (!floating) return card;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4" style={{ bottom: aboveBar() }}>
      {card}
    </div>
  );
}

/* ── Wake it up, anywhere a picture is ───────────────────────────────── */

/**
 * The same Wake it up as the bench, for a picture outside the Photo Editor:
 * a song's cover. The picture is fetched by its address, made small, and
 * sent; the two yeses are the same two, kept on the same key.
 */
export function WakeSheet({ src, t, onClose }: {
  readonly src: string;
  readonly t: Say;
  readonly onClose: () => void;
}): React.ReactElement {
  const [yes, giveYes] = useEngineYes();
  const [asking, setAsking] = useState(!yes);
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [video, setVideo] = useState<string | null>(null);
  useEffect(() => () => { if (video) URL.revokeObjectURL(video); }, [video]);

  const wake = async (): Promise<void> => {
    setBusy(true);
    setSaid(t('become.waking', 'Waking it up. This takes about a minute.'));
    try {
      const picture = await loadPicture(src).catch(() => null);
      const sent = picture ? sendable(picture, BECOME_SIDE) : null;
      if (!sent) { setSaid(t('become.noPicture', 'This picture could not be read. Nothing was charged.')); return; }
      const got = await slowOne({ become: 'alive', picture: sent.data, words: words.trim() }, t);
      if (!got.file) { setSaid(got.said ?? ''); return; }
      setVideo(got.file);
      setSaid(t('become.awake', 'It is alive. Press play for the sound, and Keep it to save it.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-emerald-500/40 bg-zinc-950/95 p-3" data-wakesheet>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-zinc-100">{t(BECOMES.alive.name[0], BECOMES.alive.name[1])}</p>
        <button type="button" onClick={onClose} disabled={busy} aria-label={t('become.close', 'Close')} className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 disabled:opacity-40">
          <X className="h-4 w-4" />
        </button>
      </div>
      {asking ? (
        <YesSheet t={t} onNo={onClose} onYes={() => { giveYes(); setAsking(false); }} />
      ) : video ? (
        <div className="space-y-2" data-becomevideo>
          <video src={video} controls loop playsInline className="w-full rounded-2xl border border-zinc-700" />
          <a href={video} download="living-cover.mp4" className={VUL}>{t('become.keep', 'Keep it')}</a>
        </div>
      ) : (
        <>
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
          <BecomeCard id="alive" t={t} busy={busy} disabled={busy} onClick={() => void wake()} />
        </>
      )}
      {said && <p role="status" className="text-[13px] text-zinc-300" data-becomesaid>{said}</p>}
    </div>
  );
}
