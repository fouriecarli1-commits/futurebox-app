'use client';

/**
 * The page a Cubed³ presenter opens from their invitation.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 *
 * The owner, 21 October 2026: a registration page for the presenters, reached
 * by a link from their email, whose answers land on her side. The details the
 * legal document needs; the terms in a box that scrolls, with a tick to agree
 * and a pad to sign; the process laid out practically; a tick list for
 * whether they record and edit themselves; the five steps with a script and
 * an upload block each; and what is expected after them.
 *
 * ── The order on the page, and why ───────────────────────────────────────
 *
 * How it works first, because nobody fills in an ID number for a thing they
 * do not understand yet. Then the details, the choices and the terms, ending
 * in the signature. Then the steps — readable from the first visit, so a
 * presenter can prepare while they decide, but their upload blocks open only
 * once the agreement is signed: the licence to use a recording comes from
 * that signature, and a file that arrives before it is a file nobody may use.
 *
 * ── Nothing is lost by leaving ───────────────────────────────────────────
 *
 * What is typed is kept on the server a moment after typing stops, so the
 * same link brings it back on another day or another device. Uploads go
 * straight to storage with a progress bar, one file at a time, because a
 * class video is hundreds of megabytes and a bar that never moves reads as a
 * page that froze.
 *
 * In English: the scripts are English, and the terms are the agreement's own
 * words. The page is for a handful of invited people, not the app's members.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, Check, CheckCircle2, ChevronDown, ClipboardCopy, Clock, FileVideo, Film, Link2, Loader2, Lock,
  Landmark, PenLine, Sparkles, Trash2, UploadCloud, Wallet,
} from 'lucide-react';
import SignaturePad, { type Signed } from './SignaturePad';
import { accessToken } from '../lib/cloud';
import {
  ACCOUNT_TYPES, COMPANY, EMPTY_DETAILS, PAY, PHOTO_USES, PROCESS, RECORDING_TIPS, SLOTS, STEPS, TEASERS, TERMS, TERMS_VERSION,
  MOST_LINKS, NO_TRANSFER, WAYS, problemsWith, slotOf, transferSaid, type HostDetails, type PhotoUse, type SlotId, type Transfer,
} from '../lib/cubedhost';

interface Kept { readonly name: string; readonly path: string; readonly bytes: number; readonly at: string | null }
interface State {
  readonly email: string;
  readonly details: HostDetails;
  readonly savedAt: string | null;
  readonly signedAt: string | null;
  readonly signature: string | null;
  readonly links: Record<string, Transfer>;
  readonly files: Record<string, Kept[]>;
  readonly filesUnread?: boolean;
}

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const FIELD = 'mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:border-sky-400 focus:outline-hidden';
const AREA = 'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:border-sky-400 focus:outline-hidden';
const CARD = 'rounded-3xl border border-sky-400/20 bg-zinc-900/70 p-5 shadow-[0_0_40px_-20px_rgba(56,189,248,0.5)] sm:p-7';
const LEAD = 'text-[11px] font-bold uppercase tracking-[0.22em] text-sky-300';

const sizeSaid = (bytes: number): string =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

const dateSaid = (iso: string | null): string => {
  if (!iso) return '';
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '' : at.toLocaleString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** The type a browser sometimes leaves empty, from the file's ending. */
function typeOf(file: File): string {
  if (file.type) return file.type;
  const end = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ({ mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm', mkv: 'video/x-matroska', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' } as Record<string, string>)[end] ?? '';
}

/** The key from the address: after the `#`, which no server ever sees. */
function keyFromAddress(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('k') ?? '';
}

