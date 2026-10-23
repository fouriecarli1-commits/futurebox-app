'use client';

/**
 * The jam room's stage: you and everybody else, each as a character.
 *
 * The owner, 22 October 2026: *"Daar moet templates wees van animated
 * characters dat iemand heeltemal agter templates skuil."* Nobody in the jam
 * room is ever shown by face or camera. Each person picks one of twelve
 * characters and a colour, and that — with the name on their own creator row
 * — is all of them the room sees.
 *
 * ── Who is on the stage ──────────────────────────────────────────────────
 *
 * `/api/live/jammers`, the looper's pattern: this screen says "here, as this
 * character" every few seconds and asks who else is. The server writes the
 * name, and the character and colour are two words from fixed lists, cleaned
 * on the way in and again here before they are drawn — so a tile can only
 * ever be one of the drawings in `JamCharacter`, never a picture.
 *
 * ── How the characters move ──────────────────────────────────────────────
 *
 * Yours moves to what you are making: the pads, the looper and the
 * microphone, measured off the same sound you hear (`heard`, from
 * `LiveJam`). Everybody else's moves to theirs, sent as a pulse on a
 * Supabase realtime channel — a whole number from nought to nine, a few times
 * a second while it changes and nothing while it is quiet, so a silent room
 * sends nothing. A pulse that is not a number in range is dropped
 * (`cleanPulse`). When the channel cannot be reached, a character whose
 * looper is playing still bobs on that loop's beat, from the heartbeat, and
 * jumps when their loop starts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Repeat } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLang } from '../lib/i18n';
import { accessToken, getClient } from '../lib/cloud';
import { useBlocked } from '../lib/blocked';
import { withoutBlocked } from '../lib/reports';
import {
  CHARACTERS, CHARACTER_WORDS, COLOURS, COLOUR_IDS, COLOUR_WORDS,
  cleanBpm, cleanLook, cleanPulse, follow, newTag, toPulse,
  type Jammer, type Look,
} from '../lib/jamcharacters';
import JamCharacter from './JamCharacter';

/** How often the stage is told, and asked, in milliseconds — the looper's pace. */
const EVERY = 4000;
/** How often your loudness may be sent to the room, in milliseconds. */
const PULSE_EVERY = 140;
/** A level not refreshed for this long has gone quiet. */
const QUIET_AFTER = 1200;
/** How long the jump on a drop lasts, in milliseconds (`jc-drop` in globals.css). */
const DROP_MS = 900;

/** Five bars under a tile, each its own share of the loudness. */
const EQ = [0.55, 0.9, 1, 0.75, 0.5];

function Meter(): React.ReactElement {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden>
      {EQ.map((share, at) => (
        <span
          key={at}
          className="w-[4px] origin-bottom rounded-full"
          style={{
            height: '100%',
            background: 'var(--jc)',
            boxShadow: '0 0 6px var(--jc)',
            transform: `scaleY(calc(0.14 + var(--lvl) * ${share}))`,
          }}
        />
      ))}
    </span>
  );
}

