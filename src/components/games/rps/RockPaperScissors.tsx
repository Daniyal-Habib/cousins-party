"use client";

import { useEffect, useState } from "react";
import { ref, onValue, runTransaction, off, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { rtdbKey } from "@/lib/rtdbKey";
import { Avatar } from "@/components/theme/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

const WEAPONS = [
  { id: "rock", label: "Rock", icon: "🪨" },
  { id: "paper", label: "Paper", icon: "📄" },
  { id: "scissors", label: "Scissors", icon: "✂️" },
] as const;

type WeaponId = typeof WEAPONS[number]["id"];

interface Player {
  uid: string;
  name: string;
  photoUrl: string | null;
}

interface RPSProps {
  code: string;
  uid: string;
  players: Player[];
  onClose: () => void;
}

interface RpsMatch {
  p1Choice: string | null;
  p2Choice: string | null;
  resolvedAt: number | null;
}

function getScoreDelta(mine: string, theirs: string) {
  if (mine === theirs) return 0;
  if (mine === "rock" && theirs === "scissors") return 1;
  if (mine === "paper" && theirs === "rock") return 1;
  if (mine === "scissors" && theirs === "paper") return 1;
  return -1;
}

function getMatchId(uid1: string, uid2: string) {
  const k1 = rtdbKey(uid1);
  const k2 = rtdbKey(uid2);
  return k1 < k2 ? `${k1}_${k2}` : `${k2}_${k1}`;
}

export function RockPaperScissors({ code, uid, players, onClose }: RPSProps) {
  const myK = rtdbKey(uid);
  
  const [matches, setMatches] = useState<Record<string, RpsMatch>>({});
  const [scores, setScores] = useState<Record<string, number>>({});

  // Sync all matches
  useEffect(() => {
    if (!rtdb) return;
    const matchesRef = ref(rtdb, `rps/${code}/matches`);
    const unsub = onValue(matchesRef, (snap) => setMatches(snap.val() || {}));
    return () => off(matchesRef, "value", unsub);
  }, [code]);

  // Sync all scores
  useEffect(() => {
    if (!rtdb) return;
    const scoresRef = ref(rtdb, `rps/${code}/scores`);
    const unsub = onValue(scoresRef, (snap) => setScores(snap.val() || {}));
    return () => off(scoresRef, "value", unsub);
  }, [code]);

  async function pickWeapon(theirUid: string, weapon: WeaponId) {
    if (!rtdb) return;
    const theirK = rtdbKey(theirUid);
    const matchId = getMatchId(uid, theirUid);
    const isP1 = myK < theirK;
    const myField = isP1 ? "p1Choice" : "p2Choice";
    const theirField = isP1 ? "p2Choice" : "p1Choice";

    try {
      const result = await runTransaction(ref(rtdb, `rps/${code}/matches/${matchId}`), (current) => {
        const match = current || { p1Choice: null, p2Choice: null, resolvedAt: null };
        if (match[myField] || match.resolvedAt) {
          return undefined; // Abort if I already picked or match resolved
        }
        match[myField] = weapon;
        if (match[theirField]) {
          match.resolvedAt = Date.now();
        }
        return match;
      });

      if (result.committed && result.snapshot) {
        const match = result.snapshot.val();
        if (match.resolvedAt) {
          // Both picked! Safely update scores exactly once.
          const myChoice = match[myField];
          const theirChoice = match[theirField];
          const delta = getScoreDelta(myChoice, theirChoice);
          if (delta !== 0) {
            runTransaction(ref(rtdb, `rps/${code}/scores/${myK}`), (score) => (score || 0) + delta);
            runTransaction(ref(rtdb, `rps/${code}/scores/${theirK}`), (score) => (score || 0) - delta);
          }
        }
      }
    } catch (e) {
      console.error("RPS match transaction failed", e);
    }
  }

  async function clearMatch(theirUid: string) {
    if (!rtdb) return;
    const matchId = getMatchId(uid, theirUid);
    await remove(ref(rtdb, `rps/${code}/matches/${matchId}`));
  }

  const myScore = scores[myK] || 0;
  const opponents = players.filter(p => p.uid !== uid).sort((a, b) => (scores[rtdbKey(b.uid)] || 0) - (scores[rtdbKey(a.uid)] || 0));

  return (
    <div className="relative flex h-full w-full flex-col bg-vice-midnight/90">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-vice-night border-b border-white/10 z-10 shadow-lg">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white active:scale-95 transition hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-display text-xl uppercase neon-text text-neon-teal tracking-widest">RPS Challenges</h2>
          <p className="text-xs font-bold uppercase tracking-widest mt-1 text-ink">
            My Score: <span className="text-neon-pink text-sm ml-1">{myScore}</span>
          </p>
        </div>
        <div className="w-10" /> {/* spacer */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 no-scrollbar">
        {opponents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <p className="font-display text-lg uppercase tracking-widest text-white">No Opponents</p>
            <p className="text-sm text-white/50">Waiting for other cousins to join...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {opponents.map((p) => {
              const theirK = rtdbKey(p.uid);
              const theirScore = scores[theirK] || 0;
              const matchId = getMatchId(uid, p.uid);
              const match = matches[matchId];
              const isP1 = myK < theirK;
              
              const myChoice = match?.[isP1 ? "p1Choice" : "p2Choice"];
              const theirChoice = match?.[isP1 ? "p2Choice" : "p1Choice"];
              const resolved = match?.resolvedAt != null;

              let status = "none";
              if (resolved) status = "resolved";
              else if (myChoice && !theirChoice) status = "waitingForThem";
              else if (!myChoice && theirChoice) status = "challengedYou";

              let delta = 0;
              if (resolved && myChoice && theirChoice) {
                delta = getScoreDelta(myChoice, theirChoice);
              }

              return (
                <motion.div
                  key={p.uid}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "glass relative flex flex-col gap-4 p-4 transition-all duration-300 rounded-3xl",
                    status === "challengedYou" && "ring-2 ring-neon-pink shadow-[0_0_15px_rgba(255,45,123,0.3)] bg-neon-pink/5",
                    status === "resolved" && delta > 0 && "ring-2 ring-neon-teal shadow-[0_0_15px_rgba(31,224,216,0.2)] bg-neon-teal/5",
                    status === "resolved" && delta < 0 && "ring-2 ring-neon-pink/50 bg-neon-pink/5"
                  )}
                >
                  {/* Player Header */}
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} photoUrl={p.photoUrl} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-base font-bold text-ink">{p.name}</p>
                      <p className="text-xs uppercase tracking-widest text-white/50">Score: {theirScore}</p>
                    </div>
                    
                    {status === "challengedYou" && (
                      <span className="animate-pulse rounded-full bg-neon-pink px-2 py-1 text-[9px] font-black uppercase tracking-widest text-black shadow-lg">
                        Challenged You!
                      </span>
                    )}
                    {status === "waitingForThem" && (
                      <span className="rounded-full bg-white/10 border border-white/20 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white/70">
                        Waiting...
                      </span>
                    )}
                  </div>

                  {/* Interaction Zone */}
                  <div className="relative w-full rounded-2xl bg-black/20 p-3">
                    {(status === "none" || status === "challengedYou") && (
                      <div className="flex justify-around">
                        {WEAPONS.map(w => (
                          <button
                            key={w.id}
                            onClick={() => pickWeapon(p.uid, w.id as WeaponId)}
                            className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-90 transition-all duration-200"
                          >
                            <span className="text-2xl">{w.icon}</span>
                            <span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/70">{w.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {status === "waitingForThem" && myChoice && (
                      <div className="flex flex-col items-center justify-center py-2">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border-2 border-neon-teal bg-neon-teal/20 opacity-80">
                          <span className="text-2xl">{WEAPONS.find(w => w.id === myChoice)?.icon}</span>
                          <div className="absolute -bottom-1.5 rounded-full bg-neon-teal px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest text-black">Ready</div>
                        </div>
                        <p className="mt-3 text-[10px] uppercase tracking-widest text-white/50 animate-pulse">Waiting for them to pick...</p>
                      </div>
                    )}

                    {status === "resolved" && myChoice && theirChoice && (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center gap-6 w-full px-4 py-2">
                          {/* Me */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-white/50 uppercase tracking-widest">You</span>
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-3xl">
                              {WEAPONS.find(w => w.id === myChoice)?.icon}
                            </div>
                          </div>
                          
                          <span className="text-lg font-bold text-white/20">VS</span>

                          {/* Them */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-white/50 uppercase tracking-widest">Them</span>
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-3xl">
                              {WEAPONS.find(w => w.id === theirChoice)?.icon}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between w-full">
                          <div className={cn(
                            "px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest",
                            delta > 0 ? "border-neon-teal bg-neon-teal/10 text-neon-teal" :
                            delta < 0 ? "border-neon-pink bg-neon-pink/10 text-neon-pink" :
                            "border-white/20 text-white/70 bg-white/5"
                          )}>
                            {delta > 0 ? "You Won!" : delta < 0 ? "You Lost!" : "Draw!"}
                          </div>

                          <button
                            onClick={() => clearMatch(p.uid)}
                            className="rounded-full bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white active:scale-95 transition"
                          >
                            Play Again
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
