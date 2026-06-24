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
            <NarrationScreen
              accent="teal"
              label="Dawn Breaks"
              narration={state.lastNightNarration ?? ""}
              onContinue={() => dispatch({ type: "NEXT_ROUND", ...(state.round === 1 ? {} : {}) })}
              continueLabel="Begin Day Vote"
              nextPhase="vote"
              dispatch={dispatch}
            />
          )}
          {state.phase === "vote" && <VoteScreen state={state} dispatch={dispatch} />}
          {state.phase === "day-results" && (
            <NarrationScreen
              accent="pink"
              label="Verdict"
              narration={state.lastDayNarration ?? ""}
              onContinue={() => dispatch({ type: "NEXT_ROUND" })}
              continueLabel="Next Night"
              nextPhase="moderator"
              dispatch={dispatch}
            />
          )}
          {state.phase === "ended" && <LocalEndScreen state={state} onRestart={() => dispatch({ type: "RESET" })} />}
        </motion.div>
    </>
  );
}

/* ---------------- Setup ---------------- */
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

/* ---------------- Reveal (pass around) ---------------- */
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

/* ---------------- Moderator (records night) ---------------- */
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
  const detective = living.find((p) => p.role === "detective");

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
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <div className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-teal neon-text-teal">
          Moderator · Night {state.round}
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase text-ink">What happened?</h2>
        <p className="mt-1 text-sm text-muted">Tap the outcomes. The app handles the rest.</p>
      </div>

      <ModSection label="Who did the Mafia kill?">
        <Picker players={living} selected={killed} onSelect={setKilled} allowNone />
      </ModSection>

      <ModSection label="Who did the Doctor save?">
        <Picker players={living} selected={saved} onSelect={setSaved} allowNone />
      </ModSection>

      {detective && (
        <ModSection label="Who did the Detective check?">
          <Picker players={living} selected={check} onSelect={setCheck} allowNone />
        </ModSection>
      )}

      <NeonButton variant="teal" size="lg" fullWidth glow onClick={confirm}>
        Resolve Night →
      </NeonButton>

      <RoleDashboard players={state.players} />
    </main>
  );
}

/* ---------------- Day Vote ---------------- */
function VoteScreen({
  state,
  dispatch,
}: {
  state: ReturnType<typeof initLocalMafia>;
  dispatch: React.Dispatch<Parameters<typeof localMafiaReducer>[1]>;
}) {
  const [votedOut, setVotedOut] = useState<string | null>(null);
  const [tie, setTie] = useState(false);
  const living = state.players.filter((p) => p.alive);

  function confirm() {
    dispatch({ type: "SET_VOTE", eliminatedUid: votedOut ?? undefined, tie });
    dispatch({ type: "RESOLVE_VOTE" });
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <div className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-pink neon-text">
          Day {state.round} · Vote
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase text-ink">Who&apos;s out?</h2>
      </div>

      <ModSection label="Voted out (tap the player)">
        <Picker
          players={living}
          selected={votedOut}
          onSelect={(uid) => {
            setVotedOut(uid);
            setTie(false);
          }}
          allowNone
        />
      </ModSection>

      <button
        onClick={() => {
          setTie(true);
          setVotedOut(null);
        }}
        className={cn(
          "w-full rounded-2xl border-2 p-3 text-center font-display uppercase text-sm transition",
          tie ? "border-neon-orange bg-neon-orange/10 text-neon-orange" : "border-white/15 text-muted",
        )}
      >
        It was a tie (nobody out)
      </button>

      <NeonButton variant="pink" size="lg" fullWidth glow onClick={confirm}>
        Resolve Vote →
      </NeonButton>

      <RoleDashboard players={state.players} />
    </main>
  );
}

/* ---------------- Narration ---------------- */
function NarrationScreen({
  accent,
  label,
  narration,
  onContinue,
  continueLabel,
}: {
  accent: "pink" | "teal";
  label: string;
  narration: string;
  onContinue: () => void;
  continueLabel: string;
  nextPhase: string;
  dispatch: React.Dispatch<Parameters<typeof localMafiaReducer>[1]>;
}) {
  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <div className="text-center">
        <p
          className={cn(
            "font-display text-xs uppercase tracking-[0.4em]",
            accent === "pink" ? "text-neon-pink neon-text" : "text-neon-teal neon-text-teal",
          )}
        >
          {label}
        </p>
      </div>
      <GlassPanel glow={accent} className="text-center">
        <p className="text-sm leading-relaxed text-ink">{narration}</p>
      </GlassPanel>
      <NeonButton
        variant={accent === "pink" ? "pink" : "teal"}
        size="lg"
        fullWidth
        glow
        onClick={onContinue}
      >
        {continueLabel} →
      </NeonButton>
    </main>
  );
}

/* ---------------- End ---------------- */
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

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <div className="text-center">
        <p className="font-display text-5xl uppercase gradient-title">
          Game Over
        </p>
        <p className="mt-2 font-display text-lg uppercase text-neon-orange neon-text">
          {winnerLabel}
        </p>
        <p className="mt-1 text-sm text-muted">{win.reason}</p>
      </div>

      <div>
        <h3 className="mb-2 px-1 font-display text-xs uppercase tracking-[0.3em] text-neon-pink">
          Winners
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {winners.map((p) => (
            <GlassPanel key={p.uid} glow="pink" className="flex flex-col items-center gap-1 py-3">
              <Avatar name={p.name} photoUrl={p.photoUrl} size={56} ring="pink" />
              <p className="text-center font-display uppercase text-ink">{p.name}</p>
              <span className="text-[10px] uppercase text-muted">{ROLE_META[p.role].label}</span>
            </GlassPanel>
          ))}
        </div>
      </div>

      {losers.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
            The Rest
          </h3>
          <div className="space-y-2">
            {losers.map((p) => (
              <GlassPanel key={p.uid} className="flex items-center gap-3">
                <Avatar name={p.name} photoUrl={p.photoUrl} size={36} />
                <span className="flex-1 truncate text-ink">{p.name}</span>
                <span className="text-[10px] uppercase text-muted">{ROLE_META[p.role].label}</span>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      <NeonButton variant="teal" fullWidth onClick={onRestart}>
        Play Again
      </NeonButton>
    </main>
  );
}

/* ---------------- Shared bits ---------------- */
function ModSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-1 font-display text-[11px] uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  );
}

function Picker({
  players,
  selected,
  onSelect,
  allowNone,
}: {
  players: MafiaPlayerLite[];
  selected: string | null;
  onSelect: (uid: string | null) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => {
        const active = selected === p.uid;
        return (
          <button
            key={p.uid}
            onClick={() => onSelect(active && allowNone ? null : p.uid)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border-2 px-3 py-2 transition",
              active ? "border-neon-pink bg-neon-pink/10" : "border-white/10",
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
