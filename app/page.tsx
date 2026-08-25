'use client';

import React, { useState } from 'react';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, 
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X,
  UploadCloud, FileVideo, Music, Headphones, Lightbulb, Code2, 
  Link as LinkIcon, AlertCircle, Layers, DollarSign, Clock, 
  BookOpen, Bookmark, GraduationCap, Mic, Disc3, ExternalLink, Globe,
  Crown, Lock, Zap, RefreshCw, Send, Mail, Check, Star
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

export default function FutureBoxHome() {
  const [activeTab, setActiveTab] = useState<'all' | 'futurebox' | 'masterclasses' | 'creations' | 'radar'>('all');
  
  // User Plan State (Simuleer Gratis vs PRO)
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  // Modals State
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

  // AI Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('🟢 KI Skandeerder Aktief: Laaste tendense gesinchroniseer 2 minute gelede');

  // Creator Studio Form State
  const [mediumType, setMediumType] = useState<'music_video' | 'podcast' | 'ai_track'>('music_video');
  const [category, setCategory] = useState('Creative AI & Kuns');
  const [creatorDomain, setCreatorDomain] = useState('');
  const [title, setTitle] = useState('');
  const [lyricsOrPrompt, setLyricsOrPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Suno v3.5', 'Runway Gen-3']);
  const [mediaLink, setMediaLink] = useState('');
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);

  // Marketing Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactBudget, setContactBudget] = useState('R5,000 - R20,000 / maand');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const availableTools = ['Suno v3.5', 'Udio AI', 'Runway Gen-3', 'Midjourney v6', 'Kling AI', 'Sora', 'ElevenLabs Voice', 'Luma Dream Machine'];
  const categoriesList = ['Creative AI & Musiekvideos', 'AI Toekoms & AGI', 'Besigheid & Rykdom', 'Sielkunde & Motivering', 'Vibe Apps & Kode'];

  const handleAiScanRefresh = () => {
    setIsScanning(true);
    setScanMessage('⚡ KI skandeer tans YouTube, X/Twitter, Substack en Navorsingswolk...');
    setTimeout(() => {
      setIsScanning(false);
      setScanMessage('✓ KI Skandering Voltooi: 4 nuwe virale tendense en podcasts bygevoeg!');
    }, 2500);
  };

  const handleMarketingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:admin@futurebox.app?subject=Bemarkingsversoek vanaf ${encodeURIComponent(contactName)} (${encodeURIComponent(contactBudget)})&body=${encodeURIComponent(`Naam: ${contactName}\nE-pos: ${contactEmail}\nBegroting: ${contactBudget}\nBoodskap:\n${contactMessage}`)}`;
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
    
    // Gaan na as Gratis gebruiker probeer Podcast oplaai sonder PRO
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
      
      {/* 1. Glowing Futuristic Header */}
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
                  <span>PRO LID</span>
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
            { id: 'creations', label: 'Creative AI Musiek & Video', icon: Sparkles },
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

        {/* Aksie Knoppies */}
        <div className="flex items-center space-x-3">
          {userPlan === 'free' ? (
            <button
              onClick={() => setPricingModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Gradeer op na PRO ($19)</span>
            </button>
          ) : (
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>PRO Geaktiveer</span>
            </span>
          )}

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Creator Studio</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-14 flex-1 w-full">
        
        {/* 🟢 LEWENDIGE AI TRENDS PULSE & SKANDEERDER BANNER */}
        <section className="bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white flex items-center space-x-2">
                <span>Outonome KI Tendens-Radar</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Intyds</span>
              </p>
              <p className="text-zinc-400 text-[11px]">{scanMessage}</p>
            </div>
          </div>

          <button
            onClick={handleAiScanRefresh}
            disabled={isScanning}
            className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all border border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Skandeer tendense...' : 'Her-skandeer met KI'}</span>
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
                    <span>GRATIS UITGELIGTE MEESTERKLAS</span>
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
                  <span className="text-[11px] font-mono uppercase text-emerald-400 tracking-wider">Sleutellesse vir Toekomstige Groei</span>
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
                    <span>Kyk Gratis Meesterklas</span>
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

        {/* 🎙️ 2. FUTUREBOX PODCASTS (Diary of a CEO, Lex Fridman, Huberman) */}
        {(activeTab === 'all' || activeTab === 'futurebox') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Headphones className="w-5 h-5 text-emerald-400" />
                  <span>FutureBox Podcasts</span>
                </h3>
                <p className="text-xs text-zinc-400">Diepgaande podcasts oor toekomstige rykdom, AI en lewenssielkunde.</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Top Podsendings
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
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
              ].map((pod) => (
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

        {/* 🎓 3. MASTERCLASSES (Insluitend PRO Gated Inhoud) */}
        {(activeTab === 'all' || activeTab === 'masterclasses') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span>Masterclasses</span>
                </h3>
                <p className="text-xs text-zinc-400">Gevorderde argitektuur en besigheidsbou in die AI era.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Geverifieerde Meesterklasse
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  id: 'mc-1',
                  title: 'Building & Scaling a $50k/MRR AI Micro-SaaS Solo',
                  instructor: 'Garry Tan (CEO, Y Combinator)',
                  duration: '45m',
                  level: 'Besigheid & Stigters',
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
                  level: 'Gevorderde Argitektuur',
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
                  level: 'PRO Meesterklas',
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
                        <span>PRO SLEGS</span>
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
                        <p className="text-[11px] font-mono text-zinc-400">Instrukteur: <span className="text-white font-semibold">{mc.instructor}</span></p>
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
                          <span>Ontsluit met PRO ($19)</span>
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
                          <span>Begin Meesterklas</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 🎨 4. CREATIVE AI MUSIEK & MUSIEKVIDEOS MET SKEPPER-KANALE */}
        {(activeTab === 'all' || activeTab === 'creations') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Creative AI Musiek & Musiekvideos</span>
                </h3>
                <p className="text-xs text-zinc-400">Die sentrale platform soos 'n YouTube vir generatiewe liedjies, musiekvideos en skepper-kanale.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Skepper Kanale
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  id: 'ai-1',
                  title: 'Cybernetic Odyssey (Amptelike AI Musiekvideo)',
                  creator: 'SynthMind Studio',
                  domain: 'futurebox.app/@synthmind',
                  medium: 'AI Musiekvideo',
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
                  medium: 'Neural AI Musiek',
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
                        <span className="text-cyan-400 font-semibold">Liriek/Prompt: </span>
                        &ldquo;{creation.prompt}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60">
                    <span>Deur {creation.creator}</span>
                    <a 
                      href={creation.externalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30"
                    >
                      <span>Besoek Gereedskap</span>
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
              <p className="text-xs text-zinc-400">Regte tegnologieë, Vibe Coded produkte en markbloudrukke wat vandag gebruik word.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
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

      {/* 👑 PRICING & PRO OPGRADEER MODAL ($19 / MAAND) */}
      {pricingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/50 w-full max-w-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">FutureBox PRO Intekening</h3>
                  <p className="text-xs text-zinc-400">Ontsluit volle toegang tot masterclasses, podcasts en skepper-kanale</p>
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
                  <span className="text-xs text-zinc-400 font-mono"> / maand</span>
                </div>
                <span className="text-xs font-mono font-bold bg-amber-500 text-black px-2.5 py-1 rounded-full">
                  Mees Gewild
                </span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-200">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Onbeperkte toegang tot alle 4K Meesterklasse & Podcasts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>Vermoë om volle Podcasts & Reeks-inhoud op te laai</strong></span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span><strong>Jou eie Pasgemaakte Skepper-Kanaal</strong> (`futurebox.app/@jou-naam`)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Volledige aflaai van alle Mark-Blueprints & Sagteware Kode</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setUserPlan('pro');
                  setPricingModalOpen(false);
                  alert('🎉 Baie geluk! Jou rekening is nou opgegradeer na FutureBox PRO!');
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center space-x-2"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Aktiveer PRO Lidmaatskap ($19 / Maand)</span>
              </button>
              <p className="text-[10px] text-center text-zinc-500">Kanselleer enige tyd met een klik. Veilige betalings via Stripe.</p>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 CREATOR STUDIO MET DOMEIN-KEUSE VIR LIEDJIES & PODCASTS */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Creator Studio & Musiek-Ateljee</h3>
                  <p className="text-xs text-zinc-400">Skryf liedjies, laai musiekvideo's en podcasts op met jou eie kanaal-domein</p>
                </div>
              </div>
              <button onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-6">
              
              {/* STAP 1: KIES MEDIUM */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Stap 1: Kies Medium
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'music_video', label: 'AI Musiekvideo', icon: FileVideo, desc: 'Suno + Runway' },
                    { id: 'ai_track', label: 'Neural Liedjie', icon: Music, desc: 'Suno / Udio Oudio' },
                    { id: 'podcast', label: 'Podcast Episode', icon: Mic, desc: 'PRO Intekenaars', isProReq: true },
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

              {/* STAP 2: SKEPPER SE EIE KANAAL DOMEIN */}
              <div className="space-y-1.5 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Jou Eie Skepper-Kanaal Domein:</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-400 px-3 py-2.5 rounded-l-xl text-xs font-mono">
                    futurebox.app/@
                  </span>
                  <input
                    type="text"
                    value={creatorDomain}
                    onChange={(e) => setCreatorDomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="jou-kunstenaarsnaam"
                    className="w-full bg-black/60 border border-zinc-700 rounded-r-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Mense kan hierdie skakel gebruik om al jou musiekvideos en liedjies op een plek te sien.</p>
              </div>

              {/* STAP 3: TITEL & SKAKEL */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Titel van Liedjie / Video</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="bv. Cybernetic Soul (AI Video)"
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Media Skakel (YouTube / Suno / MP4)</label>
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

              {/* STAP 4: LIERIEK & AI PROMPTS */}
              <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-zinc-800">
                <label className="block text-xs font-mono text-cyan-300">
                  AI Modelle Gebruik:
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
                    Liedjie-Lirieke & AI Prompts:
                  </label>
                  <textarea 
                    value={lyricsOrPrompt}
                    onChange={(e) => setLyricsOrPrompt(e.target.value)}
                    placeholder="Skryf jou lirieke of die AI prompts wat gebruik is om die musiek en video te genereer..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 h-20"
                  />
                </div>
              </div>

              {/* ETIESE HEKWAGTER */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Etiese Hekwagter & Outeursreg</span>
                </div>
                <label className="flex items-start space-x-3 cursor-pointer pt-1">
                  <input 
                    type="checkbox"
                    checked={confirmedSafe}
                    onChange={(e) => setConfirmedSafe(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-zinc-200 font-semibold leading-relaxed">
                    Ek verklaar dat hierdie inhoud vry is van geweld, haatspraak, pornografie/NSFW, en ek besit die regte om dit op FutureBox te deel.
                  </span>
                </label>
              </div>

              {/* Terugvoer */}
              {auditStatus === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>✓ Etiese Hek Suksesvol Geslaag! Jou inhoud is nou beskikbaar by futurebox.app/@{creatorDomain || 'jou-naam'}</span>
                </div>
              )}

              {auditStatus === 'failed_safety' && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>✗ Etiese Hek Verwerping: Gevaarlike of onvanpaste terme bespeur.</span>
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
                <span>Publiseer na My Skepper-Kanaal</span>
              </button>
            </form>
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
              <span className="text-xs text-zinc-400">Wil jy die episode direk op YouTube bekyk?</span>
              <a 
                href={selectedMedia.externalUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
              >
                <span>Maak Oop op YouTube</span>
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

            <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>Die Markgeleentheid:</span>
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

      {/* 📧 6. PROFESSIONELE BEMARKING & ADVERTENSIE KONTAKVORM FOOTER */}
      <footer className="border-t border-zinc-800/80 bg-[#050608] mt-16 px-6 py-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          
          {/* Linker kant: Oor FutureBox & Borgskappe */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-black font-bold" />
              </div>
              <span className="text-lg font-black text-white">FUTURE<span className="text-emerald-400">BOX</span></span>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Die premier digitale leerplatform en Creative AI ekostelsel vir die toekoms van werk, besigheid en kuns. 
              Bereik duisende vooruitstrewende entrepreneurs, tegnologieleiers en AI-skeppers.
            </p>

            <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center space-x-1.5">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Bemarkings- & Borgskapvoordele</span>
              </span>
              <ul className="text-xs text-zinc-300 space-y-1">
                <li>• Plasing in die daaglikse AI Trends Radar</li>
                <li>• Toegewyde borgskap in FutureBox Masterclasses & Podcasts</li>
                <li>• Direkte blootstelling aan hoë-waarde solo AI-stigters</li>
              </ul>
            </div>
          </div>

          {/* Regter kant: Die Werklike E-pos Kontakvorm */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-6 md:p-8 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-white">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h4 className="font-extrabold text-base">Bemark op FutureBox (Kontak My)</h4>
            </div>
            <p className="text-xs text-zinc-400">Vul hierdie vorm in om 'n direkte borgskap- of advertensie-versoek per e-pos aan my te stuur.</p>

            <form onSubmit={handleMarketingSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jou Naam / Maatskappy"
                  className="bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Jou E-posadres"
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
                  <option value="R5,000 - R15,000 / maand">Bemarkingsbegroting: R5,000 - R15,000 / maand</option>
                  <option value="R15,000 - R50,000 / maand">Bemarkingsbegroting: R15,000 - R50,000 / maand</option>
                  <option value="R50,000+ / Hoofborg">Bemarkingsbegroting: R50,000+ (Hoofborg)</option>
                </select>
              </div>

              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Beskryf jou produk of borgskap-idee..."
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-20"
                required
              />

              {contactSent && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Jou e-posprogram maak nou oop om die boodskap direk te stuur!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Stuur Bemarkingsnavraag</span>
              </button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 FutureBox Platform. Alle regte voorbehou.</p>
          <div className="flex space-x-6">
            <span>Privaatheidsbeleid</span>
            <span>Etiese Riglyne</span>
            <span>Bepalings & Voorwaardes</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
