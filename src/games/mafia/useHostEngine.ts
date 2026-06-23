"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  nightActionsReady,
  dayVotesReady,
  resolveNightPhase,
  resolveDayPhase,
  startDayPhase,
  startNextNight,
  endRevealPhase,
  forceEndDay,
  sweepStalePlayers,
} from "./mafiaService";
import { useMafia } from "./useMafia";

/**
 * Host-only effect that watches the game state and advances phases
 * automatically when their gating condition is met. Runs only on the host's
 * device, so exactly one client drives the phase machine.
 *
 *  - reveal      → night    once all players acknowledged (host taps Start).
 *  - night       → night-results once all required night actions are in.
 *  - night-results → day    host taps Continue (manual, keeps narration on screen).
 *  - day         → day-results once all voted OR timer expired.
 *  - day-results → night    host taps Continue.
 *
 * Also runs a periodic staleness sweep: any player offline beyond the 60s grace
 * is marked dead + spectator, and the game ends gracefully if that breaks the
 * win conditions (per PRD §2.4 / §6 error handling).
 */
export function useHostEngine() {
  const { state, code, isHost, hasPendingWrites } = useMafia();
  const busyRef = useRef(false);

  // We define run inside the component body so the interval can call it directly
  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await fn();
    } catch (e) {
      console.error("host engine error", e);
    } finally {
      // small debounce so the snapshot from the write settles before re-entry
      setTimeout(() => (busyRef.current = false), 600);
    }
  }, []);

  useEffect(() => {
    if (!isHost || !state || hasPendingWrites) return;

    // NIGHT → auto-resolve when all actions in.
    if (state.phase === "night" && nightActionsReady(state)) {
      run(() => resolveNightPhase(code));
    }

    // DAY → auto-resolve when all voted
    if (state.phase === "day") {
      if (dayVotesReady(state)) {
        run(() => resolveDayPhase(code));
      } else if (state.timerEndsAt) {
        // Fallback: check immediately in case it's already expired
        if (Date.now() >= state.timerEndsAt) {
          run(() => resolveDayPhase(code));
        } else {
          // Poll every second to auto-resolve exactly when the timer runs out
          const intervalId = setInterval(() => {
            if (Date.now() >= state.timerEndsAt!) {
              run(() => resolveDayPhase(code));
              clearInterval(intervalId);
            }
          }, 1000);
          return () => clearInterval(intervalId);
        }
      }
    }
  }, [state, code, isHost, hasPendingWrites, run]);

  // Periodic staleness sweep — host-only, every 15s while a game is live.
  useEffect(() => {
    if (!isHost) return;
    const id = setInterval(() => {
      sweepStalePlayers(code).catch((e) => console.error("sweep error", e));
    }, 15_000);
    return () => clearInterval(id);
  }, [code, isHost]);
}

// Re-export host control actions for UI buttons.
export {
  endRevealPhase,
  startDayPhase,
  startNextNight,
  forceEndDay,
  resolveNightPhase,
  resolveDayPhase,
};
