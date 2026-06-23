"use client";

import { motion, AnimatePresence } from "framer-motion";
import { NeonButton } from "@/components/theme/NeonButton";
import { useConnection } from "@/lib/hooks/useConnection";

/**
 * Full-screen "Reconnecting…" overlay shown while the client is offline.
 * Counts down the 60-second grace period (per PRD §2.4). When grace expires,
 * exposes an "Exit to room" action — the parent decides convert-to-bot/eject.
 */
export function ConnectionOverlay({
  onGraceExpired,
}: {
  onGraceExpired?: () => void;
}) {
  const { online, graceSeconds, graceExpired } = useConnection();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-vice-night/90 backdrop-blur-md"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
            className="mb-6 h-14 w-14 rounded-full border-4 border-white/10 border-t-neon-pink"
          />
          {!graceExpired ? (
            <>
              <h2 className="font-display text-2xl uppercase text-ink neon-text">
                Reconnecting…
              </h2>
              <p className="mt-2 text-sm text-muted">
                Hold tight. You&apos;ll be kept in the game for{" "}
                <span className="font-display text-neon-teal">{graceSeconds}s</span>.
              </p>
              <p className="mt-1 text-xs text-muted/70">
                Check your signal — we&apos;ll resume automatically.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl uppercase text-neon-pink neon-text">
                Connection Lost
              </h2>
              <p className="mt-2 max-w-xs text-center text-sm text-muted">
                You&apos;ve been offline too long. You can head back to the room
                lobby and rejoin when you&apos;re stable.
              </p>
              <NeonButton variant="pink" className="mt-6" onClick={() => onGraceExpired?.()}>
                Exit to lobby
              </NeonButton>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
