"use client";

import { useRouter } from "next/navigation";
import { useHostEngine } from "@/games/mafia/useHostEngine";
import { useMafia } from "@/games/mafia/useMafia";
import { RevealScreen } from "./RevealScreen";
import { NightScreen } from "./NightScreen";
import { DayScreen } from "./DayScreen";
import { NightResultsScreen, DayResultsScreen } from "./ResultsScreens";
import { EndScreen } from "./EndScreen";
import { GameStatusBar } from "./GameStatusBar";
import { ConnectionOverlay } from "@/components/games/ConnectionOverlay";

/**
 * Renders the right screen for the current game phase. The host engine effect
 * runs here (host-only) to auto-advance timed phases. A top status bar shows
 * round/phase + spectator badge during live phases. A connection overlay guards
 * against disconnects with a 60s grace period.
 */
export function MafiaGame() {
  const { state, loading, code } = useMafia();
  const router = useRouter();
  useHostEngine();

  if (loading || !state) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <p className="text-sm text-muted">Loading game…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <ConnectionOverlay onGraceExpired={() => router.replace(`/room/${code}`)} />
      <GameStatusBar />
      <div className="flex-1">
        {(() => {
          switch (state.phase) {
            case "reveal":
              return <RevealScreen />;
            case "night":
              return <NightScreen />;
            case "night-results":
              return <NightResultsScreen />;
            case "day":
              return <DayScreen />;
            case "day-results":
              return <DayResultsScreen />;
            case "ended":
              return <EndScreen />;
            default:
              return <EndScreen />;
          }
        })()}
      </div>
    </div>
  );
}
