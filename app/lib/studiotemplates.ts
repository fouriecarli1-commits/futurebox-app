/**
 * Starter Templates Library for FutureBox Photo & Video Studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli: *"Dan weet ek nie of google 'n template pack het waarvan 'n video
 * of foto kan begin nie? Dit is wat meeste editing programme amazing maak
 * is hulle templates."*
 *
 * Provides pre-designed templates matching Screenshots 3, 4, 5:
 *   - Pitch decks & Presentations (Pitch Deck, Startup, Proposal, Porto)
 *   - Video templates (Beautiful Village 4K, Explore Nature, Lessons Learned, Places)
 *   - Social posts & Stories (Nomade, Digital 2026, Certificate, QR Promo)
 *   - All 19 standard categories populated with rich, vector-crafted templates:
 *     Presentations, Posters, Flyers, Brochures, Business Cards, Logos, Menus,
 *     Resumes, Invitations, Websites, Sheets, Documents, Emails, Collages, etc.
 */

export interface StudioTemplateItem {
  readonly id: string;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly subKey: string;
  readonly subEn: string;
  readonly subAf: string;
  readonly category: string;
  readonly width: number;
  readonly height: number;
  readonly ratioLabel: string;
  readonly previewSvg: string;
  readonly bgGradient?: string;
  readonly sampleHeadline?: string;
  readonly sampleSubtext?: string;
  readonly isVideo?: boolean;
}

const encodeSvg = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export interface TemplateCategoryMeta {
  readonly id: string;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly iconType: string;
  readonly colorBg: string;
}

export const TEMPLATE_CATEGORIES: readonly TemplateCategoryMeta[] = [
  { id: 'presentation', nameKey: 'tplcat.presentation', nameEn: 'Presentation', nameAf: 'Aanbieding', iconType: 'monitor', colorBg: 'from-amber-500/20 to-orange-500/30' },
  { id: 'poster', nameKey: 'tplcat.poster', nameEn: 'Poster', nameAf: 'Plakkaat', iconType: 'image', colorBg: 'from-purple-500/20 to-indigo-500/30' },
  { id: 'resume', nameKey: 'tplcat.resume', nameEn: 'Resume', nameAf: 'CV / Resume', iconType: 'file', colorBg: 'from-blue-500/20 to-sky-500/30' },
  { id: 'email', nameKey: 'tplcat.email', nameEn: 'Email', nameAf: 'E-pos', iconType: 'mail', colorBg: 'from-violet-500/20 to-purple-500/30' },
  { id: 'invitation', nameKey: 'tplcat.invitation', nameEn: 'Invitation', nameAf: 'Uitnodiging', iconType: 'sparkles', colorBg: 'from-pink-500/20 to-rose-500/30' },
  { id: 'logo', nameKey: 'tplcat.logo', nameEn: 'Logo', nameAf: 'Kenteken', iconType: 'circle', colorBg: 'from-amber-400/20 to-yellow-500/30' },
  { id: 'flyer', nameKey: 'tplcat.flyer', nameEn: 'Flyer', nameAf: 'Pamflet', iconType: 'file-text', colorBg: 'from-teal-500/20 to-emerald-500/30' },
  { id: 'brochure', nameKey: 'tplcat.brochure', nameEn: 'Brochure', nameAf: 'Brosjure', iconType: 'book', colorBg: 'from-orange-500/20 to-red-500/30' },
  { id: 'menu', nameKey: 'tplcat.menu', nameEn: 'Menu', nameAf: 'Spyskaart', iconType: 'coffee', colorBg: 'from-lime-500/20 to-green-500/30' },
  { id: 'doc', nameKey: 'tplcat.doc', nameEn: 'Doc', nameAf: 'Dokument', iconType: 'file', colorBg: 'from-cyan-500/20 to-blue-500/30' },
  { id: 'website', nameKey: 'tplcat.website', nameEn: 'Website', nameAf: 'Webwerf', iconType: 'globe', colorBg: 'from-indigo-500/20 to-purple-500/30' },
  { id: 'sheet', nameKey: 'tplcat.sheet', nameEn: 'Sheet', nameAf: 'Sigblad', iconType: 'table', colorBg: 'from-emerald-500/20 to-teal-500/30' },
  { id: 'ig_post', nameKey: 'tplcat.igPost', nameEn: 'Instagram Post', nameAf: 'Instagram Plasing', iconType: 'square', colorBg: 'from-rose-500/20 to-pink-500/30' },
  { id: 'ig_story', nameKey: 'tplcat.igStory', nameEn: 'Instagram Story', nameAf: 'Instagram Storie', iconType: 'smartphone', colorBg: 'from-fuchsia-500/20 to-pink-500/30' },
  { id: 'landscape_video', nameKey: 'tplcat.landscapeVideo', nameEn: 'Landscape Video', nameAf: 'Landskap Video', iconType: 'film', colorBg: 'from-purple-500/20 to-violet-500/30' },
  { id: 'mobile_video', nameKey: 'tplcat.mobileVideo', nameEn: 'Mobile Video', nameAf: 'Mobiele Video', iconType: 'video', colorBg: 'from-sky-500/20 to-indigo-500/30' },
  { id: 'facebook_post', nameKey: 'tplcat.fbPost', nameEn: 'Facebook Post', nameAf: 'Facebook Plasing', iconType: 'share', colorBg: 'from-blue-600/20 to-indigo-600/30' },
  { id: 'business_card', nameKey: 'tplcat.bizCard', nameEn: 'Business Card', nameAf: 'Besigheidskaart', iconType: 'credit-card', colorBg: 'from-emerald-500/20 to-green-500/30' },
  { id: 'photo_collage', nameKey: 'tplcat.collage', nameEn: 'Photo Collage', nameAf: 'Foto-Collage', iconType: 'grid', colorBg: 'from-amber-500/20 to-rose-500/30' },
];

