'use client';

import React, { useState } from 'react';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, 
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X,
  UploadCloud, FileVideo, Music, Headphones, Lightbulb, Code2, 
  Link as LinkIcon, AlertCircle, Layers, DollarSign, Clock, 
  BookOpen, Bookmark, GraduationCap, Mic, Disc3, ExternalLink, Globe
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
}

export default function FutureBoxHome() {
  const [activeTab, setActiveTab] = useState<'all' | 'futurebox' | 'masterclasses' | 'creations' | 'radar'>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ 
    title: string; 
    embedUrl?: string; 
    externalUrl: string;
    type: 'youtube' | 'audio' | 'video'; 
    host?: string; 
    prompt?: string;
  } | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  // Creator Studio Form State
  const [mediumType, setMediumType] = useState<'video' | 'podcast' | 'music'>('video');
  const [category, setCategory] = useState('AI Toekoms & Tegnologie');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Runway Gen-3', 'Midjourney v6']);
  const [mediaSource, setMediaSource] = useState<'file' | 'link'>('link');
  const [mediaLink, setMediaLink] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);

  const availableTools = ['Runway Gen-3', 'Midjourney v6', 'Kling AI', 'Sora', 'Luma Dream Machine', 'ElevenLabs', 'Suno v3.5', 'Udio AI', 'Cursor AI'];
  const categoriesList = ['AI Toekoms & Tegnologie', 'Besigheid & Rykdom', 'Sielkunde & Motivering', 'Creative AI & Kuns', 'Sagteware & Vibe Apps'];

  // 🎙️ REGTE PODCASTS (The Diary of a CEO, Lex Fridman, Huberman Lab)
  const podcastsList = [
    {
      id: 'pod-1',
      title: 'The AI Emergency: What Happens Next Before 2030',
      host: 'The Diary of a CEO (Steven Bartlett)',
      guest: 'Mo Gawdat (Ex-Chief Business Officer, Google X)',
      duration: '1h 58m',
      views: '6.4M',
      thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/bk-nQ7HF6k4',
      externalUrl: 'https://www.youtube.com/watch?v=bk-nQ7HF6k4',
      takeaways: ['Die eksponensiële kurwe van super-intelligensie', 'Hoekom emosionele intelligensie en menslike empatie die hoogste premie sal dra']
    },
    {
      id: 'pod-2',
      title: 'Sam Altman: OpenAI, GPT-5, Sora & The Future of AGI',
      host: 'Lex Fridman Podcast #419',
      guest: 'Sam Altman (CEO, OpenAI)',
      duration: '2h 08m',
      views: '4.9M',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/jvqFAi7vkBc',
      externalUrl: 'https://www.youtube.com/watch?v=jvqFAi7vkBc',
      takeaways: ['Berekenings-skaalwette en model-ontwikkeling', 'Hoe outonome sagteware die werksmark gaan hervorm']
    },
    {
      id: 'pod-3',
      title: 'Optimal Protocols for Focus, Neuroplasticity & Deep Learning',
      host: 'Huberman Lab Podcast',
      guest: 'Dr. Andrew Huberman (Stanford Neurobiologist)',
      duration: '2h 15m',
      views: '3.1M',
      thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/QmOF0crdyRU',
      externalUrl: 'https://www.youtube.com/watch?v=QmOF0crdyRU',
      takeaways: ['Dopamien-bestuur tydens intense leersessies', 'Die 90-minute ultradiane ritme vir hoë-prestasie denke']
    }
  ];

  // 🎓 REGTE MEESTERKLASSE (Andrej Karpathy, Y Combinator, Agent Architectures)
  const masterclassesList = [
    {
      id: 'mc-1',
      title: 'Intro to Large Language Models: How Neural Networks Think',
      instructor: 'Andrej Karpathy (Ex-Director of AI at Tesla & OpenAI Co-founder)',
      duration: '1h 00m',
      level: 'Wêreldklas Grondslag',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
      embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
      externalUrl: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
      takeaways: ['Hoe tokens, aandag-meganismes en neurone saamwerk', 'Die toekoms van agents, OS-vlak integrasies en multi-modale data']
    },
    {
      id: 'mc-2',
      title: 'How to Build & Scale Generative AI Startups in the Modern Era',
      instructor: 'Garry Tan (CEO, Y Combinator)',
      duration: '45m',
      level: 'Besigheid & Stigters',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/sPXZ_y2Yw3I',
      externalUrl: 'https://www.youtube.com/watch?v=sPXZ_y2Yw3I',
      takeaways: ['Hoe om verdedigbare moats te bou bo-op bestaande grondslag-modelle', 'Van prototipe na paying customers binne weke']
    },
    {
      id: 'mc-3',
      title: 'Building Autonomous Multi-Agent AI Systems from Scratch',
      instructor: 'Harrison Chase (LangChain / Frontier Agent Researcher)',
      duration: '1h 22m',
      level: 'Gevorderde Argitektuur',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
      externalUrl: 'https://www.youtube.com/watch?v=sal78ACtGTc',
      takeaways: ['Stateful agente met gereedskap-oproepe (Tool calling)', 'Geheue en kontekstuele besluitneming in produksie']
    }
  ];

  // 🎨 REGTE CREATIVE AI SHOWCASE MET SKAKELS NA REGTE AI-GEREEDSKAP
  const creativeAiList = [
    {
      id: 'ai-1',
      title: 'Cinematic Worldbuilding with Runway Gen-3 Alpha',
      creator: 'Runway Studios',
      medium: 'Video Reel',
      tools: ['Runway Gen-3', 'Midjourney v6.1'],
      toolUrl: 'https://runwayml.com',
      prompt: 'Cinematic wide shot of a hyper-dense cyber city in rain, holographic light trails, 8k anamorphic lens flare.',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/sal78ACtGTc',
      externalUrl: 'https://runwayml.com',
      type: 'youtube' as const
    },
    {
      id: 'ai-2',
      title: 'Hyper-Realistic Natural Physics with Kling AI',
      creator: 'Kling AI Community',
      medium: 'Video Reel',
      tools: ['Kling AI', 'Luma Dream Machine'],
      toolUrl: 'https://klingai.org',
      prompt: 'Macro shot of luminescent flora pulsing with bio-electricity, cellular division, microscopic precision.',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
      embedUrl: 'https://www.youtube.com/embed/zjkBMFhNj_g',
      externalUrl: 'https://klingai.org',
      type: 'youtube' as const
    },
    {
      id: 'ai-3',
      title: 'Synthesizing Full Vocal Tracks with Suno AI v3.5',
      creator: 'Suno Audio Lab',
      medium: 'Neural AI Musiek',
      tools: ['Suno AI', 'Udio AI'],
      toolUrl: 'https://suno.com',
      prompt: 'Cyberpunk synthwave electronic track with emotive vocal chorus, 128 bpm, analogue synthesizers.',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
      externalUrl: 'https://suno.com',
      type: 'audio' as const
    }
  ];

  // ⚡ REGTE INTELLIGENCE RADAR MET SKAKELS NA REGTE PRODUKTE
  const blueprints: Blueprint[] = [
    {
      tag: 'Top Vibe Coded App',
      title: 'Autonomous Coding & Micro-SaaS with Cursor AI',
      desc: 'Hoe ontwikkelaars en nie-kodoreerders volledige programme bou en ontplooi binne 48 uur.',
      mrr: '$10k - $50k / maand',
      buildTime: '48 Uur met Cursor',
      techStack: ['Cursor AI', 'Next.js 14', 'Supabase Database', 'Vercel Deployment'],
      opportunity: 'Cursor AI stel solo stigters in staat om 10x vinniger te kodeer deur die hele kodebasis in konteks te neem.',
      steps: [
        'Installeer Cursor AI en koppel jou GitHub rekening.',
        'Gebruik Vibe-Coding prompts om jou databasis en gebruikerskoppelvlak op te stel.',
        'Ontplooi direk na Vercel vir wêreldwye blitsvinnige hosting.'
      ],
      toolName: 'Cursor.com',
      externalUrl: 'https://www.cursor.com'
    },
    {
      tag: 'Business Opportunity',
      title: 'Building AI Voice Agents with LiveKit & Twilio',
      desc: 'Stap-vir-stap gids oor hoe om 24/7 stem-KI agente aan besighede te verkoop.',
      mrr: '$5,000 - $25,000 / maand',
      buildTime: '1-2 Weke',
      techStack: ['LiveKit WebRTC', 'Twilio Voice', 'Gemini Live / OpenAI Realtime', 'Supabase'],
      opportunity: 'Diensbesighede (dokters, prokureurs, loodgieters) verloor miljoene weens onbeantwoorde oproepe. Stem-KI los hierdie probleem permanent op.',
      steps: [
        'Stel \'n intydse WebRTC stroom op met LiveKit se amptelike stem-wolk.',
        'Koppel telefoonnommers aan Twilio SIP trunking.',
        'Laai besigheidsinligting in Supabase sodat die KI vrae akkuraat beantwoord.'
      ],
      toolName: 'LiveKit.io',
      externalUrl: 'https://livekit.io'
    },
    {
      tag: 'Top AI News',
      title: 'Vercel v0: Generative Frontend Code Generation',
      desc: 'Tik \'n idee in en v0 genereer volledige, pragtige React en Tailwind komponente onmiddellik.',
      mrr: 'Industrie Standaard',
      buildTime: 'Intyds (Sekondes)',
      techStack: ['React', 'Tailwind CSS', 'Shadcn UI', 'Next.js App Router'],
      opportunity: 'Jy hoef nie meer maande te spandeer op ontwerpe nie. v0 skep produksie-gereed frontend kode met een enkele beskrywing.',
      steps: [
        'Maak v0.dev oop en beskryf die webkoppelvlak wat jy wil hê.',
        'Kopieer die gegenereerde React kode direk na jou Next.js projek.',
        'Koppel aan Supabase vir outentifikasie en data.'
      ],
      toolName: 'v0.dev by Vercel',
      externalUrl: 'https://v0.dev'
    }
  ];

  const toggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleFileUploadSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedSafe) {
      setAuditStatus('failed_attestation');
      return;
    }
    const combined = `${title} ${description} ${promptText}`.toLowerCase();
    const banned = ['porn', 'xxx', 'violence', 'kill', 'scam', 'nude', 'hate'];
    if (banned.some(w => combined.includes(w))) {
      setAuditStatus('failed_safety');
    } else {
      setAuditStatus('success');
      setTimeout(() => {
        setUploadModalOpen(false);
        setAuditStatus(null);
        setTitle('');
        setDescription('');
        setPromptText('');
        setUploadedFileName(null);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 selection:bg-emerald-500 selection:text-black">
      
      {/* 1. Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07080c]/85 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Cpu className="w-5 h-5 text-black font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">FUTURE<span className="text-emerald-400">BOX</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Digital Learning & Creative AI Hub</p>
          </div>
        </div>

        {/* Tab Filters */}
        <nav className="hidden lg:flex items-center space-x-1 bg-zinc-900/90 p-1.5 rounded-full border border-zinc-800">
          {[
            { id: 'all', label: 'Spotlight', icon: Compass },
            { id: 'futurebox', label: 'FutureBox Podcasts', icon: Headphones },
            { id: 'masterclasses', label: 'Masterclasses', icon: GraduationCap },
            { id: 'creations', label: 'Creative AI Showcase', icon: Sparkles },
            { id: 'radar', label: 'Intelligence Radar', icon: TrendingUp },
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

        {/* Creator Studio Upload Button */}
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Creator Studio</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-14">
        
        {/* Spotlight Hero Banner */}
        {(activeTab === 'all') && (
          <section className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-8 md:p-12 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold rounded-full flex items-center space-x-1.5">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                    <span>FEATURED MASTERCLASS</span>
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">1h 00m • Andrej Karpathy</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Intro to Large Language Models: How Neural Networks Think
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Die wêreldberoemde meesterklas deur Andrej Karpathy (Oud-Hoof van AI by Tesla en medestigter van OpenAI) oor hoe moderne modelle werk en wat kom.
                </p>

                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 tracking-wider">Sleutellesse</span>
                  <ul className="space-y-1.5">
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Hoe tokens, transformer-argitektuur en neurone berekeninge doen</span>
                    </li>
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Die toekoms van outonome agente as bedryfstelsels van die toekoms</span>
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
                    <span>Kyk Regte Meesterklas</span>
                  </button>

                  <a 
                    href="https://www.youtube.com/watch?v=zjkBMFhNj_g" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
                  >
                    <span>Maak oop op YouTube</span>
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

        {/* 🎙️ 2. FUTUREBOX PODCASTS (Regte YouTube Episodes) */}
        {(activeTab === 'all' || activeTab === 'futurebox') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Headphones className="w-5 h-5 text-emerald-400" />
                  <span>FutureBox Podcasts</span>
                </h3>
                <p className="text-xs text-zinc-400">Regte, wêreldberoemde podsendings oor die AI toekoms, sielkunde en besigheid.</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Regte Episodes
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {podcastsList.map((pod) => (
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
                      <p className="text-xs text-zinc-400">Gas: <span className="text-zinc-200 font-semibold">{pod.guest}</span></p>
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
                      <span>Speel Episode</span>
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

        {/* 🎓 3. REGTE MASTERCLASSES */}
        {(activeTab === 'all' || activeTab === 'masterclasses') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span>Masterclasses</span>
                </h3>
                <p className="text-xs text-zinc-400">Praktiese meesterklasse deur industriëleiers soos Andrej Karpathy en Y Combinator.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Geverifieerde Meesterklasse
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {masterclassesList.map((mc) => (
                <div 
                  key={mc.id}
                  className="group bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div 
                      onClick={() => setSelectedMedia({
                        title: mc.title,
                        embedUrl: mc.embedUrl,
                        externalUrl: mc.externalUrl,
                        type: 'youtube',
                        host: mc.instructor
                      })}
                      className="aspect-video relative overflow-hidden cursor-pointer"
                    >
                      <img src={mc.thumbnail} alt={mc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current translate-x-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                        {mc.level} • {mc.duration}
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <p className="text-[11px] font-mono text-zinc-400">Instrukteur: <span className="text-white font-semibold">{mc.instructor}</span></p>
                      <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors leading-snug">{mc.title}</h4>
                      
                      <div className="space-y-1 bg-black/30 p-2.5 rounded-xl border border-zinc-800/80">
                        {mc.takeaways.map((t, idx) => (
                          <p key={idx} className="text-[11px] text-zinc-300 flex items-center space-x-1.5">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{t}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60">
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
                      <span>Begin Meesterklas</span>
                    </button>

                    <a 
                      href={mc.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="hover:text-white flex items-center space-x-1 text-[11px]"
                    >
                      <span>Bron</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🎨 4. CREATIVE AI SHOWCASE MET REGTE GEREEDSKAP SKAKELS */}
        {(activeTab === 'all' || activeTab === 'creations') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Creative AI Showcase</span>
                </h3>
                <p className="text-xs text-zinc-400">Verken werklike AI modelle en generatiewe skeppings met direkte skakels na die amptelike platforms.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Regte AI Gereedskap
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {creativeAiList.map((creation) => (
                <div 
                  key={creation.id} 
                  className="group bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-video relative overflow-hidden">
                      <img src={creation.thumbnail} alt={creation.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {creation.tools.map((tool, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-black/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 rounded-md border border-cyan-500/30">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center space-x-2">
                        {creation.type === 'audio' ? <Music className="w-3.5 h-3.5 text-cyan-400" /> : <FileVideo className="w-3.5 h-3.5 text-cyan-400" />}
                        <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">{creation.medium}</span>
                      </div>
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors leading-snug">{creation.title}</h4>
                      <p className="text-xs text-zinc-400 font-mono bg-black/30 p-2.5 rounded-lg border border-zinc-800">
                        <span className="text-cyan-400 font-semibold">Prompt: </span>
                        &ldquo;{creation.prompt}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60">
                    <span>Deur {creation.creator}</span>
                    <a 
                      href={creation.toolUrl || creation.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30"
                    >
                      <span>Besoek Platform</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ⚡ 5. INTELLIGENCE RADAR MET REGTE BLUEPRINTS & DIREKTE SKAKELS */}
        {(activeTab === 'all' || activeTab === 'radar') && (
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Intelligence Radar</span>
              </h3>
              <p className="text-xs text-zinc-400">Regte tegnologieë, Vibe Coded produkte en markbloudrukke wat vandag gebruik word.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {blueprints.map((item, idx) => (
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

      {/* 🔍 BLUEPRINT DEEP DIVE MODAL MET REGTE SKAKEL */}
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
                  <p className="text-[10px] uppercase font-mono text-zinc-500">Inkomste / Potensiaal</p>
                  <p className="text-xs font-bold text-white">{selectedBlueprint.mrr}</p>
                </div>
              </div>
              <div className="bg-black/40 border border-zinc-800 p-3.5 rounded-2xl flex items-center space-x-3">
                <Clock className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-mono text-zinc-500">Bou-Tyd</p>
                  <p className="text-xs font-bold text-white">{selectedBlueprint.buildTime}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Aanbevole Tegnologie-Stapel (Tech Stack):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedBlueprint.techStack.map((tech, i) => (
                  <span key={i} className="px-3 py-1 bg-zinc-800/80 text-[11px] font-mono text-cyan-300 rounded-lg border border-zinc-700">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>Die Markgeleentheid & Waarom Dit Werk:</span>
              </label>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedBlueprint.opportunity}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Stap-vir-Stap Uitvoeringsplan:</span>
              </label>
              <div className="space-y-2">
                {selectedBlueprint.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2 border-t border-zinc-800">
              <a 
                href={selectedBlueprint.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2"
              >
                <Globe className="w-4 h-4" />
                <span>Besoek Amptelike Webtuiste ({selectedBlueprint.toolName})</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
              <button 
                onClick={() => setSelectedBlueprint(null)}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Sluit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 / 🎵 UNIVERSELE VIDEO & YOUTUBE SPELER MODAL */}
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

            {selectedMedia.type === 'youtube' && selectedMedia.embedUrl ? (
              <div className="aspect-video bg-black">
                <iframe 
                  src={selectedMedia.embedUrl} 
                  title={selectedMedia.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : selectedMedia.type === 'audio' ? (
              <div className="p-8 bg-gradient-to-b from-zinc-950 to-zinc-900 text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
                  <Disc3 className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-mono uppercase text-emerald-400 font-bold">Speel tans Neural AI Track</p>
                  <h4 className="text-base font-extrabold text-white">{selectedMedia.title}</h4>
                </div>
                <audio src="https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3" controls autoPlay className="w-full" />
              </div>
            ) : (
              <div className="aspect-video bg-black">
                <video src={selectedMedia.externalUrl} controls autoPlay className="w-full h-full object-contain" />
              </div>
            )}

            {/* Skakel onderaan die speler */}
            <div className="p-4 bg-black/50 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Wil jy die episode direk op YouTube bekyk?</span>
              <a 
                href={selectedMedia.externalUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
              >
                <span>Maak Oop op YouTube / Bron</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 CREATOR STUDIO MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Creator Studio & Oplaai-Ateljee</h3>
                  <p className="text-xs text-zinc-400">Publiseer video's, podcasts, of AI skeppings met regte skakels</p>
                </div>
              </div>
              <button onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-6">
              
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Stap 1: Kies die Medium-Formaat
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'video', label: 'Video / Reel', icon: FileVideo, desc: 'MP4, MOV, YouTube' },
                    { id: 'podcast', label: 'Podcast / Stem', icon: Mic, desc: 'MP3, Gesprekke' },
                    { id: 'music', label: 'AI Musiek / Track', icon: Music, desc: 'Suno / Udio' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = mediumType === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setMediumType(item.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                          isSelected 
                            ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
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

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Stap 2: Kies Kategorie vir Netjiese Kompilasies
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {categoriesList.map((cat, i) => (
                    <option key={i} value={cat} className="bg-zinc-900 text-white">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Stap 3: Laai jou {mediumType === 'video' ? 'Video' : mediumType === 'podcast' ? 'Podcast' : 'Musiek-Lêer'} op
                  </label>
                  <div className="flex space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMediaSource('link')}
                      className={`px-2.5 py-0.5 rounded-lg ${mediaSource === 'link' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500'}`}
                    >
                      Plak Skakel (YouTube/Spotify)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSource('file')}
                      className={`px-2.5 py-0.5 rounded-lg ${mediaSource === 'file' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500'}`}
                    >
                      Lêer vanaf rekenaar
                    </button>
                  </div>
                </div>

                {mediaSource === 'file' ? (
                  <div className="relative border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-black/40 transition-colors">
                    <input 
                      type="file" 
                      accept={mediumType === 'video' ? 'video/*' : 'audio/*'}
                      onChange={handleFileUploadSim}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center space-y-2 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-emerald-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      {uploadedFileName ? (
                        <p className="text-xs font-bold text-emerald-400">✓ Gekose lêer: {uploadedFileName}</p>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-zinc-200">Sleep jou {mediumType} lêer hierheen of <span className="text-emerald-400 underline">blaai op jou rekenaar</span></p>
                          <p className="text-[11px] text-zinc-500">Ondersteun {mediumType === 'video' ? 'MP4, MOV, WEBM' : 'MP3, WAV, M4A'} (Tot en met 500MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="url" 
                      value={mediaLink}
                      onChange={(e) => setMediaLink(e.target.value)}
                      placeholder="bv. https://youtube.com/watch?v=... of https://open.spotify.com/..."
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white pl-9 focus:outline-none focus:border-emerald-500"
                    />
                    <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Titel</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="bv. The Next 10 Years of AI & Wealth"
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Sleutellesse / Opsomming</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="bv. 3 Begrippe wat elke entrepreneur moet weet..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-zinc-800">
                <label className="block text-xs font-mono text-cyan-300">
                  AI Modelle & Gereedskap Gebruik:
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
                    AI Prompt / Notas (Opsioneel):
                  </label>
                  <textarea 
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="bv. Sintetiese oudio met Suno v3.5, prompt: Ambient futuristic synthwave..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 h-16"
                  />
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Etiese Hekwagter & Gemeenskapstandaarde</span>
                </div>
                <ul className="text-[11px] text-zinc-400 space-y-1">
                  <li>✓ <strong>Toegelaat:</strong> Opvoedkundige lesse, podcasts, AI musiek, en toekomsgerigte kuns.</li>
                  <li>✗ <strong>Streng Verbode:</strong> Geen geweld, geen pornografie/NSFW, geen bedrogspul (scams) of haatspraak nie.</li>
                </ul>
                <label className="flex items-start space-x-3 cursor-pointer pt-1 border-t border-emerald-500/20">
                  <input 
                    type="checkbox"
                    checked={confirmedSafe}
                    onChange={(e) => setConfirmedSafe(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-zinc-200 font-semibold leading-relaxed">
                    Ek verklaar dat my inhoud voldoen aan FutureBox se etiese en opvoedkundige standaarde.
                  </span>
                </label>
              </div>

              {auditStatus === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>✓ Etiese Hek Suksesvol Geslaag! Jou {mediumType} word nou gelaai en gepubliseer na FutureBox.</span>
                </div>
              )}

              {auditStatus === 'failed_safety' && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>✗ Etiese Hek Verwerping: Jou teks bevat terme wat ons etiese standaarde oortree.</span>
                </div>
              )}

              {auditStatus === 'failed_attestation' && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500 text-amber-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>⚠ Merk asseblief die Etiese Hekwagter boksie voor jy publiseer.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Skandeer Etiese Hek & Publiseer Inhoud</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
