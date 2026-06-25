"use client";

import { useEffect, useState, useRef } from "react";
import { ref, onValue, set, runTransaction, off } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { rtdbKey } from "@/lib/rtdbKey";
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

  let myRoundDelta = 0;
  if (phase === "revealing" && myChoice) {
    Object.entries(choices).forEach(([otherUid, otherChoice]) => {
      if (otherUid !== uidKey) {
        myRoundDelta += getScoreDelta(myChoice, otherChoice);
      }
    });
  }

  const circumference = 2 * Math.PI * 46;
  const progress = phase === "picking" 
    ? 1 - (elapsedInRound / PICK_DURATION)
    : 1 - ((elapsedInRound - PICK_DURATION) / (ROUND_DURATION - PICK_DURATION));
  const strokeDashoffset = circumference - progress * circumference;

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

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 no-scrollbar">
        
        {/* Timer & Status */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" className="stroke-white/10" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke="currentColor" strokeWidth="6"
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-300 ease-linear",
                  timeLeft <= 3 ? "text-neon-pink" : "text-neon-teal"
                )}
                style={{ strokeDasharray: circumference, strokeDashoffset }}
              />
            </svg>
            <motion.div 
              key={timeLeft}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-vice-night/60 shadow-inner backdrop-blur-sm"
            >
              <span className={cn(
                "font-display text-5xl",
                timeLeft <= 3 ? "text-neon-pink animate-pulse" : "text-neon-teal"
              )}>
                {timeLeft}
              </span>
            </motion.div>
          </div>
          <p className={cn(
            "font-display text-sm uppercase tracking-widest mt-2",
            phase === "revealing" ? "text-neon-teal" : "text-ink"
          )}>
            {phase === "picking" ? "Pick your weapon!" : "Results!"}
          </p>
        </div>

        {/* Dynamic Results Banner */}
        <div className="h-10">
          <AnimatePresence>
            {phase === "revealing" && myChoice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center"
              >
                <div className={cn(
                  "rounded-full px-6 py-2 border-2 shadow-lg",
                  myRoundDelta > 0 ? "border-neon-teal bg-neon-teal/10 shadow-neon-teal/20 text-neon-teal" :
                  myRoundDelta < 0 ? "border-neon-pink bg-neon-pink/10 shadow-neon-pink/20 text-neon-pink" :
                  "border-white/20 bg-white/5 text-ink"
                )}>
                  <span className="font-display text-sm uppercase tracking-widest">
                    {myRoundDelta > 0 ? `Won ${myRoundDelta} Points!` : myRoundDelta < 0 ? `Lost ${Math.abs(myRoundDelta)} Points` : "Draw"}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                  "relative flex h-24 w-24 flex-col items-center justify-center rounded-3xl border-2 transition-all duration-300",
                  isSelected
                    ? "border-neon-teal bg-neon-teal/20 shadow-[0_0_20px_rgba(31,224,216,0.4)] scale-110 z-10"
                    : "border-white/10 bg-white/5 hover:bg-white/10 opacity-80 active:scale-95",
                  phase === "revealing" && !isSelected && "opacity-30 grayscale scale-95"
                )}
              >
                <span className={cn("text-4xl transition-transform", isSelected && "scale-110")}>{w.icon}</span>
                <span className="mt-2 text-[11px] font-bold uppercase tracking-wider text-ink">{w.label}</span>
                
                {isSelected && phase === "picking" && (
                  <span className="absolute -bottom-3 rounded-full bg-neon-teal px-3 py-1 text-[9px] font-black uppercase tracking-widest text-black shadow-[0_0_10px_rgba(31,224,216,0.5)]">
                    Selected
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Players Area */}
        <div className="mt-4 flex-1 pb-10">
          <h3 className="mb-4 font-display text-xs uppercase tracking-[0.2em] text-muted text-center border-b border-white/10 pb-2">
            {phase === "picking" ? "Combatants" : "Round Results"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {players
                .map((p) => {
                  const pKey = rtdbKey(p.uid);
                  return { ...p, score: scores[pKey] || 0, choice: choices[pKey] };
                })
                .sort((a, b) => b.score - a.score)
                .map((p) => {
                  const itsMe = p.uid === uid;
                  const theirChoice = p.choice;
                  const hasPicked = Boolean(theirChoice);
                  
                  let delta = 0;
                  if (phase === "revealing" && myChoice && theirChoice && !itsMe) {
                    delta = getScoreDelta(myChoice, theirChoice);
                  }

                  const weaponIcon = WEAPONS.find(w => w.id === theirChoice)?.icon;

                  return (
                    <motion.div
                      key={p.uid}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "glass relative flex flex-col items-center gap-3 p-4 transition duration-300",
                        itsMe && "ring-2 ring-neon-teal/50 bg-white/10",
                        phase === "revealing" && delta > 0 && "ring-1 ring-neon-teal shadow-[0_0_15px_rgba(31,224,216,0.15)]",
                        phase === "revealing" && delta < 0 && "ring-1 ring-neon-pink shadow-[0_0_15px_rgba(255,45,123,0.15)]"
                      )}
                    >
                      <div className="relative">
                        <Avatar name={p.name} photoUrl={p.photoUrl} size={56} ring={itsMe ? "teal" : undefined} />
                        
                        {phase === "picking" && hasPicked && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-neon-teal text-xs text-black border-2 border-vice-night shadow-md"
                          >
                            ✓
                          </motion.div>
                        )}

                        {phase === "revealing" && weaponIcon && (
                          <motion.div 
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", bounce: 0.6 }}
                            className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-vice-night border-2 border-white/20 text-xl shadow-xl z-10"
                          >
                            {weaponIcon}
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="text-center w-full mt-2">
                        <p className="max-w-full truncate text-sm font-bold text-ink">
                          {p.name} {itsMe && <span className="text-[10px] text-neon-teal ml-1">(You)</span>}
                        </p>
                        <p className="text-[11px] uppercase tracking-widest text-muted mt-1">
                          Score: <span className="text-ink font-black text-sm">{p.score}</span>
                        </p>
                      </div>

                      {/* Score Delta Indicator during reveal */}
                      {phase === "revealing" && !itsMe && delta !== 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn(
                            "absolute top-2 right-2 text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                            delta > 0 ? "border-neon-teal bg-neon-teal/20 text-neon-teal shadow-sm shadow-neon-teal/20" : 
                                        "border-neon-pink bg-neon-pink/20 text-neon-pink shadow-sm shadow-neon-pink/20"
                          )}
                        >
                          {delta > 0 ? `Won` : `Lost`}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