export const STARTER_TEMPLATES: readonly StudioTemplateItem[] = [
  // ── 1. Pitch Decks & Presentations (Screenshot 4) ──
  {
    id: 'tpl_pitch_deck',
    nameKey: 'tpl.pitchDeck',
    nameEn: 'PITCH DECK',
    nameAf: 'VOORLEGGING',
    subKey: 'tpl.pitchDeckSub',
    subEn: 'Strategic Consulting 2025',
    subAf: 'Strategiese Konsultasie 2025',
    category: 'presentation',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'PITCH DECK',
    sampleSubtext: 'STRATEGIC CONSULTING • 2025',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#7f1d1d" />
        <rect x="0" y="0" width="1920" height="1080" fill="url(#pitchG)" />
        <defs>
          <linearGradient id="pitchG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#991b1b" />
            <stop offset="100%" stop-color="#450a0a" />
          </linearGradient>
        </defs>
        <text x="120" y="440" font-family="impact, sans-serif" font-weight="900" font-size="280" fill="#fef2f2" letter-spacing="-2">PITCH</text>
        <text x="120" y="700" font-family="impact, sans-serif" font-weight="900" font-size="280" fill="#fef2f2" letter-spacing="-2">DECK</text>
        <text x="120" y="980" font-family="monospace" font-weight="700" font-size="42" fill="#fca5a5">2025</text>
        <text x="1200" y="980" font-family="sans-serif" font-weight="900" font-size="44" fill="#ffffff" letter-spacing="4">STRATEGIC CONSULTING</text>
        <rect x="1720" y="100" width="80" height="80" rx="16" fill="none" stroke="#fca5a5" stroke-width="8" />
      </svg>
    `),
  },
  {
    id: 'tpl_startup',
    nameKey: 'tpl.startup',
    nameEn: 'Startup. Pitch Deck',
    nameAf: 'Beginonderneming Aanbieding',
    subKey: 'tpl.startupSub',
    subEn: 'Cloudlet Tech Modern Deck',
    subAf: 'Cloudlet Tegnologie Moderne Styl',
    category: 'presentation',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'Startup.',
    sampleSubtext: 'Pitch Deck Presentation',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="startG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#bae6fd" />
            <stop offset="50%" stop-color="#e0f2fe" />
            <stop offset="100%" stop-color="#7dd3fc" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#startG)" />
        <line x1="120" y1="180" x2="1800" y2="180" stroke="#0284c7" stroke-width="4" opacity="0.6" />
        <text x="120" y="140" font-family="sans-serif" font-weight="700" font-size="48" fill="#0369a1">❖ Cloudlet Tech</text>
        <text x="120" y="660" font-family="sans-serif" font-weight="900" font-size="240" fill="#0f172a" letter-spacing="-6">Startup.</text>
        <text x="1400" y="640" font-family="sans-serif" font-weight="600" font-size="52" fill="#334155">Pitch Deck</text>
        <text x="1400" y="700" font-family="sans-serif" font-weight="400" font-size="44" fill="#64748b">Presentation</text>
      </svg>
    `),
  },
  {
    id: 'tpl_proposal',
    nameKey: 'tpl.proposal',
    nameEn: 'Business Proposal',
    nameAf: 'Besigheidsvoorstel',
    subKey: 'tpl.proposalSub',
    subEn: 'Modern Corporate Deck',
    subAf: 'Moderne Korporatiewe Styl',
    category: 'presentation',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'BUSINESS PROPOSAL',
    sampleSubtext: 'COMPANY STRATEGY 2026',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="propG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#propG)" />
        <polyline points="120,120 140,140 180,95" fill="none" stroke="#0284c7" stroke-width="12" stroke-linecap="round" />
        <text x="210" y="125" font-family="sans-serif" font-weight="900" font-size="44" fill="#0f172a">COMPANY</text>
        <text x="120" y="520" font-family="sans-serif" font-weight="900" font-size="190" fill="#0369a1" letter-spacing="-2">BUSINESS</text>
        <text x="120" y="720" font-family="sans-serif" font-weight="900" font-size="190" fill="#0f172a" letter-spacing="-2">PROPOSAL</text>
        <text x="120" y="960" font-family="monospace" font-weight="700" font-size="38" fill="#0284c7">WWW.FUTUREBOX.APP</text>
      </svg>
    `),
  },
  {
    id: 'tpl_presentation_noah',
    nameKey: 'tpl.presNoah',
    nameEn: 'Creative Circles Presentation',
    nameAf: 'Kreatiewe Sirkels Aanbieding',
    subKey: 'tpl.presNoahSub',
    subEn: 'Warm Ivory & Blue Circles',
    subAf: 'Warm Ivoor & Blou Sirkels',
    category: 'presentation',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'Presentation',
    sampleSubtext: 'Creative Showcase',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#fafaf9" />
        <circle cx="160" cy="180" r="140" fill="#bae6fd" opacity="0.6" />
        <circle cx="280" cy="240" r="80" fill="none" stroke="#0284c7" stroke-width="8" />
        <circle cx="1700" cy="220" r="120" fill="#0284c7" opacity="0.8" />
        <circle cx="1520" cy="140" r="60" fill="#93c5fd" opacity="0.7" />
        <circle cx="1800" cy="880" r="180" fill="#bae6fd" opacity="0.7" />
        <circle cx="120" cy="940" r="90" fill="#0284c7" opacity="0.5" />
        <text x="960" y="560" font-family="serif" font-weight="700" font-size="180" fill="#1e3a8a" text-anchor="middle">Presentation</text>
        <text x="960" y="680" font-family="sans-serif" font-weight="500" font-size="52" fill="#64748b" text-anchor="middle">By Creative Studio</text>
      </svg>
    `),
  },
  {
    id: 'tpl_porto',
    nameKey: 'tpl.porto',
    nameEn: 'PORTO Editorial',
    nameAf: 'PORTO Redaksioneel',
    subKey: 'tpl.portoSub',
    subEn: 'Monochrome Bold Minimalist',
    subAf: 'Monochroom Vetgedruk Minimaal',
    category: 'presentation',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'PORTO',
    sampleSubtext: 'CREATIVE DESIGN 2026',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#09090b" />
        <text x="120" y="700" font-family="impact, sans-serif" font-weight="900" font-size="340" fill="#ffffff" letter-spacing="12">PORTO</text>
        <text x="1400" y="960" font-family="sans-serif" font-weight="700" font-size="44" fill="#a1a1aa">Creative Presentation</text>
      </svg>
    `),
  },

  // ── 2. Cinematic & Video Templates (Screenshot 5) ──
  {
    id: 'tpl_village_video',
    nameKey: 'tpl.village',
    nameEn: 'Beautiful Village 4K',
    nameAf: 'Pragtige Vallei 4K',
    subKey: 'tpl.villageSub',
    subEn: 'Scenic Landscape Camera View',
    subAf: 'Natuurskoon Kamera-oorsig',
    category: 'landscape_video',
    isVideo: true,
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'BEAUTIFUL VILLAGE',
    sampleSubtext: '4K CINEMATIC EXPLORATION',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="vG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="45%" stop-color="#86efac" />
            <stop offset="100%" stop-color="#15803d" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#vG)" />
        <polygon points="0,500 400,280 800,520 1200,320 1600,480 1920,380 1920,1080 0,1080" fill="#166534" opacity="0.8" />
        <rect x="80" y="80" width="1760" height="920" rx="30" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.7" />
        <circle cx="160" cy="160" r="22" fill="#ef4444" />
        <text x="200" y="175" font-family="monospace" font-weight="900" font-size="48" fill="#ffffff">REC</text>
        <text x="960" y="580" font-family="impact, sans-serif" font-weight="900" font-size="140" fill="#facc15" text-anchor="middle" letter-spacing="4">BEAUTIFUL VILLAGE</text>
        <line x1="80" y1="920" x2="800" y2="920" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
      </svg>
    `),
  },
  {
    id: 'tpl_nature_video',
    nameKey: 'tpl.nature',
    nameEn: 'Explore Nature',
    nameAf: 'Verken die Natuur',
    subKey: 'tpl.natureSub',
    subEn: 'Deep Evergreen Forest',
    subAf: 'Diep Dennewoud Kinematies',
    category: 'landscape_video',
    isVideo: true,
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'N A T U R E',
    sampleSubtext: 'EXPLORE THE WILD',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="natG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#064e3b" />
            <stop offset="60%" stop-color="#022c22" />
            <stop offset="100%" stop-color="#000000" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#natG)" />
        <text x="960" y="560" font-family="sans-serif" font-weight="300" font-size="160" fill="#f0fdf4" text-anchor="middle" letter-spacing="38">N A T U R E</text>
        <text x="960" y="680" font-family="monospace" font-weight="600" font-size="44" fill="#a7f3d0" text-anchor="middle" letter-spacing="10">EXPLORE THE UNKNOWN</text>
      </svg>
    `),
  },
  {
    id: 'tpl_cyber_video',
    nameKey: 'tpl.cyberVideo',
    nameEn: 'Metropolis 2026 Night Flight',
    nameAf: 'Metropolis 2026 Nagvlug',
    subKey: 'tpl.cyberVideoSub',
    subEn: 'Futuristic Cyberpunk Drone Footage',
    subAf: 'Futuristiese Kuberstad Hommeltuig-video',
    category: 'landscape_video',
    isVideo: true,
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'METROPOLIS 2026',
    sampleSubtext: 'NEON SKYLINE • GOOGLE VEO 4K',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="cybVG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="60%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#020617" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#cybVG)" />
        <polygon points="120,1080 280,480 440,1080" fill="#312e81" opacity="0.6" />
        <polygon points="400,1080 620,340 840,1080" fill="#1e1b4b" opacity="0.8" />
        <polygon points="900,1080 1150,260 1400,1080" fill="#4338ca" opacity="0.5" />
        <polygon points="1350,1080 1550,520 1750,1080" fill="#312e81" opacity="0.7" />
        <line x1="0" y1="920" x2="1920" y2="920" stroke="#06b6d4" stroke-width="4" opacity="0.8" />
        <circle cx="160" cy="160" r="16" fill="#06b6d4" />
        <text x="195" y="172" font-family="monospace" font-weight="700" font-size="36" fill="#38bdf8">4K 60FPS ISO 400</text>
        <text x="960" y="520" font-family="impact, sans-serif" font-weight="900" font-size="150" fill="#f8fafc" text-anchor="middle" letter-spacing="8">METROPOLIS 2026</text>
        <text x="960" y="620" font-family="monospace" font-weight="600" font-size="44" fill="#a5f3fc" text-anchor="middle" letter-spacing="6">NEON SKYLINE • GOOGLE VEO</text>
      </svg>
    `),
  },
  {
    id: 'tpl_lessons_story',
    nameKey: 'tpl.lessons',
    nameEn: 'Lessons I’ve Learned',
    nameAf: 'Lesse Wat Ek Geleer Het',
    subKey: 'tpl.lessonsSub',
    subEn: 'Golden Sunset Story',
    subAf: 'Goue Sonsondergang Storie',
    category: 'ig_story',
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    sampleHeadline: 'Lessons I’ve Learned',
    sampleSubtext: 'About Love & Growth',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="lessG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1e1b4b" />
            <stop offset="40%" stop-color="#d97706" />
            <stop offset="80%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#78350f" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#lessG)" />
        <circle cx="540" cy="820" r="70" fill="#451a03" />
        <path d="M420 1200 L660 1200 L590 920 L490 920 Z" fill="#451a03" />
        <text x="540" y="1450" font-family="serif" font-weight="700" font-size="82" fill="#ffffff" text-anchor="middle">Lessons</text>
        <text x="540" y="1540" font-family="serif" font-style="italic" font-size="70" fill="#fef08a" text-anchor="middle">I’ve Learned</text>
        <text x="540" y="1620" font-family="sans-serif" font-weight="900" font-size="48" fill="#ffffff" text-anchor="middle" letter-spacing="4">ABOUT LOVE</text>
      </svg>
    `),
  },
  {
    id: 'tpl_drop_story',
    nameKey: 'tpl.dropStory',
    nameEn: 'Midnight Product Drop Story',
    nameAf: 'Middernag Produkbekendstelling Storie',
    subKey: 'tpl.dropStorySub',
    subEn: 'Countdown & New Single Story',
    subAf: 'Aftelling & Nuwe Enkelspeler Storie',
    category: 'ig_story',
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    sampleHeadline: 'DROPPING TONIGHT',
    sampleSubtext: 'STREAM EVERYWHERE AT MIDNIGHT',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="drpG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#18181b" />
            <stop offset="50%" stop-color="#2e1065" />
            <stop offset="100%" stop-color="#09090b" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#drpG)" />
        <rect x="80" y="240" width="920" height="180" rx="36" fill="#3b0764" stroke="#c084fc" stroke-width="6" />
        <text x="540" y="355" font-family="monospace" font-weight="900" font-size="64" fill="#f5d0fe" text-anchor="middle" letter-spacing="6">00 : 14 : 32</text>
        <text x="540" y="780" font-family="impact, sans-serif" font-weight="900" font-size="140" fill="#ffffff" text-anchor="middle" letter-spacing="4">DROPPING</text>
        <text x="540" y="920" font-family="impact, sans-serif" font-weight="900" font-size="140" fill="#e879f9" text-anchor="middle" letter-spacing="4">TONIGHT</text>
        <rect x="240" y="1040" width="600" height="120" rx="24" fill="#a855f7" />
        <text x="540" y="1115" font-family="sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">PRE-SAVE TRACK</text>
        <polygon points="540,1650 510,1600 570,1600" fill="#ffffff" />
        <text x="540" y="1720" font-family="sans-serif" font-weight="700" font-size="34" fill="#e2e8f0" text-anchor="middle">SWIPE UP FOR PASS</text>
      </svg>
    `),
  },
  {
    id: 'tpl_places_reel',
    nameKey: 'tpl.places',
    nameEn: 'Places You Shouldn’t Miss',
    nameAf: 'Plekke Wat Jy Moet Sien',
    subKey: 'tpl.placesSub',
    subEn: 'Urban Travel Video Reel',
    subAf: 'Stadstoer Video-kortgreep',
    category: 'mobile_video',
    isVideo: true,
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    sampleHeadline: 'PLACES YOU SHOULDN’T MISS',
    sampleSubtext: 'EPISODE 04 • CAPE TOWN',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="plcG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="60%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#plcG)" />
        <rect x="80" y="120" width="920" height="1100" rx="30" fill="#334155" opacity="0.5" />
        <text x="140" y="1380" font-family="impact, sans-serif" font-weight="900" font-size="105" fill="#fef08a" letter-spacing="2">PLACES</text>
        <text x="140" y="1490" font-family="impact, sans-serif" font-weight="900" font-size="105" fill="#ffffff" letter-spacing="2">YOU SHOULDN’T</text>
        <text x="140" y="1600" font-family="impact, sans-serif" font-weight="900" font-size="105" fill="#f59e0b" letter-spacing="2">MISS</text>
        <text x="140" y="1720" font-family="sans-serif" font-weight="700" font-size="44" fill="#94a3b8">THIS WEEKEND • GUIDE</text>
      </svg>
    `),
  },
  {
    id: 'tpl_workout_reel',
    nameKey: 'tpl.workoutReel',
    nameEn: 'High-BPM Workout Reel',
    nameAf: 'Hoë-BPM Oefenkortgreep',
    subKey: 'tpl.workoutReelSub',
    subEn: 'Dynamic Athletic Motion Beat Video',
    subAf: 'Dinamiese Atletiese Bewegingsvideo',
    category: 'mobile_video',
    isVideo: true,
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    sampleHeadline: 'CRUSH YOUR LIMITS',
    sampleSubtext: '140 BPM • HIIT CARDIO EXPLOSION',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill="#09090b" />
        <polygon points="0,0 1080,420 1080,480 0,60" fill="#84cc16" opacity="0.2" />
        <polygon points="0,700 1080,1120 1080,1180 0,760" fill="#84cc16" opacity="0.3" />
        <rect x="80" y="120" width="300" height="70" rx="18" fill="#84cc16" />
        <text x="230" y="168" font-family="monospace" font-weight="900" font-size="38" fill="#000000" text-anchor="middle">140 BPM</text>
        <text x="540" y="980" font-family="impact, sans-serif" font-weight="900" font-size="130" fill="#ffffff" text-anchor="middle" letter-spacing="4">CRUSH</text>
        <text x="540" y="1110" font-family="impact, sans-serif" font-weight="900" font-size="130" fill="#a3e635" text-anchor="middle" letter-spacing="4">LIMITS</text>
        <rect x="140" y="1240" width="800" height="90" rx="20" fill="#27272a" stroke="#84cc16" stroke-width="4" />
        <text x="540" y="1298" font-family="sans-serif" font-weight="900" font-size="40" fill="#ffffff" text-anchor="middle">HIGH-ENERGY ATHLETIC DRILLS</text>
      </svg>
    `),
  },

  // ── 3. Creative Posters & Flyers ──
  {
    id: 'tpl_digital_poster',
    nameKey: 'tpl.digital',
    nameEn: 'DIGITAL 2026',
    nameAf: 'DIGITAAL 2026',
    subKey: 'tpl.digitalSub',
    subEn: 'Electric Neon Orange Festival',
    subAf: 'Elektriese Neon Oranje Fees',
    category: 'poster',
    width: 1080,
    height: 1528,
    ratioLabel: '3:4',
    sampleHeadline: 'DIGITAL 2026',
    sampleSubtext: 'SOUND EXPERIENCE',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1528">
        <rect width="1080" height="1528" fill="#ea580c" />
        <text x="540" y="180" font-family="monospace" font-weight="900" font-size="48" fill="#ffffff" text-anchor="middle">FUTUREBOX SOUND</text>
        <text x="540" y="440" font-family="impact, sans-serif" font-weight="900" font-size="220" fill="#ffffff" text-anchor="middle" letter-spacing="-4">DIGITAL</text>
        <text x="540" y="660" font-family="serif" font-style="italic" font-size="160" fill="#fef08a" text-anchor="middle">Nightwave</text>
        <rect x="80" y="800" width="920" height="580" rx="30" fill="#000000" />
        <text x="540" y="980" font-family="sans-serif" font-weight="900" font-size="64" fill="#ffffff" text-anchor="middle">LIVE IN CONCERT</text>
        <text x="540" y="1080" font-family="sans-serif" font-weight="600" font-size="46" fill="#fb923c" text-anchor="middle">FRIDAY 24 OCTOBER</text>
        <text x="540" y="1180" font-family="monospace" font-size="38" fill="#a1a1aa" text-anchor="middle">TICKETS: FUTUREBOX.APP</text>
      </svg>
    `),
  },
  {
    id: 'tpl_art_exhibit_poster',
    nameKey: 'tpl.artPoster',
    nameEn: 'BAUHAUS Modern Exhibit',
    nameAf: 'BAUHAUS Moderne Uitstalling',
    subKey: 'tpl.artPosterSub',
    subEn: 'Avant-Garde Architectural Poster',
    subAf: 'Avant-Garde Argitektoniese Plakkaat',
    category: 'poster',
    width: 1080,
    height: 1528,
    ratioLabel: '3:4',
    sampleHeadline: 'BAUHAUS 2026',
    sampleSubtext: 'FORM FOLLOWS FUNCTION',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1528">
        <rect width="1080" height="1528" fill="#0f172a" />
        <circle cx="540" cy="560" r="320" fill="#f59e0b" />
        <rect x="220" y="660" width="400" height="360" fill="#ef4444" opacity="0.85" />
        <line x1="80" y1="180" x2="1000" y2="180" stroke="#f8fafc" stroke-width="6" />
        <text x="80" y="140" font-family="sans-serif" font-weight="900" font-size="52" fill="#ffffff">EXHIBITION 09</text>
        <text x="540" y="1160" font-family="sans-serif" font-weight="900" font-size="140" fill="#ffffff" text-anchor="middle" letter-spacing="12">BAUHAUS</text>
        <text x="540" y="1260" font-family="sans-serif" font-weight="600" font-size="46" fill="#94a3b8" text-anchor="middle" letter-spacing="8">RETROSPECTIVE 2026</text>
        <text x="540" y="1380" font-family="monospace" font-size="34" fill="#64748b" text-anchor="middle">MUSEUM OF CONTEMPORARY ART</text>
      </svg>
    `),
  },
  {
    id: 'tpl_festival_flyer',
    nameKey: 'tpl.festivalFlyer',
    nameEn: 'Electric Wave Festival Flyer',
    nameAf: 'Elektriese Golf Feespamflet',
    subKey: 'tpl.festivalFlyerSub',
    subEn: 'Nightclub & Live DJ Music Event',
    subAf: 'Nagklub & Lewendige DJ-musiekfees',
    category: 'flyer',
    width: 1200,
    height: 1600,
    ratioLabel: '3:4',
    sampleHeadline: 'ELECTRIC WAVE',
    sampleSubtext: 'LIVE AT FUTURE DOCK • 28 OCT',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
        <defs>
          <linearGradient id="flyG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#030712" />
            <stop offset="50%" stop-color="#064e3b" />
            <stop offset="100%" stop-color="#022c22" />
          </linearGradient>
        </defs>
        <rect width="1200" height="1600" fill="url(#flyG)" />
        <rect x="80" y="80" width="1040" height="1440" rx="30" fill="none" stroke="#10b981" stroke-width="4" opacity="0.6" />
        <text x="600" y="240" font-family="monospace" font-weight="900" font-size="46" fill="#34d399" text-anchor="middle" letter-spacing="8">FUTUREBOX SOUND PRESENTS</text>
        <text x="600" y="520" font-family="impact, sans-serif" font-weight="900" font-size="180" fill="#ffffff" text-anchor="middle" letter-spacing="4">ELECTRIC</text>
        <text x="600" y="690" font-family="impact, sans-serif" font-weight="900" font-size="180" fill="#10b981" text-anchor="middle" letter-spacing="4">WAVE</text>
        <line x1="300" y1="770" x2="900" y2="770" stroke="#34d399" stroke-width="8" stroke-linecap="round" />
        <text x="600" y="880" font-family="sans-serif" font-weight="900" font-size="64" fill="#ffffff" text-anchor="middle">HEADLINERS: DJ KRONOS • AURA</text>
        <rect x="250" y="1040" width="700" height="140" rx="24" fill="#047857" />
        <text x="600" y="1125" font-family="monospace" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle">FRIDAY • 28 OCTOBER • 21:00</text>
        <text x="600" y="1320" font-family="sans-serif" font-weight="700" font-size="44" fill="#a7f3d0" text-anchor="middle">FUTURE DOCK WAREHOUSE 04</text>
        <text x="600" y="1400" font-family="monospace" font-size="34" fill="#6ee7b7" text-anchor="middle">WWW.FUTUREBOX.APP/TICKETS</text>
      </svg>
    `),
  },
  {
    id: 'tpl_fitness_flyer',
    nameKey: 'tpl.fitnessFlyer',
    nameEn: 'Apex Studio Bootcamp Flyer',
    nameAf: 'Apex Ateljee Oefenkamp Pamflet',
    subKey: 'tpl.fitnessFlyerSub',
    subEn: 'High Intensity Athletic Training',
    subAf: 'Hoë Intensiteit Atletiese Opleiding',
    category: 'flyer',
    width: 1200,
    height: 1600,
    ratioLabel: '3:4',
    sampleHeadline: 'APEX BOOTCAMP',
    sampleSubtext: '30-DAY BODY TRANSFORMATION',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
        <rect width="1200" height="1600" fill="#18181b" />
        <polygon points="0,0 600,0 0,600" fill="#ea580c" opacity="0.8" />
        <polygon points="1200,1000 1200,1600 600,1600" fill="#f97316" opacity="0.6" />
        <text x="600" y="320" font-family="sans-serif" font-weight="900" font-size="54" fill="#fdba74" text-anchor="middle" letter-spacing="8">INTENSE WORKOUT SERIES</text>
        <text x="600" y="560" font-family="impact, sans-serif" font-weight="900" font-size="180" fill="#ffffff" text-anchor="middle" letter-spacing="4">APEX</text>
        <text x="600" y="730" font-family="impact, sans-serif" font-weight="900" font-size="180" fill="#ea580c" text-anchor="middle" letter-spacing="4">BOOTCAMP</text>
        <rect x="200" y="880" width="800" height="180" rx="30" fill="#27272a" stroke="#f97316" stroke-width="6" />
        <text x="600" y="960" font-family="sans-serif" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle">30-DAY TRANSFORMATION</text>
        <text x="600" y="1025" font-family="sans-serif" font-weight="600" font-size="38" fill="#fdba74" text-anchor="middle">STRENGTH • AGILITY • ENDURANCE</text>
        <text x="600" y="1260" font-family="monospace" font-weight="900" font-size="64" fill="#ffffff" text-anchor="middle">STARTS 1 NOVEMBER</text>
        <text x="600" y="1350" font-family="sans-serif" font-weight="700" font-size="42" fill="#a1a1aa" text-anchor="middle">REGISTER AT THE DESK TODAY</text>
      </svg>
    `),
  },

  // ── 4. Brochures & Editorial ──
  {
    id: 'tpl_arch_brochure',
    nameKey: 'tpl.archBrochure',
    nameEn: 'Modern Architecture Tri-Fold',
    nameAf: 'Moderne Argitektuur Drievou',
    subKey: 'tpl.archBrochureSub',
    subEn: 'Tri-Fold Showcase & Interior Design',
    subAf: 'Drievoudige Oorsig & Binnehuisontwerp',
    category: 'brochure',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'MODERN SPACES',
    sampleSubtext: 'SUSTAINABLE ARCHITECTURE 2026',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#1c1917" />
        <line x1="640" y1="0" x2="640" y2="1080" stroke="#44403c" stroke-width="4" stroke-dasharray="16 16" />
        <line x1="1280" y1="0" x2="1280" y2="1080" stroke="#44403c" stroke-width="4" stroke-dasharray="16 16" />
        <!-- Panel 1 -->
        <rect x="80" y="140" width="480" height="380" rx="16" fill="#292524" />
        <text x="320" y="620" font-family="serif" font-weight="700" font-size="52" fill="#fafaf9" text-anchor="middle">01. PHILOSOPHY</text>
        <text x="320" y="700" font-family="sans-serif" font-size="32" fill="#a8a29e" text-anchor="middle">Minimalist raw concrete &amp; light.</text>
        <!-- Panel 2 -->
        <rect x="720" y="140" width="480" height="380" rx="16" fill="#292524" />
        <text x="960" y="620" font-family="serif" font-weight="700" font-size="52" fill="#fafaf9" text-anchor="middle">02. SPACES</text>
        <text x="960" y="700" font-family="sans-serif" font-size="32" fill="#a8a29e" text-anchor="middle">Biophilic interior flow &amp; textures.</text>
        <!-- Panel 3 (Cover) -->
        <text x="1600" y="440" font-family="serif" font-weight="900" font-size="94" fill="#fafaf9" text-anchor="middle">MODERN</text>
        <text x="1600" y="550" font-family="serif" font-weight="900" font-size="94" fill="#ca8a04" text-anchor="middle">SPACES</text>
        <text x="1600" y="680" font-family="sans-serif" font-weight="600" font-size="36" fill="#d6d3d1" text-anchor="middle" letter-spacing="6">STUDIO MONOGRAPH 2026</text>
      </svg>
    `),
  },
  {
    id: 'tpl_luxe_brochure',
    nameKey: 'tpl.luxeBrochure',
    nameEn: 'Wilderness Retreat Brochure',
    nameAf: 'Wildernis Oord Brosjure',
    subKey: 'tpl.luxeBrochureSub',
    subEn: 'Eco-Lodge & Safari Experience',
    subAf: 'Ekologiese Safari & Natuurreservaat',
    category: 'brochure',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'SERENGETI CREST',
    sampleSubtext: 'EXCLUSIVE WILDERNESS RETREAT',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#052e16" />
        <line x1="640" y1="0" x2="640" y2="1080" stroke="#166534" stroke-width="4" stroke-dasharray="16 16" />
        <line x1="1280" y1="0" x2="1280" y2="1080" stroke="#166534" stroke-width="4" stroke-dasharray="16 16" />
        <text x="320" y="480" font-family="serif" font-weight="700" font-size="52" fill="#fef08a" text-anchor="middle">THE SANCTUARY</text>
        <text x="320" y="580" font-family="sans-serif" font-size="34" fill="#bbf7d0" text-anchor="middle">Private luxury tented villas.</text>
        <text x="960" y="480" font-family="serif" font-weight="700" font-size="52" fill="#fef08a" text-anchor="middle">SAFARI TRAILS</text>
        <text x="960" y="580" font-family="sans-serif" font-size="34" fill="#bbf7d0" text-anchor="middle">Guided conservation walks.</text>
        <text x="1600" y="460" font-family="serif" font-weight="900" font-size="82" fill="#fef08a" text-anchor="middle">SERENGETI</text>
        <text x="1600" y="560" font-family="serif" font-weight="700" font-size="72" fill="#ffffff" text-anchor="middle">CREST</text>
        <text x="1600" y="680" font-family="monospace" font-size="34" fill="#86efac" text-anchor="middle">EXPERIENCE UNTAMED LUXURY</text>
      </svg>
    `),
  },

  // ── 5. Business Cards ──
  {
    id: 'tpl_founder_card',
    nameKey: 'tpl.founderCard',
    nameEn: 'Obsidian & Emerald Founder Card',
    nameAf: 'Obsidiaan & Smarag Stigterskaart',
    subKey: 'tpl.founderCardSub',
    subEn: 'Luxury Matte Metallic Business Card',
    subAf: 'Luukse Mat Metaal Besigheidskaart',
    category: 'business_card',
    width: 1050,
    height: 600,
    ratioLabel: '3.5:2',
    sampleHeadline: 'CARLI FOURIE',
    sampleSubtext: 'FOUNDER & CHIEF CREATIVE OFFICER',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 600">
        <rect width="1050" height="600" fill="#09090b" rx="20" />
        <rect x="30" y="30" width="990" height="540" rx="16" fill="none" stroke="#10b981" stroke-width="4" opacity="0.7" />
        <circle cx="140" cy="140" r="50" fill="#064e3b" stroke="#34d399" stroke-width="4" />
        <text x="140" y="156" font-family="serif" font-weight="900" font-size="44" fill="#34d399" text-anchor="middle">FB</text>
        <text x="140" y="320" font-family="sans-serif" font-weight="900" font-size="56" fill="#f4f4f5" letter-spacing="2">CARLI FOURIE</text>
        <text x="140" y="375" font-family="monospace" font-weight="700" font-size="28" fill="#10b981" letter-spacing="4">FOUNDER &amp; CHIEF CREATIVE OFFICER</text>
        <line x1="140" y1="420" x2="600" y2="420" stroke="#27272a" stroke-width="3" />
        <text x="140" y="470" font-family="sans-serif" font-size="24" fill="#a1a1aa">carli@futurebox.app • +27 82 000 0000</text>
        <text x="140" y="510" font-family="sans-serif" font-size="24" fill="#a1a1aa">Cape Town, South Africa • futurebox.app</text>
      </svg>
    `),
  },
  {
    id: 'tpl_director_card',
    nameKey: 'tpl.directorCard',
    nameEn: 'Monochrome Studio Director Card',
    nameAf: 'Monochroom Ateljee Direkteurskaart',
    subKey: 'tpl.directorCardSub',
    subEn: 'Ultra-Minimal High Contrast Card',
    subAf: 'Ultra-Minimale Hoë Kontras Kaart',
    category: 'business_card',
    width: 1050,
    height: 600,
    ratioLabel: '3.5:2',
    sampleHeadline: 'STUDIO DIRECT',
    sampleSubtext: 'DESIGN & MOTION DIRECTION',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 600">
        <rect width="1050" height="600" fill="#020617" rx="20" />
        <text x="100" y="240" font-family="impact, sans-serif" font-weight="900" font-size="82" fill="#ffffff" letter-spacing="6">STUDIO DIRECT</text>
        <text x="100" y="310" font-family="monospace" font-weight="700" font-size="30" fill="#38bdf8" letter-spacing="4">CREATIVE &amp; MOTION DIRECTION</text>
        <line x1="100" y1="360" x2="700" y2="360" stroke="#334155" stroke-width="4" />
        <text x="100" y="430" font-family="sans-serif" font-weight="500" font-size="26" fill="#94a3b8">HELLO@STUDIODIRECT.CO</text>
        <text x="100" y="480" font-family="sans-serif" font-weight="500" font-size="26" fill="#94a3b8">WWW.STUDIODIRECT.CO</text>
        <rect x="840" y="380" width="110" height="110" fill="#ffffff" rx="8" />
        <rect x="855" y="395" width="80" height="80" fill="#000000" />
      </svg>
    `),
  },

  // ── 6. Logos & Brand Emblems ──
  {
    id: 'tpl_cyber_logo',
    nameKey: 'tpl.cyberLogo',
    nameEn: 'Cyber Hexagon Studio Emblem',
    nameAf: 'Kuber Seskant Ateljee-kenteken',
    subKey: 'tpl.cyberLogoSub',
    subEn: 'Neon Geometric Gaming & Tech Logo',
    subAf: 'Neon Geometriese Tegnologie-kenteken',
    category: 'logo',
    width: 1080,
    height: 1080,
    ratioLabel: '1:1',
    sampleHeadline: 'NEXUS LABS',
    sampleSubtext: 'NEURAL AUDIO & VISUALS',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
        <rect width="1080" height="1080" fill="#050510" />
        <polygon points="540,160 840,330 840,670 540,840 240,670 240,330" fill="none" stroke="#06b6d4" stroke-width="16" />
        <polygon points="540,240 760,370 760,630 540,760 320,630 320,370" fill="none" stroke="#a855f7" stroke-width="10" />
        <circle cx="540" cy="500" r="80" fill="#06b6d4" />
        <text x="540" y="930" font-family="sans-serif" font-weight="900" font-size="78" fill="#ffffff" text-anchor="middle" letter-spacing="8">NEXUS LABS</text>
        <text x="540" y="990" font-family="monospace" font-weight="600" font-size="32" fill="#a5f3fc" text-anchor="middle" letter-spacing="4">NEURAL AUDIO &amp; VISUALS</text>
      </svg>
    `),
  },
  {
    id: 'tpl_monogram_logo',
    nameKey: 'tpl.monogramLogo',
    nameEn: 'Golden Laurel Monogram Logo',
    nameAf: 'Goue Lourier Monogram-kenteken',
    subKey: 'tpl.monogramLogoSub',
    subEn: 'Luxury Heritage Brand Insignia',
    subAf: 'Luukse Erfenis Handelseil',
    category: 'logo',
    width: 1080,
    height: 1080,
    ratioLabel: '1:1',
    sampleHeadline: 'HAUTE STUDIO',
    sampleSubtext: 'ESTABLISHED 2026',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
        <rect width="1080" height="1080" fill="#030712" />
        <circle cx="540" cy="460" r="240" fill="none" stroke="#d97706" stroke-width="8" />
        <circle cx="540" cy="460" r="220" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="12 8" />
        <text x="540" y="520" font-family="serif" font-weight="900" font-size="160" fill="#fbbf24" text-anchor="middle">FX</text>
        <text x="540" y="830" font-family="serif" font-weight="700" font-size="74" fill="#ffffff" text-anchor="middle" letter-spacing="12">HAUTE STUDIO</text>
        <text x="540" y="900" font-family="sans-serif" font-weight="600" font-size="30" fill="#d97706" text-anchor="middle" letter-spacing="8">ESTABLISHED 2026</text>
      </svg>
    `),
  },

  // ── 7. Menus & Hospitality ──
  {
    id: 'tpl_cafe_menu',
    nameKey: 'tpl.cafeMenu',
    nameEn: 'Artisan Roastery & Coffee Menu',
    nameAf: 'Ambagsman Brandery & Koffiespyskaart',
    subKey: 'tpl.cafeMenuSub',
    subEn: 'Espresso Bar & Fresh Pastry Card',
    subAf: 'Espresso & Vars Gebak Spyskaart',
    category: 'menu',
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    sampleHeadline: 'ROAST & BEAN',
    sampleSubtext: 'SPECIALTY COFFEE & BAKERY',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill="#1c120c" />
        <text x="540" y="240" font-family="serif" font-weight="900" font-size="94" fill="#fef3c7" text-anchor="middle">ROAST &amp; BEAN</text>
        <text x="540" y="320" font-family="sans-serif" font-weight="600" font-size="34" fill="#d97706" text-anchor="middle" letter-spacing="6">SPECIALTY COFFEE ROASTERS</text>
        <line x1="140" y1="380" x2="940" y2="380" stroke="#78350f" stroke-width="4" />
        <!-- Section 1 -->
        <text x="140" y="490" font-family="serif" font-weight="700" font-size="54" fill="#fef3c7">ESPRESSO BAR</text>
        <text x="140" y="570" font-family="sans-serif" font-weight="600" font-size="38" fill="#fed7aa">Flat White (Oat / Almond)</text>
        <text x="940" y="570" font-family="monospace" font-weight="700" font-size="38" fill="#fef3c7" text-anchor="end">R 42</text>
        <text x="140" y="650" font-family="sans-serif" font-weight="600" font-size="38" fill="#fed7aa">Cortado Double Shot</text>
        <text x="940" y="650" font-family="monospace" font-weight="700" font-size="38" fill="#fef3c7" text-anchor="end">R 38</text>
        <text x="140" y="730" font-family="sans-serif" font-weight="600" font-size="38" fill="#fed7aa">Pour Over Single Origin</text>
        <text x="940" y="730" font-family="monospace" font-weight="700" font-size="38" fill="#fef3c7" text-anchor="end">R 48</text>
        <!-- Section 2 -->
        <text x="140" y="910" font-family="serif" font-weight="700" font-size="54" fill="#fef3c7">FRESH PASTRIES</text>
        <text x="140" y="990" font-family="sans-serif" font-weight="600" font-size="38" fill="#fed7aa">Almond Butter Croissant</text>
        <text x="940" y="990" font-family="monospace" font-weight="700" font-size="38" fill="#fef3c7" text-anchor="end">R 45</text>
        <text x="140" y="1070" font-family="sans-serif" font-weight="600" font-size="38" fill="#fed7aa">Cardamom Cinnamon Bun</text>
        <text x="940" y="1070" font-family="monospace" font-weight="700" font-size="38" fill="#fef3c7" text-anchor="end">R 39</text>
        <rect x="140" y="1320" width="800" height="260" rx="24" fill="#2d1c14" stroke="#78350f" stroke-width="4" />
        <text x="540" y="1420" font-family="serif" font-weight="700" font-size="44" fill="#fef3c7" text-anchor="middle">ROASTED IN CAPE TOWN</text>
        <text x="540" y="1490" font-family="sans-serif" font-size="32" fill="#d6d3d1" text-anchor="middle">BEANS AVAILABLE TO TAKE HOME IN 250G BAGS</text>
      </svg>
    `),
  },
  {
    id: 'tpl_bistro_menu',
    nameKey: 'tpl.bistroMenu',
    nameEn: 'Urban Bistro Evening Menu',
    nameAf: 'Stedelike Bistro Aandspyskaart',
    subKey: 'tpl.bistroMenuSub',
    subEn: 'Chalkboard Culinary Specials Card',
    subAf: 'Krytstyl Kulinêre Spesiale Spyskaart',
    category: 'menu',
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    sampleHeadline: 'BISTRO NOIR',
    sampleSubtext: 'SEASONAL TASTING MENU',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill="#09090b" />
        <rect x="40" y="40" width="1000" height="1840" rx="30" fill="none" stroke="#27272a" stroke-width="8" />
        <text x="540" y="240" font-family="serif" font-weight="700" font-size="96" fill="#ffffff" text-anchor="middle" letter-spacing="4">BISTRO NOIR</text>
        <text x="540" y="320" font-family="sans-serif" font-weight="300" font-size="36" fill="#a1a1aa" text-anchor="middle" letter-spacing="10">AUTUMN TASTING MENU</text>
        <!-- Starters -->
        <text x="540" y="490" font-family="serif" font-weight="700" font-size="48" fill="#ca8a04" text-anchor="middle">ENTRÉES</text>
        <text x="540" y="580" font-family="serif" font-size="38" fill="#ffffff" text-anchor="middle">Charred Wild Mushrooms • Truffle Foam</text>
        <text x="540" y="630" font-family="sans-serif" font-size="28" fill="#71717a" text-anchor="middle">Paired with 2022 Estate Chardonnay</text>
        <!-- Mains -->
        <text x="540" y="800" font-family="serif" font-weight="700" font-size="48" fill="#ca8a04" text-anchor="middle">PLATS PRINCIPAUX</text>
        <text x="540" y="890" font-family="serif" font-size="38" fill="#ffffff" text-anchor="middle">Karoo Lamb Rump • Parsnip Velouté</text>
        <text x="540" y="940" font-family="sans-serif" font-size="28" fill="#71717a" text-anchor="middle">Slow braised reduction, rosemary ash</text>
        <!-- Desserts -->
        <text x="540" y="1110" font-family="serif" font-weight="700" font-size="48" fill="#ca8a04" text-anchor="middle">DESSERTS</text>
        <text x="540" y="1200" font-family="serif" font-size="38" fill="#ffffff" text-anchor="middle">Dark Chocolate Ganache • Salted Caramel</text>
        <text x="540" y="1520" font-family="monospace" font-size="36" fill="#a1a1aa" text-anchor="middle">SET MENU: R 650 PER PERSON</text>
      </svg>
    `),
  },

  // ── 8. Resumes & Professional CVs ──
  {
    id: 'tpl_dev_resume',
    nameKey: 'tpl.devResume',
    nameEn: 'Senior Systems Architect Resume',
    nameAf: 'Senior Stelselargitek CV',
    subKey: 'tpl.devResumeSub',
    subEn: 'Modern Technical Two-Column CV',
    subAf: 'Moderne Tegniese Tweekolom CV',
    category: 'resume',
    width: 1240,
    height: 1754,
    ratioLabel: 'A4',
    sampleHeadline: 'JOHAN VAN DER MERWE',
    sampleSubtext: 'LEAD CLOUD & AI ENGINEER',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754">
        <rect width="1240" height="1754" fill="#09090b" />
        <rect width="400" height="1754" fill="#05180f" />
        <!-- Left Sidebar -->
        <circle cx="200" cy="220" r="90" fill="#064e3b" stroke="#10b981" stroke-width="6" />
        <text x="200" y="235" font-family="sans-serif" font-weight="900" font-size="52" fill="#34d399" text-anchor="middle">JVM</text>
        <text x="200" y="420" font-family="sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle">SKILLS</text>
        <text x="200" y="480" font-family="sans-serif" font-size="28" fill="#6ee7b7" text-anchor="middle">Google Cloud • AI</text>
        <text x="200" y="530" font-family="sans-serif" font-size="28" fill="#6ee7b7" text-anchor="middle">TypeScript • React</text>
        <text x="200" y="580" font-family="sans-serif" font-size="28" fill="#6ee7b7" text-anchor="middle">Python • PyTorch</text>
        <text x="200" y="630" font-family="sans-serif" font-size="28" fill="#6ee7b7" text-anchor="middle">Audio DSP &amp; Video</text>
        <!-- Main Column -->
        <text x="460" y="200" font-family="sans-serif" font-weight="900" font-size="62" fill="#ffffff">JOHAN VAN DER MERWE</text>
        <text x="460" y="260" font-family="monospace" font-weight="700" font-size="34" fill="#10b981">LEAD CLOUD &amp; AI SYSTEMS ENGINEER</text>
        <line x1="460" y1="310" x2="1160" y2="310" stroke="#27272a" stroke-width="4" />
        <text x="460" y="420" font-family="sans-serif" font-weight="900" font-size="42" fill="#e4e4e7">EXPERIENCE</text>
        <text x="460" y="500" font-family="sans-serif" font-weight="700" font-size="34" fill="#ffffff">Principal Architect • Futurebox Cloud</text>
        <text x="460" y="550" font-family="sans-serif" font-size="28" fill="#a1a1aa">2023 - Present • Orchestrated scalable multi-model pipelines.</text>
        <text x="460" y="660" font-family="sans-serif" font-weight="700" font-size="34" fill="#ffffff">Senior AI Engineer • Neural Media Lab</text>
        <text x="460" y="710" font-family="sans-serif" font-size="28" fill="#a1a1aa">2020 - 2023 • Low-latency real-time generative audio synthesis.</text>
      </svg>
    `),
  },
  {
    id: 'tpl_designer_resume',
    nameKey: 'tpl.designerResume',
    nameEn: 'Creative Art Director CV',
    nameAf: 'Kreatiewe Kunsdirekteur CV',
    subKey: 'tpl.designerResumeSub',
    subEn: 'Bold Typography Portfolio Resume',
    subAf: 'Vet Tipografie Portefeulje CV',
    category: 'resume',
    width: 1240,
    height: 1754,
    ratioLabel: 'A4',
    sampleHeadline: 'ELENA ROSTOVA',
    sampleSubtext: 'CREATIVE DIRECTOR • VISUAL DESIGN',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754">
        <rect width="1240" height="1754" fill="#fafaf9" />
        <text x="120" y="240" font-family="serif" font-weight="900" font-size="92" fill="#09090b">ELENA ROSTOVA</text>
        <text x="120" y="320" font-family="sans-serif" font-weight="700" font-size="36" fill="#71717a" letter-spacing="6">ART &amp; CREATIVE DIRECTION</text>
        <line x1="120" y1="380" x2="1120" y2="380" stroke="#09090b" stroke-width="6" />
        <text x="120" y="520" font-family="sans-serif" font-weight="900" font-size="46" fill="#09090b">SELECT CLIENTS &amp; EXHIBITIONS</text>
        <text x="120" y="610" font-family="serif" font-size="38" fill="#18181b">Vogue International • Editorial Art Direction (2025)</text>
        <text x="120" y="690" font-family="serif" font-size="38" fill="#18181b">Milan Design Week • Sound &amp; Light Pavilion (2024)</text>
        <text x="120" y="770" font-family="serif" font-size="38" fill="#18181b">Universal Music Group • Visual Brand Identity (2023)</text>
        <rect x="120" y="980" width="1000" height="240" rx="16" fill="#f4f4f5" />
        <text x="180" y="1070" font-family="sans-serif" font-weight="900" font-size="38" fill="#09090b">AWARDS</text>
        <text x="180" y="1130" font-family="sans-serif" font-size="30" fill="#52525b">Cannes Gold Lion 2024 • D&amp;AD Yellow Pencil • Tokyo TDC Annual</text>
      </svg>
    `),
  },

  // ── 9. Invitations & Special Events ──
  {
    id: 'tpl_gala_invite',
    nameKey: 'tpl.galaInvite',
    nameEn: 'Starlight VIP Gala Invitation',
    nameAf: 'Strelende VIP Gala-uitnodiging',
    subKey: 'tpl.galaInviteSub',
    subEn: 'Exclusive Premiere & Dinner Card',
    subAf: 'Eksklusiewe Première & Gala-aand',
    category: 'invitation',
    width: 1200,
    height: 1600,
    ratioLabel: '3:4',
    sampleHeadline: 'THE GRAND GALA',
    sampleSubtext: 'AN EVENING OF CREATIVE EXCELLENCE',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
        <defs>
          <linearGradient id="galG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#090d16" />
            <stop offset="100%" stop-color="#020617" />
          </linearGradient>
        </defs>
        <rect width="1200" height="1600" fill="url(#galG)" />
        <rect x="60" y="60" width="1080" height="1480" rx="20" fill="none" stroke="#ca8a04" stroke-width="4" />
        <rect x="80" y="80" width="1040" height="1440" rx="14" fill="none" stroke="#eab308" stroke-width="2" stroke-dasharray="10 6" />
        <text x="600" y="380" font-family="sans-serif" font-weight="600" font-size="42" fill="#fef08a" text-anchor="middle" letter-spacing="10">YOU ARE CORDIALLY INVITED TO</text>
        <text x="600" y="580" font-family="serif" font-weight="900" font-size="120" fill="#ffffff" text-anchor="middle">THE GRAND</text>
        <text x="600" y="730" font-family="serif" font-weight="900" font-size="120" fill="#fbbf24" text-anchor="middle">GALA 2026</text>
        <text x="600" y="880" font-family="serif" font-style="italic" font-size="48" fill="#e2e8f0" text-anchor="middle">An Evening of Creative Excellence &amp; Film</text>
        <line x1="300" y1="980" x2="900" y2="980" stroke="#ca8a04" stroke-width="4" />
        <text x="600" y="1120" font-family="monospace" font-weight="700" font-size="52" fill="#ffffff" text-anchor="middle">SATURDAY • 14 NOVEMBER</text>
        <text x="600" y="1220" font-family="sans-serif" font-weight="700" font-size="40" fill="#ca8a04" text-anchor="middle">BLACK TIE ATTIRE • 19:00</text>
        <text x="600" y="1380" font-family="sans-serif" font-size="34" fill="#94a3b8" text-anchor="middle">RSVP BY 1 NOVEMBER • CONCIERGE@FUTUREBOX.APP</text>
      </svg>
    `),
  },
  {
    id: 'tpl_session_invite',
    nameKey: 'tpl.sessionInvite',
    nameEn: 'Private Studio Listening Session',
    nameAf: 'Privaat Ateljee Luisteruitnodiging',
    subKey: 'tpl.sessionInviteSub',
    subEn: 'Audio Launch & Secret Session Card',
    subAf: 'Klankbekendstelling & Geheime Sessie',
    category: 'invitation',
    width: 1200,
    height: 1600,
    ratioLabel: '3:4',
    sampleHeadline: 'STUDIO IN SESSION',
    sampleSubtext: 'EXCLUSIVE FIRST LISTEN • PASS 042',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
        <rect width="1200" height="1600" fill="#18181b" />
        <rect x="80" y="120" width="1040" height="140" fill="#22c55e" />
        <text x="600" y="210" font-family="monospace" font-weight="900" font-size="64" fill="#000000" text-anchor="middle" letter-spacing="4">★ VIP ACCESS PASS #042 ★</text>
        <circle cx="600" cy="620" r="260" fill="#09090b" stroke="#22c55e" stroke-width="8" />
        <circle cx="600" cy="620" r="80" fill="#22c55e" />
        <text x="600" y="1040" font-family="impact, sans-serif" font-weight="900" font-size="140" fill="#ffffff" text-anchor="middle" letter-spacing="6">STUDIO SESSION</text>
        <text x="600" y="1160" font-family="sans-serif" font-weight="700" font-size="52" fill="#4ade80" text-anchor="middle">NEURAL AUDIO PREVIEW</text>
        <text x="600" y="1320" font-family="monospace" font-size="40" fill="#a1a1aa" text-anchor="middle">SECRET LOCATION • DOORS 20:00</text>
      </svg>
    `),
  },

  // ── 10. Websites & Landing Pages ──
  {
    id: 'tpl_creator_hero',
    nameKey: 'tpl.creatorHero',
    nameEn: 'Creator Studio Web Hero',
    nameAf: 'Skepper-ateljee Webwerf-banier',
    subKey: 'tpl.creatorHeroSub',
    subEn: 'Modern Web Landing Page Header',
    subAf: 'Moderne Webblad-tuishoof banier',
    category: 'website',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'CREATE WITHOUT LIMITS',
    sampleSubtext: 'THE NEXT-GENERATION SUITE FOR CREATORS',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#05180f" />
        <circle cx="960" cy="600" r="500" fill="#10b981" opacity="0.12" />
        <!-- Nav bar -->
        <rect x="120" y="60" width="1680" height="90" rx="24" fill="#09090b" opacity="0.7" stroke="#10b981" stroke-width="2" />
        <text x="180" y="118" font-family="sans-serif" font-weight="900" font-size="38" fill="#10b981">FUTUREBOX</text>
        <text x="1560" y="118" font-family="sans-serif" font-weight="700" font-size="28" fill="#ffffff">LAUNCH APP →</text>
        <!-- Hero headline -->
        <text x="960" y="440" font-family="sans-serif" font-weight="900" font-size="140" fill="#ffffff" text-anchor="middle" letter-spacing="-4">CREATE WITHOUT</text>
        <text x="960" y="590" font-family="sans-serif" font-weight="900" font-size="140" fill="#34d399" text-anchor="middle" letter-spacing="-4">LIMITS.</text>
        <text x="960" y="730" font-family="sans-serif" font-weight="500" font-size="44" fill="#a7f3d0" text-anchor="middle">Music, film, photo and design in one seamless Google AI studio.</text>
        <rect x="760" y="840" width="400" height="100" rx="30" fill="#10b981" />
        <text x="960" y="905" font-family="sans-serif" font-weight="900" font-size="38" fill="#05180f" text-anchor="middle">START FREE TRIAL</text>
      </svg>
    `),
  },
  {
    id: 'tpl_saas_hero',
    nameKey: 'tpl.saasHero',
    nameEn: 'AI Platform Web Hero Banner',
    nameAf: 'KI Platform Webwerf-banier',
    subKey: 'tpl.saasHeroSub',
    subEn: 'SaaS Product Showcase Hero Banner',
    subAf: 'SaaS Produk-bekendstelling Banier',
    category: 'website',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'POWERED BY GOOGLE AI',
    sampleSubtext: 'STUDIO-GRADE CREATIVE INTELLIGENCE',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#030712" />
        <rect x="760" y="120" width="400" height="60" rx="20" fill="#1e1b4b" stroke="#6366f1" stroke-width="3" />
        <text x="960" y="162" font-family="monospace" font-weight="700" font-size="28" fill="#a5b4fc" text-anchor="middle">NEURAL SYNTHESIS 2026</text>
        <text x="960" y="420" font-family="sans-serif" font-weight="900" font-size="130" fill="#ffffff" text-anchor="middle">GOOGLE VEO &amp; LYRIA</text>
        <text x="960" y="560" font-family="sans-serif" font-weight="900" font-size="130" fill="#818cf8" text-anchor="middle">INTELLIGENCE SUITE</text>
        <!-- Mockup Card -->
        <rect x="360" y="700" width="1200" height="380" rx="32" fill="#0f172a" stroke="#312e81" stroke-width="4" />
        <circle cx="430" cy="760" r="14" fill="#ef4444" />
        <circle cx="475" cy="760" r="14" fill="#facc15" />
        <circle cx="520" cy="760" r="14" fill="#22c55e" />
        <text x="960" y="880" font-family="monospace" font-weight="700" font-size="44" fill="#38bdf8" text-anchor="middle">STUDIO DESK READY • 48KHZ NEURAL AUDIO</text>
      </svg>
    `),
  },

  // ── 11. Sheets & Spreadsheets ──
  {
    id: 'tpl_budget_sheet',
    nameKey: 'tpl.budgetSheet',
    nameEn: 'Studio Production Budget Matrix',
    nameAf: 'Ateljee Produksie-begrotingsblad',
    subKey: 'tpl.budgetSheetSub',
    subEn: 'Financial Spread & Asset Allocator',
    subAf: 'Finansiële Begrotingsblad & Batebestuur',
    category: 'sheet',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'PRODUCTION BUDGET',
    sampleSubtext: 'Q4 2026 MEDIA & AUDIO ASSETS',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#022c22" />
        <text x="120" y="140" font-family="sans-serif" font-weight="900" font-size="56" fill="#f0fdf4">STUDIO PRODUCTION BUDGET</text>
        <text x="120" y="195" font-family="monospace" font-size="28" fill="#6ee7b7">FISCAL YEAR 2026 • MEDIA ASSET MATRIX</text>
        <!-- Table Header -->
        <rect x="120" y="260" width="1680" height="70" rx="12" fill="#065f46" />
        <text x="160" y="308" font-family="monospace" font-weight="900" font-size="28" fill="#ffffff">LINE ITEM</text>
        <text x="700" y="308" font-family="monospace" font-weight="900" font-size="28" fill="#ffffff">ALLOCATION</text>
        <text x="1100" y="308" font-family="monospace" font-weight="900" font-size="28" fill="#ffffff">SPENT</text>
        <text x="1500" y="308" font-family="monospace" font-weight="900" font-size="28" fill="#ffffff">STATUS</text>
        <!-- Row 1 -->
        <rect x="120" y="350" width="1680" height="80" rx="8" fill="#044e3a" />
        <text x="160" y="400" font-family="sans-serif" font-weight="700" font-size="32" fill="#ffffff">Film Scoring &amp; Lyria Audio</text>
        <text x="700" y="400" font-family="monospace" font-size="32" fill="#a7f3d0">R 45,000</text>
        <text x="1100" y="400" font-family="monospace" font-size="32" fill="#a7f3d0">R 32,400</text>
        <text x="1500" y="400" font-family="sans-serif" font-weight="900" font-size="28" fill="#34d399">APPROVED</text>
        <!-- Row 2 -->
        <rect x="120" y="450" width="1680" height="80" rx="8" fill="#065f46" />
        <text x="160" y="500" font-family="sans-serif" font-weight="700" font-size="32" fill="#ffffff">Veo Cinematic Drone Footage</text>
        <text x="700" y="500" font-family="monospace" font-size="32" fill="#a7f3d0">R 60,000</text>
        <text x="1100" y="500" font-family="monospace" font-size="32" fill="#a7f3d0">R 58,000</text>
        <text x="1500" y="500" font-family="sans-serif" font-weight="900" font-size="28" fill="#34d399">ACTIVE</text>
        <!-- Total -->
        <rect x="120" y="680" width="1680" height="90" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="4" />
        <text x="160" y="740" font-family="sans-serif" font-weight="900" font-size="38" fill="#ffffff">TOTAL PRODUCTION EXPENDITURE</text>
        <text x="1500" y="740" font-family="monospace" font-weight="900" font-size="44" fill="#6ee7b7">R 105,000</text>
      </svg>
    `),
  },

  // ── 12. Documents & Briefs ──
  {
    id: 'tpl_certificate',
    nameKey: 'tpl.certificate',
    nameEn: 'Certificate of Excellence',
    nameAf: 'Sertifikaat van Uitnemendheid',
    subKey: 'tpl.certificateSub',
    subEn: 'Formal Parchment & Gold Seal',
    subAf: 'Formele Perkament & Goue Seël',
    category: 'doc',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    sampleHeadline: 'CERTIFICATE OF COMPLETION',
    sampleSubtext: 'Awarded for Outstanding Achievement',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="#fefce8" />
        <rect x="80" y="80" width="1760" height="920" rx="20" fill="none" stroke="#ca8a04" stroke-width="8" />
        <rect x="110" y="110" width="1700" height="860" rx="14" fill="none" stroke="#eab308" stroke-width="3" />
        <text x="960" y="340" font-family="serif" font-weight="700" font-size="94" fill="#854d0e" text-anchor="middle" letter-spacing="6">CERTIFICATE</text>
        <text x="960" y="440" font-family="serif" font-style="italic" font-size="48" fill="#a16207" text-anchor="middle">OF COMPLETION</text>
        <text x="960" y="600" font-family="sans-serif" font-weight="700" font-size="52" fill="#1c1917" text-anchor="middle">THIS IS PRESENTED TO</text>
        <line x1="480" y1="740" x2="1440" y2="740" stroke="#ca8a04" stroke-width="4" />
        <circle cx="960" cy="850" r="60" fill="#eab308" />
        <polygon points="960,810 975,845 1010,845 980,865 995,900 960,880 925,900 940,865 910,845 945,845" fill="#ffffff" />
      </svg>
    `),
  },
  {
    id: 'tpl_brief_doc',
    nameKey: 'tpl.briefDoc',
    nameEn: 'Project Creative Brief Document',
    nameAf: 'Projek Kreatiewe Opdragdokument',
    subKey: 'tpl.briefDocSub',
    subEn: 'Formal Agency Deliverables Brief',
    subAf: 'Formele Agentskap-opdragdokument',
    category: 'doc',
    width: 1240,
    height: 1754,
    ratioLabel: 'A4',
    sampleHeadline: 'CREATIVE BRIEF',
    sampleSubtext: 'CAMPAIGN STRATEGY & DELIVERABLES',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754">
        <rect width="1240" height="1754" fill="#ffffff" />
        <rect width="1240" height="240" fill="#0f172a" />
        <text x="120" y="140" font-family="sans-serif" font-weight="900" font-size="64" fill="#ffffff">CREATIVE PROJECT BRIEF</text>
        <text x="120" y="195" font-family="monospace" font-size="28" fill="#38bdf8">CLIENT: STUDIO BRAND • DATE: 2026-10-14</text>
        <text x="120" y="360" font-family="sans-serif" font-weight="900" font-size="42" fill="#0f172a">1. OBJECTIVE &amp; GOALS</text>
        <text x="120" y="430" font-family="serif" font-size="32" fill="#334155">Deliver 4K cinematic video assets and matching high-definition audio scores.</text>
        <line x1="120" y1="520" x2="1120" y2="520" stroke="#e2e8f0" stroke-width="4" />
        <text x="120" y="620" font-family="sans-serif" font-weight="900" font-size="42" fill="#0f172a">2. SCOPE &amp; ASSETS</text>
        <text x="120" y="690" font-family="sans-serif" font-size="30" fill="#475569">✔ 60-Second Veo Promo Reel</text>
        <text x="120" y="750" font-family="sans-serif" font-size="30" fill="#475569">✔ 48kHz Neural Audio Master Track</text>
        <text x="120" y="810" font-family="sans-serif" font-size="30" fill="#475569">✔ Social Media Story Cutdowns (9:16)</text>
        <rect x="120" y="1100" width="1000" height="180" rx="16" fill="#f1f5f9" />
        <text x="160" y="1180" font-family="sans-serif" font-weight="700" font-size="32" fill="#0f172a">LEAD PRODUCER SIGN-OFF: ___________________</text>
      </svg>
    `),
  },

  // ── 13. Email Newsletters ──
  {
    id: 'tpl_newsletter_digest',
    nameKey: 'tpl.newsletterDigest',
    nameEn: 'Studio Weekly Editorial Digest',
    nameAf: 'Ateljee Weeklikse Nuusbrief',
    subKey: 'tpl.newsletterDigestSub',
    subEn: 'Curated Email Header & Top Stories',
    subAf: 'Gekureerde E-pos Nuusbrief & Artikels',
    category: 'email',
    width: 1200,
    height: 1600,
    ratioLabel: '3:4',
    sampleHeadline: 'THE WEEKLY DROP',
    sampleSubtext: 'ISSUE #48 • CURATED CREATIVE INSIGHTS',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
        <rect width="1200" height="1600" fill="#09090b" />
        <!-- Header -->
        <rect x="100" y="80" width="1000" height="240" rx="24" fill="#7c3aed" />
        <text x="600" y="190" font-family="impact, sans-serif" font-weight="900" font-size="82" fill="#ffffff" text-anchor="middle" letter-spacing="4">THE WEEKLY DROP</text>
        <text x="600" y="260" font-family="monospace" font-size="32" fill="#ddd6fe" text-anchor="middle">ISSUE #48 • CURATED STUDIO NEWS</text>
        <!-- Story Card -->
        <rect x="100" y="380" width="1000" height="640" rx="24" fill="#18181b" stroke="#27272a" stroke-width="4" />
        <rect x="140" y="420" width="920" height="280" rx="16" fill="#4c1d95" />
        <text x="180" y="780" font-family="sans-serif" font-weight="900" font-size="46" fill="#ffffff">HOW GOOGLE VEO IS RESHAPING CINEMA</text>
        <text x="180" y="850" font-family="serif" font-size="34" fill="#a1a1aa">Deep dive into prompt-engineered narrative workflows.</text>
        <rect x="180" y="900" width="300" height="70" rx="16" fill="#a855f7" />
        <text x="330" y="946" font-family="sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">READ ARTICLE →</text>
      </svg>
    `),
  },

  // ── 14. Instagram Posts ──
  {
    id: 'tpl_nomade',
    nameKey: 'tpl.nomade',
    nameEn: 'NOMADE Editorial',
    nameAf: 'NOMADE Redaksioneel',
    subKey: 'tpl.nomadeSub',
    subEn: 'Warm Aesthetic Fashion Cover',
    subAf: 'Warm Mode Tydskrif Omslag',
    category: 'ig_post',
    width: 1080,
    height: 1080,
    ratioLabel: '1:1',
    sampleHeadline: 'NOMADE',
    sampleSubtext: 'AUTUMN EDITION 2026',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
        <rect width="1080" height="1080" fill="#292524" />
        <text x="540" y="240" font-family="serif" font-weight="900" font-size="130" fill="#f5f5f4" text-anchor="middle" letter-spacing="14">NOMADE</text>
        <rect x="180" y="320" width="720" height="540" rx="20" fill="#d6d3d1" opacity="0.3" />
        <text x="540" y="960" font-family="sans-serif" font-weight="400" font-size="38" fill="#a8a29e" text-anchor="middle" letter-spacing="8">STUDIO ISSUE • 01</text>
      </svg>
    `),
  },
  {
    id: 'tpl_quote_post',
    nameKey: 'tpl.quotePost',
    nameEn: 'Bold Editorial Quote Card',
    nameAf: 'Vetgedrukte Redaksionele Aanhaalkaart',
    subKey: 'tpl.quotePostSub',
    subEn: 'Minimalist High-Impact Social Quote',
    subAf: 'Minimistiese Sosiale Aanhalingskaart',
    category: 'ig_post',
    width: 1080,
    height: 1080,
    ratioLabel: '1:1',
    sampleHeadline: 'MAKE THE FUTURE',
    sampleSubtext: 'THE BEST WAY TO PREDICT THE FUTURE IS TO CREATE IT',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
        <rect width="1080" height="1080" fill="#18181b" />
        <text x="140" y="320" font-family="serif" font-weight="900" font-size="240" fill="#facc15" opacity="0.4">“</text>
        <text x="140" y="440" font-family="serif" font-weight="700" font-size="64" fill="#fafafa">The best way to</text>
        <text x="140" y="520" font-family="serif" font-weight="700" font-size="64" fill="#fafafa">predict the future</text>
        <text x="140" y="600" font-family="serif" font-style="italic" font-size="64" fill="#facc15">is to create it.</text>
        <line x1="140" y1="720" x2="420" y2="720" stroke="#facc15" stroke-width="6" />
        <text x="140" y="820" font-family="sans-serif" font-weight="900" font-size="38" fill="#ffffff">FUTUREBOX CREATIVE</text>
        <text x="140" y="870" font-family="monospace" font-size="28" fill="#a1a1aa">DAILY INSPIRATION</text>
      </svg>
    `),
  },

  // ── 15. Facebook Posts ──
  {
    id: 'tpl_brand_drop',
    nameKey: 'tpl.brandDrop',
    nameEn: 'Official Brand Announcement',
    nameAf: 'Amptelike Handelsmerk-aankondiging',
    subKey: 'tpl.brandDropSub',
    subEn: 'Facebook Landscape Announcement Banner',
    subAf: 'Facebook Landskap-aankondigingsbanier',
    category: 'facebook_post',
    width: 1200,
    height: 630,
    ratioLabel: '1.91:1',
    sampleHeadline: 'SOMETHING BIG IS HERE',
    sampleSubtext: 'JOIN THE FUTUREBOX CREATIVE COMMUNITY',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
        <defs>
          <linearGradient id="fbG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a8a" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#fbG)" />
        <rect x="80" y="80" width="220" height="50" rx="16" fill="#3b82f6" />
        <text x="190" y="114" font-family="monospace" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">OFFICIAL DROP</text>
        <text x="80" y="270" font-family="sans-serif" font-weight="900" font-size="78" fill="#ffffff">SOMETHING BIG</text>
        <text x="80" y="350" font-family="sans-serif" font-weight="900" font-size="78" fill="#60a5fa">IS HERE.</text>
        <text x="80" y="440" font-family="sans-serif" font-weight="500" font-size="34" fill="#cbd5e1">The pro studio with Google Veo and Lyria 48kHz neural sound.</text>
        <rect x="80" y="490" width="340" height="80" rx="20" fill="#3b82f6" />
        <text x="250" y="542" font-family="sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle">EXPLORE ROOMS →</text>
      </svg>
    `),
  },

  // ── 16. Photo Collages ──
  {
    id: 'tpl_moodboard_collage',
    nameKey: 'tpl.moodboardCollage',
    nameEn: 'Editorial 4-Grid Aesthetic Moodboard',
    nameAf: 'Redaksionele 4-Rooster Stemmingsbord',
    subKey: 'tpl.moodboardCollageSub',
    subEn: 'Clean Border Collage For Curators',
    subAf: 'Skoon Geraamde Collage vir Skeppers',
    category: 'photo_collage',
    width: 1080,
    height: 1080,
    ratioLabel: '1:1',
    sampleHeadline: 'AUTUMN AESTHETIC',
    sampleSubtext: 'CURATED PALETTES & TEXTURES',
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
        <rect width="1080" height="1080" fill="#fafaf9" />
        <!-- 4 quadrants -->
        <rect x="30" y="30" width="495" height="495" rx="16" fill="#78350f" />
        <rect x="555" y="30" width="495" height="495" rx="16" fill="#065f46" />
        <rect x="30" y="555" width="495" height="495" rx="16" fill="#1e293b" />
        <rect x="555" y="555" width="495" height="495" rx="16" fill="#831843" />
        <!-- Center badge -->
        <circle cx="540" cy="540" r="140" fill="#ffffff" stroke="#e7e5e4" stroke-width="6" />
        <text x="540" y="530" font-family="serif" font-weight="900" font-size="34" fill="#1c1917" text-anchor="middle">MOOD</text>
        <text x="540" y="570" font-family="serif" font-style="italic" font-size="28" fill="#ca8a04" text-anchor="middle">Autumn 2026</text>
      </svg>
    `),
  },
];
