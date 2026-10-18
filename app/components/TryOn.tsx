'use client';

/**
 * Clothes on a model, from the photo editor.
 *
 * Carli, 16 October 2026: *"Show clothes on models."* The models, settings
 * and sentence are `lib/tryon.ts`; this is the sheet — the garment (the
 * photo on the post, or one brought in), a model described here or a photo
 * of a real person, a setting, a pose, a shape, and a button that says its
 * price.
 *
 * ── The confirmation ─────────────────────────────────────────────────────
 *
 * A real person's photo is asked about, the way the presenter asks: nothing
 * here can tell whether the person in it agreed to be dressed in something
 * and posted, and the box makes that a claim somebody made rather than a
 * thing that quietly happened. The button stays shut until it is ticked.
 */
import { useState } from 'react';
import { ImagePlus, Shirt, UserRound, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import { packLed } from '../lib/packpicture';
import { fit } from '../lib/imagefile';
import { MODELS, POSES, SETTINGS, TRYON_SIZES, tryOnAsk, type PoseId, type TryOnSize } from '../lib/tryon';

const WORDS = {
  title: ['Clothes on a model', 'Klere op ’n model'],
  close: ['Close clothes on a model', 'Maak klere op ’n model toe'],
  garment: ['The clothing', 'Die kledingstuk'],
  bring: ['Bring a photo of the clothing in', 'Bring ’n foto van die kledingstuk in'],
  other: ['Use another photo', 'Gebruik ’n ander foto'],
  needs: ['A photo of the clothing first — the one on the post, or bring one in.', 'Eers ’n foto van die kledingstuk — die een op die post, of bring een in.'],
  who: ['Who wears it', 'Wie dra dit'],
  real: ['A real person', '’n Regte persoon'],
  bringPerson: ['Bring their photo in', 'Bring hulle foto in'],
  consent: ['The person in this photo is me, or they have agreed to be shown wearing this. They are an adult.', 'Die persoon op hierdie foto is ek, of hulle het ingestem om gewys te word terwyl hulle dit dra. Hulle is ’n volwassene.'],
  where: ['Where', 'Waar'],
  pose: ['Pose', 'Houding'],
  shape: ['Shape', 'Vorm'],
  keeps: ['The clothing stays exactly as it is. Adults only.', 'Die kledingstuk bly presies soos dit is. Net volwassenes.'],
  go: ['Dress the model · {n} credits', 'Trek die model aan · {n} krediete'],
  busy: ['Dressing the model…', 'Trek die model aan…'],
  failed: ['That photo could not be made.', 'Daardie foto kon nie gemaak word nie.'],
  offline: ['That could not be sent. Check the connection and try again.', 'Dit kon nie gestuur word nie. Kyk na die verbinding en probeer weer.'],
  tooBig: ['Those photos are too big to send together. Try smaller ones.', 'Daardie foto’s is te groot om saam te stuur. Probeer kleiner een.'],
  bad: ['That file could not be read as a picture.', 'Daardie lêer kon nie as ’n prent gelees word nie.'],
  unreadable: ['What came back could not be read as a picture.', 'Wat teruggekom het, kon nie as ’n prent gelees word nie.'],
} as const;
type Word = keyof typeof WORDS;

export default function TryOn({ photo, onClose, onMade }: {
  readonly photo: HTMLImageElement | null;
  readonly onClose: () => void;
  readonly onMade: (picture: HTMLImageElement, size: TryOnSize) => void;
}) {
  const { lang } = useLang();
  const w = (word: Word): string => WORDS[word][lang === 'af' ? 1 : 0];
  const name = (one: { en: string; af: string }): string => (lang === 'af' ? one.af : one.en);
  useBackLayer(true, onClose);
  const [garment, setGarment] = useState<HTMLImageElement | null>(photo);
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [person, setPerson] = useState<HTMLImageElement | null>(null);
  const [consent, setConsent] = useState(false);
  const [setting, setSetting] = useState(SETTINGS[0].id);
  const [pose, setPose] = useState<PoseId>('standing');
  const [size, setSize] = useState<TryOnSize>('portrait');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const real = model === 'real';
  const ready = Boolean(garment) && (!real || (Boolean(person) && consent));

  const bring = async (file: File | null, put: (img: HTMLImageElement) => void): Promise<void> => {
    if (!file) return;
    const made = await fit(file, 2048);
    if (!made.ok) { setSaid(w('bad')); return; }
    const img = new Image();
    img.onload = () => { put(img); setSaid(''); };
    img.onerror = () => setSaid(w('bad'));
    img.src = made.preview;
  };

  const dress = async (): Promise<void> => {
    if (!ready || !garment || busy) return;
    const from = packLed(null, real && person ? [garment, person] : [garment]);
    if (from.length !== (real ? 2 : 1)) { setSaid(w('tooBig')); return; }
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          words: tryOnAsk({ model, setting, pose, person: real }),
          from,
          aspect: TRYON_SIZES.find((one) => one.id === size)?.aspect ?? '3:4',
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

  const chip = (on: boolean): string => `min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${on ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`;
  const thumb = (img: HTMLImageElement, mark: string) => (
    <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900" {...{ [mark]: '' }}>
      <img src={img.src} alt="" className="max-h-full max-w-full object-contain" />
    </span>
  );

  return (
    <div data-tryon role="dialog" aria-modal="true" aria-label={w('title')} className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-zinc-100" style={{ paddingBottom: barClearance(0) }}>
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-tryonclose onClick={onClose} aria-label={w('close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700"><X className="h-5 w-5" /></button>
        <Shirt className="h-5 w-5 text-sky-300" />
        <p className="min-w-0 flex-1 truncate bg-linear-to-r from-sky-200 via-indigo-300 to-fuchsia-300 bg-clip-text text-base font-extrabold text-transparent">{w('title')}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('garment')}</span>
          <div className="flex items-center gap-3">
            {garment ? thumb(garment, 'data-tryongarment') : null}
            <label className={`${chip(false)} inline-flex cursor-pointer items-center gap-2`}>
              <ImagePlus className="h-4 w-4" />
              {garment ? w('other') : w('bring')}
              <input type="file" accept="image/*" data-tryonfile className="sr-only" onChange={(e) => { void bring(e.target.files?.[0] ?? null, setGarment); e.target.value = ''; }} />
            </label>
          </div>
          {!garment && <p className="text-xs text-zinc-500" data-tryonneeds>{w('needs')}</p>}
          <p className="text-xs text-zinc-500">{w('keeps')}</p>
        </div>

        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('who')}</span>
          <div className="grid grid-cols-3 gap-2">
            {MODELS.map((one) => (
              <button key={one.id} type="button" data-tryonmodel={one.id} aria-pressed={model === one.id} onClick={() => setModel(one.id)} className={chip(model === one.id)}>
                {name(one)}
              </button>
            ))}
            <button type="button" data-tryonmodel="real" aria-pressed={real} onClick={() => setModel('real')} className={`${chip(real)} inline-flex items-center justify-center gap-1.5`}>
              <UserRound className="h-4 w-4" />
              {w('real')}
            </button>
          </div>
          {real && (
            <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
              <div className="flex items-center gap-3">
                {person ? thumb(person, 'data-tryonperson') : null}
                <label className={`${chip(false)} inline-flex cursor-pointer items-center gap-2`}>
                  <ImagePlus className="h-4 w-4" />
                  {person ? w('other') : w('bringPerson')}
                  <input type="file" accept="image/*" data-tryonpersonfile className="sr-only" onChange={(e) => { void bring(e.target.files?.[0] ?? null, setPerson); e.target.value = ''; }} />
                </label>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-zinc-300">
                <input type="checkbox" data-tryonconsent checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-sky-500" />
                <span>{w('consent')}</span>
              </label>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('where')}</span>
          <div className="grid grid-cols-3 gap-2">
            {SETTINGS.map((one) => (
              <button key={one.id} type="button" data-tryonsetting={one.id} aria-pressed={setting === one.id} onClick={() => setSetting(one.id)} className={chip(setting === one.id)}>
                {name(one)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="block text-sm text-zinc-400">{w('pose')}</span>
            <div className="grid gap-2">
              {POSES.map((one) => (
                <button key={one.id} type="button" data-tryonpose={one.id} aria-pressed={pose === one.id} onClick={() => setPose(one.id)} className={chip(pose === one.id)}>
                  {name(one)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="block text-sm text-zinc-400">{w('shape')}</span>
            <div className="grid gap-2">
              {TRYON_SIZES.map((one) => (
                <button key={one.id} type="button" data-tryonsize={one.id} aria-pressed={size === one.id} onClick={() => setSize(one.id)} className={chip(size === one.id)}>
                  {name(one)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {said && <p className="text-sm text-rose-300" data-tryonsaid>{said}</p>}
      </div>

      <div className="border-t border-zinc-800 px-4 py-3">
        <button
          type="button"
          data-tryongo
          disabled={!ready || busy}
          onClick={() => void dress()}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold disabled:opacity-40"
          style={{ background: 'linear-gradient(120deg, #7dd3fc, #818cf8 55%, #e879f9)', color: '#0b1020' }}
        >
          <Shirt className="h-4 w-4" />
          {busy ? w('busy') : w('go').replace('{n}', String(CREDITS.repaint))}
        </button>
      </div>
    </div>
  );
}
