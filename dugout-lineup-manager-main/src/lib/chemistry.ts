import { FieldPosition, Player, Position } from "@/types/player";
import { DEFENSIVE_POSITIONS, primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";

/**
 * Lineup chemistry weights.
 *
 * Each defensive spot, plus the DH spot when the DH rule is on, contributes
 * one slot score from 0 to 100. The team score is the average of those slot
 * scores, rounded to the nearest integer.
 *
 * - primary: the assigned player lists that spot as a primary position
 * - secondary: they list it only as a secondary position
 * - dhNeutral: the DH spot is filled by someone who does not list DH.
 *   DH is not a defensive skill, so this is a mild step down, not a penalty.
 * - unassigned: the spot is empty. An open hole costs more than a DH without
 *   the label, and less than playing somebody completely out of position.
 * - outOfPosition: a defender is somewhere they do not list
 */
export const CHEMISTRY_WEIGHTS = {
  primary: 100,
  secondary: 62,
  dhNeutral: 78,
  unassigned: 40,
  outOfPosition: 15,
} as const;

export type FitKind = "primary" | "secondary" | "dh-neutral" | "unassigned" | "out-of-position";

export interface ChemistrySlot {
  position: Position;
  playerId: string | null;
  fit: FitKind;
  score: number;
}

export interface ChemistryBreakdown {
  primary: number;
  secondary: number;
  dhNeutral: number;
  unassigned: number;
  outOfPosition: number;
}

export interface ChemistryReport {
  score: number;
  slots: ChemistrySlot[];
  breakdown: ChemistryBreakdown;
  /** Same alignment if every filled spot were a primary fit. */
  allPrimaryIdeal: number;
  /** Highest score available by assigning the current roster. */
  bestAvailable: number;
  bestAssignment: { position: Position; playerId: string | null }[];
}

function weightFor(fit: FitKind): number {
  switch (fit) {
    case "primary":
      return CHEMISTRY_WEIGHTS.primary;
    case "secondary":
      return CHEMISTRY_WEIGHTS.secondary;
    case "dh-neutral":
      return CHEMISTRY_WEIGHTS.dhNeutral;
    case "unassigned":
      return CHEMISTRY_WEIGHTS.unassigned;
    case "out-of-position":
      return CHEMISTRY_WEIGHTS.outOfPosition;
  }
}

export function fitAtPosition(player: Player | null | undefined, position: Position): FitKind {
  if (!player) return "unassigned";
  if (primaryPositionsOf(player).includes(position)) return "primary";
  if (secondaryPositionsOf(player).includes(position)) return "secondary";
  if (position === "DH") return "dh-neutral";
  return "out-of-position";
}

export function spotsForMode(useDH: boolean): Position[] {
  return useDH ? [...DEFENSIVE_POSITIONS, "DH"] : [...DEFENSIVE_POSITIONS];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function scoreSlots(slots: ChemistrySlot[]): number {
  return average(slots.map((slot) => slot.score));
}

function buildSlots(
  fieldPositions: FieldPosition[],
  players: Player[],
  useDH: boolean,
): ChemistrySlot[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  return spotsForMode(useDH).map((position) => {
    const assigned = fieldPositions.find((spot) => spot.position === position);
    const player = assigned?.playerId ? byId.get(assigned.playerId) ?? null : null;
    const fit = fitAtPosition(player, position);
    return {
      position,
      playerId: assigned?.playerId ?? null,
      fit,
      score: weightFor(fit),
    };
  });
}

function breakdownOf(slots: ChemistrySlot[]): ChemistryBreakdown {
  return {
    primary: slots.filter((slot) => slot.fit === "primary").length,
    secondary: slots.filter((slot) => slot.fit === "secondary").length,
    dhNeutral: slots.filter((slot) => slot.fit === "dh-neutral").length,
    unassigned: slots.filter((slot) => slot.fit === "unassigned").length,
    outOfPosition: slots.filter((slot) => slot.fit === "out-of-position").length,
  };
}

function idealSlots(slots: ChemistrySlot[]): ChemistrySlot[] {
  return slots.map((slot) => {
    if (slot.fit === "unassigned") return slot;
    return { ...slot, fit: "primary", score: CHEMISTRY_WEIGHTS.primary };
  });
}

function playerScoreAt(player: Player, position: Position): number {
  return weightFor(fitAtPosition(player, position));
}

/**
 * Best defensive assignment for this roster.
 *
 * Dynamic programming over the 9 or 10 spots (at most 1024 masks). Each
 * active player is used at most once. Empty spots keep the unassigned weight.
 */
export function bestChemistryAssignment(
  players: Player[],
  useDH: boolean,
): { score: number; assignment: { position: Position; playerId: string | null }[] } {
  const spots = spotsForMode(useDH);
  const roster = players.filter((player) => player.status !== "archived" && player.status !== "inactive");
  const spotCount = spots.length;
  const maskCount = 1 << spotCount;
  const matrix = roster.map((player) => spots.map((position) => playerScoreAt(player, position)));

  let scores = new Float64Array(maskCount).fill(-1);
  let who = new Int16Array(maskCount).fill(-1);
  let from = new Int16Array(maskCount).fill(-1);
  scores[0] = 0;

  roster.forEach((_, playerIndex) => {
    const nextScores = scores.slice();
    const nextWho = who.slice();
    const nextFrom = from.slice();
    for (let mask = 0; mask < maskCount; mask += 1) {
      if (scores[mask] < 0) continue;
      for (let spotIndex = 0; spotIndex < spotCount; spotIndex += 1) {
        const bit = 1 << spotIndex;
        if (mask & bit) continue;
        const nextMask = mask | bit;
        const total = scores[mask] + matrix[playerIndex][spotIndex];
        if (total > nextScores[nextMask]) {
          nextScores[nextMask] = total;
          nextWho[nextMask] = playerIndex;
          nextFrom[nextMask] = mask;
        }
      }
    }
    scores = nextScores;
    who = nextWho;
    from = nextFrom;
  });

  let bestMask = 0;
  let bestTotal = CHEMISTRY_WEIGHTS.unassigned * spotCount;
  for (let mask = 0; mask < maskCount; mask += 1) {
    if (scores[mask] < 0) continue;
    let filled = 0;
    let bits = mask;
    while (bits) {
      filled += bits & 1;
      bits >>= 1;
    }
    const total = scores[mask] + CHEMISTRY_WEIGHTS.unassigned * (spotCount - filled);
    if (total > bestTotal) {
      bestTotal = total;
      bestMask = mask;
    }
  }

  const assigned = new Array<string | null>(spotCount).fill(null);
  let mask = bestMask;
  while (mask > 0) {
    const playerIndex = who[mask];
    const previous = from[mask];
    if (playerIndex < 0 || previous < 0) break;
    const added = mask ^ previous;
    let spotIndex = 0;
    let bit = added;
    while (bit > 1) {
      bit >>= 1;
      spotIndex += 1;
    }
    assigned[spotIndex] = roster[playerIndex].id;
    mask = previous;
  }

  return {
    score: Math.round(bestTotal / spotCount),
    assignment: spots.map((position, index) => ({
      position,
      playerId: assigned[index],
    })),
  };
}

export function rateChemistry(
  fieldPositions: FieldPosition[],
  players: Player[],
  useDH: boolean,
): ChemistryReport {
  const slots = buildSlots(fieldPositions, players, useDH);
  const best = bestChemistryAssignment(players, useDH);
  return {
    score: scoreSlots(slots),
    slots,
    breakdown: breakdownOf(slots),
    allPrimaryIdeal: scoreSlots(idealSlots(slots)),
    bestAvailable: best.score,
    bestAssignment: best.assignment,
  };
}
