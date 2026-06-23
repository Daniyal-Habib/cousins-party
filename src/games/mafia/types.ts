/* ============================================================
   Mafia — domain types
   Shared by Online and Pass & Play modes.
   ============================================================ */

export type MafiaRole =
  | "civilian"
  | "doctor"
  | "detective"
  | "sheriff"
  | "mafia"
  | "jester";

export type MafiaTeam = "civilian" | "mafia" | "neutral";

export type MafiaPhase =
  | "reveal"        // role-reveal pass-around (online: each client reveals own)
  | "night"         // night actions
  | "night-results" // narration of what happened
  | "day"           // discussion + voting
  | "day-results"   // who was voted out
  | "ended";        // game over

/** A player in the Mafia game state. */
export interface MafiaPlayer {
  uid: string;
  name: string;
  photoUrl: string | null;
  role: MafiaRole;
  alive: boolean;
  /** Spectator = eliminated and now watching. */
  isSpectator: boolean;
}

/** Night actions collected from players. */
export interface NightActions {
  /** uids of mafia who voted + the agreed target uid. */
  mafiaVotes: Record<string, string>;
  mafiaTarget?: string;
  doctorSave?: string;
  detectiveCheck?: string;
  /** uid the sheriff chose to shoot (one-time ability). */
  sheriffShot?: string;
  /** Doctor cannot save same target two nights in a row. */
  previousDoctorSave?: string;
}

/** Result of resolving a night. */
export interface NightResult {
  killed: string[];          // uids who died
  savedByDoctor?: string;    // uid the doctor protected (narration)
  detectiveReport?: { target: string; isMafia: boolean };
  sheriffOutcome?: { shot: string; victimWasMafia: boolean; sheriffDied?: boolean };
  /** Who the mafia targeted (for narration). */
  mafiaTarget?: string;
}

/** Result of resolving a day vote. */
export interface DayResult {
  eliminated: string | null;  // null = tie or skip → nobody dies
  tied: boolean;
  votes: Record<string, number>;
  skipped: number;
}

/** Who won and why. */
export interface WinState {
  winner: MafiaTeam | null;   // null while game continues
  reason: string;
  /** Per-player result for history/stars. */
  results: Record<string, "win" | "loss">;
}

export const ROLE_META: Record<
  MafiaRole,
  { team: MafiaTeam; label: string; color: "pink" | "teal" | "orange"; description: string }
> = {
  civilian: {
    team: "civilian",
    label: "Civilian",
    color: "teal",
    description: "Find and vote out the Mafia. You have no special powers.",
  },
  doctor: {
    team: "civilian",
    label: "Doctor",
    color: "teal",
    description: "Each night, save one player from the Mafia. You can't protect the same person twice in a row.",
  },
  detective: {
    team: "civilian",
    label: "Detective",
    color: "teal",
    description: "Each night, investigate one player to learn if they're Mafia.",
  },
  sheriff: {
    team: "civilian",
    label: "Sheriff",
    color: "teal",
    description: "One night, you may shoot someone. If they're Mafia, they die. If not — you die.",
  },
  mafia: {
    team: "mafia",
    label: "Mafia",
    color: "pink",
    description: "Eliminate the town. Each night your team picks one target to kill.",
  },
  jester: {
    team: "neutral",
    label: "Jester",
    color: "orange",
    description: "Trick the town into voting you out. If they do, you win alone.",
  },
};
