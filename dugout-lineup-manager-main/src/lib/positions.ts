import { Player, Position } from "@/types/player";

export const DEFENSIVE_POSITIONS: Position[] = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];

export const ALL_POSITIONS: Position[] = [...DEFENSIVE_POSITIONS, "DH"];

type Positioned = {
  primaryPosition?: Position;
  primaryPositions?: Position[];
  secondaryPositions?: Position[];
};

function unique(positions: Position[]): Position[] {
  const seen = new Set<Position>();
  const result: Position[] = [];
  positions.forEach((position) => {
    if (!seen.has(position)) {
      seen.add(position);
      result.push(position);
    }
  });
  return result;
}

export function primaryPositionsOf(player: Positioned): Position[] {
  const listed = player.primaryPositions?.filter(Boolean) ?? [];
  if (listed.length > 0) return unique(listed);
  return player.primaryPosition ? [player.primaryPosition] : [];
}

export function secondaryPositionsOf(player: Positioned): Position[] {
  const primaries = new Set(primaryPositionsOf(player));
  return unique(player.secondaryPositions ?? []).filter((position) => !primaries.has(position));
}

export function withPositionLists(player: Player): Player {
  const primaryPositions = primaryPositionsOf(player);
  const secondaryPositions = secondaryPositionsOf(player);
  return {
    ...player,
    primaryPosition: primaryPositions[0] ?? player.primaryPosition,
    primaryPositions,
    secondaryPositions,
    positions: [...primaryPositions, ...secondaryPositions],
  };
}
