'use client';

/**
 * The amp catalogue, inside the booth's tone drawer.
 *
 * ── What this is ─────────────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"Ek wil die amps manually oplaai, dan word dit 'n
 * katelogus waarna mense in ons app kan soek. Dit moet alles in ons sisteem
 * en databasis wees."* And the half that makes it fair: *"ons maak dan net
 * seker die eienaar van die amp kry die eer."*
 *
 * Two faces of one panel. A member sees a search box and a list — press a
 * capture and it lands on the shelf with the maker and the licence already
 * on it, so the licence question the shelf asks of a file off the phone is
 * never asked here. The owner sees the same, plus a form to add one: the
 * file, its name, the maker, the licence, where it came from.
 *
 * ── What is proved, and where ────────────────────────────────────────────
 *
 * The same rule as the shelf, in both directions. A capture coming OUT is
 * run through `loads()` before it is kept, because a shelf that fills with
 * files that will not load is worse than no shelf. A capture going IN is run
 * through `loads()` before it is sent, so what reaches the database has
 * been read by the engine every member uses — the server holds the shape
 * and the size but has no engine of its own.
 *
 * ── Why the owner's form is here and not on a settings page ──────────────
 *
 * Because this is where she will be standing. She downloads a capture,
 * opens the booth to hear it, and the place to add it is the place she is
 * already looking at. A form on another screen is a form that waits.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import { LICENCES, mayBeShared, SHAREABLE, type LicenceId } from '../lib/amplicence';
import { AMP_MAX_BYTES, ampId, rememberAmp, STOCK_AMPS } from '../lib/amps';
import { ampMaker, ampName, loads } from '../lib/nam';
import AmpFace from './AmpFace';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly maker: string;
  readonly licence: string;
  readonly source: string;
  readonly gear: string;
  readonly tone: string;
}

type Answer = {
  ready?: boolean;
  signedIn?: boolean;
  owner?: boolean;
  amps?: Row[];
};

export default function AmpCatalogue({ onShelf }: { onShelf: () => void }): React.ReactElement {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'off' | 'signin'>('idle');
  const [owner, setOwner] = useState(false);
  const [fetching, setFetching] = useState<string | null>(null);
  const [said, setSaid] = useState('');

  /* The latest search wins. Two answers crossing on a slow link would
     otherwise draw the older one over the newer. */
  const asked = useRef(0);

  const look = useCallback(async (text: string) => {
    const mine = (asked.current += 1);
    setState('loading');
    try {
      const token = await accessToken();
      const answer = await fetch(`/api/amps?q=${encodeURIComponent(text)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const got = (await answer.json().catch(() => null)) as Answer | null;
      if (mine !== asked.current) return;
      if (answer.status === 401 || got?.signedIn === false) { setState('signin'); return; }
      if (!got?.ready) { setState('off'); return; }
      setRows(got.amps ?? []);
      setOwner(Boolean(got.owner));
      setState('ready');
    } catch {
      if (mine === asked.current) setState('off');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const wait = setTimeout(() => { void look(q); }, 250);
    return () => clearTimeout(wait);
  }, [open, q, look]);

  /* ── Out of the catalogue, onto the shelf ───────────────────────────── */
  const take = async (row: Row) => {
    setFetching(row.id);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch(`/api/amps?id=${encodeURIComponent(row.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const got = (await answer.json().catch(() => null)) as { amp?: Row & { nam: string } } | null;
      if (!answer.ok || !got?.amp?.nam) { setSaid(t('pro.ampFetchFail', 'That one could not be fetched just now.')); return; }
      if (!(await loads(got.amp.nam))) { setSaid(t('pro.ampNoLoadHere', 'That capture did not load as an amp here.')); return; }
      await rememberAmp({
        id: ampId(),
        name: got.amp.name,
        from: 'catalogue',
        bytes: got.amp.nam.length,
        createdAt: new Date().toISOString(),
        maker: got.amp.maker,
        licence: got.amp.licence as LicenceId,
      }, got.amp.nam);
      onShelf();
      setSaid(t('pro.ampOnShelf', 'It is on your shelf. Put it on a track.'));
    } catch {
      setSaid(t('pro.ampFetchFail', 'That one could not be fetched just now.'));
    } finally {
      setFetching(null);
    }
  };

  /* ── Into the catalogue, the owner's half ───────────────────────────── */
  const [adding, setAdding] = useState(false);
  const [json, setJson] = useState('');
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [maker, setMaker] = useState('');
  const [licence, setLicence] = useState<LicenceId>('cc-by');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [addSaid, setAddSaid] = useState('');

  const chose = async (file: File) => {
    setAddSaid('');
    if (file.size > AMP_MAX_BYTES) { setAddSaid(t('pro.ampTooBig', 'That file is too large to be a capture. A .nam is usually under a megabyte.')); return; }
    const text = await file.text();
    setJson(text);
    setFileName(file.name);
    setName(ampName(text));
    setMaker(ampMaker(text));
  };

  const add = async () => {
    setAddSaid('');
    if (!json || !name.trim() || !maker.trim()) { setAddSaid(t('pro.ampAddNeeds', 'A file, a name and the maker are all needed.')); return; }
    if (!mayBeShared(licence)) { setAddSaid(t('pro.ampAddRefused', 'That licence does not allow us to pass the capture on.')); return; }
    setBusy(true);
    try {
      /* Run it FIRST. What goes to every member has been read by the
         engine every member uses. */
      if (!(await loads(json))) { setAddSaid(t('pro.ampNoLoadHere', 'That capture did not load as an amp here.')); return; }
      const token = await accessToken();
      const answer = await fetch('/api/amps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: name.trim(), maker: maker.trim(), licence, source: source.trim(), nam: json }),
      });
      const got = (await answer.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!answer.ok) {
        setAddSaid(got?.error === 'licence'
          ? t('pro.ampAddRefused', 'That licence does not allow us to pass the capture on.')
          : (got?.message || t('pro.ampAddFail', 'That could not be added just now.')));
        return;
      }
      setAddSaid(t('pro.ampAdded', 'It is in the catalogue.'));
      setJson(''); setFileName(''); setName(''); setMaker(''); setSource('');
      void look(q);
    } catch {
      setAddSaid(t('pro.ampAddFail', 'That could not be added just now.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    const token = await accessToken();
    await fetch(`/api/amps?id=${encodeURIComponent(row.id)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => undefined);
    void look(q);
  };

  const licenceName = (id: string) => {
    const one = LICENCES.find((each) => each.id === id);
    return one ? t(one.name[0], one.name[1]) : id;
  };

  return (
    <div className="space-y-2 min-w-0" data-ampcatalogue>
      <button
        type="button"
        data-ampfind
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="px-2.5 py-1.5 min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold flex items-center gap-1.5 text-zinc-300 hover:text-white"
      >
        <Search className="w-3.5 h-3.5" />
        {t('pro.ampFind', 'Find an amp')}
      </button>

      {open && (
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5" data-ampfindpanel>
          <p className="text-[11px] leading-snug text-zinc-500">
            {t('pro.ampFindWhat', 'Captures of real amps and pedals, chosen for FutureBox and credited to the people who made them. Press one and it goes on your shelf with the maker and the licence already on it.')}
          </p>
          <input
            type="search"
            data-ampsearch
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={t('pro.ampSearch', 'Amp, maker or sound')}
            aria-label={t('pro.ampSearch', 'Amp, maker or sound')}
            className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
          />

          {state === 'loading' && rows.length === 0 && (
            <p className="text-[11px] text-zinc-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('pro.ampFetching', 'Fetching it…')}</p>
          )}
          {state === 'off' && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-amber-400">
                {t('pro.ampCatalogueOff', 'The catalogue is not set up yet.')}
              </p>
              <p className="text-[11px] text-zinc-400">
                {t('pro.stockAmpsWhy', 'Ready-made guitar tones from the room’s own drive, colour and speaker cabinet — a starting point in the spirit of classic amps, not captures of them. For a real captured amp, load a .nam file.')}
              </p>
            </div>
          )}
          {state === 'signin' && <p className="text-[11px] text-amber-400">{t('pro.ampSignIn', 'Sign in to search the catalogue.')}</p>}
          {state === 'ready' && rows.length === 0 && (
            <p className="text-[11px] text-zinc-500">{q ? t('pro.ampNone', 'Nothing in the catalogue matches that yet.') : t('pro.ampEmpty', 'The catalogue is empty for now.')}</p>
          )}

          {/* Built-in stock amp sounds */}
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">
                {t('pro.stockAmps', 'Stock amp sounds (built-in)')}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                {t('pro.offlineReady', 'Works without internet')}
              </span>
            </div>
            <ul className="space-y-1.5">
              {STOCK_AMPS.map((amp) => (
                <li key={amp.id} className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2">
                  <AmpFace amp={amp} size={48} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white truncate">{amp.name}</span>
                    <span className="block text-[11px] text-zinc-400 leading-tight">
                      {lang === 'af' ? amp.descAf : amp.descEn}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400 px-2 py-1 rounded-lg bg-zinc-800/80 shrink-0">
                    {amp.category}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {rows.length > 0 && (
            <ul className="space-y-1" data-ampresults>
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    data-amptake={row.id}
                    onClick={() => void take(row)}
                    disabled={fetching !== null}
                    className="flex-1 min-w-0 text-left px-2.5 py-1.5 min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-950 hover:border-emerald-500/50 disabled:opacity-60"
                  >
                    <span className="block text-xs font-bold text-zinc-100 truncate">{row.name}</span>
                    {/* The maker, every time. The credit names a person. */}
                    <span className="block text-[11px] text-zinc-500 truncate">
                      {row.maker}
                      {' · '}
                      {licenceName(row.licence)}
                      {row.gear ? ` · ${row.gear}` : ''}
                      {row.tone ? ` · ${row.tone}` : ''}
                    </span>
                  </button>
                  {fetching === row.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                  {owner && (
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      aria-label={t('pro.ampRemove', 'Take it out of the catalogue')}
                      title={t('pro.ampRemove', 'Take it out of the catalogue')}
                      className="min-h-[44px] min-w-[44px] rounded-lg border border-zinc-800 text-zinc-500 hover:text-red-300 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {said && <p className="text-[11px] text-zinc-300" data-ampsaid>{said}</p>}

          {owner && (
            <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] p-2.5" data-ampadd>
              <button
                type="button"
                onClick={() => setAdding((was) => !was)}
                aria-expanded={adding}
                className="px-2.5 py-1.5 min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold flex items-center gap-1.5 text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('pro.ampAdd', 'Add to the catalogue')}
              </button>
              {adding && (
                <>
                  <p className="text-[11px] leading-snug text-zinc-400">
                    {t('pro.ampAddWhat', 'Only you see this. A capture you add here goes to every member, so only a licence that allows us to pass it on is accepted: CC0, CC BY, CC BY-SA, CC BY-ND, or one you made yourself.')}
                  </p>
                  {/* The same shape as "Bring in an amp" on the row above: a
                      button-shaped label over a hidden input, and the file's
                      name beside it once one is chosen. */}
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <label className="px-2.5 py-1.5 min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold flex items-center gap-1.5 text-zinc-300 hover:text-white cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      {t('pro.ampAddFile', 'Choose the .nam file')}
                      <input
                        type="file"
                        data-ampaddfile
                        accept=".nam,application/json"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (file) void chose(file);
                        }}
                      />
                    </label>
                    {fileName && <span className="text-[11px] text-zinc-500 truncate min-w-0" data-ampaddchosen>{fileName}</span>}
                  </div>
                  <label className="block text-[11px] text-zinc-400">
                    {t('pro.ampAddName', 'What it is called')}
                    <input type="text" data-ampaddname value={name} maxLength={80} onChange={(event) => setName(event.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" />
                  </label>
                  <label className="block text-[11px] text-zinc-400">
                    {t('pro.ampMakerAsk', 'Who made it? The name on the TONE3000 page, so the credit names a person.')}
                    <input type="text" data-ampaddmaker value={maker} maxLength={80} onChange={(event) => setMaker(event.target.value)}
                      placeholder={t('pro.ampMakerWho', 'The maker')}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" />
                  </label>
                  <label className="block text-[11px] text-zinc-400">
                    {t('pro.ampAsk', 'What did this capture come under? Three of the licences on TONE3000 say a song made through them may not be sold, so this is worth a moment now rather than a question later.')}
                    <select data-ampaddlicence value={licence} onChange={(event) => setLicence(event.target.value as LicenceId)}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100">
                      {/* Only the licences we may pass on. The refused ones are not
                          greyed out, they are absent: a form that offers a choice
                          it will refuse is a form that argues. */}
                      {LICENCES.filter((one) => SHAREABLE.includes(one.id)).map((one) => (
                        <option key={one.id} value={one.id}>{t(one.name[0], one.name[1])}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] text-zinc-400">
                    {t('pro.ampAddSource', 'Where it came from (the TONE3000 page)')}
                    <input type="url" data-ampaddsource value={source} maxLength={300} onChange={(event) => setSource(event.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100" />
                  </label>
                  <button
                    type="button"
                    data-ampaddgo
                    onClick={() => void add()}
                    disabled={busy}
                    className="min-h-[44px] w-full rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-200 disabled:opacity-60"
                  >
                    {busy ? t('pro.ampAdding', 'Adding…') : t('pro.ampAddGo', 'Add it')}
                  </button>
                  {addSaid && <p className="text-[11px] text-zinc-300" data-ampaddsaid>{addSaid}</p>}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