export default function JamStage({ look, onLook, name, heard, drops, looping, bpm }: {
  /** Your character and colour. */
  readonly look: Look;
  readonly onLook: (next: Look) => void;
  /** What to call you before the server has said: the page's name, or "You". */
  readonly name: string;
  /** How loud what you are making is now, 0 to 1 — read every frame. */
  readonly heard: () => number;
  /** Goes up by one each time you drop a loop. */
  readonly drops: number;
  /** Whether your looper is playing, and its tempo. */
  readonly looping: boolean;
  readonly bpm: number;
}): React.ReactElement {
  const { t } = useLang();
  const blocked = useBlocked();
  const [others, setOthers] = useState<Jammer[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [named, setNamed] = useState('');
  const [jumping, setJumping] = useState<ReadonlySet<string>>(new Set());

  const tag = useRef('');
  const stage = useRef<HTMLDivElement | null>(null);
  const mine = useRef<HTMLDivElement | null>(null);
  /* What the animation frame reads, kept off React. */
  const shownMine = useRef(0);
  const pulses = useRef(new Map<string, { heard: number; at: number; shown: number }>());
  const wasLooping = useRef(new Map<string, boolean>());
  const channel = useRef<RealtimeChannel | null>(null);
  const live = useRef({ look, looping, bpm, refused: false });
  live.current.look = look;
  live.current.looping = looping;
  live.current.bpm = bpm;

  useEffect(() => { if (!tag.current) tag.current = newTag(); }, []);

  /* ── A jump, on a tile, for as long as the animation runs ─────────── */
  const jump = useCallback((key: string): void => {
    setJumping((was) => new Set(was).add(key));
    window.setTimeout(() => setJumping((was) => {
      const next = new Set(was);
      next.delete(key);
      return next;
    }), DROP_MS);
  }, []);

  /* ── Telling the stage you are here, and as what ──────────────────── */
  const tell = useCallback(async (): Promise<void> => {
    if (!tag.current) tag.current = newTag();
    const token = await accessToken();
    const state = live.current;
    const answer = await fetch('/api/live/jammers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ look: state.look, tag: tag.current, looping: state.looping, bpm: state.bpm }),
    }).catch(() => null);
    if (!answer) return;
    if (answer.status === 401) { state.refused = true; setSignedIn(false); return; }
    const body = (await answer.json().catch(() => ({}))) as { ok?: boolean; name?: string };
    if (answer.ok && body.ok) {
      setSignedIn(true);
      setReady(true);
      setNamed(String(body.name ?? '').slice(0, 40));
    } else if (answer.status === 502 || answer.status === 503) {
      setReady(false);
    }
  }, []);

  /* On the way in, on every change of look or loop, then as a heartbeat. A
     refusal for being signed out is not asked again every few seconds. */
  useEffect(() => { live.current.refused = false; void tell(); }, [tell, look, looping, bpm]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden && !live.current.refused) void tell();
    }, EVERY);
    return () => window.clearInterval(timer);
  }, [tell]);
  /* Leaving the room takes you off everybody else's stage at once. */
  useEffect(() => () => {
    void accessToken().then((token) => {
      void fetch('/api/live/jammers', { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {}, keepalive: true }).catch(() => undefined);
    });
  }, []);

  /* ── Who else is here ─────────────────────────────────────────────── */
  useEffect(() => {
    let gone = false;
    const ask = async (): Promise<void> => {
      const token = await accessToken();
      const answer = await fetch('/api/live/jammers', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null);
      if (gone || !answer) return;
      if (answer.status === 401) { setSignedIn(false); setOthers([]); return; }
      if (!answer.ok) return;
      const body = (await answer.json().catch(() => ({}))) as { ready?: boolean; jammers?: unknown[] };
      if (body.ready === false) { setReady(false); setOthers([]); return; }
      setReady(true);
      const list = (Array.isArray(body.jammers) ? body.jammers : []).map((raw): Jammer => {
        const one = (raw ?? {}) as Partial<Record<keyof Jammer, unknown>>;
        return {
          who: String(one.who ?? ''),
          name: String(one.name ?? '').slice(0, 40),
          look: cleanLook(one.look),
          tag: String(one.tag ?? ''),
          looping: one.looping === true,
          bpm: cleanBpm(one.bpm),
        };
      }).filter((one) => one.who);
      /* A loop that has just started is a drop, even with no realtime. */
      for (const one of list) {
        const before = wasLooping.current.get(one.who);
        if (before === false && one.looping) jump(one.who);
        wasLooping.current.set(one.who, one.looping);
      }
      setOthers(list);
    };
    void ask();
    const timer = window.setInterval(() => { if (!document.hidden) void ask(); }, EVERY);
    return () => { gone = true; window.clearInterval(timer); };
  }, [jump]);

  const shown = withoutBlocked(others, (one) => one.who, blocked);
  const company = shown.length > 0;

  /* ── The realtime channel: only while there is somebody to hear it ── */
  const tagToWho = useRef(new Map<string, string>());
  tagToWho.current = new Map(shown.filter((one) => one.tag).map((one) => [one.tag, one.who]));
  useEffect(() => {
    if (!company || !signedIn) return undefined;
    const client = getClient();
    if (!client) return undefined;
    let open = false;
    const room = client.channel('jam-stage', { config: { broadcast: { self: false, ack: false } } });
    room.on('broadcast', { event: 'p' }, ({ payload }) => {
      const pulse = cleanPulse(payload);
      if (!pulse) return;
      const who = tagToWho.current.get(pulse.tag);
      if (!who) return;
      if (pulse.level !== null) {
        const was = pulses.current.get(pulse.tag);
        pulses.current.set(pulse.tag, { heard: pulse.level, at: performance.now(), shown: was?.shown ?? 0 });
      }
      if (pulse.drop) jump(who);
    });
    room.subscribe((status) => { open = status === 'SUBSCRIBED'; });
    channel.current = room;
    /* Your loudness, sent only when it changes (or, while it is not silent,
       once a second so a held note does not read as gone). */
    let sent = -1;
    let sentAt = 0;
    const timer = window.setInterval(() => {
      if (!open || document.hidden || !tag.current) return;
      const level = toPulse(shownMine.current);
      const now = performance.now();
      if (level === sent && (level === 0 || now - sentAt < 1000)) return;
      sent = level;
      sentAt = now;
      void room.send({ type: 'broadcast', event: 'p', payload: { t: tag.current, l: level } });
    }, PULSE_EVERY);
    return () => {
      window.clearInterval(timer);
      channel.current = null;
      void client.removeChannel(room);
    };
  }, [company, signedIn, jump]);

  /* ── Your drop: your own tile jumps, and the room is told ─────────── */
  const dropsSeen = useRef(drops);
  useEffect(() => {
    if (drops === dropsSeen.current) return;
    dropsSeen.current = drops;
    jump('you');
    if (tag.current) void channel.current?.send({ type: 'broadcast', event: 'p', payload: { t: tag.current, d: 1 } });
  }, [drops, jump]);

  /* ── The animation frame: every character's loudness ──────────────── */
  useEffect(() => {
    let frame = 0;
    const draw = (): void => {
      shownMine.current = follow(shownMine.current, heard());
      mine.current?.style.setProperty('--lvl', shownMine.current.toFixed(3));
      const now = performance.now();
      stage.current?.querySelectorAll<HTMLElement>('[data-jamtag]').forEach((tile) => {
        const key = tile.dataset.jamtag ?? '';
        const one = pulses.current.get(key);
        if (!one) return;
        const target = now - one.at > QUIET_AFTER ? 0 : one.heard;
        one.shown = follow(one.shown, target);
        tile.style.setProperty('--lvl', one.shown.toFixed(3));
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [heard]);

  const youAre = named || name || t('live.you', 'You');
  const nameOfCharacter = (one: Look): string => t(CHARACTER_WORDS[one.character].key, CHARACTER_WORDS[one.character].fallback);
  const beatOf = (tempo: number | null): React.CSSProperties => (tempo ? ({ '--jc-beat': `${(60 / tempo).toFixed(3)}s` } as React.CSSProperties) : {});

  const roomNote = signedIn === false
    ? t('jam.signInStage', 'Sign in to stand on the stage where the room can see you. Your character still moves to your sound here.')
    : ready === false
      ? t('jam.stageNotReady', 'The stage that shows the room’s characters is not set up on this app yet. Your character still moves to your sound here.')
      : t('jam.stageEmpty', 'Nobody else is on the stage yet. When somebody comes into the jam room, they stand here as their character.');

  return (
    /* Laid out by the stage's own width, not the window's: on a computer
       the jam room sits between the studio's menu and the copilot, so a
       wide window is still a middle-sized stage. */
    <div className="@container" data-jamstagebox>
    <div ref={stage} className="grid grid-cols-1 gap-4 @xl:grid-cols-12" data-jamstage>
      {/* ── You ─────────────────────────────────────────────────────── */}
      <div
        ref={mine}
        data-jamtile="you"
        className={`relative flex flex-col overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.06),transparent_65%),linear-gradient(180deg,#0b0b16,#05050a)] p-3 @xl:col-span-5 @xl:row-start-1 ${looping ? 'jc-beat' : ''} ${jumping.has('you') ? 'jc-drop' : ''}`}
        style={{ '--jc': COLOURS[look.colour], borderColor: `${COLOURS[look.colour]}66`, boxShadow: `0 0 32px -8px ${COLOURS[look.colour]}55`, ...beatOf(looping ? bpm : null) } as React.CSSProperties}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="max-w-[70%] truncate rounded-md px-2 py-0.5 text-[11px] font-extrabold text-onAccent" style={{ background: 'var(--jc)' }} data-jamname="you">
            {youAre}
          </span>
          <Meter />
        </div>
        <div className="mx-auto aspect-square w-full max-w-[15rem] sm:max-w-[17rem]">
          <JamCharacter look={look} label={`${youAre}: ${nameOfCharacter(look)}`} />
        </div>
        <p className="text-center text-[11px] text-zinc-400">
          {looping ? `${t('jam.youLooping', 'Looping')} · ${bpm} BPM` : nameOfCharacter(look)}
        </p>
      </div>

      {/* ── Everybody else ──────────────────────────────────────────── */}
      <div className="@container @xl:col-span-7 @xl:row-span-2 @xl:row-start-1" data-jamroom>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{t('jam.onStageTitle', 'On the stage')}</p>
          <span className="font-mono text-[11px] text-zinc-400" data-jamcount>{shown.length + 1}</span>
        </div>
        {shown.length === 0 ? (
          <div className="grid min-h-[9rem] place-items-center rounded-2xl border border-dashed border-white/10 bg-zinc-950/50 p-4 text-center @xl:min-h-[18rem]" data-jamroomempty>
            <p className="max-w-sm text-[12px] leading-relaxed text-zinc-400">{roomNote}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4" data-jamothers>
            {shown.map((one, at) => (
              <li
                key={one.who}
                data-jamtag={one.tag || `x${at}`}
                data-jamother={one.who}
                className={`relative flex flex-col rounded-2xl border bg-[linear-gradient(180deg,#0b0b16,#05050a)] p-2 ${one.looping ? 'jc-beat' : ''} ${jumping.has(one.who) ? 'jc-drop' : ''}`}
                style={{ '--jc': COLOURS[one.look.colour], '--jc-wink': `${(at * 0.7) % 4}s`, borderColor: `${COLOURS[one.look.colour]}44`, ...beatOf(one.looping ? one.bpm : null) } as React.CSSProperties}
              >
                <div className="mx-auto aspect-square w-full max-w-[9rem]">
                  <JamCharacter look={one.look} label={`${one.name || t('loop.someone', 'somebody in the room')}: ${nameOfCharacter(one.look)}`} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="min-w-0 truncate text-[11px] font-bold text-zinc-100">{one.name || t('loop.someone', 'somebody in the room')}</span>
                  {one.looping ? (
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--jc)' }}>
                      <Repeat className="h-3 w-3" aria-hidden />
                      {one.bpm ?? ''}
                    </span>
                  ) : <Meter />}
                </div>
              </li>
            ))}
          </ul>
        )}
        {shown.length > 0 && signedIn !== false && (
          <p className="pt-2 text-[11px] text-zinc-500">{t('jam.stageHow', 'Each character moves to what that person is playing. Nobody here is shown by face or camera.')}</p>
        )}
      </div>

      {/* ── Your character, picked ──────────────────────────────────── */}
      <div className="@container rounded-2xl border border-white/10 bg-zinc-950/60 p-3 @xl:col-span-5 @xl:col-start-1 @xl:row-start-2" data-jampicker>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{t('jam.pickTitle', 'Your character')}</p>
        <p className="pb-3 pt-1 text-[11px] leading-snug text-zinc-400">{t('jam.pickWhy', 'The room only ever sees this character and your name — never your face or your camera. Change it whenever you like.')}</p>
        <div className="grid grid-cols-3 gap-2 @[18rem]:grid-cols-4 @lg:grid-cols-6" role="group" aria-label={t('jam.pickTitle', 'Your character')}>
          {CHARACTERS.map((character) => {
            const on = look.character === character;
            const label = t(CHARACTER_WORDS[character].key, CHARACTER_WORDS[character].fallback);
            return (
              <button
                key={character}
                type="button"
                data-jampick={character}
                aria-pressed={on}
                aria-label={label}
                title={label}
                onClick={() => onLook({ ...look, character })}
                className={`relative grid min-h-[44px] place-items-center rounded-xl border p-1 transition ${on ? 'bg-zinc-900' : 'border-white/10 bg-black/40 hover:border-white/25'}`}
                style={on ? { borderColor: COLOURS[look.colour], boxShadow: `0 0 14px -2px ${COLOURS[look.colour]}88` } : undefined}
              >
                <span className="block aspect-square w-full max-w-[3.5rem]">
                  <JamCharacter look={{ character, colour: look.colour }} still />
                </span>
                {on && (
                  <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full text-onAccent" style={{ background: COLOURS[look.colour] }}>
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-300">{t('jam.colourTitle', 'Colour')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('jam.colourTitle', 'Colour')}>
          {COLOUR_IDS.map((colour) => {
            const on = look.colour === colour;
            return (
              <button
                key={colour}
                type="button"
                data-jamcolourpick={colour}
                aria-pressed={on}
                aria-label={t(COLOUR_WORDS[colour].key, COLOUR_WORDS[colour].fallback)}
                title={t(COLOUR_WORDS[colour].key, COLOUR_WORDS[colour].fallback)}
                onClick={() => onLook({ ...look, colour })}
                className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${on ? 'border-white' : 'border-transparent'}`}
              >
                <span className="h-7 w-7 rounded-full" style={{ background: COLOURS[colour], boxShadow: on ? `0 0 14px ${COLOURS[colour]}` : 'none' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}
