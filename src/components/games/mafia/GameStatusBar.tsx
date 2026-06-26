"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMafia } from "@/games/mafia/useMafia";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PHASE_LABEL: Record<string, { label: string; color: string }> = {
  reveal: { label: "Role Reveal", color: "text-neon-orange" },
  night: { label: "Night", color: "text-neon-teal" },
  "night-results": { label: "Dawn", color: "text-neon-teal" },
  day: { label: "Day", color: "text-neon-pink" },
  "day-results": { label: "Verdict", color: "text-neon-pink" },
  ended: { label: "Game Over", color: "text-neon-orange" },
};

/**
 * Slim top status bar shown during live game phases (not during reveal/end
 * which own the whole screen). Shows round, phase, and a spectator badge for
 * eliminated players.
 */
export function GameStatusBar() {
  const { state, me, spectator } = useMafia();
  if (!state || !me) return null;
  // Skip on full-bleed screens.
  if (state.phase === "reveal" || state.phase === "ended") return null;

  const phase = PHASE_LABEL[state.phase] ?? PHASE_LABEL.night;
  const livingCount = state.players.filter((p) => p.alive).length;

  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  function confirmLeave() {
    setShowConfirm(false);
    router.replace(`/room/${code}`); // or /home
  }

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-vice-night/80 px-4 py-2 backdrop-blur-xl">
        <button
          onClick={() => setShowConfirm(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-neon-teal shadow-[0_0_10px_rgba(31,224,216,0.2)] hover:bg-white/10 active:scale-95 transition"
          aria-label="Home"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-wider text-muted">Round</span>
            <span className="font-display text-lg text-ink">{state.round}</span>
            <span className={cn("font-display text-xs uppercase tracking-wide", phase.color)}>
              {phase.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">{livingCount} alive</span>
            <AnimatePresence>
              {spectator && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-full bg-neon-orange/20 px-2 py-0.5 font-display text-[10px] uppercase tracking-wide text-neon-orange"
                >
                  👁 Spectating
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {/* Provide Avatar for profile or just placeholder to keep center aligned */}
          <div className="h-10 w-10" />
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="glass w-full max-w-xs rounded-3xl p-6 text-center shadow-xl border border-white/10"
            >
              <h3 className="font-display text-lg uppercase text-neon-pink neon-text mb-2">Leave Game?</h3>
              <p className="text-sm text-white/70 mb-6">Are you sure you want to return to the room lobby? You will abandon this game.</p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 font-bold uppercase tracking-wider text-white active:scale-95 transition"
                  onClick={() => setShowConfirm(false)}
                >
                  Stay
                </button>
                <button 
                  className="flex-1 rounded-xl bg-neon-pink py-3 font-bold uppercase tracking-wider text-black shadow-neon-pink active:scale-95 transition"
                  onClick={confirmLeave}
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
