'use client';

/**
 * How the copilot reaches into the room you are standing in.
 *
 * It could already act on the song canvas — name it, set the style, write the
 * words — because the studio owns that state and could hand it over. Every
 * other room owns its own: the video desk holds its prompt, its shape and its
 * length; the voice studio holds the script. So in ten rooms out of eleven the
 * copilot could describe what to do and not do it, which is the difference
 * between an assistant and a leaflet.
 *
 * A room registers what it can be asked to do, and the studio dispatches to it.
 *
 *   function VideoCanvas() {
 *     const [prompt, setPrompt] = useState('');
 *     useCopilotOps('canvas', {
 *       set_prompt: (value) => setPrompt(value),
 *     });
 *   }
 *
 * Two properties matter more than the plumbing.
 *
 * **Nothing is offered that is not registered.** The list of operations goes to
 * the model on every turn, built from what is registered at that moment — not
 * from a table of what we intend to support one day. A room that has not been
 * wired yet offers nothing, and the copilot advises instead of promising. The
 * failure mode we are avoiding is the one where it says "done" and nothing
 * moved.
 *
 * **A registration is scoped to the mount.** Rooms unmount when you leave them,
 * so the handler goes with them, and a stale handler cannot be called against a
 * screen that is no longer there.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SurfaceId } from './surfaces';

/** What a room can be asked to do: the operation name, and the handler for it. */
export type OpHandlers = Record<string, (value: string) => void>;

export interface CopilotBus {
  /** The operations registered for a room right now. Empty when nothing is wired. */
  opsFor: (surface: SurfaceId) => string[];
  /** Run one. Returns false when nothing was registered to take it. */
  dispatch: (surface: SurfaceId, op: string, value: string) => boolean;
  /** Used by `useCopilotOps`. Not for callers. */
  register: (surface: SurfaceId, handlers: OpHandlers) => () => void;
}

const noop: CopilotBus = {
  opsFor: () => [],
  dispatch: () => false,
  register: () => () => {},
};

const Context = createContext<CopilotBus>(noop);

/**
 * Holds the registrations. Mount it once, around the studio.
 *
 * The handlers live in a ref rather than in state because registering must not
 * re-render the studio — a room mounting would otherwise re-render its own
 * parent mid-mount. `version` exists only so that the copilot panel re-reads
 * the operation list when it changes, which is a much rarer event than a
 * handler being replaced.
 */
export function useCopilotBus(): CopilotBus {
  const handlers = useRef<Partial<Record<SurfaceId, OpHandlers>>>({});
  const [, setVersion] = useState(0);

  return useMemo<CopilotBus>(
    () => ({
      opsFor: (surface) => Object.keys(handlers.current[surface] ?? {}),
      dispatch: (surface, op, value) => {
        const handler = handlers.current[surface]?.[op];
        if (!handler) return false;
        handler(value);
        return true;
      },
      register: (surface, ops) => {
        const before = Object.keys(handlers.current[surface] ?? {}).join(',');
        handlers.current[surface] = ops;
        // Only nudge the panel when the *set* of operations changed. Handlers
        // are rebuilt on every render of the room; the names almost never are.
        if (Object.keys(ops).join(',') !== before) setVersion((n) => n + 1);
        return () => {
          if (handlers.current[surface] === ops) {
            delete handlers.current[surface];
            setVersion((n) => n + 1);
          }
        };
      },
    }),
    [],
  );
}

export const CopilotBusContext = Context;

/** Read the bus. The studio uses this to dispatch; rooms use `useCopilotOps`. */
export function useCopilotBusContext(): CopilotBus {
  return useContext(Context);
}

/**
 * Register what the copilot may do in this room.
 *
 * Pass a stable-ish object; it is re-registered whenever the identity changes,
 * which is harmless, and the operation names are what actually matter.
 */
export function useCopilotOps(surface: SurfaceId, handlers: OpHandlers): void {
  const bus = useContext(Context);
  // The names are the contract. Re-registering on every render would be
  // correct but noisy, so the effect keys on the names and the bus keeps the
  // latest handlers regardless.
  const names = Object.keys(handlers).sort().join(',');
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    // A thin forwarder, so the room can close over fresh state without
    // re-registering: the bus holds this object, and it always reads the
    // handler set from the most recent render.
    const forwarders: OpHandlers = {};
    for (const name of names ? names.split(',') : []) {
      forwarders[name] = (value: string) => latest.current[name]?.(value);
    }
    return bus.register(surface, forwarders);
  }, [bus, surface, names]);
}

/**
 * Find the thing they named.
 *
 * Several rooms take an operation whose value is the title of one of their
 * songs — open this one in the timeline, sing over that one, cut a clip from
 * the other. The model writes what the person called it, which is rarely the
 * stored title character for character: "the amapiano one", "Rooi Aand",
 * "rooi aand". Exact match first, then either way round as a substring, and
 * null rather than a guess when nothing is close.
 *
 * Null is a real answer. The caller does nothing with it, which leaves the room
 * exactly as it was — better than opening the wrong song, which looks like the
 * app misheard rather than like the copilot did.
 */
export function matchByTitle<T extends { title: string }>(items: readonly T[], value: string): T | null {
  const wanted = value.trim().toLowerCase();
  if (!wanted) return null;
  const titles = items.map((item) => ({ item, title: item.title.trim().toLowerCase() }));
  return (
    titles.find((one) => one.title === wanted)?.item ??
    titles.find((one) => one.title.includes(wanted))?.item ??
    titles.find((one) => wanted.includes(one.title))?.item ??
    null
  );
}
