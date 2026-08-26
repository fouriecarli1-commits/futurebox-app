/**
 * Regional pricing.
 *
 * The goal is that R10 in Johannesburg and $0.99 in San Francisco cost their
 * buyers roughly the same amount of effort. That is purchasing-power pricing,
 * and it is a pricing decision, not a security one — which matters, because it
 * changes what you are allowed to rely on.
 *
 * What this module does NOT do is try to detect a VPN. Two reasons, and both
 * are practical rather than principled:
 *
 *   · It does not work. VPN and proxy lists are stale the day they ship, and
 *     every false positive is a paying customer told their money is no good
 *     here. Travellers, corporate networks and mobile carriers all trip it.
 *   · It is not the control you need. The price a buyer *sees* can be guessed
 *     from their browser; the price they are *charged* must be bound to
 *     something they cannot simply switch — the country of the payment method,
 *     which the payment provider tells you and the buyer's bank enforces.
 *
 * So: guess the region from the browser to render a sensible number, then let
 * the provider's billing country decide what is actually charged. Someone on a
 * VPN sees the wrong price for a moment and then gets the right one at checkout,
 * which is exactly the failure mode you want.
 *
 * Everything here runs in the browser and is therefore a display concern only.
 * None of it is enforcement, and it must not be treated as such once a real
 * payment provider is wired in.
 */

export interface Region {
  readonly code: string;
  readonly name: string;
  readonly currency: string;
  readonly locale: string;
  /**
   * Roughly, what one US dollar of pricing power costs here. 1 is the US
   * baseline; 0.35 means the same real burden at about a third of the dollar
   * amount. These are approximations from published PPP conversion factors and
   * want reviewing against real conversion data before launch.
   */
  readonly pppFactor: number;
}

export const REGIONS: readonly Region[] = [
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US', pppFactor: 1 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB', pppFactor: 0.78 },
  { code: 'EU', name: 'Eurozone', currency: 'EUR', locale: 'de-DE', pppFactor: 0.85 },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-ZA', pppFactor: 7.2 },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', locale: 'en-NG', pppFactor: 320 },
  { code: 'KE', name: 'Kenya', currency: 'KES', locale: 'en-KE', pppFactor: 55 },
  { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN', pppFactor: 22 },
  { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'pt-BR', pppFactor: 2.5 },
  { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'es-MX', pppFactor: 10 },
  { code: 'AR', name: 'Argentina', currency: 'ARS', locale: 'es-AR', pppFactor: 380 },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', locale: 'id-ID', pppFactor: 5200 },
  { code: 'PH', name: 'Philippines', currency: 'PHP', locale: 'en-PH', pppFactor: 21 },
  { code: 'PL', name: 'Poland', currency: 'PLN', locale: 'pl-PL', pppFactor: 2.1 },
  { code: 'TR', name: 'Türkiye', currency: 'TRY', locale: 'tr-TR', pppFactor: 11 },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU', pppFactor: 1.45 },
  { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-CA', pppFactor: 1.25 },
  { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'ja-JP', pppFactor: 100 },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', locale: 'en-AE', pppFactor: 2.2 },
];

export const DEFAULT_REGION = REGIONS[0];

export function regionByCode(code: string): Region {
  return REGIONS.find((r) => r.code === code) ?? DEFAULT_REGION;
}

/**
 * Timezone → country. The browser's timezone comes from the operating system,
 * so it survives a VPN that only moves the IP — which makes it a better *hint*
 * than an IP lookup, and still only a hint.
 */
const TZ_TO_REGION: Record<string, string> = {
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Tokyo': 'JP',
  'Asia/Dubai': 'AE',
  'Europe/Istanbul': 'TR',
  'Europe/Warsaw': 'PL',
  'Europe/London': 'GB',
  'Europe/Berlin': 'EU',
  'Europe/Paris': 'EU',
  'Europe/Madrid': 'EU',
  'Europe/Rome': 'EU',
  'Europe/Amsterdam': 'EU',
  'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
};

export interface RegionGuess {
  readonly region: Region;
  readonly basis: string;
  readonly confident: boolean;
}

/** A guess, labelled as one. Never call this a verification. */
export function guessRegion(): RegionGuess {
  if (typeof window === 'undefined') {
    return { region: DEFAULT_REGION, basis: 'Server render — no browser to ask', confident: false };
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const byTz = TZ_TO_REGION[tz];
    if (byTz) {
      return { region: regionByCode(byTz), basis: `Device timezone (${tz})`, confident: true };
    }
    const locale = navigator.language ?? '';
    const country = locale.split('-')[1]?.toUpperCase();
    if (country) {
      const match = REGIONS.find((r) => r.code === country);
      if (match) return { region: match, basis: `Browser language (${locale})`, confident: false };
    }
    return { region: DEFAULT_REGION, basis: `Timezone ${tz} not mapped — showing US pricing`, confident: false };
  } catch {
    return { region: DEFAULT_REGION, basis: 'Browser would not say', confident: false };
  }
}

/**
 * Rounds to a number that looks like a price rather than a conversion. Nobody
 * charges R71.83; they charge R69.
 */
function tidy(amount: number, currency: string): number {
  const zeroDecimal = ['JPY', 'IDR', 'NGN', 'ARS', 'KES'].includes(currency);
  if (zeroDecimal) {
    if (amount >= 10_000) return Math.round(amount / 1000) * 1000;
    if (amount >= 1000) return Math.round(amount / 100) * 100;
    return Math.max(1, Math.round(amount / 10) * 10);
  }
  if (amount >= 100) return Math.round(amount / 10) * 10 - 1;
  if (amount >= 20) return Math.round(amount / 5) * 5 - 1;
  if (amount >= 3) return Math.max(1, Math.round(amount)) - 0.01;
  return Math.max(0.49, Math.round(amount * 2) / 2 - 0.01);
}

export interface LocalPrice {
  readonly amount: number;
  readonly currency: string;
  readonly display: string;
  /** What the same price is in the US, for the "and elsewhere" line. */
  readonly usd: number;
}

export function priceFor(usdAmount: number, region: Region): LocalPrice {
  const raw = usdAmount * region.pppFactor;
  const amount = tidy(raw, region.currency);
  const zeroDecimal = ['JPY', 'IDR', 'NGN', 'ARS', 'KES'].includes(region.currency);
  let display: string;
  try {
    display = new Intl.NumberFormat(region.locale, {
      style: 'currency',
      currency: region.currency,
      minimumFractionDigits: zeroDecimal ? 0 : 2,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(amount);
  } catch {
    display = `${region.currency} ${amount.toFixed(zeroDecimal ? 0 : 2)}`;
  }
  return { amount, currency: region.currency, display, usd: usdAmount };
}

/** Base prices, in US dollars. Every local number is derived from these. */
export const BASE_PRICES = {
  proMonthly: 19,
  proYearly: 190,
  entryMusic: 0.99,
  entryVideo: 0.99,
  entryApp: 1.49,
  entryIdea: 0.49,
} as const;
