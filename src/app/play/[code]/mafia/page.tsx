"use client";

import { MafiaProvider } from "@/games/mafia/useMafia";
import { MafiaGame } from "@/components/games/mafia/MafiaGame";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";

/**
 * /play/[code]/mafia — entry into a Mafia game.
 * Host initializes the game doc on mount if it doesn't exist yet.
 */
export default function PlayMafiaPage() {
  useRequireAuth();
  return (
    <MafiaProvider>
      <MafiaGame />
    </MafiaProvider>
  );
}
