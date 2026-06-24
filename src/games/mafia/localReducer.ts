"use client";

import { assignRoles, defaultComposition } from "./setup";
import {
  resolveDay,
  checkWin,
  applyDeaths,
} from "./resolver";
import type { MafiaPlayer } from "./types";
import type { WinState } from "./types";

/**
 * Pass & Play Mafia — local state machine for a single phone.
 *
 * Unlike Online mode (where each player submits actions), here a single
 * Moderator drives the game. The mod tells the app what happened at night
 * (who mafia killed, who doctor saved, detective result) and who was voted
 * out during the day. The app handles role assignment, win conditions, and
 * death tracking.
 */
export type LocalPhase =
  | "setup"          // add players + choose roles
  | "reveal"         // pass-around role reveal
  | "moderator"      // mod records night results
  | "night-results"  // narration
  | "vote"           // mod records day vote result
  | "day-results"    // narration
  | "ended";

export interface LocalMafiaState {
  phase: LocalPhase;
  round: number;
  players: MafiaPlayer[];
  /** index of the player currently revealing their card. */
  revealIndex: number;
  /** Mod-recorded night outcome for the current round. */
  pendingNight: {
    killedUid?: string;
    savedUid?: string;
    detectiveCheckUid?: string;
  };
  lastNightNarration: string | null;
  /** Mod-recorded day vote. */
  pendingVoteOutUid?: string;
  pendingTie: boolean;
  lastDayNarration: string | null;
  win: WinState | null;
  /** Doctor save from previous night (for narration continuity). */
  previousSaveUid?: string;
}

export type LocalAction =
  | { type: "START"; players: { name: string; photoUrl: string | null }[] }
  | { type: "REVEAL_NEXT" }
  | { type: "REVEAL_BACK" }
  | { type: "REVEAL_DONE" }
  | { type: "SET_NIGHT"; payload: LocalMafiaState["pendingNight"] }
  | { type: "RESOLVE_NIGHT" }
  | { type: "SET_VOTE"; eliminatedUid?: string; tie: boolean }
  | { type: "RESOLVE_VOTE" }
  | { type: "NEXT_ROUND" }
  | { type: "RESET" };

export function initLocalMafia(): LocalMafiaState {
  return {
    phase: "setup",
    round: 0,
    players: [],
    revealIndex: 0,
    pendingNight: {},
    lastNightNarration: null,
    pendingTie: false,
    lastDayNarration: null,
    win: null,
  };
}

export function localMafiaReducer(
  state: LocalMafiaState,
  action: LocalAction,
): LocalMafiaState {
  switch (action.type) {
    case "START": {
      if (action.players.length < 4) return state;
      const composition = defaultComposition(action.players.length);
      const assigned = assignRoles(
        action.players.map((p, i) => ({ uid: `p${i}`, ...p })),
        composition,
      );
      return {
        ...initLocalMafia(),
        phase: "reveal",
        players: assigned,
        revealIndex: 0,
      };
    }

    case "REVEAL_NEXT":
      return {
        ...state,
        revealIndex: Math.min(state.revealIndex + 1, state.players.length - 1),
      };

    case "REVEAL_BACK":
      return { ...state, revealIndex: Math.max(state.revealIndex - 1, 0) };

    case "REVEAL_DONE":
      return { ...state, phase: "moderator", round: 1 };

    case "SET_NIGHT":
      return { ...state, pendingNight: action.payload };

    case "RESOLVE_NIGHT": {
      const { killedUid, savedUid, detectiveCheckUid } = state.pendingNight;
      const deaths: { uid: string; reason: "mafia" | "sheriff" | "voted" }[] = [];
      const narration: string[] = [];

      if (killedUid && killedUid !== savedUid) {
        deaths.push({ uid: killedUid, reason: "mafia" });
        const victim = state.players.find((p) => p.uid === killedUid);
        narration.push(`${victim?.name} was eliminated during the night.`);
      } else if (killedUid && killedUid === savedUid) {
        narration.push(`The Mafia struck, but the Doctor saved ${state.players.find((p) => p.uid === killedUid)?.name}!`);
      } else {
        narration.push("The night passed peacefully.");
      }

      if (detectiveCheckUid) {
        const target = state.players.find((p) => p.uid === detectiveCheckUid);
        const isMafia = target?.role === "mafia";
        narration.push(`Detective's report: ${target?.name} is ${isMafia ? "MAFIA" : "not Mafia"}.`);
      }

      const players = applyDeaths(state.players, deaths);

      // Win check after night.
      const win = checkWin(players);
      return {
        ...state,
        players,
        lastNightNarration: narration.join(" "),
        previousSaveUid: savedUid,
        pendingNight: {},
        phase: win.winner ? "ended" : "night-results",
        win: win.winner ? win : null,
      };
    }

    case "SET_VOTE":
      return {
        ...state,
        pendingVoteOutUid: action.eliminatedUid,
        pendingTie: action.tie,
      };

    case "RESOLVE_VOTE": {
      const eliminatedUid = state.pendingTie ? undefined : state.pendingVoteOutUid;
      const players = state.pendingTie
        ? state.players
        : eliminatedUid
          ? applyDeaths(state.players, [{ uid: eliminatedUid, reason: "voted" }])
          : state.players;
      let narration: string;

      if (state.pendingTie) {
        narration = "The vote was tied — nobody is eliminated.";
      } else if (eliminatedUid && eliminatedUid !== "skip") {
        const victim = players.find((p) => p.uid === eliminatedUid);
        narration = `The town voted out ${state.players.find((p) => p.uid === eliminatedUid)?.name} (${victim?.role}).`;
      } else {
        narration = "The town decided to skip.";
      }

      const win = checkWin(players, eliminatedUid);
      return {
        ...state,
        players,
        lastDayNarration: narration,
        pendingVoteOutUid: undefined,
        pendingTie: false,
        phase: win.winner ? "ended" : "day-results",
        win: win.winner ? win : null,
      };
    }

    case "NEXT_ROUND":
      return {
        ...state,
        phase: "moderator",
        round: state.round + 1,
        lastNightNarration: null,
        lastDayNarration: null,
      };

    case "RESET":
      return initLocalMafia();

    default:
      return state;
  }
}

/** Format the day vote using the shared resolver (kept for parity). */
export function tallyLocalVotes(votes: Record<string, string>) {
  return resolveDay(votes);
}
