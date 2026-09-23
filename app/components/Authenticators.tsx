'use client';

/**
 * An authenticator app on the account, for the people who want one.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 23 September 2026: *"Ek dink ons moet mense 'n opsie gee om die app
 * te beveilig met 'n authenticator app as hulle wil."*
 *
 * Optional, exactly as she said it. Most members will never switch this on.
 * The ones selling work through the studio, or holding a voice clone of
 * themselves, will want to — and for them a password alone is thin.
 *
 * ── The screen is mostly about the way back ──────────────────────────────
 *
 * Because that is the part that goes wrong. An authenticator is five seconds
 * to switch on and a locked account to get out of: a lost phone, a wiped
 * phone, a new phone somebody restored without the app, and the password is
 * still right and still opens nothing.
 *
 * Supabase has no backup codes, and writing our own would mean a route that
 * skips the second factor — a bypass surface built to defend against a lost
 * phone, which is precisely what a second factor exists to remove. So this
 * does the thing that adds nothing to attack and says it plainly:
 *
 *   - the secret is shown AS TEXT beside the square. That text is the
 *     backup — any authenticator app rebuilds the same codes from it — so it
 *     goes wherever they keep passwords.
 *   - a second one can be added, and the screen asks for it.
 *   - both are said BEFORE the switch, where somebody can still decide not
 *     to, rather than after, where it is a warning about something that has
 *     already happened.
 *
 * ── And taking it off asks for a code ────────────────────────────────────
 *
 * Otherwise somebody holding the password — the thing this was switched on
 * to stop being enough — turns it off in one press. Supabase already wants
 * an aal2 session to unenroll; `dropAuthenticator` asks for a fresh code on
 * top, because "prove it is you, now" is what anybody expects from a screen
 * that removes a lock.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import * as cloud from '../lib/cloud';
import { useLang } from '../lib/i18n';
import Note from './Note';

export default function Authenticators(): React.ReactElement | null {
  const { t } = useLang();
  const [have, setHave] = useState<cloud.Authenticator[]>([]);
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState('');
  /** The enrolment in progress: the square, the text, and the box to prove it. */
  const [adding, setAdding] = useState<{ id: string; secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  /** Which one is being taken off, and the code that proves it may be. */
  const [dropping, setDropping] = useState<string | null>(null);
  const [dropCode, setDropCode] = useState('');

  const read = useCallback(async () => {
    setHave(await cloud.authenticators());
    setAsked(true);
  }, []);

  useEffect(() => { void read(); }, [read]);

  /* Nothing at all when there are no accounts behind the app: an offer to
     protect an account that does not exist is a control that can only
     disappoint. */
  if (!cloud.configured()) return null;

  const start = async () => {
    setBusy(true);
    setProblem('');
    setDone('');
    try {
      const began = await cloud.startAuthenticator(
        `${t('mfa.named', 'Authenticator')} ${new Date().toISOString().slice(0, 10)}`,
      );
      if (!began.ok) {
        setProblem(began.message);
        return;
      }
      setAdding({ id: began.id, secret: began.secret, qr: began.qr });
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!adding) return;
    setBusy(true);
    setProblem('');
    try {
      const said = await cloud.confirmAuthenticator(adding.id, code);
      if (!said.ok) {
        setProblem(said.message);
        return;
      }
      setAdding(null);
      setCode('');
      setDone(t('mfa.on'));
      await read();
    } finally {
      setBusy(false);
    }
  };

  const drop = async (id: string) => {
    setBusy(true);
    setProblem('');
    try {
      const said = await cloud.dropAuthenticator(id, dropCode);
      if (!said.ok) {
        setProblem(said.message);
        return;
      }
      setDropping(null);
      setDropCode('');
      setDone(t('mfa.off'));
      await read();
    } finally {
      setBusy(false);
    }
  };

  const box =
    'w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white '
    + 'placeholder-zinc-600 focus:outline-none focus:border-emerald-500 tabular-nums tracking-widest';

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3" data-mfa>
      <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        {t('mfa.title', 'An authenticator app')}
      </p>

      {/* Said before the switch, not after. Both halves of it: what it does,
          and what it costs you if the phone goes. */}
      <Note>{t('mfa.what')}</Note>

      {/* ── And what an authenticator app even is ──────────────────────
 
          Carli, 23 September 2026: *"As ons die authenticator voorstel, moet
          daar net 'n verduideliking wees wat sê laai 'n authenticator app
          af."*
 
          She is right, and it is the first thing somebody hits. The whole
          section above assumes the reader already has one of these on their
          phone; most people do not, and "scan this square with your
          authenticator app" to somebody who has never installed one is an
          instruction with no first step.
 
          Named, because "an authenticator app" is not something you can
          search for confidently if you have never heard of one — and free,
          because the next question after "which one" is "what does it
          cost". No links: an app store link from a page like this is the
          shape of every phishing message, and the names are enough to find
          them. */}
      <Note>{t('mfa.getOne')}</Note>

      {asked && have.length > 0 && (
        <div className="space-y-2">
          {have.map((one) => (
            <div key={one.id} className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2.5 space-y-2">
              <p className="text-sm text-zinc-200 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{one.name}</span>
              </p>
              {dropping === one.id ? (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400 leading-snug">{t('mfa.proveOff')}</p>
                  <input
                    value={dropCode}
                    onChange={(e) => setDropCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className={box}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void drop(one.id)}
                      disabled={busy}
                      data-mfadrop
                      className="min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border border-rose-500/40 bg-rose-500/[0.08] text-rose-200 hover:border-rose-500/70 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('mfa.reallyOff', 'Take it off')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDropping(null); setDropCode(''); setProblem(''); }}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setDropping(one.id); setDropCode(''); setProblem(''); }}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm border border-rose-500/25 bg-rose-500/[0.06] text-zinc-400 hover:text-rose-300 hover:border-rose-500/50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('mfa.takeOff', 'Take this one off')}
                </button>
              )}
            </div>
          ))}
          {/* Asked for rather than merely allowed. One authenticator is one
              phone, and one phone is the failure this whole section is
              written around. */}
          {have.length === 1 && <Note>{t('mfa.addSecond')}</Note>}
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.05] p-3 space-y-3">
          <p className="text-sm text-zinc-200 leading-relaxed">{t('mfa.scan')}</p>
          {/* A literal white, and the documented exception rather than a
              dodge of it. `check:theme` refuses `bg-white` because Tailwind
              remaps it to the ink token, so it paints near-black on a light
              preset — right for text and a trap for a fill. The one case it
              allows is chrome that is not themed UI, and this is that: a QR
              code is read by a camera, dark on light, and a square that
              follows the theme is a square that stops scanning in half of
              them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={adding.qr}
            alt={t('mfa.qrAlt', 'The square your authenticator app reads')}
            className="w-44 h-44 rounded-lg bg-[#ffffff] p-2"
          />
          {/* ── The backup, and it is this line ─────────────────────────
              Not a nicety for people without a camera. Any authenticator
              app anywhere rebuilds the same codes from this text, so it is
              the only thing standing between a lost phone and a lost
              account. Selectable, monospace, and said as what it is. */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-300">{t('mfa.secretIs', 'Or type this in by hand')}</p>
            <code
              data-mfasecret
              className="block select-all break-all rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 font-mono text-sm text-emerald-200"
            >
              {adding.secret}
            </code>
            <Note>{t('mfa.secretKeep')}</Note>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">{t('mfa.thenCode', 'Then type the six digits it shows')}</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              data-mfacode
              className={box}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy}
                data-mfaconfirm
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('mfa.switchOn', 'Switch it on')}
              </button>
              <button
                type="button"
                onClick={() => { setAdding(null); setCode(''); setProblem(''); }}
                className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          data-mfaadd
          className="min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border border-zinc-700 bg-zinc-950 text-zinc-300 hover:text-white hover:border-emerald-500 flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {have.length > 0 ? t('mfa.addAnother', 'Add another') : t('mfa.add', 'Add an authenticator')}
        </button>
      )}

      {problem && <p className="text-sm text-rose-400 leading-snug">{problem}</p>}
      {done && (
        <p className="text-sm text-emerald-400 leading-snug flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
          {done}
        </p>
      )}
    </section>
  );
}
