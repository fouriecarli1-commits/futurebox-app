'use client';

import React, { useEffect, useState } from 'react';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, 
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X,
  UploadCloud, FileVideo, Music, Headphones, Lightbulb, Code2, 
  Link as LinkIcon, AlertCircle, Layers, DollarSign, Clock, 
  BookOpen, Bookmark, GraduationCap, Mic, Disc3, ExternalLink, Globe,
  Crown, Lock, Zap, RefreshCw, Send, Mail, Check, Star,
  ArrowLeft, User, LogIn, ChevronDown, SlidersHorizontal, Volume2, 
  Copy, Video, Flame, Library, PlayCircle, Mic2, Pause, Heart,
  Share2, Repeat, Sliders, Smartphone, Monitor, Eye, Handshake, Trophy, Paintbrush
} from 'lucide-react';
import {
  AI_MODELS, ROLE_LABELS, ROLE_ACCENTS, TRACK_FLAVOURS, groupByRole, modelByName,
} from './data/studio';
import { profileFromTracks } from './lib/matching';
import CollabRadar from './components/CollabRadar';
import Arena from './components/Arena';
import StudioTimeline from './components/StudioTimeline';
import { guessRegion, REGIONS, regionByCode, type Region } from './lib/pricing';
import ThemeStudio from './components/ThemeStudio';
import QualityRadar from './components/QualityRadar';
import Songwriter from './components/Songwriter';
import MakeMusic from './components/MakeMusic';
import Hooks from './components/Hooks';
import MusicVideo from './components/MusicVideo';
import Copilot, { type CopilotAction } from './components/Copilot';
import type { Canvas } from './components/MakeMusic';
import type { Track } from './lib/library';
import { probeAudio } from './lib/engines';
import Masterclasses from './components/Masterclasses';
import Landing from './components/Landing';
import LanguagePicker from './components/LanguagePicker';
import { useLang } from './lib/i18n';
import { applyTheme, loadTheme, saveTheme, DEFAULT_THEME, type Theme } from './lib/theme';
import { byArea, describe, DEFAULT_PAID, type Plan } from './lib/entitlements';
import * as cloud from './lib/cloud';
import { TIER_SPECS, ONE_OFF, tierPrice, oneOffPrice } from './lib/plans';
import { startCheckout } from './lib/purchases';

