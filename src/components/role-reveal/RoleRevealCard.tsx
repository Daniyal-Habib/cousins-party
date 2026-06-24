"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Avatar } from "@/components/theme/Avatar";
import { NeonButton } from "@/components/theme/NeonButton";
import { cn } from "@/lib/cn";

/**
 * The signature secret-reveal card used by Mafia (roles) and Word Guesser
 * (the word / "Mole" hint).
 *
 * Mechanics (per PRD §2.2):
 *  - Player's photo fills the screen as a card; name at the bottom.
 *  - The hidden role/word sits BEHIND the card, anchored to the bottom.
 *  - Drag UP only — max 50% of screen height. Cannot go further.
 *  - On release past threshold → LOCK. Card can't be dragged again or down.
 *  - On lock, "Continue" + "Undo" buttons appear ON the card.
 *  - "Undo" resets the card so it can be re-read; "Continue" advances.
 */
export function RoleRevealCard({
  name,
  photoUrl,
  hidden,            // the secret role/word rendered behind the card
  hiddenAccent,      // color theme for the hidden panel
  hiddenSub,         // optional supporting line (e.g. role description)
  prompt = "Drag up to reveal",
  loading,
  onContinue,
}: {
  name: string;
  photoUrl: string | null;
  hidden: string;
  hiddenAccent?: "pink" | "teal" | "orange";
  hiddenSub?: string;
  prompt?: string;
  loading?: boolean;
  onContinue: () => void;
}) {
  const [screenH, setScreenH] = useState(0);
  const [dragged, setDragged] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockThreshold = useRef(0);

  // Read viewport height on mount + resize; lock target is exactly -50%.
  useEffect(() => {
    const update = () => setScreenH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const lockY = -screenH / 2;          // exactly 50% up
  lockThreshold.current = screenH / 4; // must pass 25% to lock on release

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (locked) return;
    if (info.offset.y <= lockThreshold.current) {
      setLocked(true);
    } else {
      // didn't drag far enough — snap back
      setDragged(false);
    }
  }

  function undo() {
    setLocked(false);
    setDragged(false);
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-vice-night">
      {/* Hidden content — anchored to bottom half, revealed as card lifts */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-1/2 flex-col items-center justify-center px-6">
        <div
          className={cn(
            "glass w-full max-w-sm p-6 text-center",
            hiddenAccent === "teal" && "border-neon-teal/40 shadow-neon-teal",
            hiddenAccent === "orange" && "border-neon-orange/40 shadow-neon-orange",
            (!hiddenAccent || hiddenAccent === "pink") && "border-neon-pink/40 shadow-neon-pink",
          )}
        >
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-muted">
            You are
          </p>
          <p className="mt-2 font-display text-4xl uppercase text-ink neon-text">
            {hidden}
          </p>
          {hiddenSub && <p className="mt-3 text-sm text-muted">{hiddenSub}</p>}
        </div>
      </div>

      {/* Draggable card */}
      <motion.div
        drag={locked ? false : "y"}
        dragConstraints={{ top: screenH ? lockY : -200, bottom: 0 }}
        dragElastic={0}
        dragMomentum={false}
        initial={{ y: 0 }}
        animate={
          locked
            ? { y: 0 }
            : dragged
              ? undefined
              : { y: 0 }
        }
        onDragStart={() => setDragged(true)}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 z-10 overflow-hidden bg-vice-night shadow-2xl"
      >
        {/* Photo fills the entire screen absolutely */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-vice-dusk to-vice-midnight">
            <Avatar name={name} photoUrl={photoUrl} size={140} />
          </div>
        )}

        {/* Content overlaid at the bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-6 pt-32 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
          <p className="mb-6 font-display text-4xl uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] neon-text">{name}</p>

          {!locked ? (
            <div className="flex flex-col items-center gap-1.5 drop-shadow-md">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="text-neon-teal drop-shadow-md"
              >
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <p className="font-display text-sm uppercase tracking-[0.2em] text-white drop-shadow-md">{prompt}</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <NeonButton variant="ghost" size="md" className="flex-1 bg-black/50 backdrop-blur-md" onClick={undo} disabled={loading}>
                Undo
              </NeonButton>
              <NeonButton variant="teal" size="md" className="flex-1" onClick={onContinue} disabled={loading}>
                {loading ? "Loading..." : "Continue →"}
              </NeonButton>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
