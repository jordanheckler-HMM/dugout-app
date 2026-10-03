import { describe, expect, it } from "vitest";
import { Player, SeasonStats } from "@/types/player";
import { heroStat, showStatsFor, splitName } from "./showStats";

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    name: "Maya Chen",
    primaryPosition: "SS",
    secondaryPositions: [],
    positions: ["SS"],
    bats: "L",
    throws: "R",
    status: "active",
    stats: {},
    ...overrides,
  };
}

describe("show stats", () => {
  it("splits a first name from a last name", () => {
    expect(splitName("Maya Chen")).toEqual({ first: "Maya", last: "Chen" });
    expect(splitName("Cher")).toEqual({ first: "", last: "Cher" });
  });

  it("uses season hitting numbers and leaves missing ratings out", () => {
    const season = {
      playerId: "p1",
      gamesPlayed: 4,
      hitting: { ab: 12, h: 4, hr: 1, rbi: 3, avg: 0.333, obp: 0.4 },
      pitching: {},
      fielding: {},
    } satisfies SeasonStats;
    const stats = showStatsFor(player(), season);
    expect(stats.map((stat) => stat.label)).toEqual(["AVG", "HR", "RBI", "OBP"]);
    expect(stats[0]).toMatchObject({ value: ".333", bar: 0.333 });
    expect(stats.some((stat) => /ovr|contact|power|stuff|energy/i.test(stat.label))).toBe(false);
    expect(heroStat(stats)?.label).toBe("AVG");
  });

  it("shows dashes instead of invented pitcher totals", () => {
    const stats = showStatsFor(player({ primaryPosition: "P", positions: ["P"] }), null);
    expect(stats).toEqual([
      { label: "IP", value: "—" },
      { label: "SO", value: "—" },
      { label: "ERA", value: "—" },
    ]);
    expect(heroStat(stats)?.value).toBe("—");
  });
});
