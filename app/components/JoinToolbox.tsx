'use client';

/**
 * The transitions, packed neatly: grouped, pictured, findable.
 *
 * Carli, 16 October 2026, screenshots of a desktop editor's toolbox: *"Kyk ook
 * hoe netjies dit verpak is."* Groups with a heading that folds, one row per
 * transition with a small picture of what it does beside its name, and the
 * ones she uses most kept at the top as favourites.
 *
 * The pictures are drawn by `joinpaint.ts` — the code that draws the film —
 * so a transition does in the list exactly what it does in the export. The
 * chosen one, and one under the pointer, play; the rest hold one frame, so a
 * list of sixty is not sixty animations on a phone.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Star } from 'lucide-react';
import { JOIN_GROUPS, type JoinGroup } from '../lib/joinbook';
import { drawJoinPreview } from '../lib/joinpreview';
import { JOINS, joinName, type Join } from '../lib/videojoins';

const FAVOURITES_KEY = 'fb-join-favourites';
const PLAYS_FOR = 1400;

function readFavourites(): Join[] {
  try {
    const raw = window.localStorage.getItem(FAVOURITES_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((one): one is Join => JOINS.some((join) => join.id === one)) : [];
  } catch {
    return [];
  }
}

function JoinThumb({ join, live }: { readonly join: Join; readonly live: boolean }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    if (!live) {
      drawJoinPreview(el, join, 0.5);
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number): void => {
      /* Through, then a breath on the arriving picture, then round again. */
      const p = ((now - started) % (PLAYS_FOR + 500)) / PLAYS_FOR;
      drawJoinPreview(el, join, Math.min(1, p));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [join, live]);
  return <canvas ref={canvas} width={64} height={36} aria-hidden className="h-9 w-16 shrink-0 rounded-md border border-zinc-700" />;
}

export default function JoinToolbox({
  value,
  onPick,
  lang,
  t,
}: {
  readonly value: Join;
  readonly onPick: (join: Join) => void;
  readonly lang: string;
  readonly t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const groupOf = (id: Join): JoinGroup => JOINS.find((one) => one.id === id)?.group ?? 'dissolve';
  const [open, setOpen] = useState<ReadonlySet<JoinGroup>>(() => new Set<JoinGroup>(['dissolve', groupOf(value)]));
  const [hover, setHover] = useState<Join | null>(null);
  const [looking, setLooking] = useState('');
  const [favourites, setFavourites] = useState<Join[]>([]);
  useEffect(() => { setFavourites(readFavourites()); }, []);

  const keepFavourites = (next: Join[]): void => {
    setFavourites(next);
    try { window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next)); } catch { /* the list still works this visit */ }
  };
  const flipFavourite = (id: Join): void => {
    keepFavourites(favourites.includes(id) ? favourites.filter((one) => one !== id) : [...favourites, id]);
  };

  const found = useMemo(() => {
    const q = looking.trim().toLowerCase();
    if (!q) return null;
    return JOINS.filter((one) => one.en.toLowerCase().includes(q) || one.af.toLowerCase().includes(q));
  }, [looking]);

  const row = (id: Join, where: 'list' | 'favourite'): React.ReactElement => {
    const on = value === id;
    const starred = favourites.includes(id);
    return (
      <div
        key={`${where}-${id}`}
        className={`flex items-center gap-1 rounded-xl border ${on ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'}`}
        onPointerEnter={() => setHover(id)}
        onPointerLeave={() => setHover((was) => (was === id ? null : was))}
      >
        <button
          type="button"
          aria-pressed={on}
          {...(where === 'list' ? { 'data-editorjoin': id } : { 'data-editorjoinfav': id })}
          onClick={() => onPick(id)}
          className={`flex min-h-[48px] min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1 text-left text-sm font-semibold ${on ? 'text-emerald-300' : 'text-zinc-200'}`}
        >
          <JoinThumb join={id} live={on || hover === id} />
          <span className="truncate">{joinName(id, lang)}</span>
        </button>
        {id !== 'cut' && (
          <button
            type="button"
            data-editorjoinstar={id}
            aria-pressed={starred}
            aria-label={starred ? t('edit.joinUnstar', 'Take out of favourites') : t('edit.joinStar', 'Keep as a favourite')}
            onClick={() => flipFavourite(id)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg"
          >
            <Star className={`h-4 w-4 ${starred ? 'fill-amber-300 text-amber-300' : 'text-zinc-500'}`} />
          </button>
        )}
      </div>
    );
  };

  const groupName = (id: JoinGroup): string => {
    const g = JOIN_GROUPS.find((one) => one.id === id);
    return g ? (lang === 'af' ? g.af : g.en) : id;
  };

  return (
    <div className="space-y-2" data-jointoolbox>
      <label className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          type="search"
          data-jointoolsearch
          value={looking}
          onChange={(event) => setLooking(event.target.value)}
          placeholder={t('edit.joinSearch', 'Find a transition')}
          aria-label={t('edit.joinSearch', 'Find a transition')}
          className="min-h-[44px] w-full bg-transparent text-sm text-zinc-100 outline-hidden"
        />
      </label>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1" data-jointoollist>
        {found ? (
          found.length ? (
            <div className="space-y-1.5">{found.map((one) => row(one.id, 'list'))}</div>
          ) : (
            <p className="px-1 text-sm text-zinc-500">{t('edit.joinNone', 'No transition by that name.')}</p>
          )
        ) : (
          <>
            {favourites.length > 0 && (
              <section className="space-y-1.5" data-jointoolgroup="favourites">
                <p className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-amber-300" />
                  {t('edit.joinFavs', 'Favourites')}
                </p>
                {favourites.map((id) => row(id, 'favourite'))}
              </section>
            )}
            {row('cut', 'list')}
            {JOIN_GROUPS.map((group) => {
              const members = JOINS.filter((one) => one.group === group.id && one.id !== 'cut');
              const isOpen = open.has(group.id);
              return (
                <section key={group.id} className="space-y-1.5" data-jointoolgroup={group.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    data-jointoolhead={group.id}
                    onClick={() => setOpen((was) => {
                      const next = new Set(was);
                      if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                      return next;
                    })}
                    className="flex h-11 w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-left text-sm font-bold text-zinc-200"
                  >
                    <span>{groupName(group.id)}</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                      {members.length}
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </button>
                  {isOpen && members.map((one) => row(one.id, 'list'))}
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
