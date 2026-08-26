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
import { BASE_PRICES, guessRegion, priceFor, REGIONS, regionByCode, type Region } from './lib/pricing';
import ThemeStudio from './components/ThemeStudio';
import QualityRadar from './components/QualityRadar';
import Songwriter from './components/Songwriter';
import Masterclasses from './components/Masterclasses';
import Landing from './components/Landing';
import { applyTheme, loadTheme, saveTheme, DEFAULT_THEME, type Theme } from './lib/theme';
import { byArea, describe } from './lib/entitlements';

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
  const [activeTab, setActiveTab] = useState<'all' | 'futurebox' | 'masterclasses' | 'creations' | 'radar'>('all');
  
  // User Authentication & Profile
  const [user, setUser] = useState<{ email: string; name: string; handle: string; followers: number } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
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
  const proMonthly = priceFor(BASE_PRICES.proMonthly, region);

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
  const [studioTab, setStudioTab] = useState<'director' | 'soundboard' | 'voice_studio' | 'hooks_feed' | 'channels' | 'collab' | 'arena' | 'studio' | 'write'>('write');
  const [selectedGenreCategory, setSelectedGenreCategory] = useState<string>('All');
  const [playingGenreSample, setPlayingGenreSample] = useState<string | null>(null);

  // Studio Form State
  const [mediumType, setMediumType] = useState<'music_video' | 'ai_track' | 'custom_voice_song' | 'podcast'>('music_video');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [vocalVoiceChoice, setVocalVoiceChoice] = useState<'my_voice' | 'female_pop' | 'male_rock' | 'cyber_vocoder'>('my_voice');
  const [creatorDomain, setCreatorDomain] = useState('anrefourie');
  const [title, setTitle] = useState('');
  const [lyricsOrPrompt, setLyricsOrPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Suno v5', 'Runway Gen-3', 'ElevenLabs Voice']);
  const [mediaLink, setMediaLink] = useState('');
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);

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
      subgenre: 'Tale of Us / Anyma Style',
      bpm: '124 BPM',
      key: 'D Minor',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'melodic techno, deep hypnotic rolling sub-bass, atmospheric ethereal synth leads, dark emotional drops, afterlife style, 124 bpm, D minor',
      description: 'Hypnotic rolling bass with stadium synth leads. Ideal for dark visuals, cyber cities, and emotional visual climaxes.'
    },
    {
      category: 'Electronic & EDM',
      name: 'Deep Tech House',
      subgenre: 'Club Minimal / Fisher Style',
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
      subgenre: 'The Weeknd / Blinding Lights Style',
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
      subgenre: 'Linkin Park / Architects Style',
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
      subgenre: 'UK/US Drill / Metro Boomin Style',
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
      subgenre: 'SZA / Frank Ocean Style',
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
      subgenre: 'Morgan Wallen / Luke Combs Style',
      bpm: '104 BPM',
      key: 'G Major',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'modern country pop, acoustic guitar strums, pedal steel guitar swells, twangy electric lead guitar, punchy drums, raspy storytelling vocals, 104 bpm',
      description: 'Heartfelt storytelling, acoustic guitars, pedal steel swells, and anthemic choruses.'
    },
    {
      category: 'Country & Folk',
      name: 'Dark Indie Folk & Americana',
      subgenre: 'Bon Iver / Lumineers Style',
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
      subgenre: 'Burna Boy / Asake Style',
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

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      email: authEmail,
      name: authEmail.split('@')[0],
      handle: `@${authEmail.split('@')[0]}`,
      followers: 1
    });
    setAuthModalOpen(false);
    alert(`✓ Welcome back, ${authEmail.split('@')[0]}! You are successfully signed in.`);
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

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (mediumType === 'podcast' && userPlan !== 'pro') {
      setPricingModalOpen(true);
      return;
    }
    if (!confirmedSafe) {
      setAuditStatus('failed_attestation');
      return;
    }
    const combined = `${title} ${lyricsOrPrompt}`.toLowerCase();
    const banned = ['porn', 'xxx', 'violence', 'kill', 'scam', 'nude', 'hate'];
    if (banned.some(w => combined.includes(w))) {
      setAuditStatus('failed_safety');
    } else {
      setAuditStatus('success');
      setTimeout(() => {
        setUploadModalOpen(false);
        setAuditStatus(null);
        setTitle('');
        setLyricsOrPrompt('');
      }, 2000);
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
          onStart={() => {
            setAuthMode('signup');
            setAuthModalOpen(true);
          }}
        />

        {/* The auth and pricing overlays are shared with the signed-in app. */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-extrabold text-white">
                  {authMode === 'signin' ? 'Welcome back' : 'Start free'}
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold text-sm"
                >
                  {authMode === 'signin' ? 'Sign in' : 'Create a free account'}
                </button>
              </form>
              <p className="text-sm text-zinc-500 text-center">
                {authMode === 'signin' ? 'No account yet?' : 'Already have one?'}{' '}
                <button
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-emerald-400 hover:underline"
                >
                  {authMode === 'signin' ? 'Start free' : 'Sign in'}
                </button>
              </p>
              <p className="text-sm text-zinc-600 text-center leading-relaxed">
                This is an early preview: your account lives on this device only.
              </p>
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
              {userPlan === 'pro' && (
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
            <div 
              onClick={() => { setStudioTab('director'); setUploadModalOpen(true); }}
              className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 text-onAccent font-extrabold flex items-center justify-center text-[10px]">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-white text-[11px] leading-tight font-bold">{user.name}</p>
                <p className="text-[9px] font-mono text-emerald-400">{user.handle}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
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
              <span>Upgrade ({proMonthly.display})</span>
            </button>
          ) : (
            <span className="text-xs font-mono text-emerald-400 hidden sm:flex items-center space-x-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>PRO Active</span>
            </span>
          )}

          <button
            onClick={() => setThemeOpen(true)}
            title="Appearance — colours, type, layout"
            className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 text-xs font-bold rounded-xl transition-all"
          >
            <Paintbrush className="w-4 h-4" />
            <span className="hidden lg:inline">Appearance</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Creator Studio</span>
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
                const isLocked = mc.isPro && userPlan !== 'pro';
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
                          <span>Unlock with PRO ({proMonthly.display})</span>
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
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {authMode === 'signin' ? 'Sign In' : 'Create Free Account'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
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
          <div className="bg-zinc-900 border border-amber-500/50 w-full max-w-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">FutureBox PRO Membership</h3>
                  <p className="text-xs text-zinc-400">Unlock complete access to 4K masterclasses, podcasts, and creator studios</p>
                </div>
              </div>
              <button onClick={() => setPricingModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-b from-amber-950/30 to-black/60 border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-white">{proMonthly.display}</span>
                  <span className="text-xs text-zinc-400"> / month</span>
                </div>
                <span className="text-xs font-bold bg-amber-500 text-onAccent px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              {/* The buyer should see why the number is what it is, and what
                  actually settles it. */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-amber-500/20">
                <span className="text-xs text-zinc-400">Priced for</span>
                <select
                  value={region.code}
                  onChange={(e) => {
                    setRegion(regionByCode(e.target.value));
                    setRegionBasis('You picked this one');
                  }}
                  className="bg-black/60 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name} ({r.currency})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-zinc-500">{regionBasis}</span>
                <p className="basis-full text-xs text-zinc-500 leading-relaxed">
                  Adjusted for local purchasing power from a ${BASE_PRICES.proMonthly} base. The amount you are charged
                  is set at checkout by the country of your payment method — not by this menu, and not by your IP
                  address.
                </p>
              </div>

              {/* Generated from the same table the app enforces, so the sales
                  copy cannot drift from what the code actually does. */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {byArea().map((group) => (
                  <div key={group.area} className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{group.area}</p>
                    {group.rows.map((row) => {
                      const same = row.free === row.pro;
                      return (
                        <div key={row.key} className="grid grid-cols-[1fr_auto_auto] gap-2 items-baseline text-xs">
                          <span className="text-zinc-200">{row.label}</span>
                          <span className={`text-right w-20 ${row.free === 0 ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {describe(row.free, row.unit)}
                          </span>
                          <span className={`text-right w-20 font-semibold ${same ? 'text-zinc-400' : 'text-amber-300'}`}>
                            {describe(row.pro, row.unit)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500">Column order</span>
                  <span className="text-right w-20 text-zinc-500">Free</span>
                  <span className="text-right w-20 text-amber-300 font-semibold">Pro</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                Every part of FutureBox does something real without paying — you can write a song, score the feed,
                find a collaborator and enter a competition on a free account, and competitions are never gated at all.
                What Pro buys is volume and distribution: the daily caps come off, and publishing outward — posting to
                your channels and asking the channel to boost a collab — turns on.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setUserPlan('pro');
                  setPricingModalOpen(false);
                  alert('🎉 Congratulations! Your account has been upgraded to FutureBox PRO!');
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-onAccent font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center space-x-2"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Activate PRO Membership ({proMonthly.display} / month)</span>
              </button>
              <p className="text-[10px] text-center text-zinc-500">Cancel anytime with 1 click. Powered by Stripe secure billing.</p>
            </div>
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
                onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }}
                className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to FutureBox Platform</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  futurebox.app/@{creatorDomain}
                </span>
                <button onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }} className="text-zinc-400 hover:text-white">
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
                  { id: 'write', label: 'Songwriter', hint: 'Lyrics and style', icon: Music },
                  { id: 'studio', label: 'Studio', hint: 'Timeline and edits', icon: Sliders },
                  { id: 'soundboard', label: 'Soundboard', hint: 'Every genre, with audio', icon: Volume2 },
                  { id: 'voice_studio', label: 'Voice', hint: 'Your voice or ours', icon: Mic2 },
                  { id: 'director', label: 'Director', hint: 'Build and publish', icon: Video },
                  { id: 'hooks_feed', label: 'Hooks', hint: 'Vertical reels', icon: Smartphone },
                  { id: 'collab', label: 'Collab Radar', hint: 'Podcasts and creators', icon: Handshake },
                  { id: 'arena', label: 'Arena', hint: 'Competitions', icon: Trophy },
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

            {/* Live AI stack strip — the whole point of FutureBox is that a release
                is made by several different systems, so the stack is on screen the
                entire time you are in the studio, not buried in one form. */}
            <div className="flex-shrink-0 bg-black/60 border border-zinc-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI models on this release</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStudioTab('director')}
                  className="text-[13px] text-cyan-400 hover:underline"
                >
                  Change the stack
                </button>
              </div>
              {selectedTools.length === 0 ? (
                <p className="text-[13px] text-amber-300">
                  No models selected. A FutureBox release always names what made it.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {groupByRole(selectedTools).map(({ role, models }) => (
                    <div key={role} className="flex items-center gap-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-500">
                        {ROLE_LABELS[role]}
                      </span>
                      {models.map((m) => (
                        <a
                          key={m.name}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${m.name} by ${m.provider}`}
                          className={`px-2 py-0.5 rounded-md text-[13px] border ${ROLE_ACCENTS[role]} hover:opacity-80`}
                        >
                          {m.name}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TAB 1: MASTER GENRE SOUNDBOARD (EVERY GENRE WITH AUDIO SAMPLES & 1-CLICK USE) */}
            {studioTab === 'soundboard' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300 flex items-center space-x-2">
                      <Volume2 className="w-4 h-4" />
                      <span>Complete Genre & Subgenre Soundboard</span>
                    </h4>
                    <p className="text-xs text-zinc-400 pt-0.5">
                      Listen to high-fidelity audio demos of every music style before creating, so you can make calculated prompt choices!
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
                              setLyricsOrPrompt(`[Genre & Style: ${genre.promptSnippet}]\n\n[Verse 1]\nWrite your lyrics here...\n\n[Chorus]\n`);
                              setStudioTab('director');
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
                    <span>Neural Vocal Studio & Custom Voice Cloning</span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Just like Suno’s voice engine, upload or record your own voice timbre to sing your songs, or pick from our studio-trained AI vocalists!
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-zinc-800 p-5 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Option A: Upload or Record Your Voice</span>
                    </label>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Upload a 15-30 second clear audio file (.wav or .mp3) of your speaking or singing voice.
                    </p>
                    <div className="border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors">
                      <UploadCloud className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                      <p className="text-xs text-zinc-300 font-semibold">Drop vocal audio file here or click to browse</p>
                      <p className="text-[13px] text-zinc-500">Supports WAV, MP3, M4A up to 25MB</p>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-zinc-800 p-5 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Option B: Choose Studio Vocal Persona</span>
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: 'my_voice', label: 'My Cloned Voice (Anre Fourie)', desc: 'Custom trained profile timbre' },
                        { id: 'female_pop', label: 'Aura Pop Diva (Female)', desc: 'Soaring contemporary pop & vibrato' },
                        { id: 'male_rock', label: 'Titan Baritone Rocker (Male)', desc: 'Raspy, powerful rock vocal lead' },
                        { id: 'cyber_vocoder', label: 'Cyber Vocoder Synthesizer', desc: 'Daft Punk / The Weeknd neural vocoder' }
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setVocalVoiceChoice(item.id as any)}
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
                    onClick={() => setStudioTab('director')}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center space-x-2"
                  >
                    <span>Proceed to Music Video Director</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: MUSIC VIDEO DIRECTOR & PUBLISH (THE UNIFIED CREATIVE STUDIO) */}
            {studioTab === 'director' && (
              <form onSubmit={handlePublish} className="space-y-6">
                
                {/* Format & Aspect Ratio */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Step 1: Release Medium
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'music_video', label: 'AI Music Video', icon: FileVideo, desc: 'Audio + Cinema Video' },
                        { id: 'ai_track', label: 'Neural Song', icon: Music, desc: 'Audio Stems Only' },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = mediumType === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setMediumType(item.id as any)}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isSelected 
                                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg' 
                                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                            <p className="text-xs font-bold pt-1">{item.label}</p>
                            <p className="text-[13px] text-zinc-500">{item.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Video Aspect Ratio */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Video Screen Aspect Ratio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '16:9', label: '16:9 Cinema Widescreen', icon: Monitor, desc: 'For YouTube & TVs' },
                        { id: '9:16', label: '9:16 Vertical Video Hook', icon: Smartphone, desc: 'For Reels & TikTok' },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = videoAspectRatio === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setVideoAspectRatio(item.id as any)}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isSelected 
                                ? 'bg-cyan-950/50 border-cyan-400 text-white shadow-lg' 
                                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                            <p className="text-xs font-bold pt-1">{item.label}</p>
                            <p className="text-[13px] text-zinc-500">{item.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Custom Creator Channel Domain */}
                <div className="space-y-1.5 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Your Custom Creator Channel URL:</span>
                  </label>
                  <div className="flex items-center">
                    <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-400 px-3 py-2.5 rounded-l-xl text-xs">
                      futurebox.app/@
                    </span>
                    <input
                      type="text"
                      value={creatorDomain}
                      onChange={(e) => setCreatorDomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="your-creator-name"
                      className="w-full bg-black/60 border border-zinc-700 rounded-r-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                {/* Title & Media Link */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Song & Music Video Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Cherry Blossom Mail (Official AI Video)"
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Media Link (YouTube / Suno / MP4)</label>
                    <input 
                      type="url" 
                      value={mediaLink}
                      onChange={(e) => setMediaLink(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* AI Models Used — restored, and grouped by the job each model
                    does so the stack reads as a crew rather than a tag soup. */}
                <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>AI Models Used</span>
                    </label>
                    <span className="text-[13px] text-zinc-500">
                      {selectedTools.length} selected · published with the release
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-500 leading-relaxed">
                    Every model you tick is shown on the release page and on the card in the feed. Listing them is not
                    a formality — it is the thing that separates a FutureBox release from an anonymous upload.
                  </p>

                  {(['music', 'video', 'voice', 'image'] as const).map((role) => (
                    <div key={role} className="space-y-1.5">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">{ROLE_LABELS[role]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {AI_MODELS.filter((m) => m.role === role).map((model) => {
                          const isSelected = selectedTools.includes(model.name);
                          return (
                            <button
                              type="button"
                              key={model.name}
                              onClick={() => toggleTool(model.name)}
                              title={`${model.name} — ${model.provider}`}
                              className={`px-2.5 py-1 rounded-lg text-sm transition-all border ${
                                isSelected
                                  ? ROLE_ACCENTS[role] + ' font-bold'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {isSelected ? `✓ ${model.name}` : `+ ${model.name}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lyrics & Prompt Generator */}
                <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-cyan-300 font-bold">
                      Song Lyrics & AI Video Scene Directions:
                    </label>
                    <button
                      type="button"
                      onClick={() => setStudioTab('soundboard')}
                      className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Browse Soundboard for Style Tags</span>
                    </button>
                  </div>
                  <textarea 
                    value={lyricsOrPrompt}
                    onChange={(e) => setLyricsOrPrompt(e.target.value)}
                    placeholder="[Style: Modern Country Pop, 104 BPM, major key, pedal steel guitar]&#10;&#10;[Verse 1]&#10;Driving down this empty gravel road...&#10;&#10;[Chorus]&#10;Underneath the summer skyline...&#10;&#10;[Video Direction: Anamorphic camera slowly panning over open wheat fields at sunset]"
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-cyan-500 h-28"
                  />
                </div>

                {/* Ethical Gatekeeper */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Ethical Gatekeeper & Copyright Policy</span>
                  </div>
                  <label className="flex items-start space-x-3 cursor-pointer pt-1">
                    <input 
                      type="checkbox"
                      checked={confirmedSafe}
                      onChange={(e) => setConfirmedSafe(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs text-zinc-200 font-semibold leading-relaxed">
                      I certify this content contains zero violence, no NSFW/pornography, no scams, and I hold rights to publish to FutureBox.
                    </span>
                  </label>
                </div>

                {/* Audit Feedbacks */}
                {auditStatus === 'success' && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      ✓ Ethical Gate Passed! Your AI Music Video is live at futurebox.app/@{creatorDomain}
                      {selectedTools.length > 0 && <> — credited to {selectedTools.join(', ')}</>}
                    </span>
                  </div>
                )}

                {auditStatus === 'failed_safety' && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>✗ Ethical Gate Rejection: Flagged keywords detected violating community standards.</span>
                  </div>
                )}

                {auditStatus === 'failed_attestation' && (
                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500 text-amber-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>⚠ Please check the Ethical Gatekeeper box before submitting.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center space-x-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish to My Channel (futurebox.app/@{creatorDomain})</span>
                </button>
              </form>
            )}

            {/* SONGWRITER: WHERE THE SONG IS ACTUALLY WRITTEN */}
            {studioTab === 'write' && (
              <Songwriter
                userPlan={userPlan}
                onUpgrade={() => setPricingModalOpen(true)}
                onSendToDirector={({ title: t, lyrics, style }) => {
                  setTitle(t);
                  // The Director's one field takes both, in the order it reads
                  // best: what it should sound like, then what it says.
                  setLyricsOrPrompt(`[Style: ${style}]\n\n${lyrics}`);
                  setStudioTab('director');
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
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Viral Hooks & AI Music Videos Stream</span>
                  </h4>
                  <p className="text-xs text-zinc-400 pt-0.5">
                    Watch short-form viral music videos with real-time lyric hooks and remix prompts from creators worldwide.
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
            </div>

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
