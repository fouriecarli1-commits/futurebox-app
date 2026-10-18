'use client';

/**
 * "At most" and "it will be": the size row every way out shares.
 *
 * The owner, 18 October 2026: people choose the size of the file when they
 * save it — *"menend 1mb ens."* — and they see it change as they choose:
 * *"dit wys soos jy verstel die file size."* So the row is the limits as
 * buttons, and under them the file it will make: how big, and how much
 * smaller than the file with nothing squeezed. `lib/squeeze.ts` is the
 * arithmetic, and why a PNG gets fewer pixels rather than less quality.
 *
 * The room works the number out; this only says it. `busy` is while it is
 * being worked out, so the old number is not shown as the new one.
 */
import { ArrowDown, Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { LIMITS, limitSaid, sizeSaid, smallerBy, type Limit } from '../lib/squeeze';

export interface Estimate {
  /** The file with nothing squeezed, to measure against. */
  readonly before: number;
  /** The file it will make. */
  readonly after: number;
  /** Under 1 when it had to lose pixels to fit. */
  readonly scale: number;
  /** False when nothing would fit under the limit. */
  readonly fits: boolean;
}

export default function FileSize({
  limit,
  onLimit,
  estimate,
  busy,
  kind,
  limits = LIMITS,
}: {
  readonly limit: Limit;
  readonly onLimit: (limit: Limit) => void;
  readonly estimate: Estimate | null;
  readonly busy: boolean;
  /** What the file is, for the line under the readout: "picture", "film", "sound". */
  readonly kind?: 'picture' | 'film' | 'sound';
  readonly limits?: readonly Limit[];
}): React.ReactElement {
  const { t } = useLang();
  const less = estimate ? smallerBy(estimate.before, estimate.after) : 0;
  return (
    <div className="space-y-2" data-filesize>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {t('size.most', 'File size, at most')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {limits.map((one) => (
          <button
            key={one ?? 'none'}
            type="button"
            data-filesizepick={one ?? 'none'}
            aria-pressed={limit === one}
            onClick={() => onLimit(one)}
            className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border px-2 text-xs font-bold ${
              limit === one
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300'
            }`}
          >
            {limitSaid(one, t('size.none', 'No limit'))}
          </button>
        ))}
      </div>

      {/* The readout, as the owner saw it work: how much smaller, then how big. */}
      <div
        data-filesizesaid={estimate ? estimate.after : ''}
        data-filesizefits={estimate ? String(estimate.fits) : ''}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
        aria-live="polite"
      >
        {busy || !estimate ? (
          <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('size.working', 'Working out the size…')}
          </span>
        ) : (
          <>
            {less > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-500/20 px-2 py-1 text-sm font-black text-emerald-300">
                <ArrowDown className="h-3.5 w-3.5" />
                {less}%
              </span>
            )}
            <span className="text-sm font-black tabular-nums text-white">{sizeSaid(estimate.after)}</span>
            {less > 0 && (
              <span className="text-xs tabular-nums text-zinc-500">
                {t('size.from', 'from')} {sizeSaid(estimate.before)}
              </span>
            )}
          </>
        )}
      </div>
      {estimate && !busy && !estimate.fits && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-300" data-filesizetoobig>
          {t('size.tooBig', 'Even squeezed as far as it goes, this is bigger than that. It will be saved as small as it can be — choose a bigger limit, or a smaller size.')}
        </p>
      )}
      {estimate && !busy && estimate.fits && estimate.scale < 1 && (
        <p className="text-[12px] leading-relaxed text-zinc-500" data-filesizeshrunk>
          {(kind === 'picture' || kind === undefined
            ? t('size.shrunk', 'To fit, the picture comes out at {n}% of its width and height.')
            : t('size.shrunkOther', 'To fit, it comes out at {n}% of its size.')
          ).replace('{n}', String(Math.round(estimate.scale * 100)))}
        </p>
      )}
    </div>
  );
}
