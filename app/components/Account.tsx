'use client';

/**
 * Everything about the account, in the place people look for it.
 *
 * ── Why this had to exist ────────────────────────────────────────────────
 *
 * All of it was already built and none of it was findable. The plan, what it
 * costs and the cancel button were inside the Channel room, three presses in,
 * under the playlists — because that is where the panel happened to be added.
 * Nobody looking for "what am I paying and how do I stop" goes to a room
 * called Channel; they press their own name in the corner.
 *
 * That press did nothing. It set the studio's room to Make a song, which
 * changes nothing at all unless the studio is already open, so pressing your
 * own name was a dead control on every screen.
 *
 * So this is not new machinery. It is `Subscription`, the wallet and the plan
 * table brought together behind the press people were already making.
 *
 * ── What is deliberately not here ────────────────────────────────────────
 *
 * The question box and the answering copilot. Both are on Help, which is one
 * press away and is where somebody looks for them; a second copy here would be
 * a second thing to keep true. Deleting the account stays on the channel, for
 * a harder reason: a destructive, irreversible control in two places is one
 * place too many, and the one it is in already explains what goes with it.
 * Both are linked rather than copied.
 */

import React, { useEffect, useState } from 'react';
import NoticeSettings from './NoticeSettings';
import {
  X, CreditCard, Sparkles, LifeBuoy, ArrowRight, Mail, ListMusic, Brain, Loader2, BookOpen, Paintbrush, Mic, User, CheckCircle2,
} from 'lucide-react';
import { loadTracks } from '../lib/library';
import { loadMakes } from '../lib/makes';
import RecordingName from './RecordingName';
import Connections from './Connections';
import DeleteAccount from './DeleteAccount';
import OwnerCubed from './OwnerCubed';
import OwnerReports from './OwnerReports';
import type { Creator } from '../lib/radar';
import { useLang } from '../lib/i18n';
import { priceShown, usePlayPrices } from '../lib/playbilling';
import { planLineKey } from '../lib/playproducts';
import { TIER_SPECS, tierPrice, type Tier } from '../lib/plans';
import type { Region } from '../lib/pricing';
import { loadWallet, NO_WALLET, type Wallet } from '../lib/wallet';
import { loadTaste, forgetTaste, NO_TASTE, type Taste } from '../lib/taste';
import Subscription from './Subscription';
import Authenticators from './Authenticators';
import Note from './Note';
import { buildLine } from '../lib/whichbuild';
import { PHOTO } from '../lib/photolook';
import {
  PROFILE_BACKDROP, PROFILE_BACKDROP_PLACE, PROFILE_BACKDROP_SIZE, PROFILE_CARD, PROFILE_GLASS, voiceWave,
} from '../lib/profilelook';
import { accessToken } from '../lib/cloud';
import { loadSpace, sizeOf, type Space } from '../lib/space';

