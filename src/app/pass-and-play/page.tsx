"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { BackHeader } from "@/components/nav/BackHeader";
import { RoleRevealCard } from "@/components/role-reveal/RoleRevealCard";
import {
  initLocalMafia,
  localMafiaReducer,
} from "@/games/mafia/localReducer";
import { ROLE_META } from "@/games/mafia/types";
import { type RoleComposition } from "@/games/mafia/setup";
import { cn } from "@/lib/cn";

export default function PassAndPlayPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(localMafiaReducer, undefined, initLocalMafia);

  return (
    <>
      <GradientBackdrop />
      {state.phase !== "reveal" && (
        <BackHeader
          title="Pass & Play · Mafia"
          onBack={() =>
            state.phase === "setup" || state.phase === "ended"
              ? router.replace("/home")
              : dispatch({ type: "RESET" })
          }
        />
      )}
      <motion.div
        key={state.phase + state.round}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative flex-1 flex flex-col min-h-[100dvh]"
      >
          {state.phase === "setup" && <SetupScreen onStart={(p, c) => dispatch({ type: "START", players: p, composition: c })} />}
          {state.phase === "reveal" && (
            <RevealScreenLocal
              key={state.revealIndex}
              players={state.players}
              index={state.revealIndex}
              onNext={() => dispatch({ type: "REVEAL_NEXT" })}
              onDone={() => dispatch({ type: "REVEAL_DONE" })}
            />
          )}
          {state.phase === "moderator" && (
            <ModeratorScreen
              state={state}
              dispatch={dispatch}
            />
          )}
          {state.phase === "night-results" && (
            <NightResultsLocal
              state={state}
              onContinue={() => dispatch({ type: "START_DAY_VOTE" })}
            />
          )}
          {state.phase === "vote" && <VoteScreen state={state} dispatch={dispatch} />}
          {state.phase === "day-results" && (
            <DayResultsLocal
              state={state}
              onContinue={() => dispatch({ type: "NEXT_ROUND" })}
            />
          )}
          {state.phase === "ended" && <LocalEndScreen state={state} onRestart={() => dispatch({ type: "RESET" })} />}
        </motion.div>
    </>
  );
}

/* ================================================================
   Setup
   ================================================================ */
function SetupScreen({ onStart }: { onStart: (players: { name: string; photoUrl: string | null }[], composition: RoleComposition) => void }) {
  const [players, setPlayers] = useState<{name: string, photoUrl: string | null}[]>([
    {name: "", photoUrl: null},
    {name: "", photoUrl: null},
    {name: "", photoUrl: null},
    {name: "", photoUrl: null},
  ]);
  const [error, setError] = useState<string | null>(null);
  
  const [roles, setRoles] = useState({
    mafia: 1,
    doctor: 1,
    detective: 1,
    sheriff: 0,
    jester: 0,
  });

  function updateName(i: number, v: string) {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: v } : p)));
  }

  function handlePhoto(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, photoUrl: url } : p)));
    };
    reader.readAsDataURL(file);
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, {name: "", photoUrl: null}]);
  }
  function removePlayer(i: number) {
    setPlayers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function handleStart() {
    const valid = players.filter(p => p.name.trim() !== "");
    if (valid.length < 4) return setError("Need at least 4 players.");
    if (new Set(valid.map((p) => p.name.toLowerCase())).size !== valid.length) {
      return setError("Player names must be unique.");
    }
    
    const specialCount = roles.mafia + roles.doctor + roles.detective + roles.sheriff + roles.jester;
    const civCount = valid.length - specialCount;
    if (civCount < 0) {
      return setError("Too many special roles for this player count!");
    }

    setError(null);
    onStart(valid.map(p => ({name: p.name.trim(), photoUrl: p.photoUrl})), roles);
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <GlassPanel className="space-y-3">
        <h2 className="font-display text-lg uppercase text-ink">Add Players</h2>
        <p className="-mt-2 text-xs text-muted">
          Pass the phone around so everyone enters their name and photo.
        </p>
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative">
              <Avatar name={p.name || "?"} photoUrl={p.photoUrl} size={36} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(i, e)}
                className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <input
              value={p.name}
              onChange={(e) => updateName(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              className="flex-1 rounded-xl border border-white/15 bg-vice-night/60 px-3 py-2 text-ink outline-none focus:border-neon-teal"
            />
            {players.length > 4 && (
              <button onClick={() => removePlayer(i)} className="text-muted active:scale-90">
                ✕
              </button>
            )}
          </div>
        ))}
        <NeonButton variant="ghost" size="sm" fullWidth onClick={addPlayer} disabled={players.length >= 12}>
          + Add player
        </NeonButton>
      </GlassPanel>

      <GlassPanel className="space-y-3">
        <div className="mb-3 font-display text-xs uppercase tracking-[0.3em] text-muted">
          Role Settings
        </div>
        <div className="space-y-2">
          <RoleCounter label="Mafia" value={roles.mafia} onChange={(v) => setRoles(prev => ({...prev, mafia: v}))} />
          <RoleCounter label="Doctor" value={roles.doctor} onChange={(v) => setRoles(prev => ({...prev, doctor: v}))} />
          <RoleCounter label="Detective" value={roles.detective} onChange={(v) => setRoles(prev => ({...prev, detective: v}))} />
          <RoleCounter label="Sheriff" value={roles.sheriff} onChange={(v) => setRoles(prev => ({...prev, sheriff: v}))} />
          <RoleCounter label="Jester" value={roles.jester} onChange={(v) => setRoles(prev => ({...prev, jester: v}))} />
          
          {(() => {
            const specialCount = roles.mafia + roles.doctor + roles.detective + roles.sheriff + roles.jester;
            const civCount = players.length - specialCount;
            return (
              <>
                <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/5 p-3 opacity-50">
                  <span className="font-display text-sm uppercase text-ink">Civilians</span>
                  <span className="w-4 text-center font-bold text-ink">{civCount}</span>
                </div>
              </>
            );
          })()}
        </div>
      </GlassPanel>

      {error && <p className="text-center text-sm text-neon-pink neon-text">{error}</p>}

      <NeonButton variant="pink" size="lg" fullWidth glow onClick={handleStart}>
        Deal Roles →
      </NeonButton>
    </main>
  );
}

function RoleCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
      <span className="font-display text-sm uppercase text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 active:scale-95"
        >
          -
        </button>
        <span className="w-4 text-center font-bold text-ink">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Reveal (pass around)
   ================================================================ */
function RevealScreenLocal({
  players,
  index,
  onNext,
  onDone,
}: {
  players: { uid: string; name: string; photoUrl: string | null; role: keyof typeof ROLE_META }[];
  index: number;
  onNext: () => void;
  onDone: () => void;
}) {
  const player = players[index];
  const role = ROLE_META[player.role];
  const isLast = index === players.length - 1;

  return (
    <RoleRevealCard
      name={player.name}
      photoUrl={player.photoUrl}
      hidden={role.label}
      hiddenAccent={role.color as "pink" | "teal" | "orange"}
      hiddenSub={role.description}
      prompt={`Pass to ${player.name} · drag up`}
      onContinue={isLast ? onDone : onNext}
    />
  );
}

/* ================================================================
   Moderator (records night) — styled like the online Night Phase
   ================================================================ */
function ModeratorScreen({
  state,
  dispatch,
}: {
  state: ReturnType<typeof initLocalMafia>;
  dispatch: React.Dispatch<Parameters<typeof localMafiaReducer>[1]>;
}) {
  const [killed, setKilled] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [check, setCheck] = useState<string | null>(null);

  const living = state.players.filter((p) => p.alive);
  const doctor = living.find((p) => p.role === "doctor");
  const detective = living.find((p) => p.role === "detective");
  const previousSave = state.previousSaveUid;

  function confirm() {
    dispatch({
      type: "SET_NIGHT",
      payload: {
        killedUid: killed ?? undefined,
        savedUid: saved ?? undefined,
        detectiveCheckUid: check ?? undefined,
      },
    });
    dispatch({ type: "RESOLVE_NIGHT" });
  }

  return (
    <main className="mx-auto w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar">
      {/* Phase header */}
      <div className="mb-5 text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-teal neon-text-teal">
          Night Phase
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase text-ink">
          Night {state.round}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Record what happened in the dark. The app handles the rest.
        </p>
      </div>

      <div className="space-y-4">
        {/* Mafia Kill */}
        <GlassPanel glow="pink">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔪</span>
            <p className="font-display text-[11px] uppercase tracking-wider text-neon-pink">
              Mafia Kill
            </p>
          </div>
          <p className="mb-3 text-xs text-muted">Who did the Mafia choose to eliminate?</p>
          <Picker players={living} selected={killed} onSelect={setKilled} allowNone accent="pink" />
        </GlassPanel>

        {/* Doctor Save */}
        {doctor && (
          <GlassPanel glow="teal">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💊</span>
              <p className="font-display text-[11px] uppercase tracking-wider text-neon-teal">
                Doctor Save
              </p>
            </div>
            {previousSave && (
              <p className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-muted">
                Saved <span className="font-bold text-ink">{state.players.find((p) => p.uid === previousSave)?.name}</span> last night — can&apos;t pick them again.
              </p>
            )}
            <p className="mb-3 text-xs text-muted">Who did the Doctor protect?</p>
            <Picker
              players={living}
              selected={saved}
              onSelect={setSaved}
              allowNone
              accent="teal"
              disabledUids={previousSave ? [previousSave] : []}
            />
          </GlassPanel>
        )}

        {/* Detective Check */}
        {detective && (
          <GlassPanel>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🕵️</span>
              <p className="font-display text-[11px] uppercase tracking-wider text-muted">
                Detective Check
              </p>
            </div>
            <p className="mb-3 text-xs text-muted">Who did the Detective investigate?</p>
            <Picker players={living} selected={check} onSelect={setCheck} allowNone accent="teal" />
          </GlassPanel>
        )}

        <NeonButton variant="pink" size="lg" fullWidth glow onClick={confirm}>
          Resolve Night →
        </NeonButton>
      </div>

      <RoleDashboard players={state.players} />
    </main>
  );
}

