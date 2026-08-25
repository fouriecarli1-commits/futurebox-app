'use client';

import React, { useState } from 'react';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, 
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X,
  UploadCloud, FileVideo, Music, Headphones, Lightbulb, Code2, 
  Link as LinkIcon, AlertCircle, Layers, DollarSign, Clock, 
  BookOpen, Bookmark, GraduationCap, Mic, Disc3, ExternalLink, Globe,
  Crown, Lock, Zap, RefreshCw, Send, Mail, Check, Star,
  ArrowLeft, User, LogIn, ChevronDown, SlidersHorizontal, Volume2, 
  Copy, Video, Flame, Library, PlayCircle
} from 'lucide-react';

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
  name: string;
  subgenre: string;
  bpm: string;
  audioUrl: string;
  promptSnippet: string;
  description: string;
}

export default function FutureBoxHome() {
  const [activeTab, setActiveTab] = useState<'all' | 'futurebox' | 'masterclasses' | 'creations' | 'radar'>('all');
  
  // User Authentication & Plan State
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

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

  // Creator Studio Sub-Tabs & Soundboard State
  const [studioTab, setStudioTab] = useState<'publish' | 'soundboard' | 'channels' | 'prompts'>('publish');
  const [playingGenreSample, setPlayingGenreSample] = useState<string | null>(null);

  // AI Scanner & Stream Regeneration State
  const [isScanning, setIsScanning] = useState(false);
  const [streamCycle, setStreamCycle] = useState(0);
  const [scanMessage, setScanMessage] = useState('🟢 Autonomous AI Trend Radar: Real-Time Sync Active (Updated 2m ago)');

  // Creator Studio Form State
  const [mediumType, setMediumType] = useState<'music_video' | 'podcast' | 'ai_track'>('music_video');
  const [category, setCategory] = useState('Creative AI & Art');
  const [creatorDomain, setCreatorDomain] = useState('');
  const [title, setTitle] = useState('');
  const [lyricsOrPrompt, setLyricsOrPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Suno v3.5', 'Runway Gen-3']);
  const [mediaLink, setMediaLink] = useState('');
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);

  // Marketing Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactBudget, setContactBudget] = useState('$1,000 - $5,000 / month');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // 🎧 GENRE SOUNDBOARD PREVIEWS (To hear what Suno/Udio styles sound like before generating)
  const genreSamples: GenreSample[] = [
    {
      name: 'Cyberpunk Synthwave',
      subgenre: 'Darksynth / Retro-Electro',
      bpm: '128 BPM',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'cyberpunk synthwave, analog sawtooth bassline, driving retro drums, neon atmosphere, emotive lead synth, 128 bpm',
      description: 'Energetic electronic pulses with heavy analog bass and retro-futuristic synth arpeggios. Perfect for sci-fi city visuals.'
    },
    {
      name: 'Cinematic Orchestral Hybrid',
      subgenre: 'Hans Zimmer Style / Epic Film Score',
      bpm: '90 BPM',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'cinematic orchestral hybrid, massive brass stabs, staccato strings, thunderous sub-bass, epic trailer percussion, 90 bpm',
      description: 'Grand orchestral arrangements fused with modern sub-bass synthesis. Ideal for heroic reveals and profound masterclasses.'
    },
    {
      name: 'Deep Tech House',
      subgenre: 'Minimal Groove / Club Sound',
      bpm: '126 BPM',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'deep tech house, rolling bassline, crisp four-on-the-floor kick, subtle vocal chops, club sound, 126 bpm',
      description: 'Hypnotic, continuous rhythmic pulse with refined low-end grooves. Great for background pacing and tech demonstrations.'
    },
    {
      name: 'Lo-Fi Future Chillhop',
      subgenre: 'Study Beats / Relaxed Rhodes',
      bpm: '82 BPM',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
      promptSnippet: 'lo-fi future chillhop, warm Rhodes electric piano, vinyl crackle, gentle head-nod boom-bap drums, relaxed groove, 82 bpm',
      description: 'Mellow, nostalgic chords with cozy tape warmth and relaxed drums. Ideal for deep learning, focus, and coding streams.'
    },
    {
      name: 'Ethereal Vocal Ambient',
      subgenre: 'Atmospheric / Neural Choir',
      bpm: '70 BPM',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
      promptSnippet: 'ethereal vocal ambient, haunting female vocal textures, lush reverb, floating shimmer pads, cinematic emotional swell',
      description: 'Dreamy, floating soundscapes featuring layered vocal harmonies and wide acoustic spaces. Perfect for abstract generative art.'
    },
    {
      name: 'Industrial Darkwave',
      subgenre: 'Cyber-Industrial / Distorted EBM',
      bpm: '135 BPM',
      audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      promptSnippet: 'industrial darkwave, aggressive distorted bassline, metallic percussion, dystopian gothic energy, driving tempo, 135 bpm',
      description: 'Raw, powerful grit with industrial percussions and high-voltage energy. Tailored for intense action and mechanical AI art.'
    }
  ];

  // 📺 POPULAR CREATIVE AI CHANNELS DIRECTORY
  const popularAiChannels = [
    {
      name: 'SynthMind Studio',
      handle: '@synthmind',
      subscribers: '142K',
      niche: 'Cyberpunk AI Music & Music Videos',
      topTool: 'Suno v3.5 + Runway Gen-3',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
      sampleUrl: 'https://suno.com'
    },
    {
      name: 'Aura Sound Labs',
      handle: '@aura',
      subscribers: '89K',
      niche: 'Neural Vocal Ballads & Ambient AI Cinema',
      topTool: 'Udio AI + Kling AI',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
      sampleUrl: 'https://runwayml.com'
    },
    {
      name: 'Kling Visionaries',
      handle: '@klingarts',
      subscribers: '210K',
      niche: 'Hyper-Realistic Natural Physics & Sci-Fi',
      topTool: 'Kling AI + Sora Experimental',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
      sampleUrl: 'https://klingai.org'
    },
    {
      name: 'Neural Beats Global',
      handle: '@neuralbeats',
      subscribers: '67K',
      niche: 'Future Electronic & Audio-Reactive Visuals',
      topTool: 'Suno AI + Midjourney v6',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
      sampleUrl: 'https://suno.com'
    }
  ];

  // 🎥 VIDEO CREATION PRESET PROMPTS
  const videoPromptPresets = [
    {
      title: 'Anamorphic Cyberpunk City in Rain',
      tags: 'Runway Gen-3 / Kling',
      prompt: 'Cinematic wide shot, anamorphic 8k lens flare, hyper-detailed neo-tokyo in heavy rain, glowing volumetric neon lighting, reflections on wet asphalt, 60fps photoreal.'
    },
    {
      title: 'Bioluminescent Microscopic Organism',
      tags: 'Kling AI / Luma',
      prompt: 'Macro extreme close-up of pulsing crystalline flora with bio-luminescent spores, cellular division, 8k microscopy, photoreal lighting, iridescent color shift.'
    },
    {
      title: 'High-Speed FPV Drone Dive through Monoliths',
      tags: 'Sora / Runway Gen-3',
      prompt: 'Hyper-speed FPV drone dive through futuristic brutalist monoliths, realistic motion blur, golden hour sunset reflections, dust particles floating in light shafts.'
    },
    {
      title: '70s Retro-Futuristic Film Interior',
      tags: 'Midjourney + Luma',
      prompt: '70s retro sci-fi space station interior, panavision anamorphic lens, warm Kodachrome 64 film grain, tactile physical control panels, atmospheric haze.'
    }
  ];

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

  const availableTools = ['Suno v3.5', 'Udio AI', 'Runway Gen-3', 'Midjourney v6', 'Kling AI', 'Sora', 'ElevenLabs Voice', 'Luma Dream Machine'];

  // Dynamic Content Pools for AI Stream Regeneration
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
    setScanMessage('⚡ AI Engine regenerating discovery stream from YouTube, X/Twitter, arXiv, and Substack...');
    setTimeout(() => {
      setIsScanning(false);
      setStreamCycle(prev => prev + 1);
      setScanMessage('✓ AI Stream Refreshed: New trending podcasts and breakthrough lessons loaded!');
    }, 2000);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      email: authEmail,
      name: authEmail.split('@')[0]
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
        setCreatorDomain('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 selection:bg-emerald-500 selection:text-black flex flex-col justify-between">
      
      {/* 1. Header with Auth & Smart Dropdowns */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07080c]/90 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Cpu className="w-5 h-5 text-black font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white flex items-center space-x-2">
              <span>FUTURE<span className="text-emerald-400">BOX</span></span>
              {userPlan === 'pro' && (
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-amber-600 text-black font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
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
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
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
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-zinc-200 hidden sm:inline">{user.name}</span>
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
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Upgrade ($19)</span>
            </button>
          ) : (
            <span className="text-xs font-mono text-emerald-400 hidden sm:flex items-center space-x-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>PRO Active</span>
            </span>
          )}

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Creator Studio</span>
          </button>
        </div>
      </header>

      {/* 🔍 SMART FILTERING SUB-BAR */}
      <div className="bg-zinc-950/80 border-b border-zinc-800/80 px-6 py-2.5 backdrop-blur-md">
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
              <p className="font-bold text-white flex items-center space-x-2">
                <span>Autonomous AI Discovery Stream (Free Tier Ready)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Pool #{streamCycle + 1}</span>
              </p>
              <p className="text-zinc-400 text-[11px]">{scanMessage}</p>
            </div>
          </div>

          <button
            onClick={handleAiScanRefresh}
            disabled={isScanning}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-black text-xs font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Regenerating Content...' : 'Regenerate Stream with AI'}</span>
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
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]"
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
                  <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
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
                        <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span>Masterclasses</span>
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
                      <div className="absolute top-3 right-3 z-20 bg-amber-500/90 text-black text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg">
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
                            <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
                              <Lock className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg">
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
                          <span>Unlock with PRO ($19)</span>
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

        {/* 🎨 4. CREATIVE AI MUSIC & VIDEOS */}
        {(activeTab === 'all' || activeTab === 'creations') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Creative AI Music & Music Videos</span>
                </h3>
                <p className="text-xs text-zinc-400">The premier destination for neural music releases, generative videos, and custom creator channels.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Creator Channels
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  id: 'ai-1',
                  title: 'Cybernetic Odyssey (Official AI Music Video)',
                  creator: 'SynthMind Studio',
                  domain: 'futurebox.app/@synthmind',
                  medium: 'AI Music Video',
                  tools: ['Suno v3.5', 'Runway Gen-3'],
                  prompt: 'Cyberpunk trance vocal track with ultra-photoreal Tokyo rain visuals.',
                  thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
                  embedUrl: 'https://www.youtube.com/embed/bk-nQ7HF6k4',
                  externalUrl: 'https://suno.com',
                  type: 'youtube' as const
                },
                {
                  id: 'ai-2',
                  title: 'Neon Horizons: Neural Symphony #4',
                  creator: 'Aura Sound Labs',
                  domain: 'futurebox.app/@aura',
                  medium: 'Neural AI Music',
                  tools: ['Udio AI', 'ElevenLabs'],
                  prompt: 'Emotive future electronic ballad with neural vocal harmonization.',
                  thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
                  embedUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
                  externalUrl: 'https://runwayml.com',
                  type: 'youtube' as const
                },
                {
                  id: 'ai-3',
                  title: 'Hyper-Realistic Natural Physics Showcase',
                  creator: 'Kling Visionaries',
                  domain: 'futurebox.app/@klingarts',
                  medium: 'AI Visual Reel',
                  tools: ['Kling AI', 'Luma Dream Machine'],
                  prompt: 'Cellular division and luminescent bio-spores in 8k cinematic physics.',
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
                        <span className="text-[10px] font-mono text-zinc-500 bg-black/50 px-2 py-0.5 rounded border border-zinc-800">{creation.domain}</span>
                      </div>
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors leading-snug">{creation.title}</h4>
                      <p className="text-xs text-zinc-400 font-mono bg-black/30 p-2.5 rounded-lg border border-zinc-800">
                        <span className="text-cyan-400 font-semibold">Prompt/Lyrics: </span>
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
                      <span>Visit Tool</span>
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
            <div>
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
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
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/50 w-full max-w-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
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
                  <span className="text-3xl font-black text-white">$19</span>
                  <span className="text-xs text-zinc-400 font-mono"> / month</span>
                </div>
                <span className="text-xs font-mono font-bold bg-amber-500 text-black px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-200">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unlimited access to all 4K Masterclasses & Full Podcasts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>Ability to host & publish long-form Podcasts in Creator Studio</strong></span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>Claim your custom Creator Channel Domain</strong> (`futurebox.app/@your-name`)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Full source code & blueprint teardown downloads</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setUserPlan('pro');
                  setPricingModalOpen(false);
                  alert('🎉 Congratulations! Your account has been upgraded to FutureBox PRO!');
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center space-x-2"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Activate PRO Membership ($19 / Month)</span>
              </button>
              <p className="text-[10px] text-center text-zinc-500">Cancel anytime with 1 click. Powered by Stripe secure billing.</p>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 CREATOR STUDIO & AI MUSIC HUB (WITH GENRE SOUNDBOARD, CHANNELS & BACK BUTTON) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8">
            
            {/* Top Back & Close Bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <button
                onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }}
                className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 rounded-xl transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Platform</span>
              </button>

              <button onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Studio Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Creative AI Studio & Soundboard</h3>
                  <p className="text-xs text-zinc-400">Discover Suno styles, explore AI channels, and publish music videos</p>
                </div>
              </div>
            </div>

            {/* Studio Mode Switcher Tabs */}
            <div className="flex items-center space-x-2 bg-black/50 p-1.5 rounded-2xl border border-zinc-800 text-xs">
              {[
                { id: 'publish', label: 'Publish & Channel URL', icon: UploadCloud },
                { id: 'soundboard', label: 'Genre Soundboard & Audio Previews', icon: Volume2 },
                { id: 'channels', label: 'Top AI Creator Channels', icon: Tv },
                { id: 'prompts', label: 'Camera & Video Prompts', icon: Video },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = studioTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStudioTab(tab.id as any)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
                      isActive 
                        ? 'bg-emerald-500 text-black shadow-lg' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: PUBLISH & CUSTOM CHANNEL DOMAIN */}
            {studioTab === 'publish' && (
              <form onSubmit={handlePublish} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Step 1: Choose Medium Format
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'music_video', label: 'AI Music Video', icon: FileVideo, desc: 'Suno + Runway' },
                      { id: 'ai_track', label: 'Neural Song / Audio', icon: Music, desc: 'Suno / Udio' },
                      { id: 'podcast', label: 'Podcast Episode', icon: Mic, desc: 'PRO Members', isProReq: true },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = mediumType === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setMediumType(item.id as any)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 relative ${
                            isSelected 
                              ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {item.isProReq && (
                            <span className="absolute top-2 right-2 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                              PRO
                            </span>
                          )}
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <div>
                            <p className="text-xs font-bold leading-tight">{item.label}</p>
                            <p className="text-[10px] text-zinc-500">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Your Custom Creator Channel URL:</span>
                  </label>
                  <div className="flex items-center">
                    <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-400 px-3 py-2.5 rounded-l-xl text-xs font-mono">
                      futurebox.app/@
                    </span>
                    <input
                      type="text"
                      value={creatorDomain}
                      onChange={(e) => setCreatorDomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="your-creator-name"
                      className="w-full bg-black/60 border border-zinc-700 rounded-r-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Audience members can visit this custom channel to stream all your music videos and songs.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Song / Video Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Cybernetic Odyssey (Official AI Video)"
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Media Link (YouTube / Suno / MP4)</label>
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

                <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-zinc-800">
                  <label className="block text-xs font-mono text-cyan-300">
                    AI Models Used:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTools.map((tool) => {
                      const isSelected = selectedTools.includes(tool);
                      return (
                        <button
                          type="button"
                          key={tool}
                          onClick={() => toggleTool(tool)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                            isSelected 
                              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold' 
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {isSelected ? `✓ ${tool}` : `+ ${tool}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Song Lyrics & AI Prompts:
                    </label>
                    <textarea 
                      value={lyricsOrPrompt}
                      onChange={(e) => setLyricsOrPrompt(e.target.value)}
                      placeholder="Write song lyrics, vocal arrangement notes, or generative video prompts..."
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 h-20"
                    />
                  </div>
                </div>

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

                {auditStatus === 'success' && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>✓ Ethical Gate Passed! Your content is now live at futurebox.app/@{creatorDomain || 'your-name'}</span>
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
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center space-x-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish to My Creator Channel</span>
                </button>
              </form>
            )}

            {/* TAB 2: GENRE SOUNDBOARD & AUDIO PREVIEWS (Hear what Suno styles sound like!) */}
            {studioTab === 'soundboard' && (
              <div className="space-y-4">
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <Volume2 className="w-4 h-4" />
                    <span>Suno & Udio Style Soundboard</span>
                  </h4>
                  <p className="text-xs text-zinc-400 pt-1">
                    Listen to audio samples of common AI music genres before generating, so you know exactly what prompt to use!
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {genreSamples.map((genre, i) => {
                    const isPlaying = playingGenreSample === genre.name;
                    return (
                      <div key={i} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3 hover:border-emerald-500/40 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-sm text-white">{genre.name}</h5>
                            <p className="text-[11px] text-zinc-400">{genre.subgenre} • <span className="text-emerald-400 font-mono">{genre.bpm}</span></p>
                          </div>
                          <button
                            onClick={() => setPlayingGenreSample(isPlaying ? null : genre.name)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isPlaying ? 'bg-emerald-500 text-black shadow-lg animate-pulse' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">{genre.description}</p>

                        {isPlaying && (
                          <div className="pt-2 border-t border-zinc-800">
                            <audio src={genre.audioUrl} autoPlay controls className="w-full h-8" />
                          </div>
                        )}

                        <div className="bg-black/50 p-2 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">{genre.promptSnippet}</span>
                          <button
                            onClick={() => {
                              setLyricsOrPrompt(genre.promptSnippet);
                              setStudioTab('publish');
                            }}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 flex-shrink-0 ml-2"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Use Style</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: POPULAR AI CREATOR CHANNELS (Our own AI YouTube directory) */}
            {studioTab === 'channels' && (
              <div className="space-y-4">
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                    <Tv className="w-4 h-4" />
                    <span>Top Featured Creative AI Channels</span>
                  </h4>
                  <p className="text-xs text-zinc-400 pt-1">
                    Explore high-velocity creators using Suno, Kling, and Runway to spark ideas for your next release.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {popularAiChannels.map((channel, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                      <div className="aspect-video relative overflow-hidden">
                        <img src={channel.thumbnail} alt={channel.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                          {channel.subscribers} Subscribers
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-sm text-white">{channel.name}</h5>
                          <span className="text-[10px] font-mono text-emerald-400">{channel.handle}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{channel.niche}</p>
                        <p className="text-[10px] font-mono text-zinc-500">Tools: {channel.topTool}</p>

                        <a 
                          href={channel.sampleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors pt-2"
                        >
                          <span>Explore Channel Releases</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CAMERA & VIDEO PROMPTS PRESET LIBRARY */}
            {studioTab === 'prompts' && (
              <div className="space-y-4">
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <Video className="w-4 h-4" />
                    <span>Calibrated Video & Camera Prompts</span>
                  </h4>
                  <p className="text-xs text-zinc-400 pt-1">
                    Click any preset to copy calibrated camera directions, lighting parameters, and aspect ratios into your prompt.
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {videoPromptPresets.map((preset, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2 hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-white">{preset.title}</h5>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {preset.tags}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-zinc-300 bg-black/40 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                        {preset.prompt}
                      </p>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setLyricsOrPrompt(preset.prompt);
                            setStudioTab('publish');
                          }}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 flex items-center space-x-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Apply to Video Generator</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 🎬 / 🎵 UNIVERSAL MEDIA PLAYER MODAL */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl">
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8">
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
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2"
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
      <footer className="border-t border-zinc-800/80 bg-[#050608] mt-16 px-6 py-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-black font-bold" />
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
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2"
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
