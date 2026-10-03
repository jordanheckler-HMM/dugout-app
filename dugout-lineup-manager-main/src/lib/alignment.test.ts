import { describe, expect, it } from "vitest";
import { Position } from "@/types/player";
import {
  AlignmentPlayer,
  AlignmentState,
  emptyField,
  emptyLineup,
  fieldPlayerIds,
  lineupPlayerIds,
  placeInLineup,
  placeOnField,
  reorderLineup,
  setDhMode,
} from "@/lib/alignment";

function player(id: string, primary: Position, secondary: Position[] = []): AlignmentPlayer {
  return { id, primaryPosition: primary, primaryPositions: [primary], secondaryPositions: secondary };
}

const roster: AlignmentPlayer[] = [
  player("p", "P"),
  player("c", "C"),
  player("ss", "SS", ["2B"]),
  player("cf", "CF"),
  player("dh", "DH"),
];

function fresh(useDH: boolean): AlignmentState {
  return { useDH, lineup: emptyLineup(), fieldPositions: emptyField(useDH) };
}

describe("field and lineup stay one alignment", () => {
  it("puts a dragged fielder into the batting order and stamps that position", () => {
    const next = placeOnField(fresh(true), "ss", "SS");
    expect(fieldPlayerIds(next)).toContain("ss");
    expect(lineupPlayerIds(next)).toEqual(["ss"]);
    expect(next.lineup.find((slot) => slot.playerId === "ss")?.position).toBe("SS");
  });

  it("updates the field when a player is dragged into the lineup", () => {
    const next = placeInLineup(fresh(true), "cf", 3, roster);
    expect(lineupPlayerIds(next)).toContain("cf");
    expect(next.fieldPositions.find((spot) => spot.playerId === "cf")?.position).toBe("CF");
    expect(next.lineup.find((slot) => slot.order === 3)?.playerId).toBe("cf");
  });

  it("reorders the lineup without moving anyone on the field", () => {
    let state = placeOnField(fresh(false), "ss", "SS");
    state = placeOnField(state, "cf", "CF");
    const beforeField = fieldPlayerIds(state).slice().sort();
    const reordered = reorderLineup(state, 1, 2);
    expect(fieldPlayerIds(reordered).slice().sort()).toEqual(beforeField);
    expect(reordered.lineup[0].playerId).toBe("cf");
    expect(reordered.lineup[1].playerId).toBe("ss");
    expect(reordered.lineup[0].position).toBe("CF");
  });

  it("moves a fielder to a new position and updates the lineup badge", () => {
    let state = placeOnField(fresh(false), "ss", "SS");
    state = placeOnField(state, "ss", "2B");
    expect(state.fieldPositions.find((spot) => spot.position === "SS")?.playerId).toBeNull();
    expect(state.fieldPositions.find((spot) => spot.position === "2B")?.playerId).toBe("ss");
    expect(state.lineup.find((slot) => slot.playerId === "ss")?.position).toBe("2B");
  });
});

describe("DH and no-DH modes", () => {
  it("keeps the pitcher on the mound and out of the order when DH is on", () => {
    let state = placeOnField(fresh(true), "p", "P");
    state = placeOnField(state, "dh", "DH");
    state = placeOnField(state, "ss", "SS");
    expect(state.fieldPositions.find((spot) => spot.position === "P")?.playerId).toBe("p");
    expect(lineupPlayerIds(state)).not.toContain("p");
    expect(lineupPlayerIds(state)).toEqual(expect.arrayContaining(["dh", "ss"]));
    expect(state.fieldPositions.some((spot) => spot.position === "DH")).toBe(true);
  });

  it("bats the pitcher and drops the DH slot when DH is turned off, without deleting either player", () => {
    let state = placeOnField(fresh(true), "p", "P");
    state = placeOnField(state, "dh", "DH");
    state = placeOnField(state, "ss", "SS");
    const toggled = setDhMode(state, false, null);
    expect(toggled.state.useDH).toBe(false);
    expect(toggled.state.fieldPositions.some((spot) => spot.position === "DH")).toBe(false);
    expect(toggled.state.fieldPositions.find((spot) => spot.position === "P")?.playerId).toBe("p");
    expect(lineupPlayerIds(toggled.state)).toContain("p");
    expect(lineupPlayerIds(toggled.state)).toContain("ss");
    expect(lineupPlayerIds(toggled.state)).not.toContain("dh");
    expect(toggled.rememberedDh).toBe("dh");
  });

  it("restores the DH and pulls the pitcher back out of the order", () => {
    let state = placeOnField(fresh(true), "p", "P");
    state = placeOnField(state, "dh", "DH");
    state = placeOnField(state, "c", "C");
    const off = setDhMode(state, false, null);
    const on = setDhMode(off.state, true, off.rememberedDh);
    expect(on.state.useDH).toBe(true);
    expect(lineupPlayerIds(on.state)).not.toContain("p");
    expect(lineupPlayerIds(on.state)).toContain("dh");
    expect(on.state.fieldPositions.find((spot) => spot.position === "P")?.playerId).toBe("p");
    expect(on.state.fieldPositions.find((spot) => spot.position === "DH")?.playerId).toBe("dh");
    expect(lineupPlayerIds(on.state)).toContain("c");
  });

  it("with DH off, the pitcher is in the batting order", () => {
    const state = placeOnField(fresh(false), "p", "P");
    expect(state.useDH).toBe(false);
    expect(lineupPlayerIds(state)).toContain("p");
    expect(state.lineup.find((slot) => slot.playerId === "p")?.position).toBe("P");
  });
});
