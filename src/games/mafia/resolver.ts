import type {
  MafiaPlayer,
  NightActions,
  NightResult,
  DayResult,
  WinState,
} from "./types";
import { ROLE_META } from "./types";

/**
 * Resolve the night phase into deaths + narration.
 *
 * Rules implemented (per PRD §3.3):
 *  - Mafia must agree on one target; otherwise nobody is killed by mafia.
 *  - Doctor saves the target → no death. Doctor can't repeat last save.
 *  - Detective gets a Mafia/Not-Mafia report.
 *  - Sheriff shoots: kills Mafia on hit, dies themselves on a miss.
 */
export function resolveNight(
  players: MafiaPlayer[],
  actions: NightActions,
): NightResult {
  const result: NightResult = { killed: [] };
  const byUid = new Map(players.map((p) => [p.uid, p]));

  // ---- Mafia kill ----
  // Find the most-voted mafia target (simple majority of submitted mafia votes).
  const mafiaVotes = Object.entries(actions.mafiaVotes);
  if (mafiaVotes.length > 0) {
    const counts: Record<string, number> = {};
    for (const [, target] of mafiaVotes) {
      counts[target] = (counts[target] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [topTarget, topCount] = sorted[0];
    // Agreement = majority of living mafia who voted agreed (ties → no kill).
    const livingMafia = players.filter((p) => p.alive && p.role === "mafia");
    const needed = Math.ceil(livingMafia.length / 2);
    if (topCount >= needed && byUid.get(topTarget)?.alive) {
      result.mafiaTarget = topTarget;

      // Doctor save (cannot repeat last save).
      const doctorSave = actions.doctorSave;
      const saveValid =
        doctorSave &&
        byUid.get(doctorSave)?.alive &&
        doctorSave !== actions.previousDoctorSave;

      if (saveValid && doctorSave === topTarget) {
        result.savedByDoctor = doctorSave;
      } else {
        result.killed.push(topTarget);
      }
    }
  }

  // ---- Detective report ----
  if (actions.detectiveCheck) {
    const target = byUid.get(actions.detectiveCheck);
    if (target) {
      result.detectiveReport = {
        target: target.uid,
        isMafia: target.role === "mafia",
      };
    }
  }

  // ---- Sheriff shot (one-time) ----
  if (actions.sheriffShot) {
    const target = byUid.get(actions.sheriffShot);
    if (target && target.alive) {
      const victimWasMafia = target.role === "mafia";
      if (victimWasMafia) {
        result.killed.push(target.uid);
        result.sheriffOutcome = { shot: target.uid, victimWasMafia: true };
      } else {
        // Sheriff dies for missing.
        result.sheriffOutcome = { shot: target.uid, victimWasMafia: false, sheriffDied: true };
        // Mark sheriff death separately (handled by caller applying results).
      }
    }
  }

  return result;
}

/** Find the living sheriff uid (if their one-shot hasn't been used). */
export function livingSheriff(players: MafiaPlayer[]): MafiaPlayer | undefined {
  return players.find((p) => p.alive && p.role === "sheriff");
}

/**
 * Resolve the day vote.
 * Rules (per PRD §3.3.4): a tie at the top → nobody is eliminated.
 */
export function resolveDay(votes: Record<string, string>): DayResult {
  // votes: { voterUid -> targetUid | "skip" }
  const counts: Record<string, number> = {};
  let skipped = 0;
  for (const target of Object.values(votes)) {
    if (target === "skip") skipped++;
    else counts[target] = (counts[target] ?? 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return { eliminated: null, tied: false, votes: {}, skipped };
  }
  const [top, second] = sorted;
  const tied = second && second[1] === top[1];
  return {
    eliminated: tied ? null : top[0],
    tied,
    votes: Object.fromEntries(sorted),
    skipped,
  };
}

/**
 * Determine if the game has ended after deaths are applied.
 * Rules (per PRD §3.2.4):
 *  - Jester voted out → Jester wins alone.
 *  - Mafia count >= civilian count → Mafia wins.
 *  - All Mafia eliminated → Civilians win.
 */
export function checkWin(
  players: MafiaPlayer[],
  justVotedOut?: string,
): WinState {
  // Jester win check (only when jester is voted out during day).
  if (justVotedOut) {
    const voted = players.find((p) => p.uid === justVotedOut);
    if (voted?.role === "jester") {
      return jesterWin(players, voted.uid);
    }
  }

  const living = players.filter((p) => p.alive);
  const livingMafia = living.filter((p) => p.role === "mafia");
  const livingCivilians = living.filter(
    (p) => ROLE_META[p.role].team === "civilian",
  );

  // Mafia >= civilians (jester counts toward neither side for this check).
  if (livingMafia.length > 0 && livingMafia.length >= livingCivilians.length) {
    return teamWin(players, "mafia", "Mafia outnumbered the town.");
  }
  // All mafia dead.
  if (livingMafia.length === 0) {
    return teamWin(players, "civilian", "The town eliminated all Mafia.");
  }
  return { winner: null, reason: "", results: {} };
}

function teamWin(
  players: MafiaPlayer[],
  team: "civilian" | "mafia",
  reason: string,
): WinState {
  const results: Record<string, "win" | "loss"> = {};
  for (const p of players) {
    const pTeam = ROLE_META[p.role].team;
    results[p.uid] = pTeam === team ? "win" : "loss";
  }
  return { winner: team, reason, results };
}

/** Jester wins alone; everyone else loses. */
function jesterWin(players: MafiaPlayer[], jesterUid: string): WinState {
  const results: Record<string, "win" | "loss"> = {};
  for (const p of players) {
    results[p.uid] = p.uid === jesterUid ? "win" : "loss";
  }
  return { winner: "neutral", reason: "The Jester tricked the town!", results };
}

/** Apply a set of deaths to the player list (returns new array). */
export function applyDeaths(
  players: MafiaPlayer[],
  killedUids: string[],
  extraDeaths: string[] = [],
): MafiaPlayer[] {
  const dead = new Set([...killedUids, ...extraDeaths]);
  return players.map((p) =>
    dead.has(p.uid)
      ? { ...p, alive: false, isSpectator: true }
      : p,
  );
}
