import { FieldPosition, LineupSlot, Player, Position } from "@/types/player";
import { DEFENSIVE_POSITIONS, primaryPositionsOf, secondaryPositionsOf } from "@/lib/positions";

export const FIELD_COORDINATES: Record<Position, { x: number; y: number }> = {
  P: { x: 50, y: 62 },
  C: { x: 50, y: 88 },
  "1B": { x: 74, y: 54 },
  "2B": { x: 62, y: 40 },
  SS: { x: 38, y: 40 },
  "3B": { x: 26, y: 54 },
  LF: { x: 20, y: 24 },
  CF: { x: 50, y: 14 },
  RF: { x: 80, y: 24 },
  DH: { x: 16, y: 78 },
};

export interface AlignmentState {
  useDH: boolean;
  lineup: LineupSlot[];
  fieldPositions: FieldPosition[];
}

export interface AlignmentPlayer {
  id: string;
  primaryPosition: Position;
  primaryPositions?: Position[];
  secondaryPositions?: Position[];
}

function cloneLineup(lineup: LineupSlot[]): LineupSlot[] {
  const slots = lineup.map((slot) => ({ ...slot }));
  while (slots.length < 9) {
    slots.push({ order: slots.length + 1, playerId: null, position: null });
  }
  return slots.slice(0, 9).map((slot, index) => ({ ...slot, order: index + 1 }));
}

export function emptyField(useDH: boolean): FieldPosition[] {
  const positions: Position[] = useDH ? [...DEFENSIVE_POSITIONS, "DH"] : [...DEFENSIVE_POSITIONS];
  return positions.map((position) => ({
    position,
    playerId: null,
    ...FIELD_COORDINATES[position],
  }));
}

export function emptyLineup(): LineupSlot[] {
  return Array.from({ length: 9 }, (_, index) => ({
    order: index + 1,
    playerId: null,
    position: null,
  }));
}

export function inferUseDH(fieldPositions: FieldPosition[]): boolean {
  return fieldPositions.some((spot) => spot.position === "DH");
}

export function ensureField(fieldPositions: FieldPosition[], useDH: boolean): FieldPosition[] {
  const template = emptyField(useDH);
  return template.map((spot) => {
    const existing = fieldPositions.find((candidate) => candidate.position === spot.position);
    return existing ? { ...spot, playerId: existing.playerId } : spot;
  });
}

function playerAt(fieldPositions: FieldPosition[], position: Position): string | null {
  return fieldPositions.find((spot) => spot.position === position)?.playerId ?? null;
}

function shouldBat(useDH: boolean, position: Position): boolean {
  if (!useDH) return position !== "DH";
  return position !== "P";
}

export function decorate(state: AlignmentState): AlignmentState {
  const fieldPositions = ensureField(state.fieldPositions, state.useDH);
  const positionByPlayer = new Map<string, Position>();
  fieldPositions.forEach((spot) => {
    if (spot.playerId) positionByPlayer.set(spot.playerId, spot.position);
  });
  return {
    useDH: state.useDH,
    fieldPositions,
    lineup: cloneLineup(state.lineup).map((slot) => ({
      ...slot,
      position: slot.playerId ? positionByPlayer.get(slot.playerId) ?? null : null,
    })),
  };
}

/** Make the batting order match who is on the field for this DH mode. */
export function reconcileLineupToField(state: AlignmentState): AlignmentState {
  const fieldPositions = ensureField(state.fieldPositions, state.useDH);
  const desired: string[] = [];
  fieldPositions.forEach((spot) => {
    if (!spot.playerId || !shouldBat(state.useDH, spot.position)) return;
    if (!desired.includes(spot.playerId)) desired.push(spot.playerId);
  });

  const lineup = cloneLineup(state.lineup);
  lineup.forEach((slot) => {
    if (slot.playerId && !desired.includes(slot.playerId)) slot.playerId = null;
  });
  desired.forEach((playerId) => {
    if (lineup.some((slot) => slot.playerId === playerId)) return;
    const empty = lineup.find((slot) => !slot.playerId);
    if (empty) empty.playerId = playerId;
  });

  return decorate({ useDH: state.useDH, lineup, fieldPositions });
}

