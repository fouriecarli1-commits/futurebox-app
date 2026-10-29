'use client';

/**
 * Make my photo good: repair it, bring the faces back, or colour it in
 * (`lib/restore.ts`). Each a press with its price on it, after the two
 * yeses, and the result put in place of the photo as a step that can be
 * put back. Drawn only once `RESTORE_CLEARED` is true.
 */
import React, { useState } from 'react';
import { Loader2, Palette, ScanFace, Wand2 } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { creditsSaid } from '../lib/credits';
import { RESTORES, RESTORE_CLEARED, type RestoreId } from '../lib/restore';
import { sendable } from '../lib/stickerize';
import { YesSheet, useEngineYes } from './BecomeBench';

const ICONS: Readonly<Record<RestoreId, React.ComponentType<{ className?: string }>>> = { repair: Wand2, faces: ScanFace, colour: Palette };
/** The longest side sent: about 1.6 megapixels, which keeps every press under a rand. */
const SIDE = 1280;

export default function RestoreBench({ picture, t, onFixed }: {
  readonly picture: HTMLImageElement | null;
  readonly t: (key: string, fallback: string) => string;
  /** The fixed photo, to put in place of this one as a step. */
  readonly onFixed: (made: HTMLCanvasElement, what: string) => void;
}): React.ReactElement | null {
  const [yes, giveYes] = useEngineYes();
  const [asking, setAsking] = useState<RestoreId | null>(null);
  const [busy, setBusy] = useState<RestoreId | null>(null);
  const [said, setSaid] = useState('');
  if (!RESTORE_CLEARED || !picture) return null;

  const go = async (id: RestoreId, agreed = false): Promise<void> => {
    if (!yes && !agreed) { setAsking(id); return; }
    const sent = sendable(picture, SIDE);
    if (!sent) { setSaid(t('restore.noPicture', 'This picture could not be read. Nothing was charged.')); return; }
    setBusy(id);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ restore: id, picture: sent.data, abroad: true, adult: true }),
      });
      const got = (await answer.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!answer.ok || !got.url) { setSaid(got.message ?? t('restore.failed', 'That did not work this time. Your credits are back.')); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((done, fail) => { img.onload = () => done(); img.onerror = () => fail(new Error('load')); img.src = got.url as string; });
      const made = document.createElement('canvas');
      made.width = img.naturalWidth;
      made.height = img.naturalHeight;
      made.getContext('2d')?.drawImage(img, 0, 0);
      onFixed(made, t(RESTORES[id].name[0], RESTORES[id].name[1]));
      setSaid(t('restore.done', 'Done. Put back takes you to the photo as it was.'));
    } catch {
      setSaid(t('restore.failed', 'That did not work this time. Your credits are back.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="col-span-2 space-y-2" data-restore>
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{t('restore.title', 'Fix an old photo')}</p>
      {asking && (
        <YesSheet t={t} onYes={() => { giveYes(); const id = asking; setAsking(null); void go(id, true); }} onNo={() => setAsking(null)} />
      )}
      <div className="grid grid-cols-3 gap-2">
        {(['repair', 'faces', 'colour'] as const).map((id) => {
          const Icon = ICONS[id];
          const spec = RESTORES[id];
          return (
            <button
              key={id}
              type="button"
              data-restorego={id}
              title={t(spec.what[0], spec.what[1])}
              disabled={busy !== null}
              onClick={() => { void go(id); }}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-zinc-700 px-1 text-center text-[11px] font-bold leading-tight text-zinc-100 disabled:opacity-50"
            >
              {busy === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              <span>{t(spec.name[0], spec.name[1])}</span>
              <span className="text-[10px] font-semibold text-emerald-300">{creditsSaid(spec.credits, t)}</span>
            </button>
          );
        })}
      </div>
      {said && <p role="status" className="text-[12px] text-zinc-300" data-restoresaid>{said}</p>}
    </div>
  );
}
