"use client";

import { motion } from "framer-motion";
import { BackHeader } from "@/components/nav/BackHeader";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useHistory } from "@/lib/hooks/useHistory";
import { useSession } from "@/lib/stores/session";

const GAME_LABEL: Record<string, string> = {
  mafia: "Mafia",
  uno: "UNO",
  "word-guesser": "Word Guesser",
};

export default function HistoryPage() {
  useRequireAuth();
  const { email } = useSession();
  const { entries, loading } = useHistory(email);

  return (
    <>
      <BackHeader title="Past Games" />
      <main className="mx-auto w-full max-w-md space-y-3 px-5 py-4">
        {loading && (
          <p className="text-center text-sm text-muted">Loading…</p>
        )}
        {!loading && entries.length === 0 && (
          <GlassPanel className="text-center">
            <p className="font-display uppercase text-ink">No games yet</p>
            <p className="mt-1 text-sm text-muted">
              Play a game and your results will show up here.
            </p>
          </GlassPanel>
        )}

        {entries.map((entry, i) => {
          const won = entry.result === "win";
          return (
            <motion.div
              key={entry.gameId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassPanel className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg ${
                    won
                      ? "bg-neon-teal-blue/20 text-neon-teal"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {won ? "W" : "L"}
                </div>
                <div className="flex-1">
                  <p className="font-display uppercase text-ink">
                    {GAME_LABEL[entry.gameType] ?? entry.gameType}
                  </p>
                  <p className="text-xs text-muted">
                    {entry.role ? `${entry.role} · ` : ""}
                    {new Date(entry.playedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold uppercase ${
                    won ? "text-neon-teal" : "text-red-400"
                  }`}
                >
                  {won ? "Won" : "Lost"}
                </span>
              </GlassPanel>
            </motion.div>
          );
        })}
      </main>
    </>
  );
}
