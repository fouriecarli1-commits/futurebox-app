'use client';

/**
 * People whose sound is near yours, and how to reach them.
 *
 * The radar used to match demo tracks against demo tracks, which demonstrated
 * matching without finding anybody. This matches your songs against songs
 * other people have chosen to show, and every match carries the reasons —
 * because the output of this panel is a message to a real person and you have
 * to be able to disagree with the machine before you send it.
 *
 * Sharing is opt-in, per song, and reversible. The audio is never shared: a
 * match needs tempo, key and the style words, and handing over the file would
 * be a licence question nobody agreed to. The screen says so where the switch
 * is, not in a policy page.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Handshake, Loader2, Radar, Users } from 'lucide-react';
import { loadTracks, type Track } from '../lib/library';
import { matchTracks, type TrackMatch } from '../lib/matching';
import {
  fetchCreator, fetchRadar, mineAsFlavour, saveCreator, setShared, theirsAsFlavour,
  type Creator, type RadarTrack,
} from '../lib/radar';
import { useLang } from '../lib/i18n';

const LINKS = ['website', 'x', 'instagram', 'youtube', 'tiktok', 'soundcloud'] as const;

const BLANK: Creator = { name: '', handle: '', about: '', links: {} };

export default function CollabFinder({ reloadKey }: { reloadKey: number }): React.ReactElement {
  const { t } = useLang();

  const [mine, setMine] = useState<Track[]>([]);
  const [others, setOthers] = useState<RadarTrack[]>([]);
  const [creator, setCreator] = useState<Creator>(BLANK);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMine(loadTracks());
  }, [reloadKey]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([fetchRadar(), fetchCreator()]).then(([radar, me]) => {
      if (!live) return;
      setOthers(radar.tracks);
      setSharedIds(radar.mineShared);
      if (me) setCreator(me);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  const catalogue = useMemo(() => others.map(theirsAsFlavour), [others]);
  const byId = useMemo(() => new Map(others.map((one) => [one.id, one])), [others]);

  /**
   * Every one of your songs against everything on the radar, best first.
   *
   * Scored by `app/lib/matching.ts`, untouched: it already weighs key, tempo
   * and shared style words and explains itself. Only what it is pointed at
   * changed.
   */
  const matches = useMemo(() => {
    if (!mine.length || !catalogue.length) return [];
    const found: Array<{ from: Track; match: TrackMatch }> = [];
    mine.forEach((track) => {
      matchTracks(mineAsFlavour(track, creator.handle ? `@${creator.handle}` : ''), catalogue)
        .slice(0, 3)
        .forEach((match) => found.push({ from: track, match }));
    });
    return found.sort((a, b) => b.match.score - a.match.score).slice(0, 12);
  }, [catalogue, creator.handle, mine]);

  const toggleShare = useCallback(async (track: Track) => {
    setBusy(track.id);
    setProblem(null);
    const on = sharedIds.indexOf(track.id) === -1;
    const failed = await setShared(track.id, on);
    setBusy(null);
    if (failed) {
      setProblem(failed);
      return;
    }
    setSharedIds((was) => (on ? was.concat(track.id) : was.filter((id) => id !== track.id)));
  }, [sharedIds]);

  const save = useCallback(async () => {
    setBusy('me');
    setProblem(null);
    const failed = await saveCreator(creator);
    setBusy(null);
    if (failed) {
      setProblem(failed);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }, [creator]);

  const message = (entry: { from: Track; match: TrackMatch }): string =>
    `Hi ${entry.match.track.creator} — I make ${entry.from.genre}. ` +
    `Your "${entry.match.track.title}" and my "${entry.from.title}" line up: ` +
    `${entry.match.reasons.join('; ')}. ` +
    `${entry.match.collabWhy} Fancy trying a ${entry.match.collabFormat.toLowerCase()}?`;

  return (
    <div className="space-y-4">
      {/* ── Who you are ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div>
          <p className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            {t('radar.you', 'How people find you')}
          </p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('radar.youNote', 'A name and somewhere to be reached. Without these a match has nobody to write to.')}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            value={creator.name}
            onChange={(event) => setCreator({ ...creator, name: event.target.value })}
            placeholder={t('radar.name', 'Your name')}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <input
            value={creator.handle}
            onChange={(event) => setCreator({ ...creator, handle: event.target.value })}
            placeholder={t('radar.handle', 'handle')}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {LINKS.map((key) => (
            <input
              key={key}
              value={creator.links[key] ?? ''}
              onChange={(event) =>
                setCreator({ ...creator, links: { ...creator.links, [key]: event.target.value } })
              }
              placeholder={`https:// — ${key}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          ))}
        </div>
        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy === 'me'}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy === 'me' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saved ? t('radar.saved', 'Saved') : t('radar.save', 'Save')}
        </button>
      </div>

      {/* ── What you are showing ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div>
          <p className="text-base font-bold text-white">{t('radar.showing', 'Songs on the radar')}</p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('radar.showingNote', 'Off by default, one at a time, and you can turn it back off. Only the tempo, key and style words are shared — never the audio.')}
          </p>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('radar.noSongs', 'Make a song first.')}</p>
        ) : (
          <div className="space-y-1.5">
            {mine.slice(0, 12).map((track) => {
              const on = sharedIds.indexOf(track.id) !== -1;
              return (
                <label
                  key={track.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={busy === track.id}
                    onChange={() => void toggleShare(track)}
                    className="w-4 h-4 accent-emerald-500 flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white truncate">{track.title}</span>
                    <span className="block text-sm text-zinc-500">
                      {track.genre} · {track.bpm} BPM · {track.key}
                    </span>
                  </span>
                  {busy === track.id && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Who is near your sound ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <p className="text-base font-bold text-white flex items-center gap-2">
          <Radar className="w-4 h-4 text-emerald-400" />
          {t('radar.matches', 'Near your sound')}
        </p>

        {loading ? (
          <p className="text-sm text-zinc-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('radar.looking', 'Looking…')}
          </p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-zinc-500 leading-snug">
            {others.length === 0
              ? t('radar.empty', 'Nobody has put a song on the radar yet. Yours can be the first — turn one on above.')
              : t('radar.noneYet', 'Nothing close enough yet. More songs, on either side, will change that.')}
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((entry) => {
              const them = byId.get(entry.match.track.id);
              const note = message(entry);
              return (
                <div
                  key={`${entry.from.id}-${entry.match.track.id}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {entry.match.track.title}
                        <span className="text-zinc-500 font-normal"> · {entry.match.track.creator}</span>
                      </p>
                      <p className="text-sm text-zinc-500 truncate">
                        {t('radar.against', 'against your')} “{entry.from.title}”
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums flex-shrink-0">
                      {Math.round(entry.match.score * 100)}
                    </span>
                  </div>

                  {/* The reasons, because a score on its own is not an argument. */}
                  <ul className="space-y-0.5">
                    {entry.match.reasons.map((reason) => (
                      <li key={reason} className="text-sm text-zinc-400 leading-snug">· {reason}</li>
                    ))}
                  </ul>

                  <p className="text-sm text-emerald-300 flex items-start gap-1.5 leading-snug">
                    <Handshake className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {entry.match.collabFormat} — {entry.match.collabWhy}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(note);
                        setCopied(entry.match.track.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5"
                    >
                      {copied === entry.match.track.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === entry.match.track.id ? t('make.copied', 'Copied') : t('radar.copyNote', 'Copy the message')}
                    </button>
                    {them && Object.keys(them.links).length > 0
                      ? Object.entries(them.links).map(([where, url]) => (
                          <a
                            key={where}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {where}
                          </a>
                        ))
                      : (
                        <span className="text-sm text-zinc-600">
                          {t('radar.noLinks', 'No links yet — nowhere to send this')}
                        </span>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