/* ================================================================
   Night Results — dramatic narration with avatars
   ================================================================ */
function NightResultsLocal({
  state,
  onContinue,
}: {
  state: ReturnType<typeof initLocalMafia>;
  onContinue: () => void;
}) {
  const narrationParts = (state.lastNightNarration ?? "").split(". ").filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar">
      <div className="mb-5 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
        >
          <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-teal neon-text-teal">
            Dawn Breaks
          </p>
          <h2 className="mt-1 font-display text-2xl uppercase text-ink">
            Night Recap
          </h2>
        </motion.div>
      </div>

      <div className="space-y-3">
        {narrationParts.map((line, i) => {
          // Find if this line mentions a player
          const mentionedPlayer = [...state.players].find(p => line.includes(p.name));
          const isDeath = line.includes("eliminated");
          const isSave = line.includes("saved");
          const isDetective = line.includes("Detective");

          const color = isDeath ? "pink" : isSave ? "teal" : isDetective ? "teal" : "teal";
          const borderColor = {
            pink: "border-neon-pink/30",
            teal: "border-neon-teal/30",
            orange: "border-neon-orange/30",
          }[color];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.3 }}
              className={`glass ${borderColor} p-4`}
            >
              <div className="flex items-start gap-3">
                {mentionedPlayer && (
                  <div className="flex-shrink-0 pt-0.5">
                    <Avatar
                      name={mentionedPlayer.name}
                      photoUrl={mentionedPlayer.photoUrl}
                      size={32}
                      ring={isDeath ? "pink" : "teal"}
                    />
                  </div>
                )}
                <p className="text-sm leading-relaxed text-muted">
                  {line.endsWith(".") ? line : line + "."}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <NeonButton variant="teal" size="lg" fullWidth glow className="mt-5" onClick={onContinue}>
        Begin Day Vote →
      </NeonButton>
    </main>
  );
}

/* ================================================================
   Day Vote — styled like the online DayScreen
   ================================================================ */
