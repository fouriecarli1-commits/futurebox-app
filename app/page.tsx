'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Cover from './components/Cover';
import { EVERY as ASKS_EVERY, asksWaiting } from './lib/asks';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, ListMusic, ArrowRight, Megaphone, AudioWaveform,
  Search as SearchIcon, Home,
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X,
  UploadCloud, FileVideo, Music, Headphones, Lightbulb, Code2, 
  Link as LinkIcon, AlertCircle, Layers, DollarSign, Clock, 
  BookOpen, Bookmark, GraduationCap, Mic, Disc3, ExternalLink, Globe,
  Crown, Lock, Zap, RefreshCw, Send, Mail, Check, Star, Loader2,
  ArrowLeft, User, LogIn, ChevronDown, SlidersHorizontal, 
  Copy, Video, Flame, Library, PlayCircle, Mic2, Pause, Heart,
  Share2, Repeat, Sliders, Smartphone, Monitor, Eye, Handshake, Trophy, Paintbrush, Clapperboard} from 'lucide-react';
import {
  TRACK_FLAVOURS,
} from './data/studio';
import { profileFromTracks } from './lib/matching';
import CollabRadar from './components/CollabRadar';
import CollabFinder from './components/CollabFinder';
import CollabRoom from './components/CollabRoom';
import Channel from './components/Channel';
import VoiceScreen from './components/VoiceScreen';
import SongSections from './components/SongSections';
import { guessRegion, priceFor, REGIONS, regionByCode, type Region } from './lib/pricing';
import ThemeStudio from './components/ThemeStudio';
import QualityRadar from './components/QualityRadar';
import MakeMusic from './components/MakeMusic';
import Hooks from './components/Hooks';
import MusicVideo from './components/MusicVideo';
import VideoCanvas from './components/VideoCanvas';
import Copilot, { type CopilotAction } from './components/Copilot';
import type { Canvas } from './components/MakeMusic';
import type { Track } from './lib/library';
import { probeAudio } from './lib/engines';
import Booth from './components/Booth';
import LiveChannel from './components/LiveChannel';
import Masterclasses from './components/Masterclasses';
import { Counters, Views, useBoard } from './components/Counters';
import Placement from './components/Placement';
import PodcastStudio from './components/PodcastStudio';
import { signal } from './lib/signal';
import { TRACK_LABELS } from './data/masterclasses';
import type { EventKind } from './lib/server/stats';
import Landing from './components/Landing';
import PasswordField from './components/PasswordField';
import Campaign from './components/Campaign';
import Greeting from './components/Greeting';
import Account from './components/Account';
import SignInWith from './components/SignInWith';
import { noteTaste, loadTaste } from './lib/taste';
import { habitOf } from './lib/habits';
import { loadTracks } from './lib/library';
import { loadMakes } from './lib/makes';
import SoundTrainer from './components/SoundTrainer';
import { CopilotBusContext, useCopilotBus } from './lib/copilotactions';
import { profileAddress } from './lib/brand';
import Search from './components/Search';
import {
  STAGES,
  SURFACES,
  SURFACE_IDS,
  resolveSurfaceId,
  standaloneSurfaces,
  surfacesInStage,
  type SurfaceId,
} from './lib/surfaces';
import Spotlight from './components/Spotlight';
import HereNow from './components/HereNow';
import LanguagePicker from './components/LanguagePicker';
import Balance from './components/Balance';
import OutOfCredits from './components/OutOfCredits';
import { PACKS } from './lib/credits';
import type { Short } from './lib/wallet';
import type { Pack } from './lib/credits';
import { useLang } from './lib/i18n';
import { applyTheme, loadTheme, saveTheme, DEFAULT_THEME, type Theme } from './lib/theme';
import { byArea, describe, DEFAULT_PAID, type Plan } from './lib/entitlements';
import * as cloud from './lib/cloud';
import { accessToken } from './lib/cloud';
import { TIER_SPECS, TIERS, SPONSORSHIP, sponsorshipPrice, tierPrice } from './lib/plans';
import { startCheckout, loadOwned } from './lib/purchases';

interface Blueprint {
  tag: string;
  title: string;
  desc: string;
  /**
   * What operators of this kind of business are reported to make, in US
   * dollars a month, as a range.
   *
   * Held as numbers rather than as a written string so it can be shown in the
   * reader's own currency — a rand figure is what a South African can judge —
   * and so the label can say what it is. It was "$10k - $50k / month" with
   * nothing beside it, which reads as a forecast this app is making. It is
   * not: it is a reported range, it is not verified here, and the card now
   * says so where the number is.
   */
  mrrUsd?: readonly [number, number];
  buildTime?: string;
  techStack: string[];
  opportunity: string;
  steps: string[];
  externalUrl: string;
  toolName: string;
  isPro?: boolean;
}

interface GenreSample {
  category: string;
  name: string;
  subgenre: string;
  bpm: string;
  key: string;
  audioUrl: string;
  promptSnippet: string;
  description: string;
}

