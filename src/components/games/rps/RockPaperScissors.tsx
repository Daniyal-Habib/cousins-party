"use client";

import { useEffect, useState, useRef } from "react";
import { ref, onValue, set, runTransaction, off } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { rtdbKey } from "@/lib/rtdbKey";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

const ROUND_DURATION = 15000;
const PICK_DURATION = 10000;
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

function getScoreDelta(mine: string, theirs: string) {
  if (mine === theirs) return 0;
  if (mine === "rock" && theirs === "scissors") return 1;
  if (mine === "paper" && theirs === "rock") return 1;
  if (mine === "scissors" && theirs === "paper") return 1;
  return -1;
}

export function RockPaperScissors({ code, uid, players, onClose }: RPSProps) {
  const uidKey = rtdbKey(uid);
  
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const processedRoundRef = useRef<number | null>(null);

  // Sync server offset
  useEffect(() => {
    if (!rtdb) return;
    const offsetRef = ref(rtdb, ".info/serverTimeOffset");
    const unsub = onValue(offsetRef, (snap) => setOffset(snap.val() || 0));
    return () => off(offsetRef, "value", unsub);
  }, []);

  // Sync scores
  useEffect(() => {
    if (!rtdb) return;
    const scoresRef = ref(rtdb, `rps/${code}/scores`);
    const unsub = onValue(scoresRef, (snap) => setScores(snap.val() || {}));
    return () => off(scoresRef, "value", unsub);
  }, [code]);

  // High-frequency clock
  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      setNow(Date.now());
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Derived state
  const trueTime = now + offset;
  const currentRound = Math.floor(trueTime / ROUND_DURATION);
  const elapsedInRound = trueTime % ROUND_DURATION;
  const phase = elapsedInRound < PICK_DURATION ? "picking" : "revealing";
  const timeLeft = Math.ceil(((phase === "picking" ? PICK_DURATION : ROUND_DURATION) - elapsedInRound) / 1000);

  // Sync choices for current round
  useEffect(() => {
    if (!rtdb || !currentRound) return;
    const choicesRef = ref(rtdb, `rps/${code}/choices/${currentRound}`);
    const unsub = onValue(choicesRef, (snap) => setChoices(snap.val() || {}));
    return () => off(choicesRef, "value", unsub);
  }, [code, currentRound]);

  // Scoring logic
  useEffect(() => {
    if (phase === "revealing" && currentRound !== processedRoundRef.current) {
      // We set a small delay to ensure all choices have arrived via websocket
      const timer = setTimeout(() => {
        const myChoice = choices[uidKey];
        if (myChoice && rtdb) {
          let delta = 0;
          Object.entries(choices).forEach(([otherUid, otherChoice]) => {
            if (otherUid !== uidKey) {
              delta += getScoreDelta(myChoice, otherChoice);
            }
          });
          
          if (delta !== 0) {
            runTransaction(ref(rtdb, `rps/${code}/scores/${uidKey}`), (score) => (score || 0) + delta);
          }
        }
        processedRoundRef.current = currentRound;
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [phase, currentRound, choices, code, uidKey]);

  async function pickWeapon(weapon: WeaponId) {
    if (phase !== "picking" || !rtdb) return;
    await set(ref(rtdb, `rps/${code}/choices/${currentRound}/${uidKey}`), weapon);
  }

  const myChoice = choices[uidKey];

  return (
    <div className="relative flex h-full w-full flex-col bg-vice-midnight/80">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-vice-night/50 border-b border-white/10 backdrop-blur-md">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white active:scale-95 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-display text-xl uppercase neon-text text-neon-pink tracking-widest">RPS Royale</h2>
          <p className="text-xs text-muted uppercase tracking-wider">Round {currentRound}</p>
        </div>
        <div className="w-10" /> {/* spacer */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-8 no-scrollbar">
        {/* Timer & Status */}
        <div className="flex flex-col items-center justify-center gap-2">
          <motion.div 
            key={phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-neon-teal/30 bg-vice-night/50 shadow-neon-teal/20 shadow-lg"
          >
            <span className={cn(
              "font-display text-5xl",
              timeLeft <= 3 ? "text-neon-pink" : "text-neon-teal"
            )}>
              {timeLeft}
            </span>
          </motion.div>
          <p className="font-display text-sm uppercase tracking-widest text-ink mt-2">
            {phase === "picking" ? "Pick your weapon!" : "Results!"}
          </p>
        </div>

        {/* Weapons */}
        <div className="flex justify-center gap-4">
          {WEAPONS.map((w) => {
            const isSelected = myChoice === w.id;
            return (
              <button
                key={w.id}
                disabled={phase !== "picking"}
                onClick={() => pickWeapon(w.id as WeaponId)}
                className={cn(
                  "relative flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 active:scale-90",
                  isSelected
                    ? "border-neon-teal bg-neon-teal/20 shadow-neon-teal scale-110 z-10"
                    : "border-white/10 bg-white/5 hover:bg-white/10 opacity-70",
                  phase === "revealing" && !isSelected && "opacity-30 grayscale"
                )}
              >
                <span className="text-3xl">{w.icon}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink">{w.label}</span>
              </button>
            )
          })}
        </div>

        {/* Players Area */}
        <div className="mt-4 flex-1">
          <h3 className="mb-4 font-display text-xs uppercase tracking-[0.2em] text-muted text-center border-b border-white/10 pb-2">
            {phase === "picking" ? "Combatants" : "Round Results"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {players
                .map((p) => {
                  const pKey = rtdbKey(p.uid);
                  return { ...p, score: scores[pKey] || 0, choice: choices[pKey] };
                })
                .sort((a, b) => b.score - a.score)
                .map((p) => {
                  const itsMe = p.uid === uid;
                  const pKey = rtdbKey(p.uid);
                  const theirChoice = p.choice;
                  const hasPicked = Boolean(theirChoice);
                  
                  let delta = 0;
                  if (phase === "revealing" && myChoice && theirChoice && !itsMe) {
                    delta = getScoreDelta(myChoice, theirChoice);
                  }

                  const weaponIcon = WEAPONS.find(w => w.id === theirChoice)?.icon;

                  return (
                    <motion.layout
                      key={p.uid}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "glass relative flex flex-col items-center gap-2 p-3 transition",
                        itsMe && "ring-1 ring-neon-teal/50"
                      )}
                    >
                      <div className="relative">
                        <Avatar name={p.name} photoUrl={p.photoUrl} size={48} ring={itsMe ? "teal" : undefined} />
                        
                        {phase === "picking" && hasPicked && (
                          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-neon-teal text-[10px]">
                            ✓
                          </div>
                        )}

                        {phase === "revealing" && weaponIcon && (
                          <motion.div 
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-vice-night border border-white/20 text-lg shadow-lg"
                          >
                            {weaponIcon}
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="text-center w-full">
                        <p className="max-w-full truncate text-xs font-semibold text-ink">
                          {p.name} {itsMe && <span className="text-[10px] text-neon-teal">(You)</span>}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-muted">
                          Score: <span className="text-ink font-bold">{p.score}</span>
                        </p>
                      </div>

                      {/* Score Delta Indicator during reveal */}
                      {phase === "revealing" && !itsMe && delta !== 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            delta > 0 ? "bg-neon-teal/20 text-neon-teal" : "bg-neon-pink/20 text-neon-pink"
                          )}
                        >
                          {delta > 0 ? `Won` : `Lost`}
                        </motion.div>
                      )}
                    </motion.layout>
                  );
                })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
