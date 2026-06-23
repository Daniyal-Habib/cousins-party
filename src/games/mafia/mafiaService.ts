"use client";

import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  increment,
  FieldPath,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  defaultComposition,
  assignRoles,
  type RoleComposition,
} from "./setup";
import {
  resolveNight,
  resolveDay,
  checkWin,
  applyDeaths,
  livingSheriff,
} from "./resolver";
import { createMafiaState, type MafiaGameState } from "./state";
import type { MafiaPlayer, NightActions } from "./types";
import { ROLE_META } from "./types";
import type { RoomPlayer } from "@/lib/types";

const DAY_DURATION_MS = 5 * 60 * 1000; // 5 min default

/** Star reward for a win. */
const WIN_STARS = 3;
const JESTER_STARS = 5;

/** Host: start a new Mafia game. Assigns roles + writes the game doc. */
export async function startMafiaGame(
  code: string,
  hostUid: string,
  roomPlayers: RoomPlayer[],
  compositionOverride?: RoleComposition,
): Promise<void> {
  if (!db) throw new Error("Firestore not configured");
  const living = roomPlayers.filter((p) => !p.isSpectator);
  if (living.length < 4) throw new Error("Need at least 4 players.");

  const composition = compositionOverride ?? defaultComposition(living.length);
  const assigned = assignRoles(
    living.map((p) => ({ uid: p.uid, name: p.name, photoUrl: p.photoUrl })),
    composition,
  );
  const state = createMafiaState(hostUid, assigned);
  await setDoc(doc(db, "rooms", code, "games", "mafia"), {
    ...state,
    updatedAt: serverTimestamp(),
  });
}

/** Subscribe to the game doc. */
export function subscribeMafia(
  code: string,
  cb: (state: MafiaGameState | null, pendingWrites: boolean) => void,
): () => void {
  if (!db) {
    cb(null, false);
    return () => {};
  }
  return onSnapshot(doc(db, "rooms", code, "games", "mafia"), (snap) => {
    cb(snap.exists() ? (snap.data() as MafiaGameState) : null, snap.metadata.hasPendingWrites);
  });
}

/* ============================================================
   Player action submission.
   Players may only write their own action fields.
   ============================================================ */

/** Mafia member submits their night kill vote. */
export async function submitMafiaVote(code: string, uid: string, targetUid: string) {
  if (!db) return;
  // Use FieldPath to avoid dots in email UIDs being interpreted as nested path separators.
  await updateDoc(
    doc(db, "rooms", code, "games", "mafia"),
    new FieldPath("nightActions", "mafiaVotes", uid), targetUid,
    "updatedAt", serverTimestamp(),
  );
}

/** Doctor submits their night save target. */
export async function submitDoctorSave(code: string, targetUid: string) {
  if (!db) return;
  await updateDoc(doc(db, "rooms", code, "games", "mafia"), {
    "nightActions.doctorSave": targetUid,
    updatedAt: serverTimestamp(),
  });
}

/** Detective submits who they want to investigate. */
export async function submitDetectiveCheck(code: string, targetUid: string) {
  if (!db) return;
  await updateDoc(doc(db, "rooms", code, "games", "mafia"), {
    "nightActions.detectiveCheck": targetUid,
    updatedAt: serverTimestamp(),
  });
}

/** Sheriff submits their (one-time) shot. */
export async function submitSheriffShot(code: string, targetUid: string) {
  if (!db) return;
  await updateDoc(doc(db, "rooms", code, "games", "mafia"), {
    "nightActions.sheriffShot": targetUid,
    sheriffUsedShot: true,
    updatedAt: serverTimestamp(),
  });
}

/** Player submits a day vote (target uid or "skip"). */
export async function submitDayVote(code: string, voterUid: string, target: string) {
  if (!db) return;
  // Use FieldPath to avoid dots in email UIDs being interpreted as nested path separators.
  await updateDoc(
    doc(db, "rooms", code, "games", "mafia"),
    new FieldPath("dayVotes", voterUid), target,
    "updatedAt", serverTimestamp(),
  );
}

