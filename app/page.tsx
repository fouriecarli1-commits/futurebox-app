'use client';

import React, { useState } from 'react';
import { 
  Play, Sparkles, Radio, TrendingUp, ShieldCheck, 
  Tv, Cpu, ArrowUpRight, Compass, CheckCircle2, X
} from 'lucide-react';

export default function FutureBoxHome() {
  const [activeTab, setActiveTab] = useState<'all' | 'creations' | 'podcasts' | 'radar'>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string; prompt?: string } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);

  const handleTestUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedSafe) {
      setAuditStatus('failed_attestation');
      return;
    }
    const combined = `${title} ${description} ${promptText}`.toLowerCase();
    const banned = ['porn', 'xxx', 'violence', 'kill', 'scam', 'nude'];
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
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 selection:bg-emerald-500 selection:text-black">
      {/* 1. Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07080c]/80 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
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
        <nav className="hidden md:flex items-center space-x-1 bg-zinc-900/90 p-1.5 rounded-full border border-zinc-800">
          {[
            { id: 'all', label: 'Spotlight', icon: Compass },
            { id: 'podcasts', label: 'Masterclasses & Podcasts', icon: Tv },
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
          <Sparkles className="w-4 h-4" />
          <span>Creator Studio</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        
        {/* Spotlight Video */}
        {(activeTab === 'all' || activeTab === 'podcasts') && (
          <section className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-8 md:p-12 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold rounded-full flex items-center space-x-1.5">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                    <span>FEATURED MASTERCLASS</span>
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">1h 42m</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  The Architecture of the Next Decade: AGI, Autonomous Agents & Digital Immortality
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  An uncompromising 90-minute masterclass diving deep into the cognitive and technological shifts coming in the late 2020s.
                </p>

                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 tracking-wider">Key Takeaways</span>
                  <ul className="space-y-1.5">
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>How agents will replace traditional SaaS within 36 months</span>
                    </li>
                    <li className="text-xs text-zinc-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>The 3 moat-building principles for solo AI founders</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center space-x-4">
                  <button 
                    onClick={() => setSelectedVideo({
                      title: 'The Architecture of the Next Decade',
                      url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-41551-large.mp4'
                    })}
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Masterclass</span>
                  </button>
                </div>
              </div>

              <div 
                onClick={() => setSelectedVideo({
                  title: 'The Architecture of the Next Decade',
                  url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-41551-large.mp4'
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

        {/* Creative AI Showcase */}
        {(activeTab === 'all' || activeTab === 'creations') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>Creative AI Creations</span>
                </h3>
                <p className="text-xs text-zinc-400">Generative video reels, Sora experiments & AI cinema.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Ethically Verified
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  id: 'ai-1',
                  title: 'Neon Odyssey: Neo-Tokyo 2099',
                  creator: 'Kaelen Voss',
                  tools: ['Runway Gen-3', 'Midjourney v6.1', 'ElevenLabs'],
                  prompt: 'Cinematic wide shot of a hyper-dense cyber city in rain, holographic light trails, 8k anamorphic.',
                  thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
                  videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-41551-large.mp4'
                },
                {
                  id: 'ai-2',
                  title: 'Sentient Ecosystems: Deep Forest Microverse',
                  creator: 'Mira Chen',
                  tools: ['Kling AI', 'Luma Dream Machine', 'Suno v3.5'],
                  prompt: 'Macro shot of luminescent flora pulsing with bio-electricity, cellular division, microscopic precision.',
                  thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
                  videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-glowing-mushrooms-in-a-dark-forest-42967-large.mp4'
                }
              ].map((creation) => (
                <div 
                  key={creation.id} 
                  onClick={() => setSelectedVideo({ title: creation.title, url: creation.videoUrl, prompt: creation.prompt })}
                  className="group bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-cyan-500/50 transition-all cursor-pointer"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={creation.thumbnail} alt={creation.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-12 h-12 text-cyan-400 fill-current" />
                    </div>
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {creation.tools.map((tool, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-black/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 rounded-md border border-cyan-500/30">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{creation.title}</h4>
                    <p className="text-xs text-zinc-400 font-mono bg-black/30 p-2.5 rounded-lg border border-zinc-800">
                      <span className="text-cyan-400 font-semibold">Prompt: </span>
                      &ldquo;{creation.prompt}&rdquo;
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
                      <span>By {creation.creator}</span>
                      <span className="text-cyan-400 font-semibold">Watch Reel →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Intelligence Radar */}
        {(activeTab === 'all' || activeTab === 'radar') && (
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Intelligence Radar</span>
              </h3>
              <p className="text-xs text-zinc-400">Top Vibe Coded Apps, AI breakthrough news, and frontier business blueprints.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  tag: 'Top Vibe Coded App',
                  title: 'Autonomous Cold Outreach Agent with Voice Cloning',
                  desc: 'Built in 48 hours using Cursor + Next.js + LiveKit. Generates $14k MRR in first 3 weeks.'
                },
                {
                  tag: 'Business Opportunity',
                  title: 'Micro-SaaS for Local Business AI Phone Operators',
                  desc: 'A teardown of how to capture high-margin local service automation using Twilio + Gemini Live.'
                },
                {
                  tag: 'Top AI News',
                  title: 'Reasoning Models Surpass Human Benchmarks in Distributed Systems',
                  desc: 'Multi-step verification reduces hallucination rates to under 0.2%.'
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-zinc-900/40 rounded-2xl border border-zinc-800 p-5 space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                      {item.tag}
                    </span>
                    <h4 className="font-bold text-sm text-white leading-snug">{item.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <span>Inspect Blueprint</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">{selectedVideo.title}</h3>
              <button onClick={() => setSelectedVideo(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <video src={selectedVideo.url} controls autoPlay className="w-full h-full object-contain" />
            </div>
            {selectedVideo.prompt && (
              <div className="p-4 bg-black/40 border-t border-zinc-800 text-xs font-mono text-cyan-300">
                <span className="font-bold text-white">Prompt: </span> {selectedVideo.prompt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creator Studio & Ethical Gate Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-lg text-white">Creator Studio & Ethical Gate</h3>
              </div>
              <button onClick={() => { setUploadModalOpen(false); setAuditStatus(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTestUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next-Gen Generative 3D Pipelines"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Description & Takeaways</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the business model, takeaway points, or concept..."
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 h-20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">AI Prompt / Pipeline Used</label>
                <input 
                  type="text" 
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. Midjourney v6 + Kling AI text-to-video workflow..."
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-black/40 border border-zinc-800/80 p-4 rounded-xl">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={confirmedSafe}
                    onChange={(e) => setConfirmedSafe(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-zinc-300 leading-relaxed">
                    <strong>Ethical Gatekeeper Attestation:</strong> I certify this content complies with FutureBox standards (zero violence, no pornography/NSFW, no scams).
                  </span>
                </label>
              </div>

              {auditStatus === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500 text-emerald-300 text-xs font-semibold">
                  ✓ Ethical Gate Passed: Clean & Published to FutureBox!
                </div>
              )}

              {auditStatus === 'failed_safety' && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500 text-rose-300 text-xs">
                  ✗ Ethical Gate Blocked: Detected terms violating community standards.
                </div>
              )}

              {auditStatus === 'failed_attestation' && (
                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500 text-amber-300 text-xs">
                  ⚠ Please check the Ethical Gatekeeper box before submitting.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Verify & Publish Content
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
