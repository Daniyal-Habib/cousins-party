/* ============================================================
   Shared domain types — Cousins Game Night
   ============================================================ */

/** A registered user. Keyed by email in Firestore `users/{email}`. */
export interface UserProfile {
  email: string;          // also the doc id
  name: string;
  photoUrl: string | null;
  stars: number;
  gamesPlayed: number;
  wins: number;
  createdAt: number;
}

/** A single past-game entry under `users/{email}/history/{gameId}`. */
export interface GameHistoryEntry {
  gameId: string;
  gameType: GameType;
  result: "win" | "loss";
  role?: string;
  team?: string;
  playedAt: number;
}

export type GameType = "mafia" | "uno" | "word-guesser";

export type RoomStatus = "waiting" | "playing" | "ended";

/** A room's top-level doc. */
export interface Room {
  code: string;
  hostUid: string;
  gameType: GameType | null;
  status: RoomStatus;
  settings: Record<string, unknown>;
  createdAt: number;
}

/** A player inside a room: `rooms/{code}/players/{uid}`. */
export interface RoomPlayer {
  uid: string;
  name: string;
  photoUrl: string | null;
  isHost: boolean;
  isOnline: boolean;
  lastSeen: number;
  isSpectator: boolean;
}

export interface ChatMessage {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string | null;
  text: string;
  createdAt: number;
  isDead?: boolean;
}
