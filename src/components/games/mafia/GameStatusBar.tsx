"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMafia } from "@/games/mafia/useMafia";
import { cn } from "@/lib/cn";

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

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-vice-night/80 px-4 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="font-display text-[10px] uppercase tracking-wider text-muted">
          Round
        </span>
        <span className="font-display text-lg text-ink">{state.round}</span>
        <span className={cn("font-display text-xs uppercase tracking-wide", phase.color)}>
          {phase.label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">
          {livingCount} alive
        </span>
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
  );
}
