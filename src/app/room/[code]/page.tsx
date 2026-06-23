"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { LiveCanvas } from "@/components/canvas/LiveCanvas";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useUser } from "@/lib/hooks/useUser";
import { useRoom } from "@/lib/hooks/useRoom";
import { kickPlayer, leaveRoom } from "@/lib/rooms/roomService";
import type { GameType } from "@/lib/types";
import type { RoleComposition } from "@/games/mafia/setup";

const GAME_NAME: Record<GameType, string> = {
  mafia: "Mafia",
  uno: "UNO",
  "word-guesser": "Word Guesser",
};

export default function RoomPage() {
  useRequireAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { profile } = useUser();
  const uid = profile?.email ?? null;
  const { room, players, me, host, exists } = useRoom(code, uid, profile);

  const [showCanvas, setShowCanvas] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showKick, setShowKick] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isHost = me?.isHost ?? false;
  const canStart = Boolean(room && players.length >= 4);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function handleLeave() {
    if (!uid || leaving) return;
    setLeaving(true);
    await leaveRoom(code, uid, isHost);
    router.replace("/home");
  }

  const [starting, setStarting] = useState(false);

  async function handleStart() {
    if (!room?.gameType || starting) return;
    if (room.gameType === "mafia") {
      setShowSettings(true);
    } else {
      setStarting(true);
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      if (db) await updateDoc(doc(db, "rooms", code), { status: "playing" });
    }
  }

  async function confirmStart(composition: RoleComposition) {
    if (!uid || !room) return;
    if (room.gameType === "mafia") {
      const { startMafiaGame } = await import("@/games/mafia/mafiaService");
      await startMafiaGame(code, uid, players, composition);
    }
    const { doc, updateDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    if (db) await updateDoc(doc(db, "rooms", code), { status: "playing" });
  }

  useEffect(() => {
    if (room?.gameType) {
      router.prefetch(`/play/${code}/${room.gameType}`);
    }
    if (room?.status === "playing" && room.gameType) {
      router.push(`/play/${code}/${room.gameType}`);
    }
  }, [room?.status, room?.gameType, code, router]);

  if (exists === false) {
    return (
      <>
        <GradientBackdrop />
        <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-3xl uppercase text-ink neon-text">
            Room not found
          </h1>
          <p className="mt-2 text-sm text-muted">
            Double-check the 4-digit code with the host.
          </p>
          <NeonButton variant="pink" className="mt-6" onClick={() => router.replace("/home")}>
            Back home
          </NeonButton>
        </main>
      </>
    );
  }

  if (!room || !me) {
    return (
      <>
        <GradientBackdrop />
        <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center">
          <p className="text-sm text-muted">Joining room…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <GradientBackdrop />
      <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="flex items-center gap-1 text-sm text-muted active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Leave
          </button>
          <button onClick={copyCode} className="flex flex-col items-center">
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted">Room Code</span>
            <span className="font-display text-2xl tracking-[0.4em] text-neon-pink neon-text">{code}</span>
          </button>
          <span className="w-12 text-right font-display text-xs text-neon-teal">
            {copied ? "Copied!" : `${players.length}👥`}
          </span>
        </div>

        {/* Game + waiting info */}
        <div className="px-5 pb-2">
          <GlassPanel glow="teal" className="flex items-center justify-between py-3">
            <div>
              <p className="font-display text-lg uppercase text-ink">
                {room.gameType ? GAME_NAME[room.gameType] : "Game Night"}
              </p>
              <p className="text-xs text-muted">{isHost ? "You're the host" : `Host: ${host?.name ?? "—"}`}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCanvas((s) => !s)}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold uppercase text-ink active:scale-95"
              >
                {showCanvas ? "Players" : "Canvas"}
              </button>
              {isHost && (
                <button
                  onClick={() => setShowKick(true)}
                  className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold uppercase text-neon-pink active:scale-95"
                >
                  Manage
                </button>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Main area: players grid or canvas */}
        <div className="relative flex-1 overflow-hidden px-5 pb-3">
          {showCanvas ? (
            <div className="h-full overflow-hidden rounded-3xl border border-white/10">
              <LiveCanvas code={code} enabled={room.status === "waiting"} />
            </div>
          ) : (
            <div className="grid h-full grid-cols-2 content-start gap-3 overflow-y-auto pb-4">
              <div className="col-span-2 mb-1 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
                Players · {players.length}
              </div>
              {players.map((p) => {
                const itsMe = p.uid === uid;
                return (
                  <motion.div
                    key={p.uid}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass flex flex-col items-center gap-1 p-3"
                  >
                    <div className="relative">
                      <Avatar name={p.name} photoUrl={p.photoUrl} size={56} ring={p.isHost ? "pink" : "teal"} />
                      {!p.isOnline && (
                        <span className="absolute -right-1 bottom-1 h-3 w-3 rounded-full border-2 border-vice-night bg-muted" />
                      )}
                    </div>
                    <p className="max-w-full truncate text-sm font-semibold text-ink">
                      {p.name}
                      {itsMe && <span className="ml-1 text-[10px] text-neon-teal">you</span>}
                    </p>
                    <div className="flex gap-1 text-[9px] uppercase tracking-wider text-muted">
                      {p.isHost && <span className="text-neon-pink">Host</span>}
                      {p.isSpectator && <span className="text-neon-orange">Watching</span>}
                    </div>
                  </motion.div>
                );
              })}

              {players.length < 4 && (
                <div className="col-span-2 glass flex flex-col items-center justify-center gap-1 border-dashed py-6 text-center">
                  <p className="font-display text-sm uppercase text-ink">Need more cousins</p>
                  <p className="text-xs text-muted">Minimum 4 to start. Share the code!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Start button (host only) */}
        <div className="border-t border-white/10 bg-vice-night/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          {isHost ? (
            <NeonButton variant="pink" size="lg" fullWidth glow disabled={!canStart || starting} onClick={handleStart}>
              {starting ? "Starting..." : canStart ? `Start ${room.gameType ? GAME_NAME[room.gameType] : "Game"} →` : `Need ${4 - players.length} more`}
            </NeonButton>
          ) : (
            <p className="text-center text-sm text-muted">
              Waiting for <span className="font-bold text-neon-pink">{host?.name}</span> to start the game…
            </p>
          )}
        </div>
      </main>

      {/* Kick / manage modal */}
      <AnimatePresence>
        {showKick && (
          <KickModal
            players={players}
            selfUid={uid ?? ""}
            onClose={() => setShowKick(false)}
            onKick={async (targetUid) => {
              await kickPlayer(code, targetUid);
            }}
          />
        )}
        {showSettings && (
          <SettingsModal
            playerCount={players.filter((p) => !p.isSpectator).length}
            onClose={() => setShowSettings(false)}
            onConfirm={(comp) => confirmStart(comp)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function KickModal({
  players,
  selfUid,
  onClose,
  onKick,
}: {
  players: { uid: string; name: string; photoUrl: string | null; isHost: boolean }[];
  selfUid: string;
  onClose: () => void;
  onKick: (uid: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md rounded-t-4xl rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        <h3 className="mb-3 font-display text-lg uppercase text-ink">Manage Players</h3>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {players
            .filter((p) => p.uid !== selfUid)
            .map((p) => (
              <div key={p.uid} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2">
                <Avatar name={p.name} photoUrl={p.photoUrl} size={40} />
                <span className="flex-1 truncate text-ink">{p.name}</span>
                <NeonButton variant="danger" size="sm" onClick={() => onKick(p.uid)}>
                  Kick
                </NeonButton>
              </div>
            ))}
          {players.length <= 1 && (
            <p className="py-4 text-center text-sm text-muted">No one else to manage.</p>
          )}
        </div>
        <NeonButton variant="ghost" fullWidth className="mt-4" onClick={onClose}>
          Done
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}

function SettingsModal({
  playerCount,
  onClose,
  onConfirm,
}: {
  playerCount: number;
  onClose: () => void;
  onConfirm: (comp: RoleComposition) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [mafia, setMafia] = useState(playerCount >= 9 ? 3 : playerCount >= 6 ? 2 : 1);
  const [doctor, setDoctor] = useState(1);
  const [detective, setDetective] = useState(1);
  const [sheriff, setSheriff] = useState(playerCount >= 6 ? 1 : 0);
  const [jester, setJester] = useState(playerCount >= 6 ? 1 : 0);

  const specialCount = mafia + doctor + detective + sheriff + jester;
  const civCount = playerCount - specialCount;
  const valid = civCount >= 0;

  function RoleCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md rounded-t-4xl rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        <h3 className="mb-1 font-display text-lg uppercase text-ink">Role Settings</h3>
        <p className="mb-4 text-sm text-muted">Total players: {playerCount}</p>
        
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pb-4">
          <RoleCounter label="Mafia" value={mafia} onChange={setMafia} />
          <RoleCounter label="Doctor" value={doctor} onChange={setDoctor} />
          <RoleCounter label="Detective" value={detective} onChange={setDetective} />
          <RoleCounter label="Sheriff" value={sheriff} onChange={setSheriff} />
          <RoleCounter label="Jester" value={jester} onChange={setJester} />
          
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-3 opacity-50">
            <span className="font-display text-sm uppercase text-ink">Civilians</span>
            <span className="w-4 text-center font-bold text-ink">{civCount}</span>
          </div>
          {!valid && <p className="text-center text-sm text-neon-pink mt-2">Too many special roles!</p>}
        </div>
        <div className="flex gap-3">
          <NeonButton variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </NeonButton>
          <NeonButton
            variant="pink"
            className="flex-1"
            glow
            disabled={!valid || loading}
            onClick={async () => {
              setLoading(true);
              await onConfirm({ mafia, doctor, detective, sheriff, jester });
            }}
          >
            {loading ? "Starting..." : "Start Game"}
          </NeonButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
