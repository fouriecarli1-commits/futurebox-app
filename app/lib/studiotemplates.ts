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
 *   - All standard categories (Presentations, Posters, Instagram, Videos, etc.)
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
  { id: 'landscape_video', nameKey: 'tplcat.landVideo', nameEn: 'Landscape Video', nameAf: 'Landskap Video', iconType: 'film', colorBg: 'from-purple-500/20 to-violet-500/30' },
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
    nameAf: 'PITCH DECK',
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
        <!-- Big Bold Title -->
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
        <!-- Floating blue geometry -->
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
        <!-- Mountains silhouette -->
        <polygon points="0,500 400,280 800,520 1200,320 1600,480 1920,380 1920,1080 0,1080" fill="#166534" opacity="0.8" />
        <!-- Camera Viewfinder frame -->
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
        <!-- Person silhouette in golden field -->
        <circle cx="540" cy="820" r="70" fill="#451a03" />
        <path d="M420 1200 L660 1200 L590 920 L490 920 Z" fill="#451a03" />
        <text x="540" y="1450" font-family="serif" font-weight="700" font-size="82" fill="#ffffff" text-anchor="middle">Lessons</text>
        <text x="540" y="1540" font-family="serif" font-style="italic" font-size="70" fill="#fef08a" text-anchor="middle">I’ve Learned</text>
        <text x="540" y="1620" font-family="sans-serif" font-weight="900" font-size="48" fill="#ffffff" text-anchor="middle" letter-spacing="4">ABOUT LOVE</text>
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

  // ── 3. Creative Posters & Social Graphics (Screenshot 5) ──
  {
    id: 'tpl_digital_poster',
    nameKey: 'tpl.digital',
    nameEn: 'DIGITAL 2026',
    nameAf: 'DIGITAL 2026',
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
];
