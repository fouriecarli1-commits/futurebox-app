'use client';

/**
 * The owner's presenter inbox: invite by email, and see what lands.
 *
 * The owner, 21 October 2026: *"Menend ek gee vir jou hulle eposse, en dit gee
 * vir hulle via 'n link access tot hierdie registrasie, en die registrasie
 * moet weer aan my kant land."*
 *
 * She types addresses; each gets a link of its own, mailed when mail is set
 * up and always shown here to copy — WhatsApp is how most of these will
 * actually travel. Every registration opens to its details, the choices, the
 * signature with when and from where it was signed, every file to download,
 * and the agreement as a document to print or save as a PDF.
 *
 * Behind her own sign-in, like `/google`: the token goes in a header, never
 * an address.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Check, ClipboardCopy, Download, ExternalLink, Link2, Loader2, Printer, RefreshCw, RotateCcw,
  Send, ShieldOff, ShieldCheck, Trash2,
} from 'lucide-react';
import { accessToken } from '../lib/cloud';
import {
  COMPANY, PHOTO_USES, SLOTS, TERMS, WAYS, type HostDetails, type Transfer,
} from '../lib/cubedhost';

interface Line {
  readonly id: string; readonly email: string; readonly note: string; readonly createdAt: string;
  readonly openedAt: string | null; readonly savedAt: string | null; readonly signedAt: string | null;
  readonly revokedAt: string | null; readonly name: string; readonly classTitle: string;
}
interface Kept { readonly name: string; readonly path: string; readonly bytes: number; readonly at: string | null }
interface Full {
  readonly id: string; readonly email: string; readonly note: string; readonly created_at: string;
  readonly opened_at: string | null; readonly signed_at: string | null; readonly terms_version: string | null;
  readonly signature: string | null; readonly signed_ip_hash: string | null; readonly signed_agent: string | null;
  readonly revoked_at: string | null; readonly links: Record<string, Transfer>; readonly details: HostDetails;
  readonly files: Record<string, Kept[]>;
  readonly filesUnread?: boolean;
}

const CARD = 'rounded-3xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6';
const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500 disabled:opacity-50';

const when = (iso: string | null): string => {
  if (!iso) return '—';
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '—' : at.toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const sizeSaid = (bytes: number): string =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

function standing(one: { revokedAt?: string | null; signedAt?: string | null; savedAt?: string | null; openedAt?: string | null }): { said: string; tone: string } {
  if (one.revokedAt) return { said: 'Switched off', tone: 'border-zinc-600 text-zinc-400' };
  if (one.signedAt) return { said: 'Signed', tone: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' };
  if (one.savedAt) return { said: 'Filling in', tone: 'border-amber-400/50 bg-amber-500/10 text-amber-200' };
  if (one.openedAt) return { said: 'Opened', tone: 'border-sky-400/50 bg-sky-500/10 text-sky-200' };
  return { said: 'Invited', tone: 'border-zinc-600 text-zinc-300' };
}

function Copy({ text, label = 'Copy link' }: { readonly text: string; readonly label?: string }): React.ReactElement {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={BTN} onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>
      {done ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}{done ? 'Copied' : label}
    </button>
  );
}

const shareText = (link: string): string =>
  `You are invited to present a Cubed³ masterclass on FutureBox. Register here — this link is yours alone:\n${link}`;

export default function CubedHosts(): React.ReactElement {
  const [token, setToken] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [mail, setMail] = useState(false);
  const [said, setSaid] = useState('');
  const [emails, setEmails] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ email: string; link: string; mailed: boolean }[]>([]);
  const [open, setOpen] = useState<Full | null>(null);
  const [fresh, setFresh] = useState('');

  const ask = useCallback(async (method: string, query = '', body?: unknown): Promise<Response> => fetch(`/api/cubed/hosts${query}`, {
    method,
    headers: { Authorization: `Bearer ${token ?? ''}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }), [token]);

  const load = useCallback(async (): Promise<void> => {
    const answer = await ask('GET');
    if (answer.status === 404) { setSaid('This page is for the owner. Sign in on the main site with the owner’s account, then come back.'); setLines([]); return; }
    const got = await answer.json() as { hosts?: Line[]; mail?: boolean; message?: string };
    if (!answer.ok) { setSaid(got.message ?? 'The registrations could not be read.'); setLines([]); return; }
    setLines(got.hosts ?? []);
    setMail(Boolean(got.mail));
  }, [ask]);

  useEffect(() => {
    void accessToken().then((one) => {
      if (!one) { setSaid('Sign in on the main site first, then come back to this page.'); setLines([]); return; }
      setToken(one);
    });
  }, []);
  useEffect(() => { if (token) void load(); }, [token, load]);

  const openOne = async (id: string): Promise<void> => {
    setFresh('');
    const answer = await ask('GET', `?id=${id}`);
    if (answer.ok) setOpen(await answer.json() as Full);
  };

  const invite = async (): Promise<void> => {
    setBusy(true);
    setSaid('');
    try {
      const answer = await ask('POST', '', { emails, note });
      const got = await answer.json() as { made?: { email: string; link: string; mailed: boolean }[]; message?: string };
      if (!answer.ok) { setSaid(got.message ?? 'The invitations could not be made.'); return; }
      setMade(got.made ?? []);
      setEmails('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: 'relink' | 'revoke' | 'restore' | 'reopen'): Promise<void> => {
    if (!open) return;
    if (action === 'reopen' && !window.confirm('Reopen this registration? The signature is cleared and the presenter signs again after making changes.')) return;
    const answer = await ask('PATCH', '', { id: open.id, action });
    const got = await answer.json() as { link?: string };
    if (got.link) setFresh(got.link);
    await openOne(open.id);
    await load();
  };

  const remove = async (): Promise<void> => {
    if (!open || !window.confirm(`Delete ${open.details.legalName || open.email}'s registration and every file in it? This cannot be undone.`)) return;
    const answer = await ask('DELETE', `?id=${open.id}`);
    if (answer.ok) { setOpen(null); await load(); }
  };

  const download = async (path: string): Promise<void> => {
    const answer = await ask('GET', `?file=${encodeURIComponent(path)}`);
    const got = await answer.json() as { url?: string };
    if (got.url) window.open(got.url, '_blank', 'noopener');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100" data-cubedhosts>
      {/* Only the agreement prints. */}
      <style>{'@media print { body * { visibility: hidden !important; } [data-printable], [data-printable] * { visibility: visible !important; } [data-printable] { position: absolute; inset: 0 auto auto 0; width: 100%; } }'}</style>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <a href="/cubed" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-zinc-300"><ArrowLeft className="h-4 w-4" /> Cubed³</a>
          <p className="text-sm font-black">Presenter inbox</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {said && <p className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm font-semibold text-amber-100" role="alert">{said}</p>}

        {/* ── Invite ── */}
        {token && lines !== null && !said.startsWith('This page is for') && (
          <section className={CARD}>
            <h1 className="text-2xl font-black">Invite presenters</h1>
            <p className="mt-1 text-sm text-zinc-400">One email address per line, or separated by commas. Each person gets a link of their own to the registration page.</p>
            <textarea value={emails} onChange={(event) => setEmails(event.target.value)} rows={4} placeholder={'name@example.com\nanother@example.com'} className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-[15px]" data-hostsemails />
            <input value={note} onChange={(event) => setNote(event.target.value.slice(0, 200))} placeholder="A line to add to the invitation — optional" className="mt-3 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-[15px]" />
            <button type="button" disabled={busy || !emails.trim()} onClick={() => { void invite(); }} className="fb-fx-go mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold disabled:opacity-50" data-hostsinvite>
              <span aria-hidden className="fb-fx-shine" />
              {busy ? <Loader2 className="relative h-5 w-5 animate-spin" /> : <Send className="relative h-5 w-5" />}<span className="relative">Make the links</span>
            </button>
            <p className="mt-2 text-xs text-zinc-500">{mail ? 'Each link is also emailed to the presenter.' : 'Email sending is not set up yet, so send each link yourself — copy it into an email, or open it in WhatsApp.'}</p>

            {made.length > 0 && (
              <ul className="mt-5 space-y-3" data-hostsmade>
                {made.map((one) => (
                  <li key={one.link} className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-4">
                    <p className="font-bold text-zinc-100">{one.email} {one.mailed && <span className="ml-1 text-xs font-semibold text-emerald-300">· emailed</span>}</p>
                    <p className="mt-1 break-all text-xs text-zinc-400">{one.link}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Copy text={one.link} />
                      <a className={BTN} href={`https://wa.me/?text=${encodeURIComponent(shareText(one.link))}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> WhatsApp</a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Everybody invited ── */}
        {lines === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
        ) : lines.length > 0 && (
          <section className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-black">Registrations</h2>
              <button type="button" className={BTN} onClick={() => { void load(); }} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
            </div>
            <ul className="mt-4 divide-y divide-white/5">
              {lines.map((one) => {
                const s = standing(one);
                return (
                  <li key={one.id}>
                    <button type="button" onClick={() => { void openOne(one.id); }} className="flex w-full items-center gap-3 py-3 text-left" data-hostsline={one.id}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-zinc-100">{one.name || one.email}</p>
                        <p className="truncate text-xs text-zinc-500">{one.classTitle ? `${one.classTitle} · ` : ''}{one.email} · invited {when(one.createdAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${s.tone}`}>{s.said}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── One registration ── */}
        {open && (
          <section className={CARD} data-hostsopen>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{open.details.stageName || open.details.legalName || open.email}</h2>
                <p className="text-sm text-zinc-400">{open.email} · {standing({ revokedAt: open.revoked_at, signedAt: open.signed_at, openedAt: open.opened_at }).said}</p>
              </div>
              <button type="button" className={BTN} onClick={() => setOpen(null)}>Close</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={BTN} onClick={() => { void act('relink'); }}><Link2 className="h-4 w-4" /> New link</button>
              {open.revoked_at
                ? <button type="button" className={BTN} onClick={() => { void act('restore'); }}><ShieldCheck className="h-4 w-4" /> Switch link on</button>
                : <button type="button" className={BTN} onClick={() => { void act('revoke'); }}><ShieldOff className="h-4 w-4" /> Switch link off</button>}
              {open.signed_at && <button type="button" className={BTN} onClick={() => { void act('reopen'); }}><RotateCcw className="h-4 w-4" /> Reopen for changes</button>}
              {open.signed_at && <button type="button" className={BTN} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save the agreement</button>}
              <button type="button" className={`${BTN} text-rose-300`} onClick={() => { void remove(); }}><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
            {fresh && (
              <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-4">
                <p className="text-sm font-semibold">A new link — the old one no longer works:</p>
                <p className="mt-1 break-all text-xs text-zinc-400">{fresh}</p>
                <div className="mt-2 flex flex-wrap gap-2"><Copy text={fresh} /><a className={BTN} href={`https://wa.me/?text=${encodeURIComponent(shareText(fresh))}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> WhatsApp</a></div>
              </div>
            )}

            <h3 className="mt-6 text-sm font-black uppercase tracking-widest text-zinc-400">Files</h3>
            {open.filesUnread && <p className="mt-2 text-sm font-semibold text-amber-200">Some upload blocks could not be read just now — what shows below may be incomplete. Open the registration again in a moment.</p>}
            <ul className="mt-2 space-y-3">
              {SLOTS.map((slot) => {
                const files = open.files[slot.id] ?? [];
                const sent = open.links?.[slot.id];
                const way = WAYS.find((one) => one.id === sent?.way);
                return (
                  <li key={slot.id} className="rounded-2xl border border-white/10 p-3">
                    <p className="text-sm font-bold text-zinc-200">{slot.title} <span className="font-normal text-zinc-500">· {files.length} file{files.length === 1 ? '' : 's'}</span></p>
                    {files.map((one) => (
                      <button key={one.path} type="button" onClick={() => { void download(one.path); }} className="mt-2 flex w-full items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-left text-sm">
                        <Download className="h-4 w-4 shrink-0 text-sky-300" /><span className="min-w-0 flex-1 truncate">{one.name}</span><span className="text-xs text-zinc-500">{sizeSaid(one.bytes)}</span>
                      </button>
                    ))}
                    {(sent?.links ?? []).map((link) => (
                      <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm text-sky-300 underline"><ExternalLink className="h-4 w-4 shrink-0" />{link}</a>
                    ))}
                    {way && <p className="mt-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100">Coming another way: {way.label}. Contact them to arrange it.</p>}
                    {sent?.note && <p className="mt-1 text-sm text-zinc-300">“{sent.note}”</p>}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 overflow-hidden rounded-2xl">
              <Agreement full={open} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/** The agreement as a document: what was filled in, the terms as they were, and the signature. */
function Agreement({ full }: { readonly full: Full }): React.ReactElement {
  const d = full.details;
  const rows: [string, string][] = [
    ['Full name', d.legalName],
    ['ID or passport number', d.idNumber],
    ['Date of birth', d.birthDate],
    ['Nationality', d.nationality],
    ['Presenting as', d.entity === 'company' ? `${d.companyName} (${d.companyReg}), represented by ${d.legalName}, ${d.companyRole}` : 'An individual'],
    ['Income tax number', d.taxNumber || '—'],
    ['VAT number', d.vatNumber || '—'],
    ['Address', [d.street, d.suburb, d.city, d.province, d.postalCode, d.country].filter(Boolean).join(', ')],
    ['Mobile', d.phone],
    ['Email', [full.email, d.altEmail].filter(Boolean).join(', ')],
    ['Presenting name', d.stageName],
    ['Class (working title)', d.classTitle],
    ['About the class', d.classAbout],
    ['Languages', d.languages === 'english' ? 'English only' : 'English and Afrikaans'],
    ['Recording', d.recordSelf ? 'Records themselves' : 'Recorded by FutureBox'],
    ['Editing', d.editSelf ? 'Edits themselves' : 'Edited by FutureBox'],
    ['Photographs may be used', PHOTO_USES.filter((use) => d.photoUses.includes(use.id)).map((use) => use.label).join('; ')],
    ['Photographer credit', d.photoCredit || '—'],
  ];
  return (
    /* Paper, in literal colours: the app remaps white and the greys onto the theme. */
    <article data-printable className="p-6 text-[13px] leading-relaxed sm:p-10" style={{ background: '#ffffff', color: '#18181b' }}>
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{COMPANY}</p>
      <h2 className="mt-1 text-2xl font-black">Cubed³ Presenter Agreement</h2>
      <p className="mt-1 text-zinc-600">Between {COMPANY} and the presenter below.{full.signed_at ? ` Signed electronically on ${when(full.signed_at)}.` : ' Not signed yet.'}</p>
      <table className="mt-5 w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-zinc-200 align-top">
              <th className="w-1/3 py-1.5 pr-3 text-left font-semibold text-zinc-600">{label}</th>
              <td className="py-1.5">{value || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mt-6 text-lg font-black">Terms and conditions</h3>
      {TERMS.map((clause) => (
        <div key={clause.title} className="mt-3 break-inside-avoid">
          <p className="font-bold">{clause.title}</p>
          {clause.body.map((line) => <p key={line} className="mt-1">{line}</p>)}
        </div>
      ))}
      <div className="mt-8 break-inside-avoid border-t border-zinc-300 pt-4">
        <p className="font-bold">Signed by the presenter</p>
        {full.signature ? <img src={full.signature} alt="Signature" className="mt-2 h-20" /> : <p className="mt-2 text-zinc-500">No signature yet.</p>}
        <p className="mt-1">{d.signedName || d.legalName}</p>
        <p className="text-xs text-zinc-500">
          {full.signed_at ? `Signed ${when(full.signed_at)}` : ''}{full.terms_version ? ` · terms version ${full.terms_version}` : ''}{full.signed_ip_hash ? ` · device address (hashed) ${full.signed_ip_hash.slice(0, 12)}` : ''}
        </p>
        {full.signed_agent && <p className="text-[10px] text-zinc-400">{full.signed_agent}</p>}
      </div>
    </article>
  );
}