function VoteScreen({
  state,
  dispatch,
}: {
  state: ReturnType<typeof initLocalMafia>;
  dispatch: React.Dispatch<Parameters<typeof localMafiaReducer>[1]>;
}) {
  const [votedOut, setVotedOut] = useState<string | null>(null);
  const [tie, setTie] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ uid: string; name: string; photoUrl: string | null } | null>(null);
  const living = state.players.filter((p) => p.alive);

  function confirm() {
    dispatch({ type: "SET_VOTE", eliminatedUid: votedOut ?? undefined, tie });
    dispatch({ type: "RESOLVE_VOTE" });
  }

  return (
    <main className="mx-auto w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar">
      {/* Phase header */}
      <div className="mb-4 text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-pink neon-text">
          Day Phase
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase text-ink">
          Day {state.round} · Vote
        </h2>
        <p className="mt-1 text-sm text-muted">
          Discuss, accuse, then vote. A tie means nobody is eliminated.
        </p>
      </div>

      <div className="space-y-3">
        {/* Player picker */}
        <div>
          <p className="mb-2 px-1 font-display text-[11px] uppercase tracking-wider text-muted">
            Tap who the town voted out
          </p>
          <div className="grid grid-cols-3 gap-3">
            {living.map((p) => {
              const active = votedOut === p.uid;
              return (
                <motion.button
                  key={p.uid}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    setVotedOut(active ? null : p.uid);
                    setTie(false);
                    if (!active) {
                      setConfirmTarget({ uid: p.uid, name: p.name, photoUrl: p.photoUrl });
                    } else {
                      setConfirmTarget(null);
                    }
                  }}
                  className={cn(
                    "glass relative flex flex-col items-center gap-1.5 p-3 transition",
                    active && "border-neon-pink shadow-neon-pink",
                  )}
                >
                  <Avatar
                    name={p.name}
                    photoUrl={p.photoUrl}
                    size={56}
                    ring={active ? "pink" : "none"}
                  />
                  <span className="max-w-full truncate text-xs font-semibold text-ink">
                    {p.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            setTie(true);
            setVotedOut(null);
            setConfirmTarget(null);
          }}
          className={cn(
            "w-full rounded-2xl border-2 p-3 text-center font-display uppercase text-sm transition",
            tie ? "border-neon-orange bg-neon-orange/10 text-neon-orange" : "border-white/15 text-muted",
          )}
        >
          It was a tie (nobody out)
        </button>

        <NeonButton variant="pink" size="lg" fullWidth glow onClick={confirm} disabled={!votedOut && !tie}>
          Resolve Vote →
        </NeonButton>
      </div>

      <RoleDashboard players={state.players} />

      {/* Vote confirmation modal */}
      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col bg-vice-night"
          >
            <button
              onClick={() => { setConfirmTarget(null); setVotedOut(null); }}
              className="absolute left-5 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative flex-1 overflow-hidden">
              {confirmTarget.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={confirmTarget.photoUrl} alt={confirmTarget.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-vice-dusk to-vice-midnight">
                  <Avatar name={confirmTarget.name} photoUrl={null} size={140} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 text-center">
                <p className="font-display text-3xl uppercase text-ink neon-text">{confirmTarget.name}</p>
              </div>
            </div>

            <div className="bg-vice-night/95 px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2">
              <NeonButton
                variant="pink"
                size="lg"
                fullWidth
                glow
                onClick={() => {
                  setConfirmTarget(null);
                  confirm();
                }}
              >
                Vote out {confirmTarget.name}
              </NeonButton>
              <NeonButton
                variant="ghost"
                fullWidth
                onClick={() => { setConfirmTarget(null); setVotedOut(null); }}
              >
                Cancel
              </NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ================================================================
   Day Results — dramatic narration with role reveal
   ================================================================ */
function DayResultsLocal({
  state,
  onContinue,
}: {
  state: ReturnType<typeof initLocalMafia>;
  onContinue: () => void;
}) {
  const narrationParts = (state.lastDayNarration ?? "").split(". ").filter(Boolean);

  // Find the eliminated player for dramatic reveal
  const eliminatedPlayer = state.players.find(
    p => !p.alive && state.lastDayNarration?.includes(p.name)
  );

  return (
    <main className="mx-auto w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar">
      <div className="mb-5 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
        >
          <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-pink neon-text">
            Verdict
          </p>
          <h2 className="mt-1 font-display text-2xl uppercase text-ink">
            Vote Results
          </h2>
        </motion.div>
      </div>

      <div className="space-y-3">
        {/* If someone was voted out, show dramatic reveal */}
        {eliminatedPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GlassPanel glow="pink" className="flex flex-col items-center gap-3 py-5">
              <Avatar
                name={eliminatedPlayer.name}
                photoUrl={eliminatedPlayer.photoUrl}
                size={72}
                ring="pink"
              />
              <p className="font-display text-lg uppercase text-ink">
                {eliminatedPlayer.name}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: ROLE_META[eliminatedPlayer.role].color === "pink" ? "rgba(255,42,109,0.15)" : ROLE_META[eliminatedPlayer.role].color === "teal" ? "rgba(5,217,232,0.15)" : "rgba(255,123,0,0.15)",
                    color: ROLE_META[eliminatedPlayer.role].color === "pink" ? "#FF2A6D" : ROLE_META[eliminatedPlayer.role].color === "teal" ? "#05D9E8" : "#FF7B00",
                  }}
                >
                  {ROLE_META[eliminatedPlayer.role].label}
                </span>
                <span className="text-sm text-muted">
                  {eliminatedPlayer.role === "mafia" ? "💀 They were MAFIA" : "🕊️ They were NOT Mafia"}
                </span>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Narration lines */}
        {narrationParts.map((line, i) => {
          if (eliminatedPlayer && line.includes(eliminatedPlayer.name) && line.includes("voted out")) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (eliminatedPlayer ? 0.5 : 0) + i * 0.2 }}
              className="glass border-neon-pink/30 p-4"
            >
              <p className="text-sm leading-relaxed text-muted">
                {line.endsWith(".") ? line : line + "."}
              </p>
            </motion.div>
          );
        })}
      </div>

      <NeonButton variant="pink" size="lg" fullWidth glow className="mt-5" onClick={onContinue}>
        Next Night →
      </NeonButton>
    </main>
  );
}