function bestOpenSpot(fieldPositions: FieldPosition[], player: AlignmentPlayer, useDH: boolean): Position | null {
  const preferred = [
    ...primaryPositionsOf(player),
    ...secondaryPositionsOf(player),
    ...DEFENSIVE_POSITIONS.filter((position) => (useDH ? position !== "P" : true)),
  ];
  if (useDH) preferred.push("DH");
  for (const position of preferred) {
    if (!useDH && position === "DH") continue;
    if (useDH && position === "P") continue;
    const spot = fieldPositions.find((candidate) => candidate.position === position && !candidate.playerId);
    if (spot) return position;
  }
  return null;
}

export function placeOnField(state: AlignmentState, playerId: string, position: Position): AlignmentState {
  if (!state.useDH && position === "DH") return decorate(state);
  const fieldPositions = ensureField(state.fieldPositions, state.useDH).map((spot) => ({ ...spot }));
  const target = fieldPositions.find((spot) => spot.position === position);
  if (!target) return decorate(state);
  const from = fieldPositions.find((spot) => spot.playerId === playerId);
  if (from?.position === position) return decorate(state);

  const displaced = target.playerId;
  const lineup = cloneLineup(state.lineup);
  if (from) {
    from.playerId = displaced;
  }
  target.playerId = playerId;

  if (!from && displaced) {
    const slot = lineup.find((entry) => entry.playerId === displaced);
    if (slot) slot.playerId = playerId;
  }

  return reconcileLineupToField({ ...state, lineup, fieldPositions });
}

export function placeInLineup(
  state: AlignmentState,
  playerId: string,
  order: number,
  players: AlignmentPlayer[],
): AlignmentState {
  const fieldPositions = ensureField(state.fieldPositions, state.useDH).map((spot) => ({ ...spot }));
  const lineup = cloneLineup(state.lineup);
  const target = lineup.find((slot) => slot.order === order);
  if (!target) return decorate(state);
  const currentSlot = lineup.find((slot) => slot.playerId === playerId);
  if (currentSlot?.order === order) return decorate(state);

  const displaced = target.playerId;
  if (currentSlot) {
    currentSlot.playerId = displaced;
    target.playerId = playerId;
    return decorate(reconcileLineupToField({ ...state, lineup, fieldPositions }));
  }

  const from = fieldPositions.find((spot) => spot.playerId === playerId);
  if (state.useDH && from?.position === "P") {
    from.playerId = null;
    const dh = fieldPositions.find((spot) => spot.position === "DH");
    const open = fieldPositions.find((spot) => spot.position !== "P" && spot.position !== "DH" && !spot.playerId);
    if (dh && !dh.playerId) dh.playerId = playerId;
    else if (open) open.playerId = playerId;
    else if (dh) dh.playerId = playerId;
  } else if (!from) {
    const displacedSpot = displaced
      ? fieldPositions.find((spot) => spot.playerId === displaced)
      : undefined;
    if (displacedSpot && !(state.useDH && displacedSpot.position === "P")) {
      displacedSpot.playerId = playerId;
    } else {
      const player = players.find((candidate) => candidate.id === playerId);
      const open = player ? bestOpenSpot(fieldPositions, player, state.useDH) : null;
      if (open) {
        const spot = fieldPositions.find((candidate) => candidate.position === open);
        if (spot) spot.playerId = playerId;
      }
    }
  }

  target.playerId = playerId;
  if (displaced && displaced !== playerId) {
    const still = fieldPositions.find((spot) => spot.playerId === displaced);
    const staysOnField = Boolean(still && !(state.useDH && still.position === "P"));
    if (staysOnField) {
      const empty = lineup.find((slot) => !slot.playerId);
      if (empty) empty.playerId = displaced;
      else if (still) still.playerId = null;
    }
  }

  return reconcileLineupToField({ ...state, lineup, fieldPositions });
}

export function reorderLineup(state: AlignmentState, fromOrder: number, toOrder: number): AlignmentState {
  const playerId = state.lineup.find((slot) => slot.order === fromOrder)?.playerId;
  if (!playerId || fromOrder === toOrder) return decorate(state);
  return placeInLineup(state, playerId, toOrder, []);
}

