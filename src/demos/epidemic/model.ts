export const SIDE = 6;
export const TOTAL = SIDE * SIDE;
export const INTERVAL_MS = 500;
export const INFECTION_CHANCE = 0.5;
export interface State {
  infected: boolean[];
  turn: number;
  transmissions: { from: number; to: number }[];
}
export const createState = (): State => ({
  infected: Array(TOTAL).fill(false),
  turn: 0,
  transmissions: [],
});
export function neighbors(node: number) {
  const row = Math.floor(node / SIDE),
    col = node % SIDE;
  return [
    row > 0 ? node - SIDE : -1,
    col < SIDE - 1 ? node + 1 : -1,
    row < SIDE - 1 ? node + SIDE : -1,
    col > 0 ? node - 1 : -1,
  ].filter((n) => n >= 0);
}
export function infectRandom(random = Math.random): State {
  const state = createState();
  state.infected[Math.floor(random() * TOTAL)] = true;
  return state;
}
export function nextTurn(state: State, random = Math.random): State {
  if (!state.infected.some(Boolean) || state.infected.every(Boolean))
    return state;
  const infected = [...state.infected];
  const transmissions: State["transmissions"] = [];
  state.infected.forEach((wasInfected, from) => {
    if (!wasInfected) return;
    for (const to of neighbors(from)) {
      // Eligibility comes from the start of the turn. Each infected neighbor
      // gets an independent attempt, even if another attempt already succeeded.
      if (state.infected[to] || random() >= INFECTION_CHANCE) continue;
      if (!infected[to]) {
        infected[to] = true;
        transmissions.push({ from, to });
      }
    }
  });
  return { infected, turn: state.turn + 1, transmissions };
}