/* ================================================================
   End Screen — matches online EndScreen quality
   ================================================================ */
function LocalEndScreen({
  state,
  onRestart,
}: {
  state: ReturnType<typeof initLocalMafia>;
  onRestart: () => void;
}) {
  const win = state.win!;
  const winners = state.players.filter((p) => win.results[p.uid] === "win");
  const losers = state.players.filter((p) => win.results[p.uid] !== "win");

  const winnerLabel =
    win.winner === "mafia" ? "Mafia Wins" : win.winner === "civilian" ? "Town Wins" : "Jester Wins";

  // Group losers by team
  const teams = ["mafia", "civilian", "neutral"] as const;
  const loserGroups = teams
    .map((t) => ({
      team: t,
      label: t === "mafia" ? "Mafia" : t === "civilian" ? "Town" : "Neutral",
      members: losers.filter((p) => ROLE_META[p.role].team === t),
    }))
    .filter((g) => g.members.length > 0);

  return (
    <main className="mx-auto w-full max-w-md overflow-y-auto px-5 py-4 pb-10 no-scrollbar">
      {/* Hero result */}
      <div className="mb-6 text-center">
        <motion.p
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="font-display text-5xl uppercase gradient-title"
        >
          Game Over
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 font-display text-lg uppercase text-neon-orange neon-text"
        >
          {winnerLabel}
        </motion.p>
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
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            <GlassPanel glow="pink" className="flex flex-col items-center gap-2 py-4">
              <Avatar name={p.name} photoUrl={p.photoUrl} size={72} ring="pink" />
              <p className="text-center font-display uppercase text-ink">{p.name}</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                {ROLE_META[p.role].label}
              </span>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* Losers grouped by team */}
      {loserGroups.map((group) => (
        <div key={group.team} className="mb-5">
          <h4 className="mb-2 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
            {group.label} Team
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

      {/* All roles reveal */}
      <RoleDashboard players={state.players} />

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2">
        <NeonButton variant="teal" fullWidth onClick={onRestart}>
          Play Again
        </NeonButton>
      </div>
    </main>
  );
}

/* ================================================================
   Shared UI components
   ================================================================ */
function Picker({
  players,
  selected,
  onSelect,
  allowNone,
  accent = "pink",
  disabledUids = [],
}: {
  players: MafiaPlayerLite[];
  selected: string | null;
  onSelect: (uid: string | null) => void;
  allowNone?: boolean;
  accent?: "pink" | "teal";
  disabledUids?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => {
        const active = selected === p.uid;
        const disabled = disabledUids.includes(p.uid);
        return (
          <button
            key={p.uid}
            disabled={disabled}
            onClick={() => onSelect(active && allowNone ? null : p.uid)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border-2 px-3 py-2 transition",
              active
                ? accent === "teal"
                  ? "border-neon-teal bg-neon-teal/10"
                  : "border-neon-pink bg-neon-pink/10"
                : "border-white/10",
              disabled && "opacity-30 grayscale cursor-not-allowed",
            )}
          >
            <Avatar name={p.name} photoUrl={p.photoUrl} size={28} />
            <span className="text-sm text-ink">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

type MafiaPlayerLite = { uid: string; name: string; photoUrl: string | null };

function RoleDashboard({ players }: { players: { uid: string; name: string; role: keyof typeof ROLE_META; alive: boolean; photoUrl: string | null }[] }) {
  return (
    <div className="mt-8 rounded-2xl bg-white/5 p-4">
      <h3 className="mb-3 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
        Player Roles Dashboard
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <div key={p.uid} className={cn("flex flex-col rounded-lg bg-vice-night/60 p-2 text-center border border-white/5", !p.alive && "opacity-40 grayscale")}>
             <span className="text-sm font-bold text-ink truncate">{p.name}</span>
             <span className="text-[10px] uppercase font-display tracking-widest mt-0.5" style={{ color: ROLE_META[p.role].color === "pink" ? "#FF2A6D" : ROLE_META[p.role].color === "teal" ? "#05D9E8" : "#FF7B00" }}>{ROLE_META[p.role].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
