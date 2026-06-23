import type { GameType } from "@/lib/types";

/**
 * Generic game-module contract. Each game (mafia, uno, word-guesser) implements
 * this so the room/play routing can stay game-agnostic. Mafia is the first
 * implementation; UNO and Word Guesser drop in by adding modules later.
 */
export interface GameModule<TState = unknown, TAction = unknown> {
  type: GameType;
  minPlayers: number;
  maxPlayers: number;
  /** Initial game state for a fresh game. */
  init(players: GameModulePlayer[]): TState;
  /** Apply a player action to the state (pure; returns new state). */
  reduce(state: TState, action: TAction, actorUid: string): TState;
}

export interface GameModulePlayer {
  uid: string;
  name: string;
  photoUrl: string | null;
}