export default function FutureBoxHome() {
  const { t, lang } = useLang();
  // Rooms register what the copilot may do in them; the panel below dispatches
  // into whichever one is open. See `lib/copilotactions.ts`.
  const copilotBus = useCopilotBus();

  /* Command-K, and Control-K for everybody else. Bound at the window rather
     than on an element so it works wherever the focus happens to be, and it
     stays out of the way of a text field's own use of the key. */
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((was) => !was);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [activeTab, setActiveTab] = useState<'all' | 'futurebox' | 'masterclasses' | 'creations' | 'radar'>('all');
  
  // User Authentication & Profile
  const [user, setUser] = useState<{ email: string; name: string; handle: string; followers: number } | null>(null);
  // The canvas the middle pane edits and the copilot writes to. It lives here
  // because two panes share it; neither owns it.
  const [canvas, setCanvas] = useState<Canvas>({ title: '', lyrics: '', style: '' });
  const [makeSignal, setMakeSignal] = useState(0);
  const [madeTrack, setMadeTrack] = useState<Track | null>(null);
  const [trackCount, setTrackCount] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [planBusy, setPlanBusy] = useState<string | null>(null);

  /**
   * The tier comes from the server, not from this page.
   *
   * The page keeps its own copy of the caps so it can dim a button before you
   * press it, but that copy has to agree with what the routes enforce. When it
   * did not, the page won — it refused before the request was ever sent, so a
   * server-side allowance like OWNER_EMAIL never got a chance to say yes.
   */
  useEffect(() => {
    let live = true;
    loadOwned().then((owned) => {
      if (live) setUserPlan(owned.tier);
    });
    return () => {
      live = false;
    };
  }, [user]);
  const [planNote, setPlanNote] = useState<string | null>(null);

  // Only the server knows whether a music key is set, so ask once.
  useEffect(() => {
    let live = true;
    probeAudio().then((ready) => {
      if (live) setEngineReady(ready);
    });
    return () => {
      live = false;
    };
  }, []);

  // Counted once per browser per day — by the database, not by this line.
  useEffect(() => {
    signal('visit');
  }, []);

  /** The totals shown at the top of each page. Null until they are read. */
  const board = useBoard();

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * What is left to spend, and the panel that opens when it runs out.
   *
   * `spent` is bumped by anything that costs, so the number in the header
   * follows without every screen having to know about the header. `short` is
   * set only from a route's own refusal — the panel never opens on a guess.
   */
  const [spent, setSpent] = useState(0);
  const [short, setShort] = useState<Short | null>(null);
  const [packs, setPacks] = useState<readonly Pack[]>(PACKS);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [userPlan, setUserPlan] = useState<Plan>('free');
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  /** Bumped when a request is sent, so the rooms above pick it up at once. */
  const [collabSignal, setCollabSignal] = useState(0);
  /**
   * Whether a payment can actually be started.
   *
   * The subtitle used to say "no payment provider is connected" whatever was
   * true, which was right for months and became a lie the day Paystack went
   * in — on the one screen where a person is deciding whether to trust us with
   * a card. Asked now, not assumed.
   */
  const [canCharge, setCanCharge] = useState<boolean | null>(null);
  useEffect(() => {
    if (!pricingModalOpen || canCharge !== null) return;
    fetch('/api/checkout')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCanCharge(Boolean(d?.available)))
      .catch(() => setCanCharge(false));
  }, [pricingModalOpen, canCharge]);
  // Resolved after mount: guessing during render would bake one country's
  // prices into the static HTML that everybody is served.
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  const [regionBasis, setRegionBasis] = useState('Working it out…');
  useEffect(() => {
    const guess = guessRegion();
    setRegion(guess.region);
    setRegionBasis(guess.basis);
  }, []);
  // The header and the locked cards advertise the cheapest paid tier, since
  // that is the smallest step someone is actually being asked to take.
  const entryPrice = tierPrice('maker', region);

  // Appearance. The saved theme is read after mount — reading localStorage
  // during render would disagree with the server-rendered HTML.
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [themeOpen, setThemeOpen] = useState(false);
  /* Storage is written when the theme *differs from the one that was loaded*,
     which is the only honest definition of somebody having changed it.

     This used to save on every run of the effect, mount included, so the
     current default was written to every visitor's browser whether or not they
     had ever opened the appearance panel — and from then on it was read back as
     a preference, which is why moving the default could not reach anybody who
     had been here before.

     A "first run" flag does not fix it. Effects are invoked twice in
     development, a ref survives that, and the second pass sails through the
     guard and saves. Comparing against what was loaded has no such hole: the
     loaded object is only ever replaced by the appearance panel handing back a
     new one. */
  const loadedTheme = useRef<Theme | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  useEffect(() => {
    const saved = loadTheme();
    loadedTheme.current = saved;
    setTheme(saved);
    applyTheme(saved);
    setThemeLoaded(true);
  }, []);
  useEffect(() => {
    // Until the load has landed in state, `theme` here is still the default
    // while `loadedTheme` is already the saved one. They differ, and the
    // difference means "the load has not propagated yet" rather than "somebody
    // changed it" — which is precisely how the default came to be written over
    // a real choice. The flag is state rather than a ref on purpose: a ref
    // survives the double invocation React does in development, and the second
    // pass walks straight through it.
    if (!themeLoaded) return;
    applyTheme(theme);
    if (theme !== loadedTheme.current) saveTheme(theme);
  }, [theme, themeLoaded]);

  /* The welcome letter, asked for once the account is genuinely signed in.

     Not on sign-up: with email confirmation on, `signUp` returns no session
     and the person comes back through a link later, so a letter sent at the
     form arrives before the account works. Asking here covers both paths.

     Fired and not awaited, and its answer is ignored. Sending a welcome must
     never be between somebody and the app they just signed into, and the route
     claims the send in the database so asking twice sends once. */
  const welcomed = useRef(false);
  /* The language read at send time, not at mount.

     `lang` starts as English and becomes Afrikaans only once the provider has
     read the stored choice, which happens in an effect after the first render.
     A closure that captured it would have captured 'en'. The letter is sent
     once and never again, so getting this wrong means an Afrikaans member is
     welcomed in English permanently — the exact thing this app is not for. */
  const langNow = useRef(lang);
  langNow.current = lang;
  const sayHello = useCallback(() => {
    if (welcomed.current) return;
    welcomed.current = true;
    void accessToken().then((token) => {
      if (!token) return;
      void fetch(`/api/welcome?lang=${langNow.current}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    });
  }, []);

  // With an account behind the app, a refresh should not sign you out and a
  // sign-out in another tab should not leave this one looking signed in.
  useEffect(() => {
    if (!cloud.configured()) return;
    let live = true;
    /* Read once, before anything else can consume it: a sign-in that went out
       to Google and came back is a page load, and a page load looks exactly
       like coming back to a tab. */
    const cameBack = cloud.justArrived();
    cloud.currentAccount().then((account) => {
      if (!live) return;
      if (account) {
        setUser({ ...account, followers: 1 });
        sayHello();
        if (cameBack) arrived();
        else restored();
      }
    });
    const stop = cloud.onAccountChange((account) => {
      setUser(account ? { ...account, followers: 1 } : null);
      if (account) {
        sayHello();
        /* Armed, never opened. This event fires on a token refresh and on a
           sign-in in another tab as readily as on one here, and it does not
           say which — so it is treated as the weakest of the three claims.
           The two that mean something call `arrived` themselves. */
        restored();
        return;
      }
      departed();
    });
    return () => {
      live = false;
      stop();
    };
  }, []);


  // Filter Dropdowns State
  const [podcasterDropdownOpen, setPodcasterDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedPodcasterFilter, setSelectedPodcasterFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Modals & Player State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  /* Asked while the studio is open, and only then: a count nobody can see is
     a request nobody needed to make. Slow on purpose — see `lib/asks.ts`. */
  useEffect(() => {
    if (!uploadModalOpen) return;
    let live = true;
    const ask = () => {
      void asksWaiting().then((n) => {
        if (live) setAsks(n);
      });
    };
    ask();
    const timer = window.setInterval(ask, ASKS_EVERY);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [uploadModalOpen]);

  const [selectedMedia, setSelectedMedia] = useState<{ 
    title: string; 
    embedUrl?: string; 
    externalUrl: string;
    type: 'youtube' | 'audio' | 'video'; 
    host?: string; 
    prompt?: string;
    isPro?: boolean;
    /**
     * What opening this counts as, for the counters on each page.
     *
     * Carried on the media itself rather than fired at each call site, because
     * the same thing is opened from two or three places — a thumbnail, a play
     * button, a link — and an event recorded at only some of them is a number
     * that is quietly wrong rather than obviously missing.
     */
    counts?: { kind: EventKind; category?: string; ref?: string };
  } | null>(null);

  /**
   * Opening something is what the counters count, and it is counted here —
   * once — rather than at each of the three places a thing can be opened from.
   */
  useEffect(() => {
    if (!selectedMedia?.counts) return;
    signal(selectedMedia.counts.kind, {
      category: selectedMedia.counts.category,
      ref: selectedMedia.counts.ref,
    });
  }, [selectedMedia]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  // Creator Studio Sub-Tabs & Soundboard
  const [handoff, setHandoff] = useState<{ title: string; lyrics: string; style: string } | null>(null);
  /**
   * The studio's screens.
   *
   * 'soundboard' and 'write' were removed rather than hidden: the soundboard is
   * a reference for writing a style line, so it belongs inside making a song
   * and is now the shelf there; and writing the words is what making a song
   * already is, so a second screen for it was the same job behind a second
   * button.
   */
  /* Typed from the registry rather than written out here. The hand-written union
     drifted every time a room was added, and each time the compiler caught it in
     three places at once — which is the compiler doing its job, and a list that
     needs the compiler to keep it honest should not be a list. */
  const [studioTab, setStudioTab] = useState<SurfaceId>('make');

  /* Where the copilot sits when the three panes stack.

     On a desktop it is the third column and this never comes up. On a
     phone the panes stack and the last one is the one nobody scrolls to:
     measured in the song room at 390 px, the copilot started 3,040 px
     down, past every field in the room.

     Only the song room lifts it. That is the room where you talk first
     and type second — everywhere else the working surface is the point
     and a chat panel above it is 352 px between you and the thing you
     came for. */
  const copilotFirst = studioTab === 'make';

  /* Every room, and how to draw it. Read by the rail on a desktop and by the
     phone's room menu, so a room cannot be named one thing in one and another
     in the other. */
  const ROOM_META: Record<SurfaceId, { label: string; hint: string; icon: typeof Sparkles }> = {
    make: { label: t('rail.make'), hint: t('rail.make.hint'), icon: Sparkles },
    studio: { label: t('rail.studio'), hint: t('rail.studio.hint'), icon: Sliders },
    booth: { label: t('rail.booth'), hint: t('rail.booth.hint'), icon: Mic },
    video: { label: t('rail.video'), hint: t('rail.video.hint'), icon: Video },
    canvas: { label: t('rail.canvas'), hint: t('rail.canvas.hint'), icon: Clapperboard },
    hooks_feed: { label: t('rail.hooks'), hint: t('rail.hooks.hint'), icon: Smartphone },
    channels: { label: t('rail.channel'), hint: t('rail.channel.hint'), icon: ListMusic },
    collab: { label: t('rail.collab'), hint: t('rail.collab.hint'), icon: Handshake },
    live: { label: t('rail.live'), hint: t('rail.live.hint'), icon: Radio },
    voice_studio: { label: t('rail.voice'), hint: t('rail.voice.hint'), icon: Mic2 },
    podcast: { label: t('rail.podcast'), hint: t('rail.podcast.hint'), icon: Radio },
    sound: { label: t('rail.sound'), hint: t('rail.sound.hint'), icon: AudioWaveform },
    campaign: { label: t('rail.campaign'), hint: t('rail.campaign.hint'), icon: Megaphone },
  };

  /* The phone's way between rooms.

     The rail is a sideways-scrolling row. Measured on a 390 px screen it was
     1,726 px wide: three rooms on screen and eleven off the right edge —
     the podcast, the live room and collab among them — with nothing to say
     they were there. They were reported as missing, which is a fair name for
     a room nobody can see. */
  const [roomsOpen, setRoomsOpen] = useState(false);
  /* The door, shown once per page load rather than on every tab switch.

     The studio used to open straight onto Make a song with thirteen rooms
     down the side, which is fine for somebody who was here yesterday and a
     wall of choices addressed to nobody for somebody who has just signed up.
     `Greeting` is one screen with their name on it and one thing worth doing
     next; see the note at the top of that file.

     It starts closed and opens when an account is known, so a visitor with no
     account — and an app with no Supabase project behind it — lands where it
     always did instead of on a greeting with nobody to greet. */
  const [atDoor, setAtDoor] = useState(false);
  /* The account screen, behind the press people were already making. */
  const [accountOpen, setAccountOpen] = useState(false);

  /**
   * What they keep coming back to, for the copilot to answer in their terms.
   *
   * The same `habitOf` the welcome screen uses, so the copilot cannot be handed
   * a claim the greeting would refuse to make — one song is not a preference in
   * either place, and it would be worse to have two thresholds than to have
   * none.
   */
  const [taste, setTaste] = useState<{ genre?: string; room?: string }>({});
  useEffect(() => {
    let live = true;
    void loadTaste().then((got) => {
      if (!live) return;
      const habit = habitOf(loadTracks(), loadMakes(), '', got.lines);
      setTaste({
        ...(habit.genre ? { genre: habit.genre } : {}),
        ...(habit.room ? { room: habit.room } : {}),
      });
    });
    return () => {
      live = false;
    };
  }, [user, trackCount]);

  /**
   * Go to a room. The only way to set one.
   *
   * Choosing a room is leaving the door, wherever the choice was made — and
   * "wherever" is the point. There are sixteen places in this file that pick a
   * room, and the first version of the door taught three of them to close it:
   * the greeting's own buttons. Everything else — the rail, the landing's
   * "Start a podcast", a hand-off from one room to the next — set the room
   * behind the greeting and left the greeting on screen, so the press looked
   * like it had done nothing.
   *
   * `setStudioTab` is not called anywhere else. That is what stops the next
   * room-picker from arriving with the same fault.
   */
  const goToRoom = useCallback((id: SurfaceId) => {
    setStudioTab(id);
    setAtDoor(false);
    /* And remember it. Every way into a room already runs through here, which
       is what makes this the one place worth recording from — a room recorded
       in three of sixteen places is a count that describes the three. Fire and
       forget: nothing waits for it and nothing fails because of it. */
    noteTaste('room', id);
  }, []);
  /**
   * Whether the door has already been shown for this arrival.
   *
   * A latch rather than a plain flag, because `onAccountChange` fires on a
   * token refresh as well as on a sign-in and a greeting that reappears over
   * somebody's work every hour is an interruption.
   *
   * It lives out here, next to `arrived` and `departed`, because there are
   * three different ways somebody arrives and the first version only knew
   * about one of them — see the note on `arrived`.
   */
  /**
   * Shown once per arrival, and an arrival is a sign-in.
   *
   * One latch is enough now that the welcome is its own page rather than a
   * panel inside the studio. It was two, and before that one that could not
   * tell a page load from a sign-in — both of which were the wrong shape for
   * the same reason: the door was being *armed* in the hope somebody would
   * later open the studio and find it. A page is either arrived at or it is
   * not.
   */
  const greeted = useRef(false);

  /**
   * Somebody has just signed in. Put the welcome in front of them.
   *
   * Called only from the two places that genuinely mean it: the sign-in form,
   * and the marked return from Google. Deliberately *not* from the auth
   * library's change event, which fires on an hourly token refresh and on a
   * sign-in in another tab as readily as on one here and cannot say which —
   * a full page over somebody's work every hour is not a welcome.
   */
  const arrived = useCallback(() => {
    if (greeted.current) return;
    greeted.current = true;
    setAtDoor(true);
  }, []);

  /**
   * A session that was already there when the page loaded. Nothing happens.
   *
   * Coming back to a tab is not signing in. This was the one case that kept
   * getting the welcome wrong in both directions: first it was invisible
   * because it lived inside a studio nobody had opened, then it took over the
   * whole screen on every refresh. Neither is what somebody returning to read
   * the feed wants, and the answer is that they see the feed.
   */
  const restored = useCallback(() => undefined, []);

  /** And has just left: take it down, and re-arm it for next time. */
  const departed = useCallback(() => {
    greeted.current = false;
    setAtDoor(false);
    setUploadModalOpen(false);
  }, []);
  /**
   * People waiting on an answer from you, drawn on the rail.
   *
   * A collab ask used to be visible only inside the collab room, so it sat
   * unanswered until somebody happened to open a page they open rarely — and
   * an unanswered ask reads to the person who sent it as a no.
   */
  const [asks, setAsks] = useState(0);
  const [selectedGenreCategory, setSelectedGenreCategory] = useState<string>('All');
  const [playingGenreSample, setPlayingGenreSample] = useState<string | null>(null);

  // Studio Form State
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [creatorDomain, setCreatorDomain] = useState('anrefourie');
  const [title, setTitle] = useState('');
  const [mediaLink, setMediaLink] = useState('');

  // AI Scanner & Stream Regeneration
  const [isScanning, setIsScanning] = useState(false);
  const [streamCycle, setStreamCycle] = useState(0);
  const [scanMessage, setScanMessage] = useState('Podcasts and classes we think are worth your time.');

  // Marketing Contact Form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactBudget, setContactBudget] = useState('');
  /**
   * The rate card as this region reads it, and which rung is selected.
   *
   * Held as a derived value rather than as the initial state because the region
   * is worked out after the first render: a default stored at mount would be a
   * dollar figure that no longer matches any option, and that stale string —
   * not the one on screen — is what would have been emailed.
   */
  const budgetOptions = SPONSORSHIP.map(
    (rung) => `${rung.name} — ${sponsorshipPrice(rung, region, lang)}`,
  );
  const budget = budgetOptions.indexOf(contactBudget) !== -1 ? contactBudget : budgetOptions[0];
  const chosenRung = SPONSORSHIP[Math.max(0, budgetOptions.indexOf(budget))];
  const [contactMessage, setContactMessage] = useState('');
  /** A song the channel asked the timeline to open. Cleared by nothing: it is
      read once per value by `SongSections`, so re-entering the room leaves
      whatever is chosen there alone. */
  const [editSong, setEditSong] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactProblem, setContactProblem] = useState<string | null>(null);

  // 🎧 COMPREHENSIVE MASTER GENRE & SOUNDBOARD DATA (All Genres & Subgenres)
  const masterGenreSamples: GenreSample[] = [
    // 1. Electronic & EDM
    {
      category: 'Electronic & EDM',
      name: 'Melodic Techno & Afterlife Sound',
      subgenre: 'Dark, hypnotic, built for a big room',
      bpm: '124 BPM',
      key: 'D Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'melodic techno, deep hypnotic rolling sub-bass, atmospheric ethereal synth leads, dark emotional drops, 124 bpm, D minor',
      description: 'Hypnotic rolling bass with stadium synth leads. Ideal for dark visuals, cyber cities, and emotional visual climaxes.'
    },
    {
      category: 'Electronic & EDM',
      name: 'Deep Tech House',
      subgenre: 'Stripped-back club, all groove',
      bpm: '126 BPM',
      key: 'G Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'deep tech house, punchy four-on-the-floor kick, bouncy sub-bassline, filtered vocal chops, crisp hi-hats, 126 bpm',
      description: 'Energetic club beat with bouncing basslines and infectious rhythm.'
    },
    {
      category: 'Electronic & EDM',
      name: 'Liquid Drum & Bass',
      subgenre: 'Atmospheric DnB',
      bpm: '174 BPM',
      key: 'F Major',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
      promptSnippet: 'liquid drum and bass, fast rolling breakbeats, lush Rhodes chords, warm 808 reese bass, emotive vocal textures, 174 bpm',
      description: 'High-speed rolling percussion with super smooth, soulful ambient pads.'
    },

    // 2. Pop & Synthpop
    {
      category: 'Pop & Synthpop',
      name: '80s Retro Synthwave Pop',
      subgenre: 'Neon 80s, gated snare, big chorus',
      bpm: '130 BPM',
      key: 'C Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: '80s synthpop, retro analog synthesizers, gated reverb snare, catchy anthemic vocal melody, driving bassline, 130 bpm',
      description: 'Nostalgic 1980s neon anthems with driving drums and sparkling analog synths.'
    },
    {
      category: 'Pop & Synthpop',
      name: 'Modern Hyperpop & Glitch',
      subgenre: 'Futuristic Cyber Pop',
      bpm: '145 BPM',
      key: 'A Major',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'hyperpop, pitched vocal hooks, distorted 808s, bright candy synths, glitch transitions, maximalist energy, 145 bpm',
      description: 'High-energy, glossy futuristic pop with playful glitch effects and pitched vocals.'
    },

    // 3. Rock & Metal
    {
      category: 'Rock & Metal',
      name: 'Modern Alternative Rock',
      subgenre: 'Post-Grunge / Stadium Rock',
      bpm: '120 BPM',
      key: 'E Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
      promptSnippet: 'alternative rock, layered distorted electric guitars, driving live drums, soaring passionate male/female vocals, anthemic chorus, 120 bpm',
      description: 'Raw guitar riffs, heavy acoustic drums, and emotionally charged vocals.'
    },
    {
      category: 'Rock & Metal',
      name: 'Cinematic Nu-Metal & Djent',
      subgenre: 'Heavy riffs against clean electronics',
      bpm: '135 BPM',
      key: 'Drop D',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'cinematic nu-metal, down-tuned 7-string heavy djent guitar riffs, aggressive synth pads, hybrid electronic rock drums, drop D, 135 bpm',
      description: 'Thunderous low-tuned heavy riffs fused with electronic synth textures.'
    },

    // 4. Hip-Hop & Trap
    {
      category: 'Hip-Hop & Trap',
      name: 'Dark Cinematic Drill & Trap',
      subgenre: 'Sliding 808s, sparse and menacing',
      bpm: '140 BPM',
      key: 'C# Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
      promptSnippet: 'dark cinematic trap, sliding 808 bass, stuttering hi-hats, ominous piano melody, vocal chants, hard-hitting kick, 140 bpm',
      description: 'Sliding bass glides, crisp rapid-fire hats, and dramatic minor-key pianos.'
    },
    {
      category: 'Hip-Hop & Trap',
      name: '90s Golden Era Boom-Bap',
      subgenre: 'Vinyl Sampled East Coast',
      bpm: '90 BPM',
      key: 'E Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
      promptSnippet: '90s boom-bap hip-hop, dusty vinyl jazz piano sample, punchy acoustic drum breaks, upright bassline, classic street vibe, 90 bpm',
      description: 'Authentic 90s vintage drum chops with soulful sampled jazz harmonies.'
    },

    // 5. R&B & Neo-Soul
    {
      category: 'R&B & Soul',
      name: 'Contemporary Midnight R&B',
      subgenre: 'Hazy, intimate, unhurried',
      bpm: '85 BPM',
      key: 'Bb Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'contemporary R&B, sultry smooth vocal harmonies, warm tape electric piano, laid-back trap drums, deep sub-bass, 85 bpm',
      description: 'Intimate, late-night acoustic soul with rich vocal harmonies and sub-bass.'
    },

    // 6. Country & Folk
    {
      category: 'Country & Folk',
      name: 'Modern Country Anthem & Pop',
      subgenre: 'Country with a modern low end',
      bpm: '104 BPM',
      key: 'G Major',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'modern country pop, acoustic guitar strums, pedal steel guitar swells, twangy electric lead guitar, punchy drums, raspy storytelling vocals, 104 bpm',
      description: 'Heartfelt storytelling, acoustic guitars, pedal steel swells, and anthemic choruses.'
    },
    {
      category: 'Country & Folk',
      name: 'Dark Indie Folk & Americana',
      subgenre: 'Close-mic folk, room and harmony',
      bpm: '78 BPM',
      key: 'D Major',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'indie folk, fingerpicked acoustic guitar, mournful cello, layered choral vocal harmonies, foot stomps, intimate warm mix, 78 bpm',
      description: 'Intimate acoustic fingerpicking, delicate strings, and rich choral harmonies.'
    },

    // 7. Cyberpunk & Darksynth
    {
      category: 'Cyberpunk & Darksynth',
      name: 'Industrial Cyberpunk 2077',
      subgenre: 'Midtempo / Aggressive Cyber Bass',
      bpm: '105 BPM',
      key: 'F Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'industrial cyberpunk, distorted sawtooth bass, metallic percussion hits, dystopian sci-fi sirens, aggressive midtempo beat, 105 bpm',
      description: 'High-octane dystopian combat beats with raw distorted synth energy.'
    },

    // 8. Cinematic & Orchestral
    {
      category: 'Cinematic & Orchestral',
      name: 'Epic Hans Zimmer Hybrid Score',
      subgenre: 'Blockbuster Film Trailer',
      bpm: '90 BPM',
      key: 'D Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'epic cinematic hybrid, massive brass horns, staccato violins, thunderous taiko drums, sub-bass braam, emotional choir crescendo, 90 bpm',
      description: 'Colossal orchestral instruments with ground-shaking brass and percussion.'
    },

    // 9. Lo-Fi & Ambient
    {
      category: 'Lo-Fi & Ambient',
      name: 'Lo-Fi Chillhop Study Beats',
      subgenre: 'Relaxed Cafe Vibes',
      bpm: '78 BPM',
      key: 'C Major',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
      promptSnippet: 'lo-fi chillhop, vinyl crackle, warm Rhodes piano, relaxed boom-bap drum loop, mellow acoustic guitar, cozy rainy day atmosphere, 78 bpm',
      description: 'Cozy tape-saturated beats designed for deep learning, focus, and coding.'
    },

    // 10. Afrobeats & Latin
    {
      category: 'Afrobeats & Latin',
      name: 'Afro-Fusion & Amapiano',
      subgenre: 'Afrobeats, log drum, sung hooks',
      bpm: '112 BPM',
      key: 'A Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'afrobeats fusion, log drum bassline, infectious shaker percussions, warm saxophone riffs, uplifting melodic vocal chants, 112 bpm',
      description: 'Vibrant African percussions with deep log-drums and uplifting melodies.'
    }
  ];

  const genreCategories = ['All', 'Electronic & EDM', 'Pop & Synthpop', 'Rock & Metal', 'Hip-Hop & Trap', 'R&B & Soul', 'Country & Folk', 'Cyberpunk & Darksynth', 'Cinematic & Orchestral', 'Lo-Fi & Ambient', 'Afrobeats & Latin'];

  const filteredGenreSamples = selectedGenreCategory === 'All' 
    ? masterGenreSamples 
    : masterGenreSamples.filter(g => g.category === selectedGenreCategory);

  const approvedPodcasters = [
    { name: 'All Podcasters', key: null },
    { name: 'The Diary of a CEO (Steven Bartlett)', key: 'The Diary of a CEO' },
    { name: 'Lex Fridman Podcast', key: 'Lex Fridman' },
    { name: 'Huberman Lab (Dr. Andrew Huberman)', key: 'Huberman Lab' },
    { name: 'Dwarkesh Podcast (Dwarkesh Patel)', key: 'Dwarkesh' },
    { name: 'All-In Podcast', key: 'All-In' }
  ];

  const categoriesList = [
    'All Categories',
    'Future of AI & Superintelligence',
    'Tech & Venture Masterclasses',
    'Creative AI Video & Cinema (Sora, Runway)',
    'Neural AI Music & Songs (Suno, Udio)',
    'Frontier Business Blueprints & Vibe Coding'
  ];


  // The Collab Radar reads what has actually been released rather than what the
  // creator says they do, so the matches move when the catalogue moves.
  const creatorProfile = profileFromTracks(
    user?.name ?? 'FutureBox creator',
    user?.handle ?? '@futurebox',
    user?.followers ?? 0,
    TRACK_FLAVOURS,
  );

  // AI Stream Regeneration
  const podcastPools = [
    [
      {
        id: 'pod-1',
        title: 'The AI Emergency: What Happens Next Before 2030',
        host: 'The Diary of a CEO (Steven Bartlett)',
        guest: 'Mo Gawdat (Ex-Google X)',
        duration: '1h 58m',
        views: '6.4M',
        embedUrl: 'https://www.youtube.com/embed/bk-nQ7HF6k4',
        externalUrl: 'https://www.youtube.com/watch?v=bk-nQ7HF6k4',
        isPro: false
      },
      {
        id: 'pod-2',
        title: 'Sam Altman: OpenAI, GPT-5, Sora & The Future of AGI',
        host: 'Lex Fridman Podcast #419',
        guest: 'Sam Altman (OpenAI)',
        duration: '2h 08m',
        views: '4.9M',
        embedUrl: 'https://www.youtube.com/embed/jvqFAi7vkBc',
        externalUrl: 'https://www.youtube.com/watch?v=jvqFAi7vkBc',
        isPro: false
      },
      {
        id: 'pod-3',
        title: 'Optimal Protocols for Focus, Neuroplasticity & Deep Learning',
        host: 'Huberman Lab Podcast',
        guest: 'Dr. Andrew Huberman',
        duration: '2h 15m',
        views: '3.1M',
        embedUrl: 'https://www.youtube.com/embed/QmOF0crdyRU',
        externalUrl: 'https://www.youtube.com/watch?v=QmOF0crdyRU',
        isPro: false
      }
    ],
    [
      {
        id: 'pod-4',
        title: 'The Psychology of Peak Achievement in the Age of AI',
        host: 'The Diary of a CEO (Steven Bartlett)',
        guest: 'Daniel Kahneman & Frontier Economists',
        duration: '1h 45m',
        views: '4.2M',
        embedUrl: 'https://www.youtube.com/embed/1bPEq4f454M',
        externalUrl: 'https://www.youtube.com/watch?v=1bPEq4f454M',
        isPro: false
      },
      {
        id: 'pod-5',
        title: 'The Industrialization of Intelligence & Supercomputing',
        host: 'Dwarkesh Podcast (Dwarkesh Patel)',
        guest: 'Dario Amodei (CEO, Anthropic)',
        duration: '2h 30m',
        views: '2.1M',
        embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
        externalUrl: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
        isPro: false
      },
      {
        id: 'pod-6',
        title: 'State of the Economy, AI Startup Bubbles & Valuations',
        host: 'All-In Podcast',
        guest: 'Chamath, Sacks, Friedberg, Jason',
        duration: '1h 35m',
        views: '3.8M',
        embedUrl: 'https://www.youtube.com/embed/sPXZ_y2Yw3I',
        externalUrl: 'https://www.youtube.com/watch?v=sPXZ_y2Yw3I',
        isPro: false
      }
    ]
  ];

  const activePodcasts = podcastPools[streamCycle % podcastPools.length].filter(pod => {
    if (!selectedPodcasterFilter) return true;
    return pod.host.toLowerCase().includes(selectedPodcasterFilter.toLowerCase());
  });

  /**
   * How many cards a section shows at once.
   *
   * The home page was every card of every kind, stacked: 23,552 pixels on a
   * 390-pixel phone, which is twenty-eight screens of scrolling before the
   * footer. Nobody reads twenty-eight screens; they close it. Four of each is
   * enough to say what the section is, and the button below moves the window
   * along.
   */
  const SHOW = 4;

  /**
   * The next four, not four at random.
   *
   * A random draw repeats — press it twice and two of the same four come
   * back, which reads as a broken button. A window that slides along the list
   * shows something new every press and eventually shows everything.
   */
  const [shownFrom, setShownFrom] = useState(0);
  const some = useCallback(<T,>(all: readonly T[], many: number = SHOW): T[] => {
    if (all.length <= many) return [...all];
    const start = (shownFrom * many) % all.length;
    return Array.from({ length: many }, (_, i) => all[(start + i) % all.length]);
  }, [shownFrom]);

  const handleAiScanRefresh = () => {
    setIsScanning(true);
    setScanMessage('Finding different ones…');
    setTimeout(() => {
      setIsScanning(false);
      setStreamCycle(prev => prev + 1);
      setShownFrom(prev => prev + 1);
      setScanMessage('Here is another set.');
    }, 2000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Without a Supabase project behind the app there is nothing to sign in to,
    // so the account stays on this device — which the modal says out loud.
    if (!cloud.configured()) {
      const name = authEmail.split('@')[0];
      setUser({ email: authEmail, name, handle: `@${name}`, followers: 1 });
      setAuthModalOpen(false);
      arrived();
      return;
    }

    setAuthBusy(true);
    const result =
      authMode === 'signin'
        ? await cloud.signIn(authEmail, authPassword)
        : await cloud.signUp(authEmail, authPassword);
    setAuthBusy(false);

    if (!result.ok) {
      setAuthError(result.message);
      return;
    }
    if (!result.account) {
      // Sign-up with email confirmation switched on: there is no session yet.
      setAuthError(null);
      setAuthNotice(t('auth.checkEmail'));
      return;
    }
    setUser({ ...result.account, followers: 1 });
    setAuthModalOpen(false);
    arrived();
  };

  /**
   * Signing in with Google.
   *
   * This leaves the page, so there is nothing to await and no modal to close:
   * the browser goes to Google and comes back with a session already in place.
   * The only thing that can fail here fails before the redirect — Google not
   * switched on in the Supabase project — and that message is worth showing
   * rather than a silent button.
   */
  const handleGoogle = async () => {
    setAuthError(null);
    if (!cloud.configured()) {
      setAuthError(t('auth.noAccounts', 'Accounts are not switched on for this app yet.'));
      setAuthModalOpen(true);
      return;
    }
    const result = await cloud.signInWithGoogle();
    if (!result.ok) {
      setAuthError(result.message);
      setAuthModalOpen(true);
    }
  };

  const handleSignOut = async () => {
    await cloud.signOut();
    setUser(null);
    departed();
  };

  // Reopening the modal should not show the last attempt's error.
  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthNotice(null);
    setAuthModalOpen(true);
  };

  /* The sponsorship brief, sent rather than handed to a mail client.
     
     This opened a `mailto:` and then said "sent" — which was not true and
     could not be. On a phone that link often opens nothing; on a work machine
     it opens Outlook signed in as somebody else; and either way the message
     was still sitting unsent in a draft while the screen said it had gone. It
     also printed the studio's address into every visitor's URL bar.

     It posts to the same route the help page uses now, so a brief actually
     arrives, with reply-to set to whoever wrote it. */
  const handleMarketingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactBusy) return;
    setContactBusy(true);
    setContactProblem(null);
    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: contactEmail,
          name: contactName,
          where: 'sponsorship',
          message: `Budget: ${budget}\nWhat that includes: ${chosenRung.gets}\n\n${contactMessage}`,
        }),
      });
      const said = (await response.json().catch(() => ({}))) as {
        sent?: boolean;
        message?: string;
      };
      if (said.sent) {
        setContactSent(true);
        setContactMessage('');
      } else {
        setContactProblem(said.message || t('spon.failed', 'That could not be sent. Try again in a moment.'));
      }
    } catch {
      setContactProblem(t('spon.failed', 'That could not be sent. Try again in a moment.'));
    } finally {
      setContactBusy(false);
    }
  };


  // One scrollbar, not two: while a modal is open the page behind it must not
  // scroll, or the scrollbar the eye goes to is the page's, sits at the top
  // forever, and contradicts what the modal is actually doing.
  const anyModalOpen =
    uploadModalOpen || authModalOpen || pricingModalOpen || themeOpen ||
    selectedMedia !== null || selectedBlueprint !== null;
  useEffect(() => {
    if (!anyModalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [anyModalOpen]);

  if (!user) {
    return (
      <>
        <Landing
          onStart={() => openAuth('signup')}
          onGoogle={() => void handleGoogle()}
        />

        {/* The auth and pricing overlays are shared with the signed-in app. */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 bg-scrim/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-extrabold text-white">
                  {authMode === 'signin' ? t('common.welcomeBack') : t('landing.startFree')}
                </h3>
                <button onClick={() => setAuthModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Above the form, not below it: for most people this is the
                  whole sign-in, and burying it under two fields makes them
                  invent a password they will have to reset. */}
              {/* Whichever of Google, Apple and Facebook the project actually
                  has switched on. Drawn from `/auth/v1/settings` rather than
                  hard-coded, so a button never sends somebody out to a consent
                  screen that refuses them — see `components/SignInWith.tsx`. */}
              <SignInWith onProblem={setAuthError} />
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <PasswordField
                  value={authPassword}
                  onChange={setAuthPassword}
                  placeholder="Password"
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold text-sm disabled:opacity-60"
                >
                  {authBusy
                    ? t('auth.working')
                    : authMode === 'signin'
                      ? t('common.signIn')
                      : t('common.createAccount')}
                </button>
              </form>
              {authError && (
                <p className="text-sm text-rose-400 text-center leading-relaxed">{authError}</p>
              )}
              {authNotice && (
                <p className="text-sm text-emerald-400 text-center leading-relaxed">{authNotice}</p>
              )}
              <p className="text-sm text-zinc-500 text-center">
                {authMode === 'signin' ? t('common.noAccount') : t('common.haveAccount')}{' '}
                <button
                  onClick={() => openAuth(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-emerald-400 hover:underline"
                >
                  {authMode === 'signin' ? t('landing.startFree') : t('common.signIn')}
                </button>
              </p>
              {!cloud.configured() && (
                <p className="text-sm text-zinc-600 text-center leading-relaxed">
                  {t('common.localOnly')}
                </p>
              )}
            </div>
          </div>
        )}

        {themeOpen && <ThemeStudio theme={theme} setTheme={setTheme} onClose={() => setThemeOpen(false)} />}
      </>
    );
  }

  /* Today's picks, and the button that reshuffles them.

     Held as a value rather than written once at the top of the page. It used
     to sit above every heading on the page, so the control that replaces the
     cards was a whole board of counters and a section title away from the
     cards it replaces: pressing it changed things nobody could see. It now
     stands inside each section, directly on top of the grid it is about. */
  const picksBar = (
    <section className="bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
      <div className="flex items-center gap-3 text-xs min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white">{t('home.todaysPicks', 'Today’s picks')}</p>
          <p className="text-zinc-400 text-[13px]">{scanMessage}</p>
        </div>
      </div>

      <button
        onClick={handleAiScanRefresh}
        disabled={isScanning}
        className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-onAccent text-xs font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 flex-shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
        <span>{isScanning ? t('home.looking', 'Looking…') : t('home.otherPicks', 'Show me different ones')}</span>
      </button>
    </section>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-onAccent flex flex-col justify-between">
      
      {/* 1. Header with Auth & Creator Channel Info */}
      {/* Wraps, because it did not.
          Three clusters in a row that could neither shrink nor wrap pushed the
          page 133 pixels wider than a 390-pixel phone, and a page wider than
          the screen means the whole app slides sideways under your thumb — on
          every screen, not only this one. `gap` rather than `space-x` because
          space-x puts a margin on every child but the first, which is wrong the
          moment a row wraps onto two. */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/90 border-b border-zinc-800/80 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-y-3 gap-x-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Cpu className="w-5 h-5 text-onAccent font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white flex items-center space-x-2">
              <span>FUTURE<span className="text-emerald-400">BOX</span></span>
              {userPlan !== 'free' && (
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-amber-600 text-onAccent font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                  <Crown className="w-3 h-3" />
                  <span>PRO</span>
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400">{t('feed.tagline')}</p>
              <HereNow />
            </div>
          </div>
        </div>

        {/* What the feed is showing.

            This was `hidden lg:flex`, so below 1024 pixels it was not merely
            cramped — it was gone. Four of the five sections of the home page,
            the podcasts, the masterclasses, the creations and the trends
            radar, could not be reached at all on a phone. Nothing was broken
            in them; there was simply no way in.

            It wraps now instead of hiding, with a short name on a phone and
            the full one where there is room. Five short pills fall into two
            rows at 390 px, which is two rows of buttons you can see rather
            than one row you cannot. */}
        <nav className="flex flex-wrap items-center gap-1 bg-zinc-900/90 p-1.5 rounded-2xl lg:rounded-full border border-zinc-800">
          {[
            { id: 'all', label: t('tab.all', 'Spotlight'), short: t('tab.all.s', 'Spotlight'), icon: Compass },
            { id: 'futurebox', label: t('tab.pods', 'FutureBox Podcasts'), short: t('tab.pods.s', 'Podcasts'), icon: Headphones },
            { id: 'masterclasses', label: t('tab.classes', 'Masterclasses'), short: t('tab.classes.s', 'Classes'), icon: GraduationCap },
            { id: 'creations', label: t('tab.creations', 'Creative AI Music & Video'), short: t('tab.creations.s', 'Music & video'), icon: Sparkles },
            { id: 'radar', label: t('tab.radar', 'AI Trends Radar'), short: t('tab.radar.s', 'Radar'), icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 min-h-[36px] rounded-full text-xs font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-onAccent shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="lg:hidden">{tab.short}</span>
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Top Right Action & Auth Portal */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end min-w-0">
          {user ? (
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              {/* Pressing your own name opens your account.

                  It used to set the studio's room to Make a song, which does
                  nothing at all unless the studio is already open — so on
                  every other screen this was a dead control, and the plan,
                  the balance and the cancel button were three presses away
                  inside a room called Channel. */}
              <button
                onClick={() => setAccountOpen(true)}
                title={t('account.title', 'Your account')}
                className="flex items-center space-x-2 text-xs font-semibold"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 text-onAccent font-extrabold flex items-center justify-center text-[10px]">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-white text-[11px] leading-tight font-bold">{user.name}</p>
                  <p className="text-[10px] text-emerald-400">{user.handle}</p>
                </div>
              </button>
              <button
                onClick={handleSignOut}
                className="text-[11px] text-zinc-500 hover:text-white border-l border-zinc-800 pl-2"
              >
                {t('auth.signOut')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth('signin')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-all"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('home.signIn', 'Sign in')}</span>
            </button>
          )}

          {userPlan === 'free' ? (
            <button
              onClick={() => setPricingModalOpen(true)}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-onAccent font-extrabold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>{t('common.upgrade')} ({entryPrice.display})</span>
            </button>
          ) : (
            <span className="text-xs text-emerald-400 hidden sm:flex items-center space-x-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>{t('home.proActive', 'PRO active')}</span>
            </span>
          )}

          <Balance
            reloadKey={spent}
            onTopUp={(wallet) => {
              setPacks(wallet.packs);
              // Opened from the balance rather than from a refusal, so nothing
              // is actually short. Zero and zero reads as "nothing missing".
              setShort({ need: 0, balance: wallet.balance, message: '' });
            }}
          />

          <LanguagePicker compact />

          <button
            onClick={() => setThemeOpen(true)}
            title="Appearance — colours, type, layout"
            className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 text-xs font-bold rounded-xl transition-all"
          >
            <Paintbrush className="w-4 h-4" />
            <span className="hidden lg:inline">{t('common.appearance')}</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.studio')}</span>
          </button>
        </div>
      </header>

      {/* 🔍 SMART FILTERING SUB-BAR */}
      <div className="relative z-30 bg-zinc-950/80 border-b border-zinc-800/80 px-6 py-2.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Approved Podcasters Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setPodcasterDropdownOpen(!podcasterDropdownOpen); setCategoryDropdownOpen(false); }}
                className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 px-3.5 py-1.5 rounded-xl text-zinc-200 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                <span>{selectedPodcasterFilter ? `Podcaster: ${selectedPodcasterFilter}` : 'Approved Podcasters Compilations'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {podcasterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                  <p className="text-[10px] uppercase text-zinc-500 px-3 py-1">{t('home.curated', 'Podcasters worth following')}</p>
                  {approvedPodcasters.map((pod, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedPodcasterFilter(pod.key);
                        setPodcasterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors flex items-center justify-between"
                    >
                      <span>{pod.name}</span>
                      {selectedPodcasterFilter === pod.key && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setCategoryDropdownOpen(!categoryDropdownOpen); setPodcasterDropdownOpen(false); }}
                className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 px-3.5 py-1.5 rounded-xl text-zinc-200 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>{selectedCategoryFilter || 'Explore All Categories'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                  <p className="text-[10px] uppercase text-zinc-500 px-3 py-1">{t('home.compilations', 'Across every platform')}</p>
                  {categoriesList.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedCategoryFilter(cat === 'All Categories' ? null : cat);
                        setCategoryDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center justify-between"
                    >
                      <span>{cat}</span>
                      {selectedCategoryFilter === cat && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(selectedPodcasterFilter || selectedCategoryFilter) && (
            <button
              onClick={() => { setSelectedPodcasterFilter(null); setSelectedCategoryFilter(null); }}
              className="text-zinc-400 hover:text-white flex items-center space-x-1 text-[11px] underline"
            >
              <span>{t('feed.resetFilters')}</span>
            </button>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-14 flex-1 w-full">
        
        {/*
          What this place is, before anything else on the page.

          Somebody arriving here has about a second to work out what they can
          do, and a feed of picks does not tell them. So: what they will walk
          away with, then the four things this app does that the other ones do
          not, then a door into each.

          Every claim below is a thing that is actually built. A landing page
          that promises a feature is a landing page that gets found out on the
          second click, and this one is the first thing anybody sees.
        */}
        {activeTab === 'all' && (
          <Spotlight
            onGo={(tab) => {
              setUploadModalOpen(true);
              goToRoom(tab);
            }}
            onAppearance={() => setThemeOpen(true)}
          />
        )}

        {/* What has actually happened here, then what we are showing you today.

            They were the other way round, and the picks bar carried the button
            that reshuffles the picks — so the control sat at the top of the
            page with a whole board of counters between it and the cards it
            changes. Pressing it scrolled nothing into view and the cards it
            had just replaced were below the fold.

            The record of the place is a header, not an interruption: it goes
            above. The picks bar drops to sit directly on top of the cards it
            is about, which is where its button belongs.

            One board rather than four inside four sections, scoped by the tab
            that is open. */}
        {activeTab !== 'all' && (
          <Counters
            board={board}
            scope={activeTab}
            labels={activeTab === 'masterclasses' ? TRACK_LABELS : undefined}
          />
        )}


        {/*
          Spotlight carries no counters and no bill.

          The numbers are real and they are also small, because the site is
          new, and a board of small numbers on the first screen says "nobody is
          here" louder than it says anything else. They go back up when there
          is traffic to report — the table keeps counting in the meantime, so
          nothing is lost by waiting. The engine's running cost was on here
          too; it is the owner's business and not the first thing a visitor
          should meet. Both still live on their own pages.
        */}

        {/* 🎬 1. FEATURED SPOTLIGHT */}
        {(activeTab === 'all') && (
          <section className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-8 md:p-12 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full flex items-center space-x-1.5">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                    <span>{t('feed.freeClass')}</span>
                  </span>
                  <span className="text-xs text-zinc-400">1h 00m • Andrej Karpathy</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Intro to Large Language Models: How Neural Networks Think
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  The world-renowned masterclass by Andrej Karpathy (Former Director of AI at Tesla & Co-founder of OpenAI) explaining how modern neural networks work and what lies ahead.
                </p>

                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] uppercase text-emerald-400 tracking-wider">{t('feed.takeaways')}</span>
                  <ul className="space-y-1.5">
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{t('feed.take1')}</span>
                    </li>
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{t('feed.take2')}</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center space-x-4">
                  <button 
                    onClick={() => setSelectedMedia({
                      title: 'Intro to Large Language Models',
                      embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
                      externalUrl: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
                      type: 'youtube',
                      host: 'Andrej Karpathy',
                      counts: { kind: 'masterclass', category: 'which-ai', ref: 'karpathy-intro-to-llms' }
                    })}
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{t('feed.watchFree')}</span>
                  </button>

                  <a 
                    href="https://www.youtube.com/watch?v=zjkBMFhNj_g" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
                  >
                    <span>{t('feed.openYouTube')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div 
                onClick={() => setSelectedMedia({
                  title: 'Intro to Large Language Models',
                  embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
                  externalUrl: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
                  type: 'youtube',
                  host: 'Andrej Karpathy',
                  counts: { kind: 'masterclass', category: 'which-ai', ref: 'karpathy-intro-to-llms' }
                })}
                className="relative group rounded-2xl overflow-hidden border border-zinc-700/60 aspect-video shadow-2xl cursor-pointer"
              >
                {/* The lecture's own thumbnail. This was a stock photograph
                    of a stranger over a named, real masterclass. */}
                <Cover
                  seed="karpathy-intro-to-llms"
                  label="Intro to Large Language Models — Andrej Karpathy"
                  url="https://www.youtube.com/watch?v=zjkBMFhNj_g"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-onAccent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 🎙️ 2. FUTUREBOX PODCASTS */}
        {(activeTab === 'all' || activeTab === 'futurebox') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Headphones className="w-5 h-5 text-emerald-400" />
                  <span>FutureBox Podcasts {selectedPodcasterFilter && `(${selectedPodcasterFilter})`}</span>
                </h3>
                <p className="text-xs text-zinc-400">{t('feed.podSub')}</p>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {activePodcasts.length} Curated Episodes Available
              </span>
            </div>

            {picksBar}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {some(activePodcasts).map((pod) => (
                <div 
                  key={pod.id}
                  className="group bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div 
                      onClick={() => setSelectedMedia({
                        title: pod.title,
                        embedUrl: pod.embedUrl,
                        externalUrl: pod.externalUrl,
                        type: 'youtube',
                        host: pod.host,
                        counts: { kind: 'podcast', category: pod.host, ref: pod.id }
                      })}
                      className="aspect-video relative overflow-hidden cursor-pointer"
                    >
                      <Cover
                        seed={pod.id}
                        label={pod.title}
                        url={pod.externalUrl || pod.embedUrl}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 text-onAccent flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current translate-x-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                        <Mic className="w-3 h-3" />
                        <span>{pod.duration}</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="text-[11px] font-bold text-emerald-400 flex items-center justify-between gap-2">
                        <span>{pod.host}</span>
                        <Views board={board} kind="podcast" reference={pod.id} />
                      </p>
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors leading-snug">{pod.title}</h4>
                      <p className="text-xs text-zinc-400">{t('home.guest', 'Guest')}: <span className="text-zinc-200 font-semibold">{pod.guest}</span></p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                    <button
                      onClick={() => setSelectedMedia({
                        title: pod.title,
                        embedUrl: pod.embedUrl,
                        externalUrl: pod.externalUrl,
                        type: 'youtube',
                        host: pod.host,
                        counts: { kind: 'podcast', category: pod.host, ref: pod.id }
                      })}
                      className="text-emerald-400 font-semibold flex items-center space-x-1 hover:underline"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{t('home.playEpisode', 'Play the episode')}</span>
                    </button>

                    <a 
                      href={pod.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="hover:text-white flex items-center space-x-1 text-[11px]"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🎓 3. MASTERCLASSES (PRO Gated) */}
        {(activeTab === 'all' || activeTab === 'masterclasses') && (
          <section className="space-y-6">
            {picksBar}

            <Masterclasses
              userPlan={userPlan}
              onUpgrade={() => setPricingModalOpen(true)}
              board={board}
              show={SHOW}
              from={shownFrom}
              compact={activeTab === 'all'}
            />

            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span>{t('feed.featured')}</span>
                </h3>
                <p className="text-xs text-zinc-400">{t('feed.featuredSub')}</p>
              </div>
              <span className="text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Verified Masterclasses
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {[
                {
                  id: 'mc-1',
                  title: 'Building & Scaling a $50k/MRR AI Micro-SaaS Solo',
                  instructor: 'Garry Tan (CEO, Y Combinator)',
                  duration: '45m',
                  level: 'Business & Founders',
                  embedUrl: 'https://www.youtube.com/embed/sPXZ_y2Yw3I',
                  externalUrl: 'https://www.youtube.com/watch?v=sPXZ_y2Yw3I',
                  isPro: false
                },
                {
                  id: 'mc-2',
                  title: 'Autonomous Multi-Agent AI Systems & Tool Calling',
                  instructor: 'Harrison Chase (LangChain)',
                  duration: '1h 22m',
                  level: 'Advanced Architecture',
                  embedUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
                  externalUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc',
                  isPro: true
                },
                {
                  id: 'mc-3',
                  title: 'Generative AI Cinema: Directing Films with Runway & Sora',
                  instructor: 'Kaelen Voss (AI Filmmaker)',
                  duration: '1h 30m',
                  level: 'PRO Masterclass',
                  embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
                  externalUrl: 'https://runwayml.com',
                  isPro: true
                }
              ].map((mc) => {
                const isLocked = mc.isPro && userPlan === 'free';
                return (
                  <div 
                    key={mc.id}
                    className="group bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col justify-between relative"
                  >
                    {isLocked && (
                      <div className="absolute top-3 right-3 z-20 bg-amber-500/90 text-onAccent text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg">
                        <Lock className="w-3 h-3" />
                        <span>PRO ONLY</span>
                      </div>
                    )}

                    <div>
                      <div 
                        onClick={() => {
                          if (isLocked) {
                            setPricingModalOpen(true);
                          } else {
                            setSelectedMedia({
                              title: mc.title,
                              embedUrl: mc.embedUrl,
                              externalUrl: mc.externalUrl,
                              type: 'youtube',
                              host: mc.instructor,
                              counts: { kind: 'masterclass', category: 'featured', ref: mc.id }
                            });
                          }
                        }}
                        className="aspect-video relative overflow-hidden cursor-pointer"
                      >
                        <Cover
                          seed={mc.id}
                          label={mc.title}
                          url={mc.embedUrl}
                          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isLocked ? (
                            <div className="w-12 h-12 rounded-full bg-amber-500 text-onAccent flex items-center justify-center shadow-lg">
                              <Lock className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-cyan-500 text-onAccent flex items-center justify-center shadow-lg">
                              <Play className="w-5 h-5 fill-current translate-x-0.5" />
                            </div>
                          )}
                        </div>
                        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-cyan-300 border border-cyan-500/30">
                          {mc.level} • {mc.duration}
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <p className="text-[11px] text-zinc-400">{t('home.instructor', 'Instructor')}: <span className="text-white font-semibold">{mc.instructor}</span></p>
                        <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors leading-snug">{mc.title}</h4>
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60">
                      {isLocked ? (
                        <button
                          onClick={() => setPricingModalOpen(true)}
                          className="text-amber-400 font-bold flex items-center space-x-1 hover:underline"
                        >
                          <Crown className="w-3.5 h-3.5 fill-current" />
                          <span>{t('common.upgrade')} ({entryPrice.display})</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => setSelectedMedia({
                            title: mc.title,
                            embedUrl: mc.embedUrl,
                            externalUrl: mc.externalUrl,
                            type: 'youtube',
                            host: mc.instructor,
                            counts: { kind: 'masterclass', category: 'featured', ref: mc.id }
                          })}
                          className="text-cyan-400 font-semibold flex items-center space-x-1 hover:underline"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{t('feed.startClass')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 🎨 4. CREATIVE AI MUSIC & VIDEOS ("HOOKS" SHOWCASE) */}
        {(activeTab === 'all' || activeTab === 'creations') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>{t('feed.creations')}</span>
                </h3>
                <p className="text-xs text-zinc-400">{t('feed.creationsSub')}</p>
              </div>
              <span className="text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Creator Channels
              </span>
            </div>

            {picksBar}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {[
                {
                  id: 'ai-1',
                  title: 'Cherry Blossom Mail (Official AI Music Video)',
                  creator: 'Anre Fourie',
                  domain: profileAddress('anrefourie'),
                  medium: 'Jingle Pop / Acoustic',
                  tools: ['Suno v5.5', 'Runway Gen-3'],
                  prompt: 'jingle style, 96 BPM, major key, claps and hand percussion, brushed snare, pedal steel swells, acoustic guitar strums',
                  embedUrl: 'https://www.youtube.com/embed/bk-nQ7HF6k4',
                  externalUrl: 'https://suno.com',
                  type: 'youtube' as const
                },
                {
                  id: 'ai-2',
                  title: 'Paul Gaan Skool Toe (AI Folk Rock Release)',
                  creator: 'Anre Fourie',
                  domain: profileAddress('anrefourie'),
                  medium: 'Pop Rock & Anthemic Folk',
                  tools: ['Suno v5.5', 'Kling AI'],
                  prompt: 'pop rock, anthemic pop, close-miked female vocals, layered electric guitars, punchy kick, clapping snare, upright bass',
                  embedUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
                  externalUrl: 'https://runwayml.com',
                  type: 'youtube' as const
                },
                {
                  id: 'ai-3',
                  title: 'BRICKZ — FORGET YESTERDAY (Official AI Video)',
                  creator: 'JL Records',
                  domain: profileAddress('brickz'),
                  medium: 'Sci-Fi Dance & Visual Hook',
                  tools: ['Suno AI', 'Sora Experimental'],
                  prompt: 'retro-futuristic robotic dancers with radio helmets, yellow coat, high-energy synth hook, 128 bpm',
                  embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
                  externalUrl: 'https://klingai.org',
                  type: 'youtube' as const
                }
              ].map((creation) => (
                <div 
                  key={creation.id} 
                  className="group bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div 
                      onClick={() => setSelectedMedia({
                        title: creation.title,
                        embedUrl: creation.embedUrl,
                        externalUrl: creation.externalUrl,
                        type: 'youtube',
                        counts: { kind: 'article', category: 'Creative AI', ref: creation.id }
                      })}
                      className="aspect-video relative overflow-hidden cursor-pointer"
                    >
                      <Cover
                        seed={creation.id}
                        label={creation.title}
                        url={creation.embedUrl}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {creation.tools.map((tool, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-black/80 backdrop-blur-md text-[10px] text-cyan-300 rounded-md border border-cyan-500/30">
                            {tool}
                          </span>
                        ))}
                      </div>
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-cyan-400 fill-current" />
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase text-cyan-400 font-bold">{creation.medium}</span>
                        <span className="text-[10px] text-zinc-400 bg-black/50 px-2 py-0.5 rounded border border-zinc-800">{creation.domain}</span>
                      </div>
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors leading-snug">{creation.title}</h4>
                      <p className="text-xs text-zinc-400 bg-black/30 p-2.5 rounded-lg border border-zinc-800">
                        <span className="text-cyan-400 font-semibold">{t('home.prompt', 'Prompt')}: </span>
                        &ldquo;{creation.prompt}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60">
                    <span>{t('feed.by')} {creation.creator}</span>
                    <a 
                      href={creation.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      /* `min-h-11` is 44px, the smallest thing a thumb hits
                         reliably. The global coarse-pointer rule in globals.css
                         cannot reach this one: it adds vertical padding, and a
                         Tailwind `py-1` on the element itself outranks it. */
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center justify-center space-x-1 bg-cyan-500/10 px-2.5 py-1 min-h-11 rounded-lg border border-cyan-500/30"
                    >
                      <span>{t('home.explore', 'Have a look')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ⚡ 5. INTELLIGENCE RADAR */}
        {(activeTab === 'all' || activeTab === 'radar') && (
          <section className="space-y-6">
            {/* The quality board is the radar page. On the landing tab it
                was 5,394 pixels of one section out of six. */}
            {activeTab === 'radar' && (
              <QualityRadar userPlan={userPlan} onUpgrade={() => setPricingModalOpen(true)} />
            )}

            <div className="pt-2">
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>{t('feed.radar')}</span>
              </h3>
              <p className="text-xs text-zinc-400">{t('feed.radarSub')}</p>
            </div>

            {picksBar}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {[
                {
                  tag: 'Top Vibe Coded App',
                  title: 'Autonomous Coding & Micro-SaaS with Cursor AI',
                  desc: 'How non-coders and engineers build and deploy full applications in under 48 hours.',
                  mrrUsd: [10_000, 50_000] as const,
                  buildTime: '48 Hours (Cursor)',
                  techStack: ['Cursor AI', 'Next.js 14', 'Supabase Database', 'Vercel Deployment'],
                  opportunity: 'Cursor AI enables solo founders to build 10x faster with full codebase context awareness.',
                  steps: [
                    'Install Cursor AI and connect your GitHub repository.',
                    'Use Vibe-Coding prompts to structure database tables and frontend UX.',
                    'Deploy directly to Vercel for instant global hosting.'
                  ],
                  toolName: 'Cursor.com',
                  externalUrl: 'https://www.cursor.com'
                },
                {
                  tag: 'Business Opportunity',
                  title: 'Building 24/7 AI Voice Operators with LiveKit & Twilio',
                  desc: 'A step-by-step breakdown on selling AI phone receptionists to high-ticket local businesses.',
                  mrrUsd: [5_000, 25_000] as const,
                  buildTime: '1-2 Weeks',
                  techStack: ['LiveKit WebRTC', 'Twilio Voice', 'Gemini Live / OpenAI Realtime', 'Supabase'],
                  opportunity: 'Local services (plumbing, legal, clinics) miss 30% of after-hours calls. Voice AI automates bookings seamlessly.',
                  steps: [
                    'Configure real-time WebRTC streams with LiveKit Voice Cloud.',
                    'Connect inbound phone numbers via Twilio SIP.',
                    'Store business FAQs in Supabase so the agent answers reliably.'
                  ],
                  toolName: 'LiveKit.io',
                  externalUrl: 'https://livekit.io'
                },
                {
                  tag: 'Top AI News',
                  title: 'Vercel v0: Generative Frontend Code Synthesis',
                  desc: 'Describe an interface idea and v0 instantly generates production-grade React and Tailwind components.',

                  buildTime: 'Real-Time (Seconds)',
                  techStack: ['React', 'Tailwind CSS', 'Shadcn UI', 'Next.js App Router'],
                  opportunity: 'Eliminate weeks of mockup design. v0 synthesizes responsive components from simple natural language prompts.',
                  steps: [
                    'Open v0.dev and describe your desired UI layout.',
                    'Copy the synthesized React component code into your Next.js project.',
                    'Hook up Supabase for authentication and database logic.'
                  ],
                  toolName: 'v0.dev by Vercel',
                  externalUrl: 'https://v0.dev'
                }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-zinc-900/40 rounded-2xl border border-zinc-800 p-5 space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                >
                  {/* The heading opens the thing the heading names.

                      It used to be an <h4>, so pressing it did nothing at all,
                      and the only link on the card went to the tool vendor's
                      front page — cursor.com, v0.dev. Somebody reading
                      "Autonomous Coding & Micro-SaaS with Cursor AI" and
                      pressing it landed on a product homepage that says none
                      of that, which reads as a broken link even though every
                      href was correct. The card was promising an article it
                      never had.

                      What it does have is the briefing underneath: the stack,
                      the opportunity, the steps. So the heading opens that. */}
                  <button
                    type="button"
                    onClick={() => setSelectedBlueprint(item)}
                    className="space-y-3 text-left w-full group"
                  >
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                      {item.tag}
                    </span>
                    <span className="block font-bold text-sm text-white leading-snug group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </span>
                    <span className="block text-xs text-zinc-400 leading-relaxed">{item.desc}</span>
                  </button>
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    {/* Said for what it is: the tool's own site, not a piece
                        of writing about it. */}
                    <a 
                      href={item.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      title={t('feed.theirSite', 'Their own site — not an article')}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 min-h-[32px] flex-shrink-0"
                    >
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.toolName}</span>
                    </a>

                    <button 
                      onClick={() => setSelectedBlueprint(item)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-colors"
                    >
                      <span>{t('feed.inspect')}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* 🔐 AUTH & SIGN IN / SIGN UP MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-scrim/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-2 text-white">
                <LogIn className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-lg">{authMode === 'signin' ? 'Sign In to FutureBox' : 'Create Account'}</h3>
              </div>
              <button onClick={() => setAuthModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">{t('feed.emailAddress')}</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">{t('home.password', 'Password')}</label>
                <PasswordField
                  value={authPassword}
                  onChange={setAuthPassword}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-60"
              >
                {authBusy ? t('auth.working') : authMode === 'signin' ? 'Sign In' : 'Create Free Account'}
              </button>
            </form>

            {authError && <p className="text-sm text-rose-400 text-center leading-relaxed">{authError}</p>}
            {authNotice && <p className="text-sm text-emerald-400 text-center leading-relaxed">{authNotice}</p>}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => openAuth(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                {authMode === 'signin' ? "Don't have an account? Sign up free" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans and one-off prices. Every figure comes from plans.ts, in rand. */}
      {pricingModalOpen && (
        <div className="fixed inset-0 z-50 bg-scrim/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">{t('pay.title')}</h3>
                <p className="text-sm text-zinc-400 pt-1">
                  {canCharge === false ? t('pay.sub') : t('pay.subLive', 'A month at a time. Cancel from inside the app whenever you like.')}
                </p>
              </div>
              <button onClick={() => setPricingModalOpen(false)} className="text-zinc-400 hover:text-white flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Every tier, free included. Leaving free off this screen made an
                upgrade look like the only way to use the app, and left the
                person on it with no idea what they already had. */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TIERS.map((id) => {
                const spec = TIER_SPECS[id];
                const current = userPlan === id;
                const featured = id === 'studio';
                return (
                  <div
                    key={id}
                    className={`rounded-2xl border p-4 space-y-3 flex flex-col ${
                      featured ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-black/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{spec.name}</p>
                        {featured && (
                          <span className="text-[11px] uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            {t('pay.most')}
                          </span>
                        )}
                      </div>
                      <p className="text-3xl font-black text-white pt-1">{tierPrice(id, region).display}</p>
                      {spec.rand > 0 && <p className="text-sm text-zinc-500">{t('pay.perMonth')}</p>}
                      <p className="text-sm text-zinc-400 pt-2 leading-relaxed">{spec.who}</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {spec.includes.map((line) => (
                        <li key={line} className="text-sm text-zinc-300 flex gap-2 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-1" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      // Free is not something anybody buys, so its button never
                      // starts a checkout — it only ever says where you are.
                      disabled={current || id === 'free' || planBusy !== null}
                      onClick={async () => {
                        if (id === 'free') return;
                        // The server reads the tier from the memberships table,
                        // so flipping it in the browser would show an upgrade
                        // that nothing behind the page believes in. Either this
                        // starts a real checkout, or it says why it cannot.
                        setPlanBusy(id);
                        const problem = await startCheckout({ kind: 'plan', tier: id });
                        setPlanBusy(null);
                        if (problem) setPlanNote(problem);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                        featured
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-onAccent'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {current
                        ? t('pay.current')
                        : id === 'free'
                          ? t('pay.freeAlways', 'Always free')
                          : planBusy === id
                            ? t('pay.starting')
                            : t('pay.choose')}
                    </button>
                  </div>
                );
              })}
            </div>

            {planNote && (
              <p className="text-sm text-amber-300 text-center leading-relaxed">{planNote}</p>
            )}
            <p className="text-sm text-zinc-500 text-center leading-relaxed">
              {t('pay.afterPaying')}
            </p>
          </div>
        </div>
      )}

      {/* The packs, at the only moment they are ever shown. */}
      <OutOfCredits short={short} packs={packs} onClose={() => setShort(null)} />

      {/* 🚀 CREATOR STUDIO & AI MUSIC HUB (WITH MASTER GENRE SOUNDBOARD, VOICE STUDIO & DIRECTOR) */}
      {/* ── The welcome, as its own page ──────────────────────────────────

          It was inside the studio, sharing the shell with the rail and the
          copilot — which made it read as a room rather than as an arrival, and
          put a navigation list beside a screen whose entire job is to say
          where to go. It is its own page now, over everything, and a room
          chosen on it opens the studio at that room.

          Above the studio's own layer, because it is the thing you arrive at
          and the studio is what you arrive into. */}
      {atDoor && (
        <div className="fixed inset-0 z-[55] bg-zinc-950 overflow-y-auto">
          {/* Top-aligned with room around it, not vertically centred.

              Centring inside a scrolling box is the classic way to make the
              top of a tall page unreachable: `items-center` overflows in both
              directions and only the bottom half can be scrolled to. On a
              short phone, with the picture and six room buttons, this page is
              taller than the screen — so the greeting itself would have been
              the part nobody could reach. */}
          <div className="min-h-full p-4 sm:p-8 pt-8 sm:pt-16 pb-16 flex justify-center">
            <Greeting
              name={user?.name}
              onGo={(id) => {
                setUploadModalOpen(true);
                goToRoom(id);
              }}
              onClose={() => setAtDoor(false)}
            />
          </div>
        </div>
      )}

      <Account
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        email={user?.email}
        name={user?.name}
        handle={user?.handle}
        plan={userPlan}
        region={region}
        onSeePlans={() => setPricingModalOpen(true)}
        onGoToChannel={() => {
          setUploadModalOpen(true);
          setAtDoor(false);
          goToRoom('channels');
        }}
      />

      {uploadModalOpen && (
        /* The studio takes the whole window.
           It used to be a card floated in the middle of a dimmed page: sixteen
           pixels of padding, a rounded border, another thirty-two inside it,
           and a cap of 80rem however wide the screen was. On a laptop that
           left the working surface about half the width it could have had,
           with its own scrollbar inside a page that was not scrolling — which
           is what "cramped" was.
           Nothing here is a dialogue you answer and dismiss. It is the room
           you work in, so it gets the room. */
        <CopilotBusContext.Provider value={copilotBus}>
        <Search
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onGo={(surface, openTitle) => {
            goToRoom(surface);
            // The same hand-off the advert desk uses: the room is not mounted
            // yet, so this waits for it and fires the moment it registers.
            if (openTitle) copilotBus.handoff(surface, 'pick_song', openTitle);
          }}
        />
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-hidden">
          {/* One column that scrolls, on a phone. Two panes that scroll
              independently, on a desktop.

              The desktop shape was applied at every width, so on a phone the
              working surface got whatever was left after a fixed 384-pixel
              copilot — a sliver of the actual work under a panel three times
              its height. The thing being made should have the room, and the
              copilot should be under it rather than beside it. */}
          <div className="w-full h-full p-3 md:p-5 flex flex-col gap-4 overflow-y-auto md:overflow-hidden">
            
            {/* Top Back Bar */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-800 pb-4">
              <button
                onClick={() => setUploadModalOpen(false)}
                aria-label={t('feed.backToPlatform')}
                className="flex items-center justify-center sm:justify-start space-x-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 sm:px-4 py-2 min-h-[44px] min-w-[44px] sm:min-w-0 rounded-xl transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
                {/* The words go on a phone and the arrow stays. "Back to
                    FutureBox" wraps to two lines at 390 pixels and takes a
                    third of the header with it, for a control whose meaning a
                    left arrow in the top-left corner already carries. */}
                <span className="hidden sm:inline">{t('feed.backToPlatform')}</span>
              </button>

              <div className="flex items-center gap-2 justify-end min-w-0">
                {/* What is left, where the spending happens.

                    It was in the landing header only — which is the one screen
                    where nothing costs anything. Inside the studio, where every
                    generation draws on it, there was no number at all, so the
                    first time anybody learned their balance was when a
                    generation refused. */}
                <Balance
                  reloadKey={spent}
                  onTopUp={(wallet) => {
                    setPacks(wallet.packs);
                    setShort({ need: 0, balance: wallet.balance, message: '' });
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2"
                >
                  <SearchIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('search.open', 'Search')}</span>
                  {/* Shown rather than hidden: a shortcut nobody is told about
                      is a shortcut nobody uses. */}
                  <kbd className="hidden md:inline text-xs font-mono text-zinc-500 border border-zinc-700 rounded px-1">
                    ⌘K
                  </kbd>
                </button>
                {/* The handle on a phone, the whole address on a screen with
                    room for it. Wrapped over two lines it was the largest
                    thing in the header and the least useful — an address
                    nobody taps, above the work. */}
                <span
                  title={profileAddress(creatorDomain)}
                  className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap max-w-full truncate"
                >
                  <span className="sm:hidden">@{creatorDomain.replace(/^@/, '')}</span>
                  <span className="hidden sm:inline">{profileAddress(creatorDomain)}</span>
                </span>
              </div>
            </div>

            {/* Studio shell: rail on the left, one working surface on the right. */}
            <div className={`flex-1 min-h-0 ${theme.layout === 'top' ? 'flex flex-col gap-6' : 'flex flex-col md:flex-row gap-6'}`}>
              {/* Every room, on a phone.

                  A menu rather than a scroller: the room you are in, and one
                  press to any other, under the same stage headings the rail
                  uses beside it on a desktop. Hidden from md up, where the
                  rail already shows all fourteen without scrolling. */}
              <div className="md:hidden relative flex-shrink-0">
                {/* The mark, not the room.

                    It wore whichever room was open, so the way between rooms
                    was labelled "Make a song" — which reads as the name of the
                    screen you are looking at, not as the way off it. Nobody
                    presses the title of the page they are already on. It is
                    the FutureBox mark now, the same one the rail uses for the
                    way back, and it is green, because this is the one control
                    on a phone that everything else is reached through. */}
                <button
                  type="button"
                  onClick={() => setRoomsOpen((open) => !open)}
                  aria-expanded={roomsOpen}
                  aria-haspopup="menu"
                  className="w-full flex items-center gap-3 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3.5 py-3 text-left"
                >
                  <Cpu className="w-[18px] h-[18px] text-emerald-400 flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-emerald-300 leading-tight truncate">
                      {t('rail.all', 'All rooms')}
                    </span>
                    {/* Where you are, underneath. Said quietly: it is a
                        reminder, not the name of the button. */}
                    <span className="block text-xs text-emerald-400/70 leading-tight truncate">
                      {atDoor ? t('hello.home', 'Home') : ROOM_META[studioTab].label}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-400 flex-shrink-0 transition-transform ${roomsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {roomsOpen && (
                  <>
                    {/* A tap anywhere else closes it. Without this the only way
                        out of an opened menu is to pick a room, which makes
                        opening it by accident a trap. */}
                    <button
                      type="button"
                      aria-label={t('rail.close', 'Close the menu')}
                      onClick={() => setRoomsOpen(false)}
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute z-40 left-0 right-0 mt-1.5 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl p-2 space-y-0.5"
                    >
                      {(() => {
                        const go = (run: () => void) => () => {
                          run();
                          setRoomsOpen(false);
                        };
                        const item = (
                          key: string,
                          Icon: typeof Sparkles,
                          label: React.ReactNode,
                          hint: string,
                          active: boolean,
                          onPick: () => void,
                        ) => (
                          <button
                            key={key}
                            type="button"
                            role="menuitem"
                            onClick={go(onPick)}
                            aria-current={active ? 'page' : undefined}
                            className={`w-full text-left rounded-xl flex items-center gap-3 px-3 py-2.5 ${
                              active ? 'bg-zinc-800 text-white' : 'text-zinc-300'
                            }`}
                          >
                            <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-tight">{label}</span>
                              <span className="block text-xs text-zinc-500 leading-tight truncate">{hint}</span>
                            </span>
                          </button>
                        );
                        const room = (id: SurfaceId) => {
                          const meta = ROOM_META[id];
                          const label =
                            id === 'collab' && asks > 0 ? (
                              <>
                                {meta.label}
                                <span
                                  className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-500 text-onAccent text-[11px] font-bold px-1.5 min-w-[18px] h-[18px] align-middle"
                                  aria-label={`${asks} ${t('rail.waiting', 'waiting for an answer')}`}
                                >
                                  {asks}
                                </span>
                              </>
                            ) : (
                              meta.label
                            );
                          return item(id, meta.icon, label, meta.hint, !atDoor && studioTab === id, () => {
                            goToRoom(id);
                            setAtDoor(false);
                          });
                        };
                        return (
                          <>
                            {item('home', Cpu, t('hello.home', 'Home'), t('rail.home.hint', 'Where everything is'), atDoor, () =>
                              setAtDoor(true),
                            )}
                            {STAGES.map((stage) => (
                              <React.Fragment key={stage.id}>
                                <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                  {lang === 'af' ? stage.af : stage.en}
                                </p>
                                {surfacesInStage(stage.id).map(room)}
                              </React.Fragment>
                            ))}
                            {standaloneSurfaces().length > 0 && <div className="h-px bg-zinc-800 mx-3 my-2" />}
                            {standaloneSurfaces().map(room)}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>

              <nav
                className={`${copilotFirst ? 'order-1 md:order-none' : ''} flex-shrink-0 hidden md:flex gap-1 overflow-x-auto md:overflow-visible ${
                  theme.layout === 'top'
                    ? 'flex-row flex-wrap'
                    : theme.layout === 'focus'
                      ? 'md:w-14 md:flex-col md:overflow-y-auto'
                      : 'md:w-56 md:flex-col md:overflow-y-auto'
                }`}
              >
                {(() => {
                  /* The rail was eleven equal-weight rows. Ordered correctly —
                     write, arrange, sing, film, release — but an order nobody
                     can see is not an order, it is a list, and a list of eleven
                     reads as eleven separate products.

                     The stages come from `app/lib/surfaces.ts`, the same
                     registry the copilot reads, so a room cannot be in the rail
                     under one story and described to the copilot under another.
                     Collab has no stage on purpose: it is not a step in making
                     a record, it is who you make it with, and filing it under
                     one would be saying something untrue about when you do it.

                     Headings are for the side rail only. The top layout wraps
                     into rows and the focus layout is fourteen pixels of icon —
                     neither has anywhere to put a word. */
                  const META = ROOM_META;

                  /* The way back to the door.

                     Without it the greeting is a thing that happens to you
                     once and can never be found again — which matters most for
                     the person it was built for, who is the one likely to want
                     a second look at where everything is. */
                  const home = (
                    <button
                      key="home"
                      onClick={() => setAtDoor(true)}
                      title={t('hello.home', 'Home')}
                      aria-current={atDoor ? 'page' : undefined}
                      className={`flex-shrink-0 text-left rounded-xl flex items-center gap-3 transition-all ${
                        theme.layout === 'focus' ? 'md:w-full md:justify-center px-3 py-2.5' : 'md:w-full px-3.5 py-2.5'
                      } ${atDoor ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                    >
                      <Cpu className={`w-[18px] h-[18px] flex-shrink-0 ${atDoor ? 'text-emerald-400' : ''}`} />
                      <span className={theme.layout === 'focus' ? 'md:hidden min-w-0' : 'min-w-0'}>
                        <span className="block text-sm font-semibold leading-tight">
                          {t('hello.home', 'Home')}
                        </span>
                      </span>
                    </button>
                  );

                  const row = (id: SurfaceId) => {
                    const meta = META[id];
                    const Icon = meta.icon;
                    const isActive = studioTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          goToRoom(id);
                          /* And leave the door.

                             Without this, pressing a room in the rail while
                             the door was open set the room behind it and
                             changed nothing on screen — the greeting stayed
                             up and the press did nothing anybody could see.
                             The door's own buttons did it; the thirteen more
                             obvious ones beside them did not. */
                          setAtDoor(false);
                        }}
                        title={`${meta.label} — ${meta.hint}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex-shrink-0 text-left rounded-xl flex items-center gap-3 transition-all ${
                          theme.layout === 'focus' ? 'md:w-full md:justify-center px-3 py-2.5' : 'md:w-full px-3.5 py-2.5'
                        } ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                      >
                        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                        <span className={theme.layout === 'focus' ? 'md:hidden min-w-0' : 'min-w-0'}>
                          <span className="block text-sm font-semibold leading-tight">
                            {meta.label}
                            {/* Somebody is waiting on an answer. Only on the room
                                that can answer, only when the number is real, and
                                counted down to nothing the moment it is dealt
                                with — a badge that lingers is a badge people stop
                                reading. */}
                            {id === 'collab' && asks > 0 && (
                              <span
                                className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-500 text-onAccent text-[11px] font-bold px-1.5 min-w-[18px] h-[18px] align-middle"
                                aria-label={`${asks} ${t('rail.waiting', 'waiting for an answer')}`}
                              >
                                {asks}
                              </span>
                            )}
                          </span>
                          {theme.layout === 'rail' && (
                            <span className="hidden md:block text-xs text-zinc-500 leading-tight truncate">{meta.hint}</span>
                          )}
                        </span>
                      </button>
                    );
                  };

                  if (theme.layout !== 'rail') return [home, ...SURFACE_IDS.map(row)];

                  return (
                    <>
                      {home}
                      <div className="hidden md:block h-px bg-zinc-800 mx-3.5 my-3" />
                      {STAGES.map((stage) => (
                        <React.Fragment key={stage.id}>
                          <p className="hidden md:block px-3.5 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 first:pt-0">
                            {lang === 'af' ? stage.af : stage.en}
                          </p>
                          {surfacesInStage(stage.id).map(row)}
                        </React.Fragment>
                      ))}
                      {standaloneSurfaces().length > 0 && (
                        <div className="hidden md:block h-px bg-zinc-800 mx-3.5 my-4" />
                      )}
                      {standaloneSurfaces().map(row)}
                    </>
                  );
                })()}
              </nav>

              <div className={`${copilotFirst ? 'order-3 md:order-none' : ''} flex-1 min-w-0 md:min-h-0 md:overflow-y-auto space-y-6 md:pr-1`}>


            {/* TAB 2: CUSTOM VOICE STUDIO (USE YOUR OWN VOICE OR CLONE) */}
            {studioTab === 'voice_studio' && (
              <VoiceScreen
                onUpgrade={() => setPricingModalOpen(true)}
                onGoToBooth={() => goToRoom('booth')}
                onGoToPodcast={() => goToRoom('podcast')}
              />
            )}

            {/* HOOKS: cut the bit worth posting, from your own tracks */}
            {studioTab === 'video' && <MusicVideo />}
            {studioTab === 'canvas' && (
              <VideoCanvas onUpgrade={() => setPricingModalOpen(true)} onGoTo={goToRoom} />
            )}
            {studioTab === 'hooks_feed' && <Hooks />}

            {/* MAKE: the button people came for */}
            {studioTab === 'make' && (
              <MakeMusic
                userPlan={userPlan}
                onUpgrade={() => setPricingModalOpen(true)}
                incoming={handoff}
                canvas={canvas}
                setCanvas={setCanvas}
                makeSignal={makeSignal}
                engineReady={engineReady}
                onMade={(track) => {
                  setMadeTrack(track);
                  setTrackCount((count) => count + 1);
                }}
                onGoToChannel={() => goToRoom('channels')}
              />
            )}

            {studioTab === 'channels' && (
              <Channel
                reloadKey={trackCount}
                onUpgrade={() => setPricingModalOpen(true)}
                email={user?.email}
                /* The way from a song to the timeline.

                   The channel offered exactly one thing to do with a finished
                   song — put a video to it — and no way to change the song
                   itself, which is the room next door and was reachable only
                   by going there and finding it in a list. */
                onEdit={(id) => {
                  setEditSong(id);
                  goToRoom('studio');
                }}
              />
            )}
            {studioTab === 'booth' && (
              <Booth
                onGoToMake={() => goToRoom('make')}
                onMade={(track) => {
                  setMadeTrack(track);
                  setTrackCount((count) => count + 1);
                }}
              />
            )}

            {studioTab === 'live' && <LiveChannel onGoToMake={() => goToRoom('make')} />}

            {studioTab === 'podcast' && <PodcastStudio onUpgrade={() => setPricingModalOpen(true)} />}

            {studioTab === 'sound' && (
              <SoundTrainer
                standalone
                reloadKey={trackCount}
                onUpgrade={() => setPricingModalOpen(true)}
              />
            )}

            {studioTab === 'campaign' && (
              <Campaign
                onGoTo={goToRoom}
                /* Handed over rather than dispatched: the desk being written to
                   is not mounted yet at the moment the button is pressed. */
                onUseShot={(shot) => copilotBus.handoff('canvas', 'set_prompt', shot)}
                onUseScript={(line) => copilotBus.handoff('voice_studio', 'set_script', line)}
              />
            )}

            {/* STUDIO: your own song, in its own sections, over its own audio */}
            {studioTab === 'studio' && (
              <SongSections
                reloadKey={trackCount}
                open={editSong}
                onRemake={(next) => {
                  setHandoff(next);
                  setCanvas(next);
                  goToRoom('make');
                  setMakeSignal((n) => n + 1);
                }}
              />
            )}

            {/* TAB 5: COLLAB RADAR (PODCASTS, TIKTOK LIVE, FLAVOUR MATCHING, VIRAL POSTS) */}
            {studioTab === 'collab' && (
              <div className="space-y-6">
                {/* Anything waiting on an answer comes first — a request sitting
                    unanswered under two screens of matching is a request that
                    goes unanswered. Then the matching, then the pitch tools. */}
                <CollabRoom reloadKey={collabSignal} />
                <CollabFinder
                  reloadKey={trackCount}
                  onAsked={() => setCollabSignal((n) => n + 1)}
                />
                <CollabRadar
                profile={creatorProfile}
                userPlan={userPlan}
                onUpgrade={() => setPricingModalOpen(true)}
                />
              </div>
            )}



                {/* Where the work goes from here.

                    The studio had exactly one hand-off: a card that appeared
                    after a song landed and offered a music video. It was the
                    right idea in one place out of eleven, which meant that in
                    the other ten a finished piece of work ended in silence and
                    the person had to go back to the rail and guess.

                    Each room now names its own next step, in the registry, and
                    the rooms that are genuinely an end in themselves — the live
                    room, the podcast feed, collab — name nothing and show
                    nothing. It is a suggestion at the bottom of the page, not a
                    funnel: it never moves anybody on its own. */}
                {(() => {
                  const onward = SURFACES[studioTab].next;
                  if (!onward) return null;
                  return (
                    <div className="pt-2 pb-1 border-t border-zinc-800 flex items-center justify-between gap-4">
                      <p className="text-xs text-zinc-500">{t('rail.next', 'Next')}</p>
                      <button
                        type="button"
                        onClick={() => goToRoom(onward.to)}
                        className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3.5 py-2 transition-colors"
                      >
                        <span>{lang === 'af' ? onward.af : onward.en}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Third pane: the thing you talk to. It writes to the same canvas
                  the middle pane edits, so asking for something and typing it
                  yourself land in exactly the same place. */}
              {/* On a phone it sizes to its content and sits at the foot of the
                  page; the fixed height was a desktop measurement applied where
                  there was no second column to measure against. */}
              <aside className={`${copilotFirst ? 'order-2 md:order-none' : ''} flex-shrink-0 w-full md:w-80 lg:w-96 md:min-h-0 md:h-auto min-h-[22rem]`}>
                <Copilot
                  context={{
                    surface: studioTab,
                    ...taste,
                    title: canvas.title,
                    style: canvas.style,
                    lyrics: canvas.lyrics,
                    trackCount,
                    engineReady,
                  }}
                  onAction={(action: CopilotAction) => {
                    if (action.kind === 'surface_op') {
                      // The room takes it, or nothing happens. There is
                      // deliberately no fallback: silently doing something else
                      // is worse than doing nothing, because the reply already
                      // said what it was going to do.
                      copilotBus.dispatch(studioTab, action.op, action.value);
                      return;
                    }
                    if (action.kind === 'set_title') setCanvas({ ...canvas, title: action.value });
                    if (action.kind === 'set_style') setCanvas({ ...canvas, style: action.value });
                    if (action.kind === 'set_lyrics') setCanvas({ ...canvas, lyrics: action.value });
                    if (action.kind === 'generate') {
                      goToRoom('make');
                      setMakeSignal((n) => n + 1);
                    }
                    if (action.kind === 'go') {
                      // Every room in the rail, not the six this used to allow:
                      // the copilot could not name the Booth, the video desk,
                      // the channel, the live room or the voice studio, so in
                      // five of the eleven rooms it could not even say where it
                      // was. The registry vets the name and resolves what a
                      // person calls a screen to what the studio calls it.
                      const tab = resolveSurfaceId(action.value);
                      if (tab) goToRoom(tab);
                    }
                  }}
                />
              </aside>
            </div>

          </div>
        </div>
        </CopilotBusContext.Provider>
      )}

      {/* After a song lands: the one thing most people want next. Asked once,
          and dismissable — it is a suggestion, not a funnel. */}
      {madeTrack && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-2xl border border-amber-500/40 bg-zinc-900 shadow-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-white">{t('video.suggest')}</p>
          <p className="text-sm text-zinc-400 leading-relaxed">{madeTrack.title}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                goToRoom('video');
                setUploadModalOpen(true);
                setMadeTrack(null);
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent"
            >
              {t('video.suggestGo')}
            </button>
            <button
              type="button"
              onClick={() => setMadeTrack(null)}
              className="px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300"
            >
              {t('video.suggestNo')}
            </button>
          </div>
        </div>
      )}

      {/* 🎨 APPEARANCE PANEL */}
      {themeOpen && <ThemeStudio theme={theme} setTheme={setTheme} onClose={() => setThemeOpen(false)} />}

      {/* 🎬 UNIVERSAL MEDIA PLAYER MODAL */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-scrim/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-white text-sm">{selectedMedia.title}</h3>
                {selectedMedia.host && <p className="text-xs text-zinc-400">{selectedMedia.host}</p>}
              </div>
              <button onClick={() => setSelectedMedia(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe 
                src={selectedMedia.embedUrl} 
                title={selectedMedia.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-4 bg-black/50 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">{t('feed.streamNote')}</span>
              <a 
                href={selectedMedia.externalUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
              >
                <span>{t('feed.openYouTube')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 BLUEPRINT MODAL */}
      {selectedBlueprint && (
        <div className="fixed inset-0 z-50 bg-scrim/85 backdrop-blur-lg flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {selectedBlueprint.tag}
                </span>
                <h3 className="font-extrabold text-lg text-white leading-snug pt-1">{selectedBlueprint.title}</h3>
              </div>
              <button onClick={() => setSelectedBlueprint(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {selectedBlueprint.mrrUsd && (
                <div className="bg-black/40 border border-zinc-800 p-3.5 rounded-2xl flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    {/* Said as what it is. A bare figure under "Revenue
                        Potential" reads as a forecast this app is making. */}
                    <p className="text-[10px] uppercase text-zinc-500">
                      Reported by operators · not verified here
                    </p>
                    <p className="text-xs font-bold text-white">
                      {priceFor(selectedBlueprint.mrrUsd[0], region).display} –{' '}
                      {priceFor(selectedBlueprint.mrrUsd[1], region).display} a month
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-black/40 border border-zinc-800 p-3.5 rounded-2xl flex items-center space-x-3">
                <Clock className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">{t('home.buildTime', 'Build time')}</p>
                  <p className="text-xs font-bold text-white">{selectedBlueprint.buildTime}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>{t('feed.marketOpp')}</span>
              </label>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedBlueprint.opportunity}</p>
            </div>

            {/* The steps.

                They were in the data from the first day and rendered nowhere:
                the card said "Open the blueprint" and what opened was a
                paragraph and a link to the vendor. Three numbered steps is
                the one part of this that is actually a blueprint. */}
            {selectedBlueprint.steps && selectedBlueprint.steps.length > 0 && (
              <div className="space-y-2.5 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t('feed.howTo', 'How it is built')}
                </p>
                <ol className="space-y-2">
                  {selectedBlueprint.steps.map((step, at) => (
                    <li key={step} className="flex gap-2.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                        {at + 1}
                      </span>
                      <span className="min-w-0">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2 border-t border-zinc-800">
              <a 
                href={selectedBlueprint.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="min-w-0 truncate">{t('feed.visitSite', 'Their site')} ({selectedBlueprint.toolName})</span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
              <button 
                onClick={() => setSelectedBlueprint(null)}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all flex-shrink-0"
              >
                {t('feed.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📧 6. MARKETING & SPONSORSHIP CONTACT FOOTER */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 mt-16 px-6 py-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-onAccent font-bold" />
              </div>
              <span className="text-lg font-black text-white">FUTURE<span className="text-emerald-400">BOX</span></span>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              The premier digital learning platform and Creative AI ecosystem designed for the future of work, intelligence, and artistic creation. 
              Reach thousands of visionary entrepreneurs, AI researchers, and builders worldwide.
            </p>

            <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-[11px] uppercase text-emerald-400 font-bold flex items-center space-x-1.5">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{t('spon.benefits')}</span>
              </span>
              <ul className="text-xs text-zinc-300 space-y-1.5">
                {SPONSORSHIP.map((rung) => (
                  <li key={rung.id}>
                    <span className="font-bold text-white">{rung.name}</span>
                    <span className="text-emerald-400"> · {sponsorshipPrice(rung, region, lang)}</span>
                    <span className="block text-zinc-400 leading-snug">{rung.gets}</span>
                  </li>
                ))}
              </ul>
              {/* Said plainly, because it is the reason to sponsor this rather
                  than buy impressions somewhere with more of them. */}
              <p className="text-xs text-zinc-500 leading-relaxed pt-1">
                No banners, no pop-ups, nothing down the sides — there is nothing of that
                kind to buy here. What a sponsor gets is their name on something worth
                putting it on, and the counters on this page as the report.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-6 md:p-8 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-white">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h4 className="font-extrabold text-base">{t('home.advertiseWithUs', 'Advertise on FutureBox')}</h4>
            </div>
            <p className="text-xs text-zinc-400">{t('spon.intro')}</p>

            <form onSubmit={handleMarketingSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your Name / Company"
                  className="bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t('feed.emailAddress')}
                  className="bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-2.5">
                <select
                  value={budget}
                  onChange={(e) => setContactBudget(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {/* Priced in rand, because the audience is. The floor is
                      deliberately high: it is the filter. */}
                  {SPONSORSHIP.map((rung) => (
                    <option key={rung.id} value={`${rung.name} — ${sponsorshipPrice(rung, region, lang)}`}>
                      {rung.name} — {sponsorshipPrice(rung, region, lang)}
                    </option>
                  ))}
                </select>

                {/* The answer to "what do I get", before they have to ask it. */}
                <Placement rung={chosenRung} who={contactName} />
              </div>

              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe your product, campaign goals, or partnership proposal..."
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-20"
                required
              />

              {contactSent && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t('spon.sent', 'Sent. You will get a reply at the address you gave.')}</span>
                </div>
              )}

              {contactProblem && (
                <p className="text-xs text-amber-400 leading-snug">{contactProblem}</p>
              )}

              <button
                type="submit"
                disabled={contactBusy}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {contactBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{t('spon.send')}</span>
              </button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 FutureBox Platform. All rights reserved.</p>
          {/* These were three plain spans — words that looked like policies
              and led nowhere. Privacy and Terms are real documents now and are
              linked from the site footer just below, once, rather than from
              every page's own footer. */}
        </div>
      </footer>

    </div>
  );
}
