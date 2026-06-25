"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { RockPaperScissors } from "@/components/games/rps/RockPaperScissors";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useUser } from "@/lib/hooks/useUser";
import { useRoom } from "@/lib/hooks/useRoom";
import { kickPlayer, leaveRoom } from "@/lib/rooms/roomService";
import { uploadProfilePhoto } from "@/lib/storage/uploadProfilePhoto";
import { doc, updateDoc } from "firebase/firestore";
import { ref, update } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { rtdbKey } from "@/lib/rtdbKey";
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

  const [fullScreenCanvas, setFullScreenCanvas] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKick, setShowKick] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const isHost = Boolean(room?.hostUid && uid === room.hostUid);
  const canStart = Boolean(room && players.length >= 4);

  const defaultRoles = {
    mafia: players.length >= 9 ? 3 : players.length >= 6 ? 2 : 1,
    doctor: 1,
    detective: 1,
    sheriff: players.length >= 6 ? 1 : 0,
    jester: players.length >= 6 ? 1 : 0,
  };
  const roles = (room?.settings?.roles as RoleComposition | undefined) ?? defaultRoles;

  async function updateRole(role: keyof RoleComposition, value: number) {
    if (!isHost || !db) return;
    await updateDoc(doc(db, "rooms", code), {
      "settings.roles": {
        ...roles,
        [role]: value,
      },
    });
  }

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

  async function handleStart() {
    if (!room?.gameType || starting || !canStart) return;
    setStarting(true);
    if (room.gameType === "mafia") {
      const { startMafiaGame } = await import("@/games/mafia/mafiaService");
      await startMafiaGame(code, uid!, players, roles);
    }
    if (db) await updateDoc(doc(db, "rooms", code), { status: "playing" });
  }

  useEffect(() => {
    if (room?.gameType) {
      router.prefetch(`/play/${code}/${room.gameType}`);
    }
    if (room?.status === "playing" && room.gameType) {
      router.push(`/play/${code}/${room.gameType}`);
      // Fallback: If router.push silently fails or stalls, force a hard navigation.
      const timer = setTimeout(() => {
        if (window.location.pathname.includes(`/room/`)) {
          window.location.assign(`/play/${code}/${room.gameType}`);
        }
      }, 1000);
      return () => clearTimeout(timer);
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
                onClick={() => setFullScreenCanvas(true)}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold uppercase text-ink active:scale-95"
              >
                Play RPS
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

        {/* Main area: players grid and roles */}
        <div className="relative flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          <div className="grid grid-cols-2 content-start gap-3">
            <div className="col-span-2 mb-1 flex items-center justify-between px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
              <span>Players · {players.length}</span>
            </div>
            {players.map((p) => {
              const itsMe = p.uid === uid;
              const pIsHost = p.uid === room?.hostUid;
              return (
                <motion.div
                  key={p.uid}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass relative flex flex-col items-center gap-1 p-3"
                >
                  {itsMe && (
                    <button
                      onClick={() => setShowEditProfile(true)}
                      className="absolute right-2 top-2 rounded-full bg-white/10 p-1.5 text-muted hover:text-white"
                      aria-label="Edit Profile"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  <div className="relative">
                    <Avatar name={p.name} photoUrl={p.photoUrl} size={56} ring={pIsHost ? "pink" : "teal"} />
                    {!p.isOnline && (
                      <span className="absolute -right-1 bottom-1 h-3 w-3 rounded-full border-2 border-vice-night bg-muted" />
                    )}
                  </div>
                  <p className="max-w-full truncate text-sm font-semibold text-ink">
                    {p.name}
                    {itsMe && <span className="ml-1 text-[10px] text-neon-teal">you</span>}
                  </p>
                  <div className="flex gap-1 text-[9px] uppercase tracking-wider text-muted">
                    {pIsHost && <span className="text-neon-pink">Host</span>}
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

          {room.gameType === "mafia" && (
            <div className="mt-6">
              <div className="mb-3 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
                Role Settings
              </div>
              <div className="space-y-2">
                <RoleCounter label="Mafia" value={roles.mafia} onChange={(v) => updateRole("mafia", v)} isHost={isHost} />
                <RoleCounter label="Doctor" value={roles.doctor} onChange={(v) => updateRole("doctor", v)} isHost={isHost} />
                <RoleCounter label="Detective" value={roles.detective} onChange={(v) => updateRole("detective", v)} isHost={isHost} />
                <RoleCounter label="Sheriff" value={roles.sheriff} onChange={(v) => updateRole("sheriff", v)} isHost={isHost} />
                <RoleCounter label="Jester" value={roles.jester} onChange={(v) => updateRole("jester", v)} isHost={isHost} />
                
                {(() => {
                  const specialCount = roles.mafia + roles.doctor + roles.detective + roles.sheriff + roles.jester;
                  const civCount = players.length - specialCount;
                  return (
                    <>
                      <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/5 p-3 opacity-50">
                        <span className="font-display text-sm uppercase text-ink">Civilians</span>
                        <span className="w-4 text-center font-bold text-ink">{civCount}</span>
                      </div>
                      {civCount < 0 && <p className="mt-2 text-center text-sm text-neon-pink">Too many special roles!</p>}
                    </>
                  );
                })()}
              </div>
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
      </AnimatePresence>

      {/* Full Screen RPS Modal */}
      <AnimatePresence>
        {fullScreenCanvas && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex flex-col bg-vice-night"
          >
            <div className="flex-1 overflow-hidden">
              <RockPaperScissors code={code} uid={uid ?? ""} players={players} onClose={() => setFullScreenCanvas(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && me && (
          <EditProfileModal
            player={me}
            code={code}
            onClose={() => setShowEditProfile(false)}
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

function RoleCounter({ label, value, onChange, isHost }: { label: string; value: number; onChange: (v: number) => void; isHost: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
      <span className="font-display text-sm uppercase text-ink">{label}</span>
      <div className="flex items-center gap-3">
        {isHost && (
          <button
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 active:scale-95"
          >
            -
          </button>
        )}
        <span className="w-4 text-center font-bold text-ink">{value}</span>
        {isHost && (
          <button
            onClick={() => onChange(value + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 active:scale-95"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

function EditProfileModal({
  player,
  code,
  onClose,
}: {
  player: { uid: string; name: string; photoUrl: string | null };
  code: string;
  onClose: () => void;
}) {
  const { updateProfile } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editName, setEditName] = useState(player.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await uploadProfilePhoto(player.uid, file);
      // Update globally
      await updateProfile({ photoUrl: url });
      // Update room specifically
      if (rtdb) {
        await update(ref(rtdb, `rooms/${code}/players/${rtdbKey(player.uid)}`), { photoUrl: url });
      }
      setMsg("Photo updated!");
    } catch (err) {
      console.error(err);
      setMsg("Couldn't upload photo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    const n = editName.trim();
    if (n.length < 2) return setMsg("Name too short.");
    setBusy(true);
    try {
      await updateProfile({ name: n });
      if (rtdb) {
        await update(ref(rtdb, `rooms/${code}/players/${rtdbKey(player.uid)}`), { name: n });
      }
      setMsg("Saved!");
    } catch {
      setMsg("Failed to save.");
    } finally {
      setBusy(false);
    }
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
        <h3 className="mb-4 text-center font-display text-lg uppercase text-ink">Edit Profile</h3>
        
        <div className="flex flex-col items-center">
          <button onClick={() => fileRef.current?.click()} className="relative active:scale-95 transition">
            <Avatar name={player.name} photoUrl={player.photoUrl} size={80} ring="pink" />
            <span className="absolute -bottom-1 -right-1 rounded-full bg-neon-pink-orange p-1.5 shadow-neon-pink">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="currentColor">
                <path d="M12 5l7 7-2 2-3-3v6h-4v-6l-3 3-2-2z" />
              </svg>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
          {busy && <p className="mt-2 text-xs text-neon-teal">Processing…</p>}
          {msg && !busy && <p className="mt-2 text-xs text-neon-teal">{msg}</p>}
        </div>

        <div className="mt-6 mb-6">
          <label className="mb-1 block font-display text-[11px] uppercase tracking-wider text-muted">Display Name</label>
          <div className="flex gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 rounded-xl border border-white/15 bg-vice-night/60 px-4 py-2 text-ink outline-none focus:border-neon-teal"
            />
            <NeonButton variant="teal" size="sm" onClick={saveName} disabled={busy}>
              Save
            </NeonButton>
          </div>
        </div>

        <NeonButton variant="ghost" fullWidth onClick={onClose}>
          Done
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}
