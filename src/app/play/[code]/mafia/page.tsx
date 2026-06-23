"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { NeonButton } from "@/components/theme/NeonButton";
import { MafiaProvider } from "@/games/mafia/useMafia";
import { MafiaGame } from "@/components/games/mafia/MafiaGame";
import { subscribeMafia, startMafiaGame } from "@/games/mafia/mafiaService";
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
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to the game doc.
  useEffect(() => {
    const unsub = subscribeMafia(code, (s) => setGameState(s));
    return unsub;
  }, [code]);

  // Host: create the game doc if it doesn't exist.
  async function handleStart() {
    if (!uid || !room) return;
    setStarting(true);
    setError(null);
    try {
      await startMafiaGame(code, uid, players);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the game.");
      setStarting(false);
    }
  }

  // Loading.
  if (gameState === undefined || !room) {
    return (
      <FullBack>
        <p className="text-sm text-muted">Loading room…</p>
      </FullBack>
    );
  }

  // Game hasn't started yet — host sees a Start button.
  if (gameState === null) {
    const isHost = room.hostUid === uid;
    return (
      <FullBack>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-teal neon-text-teal">
            Mafia
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase">
            <span className="gradient-title">Ready?</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            {players.length} players in the room.
          </p>

          {isHost ? (
            <>
              {error && <p className="mt-3 text-sm text-neon-pink neon-text">{error}</p>}
              <NeonButton
                variant="pink"
                size="lg"
                fullWidth
                glow
                className="mt-6"
                disabled={starting || players.length < 4}
                onClick={handleStart}
              >
                {starting
                  ? "Dealing roles…"
                  : players.length < 4
                    ? `Need ${4 - players.length} more`
                    : "Deal Roles →"}
              </NeonButton>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">
              Waiting for the host to deal roles…
            </p>
          )}

          <NeonButton variant="ghost" className="mt-4" onClick={() => router.replace(`/room/${code}`)}>
            Back to room
          </NeonButton>
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
