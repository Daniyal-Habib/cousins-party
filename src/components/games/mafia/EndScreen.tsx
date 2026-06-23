"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { useMafia, ROLE_META } from "@/games/mafia/useMafia";
import { updateDoc, doc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function EndScreen() {
  const router = useRouter();
  const { state, code, me } = useMafia();
  if (!state || !state.win) return null;

  const win = state.win;
  const winners = state.players.filter((p) => win.results[p.uid] === "win");
  const losers = state.players.filter((p) => win.results[p.uid] !== "win");

  // Group losers by team.
  const teams = ["mafia", "civilian", "neutral"] as const;
  const loserGroups = teams
    .map((t) => ({
      team: t,
      members: losers.filter((p) => ROLE_META[p.role].team === t),
    }))
    .filter((g) => g.members.length > 0);

  const iWon = me ? win.results[me.uid] === "win" : false;

  const winnerLabel =
    win.winner === "mafia"
      ? "Mafia Wins"
      : win.winner === "civilian"
        ? "Town Wins"
        : "Jester Wins";

  async function backToRoom() {
    if (db) {
      await updateDoc(doc(db, "rooms", code), {
        status: "ended",
        updatedAt: serverTimestamp(),
      });
    }
    router.replace(`/room/${code}`);
  }

  async function goHome() {
    if (db) {
      await updateDoc(doc(db, "rooms", code), {
        status: "ended",
        updatedAt: serverTimestamp(),
      });
    }
    router.replace("/home");
  }

  return (
    <>
      <GradientBackdrop />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto w-full max-w-md overflow-y-auto px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] no-scrollbar"
      >
        {/* Hero result */}
        <div className="mb-6 text-center">
          <motion.p
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className={`font-display text-5xl uppercase ${
              iWon ? "gradient-title" : "text-ink neon-text"
            }`}
          >
            {iWon ? "Victory!" : "Defeat"}
          </motion.p>
          <p className="mt-2 font-display text-lg uppercase tracking-wide text-neon-orange neon-text">
            {winnerLabel}
          </p>
          <p className="mt-1 text-sm text-muted">{win.reason}</p>
        </div>

        {/* Winners */}
        <h3 className="mb-2 px-1 font-display text-xs uppercase tracking-[0.3em] text-neon-pink">
          Winners
        </h3>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {winners.map((p, i) => (
            <motion.div
              key={p.uid}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassPanel glow="pink" className="flex flex-col items-center gap-2 py-4">
                <Avatar name={p.name} photoUrl={p.photoUrl} size={72} ring="pink" />
                <p className="text-center font-display uppercase text-ink">{p.name}</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                  {ROLE_META[p.role].label}
                </span>
                <p className="font-display text-neon-orange">+{p.uid === me?.uid ? 3 : 3}⭐</p>
              </GlassPanel>
            </motion.div>
          ))}
        </div>

        {/* Losers grouped by team */}
        {loserGroups.map((group) => (
          <div key={group.team} className="mb-5">
            <h4 className="mb-2 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
              {group.team} Team
            </h4>
            <div className="space-y-2">
              {group.members.map((p) => (
                <GlassPanel key={p.uid} className="flex items-center gap-3">
                  <Avatar name={p.name} photoUrl={p.photoUrl} size={40} />
                  <span className="flex-1 truncate text-ink">{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">
                    {ROLE_META[p.role].label}
                  </span>
                </GlassPanel>
              ))}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <NeonButton variant="teal" fullWidth onClick={backToRoom}>
            Back to Room
          </NeonButton>
          <NeonButton variant="ghost" fullWidth onClick={goHome}>
            Home
          </NeonButton>
        </div>
      </motion.main>
    </>
  );
}