interface Blueprint {
  tag: string;
  title: string;
  desc: string;
  mrr?: string;
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

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [userPlan, setUserPlan] = useState<Plan>('free');
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
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
  } | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  // Creator Studio Sub-Tabs & Soundboard
  const [handoff, setHandoff] = useState<{ title: string; lyrics: string; style: string } | null>(null);
  const [studioTab, setStudioTab] = useState<'video' | 'soundboard' | 'voice_studio' | 'hooks_feed' | 'channels' | 'collab' | 'arena' | 'studio' | 'write' | 'make'>('make');
  const [selectedGenreCategory, setSelectedGenreCategory] = useState<string>('All');
  const [playingGenreSample, setPlayingGenreSample] = useState<string | null>(null);

  // Studio Form State
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [vocalVoiceChoice, setVocalVoiceChoice] = useState<'female_pop' | 'male_rock' | 'soft_close' | 'cyber_vocoder'>('female_pop');

  /** What the voice choice means to a music model, in words it reads. */
  const VOICE_DIRECTION: Record<string, string> = {
    female_pop: 'bright higher vocal, clear and forward',
    male_rock: 'lower rough vocal, raspy and pushed',
    soft_close: 'soft close-mic vocal, quiet and almost spoken',
    cyber_vocoder: 'heavily vocoded stacked vocal',
  };

  /**
   * Swaps the voice direction in a style line. Picking a second voice should
   * replace the first, not sing in both — and the directions contain commas, so
   * they have to come out as whole strings rather than as comma-separated parts.
   */
  const withVoice = (style: string, choice: string): string => {
    let rest = style;
    Object.keys(VOICE_DIRECTION).forEach((key) => {
      rest = rest.split(VOICE_DIRECTION[key]).join('');
    });
    const cleaned = rest
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
    return [cleaned, VOICE_DIRECTION[choice]].filter(Boolean).join(', ');
  };
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
  const [contactBudget, setContactBudget] = useState('$1,000 - $5,000 / month');
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
    const mailtoUrl = `mailto:admin@futurebox.app?subject=Sponsorship & Marketing Inquiry from ${encodeURIComponent(contactName)} (${encodeURIComponent(contactBudget)})&body=${encodeURIComponent(`Name: ${contactName}\nEmail: ${contactEmail}\nBudget: ${contactBudget}\nMessage:\n${contactMessage}`)}`;
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
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Digital Learning & Creative AI Ecosystem</p>
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
              <span>Reset All Filters</span>
            </button>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-14 flex-1 w-full">
        
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

        {/* 🎬 1. FEATURED SPOTLIGHT */}
        {(activeTab === 'all') && (
          <section className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-8 md:p-12 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold rounded-full flex items-center space-x-1.5">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                    <span>FREE FEATURED MASTERCLASS</span>
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
                  <span className="text-[11px] font-mono uppercase text-emerald-400 tracking-wider">Key Takeaways for Future Growth</span>
                  <ul className="space-y-1.5">
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>How tokens, transformer architectures, and weights perform computation</span>
                    </li>
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>The evolution of autonomous agent operating systems</span>
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
                      host: 'Andrej Karpathy'
                    })}
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Free Masterclass</span>
                  </button>

                  <a 
                    href="https://www.youtube.com/watch?v=zjkBMFhNj_g" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
                  >
                    <span>Open on YouTube</span>
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
                  host: 'Andrej Karpathy'
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Headphones className="w-5 h-5 text-emerald-400" />
                  <span>FutureBox Podcasts {selectedPodcasterFilter && `(${selectedPodcasterFilter})`}</span>
                </h3>
                <p className="text-xs text-zinc-400">Deep-dive conversations on future wealth, AI disruption, and human potential.</p>
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
                        host: pod.host
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
                      <p className="text-[11px] font-mono font-bold text-emerald-400">{pod.host}</p>
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
                        host: pod.host
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
            <Masterclasses userPlan={userPlan} onUpgrade={() => setPricingModalOpen(true)} />

            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span>Featured this week</span>
                </h3>
                <p className="text-xs text-zinc-400">Advanced architectures, venture creation, and engineering in the AI era.</p>
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
                              host: mc.instructor
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
                            host: mc.instructor
                          })}
                          className="text-cyan-400 font-semibold flex items-center space-x-1 hover:underline"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Masterclass</span>
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
                  <span>Creative AI Music & Music Videos</span>
                </h3>
                <p className="text-xs text-zinc-400">The premier stage for neural music releases, generative music videos, and creator channels.</p>
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
                        type: 'youtube'
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
                    <span>By {creation.creator}</span>
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
            <QualityRadar userPlan={userPlan} onUpgrade={() => setPricingModalOpen(true)} />

            <div className="pt-2">
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>AI Trends & Opportunities Radar</span>
              </h3>
              <p className="text-xs text-zinc-400">High-margin business blueprints, vibe-coded apps, and emerging market frontiers.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  tag: 'Top Vibe Coded App',
                  title: 'Autonomous Coding & Micro-SaaS with Cursor AI',
                  desc: 'How non-coders and engineers build and deploy full applications in under 48 hours.',
                  mrr: '$10k - $50k / month',
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
                  mrr: '$5,000 - $25,000 / month',
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
                  mrr: 'Industry Standard',
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
                      <span>Inspect Blueprint</span>
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
                <label className="block text-xs font-mono text-zinc-400 mb-1">Email Address</label>
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

      {/* 👑 PRICING & PRO UPGRADE MODAL ($19 / MONTH) */}
      {pricingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">{t('pay.title')}</h3>
                <p className="text-sm text-zinc-400 pt-1">{t('pay.sub')}</p>
              </div>
              <button onClick={() => setPricingModalOpen(false)} className="text-zinc-400 hover:text-white flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buy one song, for anyone who will never subscribe. Two steps,
                because opening the whole thing is a much smaller decision than
                keeping it, and the first payment makes the second one easy. */}
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
              <p className="text-sm font-bold text-white">{t('pay.oneOff')}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="text-2xl font-black text-white">
                    {oneOffPrice(ONE_OFF.open.rand, region).display}
                  </p>
                  <p className="text-sm font-semibold text-zinc-200 pt-0.5">{t('pay.open')}</p>
                  <p className="text-sm text-zinc-500 pt-1 leading-relaxed">{t('pay.openNote')}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
                  <p className="text-2xl font-black text-white">
                    {oneOffPrice(ONE_OFF.keep.rand, region).display}
                  </p>
                  <p className="text-sm font-semibold text-emerald-300 pt-0.5">{t('pay.keep')}</p>
                  <p className="text-sm text-zinc-400 pt-1 leading-relaxed">{t('pay.keepNote')}</p>
                </div>
              </div>
            </div>

            {/* The monthly tiers, rendered from the same table the caps come
                from, so the sales copy cannot drift from what the code allows. */}
            <div className="grid md:grid-cols-3 gap-3">
              {(['maker', 'studio', 'label'] as const).map((id) => {
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
                      <p className="text-sm text-zinc-500">{t('pay.perMonth')}</p>
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
                      disabled={current || planBusy !== null}
                      onClick={async () => {
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
                      {current ? t('pay.current') : planBusy === id ? t('pay.starting') : t('pay.choose')}
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
                <span>Back to FutureBox Platform</span>
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
                  { id: 'make', label: t('rail.make'), hint: t('rail.make.hint'), icon: Sparkles },
                  { id: 'video', label: t('rail.video'), hint: t('rail.video.hint'), icon: Video },
                  { id: 'write', label: t('rail.write'), hint: t('rail.write.hint'), icon: Music },
                  { id: 'studio', label: t('rail.studio'), hint: t('rail.studio.hint'), icon: Sliders },
                  { id: 'soundboard', label: t('rail.sound'), hint: t('rail.sound.hint'), icon: Volume2 },
                  { id: 'voice_studio', label: t('rail.voice'), hint: t('rail.voice.hint'), icon: Mic2 },
                  { id: 'hooks_feed', label: t('rail.hooks'), hint: t('rail.hooks.hint'), icon: Smartphone },
                  { id: 'collab', label: t('rail.collab'), hint: t('rail.collab.hint'), icon: Handshake },
                  { id: 'arena', label: t('rail.arena'), hint: t('rail.arena.hint'), icon: Trophy },
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

            {/* TAB 1: MASTER GENRE SOUNDBOARD (EVERY GENRE WITH AUDIO SAMPLES & 1-CLICK USE) */}
            {studioTab === 'soundboard' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-2xl">
                  <div>
                    <h4 className="text-base font-bold text-cyan-300 flex items-center space-x-2">
                      <Volume2 className="w-4 h-4" />
                      <span>Every sound, with an example</span>
                    </h4>
                    <p className="text-sm text-zinc-400 pt-0.5">
                      Hear one before you pick it. &ldquo;Use in Song&rdquo; drops it on the canvas.
                    </p>
                  </div>
                </div>

                {/* Genre Category Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                  {genreCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedGenreCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                        selectedGenreCategory === cat 
                          ? 'bg-emerald-500 text-onAccent font-extrabold shadow-md' 
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Genre Cards Grid */}
                <div className="grid sm:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredGenreSamples.map((genre, i) => {
                    const isPlaying = playingGenreSample === genre.name;
                    return (
                      <div key={i} className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-3 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs uppercase text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {genre.category}
                              </span>
                              <h5 className="font-bold text-sm text-white pt-1">{genre.name}</h5>
                              <p className="text-sm text-zinc-400">{genre.subgenre} • <span className="text-cyan-400">{genre.bpm} ({genre.key})</span></p>
                            </div>

                            <button
                              onClick={() => setPlayingGenreSample(isPlaying ? null : genre.name)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isPlaying ? 'bg-emerald-500 text-onAccent shadow-lg shadow-emerald-500/30 animate-pulse' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              }`}
                            >
                              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                            </button>
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed pt-2">{genre.description}</p>
                        </div>

                        {isPlaying && (
                          <div className="pt-2 border-t border-zinc-800">
                            <audio src={genre.audioUrl} autoPlay controls className="w-full h-8" />
                          </div>
                        )}

                        <div className="bg-black/60 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
                          <span className="text-[13px] text-zinc-400 truncate">{genre.promptSnippet}</span>
                          <button
                            onClick={() => {
                              setCanvas({ ...canvas, style: genre.promptSnippet });
                              setStudioTab('make');
                            }}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded-lg border border-emerald-500/30 flex items-center space-x-1 flex-shrink-0 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Use in Song</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM VOICE STUDIO (USE YOUR OWN VOICE OR CLONE) */}
            {studioTab === 'voice_studio' && (
              <div className="space-y-6">
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl space-y-2">
                  <h4 className="text-sm font-bold text-emerald-300 flex items-center space-x-2">
                    <Mic2 className="w-4 h-4" />
                    <span>Voice</span>
                  </h4>
                  <p className="text-sm text-zinc-400">
                    Pick the voice a song should be sung in. Choosing here sets it for the next song you make.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-zinc-800 p-5 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Your own voice</span>
                    </label>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Singing in your own voice needs a recording of it, and a voice model to match it
                      against. Neither is connected yet, so this is not switched on.
                    </p>
                    <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center">
                      <UploadCloud className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">Not switched on</p>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-zinc-800 p-5 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Or pick a voice</span>
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: 'female_pop', label: 'Higher, bright', desc: 'Clear and forward, sits on top of the track' },
                        { id: 'male_rock', label: 'Lower, rough', desc: 'Raspy and pushed, carries a loud chorus' },
                        { id: 'soft_close', label: 'Soft and close', desc: 'Quiet, near the mic, almost spoken' },
                        { id: 'cyber_vocoder', label: 'Cyber Vocoder Synthesizer', desc: 'Robot-choir vocal, hard-tuned and stacked' }
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setVocalVoiceChoice(item.id as typeof vocalVoiceChoice);
                            setCanvas({ ...canvas, style: withVoice(canvas.style, item.id) });
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            vocalVoiceChoice === item.id 
                              ? 'bg-emerald-950/40 border-emerald-500 text-white' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-white">{item.label}</p>
                            <p className="text-[13px] text-zinc-500">{item.desc}</p>
                          </div>
                          {vocalVoiceChoice === item.id && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStudioTab('make')}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center space-x-2"
                  >
                    <span>Back to the song</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
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

            {/* SONGWRITER: WHERE THE SONG IS ACTUALLY WRITTEN */}
            {studioTab === 'write' && (
              <Songwriter
                userPlan={userPlan}
                onUpgrade={() => setPricingModalOpen(true)}
                onSendToMake={({ title: t, lyrics, style }) => {
                  setHandoff({ title: t, lyrics, style });
                  setCanvas({ title: t, lyrics, style });
                  setStudioTab('make');
                }}
              />
            )}

            {/* STUDIO: THE TIMELINE — point at a bar, say what should change */}
            {studioTab === 'studio' && <StudioTimeline />}

            {/* TAB 5: COLLAB RADAR (PODCASTS, TIKTOK LIVE, FLAVOUR MATCHING, VIRAL POSTS) */}
            {studioTab === 'collab' && (
              <CollabRadar
                profile={creatorProfile}
                userPlan={userPlan}
                onUpgrade={() => setPricingModalOpen(true)}
              />
            )}

            {/* TAB 6: THE ARENA (SKILL-JUDGED COMPETITIONS WITH A FREE ENTRY ROUTE) */}
            {studioTab === 'arena' && <Arena userPlan={userPlan} />}

            {/* TAB 4: HOOKS & REELS FEED (INSPIRED BY SUNO HOOKS & YOUTUBE SHORTS) */}
            {studioTab === 'hooks_feed' && (
              <div className="space-y-4">
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span>What other people are posting</span>
                  </h4>
                  <p className="text-sm text-zinc-400 pt-0.5">
                    Short clips from other creators, for when you want to see what is working.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'BRICKZ — FORGET YESTERDAY',
                      creator: 'JL Records',
                      handle: '@brickz',
                      likes: '978',
                      comments: '75',
                      hookSnippet: 'Forget yesterday, the neural dawn is here...',
                      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
                      embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g'
                    },
                    {
                      title: 'Cherry Blossom Mail (Remix)',
                      creator: 'Anre Fourie',
                      handle: '@anrefourie',
                      likes: '1.4K',
                      comments: '112',
                      hookSnippet: 'Sending letters through the digital ether...',
                      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
                      embedUrl: 'https://www.youtube.com/embed/bk-nQ7HF6k4'
                    }
                  ].map((hook, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden space-y-3 p-4">
                      <div className="aspect-video relative rounded-xl overflow-hidden group cursor-pointer"
                        onClick={() => setSelectedMedia({
                          title: hook.title,
                          embedUrl: hook.embedUrl,
                          externalUrl: 'https://suno.com',
                          type: 'youtube'
                        })}
                      >
                        <img src={hook.thumbnail} alt={hook.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-10 h-10 text-emerald-400 fill-current" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <h5 className="font-bold text-white">{hook.title}</h5>
                          <p className="text-[13px] text-emerald-400">{hook.handle}</p>
                        </div>
                        <div className="flex items-center space-x-3 text-zinc-400">
                          <span className="flex items-center space-x-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> <span>{hook.likes}</span></span>
                          <span className="flex items-center space-x-1"><Repeat className="w-3.5 h-3.5 text-cyan-400" /> <span>Remix</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                      const allowed = ['make', 'video', 'write', 'hooks_feed', 'studio', 'arena', 'collab'];
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
              <span className="text-xs text-zinc-400">Stream directly on YouTube or source platform</span>
              <a 
                href={selectedMedia.externalUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
              >
                <span>Open on YouTube</span>
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
              <div className="bg-black/40 border border-zinc-800 p-3.5 rounded-2xl flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-mono text-zinc-500">Revenue Potential</p>
                  <p className="text-xs font-bold text-white">{selectedBlueprint.mrr}</p>
                </div>
              </div>
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
                <span>The Market Opportunity:</span>
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
                <span>Sponsorship & Partner Benefits</span>
              </span>
              <ul className="text-xs text-zinc-300 space-y-1">
                <li>• Prime feature placement on the daily AI Trends Radar</li>
                <li>• Dedicated brand sponsorship in FutureBox Masterclasses & Podcasts</li>
                <li>• Direct exposure to high-intent solo AI founders and creators</li>
              </ul>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-6 md:p-8 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-white">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h4 className="font-extrabold text-base">Advertise on FutureBox (Contact Sponsorship Team)</h4>
            </div>
            <p className="text-xs text-zinc-400">Submit this inquiry to send a direct sponsorship request to our partnership desk.</p>

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
                  placeholder="Your Email Address"
                  className="bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <select
                  value={contactBudget}
                  onChange={(e) => setContactBudget(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="$500 - $2,500 / month">Marketing Budget: $500 - $2,500 / month</option>
                  <option value="$2,500 - $10,000 / month">Marketing Budget: $2,500 - $10,000 / month</option>
                  <option value="$10,000+ / Headline Sponsor">Marketing Budget: $10,000+ (Headline Sponsor)</option>
                </select>
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
                <span>Send Sponsorship Inquiry</span>
              </button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 FutureBox Platform. All rights reserved.</p>
          <div className="flex space-x-6">
            <span>Privacy Policy</span>
            <span>Ethical Guidelines</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
