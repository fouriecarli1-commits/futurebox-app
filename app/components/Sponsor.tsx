'use client';

/**
 * The rate card and the enquiry form for sponsors, in one place.
 *
 * They lived in the studio's footer, which only a signed-in member ever sees,
 * so a company that came to the site to sponsor something found no price and
 * no form until it had made an account. Both the landing page and the studio
 * draw these two now, from the same rungs in `lib/plans.ts`.
 *
 * The form posts to `/api/enquiry`, which needs no account, with reply-to set
 * to whoever wrote it.
 */
import React, { useState } from 'react';
import { Check, Loader2, Mail, Send, Star } from 'lucide-react';
import { SPONSORSHIP, sponsorshipPrice } from '../lib/plans';
import type { Region } from '../lib/pricing';
import { useLang } from '../lib/i18n';
import Placement from './Placement';

/** What a sponsor gets, rung by rung, priced for this region. */
export function SponsorRates({ region }: { readonly region: Region }): React.ReactElement {
  const { t, lang } = useLang();
  return (
    <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-2" data-sponsorrates>
      <span className="text-[11px] uppercase text-emerald-400 font-bold flex items-center space-x-1.5">
        <Star className="w-3.5 h-3.5 fill-current" />
        <span>{t('spon.benefits', 'What a sponsor gets')}</span>
      </span>
      <ul className="text-xs text-zinc-300 space-y-1.5">
        {SPONSORSHIP.map((rung) => (
          <li key={rung.id}>
            <span className="font-bold text-white">{t(`spon.${rung.id}.name`, rung.name)}</span>
            <span className="text-emerald-400"> · {sponsorshipPrice(rung, region, lang)}</span>
            <span className="block text-zinc-400 leading-snug">{t(`spon.${rung.id}.gets`, rung.gets)}</span>
          </li>
        ))}
      </ul>
      {/* Said plainly, because it is the reason to sponsor this rather than
          buy impressions somewhere with more of them. */}
      <p className="text-xs text-zinc-500 leading-relaxed pt-1">
        {t(
          'spon.noBanners',
          'No banners, no pop-ups, nothing down the sides — there is nothing of that kind to buy here. A sponsor’s logo sits beside ours on work worth watching, and the counters on this page are the report.',
        )}
      </p>
    </div>
  );
}

/** The enquiry: who, which rung, what they have in mind. */
export function SponsorForm({ region }: { readonly region: Region }): React.ReactElement {
  const { t, lang } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [picked, setPicked] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /* Derived, not stored: the region is worked out after the first render, and
     a default kept from mount would be a price that no longer matches any
     option — and that stale string, not the one on screen, would be emailed. */
  const options = SPONSORSHIP.map((rung) => `${rung.name} — ${sponsorshipPrice(rung, region, 'en')}`);
  const budget = options.includes(picked) ? picked : options[0];
  const rung = SPONSORSHIP[Math.max(0, options.indexOf(budget))];

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          where: 'sponsorship',
          message: `Budget: ${budget}\nWhat that includes: ${rung.gets}\n\n${message}`,
        }),
      });
      const said = (await response.json().catch(() => ({}))) as { sent?: boolean; message?: string };
      if (said.sent) {
        setSent(true);
        setMessage('');
      } else {
        setProblem(said.message || t('spon.failed', 'That could not be sent. Try again in a moment.'));
      }
    } catch {
      setProblem(t('spon.failed', 'That could not be sent. Try again in a moment.'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500';

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 p-6 md:p-8 rounded-3xl space-y-4 shadow-2xl" data-sponsorform>
      <div className="flex items-center space-x-2 text-white">
        <Mail className="w-5 h-5 text-emerald-400" />
        <h4 className="font-extrabold text-base">{t('home.advertiseWithUs', 'Advertise on FutureBox')}</h4>
      </div>
      <p className="text-xs text-zinc-400">{t('spon.intro', 'Tell us what you have in mind and it comes straight to us.')}</p>

      <form onSubmit={(event) => { void submit(event); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={t('spon.name', 'Your name / company')} className={field} required />
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('feed.emailAddress', 'Email address')} className={field} required />
        </div>

        <div className="space-y-2.5">
          <select value={budget} onChange={(event) => setPicked(event.target.value)} className={`w-full ${field}`} data-sponsorpick>
            {/* The value stays in English: it is what gets emailed, and a rung
                named differently in the letter from the rate card is how a
                quote gets argued about later. */}
            {SPONSORSHIP.map((one, i) => (
              <option key={one.id} value={options[i]}>
                {t(`spon.${one.id}.name`, one.name)} — {sponsorshipPrice(one, region, lang)}
              </option>
            ))}
          </select>
          {/* The answer to "what do I get", before they have to ask it. */}
          <Placement rung={rung} who={name} />
        </div>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('spon.describe', 'Describe your product, campaign goals, or partnership proposal…')}
          className={`w-full h-20 ${field}`}
          required
        />

        {sent && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{t('spon.sent', 'Sent. You will get a reply at the address you gave.')}</span>
          </div>
        )}
        {problem && <p className="text-xs text-amber-400 leading-snug">{problem}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-onAccent font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>{t('spon.send', 'Send it')}</span>
        </button>
      </form>
    </div>
  );
}
