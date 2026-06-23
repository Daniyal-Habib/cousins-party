"use client";

import { useEffect, useState } from "react";

const GRACE_PERIOD_MS = 60_000;

/**
 * Tracks network connection state and, when offline, counts down a 60-second
 * grace period (per PRD §2.4). When the grace period elapses the caller should
 * treat the player as disconnected (convert to bot / eject).
 */
export function useConnection() {
  const [online, setOnline] = useState(true);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [graceRemaining, setGraceRemaining] = useState(GRACE_PERIOD_MS);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setOfflineSince(null);
      setGraceRemaining(GRACE_PERIOD_MS);
    };
    const goOffline = () => {
      setOnline(false);
      setOfflineSince(Date.now());
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (!navigator.onLine) goOffline();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Countdown while offline.
  useEffect(() => {
    if (online || offlineSince == null) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - offlineSince;
      const remaining = Math.max(0, GRACE_PERIOD_MS - elapsed);
      setGraceRemaining(remaining);
    }, 250);
    return () => clearInterval(id);
  }, [online, offlineSince]);

  const graceExpired = !online && graceRemaining <= 0;
  const graceSeconds = Math.ceil(graceRemaining / 1000);

  return { online, graceRemaining, graceSeconds, graceExpired };
}
