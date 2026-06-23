"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { attachPresence, joinRoom } from "@/lib/rooms/roomService";
import type { Room, RoomPlayer } from "@/lib/types";

/**
 * Live room + players subscription. Keeps this client's presence heartbeat
 * running while mounted. `me` is the current user's player doc.
 *
 * Auto-join: if the room exists and the current player isn't in the players
 * list yet, adds them (covers joining via a 4-digit code, where no other code
 * path writes the player doc). The host is already added by createRoom, so the
 * auto-join is a no-op for them.
 */
export function useRoom(
  code: string | undefined,
  uid: string | null,
  profile?: { name: string; photoUrl: string | null } | null,
) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!code || !db) {
      setExists(null);
      return;
    }
    const roomRef = doc(db, "rooms", code);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      setRoom(snap.exists() ? (snap.data() as Room) : null);
      setExists(snap.exists());
    });
    const unsubPlayers = onSnapshot(
      collection(db, "rooms", code, "players"),
      (snap) => setPlayers(snap.docs.map((d) => d.data() as RoomPlayer)),
    );
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [code]);

  const me = useMemo(
    () => players.find((p) => p.uid === uid) ?? null,
    [players, uid],
  );

  // Auto-join once the room exists and we know who we are but aren't listed.
  useEffect(() => {
    if (!code || !uid || !exists || !profile?.name) return;
    const alreadyIn = players.some((p) => p.uid === uid);
    if (alreadyIn) return;
    joinRoom({
      code,
      uid,
      name: profile.name,
      photo: profile.photoUrl ?? null,
    }).catch((e) => console.error("auto-join failed", e));
    // We intentionally don't depend on `players` — re-running on every player
    // change would re-trigger join attempts. The snapshot will update `me`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, uid, exists, profile?.name, profile?.photoUrl]);

  // Presence: attach when we know who we are and we're in the player list.
  useEffect(() => {
    if (!code || !uid || !me) return;
    const detach = attachPresence(code, uid);
    return detach;
  }, [code, uid, me?.uid]);

  const host = useMemo(
    () => players.find((p) => p.uid === room?.hostUid) ?? null,
    [players, room],
  );

  return { room, players, me, host, exists };
}