export default function CubedHost(): React.ReactElement {
  /* Null until the address has been read: an empty key then means there was none. */
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [failed, setFailed] = useState('');
  const [details, setDetails] = useState<HostDetails>(EMPTY_DETAILS);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [readAll, setReadAll] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState<{ url: string; data: string } | null>(null);
  const [pad, setPad] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState('');
  const touched = useRef(false);

  /* The owner's preview, from the You tab or the inbox: the page exactly as a
     presenter sees it, with nothing saved, signed or sent. Opened only for the
     owner, because the amounts on it are a presenter's business. */
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#preview') {
      setPreview(true);
      void accessToken().then(async (token) => {
        const answer = token ? await fetch('/api/cubed/hosts?peek=1', { headers: { Authorization: `Bearer ${token}` } }) : null;
        if (!answer?.ok) { setFailed('This preview is for the owner. Sign in with the owner’s account first, then open it again.'); return; }
        setState({ email: 'the presenter’s email address', details: EMPTY_DETAILS, savedAt: null, signedAt: null, signature: null, links: {}, files: {} });
      }).catch(() => setFailed('The page could not reach FutureBox. Check your connection and reload.'));
      return;
    }
    setKey(keyFromAddress());
  }, []);

  const ask = useCallback(async (method: string, body?: unknown, query = ''): Promise<Response> => fetch(`/api/cubed/host${query}`, {
    method,
    headers: { 'x-cubed-key': key ?? '', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }), [key]);

  const load = useCallback(async (): Promise<void> => {
    if (!key) { setFailed('This page opens from the link in your invitation. Open the link from your email again.'); return; }
    try {
      const answer = await ask('GET');
      const got = await answer.json() as State & { message?: string };
      if (!answer.ok) { setFailed(got.message ?? 'This link could not be opened.'); return; }
      setState(got);
      if (!touched.current) setDetails({ ...EMPTY_DETAILS, ...got.details });
    } catch {
      setFailed('The page could not reach FutureBox. Check your connection and reload.');
    }
  }, [ask, key]);
  useEffect(() => { if (key !== null) void load(); }, [key, load]);

  const isSigned = Boolean(state?.signedAt);

  /* What is typed is kept a moment after typing stops. */
  useEffect(() => {
    if (!state || isSigned || !touched.current || preview) return undefined;
    setSaving('saving');
    const wait = setTimeout(() => {
      void ask('PUT', { details }).then((answer) => setSaving(answer.ok ? 'saved' : 'failed'), () => setSaving('failed'));
    }, 1200);
    return () => clearTimeout(wait);
  }, [details, state, isSigned, ask, preview]);

  const set = <K extends keyof HostDetails>(field: K, value: HostDetails[K]): void => {
    touched.current = true;
    setDetails((was) => ({ ...was, [field]: value }));
    setProblems((was) => {
      if (!was[field]) return was;
      const next = { ...was };
      delete next[field];
      return next;
    });
  };

  const onSigned = (made: Signed): void => {
    setPad(false);
    const reader = new FileReader();
    reader.onload = () => setSigned({ url: made.url, data: String(reader.result) });
    reader.readAsDataURL(new Blob([made.data.slice().buffer], { type: 'image/png' }));
  };

  const sign = async (): Promise<void> => {
    const missing = problemsWith(details);
    setProblems(missing);
    if (Object.keys(missing).length) {
      setSaid('Some details are still missing — they are marked in red above.');
      document.querySelector('[data-hostproblem]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!agreed) { setSaid('Read the terms to the end and tick that you agree.'); return; }
    if (!signed) { setSaid('Sign on the pad first.'); return; }
    if (preview) { setSaid('This is a preview, so nothing was signed or sent. A presenter who signs here gets an upload block under each of the steps below.'); return; }
    setSending(true);
    setSaid('');
    try {
      const answer = await ask('POST', { sign: { details, signature: signed.data, agreed: true, terms: TERMS_VERSION } });
      const got = await answer.json() as { message?: string; problems?: Record<string, string> };
      if (!answer.ok) {
        if (got.problems) setProblems(got.problems);
        setSaid(got.message ?? 'That could not be signed just now.');
        return;
      }
      await load();
      setSaid('');
      document.querySelector('[data-hoststeps]')?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setSaid('That could not be sent. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  if (failed) {
    return (
      <Frame>
        <div className={`${CARD} text-center`} data-hostfailed>
          <Lock className="mx-auto h-8 w-8 text-sky-300" />
          <p className="mt-3 text-lg font-bold text-zinc-100">{failed}</p>
        </div>
      </Frame>
    );
  }
  if (!state) {
    return (
      <Frame>
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" /> Opening your registration…</div>
      </Frame>
    );
  }

  const problem = (field: keyof HostDetails): React.ReactNode =>
    problems[field] ? <p data-hostproblem className="mt-1 text-sm font-semibold text-rose-300">{problems[field]}</p> : null;
  const text = (field: keyof HostDetails, label: string, opts: { placeholder?: string; type?: string; hint?: string; optional?: boolean } = {}): React.ReactNode => (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-200">{label}{opts.optional ? <span className="font-normal text-zinc-500"> — optional</span> : null}</span>
      <input
        type={opts.type ?? 'text'}
        value={String(details[field] ?? '')}
        onChange={(event) => set(field, event.target.value as never)}
        placeholder={opts.placeholder}
        disabled={isSigned}
        aria-invalid={Boolean(problems[field])}
        data-hostfield={field}
        className={`${FIELD} ${problems[field] ? 'border-rose-400' : ''} disabled:opacity-60`}
      />
      {opts.hint && <span className="mt-1 block text-xs text-zinc-500">{opts.hint}</span>}
      {problem(field)}
    </label>
  );
  const choice = <K extends 'recordSelf' | 'editSelf'>(field: K, yes: string, no: string): React.ReactNode => (
    <div className="grid gap-2 sm:grid-cols-2" data-hostchoice={field}>
      {([true, false] as const).map((value) => (
        <button
          key={String(value)}
          type="button"
          disabled={isSigned}
          aria-pressed={details[field] === value}
          onClick={() => set(field, value)}
          className={`flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold transition ${details[field] === value ? 'border-sky-400 bg-sky-500/15 text-sky-50' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'} disabled:opacity-60`}
        >
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${details[field] === value ? 'border-sky-300 bg-sky-400 text-zinc-950' : 'border-zinc-600'}`}>
            {details[field] === value && <Check className="h-4 w-4" />}
          </span>
          {value ? yes : no}
        </button>
      ))}
    </div>
  );

  return (
    <Frame>
      {preview && (
        <p className="sticky top-2 z-50 mb-4 rounded-2xl border border-amber-400/50 bg-amber-500/15 p-3 text-center text-sm font-bold text-amber-100 backdrop-blur" data-hostpreview>
          Preview — this is what a presenter sees. Nothing you type here is saved, signed or sent.
        </p>
      )}
      {/* ── Welcome ── */}
      <section className="relative overflow-hidden rounded-3xl border border-sky-400/25 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(217,70,239,0.16),transparent_55%)] p-6 sm:p-9">
        <p className={LEAD}>Cubed³ · Presenter registration</p>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-zinc-50 sm:text-4xl">
          Welcome to Cubed³ — let’s make your masterclass.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-300">
          You have been invited to present a Cubed³ class on FutureBox: one masterclass in three sessions — what it is, how it is done, and what is next. This page holds everything: your details and the agreement, the steps to record with their scripts, and the blocks to upload your videos into. Take your time — what you type is kept, and this same link brings you back.
        </p>
        <p className="mt-3 text-sm text-zinc-400">Invited as <span className="font-semibold text-zinc-200">{state.email}</span></p>
        <ol className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            { n: 1, label: 'Your details and the agreement', done: isSigned },
            { n: 2, label: 'Record the five steps', done: false },
            { n: 3, label: 'Teasers and photos', done: false },
          ].map((one) => (
            <li key={one.n} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${one.done ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-zinc-950/50 text-zinc-200'}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${one.done ? 'bg-emerald-400 text-zinc-950' : 'bg-sky-400/20 text-sky-200'}`}>{one.done ? <Check className="h-4 w-4" /> : one.n}</span>
              {one.label}
            </li>
          ))}
        </ol>
      </section>

      {/* ── The amounts ──
          The owner, 22 October 2026: "Maak seker die cubed application het
          bedrae breakdown". The price and what the presenter receives per
          student, in Rand, read from `PAY` so this card and the agreement say
          the same thing. Never a share or a percentage. */}
      <section className={CARD} data-hostpay>
        <p className={LEAD}>What you earn</p>
        <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-zinc-50"><Wallet className="h-6 w-6 text-sky-300" /> The amounts</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
            <dt className="text-sm text-zinc-400">A student pays for your whole masterclass — all three sessions</dt>
            <dd className="mt-1 text-3xl font-black text-zinc-50" data-hostprice>{PAY.priceSaid}</dd>
          </div>
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
            <dt className="text-sm text-emerald-100/80">You receive, for every student who buys it</dt>
            <dd className="mt-1 text-3xl font-black text-emerald-50" data-hostyours>{PAY.perStudentSaid}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm font-semibold text-zinc-200">What that comes to</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {PAY.examples.map((one) => (
            <li key={one.students} className="flex items-baseline justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm">
              <span className="text-zinc-400">{one.students} students</span>
              <span className="font-bold text-zinc-100">{one.said}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-4" data-hostsponsor>
          <p className="text-sm text-zinc-400">When a sponsor takes a whole season on your class and you agree to record a short word about their product, you also receive, for every month of that season</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">{PAY.sponsorMonthSaid}</p>
          <p className="mt-1 text-xs text-zinc-500">A sponsor that only takes a month shows its logo beside ours on the video, and you are not asked to say anything. Section 9 of the terms has the details.</p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Each session is 30 to 45 minutes long. The written offer FutureBox sends before you start confirms these amounts and says when you are paid — into the bank account you give below.
        </p>
      </section>

      {/* ── How it works ── */}
      <section className={CARD}>
        <p className={LEAD}>How it works</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-50">From this page to your class, in eight steps</h2>
        <ol className="mt-5 space-y-3">
          {PROCESS.map((one, i) => (
            <li key={one.title} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-sky-400/40 bg-sky-500/10 text-sm font-black text-sky-200">{i + 1}</span>
              <div>
                <p className="font-bold text-zinc-100">{one.title}</p>
                <p className="text-sm leading-relaxed text-zinc-400">{one.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Signed ── */}
      {isSigned && (
        <section className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-6" data-hostsigned>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
            <div>
              <p className="text-lg font-bold text-emerald-50">Signed on {dateSaid(state.signedAt)} — thank you.</p>
              <p className="mt-1 text-sm text-emerald-100/80">Your registration is with FutureBox. The upload blocks below are open; come back with the same link whenever you have something to upload. To change your details, ask FutureBox to reopen your registration.</p>
              {state.signature && <img src={state.signature} alt="Your signature" className="mt-3 h-16 rounded-lg px-3 py-1" style={{ background: '#ffffff' }} />}
            </div>
          </div>
        </section>
      )}

      {/* ── Your details ── */}
      <section className={CARD} data-hostdetails>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className={LEAD}>Part 1</p>
            <h2 className="mt-2 text-2xl font-black text-zinc-50">Your details</h2>
            <p className="mt-1 text-sm text-zinc-400">What the agreement needs. It is seen only by FutureBox.</p>
          </div>
          {!isSigned && (
            <p className="text-xs font-semibold text-zinc-500" role="status" data-hostsaving={saving}>
              {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : saving === 'failed' ? 'Not saved — check your connection' : ''}
            </p>
          )}
        </div>

        <fieldset className="mt-6 space-y-4" disabled={isSigned}>
          <legend className="text-sm font-black uppercase tracking-widest text-zinc-400">You</legend>
          {text('legalName', 'Full name, as on your ID or passport', { placeholder: 'First names and surname' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {text('nationality', 'Nationality', { placeholder: 'South African' })}
            {text('idNumber', 'ID number (or passport number)', { hint: 'A South African ID is 13 digits. Otherwise, your passport number.' })}
          </div>
          {text('birthDate', 'Date of birth', { type: 'date' })}
        </fieldset>

        <fieldset className="mt-8 space-y-4" disabled={isSigned}>
          <legend className="text-sm font-black uppercase tracking-widest text-zinc-400">Presenting as</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['person', 'company'] as const).map((one) => (
              <button key={one} type="button" disabled={isSigned} aria-pressed={details.entity === one} onClick={() => set('entity', one)} className={`min-h-[48px] rounded-2xl border px-4 text-sm font-semibold ${details.entity === one ? 'border-sky-400 bg-sky-500/15 text-sky-50' : 'border-zinc-700 text-zinc-300'} disabled:opacity-60`}>
                {one === 'person' ? 'Myself, as an individual' : 'My company'}
              </button>
            ))}
          </div>
          {details.entity === 'company' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {text('companyName', 'Registered company name')}
              {text('companyReg', 'Company registration number', { placeholder: 'YYYY/NNNNNN/NN' })}
              {text('companyRole', 'Your position in the company', { placeholder: 'Director' })}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {text('taxNumber', 'Income tax number', { optional: true })}
            {text('vatNumber', 'VAT number, if registered', { optional: true })}
          </div>
        </fieldset>

        <fieldset className="mt-8 space-y-4" disabled={isSigned}>
          <legend className="text-sm font-black uppercase tracking-widest text-zinc-400">Address</legend>
          {text('street', 'Street address')}
          <div className="grid gap-4 sm:grid-cols-2">
            {text('suburb', 'Suburb', { optional: true })}
            {text('city', 'Town or city')}
            {text('province', 'Province', { optional: true })}
            {text('postalCode', 'Postal code')}
          </div>
          {text('country', 'Country')}
        </fieldset>

        <fieldset className="mt-8 space-y-4" disabled={isSigned}>
          <legend className="text-sm font-black uppercase tracking-widest text-zinc-400">Contact</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('phone', 'Mobile number', { type: 'tel', placeholder: '+27 …' })}
            {text('altEmail', 'Another email address', { type: 'email', optional: true, hint: `Your invitation went to ${state.email}.` })}
          </div>
        </fieldset>

        <fieldset className="mt-8 space-y-4" disabled={isSigned} data-hostbank>
          <legend className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400"><Landmark className="h-4 w-4" /> Where you are paid</legend>
          <p className="text-sm text-zinc-400">Your bank details, for the payments. Seen only by FutureBox.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('bankHolder', 'Account holder', { placeholder: 'The name the account is in' })}
            {text('bankName', 'Bank', { placeholder: 'e.g. Capitec, FNB, Standard Bank' })}
            {text('bankAccount', 'Account number', { hint: 'For a bank outside South Africa, your IBAN.' })}
            {text('bankBranch', 'Branch code', { hint: 'A universal branch code is fine. Outside South Africa, the SWIFT code.' })}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-200">Type of account</p>
            <div className="grid gap-2 sm:grid-cols-3" data-hostchoice="bankType">
              {ACCOUNT_TYPES.map((one) => (
                <button key={one.id} type="button" disabled={isSigned} aria-pressed={details.bankType === one.id} onClick={() => set('bankType', one.id)} className={`min-h-[48px] rounded-2xl border px-4 text-sm font-semibold ${details.bankType === one.id ? 'border-sky-400 bg-sky-500/15 text-sky-50' : 'border-zinc-700 text-zinc-300'} disabled:opacity-60`}>
                  {one.label}
                </button>
              ))}
            </div>
            {problem('bankType')}
          </div>
        </fieldset>

        <fieldset className="mt-8 space-y-4" disabled={isSigned}>
          <legend className="text-sm font-black uppercase tracking-widest text-zinc-400">Your class</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('stageName', 'Your name as students will see it', { placeholder: 'Your presenting name' })}
            {text('classTitle', 'Working title of your class')}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-200">What your class teaches</span>
            <textarea rows={4} value={details.classAbout} onChange={(event) => set('classAbout', event.target.value)} disabled={isSigned} data-hostfield="classAbout" className={`${AREA} ${problems.classAbout ? 'border-rose-400' : ''}`} placeholder="Three or four lines: the skill, who it is for, and what a student walks away with." />
            {problem('classAbout')}
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-200">A short bio <span className="font-normal text-zinc-500">— optional, for your class page</span></span>
            <textarea rows={3} value={details.bio} onChange={(event) => set('bio', event.target.value)} disabled={isSigned} className={AREA} />
          </label>
          {text('socials', 'Your website or social media', { optional: true, placeholder: 'Links, separated by commas' })}
        </fieldset>
      </section>

      {/* ── Recording, editing, languages ── */}
      <section className={CARD} data-hostchoices>
        <p className={LEAD}>Part 2</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-50">Recording, editing and languages</h2>
        <p className="mt-1 text-sm text-zinc-400">Tick what suits you. Where you choose FutureBox, we arrange it with you.</p>
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-100"><Camera className="h-4 w-4 text-sky-300" /> Recording</p>
            {choice('recordSelf', 'I record myself', 'FutureBox records me')}
            {problem('recordSelf')}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-100"><Film className="h-4 w-4 text-sky-300" /> Editing</p>
            {choice('editSelf', 'I edit my videos myself', 'FutureBox edits for me')}
            {problem('editSelf')}
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-zinc-100">Languages</p>
            <div className="grid gap-2 sm:grid-cols-2" data-hostchoice="languages">
              {([['both', 'English and Afrikaans — I record each piece in both'], ['english', 'English only — I do not speak Afrikaans']] as const).map(([value, label]) => (
                <button key={value} type="button" disabled={isSigned} aria-pressed={details.languages === value} onClick={() => set('languages', value)} className={`flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold ${details.languages === value ? 'border-sky-400 bg-sky-500/15 text-sky-50' : 'border-zinc-700 text-zinc-300'} disabled:opacity-60`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${details.languages === value ? 'border-sky-300 bg-sky-400 text-zinc-950' : 'border-zinc-600'}`}>{details.languages === value && <Check className="h-4 w-4" />}</span>
                  {label}
                </button>
              ))}
            </div>
            {problem('languages')}
          </div>
        </div>
      </section>

      {/* ── Photographs ── */}
      <section className={CARD} data-hostphotos>
        <p className={LEAD}>Part 3</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-50">Your six photographs — where we may use them</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          You give permission once, here, for the places you tick — for as long as your class is on FutureBox, plus twelve months. We do not ask again for each post inside that. Anything outside it — a place you did not tick, another product, after the period — we ask you first, in writing. You can withdraw the permission at any time; we then stop new uses within thirty days. The full wording is in section 8 of the terms.
        </p>
        <div className="mt-5 space-y-2">
          {PHOTO_USES.map((use) => {
            const on = details.photoUses.includes(use.id);
            return (
              <button
                key={use.id}
                type="button"
                disabled={isSigned || use.required}
                aria-pressed={on}
                data-hostuse={use.id}
                onClick={() => set('photoUses', (on ? details.photoUses.filter((one) => one !== use.id) : [...details.photoUses, use.id]) as PhotoUse[])}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold ${on ? 'border-sky-400 bg-sky-500/15 text-sky-50' : 'border-zinc-700 text-zinc-300'} disabled:cursor-default`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${on ? 'border-sky-300 bg-sky-400 text-zinc-950' : 'border-zinc-600'}`}>{on && <Check className="h-4 w-4" />}</span>
                <span>{use.label}{use.required ? <span className="block text-xs font-normal text-zinc-400">Always included — it is the class itself.</span> : null}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">{text('photoCredit', 'Photographer to credit', { optional: true, hint: 'If somebody else took the photos, their name — and you confirm they agree to this use.' })}</div>
      </section>

      {/* ── The terms, and signing ── */}
      <section className={CARD} data-hostterms>
        <p className={LEAD}>Part 4</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-50">The agreement</h2>
        <p className="mt-1 text-sm text-zinc-400">Between you and {COMPANY}. Read it to the end — the tick opens once you have.</p>
        <div
          className="mt-5 max-h-[26rem] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-sm leading-relaxed text-zinc-300"
          tabIndex={0}
          data-hostscroll
          onScroll={(event) => {
            const el = event.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadAll(true);
          }}
        >
          <p className="text-base font-black text-zinc-100">Cubed³ Presenter Terms and Conditions</p>
          {TERMS.map((clause) => (
            <div key={clause.title} className="mt-4">
              <p className="font-bold text-zinc-100">{clause.title}</p>
              {clause.body.map((line) => <p key={line} className="mt-1.5">{line}</p>)}
            </div>
          ))}
        </div>
        {!isSigned && (
          <>
            <label className={`mt-4 flex min-h-[52px] items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${readAll ? 'cursor-pointer border-zinc-600 text-zinc-100' : 'border-zinc-800 text-zinc-500'}`}>
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-sky-400" disabled={!readAll} checked={agreed} onChange={(event) => setAgreed(event.target.checked)} data-hostagree />
              <span>I have read the terms and conditions above, and I agree to them.{!readAll && <span className="block text-xs font-normal">Scroll to the end of the terms to tick this.</span>}</span>
            </label>

            <div className="mt-6 space-y-4">
              <p className="flex items-center gap-2 text-sm font-bold text-zinc-100"><PenLine className="h-4 w-4 text-sky-300" /> Your signature</p>
              <button type="button" onClick={() => setPad(true)} data-hostsign className="flex min-h-[120px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-zinc-600 text-sm font-semibold hover:border-sky-400" style={{ background: '#ffffff', color: '#71717a' }}>
                {signed ? <img src={signed.url} alt="Your signature" className="max-h-24" /> : 'Tap to sign — draw it, type it, or upload a picture of it'}
              </button>
              {signed && <button type="button" onClick={() => setPad(true)} className="text-xs font-semibold text-sky-300 underline">Sign again</button>}
              {text('signedName', 'Your full name, as your signature', { placeholder: details.legalName || 'Full name' })}
              <p className="text-xs text-zinc-500">The date and time you press “Sign and send” are kept with your signature — today is {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            </div>

            <button
              type="button"
              onClick={() => { void sign(); }}
              disabled={sending}
              data-hostsend
              className="fb-fx-go mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold disabled:opacity-60"
            >
              <span aria-hidden className="fb-fx-shine" />
              {sending ? <Loader2 className="relative h-5 w-5 animate-spin" /> : <PenLine className="relative h-5 w-5" />}
              <span className="relative">Sign and send</span>
            </button>
            {said && <p className="mt-3 text-sm font-semibold text-rose-300" role="alert" data-hostsaid>{said}</p>}
          </>
        )}
      </section>

      {/* ── The five steps ── */}
      <section className="space-y-5" data-hoststeps>
        <div className="px-1">
          <p className={LEAD}>Part 5</p>
          <h2 className="mt-2 text-2xl font-black text-zinc-50 sm:text-3xl">The five steps to record</h2>
          {state.filesUnread && <p className="mt-2 text-sm font-semibold text-amber-200">Some upload blocks could not be read just now, so what they show may be incomplete. Reload in a moment.</p>}
          <p className="mt-2 max-w-2xl text-[15px] text-zinc-400">Read them now and prepare at your own pace. {isSigned ? 'Each one has its upload block.' : 'Their upload blocks open once you have signed.'} {details.languages === 'english' ? 'You record in English.' : 'Record each piece in English and in Afrikaans.'}</p>
        </div>

        <Tips />

        {STEPS.map((step) => (
          <article key={step.n} className={CARD} data-hoststep={step.n}>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#a78bfa_60%,#f472b6)] text-xl font-black text-zinc-950">{step.n}</span>
              <div className="min-w-0">
                <h3 className="text-xl font-black text-zinc-50">{step.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sky-300"><Clock className="h-3.5 w-3.5" /> {step.length}</p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-300">{step.intro}</p>
            {step.script && <Script lines={step.script} />}
            {step.questions && (
              <ol className="mt-4 space-y-2">
                {step.questions.map((q, i) => (
                  <li key={q} className="flex gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-[15px] text-zinc-100">
                    <span className="font-black text-sky-300">{i + 1}.</span>{q}
                  </li>
                ))}
              </ol>
            )}
            {step.sessions ? (
              <div className="mt-5 space-y-4">
                {step.sessions.map((session) => (
                  <div key={session.slot} className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-300">Focus: {session.focus}</p>
                    <p className="mt-1 text-lg font-black text-zinc-50">{session.title}</p>
                    <p className="mt-3 text-sm font-semibold text-zinc-200">Open the session like this:</p>
                    <Script lines={[session.opener]} />
                    <p className="mt-3 text-sm font-semibold text-zinc-200">Then the content:</p>
                    <ul className="mt-2 space-y-1.5">
                      {session.points.map((point) => <li key={point} className="flex gap-2 text-sm text-zinc-300"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{point}</li>)}
                    </ul>
                    <Upload slot={session.slot} signed={isSigned} state={state} ask={ask} reload={load} />
                  </div>
                ))}
              </div>
            ) : (
              step.slots.map((slot) => <Upload key={slot} slot={slot} signed={isSigned} state={state} ask={ask} reload={load} />)
            )}
          </article>
        ))}
      </section>

      {/* ── What is expected after the steps ── */}
      <section className={CARD} data-hostafter>
        <p className={LEAD}>Part 6</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-50">After the five steps — what we expect</h2>
        <h3 className="mt-6 text-lg font-black text-zinc-100">Three short teaser videos</h3>
        <p className="mt-1 text-sm text-zinc-400">To announce your class before it opens. {details.languages === 'english' ? 'In English.' : 'Each one in English and in Afrikaans — six short videos in all.'} Film them upright (portrait) for social media.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TEASERS.map((one) => (
            <div key={one.title} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
              <p className="font-bold text-zinc-100">{one.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{one.body}</p>
            </div>
          ))}
        </div>
        <Upload slot="teasers" signed={isSigned} state={state} ask={ask} reload={load} />

        <h3 className="mt-8 text-lg font-black text-zinc-100">Six photographs of you</h3>
        <p className="mt-1 text-sm text-zinc-400">Six different, sharp photographs: a close portrait, one at work, one with your gear or tools, and three more that show your style. Good light, no filters, at least 1500 pixels on the short side. They are used only where you ticked in Part 3.</p>
        <Upload slot="photos" signed={isSigned} state={state} ask={ask} reload={load} />
      </section>

      <p className="pb-10 text-center text-xs text-zinc-600">{COMPANY} · Cubed³ presenter registration · terms version {TERMS_VERSION}</p>

      {pad && (
        <SignaturePad
          words={{ title: 'Your signature', draw: 'Draw', type: 'Type', upload: 'Upload', uploadHint: 'Choose a photo of your signature — the paper is taken out', clear: 'Clear', use: 'Use this signature', name: 'Your name', here: 'Sign with your finger or mouse', close: 'Close' }}
          onClose={() => setPad(false)}
          onMade={onSigned}
        />
      )}
    </Frame>
  );
}

function Frame({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return (
    <main data-cubedhost className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-sm font-black tracking-tight text-zinc-50">FutureBox <span className="bg-[linear-gradient(90deg,#7dd3fc,#f0abfc)] bg-clip-text text-transparent">Cubed³</span></p>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Presenters</p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">{children}</div>
    </main>
  );
}

/** Lines to read, with a button to copy them. */
function Script({ lines }: { readonly lines: readonly string[] }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-4 rounded-2xl border border-sky-400/25 bg-sky-500/[0.06] p-4 pr-14 sm:p-5 sm:pr-16">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-sky-300">Script</p>
      {lines.map((line) => <p key={line} className="mt-1.5 text-[15px] leading-relaxed text-zinc-100">{line}</p>)}
      <button
        type="button"
        aria-label="Copy the script"
        onClick={() => { void navigator.clipboard?.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl border border-sky-400/30 text-sky-200"
      >
        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Tips(): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div className={CARD}>
      <button type="button" onClick={() => setOpen((was) => !was)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-lg font-black text-zinc-50"><Camera className="h-5 w-5 text-sky-300" /> Recording yourself? Read this first</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-4 space-y-2">
          {RECORDING_TIPS.map((tip) => <li key={tip} className="flex gap-2 text-sm text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{tip}</li>)}
        </ul>
      )}
    </div>
  );
}

/**
 * One block: what is in it, a button to upload, and every other way the
 * files can come — links, as many as there are files, and WhatsApp, email,
 * a USB stick or recording together, with a note.
 */
function Upload({ slot: id, signed, state, ask, reload }: {
  readonly slot: SlotId;
  readonly signed: boolean;
  readonly state: State;
  readonly ask: (method: string, body?: unknown, query?: string) => Promise<Response>;
  readonly reload: () => Promise<void>;
}): React.ReactElement | null {
  const slot = slotOf(id);
  const picker = useRef<HTMLInputElement | null>(null);
  const [going, setGoing] = useState<{ name: string; part: number } | null>(null);
  const [said, setSaid] = useState('');
  const kept = state.links[id] ?? NO_TRANSFER;
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState(kept.note);
  const [wayOpen, setWayOpen] = useState(transferSaid(kept));
  const [linkSaid, setLinkSaid] = useState('');
  const files = useMemo(() => state.files[id] ?? [], [state.files, id]);
  if (!slot) return null;

  const sendOne = async (file: File): Promise<boolean> => {
    const type = typeOf(file);
    const answer = await ask('POST', { upload: { slot: id, name: file.name, type, size: file.size } });
    const got = await answer.json() as { bucket?: string; path?: string; token?: string; message?: string };
    if (!answer.ok || !got.path || !got.token) { setSaid(got.message ?? 'That could not be started.'); return false; }
    const target = `${SUPABASE}/storage/v1/object/upload/sign/${got.bucket}/${got.path}?token=${encodeURIComponent(got.token)}`;
    return new Promise((done) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', target);
      xhr.setRequestHeader('apikey', ANON);
      xhr.setRequestHeader('authorization', `Bearer ${ANON}`);
      xhr.setRequestHeader('content-type', type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) setGoing({ name: file.name, part: event.loaded / event.total }); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { done(true); return; }
        setSaid(xhr.status === 413 || /maximum|too large/i.test(xhr.responseText)
          ? `“${file.name}” is larger than uploads here accept. Send it another way below — a Google Drive, Dropbox or WeTransfer link, WhatsApp, email or a USB stick.`
          : `“${file.name}” could not be uploaded. Try again.`);
        done(false);
      };
      xhr.onerror = () => { setSaid(`“${file.name}” stopped uploading. Check your connection and try again.`); done(false); };
      xhr.send(file);
    });
  };

  const add = async (list: FileList | null): Promise<void> => {
    if (!list?.length) return;
    setSaid('');
    for (const file of Array.from(list)) {
      setGoing({ name: file.name, part: 0 });
      const ok = await sendOne(file);
      if (!ok) break;
    }
    setGoing(null);
    await reload();
  };

  const remove = async (path: string): Promise<void> => {
    await ask('DELETE', undefined, `?path=${encodeURIComponent(path)}`);
    await reload();
  };

  /** Keep this block's other ways: the whole of it at once, so nothing half-saved. */
  const keep = async (next: Transfer, done: string): Promise<boolean> => {
    setLinkSaid('');
    const answer = await ask('PUT', { transfer: { slot: id, ...next } });
    const got = await answer.json() as { message?: string };
    setLinkSaid(answer.ok ? done : got.message ?? 'That could not be kept.');
    if (answer.ok) await reload();
    return answer.ok;
  };
  const addLink = async (): Promise<void> => {
    const url = typed.trim();
    if (!url) return;
    if (!/^https:\/\//i.test(url)) { setLinkSaid('Paste the whole link, starting with https://'); return; }
    if (await keep({ ...kept, links: [...kept.links, url] }, 'Link added.')) setTyped('');
  };

  const Icon = slot.kind === 'photo' ? Camera : FileVideo;
  return (
    <div className={`mt-5 rounded-2xl border border-dashed p-4 ${signed ? 'border-sky-400/40 bg-sky-500/[0.04]' : 'border-zinc-700 bg-zinc-950/40'}`} data-hostupload={id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-100"><Icon className="h-4 w-4 text-sky-300" /> Files: {slot.title}</p>
        <p className="text-xs text-zinc-500">{files.length} of {slot.most}</p>
      </div>
      {!signed ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500"><Lock className="h-4 w-4" /> Opens once you have signed the agreement.</p>
      ) : (
        <>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((one) => (
                <li key={one.path} className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="min-w-0 flex-1 truncate text-zinc-200">{one.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{sizeSaid(one.bytes)}</span>
                  <button type="button" aria-label={`Remove ${one.name}`} onClick={() => { void remove(one.path); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {going && (
            <div className="mt-3" role="status">
              <p className="truncate text-xs text-zinc-400">Uploading {going.name} — {Math.round(going.part * 100)}%</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-[linear-gradient(90deg,#38bdf8,#e879f9)] transition-[width]" style={{ width: `${Math.round(going.part * 100)}%` }} /></div>
            </div>
          )}
          <input ref={picker} type="file" multiple accept={slot.kind === 'photo' ? 'image/jpeg,image/png,image/webp,image/heic,image/heif' : 'video/*'} className="hidden" onChange={(event) => { void add(event.target.files); event.target.value = ''; }} />
          <button type="button" disabled={Boolean(going) || files.length >= slot.most} onClick={() => picker.current?.click()} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 text-sm font-bold text-sky-100 disabled:opacity-50">
            {going ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {slot.kind === 'photo' ? 'Choose photographs' : 'Choose videos'}
          </button>
          <p className="mt-1.5 text-center text-xs text-zinc-500">From your phone or computer — or straight from iCloud Drive, Google Drive, OneDrive or Dropbox, which your phone’s file picker opens too.</p>
          {said && <p className="mt-2 text-sm font-semibold text-rose-300" role="alert">{said}</p>}
          {/* ── Every other way ── */}
          <div className="mt-4 border-t border-white/10 pt-3" data-hosttransfer={id}>
            <button type="button" aria-expanded={wayOpen} onClick={() => setWayOpen((was) => !was)} className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-sm font-bold text-zinc-200">
              <span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-sky-300" /> Send it another way{transferSaid(kept) ? ' — noted' : ''}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${wayOpen ? 'rotate-180' : ''}`} />
            </button>
            {wayOpen && (
              <div className="mt-2 space-y-4">
                <div>
                  <p className="text-xs leading-relaxed text-zinc-400">A link to the file — Google Drive, Dropbox, WeTransfer, OneDrive, iCloud, Box, MEGA, or an unlisted YouTube or Vimeo video. Any link that opens; set it so anyone with the link can view. One per file, or one to a folder.</p>
                  {kept.links.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {kept.links.map((one) => (
                        <li key={one} className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                          <a href={one} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sky-200 underline">{one}</a>
                          <button type="button" aria-label="Remove this link" onClick={() => { void keep({ ...kept, links: kept.links.filter((link) => link !== one) }, 'Link removed.'); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {kept.links.length < MOST_LINKS && (
                    <div className="mt-2 flex gap-2">
                      <input value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addLink(); }} placeholder="https://…" inputMode="url" className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" aria-label={`A link for ${slot.title}`} data-hostlinkinput />
                      <button type="button" onClick={() => { void addLink(); }} className="h-11 shrink-0 rounded-xl border border-zinc-600 px-4 text-sm font-bold text-zinc-200" data-hostlinkadd>Add</button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs leading-relaxed text-zinc-400">Or tell us how it will reach us, and FutureBox will contact you to arrange it:</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {WAYS.map((way) => {
                      const on = kept.way === way.id;
                      return (
                        <button key={way.id} type="button" aria-pressed={on} data-hostway={way.id} onClick={() => { void keep({ ...kept, way: on ? '' : way.id }, on ? 'Taken off.' : 'Noted — we will be in touch.'); }} className={`flex min-h-[52px] items-start gap-3 rounded-2xl border px-3 py-2.5 text-left ${on ? 'border-sky-400 bg-sky-500/15' : 'border-zinc-700'}`}>
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-sky-300 bg-sky-400 text-zinc-950' : 'border-zinc-600'}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                          <span><span className="block text-sm font-semibold text-zinc-100">{way.label}</span><span className="block text-xs text-zinc-400">{way.hint}</span></span>
                        </button>
                      );
                    })}
                  </div>
                  <textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 300))} onBlur={() => { if (note !== kept.note) void keep({ ...kept, note }, 'Note kept.'); }} rows={2} placeholder="Anything we should know — for example “Sending on Friday”, or “the file is 4 GB”." className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" aria-label={`A note about ${slot.title}`} />
                </div>
                {linkSaid && <p className="text-xs font-semibold text-zinc-300" role="status">{linkSaid}</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
