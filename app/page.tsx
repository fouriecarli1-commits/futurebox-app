'use client';

import React, { useEffect, useState } from 'react';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, ListMusic, 
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X,
  UploadCloud, FileVideo, Music, Headphones, Lightbulb, Code2, 
  Link as LinkIcon, AlertCircle, Layers, DollarSign, Clock, 
  BookOpen, Bookmark, GraduationCap, Mic, Disc3, ExternalLink, Globe,
  Crown, Lock, Zap, RefreshCw, Send, Mail, Check, Star,
  ArrowLeft, User, LogIn, ChevronDown, SlidersHorizontal, 
  Copy, Video, Flame, Library, PlayCircle, Mic2, Pause, Heart,
  Share2, Repeat, Sliders, Smartphone, Monitor, Eye, Handshake, Trophy, Paintbrush
} from 'lucide-react';
import {
  AI_MODELS, ROLE_LABELS, ROLE_ACCENTS, TRACK_FLAVOURS, groupByRole, modelByName,
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
import Copilot, { type CopilotAction } from './components/Copilot';
import type { Canvas } from './components/MakeMusic';
import type { Track } from './lib/library';
import { probeAudio } from './lib/engines';
import Masterclasses from './components/Masterclasses';
import { Counters, Views, useBoard } from './components/Counters';
import Placement from './components/Placement';
import PodcastStudio from './components/PodcastStudio';
import { signal } from './lib/signal';
import { TRACK_LABELS } from './data/masterclasses';
import type { EventKind } from './lib/server/stats';
import Landing from './components/Landing';
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
import { TIER_SPECS, TIERS, SPONSORSHIP, sponsorshipBand, tierPrice } from './lib/plans';
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
  const { t } = useLang();
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
  useEffect(() => {
    const saved = loadTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // With an account behind the app, a refresh should not sign you out and a
  // sign-out in another tab should not leave this one looking signed in.
  useEffect(() => {
    if (!cloud.configured()) return;
    let live = true;
    cloud.currentAccount().then((account) => {
      if (live && account) setUser({ ...account, followers: 1 });
    });
    const stop = cloud.onAccountChange((account) => {
      setUser(account ? { ...account, followers: 1 } : null);
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
  const [studioTab, setStudioTab] = useState<'video' | 'voice_studio' | 'hooks_feed' | 'channels' | 'collab' | 'studio' | 'make' | 'podcast'>('make');
  const [selectedGenreCategory, setSelectedGenreCategory] = useState<string>('All');
  const [playingGenreSample, setPlayingGenreSample] = useState<string | null>(null);

  // Studio Form State
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [creatorDomain, setCreatorDomain] = useState('anrefourie');
  const [title, setTitle] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Suno v5', 'Runway Gen-3', 'ElevenLabs Voice']);
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
    (rung) => `${rung.name} — ${sponsorshipBand(rung, region)} / month`,
  );
  const budget = budgetOptions.indexOf(contactBudget) !== -1 ? contactBudget : budgetOptions[0];
  const chosenRung = SPONSORSHIP[Math.max(0, budgetOptions.indexOf(budget))];
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

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

  const availableTools = AI_MODELS.map((m) => m.name);

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
        thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
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
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
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
        thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
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
        thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
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
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
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
        thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
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

  const handleAiScanRefresh = () => {
    setIsScanning(true);
    setScanMessage('Finding different ones…');
    setTimeout(() => {
      setIsScanning(false);
      setStreamCycle(prev => prev + 1);
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
  };

  // Reopening the modal should not show the last attempt's error.
  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthNotice(null);
    setAuthModalOpen(true);
  };

  const handleMarketingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:admin@futurebox.app?subject=Sponsorship & Marketing Inquiry from ${encodeURIComponent(contactName)} (${encodeURIComponent(budget)})&body=${encodeURIComponent(`Name: ${contactName}\nEmail: ${contactEmail}\nBudget: ${budget}\nWhat that includes: ${chosenRung.gets}\nMessage:\n${contactMessage}`)}`;
    window.location.href = mailtoUrl;
    setContactSent(true);
    setTimeout(() => setContactSent(false), 5000);
  };

  const toggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
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
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
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
              <button
                type="button"
                onClick={() => void handleGoogle()}
                className="w-full py-3 rounded-xl bg-white text-zinc-900 font-bold text-sm flex items-center justify-center gap-2.5 hover:opacity-90"
              >
                <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16.2z" />
                  <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C1 17 0 20.4 0 24s1 7 2.6 10.1l7.8-5.4z" />
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.7-3.7-13.6-9.1l-7.8 5.4C6.5 42.6 14.6 48 24 48z" />
                </svg>
                {t('welcome.google', 'Continue with Google')}
              </button>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-zinc-800" />
                <span className="text-xs text-zinc-600 uppercase tracking-wider">
                  {t('auth.or', 'or')}
                </span>
                <span className="h-px flex-1 bg-zinc-800" />
              </div>
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-onAccent flex flex-col justify-between">
      
      {/* 1. Header with Auth & Creator Channel Info */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/90 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
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

        {/* Tab Filters */}
        <nav className="hidden lg:flex items-center space-x-1 bg-zinc-900/90 p-1.5 rounded-full border border-zinc-800">
          {[
            { id: 'all', label: 'Spotlight', icon: Compass },
            { id: 'futurebox', label: 'FutureBox Podcasts', icon: Headphones },
            { id: 'masterclasses', label: 'Masterclasses', icon: GraduationCap },
            { id: 'creations', label: 'Creative AI Music & Video', icon: Sparkles },
            { id: 'radar', label: 'AI Trends Radar', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-onAccent shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Top Right Action & Auth Portal */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <button
                onClick={() => setStudioTab('make')}
                title={t('auth.yourChannel')}
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
              <span>Sign In</span>
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
            <span className="text-xs font-mono text-emerald-400 hidden sm:flex items-center space-x-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>PRO Active</span>
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
                  <p className="text-[10px] font-mono uppercase text-zinc-500 px-3 py-1">Curated High-Growth Podcasters</p>
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
                  <p className="text-[10px] font-mono uppercase text-zinc-500 px-3 py-1">Cross-Platform Compilations</p>
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
              setStudioTab(tab);
            }}
            onAppearance={() => setThemeOpen(true)}
          />
        )}

        {/* 🟢 REGENERATION & AI TRENDS RADAR BANNER */}
        <section className="bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white">Today&apos;s picks</p>
              <p className="text-zinc-400 text-[13px]">{scanMessage}</p>
            </div>
          </div>

          <button
            onClick={handleAiScanRefresh}
            disabled={isScanning}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-onAccent text-xs font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Looking…' : 'Show me different ones'}</span>
          </button>
        </section>

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
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold rounded-full flex items-center space-x-1.5">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                    <span>{t('feed.freeClass')}</span>
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">1h 00m • Andrej Karpathy</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Intro to Large Language Models: How Neural Networks Think
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  The world-renowned masterclass by Andrej Karpathy (Former Director of AI at Tesla & Co-founder of OpenAI) explaining how modern neural networks work and what lies ahead.
                </p>

                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 tracking-wider">{t('feed.takeaways')}</span>
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
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80" 
                  alt="Spotlight" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
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
            {activeTab === 'futurebox' && <Counters board={board} scope="futurebox" />}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Headphones className="w-5 h-5 text-emerald-400" />
                  <span>FutureBox Podcasts {selectedPodcasterFilter && `(${selectedPodcasterFilter})`}</span>
                </h3>
                <p className="text-xs text-zinc-400">{t('feed.podSub')}</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {activePodcasts.length} Curated Episodes Available
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {activePodcasts.map((pod) => (
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
                      <img src={pod.thumbnail} alt={pod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 text-onAccent flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current translate-x-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                        <Mic className="w-3 h-3" />
                        <span>{pod.duration}</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="text-[11px] font-mono font-bold text-emerald-400 flex items-center justify-between gap-2">
                        <span>{pod.host}</span>
                        <Views board={board} kind="podcast" reference={pod.id} />
                      </p>
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors leading-snug">{pod.title}</h4>
                      <p className="text-xs text-zinc-400">Guest: <span className="text-zinc-200 font-semibold">{pod.guest}</span></p>
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
                      <span>Play Episode</span>
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
            {activeTab === 'masterclasses' && (
              <Counters board={board} scope="masterclasses" labels={TRACK_LABELS} />
            )}
            <Masterclasses userPlan={userPlan} onUpgrade={() => setPricingModalOpen(true)} board={board} />

            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span>{t('feed.featured')}</span>
                </h3>
                <p className="text-xs text-zinc-400">{t('feed.featuredSub')}</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Verified Masterclasses
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  id: 'mc-1',
                  title: 'Building & Scaling a $50k/MRR AI Micro-SaaS Solo',
                  instructor: 'Garry Tan (CEO, Y Combinator)',
                  duration: '45m',
                  level: 'Business & Founders',
                  thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
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
                  thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
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
                  thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
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
                        <img src={mc.thumbnail} alt={mc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isLocked ? (
                            <div className="w-12 h-12 rounded-full bg-amber-500 text-onAccent flex items-center justify-center shadow-lg">
                              <Lock className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-cyan-400 text-onAccent flex items-center justify-center shadow-lg">
                              <Play className="w-5 h-5 fill-current translate-x-0.5" />
                            </div>
                          )}
                        </div>
                        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                          {mc.level} • {mc.duration}
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <p className="text-[11px] font-mono text-zinc-400">Instructor: <span className="text-white font-semibold">{mc.instructor}</span></p>
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
            {activeTab === 'creations' && <Counters board={board} scope="creations" />}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>{t('feed.creations')}</span>
                </h3>
                <p className="text-xs text-zinc-400">{t('feed.creationsSub')}</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Creator Channels
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  id: 'ai-1',
                  title: 'Cherry Blossom Mail (Official AI Music Video)',
                  creator: 'Anre Fourie',
                  domain: 'futurebox.app/@anrefourie',
                  medium: 'Jingle Pop / Acoustic',
                  tools: ['Suno v5.5', 'Runway Gen-3'],
                  prompt: 'jingle style, 96 BPM, major key, claps and hand percussion, brushed snare, pedal steel swells, acoustic guitar strums',
                  thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
                  embedUrl: 'https://www.youtube.com/embed/bk-nQ7HF6k4',
                  externalUrl: 'https://suno.com',
                  type: 'youtube' as const
                },
                {
                  id: 'ai-2',
                  title: 'Paul Gaan Skool Toe (AI Folk Rock Release)',
                  creator: 'Anre Fourie',
                  domain: 'futurebox.app/@anrefourie',
                  medium: 'Pop Rock & Anthemic Folk',
                  tools: ['Suno v5.5', 'Kling AI'],
                  prompt: 'pop rock, anthemic pop, close-miked female vocals, layered electric guitars, punchy kick, clapping snare, upright bass',
                  thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
                  embedUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
                  externalUrl: 'https://runwayml.com',
                  type: 'youtube' as const
                },
                {
                  id: 'ai-3',
                  title: 'BRICKZ — FORGET YESTERDAY (Official AI Video)',
                  creator: 'JL Records',
                  domain: 'futurebox.app/@brickz',
                  medium: 'Sci-Fi Dance & Visual Hook',
                  tools: ['Suno AI', 'Sora Experimental'],
                  prompt: 'retro-futuristic robotic dancers with radio helmets, yellow coat, high-energy synth hook, 128 bpm',
                  thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
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
                      <img src={creation.thumbnail} alt={creation.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {creation.tools.map((tool, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-black/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 rounded-md border border-cyan-500/30">
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
                        <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">{creation.medium}</span>
                        <span className="text-[10px] font-mono text-zinc-400 bg-black/50 px-2 py-0.5 rounded border border-zinc-800">{creation.domain}</span>
                      </div>
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors leading-snug">{creation.title}</h4>
                      <p className="text-xs text-zinc-400 font-mono bg-black/30 p-2.5 rounded-lg border border-zinc-800">
                        <span className="text-cyan-400 font-semibold">Prompt: </span>
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
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30"
                    >
                      <span>Explore</span>
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
            {activeTab === 'radar' && <Counters board={board} scope="radar" />}
            <QualityRadar userPlan={userPlan} onUpgrade={() => setPricingModalOpen(true)} />

            <div className="pt-2">
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>{t('feed.radar')}</span>
              </h3>
              <p className="text-xs text-zinc-400">{t('feed.radarSub')}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
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
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                      {item.tag}
                    </span>
                    <h4 className="font-bold text-sm text-white leading-snug">{item.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <a 
                      href={item.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{item.toolName}</span>
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
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
                <label className="block text-xs font-mono text-zinc-400 mb-1">{t('feed.emailAddress')}</label>
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
                <label className="block text-xs font-mono text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
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
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-7xl h-full max-h-[94vh] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5 overflow-hidden">
            
            {/* Top Back Bar */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-800 pb-4">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('feed.backToPlatform')}</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  futurebox.app/@{creatorDomain}
                </span>
                <button onClick={() => setUploadModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Studio shell: rail on the left, one working surface on the right. */}
            <div className={`flex-1 min-h-0 ${theme.layout === 'top' ? 'flex flex-col gap-6' : 'flex flex-col md:flex-row gap-6'}`}>
              <nav
                className={`flex-shrink-0 flex gap-1 overflow-x-auto md:overflow-visible ${
                  theme.layout === 'top'
                    ? 'flex-row flex-wrap'
                    : theme.layout === 'focus'
                      ? 'md:w-14 md:flex-col md:overflow-y-auto'
                      : 'md:w-56 md:flex-col md:overflow-y-auto'
                }`}
              >
                {[
                  /* The rail follows the order the work happens in: write and
                     generate the song, arrange it, sing on it, put a video to
                     it. Everything after that is what you do with a finished
                     song. */
                  { id: 'make', label: t('rail.make'), hint: t('rail.make.hint'), icon: Sparkles },
                  { id: 'studio', label: t('rail.studio'), hint: t('rail.studio.hint'), icon: Sliders },
                  { id: 'voice_studio', label: t('rail.voice'), hint: t('rail.voice.hint'), icon: Mic2 },
                  { id: 'video', label: t('rail.video'), hint: t('rail.video.hint'), icon: Video },
                  { id: 'hooks_feed', label: t('rail.hooks'), hint: t('rail.hooks.hint'), icon: Smartphone },
                  { id: 'channels', label: t('rail.channel'), hint: t('rail.channel.hint'), icon: ListMusic },
                  { id: 'collab', label: t('rail.collab'), hint: t('rail.collab.hint'), icon: Handshake },
                  { id: 'podcast', label: t('rail.podcast'), hint: t('rail.podcast.hint'), icon: Radio },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = studioTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStudioTab(tab.id as any)}
                      title={`${tab.label} — ${tab.hint}`}
                      className={`flex-shrink-0 text-left rounded-xl flex items-center gap-3 transition-all ${
                        theme.layout === 'focus' ? 'md:w-full md:justify-center px-3 py-2.5' : 'md:w-full px-3.5 py-2.5'
                      } ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                    >
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                      <span className={theme.layout === 'focus' ? 'md:hidden min-w-0' : 'min-w-0'}>
                        <span className="block text-sm font-semibold leading-tight">{tab.label}</span>
                        {theme.layout === 'rail' && (
                          <span className="hidden md:block text-xs text-zinc-500 leading-tight truncate">{tab.hint}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-6 pr-1">


            {/* TAB 2: CUSTOM VOICE STUDIO (USE YOUR OWN VOICE OR CLONE) */}
            {studioTab === 'voice_studio' && (
              <VoiceScreen
                onUpgrade={() => setPricingModalOpen(true)}
                onGoToMake={() => setStudioTab('make')}
              />
            )}

            {/* HOOKS: cut the bit worth posting, from your own tracks */}
            {studioTab === 'video' && <MusicVideo />}
            {studioTab === 'hooks_feed' && <Hooks />}

            {/* MAKE: the button people came for */}
            {studioTab === 'make' && (
              <MakeMusic
                userPlan={userPlan}
                onUpgrade={() => setPricingModalOpen(true)}
                incoming={handoff}
                selectedTools={selectedTools}
                toggleTool={toggleTool}
                canvas={canvas}
                setCanvas={setCanvas}
                makeSignal={makeSignal}
                engineReady={engineReady}
                onMade={(track) => {
                  setMadeTrack(track);
                  setTrackCount((count) => count + 1);
                }}
              />
            )}

            {studioTab === 'channels' && (
              <Channel
                reloadKey={trackCount}
                onUpgrade={() => setPricingModalOpen(true)}
                email={user?.email}
              />
            )}
            {studioTab === 'podcast' && <PodcastStudio onUpgrade={() => setPricingModalOpen(true)} />}

            {/* STUDIO: your own song, in its own sections, over its own audio */}
            {studioTab === 'studio' && (
              <SongSections
                reloadKey={trackCount}
                onRemake={(next) => {
                  setHandoff(next);
                  setCanvas(next);
                  setStudioTab('make');
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



              </div>

              {/* Third pane: the thing you talk to. It writes to the same canvas
                  the middle pane edits, so asking for something and typing it
                  yourself land in exactly the same place. */}
              <aside className="flex-shrink-0 w-full md:w-80 lg:w-96 min-h-0 md:h-auto h-96">
                <Copilot
                  context={{
                    title: canvas.title,
                    style: canvas.style,
                    lyrics: canvas.lyrics,
                    trackCount,
                    engineReady,
                  }}
                  onAction={(action: CopilotAction) => {
                    if (action.kind === 'set_title') setCanvas({ ...canvas, title: action.value });
                    if (action.kind === 'set_style') setCanvas({ ...canvas, style: action.value });
                    if (action.kind === 'set_lyrics') setCanvas({ ...canvas, lyrics: action.value });
                    if (action.kind === 'generate') {
                      setStudioTab('make');
                      setMakeSignal((n) => n + 1);
                    }
                    if (action.kind === 'go') {
                      const allowed = ['make', 'video', 'podcast', 'hooks_feed', 'studio', 'collab'];
                      const tab = action.value === 'hooks' ? 'hooks_feed' : action.value;
                      // The model names a screen; only a real one is honoured.
                      if (allowed.indexOf(tab) !== -1) setStudioTab(tab as typeof studioTab);
                    }
                  }}
                />
              </aside>
            </div>

          </div>
        </div>
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
                setStudioTab('video');
                setUploadModalOpen(true);
                setMadeTrack(null);
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-400 text-onAccent"
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
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
                    <p className="text-[10px] uppercase font-mono text-zinc-500">
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
                  <p className="text-[10px] uppercase font-mono text-zinc-500">Build Time</p>
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

            <div className="flex items-center space-x-3 pt-2 border-t border-zinc-800">
              <a 
                href={selectedBlueprint.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>Visit Official Website ({selectedBlueprint.toolName})</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
              <button 
                onClick={() => setSelectedBlueprint(null)}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Close
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
              <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center space-x-1.5">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{t('spon.benefits')}</span>
              </span>
              <ul className="text-xs text-zinc-300 space-y-1.5">
                {SPONSORSHIP.map((rung) => (
                  <li key={rung.id}>
                    <span className="font-bold text-white">{rung.name}</span>
                    <span className="text-emerald-400"> · {sponsorshipBand(rung, region)}</span>
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
              <h4 className="font-extrabold text-base">Advertise on FutureBox (Contact Sponsorship Team)</h4>
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
                    <option key={rung.id} value={`${rung.name} — ${sponsorshipBand(rung, region)} / month`}>
                      {rung.name} — {sponsorshipBand(rung, region)} / month
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
                  <span>Your email client is opening now to dispatch this sponsorship brief directly!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
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
