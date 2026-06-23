"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { query, orderBy, limit, onSnapshot, collection } from "firebase/firestore";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { Avatar } from "@/components/theme/Avatar";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useSession } from "@/lib/stores/session";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

export default function LeaderboardPage() {
  useRequireAuth();
  const { email } = useSession();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "users"), orderBy("stars", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map((d) => d.data() as UserProfile));
      setLoading(false);
    });
    return unsub;
  }, []);

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 text-center font-display text-3xl uppercase"
      >
        <span className="gradient-title">Leaderboard</span>
      </motion.h1>
      <p className="mb-5 text-center text-xs uppercase tracking-[0.3em] text-muted">
        Top cousins by stars
      </p>

      {loading && <p className="text-center text-sm text-muted">Loading ranks…</p>}

      {!loading && players.length === 0 && (
        <GlassPanel className="text-center">
          <p className="font-display uppercase text-ink">No players ranked yet</p>
          <p className="mt-1 text-sm text-muted">Be the first to win a game!</p>
        </GlassPanel>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <div className="mb-4 grid grid-cols-3 items-end gap-2">
          {[1, 0, 2].map((idx) => {
            const p = podium[idx];
            if (!p) return <div key={idx} />;
            const heights = ["h-28", "h-36", "h-24"];
            const medals = ["🥈", "🥇", "🥉"];
            const rings = ["orange", "pink", "teal"] as const;
            return (
              <motion.div
                key={p.email}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex flex-col items-center"
              >
                <span className="mb-1 text-2xl">{medals[idx]}</span>
                <Avatar name={p.name} photoUrl={p.photoUrl} size={56} ring={rings[idx]} />
                <p className="mt-1 max-w-[5.5rem] truncate text-center text-xs text-ink">
                  {p.name}
                </p>
                <div
                  className={`mt-1 flex w-full ${heights[idx]} items-start justify-center rounded-t-2xl bg-gradient-to-b from-neon-pink-orange/40 to-white/5 pt-2`}
                >
                  <span className="font-display text-lg text-neon-orange neon-text">
                    {p.stars}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rest of the list */}
      <div className="space-y-2">
        {rest.map((p, i) => {
          const isMe = p.email === email;
          return (
            <motion.div
              key={p.email}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <GlassPanel
                glow={isMe ? "pink" : "none"}
                className={`flex items-center gap-3 ${isMe ? "border-neon-pink/40" : ""}`}
              >
                <span className="w-6 text-center font-display text-muted">{i + 4}</span>
                <Avatar name={p.name} photoUrl={p.photoUrl} size={40} ring={isMe ? "pink" : "none"} />
                <p className={`flex-1 truncate ${isMe ? "font-bold text-ink" : "text-ink"}`}>
                  {p.name}
                  {isMe && <span className="ml-2 text-[10px] uppercase text-neon-pink">You</span>}
                </p>
                <span className="font-display text-neon-orange">{p.stars}</span>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
