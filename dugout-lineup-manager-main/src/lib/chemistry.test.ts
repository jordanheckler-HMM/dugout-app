import { describe, expect, it } from "vitest";
import { FieldPosition, Player, Position } from "@/types/player";
import { CHEMISTRY_WEIGHTS, fitAtPosition, rateChemistry } from "@/lib/chemistry";

function player(id: string, primary: Position | Position[], secondary: Position[] = []): Player {
  const primaries = Array.isArray(primary) ? primary : [primary];
  return {
    id,
    name: id,
    primaryPosition: primaries[0],
    primaryPositions: primaries,
    secondaryPositions: secondary,
    positions: [...primaries, ...secondary],
    bats: "R",
    throws: "R",
    status: "active",
    stats: {},
  };
}

function field(assignments: Partial<Record<Position, string | null>>, useDH: boolean): FieldPosition[] {
  const spots: Position[] = useDH
    ? ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]
    : ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  return spots.map((position) => ({
    position,
    playerId: assignments[position] ?? null,
    x: 0,
    y: 0,
  }));
}

describe("fitAtPosition", () => {
  const maya = player("maya", ["SS", "2B"], ["3B"]);

  it("treats every listed primary as a full fit", () => {
    expect(fitAtPosition(maya, "SS")).toBe("primary");
    expect(fitAtPosition(maya, "2B")).toBe("primary");
  });

  it("treats a secondary as a partial fit and anything else as out of position", () => {
    expect(fitAtPosition(maya, "3B")).toBe("secondary");
    expect(fitAtPosition(maya, "CF")).toBe("out-of-position");
  });

  it("does not penalize a DH who simply does not list DH", () => {
    expect(fitAtPosition(maya, "DH")).toBe("dh-neutral");
    expect(fitAtPosition(null, "SS")).toBe("unassigned");
  });
});

describe("rateChemistry", () => {
  const roster = [
    player("p", "P"),
    player("c", "C"),
    player("1b", "1B"),
    player("2b", "2B"),
    player("3b", "3B"),
    player("ss", "SS"),
    player("lf", "LF"),
    player("cf", "CF", ["RF"]),
    player("rf", "RF"),
    player("dh", "DH"),
  ];

  it("scores a full primary alignment at 100", () => {
    const report = rateChemistry(field({
      P: "p", C: "c", "1B": "1b", "2B": "2b", "3B": "3b", SS: "ss", LF: "lf", CF: "cf", RF: "rf", DH: "dh",
    }, true), roster, true);
    expect(report.score).toBe(100);
    expect(report.breakdown.primary).toBe(10);
    expect(report.allPrimaryIdeal).toBe(100);
  });

  it("drops the score when a player is out of position and rises again for a primary", () => {
    const outOfPosition = rateChemistry(field({
      P: "p", C: "c", "1B": "1b", "2B": "cf", "3B": "3b", SS: "ss", LF: "lf", CF: "2b", RF: "rf", DH: "dh",
    }, true), roster, true);
    const backHome = rateChemistry(field({
      P: "p", C: "c", "1B": "1b", "2B": "2b", "3B": "3b", SS: "ss", LF: "lf", CF: "cf", RF: "rf", DH: "dh",
    }, true), roster, true);

    expect(outOfPosition.score).toBeLessThan(100);
    expect(outOfPosition.breakdown.outOfPosition).toBe(2);
    expect(backHome.score).toBeGreaterThan(outOfPosition.score);
    expect(outOfPosition.slots.find((slot) => slot.position === "2B")?.score).toBe(CHEMISTRY_WEIGHTS.outOfPosition);
  });

  it("counts a secondary fit between primary and out of position", () => {
    const report = rateChemistry(field({
      P: "p", C: "c", "1B": "1b", "2B": "2b", "3B": "3b", SS: "ss", LF: "lf", CF: "rf", RF: "cf", DH: "dh",
    }, true), roster, true);
    const rightField = report.slots.find((slot) => slot.position === "RF");
    expect(rightField?.fit).toBe("secondary");
    expect(rightField?.score).toBe(CHEMISTRY_WEIGHTS.secondary);
  });

  it("finds an all-primary assignment when the roster can cover every spot", () => {
    const report = rateChemistry(field({}, true), roster, true);
    expect(report.bestAvailable).toBe(100);
    expect(report.bestAssignment.filter((spot) => spot.playerId).length).toBe(10);
  });

  it("keeps the weights documented in one config", () => {
    expect(CHEMISTRY_WEIGHTS.primary).toBeGreaterThan(CHEMISTRY_WEIGHTS.secondary);
    expect(CHEMISTRY_WEIGHTS.secondary).toBeGreaterThan(CHEMISTRY_WEIGHTS.outOfPosition);
    expect(CHEMISTRY_WEIGHTS.dhNeutral).toBeGreaterThan(CHEMISTRY_WEIGHTS.unassigned);
    expect(CHEMISTRY_WEIGHTS.unassigned).toBeGreaterThan(CHEMISTRY_WEIGHTS.outOfPosition);
  });
});
