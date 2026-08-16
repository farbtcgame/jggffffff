import { useEffect, useState } from "react";

/**
 * Parses a countdown target into an absolute millisecond epoch.
 * Accepts an ISO-8601 date string, a millisecond epoch, or a second
 * epoch (auto-detected by magnitude). Returns null if the value can't be
 * parsed, so callers can fall back to a "not configured" state instead of
 * silently treating an invalid value as "now".
 */
export function parseCountdownTarget(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    // Treat values below the year-2100-in-seconds range as a second epoch.
    return value < 10_000_000_000 ? value * 1000 : value;
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && /^\d+$/.test(value.trim())) {
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export interface CountdownState {
  targetMs: number | null;
  remainingMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
  isConfigured: boolean;
}

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

function computeState(targetMs: number | null): CountdownState {
  if (targetMs === null) {
    return {
      targetMs: null,
      remainingMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: false,
      isConfigured: false,
    };
  }

  const remainingMs = Math.max(0, targetMs - Date.now());
  const days = Math.floor(remainingMs / ONE_DAY);
  const hours = Math.floor((remainingMs % ONE_DAY) / ONE_HOUR);
  const minutes = Math.floor((remainingMs % ONE_HOUR) / ONE_MINUTE);
  const seconds = Math.floor((remainingMs % ONE_MINUTE) / ONE_SECOND);

  return {
    targetMs,
    remainingMs,
    days,
    hours,
    minutes,
    seconds,
    isComplete: remainingMs <= 0,
    isConfigured: true,
  };
}

/**
 * Real-time countdown driven entirely by a fixed target timestamp compared
 * against wall-clock time (Date.now()). Because it never stores or
 * decrements a counter in local state, it naturally:
 *  - persists correctly across page refreshes,
 *  - is unaffected by wallet connect/disconnect/reconnect,
 *  - does not depend on browser session storage of any kind,
 *  - stays accurate even if the tab was closed and reopened.
 */
export function useCountdown(target: string | number | undefined | null): CountdownState {
  const targetMs = parseCountdownTarget(target);
  // IMPORTANT: do NOT call computeState(targetMs) here for the initial
  // state. computeState() reads Date.now(), and calling it directly in
  // useState's initializer means the server (at build/request time) and
  // the browser (at hydration time, a bit later) each compute a different
  // remainingMs/seconds value from the same targetMs. That mismatch is
  // exactly what was causing the "Hydration failed because the initial UI
  // does not match what was rendered on the server" errors on the site.
  //
  // `targetMs` itself (and therefore `isConfigured`) is safe to use
  // immediately — it's a pure parse of a static config value, so it comes
  // out identical on the server and on the client. Only the Date.now()-
  // dependent fields (remainingMs/days/hours/minutes/seconds) need to
  // start neutral and get filled in by the effect below, which only ever
  // runs in the browser, after hydration. This keeps the very first
  // render's HTML identical on both sides while still showing the correct
  // "configured" vs "not configured" state immediately (matching the
  // original behavior) instead of flashing "not configured" for every
  // countdown on first paint.
  const [state, setState] = useState<CountdownState>({
    targetMs,
    remainingMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isComplete: false,
    isConfigured: targetMs !== null,
  });

  useEffect(() => {
    setState(computeState(targetMs));
    if (targetMs === null) return;

    const interval = setInterval(() => {
      setState(computeState(targetMs));
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs]);

  return state;
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
