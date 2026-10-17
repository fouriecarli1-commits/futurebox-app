'use client';

/**
 * The poster maker: a poster drawn whole, words and all, from the photo editor.
 *
 * Carli, 16 October 2026, a poster maker with three ways in. The sentences
 * and the kinds are `lib/postposter.ts`; this is the sheet — choose a way,
 * say what it is, choose a shape, and press a button that says its price.
 * What comes back becomes the picture on the post, the post takes the
 * poster's shape, and Undo in the editor takes it back.
 */
import { useState } from 'react';
import { ImagePlus, Megaphone, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import { packLed } from '../lib/packpicture';
import {
  MOST, MOST_DESCRIBE, NO_LINES, POSTER_KINDS, POSTER_SIZES, kindById, posterAsk, quotedIn, readyToDraw,
  type PosterLines, type PosterSize, type PosterWay,
} from '../lib/postposter';

const WORDS = {
  title: ['Poster', 'Plakkaat'],
  close: ['Close the poster maker', 'Maak die plakkaatmaker toe'],
  describe: ['Describe it', 'Beskryf dit'],
  kind: ['Pick a kind', 'Kies ’n soort'],
  lines: ['Your lines', 'Jou reëls'],
  describeSay: ['Describe the poster. Put the words that must be on it in "quotation marks".', 'Beskryf die plakkaat. Sit die woorde wat daarop moet wees tussen "aanhalingstekens".'],
  describeHint: ['A summer market poster with "Saturday Market" and "Parking at the gate"…', '’n Somermark-plakkaat met "Saterdagmark" en "Parkering by die hek"…'],
  exact: ['Drawn exactly:', 'Presies so geteken:'],
  about: ['What is it for?', 'Waarvoor is dit?'],
  aboutLines: ['The scene behind the words (you can leave this empty)', 'Die toneel agter die woorde (mag leeg bly)'],
  kindSays: ['The AI writes a short headline and a button for you, in your language.', 'Die KI skryf vir jou ’n kort opskrif en ’n knoppie, in jou taal.'],
  headline: ['Headline', 'Opskrif'],
  sub: ['Second line', 'Tweede reël'],
  body: ['A sentence', '’n Sin'],
  contact: ['Contact', 'Kontak'],
  cta: ['Button', 'Knoppie'],
  shape: ['Shape', 'Vorm'],
  photo: ['Use the photo on the post as the subject', 'Gebruik die foto op die post as die onderwerp'],
  go: ['Draw the poster · {n} credits', 'Teken die plakkaat · {n} krediete'],
  busy: ['Drawing the poster…', 'Teken die plakkaat…'],
  notYet: ['Say what the poster is first.', 'Sê eers wat die plakkaat is.'],
  failed: ['That poster could not be drawn.', 'Daardie plakkaat kon nie geteken word nie.'],
  offline: ['That could not be sent. Check the connection and try again.', 'Dit kon nie gestuur word nie. Kyk na die verbinding en probeer weer.'],
  tooBig: ['That photo is too big to send. Try a smaller one.', 'Daardie foto is te groot om te stuur. Probeer ’n kleiner een.'],
  unreadable: ['What came back could not be read as a picture.', 'Wat teruggekom het, kon nie as ’n prent gelees word nie.'],
} as const;
type Word = keyof typeof WORDS;

const WAYS: readonly { id: PosterWay; word: Word }[] = [
  { id: 'describe', word: 'describe' },
  { id: 'kind', word: 'kind' },
  { id: 'lines', word: 'lines' },
];
const LINE_FIELDS: readonly (keyof PosterLines)[] = ['headline', 'sub', 'body', 'contact', 'cta'];

export default function PosterMaker({ photo, onClose, onMade }: {
  readonly photo: HTMLImageElement | null;
  readonly onClose: () => void;
  readonly onMade: (picture: HTMLImageElement, size: PosterSize) => void;
}) {
  const { lang } = useLang();
  const w = (word: Word): string => WORDS[word][lang === 'af' ? 1 : 0];
  useBackLayer(true, onClose);
  const [way, setWay] = useState<PosterWay>('kind');
  const [describe, setDescribe] = useState('');
  const [kind, setKind] = useState(POSTER_KINDS[0].id);
  const [about, setAbout] = useState('');
  const [lines, setLines] = useState<PosterLines>(NO_LINES);
  const [size, setSize] = useState<PosterSize>('story');
  const [usePhoto, setUsePhoto] = useState(Boolean(photo));
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  const withPhoto = usePhoto && Boolean(photo);
  const ask = { way, describe, kind, about, lines, photo: withPhoto, lang: lang === 'af' ? 'af' as const : 'en' as const };
  const ready = readyToDraw(ask);
  const picked = kindById(kind) ?? POSTER_KINDS[0];
  const exact = way === 'describe' ? quotedIn(describe) : [];

  const draw = async (): Promise<void> => {
    if (!ready || busy) return;
    const from = withPhoto && photo ? packLed(null, [photo]) : [];
    if (withPhoto && !from.length) { setSaid(w('tooBig')); return; }
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          words: posterAsk(ask),
          ...(from.length ? { from } : {}),
          aspect: POSTER_SIZES.find((one) => one.id === size)?.aspect ?? '9:16',
        }),
      });
      if (!answer.ok) {
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setSaid(why.message ?? `${w('failed')} (${answer.status})`);
        return;
      }
      const came = URL.createObjectURL(await answer.blob());
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(came); onMade(img, size); };
      img.onerror = () => { URL.revokeObjectURL(came); setSaid(w('unreadable')); };
      img.src = came;
    } catch {
      setSaid(w('offline'));
    } finally {
      setBusy(false);
    }
  };

  const box = 'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500';
  const chip = (on: boolean): string => `min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${on ? 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`;

  return (
    <div data-postermaker role="dialog" aria-modal="true" aria-label={w('title')} className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-zinc-100" style={{ paddingBottom: barClearance(0) }}>
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-posterclose onClick={onClose} aria-label={w('close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700"><X className="h-5 w-5" /></button>
        <Megaphone className="h-5 w-5 text-fuchsia-300" />
        <p className="min-w-0 flex-1 truncate bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-300 bg-clip-text text-base font-extrabold text-transparent">{w('title')}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-2" role="tablist">
          {WAYS.map((one) => (
            <button key={one.id} type="button" role="tab" aria-selected={way === one.id} data-posterway={one.id} onClick={() => setWay(one.id)} className={chip(way === one.id)}>
              {w(one.word)}
            </button>
          ))}
        </div>

        {way === 'describe' && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">{w('describeSay')}</p>
            <textarea data-posterdescribe value={describe} maxLength={MOST_DESCRIBE} rows={4} onChange={(e) => setDescribe(e.target.value)} placeholder={w('describeHint')} className={box} />
            {exact.length > 0 && (
              <p className="text-xs text-zinc-400" data-posterexact>
                {w('exact')} {exact.map((one) => `“${one}”`).join(' · ')}
              </p>
            )}
          </div>
        )}

        {(way === 'kind' || way === 'lines') && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {POSTER_KINDS.map((one) => (
              <button
                key={one.id}
                type="button"
                data-posterkind={one.id}
                aria-pressed={kind === one.id}
                onClick={() => setKind(one.id)}
                className={`flex min-h-[64px] flex-col justify-end rounded-xl border p-2 text-left text-xs font-bold ${kind === one.id ? 'border-fuchsia-400 ring-2 ring-fuchsia-400/50' : 'border-zinc-700'}`}
                style={{ background: `linear-gradient(135deg, ${one.tile[0]}, ${one.tile[1]})`, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
              >
                {lang === 'af' ? one.af : one.en}
              </button>
            ))}
          </div>
        )}

        {way === 'kind' && (
          <div className="space-y-2">
            <label className="block text-sm text-zinc-400" htmlFor="poster-about">{w('about')}</label>
            <input id="poster-about" data-posterabout value={about} maxLength={300} onChange={(e) => setAbout(e.target.value)} placeholder={lang === 'af' ? picked.hintAf : picked.hintEn} className={box} />
            <p className="text-xs text-zinc-500">{w('kindSays')}</p>
          </div>
        )}

        {way === 'lines' && (
          <div className="space-y-2">
            {LINE_FIELDS.map((field) => (
              <label key={field} className="block">
                <span className="mb-1 block text-xs font-semibold text-zinc-400">{w(field)}</span>
                <input
                  data-posterline={field}
                  value={lines[field]}
                  maxLength={MOST[field]}
                  onChange={(e) => setLines((was) => ({ ...was, [field]: e.target.value }))}
                  className={box}
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">{w('aboutLines')}</span>
              <input data-posterabout value={about} maxLength={300} onChange={(e) => setAbout(e.target.value)} placeholder={lang === 'af' ? picked.hintAf : picked.hintEn} className={box} />
            </label>
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('shape')}</span>
          <div className="grid grid-cols-3 gap-2">
            {POSTER_SIZES.map((one) => (
              <button key={one.id} type="button" data-postersize={one.id} aria-pressed={size === one.id} onClick={() => setSize(one.id)} className={chip(size === one.id)}>
                {lang === 'af' ? one.af : one.en}
              </button>
            ))}
          </div>
        </div>

        {photo && (
          <button type="button" data-posterphoto aria-pressed={usePhoto} onClick={() => setUsePhoto((was) => !was)} className={`${chip(usePhoto)} inline-flex w-full items-center gap-2`}>
            <ImagePlus className="h-4 w-4" />
            {w('photo')}
          </button>
        )}

        {said && <p className="text-sm text-rose-300" data-postersaid>{said}</p>}
      </div>

      <div className="border-t border-zinc-800 px-4 py-3">
        <button
          type="button"
          data-postergo
          disabled={!ready || busy}
          onClick={() => void draw()}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold disabled:opacity-40"
          style={{ background: 'linear-gradient(120deg, #e879f9, #fb7185 55%, #fbbf24)', color: '#1a1022' }}
        >
          <Megaphone className="h-4 w-4" />
          {busy ? w('busy') : w('go').replace('{n}', String(CREDITS.repaint))}
        </button>
        {!ready && !busy && <p className="mt-2 text-center text-xs text-zinc-500" data-posternotyet>{w('notYet')}</p>}
      </div>
    </div>
  );
}
