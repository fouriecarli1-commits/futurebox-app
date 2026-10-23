'use client';

/**
 * AI restyle: the frame she is on, redrawn in a world of the future, and a new
 * shot made from it.
 *
 * ── What the owner asked for ─────────────────────────────────────────────
 *
 * The owner, 22 October 2026 (translated): *"I also think scenes could be
 * prompted to undergo an AI change, to get the whole futuristic effect into
 * videos."*
 *
 * ── What it does, said as plainly as the button ──────────────────────────
 *
 * Repainting every frame of her own footage is a video-to-video engine, and
 * that sends HER FOOTAGE — video of a person — to a supplier, which is the
 * thing the editor's header says needs a privacy line and a POPIA answer
 * first. This does not do that, and does not say it does.
 *
 * What it does is the shot bench's two presses with a better first frame:
 * the frame she is standing on is redrawn in the new world (one picture, the
 * picture route's own price), optionally the shot's last frame too, and then
 * the video engine makes a NEW shot from them that has to start and end
 * where hers did. Told to keep the same camera move and action, it comes back
 * as her shot in another world — a new clip, which lands on the clock beside
 * the original so she can keep either.
 *
 * One frame (two, if she asks) and her words leave the device. That is the
 * same thing the wand on a tapped clip has sent since 14 October, and the
 * privacy page already says Google receives "any picture you attached for it
 * to start from".
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, ScanLine, Sparkles, Clapperboard } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import { CREDITS, creditsSaid, videoCost, type VideoGrade } from '../lib/credits';
import { imageFrom, packLed } from '../lib/packpicture';
import { SCENE_STYLES, nearestLength, restyleAsk, sceneStyle } from '../lib/futurelooks';
import { asDataUrl } from '../lib/shotframes';
import { INK, INK_DIM, LIT } from '../lib/cutlook';
import FutureTile from './FutureTile';

export interface RestyleMove {
  readonly start: string;
  readonly end: string | null;
  readonly words: string;
  readonly seconds: 4 | 6 | 8;
  readonly grade: VideoGrade;
  /** The piece the new shot is a restyle of, so it lands beside it. */
  readonly nextTo: string;
}

const CHIP = 'min-h-[44px] rounded-xl border px-3 text-[12px] font-bold';

