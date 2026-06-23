"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { NeonButton } from "@/components/theme/NeonButton";
import { MafiaProvider } from "@/games/mafia/useMafia";
import { MafiaGame } from "@/components/games/mafia/MafiaGame";
import { subscribeMafia } from "@/games/mafia/mafiaService";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useUser } from "@/lib/hooks/useUser";
import { useRoom } from "@/lib/hooks/useRoom";
import type { MafiaGameState } from "@/games/mafia/state";

/**
 * /play/[code]/mafia — entry into a Mafia game.
 * Host initializes the game doc on mount if it doesn't exist yet.
 */
export default function PlayMafiaPage() {
  useRequireAuth();
  return <PlayMafiaInner />;
}

function PlayMafiaInner() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const router = useRouter();
  const { profile } = useUser();
  const uid = profile?.email ?? null;
  const { room, players } = useRoom(code, uid, profile);

  const [gameState, setGameState] = useState<MafiaGameState | null | undefined>(undefined);

  // Subscribe to the game doc.
  useEffect(() => {
    const unsub = subscribeMafia(code, (s) => setGameState(s));
    return unsub;
  }, [code]);

  // Game hasn't started yet (the lobby start process is still writing to Firestore).
  if (gameState === null) {
    return (
      <FullBack>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mb-4 text-5xl">🎭</div>
          <h1 className="mt-2 font-display text-2xl uppercase text-ink">
            Dealing roles...
          </h1>
          <p className="mt-3 text-sm text-muted">
            Getting the deck ready.
          </p>
        </motion.div>
      </FullBack>
    );
  }

  // Game is live — render the phase router inside the provider.
  return (
    <MafiaProvider>
      <MafiaGame />
    </MafiaProvider>
  );
}

function FullBack({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientBackdrop />
      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6">
        {children}
      </main>
    </>
  );
}
