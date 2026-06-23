"use client";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";
import { onDisconnect, onValue, ref, serverTimestamp as rtdbNow } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { rtdbKey } from "@/lib/rtdbKey";
import type { GameType, Room, RoomPlayer } from "@/lib/types";

/** Generate a unique 4-digit room code not already in use. */
export async function generateRoomCode(): Promise<string> {
  if (!db) throw new Error("Firestore not configured");
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await getDoc(doc(db, "rooms", code));
    if (!snap.exists()) return code;
  }
  throw new Error("Couldn't generate a unique room code");
}

/** Create a room with the creator as host. */
export async function createRoom(params: {
  code: string;
  hostUid: string;
  hostName: string;
  hostPhoto: string | null;
  gameType?: GameType | null;
}): Promise<void> {
  if (!db) throw new Error("Firestore not configured");
  const now = Date.now();
  const room: Room = {
    code: params.code,
    hostUid: params.hostUid,
    gameType: params.gameType ?? null,
    status: "waiting",
    settings: {},
    createdAt: now,
  };
  await setDoc(doc(db, "rooms", params.code), room);
  await setDoc(doc(db, "rooms", params.code, "players", params.hostUid), {
    uid: params.hostUid,
    name: params.hostName,
    photoUrl: params.hostPhoto,
    isHost: true,
    isOnline: true,
    lastSeen: now,
    isSpectator: false,
  } satisfies RoomPlayer);
}

/** Add the signed-in user as a player in a room. Throws if room doesn't exist. */
export async function joinRoom(params: {
  code: string;
  uid: string;
  name: string;
  photo: string | null;
}): Promise<void> {
  if (!db) throw new Error("Firestore not configured");
  const roomRef = doc(db, "rooms", params.code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("Room not found. Check the code.");

  await setDoc(doc(db, "rooms", params.code, "players", params.uid), {
    uid: params.uid,
    name: params.name,
    photoUrl: params.photo,
    isHost: false,
    isOnline: true,
    lastSeen: Date.now(),
    isSpectator: false,
  } satisfies RoomPlayer);
}

/** Remove a player from a room. Host removal triggers migration on the way out. */
export async function leaveRoom(code: string, uid: string, isHost: boolean): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, "rooms", code, "players", uid));
  // If the host leaves, promote the next player before the room notices.
  if (isHost) await migrateHost(code, uid);
}

/** Host kicks a player. */
export async function kickPlayer(code: string, targetUid: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, "rooms", code, "players", targetUid));
}

/** Promote the earliest-still-online player to host, if needed. */
export async function migrateHost(code: string, leavingHostUid: string): Promise<void> {
  if (!db) return;
  // Read current players ordered by join time (doc id is stable; we use lastSeen asc).
  const snap = await getDoc(doc(db, "rooms", code));
  if (!snap.exists()) return;
  const room = snap.data() as Room;
  if (room.hostUid !== leavingHostUid) return; // already migrated

  // Use onSnapshot-free read of players.
  const playersCol = await import("firebase/firestore").then((m) =>
    m.getDocs(m.collection(db!, "rooms", code, "players")),
  );
  const players = playersCol.docs
    .map((d) => d.data() as RoomPlayer)
    .filter((p) => p.uid !== leavingHostUid && p.isOnline)
    .sort((a, b) => a.lastSeen - b.lastSeen);

  const next = players[0];
  if (next) {
    await updateDoc(doc(db, "rooms", code), { hostUid: next.uid });
    await updateDoc(doc(db, "rooms", code, "players", next.uid), { isHost: true });
  } else {
    // Nobody left — mark room ended so it can be cleaned.
    await updateDoc(doc(db, "rooms", code), { status: "ended" });
  }
}

/** Mark a player online/offline via presence; writes isOnline + lastSeen. */
export function attachPresence(code: string, uid: string): () => void {
  if (!db) return () => {};
  const playerRef = doc(db, "rooms", code, "players", uid);

  // Heartbeat: periodically bump lastSeen so others can detect staleness.
  const heartbeat = setInterval(() => {
    updateDoc(playerRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
  }, 15000);
  updateDoc(playerRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});

  // Realtime DB disconnect signal -> flip isOnline false on the player doc.
  let rtUnsub = () => {};
  if (rtdb) {
    // uid is the email; sanitize it since RTDB keys can't contain ". # $ [ ]".
    const conn = ref(rtdb, `presence/${code}/${rtdbKey(uid)}`);
    onDisconnect(conn).set({ online: false, at: rtdbNow() });
    onValue(conn, () => {}); // open the listener so onDisconnect arms
    rtUnsub = () => onDisconnect(conn).cancel();
  }

  return () => {
    clearInterval(heartbeat);
    rtUnsub();
  };
}

/** Soft-delete room when empty. */
export async function deleteRoomIfEmpty(code: string): Promise<void> {
  if (!db) return;
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "rooms", code, "players"));
  if (snap.empty) await deleteDoc(doc(db, "rooms", code));
}