/** Acknowledge role reveal so the host can advance to night. */
export async function acknowledgeReveal(code: string, uid: string) {
  if (!db) return;
  await updateDoc(doc(db, "rooms", code, "games", "mafia"), {
    revealAcknowledged: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

/* ============================================================
   Host phase machine. Reads + recomputes + writes the game doc
   inside a transaction to avoid races between concurrent advances.
   ============================================================ */

/** Does the host still need all required night actions? */
export function nightActionsReady(state: MafiaGameState): boolean {
  const living = state.players.filter((p) => p.alive);
  const livingMafia = living.filter((p) => p.role === "mafia");
  const doctor = living.find((p) => p.role === "doctor");
  const detective = living.find((p) => p.role === "detective");
  const sheriff = livingSheriff(state.players);

  // Mafia votes: all living mafia must submit.
  const mafiaVotes = Object.keys(state.nightActions.mafiaVotes ?? {});
  if (mafiaVotes.length < livingMafia.length) return false;

  // Doctor must submit a save (if alive).
  if (doctor && !state.nightActions.doctorSave) return false;
  // Detective must submit a check (if alive).
  if (detective && !state.nightActions.detectiveCheck) return false;
  // Sheriff is optional each night (may skip) — only require if they've explicitly shot.
  void sheriff;
  return true;
}

/** Have all living players voted in the day phase? */
export function dayVotesReady(state: MafiaGameState): boolean {
  const living = state.players.filter((p) => p.alive);
  return Object.keys(state.dayVotes || {}).length >= living.length;
}

/** Resolve the night and advance the doc to night-results. */
export async function resolveNightPhase(code: string): Promise<void> {
  if (!db) return;
  const database = db;
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(doc(database, "rooms", code, "games", "mafia"));
    if (!snap.exists()) return;
    const state = snap.data() as MafiaGameState;
    if (state.phase !== "night") return;

    // Carry previous doctor save into the action record for the resolver.
    const actions: NightActions = {
      ...state.nightActions,
      previousDoctorSave: state.lastNight?.savedByDoctor,
    };

    const result = resolveNight(state.players, actions);
    // Extra deaths: sheriff who missed their shot.
    const extraDeaths: string[] = [];
    if (result.sheriffOutcome?.sheriffDied) {
      const sheriff = state.players.find((p) => p.role === "sheriff" && p.alive);
      if (sheriff) extraDeaths.push(sheriff.uid);
    }

    const newPlayers = applyDeaths(state.players, result.killed, extraDeaths);
    // Strip undefined values — Firestore SDK rejects writes containing undefined.
    const nightRecord = JSON.parse(JSON.stringify({ ...result, extraDeaths }));
    tx.update(doc(database, "rooms", code, "games", "mafia"), {
      players: newPlayers,
      lastNight: nightRecord,
      phase: "night-results",
      updatedAt: serverTimestamp(),
    });
  });
}

/** Advance from night-results to the day discussion phase. */
export async function startDayPhase(code: string): Promise<void> {
  if (!db) return;
  const database = db;
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(doc(database, "rooms", code, "games", "mafia"));
    if (!snap.exists()) return;
    const state = snap.data() as MafiaGameState;
    if (state.phase !== "night-results") return;

    // Check for a night win before starting day.
    const win = checkWin(state.players);
    if (win.winner) {
      tx.update(doc(database, "rooms", code, "games", "mafia"), {
        phase: "ended",
        win,
        endedAt: Date.now(),
        updatedAt: serverTimestamp(),
      });
      await persistResults(code, state.players, win);
      return;
    }

    tx.update(doc(database, "rooms", code, "games", "mafia"), {
      phase: "day",
      dayVotes: {},
      timerEndsAt: Date.now() + DAY_DURATION_MS,
      updatedAt: serverTimestamp(),
    });
  });
}

/** Resolve the day vote and advance to day-results (or end if jester/mafia win). */
export async function resolveDayPhase(code: string): Promise<void> {
  if (!db) return;
  const database = db;
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(doc(database, "rooms", code, "games", "mafia"));
    if (!snap.exists()) return;
    const state = snap.data() as MafiaGameState;
    if (state.phase !== "day") return;

    const result = resolveDay(state.dayVotes || {});
    const eliminatedUid: string | null = result.eliminated;
    const players = eliminatedUid
      ? applyDeaths(state.players, [eliminatedUid])
      : state.players;

    const win = checkWin(players, eliminatedUid ?? undefined);
    if (win.winner) {
      tx.update(doc(database, "rooms", code, "games", "mafia"), {
        players,
        lastDay: result,
        phase: "ended",
        win,
        timerEndsAt: null,
        endedAt: Date.now(),
        updatedAt: serverTimestamp(),
      });
      // Results written outside the tx (separate async).
      void persistResults(code, players, win);
      return;
    }

    tx.update(doc(database, "rooms", code, "games", "mafia"), {
      players,
      lastDay: result,
      phase: "day-results",
      timerEndsAt: null,
      updatedAt: serverTimestamp(),
    });
  });
}

