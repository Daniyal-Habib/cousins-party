import type { MafiaPlayer, MafiaRole } from "./types";

export interface RoleComposition {
  mafia: number;
  doctor: number;
  detective: number;
  sheriff: number;
  jester: number;
  // remainder = civilians
}

/** Default composition suggestion based on player count. */
export function defaultComposition(playerCount: number): RoleComposition {
  const mafia = playerCount >= 9 ? 3 : playerCount >= 6 ? 2 : 1;
  return {
    mafia,
    doctor: 1,
    detective: 1,
    sheriff: playerCount >= 6 ? 1 : 0,
    jester: playerCount >= 6 ? 1 : 0,
  };
}

/** Total non-civilian roles; everything else is civilians. */
export function totalAssigned(c: RoleComposition): number {
  return c.mafia + c.doctor + c.detective + c.sheriff + c.jester;
}

/**
 * Shuffles + assigns roles to players. Returns a new players array with
 * roles set. Throws if composition exceeds player count.
 */
export function assignRoles(
  players: { uid: string; name: string; photoUrl: string | null }[],
  composition: RoleComposition,
): MafiaPlayer[] {
  if (totalAssigned(composition) > players.length) {
    throw new Error(
      `Too many special roles (${totalAssigned(composition)}) for ${players.length} players.`,
    );
  }

  const deck: MafiaRole[] = [
    ...Array(composition.mafia).fill("mafia"),
    ...Array(composition.doctor).fill("doctor"),
    ...Array(composition.detective).fill("detective"),
    ...Array(composition.sheriff).fill("sheriff"),
    ...Array(composition.jester).fill("jester"),
  ];
  while (deck.length < players.length) deck.push("civilian");
  shuffle(deck);

  return players.map((p, i) => ({
    uid: p.uid,
    name: p.name,
    photoUrl: p.photoUrl,
    role: deck[i],
    alive: true,
    isSpectator: false,
  }));
}

/** Fisher-Yates shuffle (in place). */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
