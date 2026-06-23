// Quick test of resolveNight to reproduce the mafia kill bug.
import { resolveNight } from "./src/games/mafia/resolver";

const players = [
  { uid: "m1", name: "Mafia1", photoUrl: null, role: "mafia", alive: true, isSpectator: false },
  { uid: "m2", name: "Mafia2", photoUrl: null, role: "mafia", alive: true, isSpectator: false },
  { uid: "c1", name: "Civ1", photoUrl: null, role: "civilian", alive: true, isSpectator: false },
  { uid: "c2", name: "Civ2", photoUrl: null, role: "civilian", alive: true, isSpectator: false },
  { uid: "c3", name: "Civ3", photoUrl: null, role: "civilian", alive: true, isSpectator: false },
] as const;

console.log("=== 2 mafia, both vote c1 ===");
console.log(JSON.stringify(resolveNight([...players] as any, {
  mafiaVotes: { m1: "c1", m2: "c1" },
}), null, 2));

console.log("=== 2 mafia, disagree (m1->c1, m2->c2) ===");
console.log(JSON.stringify(resolveNight([...players] as any, {
  mafiaVotes: { m1: "c1", m2: "c2" },
}), null, 2));

console.log("=== 2 mafia, only m1 votes (nightActionsReady would block) ===");
console.log(JSON.stringify(resolveNight([...players] as any, {
  mafiaVotes: { m1: "c1" },
}), null, 2));

console.log("=== 1 mafia scenario ===");
const oneMafia = [
  { uid: "m1", name: "Mafia1", photoUrl: null, role: "mafia", alive: true, isSpectator: false },
  { uid: "c1", name: "Civ1", photoUrl: null, role: "civilian", alive: true, isSpectator: false },
  { uid: "c2", name: "Civ2", photoUrl: null, role: "civilian", alive: true, isSpectator: false },
  { uid: "c3", name: "Civ3", photoUrl: null, role: "civilian", alive: true, isSpectator: false },
] as const;
console.log(JSON.stringify(resolveNight([...oneMafia] as any, {
  mafiaVotes: { m1: "c1" },
}), null, 2));
