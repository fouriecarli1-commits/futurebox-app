'use client';

/**
 * Product photos: her product set in a scene, from the photo editor.
 *
 * The owner, 16 October 2026: *"Generate product photos in seconds."* The scenes
 * and the sentence are `lib/productshots.ts`; this is the sheet — the
 * product (the photo on the post, or one brought in here), a scene, a few
 * words more if she wants, a shape, and a button that says its price. What
 * comes back is the picture on the post, in that shape, and Undo in the
 * editor takes it back.
 */
import { useState } from 'react';
import { ImagePlus, ShoppingBag, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import { packLed } from '../lib/packpicture';
import { fit } from '../lib/imagefile';
import { MOST_EXTRA, PRODUCT_SCENES, PRODUCT_SIZES, productAsk, type ProductSize } from '../lib/productshots';

const WORDS = {
  title: ['Product photos', 'Produkfoto’s'],
  close: ['Close product photos', 'Maak produkfoto’s toe'],
  product: ['Your product', 'Jou produk'],
  bring: ['Bring a product photo in', 'Bring ’n produkfoto in'],
  other: ['Use another photo', 'Gebruik ’n ander foto'],
  needs: ['A photo of the product first — the one on the post, or bring one in.', 'Eers ’n foto van die produk — die een op die post, of bring een in.'],
  scene: ['Where should it be?', 'Waar moet dit wees?'],
  extra: ['Anything else (you can leave this empty)', 'Enigiets anders (mag leeg bly)'],
  extraHint: ['with slices of lemon around it', 'met skyfies suurlemoen rondom'],
  shape: ['Shape', 'Vorm'],
  keeps: ['Your product stays exactly as it is. Only the scene around it is made.', 'Jou produk bly presies soos dit is. Net die toneel rondom word gemaak.'],
  go: ['Make the product photo · {n} credits', 'Maak die produkfoto · {n} krediete'],
  busy: ['Photographing your product…', 'Neem jou produk af…'],
  failed: ['That photo could not be made.', 'Daardie foto kon nie gemaak word nie.'],
  offline: ['That could not be sent. Check the connection and try again.', 'Dit kon nie gestuur word nie. Kyk na die verbinding en probeer weer.'],
  tooBig: ['That photo is too big to send. Try a smaller one.', 'Daardie foto is te groot om te stuur. Probeer ’n kleiner een.'],
  bad: ['That file could not be read as a picture.', 'Daardie lêer kon nie as ’n prent gelees word nie.'],
  unreadable: ['What came back could not be read as a picture.', 'Wat teruggekom het, kon nie as ’n prent gelees word nie.'],
} as const;
type Word = keyof typeof WORDS;

export default function ProductShots({ photo, onClose, onMade }: {
  readonly photo: HTMLImageElement | null;
  readonly onClose: () => void;
  readonly onMade: (picture: HTMLImageElement, size: ProductSize) => void;
}) {
  const { lang } = useLang();
  const w = (word: Word): string => WORDS[word][lang === 'af' ? 1 : 0];
  useBackLayer(true, onClose);
  const [product, setProduct] = useState<HTMLImageElement | null>(photo);
  const [scene, setScene] = useState(PRODUCT_SCENES[0].id);
  const [extra, setExtra] = useState('');
  const [size, setSize] = useState<ProductSize>('square');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  const bring = async (file: File | null): Promise<void> => {
    if (!file) return;
    const made = await fit(file, 2048);
    if (!made.ok) { setSaid(w('bad')); return; }
    const img = new Image();
    img.onload = () => { setProduct(img); setSaid(''); };
    img.onerror = () => setSaid(w('bad'));
    img.src = made.preview;
  };

  const shoot = async (): Promise<void> => {
    if (!product || busy) return;
    const from = packLed(null, [product]);
    if (!from.length) { setSaid(w('tooBig')); return; }
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          words: productAsk(scene, extra),
          from,
          aspect: PRODUCT_SIZES.find((one) => one.id === size)?.aspect ?? '1:1',
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

  const chip = (on: boolean): string => `min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${on ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`;

  return (
    <div data-productshots role="dialog" aria-modal="true" aria-label={w('title')} className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-zinc-100" style={{ paddingBottom: barClearance(0) }}>
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-productclose onClick={onClose} aria-label={w('close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700"><X className="h-5 w-5" /></button>
        <ShoppingBag className="h-5 w-5 text-amber-300" />
        <p className="min-w-0 flex-1 truncate bg-linear-to-r from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-base font-extrabold text-transparent">{w('title')}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('product')}</span>
          <div className="flex items-center gap-3">
            {product ? (
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900" data-productshown>
                <img src={product.src} alt="" className="max-h-full max-w-full object-contain" />
              </span>
            ) : null}
            <label className={`${chip(false)} inline-flex cursor-pointer items-center gap-2`}>
              <ImagePlus className="h-4 w-4" />
              {product ? w('other') : w('bring')}
              <input type="file" accept="image/*" data-productfile className="sr-only" onChange={(e) => { void bring(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>
          </div>
          {!product && <p className="text-xs text-zinc-500" data-productneeds>{w('needs')}</p>}
          <p className="text-xs text-zinc-500">{w('keeps')}</p>
        </div>

        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('scene')}</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRODUCT_SCENES.map((one) => (
              <button
                key={one.id}
                type="button"
                data-productscene={one.id}
                aria-pressed={scene === one.id}
                onClick={() => setScene(one.id)}
                className={`flex min-h-[64px] flex-col justify-end rounded-xl border p-2 text-left text-xs font-bold ${scene === one.id ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-zinc-700'}`}
                style={{ background: `linear-gradient(135deg, ${one.tile[0]}, ${one.tile[1]})`, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {lang === 'af' ? one.af : one.en}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-400">{w('extra')}</span>
          <input data-productextra value={extra} maxLength={MOST_EXTRA} onChange={(e) => setExtra(e.target.value)} placeholder={w('extraHint')} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500" />
        </label>

        <div className="space-y-2">
          <span className="block text-sm text-zinc-400">{w('shape')}</span>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_SIZES.map((one) => (
              <button key={one.id} type="button" data-productsize={one.id} aria-pressed={size === one.id} onClick={() => setSize(one.id)} className={chip(size === one.id)}>
                {lang === 'af' ? one.af : one.en}
              </button>
            ))}
          </div>
        </div>

        {said && <p className="text-sm text-rose-300" data-productsaid>{said}</p>}
      </div>

      <div className="border-t border-zinc-800 px-4 py-3">
        <button
          type="button"
          data-productgo
          disabled={!product || busy}
          onClick={() => void shoot()}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold disabled:opacity-40"
          style={{ background: 'linear-gradient(120deg, #fcd34d, #fb923c 55%, #fb7185)', color: '#1f1305' }}
        >
          <ShoppingBag className="h-4 w-4" />
          {busy ? w('busy') : w('go').replace('{n}', String(CREDITS.repaint))}
        </button>
      </div>
    </div>
  );
}
