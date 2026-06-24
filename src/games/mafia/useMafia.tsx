"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { ref, update, serverTimestamp as rtdbNow } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { rtdbKey } from "@/lib/rtdbKey";
import { useUser } from "@/lib/hooks/useUser";
import { subscribeMafia } from "./mafiaService";
import type { MafiaGameState } from "./state";
import type { MafiaPlayer } from "./types";
import { ROLE_META, type MafiaRole, type MafiaTeam } from "./types";

interface MafiaCtx {
  code: string;
  state: MafiaGameState | null;
  loading: boolean;
  me: MafiaPlayer | null;
  myRole: MafiaRole | null;
  myTeam: MafiaTeam | null;
  isHost: boolean;
  alive: boolean;
  spectator: boolean;
  hasPendingWrites: boolean;
}

const Ctx = createContext<MafiaCtx | null>(null);

export function MafiaProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { profile } = useUser();
  const uid = profile?.email ?? null;

  const [state, setState] = useState<MafiaGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const unsub = subscribeMafia(code, (s, pending) => {
      setState(s);
      setHasPendingWrites(pending);
      setLoading(false);
    });
    return unsub;
  }, [code]);

  const me = useMemo(
    () => state?.players.find((p) => p.uid === uid) ?? null,
    [state, uid],
  );

  const value: MafiaCtx = {
    code,
    state,
    loading,
    me,
    myRole: me?.role ?? null,
    myTeam: me ? ROLE_META[me.role].team : null,
    isHost: state?.hostUid === uid,
    alive: me?.alive ?? false,
    spectator: me?.isSpectator ?? false,
    hasPendingWrites,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMafia() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMafia must be used within MafiaProvider");
  return ctx;
}

/**
 * Set the local player's spectator flag. Used when a player is eliminated and
 * should receive the read-only spectator view.
 */
export function setSpectator(code: string, uid: string) {
  if (!rtdb) return;
  update(ref(rtdb, `rooms/${code}/players/${rtdbKey(uid)}`), {
    isSpectator: true,
    updatedAt: rtdbNow(),
  }).catch(() => {});
}

/** Re-export ROLE_META for convenience from UI. */
export { ROLE_META };