/** Start the next night: reset actions, increment round. */
export async function startNextNight(code: string): Promise<void> {
  if (!db) return;
  const database = db;
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(doc(database, "rooms", code, "games", "mafia"));
    if (!snap.exists()) return;
    const state = snap.data() as MafiaGameState;
    if (state.phase !== "day-results") return;

    const prevSave = state.lastNight?.savedByDoctor ?? null;
    tx.update(doc(database, "rooms", code, "games", "mafia"), {
      phase: "night",
      round: state.round + 1,
      nightActions: {
        mafiaVotes: {},
        ...(prevSave ? { previousDoctorSave: prevSave } : {}),
      },
      updatedAt: serverTimestamp(),
    });
  });
}

/** Host advances past the reveal phase once everyone acknowledged. */
export async function endRevealPhase(code: string): Promise<void> {
  if (!db) return;
  const database = db;
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(doc(database, "rooms", code, "games", "mafia"));
    if (!snap.exists()) return;
    const state = snap.data() as MafiaGameState;
    if (state.phase !== "reveal") return;
    tx.update(doc(database, "rooms", code, "games", "mafia"), {
      phase: "night",
      round: 1,
      nightActions: { mafiaVotes: {} },
      updatedAt: serverTimestamp(),
    });
  });
}

/** Host manually ends the day early. */
export async function forceEndDay(code: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "rooms", code, "games", "mafia"), {
    timerEndsAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Staleness sweep: any living player whose room player-doc hasn't pinged within
 * the grace window is treated as abandoned — marked dead + spectator so the
 * game can continue without them. Re-checks win conditions after.
 *
 * Reads the room player docs (separate from the game doc) to find lastSeen.
 */
export async function sweepStalePlayers(code: string, graceMs = 60_000): Promise<void> {
  if (!db) return;
  const database = db;
  const { getDocs, collection: col } = await import("firebase/firestore");
  const playerSnap = await getDocs(col(database, "rooms", code, "players"));
  const now = Date.now();
  const staleUids = playerSnap.docs
    .map((d) => d.data() as { uid: string; lastSeen: number; isOnline: boolean })
    .filter((p) => !p.isOnline && now - (p.lastSeen ?? 0) > graceMs)
    .map((p) => p.uid);
  if (staleUids.length === 0) return;

  await runTransaction(database, async (tx) => {
    const snap = await tx.get(doc(database, "rooms", code, "games", "mafia"));
    if (!snap.exists()) return;
    const state = snap.data() as MafiaGameState;
    if (state.phase === "ended") return;

    // Only mark living players dead (avoid rewriting history).
    const toKill = staleUids.filter((uid) =>
      state.players.some((p) => p.uid === uid && p.alive),
    );
    if (toKill.length === 0) return;

    const players = state.players.map((p) =>
      toKill.includes(p.uid) ? { ...p, alive: false, isSpectator: true } : p,
    );

    const win = checkWin(players);
    tx.update(doc(database, "rooms", code, "games", "mafia"), {
      players,
      ...(win.winner
        ? { phase: "ended" as const, win, endedAt: Date.now() }
        : {}),
      updatedAt: serverTimestamp(),
    });
    if (win.winner) void persistResults(code, players, win);
  });
}

/* ============================================================
   Persist results: stars + history for each player.
   ============================================================ */
async function persistResults(
  code: string,
  players: MafiaPlayer[],
  win: NonNullable<MafiaGameState["win"]>,
): Promise<void> {
  if (!db) return;
  const database = db;
  const writes = players.map((p) => {
    const result = win.results[p.uid] ?? "loss";
    const isJesterWin = win.winner === "neutral" && result === "win";
    const stars = result === "win" ? (isJesterWin ? JESTER_STARS : WIN_STARS) : 0;
    const team = ROLE_META[p.role].team;
    return Promise.all([
      updateDoc(doc(database, "users", p.uid), {
        stars: increment(stars),
        gamesPlayed: increment(1),
        wins: increment(result === "win" ? 1 : 0),
      }),
      setDoc(
        doc(database, "users", p.uid, "history", code),
        {
          gameId: code,
          gameType: "mafia",
          result,
          role: ROLE_META[p.role].label,
          team,
          playedAt: Date.now(),
        },
        { merge: true },
      ),
    ]);
  });
  await Promise.allSettled(writes);
}
