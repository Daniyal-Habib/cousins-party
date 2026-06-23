import type {
  MafiaPhase,
  MafiaPlayer,
  NightActions,
  NightResult,
  DayResult,
  WinState,
} from "./types";

/** Authoritative Mafia game doc: rooms/{code}/game */
export interface MafiaGameState {
  phase: MafiaPhase;
  round: number;
  players: MafiaPlayer[];
  /** uid of host running the phase machine. */
  hostUid: string;
  /** Night actions collected from players for the current round. */
  nightActions: NightActions;
  /** Last completed night result (for narration). */
  lastNight: NightResult | null;
  /** Day votes: voterUid -> target uid | "skip". */
  dayVotes: Record<string, string>;
  /** Last completed day result. */
  lastDay: DayResult | null;
  /** Win state once phase === "ended". */
  win: WinState | null;
  /** Server timestamp the current timed phase ends (day discussion). */
  timerEndsAt: number | null;
  /** uids who have acknowledged the role reveal. */
  revealAcknowledged: string[];
  /** Sheriff has used their shot? */
  sheriffUsedShot: boolean;
  startedAt: number;
  endedAt?: number;
}

export function createMafiaState(hostUid: string, players: MafiaPlayer[]): MafiaGameState {
  return {
    phase: "reveal",
    round: 0,
    players,
    hostUid,
    nightActions: { mafiaVotes: {} },
    lastNight: null,
    dayVotes: {},
    lastDay: null,
    win: null,
    timerEndsAt: null,
    revealAcknowledged: [],
    sheriffUsedShot: false,
    startedAt: Date.now(),
  };
}