export function removeFromLineup(state: AlignmentState, order: number): AlignmentState {
  const lineup = cloneLineup(state.lineup);
  const slot = lineup.find((entry) => entry.order === order);
  if (!slot?.playerId) return decorate(state);
  const playerId = slot.playerId;
  slot.playerId = null;
  const fieldPositions = ensureField(state.fieldPositions, state.useDH).map((spot) => (
    spot.playerId === playerId ? { ...spot, playerId: null } : { ...spot }
  ));
  return reconcileLineupToField({ ...state, lineup, fieldPositions });
}

export function removeFromField(state: AlignmentState, position: Position): AlignmentState {
  const fieldPositions = ensureField(state.fieldPositions, state.useDH).map((spot) => (
    spot.position === position ? { ...spot, playerId: null } : { ...spot }
  ));
  return reconcileLineupToField({ ...state, fieldPositions });
}

export function sendToBench(state: AlignmentState, playerId: string): AlignmentState {
  const lineup = cloneLineup(state.lineup).map((slot) => (
    slot.playerId === playerId ? { ...slot, playerId: null, position: null } : slot
  ));
  const fieldPositions = ensureField(state.fieldPositions, state.useDH).map((spot) => (
    spot.playerId === playerId ? { ...spot, playerId: null } : spot
  ));
  return reconcileLineupToField({ ...state, lineup, fieldPositions });
}

export function clearAlignment(state: AlignmentState): AlignmentState {
  return decorate({
    useDH: state.useDH,
    lineup: emptyLineup(),
    fieldPositions: emptyField(state.useDH),
  });
}

export function setDhMode(
  state: AlignmentState,
  nextUseDH: boolean,
  rememberedDh: string | null,
): { state: AlignmentState; rememberedDh: string | null } {
  if (nextUseDH === state.useDH) {
    return { state: decorate(state), rememberedDh };
  }

  if (!nextUseDH) {
    const dh = playerAt(state.fieldPositions, "DH");
    const pitcher = playerAt(state.fieldPositions, "P");
    const fieldPositions = ensureField(state.fieldPositions, false);
    const lineup = cloneLineup(state.lineup);
    const dhSlot = dh ? lineup.find((slot) => slot.playerId === dh) : undefined;
    if (dhSlot) {
      dhSlot.playerId = pitcher && !lineup.some((slot) => slot.playerId === pitcher) ? pitcher : null;
    } else if (pitcher && !lineup.some((slot) => slot.playerId === pitcher)) {
      const empty = lineup.find((slot) => !slot.playerId);
      if (empty) empty.playerId = pitcher;
    }
    return {
      rememberedDh: dh ?? rememberedDh,
      state: reconcileLineupToField({ useDH: false, lineup, fieldPositions }),
    };
  }

  const pitcher = playerAt(state.fieldPositions, "P");
  const pitcherOrder = state.lineup.find((slot) => slot.playerId === pitcher)?.order ?? null;
  const lineup = cloneLineup(state.lineup).map((slot) => (
    pitcher && slot.playerId === pitcher ? { ...slot, playerId: null, position: null } : { ...slot }
  ));
  const fieldPositions = ensureField(state.fieldPositions, true);
  if (rememberedDh && !fieldPositions.some((spot) => spot.playerId === rememberedDh)) {
    const dhSpot = fieldPositions.find((spot) => spot.position === "DH");
    if (dhSpot) dhSpot.playerId = rememberedDh;
    const restoredSlot = (pitcherOrder ? lineup.find((slot) => slot.order === pitcherOrder && !slot.playerId) : undefined)
      ?? lineup.find((slot) => !slot.playerId);
    if (restoredSlot && !lineup.some((slot) => slot.playerId === rememberedDh)) {
      restoredSlot.playerId = rememberedDh;
    }
  }

  return {
    rememberedDh,
    state: reconcileLineupToField({ useDH: true, lineup, fieldPositions }),
  };
}

export function lineupPlayerIds(state: AlignmentState): string[] {
  return state.lineup.flatMap((slot) => (slot.playerId ? [slot.playerId] : []));
}

export function fieldPlayerIds(state: AlignmentState): string[] {
  return state.fieldPositions.flatMap((spot) => (spot.playerId ? [spot.playerId] : []));
}