export default function RestyleBench({
  pieceId, pieceName, where, pieceSeconds, grab, grabEnd, job, ready, said, moving, onMove, onKeep,
}: {
  readonly pieceId: string;
  readonly pieceName: string;
  /** Where the playhead is, as the clock says it. */
  readonly where: string;
  readonly pieceSeconds: number;
  /** The frame at the playhead, framed as the film frames it. */
  readonly grab: () => Promise<string | null>;
  /** The last frame of the shot on the clock. */
  readonly grabEnd: (id: string) => Promise<string | null>;
  /** The shot bench's job, while it is this bench's. */
  readonly job: string | null;
  readonly ready: string | null;
  readonly said: string;
  readonly moving: boolean;
  readonly onMove: (move: RestyleMove) => void;
  readonly onKeep: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [before, setBefore] = useState<string | null>(null);
  /** Which piece `before` came from — the playhead can move on while the bench is open. */
  const [from, setFrom] = useState<{ id: string; name: string; where: string; seconds: number } | null>(null);
  const [style, setStyle] = useState(SCENE_STYLES[0].id);
  const [withEnd, setWithEnd] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const [afterEnd, setAfterEnd] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'grab' | 'draw'>('');
  const [note, setNote] = useState('');
  const [words, setWords] = useState('');
  const [seconds, setSeconds] = useState<4 | 6 | 8>(() => nearestLength(pieceSeconds));
  const [grade, setGrade] = useState<VideoGrade>('standard');
  /** The words the bench wrote itself, so a restyle into another world can replace them but never hers. */
  const prefilled = useRef('');

  const take = async (): Promise<void> => {
    setBusy('grab');
    setNote('');
    try {
      const frame = await grab();
      if (!frame) { setNote(t('future.restyle.noFrame', 'That frame could not be read. Stand on the shot and try again.')); return; }
      setBefore(frame);
      setFrom({ id: pieceId, name: pieceName, where, seconds: pieceSeconds });
      setSeconds(nearestLength(pieceSeconds));
      setAfter(null);
      setAfterEnd(null);
    } finally {
      setBusy('');
    }
  };

  /* The frame she is on, taken the moment the bench opens: reading it is
     local and costs nothing, and a restyle bench that opens on an empty box
     is a bench that has to be told twice. Taking it AGAIN is a button,
     because the playhead may have moved since. */
  useEffect(() => {
    void take();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on opening; `take` again is the button.
  }, []);

  const price = CREDITS.repaint * (withEnd ? 2 : 1);

  /** One frame, redrawn. The frame leads, alone, so it keeps the whole budget. */
  const redraw = async (frame: string, closing: boolean): Promise<{ picture: string | null; why: string }> => {
    const lead = await imageFrom(frame);
    const packed = lead ? packLed(lead, []) : [];
    if (!packed.length) return { picture: null, why: t('edit.shotFrameTooBig', 'That frame is too big to send. Draw a new one rather than changing this.') };
    const token = await accessToken();
    const answer = await fetch('/api/google/picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      /* No ratio: the frame is the film's shape and the answer inherits it,
         which is what keeps the new shot the same shape as the old one. */
      body: JSON.stringify({ words: restyleAsk(sceneStyle(style), closing), from: packed }),
    });
    if (!answer.ok) {
      const why = (await answer.json().catch(() => ({}))) as { message?: string };
      return { picture: null, why: why.message ?? `${t('future.restyle.failed', 'That frame could not be restyled.')} (${answer.status})` };
    }
    return { picture: await asDataUrl(await answer.blob()), why: '' };
  };

  const restyle = async (): Promise<void> => {
    if (!before || !from || busy) return;
    setBusy('draw');
    setNote('');
    try {
      const first = await redraw(before, false);
      if (!first.picture) { setNote(first.why || t('future.restyle.failed', 'That frame could not be restyled.')); return; }
      setAfter(first.picture);
      setAfterEnd(null);
      let told = t('future.restyle.drawn', 'Restyled. Say what happens in the new shot, then make it move.');
      if (withEnd) {
        const last = await grabEnd(from.id);
        if (!last) {
          told = t('future.restyle.endUnread', 'The last frame of this shot could not be read, so only the frame you are on was restyled.');
        } else {
          const second = await redraw(last, true);
          if (second.picture) setAfterEnd(second.picture);
          else told = `${t('future.restyle.endFailed', 'The last frame could not be restyled, so the new shot will choose its own ending.')} ${second.why}`;
        }
      }
      /* The words, written for her the first time and whenever they are
         still the bench's own — never over something she typed. */
      const name = sceneStyle(style).label;
      const start = t('future.restyle.wordsStart', 'The same camera move and the same action as the original shot, now in a {world} world.')
        .replace('{world}', t(name[0], name[1]).toLowerCase());
      if (!words.trim() || words === prefilled.current) {
        setWords(start);
        prefilled.current = start;
      }
      setNote(told);
    } catch {
      setNote(t('edit.shotOffline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setBusy('');
    }
  };

  const frameBox = (src: string | null, label: string, mark: string, lit = false): React.ReactElement => (
    <figure className="min-w-0 space-y-1">
      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: lit ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.12)', background: '#05080d', boxShadow: lit ? '0 0 18px rgba(34,211,238,0.2)' : undefined }}
      >
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element -- a data URL read off the clock or drawn seconds ago, held only here; nothing for the image component to fetch. */
          <img src={src} alt={label} {...{ [mark]: '' }} className="block aspect-video w-full object-contain" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: LIT }} /> : <ScanLine className="h-5 w-5" style={{ color: INK_DIM }} />}
          </div>
        )}
      </div>
      <figcaption className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: lit ? '#67e8f9' : INK_DIM }}>{label}</figcaption>
    </figure>
  );

  return (
    <div className="space-y-3" data-restylebench>
      <div
        className="relative overflow-hidden rounded-2xl border p-3.5"
        style={{
          borderColor: 'rgba(52,211,153,0.35)',
          background: 'radial-gradient(120% 140% at 100% 0%, rgba(236,72,153,0.16), transparent 55%), radial-gradient(120% 140% at 0% 100%, rgba(34,211,238,0.14), transparent 55%), rgba(10,12,16,0.9)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-black tracking-[0.2em]" style={{ borderColor: 'rgba(244,114,182,0.5)', color: '#f9a8d4' }}>
            {t('future.chip.ai', 'AI')}
          </span>
          <span className="text-base font-black tracking-tight" style={{ color: INK }}>
            {t('future.restyle.title', 'Restyle a scene')}
          </span>
        </div>
        <p className="pt-1.5 text-[13px] leading-relaxed" style={{ color: INK_DIM }} data-restylewhat>
          {t('future.restyle.what', 'Takes the frame you are on and redraws it in a world of the future. From that frame the video engine makes a new shot in the new look, with the same camera move and action, and it lands on the clock next to the original. It makes a new shot — it does not repaint every frame of your own footage.')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[12px]" style={{ color: INK_DIM }} data-restylefrom>
          {from
            ? t('future.restyle.shotOf', 'From “{name}” at {at}').replace('{name}', from.name).replace('{at}', from.where)
            : t('future.restyle.from', 'The frame you are on')}
        </span>
        <button
          type="button"
          data-restylegrab
          disabled={Boolean(busy)}
          onClick={() => { void take(); }}
          className={`${CHIP} inline-flex shrink-0 items-center gap-1.5 disabled:opacity-50`}
          style={{ color: INK, borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)' }}
        >
          {busy === 'grab' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t('future.restyle.grab', 'Use the frame I am on')}
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2" data-restylepair>
        {frameBox(before, t('future.restyle.before', 'Before'), 'data-restylebefore')}
        <ArrowRight aria-hidden className="h-4 w-4" style={{ color: LIT }} />
        {frameBox(after, t('future.restyle.after', 'After'), 'data-restyledframe', Boolean(after))}
      </div>
      {afterEnd && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="text-[11px] leading-snug" style={{ color: INK_DIM }}>
            {t('future.restyle.endIs', 'And the closing frame the new shot has to arrive at:')}
          </span>
          <span aria-hidden />
          {frameBox(afterEnd, t('edit.frameClosing', 'Closing frame'), 'data-restyledend', true)}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <span className="font-mono text-[11px] font-black tracking-[0.18em]" style={{ color: LIT }}>01</span>
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: INK }}>{t('future.restyle.world', 'The new world')}</span>
        <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.4), transparent)' }} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" data-restylestyles>
        {SCENE_STYLES.map((one) => (
          <FutureTile
            key={one.id}
            kind="scene"
            id={one.id}
            label={t(one.label[0], one.label[1])}
            on={style === one.id}
            onPick={() => setStyle(one.id)}
            data={{ 'data-restylestyle': one.id }}
          />
        ))}
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-2.5" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
        <input
          type="checkbox"
          data-restyleend
          checked={withEnd}
          onChange={(event) => setWithEnd(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold" style={{ color: INK }}>
            {t('future.restyle.end', 'Restyle its last frame too, as the closing frame')}
          </span>
          <span className="block text-[11px] leading-snug" style={{ color: INK_DIM }}>
            {t('future.restyle.endWhat', 'The new shot then has to arrive at the restyled end of yours, so it keeps the move. It is a second drawing.')}
          </span>
        </span>
      </label>

      <button
        type="button"
        data-restyledraw
        disabled={Boolean(busy) || !before}
        onClick={() => { void restyle(); }}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-black disabled:opacity-50"
        style={{ color: '#12051f', background: 'linear-gradient(90deg, #f472b6, #a78bfa 50%, #22d3ee)', boxShadow: '0 0 24px rgba(167,139,250,0.25)' }}
      >
        {busy === 'draw' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy === 'draw'
          ? t('future.restyle.drawing', 'Restyling…')
          : `${after
            ? t('future.restyle.again', 'Restyle it again')
            : withEnd ? t('future.restyle.drawBoth', 'Restyle both frames') : t('future.restyle.draw', 'Restyle the frame')} · ${creditsSaid(price, t)}`}
      </button>

      {after && from && (
        <div className="space-y-2.5 rounded-2xl border p-3" style={{ borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.04)' }} data-restylemotion>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-black tracking-[0.18em]" style={{ color: LIT }}>02</span>
            {/* A heading rather than a `<label>`: a label is something to
                press, and a press target has to be a thumb tall. The box
                below carries the same words as its name. */}
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: INK }}>
              {t('future.restyle.words', 'What happens in the new shot')}
            </span>
          </div>
          <textarea
            data-restylewords
            aria-label={t('future.restyle.words', 'What happens in the new shot')}
            value={words}
            onChange={(event) => setWords(event.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border bg-black/40 p-2.5 text-[13px] leading-relaxed outline-hidden focus:border-emerald-400"
            style={{ color: INK, borderColor: 'rgba(52,211,153,0.35)' }}
          />
          <div className="flex flex-wrap gap-1.5">
            {([4, 6, 8] as const).map((many) => (
              <button
                key={many}
                type="button"
                data-restyleseconds={many}
                aria-pressed={seconds === many}
                onClick={() => setSeconds(many)}
                className={CHIP}
                style={seconds === many
                  ? { color: LIT, borderColor: LIT, background: 'rgba(52,211,153,0.14)' }
                  : { color: INK, borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)' }}
              >
                {t('edit.shotSeconds', '{n} sec').replace('{n}', String(many))}
              </button>
            ))}
            {(['standard', 'better', 'premium'] as const).map((rung) => (
              <button
                key={rung}
                type="button"
                data-restylegrade={rung}
                aria-pressed={grade === rung}
                onClick={() => setGrade(rung)}
                className={CHIP}
                style={grade === rung
                  ? { color: LIT, borderColor: LIT, background: 'rgba(52,211,153,0.14)' }
                  : { color: INK, borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)' }}
              >
                {rung === 'standard'
                  ? t('edit.gradeStandard', 'Good')
                  : rung === 'better' ? t('edit.gradeBetter', 'Better') : t('edit.gradePremium', 'Best')}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-restylemove
            disabled={moving || Boolean(job) || !words.trim()}
            onClick={() => onMove({ start: after, end: afterEnd, words: words.trim(), seconds, grade, nextTo: from.id })}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-black disabled:opacity-50"
            style={{ color: '#04120b', background: 'linear-gradient(90deg, #34d399, #22d3ee)', boxShadow: '0 0 24px rgba(52,211,153,0.25)' }}
          >
            {moving || job ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
            {job
              ? t('edit.shotMakingShort', 'Making it…')
              : `${t('edit.shotMove', 'Make it move')} · ${creditsSaid(videoCost(grade, seconds), t)}`}
          </button>
        </div>
      )}

      {ready && (
        <div className="space-y-2" data-restyleready>
          <video src={ready} data-restyleclip controls playsInline className="w-full rounded-xl border" style={{ borderColor: 'rgba(34,211,238,0.45)' }} />
          <button
            type="button"
            data-restylekeep
            onClick={onKeep}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-[14px] font-black"
            style={{ color: INK, borderColor: LIT, background: 'rgba(52,211,153,0.16)' }}
          >
            {t('future.restyle.keep', 'Put it next to the original')}
          </button>
        </div>
      )}

      {(note || said) && (
        <p data-restylesaid role="status" className="text-[12px] leading-relaxed" style={{ color: INK }}>
          {said || note}
        </p>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: INK_DIM }}>
        {t('future.restyle.sends', 'What is sent: the frame you are on (and the last frame, if you chose it) and your words. Nothing else of your footage leaves this device.')}
        {' '}
        {t('future.restyle.price', 'Each restyled frame costs {n} credits; making it move is paid once, and the price is on that button.').replace('{n}', String(CREDITS.repaint))}
      </p>
    </div>
  );
}
