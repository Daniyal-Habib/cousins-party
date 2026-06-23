"use client";

import { motion } from "framer-motion";
import { Avatar } from "@/components/theme/Avatar";
import { cn } from "@/lib/cn";

/**
 * Grid of selectable player avatars. Used for night actions (mafia kill,
 * doctor save, detective check, sheriff shot) and the day vote.
 * - `excludeUids` removes players entirely (e.g. dead players).
 * - `disabledUids` greys out a player (e.g. Doctor's previous-night save).
 * - `selfSelectable` controls whether the chooser may pick themselves.
 */
export function PlayerSelectGrid({
  players,
  selectedUid,
  onSelect,
  excludeUids = [],
  disabledUids = [],
  selfSelectable = true,
  selfUid,
  emptyHint,
}: {
  players: { uid: string; name: string; photoUrl: string | null; alive: boolean }[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  excludeUids?: string[];
  disabledUids?: string[];
  selfSelectable?: boolean;
  selfUid?: string;
  emptyHint?: string;
  votedUids?: string[];
}) {
  const selectable = players.filter(
    (p) => p.alive && !excludeUids.includes(p.uid) && (selfSelectable || p.uid !== selfUid),
  );

  if (selectable.length === 0) {
    return (
      <div className="glass flex items-center justify-center p-6 text-center text-sm text-muted">
        {emptyHint ?? "No eligible targets."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {selectable.map((p) => {
        const selected = selectedUid === p.uid;
        const disabled = disabledUids.includes(p.uid);
        return (
          <motion.button
            key={p.uid}
            whileTap={{ scale: disabled ? 1 : 0.92 }}
            disabled={disabled}
            onClick={() => onSelect(p.uid)}
            className={cn(
              "relative glass flex flex-col items-center gap-1.5 p-3 transition",
              selected && "border-neon-pink shadow-neon-pink",
              disabled && "opacity-30 grayscale",
            )}
          >
            {votedUids?.includes(p.uid) && (
              <div className="absolute top-2 right-2 rounded-full bg-neon-teal p-0.5 text-black">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <Avatar
              name={p.name}
              photoUrl={p.photoUrl}
              size={56}
              ring={selected ? "pink" : "none"}
            />
            <span className="max-w-full truncate text-xs font-semibold text-ink">
              {p.name}
              {p.uid === selfUid && <span className="ml-1 text-neon-teal">you</span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
