"use client";

import { useEffect, useState } from "react";

/**
 * Counts down to a server-provided `endsAt` timestamp (ms epoch). All clients
 * reading the same `endsAt` from Firestore display the same remaining time
 * regardless of when they mounted. Returns null when no timer is set.
 */
export function useServerTimer(endsAt: number | null): {
  remainingMs: number | null;
  expired: boolean;
  formatted: string;
} {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (endsAt == null) {
    return { remainingMs: null, expired: false, formatted: "" };
  }

  const remainingMs = Math.max(0, endsAt - now);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const formatted = `${m}:${String(s).padStart(2, "0")}`;

  return { remainingMs, expired: remainingMs <= 0, formatted };
}