export default function Account({
  open,
  onClose,
  email,
  name,
  handle,
  plan,
  region,
  onSeePlans,
  onGoToChannel,
  onNamed,
  onSignOut,
  onAppearance,
  onGoToVoices,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Leaving, from the screen a person comes to for account things. */
  readonly onSignOut: () => void;
  readonly email?: string;
  readonly name?: string;
  readonly handle?: string;
  readonly plan: Tier;
  readonly region: Region;
  readonly onSeePlans: () => void;
  readonly onGoToChannel: () => void;
  /** The saved row, so the app above can redraw the name it is showing. */
  readonly onNamed?: (creator: Creator) => void;
  /** Open the Theme / Style customizer. */
  readonly onAppearance?: () => void;
  /** The Voice cloning room, where cloned voices are made and kept. */
  readonly onGoToVoices?: () => void;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  /* Play's own prices and credits in the Play app (`lib/playbilling.ts`). */
  const playShop = usePlayPrices();
  const [wallet, setWallet] = useState<Wallet>(NO_WALLET);
  /** Null until the first answer, so a real balance never flashes as zero. */
  const [asked, setAsked] = useState(false);
  const [taste, setTaste] = useState<Taste>(NO_TASTE);
  const [forgetting, setForgetting] = useState(false);
  /** What is on this device, counted for the vault card: songs, and videos from any room. */
  const [made, setMade] = useState({ songs: 0, videos: 0, lastSong: '', lastVideo: '' });
  /** Her cloned voices, as `/api/voice` lists them for this account. */
  const [voices, setVoices] = useState<{ mine: { id: string; name: string }[]; room: number } | null>(null);
  /** On a phone the four columns are tabs, as the headings in her picture are. */
  const [column, setColumn] = useState<'made' | 'voices' | 'links' | 'store'>('made');
  useEffect(() => {
    if (!open) return;
    let live = true;
    void accessToken().then((token) =>
      fetch('/api/voice', { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        .then((r) => (r.ok ? r.json() : null))
        .then((said: { mine?: { id: string; name: string }[]; caps?: { voices?: number } } | null) => {
          if (live && said) setVoices({ mine: said.mine ?? [], room: said.caps?.voices ?? 0 });
        })
        .catch(() => undefined),
    );
    return () => { live = false; };
  }, [open]);
  /**
   * What this browser holds for the app, as the browser itself counts it.
   *
   * Google's page had a storage gauge in gigabytes of cloud. Nothing here
   * measures a cloud, but the browser does measure what it keeps on the
   * device — songs, clips, projects — and that is a real number.
   */
  const [store, setStore] = useState<{ used: number; quota: number } | null>(null);
  /**
   * And what this member keeps in the cloud, against what the plan holds —
   * The owner, 16 October 2026: 1 GB on Free, 10 on Maker, 50 on Studio, 200 on
   * Label. Counted by the database (`supabase/berging.sql`), so it is the
   * same number the limit itself is held to.
   */
  const [space, setSpace] = useState<Space | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadSpace().then((got) => { if (live) setSpace(got); });
    return () => { live = false; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    const ask = typeof navigator !== 'undefined' ? navigator.storage?.estimate?.() : undefined;
    if (!ask) return undefined;
    void ask.then((got) => {
      if (live && got && typeof got.usage === 'number' && typeof got.quota === 'number') {
        setStore({ used: got.usage, quota: got.quota });
      }
    }).catch(() => undefined);
    return () => { live = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadWallet().then((got) => {
      if (!live) return;
      setWallet(got);
      setAsked(true);
    });
    void loadTaste().then((got) => {
      if (live) setTaste(got);
    });
    setMade({
      songs: loadTracks().length,
      videos: loadMakes().filter((one) => one.kind === 'video' || one.kind === 'clip').length,
      lastSong: loadTracks()[0]?.title ?? '',
      lastVideo: loadMakes().find((one) => one.kind === 'video' || one.kind === 'clip')?.title ?? '',
    });
    return () => {
      live = false;
    };
  }, [open]);

  // Escape closes it, like every other overlay in this app.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const spec = TIER_SPECS[plan];
  const price = { display: priceShown(playShop.prices, { kind: 'plan', tier: plan }, tierPrice(plan, region).display) };
  const pct = wallet.monthly > 0 ? Math.max(0, Math.min(100, Math.round((wallet.balance / wallet.monthly) * 100))) : 0;
  const spaceShare = space?.ready && space.cap ? Math.min(100, Math.round(((space.used ?? 0) / space.cap) * 100)) : 0;
  const gig = (bytes: number): string => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);
  const panel: React.CSSProperties = PROFILE_GLASS;
  const well: React.CSSProperties = { background: PHOTO.surfaceLight, border: `1px solid ${PHOTO.edge}` };
  const chip: React.CSSProperties = { background: PHOTO.chip, border: `1px solid ${PHOTO.edge}` };
  /* The plan's lines, in Google's three columns rather than one list. */
  const lines = spec.includes.map((one, i) => t(planLineKey(spec.id, i, playShop.play), one));
  const per = Math.max(1, Math.ceil(lines.length / 3));
  const columns = [
    { icon: '🎵', says: t('account.planCol1', 'Credits & feed'), rows: lines.slice(0, per) },
    { icon: '🎙️', says: t('account.planCol2', 'Studio & booth'), rows: lines.slice(per, per * 2) },
    { icon: '🎬', says: t('account.planCol3', 'Video, art & extras'), rows: lines.slice(per * 2) },
  ].filter((one) => one.rows.length > 0);
  const linkRow = 'min-h-[44px] rounded-xl px-4 py-3 flex items-center gap-3 text-left text-zinc-300 hover:text-white';

  /* ── Google's profile page, 13 October 2026 ──────────────────────────
     The owner: *"Die You gedeelte van my eie profile lyk ook nie soos ek vir
     jou gegee het nie."* It had the page's banner and wallet in the app's
     own grey sheet, and the rest of the page was not there. Now it is the
     page: the obsidian floor, a control bar with the credits and a refill
     on it, the banner with the wallet gauge beside it, four modules in a
     row, and the plan as a matrix under them. The page's API-keys module is
     not here — a key never goes on a screen — and in its place is the one
     thing a profile is actually for: where else you are. */
  return (
    <div
      data-accountroom
      className="fixed inset-0 z-[60] overflow-y-auto pb-24"
      style={{ backgroundColor: PHOTO.floor, backgroundImage: PROFILE_BACKDROP, backgroundSize: PROFILE_BACKDROP_SIZE, backgroundPosition: PROFILE_BACKDROP_PLACE, backgroundAttachment: 'fixed', color: PHOTO.ink }}
      role="dialog"
      aria-modal="true"
      aria-label={t('account.title', 'Your account')}
      data-accountsheet
    >
      {/* ── The bar across the top, as her picture has it ───────────── */}
      <header
        /* `pr-[72px]`: the app's search button is fixed in the top-right
           corner over every screen, and the close button sat under it where
           no press could reach it — `audit/backbutton.mjs` pressed for thirty
           seconds and hit the search. */
        className="sticky top-0 z-10 flex items-center gap-3 py-3 pl-4 pr-[72px] backdrop-blur-md lg:pl-8"
        style={{ background: 'rgba(3,8,7,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: PHOTO.accent, color: PHOTO.floor }} aria-hidden>
            <User className="h-4 w-4" />
          </span>
          FutureBox <span style={{ color: PHOTO.accent }}>Pro</span>
        </span>
        <span className="ml-auto hidden items-center gap-2 text-sm text-zinc-300 sm:flex">
          <User className="h-4 w-4" /> {t('account.creatorAccount', 'Creator account')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('account.close', 'Close')}
          className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-300 hover:text-white sm:ml-0"
          style={PROFILE_CARD}
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 lg:p-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{t('account.pageTitle', 'My profile & creator account')}</h1>

        {/* The owner's Cubed³ desk. Renders nothing for anybody else. */}
        <OwnerCubed />
        {/* The owner's open reports, with a takedown. Nothing for anybody else. */}
        <OwnerReports />

        {/* ── The banner: who, and the wallet with its refill ──────────── */}
        <div className="rounded-2xl p-5" style={PROFILE_GLASS} data-accountbanner>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-24 w-24 rounded-full bg-linear-to-tr from-emerald-400 via-cyan-400 to-violet-500 p-1 shadow-xl">
                  <div className="flex h-full w-full items-center justify-center rounded-full text-4xl font-black text-white" style={{ background: PHOTO.floor }}>
                    {(name ?? email ?? '?').charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full" style={{ background: PHOTO.accent, border: `3px solid ${PHOTO.floor}` }} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="truncate text-2xl font-bold text-white sm:text-3xl">{name || t('account.title', 'Your account')}</p>
                  <span className="rounded-full px-3 py-0.5 text-sm font-semibold" style={{ background: PHOTO.accentWash, border: `1px solid ${PHOTO.accent}`, color: PHOTO.accent }}>
                    {spec.name}{plan !== 'free' && ` · ${price.display}/${t('account.mo', 'mo')}`}
                  </span>
                </div>
                {handle && <p className="mt-1 truncate font-mono text-sm text-zinc-400">{handle}</p>}
                <p className="mt-1.5 flex items-center gap-2 truncate text-sm text-zinc-300">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{email || '—'}</span>
                </p>
              </div>
            </div>
            {/* ── What is left in the wallet ─────────────────────────────── */}
            <section className="flex shrink-0 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center lg:w-[480px]" style={PROFILE_CARD} data-accountwallet>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm text-zinc-300">
                  <CreditCard className="h-4 w-4" style={{ color: PHOTO.accent }} />
                  {t('account.walletTitle', 'Credit wallet')}
                </p>
                {/* Held blank until the answer arrives, and the three ways
                    there is no number are three different sentences. */}
                {!asked ? (
                  <p className="text-2xl font-bold text-white">&nbsp;</p>
                ) : wallet.failed ? (
                  <p className="text-sm leading-snug text-amber-400">
                    {t('account.creditsUnreachable', 'Your balance could not be fetched just now. Nothing has been spent — try again in a moment.')}
                  </p>
                ) : !wallet.metered ? (
                  <Note>{t('account.creditsOff', 'This app has no accounts set up, so nothing is counted.')}</Note>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {wallet.balance} <span className="text-base font-medium">{t('account.creditsAvailable', 'credits available')}</span>
                    </p>
                    {wallet.monthly > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PHOTO.accent }} />
                        </div>
                        <span className="text-xs text-zinc-300 tabular-nums">{pct}%</span>
                      </div>
                    )}
                    {wallet.monthly > 0 && (
                      <p className="mt-1 text-xs text-zinc-400 tabular-nums">{wallet.monthly} {t('account.creditsMonthly', 'a month on this plan')}</p>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onSeePlans(); }}
                className="min-h-[48px] shrink-0 rounded-full px-6 text-sm font-semibold"
                style={{ border: `2px solid ${PHOTO.accent}`, color: PHOTO.accent, background: PHOTO.accentWash }}
              >
                {t('account.refill', 'Quick refill')}
              </button>
            </section>
          </div>
          <Note>{t(
            'account.creditsNote',
            'What a generation costs is said on the button before you press it. Credits from your plan land each month; anything you buy on top does not expire.',
          )}</Note>
        </div>

        {/* ── One glass panel, four columns ───────────────────────────────
            Her picture: four headings across the top of one panel, the first
            underlined in green, a thin line between the columns. On a phone
            the headings are tabs and one column shows at a time; at a desk
            all four stand side by side. Google's "API & integration keys"
            column is "Connections" here — a key never goes on a screen — and
            its gigabytes of cloud are what this browser really stores. */}
        <div className="rounded-3xl p-4 sm:p-5" style={PROFILE_GLASS}>
          {/* Rounded, as she asked on 15 October 2026 — "Daai blokke by You
              moet beter lyk en meer rounded." They were four square blocks
              with a line under the chosen one; now one soft tray of pills,
              the chosen one lit. */}
          <div
            className="mb-4 grid grid-cols-2 gap-1.5 rounded-3xl p-1.5 sm:grid-cols-4"
            style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.08)' }}
            role="tablist"
          >
            {([
              { id: 'made' as const, says: t('account.vault', 'My productions') },
              { id: 'voices' as const, says: t('account.voicesModule', 'Cloned voice models') },
              { id: 'links' as const, says: t('account.connectionsModule', 'Connections') },
              { id: 'store' as const, says: t('account.storageTab', 'Storage') },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-accounttab={tab.id}
                aria-selected={column === tab.id}
                onClick={() => setColumn(tab.id)}
                className="flex min-h-[52px] items-center justify-center rounded-2xl px-3 py-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide transition-colors sm:text-xs"
                style={column === tab.id
                  ? {
                    background: PHOTO.accentWash,
                    color: PHOTO.accent,
                    boxShadow: `inset 0 0 0 1px ${PHOTO.accent}, 0 0 18px rgba(16,185,129,0.22)`,
                  }
                  : { background: 'transparent', color: 'rgba(226,232,240,0.72)' }}
              >
                {tab.says}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
            {/* My productions */}
            <section className={`space-y-3 lg:block lg:pr-4 ${column === 'made' ? 'block' : 'hidden'}`} data-accountvault>
              <div className="rounded-2xl p-4" style={PROFILE_CARD}>
                <p className="text-sm text-zinc-300">{t('account.songs', 'Songs')}</p>
                <p className="text-xl font-bold text-white">{made.songs} {t('account.tracks', 'tracks')}</p>
                {made.lastSong && <p className="truncate text-xs text-zinc-400">{t('account.recent', 'Recent')}: {made.lastSong}</p>}
              </div>
              <div className="rounded-2xl p-4" style={PROFILE_CARD}>
                <p className="text-sm text-zinc-300">{t('account.videos', 'Videos and clips')}</p>
                <p className="text-xl font-bold text-white">{made.videos} {t('account.clips', 'clips')}</p>
                {made.lastVideo && <p className="truncate text-xs text-zinc-400">{t('account.recent', 'Recent')}: {made.lastVideo}</p>}
              </div>
              <div className="rounded-2xl p-4" style={PROFILE_CARD}>
                <p className="text-sm text-zinc-300">{t('account.voiceModels', 'Voice models')}</p>
                <p className="text-xl font-bold text-white">{voices ? voices.mine.length : '–'} {t('account.models', 'models')}</p>
                {voices && voices.mine[0] && <p className="truncate text-xs text-zinc-400">{t('account.latest', 'Latest')}: {voices.mine[0].name}</p>}
              </div>
              <p className="text-[11px] text-zinc-500">{t('account.vaultNote', 'Counted on this device. The channel holds them.')}</p>
              <button
                type="button"
                onClick={() => { onClose(); onGoToChannel(); }}
                className="min-h-[48px] w-full rounded-full text-xs font-bold text-zinc-200 hover:text-white"
                style={PROFILE_CARD}
              >
                {t('account.viewVault', 'View the vault →')}
              </button>
            </section>

            {/* Cloned voices */}
            <section className={`space-y-3 lg:block lg:px-4 ${column === 'voices' ? 'block' : 'hidden'}`} data-accountvoices>
              {voices === null ? (
                <p className="flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('account.voicesAsking', 'Asking for your voices…')}</p>
              ) : voices.mine.length === 0 ? (
                <div className="rounded-2xl p-4" style={PROFILE_CARD}>
                  <p className="text-sm font-semibold text-white">{t('account.voicesNone', 'No cloned voices yet')}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {voices.room > 0
                      ? t('account.voicesRoom', 'Your plan keeps up to {n}. Clone yours once in the Voice cloning room and use it everywhere.').replace('{n}', String(voices.room))
                      : t('account.voicesPlan', 'Cloning a voice comes with a paid plan.')}
                  </p>
                </div>
              ) : (
                voices.mine.map((one) => (
                  <div key={one.id} className="rounded-2xl p-4" style={PROFILE_CARD}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-bold text-white">{one.name}</p>
                      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: PHOTO.accent }} />
                    </div>
                    <p className="text-xs" style={{ color: PHOTO.accent }}>{t('account.voiceReady', 'Trained and ready')}</p>
                    <svg viewBox="0 0 200 32" className="my-2 h-8 w-full" aria-hidden>
                      <polyline points={voiceWave(one.name)} fill="none" stroke={PHOTO.accent} strokeWidth="1.6" />
                    </svg>
                  </div>
                ))
              )}
              {onGoToVoices && (
                <button
                  type="button"
                  onClick={() => { onClose(); onGoToVoices(); }}
                  className="min-h-[48px] w-full rounded-full text-xs font-semibold"
                  style={{ border: `1px solid ${PHOTO.accent}`, color: PHOTO.accent, background: PHOTO.accentWash }}
                >
                  <Mic className="mr-1 inline h-3.5 w-3.5" />
                  {t('account.goVoices', 'Manage in Voice cloning')}
                </button>
              )}
            </section>

            {/* Connections: the name your work goes out under, and where else
                you are — "binne iemand se profile moet al die connection
                buttons wees." */}
            <section className={`space-y-3 lg:block lg:px-4 ${column === 'links' ? 'block' : 'hidden'}`} data-accountconnections>
              <RecordingName onSaved={(row) => onNamed?.(row)} compact />
              <Connections />
            </section>

            {/* Storage: the plan's cloud space first, then this device */}
            <section className={`space-y-3 lg:block lg:pl-4 ${column === 'store' ? 'block' : 'hidden'}`} data-accountstorage>
              {space?.metered && space.signedIn && typeof space.cap === 'number' && (
                <div className="rounded-2xl p-4" style={PROFILE_CARD} data-accountspace={!space.ready ? 'uncounted' : space.full ? 'full' : 'room'}>
                  <p className="mb-1 text-xs font-bold text-zinc-300">{t('account.spaceTitle', 'Cloud space on your plan')}</p>
                  {space.ready ? (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-lg font-bold text-white">{sizeOf(space.used ?? 0)} <span className="text-xs font-normal text-zinc-400">{t('account.storageOf', 'of')} {sizeOf(space.cap)}</span></p>
                        <span className="text-xs text-zinc-400">{spaceShare}% {t('account.storageUsed', 'used')}</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(1, spaceShare)}%`, background: space.full ? PHOTO.gold : PHOTO.accent }} />
                      </div>
                      {space.full && (
                        <p className="mt-2 text-sm font-semibold leading-snug text-amber-400" data-accountspacefull>
                          {t('account.spaceFull', 'Full. Nothing new is kept in the cloud until you delete something you no longer keep, or move to a bigger plan.')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-lg font-bold text-white">{sizeOf(space.cap)} <span className="text-xs font-normal text-zinc-400">{t('account.spaceOnPlan', 'on this plan')}</span></p>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-500">{t('account.spaceNote', 'Songs, films, recordings and pictures you keep in your account.')}</p>
                </div>
              )}
              <div className="rounded-2xl p-4" style={PROFILE_CARD}>
                <p className="mb-1 text-xs font-bold text-zinc-300">{t('account.storageModule', 'Storage on this device')}</p>
                {store ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-lg font-bold text-white">{gig(store.used)} <span className="text-xs font-normal text-zinc-400">{t('account.storageOf', 'of')} {gig(store.quota)}</span></p>
                      <span className="text-xs text-zinc-400">{store.quota > 0 ? Math.round((store.used / store.quota) * 100) : 0}% {t('account.storageUsed', 'used')}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                      <div className="h-full rounded-full" style={{ width: `${store.quota > 0 ? Math.max(1, Math.min(100, Math.round((store.used / store.quota) * 100))) : 0}%`, background: PHOTO.accent }} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-400">{t('account.storageNone', 'This browser does not say how much it holds.')}</p>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">{t('account.storageNote', 'What this browser keeps for the app — songs, clips and projects — counted by the browser itself.')}</p>
              <button
                type="button"
                onClick={() => { onClose(); onGoToChannel(); }}
                className="min-h-[48px] w-full rounded-full text-xs font-semibold"
                style={{ border: `1px solid ${PHOTO.accent}`, color: PHOTO.accent, background: PHOTO.accentWash }}
              >
                {t('account.channel', 'Your channel and your picture')}
              </button>
            </section>
          </div>
        </div>

        {/* ── The plan, as a matrix ───────────────────────────────────── */}
        <section className="rounded-2xl p-6" style={panel} data-accountplan>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: PHOTO.edge }}>
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-base font-extrabold text-white">
                <Sparkles className="h-4 w-4" style={{ color: PHOTO.accent }} />
                <span>{t('account.plan', 'Your plan')}:</span>
                <span className="font-mono" style={{ color: PHOTO.accent }}>
                  {spec.name}{plan !== 'free' && ` · ${price.display} ${t('account.aMonth', 'a month')}`}
                </span>
              </h2>
              {/* Same dictionary keys as the sales page, so the plan somebody
                  bought is described in the words they bought it in. */}
              <p className="mt-0.5 text-xs text-zinc-400">{t(`plan.${spec.id}.who`, spec.who)}</p>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); onSeePlans(); }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold text-zinc-300 hover:text-white"
              style={chip}
            >
              {plan === 'free'
                ? t('account.seePlans', 'See the plans')
                : t('account.changePlan', 'Change your plan')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Every line, not the first four — the last line of each plan is
              the album art she asked for by name, and a list that silently
              drops its tail is worse than a short one. */}
          <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed text-zinc-300 md:grid-cols-2 lg:grid-cols-3">
            {columns.map((column) => (
              <div key={column.says} className="rounded-2xl p-4" style={well}>
                <strong className="mb-1 block" style={{ color: PHOTO.accent }}>{column.icon} {column.says}</strong>
                <ul className="space-y-1 text-[11px] text-zinc-400">
                  {column.rows.map((row) => (
                    <li key={row} className="flex items-start gap-2">
                      <span className="mt-0.5" style={{ color: PHOTO.accent }}>·</span>
                      <span>{row}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── The subscription itself, a second lock, and what is noticed ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl p-5" style={panel}><Subscription /></div>
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={panel}><Authenticators /></div>
            {taste.ready && (
              <section className="space-y-3 rounded-2xl p-5" style={panel}>
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <Brain className="h-4 w-4" style={{ color: PHOTO.accent }} />
                  {t('account.taste', 'What the app has noticed')}
                </p>
                {taste.lines.length === 0 ? (
                  <Note>{t('account.tasteNone', 'Nothing yet. Make a few things and it will start suggesting the kind you actually make.')}</Note>
                ) : (
                  <ul className="space-y-1 text-sm text-zinc-400">
                    {taste.lines.slice(0, 8).map((one) => (
                      <li key={`${one.kind}:${one.label}`} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {one.label}
                          <span className="text-zinc-600">
                            {' '}
                            · {one.kind === 'genre'
                              ? t('account.tasteGenre', 'what you make')
                              : t('account.tasteRoom', 'where you work')}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-zinc-500">{one.times}×</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Note className="text-xs leading-relaxed text-zinc-500">{t(
                  'account.tasteNote',
                  'A count of each kind and when it last happened — not a record of when you work. It is what lets the welcome screen and the copilot suggest the kind of thing you actually make.',
                )}</Note>
                {taste.lines.length > 0 && (
                  <button
                    type="button"
                    disabled={forgetting}
                    onClick={() => {
                      setForgetting(true);
                      void forgetTaste().then((done) => {
                        setForgetting(false);
                        if (done) setTaste({ lines: [], ready: true });
                      });
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
                    style={chip}
                  >
                    {forgetting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('account.tasteForget', 'Clear this and start again')}
                  </button>
                )}
              </section>
            )}
          </div>
        </div>

        {/* ── Which pop-ups she gets (20 October 2026). ─────────────────── */}
        <NoticeSettings />

        {/* ── Where the other things live ─────────────────────────────── */}
        <section className="grid grid-cols-1 gap-2 rounded-2xl p-5 md:grid-cols-2" style={panel}>
          <a href="/guide" className={linkRow} style={chip}>
            <BookOpen className="h-4 w-4 shrink-0" style={{ color: PHOTO.accent }} />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{t('account.guide', 'What every room does, and what it costs')}</span>
              <span className="block text-xs leading-snug text-zinc-500">{t('account.guideNote', 'One page for the whole studio: the rooms, the prices, the words.')}</span>
            </span>
          </a>
          <a href="/help" className={linkRow} style={chip}>
            <LifeBuoy className="h-4 w-4 shrink-0" style={{ color: PHOTO.accent }} />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{t('account.help', 'A question, or a problem')}</span>
              <span className="block text-xs leading-snug text-zinc-500">{t('account.helpNote', 'Ask about the app, your plan or a charge and get an answer here — or write to a person.')}</span>
            </span>
          </a>
          <button type="button" onClick={() => { onClose(); onGoToChannel(); }} className={`w-full ${linkRow}`} style={chip}>
            <ListMusic className="h-4 w-4 shrink-0" style={{ color: PHOTO.accent }} />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{t('account.channel', 'Your channel and your picture')}</span>
              <span className="block text-xs leading-snug text-zinc-500">{t('account.channelNote', 'Your songs, your playlists, your profile picture.')}</span>
            </span>
          </button>
          {onAppearance && (
            <button type="button" onClick={() => { onClose(); onAppearance(); }} className={`w-full ${linkRow}`} style={chip}>
              <Paintbrush className="h-4 w-4 shrink-0" style={{ color: PHOTO.accent }} />
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{t('account.appearance', 'App appearance, style and colors')}</span>
                <span className="block text-xs leading-snug text-zinc-500">{t('account.appearanceNote', 'Customize primary colors, accents, dark surfaces, fonts and layout.')}</span>
              </span>
            </button>
          )}
          {/* The two rooms off the rail, reachable from the grown-up's screen:
              an allowance is a grown-up's decision and so is handing over the
              phone. `check:bereikbaar` holds every page to having a way in. */}
          <a href="/story" data-accountstory className={linkRow} style={chip}>
            <BookOpen className="h-4 w-4 shrink-0" style={{ color: PHOTO.accent }} />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{t('account.story', 'Story mode')}</span>
              <span className="block text-xs leading-snug text-zinc-500">{t('account.storyNote', 'A story you write or say — or the story helper writes with you — drawn a page at a time, read aloud, and kept on the shelf.')}</span>
            </span>
          </a>
        </section>

        {/* ── Signing out, above deleting: the two buttons nobody wants to
            press by accident, the gentler one not the harder to find. ── */}
        <section className="space-y-3 rounded-2xl p-5" style={panel}>
          <button
            type="button"
            onClick={() => { onClose(); onSignOut(); }}
            className="min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold text-zinc-300 hover:text-white"
            style={chip}
          >
            {t('auth.signOut', 'Sign out')}
          </button>
          {email && <DeleteAccount email={email} />}
        </section>

        {/* Which build this phone is holding: seven characters and a date. */}
        <p data-build className="font-mono text-xs text-zinc-600">
          {t('account.build', 'Version')}: {buildLine()}
        </p>
        <p className="text-xs leading-relaxed text-zinc-600">
          {t('account.legal', 'The')}{' '}
          <a href="/terms" className="underline hover:text-zinc-400">{t('account.terms', 'terms')}</a>{' '}
          {t('account.and', 'and the')}{' '}
          <a href="/privacy" className="underline hover:text-zinc-400">{t('account.privacy', 'privacy notice')}</a>
          .
        </p>
      </div>
    </div>
  );
}
